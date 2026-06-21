'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Columns,
  ClipboardList,
  IndianRupee,
  FileText,
  BarChart3,
  FolderOpen,
  Sparkles,
  Settings,
  LogOut,
  X,
  Menu,
  Target,
  Building,
  FileSignature,
  Megaphone,
  Bot,
  TrendingUp,
  UserCheck,
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
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center space-x-2" onClick={onClose}>
            <span className="bg-black dark:bg-zinc-900 p-1.5 rounded-lg text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold text-black dark:text-white tracking-tight">
              Client<span className="text-zinc-550 dark:text-zinc-400">Flow AI</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 lg:hidden"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* User Info Quick View */}
        {user && (
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/50 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-black dark:bg-zinc-900 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-zinc-200 dark:border-zinc-800">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-semibold transition-colors group relative',
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white border-l-2 border-black dark:border-white rounded-l-none pl-3.5'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60 hover:text-black dark:hover:text-white text-zinc-500 dark:text-zinc-400'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-black dark:text-white' : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => {
              onClose();
              signOut();
            }}
            className="flex w-full items-center space-x-3 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-red-650 text-zinc-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
