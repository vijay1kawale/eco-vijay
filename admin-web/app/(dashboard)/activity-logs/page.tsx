'use client';
import React, { useEffect, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getActivityLogs } from '../../../lib/adminApi';
import { format, formatDistanceToNow } from 'date-fns';

// FIXED: removed any types — use explicit union types for details values and badge variants
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'gold';

type Log = {
  id: string;
  admin_name: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, string | number | boolean | null> | null;
  created_at: string;
};

const ACTION_VARIANT: Record<string, BadgeVariant> = {
  login:           'success',
  logout:          'neutral',
  create_user:     'purple',
  update_user:     'info',
  delete_user:     'danger',
  deactivate_user: 'warning',
  activate_user:   'warning',
  export_report:   'info',
  view_dashboard:  'neutral',
  view_users:      'neutral',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getActivityLogs()
      .then(r => setLogs(r.data))
      .catch(() => setPageError('Failed to load activity logs. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !search || l.action.toLowerCase().includes(search.toLowerCase()) || l.admin_name.toLowerCase().includes(search.toLowerCase())
  );

  const col = createColumnHelper<Log>();
  const columns: any[] = [
    col.accessor('created_at', {
      header: 'Time',
      cell: info => (
        <div>
          <div className="text-text-primary text-xs">{format(new Date(info.getValue()), 'dd MMM yy, HH:mm')}</div>
          <div className="text-text-secondary text-xs">{formatDistanceToNow(new Date(info.getValue()), { addSuffix: true })}</div>
        </div>
      ),
    }),
    col.accessor('admin_name', {
      header: 'Admin',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    col.accessor('action', {
      header: 'Action',
      cell: info => (
        <Badge
          label={info.getValue().replace(/_/g, ' ')}
          variant={ACTION_VARIANT[info.getValue()] ?? 'neutral'}
        />
      ),
    }),
    col.accessor('resource_type' as const, {
      header: 'Resource',
      cell: info => <span className="capitalize text-text-secondary">{info.getValue() ?? '—'}</span>,
    }),
    col.display({
      id: 'details',
      header: 'Details',
      cell: info => {
        const d = info.row.original.details;
        if (!d) return <span className="text-text-secondary">—</span>;
        return (
          <span className="text-xs text-text-secondary truncate max-w-[200px] block">
            {Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ')}
          </span>
        );
      },
    }),
  ];

  return (
    <div>
      <PageHeader title="Activity Logs" description="Admin action audit trail" />

      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex items-center min-w-48 max-w-xs">
          <Search className="absolute left-3 h-4 w-4 text-text-secondary" />
          <input
            className="input-default !pl-9"
            placeholder="Search action or admin..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
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
