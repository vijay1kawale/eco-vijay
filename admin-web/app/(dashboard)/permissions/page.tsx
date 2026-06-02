'use client';
import React from 'react';
import { ShieldCheck, ShieldAlert, UserCheck, Users } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';

const roleDefinitions = [
  { role: 'admin', title: 'Administrator', description: 'Full access to all admin features and configuration.' },
  { role: 'manager', title: 'Manager', description: 'Manage teams, view reports, and approve key records.' },
  { role: 'office_user', title: 'Office User', description: 'Access office-level data and support field operations.' },
  { role: 'agent', title: 'Agent', description: 'Handle leads, quotations, and daily activities in the field.' },
  { role: 'field_agent', title: 'Field Agent', description: 'Record visits, attendance, and on-site work updates.' },
];

export default function PermissionsPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Permissions"
        description="Review the built-in role permissions and expected capabilities for each admin user role."
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm text-text-secondary">
            <ShieldCheck size={16} /> Role matrix
          </div>
        }
      />

      <div className="grid gap-6">
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Permissions overview</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Use this page to confirm the role capabilities assigned to your admin users. Each role is intended to limit access to the minimum necessary functions for that team member.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border p-4 bg-background">
              <div className="flex items-center gap-2 text-text-primary font-semibold mb-3">
                <Users size={16} /> Roles
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                {roleDefinitions.map((role) => (
                  <li key={role.role} className="rounded-2xl border border-border bg-surface p-3">
                    <div className="font-medium text-text-primary">{role.title}</div>
                    <div>{role.description}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-border p-4 bg-background">
              <div className="flex items-center gap-2 text-text-primary font-semibold mb-3">
                <UserCheck size={16} /> Role details
              </div>
              <p className="text-sm text-text-secondary">
                Admin user permissions are managed through user records and role assignments. When you create or edit users in the Users page, assign the correct role and office information to enforce the intended access level.
              </p>
              <ul className="mt-4 space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-brand-primary" />
                  Role assignments control dashboard access and record permissions.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-brand-primary" />
                  Office metadata is used for office-level users and geographic assignment.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-brand-primary" />
                  Only admin accounts may access this section and manage permissions.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card p-6 overflow-x-auto">
          <h3 className="text-base font-semibold text-text-primary mb-4">Role permissions matrix</h3>
          <table className="min-w-full text-sm text-left text-text-secondary border-separate border-spacing-y-3">
            <thead>
              <tr className="text-xs uppercase tracking-[0.12em] text-text-secondary">
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Dashboard</th>
                <th className="pb-3 pr-4">Users</th>
                <th className="pb-3 pr-4">Visits</th>
                <th className="pb-3 pr-4">Reports</th>
              </tr>
            </thead>
            <tbody>
              {roleDefinitions.map((role) => (
                <tr key={role.role} className="border-t border-border py-3 last:border-b">
                  <td className="py-4 pr-4 font-medium text-text-primary">{role.title}</td>
                  <td className="py-4 pr-4">{role.role === 'admin' ? 'Full' : 'Yes'}</td>
                  <td className="py-4 pr-4">{role.role === 'field_agent' ? 'No' : 'Yes'}</td>
                  <td className="py-4 pr-4">{['agent', 'field_agent'].includes(role.role) ? 'Yes' : 'No'}</td>
                  <td className="py-4 pr-4">{role.role === 'admin' || role.role === 'manager' ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
