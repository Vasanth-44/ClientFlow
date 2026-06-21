'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Sparkles, ArrowRight, Loader2, ShieldCheck, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PortalSelectPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [accessCode, setAccessCode] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data } = await supabase.from('clients').select('id, name, business_name');
        setClients(data || []);
      } catch (err) {
        console.error('Failed to load portal client directory:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleEnterCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim()) {
      router.push(`/portal/${accessCode.trim()}`);
    }
  };

  const handleSelectClient = () => {
    if (selectedId) {
      router.push(`/portal/${selectedId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-900 dark:text-zinc-150" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-2 rounded-xl bg-black text-white dark:bg-zinc-900 mb-2">
          <ShieldCheck className="h-7 w-7 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Client Access Portal</h1>
        <p className="text-xs text-zinc-450 font-semibold leading-relaxed">
          Access shared project milestones, download assets, and verify invoices securely.
        </p>
      </div>

      {/* Select client for simulation */}
      <Card className="border-zinc-200 dark:border-zinc-850 bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Building className="h-4 w-4" />
            Simulate Client Entry
          </CardTitle>
          <CardDescription className="text-[10px]">
            Choose a client from the directory below to view the customer workspace dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="client-select">Client Profile</Label>
            <Select id="client-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">-- Choose simulated client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.business_name ? `(${c.business_name})` : ''}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={handleSelectClient} disabled={!selectedId} className="w-full text-xs h-9.5 flex items-center justify-center gap-1.5">
            Access Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Access Code input */}
      <Card className="border-zinc-200 dark:border-zinc-850 bg-white dark:bg-black">
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Enter Security Code
          </CardTitle>
          <CardDescription className="text-[10px]">
            Input your secure client access key code to login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEnterCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="access-code">Access Token ID</Label>
              <Input
                id="access-code"
                type="text"
                required
                placeholder="e.g. client-uuid-key"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button type="submit" className="w-full text-xs h-9.5 flex items-center justify-center gap-1.5">
              Verify Token
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-black dark:hover:text-white font-bold underline">
          Back to Admin Workspace
        </Link>
      </div>
    </div>
  );
}
