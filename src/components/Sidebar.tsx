'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Briefcase, Columns, ClipboardList,
  IndianRupee, FileText, BarChart3, FolderOpen, Sparkles,
  Settings, LogOut, X, Target, Building, FileSignature,
  Megaphone, Bot, TrendingUp, UserCheck, Building2, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Target },
  { label: 'Outreach Center', href: '/outreach', icon: Megaphone },
  { label: 'AI Sales Assistant', href: '/ai-sales', icon: Bot },
  { label: 'Proposals', href: '/proposals', icon: FileSignature },
  { label: 'Clients', href: '/clients', icon: Building },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Projects', href: '/projects', icon: Briefcase },
  { label: 'Kanban', href: '/kanban', icon: Columns },
  { label: 'Tasks', href: '/tasks', icon: ClipboardList },
  { label: 'Payments', href: '/payments', icon: IndianRupee },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Agency Executive', href: '/agency', icon: TrendingUp },
  { label: 'Client Portal View', href: '/portal', icon: UserCheck },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
  { label: 'AI Tools', href: '/ai-tools', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  // Derive the workspace label: agencyName if set, else email domain
  const workspaceLabel = user?.agencyName
    || (user?.email ? user.email.split('@')[1]?.replace('.com', '').replace('.', ' ') : '')
    || 'My Workspace';

  // Initials for the agency avatar
  const agencyInitials = workspaceLabel
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-zinc-500 dark:text-zinc-400 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ── Agency Workspace Header ────────────────────────────────────── */}
        <div className="flex h-auto items-center justify-between px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5 min-w-0">
            {/* Agency avatar / initials */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md shadow-indigo-500/20">
              {agencyInitials || <Building2 className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                {workspaceLabel}
              </p>
              <p className="text-[10px] text-zinc-400 truncate leading-tight">Workspace</p>
            </div>
          </Link>

          {/* Close on mobile */}
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 lg:hidden shrink-0"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        {/* ── User Info ──────────────────────────────────────────────────── */}
        {user && (
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors group"
          >
            {/* User avatar */}
            <div className="h-8 w-8 rounded-full bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center text-white font-bold text-xs overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span>{user.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
          </Link>
        )}

        {/* ── Navigation Links ───────────────────────────────────────────── */}
        <nav className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors group',
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-black dark:hover:text-white text-zinc-500 dark:text-zinc-400'
                )}
              >
                <Icon className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  isActive ? 'text-black dark:text-white' : 'text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                )} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer / Sign Out ──────────────────────────────────────────── */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => { onClose(); signOut(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
