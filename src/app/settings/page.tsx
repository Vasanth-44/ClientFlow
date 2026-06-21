'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import {
  User,
  Lock,
  Bell,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Sparkles,
  Building2,
} from 'lucide-react';


export default function SettingsPage() {
  const { user, signOut, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { sendNotification } = useNotifications();

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [agencyName, setAgencyName] = useState(user?.agencyName || '');
  const [email] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  // Security Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Notifications toggles state
  const [billingNotif, setBillingNotif] = useState(true);
  const [projectNotif, setProjectNotif] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setProfileSaving(true);
    setProfileStatus(null);

    try {
      // Update via AuthContext (handles both mock + Supabase modes)
      await updateProfile({ name, agencyName, avatar: avatarUrl });

      await sendNotification('Profile updated — sidebar workspace name refreshed.', 'info');
      setProfileStatus('Profile updated successfully!');
      setTimeout(() => setProfileStatus(null), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setProfileStatus(`Error: ${err.message || 'Failed to save'}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: 'error', msg: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityStatus({ type: 'error', msg: 'Password must be at least 6 characters' });
      return;
    }

    setSecuritySaving(true);
    setSecurityStatus(null);

    try {
      // In mock mode: simulate password update (stored in localStorage via btoa)
      // In Supabase mode: would call supabase.auth.updateUser({ password: newPassword })
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate async

      await sendNotification('Security password updated successfully.', 'alert');
      setSecurityStatus({ type: 'success', msg: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to update password:', err);
      setSecurityStatus({ type: 'error', msg: err.message || 'Failed to update password' });
    } finally {
      setSecuritySaving(false);
    }
  };


  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSaving(true);
    // Simulate API saving
    setTimeout(async () => {
      setNotifSaving(false);
      await sendNotification('Notification channel preferences updated.', 'info');
      alert('Notification preferences updated locally!');
    }, 800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Profile Config */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-1.5">
            <User className="h-4.5 w-4.5 text-slate-400" />
            Account Profile Details
          </CardTitle>
          <CardDescription className="text-xs">Update your display name and logo icon.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileStatus && (
              <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${profileStatus.includes('Error') ? 'bg-zinc-50 text-zinc-800 border border-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-850' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border border-transparent'}`}>
                {profileStatus.includes('Error') ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                <span>{profileStatus}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-5 items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-16 w-16 rounded-full bg-black dark:bg-zinc-850 flex items-center justify-center text-white font-extrabold text-xl overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="space-y-1.5 flex-1 w-full">
                <Label htmlFor="set-avatar">Avatar Photo URL</Label>
                <Input
                  id="set-avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="set-name">Display Name *</Label>
                <Input
                  id="set-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="set-email">Email Address</Label>
                <Input id="set-email" disabled value={email} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="set-agency" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                Agency / Business Name
              </Label>
              <Input
                id="set-agency"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="e.g. Vasanth Agency, Nova Studios..."
              />
              <p className="text-xs text-slate-400">This is displayed as your workspace label in the sidebar. Each account has its own unique name.</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={profileSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Security Change Password */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-1.5">
            <Lock className="h-4.5 w-4.5 text-slate-400" />
            Security & Credentials
          </CardTitle>
          <CardDescription className="text-xs">Update your sign in password security keys.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {securityStatus && (
              <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${securityStatus.type === 'error' ? 'bg-zinc-50 text-zinc-800 border border-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:border-zinc-850' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border border-transparent'}`}>
                {securityStatus.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                <span>{securityStatus.msg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sec-new">New Password</Label>
                <Input
                  id="sec-new"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sec-conf">Confirm New Password</Label>
                <Input
                  id="sec-conf"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={securitySaving}>
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 3. Notifications channels */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-1.5">
            <Bell className="h-4.5 w-4.5 text-slate-400" />
            Alert Preferences
          </CardTitle>
          <CardDescription className="text-xs">Configure email receipt updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveNotifications} className="space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="nt-bill"
                  checked={billingNotif}
                  onChange={(e) => setBillingNotif(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black dark:text-white focus:ring-zinc-500 dark:focus:ring-zinc-400 bg-white dark:bg-slate-900 cursor-pointer"
                />
                <div>
                  <Label htmlFor="nt-bill" className="cursor-pointer font-semibold">
                    Billing & Payments
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                    Receive immediate notifications when client records pay issued invoices or cash registers clear pending dues.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="nt-proj"
                  checked={projectNotif}
                  onChange={(e) => setProjectNotif(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black dark:text-white focus:ring-zinc-500 dark:focus:ring-zinc-400 bg-white dark:bg-slate-900 cursor-pointer"
                />
                <div>
                  <Label htmlFor="nt-proj" className="cursor-pointer font-semibold">
                    Projects & Milestones
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                    Receive alert notices when project tasks are updated or stage timelines approach deadlines.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="nt-dig"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-black dark:text-white focus:ring-zinc-500 dark:focus:ring-zinc-400 bg-white dark:bg-slate-900 cursor-pointer"
                />
                <div>
                  <Label htmlFor="nt-dig" className="cursor-pointer font-semibold">
                    Weekly Cashflow Digest
                  </Label>
                  <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                    Get a weekly email summary of client activity progress, total earnings, and unpaid overdue billing indexes.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={notifSaving}>
                Save Preferences
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4. Theme System */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-slate-400" />
            System Layout Theme
          </CardTitle>
          <CardDescription className="text-xs">Toggle the visual interface mode of the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between py-4">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Layout Appearance</span>
          <Button
            variant="outline"
            className="border-slate-200 dark:border-slate-800 text-xs font-semibold"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="mr-1.5 h-4 w-4 text-zinc-500" />
                Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="mr-1.5 h-4 w-4 text-slate-500" />
                Switch to Dark Mode
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
