'use client';
import React, { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getCompanies, updateCompany, logActivity } from '../../../lib/adminApi';

type Company = {
  id: string;
  name: string;
  city: string;
  state: string;
  industry: string;
  company_type: string;
  lead_status: string;
  mobile: string;
  pibo: string;
};

const LEAD_STATUSES = ['New', 'Contacted', 'Interested', 'Converted', 'Lost'];

// FIXED: replaced any with explicit variant union type
const leadVariant = (s: string): 'info' | 'warning' | 'purple' | 'success' | 'danger' | 'neutral' => {
  const map: Record<string, 'info' | 'warning' | 'purple' | 'success' | 'danger'> = { New: 'info', Contacted: 'warning', Interested: 'purple', Converted: 'success', Lost: 'danger' };
  return map[s] ?? 'neutral';
};

export default function LeadsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setPageError(null);
    getCompanies()
      .then(r => setCompanies(r.data))
      .catch(() => setPageError('Failed to load leads. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string, companyName: string) => {
    setUpdatingId(id);
    try {
      await updateCompany(id, { lead_status: newStatus });
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, lead_status: newStatus } : c));
      logActivity({ action: 'update_lead_status', resource_type: 'companies', resource_id: id, details: { name: companyName, lead_status: newStatus } }).catch(() => {});
    } catch {
      setPageError('Failed to update lead status. Please try again.');
    } finally { setUpdatingId(null); }
  };

  const col = createColumnHelper<Company>();
  const columns: any[] = [
    col.accessor('name', {
      header: 'Company',
      cell: info => (
        <div>
          <div className="font-medium">{info.getValue()}</div>
          <div className="text-xs text-text-secondary">{info.row.original.industry}</div>
        </div>
      ),
    }),
    col.accessor('pibo', {
      header: 'Contact',
      cell: info => info.getValue() || <span className="text-text-secondary">—</span>,
    }),
    col.accessor('city', {
      header: 'Location',
      cell: info => `${info.getValue()}, ${info.row.original.state}`,
    }),
    col.accessor('company_type', {
      header: 'Type',
      cell: info => <Badge label={info.getValue() || '—'} variant="neutral" />,
    }),
    col.accessor('lead_status', {
      header: 'Current Status',
      cell: info => <Badge label={info.getValue() || 'New'} variant={leadVariant(info.getValue())} />,
    }),
    col.display({
      id: 'update_status',
      header: 'Update Status',
      cell: ({ row }) => (
        <select
          value={row.original.lead_status || 'New'}
          disabled={updatingId === row.original.id}
          onChange={e => handleUpdateStatus(row.original.id, e.target.value, row.original.name)}
          className="input-default !py-1.5 !text-xs !w-36"
          onClick={e => e.stopPropagation()}
        >
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    }),
    col.accessor('mobile', {
      header: 'Mobile',
      cell: info => info.getValue() || <span className="text-text-secondary">—</span>,
    }),
  ];

  // Summary counts
  const counts = LEAD_STATUSES.reduce((acc, s) => {
    acc[s] = companies.filter(c => (c.lead_status || 'New') === s).length;
    return acc;
  }, {} as Record<string, number>);

  const filtered = companies.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(s) || (c.pibo || '').toLowerCase().includes(s);
    const matchStatus = !statusFilter || (c.lead_status || 'New') === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_COLORS: Record<string, string> = {
    New: 'border-l-blue-400', Contacted: 'border-l-yellow-400',
    Interested: 'border-l-brand-primary', Converted: 'border-l-green-500', Lost: 'border-l-red-400',
  };

  return (
    <div>
      <PageHeader title="Leads" description="Company lead pipeline — update status inline" />

      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      {/* Kanban summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {LEAD_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`card p-4 text-left transition border-l-4 ${STATUS_COLORS[s]} ${statusFilter === s ? 'ring-2 ring-brand-primary' : 'hover:bg-navy-700'}`}
          >
            <div className="text-xs font-semibold text-text-secondary mb-1.5">{s}</div>
            <div className="text-2xl font-bold text-text-primary">{counts[s] ?? 0}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex items-center min-w-48 max-w-xs">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary" />
          <input
            className="input-default !pl-9"
            placeholder="Search company or contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-default !w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="text-xs text-brand-primary hover:underline">
            Clear filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <DataTable data={filtered} columns={columns} />
      )}
    </div>
  );
}
