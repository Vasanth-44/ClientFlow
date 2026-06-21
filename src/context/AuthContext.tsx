'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isMockEnabled } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  agencyName: string;   // unique per user — shown in sidebar
  role: 'admin' | 'manager' | 'member';
  avatar?: string;
  isNewUser: boolean;   // triggers onboarding modal
  acceptedTerms: boolean;
  acceptedTermsAt?: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; lockedOut?: boolean; remainingMs?: number }>;
  signUp: (email: string, password: string, name: string, agencyName: string, acceptedTerms: boolean) => Promise<{ error: any }>;
  signInWithGoogle: (acceptedTerms: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Pick<AuthUser, 'name' | 'agencyName' | 'avatar' | 'role' | 'isNewUser'>>) => Promise<void>;
  completeOnboarding: (name: string, agencyName: string, role: AuthUser['role']) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Login rate limiter (in-memory, keyed by email)
// 5 failures within a window → 15-minute lockout
// ─────────────────────────────────────────────────────────────────────────────
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface LockoutEntry {
  count: number;
  firstFailAt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, LockoutEntry>();

function checkRateLimit(email: string): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  const entry = loginAttempts.get(email.toLowerCase());

  if (!entry) return { allowed: true, remainingMs: 0 };

  // If currently locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remainingMs: entry.lockedUntil - now };
  }

  // Lockout expired — reset
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    loginAttempts.delete(email.toLowerCase());
    return { allowed: true, remainingMs: 0 };
  }

  return { allowed: true, remainingMs: 0 };
}

function recordFailedAttempt(email: string): void {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);

  if (!entry) {
    loginAttempts.set(key, { count: 1, firstFailAt: now });
    return;
  }

  const count = entry.count + 1;
  if (count >= LOCKOUT_THRESHOLD) {
    loginAttempts.set(key, { count, firstFailAt: entry.firstFailAt, lockedUntil: now + LOCKOUT_DURATION_MS });
  } else {
    loginAttempts.set(key, { count, firstFailAt: entry.firstFailAt });
  }
}

function recordSuccessfulLogin(email: string): void {
  loginAttempts.delete(email.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Local profile storage (per user ID) — works in mock and Supabase modes
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_PREFIX = 'cf_profile_';

function loadProfile(userId: string): Partial<AuthUser> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROFILE_PREFIX + userId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProfile(userId: string, data: Partial<AuthUser>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadProfile(userId);
    localStorage.setItem(PROFILE_PREFIX + userId, JSON.stringify({ ...existing, ...data }));
  } catch {
    // ignore storage errors
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock user session storage (for demo mode without Supabase)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_SESSION_KEY = 'cf_mock_session';
const MOCK_USERS_KEY = 'cf_mock_users';

interface MockStoredUser {
  id: string;
  email: string;
  passwordHash: string; // base64 of email+password (not real hashing, demo only)
  createdAt: string;
}

function getMockUsers(): MockStoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MOCK_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMockUser(user: MockStoredUser): void {
  const users = getMockUsers();
  const idx = users.findIndex(u => u.email === user.email);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
}

function getMockSession(): { userId: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setMockSession(data: { userId: string; email: string } | null): void {
  if (typeof window === 'undefined') return;
  if (data) localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(data));
  else localStorage.removeItem(MOCK_SESSION_KEY);
}

// Simple deterministic ID from email (demo only)
function mockId(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return `mock_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Build a full AuthUser from raw data + stored profile
  const buildUser = useCallback((rawId: string, rawEmail: string, rawMeta: Record<string, any> = {}): AuthUser => {
    const stored = loadProfile(rawId);
    return {
      id: rawId,
      email: rawEmail,
      name: stored.name ?? rawMeta.name ?? rawMeta.full_name ?? rawEmail.split('@')[0],
      agencyName: stored.agencyName ?? rawMeta.agencyName ?? '',
      role: stored.role ?? rawMeta.role ?? 'admin',
      avatar: stored.avatar ?? rawMeta.avatar_url ?? '',
      isNewUser: stored.isNewUser !== undefined ? stored.isNewUser : true,
      acceptedTerms: stored.acceptedTerms ?? false,
      acceptedTermsAt: stored.acceptedTermsAt,
      createdAt: stored.createdAt ?? new Date().toISOString(),
    };
  }, []);

  // ── Initialize session ─────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        if (isMockEnabled) {
          // Mock mode: restore from localStorage
          const mockSession = getMockSession();
          if (mockSession) {
            const builtUser = buildUser(mockSession.userId, mockSession.email);
            setUser(builtUser);
            setSession({ user: { id: mockSession.userId, email: mockSession.email } });
          }
        } else {
          // Supabase mode
          const { data: { session: s } } = await supabase.auth.getSession();
          setSession(s);
          if (s?.user) {
            const builtUser = buildUser(s.user.id, s.user.email || '', s.user.user_metadata || {});
            setUser(builtUser);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    if (!isMockEnabled) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: string, s: any) => {
          setSession(s);
          if (s?.user) {
            const builtUser = buildUser(s.user.id, s.user.email || '', s.user.user_metadata || {});
            setUser(builtUser);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );
      return () => { subscription?.unsubscribe(); };
    }
  }, [buildUser]);

  // ── Sign In ────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    // Rate limit check
    const { allowed, remainingMs } = checkRateLimit(email);
    if (!allowed) {
      return { error: { message: `Account locked. Try again in ${Math.ceil(remainingMs / 60000)} minutes.` }, lockedOut: true, remainingMs };
    }

    setLoading(true);
    try {
      if (isMockEnabled) {
        // Mock auth: find user and verify password
        const users = getMockUsers();
        const pwKey = btoa(`${email}:${password}`);
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === pwKey);

        if (!found) {
          recordFailedAttempt(email);
          return { error: { message: 'Invalid email or password.' } };
        }

        recordSuccessfulLogin(email);
        setMockSession({ userId: found.id, email: found.email });
        const builtUser = buildUser(found.id, found.email);
        setUser(builtUser);
        setSession({ user: { id: found.id, email: found.email } });
        return { error: null };
      }

      // Supabase mode
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        recordFailedAttempt(email);
        return { error };
      }
      recordSuccessfulLogin(email);
      return { error: null };
    } catch (err: any) {
      recordFailedAttempt(email);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const signUp = async (
    email: string,
    password: string,
    name: string,
    agencyName: string,
    acceptedTerms: boolean
  ) => {
    setLoading(true);
    try {
      if (isMockEnabled) {
        const users = getMockUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
          return { error: { message: 'An account with this email already exists.' } };
        }
        const userId = mockId(email);
        const newUser: MockStoredUser = {
          id: userId,
          email,
          passwordHash: btoa(`${email}:${password}`),
          createdAt: new Date().toISOString(),
        };
        saveMockUser(newUser);
        const profile: Partial<AuthUser> = {
          name,
          agencyName,
          role: 'admin',
          isNewUser: false, // they filled onboarding during registration
          acceptedTerms,
          acceptedTermsAt: acceptedTerms ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
        };
        saveProfile(userId, profile);
        setMockSession({ userId, email });
        setUser(buildUser(userId, email));
        setSession({ user: { id: userId, email } });
        return { error: null };
      }

      // Supabase mode
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, full_name: name, agencyName, acceptedTerms },
        },
      });
      if (!error && data.user) {
        const profile: Partial<AuthUser> = {
          name,
          agencyName,
          role: 'admin',
          isNewUser: false,
          acceptedTerms,
          acceptedTermsAt: acceptedTerms ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
        };
        saveProfile(data.user.id, profile);
      }
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ───────────────────────────────────────────────────────────
  const signInWithGoogle = async (acceptedTerms: boolean) => {
    if (!acceptedTerms) {
      return { error: { message: 'You must accept the Terms & Conditions to continue.' } };
    }
    try {
      if (isMockEnabled) {
        // Mock Google: create a demo Google user
        const mockGoogleEmail = `google_user_${Date.now()}@gmail.com`;
        const userId = `google_${Date.now()}`;
        saveMockUser({ id: userId, email: mockGoogleEmail, passwordHash: '', createdAt: new Date().toISOString() });
        saveProfile(userId, {
          name: 'Google User',
          agencyName: '',
          role: 'admin',
          isNewUser: true, // onboarding needed
          acceptedTerms: true,
          acceptedTermsAt: new Date().toISOString(),
          avatar: '',
          createdAt: new Date().toISOString(),
        });
        setMockSession({ userId, email: mockGoogleEmail });
        setUser(buildUser(userId, mockGoogleEmail));
        return { error: null };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '',
          queryParams: { accepted_terms: acceptedTerms ? '1' : '0' },
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ── Update Profile ─────────────────────────────────────────────────────────
  const updateProfile = async (updates: Partial<Pick<AuthUser, 'name' | 'agencyName' | 'avatar' | 'role' | 'isNewUser'>>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    saveProfile(user.id, updated);
    setUser(updated);

    if (!isMockEnabled) {
      try {
        await supabase.auth.updateUser({
          data: { name: updated.name, agencyName: updated.agencyName, avatar_url: updated.avatar },
        });
      } catch { /* non-fatal */ }
    }
  };

  // ── Complete Onboarding ────────────────────────────────────────────────────
  const completeOnboarding = async (name: string, agencyName: string, role: AuthUser['role']) => {
    await updateProfile({ name, agencyName, role, isNewUser: false });
  };

  // ── Sign Out ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    setLoading(true);
    try {
      if (isMockEnabled) {
        setMockSession(null);
      } else {
        await supabase.auth.signOut();
      }
      setUser(null);
      setSession(null);
      router.push('/login');
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut, updateProfile, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
