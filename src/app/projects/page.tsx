'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import {
  Briefcase,
  Search,
  Plus,
  Calendar,
  IndianRupee,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  Building,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  name: string;
  business_name?: string;
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
  created_at: string;
  clients?: Client;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('Lead');
  const [priority, setPriority] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjectsAndClients = async () => {
    if (!user) return;
    try {
      // Fetch projects
      const { data: projectsData, error: projErr } = await supabase
        .from('projects')
        .select('*, clients(id, name, business_name)')
        .order('created_at', { ascending: false });

      if (projErr) throw projErr;
      setProjects(projectsData || []);

      // Fetch clients
      const { data: clientsData, error: clientErr } = await supabase
        .from('clients')
        .select('id, name, business_name')
        .order('name', { ascending: true });

      if (clientErr) throw clientErr;
      setClients(clientsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndClients();
  }, [user]);

  const openAddModal = () => {
    setEditingProject(null);
    setName('');
    setClientId(clients[0]?.id || '');
    setDescription('');
    setBudget('');
    setDeadline('');
    setStatus('Lead');
    setPriority('Medium');
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setClientId(project.client_id);
    setDescription(project.description || '');
    setBudget(String(project.budget || ''));
    setDeadline(project.deadline || '');
    setStatus(project.status);
    setPriority(project.priority);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId) return;

    setSubmitting(true);
    const numBudget = Number(budget) || 0;
    
    const projectData = {
      name,
      client_id: clientId,
      description,
      budget: numBudget,
      deadline: deadline || null,
      status,
      priority,
    };

    try {
      if (editingProject) {
        // Update project
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', editingProject.id);

        if (error) throw error;

        // Also update payment record budget if it exists
        const { data: currentPayments } = await supabase
          .from('payments')
          .select('*')
          .eq('project_id', editingProject.id);

        if (currentPayments && currentPayments.length > 0) {
          const currentPay = currentPayments[0];
          await supabase
            .from('payments')
            .update({
              total_amount: numBudget,
              pending: numBudget - (currentPay.received || 0),
            })
            .eq('id', currentPay.id);
        }

        await sendNotification(`Updated project details for ${name}.`, 'info');
      } else {
        // Insert project
        const { data: newProj, error } = await supabase
          .from('projects')
          .insert(projectData)
          .select()
          .single();

        if (error) throw error;

        // Automatically initialize a payments row
        if (newProj) {
          await supabase.from('payments').insert({
            project_id: newProj.id,
            total_amount: numBudget,
            advance_paid: 0,
            received: 0,
            pending: numBudget,
          });
        }

        await sendNotification(`Created new project ${name}.`, 'info');
      }

      setIsModalOpen(false);
      fetchProjectsAndClients();
    } catch (err) {
      console.error('Error saving project:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete ${project.name}? This will delete all tasks and billing records linked to it.`)) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;

      await sendNotification(`Deleted project ${project.name}.`, 'alert');
      fetchProjectsAndClients();
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clients?.name && p.clients.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || p.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row flex-1 max-w-4xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search projects by name or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="flex gap-3 shrink-0">
            <div className="w-40">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="Lead">Lead</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="In Progress">In Progress</option>
                <option value="Testing">Testing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </Select>
            </div>

            <div className="w-40">
              <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="ALL">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </Select>
            </div>
          </div>
        </div>

        <Button onClick={openAddModal} className="shrink-0">
          <Plus className="mr-2 h-4.5 w-4.5" />
          Add Project
        </Button>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl py-20 text-center dark:border-slate-800">
          <Briefcase className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Projects Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Create a project and specify client ownership, budget limits, and active status phases.
          </p>
          <Button onClick={openAddModal} variant="outline" className="mt-6 border-slate-300 dark:border-slate-700">
            <Plus className="mr-2 h-4 w-4" />
            Add First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col justify-between hover:shadow-md relative overflow-hidden group">
                <CardContent className="pt-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-base leading-tight group-hover:underline transition-colors">
                        {project.name}
                      </h3>
                      {project.clients && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          {project.clients.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <div className="space-y-1">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Budget</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        ₹{Number(project.budget).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Deadline</p>
                      <p className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <StatusBadge status={project.status} />
                    <PriorityBadge priority={project.priority} />
                  </div>
                </CardContent>

                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="ghost" size="sm" className="hover:text-black dark:hover:text-white text-xs">
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View Details
                    </Button>
                  </Link>

                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-amber-500"
                      onClick={() => openEditModal(project)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                      onClick={() => handleDelete(project)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? 'Edit Project Details' : 'Add New Project'}
      >
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You must create at least one client before adding a project.
            </p>
            <Link href="/clients" className="mt-4" onClick={() => setIsModalOpen(false)}>
              <Button>Go to Clients</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Project Name *</Label>
              <Input
                id="p-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Redesign"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-client">Client *</Label>
              <Select id="p-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.business_name ? `(${c.business_name})` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project milestones, scope description, required integrations..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-budget">Budget (INR ₹) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">₹</span>
                  <Input
                    id="p-budget"
                    required
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="25000"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-deadline">Deadline Date</Label>
                <Input
                  id="p-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-status">Status</Label>
                <Select id="p-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Lead">Lead</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Testing">Testing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-priority">Priority</Label>
                <Select id="p-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                {editingProject ? 'Save Changes' : 'Create Project'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
