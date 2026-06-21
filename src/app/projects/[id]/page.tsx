'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  IndianRupee,
  Briefcase,
  Users,
  Building,
  CheckSquare,
  CreditCard,
  FolderOpen,
  Plus,
  Loader2,
  Trash2,
  CheckCircle,
  FileText,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  name: string;
  business_name?: string;
  email?: string;
}

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string;
  budget: number;
  deadline: string;
  status: string;
  priority: string;
  clients?: Client;
}

interface Task {
  id: string;
  name: string;
  deadline: string;
  priority: string;
  status: string;
}

interface PaymentRecord {
  id: string;
  total_amount: number;
  advance_paid: number;
  received: number;
  pending: number;
}

interface DocumentRecord {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab values
  const [activeTab, setActiveTab] = useState('overview');

  // Tasks Add Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('Todo');
  const [taskSaving, setTaskSaving] = useState(false);

  // Payment Record Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isAdvance, setIsAdvance] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Document Upload State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchProjectData = async () => {
    if (!projectId || !user) return;
    try {
      // 1. Fetch Project with Client details
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('*, clients(id, name, business_name, email)')
        .eq('id', projectId)
        .single();

      if (projErr) throw projErr;
      setProject(projData);

      // 2. Fetch Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      setTasks(tasksData || []);

      // 3. Fetch Payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', projectId);
      setPayment(payData && payData.length > 0 ? payData[0] : null);

      // 4. Fetch Documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId);
      setDocuments(docsData || []);
    } catch (err) {
      console.error('Failed to load project details:', err);
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId, user]);

  // Task Handlers
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName) return;
    setTaskSaving(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: projectId,
        name: taskName,
        deadline: taskDeadline || null,
        priority: taskPriority,
        status: taskStatus,
      });
      if (error) throw error;
      await sendNotification(`Added task "${taskName}" to project ${project?.name}.`, 'info');
      setIsTaskModalOpen(false);
      setTaskName('');
      setTaskDeadline('');
      setTaskPriority('Medium');
      setTaskStatus('Todo');
      fetchProjectData();
    } catch (err) {
      console.error('Error saving task:', err);
    } finally {
      setTaskSaving(false);
    }
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'Completed' ? 'Todo' : 'Completed';
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id);
      if (error) throw error;
      fetchProjectData();
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Are you sure you want to delete task "${task.name}"?`)) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (error) throw error;
      fetchProjectData();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Payment Handlers
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !payment) return;
    setPaymentSaving(true);
    const amount = Number(paymentAmount) || 0;
    
    const newReceived = (payment.received || 0) + amount;
    const newAdvance = isAdvance ? (payment.advance_paid || 0) + amount : (payment.advance_paid || 0);
    const newPending = Math.max(0, (payment.total_amount || 0) - newReceived);

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          received: newReceived,
          advance_paid: newAdvance,
          pending: newPending,
        })
        .eq('id', payment.id);

      if (error) throw error;

      await sendNotification(
        `Recorded payment of ₹${amount.toLocaleString('en-IN')} for project ${project?.name}.`,
        'payment'
      );
      
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setIsAdvance(false);
      fetchProjectData();
    } catch (err) {
      console.error('Error recording payment:', err);
    } finally {
      setPaymentSaving(false);
    }
  };

  // Document File Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setUploading(true);
    const filePath = `${user?.id}/${projectId}/${Math.random().toString(36).substring(2, 7)}_${file.name}`;

    try {
      // 1. Upload to Supabase Storage (documents bucket)
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      // Get public URL
      const fileUrl = uploadData?.url || supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;

      // 2. Insert record into documents table
      const { error: insertErr } = await supabase.from('documents').insert({
        project_id: projectId,
        client_id: project.client_id,
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type || 'application/octet-stream',
      });

      if (insertErr) throw insertErr;

      await sendNotification(`Uploaded file "${file.name}" to project documents.`, 'info');
      fetchProjectData();
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('File upload failed. Ensure that you have a "documents" bucket created in your Supabase storage dashboard.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
      </div>
    );
  }

  if (!project) return null;

  // Calculate Tasks completion rate
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Upper header navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/projects">
            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 dark:border-slate-800">
              <ArrowLeft className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{project.name}</h2>
            <p className="text-xs text-slate-500 font-medium">Project Control Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
        </div>
      </div>

      {/* Main Tabs switcher */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-md border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-1.5">
            <CheckSquare className="h-4 w-4" />
            <span>Tasks ({tasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" />
            <span>Payments</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            <span>Files</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base font-bold">Project Scope & Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {project.description || 'No description provided for this project.'}
                </p>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Tasks Completed</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{completionRate}% ({completedTasks}/{tasks.length})</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick sidebar widgets */}
            <div className="space-y-6">
              {/* Client card */}
              {project.clients && (
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                      Client Ownership
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight">
                      <Link href={`/clients/${project.clients.id}`} className="hover:underline text-slate-800 hover:text-black dark:text-slate-200 dark:hover:text-white flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {project.clients.name}
                      </Link>
                    </div>
                    {project.clients.business_name && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Building className="h-3.5 w-3.5" />
                        {project.clients.business_name}
                      </p>
                    )}
                    {project.clients.email && (
                      <p className="text-xs text-slate-500">{project.clients.email}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Financial values card */}
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Contract Value</span>
                    <span className="font-mono font-bold">₹{Number(project.budget).toLocaleString('en-IN')}</span>
                  </div>
                  {payment && (
                    <>
                      <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Milestones Paid</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(payment.received).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-slate-500">Pending Invoice Balance</span>
                        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
                          ₹{Number(payment.pending).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </>
                  )}
                  {project.deadline && (
                    <div className="pt-2 flex justify-between items-center text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Target Deadline
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {new Date(project.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 2. Tasks Tab */}
        <TabsContent value="tasks">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <CardTitle className="text-base font-bold">Project Milestones & Checklist</CardTitle>
                <CardDescription className="text-xs">Add individual tasks and mark them complete.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsTaskModalOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Task
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No tasks created yet. Click "Create Task" to add one.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="py-4 flex items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/10 px-2 rounded-lg"
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className="mt-0.5 rounded border border-slate-300 dark:border-slate-700 p-0.5 text-black hover:border-black dark:text-white dark:hover:border-white bg-white dark:bg-slate-950"
                        >
                          <CheckCircle className={`h-4.5 w-4.5 transition-opacity ${task.status === 'Completed' ? 'opacity-100 text-black dark:text-white' : 'opacity-0'}`} />
                        </button>

                        <div className="min-w-0">
                          <p className={`text-sm font-semibold leading-tight truncate ${task.status === 'Completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {task.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {task.deadline && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            )}
                            <PriorityBadge priority={task.priority} />
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 shrink-0"
                        onClick={() => handleDeleteTask(task)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Payments Tab */}
        <TabsContent value="payments">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-bold">Ledger Transactions</CardTitle>
                {payment && (
                  <Button size="sm" onClick={() => setIsPaymentModalOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Record Payment
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {!payment ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No payment record exists for this project.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Value</span>
                        <p className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100 mt-1">
                          ₹{payment.total_amount.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Advance Paid</span>
                        <p className="font-mono font-bold text-lg text-zinc-900 dark:text-zinc-100 mt-1">
                          ₹{payment.advance_paid.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Received</span>
                        <p className="font-mono font-bold text-lg text-zinc-900 dark:text-zinc-100 mt-1">
                          ₹{payment.received.toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance Pending</span>
                        <p className="font-mono font-bold text-lg text-zinc-900 dark:text-zinc-100 mt-1">
                          ₹{payment.pending.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status Log</h4>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        The contract budget is set to ₹{payment.total_amount.toLocaleString('en-IN')}. Current payment progress is{' '}
                        {payment.total_amount > 0
                          ? Math.round((payment.received / payment.total_amount) * 100)
                          : 0}
                        %. Recorded payments will immediately reflect in outstanding pending lists.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-400">Quick Invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Need to send an invoice for this project? Go to the Billing ledger to generate a tax invoice PDF.
                </p>
                <Link href="/invoices">
                  <Button variant="outline" className="w-full border-slate-200 dark:border-slate-800 mt-2 text-xs">
                    <FileText className="mr-2 h-4 w-4" />
                    Invoicing Center
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. Documents Tab */}
        <TabsContent value="documents">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <CardTitle className="text-base font-bold">Project Assets & Contracts</CardTitle>
                <CardDescription className="text-xs">Store receipts, scope PDF files, or website wireframe designs.</CardDescription>
              </div>
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Button
                  size="sm"
                  isLoading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No documents uploaded. Drag and drop file to store assets.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 border border-slate-100 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-sm hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-slate-500 shrink-0">
                          <FolderOpen className="h-4.5 w-4.5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-medium">{doc.file_type.split('/')[1] || 'FILE'}</p>
                        </div>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0 ml-2">
                        <Button variant="ghost" size="sm" className="text-slate-500 hover:text-black dark:hover:text-white text-xs">
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

      {/* Add Task Modal */}
      <Dialog
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add New Milestone Task"
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-name">Task Description *</Label>
            <Input
              id="t-name"
              required
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Design Wireframes"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-deadline">Target Date</Label>
            <Input
              id="t-deadline"
              type="date"
              value={taskDeadline}
              onChange={(e) => setTaskDeadline(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-priority">Priority</Label>
              <Select id="t-priority" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-status">Status</Label>
              <Select id="t-status" value={taskStatus} onChange={(e) => setTaskStatus(e.target.value)}>
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={taskSaving}>
              Create Task
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment Transaction"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amt">Amount Received (INR ₹) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">₹</span>
              <Input
                id="pay-amt"
                required
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="5000"
                className="pl-7"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="pay-advance"
                checked={isAdvance}
                onChange={(e) => setIsAdvance(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-black dark:text-white focus:ring-zinc-500 dark:focus:ring-zinc-400 bg-white dark:bg-slate-900"
              />
            <Label htmlFor="pay-advance" className="cursor-pointer">
              Mark as advance payment
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={paymentSaving}>
              Save Transaction
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
