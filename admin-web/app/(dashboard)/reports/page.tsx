'use client';
import React, { useState } from 'react';
import { Download, FileText, BarChart2, Users, Clock, Building2, Target, Activity, TrendingUp, MapPin } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getAttendance, getQuotations, getUsers, getCompanies, getActivityLogs, getVisits } from '../../../lib/adminApi';
import { exportToExcel, exportToPDF } from '../../../lib/export';
import { format } from 'date-fns';

const REPORT_TYPES = [
  { id: 'attendance',        label: 'Attendance',          icon: Clock,       description: 'Agent check-in/out records with hours worked' },
  { id: 'attendance_detailed', label: 'Attendance (Detailed)', icon: Clock,      description: 'Attendance with role, user info, and GPS locations' },
  { id: 'visits',            label: 'Field Visits',        icon: MapPin,      description: 'Company visits logged by field agents' },
  { id: 'quotations',        label: 'Quotations',           icon: FileText,    description: 'All sent quotations with revenue breakdown' },
  { id: 'users',             label: 'Users / Agents',       icon: Users,       description: 'User directory with roles and status' },
  { id: 'companies',         label: 'Companies & Leads',    icon: Building2,   description: 'Company list with lead pipeline status' },
  { id: 'leads',             label: 'Lead Pipeline',        icon: Target,      description: 'Lead status breakdown across all companies' },
  { id: 'agent_performance', label: 'Agent Performance',    icon: TrendingUp,  description: 'Attendance rate and quotations per agent' },
  { id: 'activity_logs',     label: 'Activity Logs',        icon: Activity,    description: 'Admin action audit trail export' },
];

type ReportRow = Record<string, string | number | null>;

// FIXED: minimal typed shapes for each API response to avoid any-typed map callbacks
type AttendanceRow  = { user_name: string; date: string; check_in: string | null; check_out: string | null; total_hours: number | null; status: string };
type QuotationRow   = { company_name: string; agent_name: string; service_type: string; price: number; sent_via: string[] | null; sent_at: string };
type UserRow        = { name: string; email: string; phone: string; role: string; is_active: boolean; last_login: string | null; created_at: string };
type CompanyRow     = { name: string; pibo: string; mobile: string; city: string; state: string; industry: string; company_type: string; lead_status: string };
type LogRow         = { created_at: string; admin_name: string; action: string; resource_type: string | null; details: Record<string, string | number | boolean | null> | null };

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState('attendance');
  const [fromDate, setFromDate] = useState(format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [generated, setGenerated] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setGenerated(false);
    setPageError(null);
    try {
      let data: ReportRow[] = [];
      if (selectedType === 'attendance') {
        const res = await getAttendance({ from: fromDate, to: toDate });
        data = (res.data as AttendanceRow[]).map(r => ({
          Agent: r.user_name,
          Date: r.date,
          'Check In': r.check_in ? format(new Date(r.check_in), 'HH:mm') : '—',
          'Check Out': r.check_out ? format(new Date(r.check_out), 'HH:mm') : '—',
          'Hours Worked': r.total_hours?.toFixed(2) ?? '—',
          Status: r.status,
        }));
      } else if (selectedType === 'attendance_detailed') {
        const res = await getAttendance({ from: fromDate, to: toDate });
        data = (res.data as any[]).map(r => ({
          Name: r.user_name,
          Role: r.role || '—',
          Date: r.date,
          'Check-In Time': r.check_in ? format(new Date(r.check_in), 'HH:mm') : '—',
          'Check-In Lat': r.check_in_lat ? r.check_in_lat.toFixed(6) : '—',
          'Check-In Lng': r.check_in_lng ? r.check_in_lng.toFixed(6) : '—',
          'Check-Out Time': r.check_out ? format(new Date(r.check_out), 'HH:mm') : '—',
          'Check-Out Lat': r.check_out_lat ? r.check_out_lat.toFixed(6) : '—',
          'Check-Out Lng': r.check_out_lng ? r.check_out_lng.toFixed(6) : '—',
          'Duration (hrs)': r.total_hours?.toFixed(2) ?? '—',
          Status: r.status,
        }));
      } else if (selectedType === 'visits') {
        const res = await getVisits({ date_from: fromDate, date_to: toDate });
        data = (res.data as any[]).map(v => ({
          'Field Agent': v.user_name || '—',
          'Company': v.company_name,
          'Visit Date': v.visited_at ? format(new Date(v.visited_at), 'dd MMM yyyy HH:mm') : '—',
          'Latitude': v.latitude ? v.latitude.toFixed(6) : '—',
          'Longitude': v.longitude ? v.longitude.toFixed(6) : '—',
          'Photo': v.photo_url ? 'Yes' : 'No',
        }));
      } else if (selectedType === 'quotations') {
        const res = await getQuotations({ from: fromDate, to: toDate });
        data = (res.data as QuotationRow[]).map(q => ({
          Company: q.company_name,
          Agent: q.agent_name,
          Service: q.service_type,
          'Amount (₹)': q.price,
          'Sent Via': (q.sent_via || []).join(', '),
          Date: format(new Date(q.sent_at), 'dd MMM yyyy'),
        }));
      } else if (selectedType === 'users') {
        const res = await getUsers();
        data = (res.data as UserRow[]).map(u => ({
          Name: u.name,
          Email: u.email,
          Phone: u.phone,
          Role: u.role,
          Status: u.is_active ? 'Active' : 'Inactive',
          'Last Login': u.last_login ? format(new Date(u.last_login), 'dd MMM yyyy HH:mm') : 'Never',
          'Joined': format(new Date(u.created_at), 'dd MMM yyyy'),
        }));
      } else if (selectedType === 'companies') {
        const res = await getCompanies();
        data = (res.data as CompanyRow[]).map(c => ({
          Company: c.name,
          Contact: c.pibo,
          Mobile: c.mobile,
          City: c.city,
          State: c.state,
          Industry: c.industry,
          Type: c.company_type,
          'Lead Status': c.lead_status,
        }));
      } else if (selectedType === 'leads') {
        const res = await getCompanies();
        data = (res.data as CompanyRow[]).map(c => ({
          Company: c.name,
          City: c.city,
          State: c.state,
          Industry: c.industry,
          Type: c.company_type,
          'Lead Status': c.lead_status || 'New',
          Contact: c.pibo,
          Mobile: c.mobile,
        }));
      } else if (selectedType === 'agent_performance') {
        const [attRes, quotRes] = await Promise.all([
          getAttendance({ from: fromDate, to: toDate }),
          getQuotations({ from: fromDate, to: toDate }),
        ]);
        const agents: Record<string, { days: number; hours: number; quotations: number }> = {};
        for (const r of attRes.data) {
          if (!agents[r.user_name]) agents[r.user_name] = { days: 0, hours: 0, quotations: 0 };
          agents[r.user_name].days++;
          agents[r.user_name].hours += r.total_hours || 0;
        }
        for (const q of quotRes.data) {
          if (!agents[q.agent_name]) agents[q.agent_name] = { days: 0, hours: 0, quotations: 0 };
          agents[q.agent_name].quotations++;
        }
        data = Object.entries(agents).map(([name, stats]) => ({
          Agent: name,
          'Days Present': stats.days,
          'Total Hours': stats.hours.toFixed(1),
          Quotations: stats.quotations,
          'Avg Hours/Day': stats.days ? (stats.hours / stats.days).toFixed(1) : '0',
        }));
      } else if (selectedType === 'activity_logs') {
        const res = await getActivityLogs();
        data = (res.data as LogRow[]).map(l => ({
          Time: format(new Date(l.created_at), 'dd MMM yyyy HH:mm'),
          Admin: l.admin_name,
          Action: l.action.replace(/_/g, ' '),
          Resource: l.resource_type || '—',
          Details: l.details ? Object.entries(l.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '—',
        }));
      }
      setRows(data);
      setGenerated(true);
    } catch {
      setPageError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reportLabel = REPORT_TYPES.find(r => r.id === selectedType)?.label ?? 'Report';

  const handleExcelDownload = () => {
    exportToExcel(rows, `${selectedType}_report_${format(new Date(), 'yyyyMMdd')}`, reportLabel);
  };

  const handlePDFDownload = async () => {
    if (!rows.length) return;
    const columns = Object.keys(rows[0]);
    const data = rows.map(r => columns.map(c => r[c] ?? '—'));
    await exportToPDF(
      `${reportLabel} Report (${fromDate} – ${toDate})`,
      columns,
      data as string[][],
      `${selectedType}_report_${format(new Date(), 'yyyyMMdd')}`
    );
  };

  return (
    <div>
      <PageHeader title="Reports" description="Generate and download detailed reports" />

      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      {/* Report type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        {REPORT_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => { setSelectedType(type.id); setGenerated(false); }}
            className={`card p-4 text-left transition ${selectedType === type.id ? 'ring-2 ring-brand-primary' : 'hover:bg-navy-700'}`}
          >
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] mb-3 text-brand-primary"
              style={{ backgroundColor: selectedType === type.id ? '#C9A84C' : 'rgba(201,168,76,0.12)', color: selectedType === type.id ? '#0A0F1E' : '#C9A84C' }}
            >
              <type.icon size={18} />
            </div>
            <div className="font-semibold text-text-primary text-sm">{type.label}</div>
            <div className="text-xs text-text-secondary mt-0.5">{type.description}</div>
          </button>
        ))}
      </div>

      {/* Date range + generate */}
      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">From Date</label>
            <input type="date" className="input-default !w-auto" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">To Date</label>
            <input type="date" className="input-default !w-auto" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <button onClick={generate} disabled={loading} className="btn-primary">
            <BarChart2 size={15} className="mr-2" />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
          {generated && rows.length > 0 && (
            <>
              <button onClick={handleExcelDownload} className="btn-secondary gap-1.5">
                <Download size={14} /> Excel
              </button>
              <button onClick={handlePDFDownload} className="btn-secondary gap-1.5">
                <FileText size={14} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview table */}
      {generated && (
        <div className="table-card overflow-x-auto">
          {rows.length === 0 ? (
            <div className="py-12 text-center text-text-secondary">No data for selected range.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-header border-b border-border">
                <tr>
                  {Object.keys(rows[0]).map(col => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="table-row">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-3 text-text-primary whitespace-nowrap">{String(val ?? '—')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows.length > 50 && (
            <p className="px-5 py-3 text-xs text-text-secondary border-t border-border">
              Showing first 50 of {rows.length} rows. Download Excel/PDF for full report.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
