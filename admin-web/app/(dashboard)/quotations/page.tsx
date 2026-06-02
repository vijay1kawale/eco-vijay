'use client';
import React, { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getQuotations } from '../../../lib/adminApi';
import { exportToExcel } from '../../../lib/export';
import { format } from 'date-fns';

type Quotation = {
  id: string;
  company_name: string;
  agent_name: string;
  service_type: string;
  price: number;
  sent_via: string[];
  status: string;
  sent_at: string;
};

const SERVICE_TYPES = [
  'Plastic EPR Registration',
  'E-Waste EPR Registration',
  'Battery EPR Compliance',
  'Tyre EPR Registration',
];

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');

  useEffect(() => {
    getQuotations()
      .then(r => setQuotations(r.data))
      .catch(() => setPageError('Failed to load quotations. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = quotations.filter(q => {
    const s = search.toLowerCase();
    const matchSearch = !search || q.company_name.toLowerCase().includes(s) || q.agent_name.toLowerCase().includes(s);
    const matchService = !serviceFilter || q.service_type === serviceFilter;
    return matchSearch && matchService;
  });

  const totalRevenue = filtered.reduce((s, q) => s + (q.price || 0), 0);

  const handleExport = () => {
    const rows = filtered.map(q => ({
      Company: q.company_name,
      Agent: q.agent_name,
      Service: q.service_type,
      'Amount (₹)': q.price,
      'Sent Via': (q.sent_via || []).join(', '),
      Status: q.status,
      Date: format(new Date(q.sent_at), 'dd MMM yyyy'),
    }));
    exportToExcel(rows, `quotations_${format(new Date(), 'yyyyMMdd')}`, 'Quotations');
  };

  const col = createColumnHelper<Quotation>();
  const columns: any[] = [
    col.accessor('company_name', {
      header: 'Company',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    col.accessor('agent_name', { header: 'Agent' }),
    col.accessor('service_type', {
      header: 'Service',
      cell: info => <span className="max-w-[180px] truncate block">{info.getValue()}</span>,
    }),
    col.accessor('price', {
      header: 'Amount',
      cell: info => <span className="font-semibold text-brand-primary">₹{info.getValue().toLocaleString('en-IN')}</span>,
    }),
    col.accessor('sent_via', {
      header: 'Sent Via',
      cell: info => (
        <div className="flex gap-1 flex-wrap">
          {(info.getValue() || []).map(v => (
            <Badge key={v} label={v} variant="neutral" />
          ))}
        </div>
      ),
    }),
    col.accessor('sent_at', {
      header: 'Date',
      cell: info => format(new Date(info.getValue()), 'dd MMM yyyy'),
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="All quotations sent by agents"
        action={
          <button onClick={handleExport} className="btn-secondary gap-1.5">
            <Download size={14} /> Export Excel
          </button>
        }
      />

      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-xs text-text-secondary mb-1">Total Quotations</div>
          <div className="text-2xl font-bold text-text-primary">{filtered.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text-secondary mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-brand-primary">₹{totalRevenue.toLocaleString('en-IN')}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-text-secondary mb-1">Avg. Value</div>
          <div className="text-2xl font-bold text-text-primary">
            ₹{filtered.length ? Math.round(totalRevenue / filtered.length).toLocaleString('en-IN') : 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex items-center min-w-48 max-w-xs">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary" />
          <input
            className="input-default !pl-9"
            placeholder="Search company or agent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-default !w-auto" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
          <option value="">All services</option>
          {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
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
