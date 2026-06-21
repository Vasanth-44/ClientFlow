'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { calculateLeadScore, getLeadPriorityBadge } from '../leads/page';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  Target,
  PhoneCall,
  Loader2,
  Calendar,
  AlertCircle,
  Clock,
  UserCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AiSalesAssistantPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  // Database contexts
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  // Chat interface states
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: `Hello! I am your **AI Sales Assistant**. I can help you analyze your CRM data, find hot leads, suggest follow-up actions, and summarize deal pipelines.

Try selecting one of the suggested prompts or type a custom question below!`,
      timestamp: new Date(),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch CRM context data
  const fetchCrmContext = async () => {
    if (!user) return;
    try {
      const [
        { data: leadsData },
        { data: clientsData },
        { data: callLogsData },
        { data: proposalsData },
        { data: activitiesData },
      ] = await Promise.all([
        supabase.from('leads').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('call_logs').select('*'),
        supabase.from('proposals').select('*'),
        supabase.from('activities').select('*'),
      ]);

      setLeads(leadsData || []);
      setClients(clientsData || []);
      setCallLogs(callLogsData || []);
      setProposals(proposalsData || []);
      setActivities(activitiesData || []);
    } catch (err) {
      console.error('Failed to load sales database context:', err);
      sendNotification('Could not sync local sales metrics.', 'danger');
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    fetchCrmContext();
  }, [user]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Sales Metrics calculations
  const pipelineValue = proposals
    .filter((p) => p.status === 'Sent' || p.status === 'Viewed' || p.status === 'Draft' || p.status === 'Accepted')
    .reduce((sum, p) => sum + (Number(p.pricing) || 0), 0);

  const hotLeadsCount = leads.filter((l) => {
    const score = calculateLeadScore(l, activities, callLogs, proposals);
    return score >= 70;
  }).length;

  const pendingCallsCount = leads.filter((l) => l.status === 'New Lead').length;

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputVal;
    if (!textToSend.trim() || chatLoading) return;

    if (!customPrompt) {
      setInputVal('');
    }

    const newMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: 'sales_assistant',
          data: {
            prompt: textToSend,
            leads,
            clients,
            callLogs,
            proposals,
          },
        }),
      });

      const responseData = await res.json();
      if (responseData.error) throw new Error(responseData.error);

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'assistant',
          content: responseData.content,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error('AI Sales assistant call failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'assistant',
          content: `Sorry, I encountered an issue: ${err.message || 'Server connection error'}. Please try again later.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummarizeLead = () => {
    if (!selectedLeadId) return;
    const targetLead = leads.find((l) => l.id === selectedLeadId);
    if (!targetLead) return;

    handleSendMessage(`Summarize lead profile for ${targetLead.full_name} and analyze potential value.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-500" />
            AI Sales Assistant
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Analyze your CRM pipeline, generate summaries, and discover follow-up recommendations.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Pipeline Value</span>
                <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  ₹{pipelineValue.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Hot Prospects (&gt;= 70)</span>
                <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {hotLeadsCount} Leads
                </p>
              </div>
              <div className="p-3 bg-red-500/10 text-red-650 rounded-lg">
                <Zap className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Uncontacted New Leads</span>
                <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {pendingCallsCount} Leads
                </p>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-lg">
                <Target className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Logged Outreach Calls</span>
                <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {callLogs.length} Completed
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-650 rounded-lg">
                <PhoneCall className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Action Suggestions Panel */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Recommended Actions
              </CardTitle>
              <CardDescription className="text-xs">
                Run immediate diagnostic checks on active leads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-left text-xs h-auto py-2.5 px-3 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                onClick={() => handleSendMessage('Which leads should I contact today?')}
                disabled={chatLoading || loadingContext}
              >
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">Daily Follow-Ups</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Which leads should I contact today?</p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-left text-xs h-auto py-2.5 px-3 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                onClick={() => handleSendMessage('Show highest value opportunities.')}
                disabled={chatLoading || loadingContext}
              >
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">High Value Scoping</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Show highest value opportunities.</p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-left text-xs h-auto py-2.5 px-3 border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                onClick={() => handleSendMessage('Give me sales pipeline insights and retention actions.')}
                disabled={chatLoading || loadingContext}
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">General Pipeline Analysis</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Summary insights for Won/Lost margins.</p>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Lead Profiler
              </CardTitle>
              <CardDescription className="text-xs">
                Select a lead to extract an instant timeline summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full h-10 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black text-xs font-semibold text-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-400"
                  disabled={loadingContext}
                >
                  <option value="">Select a Lead Profile...</option>
                  {leads.map((l) => {
                    const score = calculateLeadScore(l, activities, callLogs, proposals);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.full_name} ({l.business_name || 'Individual'}) - Score: {score}
                      </option>
                    );
                  })}
                </select>
              </div>

              <Button
                className="w-full text-xs font-semibold h-9"
                onClick={handleSummarizeLead}
                disabled={!selectedLeadId || chatLoading}
              >
                <UserCheck className="h-4 w-4 mr-1.5" />
                Summarize Prospect
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Chat Console Panel */}
        <div className="lg:col-span-8">
          <Card className="border-zinc-200 dark:border-zinc-800 h-[500px] flex flex-col">
            {/* Console Title */}
            <CardHeader className="border-b border-zinc-200 dark:border-zinc-800/60 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">GPT-4o Agent Stream</span>
                </div>
                <span className="text-[10px] text-zinc-400">Context active ({leads.length} records mapped)</span>
              </div>
            </CardHeader>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-zinc-950/20">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black font-medium rounded-br-none shadow-sm'
                        : 'bg-white border border-zinc-200 text-zinc-800 dark:bg-black dark:border-zinc-800/80 dark:text-zinc-200 rounded-bl-none shadow-sm shadow-black/5'
                    }`}
                  >
                    {/* Render markdown style headings and bullet points cleanly */}
                    <div className="space-y-1.5 whitespace-pre-wrap">
                      {msg.content.split('\n').map((line, lidx) => {
                        // Check for bullet lists
                        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                          return (
                            <div key={lidx} className="pl-3 flex items-start gap-1">
                              <span className="text-indigo-500">•</span>
                              <span>{line.replace(/^[\s-*]+/, '')}</span>
                            </div>
                          );
                        }
                        // Check for numbered lists
                        if (/^\d+\.\s/.test(line.trim())) {
                          const num = line.match(/^\d+/)?.toString();
                          return (
                            <div key={lidx} className="pl-3 flex items-start gap-1">
                              <span className="text-indigo-500 font-semibold">{num}.</span>
                              <span>{line.replace(/^\d+\.\s+/, '')}</span>
                            </div>
                          );
                        }
                        // Check for bold styling
                        const matches = line.match(/\*\*(.*?)\*\*/g);
                        if (matches) {
                          let formattedLine: React.ReactNode[] = [];
                          let remaining = line;
                          let matchIdx = 0;
                          while (remaining.includes('**')) {
                            const start = remaining.indexOf('**');
                            const end = remaining.indexOf('**', start + 2);
                            if (end === -1) break;
                            
                            formattedLine.push(remaining.substring(0, start));
                            formattedLine.push(
                              <strong key={matchIdx++} className="font-bold text-black dark:text-white">
                                {remaining.substring(start + 2, end)}
                              </strong>
                            );
                            remaining = remaining.substring(end + 2);
                          }
                          formattedLine.push(remaining);
                          return <p key={lidx}>{formattedLine}</p>;
                        }
                        
                        // Check for headings
                        if (line.trim().startsWith('###')) {
                          return (
                            <h4 key={lidx} className="font-bold text-zinc-950 dark:text-white text-xs mt-3 mb-1">
                              {line.replace(/^###\s+/, '')}
                            </h4>
                          );
                        }
                        if (line.trim().startsWith('##')) {
                          return (
                            <h3 key={lidx} className="font-bold text-zinc-950 dark:text-white text-sm mt-3 mb-1">
                              {line.replace(/^##\s+/, '')}
                            </h3>
                          );
                        }
                        return <p key={lidx}>{line}</p>;
                      })}
                    </div>
                    <span className="block text-[8px] text-zinc-400 mt-2 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-zinc-200 dark:bg-black dark:border-zinc-800 text-zinc-500 rounded-xl rounded-bl-none px-4 py-3 text-xs flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    <span>Analyzing pipeline records...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <Input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask about your leads or opportunities..."
                  className="flex-1 text-xs h-9 bg-zinc-50/50 border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800 focus-visible:ring-zinc-400"
                  disabled={chatLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  disabled={!inputVal.trim() || chatLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
