'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  Mail,
  Trash2,
  Loader2,
  Building,
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Team {
  id: string;
  name: string;
  owner_id: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Rename settings state
  const [renameValue, setRenameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [savingInvite, setSavingInvite] = useState(false);

  const fetchTeamAndMembers = async () => {
    if (!user) return;
    try {
      // 1. Fetch team owned by or linked to user
      let { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      // If no team exists, auto-initialize one
      if (!teamData) {
        const defaultTeam = {
          name: `${user.name || 'My'} Agency`,
          owner_id: user.id,
        };
        const { data: newTeam, error: initErr } = await supabase
          .from('teams')
          .insert(defaultTeam)
          .select()
          .single();

        if (initErr) throw initErr;
        teamData = newTeam;

        // Auto add owner as team member
        if (newTeam) {
          await supabase.from('team_members').insert({
            team_id: newTeam.id,
            name: user.name || 'Owner',
            email: user.email || '',
            role: 'Owner',
            status: 'Active',
          });
        }
      }

      setTeam(teamData);
      setRenameValue(teamData?.name || '');

      if (teamData) {
        // 2. Fetch team members
        const { data: membersData, error: membersErr } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: true });

        if (membersErr) throw membersErr;
        setMembers(membersData || []);
      }
    } catch (err) {
      console.error('Error fetching team configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAndMembers();
  }, [user]);

  const handleRenameTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !renameValue.trim()) return;

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: renameValue })
        .eq('id', team.id);

      if (error) throw error;

      setTeam({ ...team, name: renameValue });
      await sendNotification(`Renamed team to "${renameValue}".`, 'info');
      alert('Agency name updated successfully!');
    } catch (err) {
      console.error('Failed to rename team:', err);
    } finally {
      setSavingName(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !inviteName.trim() || !inviteEmail.trim()) return;

    setSavingInvite(true);
    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: team.id,
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: 'Pending',
      });

      if (error) throw error;

      await sendNotification(`Invited ${inviteName} (${inviteEmail}) to the team.`, 'info');
      setIsInviteModalOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Member');
      fetchTeamAndMembers();
    } catch (err) {
      console.error('Failed to invite member:', err);
    } finally {
      setSavingInvite(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (member.role === 'Owner') {
      alert('Cannot remove the organization owner.');
      return;
    }
    if (!confirm(`Are you sure you want to remove ${member.name} from the agency?`)) return;

    try {
      const { error } = await supabase.from('team_members').delete().eq('id', member.id);
      if (error) throw error;

      await sendNotification(`Removed ${member.name} from the team.`, 'alert');
      fetchTeamAndMembers();
    } catch (err) {
      console.error('Failed to remove team member:', err);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Agency Team Settings</h1>
          <p className="text-xs text-slate-550 font-semibold mt-1">Manage agency profiles, invite collaborators, and setup shared dashboard names.</p>
        </div>
      </div>

      {/* 1. Agency Renaming profile card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <Building className="h-4.5 w-4.5 text-slate-400" />
            Agency Profile Name
          </CardTitle>
          <CardDescription className="text-xs">Setup a global shared team name to display inside greetings dashboards.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRenameTeam} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1.5">
              <Label htmlFor="org-name">Agency Team Name *</Label>
              <Input
                id="org-name"
                required
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="e.g. Pixel Crafters Agency"
                className="text-xs"
              />
            </div>
            <Button type="submit" className="shrink-0 w-full sm:w-auto h-10" isLoading={savingName}>
              Rename Team
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2. Teammates Table registry */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-slate-400" />
              Active Collaborators ({members.length})
            </CardTitle>
            <CardDescription className="text-xs">Teammates with access to agency clients, leads pipeline, and tasks tracking.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-1 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Invite Teammate
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                <TableHead className="font-bold text-xs">Teammate</TableHead>
                <TableHead className="font-bold text-xs">Email</TableHead>
                <TableHead className="font-bold text-xs">Role</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((member, index) => (
                <TableRow key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    {member.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono">
                    {member.email}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Shield className="h-3 w-3 text-slate-400" />
                      {member.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={member.status === 'Active' ? 'success' : 'warning'}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== 'Owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMember(member)}
                        className="h-8 w-8 text-slate-400 hover:text-red-655 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* INVITE TEAMMATE MODAL */}
      <Dialog isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Teammate">
        <form onSubmit={handleInviteMember} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="tm-name">Teammate Full Name *</Label>
            <Input
              id="tm-name"
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tm-email">Email Address *</Label>
            <Input
              id="tm-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="john@agency.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tm-role">Agency Permission Role</Label>
            <Select id="tm-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="Admin">Admin (Full Control)</option>
              <option value="Member">Member (Read & Write)</option>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={savingInvite}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={savingInvite}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
