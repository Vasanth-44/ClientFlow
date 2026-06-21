'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Shield, Zap, RefreshCw, BarChart, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  } as any;

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  } as any;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              Client<span className="text-indigo-500">Flow AI</span>
            </span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Log In
            </Link>
            <Link href="/register">
              <Button size="sm" variant="primary">
                Get Started
                <ArrowRight className="ml-2 h-4.5 w-4.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-20 lg:py-32 overflow-hidden bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-6 hover:bg-indigo-500/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Empowering Agency Owners & Freelancers
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6"
          >
            Streamline Your Leads, <br />
            Projects & <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Payments</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed mb-8"
          >
            ClientFlow AI is the ultimate SaaS suite to handle CRM leads pipelines, client relations, project deadlines, task boards, automatic INR billing, and contract storage in one sleek place.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto font-semibold">
                Start Free Trial
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto hover:bg-slate-800 text-slate-200 border-slate-700 font-semibold">
                Sign In to Dashboard
              </Button>
            </Link>
          </motion.div>

          {/* Graphical Mockup Dashboard */}
          <motion.div
            variants={itemVariants}
            className="mt-16 w-full max-w-5xl rounded-xl border border-slate-800 bg-slate-950/80 p-3 shadow-2xl shadow-indigo-500/5 backdrop-blur-md relative"
          >
            <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl opacity-20 blur-md pointer-events-none" />
            <div className="flex items-center space-x-2 mb-3 px-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs text-slate-600 dark:text-slate-500 ml-4 font-mono">dashboard.clientflow.io</span>
            </div>
            <div className="h-64 sm:h-96 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-grid-slate-800 opacity-20 pointer-events-none" />
              <div className="text-center p-6 z-10">
                <p className="text-sm font-semibold text-indigo-400 mb-1">Interactive Kanban & LEDGERS</p>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Automate client workflows from pitch to invoice</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">Create tasks, generate beautiful PDFs, utilize GPT-4o writers, and monitor billing in INR.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Grid Section */}
      <section className="bg-slate-950 py-20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight sm:text-4xl">Everything you need to scale your business</h2>
            <p className="mt-4 text-slate-400">Stop juggling spreadsheets. Organize client interactions and track cashflow with ease.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/50 hover:border-slate-800 transition-all hover:translate-y-[-2px]">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Role Level RLS Security</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Built on Supabase RLS, guaranteeing your financial records, client databases, and projects are strictly accessible by you alone.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/50 hover:border-slate-800 transition-all hover:translate-y-[-2px]">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-time Kanban Planning</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Transition clients into active projects and view your tasks on a responsive, drag-and-drop workflow planner board.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/50 hover:border-slate-800 transition-all hover:translate-y-[-2px]">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Payment Tracker & PDF Invoices</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Generate sleek invoices, calculate local taxes, download them as high-quality PDFs, and monitor pending balances in INR (₹).</p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/50 hover:border-slate-800 transition-all hover:translate-y-[-2px]">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Assistant</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Generate contract scope proposals, formulate update emails, and summarize meeting transcripts automatically using GPT-4o models.</p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/50 hover:border-slate-800 transition-all hover:translate-y-[-2px]">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4">
                <BarChart className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analytics Insights</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Examine visual cash flow distributions, monthly earnings, project completion status, and key accounts in interactive chart grids.</p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-slate-900 bg-slate-900/50 hover:border-slate-800 transition-all hover:translate-y-[-2px]">
              <div className="h-10 w-10 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-400 mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">File Uploads & Documents</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Save design files, project contracts, or receipts directly to secure Supabase Storage buckets linked directly to your clients.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="bg-slate-900 border-t border-slate-800 py-16 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-extrabold text-white mb-4 sm:text-4xl">Ready to take control of your freelance workflow?</h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8 text-sm sm:text-base">Join developers, designers, and small agency founders managing billing and milestones effectively.</p>
          <Link href="/register">
            <Button size="lg" className="px-8 shadow-lg shadow-indigo-600/20">
              Create Your Account Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-8 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} ClientFlow. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-slate-300">Privacy Policy</Link>
            <Link href="/login" className="hover:text-slate-300">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
