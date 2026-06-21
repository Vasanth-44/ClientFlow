'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  IndianRupee,
  Loader2,
  Building,
  ArrowRight,
  Eye,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  business_name?: string;
}

interface Project {
  id: string;
  client_id: string;
  name: string;
  budget: number;
  deadline: string;
  status: string;
  priority: string;
  clients?: Client;
}

const COLUMNS = [
  { id: 'Lead', label: 'Lead', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'Proposal Sent', label: 'Proposal', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'In Progress', label: 'Development', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { id: 'Testing', label: 'Testing', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'Completed', label: 'Completed', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
];

export default function KanbanPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Mounted check to prevent SSR hydration errors with react-beautiful-dnd
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(id, name, business_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects for kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    // Optimistic UI state update
    const prevProjects = [...projects];
    const updated = projects.map((p) => {
      if (p.id === draggableId) {
        return { ...p, status: destination.droppableId };
      }
      return p;
    });
    setProjects(updated);

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: destination.droppableId })
        .eq('id', draggableId);

      if (error) throw error;

      const projectObj = projects.find((p) => p.id === draggableId);
      const targetCol = COLUMNS.find((c) => c.id === destination.droppableId);
      
      if (projectObj && targetCol) {
        await sendNotification(
          `Moved "${projectObj.name}" to ${targetCol.label} stage.`,
          'info'
        );
      }
    } catch (err) {
      console.error('Failed to update stage on drag:', err);
      // Revert on error
      setProjects(prevProjects);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <p className="text-xs text-slate-500 font-medium">Pipeline Management Board</p>
        </div>
        <Link href="/projects">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Project
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto pb-4 flex gap-4 items-start select-none custom-scrollbar">
            {COLUMNS.map((column) => {
              // Filter projects belonging to this column status
              const colProjects = projects.filter((p) => p.status === column.id);

              return (
                <div
                  key={column.id}
                  className="w-72 shrink-0 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/40 p-3 flex flex-col max-h-full"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-2 px-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${column.color}`}>
                        {column.label}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">{colProjects.length}</span>
                    </div>
                  </div>

                  {/* Droppable Board */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto min-h-[150px] space-y-3 rounded-lg p-1 transition-colors custom-scrollbar ${snapshot.isDraggingOver ? 'bg-slate-200/50 dark:bg-slate-800/20' : ''}`}
                      >
                        {colProjects.map((project, index) => (
                          <Draggable key={project.id} draggableId={project.id} index={index}>
                            {(providedDrag, snapshotDrag) => (
                              <div
                                ref={providedDrag.innerRef}
                                {...providedDrag.draggableProps}
                                {...providedDrag.dragHandleProps}
                                className={`transform transition-all ${snapshotDrag.isDragging ? 'rotate-2 scale-102 shadow-xl' : ''}`}
                              >
                                <Card className="hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950 shadow-sm border-slate-200/65 dark:border-slate-800/80">
                                  <CardContent className="p-4 space-y-3">
                                    {/* Card Header info */}
                                    <div className="space-y-1">
                                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-snug break-words">
                                        {project.name}
                                      </h4>
                                      {project.clients && (
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                          <Building className="h-3 w-3" />
                                          {project.clients.name}
                                        </p>
                                      )}
                                    </div>

                                    {/* Bottom meta stats */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px]">
                                      {project.deadline ? (
                                        <span className="text-slate-400 font-semibold flex items-center gap-0.5">
                                          <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                                          {new Date(project.deadline).toLocaleDateString([], {
                                            month: 'short',
                                            day: 'numeric',
                                          })}
                                        </span>
                                      ) : (
                                        <span className="text-slate-500">No deadline</span>
                                      )}
                                      <PriorityBadge priority={project.priority} />
                                    </div>

                                    {/* Hover view link */}
                                    <div className="flex justify-end pt-1">
                                      <Link href={`/projects/${project.id}`}>
                                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-indigo-500 hover:text-indigo-600">
                                          <Eye className="mr-1 h-3.5 w-3.5" />
                                          Details
                                        </Button>
                                      </Link>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
