'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  PhoneCall,
  Megaphone,
  Upload,
  AlertTriangle,
  CheckCircle,
  Plus,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  Play,
  FileSpreadsheet,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  industry: string;
  status: string;
  calls_made: number;
  interested_leads: number;
  meetings_booked: number;
  created_at: string;
}

interface ParsedLead {
  id: string;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  website: string;
  business_category: string;
  isValid: boolean;
  errors: string[];
}

export default function OutreachCenterPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  // Loading & Data States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Campaign Modal States
  const [isCampModalOpen, setIsCampModalOpen] = useState(false);
  const [campName, setCampName] = useState('');
  const [campIndustry, setCampIndustry] = useState('Technology');
  const [campStatus, setCampStatus] = useState('Active');
  const [savingCamp, setSavingCamp] = useState(false);

  // CSV Importer States
  const [csvText, setCsvText] = useState('');
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [selectedCampForImport, setSelectedCampForImport] = useState('');
  const [importing, setImporting] = useState(false);

  // Call Logger States
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedCampId, setSelectedCampId] = useState('');
  const [callDuration, setCallDuration] = useState('120'); // in seconds
  const [callOutcome, setCallOutcome] = useState('Interested');
  const [callTranscript, setCallTranscript] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [loggingCall, setLoggingCall] = useState(false);

  const fetchOutreachData = async () => {
    if (!user) return;
    try {
      const [
        { data: campData },
        { data: logData },
        { data: leadData },
      ] = await Promise.all([
        supabase.from('call_campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('call_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('leads').select('*').order('full_name', { ascending: true }),
      ]);

      setCampaigns(campData || []);
      setCallLogs(logData || []);
      setLeads(leadData || []);

      if (campData && campData.length > 0) {
        setSelectedCampId(campData[0].id);
        setSelectedCampForImport(campData[0].id);
      }
      if (leadData && leadData.length > 0) {
        setSelectedLeadId(leadData[0].id);
      }
    } catch (err) {
      console.error('Failed to retrieve outreach statistics:', err);
      sendNotification('Outreach ledger offline.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutreachData();
  }, [user]);

  // CSV validation logic
  const handleValidateCsv = () => {
    if (!csvText.trim()) {
      setParsedLeads([]);
      return;
    }

    const lines = csvText.split('\n');
    const result: ParsedLead[] = [];

    // Parse each line: Name, Business, Email, Phone, Website, Category
    lines.forEach((line, idx) => {
      // Skip header line if it looks like one
      if (idx === 0 && line.toLowerCase().includes('name') && line.toLowerCase().includes('email')) {
        return;
      }
      if (!line.trim()) return;

      const columns = line.split(',').map((c) => c.trim());
      const full_name = columns[0] || '';
      const business_name = columns[1] || '';
      const email = columns[2] || '';
      const phone = columns[3] || '';
      const website = columns[4] || '';
      const business_category = columns[5] || 'Software Development';

      const errors: string[] = [];

      // Validations
      if (!full_name) {
        errors.push('Full Name is required');
      }
      if (email && !email.includes('@')) {
        errors.push('Invalid email format (needs @)');
      }
      if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
        errors.push('Invalid website format (needs http:// or https://)');
      }

      result.push({
        id: Math.random().toString(36).substring(2, 9),
        full_name,
        business_name,
        email,
        phone,
        website,
        business_category,
        isValid: errors.length === 0,
        errors,
      });
    });

    setParsedLeads(result);
    sendNotification(`Validated ${result.length} prospects. Check log details.`, 'info');
  };

  // CSV Commit upload
  const handleImportLeads = async () => {
    const validLeads = parsedLeads.filter((l) => l.isValid);
    if (validLeads.length === 0) {
      sendNotification('No valid lead records found to import.', 'warning');
      return;
    }

    setImporting(true);
    try {
      // Bulk insert into leads
      const insertPayload = validLeads.map((l) => ({
        full_name: l.full_name,
        business_name: l.business_name || null,
        email: l.email || null,
        phone: l.phone || null,
        website: l.website || null,
        business_category: l.business_category,
        lead_source: 'CSV Upload',
        status: 'New Lead',
        notes: selectedCampForImport
          ? `Imported to Call Campaign ID: ${selectedCampForImport}`
          : 'Imported via Outreach center.',
      }));

      const { data, error } = await supabase.from('leads').insert(insertPayload);
      if (error) throw error;

      // Update campaigns count if assigned
      if (selectedCampForImport) {
        const campaignObj = campaigns.find((c) => c.id === selectedCampForImport);
        if (campaignObj) {
          const updatedCalls = campaignObj.calls_made + validLeads.length;
          await supabase
            .from('call_campaigns')
            .update({ calls_made: updatedCalls })
            .eq('id', selectedCampForImport);
        }
      }

      sendNotification(`Successfully imported ${validLeads.length} leads.`, 'success');
      setCsvText('');
      setParsedLeads([]);
      await fetchOutreachData();
    } catch (err) {
      console.error('Import process failed:', err);
      sendNotification('Import failed. Check CSV fields layout.', 'danger');
    } finally {
      setImporting(false);
    }
  };

  // Create Call Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName.trim()) return;

    setSavingCamp(true);
    try {
      const { data, error } = await supabase
        .from('call_campaigns')
        .insert({
          name: campName,
          industry: campIndustry,
          status: campStatus,
          calls_made: 0,
          interested_leads: 0,
          meetings_booked: 0,
        })
        .select()
        .single();

      if (error) throw error;

      sendNotification(`Campaign "${campName}" created.`, 'success');
      setIsCampModalOpen(false);
      setCampName('');
      await fetchOutreachData();
    } catch (err) {
      console.error('Failed creating campaign:', err);
      sendNotification('Could not save calling campaign.', 'danger');
    } finally {
      setSavingCamp(false);
    }
  };

  // Log Call Outcome
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedCampId) {
      sendNotification('Ensure a target Lead and Campaign are selected.', 'warning');
      return;
    }

    setLoggingCall(true);
    try {
      // 1. Insert Call Log
      const { data, error } = await supabase
        .from('call_logs')
        .insert({
          lead_id: selectedLeadId,
          campaign_id: selectedCampId,
          duration: Number(callDuration),
          outcome: callOutcome,
          transcript: callTranscript || 'Agent initiated cold call. Conversation outcome registered.',
          followup_date: followupDate || null,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Fetch Lead detail to obtain name for activity message
      const targetLead = leads.find((l) => l.id === selectedLeadId);
      const leadName = targetLead ? targetLead.full_name : 'Prospect';

      // 3. Log user activity
      await supabase.from('activities').insert({
        lead_id: selectedLeadId,
        message: `Outbound call to ${leadName}. Outcome: ${callOutcome}. Duration: ${callDuration}s.`,
        type: 'lead',
      });

      // 4. Update Lead Pipeline Stage based on outcome
      let updatedStatus = targetLead ? targetLead.status : 'Contacted';
      if (callOutcome === 'Interested') {
        updatedStatus = 'Interested';
      } else if (callOutcome === 'Call Back Later') {
        updatedStatus = 'Contacted';
      } else if (callOutcome === 'Not Interested') {
        updatedStatus = 'Lost';
      }

      await supabase.from('leads').update({ status: updatedStatus }).eq('id', selectedLeadId);

      // 5. Aggregate Call Campaign Stats
      const campaignObj = campaigns.find((c) => c.id === selectedCampId);
      if (campaignObj) {
        const isInterested = callOutcome === 'Interested';
        const isMeeting = callOutcome === 'Interested' && followupDate !== '';

        await supabase
          .from('call_campaigns')
          .update({
            calls_made: campaignObj.calls_made + 1,
            interested_leads: isInterested ? campaignObj.interested_leads + 1 : campaignObj.interested_leads,
            meetings_booked: isMeeting ? campaignObj.meetings_booked + 1 : campaignObj.meetings_booked,
          })
          .eq('id', selectedCampId);
      }

      sendNotification(`Logged call outcome for ${leadName}.`, 'success');
      setCallTranscript('');
      setFollowupDate('');
      await fetchOutreachData();
    } catch (err) {
      console.error('Call logging failed:', err);
      sendNotification('Failed logging outbound call.', 'danger');
    } finally {
      setLoggingCall(false);
    }
  };

  const handleSuggestTranscript = () => {
    const lead = leads.find((l) => l.id === selectedLeadId);
    if (!lead) return;

    if (callOutcome === 'Interested') {
      setCallTranscript(`Agent: Hello ${lead.full_name}, this is ClientFlow AI sales coordinator.
Lead: Yes, I was checking your system and need a client portal that displays milestone invoices.
Agent: Excellent. I can book an AI demo session on ${followupDate || 'Wednesday'}?
Lead: That works. Send the meeting invite.`);
    } else if (callOutcome === 'Not Interested') {
      setCallTranscript(`Agent: Hello ${lead.full_name}, calling from ClientFlow.
Lead: We already signed a contract with another CRM system yesterday. Please remove us from your calling lists.
Agent: Understood, thank you.`);
    } else {
      setCallTranscript(`Agent: Hi ${lead.full_name}, do you have five minutes to speak?
Lead: I am heading out for lunch. Can you call me back on ${followupDate || 'tomorrow'}?
Agent: Sure, I will schedule a calendar reminder. Thank you.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-indigo-500" />
            Outreach Center
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage call campaigns, validate and bulk-import CSV leads, and register outreach call logs.
          </p>
        </div>
        <Button onClick={() => setIsCampModalOpen(true)} className="text-xs font-semibold self-start">
          <Plus className="h-4 w-4 mr-1.5" />
          Create Call Campaign
        </Button>
      </div>

      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 p-0.5 rounded-lg mb-4 inline-flex">
            <TabsTrigger value="campaigns" className="px-3 py-1.5 text-xs font-semibold rounded-md">Campaigns</TabsTrigger>
            <TabsTrigger value="import" className="px-3 py-1.5 text-xs font-semibold rounded-md">CSV Bulk Import</TabsTrigger>
            <TabsTrigger value="logger" className="px-3 py-1.5 text-xs font-semibold rounded-md">Call Outcomes Logger</TabsTrigger>
          </TabsList>

          {/* TAB 1: Campaigns */}
          <TabsContent value="campaigns" className="outline-none space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {campaigns.map((camp) => {
                const convRate = camp.calls_made > 0 ? ((camp.interested_leads / camp.calls_made) * 100).toFixed(0) : '0';
                return (
                  <Card key={camp.id} className="border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                          {camp.industry}
                        </Badge>
                        <Badge
                          className={
                            camp.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : 'bg-zinc-100 text-zinc-550 border-zinc-250 dark:bg-zinc-900 dark:text-zinc-400'
                          }
                        >
                          {camp.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                        {camp.name}
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        Created on {new Date(camp.created_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-zinc-400 font-semibold">Calls Made</p>
                          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{camp.calls_made}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400 font-semibold">Interested</p>
                          <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{camp.interested_leads}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-400 font-semibold">Conversion</p>
                          <p className="text-lg font-bold text-indigo-500 mt-0.5">{convRate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Calling outcome logs Table */}
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Recent Outreach Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold px-6">Lead</TableHead>
                      <TableHead className="text-xs font-semibold">Duration</TableHead>
                      <TableHead className="text-xs font-semibold">Outcome</TableHead>
                      <TableHead className="text-xs font-semibold">Call Transcript Summary</TableHead>
                      <TableHead className="text-xs font-semibold">Follow-Up Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-zinc-400 text-xs">
                          No outbound calling outcomes registered yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      callLogs.map((log) => {
                        const targetLead = leads.find((l) => l.id === log.lead_id);
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="px-6 py-3 font-semibold text-zinc-900 dark:text-zinc-200 text-xs">
                              {targetLead ? targetLead.full_name : 'Unknown lead'}
                            </TableCell>
                            <TableCell className="text-xs">{log.duration} seconds</TableCell>
                            <TableCell className="text-xs">
                              <Badge
                                className={
                                  log.outcome === 'Interested'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                    : log.outcome === 'Not Interested'
                                    ? 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400'
                                    : 'bg-amber-50 text-amber-650 dark:bg-amber-950/20 dark:text-amber-400'
                                }
                              >
                                {log.outcome}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs italic max-w-xs truncate text-zinc-500 dark:text-zinc-400">
                              {log.transcript}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {log.followup_date ? new Date(log.followup_date).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CSV Bulk Import */}
          <TabsContent value="import" className="outline-none space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* CSV Input Form */}
              <Card className="lg:col-span-5 border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                    CSV Data Input
                  </CardTitle>
                  <CardDescription className="text-xs leading-normal">
                    Enter leads in CSV format (one per line). Columns order:<br />
                    <code className="text-indigo-500 font-semibold text-[10px]">Full Name, Business Name, Email, Phone, Website URL, Business Category</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-zinc-500">CSV Leads Batch</Label>
                    <Textarea
                      value={csvText}
                      onChange={(e) => setCsvText(e.target.value)}
                      placeholder="John Doe,Acme Corp,john@acme.com,+15550199,https://acme.com,Software Development&#10;Jane Smith,,jane@smith.io,,http://smith.io,Consulting"
                      className="h-44 text-xs font-mono bg-zinc-50/50 border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800 mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-zinc-500">Campaign Assignment</Label>
                      <select
                        value={selectedCampForImport}
                        onChange={(e) => setSelectedCampForImport(e.target.value)}
                        className="w-full h-10 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black text-xs font-semibold mt-1 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-400"
                      >
                        <option value="">No Campaign Assignment</option>
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        onClick={handleValidateCsv}
                        variant="outline"
                        className="w-full text-xs font-semibold h-10 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        disabled={!csvText.trim()}
                      >
                        <Layers className="h-4 w-4 mr-1.5 text-zinc-400" />
                        Run Validation
                      </Button>
                    </div>
                  </div>

                  {parsedLeads.length > 0 && (
                    <Button
                      onClick={handleImportLeads}
                      className="w-full text-xs font-semibold h-10"
                      disabled={importing || parsedLeads.filter((l) => l.isValid).length === 0}
                    >
                      {importing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1.5" />
                      )}
                      Import Valid Prospects ({parsedLeads.filter((l) => l.isValid).length})
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Validation Results */}
              <Card className="lg:col-span-7 border-zinc-200 dark:border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Live Import validation</CardTitle>
                  <CardDescription className="text-xs">
                    Review and verify prospect records prior to database ingestion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 max-h-[380px] overflow-y-auto custom-scrollbar">
                  {parsedLeads.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs flex flex-col items-center justify-center space-y-2">
                      <AlertTriangle className="h-6 w-6 text-zinc-300" />
                      <span>Paste CSV data on the left panel and click Validate to start.</span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold px-4">Name</TableHead>
                          <TableHead className="text-xs font-semibold">Email</TableHead>
                          <TableHead className="text-xs font-semibold">Website</TableHead>
                          <TableHead className="text-xs font-semibold">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="px-4 py-2.5 font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                              {lead.full_name || <span className="text-red-500 font-bold">Missing</span>}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {lead.email || <span className="text-zinc-400">N/A</span>}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {lead.website || <span className="text-zinc-400">N/A</span>}
                            </TableCell>
                            <TableCell className="py-2.5">
                              {lead.isValid ? (
                                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center gap-1 w-fit">
                                  <CheckCircle className="h-3 w-3" /> Valid
                                </Badge>
                              ) : (
                                <div className="space-y-1">
                                  <Badge className="bg-red-50 text-red-650 border-red-250 dark:bg-red-950/20 dark:text-red-400 flex items-center gap-1 w-fit">
                                    <AlertTriangle className="h-3 w-3" /> Error
                                  </Badge>
                                  {lead.errors.map((e, idx) => (
                                    <p key={idx} className="text-[9px] text-red-500 leading-tight max-w-[150px]">
                                      {e}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: Call Outcomes Logger */}
          <TabsContent value="logger" className="outline-none">
            <Card className="border-zinc-200 dark:border-zinc-800 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-indigo-500 animate-pulse" />
                  Log Outbound Outreach Outcome
                </CardTitle>
                <CardDescription className="text-xs">
                  Manually log results of calling campaign conversations with prospects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogCall} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-zinc-500">Select Prospect Lead</Label>
                      <select
                        value={selectedLeadId}
                        onChange={(e) => setSelectedLeadId(e.target.value)}
                        className="w-full h-10 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black text-xs mt-1 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-400"
                        disabled={leads.length === 0}
                      >
                        {leads.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.full_name} ({l.business_name || 'Individual'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-zinc-500">Call Campaign</Label>
                      <select
                        value={selectedCampId}
                        onChange={(e) => setSelectedCampId(e.target.value)}
                        className="w-full h-10 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black text-xs mt-1 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-400"
                        disabled={campaigns.length === 0}
                      >
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-zinc-500">Call Outcome</Label>
                      <select
                        value={callOutcome}
                        onChange={(e) => setCallOutcome(e.target.value)}
                        className="w-full h-10 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black text-xs mt-1 outline-none text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-400"
                      >
                        <option value="Interested">Interested</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Call Back Later">Call Back Later</option>
                        <option value="No Answer">No Answer</option>
                        <option value="Voicemail">Voicemail</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-zinc-500">Duration (seconds)</Label>
                      <Input
                        type="number"
                        value={callDuration}
                        onChange={(e) => setCallDuration(e.target.value)}
                        className="text-xs h-10 bg-zinc-50/50 border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800 mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-zinc-500">Follow-Up Date</Label>
                      <Input
                        type="date"
                        value={followupDate}
                        onChange={(e) => setFollowupDate(e.target.value)}
                        className="text-xs h-10 bg-zinc-50/50 border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800 mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold text-zinc-500">Call Transcript</Label>
                      <Button
                        type="button"
                        onClick={handleSuggestTranscript}
                        variant="ghost"
                        className="text-[10px] text-indigo-500 p-0 h-auto hover:bg-transparent"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Autocomplete Transcript
                      </Button>
                    </div>
                    <Textarea
                      value={callTranscript}
                      onChange={(e) => setCallTranscript(e.target.value)}
                      placeholder="Paste conversation details, or click AI Autocomplete to draft a mockup conversation script..."
                      className="h-28 text-xs bg-zinc-50/50 border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800 mt-1"
                    />
                  </div>

                  <Button type="submit" className="w-full text-xs font-semibold h-10" disabled={loggingCall}>
                    {loggingCall ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Play className="h-4 w-4 mr-1.5 text-emerald-400" />
                    )}
                    Log outreach outcomes call record
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* New Campaign Modal Dialog */}
      {isCampModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <Card className="border-zinc-200 dark:border-zinc-800 max-w-md w-full bg-white dark:bg-black shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold">Create Call Campaign</CardTitle>
              <CardDescription className="text-xs">
                Launch a calling directory campaign for target industry domains.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateCampaign}>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-500">Campaign Name</Label>
                  <Input
                    value={campName}
                    onChange={(e) => setCampName(e.target.value)}
                    placeholder="E.g., Bangalore Tech Startups Q3"
                    className="text-xs h-10 bg-zinc-50/50 border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800 mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-zinc-500">Target Industry</Label>
                    <select
                      value={campIndustry}
                      onChange={(e) => setCampIndustry(e.target.value)}
                      className="w-full h-10 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black text-xs mt-1 outline-none text-zinc-850 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-400"
                    >
                      <option value="Information Technology">Information Technology</option>
                      <option value="Retail & Hospitality">Retail & Hospitality</option>
                      <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                      <option value="Finance & Professional Services">Finance & Professional Services</option>
                      <option value="Real Estate & Construction">Real Estate & Construction</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-zinc-500">Status</Label>
                    <select
                      value={campStatus}
                      onChange={(e) => setCampStatus(e.target.value)}
                      className="w-full h-10 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black text-xs mt-1 outline-none text-zinc-850 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-400"
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCampModalOpen(false)}
                  className="text-xs font-semibold h-9 border-zinc-200 dark:border-zinc-800"
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs font-semibold h-9" disabled={savingCamp}>
                  {savingCamp && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Create Campaign
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
