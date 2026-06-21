'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  FileText,
  Mail,
  ClipboardList,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Trash2,
  Calendar,
  History,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIGeneration {
  id: string;
  type: string;
  input_params: any;
  generated_content: string;
  created_at: string;
}

export default function AiToolsPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [activeTab, setActiveTab] = useState('proposal');
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [output, setOutput] = useState('');
  const [isMocked, setIsMocked] = useState(false);

  // History states
  const [history, setHistory] = useState<AIGeneration[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Proposal State
  const [propClient, setPropClient] = useState('');
  const [propType, setPropType] = useState('Website Redesign');
  const [propBudget, setPropBudget] = useState('');
  const [propTimeline, setPropTimeline] = useState('4 weeks');

  // Email State
  const [emailClient, setEmailClient] = useState('');
  const [emailProject, setEmailProject] = useState('');
  const [emailType, setEmailType] = useState('project update');
  const [emailContext, setEmailContext] = useState('');

  // Meeting State
  const [rawNotes, setRawNotes] = useState('');

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load AI generations:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const triggerCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleGenerate = async (e: React.FormEvent, toolType: string) => {
    e.preventDefault();
    setLoading(true);
    setOutput('');

    let data = {};
    if (toolType === 'proposal') {
      data = { clientName: propClient, projectType: propType, budget: propBudget, timeline: propTimeline };
    } else if (toolType === 'email') {
      data = { clientName: emailClient, projectName: emailProject, emailType, context: emailContext };
    } else if (toolType === 'meeting') {
      data = { rawNotes };
    }

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolType, data }),
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      setOutput(result.content);
      setIsMocked(!!result.isMocked);

      // Save to database
      if (user) {
        const { data: dbData, error: dbErr } = await supabase
          .from('ai_generations')
          .insert({
            type: toolType,
            input_params: data,
            generated_content: result.content,
          })
          .select()
          .single();
        
        if (!dbErr && dbData) {
          setHistory((prev) => [dbData, ...prev]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setOutput(`Error generating text: ${err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft from history?')) return;
    try {
      const { error } = await supabase.from('ai_generations').delete().eq('id', id);
      if (error) throw error;

      setHistory(history.filter((h) => h.id !== id));
      sendNotification('Draft deleted from history.', 'info');
    } catch (err) {
      console.error('Failed to delete history item:', err);
      sendNotification('Failed to delete history draft.', 'danger');
    }
  };

  const handleCopyHistory = (text: string) => {
    navigator.clipboard.writeText(text);
    sendNotification('Copied draft to clipboard!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Intro section */}
      <div className="flex items-center space-x-3 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
        <div className="bg-indigo-600 p-2 rounded-lg text-white shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            GPT-4o Copywriting Assistant
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
            Generate client onboarding proposals, progress summaries, and billing notices. 
            All tools function out of the box using built-in mock templates when no key is set.
          </p>
        </div>
      </div>

      {/* Main tab wrapper */}
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 p-0.5 rounded-lg mb-4 inline-flex">
          <TabsTrigger value="generator" className="px-3 py-1.5 text-xs font-semibold rounded-md">AI Generators</TabsTrigger>
          <TabsTrigger value="history" className="px-3 py-1.5 text-xs font-semibold rounded-md">Draft History</TabsTrigger>
        </TabsList>

        {/* TAB 1: AI Generators */}
        <TabsContent value="generator" className="outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Side Forms */}
            <div className="lg:col-span-5">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-bold">Select Tool Input</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={(val) => {
                    setActiveTab(val);
                    setOutput('');
                  }}>
                    <TabsList className="grid w-full grid-cols-3 border border-slate-200 dark:border-slate-800 mb-6">
                      <TabsTrigger value="proposal" className="flex items-center gap-1 text-xs">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Proposal</span>
                      </TabsTrigger>
                      <TabsTrigger value="email" className="flex items-center gap-1 text-xs">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Email</span>
                      </TabsTrigger>
                      <TabsTrigger value="meeting" className="flex items-center gap-1 text-xs">
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>Notes</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* 1. Proposal Form */}
                    <TabsContent value="proposal">
                      <form onSubmit={(e) => handleGenerate(e, 'proposal')} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="prop-client">Client Name *</Label>
                          <Input
                            id="prop-client"
                            required
                            value={propClient}
                            onChange={(e) => setPropClient(e.target.value)}
                            placeholder="e.g. Cyberdyne Systems"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="prop-type">Project Scope Category *</Label>
                          <Select id="prop-type" value={propType} onChange={(e) => setPropType(e.target.value)}>
                            <option value="Website Redesign">Website Redesign</option>
                            <option value="Mobile Application Development">Mobile App (iOS/Android)</option>
                            <option value="Backend Database API Integration">Database API Sync</option>
                            <option value="Custom CRM/SaaS Framework">Custom SaaS/CRM Tool</option>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="prop-budget">Budget (INR ₹)</Label>
                            <Input
                              id="prop-budget"
                              type="number"
                              value={propBudget}
                              onChange={(e) => setPropBudget(e.target.value)}
                              placeholder="₹25,000"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="prop-time">Timeline</Label>
                            <Input
                              id="prop-time"
                              value={propTimeline}
                              onChange={(e) => setPropTimeline(e.target.value)}
                              placeholder="e.g. 4 weeks"
                            />
                          </div>
                        </div>

                        <Button type="submit" className="w-full font-semibold" isLoading={loading}>
                          Generate Project Proposal
                        </Button>
                      </form>
                    </TabsContent>

                    {/* 2. Email Form */}
                    <TabsContent value="email">
                      <form onSubmit={(e) => handleGenerate(e, 'email')} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="em-client">Client Contact *</Label>
                          <Input
                            id="em-client"
                            required
                            value={emailClient}
                            onChange={(e) => setEmailClient(e.target.value)}
                            placeholder="e.g. Sarah Connor"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="em-project">Project Context *</Label>
                          <Input
                            id="em-project"
                            required
                            value={emailProject}
                            onChange={(e) => setEmailProject(e.target.value)}
                            placeholder="e.g. Mobile API Sync"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="em-type">Notice Type</Label>
                          <Select id="em-type" value={emailType} onChange={(e) => setEmailType(e.target.value)}>
                            <option value="project update">Milestone Progress Update</option>
                            <option value="payment reminder">Billing Payment Reminder</option>
                            <option value="follow-up">Follow-up On Proposal</option>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="em-context">Additional context / Amount dues</Label>
                          <Textarea
                            id="em-context"
                            value={emailContext}
                            onChange={(e) => setEmailContext(e.target.value)}
                            placeholder="e.g. Mention that API is deployed, or specify INV amount dues..."
                          />
                        </div>

                        <Button type="submit" className="w-full font-semibold" isLoading={loading}>
                          Draft Email Notice
                        </Button>
                      </form>
                    </TabsContent>

                    {/* 3. Meeting Form */}
                    <TabsContent value="meeting">
                      <form onSubmit={(e) => handleGenerate(e, 'meeting')} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="meet-notes">Raw Transcripts / Bullet Discussions *</Label>
                          <Textarea
                            id="meet-notes"
                            required
                            value={rawNotes}
                            onChange={(e) => setRawNotes(e.target.value)}
                            placeholder="Paste raw notes. e.g. John wants Stripe checkouts completed by next Tuesday, Sarah will verify DB triggers tomorrow morning, budget is confirmed Rs 15000..."
                            className="min-h-[180px]"
                          />
                        </div>

                        <Button type="submit" className="w-full font-semibold" isLoading={loading}>
                          Summarize Transcripts
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Side Result Output Box */}
            <div className="lg:col-span-7 h-full">
              <Card className="border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Copywrite Result</CardTitle>
                    <CardDescription className="text-xs">Generated output will appear below.</CardDescription>
                  </div>
                  {output && (
                    <Button variant="outline" size="sm" className="h-8 border-slate-200 dark:border-slate-800 text-xs font-semibold" onClick={triggerCopy}>
                      {isCopied ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          Copy Text
                        </>
                      )}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-6 flex-1 flex flex-col justify-between min-h-[300px] lg:min-h-[440px]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center flex-1">
                      <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">AI is drafting copy...</p>
                    </div>
                  ) : !output ? (
                    <div className="flex flex-col items-center justify-center text-center flex-1 py-20 text-slate-350 dark:text-slate-700">
                      <Sparkles className="h-10 w-10 mb-3" />
                      <p className="text-sm font-medium">Draft Output Empty</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">
                        Fill in inputs on the left panel and submit to generate structured text.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between flex-1 gap-4">
                      {/* Text Content */}
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto whitespace-pre-wrap max-h-[340px] lg:max-h-[440px] pr-2 custom-scrollbar font-mono bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        {output}
                      </div>

                      {/* Warning message if mocked */}
                      {isMocked && (
                        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-lg text-xs leading-normal font-medium mt-auto">
                          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                          <span>
                            Running in <strong>Offline Mock Template compiler</strong>. Once you add `OPENAI_API_KEY` to your `.env.local` file, this tool will execute real live GPT-4o calls.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: Draft History */}
        <TabsContent value="history" className="outline-none">
          {historyLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : history.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="flex flex-col items-center justify-center text-center py-16 text-slate-400">
                <History className="h-8 w-8 mb-2" />
                <p className="text-sm font-semibold">No Past AI Generations</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">Generated copy drafts will get logged in this history workspace.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {history.map((item) => (
                <Card key={item.id} className="border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-850 flex flex-row justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <Badge variant="default" className="text-[9px] uppercase font-bold tracking-wider">
                          {item.type}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold truncate max-w-[220px]">
                        {item.type === 'proposal' && `Client: ${item.input_params?.clientName || 'General'}`}
                        {item.type === 'email' && `${item.input_params?.emailType || 'Notice'} Draft`}
                        {item.type === 'meeting' && 'Meeting Notes Summary'}
                      </p>
                    </div>
                    <div className="flex space-x-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyHistory(item.generated_content)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteHistory(item.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-650 hover:bg-red-50/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 flex-1">
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 p-3 rounded-lg max-h-36 overflow-y-auto whitespace-pre-wrap font-mono custom-scrollbar">
                      {item.generated_content}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
