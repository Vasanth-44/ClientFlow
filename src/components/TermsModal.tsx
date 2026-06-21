'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Check, ExternalLink, AlertCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const TERMS_CONTENT = `
CLIENTFLOW AI — TERMS OF SERVICE & PRIVACY POLICY
Last updated: June 2026

1. ACCEPTANCE OF TERMS
By accessing or using ClientFlow AI ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.

2. USE OF THE PLATFORM
You agree to use the Platform only for lawful purposes and in a manner consistent with all applicable local, state, national, and international laws and regulations.

3. ACCOUNT RESPONSIBILITY
You are responsible for maintaining the confidentiality of your account credentials. You must immediately notify us of any unauthorized use of your account. ClientFlow AI is not liable for losses caused by unauthorized account access.

4. DATA & PRIVACY
We collect only the data necessary to operate the Platform (name, email, agency name, project data). Your data is:
- Never sold to third parties
- Stored securely with encryption at rest
- Accessible only to you and team members you authorize
- Subject to deletion upon written request

5. AI FEATURES
ClientFlow AI uses OpenAI GPT-4o to power AI tools. Prompts sent to AI tools may be processed by OpenAI's servers per their own privacy policy. Do not include sensitive personal data (SSNs, passwords, etc.) in AI prompts.

6. INTELLECTUAL PROPERTY
All content you create within ClientFlow AI (proposals, invoices, notes) remains yours. ClientFlow AI does not claim ownership over your data.

7. LIMITATION OF LIABILITY
ClientFlow AI is provided "as is" without warranty. We are not liable for indirect, incidental, or consequential damages arising from your use of the Platform.

8. TERMINATION
We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or misuse the Platform's AI features.

9. CHANGES TO TERMS
We may update these Terms at any time. Continued use after changes constitutes acceptance of updated Terms. We will notify registered users of significant changes via email.

10. GOVERNING LAW
These Terms are governed by the laws of India. Any disputes shall be resolved under the jurisdiction of courts in Tamil Nadu, India.

PRIVACY POLICY SUMMARY
- We use your email to authenticate your account
- We store your agency data to deliver the service
- We do not share your data with advertisers
- You can export or delete your data from Settings at any time
- We use cookies for session management only

By accepting, you confirm you are at least 16 years of age and agree to the above Terms of Service and Privacy Policy.
`;

export function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) setHasScrolled(true);
  };

  const handleAccept = () => {
    if (!agreed) return;
    onAccept();
    setAgreed(false);
    setHasScrolled(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Terms of Service</h2>
                <p className="text-xs text-slate-400">Please read and accept to continue</p>
              </div>
            </div>
            <button
              onClick={onDecline}
              className="rounded-lg p-1.5 hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Terms */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar"
          >
            <pre className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
              {TERMS_CONTENT.trim()}
            </pre>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-800 space-y-4 shrink-0 bg-slate-950/80">
            {!hasScrolled && (
              <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Please scroll to the bottom to read the full terms before accepting.</span>
              </div>
            )}

            {/* Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => hasScrolled && setAgreed(a => !a)}
                className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  !hasScrolled ? 'border-slate-700 bg-slate-800/50 cursor-not-allowed' :
                  agreed ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600 bg-slate-900 group-hover:border-indigo-500/60'
                }`}
              >
                {agreed && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className={`text-sm leading-relaxed ${!hasScrolled ? 'text-slate-600' : 'text-slate-300'}`}>
                I have read and agree to the{' '}
                <span className="text-indigo-400 font-medium">Terms of Service</span> and{' '}
                <span className="text-indigo-400 font-medium">Privacy Policy</span> of ClientFlow AI.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onDecline}
                className="flex-1 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 py-2.5 text-sm font-semibold transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                disabled={!agreed || !hasScrolled}
                className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
              >
                <Check className="h-4 w-4" />
                Accept & Continue with Google
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
