'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to an audit / diagnostics reporter
    console.error('Captured Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-white dark:bg-black text-slate-900 dark:text-slate-50">
      <Card className="max-w-md w-full border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
        {/* Decorative alert top strip */}
        <div className="absolute top-0 inset-x-0 h-1 bg-red-650" />

        <CardHeader className="pt-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Something went wrong</CardTitle>
          <CardDescription className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
            An unexpected client-side runtime error has occurred. The dashboard environment intercepted the fault.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {/* Error Message Trace */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-850 rounded-lg text-[10px] font-mono text-zinc-555 dark:text-zinc-400 break-words max-h-24 overflow-y-auto">
            {error.message || 'Error: Unknown runtime fault details.'}
            {error.digest && <p className="mt-1 text-zinc-400">Digest: {error.digest}</p>}
          </div>

          {/* Action Triggers */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => reset()}
              variant="outline"
              className="text-xs font-semibold h-10 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Recovering
            </Button>

            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="text-xs font-semibold h-10 flex items-center justify-center gap-1.5"
            >
              <Home className="h-3.5 w-3.5" />
              Go Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
