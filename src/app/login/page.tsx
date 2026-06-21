'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TermsModal } from '@/components/TermsModal';
import { motion } from 'framer-motion';
import {
  Sparkles, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff,
  ShieldCheck, Timer,
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.ceil((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export default function LoginPage() {
  const { signIn, signInWithGoogle, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [lockedOut, setLockedOut] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  // Countdown timer during lockout
  React.useEffect(() => {
    if (!lockedOut || lockRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(interval);
          setLockedOut(false);
          setError(null);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedOut]);

  const validateFields = useCallback(() => {
    const errs: typeof fieldErrors = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedOut) return;
    if (!validateFields()) return;

    setError(null);
    setLoading(true);

    const { error: signInErr, lockedOut: locked, remainingMs } = await signIn(email, password);

    if (locked && remainingMs) {
      setLockedOut(true);
      setLockRemaining(remainingMs);
      setError(`Too many failed attempts. Account locked for ${formatCountdown(remainingMs)}.`);
    } else if (signInErr) {
      setError(signInErr.message || 'Invalid email or password.');
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const handleGoogleClick = () => {
    setShowTerms(true);
  };

  const handleTermsAccept = async () => {
    setShowTerms(false);
    setGoogleLoading(true);
    const { error: oauthErr } = await signInWithGoogle(true);
    if (oauthErr) {
      setError(oauthErr.message || 'Failed to authenticate with Google');
    } else {
      router.push('/dashboard');
    }
    setGoogleLoading(false);
  };

  const handleTermsDecline = () => {
    setShowTerms(false);
  };

  return (
    <>
      <TermsModal isOpen={showTerms} onAccept={handleTermsAccept} onDecline={handleTermsDecline} />

      <div className="min-h-screen bg-[#08090a] flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.06),transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <span className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/30">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              <span className="text-2xl font-bold tracking-tight text-white">
                Client<span className="text-indigo-400">Flow</span> <span className="text-slate-400 font-normal text-lg">AI</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Secured login · Rate limited · Encrypted sessions</span>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl">
            <div className="px-8 pt-8 pb-2">
              <h1 className="text-2xl font-bold text-white">Welcome back</h1>
              <p className="text-sm text-slate-400 mt-1">Sign in to your workspace</p>
            </div>

            <div className="px-8 py-6 space-y-5">
              {/* Error Banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${lockedOut ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}
                >
                  {lockedOut ? <Timer className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <div>
                    <span>{error}</span>
                    {lockedOut && lockRemaining > 0 && (
                      <p className="text-xs mt-1 text-amber-500/70">Time remaining: {formatCountdown(lockRemaining)}</p>
                    )}
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                      placeholder="name@example.com"
                      disabled={lockedOut || loading}
                      className={`w-full rounded-xl border bg-slate-900/60 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.email ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:border-indigo-500/60 focus:ring-indigo-500/30'}`}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-400">{fieldErrors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => alert('Password reset: In production, this triggers a Supabase email reset link sent to your inbox.')}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                      placeholder="••••••••"
                      disabled={lockedOut || loading}
                      className={`w-full rounded-xl border bg-slate-900/60 pl-10 pr-11 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.password ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:border-indigo-500/60 focus:ring-indigo-500/30'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || lockedOut}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-indigo-600/20"
                >
                  {loading ? (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-3 text-xs text-slate-600 uppercase tracking-widest">or</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={googleLoading || lockedOut}
                className="w-full flex items-center justify-center gap-2.5 border border-slate-700 bg-slate-900/40 hover:bg-slate-800/80 hover:border-slate-600 text-slate-200 hover:text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-600">
                Google sign-in requires accepting our{' '}
                <button onClick={() => setShowTerms(true)} className="text-indigo-400/80 hover:text-indigo-400 underline underline-offset-2">
                  Terms of Service
                </button>
              </p>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-800/60 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{' '}
                <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Create one free
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-slate-700 mt-6">
            Protected by rate limiting & session encryption
          </p>
        </motion.div>
      </div>
    </>
  );
}
