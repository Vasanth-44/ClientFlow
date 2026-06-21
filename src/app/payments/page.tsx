'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import {
  IndianRupee,
  Search,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  Building,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Client {
  name: string;
}

interface Project {
  name: string;
  clients?: Client;
}

interface PaymentRecord {
  id: string;
  project_id: string;
  total_amount: number;
  advance_paid: number;
  received: number;
  pending: number;
  created_at: string;
  projects?: Project;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Record Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isAdvance, setIsAdvance] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, projects(name, clients(name))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = (data || []).map((pay: any) => ({
        id: pay.id,
        project_id: pay.project_id,
        total_amount: Number(pay.total_amount) || 0,
        advance_paid: Number(pay.advance_paid) || 0,
        received: Number(pay.received) || 0,
        pending: Number(pay.pending) || 0,
        created_at: pay.created_at,
        projects: pay.projects,
      }));

      setPayments(formatted);
    } catch (err) {
      console.error('Error loading payments ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const openPaymentModal = (pay: PaymentRecord) => {
    setSelectedPayment(pay);
    setPaymentAmount('');
    setIsAdvance(false);
    setIsModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !selectedPayment) return;
    setSubmitting(true);
    
    const amount = Number(paymentAmount) || 0;
    const newReceived = selectedPayment.received + amount;
    const newAdvance = isAdvance ? selectedPayment.advance_paid + amount : selectedPayment.advance_paid;
    const newPending = Math.max(0, selectedPayment.total_amount - newReceived);

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          received: newReceived,
          advance_paid: newAdvance,
          pending: newPending,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      await sendNotification(
        `Recorded ₹${amount.toLocaleString('en-IN')} payment for project "${selectedPayment.projects?.name}".`,
        'payment'
      );

      setIsModalOpen(false);
      fetchPayments();
    } catch (err) {
      console.error('Failed to submit transaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const projName = p.projects?.name?.toLowerCase() || '';
    const clientName = p.projects?.clients?.name?.toLowerCase() || '';
    const query = search.toLowerCase();

    return projName.includes(query) || clientName.includes(query);
  });

  // Global aggregates
  const totalValue = payments.reduce((sum, p) => sum + p.total_amount, 0);
  const totalReceived = payments.reduce((sum, p) => sum + p.received, 0);
  const totalPending = payments.reduce((sum, p) => sum + p.pending, 0);
  const totalAdvance = payments.reduce((sum, p) => sum + p.advance_paid, 0);

  return (
    <div className="space-y-6">
      {/* Aggregated Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Total Contract Value</span>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              ₹{totalValue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Across all contracts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Total Contract Value</span>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              ₹{totalValue.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Across all contracts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Total Received Cash</span>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              ₹{totalReceived.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Milestones fully collected</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Outstanding Dues</span>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              ₹{totalPending.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Pending collections</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Retainer Advances</span>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              ₹{totalAdvance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Retainer upfronts</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by project or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-slate-200 dark:border-slate-800"
          />
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl py-20 text-center dark:border-slate-800">
          <IndianRupee className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Ledgers Registered</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Projects initialized in the system automatically generate interactive ledger records here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPayments.map((pay, index) => {
            const progress = pay.total_amount > 0 ? Math.round((pay.received / pay.total_amount) * 100) : 0;

            return (
              <motion.div
                key={pay.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="h-full flex flex-col justify-between hover:shadow-md relative overflow-hidden group">

                  <CardContent className="pt-6 flex-1 space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-tight">
                        {pay.projects?.name}
                      </h4>
                      {pay.projects?.clients && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                          <Building className="h-3 w-3 shrink-0" />
                          {pay.projects.clients.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Contract Budget:</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          ₹{pay.total_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Upfront Advance:</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          ₹{pay.advance_paid.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Cash Collected:</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          ₹{pay.received.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 font-semibold">
                        <span>Dues Pending:</span>
                        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">
                          ₹{pay.pending.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                        <span>Collection Rate</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>

                  <div className="px-6 py-3.5 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <Link href={`/projects/${pay.project_id}?tab=payments`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs hover:text-black dark:hover:text-white">
                        View History
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 border-slate-200 dark:border-slate-800 text-xs font-semibold"
                      onClick={() => openPaymentModal(pay)}
                      disabled={pay.pending === 0}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Collect Cash
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Record Payment Transaction Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Client Payment"
      >
        {selectedPayment && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Project: {selectedPayment.projects?.name}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800 text-slate-500">
                <p>Contract: ₹{selectedPayment.total_amount.toLocaleString('en-IN')}</p>
                <p>Pending: ₹{selectedPayment.pending.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="global-pay-amt">Amount Received (INR ₹) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">₹</span>
                <Input
                  id="global-pay-amt"
                  required
                  type="number"
                  max={selectedPayment.pending}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="pl-7"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="global-pay-advance"
                checked={isAdvance}
                onChange={(e) => setIsAdvance(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-black dark:text-white focus:ring-zinc-500 dark:focus:ring-zinc-400 bg-white dark:bg-slate-900"
              />
              <Label htmlFor="global-pay-advance" className="cursor-pointer">
                Mark as upfront retainer advance
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                Record Transaction
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
