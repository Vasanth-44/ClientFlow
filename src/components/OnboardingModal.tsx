'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, AuthUser } from '@/context/AuthContext';
import { Sparkles, Building2, User, ChevronRight, Check } from 'lucide-react';

const ROLES: { value: AuthUser['role']; label: string; desc: string }[] = [
  { value: 'admin', label: 'Agency Owner / Admin', desc: 'Full control over all data, team, and billing.' },
  { value: 'manager', label: 'Project Manager', desc: 'Can manage projects, tasks, clients, and proposals.' },
  { value: 'member', label: 'Team Member', desc: 'Access to assigned projects and tasks only.' },
];

export function OnboardingModal() {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(user?.name || '');
  const [agencyName, setAgencyName] = useState('');
  const [role, setRole] = useState<AuthUser['role']>('admin');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; agency?: string }>({});

  if (!user?.isNewUser) return null;

  const validateStep1 = () => {
    const e: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Please enter your full name (min 2 characters)';
    if (!agencyName.trim() || agencyName.trim().length < 2) e.agency = 'Please enter your agency or business name';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleFinish = async () => {
    setSaving(true);
    await completeOnboarding(name.trim(), agencyName.trim(), role);
    setSaving(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          key={`onboarding-step-${step}`}
          initial={{ opacity: 0, scale: 0.93, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: -24 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-2.5">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Welcome to ClientFlow AI</h2>
                <p className="text-xs text-slate-400">Let's set up your workspace — takes 30 seconds</p>
              </div>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${s === step ? 'w-8 bg-indigo-500' : s < step ? 'w-4 bg-indigo-700' : 'w-4 bg-slate-700'}`} />
                </div>
              ))}
              <span className="text-xs text-slate-500 ml-1">Step {step} of 2</span>
            </div>
          </div>

          <div className="px-8 py-7">
            {step === 1 ? (
              <div className="space-y-5">
                <p className="text-sm text-slate-300 font-medium">Tell us about you and your agency</p>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Your Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
                    placeholder="e.g. John Smith"
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-white bg-slate-900 placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${errors.name ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500/50'}`}
                  />
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                {/* Agency Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Agency / Business Name
                  </label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => { setAgencyName(e.target.value); setErrors(p => ({ ...p, agency: undefined })); }}
                    placeholder="e.g. Nova Studios, Apex Digital..."
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-white bg-slate-900 placeholder:text-slate-600 outline-none transition-all focus:ring-2 ${errors.agency ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500/50'}`}
                  />
                  {errors.agency && <p className="text-xs text-red-400">{errors.agency}</p>}
                  <p className="text-xs text-slate-500">This will be displayed in your sidebar and reports as your workspace name.</p>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-300 font-medium">What's your role in the agency?</p>

                <div className="space-y-2.5">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRole(r.value)}
                      className={`w-full text-left rounded-xl border px-4 py-3.5 transition-all group ${role === r.value ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-900/60'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-semibold ${role === r.value ? 'text-indigo-300' : 'text-white'}`}>{r.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 transition-all ${role === r.value ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'}`}>
                          {role === r.value && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 py-3 text-sm font-semibold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={saving}
                    className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
                  >
                    {saving ? (
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Launch My Workspace
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
