'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import {
  CheckSquare,
  Search,
  Plus,
  Calendar,
  Trash2,
  CheckCircle,
  Briefcase,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  project_id: string;
  name: string;
  deadline: string;
  priority: string;
  status: string;
  created_at: string;
  projects?: Project;
}

export default function TasksPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Task Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskStatus, setNewTaskStatus] = useState('Todo');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasksAndProjects = async () => {
    if (!user) return;
    try {
      // Fetch tasks
      const { data: tasksData, error: taskErr } = await supabase
        .from('tasks')
        .select('*, projects(id, name)')
        .order('created_at', { ascending: false });

      if (taskErr) throw taskErr;
      setTasks(tasksData || []);

      // Fetch projects
      const { data: projectsData, error: projErr } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true });

      if (projErr) throw projErr;
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error loading tasks dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndProjects();
  }, [user]);

  const openAddModal = () => {
    setNewTaskName('');
    setNewProjectId(projects[0]?.id || '');
    setNewTaskDeadline('');
    setNewTaskPriority('Medium');
    setNewTaskStatus('Todo');
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName || !newProjectId) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('tasks').insert({
        project_id: newProjectId,
        name: newTaskName,
        deadline: newTaskDeadline || null,
        priority: newTaskPriority,
        status: newTaskStatus,
      });

      if (error) throw error;

      const proj = projects.find(p => p.id === newProjectId);
      await sendNotification(`Added task "${newTaskName}" to ${proj?.name}.`, 'info');
      
      setIsModalOpen(false);
      fetchTasksAndProjects();
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'Completed' ? 'Todo' : 'Completed';
    // Optimistic Update
    const prev = [...tasks];
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setTasks(prev); // Revert
    }
  };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Are you sure you want to delete task "${task.name}"?`)) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (error) throw error;
      fetchTasksAndProjects();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Filters logic
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === 'ALL' || t.project_id === projectFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesProject && matchesPriority && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filters Header toolbar */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row flex-1 max-w-5xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="w-40">
              <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="ALL">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-40">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Statuses</option>
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
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
          <Plus className="mr-1.5 h-4.5 w-4.5" />
          Add Task
        </Button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl py-20 text-center dark:border-slate-800">
          <CheckSquare className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Tasks Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Create milestone lists for active client scopes and log their progress status.
          </p>
          <Button onClick={openAddModal} variant="outline" className="mt-6 border-slate-300 dark:border-slate-700">
            <Plus className="mr-2 h-4 w-4" />
            Add First Task
          </Button>
        </div>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-850">
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/10"
                >
                  <div className="flex items-start space-x-3.5 min-w-0">
                    {/* Status Checkbox */}
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="mt-0.5 rounded border border-slate-300 dark:border-slate-700 p-0.5 text-black hover:border-black dark:text-white dark:hover:border-white bg-white dark:bg-slate-950"
                    >
                      <CheckCircle className={`h-4.5 w-4.5 transition-opacity ${task.status === 'Completed' ? 'opacity-100 text-black dark:text-white' : 'opacity-0'}`} />
                    </button>

                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-tight truncate ${task.status === 'Completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.name}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                        {task.projects && (
                          <span className="text-[10px] text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1">
                            <Briefcase className="h-3 w-3 shrink-0" />
                            <Link href={`/projects/${task.project_id}`} className="hover:underline">
                              {task.projects.name}
                            </Link>
                          </span>
                        )}
                        {task.deadline && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 shrink-0"
                    onClick={() => handleDelete(task)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Task Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Task"
      >
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You must create at least one project before adding tasks.
            </p>
            <Link href="/projects" className="mt-4" onClick={() => setIsModalOpen(false)}>
              <Button>Go to Projects</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSaveTask} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tsk-name">Task Name *</Label>
              <Input
                id="tsk-name"
                required
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="e.g. Set up API endpoints"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tsk-project">Project Ownership *</Label>
              <Select id="tsk-project" value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tsk-deadline">Deadline Date</Label>
              <Input
                id="tsk-deadline"
                type="date"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tsk-priority">Priority</Label>
                <Select id="tsk-priority" value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tsk-status">Status</Label>
                <Select id="tsk-status" value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)}>
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Create Task
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
