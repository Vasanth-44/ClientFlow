'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Calendar,
  Loader2,
  Building,
  ArrowRight,
  Eye,
  Plus,
  Search,
  Filter,
  Trash2,
  Phone,
  Mail,
  ExternalLink,
  Target,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

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

const PIPELINE_COLUMNS = [
  { id: 'New Lead', label: 'New Lead', color: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800/60' },
  { id: 'Contacted', label: 'Contacted', color: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800/60' },
  { id: 'Interested', label: 'Interested', color: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800/60' },
  { id: 'Meeting Scheduled', label: 'Meeting', color: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800/60' },
  { id: 'Proposal Sent', label: 'Proposal', color: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800/60' },
  { id: 'Negotiation', label: 'Negotiation', color: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800/60' },
  { id: 'Won', label: 'Won', color: 'bg-zinc-950 text-white border-transparent dark:bg-zinc-100 dark:text-black' },
  { id: 'Lost', label: 'Lost', color: 'bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-950 dark:text-zinc-650 dark:border-zinc-800/30' },
];

export function LeadStatusBadge({ status }: { status: string }) {
  const col = PIPELINE_COLUMNS.find((c) => c.id === status);
  return (
    <Badge className={col?.color || 'bg-slate-100 text-slate-800 border-slate-200'}>
      {status}
    </Badge>
  );
}

export function calculateLeadScore(lead: any, activities: any[] = [], callLogs: any[] = [], proposals: any[] = []) {
  let score = 0;

  // 1. Has Website
  if (lead.website && lead.website.trim().length > 0) {
    score += 15;
  }

  // 2. Business Type
  if (lead.business_name) {
    const isEnterprise = /corp|inc|agency|tech|labs|consulting/i.test(lead.business_name) || 
                         /development|enterprise/i.test(lead.business_category || '');
    score += isEnterprise ? 20 : 10;
  }

  // 3. Response Activity (Timeline activities count for this lead)
  const leadActivities = activities.filter(a => a.lead_id === lead.id);
  if (leadActivities.length > 2) {
    score += 15;
  } else if (leadActivities.length > 0) {
    score += 5;
  }

  // 4. Engagement History (Call logs outcomes)
  const leadCalls = callLogs.filter(c => c.lead_id === lead.id);
  const hasInterestedCall = leadCalls.some(c => c.outcome === 'Interested');
  if (hasInterestedCall) {
    score += 20;
  } else if (leadCalls.length > 0) {
    score += 10;
  }

  // 5. Meeting Booked
  const hasMeeting = lead.status === 'Meeting Scheduled' || leadCalls.some(c => c.outcome === 'Meeting Scheduled');
  if (hasMeeting) {
    score += 15;
  }

  // 6. Proposal Opened / Status
  const leadProposals = proposals.filter(p => p.lead_id === lead.id);
  const isProposalViewed = leadProposals.some(p => p.status === 'Viewed' || p.status === 'Accepted');
  if (isProposalViewed) {
    score += 15;
  } else if (leadProposals.length > 0) {
    score += 5;
  }

  return score;
}

export function getLeadPriorityBadge(score: number) {
  if (score >= 70) return { label: 'Hot Lead', color: 'bg-red-50 text-red-650 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' };
  if (score >= 35) return { label: 'Warm Lead', color: 'bg-amber-50 text-amber-650 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' };
  return { label: 'Cold Lead', color: 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-800' };
}

export default function LeadsPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');

  // Modal Dialog Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Software Development');
  const [leadSource, setLeadSource] = useState('Self-Sourced');
  const [status, setStatus] = useState('New Lead');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchLeads = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);

      // Fetch supplementary scoring dependencies
      const { data: actData } = await supabase.from('activities').select('*');
      setActivities(actData || []);

      const { data: callData } = await supabase.from('call_logs').select('*');
      setCallLogs(callData || []);

      const { data: propData } = await supabase.from('proposals').select('*');
      setProposals(propData || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [user]);

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    // Optimistic Update
    const prevLeads = [...leads];
    const updated = leads.map((l) => {
      if (l.id === draggableId) {
        return { ...l, status: destination.droppableId };
      }
      return l;
    });
    setLeads(updated);

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: destination.droppableId })
        .eq('id', draggableId);

      if (error) throw error;

      const leadObj = leads.find((l) => l.id === draggableId);
      if (leadObj) {
        // Send global notifications
        await sendNotification(`Moved lead "${leadObj.full_name}" to "${destination.droppableId}" stage.`, 'info');
        
        // Log Activity Timeline event
        await supabase.from('activities').insert({
          lead_id: draggableId,
          message: `Moved stage from "${source.droppableId}" to "${destination.droppableId}".`,
          type: 'lead'
        });

        // Close active stage history row and start new one
        const { data: activeHist } = await supabase
          .from('lead_stage_history')
          .select('*')
          .eq('lead_id', draggableId)
          .is('left_at', null)
          .maybeSingle();

        if (activeHist) {
          const leftAt = new Date().toISOString();
          const duration = Math.round((new Date(leftAt).getTime() - new Date(activeHist.entered_at).getTime()) / 1000);
          await supabase
            .from('lead_stage_history')
            .update({ left_at: leftAt, duration_seconds: duration })
            .eq('id', activeHist.id);
        }

        await supabase.from('lead_stage_history').insert({
          lead_id: draggableId,
          stage: destination.droppableId,
          entered_at: new Date().toISOString(),
        });

        fetchLeads(); // refresh visual calculations
      }
    } catch (err) {
      console.error('Failed to update lead status on drag:', err);
      setLeads(prevLeads);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !user) return;

    setSaving(true);
    try {
      const newLeadObj = {
        full_name: fullName,
        business_name: businessName || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        business_category: businessCategory,
        lead_source: leadSource,
        status: status,
        notes: notes || null,
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(newLeadObj)
        .select()
        .single();

      if (error) throw error;

      setLeads([data, ...leads]);
      setIsModalOpen(false);
      sendNotification(`Successfully added lead: ${fullName}`, 'success');

      // Add to activities timeline
      await supabase.from('activities').insert({
        lead_id: data.id,
        message: `Lead created for ${fullName} (${businessName || 'Individual'}) via ${leadSource}.`,
        type: 'lead'
      });

      // Create initial lead stage history row
      await supabase.from('lead_stage_history').insert({
        lead_id: data.id,
        stage: status,
        entered_at: new Date().toISOString(),
      });

      // Clear Form Fields
      setFullName('');
      setBusinessName('');
      setEmail('');
      setPhone('');
      setWebsite('');
      setBusinessCategory('Software Development');
      setLeadSource('Self-Sourced');
      setStatus('New Lead');
      setNotes('');
      fetchLeads();
    } catch (err) {
      console.error('Failed to create lead:', err);
      sendNotification('Failed to create lead record.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete lead: ${name}?`)) return;

    try {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;

      setLeads(leads.filter((l) => l.id !== id));
      sendNotification(`Successfully deleted lead: ${name}`, 'info');
    } catch (err) {
      console.error('Failed to delete lead:', err);
      sendNotification('Failed to delete lead.', 'danger');
    }
  };

  // Unique sources & categories for filter list
  const sources = ['All', ...Array.from(new Set(leads.map((l) => l.lead_source).filter(Boolean)))];

  // Filtering Logic
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.business_name && lead.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'All' || lead.lead_source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Leads & Pipelines</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage prospects, discovery calls, and proposals inside ClientFlow AI.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 shadow-sm">
          <Plus className="h-4.5 w-4.5" />
          Add Lead
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search leads by name, email, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs border-slate-200/80 dark:border-slate-800"
            />
          </div>
          <div className="flex flex-wrap w-full md:w-auto gap-3 items-center justify-end">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold shrink-0">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </div>
            
            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-400 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              {PIPELINE_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>

            {/* Source Selector */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-9.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs focus:ring-1 focus:ring-zinc-500 dark:focus:ring-zinc-400 focus:outline-none"
            >
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src === 'All' ? 'All Sources' : src}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Layout with Tabs */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
        </div>
      ) : (
        <Tabs defaultValue="board" className="w-full">
          <div className="flex justify-between items-center pb-2">
            <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 p-0.5 rounded-lg">
              <TabsTrigger value="board" className="px-3 py-1.5 text-xs font-semibold rounded-md">Board View</TabsTrigger>
              <TabsTrigger value="list" className="px-3 py-1.5 text-xs font-semibold rounded-md">List Table</TabsTrigger>
            </TabsList>
            <span className="text-xs text-slate-400 font-bold">Showing {filteredLeads.length} leads</span>
          </div>

          {/* 1. Kanban Board View */}
          <TabsContent value="board" className="mt-4 outline-none">
            {/* Prioritization Dashboard */}
            {leads.length > 0 && (
              <div className="mb-6 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Prioritized Hot Targets (Score &ge; 70)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {leads
                    .map(l => ({ ...l, score: calculateLeadScore(l, activities, callLogs, proposals) }))
                    .filter(l => l.score >= 70)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(lead => {
                      const priority = getLeadPriorityBadge(lead.score);
                      return (
                        <Card key={lead.id} className="border-amber-250 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/5 shadow-none rounded-xl relative overflow-hidden">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase border rounded-full ${priority.color}`}>
                                {priority.label} ({lead.score})
                              </span>
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{lead.full_name}</h4>
                              <p className="text-[10px] text-slate-500">{lead.business_name || 'Individual Prospect'}</p>
                            </div>
                            <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/40">
                              <span className="text-slate-400 font-semibold">Source: {lead.lead_source}</span>
                              <Link href={`/leads/${lead.id}`} className="text-amber-600 hover:underline dark:text-amber-400 font-semibold flex items-center gap-0.5">
                                Engage <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  {leads.map(l => ({ ...l, score: calculateLeadScore(l, activities, callLogs, proposals) })).filter(l => l.score >= 70).length === 0 && (
                    <Card className="col-span-3 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 shadow-none rounded-xl">
                      <CardContent className="p-4 flex items-center justify-center text-center">
                        <p className="text-xs text-slate-450 py-1.5">No leads currently classified as **Hot**. Populate website links, log active calls, or generate proposals to prioritize prospects.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex overflow-x-auto pb-4 gap-4 items-start select-none custom-scrollbar min-h-[500px]">
                {PIPELINE_COLUMNS.map((column) => {
                  const colLeads = filteredLeads.filter((l) => l.status === column.id);

                  return (
                    <div
                      key={column.id}
                      className="w-72 shrink-0 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/40 p-3 flex flex-col max-h-[70vh]"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 mb-2 px-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${column.color}`}>
                            {column.label}
                          </span>
                          <span className="text-xs text-slate-450 font-bold">{colLeads.length}</span>
                        </div>
                      </div>

                      {/* Droppable Stage Area */}
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 overflow-y-auto min-h-[250px] space-y-3 rounded-lg p-1 transition-colors custom-scrollbar ${
                              snapshot.isDraggingOver ? 'bg-slate-200/50 dark:bg-slate-800/20' : ''
                            }`}
                          >
                            {colLeads.map((lead, index) => {
                              const score = calculateLeadScore(lead, activities, callLogs, proposals);
                              const priority = getLeadPriorityBadge(score);

                              return (
                                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                  {(providedDrag, snapshotDrag) => (
                                    <div
                                      ref={providedDrag.innerRef}
                                      {...providedDrag.draggableProps}
                                      {...providedDrag.dragHandleProps}
                                      className={`transform transition-all ${
                                        snapshotDrag.isDragging ? 'rotate-2 scale-102 shadow-xl' : ''
                                      }`}
                                    >
                                      <Card className="hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-950 shadow-sm border-slate-200/70 dark:border-slate-800/80">
                                        <CardContent className="p-4 space-y-3">
                                          <div className="flex justify-between items-start gap-1">
                                            <div className="space-y-1">
                                              <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 break-words">
                                                {lead.full_name}
                                              </h4>
                                              {lead.business_name && (
                                                <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                  <Building className="h-3 w-3 shrink-0" />
                                                  {lead.business_name}
                                                </p>
                                              )}
                                            </div>
                                            <span className={`px-1.5 py-0.5 text-[8px] font-bold uppercase border rounded shrink-0 ${priority.color}`}>
                                              {score}
                                            </span>
                                          </div>

                                          {lead.business_category && (
                                            <div className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-500 inline-block">
                                              {lead.business_category}
                                            </div>
                                          )}

                                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
                                            <span className="text-slate-400 font-semibold flex items-center gap-0.5">
                                              <Calendar className="h-3 w-3" />
                                              {new Date(lead.created_at).toLocaleDateString([], {
                                                month: 'short',
                                                day: 'numeric',
                                              })}
                                            </span>
                                            <Link href={`/leads/${lead.id}`}>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-1 text-[10px] text-slate-500 hover:text-black dark:hover:text-white"
                                              >
                                                <Eye className="mr-0.5 h-3.5 w-3.5" />
                                                Timeline
                                              </Button>
                                            </Link>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </TabsContent>

          {/* 2. List Table View */}
          <TabsContent value="list" className="mt-4 outline-none">
            <Card className="border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <TableHead className="font-bold text-xs">Name</TableHead>
                    <TableHead className="font-bold text-xs">Business</TableHead>
                    <TableHead className="font-bold text-xs">Category</TableHead>
                    <TableHead className="font-bold text-xs">Source</TableHead>
                    <TableHead className="font-bold text-xs">Lead Score</TableHead>
                    <TableHead className="font-bold text-xs">Status</TableHead>
                    <TableHead className="font-bold text-xs">Contact</TableHead>
                    <TableHead className="font-bold text-xs">Created At</TableHead>
                    <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-450">
                        No leads match the filters. Click "Add Lead" to register some.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => {
                      const score = calculateLeadScore(lead, activities, callLogs, proposals);
                      const priority = getLeadPriorityBadge(score);
                      return (
                        <TableRow key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                            <Link href={`/leads/${lead.id}`} className="hover:underline text-slate-800 dark:text-slate-200 font-semibold">
                              {lead.full_name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">
                            {lead.business_name || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{lead.business_category || '—'}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary">{lead.lead_source || 'Self-Sourced'}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase border rounded-full ${priority.color}`}>
                              {priority.label} ({score})
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <LeadStatusBadge status={lead.status} />
                          </TableCell>
                        <TableCell className="text-xs space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/leads/${lead.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLead(lead.id, lead.full_name)}
                              className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* CREATE LEAD DIALOG MODAL */}
      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Lead Record">
        <form onSubmit={handleCreateLead} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="lead-name">Full Name *</Label>
              <Input
                id="lead-name"
                type="text"
                placeholder="e.g. John Smith"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="lead-business">Company / Business</Label>
              <Input
                id="lead-business"
                type="text"
                placeholder="e.g. Alpha Labs"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="lead-email">Email Address</Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="john@alphalabs.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="lead-phone">Phone Number</Label>
              <Input
                id="lead-phone"
                type="text"
                placeholder="+1 555-0111"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="lead-website">Website URL</Label>
              <Input
                id="lead-website"
                type="text"
                placeholder="https://alphalabs.co"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="lead-category">Business Category</Label>
              <Select
                id="lead-category"
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
              >
                <option value="Software Development">Software Development</option>
                <option value="Branding & UI/UX">Branding & UI/UX</option>
                <option value="Marketing Strategy">Marketing Strategy</option>
                <option value="Consulting & Audit">Consulting & Audit</option>
                <option value="Content Creation">Content Creation</option>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="lead-source">Lead Source</Label>
              <Select
                id="lead-source"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
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
              <Label htmlFor="lead-status">Pipeline Stage</Label>
              <Select
                id="lead-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {PIPELINE_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="lead-notes">Internal Notes</Label>
              <Textarea
                id="lead-notes"
                placeholder="Provide initial project details, budget requirements, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
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
              Create Lead
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
