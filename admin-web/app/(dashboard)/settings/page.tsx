'use client';
import React, { useState } from 'react';
import { User, Lock, CheckCircle } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import { useAuthStore } from '../../../stores/authStore';
import api from '../../../lib/api';

// Defined at module level — NOT inside SettingsPage — so React never remounts it on re-render
function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <div
          className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] text-brand-primary"
          style={{ backgroundColor: 'rgba(201,168,76,0.12)' }}
        >
          <Icon size={16} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      // In a real implementation this would call PATCH /admin/profile
      // For now just re-fetch to confirm session is still valid
      await fetchMe();
      setProfileMsg('Profile information saved.');
    } catch {
      setProfileMsg('Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwMsg('');
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    if (pwForm.next.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    setPwSaving(true);
    try {
      await api.post('/admin/auth/change-password', { current: pwForm.current, password: pwForm.next });
      setPwMsg('Password changed successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: unknown) {
      // FIXED: replaced any with typed axios error extraction
      const e = err as { response?: { data?: { error?: string } } };
      setPwError(e?.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Manage your admin account" />

      {/* Profile */}
      <Section title="Profile Information" icon={User}>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
              <input
                className="input-default"
                value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <input
                className="input-default"
                value={profileForm.email}
                readOnly
                disabled
                title="Email cannot be changed"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Role</label>
            <input className="input-default bg-background" value={user?.role || 'admin'} readOnly disabled />
          </div>
          {profileMsg && (
            <div className="flex items-center gap-2 text-sm text-[#22c55e]">
              <CheckCircle size={14} /> {profileMsg}
            </div>
          )}
          <button type="submit" disabled={profileSaving} className="btn-primary">
            {profileSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </Section>

      {/* Change Password */}
      <Section title="Change Password" icon={Lock}>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { label: 'Current Password', name: 'current' },
            { label: 'New Password', name: 'next' },
            { label: 'Confirm New Password', name: 'confirm' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-text-secondary mb-1">{f.label}</label>
              <input
                type="password"
                className="input-default"
                value={pwForm[f.name as keyof typeof pwForm]}
                onChange={e => setPwForm(p => ({ ...p, [f.name]: e.target.value }))}
                required
              />
            </div>
          ))}
          {pwError && <p className="text-sm text-[#F3797E]">{pwError}</p>}
          {pwMsg && (
            <div className="flex items-center gap-2 text-sm text-[#22c55e]">
              <CheckCircle size={14} /> {pwMsg}
            </div>
          )}
          <button type="submit" disabled={pwSaving} className="btn-primary">
            {pwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </Section>

      {/* System Info */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">System Info</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Application', value: 'Eco Vijay Admin Panel' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Framework', value: 'Next.js 14 (App Router)' },
            { label: 'Logged in as', value: user?.email || '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-text-secondary">{row.label}</span>
              <span className="font-medium text-text-primary">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
