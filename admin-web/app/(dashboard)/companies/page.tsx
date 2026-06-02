'use client';
import React, { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getCompanies } from '../../../lib/adminApi';
import { exportToExcel } from '../../../lib/export';

type Company = {
  id: string;
  name: string;
  mobile: string;
  pibo: string;
  city: string;
  state: string;
  pincode: string;
  industry: string;
  company_type: string;
  company_status: string;
  lead_status: string;
  gst: string;
};

const statusVariant = (s: string): 'success' | 'neutral' =>
  s?.toLowerCase() === 'active' ? 'success' : 'neutral';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    getCompanies()
      .then(r => setCompanies(r.data))
      .catch(() => setPageError('Failed to load companies. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const cities = Array.from(new Set(companies.map(c => c.city).filter(Boolean))).sort();
  const types = Array.from(new Set(companies.map(c => c.company_type).filter(Boolean))).sort();

  const filtered = companies.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search || c.name.toLowerCase().includes(s) || (c.pibo || '').toLowerCase().includes(s);
    const matchType = !typeFilter || c.company_type === typeFilter;
    const matchCity = !cityFilter || c.city === cityFilter;
    return matchSearch && matchType && matchCity;
  });

  const handleExport = () => {
    exportToExcel(
      filtered.map(c => ({
        Name: c.name, Contact: c.pibo, Mobile: c.mobile,
        City: c.city, State: c.state, Industry: c.industry,
        Type: c.company_type, Status: c.company_status,
        'Lead Status': c.lead_status, GST: c.gst,
      })),
      'companies', 'Companies'
    );
  };

  const col = createColumnHelper<Company>();
  const columns: any[] = [
    col.accessor('name', {
      header: 'Company',
      cell: info => (
        <div>
          <div className="font-medium">{info.getValue()}</div>
          <div className="text-xs text-text-secondary">{info.row.original.gst}</div>
        </div>
      ),
    }),
    col.accessor('pibo', { header: 'Contact' }),
    col.accessor('city', {
      header: 'Location',
      cell: info => `${info.getValue()}, ${info.row.original.state}`,
    }),
    col.accessor('industry', {
      header: 'Industry',
      cell: info => <Badge label={info.getValue() || '—'} variant="neutral" />,
    }),
    col.accessor('company_type', {
      header: 'Type',
      cell: info => <Badge label={info.getValue() || '—'} variant="info" />,
    }),
    col.accessor('company_status', {
      header: 'Status',
      cell: info => <Badge label={info.getValue() || 'Active'} variant={statusVariant(info.getValue())} />,
    }),
    col.accessor('lead_status', {
      header: 'Lead',
      cell: info => {
        const s = info.getValue();
        // FIXED: replaced any with explicit variant union type
        const v: Record<string, 'info' | 'warning' | 'purple' | 'success' | 'danger'> = { New: 'info', Contacted: 'warning', Interested: 'purple', Converted: 'success', Lost: 'danger' };
        return <Badge label={s || 'New'} variant={v[s] ?? 'neutral'} />;
      },
    }),
    col.accessor('mobile', { header: 'Mobile' }),
  ];

  return (
    <div>
      <PageHeader
        title="Companies"
        description={`${filtered.length} companies in database`}
        action={
          <button onClick={handleExport} className="btn-secondary gap-1.5">
            <Download size={14} /> Export Excel
          </button>
        }
      />

      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

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
        <select className="input-default !w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input-default !w-auto" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
          <option value="">All cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
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
