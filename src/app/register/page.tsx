'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TermsModal } from '@/components/TermsModal';
import { motion } from 'framer-motion';
import {
  Sparkles, Mail, Lock, User, Building2, ArrowRight, AlertCircle,
  Eye, EyeOff, Check, ShieldCheck,
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

// ─── Password Strength ────────────────────────────────────────────────────────
function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { score: 3, label: 'Good', color: '#3b82f6' };
  return { score: 4, label: 'Strong', color: '#22c55e' };
}

const REQUIREMENTS = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Contains a number' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Contains uppercase letter' },
];

export default function RegisterPage() {
  const { signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  React.useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Enter your full name (min 2 chars)';
    if (!agencyName.trim() || agencyName.trim().length < 2) errs.agencyName = 'Enter your agency or business name';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[0-9]/.test(password)) errs.password = 'Password must include at least one number';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!acceptTerms) errs.terms = 'You must accept the Terms & Conditions to create an account';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setLoading(true);

    const { error: signUpErr } = await signUp(email, password, name.trim(), agencyName.trim(), acceptTerms);
    if (signUpErr) {
      setError(signUpErr.message || 'Failed to create account. Please try again.');
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
    setAcceptTerms(true);
    setGoogleLoading(true);
    const { error: oauthErr } = await signInWithGoogle(true);
    if (oauthErr) {
      setError(oauthErr.message || 'Failed to authenticate with Google');
    } else {
      router.push('/dashboard');
    }
    setGoogleLoading(false);
  };

  return (
    <>
      <TermsModal isOpen={showTerms} onAccept={handleTermsAccept} onDecline={() => setShowTerms(false)} />

      <div className="min-h-screen bg-[#08090a] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.06),transparent_60%)]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
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
              <span>Free to start · No credit card required · Secure</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl">
            <div className="px-8 pt-8 pb-2">
              <h1 className="text-2xl font-bold text-white">Create your workspace</h1>
              <p className="text-sm text-slate-400 mt-1">Set up your agency account in 60 seconds</p>
            </div>

            <div className="px-8 py-6 space-y-4">
              {/* Global error */}
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-name" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="reg-name" type="text" autoComplete="name" value={name}
                      onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })); }}
                      placeholder="e.g. Your Name"
                      className={`w-full rounded-xl border bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${fieldErrors.name ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:border-indigo-500/60 focus:ring-indigo-500/30'}`} />
                  </div>
                  {fieldErrors.name && <p className="text-xs text-red-400">{fieldErrors.name}</p>}
                </div>

                {/* Agency Name */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-agency" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Agency / Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="reg-agency" type="text" value={agencyName}
                      onChange={e => { setAgencyName(e.target.value); setFieldErrors(p => ({ ...p, agencyName: '' })); }}
                      placeholder="e.g. Nova Studios, Apex Digital..."
                      className={`w-full rounded-xl border bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${fieldErrors.agencyName ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:border-indigo-500/60 focus:ring-indigo-500/30'}`} />
                  </div>
                  {fieldErrors.agencyName
                    ? <p className="text-xs text-red-400">{fieldErrors.agencyName}</p>
                    : <p className="text-xs text-slate-600">This appears in your sidebar as your workspace label.</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-email" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="reg-email" type="email" autoComplete="email" value={email}
                      onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: '' })); }}
                      placeholder="name@example.com"
                      className={`w-full rounded-xl border bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${fieldErrors.email ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:border-indigo-500/60 focus:ring-indigo-500/30'}`} />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-400">{fieldErrors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-password" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                      value={password} onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
                      placeholder="Min 8 chars with a number"
                      className={`w-full rounded-xl border bg-slate-900/60 pl-10 pr-11 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${fieldErrors.password ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:border-indigo-500/60 focus:ring-indigo-500/30'}`} />
                    <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-xs text-red-400">{fieldErrors.password}</p>}

                  {/* Strength bar */}
                  {password && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
                            style={{ backgroundColor: i <= strength.score ? strength.color : '#1e293b' }} />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                          {REQUIREMENTS.map(r => (
                            <span key={r.label} className={`flex items-center gap-1 text-xs transition-colors ${r.test(password) ? 'text-emerald-400' : 'text-slate-600'}`}>
                              <Check className="h-2.5 w-2.5" /> {r.label}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-confirm" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                      value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                      placeholder="Repeat your password"
                      className={`w-full rounded-xl border bg-slate-900/60 pl-10 pr-11 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${fieldErrors.confirmPassword ? 'border-red-500/60 focus:ring-red-500/30' : confirmPassword && password === confirmPassword ? 'border-emerald-500/40 focus:ring-emerald-500/20' : 'border-slate-700 focus:border-indigo-500/60 focus:ring-indigo-500/30'}`} />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword
                    ? <p className="text-xs text-red-400">{fieldErrors.confirmPassword}</p>
                    : confirmPassword && password === confirmPassword
                    ? <p className="text-xs text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" />Passwords match</p>
                    : null}
                </div>

                {/* Terms checkbox */}
                <div className="space-y-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div onClick={() => { setAcceptTerms(a => !a); setFieldErrors(p => ({ ...p, terms: '' })); }}
                      className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${acceptTerms ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600 bg-slate-900 group-hover:border-indigo-500/60'}`}>
                      {acceptTerms && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm text-slate-400 leading-relaxed">
                      I agree to the{' '}
                      <button type="button" onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 font-medium">
                        Terms of Service & Privacy Policy
                      </button>
                    </span>
                  </label>
                  {fieldErrors.terms && <p className="text-xs text-red-400 pl-8">{fieldErrors.terms}</p>}
                </div>

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all shadow-lg shadow-indigo-600/20 mt-2">
                  {loading ? <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <><Sparkles className="h-4 w-4" /> Create My Workspace <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-slate-800" />
                <span className="px-3 text-xs text-slate-600 uppercase tracking-widest">or</span>
                <div className="flex-1 border-t border-slate-800" />
              </div>

              {/* Google */}
              <button type="button" onClick={handleGoogleClick} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 border border-slate-700 bg-slate-900/40 hover:bg-slate-800/80 hover:border-slate-600 text-slate-200 hover:text-white font-semibold rounded-xl py-3 text-sm transition-all disabled:opacity-50">
                {googleLoading ? <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <><GoogleIcon /> Sign up with Google</>}
              </button>
            </div>

            <div className="px-8 py-5 border-t border-slate-800/60 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign in</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
