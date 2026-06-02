'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, FileText, MapPin, Eye } from 'lucide-react';
import { DataTable } from '../../../components/ui/DataTable';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getAttendance, logActivity } from '../../../lib/adminApi';
import { exportToExcel, exportToPDF } from '../../../lib/export';
import { format } from 'date-fns';

type VisitLog = {
  lat: number;
  lng: number;
  visited_at: string;
  note: string | null;
};

type AttendanceRecord = {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: string;
  check_in_lat: number | null;
  check_in_lng: number | null;
  visit_logs: VisitLog[] | null;
};

const statusVariant = (s: string): 'success' | 'warning' | 'neutral' =>
  s === 'present' ? 'success' : s === 'half_day' ? 'warning' : 'neutral';

const fmtTime = (iso: string | null) =>
  iso ? format(new Date(iso), 'HH:mm') : '—';

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [visitModal, setVisitModal] = useState<AttendanceRecord | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenAgo = format(new Date(Date.now() - 6 * 86400000), 'yyyy-MM-dd');
  const [from, setFrom] = useState(sevenAgo);
  const [to, setTo] = useState(today);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await getAttendance({ from, to });
      setRecords(res.data);
    } catch {
      setPageError('Failed to load attendance records. Please try again.');
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleExcelExport = () => {
    logActivity({ action: 'export_report', resource_type: 'attendance', details: { format: 'xlsx', from, to } }).catch(() => {});
    exportToExcel(
      filtered.map(r => ({
        Agent: r.user_name, Date: r.date,
        'Check In': fmtTime(r.check_in), 'Check Out': fmtTime(r.check_out),
        'Hours Worked': r.total_hours?.toFixed(2) ?? '—',
        Status: r.status.replace('_', ' '),
        'Check-in GPS': r.check_in_lat ? `${r.check_in_lat.toFixed(4)}, ${r.check_in_lng?.toFixed(4)}` : '—',
        'Visit Count': (r.visit_logs || []).length,
      })),
      `attendance_${from}_to_${to}`,
      'Attendance'
    );
  };

  const handlePDFExport = async () => {
    logActivity({ action: 'export_report', resource_type: 'attendance', details: { format: 'pdf', from, to } }).catch(() => {});
    await exportToPDF(
      `Attendance Report (${from} – ${to})`,
      ['Agent', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'],
      filtered.map(r => [r.user_name, r.date, fmtTime(r.check_in), fmtTime(r.check_out), r.total_hours?.toFixed(1) ?? '—', r.status.replace('_', ' ')]),
      `attendance_${from}_${to}`
    );
  };

  const filtered = records.filter(r =>
    !search || r.user_name.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = records.filter(r => r.status === 'present').length;
  const halfCount = records.filter(r => r.status === 'half_day').length;
  const hoursArr = records.filter(r => r.total_hours != null);
  const avgHours = hoursArr.length
    ? hoursArr.reduce((s, r) => s + r.total_hours!, 0) / hoursArr.length
    : 0;

  const col = createColumnHelper<AttendanceRecord>();
  const columns: any[] = [
    col.accessor('user_name', {
      header: 'Agent',
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    col.accessor('date', { header: 'Date' }),
    col.accessor('check_in', {
      header: 'Check In',
      cell: info => <span className={info.getValue() ? '' : 'text-text-secondary'}>{fmtTime(info.getValue())}</span>,
    }),
    col.accessor('check_out', {
      header: 'Check Out',
      cell: info => <span className={info.getValue() ? '' : 'text-text-secondary'}>{fmtTime(info.getValue())}</span>,
    }),
    col.accessor('total_hours', {
      header: 'Hours',
      cell: info => info.getValue() != null
        ? <span className="font-semibold">{info.getValue()!.toFixed(1)}h</span>
        : <span className="text-text-secondary">—</span>,
    }),
    col.accessor('status', {
      header: 'Status',
      cell: info => <Badge label={info.getValue().replace('_', ' ')} variant={statusVariant(info.getValue())} />,
    }),
    col.display({
      id: 'gps',
      header: 'GPS',
      cell: ({ row }) => row.original.check_in_lat ? (
        <span className="flex items-center gap-1 text-xs text-text-secondary">
          <MapPin size={12} className="text-brand-primary" />
          {row.original.check_in_lat.toFixed(3)}, {row.original.check_in_lng?.toFixed(3)}
        </span>
      ) : <span className="text-text-secondary text-xs">—</span>,
    }),
    col.display({
      id: 'visits',
      header: 'Visits',
      cell: ({ row }) => {
        const count = (row.original.visit_logs || []).length;
        return count > 0 ? (
          <button
            onClick={() => setVisitModal(row.original)}
            className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
          >
            <Eye size={13} /> {count} visit{count !== 1 ? 's' : ''}
          </button>
        ) : <span className="text-text-secondary text-xs">—</span>;
      },
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Agent check-in / check-out records"
        action={
          <>
            <button onClick={handleExcelExport} className="btn-secondary gap-1.5">
              <Download size={14} /> Excel
            </button>
            <button onClick={handlePDFExport} className="btn-secondary gap-1.5">
              <FileText size={14} /> PDF
            </button>
          </>
        }
      />

      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          // FIXED: green-600/yellow-600 are too dark on dark navy cards; use brighter variants
          { label: 'Present', value: presentCount, color: 'text-[#22c55e]' },
          { label: 'Half Day', value: halfCount, color: 'text-[#f59e0b]' },
          { label: 'Avg Hours', value: `${avgHours.toFixed(1)}h`, color: 'text-brand-primary' },
        ].map(c => (
          <div key={c.label} className="card p-4">
            <div className="text-xs text-text-secondary mb-1">{c.label}</div>
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          className="input-default !w-auto"
          placeholder="Search agent..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <label className="text-sm text-text-secondary">From</label>
        <input type="date" className="input-default !w-auto" value={from} onChange={e => setFrom(e.target.value)} />
        <label className="text-sm text-text-secondary">To</label>
        <input type="date" className="input-default !w-auto" value={to} onChange={e => setTo(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <DataTable data={filtered} columns={columns} />
      )}

      {/* Visit Logs Modal */}
      <Modal
        open={!!visitModal}
        onClose={() => setVisitModal(null)}
        title={`Visit Logs — ${visitModal?.user_name} (${visitModal?.date})`}
        maxWidth="max-w-xl"
      >
        {visitModal && (
          <div>
            {(!visitModal.visit_logs || visitModal.visit_logs.length === 0) ? (
              <p className="text-text-secondary text-sm">No visit logs recorded.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {visitModal.visit_logs.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-[12px] bg-background border border-border">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary">
                        {v.visited_at ? format(new Date(v.visited_at), 'HH:mm') : '—'}
                      </div>
                      <div className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                        <MapPin size={11} />
                        {v.lat?.toFixed(4) ?? '—'}, {v.lng?.toFixed(4) ?? '—'}
                      </div>
                      {v.note && <div className="text-xs text-text-secondary mt-1">{v.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setVisitModal(null)} className="btn-secondary w-full mt-4">Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
