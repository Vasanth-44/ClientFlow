'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Copy,
  Trash2,
  TrendingUp,
  Percent,
  CheckCircle,
  FileCheck2,
  Loader2,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface Proposal {
  id: string;
  title: string;
  client_id?: string;
  lead_id?: string;
  pricing: number;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';
  created_at: string;
  clients?: { name: string; business_name?: string };
  leads?: { full_name: string; business_name?: string };
}

export default function ProposalsPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [pricing, setPricing] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProposalsData = async () => {
    if (!user) return;
    try {
      const { data: propData } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });
      setProposals(propData || []);

      const { data: clientData } = await supabase.from('clients').select('id, name, business_name');
      setClients(clientData || []);

      const { data: leadData } = await supabase.from('leads').select('id, full_name, business_name');
      setLeads(leadData || []);
    } catch (err) {
      console.error('Failed to load proposals logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposalsData();
  }, [user]);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('proposals')
        .insert({
          title,
          client_id: clientId || null,
          lead_id: leadId || null,
          pricing: Number(pricing) || 0,
          status: 'Draft',
          scope_of_work: 'Initial proposal draft outline.',
          deliverables: 'Deliverables list...',
          timeline: 'Timeline details...',
          terms: 'Standard agency agreement terms.',
        })
        .select()
        .single();

      if (error) throw error;

      sendNotification(`Successfully generated proposal draft: "${title}"`, 'success');
      setIsModalOpen(false);
      setTitle('');
      setClientId('');
      setLeadId('');
      setPricing('');
      fetchProposalsData();
    } catch (err) {
      console.error('Failed to generate proposal:', err);
      sendNotification('Failed to generate proposal draft.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateProposal = async (proposal: Proposal) => {
    try {
      const { data: fullProp, error: getErr } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposal.id)
        .single();

      if (getErr || !fullProp) throw getErr || new Error('Not found');

      const duplicated = {
        title: `Copy of ${fullProp.title}`,
        client_id: fullProp.client_id,
        lead_id: fullProp.lead_id,
        scope_of_work: fullProp.scope_of_work,
        deliverables: fullProp.deliverables,
        timeline: fullProp.timeline,
        pricing: fullProp.pricing,
        terms: fullProp.terms,
        status: 'Draft',
      };

      const { error: insErr } = await supabase.from('proposals').insert(duplicated);
      if (insErr) throw insErr;

      sendNotification(`Duplicated proposal: ${proposal.title}`, 'success');
      fetchProposalsData();
    } catch (err) {
      console.error('Failed to duplicate proposal:', err);
      sendNotification('Failed to duplicate proposal.', 'danger');
    }
  };

  const handleDeleteProposal = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete proposal: "${name}"?`)) return;

    try {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) throw error;

      sendNotification(`Deleted proposal: ${name}`, 'info');
      fetchProposalsData();
    } catch (err) {
      console.error('Failed to delete proposal:', err);
      sendNotification('Failed to delete proposal.', 'danger');
    }
  };

  // Metrics calculations
  const totalCount = proposals.length;
  const acceptedCount = proposals.filter((p) => p.status === 'Accepted').length;
  const conversionRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;
  const totalValue = proposals.reduce((sum, p) => sum + (Number(p.pricing) || 0), 0);

  // Filters
  const filteredProposals = proposals.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.clients?.name && p.clients.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.leads?.full_name && p.leads.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Proposals Document Vault</h1>
          <p className="text-xs text-slate-550 font-semibold mt-1">Draft, send, and audit agreements with conversion tracking statistics.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 text-xs">
          <Plus className="h-4 w-4" />
          Create Proposal
        </Button>
      </div>

      {/* Summary Metrics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Total Drafted</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{totalCount}</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Accepted Proposals</span>
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{acceptedCount}</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Conversion Rate</span>
              <Percent className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">{conversionRate}%</h3>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
              <span>Total Pipeline Value</span>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-50">₹{totalValue.toLocaleString('en-IN')}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by title or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs border-slate-200/80 dark:border-slate-800"
            />
          </div>
          <div className="flex w-full md:w-auto gap-3 items-center justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-1 focus:ring-zinc-550 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Viewed">Viewed</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Proposals table */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-800 bg-slate-55/50 dark:bg-slate-900/10">
              <TableHead className="font-bold text-xs">Proposal Title</TableHead>
              <TableHead className="font-bold text-xs">Recipient</TableHead>
              <TableHead className="font-bold text-xs">Value</TableHead>
              <TableHead className="font-bold text-xs">Status</TableHead>
              <TableHead className="font-bold text-xs">Created At</TableHead>
              <TableHead className="font-bold text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-450 text-xs font-semibold">
                  No proposal records found. Click "Create Proposal" to add one.
                </TableCell>
              </TableRow>
            ) : (
              filteredProposals.map((prop) => (
                <TableRow key={prop.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <TableCell className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    <Link href={`/proposals/${prop.id}`} className="hover:underline text-indigo-650 dark:text-indigo-400">
                      {prop.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-semibold">
                    {prop.clients?.name ? (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {prop.clients.name} (Client)
                      </span>
                    ) : prop.leads?.full_name ? (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {prop.leads.full_name} (Lead)
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-semibold text-slate-850 dark:text-slate-100">
                    ₹{Number(prop.pricing).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant={
                        prop.status === 'Accepted'
                          ? 'success'
                          : prop.status === 'Draft'
                          ? 'secondary'
                          : prop.status === 'Rejected'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {prop.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-450 font-mono">
                    {new Date(prop.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/proposals/${prop.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-indigo-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicateProposal(prop)}
                        title="Duplicate Proposal"
                        className="h-8 w-8 text-slate-500 hover:text-amber-500"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProposal(prop.id, prop.title)}
                        className="h-8 w-8 text-slate-500 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE MODAL */}
      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Proposal Draft">
        <form onSubmit={handleCreateProposal} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="prop-title">Proposal Title *</Label>
            <Input
              id="prop-title"
              type="text"
              required
              placeholder="e.g. Website Scope & Redesign Agreement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="prop-client">Assign to Client (Optional)</Label>
              <Select id="prop-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">-- Select Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.business_name ? `(${c.business_name})` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="prop-lead">Assign to Lead (Optional)</Label>
              <Select id="prop-lead" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                <option value="">-- Select Lead --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name} {l.business_name ? `(${l.business_name})` : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prop-price">Total Value (INR, Optional)</Label>
            <Input
              id="prop-price"
              type="number"
              placeholder="50000"
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              Create Proposal
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
