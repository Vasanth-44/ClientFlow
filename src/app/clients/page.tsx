'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import {
  Users,
  Search,
  Plus,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  name: string;
  business_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  created_at: string;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setBusinessName('');
    setEmail('');
    setPhone('');
    setWebsite('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setBusinessName(client.business_name || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setWebsite(client.website || '');
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    const clientData = {
      name,
      business_name: businessName,
      email,
      phone,
      website,
      address,
      notes,
    };

    try {
      if (editingClient) {
        // Update client
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;
        await sendNotification(`Updated client details for ${name}.`, 'info');
      } else {
        // Insert client
        const { error } = await supabase.from('clients').insert(clientData);
        if (error) throw error;
        await sendNotification(`Added new client ${name}.`, 'info');
      }

      setIsModalOpen(false);
      fetchClients();
    } catch (err) {
      console.error('Error saving client:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Are you sure you want to delete ${client.name}?`)) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', client.id);
      if (error) throw error;

      await sendNotification(`Deleted client ${client.name}.`, 'alert');
      fetchClients();
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  // Filter clients by name or company
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.business_name && c.business_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Upper header action controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search clients by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-slate-200 dark:border-slate-800"
          />
        </div>
        <Button onClick={openAddModal} className="shrink-0">
          <Plus className="mr-2 h-4.5 w-4.5" />
          Add Client
        </Button>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl py-20 text-center dark:border-slate-800">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Clients Found</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Create your first client record to manage their active projects and invoice statuses.
          </p>
          <Button onClick={openAddModal} variant="outline" className="mt-6 border-slate-300 dark:border-slate-700">
            <Plus className="mr-2 h-4 w-4" />
            Add First Client
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col justify-between hover:shadow-md relative overflow-hidden group">
                {/* Visual Accent border */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80" />

                <CardContent className="pt-6 flex-1 space-y-4">
                  {/* Title details */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-50 text-base leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {client.name}
                    </h3>
                    {client.business_name && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <Building className="h-3.5 w-3.5" />
                        {client.business_name}
                      </p>
                    )}
                  </div>

                  {/* Micro list data */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-400">
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <a
                          href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-indigo-500 flex items-center gap-0.5"
                        >
                          {client.website.replace(/(^\w+:|^)\/\//, '')}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">{client.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <Link href={`/clients/${client.id}`}>
                    <Button variant="ghost" size="sm" className="hover:text-indigo-600 dark:hover:text-indigo-400 text-xs">
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View Profile
                    </Button>
                  </Link>

                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-amber-500"
                      onClick={() => openEditModal(client)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                      onClick={() => handleDelete(client)}
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

      {/* Add/Edit Client Dialog Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Edit Client Details' : 'Add New Client'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Client Name *</Label>
            <Input
              id="c-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-biz">Business / Agency Name</Label>
            <Input
              id="c-biz"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email Address</Label>
              <Input
                id="c-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone Number</Label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0123"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-web">Website URL</Label>
            <Input
              id="c-web"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-addr">Business Address</Label>
            <Input
              id="c-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Corporate Way, suite 10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Internal Notes</Label>
            <Textarea
              id="c-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key contacts, Slack channel link, payment structure details..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingClient ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
