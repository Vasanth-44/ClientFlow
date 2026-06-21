'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  FileText,
  Search,
  Plus,
  Download,
  Mail,
  Calendar,
  IndianRupee,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  name: string;
  business_name?: string;
  email?: string;
}

interface Project {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  client_id: string;
  project_id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  due_date: string;
  status: string;
  created_at: string;
  clients?: Client;
  projects?: Project;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('18');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch invoices
      const { data: invoicesData, error: invErr } = await supabase
        .from('invoices')
        .select('*, clients(id, name, business_name, email), projects(id, name)')
        .order('created_at', { ascending: false });

      if (invErr) throw invErr;
      setInvoices(invoicesData || []);

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, business_name, email');
      setClients(clientsData || []);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name');
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error fetching invoices view data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const openAddModal = () => {
    const nextNum = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
    setInvoiceNumber(nextNum);
    setClientId(clients[0]?.id || '');
    setProjectId(projects[0]?.id || '');
    setAmount('');
    setTax('18');
    setDueDate('');
    setIsModalOpen(true);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !clientId || !projectId || !amount) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('invoices').insert({
        client_id: clientId,
        project_id: projectId,
        invoice_number: invoiceNumber,
        amount: Number(amount) || 0,
        tax: Number(tax) || 0,
        due_date: dueDate || null,
        status: 'Unpaid',
      });

      if (error) throw error;

      await sendNotification(`Generated invoice ${invoiceNumber}.`, 'info');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error creating invoice:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
      if (error) throw error;

      await sendNotification(`Deleted invoice ${invoice.invoice_number}.`, 'alert');
      fetchData();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('TAX INVOICE', 20, 30);
    
    // Metadata block
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 20, 42);
    doc.text(`Date of Issue: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 48);
    doc.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon receipt'}`, 20, 54);
    
    // Bill to details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50);
    doc.text('BILL TO:', 20, 68);
    doc.setFontSize(10);
    doc.text(invoice.clients?.name || 'Client Name', 20, 74);
    if (invoice.clients?.business_name) {
      doc.text(invoice.clients.business_name, 20, 80);
    }
    if (invoice.clients?.email) {
      doc.text(invoice.clients.email, 20, 86);
    }

    // Grid details
    doc.setFillColor(9, 9, 11); // Zinc-950 color
    doc.rect(20, 100, 170, 8, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('Project Work Item Description', 24, 105);
    doc.text('Amount (INR)', 180, 105, { align: 'right' });
    
    // Item row
    doc.setTextColor(80);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.projects?.name || 'Consultancy Services', 24, 116);
    doc.text(`Rs ${Number(invoice.amount).toLocaleString('en-IN')}`, 180, 116, { align: 'right' });
    
    doc.setDrawColor(230);
    doc.line(20, 122, 190, 122);
    
    // Calculations block
    const subtotal = Number(invoice.amount) || 0;
    const taxRate = Number(invoice.tax) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, 134, { align: 'right' });
    doc.text(`Rs ${subtotal.toLocaleString('en-IN')}`, 180, 134, { align: 'right' });
    
    doc.text(`Tax (${taxRate}%):`, 140, 140, { align: 'right' });
    doc.text(`Rs ${taxAmount.toLocaleString('en-IN')}`, 180, 140, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(9, 9, 11);
    doc.text('Grand Total (INR):', 140, 148, { align: 'right' });
    doc.text(`Rs ${grandTotal.toLocaleString('en-IN')}`, 180, 148, { align: 'right' });
    
    // Save
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const handleEmailInvoice = (invoice: Invoice) => {
    const clientEmail = invoice.clients?.email;
    if (!clientEmail) {
      alert("This client does not have an email address specified. Edit client details first.");
      return;
    }
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} from ClientFlow`);
    const body = encodeURIComponent(`Hi ${invoice.clients?.name || 'there'},\n\nWe have generated invoice ${invoice.invoice_number} for project "${invoice.projects?.name}".\nAmount: Rs ${(Number(invoice.amount) * (1 + Number(invoice.tax) / 100)).toLocaleString('en-IN')}.\nDue Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon receipt'}.\n\nPlease find the details in your dashboard.\n\nBest regards,\nClientFlow Admin`);
    
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`);
    sendNotification(`Redirected to client email for invoice ${invoice.invoice_number}.`, 'info');
  };

  const handleToggleStatus = async (invoice: Invoice) => {
    const nextStatus = invoice.status === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: nextStatus })
        .eq('id', invoice.id);

      if (error) throw error;
      
      // If we mark as paid, send a notification and update local state
      if (nextStatus === 'Paid') {
        // Also update payment record received if it exists
        const { data: currentPayments } = await supabase
          .from('payments')
          .select('*')
          .eq('project_id', invoice.project_id);

        if (currentPayments && currentPayments.length > 0) {
          const currentPay = currentPayments[0];
          const newReceived = (currentPay.received || 0) + Number(invoice.amount);
          const newPending = Math.max(0, (currentPay.total_amount || 0) - newReceived);
          
          await supabase
            .from('payments')
            .update({ received: newReceived, pending: newPending })
            .eq('id', currentPay.id);
        }
      }
      
      await sendNotification(`Marked invoice ${invoice.invoice_number} as ${nextStatus}.`, 'info');
      fetchData();
    } catch (err) {
      console.error('Failed to toggle invoice status:', err);
    }
  };

  // Filters logic
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.clients?.name && inv.clients.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Control Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by invoice number or client name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="w-40 shrink-0">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </Select>
          </div>
        </div>

        <Button onClick={openAddModal} className="shrink-0">
          <Plus className="mr-1.5 h-4.5 w-4.5" />
          Generate Invoice
        </Button>
      </div>

      {/* Grid records */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl py-20 text-center dark:border-slate-800">
          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Invoices Issued</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Generate invoice records to compute client tax calculations, email notices, and print PDFs.
          </p>
          <Button onClick={openAddModal} variant="outline" className="mt-6 border-slate-300 dark:border-slate-700">
            <Plus className="mr-2 h-4 w-4" />
            Generate First Invoice
          </Button>
        </div>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Project Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => {
                  const sub = Number(inv.amount) || 0;
                  const tx = Number(inv.tax) || 0;
                  const totalWithTax = sub + (sub * tx) / 100;

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {inv.clients?.name}
                        </div>
                        {inv.clients?.business_name && (
                          <div className="text-[10px] text-slate-400">{inv.clients.business_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 max-w-[200px] truncate">{inv.projects?.name}</TableCell>
                      <TableCell className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        ₹{totalWithTax.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs">{inv.tax}%</TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleStatus(inv)}
                          className="hover:scale-105 transition-transform"
                          title="Toggle Paid/Unpaid"
                        >
                          <StatusBadge status={inv.status} />
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-black dark:hover:text-white"
                            onClick={() => handleDownloadPDF(inv)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-black dark:hover:text-white"
                            onClick={() => handleEmailInvoice(inv)}
                            title="Email Invoice"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-650"
                            onClick={() => handleDelete(inv)}
                            title="Delete Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Generate Invoice Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Tax Invoice"
      >
        {clients.length === 0 || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You must create at least one client and project before generating invoices.
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-num">Invoice Number *</Label>
                <Input
                  id="inv-num"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-2026-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-tax">Tax Rate (%)</Label>
                <Select id="inv-tax" value={tax} onChange={(e) => setTax(e.target.value)}>
                  <option value="0">0% (GST Exempt)</option>
                  <option value="5">5% (GST)</option>
                  <option value="12">12% (GST)</option>
                  <option value="18">18% (GST Standard)</option>
                  <option value="28">28% (GST Lux)</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-client">Client *</Label>
              <Select id="inv-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.business_name ? `(${c.business_name})` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-proj">Project *</Label>
              <Select id="inv-proj" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inv-amt">Base Amount (INR ₹) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">₹</span>
                  <Input
                    id="inv-amt"
                    required
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="20000"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-date">Due Date</Label>
                <Input
                  id="inv-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Generate Invoice
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
