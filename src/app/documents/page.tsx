'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  FolderOpen,
  Search,
  Plus,
  Download,
  Trash2,
  Upload,
  Calendar,
  Briefcase,
  Building,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface DocumentRecord {
  id: string;
  project_id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
  projects?: Project;
  clients?: Client;
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch documents
      const { data: docsData, error: docsErr } = await supabase
        .from('documents')
        .select('*, projects(id, name), clients(id, name)')
        .order('created_at', { ascending: false });

      if (docsErr) throw docsErr;
      setDocuments(docsData || []);

      // Fetch clients
      const { data: clientsData } = await supabase.from('clients').select('id, name');
      setClients(clientsData || []);

      // Fetch projects
      const { data: projectsData } = await supabase.from('projects').select('id, name');
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error fetching documents page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const openUploadModal = () => {
    setSelectedFile(null);
    setSelectedProjectId(projects[0]?.id || '');
    setSelectedClientId(clients[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedProjectId || !selectedClientId) return;
    setUploading(true);

    const filePath = `${user?.id}/${selectedProjectId}/${Math.random().toString(36).substring(2, 7)}_${selectedFile.name}`;

    try {
      // 1. Upload to Supabase Storage documents bucket
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadErr) throw uploadErr;

      // Get public URL
      const fileUrl = uploadData?.url || supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;

      // 2. Insert record into documents table
      const { error: insertErr } = await supabase.from('documents').insert({
        project_id: selectedProjectId,
        client_id: selectedClientId,
        file_name: selectedFile.name,
        file_url: fileUrl,
        file_type: selectedFile.type || 'application/octet-stream',
      });

      if (insertErr) throw insertErr;

      await sendNotification(`Uploaded file "${selectedFile.name}".`, 'info');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Document upload failed:', err);
      alert(
        'Upload failed. Please ensure you have created a storage bucket named "documents" in your Supabase project dashboard.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocumentRecord) => {
    if (!confirm(`Are you sure you want to delete "${doc.file_name}"?`)) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;

      await sendNotification(`Deleted file "${doc.file_name}".`, 'alert');
      fetchData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.file_name.toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === 'ALL' || doc.project_id === projectFilter;

    return matchesSearch && matchesProject;
  });

  return (
    <div className="space-y-6">
      {/* Upper toolbar controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search documents by file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="w-44 shrink-0">
            <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button onClick={openUploadModal} className="shrink-0">
          <Upload className="mr-1.5 h-4.5 w-4.5" />
          Upload Document
        </Button>
      </div>

      {/* Grid of details */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl py-20 text-center dark:border-slate-800">
          <FolderOpen className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Documents Uploaded</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Upload PDFs, images, contracts, or invoices associated with your projects.
          </p>
          <Button onClick={openUploadModal} variant="outline" className="mt-6 border-slate-300 dark:border-slate-700">
            <Upload className="mr-2 h-4 w-4" />
            Upload First Document
          </Button>
        </div>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Linked Project</TableHead>
                  <TableHead>Linked Client</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                      <FolderOpen className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]" title={doc.file_name}>
                        {doc.file_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      {doc.projects ? (
                        <Link href={`/projects/${doc.project_id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-xs">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          {doc.projects.name}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.clients ? (
                        <Link href={`/clients/${doc.client_id}`} className="text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1 text-xs">
                          <Building className="h-3 w-3 text-slate-400" />
                          {doc.clients.name}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs uppercase font-medium bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-slate-500">
                        {doc.file_type.split('/')[1] || 'attachment'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-indigo-500">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Upload Document Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Document Asset"
      >
        {clients.length === 0 || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You must create at least one client and project before uploading assets.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-file">Select File *</Label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-indigo-500 cursor-pointer transition-colors relative bg-slate-50/50 dark:bg-slate-900/10">
                <input
                  type="file"
                  id="doc-file"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {selectedFile ? selectedFile.name : 'Click to select or drag & drop file'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG, DOC up to 10MB</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-client">Associate with Client *</Label>
              <Select id="doc-client" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-proj">Associate with Project *</Label>
              <Select id="doc-proj" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={uploading}>
                Upload Document
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
