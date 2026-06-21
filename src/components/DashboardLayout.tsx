'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader2 } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // If not loading and no user, redirect to login
    // unless they are on landing page, login, or register
    const isPublicRoute =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/register';

    if (!loading && !user && !isPublicRoute) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register';

  // If loading user state on a protected route, show a beautiful loading state
  if (loading && !isPublicRoute) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-white dark:bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-900 dark:text-zinc-100" />
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading ClientFlow...
        </p>
      </div>
    );
  }

  // If we are redirecting to login, render empty to avoid flash of content
  if (!user && !isPublicRoute) {
    return null;
  }

  // If it's a public route, just render the children directly
  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 dark:bg-black dark:text-slate-50">
      {/* Sidebar Nav */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Nav */}
        <Header onMenuOpen={() => setIsSidebarOpen(true)} />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
