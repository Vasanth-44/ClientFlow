'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isMockEnabled } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        if (initialSession?.user) {
          const userMeta = initialSession.user.user_metadata || {};
          setUser({
            id: initialSession.user.id,
            email: initialSession.user.email || '',
            name: userMeta.name || userMeta.full_name || initialSession.user.email?.split('@')[0],
            avatar: userMeta.avatar_url || '',
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching initial session:', err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, currentSession: any) => {
        setSession(currentSession);
        if (currentSession?.user) {
          const userMeta = currentSession.user.user_metadata || {};
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            name: userMeta.name || userMeta.full_name || currentSession.user.email?.split('@')[0],
            avatar: userMeta.avatar_url || '',
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
          },
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '',
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      router.push('/login');
      return { error };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
