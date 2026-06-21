'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { LeadStatusBadge } from '../page';
import {
  ArrowLeft,
  Calendar,
  Users,
  Briefcase,
  Loader2,
  Trash2,
  Edit2,
  Sparkles,
  Phone,
  Mail,
  ExternalLink,
  MessageSquare,
  Compass,
  CheckCircle,
  Plus,
  Activity,
  History,
  Send,
  UserCheck,
  Building,
} from 'lucide-react';

interface Lead {
  id: string;
  full_name: string;
  business_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  business_category?: string;
  lead_source?: string;
  status: string;
  notes?: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  message: string;
  type: string;
  created_at: string;
}

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Activity Log input State
  const [manualLogText, setManualLogText] = useState('');
  const [logType, setLogType] = useState('notes');
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Edit Lead Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBusiness, setEditBusiness] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updatingLead, setUpdatingLead] = useState(false);

  // Conversion Wizard State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [clientAddress, setClientAddress] = useState('');
  const [createProject, setCreateProject] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');
  const [projectPriority, setProjectPriority] = useState('Medium');
  const [converting, setConverting] = useState(false);

  const fetchLeadData = async () => {
    if (!leadId || !user) return;
    try {
      // 1. Fetch Lead
      const { data: leadData, error: leadErr } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadErr) throw leadErr;
      setLead(leadData);

      // Pre-populate edits
      setEditName(leadData.full_name);
      setEditBusiness(leadData.business_name || '');
      setEditEmail(leadData.email || '');
      setEditPhone(leadData.phone || '');
      setEditWebsite(leadData.website || '');
      setEditCategory(leadData.business_category || 'Software Development');
      setEditSource(leadData.lead_source || 'Self-Sourced');
      setEditStatus(leadData.status);
      setEditNotes(leadData.notes || '');

      // Pre-populate conversion project
      setProjectName(leadData.business_name ? `${leadData.business_name} Website/SaaS Setup` : `${leadData.full_name} Project`);

      // 2. Fetch Activity log
      const { data: actData } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      setActivities(actData || []);
    } catch (err) {
      console.error('Error fetching lead profile data:', err);
      sendNotification('Failed to load lead details.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, [leadId, user]);

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLogText.trim() || !leadId) return;

    setLoggingActivity(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          lead_id: leadId,
          message: manualLogText,
          type: logType,
        })
        .select()
        .single();

      if (error) throw error;

      setActivities([data, ...activities]);
      setManualLogText('');
      sendNotification('Timeline event logged.', 'success');
    } catch (err) {
      console.error('Failed to log activity:', err);
      sendNotification('Failed to save timeline note.', 'danger');
    } finally {
      setLoggingActivity(false);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !leadId) return;

    setUpdatingLead(true);
    try {
      const updates = {
        full_name: editName,
        business_name: editBusiness || null,
        email: editEmail || null,
        phone: editPhone || null,
        website: editWebsite || null,
        business_category: editCategory,
        lead_source: editSource,
        status: editStatus,
        notes: editNotes || null,
      };

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;

      setLead(data);
      setIsEditModalOpen(false);
      sendNotification('Lead updated successfully.', 'success');

      // Log update activity
      const { data: actData } = await supabase
        .from('activities')
        .insert({
          lead_id: leadId,
          message: `Lead details updated by administrator.`,
          type: 'lead',
        })
        .select()
        .single();
      
      if (actData) setActivities([actData, ...activities]);

    } catch (err) {
      console.error('Failed to update lead:', err);
      sendNotification('Failed to save changes.', 'danger');
    } finally {
      setUpdatingLead(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!lead || !confirm(`Delete lead: ${lead.full_name}? This cannot be undone.`)) return;

    try {
      const { error } = await supabase.from('leads').delete().eq('id', lead.id);
      if (error) throw error;

      sendNotification('Lead deleted successfully.', 'info');
      router.push('/leads');
    } catch (err) {
      console.error('Failed to delete lead:', err);
      sendNotification('Failed to delete lead.', 'danger');
    }
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !user) return;

    setConverting(true);
    try {
      // 1. Create client entry
      const newClientObj = {
        name: lead.full_name,
        business_name: lead.business_name || null,
        email: lead.email || null,
        phone: lead.phone || null,
        website: lead.website || null,
        address: clientAddress || null,
        notes: lead.notes || null,
      };

      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .insert(newClientObj)
        .select()
        .single();

      if (clientErr) throw clientErr;

      let projectCreatedMsg = '';
      let createdProjectId = '';

      // 2. Create project entry if selected
      if (createProject && projectName.trim()) {
        const newProjectObj = {
          client_id: clientData.id,
          name: projectName,
          description: lead.notes || `Project initialized for ${lead.full_name}.`,
          budget: Number(projectBudget) || 0,
          deadline: projectDeadline || null,
          priority: projectPriority,
          status: 'Planning',
        };

        const { data: projectData, error: projErr } = await supabase
          .from('projects')
          .insert(newProjectObj)
          .select()
          .single();

        if (projErr) throw projErr;
        createdProjectId = projectData.id;
        projectCreatedMsg = ` Created project "${projectName}".`;
      }

      // 3. Update lead status to 'Won'
      await supabase
        .from('leads')
        .update({ status: 'Won' })
        .eq('id', lead.id);

      // 4. Log conversion event
      await supabase.from('activities').insert({
        lead_id: lead.id,
        client_id: clientData.id,
        message: `Converted Lead to Client account.${projectCreatedMsg}`,
        type: 'conversion',
      });

      sendNotification(`Successfully converted lead to Client: ${lead.full_name}`, 'success');
      setIsConvertModalOpen(false);

      // Redirect to newly created Client page
      router.push(`/clients/${clientData.id}`);
    } catch (err) {
      console.error('Failed to convert lead to client:', err);
      sendNotification('Conversion process encountered an error.', 'danger');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-500">Lead record not found.</p>
        <Link href="/leads">
          <Button size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Leads list
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and profile action title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/leads" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" />
            Back to leads
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              {lead.full_name}
            </h1>
            <LeadStatusBadge status={lead.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {lead.status !== 'Won' && (
            <Button onClick={() => setIsConvertModalOpen(true)} className="flex items-center gap-1.5">
              <UserCheck className="h-4 w-4" />
              Convert to Client
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="h-9 px-3">
            <Edit2 className="h-4 w-4 mr-1 text-slate-400" />
            Edit Info
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteLead}
            className="h-9 px-3 text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid: Detail Cards & Activity Stream Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Summary and Meta details */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
              {/* Category */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Business Category</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  {lead.business_category || 'General'}
                </span>
              </div>
              
              {/* Brand Company */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Company Name</span>
                <span className="text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-slate-400" />
                  {lead.business_name || 'Individual Prospect'}
                </span>
              </div>

              {/* Source */}
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Lead Source</span>
                <span className="text-slate-900 dark:text-slate-100">{lead.lead_source || 'Self-Sourced'}</span>
              </div>

              {/* Contacts */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold block">Contact Details</span>
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-slate-800 hover:text-black hover:underline dark:text-slate-200 dark:hover:text-white">
                    <Mail className="h-3.5 w-3.5" />
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-slate-400 italic font-normal">No email logged</span>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {lead.phone}
                  </div>
                )}
                {lead.website && (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-slate-800 hover:text-black hover:underline dark:text-slate-200 dark:hover:text-white"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Visit Website
                  </a>
                )}
              </div>

              {/* Created date */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center text-[10px] text-slate-400">
                <span>Prospect Registered</span>
                <span className="font-mono">{new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes description card */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Prospect Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                {lead.notes || 'No notes specified.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Timeline and Action logging */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline Feed Log Form */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-slate-400" />
                Activity Logger
              </CardTitle>
              <CardDescription className="text-xs">Record meetings, outreach notes, or call feedback for this prospect.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleLogActivity} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="log-text" className="sr-only">Activity Log Message</Label>
                    <Textarea
                      id="log-text"
                      placeholder="e.g. Completed initial scoping call, prospect details gathered..."
                      required
                      rows={2}
                      value={manualLogText}
                      onChange={(e) => setManualLogText(e.target.value)}
                      className="text-xs border-slate-200/80 dark:border-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Log Category:</span>
                    <select
                      value={logType}
                      onChange={(e) => setLogType(e.target.value)}
                      className="h-8 rounded border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="notes">Call Notes</option>
                      <option value="email">Email Sent</option>
                      <option value="meeting">Meeting Log</option>
                      <option value="timeline">Status Update</option>
                    </select>
                  </div>
                  <Button type="submit" size="sm" className="h-8 px-3 flex items-center gap-1 text-[11px]" isLoading={loggingActivity}>
                    <Send className="h-3 w-3" />
                    Log Event
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Activity Logs Stream */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 tracking-tight px-1">Activity & Interactions</h3>
            {activities.length === 0 ? (
              <div className="text-center py-10 bg-slate-100/40 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <MessageSquare className="h-6 w-6 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No client timeline history recorded.</p>
              </div>
            ) : (
              <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
                {activities.map((act) => (
                  <div key={act.id} className="relative">
                    {/* Circle icon marker on line */}
                    <span className="absolute -left-[31px] top-1.5 bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-full text-slate-500 shadow-sm shrink-0">
                      <Activity className="h-3.5 w-3.5 text-slate-450 dark:text-slate-500" />
                    </span>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 space-y-2 shadow-sm">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                        <span className="uppercase text-slate-500 dark:text-slate-400">{act.type}</span>
                        <span className="font-mono">
                          {new Date(act.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                        {act.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT LEAD MODAL */}
      <Dialog isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Lead Information">
        <form onSubmit={handleUpdateLead} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-business">Company / Business</Label>
              <Input
                id="edit-business"
                type="text"
                value={editBusiness}
                onChange={(e) => setEditBusiness(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="edit-website">Website URL</Label>
              <Input
                id="edit-website"
                type="text"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-category">Business Category</Label>
              <Select
                id="edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                <option value="Software Development">Software Development</option>
                <option value="Branding & UI/UX">Branding & UI/UX</option>
                <option value="Marketing Strategy">Marketing Strategy</option>
                <option value="Consulting & Audit">Consulting & Audit</option>
                <option value="Content Creation">Content Creation</option>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-source">Lead Source</Label>
              <Select
                id="edit-source"
                value={editSource}
                onChange={(e) => setEditSource(e.target.value)}
              >
                <option value="Google Search">Google Search</option>
                <option value="Twitter/X">Twitter/X</option>
                <option value="LinkedIn Inbound">LinkedIn Inbound</option>
                <option value="Referral">Referral</option>
                <option value="Self-Sourced">Self-Sourced</option>
                <option value="Cold Outreach">Cold Outreach</option>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="edit-status">Pipeline Stage</Label>
              <Select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Meeting Scheduled">Meeting Scheduled</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="edit-notes">Internal Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={updatingLead}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updatingLead}>
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* CONVERT LEAD TO CLIENT WIZARD MODAL */}
      <Dialog isOpen={isConvertModalOpen} onClose={() => setIsConvertModalOpen(false)} title="Convert Prospect to Client Account">
        <form onSubmit={handleConvertLead} className="space-y-4 pt-2">
          <div className="bg-zinc-100/50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            <Sparkles className="inline h-4 w-4 mr-1 text-zinc-500 animate-pulse" />
            Converting this lead will automatically create a permanent client profile. All communications history will be preserved.
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-address">Billing/Physical Address *</Label>
              <Textarea
                id="client-address"
                placeholder="Required for invoices generation (e.g. 123 Business Rd, CA)"
                required
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                rows={2}
              />
            </div>

            {/* Checkbox to create project */}
            <div className="flex items-center space-x-2 py-1">
              <input
                type="checkbox"
                id="create-project"
                checked={createProject}
                onChange={(e) => setCreateProject(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-black dark:text-white focus:ring-zinc-500 dark:focus:ring-zinc-400 bg-white dark:bg-slate-900"
              />
              <Label htmlFor="create-project" className="text-xs font-bold cursor-pointer select-none">
                Initialize first project project for client
              </Label>
            </div>

            {createProject && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="proj-name">Project Name *</Label>
                  <Input
                    id="proj-name"
                    type="text"
                    required={createProject}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="proj-budget">Project Budget (₹ INR) *</Label>
                    <Input
                      id="proj-budget"
                      type="number"
                      placeholder="e.g. 50000"
                      required={createProject}
                      value={projectBudget}
                      onChange={(e) => setProjectBudget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label htmlFor="proj-deadline">Project Deadline</Label>
                    <Input
                      id="proj-deadline"
                      type="date"
                      value={projectDeadline}
                      onChange={(e) => setProjectDeadline(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proj-priority">Project Priority</Label>
                  <Select
                    id="proj-priority"
                    value={projectPriority}
                    onChange={(e) => setProjectPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsConvertModalOpen(false)} disabled={converting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={converting}>
              Confirm & Convert Won Lead
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
