'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  BellRing,
  Check,
  Info,
  AlertCircle,
  CreditCard,
  Search,
  Building,
  Target,
  Briefcase,
  FileText,
  X,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface HeaderProps {
  onMenuOpen: () => void;
}

const getPageTitle = (path: string) => {
  if (path.startsWith('/dashboard')) return 'Dashboard';
  if (path.startsWith('/leads')) return 'Leads & Pipeline';
  if (path.startsWith('/outreach')) return 'Outreach Center';
  if (path.startsWith('/ai-sales')) return 'AI Sales Assistant';
  if (path.startsWith('/proposals')) return 'Proposals Vault';
  if (path.startsWith('/clients/')) return 'Client Profile';
  if (path.startsWith('/clients')) return 'Clients';
  if (path.startsWith('/projects/')) return 'Project Details';
  if (path.startsWith('/projects')) return 'Projects';
  if (path.startsWith('/kanban')) return 'Kanban Board';
  if (path.startsWith('/tasks')) return 'Tasks';
  if (path.startsWith('/payments')) return 'Payments Tracker';
  if (path.startsWith('/invoices')) return 'Invoices';
  if (path.startsWith('/analytics')) return 'Analytics';
  if (path.startsWith('/documents')) return 'Documents';
  if (path.startsWith('/ai-tools')) return 'AI Assistant Tools';
  if (path.startsWith('/settings')) return 'Settings';
  if (path.startsWith('/portal')) return 'Client Portal';
  if (path.startsWith('/agency')) return 'Agency Executive';
  return 'Dashboard';
};

export function Header({ onMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  // Popover States
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [teamName, setTeamName] = useState('My Agency');

  // Global Search States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    leads: any[];
    clients: any[];
    projects: any[];
    invoices: any[];
  }>({ leads: [], clients: [], projects: [], invoices: [] });

  useEffect(() => {
    const fetchTeamName = async () => {
      if (!user) return;
      try {
        const { data: teamData } = await supabase.from('teams').select('name').single();
        if (teamData) {
          setTeamName(teamData.name);
        }
      } catch (err) {
        console.error('Error fetching team name in header:', err);
      }
    };
    fetchTeamName();
  }, [user]);

  // Debounced search logic
  useEffect(() => {
    const performGlobalSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults({ leads: [], clients: [], projects: [], invoices: [] });
        return;
      }
      try {
        const [
          { data: leadsData },
          { data: clientsData },
          { data: projectsData },
          { data: invoicesData },
        ] = await Promise.all([
          supabase.from('leads').select('*'),
          supabase.from('clients').select('*'),
          supabase.from('projects').select('*'),
          supabase.from('invoices').select('*'),
        ]);

        const q = searchQuery.toLowerCase();

        setSearchResults({
          leads: (leadsData || [])
            .filter(
              (l: any) =>
                l.full_name?.toLowerCase().includes(q) ||
                l.business_name?.toLowerCase().includes(q)
            )
            .slice(0, 3),
          clients: (clientsData || [])
            .filter(
              (c: any) =>
                c.name?.toLowerCase().includes(q) ||
                c.business_name?.toLowerCase().includes(q)
            )
            .slice(0, 3),
          projects: (projectsData || [])
            .filter((p: any) => p.name?.toLowerCase().includes(q))
            .slice(0, 3),
          invoices: (invoicesData || [])
            .filter((i: any) => i.invoice_number?.toLowerCase().includes(q))
            .slice(0, 3),
        });
      } catch (err) {
        console.error('Failed executing search query:', err);
      }
    };

    const debounceTimer = setTimeout(() => {
      performGlobalSearch();
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-4 w-4 text-black dark:text-white" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-zinc-500" />;
    }
  };

  const handleResultClick = (route: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(route);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
      {/* Page Title & Hamburger */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuOpen}
          className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 lg:hidden"
        >
          <Menu className="h-5 w-5 text-zinc-650 dark:text-zinc-300" />
        </button>
        <h1 className="text-sm font-extrabold text-black dark:text-white tracking-tight uppercase">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-3">
        {/* Global Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition-colors"
          aria-label="Search Workspace"
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition-colors"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-black dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white transition-colors"
          >
            {unreadCount > 0 ? (
              <>
                <BellRing className="h-4.5 w-4.5 text-black dark:text-white" />
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-extrabold text-white ring-2 ring-white dark:bg-white dark:text-black dark:ring-black">
                  {unreadCount}
                </span>
              </>
            ) : (
              <Bell className="h-4.5 w-4.5" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsNotifOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 z-40 w-80 rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-black hover:underline dark:text-white"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Bell className="h-6 w-6 text-zinc-300 dark:text-zinc-700 mb-2" />
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            'p-4 flex gap-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/30 cursor-pointer',
                            !n.is_read && 'bg-zinc-50/50 dark:bg-zinc-900/20'
                          )}
                          onClick={async () => {
                            if (!n.is_read) {
                              await markAsRead(n.id);
                            }
                          }}
                        >
                          <div className="mt-0.5 shrink-0 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-lg h-7 w-7 flex items-center justify-center">
                            {getNotifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-semibold leading-normal break-words">
                              {n.message}
                            </p>
                            <span className="text-[9px] font-mono text-zinc-450 dark:text-zinc-500 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {!n.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-black dark:bg-white shrink-0 mt-2.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800 sm:block" />

        {/* User Badge */}
        {user && (
          <div className="hidden items-center space-x-2 sm:flex">
            <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-400 max-w-[150px] truncate">
              {teamName}
            </span>
          </div>
        )}
      </div>

      {/* Global Search Popover Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/45 backdrop-blur-xs">
            <div className="fixed inset-0" onClick={() => setIsSearchOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                <Search className="h-5 w-5 text-zinc-450 shrink-0 mr-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query clients, leads, projects, invoices..."
                  className="flex-1 bg-transparent border-0 outline-none text-sm text-zinc-900 dark:text-zinc-50 placeholder-zinc-450 focus:ring-0"
                  autoFocus
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {searchQuery.trim() === '' ? (
                  <div className="py-8 text-center text-zinc-450">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2">Search Shortcuts</p>
                    <p className="text-[10px] text-zinc-400">Type a keyword to scan client registries and invoices.</p>
                  </div>
                ) : (
                  <>
                    {searchResults.leads.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-indigo-500" /> Leads
                        </span>
                        <div className="space-y-1">
                          {searchResults.leads.map((l) => (
                            <div
                              key={l.id}
                              onClick={() => handleResultClick('/leads')}
                              className="group flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/40"
                            >
                              <div>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{l.full_name}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">{l.business_name || 'Individual'}</p>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.clients.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
                        <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-emerald-500" /> Clients
                        </span>
                        <div className="space-y-1">
                          {searchResults.clients.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => handleResultClick(`/clients`)}
                              className="group flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/40"
                            >
                              <div>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{c.name}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">{c.business_name || 'Acme'}</p>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.projects.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
                        <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-amber-500" /> Projects
                        </span>
                        <div className="space-y-1">
                          {searchResults.projects.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleResultClick(`/projects`)}
                              className="group flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/40"
                            >
                              <div>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{p.name}</p>
                                <p className="text-[10px] text-zinc-450 mt-0.5">Budget: ₹{p.budget?.toLocaleString()}</p>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.invoices.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
                        <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-red-500" /> Invoices
                        </span>
                        <div className="space-y-1">
                          {searchResults.invoices.map((i) => (
                            <div
                              key={i.id}
                              onClick={() => handleResultClick('/invoices')}
                              className="group flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/40"
                            >
                              <div>
                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{i.invoice_number}</p>
                                <p className="text-[10px] text-zinc-450 mt-0.5">Amount: ₹{i.amount?.toLocaleString()} ({i.status})</p>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.leads.length === 0 &&
                      searchResults.clients.length === 0 &&
                      searchResults.projects.length === 0 &&
                      searchResults.invoices.length === 0 && (
                        <div className="py-8 text-center text-zinc-400 text-xs">
                          No matching records found. Try another query keyword.
                        </div>
                      )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
