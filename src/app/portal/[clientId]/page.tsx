'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Building,
  Briefcase,
  FileText,
  IndianRupee,
  Clock,
  Download,
  ShieldAlert,
  Loader2,
  Calendar,
  CheckCircle,
  FileCheck2,
} from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  business_name?: string;
  email?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  deadline?: string;
  budget: number;
}

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  due_date?: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

interface Payment {
  id: string;
  total_amount: number;
  received: number;
  pending: number;
  project_id: string;
  projects?: { name: string };
}

export default function ClientPortalDashboard() {
  const { clientId } = useParams();
  const router = useRouter();
  const { sendNotification } = useNotifications();

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortalData = async () => {
      if (!clientId) return;
      try {
        // 1. Fetch client
        const { data: clientData, error: clientErr } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientErr || !clientData) throw clientErr || new Error('Client not found');
        setClient(clientData);

        // 2. Fetch projects
        const { data: projData } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientId);
        const activeProjs = projData || [];
        setProjects(activeProjs);

        // 3. Fetch documents
        const { data: docData } = await supabase
          .from('documents')
          .select('*')
          .eq('client_id', clientId);
        setDocuments(docData || []);

        // 4. Fetch invoices
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', clientId);
        setInvoices(invData || []);

        if (activeProjs.length > 0) {
          const projIds = activeProjs.map((p: any) => p.id);
          
          // 5. Fetch payments
          const { data: payData } = await supabase
            .from('payments')
            .select('*, projects(name)')
            .in('project_id', projIds);
          setPayments(payData || []);

          // 6. Fetch tasks
          const { data: taskData } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', projIds);
          setTasks(taskData || []);
        }
      } catch (err) {
        console.error('Failed to load portal context:', err);
        sendNotification?.('Access token is invalid.', 'danger');
        router.push('/portal');
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
      </div>
    );
  }

  if (!client) return null;

  // Calculate task completions
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
            <Building className="h-3.5 w-3.5" />
            <span>Secure Client Portal</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome, {client.name}
          </h1>
          {client.business_name && (
            <p className="text-xs font-semibold text-zinc-450">{client.business_name}</p>
          )}
        </div>
        <Link href="/portal">
          <Button variant="outline" className="text-xs">
            Log Out Portal
          </Button>
        </Link>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Project progress */}
        <Card className="border-slate-200 dark:border-slate-850">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Briefcase className="h-4 w-4 text-zinc-400" />
              Project Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span>{completedTasks} / {totalTasks} Tasks Done</span>
              <span className="text-indigo-650 dark:text-indigo-400">{progressPercent}%</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-900 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-black dark:bg-white h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card className="border-slate-200 dark:border-slate-850">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <FileText className="h-4 w-4 text-zinc-400" />
              Outstanding Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {invoices.filter((i) => i.status !== 'Paid').length} Pending
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Verify invoice details below for direct bank drafts.</p>
          </CardContent>
        </Card>

        {/* Payments Summary */}
        <Card className="border-slate-200 dark:border-slate-850">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <IndianRupee className="h-4 w-4 text-zinc-400" />
              Retainer Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-50">
              ₹{payments.reduce((sum, p) => sum + (Number(p.received) || 0), 0).toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Total settled payments recorded in milestone ledgers.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Projects, Milestones, Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects and deliverables timeline */}
          <Card className="border-slate-200 dark:border-slate-850">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-slate-400" />
                Active Deliverables & Milestones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">No active projects assigned to your portal profile.</p>
              ) : (
                projects.map((proj) => (
                  <div key={proj.id} className="p-4 space-y-3 hover:bg-slate-55/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-55">{proj.name}</h4>
                        <p className="text-xs text-slate-450 mt-0.5">{proj.description || 'No description added.'}</p>
                      </div>
                      <Badge variant={proj.status === 'Completed' ? 'success' : 'warning'}>
                        {proj.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100/50 dark:border-slate-800/40">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Deadline: {proj.deadline ? new Date(proj.deadline).toLocaleDateString() : 'Flexible'}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        Budget: ₹{Number(proj.budget).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Invoices Vault */}
          <Card className="border-slate-200 dark:border-slate-850 overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-400" />
                Shared Billing Invoices
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <TableHead className="font-bold text-xs">Invoice ID</TableHead>
                  <TableHead className="font-bold text-xs">Amount Due</TableHead>
                  <TableHead className="font-bold text-xs">Due Date</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-slate-400 font-medium">
                      No invoices recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-bold text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        ₹{(Number(inv.amount) * (1 + Number(inv.tax) / 100)).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Upon receipt'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={inv.status === 'Paid' ? 'success' : inv.status === 'Overdue' ? 'danger' : 'warning'}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Right Side: Shared Documents / File Downloads */}
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-850">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-slate-400" />
                Shared Asset Vault ({documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 text-center">No deliverables uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between gap-2 hover:bg-slate-55/10">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-450 hover:text-black dark:hover:text-white shrink-0"
                      onClick={() => alert(`Simulated download trigger for: ${doc.file_name}`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
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
