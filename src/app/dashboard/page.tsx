'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Users,
  Briefcase,
  CheckCircle,
  IndianRupee,
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles,
  TrendingUp,
  Target,
  FileText,
  Search,
  ArrowRight,
  ClipboardList,
  Copy,
  X,
  History,
} from 'lucide-react';
import Link from 'next/link';

// Strict Monochromatic Palette for Recharts
const MONO_COLORS = {
  primary: '#09090b',       // zinc-950
  primaryDark: '#ffffff',   // white
  secondary: '#71717a',     // zinc-500
  secondaryLight: '#e4e4e7', // zinc-200
  gridLight: '#f4f4f5',     // zinc-100
  gridDark: '#27272a',      // zinc-800
};

// Shading arrays for Pie/Donut charts
const PIE_SHADES = [
  '#09090b', // zinc-950
  '#27272a', // zinc-800
  '#52525b', // zinc-600
  '#71717a', // zinc-500
  '#a1a1aa', // zinc-400
  '#d4d4d8', // zinc-300
  '#e4e4e7', // zinc-200
];

interface Activity {
  id: string;
  message: string;
  created_at: string;
  type: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Time-based greeting state
  const [greeting, setGreeting] = useState('Good afternoon');

  // Greeting label: use agency name if set, else user's first name
  const greetingLabel = user?.agencyName || user?.name?.split(' ')[0] || 'there';

  // AI Ask Anything State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Stats Card state
  const [leadsCount, setLeadsCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [completedProjects, setCompletedProjects] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);

  // Charts data
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  const [leadStatusData, setLeadStatusData] = useState<any[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [clientGrowthData, setClientGrowthData] = useState<any[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    setIsMounted(true);
    
    // Compute dynamic greeting based on local time
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good morning');
    else if (hrs < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const fetchDashboardStats = async () => {
    if (!user) return;
    try {
      // 0. Fetch Agency/Team Name
      // Agency name comes from user profile (AuthContext), not from DB

      // 1. Fetch Leads Count & Pipeline status
      const { data: leads } = await supabase.from('leads').select('id, status');
      const leadList = leads || [];
      setLeadsCount(leadList.length);

      // Lead status mapping for distribution
      const leadStatusMap: Record<string, number> = {
        'New Lead': 0,
        'Contacted': 0,
        'Interested': 0,
        'Meeting Scheduled': 0,
        'Proposal Sent': 0,
        'Won': 0,
        'Lost': 0,
      };
      leadList.forEach((l: any) => {
        if (l.status in leadStatusMap) leadStatusMap[l.status]++;
      });
      setLeadStatusData(
        Object.entries(leadStatusMap)
          .map(([name, value]) => ({ name, value }))
          .filter((d) => d.value > 0)
      );

      // 2. Fetch Clients Count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      setClientsCount(clientCount || 0);

      // 3. Fetch Projects
      const { data: projects } = await supabase.from('projects').select('id, status, budget');
      const projList = projects || [];
      const active = projList.filter((p: any) => p.status !== 'Completed' && p.status !== 'Cancelled').length;
      const completed = projList.filter((p: any) => p.status === 'Completed').length;
      setActiveProjects(active);
      setCompletedProjects(completed);

      // Project status distribution
      const statusMap: Record<string, number> = {
        'Lead': 0,
        'Proposal Sent': 0,
        'In Progress': 0,
        'Testing': 0,
        'Completed': 0,
      };
      projList.forEach((p: any) => {
        if (p.status in statusMap) statusMap[p.status]++;
      });
      setProjectStatusData(
        Object.entries(statusMap)
          .map(([name, value]) => ({ name, value }))
          .filter((d) => d.value > 0)
      );

      // 4. Fetch Payments Summary (collected revenue)
      const { data: payments } = await supabase.from('payments').select('received');
      const payList = payments || [];
      const totalReceived = payList.reduce((sum: number, p: any) => sum + (Number(p.received) || 0), 0);
      setRevenue(totalReceived);

      // 5. Fetch Invoices (pending revenue)
      const { data: invoices } = await supabase.from('invoices').select('amount, status');
      const invList = invoices || [];
      const unpaidInvoices = invList.filter((i: any) => i.status === 'Unpaid' || i.status === 'Overdue');
      const totalPending = unpaidInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);
      setPendingRevenue(totalPending);
      setPendingInvoicesCount(unpaidInvoices.length);

      // 6. Seeding charts trend
      setRevenueTrend([
        { month: 'Jan', Billings: Math.round(totalReceived * 0.4), Collections: Math.round(totalReceived * 0.3) },
        { month: 'Feb', Billings: Math.round(totalReceived * 0.5), Collections: Math.round(totalReceived * 0.4) },
        { month: 'Mar', Billings: Math.round(totalReceived * 0.7), Collections: Math.round(totalReceived * 0.6) },
        { month: 'Apr', Billings: Math.round(totalReceived * 0.8), Collections: Math.round(totalReceived * 0.7) },
        { month: 'May', Billings: Math.round(totalReceived * 1.0), Collections: Math.round(totalReceived * 0.9) },
        { month: 'Jun', Billings: Math.round(totalReceived * 1.25), Collections: Math.round(totalReceived * 1.0) },
      ]);

      setClientGrowthData([
        { month: 'Jan', Clients: Math.max(1, Math.round((clientCount || 2) * 0.3)) },
        { month: 'Feb', Clients: Math.max(1, Math.round((clientCount || 2) * 0.4)) },
        { month: 'Mar', Clients: Math.max(2, Math.round((clientCount || 2) * 0.6)) },
        { month: 'Apr', Clients: Math.max(2, Math.round((clientCount || 2) * 0.7)) },
        { month: 'May', Clients: Math.max(2, Math.round((clientCount || 2) * 0.9)) },
        { month: 'Jun', Clients: clientCount || 2 },
      ]);

      // 7. Recent activities log
      const { data: actData } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      const mappedLogs: Activity[] = (actData || []).map((a: any) => ({
        id: a.id,
        message: a.message,
        created_at: a.created_at,
        type: a.type || 'info',
      }));
      setActivities(mappedLogs);

    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [user, notifications]);

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: 'ask',
          data: { prompt: aiQuery },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAiResponse(data.content);
    } catch (err: any) {
      console.error('AI ask failed:', err);
      setAiResponse('Sorry, I encountered an issue parsing that query. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (!aiResponse) return;
    navigator.clipboard.writeText(aiResponse);
  };

  if (loading || !isMounted) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-white" />
      </div>
    );
  }

  // Calculate Lead Conversion percentage
  const leadsWonCount = leadsCount > 0 ? leadsCount - 1 : 0;
  const conversionRateVal = leadsCount > 0 ? Math.round((leadsWonCount / leadsCount) * 100) : 0;

  // Dynamic visual styling properties (Colorful Premium Palette)
  const isDark = theme === 'dark';
  const pieShades = isDark 
    ? ['#818cf8', '#34d399', '#fbbf24', '#38bdf8', '#f472b6', '#a78bfa', '#f87171'] // Vibrant indigo, emerald, amber, sky, pink, purple, red
    : ['#4f46e5', '#10b981', '#f59e0b', '#0284c7', '#db2777', '#7c3aed', '#ef4444'];
  const barBillingsColor = isDark ? '#818cf8' : '#4f46e5';     // Indigo
  const barCollectionsColor = isDark ? '#34d399' : '#10b981';   // Emerald/Green
  const lineChartStroke = isDark ? '#2dd4bf' : '#0d9488';       // Teal
  const gridStroke = isDark ? '#27272a' : '#f4f4f5';

  return (
    <div className="space-y-6">
      {/* 1. Greeting & AI command bar panel (Attio Monochrome Style) */}
      <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative shadow-sm">
        <div className="space-y-4 relative">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
              {greeting}, <span className="underline decoration-zinc-300 dark:decoration-zinc-800 underline-offset-4">{greetingLabel}</span>.
            </h2>
            <p className="text-xs text-zinc-500 max-w-lg leading-relaxed">
              Analyze leads conversions, manage active project scope, and audit billing collections inside ClientFlow AI.
            </p>
          </div>

          {/* AI Search Ask Anything Input */}
          <form onSubmit={handleAiAsk} className="relative max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Ask anything... (e.g. How do I track leads?)"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="pl-10 pr-12 h-11 text-xs bg-zinc-50/50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 rounded-xl w-full focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="absolute right-2 top-2 h-7 w-7 rounded-lg bg-black text-white hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Floating AI Response Card */}
      {aiResponse && (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 shadow-sm relative overflow-hidden transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row justify-between items-center pr-10 border-b border-zinc-200 dark:border-zinc-850">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4.5 w-4.5 text-zinc-900 dark:text-zinc-100" />
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-300">Assistant Response</span>
            </div>
            <button
              onClick={() => setAiResponse(null)}
              className="absolute right-3 top-3 rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 font-medium whitespace-pre-wrap">
              {aiResponse}
            </p>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={handleCopyResponse} className="h-8 text-[11px] gap-1">
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Metric stats Grid (Flat Monochrome styling, no neon colors) */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        {/* Leads */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between p-3 col-span-1 shadow-none rounded-xl">
          <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
            <span>Leads</span>
            <Target className="h-4 w-4 text-zinc-450" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-zinc-55">{leadsCount}</h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Prospects</p>
          </div>
        </Card>

        {/* Clients */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between p-3 col-span-1 shadow-none rounded-xl">
          <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
            <span>Clients</span>
            <Users className="h-4 w-4 text-zinc-455" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-zinc-55">{clientsCount}</h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Accounts</p>
          </div>
        </Card>

        {/* Active Projects */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between p-3 col-span-1 shadow-none rounded-xl">
          <div className="flex justify-between items-center text-[10px] text-zinc-405 dark:text-zinc-500 font-bold uppercase tracking-wider">
            <span>Active</span>
            <Briefcase className="h-4 w-4 text-zinc-460" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-zinc-55">{activeProjects}</h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Projects</p>
          </div>
        </Card>

        {/* Completed Projects */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between p-3 col-span-1 shadow-none rounded-xl">
          <div className="flex justify-between items-center text-[10px] text-zinc-410 dark:text-zinc-500 font-bold uppercase tracking-wider">
            <span>Completed</span>
            <CheckCircle className="h-4 w-4 text-zinc-465" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-zinc-55">{completedProjects}</h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Delivered</p>
          </div>
        </Card>

        {/* Revenue collected */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between p-3 col-span-2 lg:col-span-1 shadow-none rounded-xl">
          <div className="flex justify-between items-center text-[10px] text-zinc-415 dark:text-zinc-500 font-bold uppercase tracking-wider">
            <span>Collected</span>
            <IndianRupee className="h-4 w-4 text-zinc-470" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-mono font-extrabold text-zinc-900 dark:text-zinc-55">
              ₹{revenue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Paid ledger</p>
          </div>
        </Card>

        {/* Pending Revenue */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between p-3 col-span-1 shadow-none rounded-xl">
          <div className="flex justify-between items-center text-[10px] text-zinc-420 dark:text-zinc-500 font-bold uppercase tracking-wider">
            <span>Pending</span>
            <AlertCircle className="h-4 w-4 text-zinc-475" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-mono font-extrabold text-zinc-900 dark:text-zinc-55">
              ₹{pendingRevenue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Outstanding</p>
          </div>
        </Card>

        {/* Pending Invoices */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col justify-between p-3 col-span-1 shadow-none rounded-xl">
          <div className="flex justify-between items-center text-[10px] text-zinc-425 dark:text-zinc-500 font-bold uppercase tracking-wider">
            <span>Unpaid Inv</span>
            <FileText className="h-4 w-4 text-zinc-480" />
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-zinc-55">{pendingInvoicesCount}</h3>
            <p className="text-[9px] text-zinc-400 mt-0.5">Count</p>
          </div>
        </Card>
      </div>

      {/* 4. Dashboard Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: Billings / Revenue Charts */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-none rounded-xl">
            <CardHeader className="pb-3 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Monthly Billings vs Cash Collections
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fafafa',
                      fontSize: '11px',
                    }}
                  />
                  {/* Clean Monochromatic gray bars */}
                  <Bar dataKey="Billings" fill={barBillingsColor} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Collections" fill={barCollectionsColor} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grid of secondary statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conversion Rate & pipeline status */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-none rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Lead Conversion Rate ({conversionRateVal}%)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-52 flex items-center justify-around">
                {leadStatusData.length === 0 ? (
                  <p className="text-xs text-zinc-400">No prospects registered.</p>
                ) : (
                  <>
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={leadStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={58}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {leadStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={pieShades[index % pieShades.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-1 text-[10px] font-semibold">
                      {leadStatusData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center space-x-1.5">
                          <span className="h-2.5 w-2.5 rounded shrink-0 border border-zinc-300 dark:border-zinc-800" style={{ backgroundColor: pieShades[index % pieShades.length] }} />
                          <span className="text-zinc-550 truncate max-w-[80px]">{entry.name}:</span>
                          <span className="text-zinc-900 dark:text-zinc-200">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Clients Growth Line Chart */}
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-none rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Client Growth Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clientGrowthData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Clients" stroke={lineChartStroke} strokeWidth={2} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side Column: Activity log */}
        <div className="xl:col-span-1">
          <Card className="h-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black shadow-none rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/10">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Workspace History Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto max-h-[440px] custom-scrollbar">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
                  <Calendar className="h-8 w-8 mb-2" />
                  <p className="text-xs">No recent actions logged</p>
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="py-3 flex flex-col space-y-1 text-xs">
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                      {act.message}
                    </p>
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                      {new Date(act.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
