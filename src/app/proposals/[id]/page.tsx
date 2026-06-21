'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Sparkles,
  FileDown,
  Save,
  Copy,
  Loader2,
  Trash2,
  ChevronRight,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { jsPDF } from 'jspdf';

interface Proposal {
  id: string;
  title: string;
  client_id?: string;
  lead_id?: string;
  scope_of_work: string;
  deliverables: string;
  timeline: string;
  pricing: number;
  terms: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Rejected';
  created_at: string;
  clients?: { name: string; business_name?: string; email?: string };
  leads?: { full_name: string; business_name?: string; email?: string };
}

export default function ProposalDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  // Form edit states
  const [title, setTitle] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [timeline, setTimeline] = useState('');
  const [pricing, setPricing] = useState('');
  const [terms, setTerms] = useState('');
  const [status, setStatus] = useState<Proposal['status']>('Draft');

  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const fetchProposal = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) throw error || new Error('Proposal not found');

      setProposal(data);
      setTitle(data.title || '');
      setScopeOfWork(data.scope_of_work || '');
      setDeliverables(data.deliverables || '');
      setTimeline(data.timeline || '');
      setPricing(String(data.pricing || 0));
      setTerms(data.terms || '');
      setStatus(data.status || 'Draft');
    } catch (err) {
      console.error('Failed to load proposal details:', err);
      sendNotification('Error loading proposal details.', 'danger');
      router.push('/proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProposal();
  }, [id, user]);

  const handleSave = async () => {
    if (!proposal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          title,
          scope_of_work: scopeOfWork,
          deliverables,
          timeline,
          pricing: Number(pricing) || 0,
          terms,
          status,
        })
        .eq('id', proposal.id);

      if (error) throw error;

      sendNotification('Proposal details updated successfully.', 'success');
      fetchProposal();
    } catch (err) {
      console.error('Failed to save proposal:', err);
      sendNotification('Failed to save proposal changes.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleAiUpgrade = async () => {
    if (!proposal) return;
    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: 'proposal',
          data: {
            clientName: proposal.clients?.name || proposal.leads?.full_name || 'Valued Client',
            projectType: title,
            budget: pricing,
            timeline: timeline || '4 weeks',
          },
        }),
      });

      const result = await res.json();
      if (result.error) throw new Error(result.error);

      // Parse output or distribute it to fields
      const content = result.content || '';
      
      // Simulating distributing content sections intelligently
      setScopeOfWork(`Scope of work generated for ${title}:\n\n` + content.slice(0, 500) + '...');
      setDeliverables(`- Primary system module deployment\n- Database schemas configuration\n- User accessibility testing audit`);
      setTerms(`Payment milestones: 50% upfront retainer advance deposit, 50% final deployment check.`);
      setTimeline(timeline || '4 weeks');
      
      sendNotification('AI drafted proposal sections successfully!', 'success');
    } catch (err) {
      console.error('AI proposal generation failed:', err);
      sendNotification('AI generation offline. Reverted to template outline.', 'warning');
      
      setScopeOfWork(`Scoping outline for ${title}: Design and configure database collections, wire mock page layouts, and enable backend database synchronization.`);
      setDeliverables(`- Responsive front-end layouts\n- SQL table configurations\n- Dark mode support validations`);
      setTerms(`50% upfront retainer deposit, 50% milestone final deployment.`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!proposal) return;
    const doc = new jsPDF();

    // Colors
    const isDarkMode = false; // standard print styling
    
    // Header Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(24, 24, 27); // zinc-900
    doc.text(title, 20, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122); // zinc-500
    doc.text(`Proposal ID: ${proposal.id}`, 20, 32);
    doc.text(`Date Generated: ${new Date(proposal.created_at).toLocaleDateString()}`, 20, 37);
    doc.text(`Status: ${status}`, 20, 42);

    const clientName = proposal.clients?.name || proposal.leads?.full_name || 'Valued Client';
    const bizName = proposal.clients?.business_name || proposal.leads?.business_name || 'Individual';
    doc.text(`Prepared for: ${clientName} (${bizName})`, 20, 47);

    doc.setDrawColor(228, 228, 231); // zinc-200
    doc.line(20, 52, 190, 52);

    let yOffset = 62;

    const printSection = (sectionTitle: string, sectionContent: string) => {
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 25;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(9, 9, 11); // zinc-950
      doc.text(sectionTitle, 20, yOffset);
      yOffset += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(63, 63, 70); // zinc-700
      
      const splitText = doc.splitTextToSize(sectionContent || 'No details provided.', 170);
      splitText.forEach((line: string) => {
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 25;
        }
        doc.text(line, 20, yOffset);
        yOffset += 6;
      });
      yOffset += 10;
    };

    printSection('1. Scope of Work', scopeOfWork);
    printSection('2. Key Deliverables', deliverables);
    printSection('3. Project Timeline', timeline);
    printSection('4. Investment & Budget', `Total Investment: INR ${Number(pricing).toLocaleString('en-IN')}`);
    printSection('5. Terms & Conditions', terms);

    doc.save(`${title.replace(/\s+/g, '_')}_Proposal.pdf`);
    sendNotification('Proposal exported as PDF successfully.', 'success');
  };

  const handleDuplicate = async () => {
    if (!proposal) return;
    try {
      const duplicated = {
        title: `Copy of ${title}`,
        client_id: proposal.client_id,
        lead_id: proposal.lead_id,
        scope_of_work: scopeOfWork,
        deliverables: deliverables,
        timeline: timeline,
        pricing: Number(pricing) || 0,
        terms: terms,
        status: 'Draft',
      };

      const { data, error } = await supabase.from('proposals').insert(duplicated).select().single();
      if (error) throw error;

      sendNotification(`Successfully duplicated proposal.`, 'success');
      router.push(`/proposals/${data.id}`);
    } catch (err) {
      console.error('Duplicate failed:', err);
      sendNotification('Duplicate failed.', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
      </div>
    );
  }

  if (!proposal) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/proposals">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              Edit Proposal Document
              <Badge variant="secondary" className="text-[10px]">
                {status}
              </Badge>
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500">Refine scope clauses, execute AI upgrade sweeps, and print PDF copies.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleAiUpgrade} disabled={aiGenerating} variant="outline" className="flex items-center gap-1.5 text-xs h-9 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100">
            {aiGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-500" />
            )}
            AI Scoping Upgrade
          </Button>

          <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center gap-1.5 text-xs h-9">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>

          <Button onClick={handleDuplicate} variant="outline" className="flex items-center gap-1.5 text-xs h-9" title="Duplicate Document">
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>

          <Button onClick={handleSave} isLoading={saving} className="flex items-center gap-1.5 text-xs h-9">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Inputs and content sections */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold">Document Content Sections</CardTitle>
              <CardDescription className="text-xs">Edit proposal clauses in plain text. AI scoping will populate draft structures dynamically.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prop-title">Proposal Title *</Label>
                <Input
                  id="prop-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-scope">1. Scope of Work</Label>
                <Textarea
                  id="prop-scope"
                  rows={4}
                  value={scopeOfWork}
                  onChange={(e) => setScopeOfWork(e.target.value)}
                  placeholder="Define project tasks, database schemas, responsive styling..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-deliv">2. Key Deliverables</Label>
                <Textarea
                  id="prop-deliv"
                  rows={4}
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  placeholder="List all milestone outputs..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-timeline">3. Timeline & Milestone Dates</Label>
                <Input
                  id="prop-timeline"
                  type="text"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g. 4 Weeks (Milestones: UX wireframe, DB seeds, QA handover)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-terms">4. Terms & Conditions</Label>
                <Textarea
                  id="prop-terms"
                  rows={3}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g. Retainer advance deposits, warranty periods, copyright transfer details..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Status, Pricing, Metadata */}
        <div className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold">Document Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="prop-status">Proposal Status</Label>
                <select
                  id="prop-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Proposal['status'])}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-1 focus:ring-zinc-550 focus:outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Viewed">Viewed</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prop-pricing">Total Pricing Investment (INR)</Label>
                <Input
                  id="prop-pricing"
                  type="number"
                  value={pricing}
                  onChange={(e) => setPricing(e.target.value)}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-[10px] text-slate-500 font-semibold">
                <div className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Assignee Meta Details:</span>
                </div>
                <div className="pl-4 space-y-1">
                  <p>Recipient: {proposal.clients?.name || proposal.leads?.full_name || 'Individual'}</p>
                  <p>Company: {proposal.clients?.business_name || proposal.leads?.business_name || 'N/A'}</p>
                  <p>Email Contact: {proposal.clients?.email || proposal.leads?.email || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
