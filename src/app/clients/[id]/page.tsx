'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  FileText,
  CreditCard,
  FolderOpen,
  Calendar,
  IndianRupee,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  name: string;
  business_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
}

interface Project {
  id: string;
  name: string;
  budget: number;
  deadline: string;
  status: string;
  priority: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  due_date: string;
  status: string;
}

interface Payment {
  id: string;
  project_name: string;
  total_amount: number;
  received: number;
  pending: number;
}

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export default function ClientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const fetchClientData = async () => {
      try {
        // 1. Fetch Client Details
        const { data: clientData, error: clientErr } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (clientErr) throw clientErr;
        setClient(clientData);

        // 2. Fetch Projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientId);
        setProjects(projectsData || []);

        // 3. Fetch Invoices
        const { data: invoicesData } = await supabase
          .from('invoices')
          .select('*')
          .eq('client_id', clientId);
        setInvoices(invoicesData || []);

        // 4. Fetch Documents
        const { data: docsData } = await supabase
          .from('documents')
          .select('*')
          .eq('client_id', clientId);
        setDocuments(docsData || []);

        // 5. Fetch Payments for these projects
        if (projectsData && projectsData.length > 0) {
          const projectIds = projectsData.map((p: any) => p.id);
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('*, projects(name)')
            .in('project_id', projectIds);

          const formattedPayments = (paymentsData || []).map((pay: any) => ({
            id: pay.id,
            project_name: pay.projects?.name || 'Unnamed Project',
            total_amount: Number(pay.total_amount) || 0,
            received: Number(pay.received) || 0,
            pending: Number(pay.pending) || 0,
          }));
          setPayments(formattedPayments);
        }
      } catch (err) {
        console.error('Failed to load client details:', err);
        router.push('/clients');
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [clientId, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!client) return null;

  // Aggregate metrics
  const activeProjectsCount = projects.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled').length;
  const totalContractValue = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const revenueCollected = payments.reduce((sum, p) => sum + p.received, 0);
  const outstandingBalance = payments.reduce((sum, p) => sum + p.pending, 0);

  return (
    <div className="space-y-6">
      {/* Header and Go Back */}
      <div className="flex items-center space-x-3">
        <Link href="/clients">
          <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 dark:border-slate-800">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{client.name}</h2>
          <p className="text-xs text-slate-500 font-medium">Client Profile Overview</p>
        </div>
      </div>

      {/* Profile Details Card + Quick Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info detail block */}
        <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Contact Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            {client.business_name && (
              <div className="flex items-center gap-2.5">
                <Building className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">{client.business_name}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <a href={`mailto:${client.email}`} className="hover:underline text-indigo-600 dark:text-indigo-400">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                <a
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5"
                >
                  {client.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{client.address}</span>
              </div>
            )}
            {client.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-xs bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-normal text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aggregated Quick Metrics cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Active Projects</span>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                {activeProjectsCount}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Across all pipelines</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Total Contract Value</span>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                ₹{totalContractValue.toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Combined project budgets</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Revenue Collected</span>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{revenueCollected.toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Advance and milestones received</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Outstanding Balance</span>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-red-500 dark:text-red-400">
                ₹{outstandingBalance.toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Milestones yet to collect</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs list directories */}
      <Tabs defaultValue="projects">
        <TabsList className="grid w-full grid-cols-4 max-w-md border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="projects" className="flex items-center gap-1">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payments</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Panel: Projects */}
        <TabsContent value="projects">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold">Client Projects</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No projects registered for this client.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                        <th className="text-left pb-3">Project Name</th>
                        <th className="text-left pb-3">Budget</th>
                        <th className="text-left pb-3">Deadline</th>
                        <th className="text-left pb-3">Priority</th>
                        <th className="text-left pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {projects.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 font-semibold">
                            <Link href={`/projects/${p.id}`} className="hover:underline text-indigo-600 dark:text-indigo-400">
                              {p.name}
                            </Link>
                          </td>
                          <td className="py-3 font-mono">₹{Number(p.budget).toLocaleString('en-IN')}</td>
                          <td className="py-3 text-slate-500">
                            {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3">
                            <PriorityBadge priority={p.priority} />
                          </td>
                          <td className="py-3">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Panel: Invoices */}
        <TabsContent value="invoices">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold">Invoices & Billing</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No invoices issued for this client.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                        <th className="text-left pb-3">Invoice Number</th>
                        <th className="text-left pb-3">Amount</th>
                        <th className="text-left pb-3">Tax %</th>
                        <th className="text-left pb-3">Due Date</th>
                        <th className="text-left pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3 font-mono">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                          <td className="py-3 text-slate-500">{inv.tax}%</td>
                          <td className="py-3 text-slate-500">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={inv.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Panel: Payments */}
        <TabsContent value="payments">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold">Project Payments Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No payment ledger records for this client.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                        <th className="text-left pb-3">Project</th>
                        <th className="text-left pb-3">Contract Value</th>
                        <th className="text-left pb-3">Milestone Collected</th>
                        <th className="text-left pb-3">Pending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">{pay.project_name}</td>
                          <td className="py-3 font-mono">₹{pay.total_amount.toLocaleString('en-IN')}</td>
                          <td className="py-3 font-mono text-emerald-600 dark:text-emerald-400">
                            ₹{pay.received.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 font-mono text-red-500">
                            ₹{pay.pending.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Panel: Documents */}
        <TabsContent value="documents">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base font-bold">Client Files</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No documents uploaded for this client.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((doc) => (
                    <div key={doc.id} className="py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-500">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-medium">{doc.file_type.split('/')[1] || 'FILE'}</p>
                        </div>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-indigo-500 hover:text-indigo-600 text-xs">
                          Download
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
