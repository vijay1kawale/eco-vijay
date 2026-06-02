'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Download, Search, Upload, FileDown } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getUsers, createUser, updateUser, deleteUser, logActivity } from '../../../lib/adminApi';
import { exportToExcel } from '../../../lib/export';
import { format } from 'date-fns';

// Defined at module level — NOT inside UsersPage — so React never remounts it on re-render
function Field({ label, type = 'text', value, onChange }: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        className="input-default"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  office_id?: string | null;
  assigned_office_lat?: number | null;
  assigned_office_lng?: number | null;
};

const EMPTY_FORM = { name: '', email: '', phone: '', role: 'field_agent', is_active: true, password: '', office_id: '', assigned_office_lat: '', assigned_office_lng: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await getUsers({ search, role: roleFilter, status: statusFilter });
      setUsers(res.data);
    } catch {
      setPageError('Failed to load users. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setFormError(''); setShowCreate(true); };
  const openEdit = (u: User) => {
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      is_active: u.is_active,
      password: '',
      office_id: u.office_id || '',
      assigned_office_lat: u.assigned_office_lat?.toString() || '',
      assigned_office_lng: u.assigned_office_lng?.toString() || '',
    });
    setFormError('');
    setEditUser(u);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role) { setFormError('Name, email and role are required.'); return; }
    if (!editUser && !form.password) { setFormError('Password is required for new users.'); return; }
    setSaving(true); setFormError('');
    try {
        if (editUser) {
          await updateUser(editUser.id, { name: form.name, email: form.email, phone: form.phone, role: form.role, office_id: form.office_id || undefined, assigned_office_lat: form.assigned_office_lat ? parseFloat(form.assigned_office_lat) : undefined, assigned_office_lng: form.assigned_office_lng ? parseFloat(form.assigned_office_lng) : undefined });
        logActivity({ action: 'update_user', resource_type: 'users', resource_id: editUser.id, details: { name: form.name } }).catch(() => {});
      } else {
          const created = await createUser({ name: form.name, email: form.email, phone: form.phone, role: form.role, password: form.password, office_id: form.office_id || undefined, assigned_office_lat: form.assigned_office_lat ? parseFloat(form.assigned_office_lat) : undefined, assigned_office_lng: form.assigned_office_lng ? parseFloat(form.assigned_office_lng) : undefined });
        logActivity({ action: 'create_user', resource_type: 'users', resource_id: created.data?.id, details: { name: form.name, email: form.email, role: form.role } }).catch(() => {});
      }
      setShowCreate(false); setEditUser(null);
      load();
    } catch (err: unknown) {
      // FIXED: replaced any with typed axios error extraction
      const e = err as { response?: { data?: { error?: string } } };
      setFormError(e?.response?.data?.error || 'Save failed. Please try again.');
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (u: User) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      logActivity({ action: u.is_active ? 'deactivate_user' : 'activate_user', resource_type: 'users', resource_id: u.id, details: { name: u.name } }).catch(() => {});
      load();
    } catch { /* silently ignore */ }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteUser(confirmDelete.id);
      logActivity({ action: 'delete_user', resource_type: 'users', resource_id: confirmDelete.id, details: { name: confirmDelete.name } }).catch(() => {});
      load();
    } catch { /* silently ignore */ }
    finally { setConfirmDelete(null); }
  };

  const handleExport = () => {
    logActivity({ action: 'export_report', resource_type: 'users', details: { format: 'xlsx' } }).catch(() => {});
    exportToExcel(
      users.map(u => ({
        Name: u.name, Email: u.email, Phone: u.phone, Role: u.role,
        Status: u.is_active ? 'Active' : 'Inactive',
        'Last Login': u.last_login ? format(new Date(u.last_login), 'dd MMM yyyy HH:mm') : 'Never',
        Joined: format(new Date(u.created_at), 'dd MMM yyyy'),
      })),
      `users_${format(new Date(), 'yyyyMMdd')}`,
      'Users'
    );
  };

  const handleDownloadTemplate = () => {
    exportToExcel(
      [{ Name: 'Rahul Sharma', Email: 'rahul@example.com', Phone: '9876543210', Role: 'agent', Password: 'Welcome@123' }],
      'user_import_template',
      'Users'
    );
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportLoading(true);
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      let ok = 0, fail = 0;
      for (const row of rows) {
        const name = row.Name || row.name || '';
        const email = row.Email || row.email || '';
        const phone = row.Phone || row.phone || '';
        const role = row.Role || row.role || 'agent';
        const password = row.Password || row.password || 'EcoVijay@123';
        if (!name || !email) { fail++; continue; }
        try {
          await createUser({ name, email, phone, role, password });
          ok++;
        } catch { fail++; }
      }

      logActivity({ action: 'import_users', resource_type: 'users', details: { imported: ok, failed: fail } }).catch(() => {});
      setImportResult(`Imported ${ok} user${ok !== 1 ? 's' : ''}${fail > 0 ? `, ${fail} skipped` : ''}.`);
      load();
    } catch (err) {
      setImportResult('Failed to parse file. Please use the template format.');
    } finally { setImportLoading(false); }
  };

  const col = createColumnHelper<User>();
  const columns: any[] = [
    col.accessor('name', {
      header: 'Name',
      cell: info => (
        <div>
          <div className="font-medium text-text-primary">{info.getValue()}</div>
          <div className="text-xs text-text-secondary">{info.row.original.email}</div>
        </div>
      ),
    }),
    col.accessor('phone', {
      header: 'Phone',
      cell: info => info.getValue() || <span className="text-text-secondary">—</span>,
    }),
    col.accessor('role', {
      header: 'Role',
      cell: info => <Badge label={info.getValue()} variant={info.getValue() === 'admin' ? 'purple' : 'info'} />,
    }),
    col.accessor('is_active', {
      header: 'Status',
      cell: info => <Badge label={info.getValue() ? 'Active' : 'Inactive'} variant={info.getValue() ? 'success' : 'neutral'} />,
    }),
    col.accessor('last_login', {
      header: 'Last Login',
      cell: info => info.getValue()
        ? format(new Date(info.getValue()!), 'dd MMM yy, HH:mm')
        : <span className="text-text-secondary text-xs">Never</span>,
    }),
    col.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {/* FIXED: replaced light hover backgrounds (bg-[#EEF2FF], bg-yellow-50, bg-green-50, bg-red-50)
               with dark-compatible bg-navy-700 + bright text colors for dark navy theme */}
          <button
            onClick={() => openEdit(row.original)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-text-secondary hover:bg-navy-700 hover:text-brand-primary transition"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleToggleStatus(row.original)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] transition ${
              row.original.is_active
                ? 'text-text-secondary hover:bg-navy-700 hover:text-[#f59e0b]'
                : 'text-text-secondary hover:bg-navy-700 hover:text-[#22c55e]'
            }`}
            title={row.original.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.original.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
          <button
            onClick={() => setConfirmDelete(row.original)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-text-secondary hover:bg-navy-700 hover:text-[#ef4444] transition"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage agents and admin accounts"
        action={
          <>
            <button onClick={handleDownloadTemplate} className="btn-secondary gap-1.5 text-xs">
              <FileDown size={13} /> Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              className="btn-secondary gap-1.5 text-xs"
            >
              <Upload size={13} /> {importLoading ? 'Importing…' : 'Import CSV'}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
            <button onClick={handleExport} className="btn-secondary gap-1.5">
              <Download size={14} /> Export
            </button>
            <button onClick={openCreate} className="btn-primary gap-1.5">
              <Plus size={14} /> Add User
            </button>
          </>
        }
      />

      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}
      {importResult && (
        // FIXED: replaced bg-green-50/border-green-200/text-green-700 (light colors) with dark-compatible rgba green
        <div
          className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-sm mb-5"
          style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
        >
          {importResult}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex items-center flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary" />
          <input
            className="input-default !pl-9"
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-default !w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
        </select>
        <select className="input-default !w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <DataTable data={users} columns={columns} />
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showCreate || !!editUser}
        onClose={() => { setShowCreate(false); setEditUser(null); }}
        title={editUser ? 'Edit User' : 'Add New User'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
            <Field label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Role</label>
            <select className="input-default" value={form.role} onChange={e => {
              const newRole = e.target.value;
              const updates: any = { role: newRole };
              if (newRole === 'office_user') {
                updates.assigned_office_lat = '18.6298';
                updates.assigned_office_lng = '73.7997';
              }
              setForm(f => ({ ...f, ...updates }));
            }}>
              <option value="field_agent">Field Agent</option>
              <option value="agent">Agent</option>
              <option value="office_user">Office User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Office ID (optional)" value={form.office_id} onChange={v => setForm(f => ({ ...f, office_id: v }))} />
            <Field label="Office Lat" value={form.assigned_office_lat} onChange={v => setForm(f => ({ ...f, assigned_office_lat: v }))} />
            <Field label="Office Lng" value={form.assigned_office_lng} onChange={v => setForm(f => ({ ...f, assigned_office_lng: v }))} />
          </div>
          {!editUser && <Field label="Password" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />}
          {formError && <p className="text-sm text-[#F3797E]">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowCreate(false); setEditUser(null); }} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete User" maxWidth="max-w-sm">
        <p className="text-text-secondary text-sm mb-5">
          Delete <strong className="text-text-primary">{confirmDelete?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
