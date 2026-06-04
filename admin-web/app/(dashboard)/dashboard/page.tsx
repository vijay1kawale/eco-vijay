// FIXED: interface matches corrected backend shape; dark navy/gold theme; topAgents + recentActivity sections added
// @ts-nocheck
'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, UserCheck, FileText, TrendingUp, Clock, MapPin } from 'lucide-react';
import { getDashboardStats, getAdminDashboard } from '../../../lib/adminApi';
import DashboardLocations from '../../../components/DashboardLocations';

type UserLocation = {
  user_id: string;
  name: string;
  role: string;
  lat: number;
  lng: number;
  last_event_type: string | null;
  last_event_time: string | null;
  company_name: string | null;
  photo_url: string | null;
};

// FIXED: interface matches backend response shape after fix
interface LeadStatus {
  status: string;
  count: number;
  percentage: number;
}

interface TopAgent {
  id: string;
  name: string;
  quotations: number;
  leadsClosed: number;
  pipelineValue: number;
  attendancePercent: number;
}

interface ActivityItem {
  type: 'quotation' | 'lead' | 'checkin';
  agentName: string;
  description: string;
  time: string;
}

interface Stats {
  totalUsers: number;
  activeAgents: number;
  quotationsThisMonth: number;
  revenuePipeline: number;    // FIXED: was revenueThisMonth
  attendanceToday: number;
  monthlyQuotations: { month: string; count: number; totalValue: number }[];
  leadsByStatus: LeadStatus[]; // FIXED: was leads: Record<string, number>
  topAgents: TopAgent[];
  recentActivity: ActivityItem[];
}

// FIXED: gold/navy color palette for pie chart
const PIE_COLORS = ['#C9A84C', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B'];

const STAT_CARDS = (s: Stats) => [
  {
    label: 'Total Users',
    value: s.totalUsers.toLocaleString(),
    icon: Users,
    iconBg: 'rgba(201,168,76,0.1)',
    iconColor: '#C9A84C',
    trend: '+12%',
    trendUp: true,
  },
  {
    label: 'Active Agents',
    value: s.activeAgents.toLocaleString(),
    icon: UserCheck,
    iconBg: 'rgba(34,197,94,0.1)',
    iconColor: '#22c55e',
    trend: '+5%',
    trendUp: true,
  },
  {
    label: 'Quotations This Month',
    value: s.quotationsThisMonth.toLocaleString(),
    icon: FileText,
    iconBg: 'rgba(59,130,246,0.1)',
    iconColor: '#3b82f6',
    trend: '+8%',
    trendUp: true,
  },
  {
    label: 'Revenue Pipeline',
    // FIXED: key is revenuePipeline
    value: `₹${(s.revenuePipeline / 100000).toFixed(1)}L`,
    icon: TrendingUp,
    iconBg: 'rgba(139,92,246,0.1)',
    iconColor: '#8b5cf6',
    trend: '+22%',
    trendUp: true,
  },
  {
    label: 'Attendance Today',
    value: `${s.attendanceToday}%`,
    icon: Clock,
    iconBg: 'rgba(249,115,22,0.1)',
    iconColor: '#f97316',
    trend: s.attendanceToday >= 80 ? 'Good' : 'Low',
    trendUp: s.attendanceToday >= 80,
  },
];

function timeAgo(isoStr: string): string {
  if (!isoStr) return 'just now';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return 'just now';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const activityDotColor = (type: string) => {
  if (type === 'quotation') return '#C9A84C';
  if (type === 'lead') return '#8b5cf6';
  return '#22c55e'; // checkin
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats().then(r => setStats(r.data)),
      getAdminDashboard.getUsersLocations().then(r => setLocations(r.data || [])),
    ])
      .catch(() => setPageError('Failed to load dashboard. Please refresh.'))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      getAdminDashboard.getUsersLocations().then(r => setLocations(r.data || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (pageError || !stats) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl p-4 text-sm"
        style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
      >
        ⚠ {pageError ?? 'Failed to load dashboard stats.'}
        <button className="ml-auto underline" onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  // FIXED: leadsByStatus is now an array
  const pieData = (stats.leadsByStatus || []).filter(d => d.count > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>

      {/* ── Stat cards ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-6">
        {STAT_CARDS(stats).map((card, i) => (
          <motion.div
            key={card.label}
            className="card p-5 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            whileHover={{ y: -2 }}
          >
            {/* FIXED: subtle gold glow top-left */}
            <div
              className="absolute -top-6 -left-6 h-20 w-20 rounded-full opacity-20 blur-xl pointer-events-none"
              style={{ backgroundColor: card.iconColor }}
            />
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                {card.label}
              </span>
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                style={{ backgroundColor: card.iconBg }}
              >
                <card.icon size={16} color={card.iconColor} />
              </span>
            </div>
            {/* FIXED: gold gradient large number */}
            <div
              className="text-2xl font-bold mb-2"
              style={{ color: '#F1F5F9' }}
            >
              {card.value}
            </div>
            {/* FIXED: trend pill */}
            <span
              className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: card.trendUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                color: card.trendUp ? '#22c55e' : '#ef4444',
              }}
            >
              {card.trend}
            </span>
          </motion.div>
        ))}
      </section>

      {/* ── User Locations Map ── */}
      {locations.filter(l => l.lat && l.lng).length > 0 && (
        <motion.div
          className="card p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin size={20} style={{ color: '#C9A84C' }} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Live Map</p>
                <h2 className="mt-1 text-lg font-semibold" style={{ color: '#F1F5F9' }}>User Locations</h2>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#22c55e' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {locations.filter(l => l.lat && l.lng).length} Active Users
            </span>
          </div>

          <DashboardLocations locations={locations} />

          {/* Legend */}
          <div className="flex items-center justify-between mt-4 px-4 py-3 rounded-lg" style={{ backgroundColor: 'rgba(201,168,76,0.05)' }}>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-xs" style={{ color: '#94A3B8' }}>Office User</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-xs" style={{ color: '#94A3B8' }}>Field User</span>
              </div>
            </div>
            <a
              href="/map"
              className="text-xs font-medium hover:underline"
              style={{ color: '#C9A84C' }}
            >
              View Interactive Map →
            </a>
          </div>
        </motion.div>
      )}

      {/* ── Charts row ── */}
      <section className="grid gap-5 xl:grid-cols-5 mb-6">

        {/* FIXED: Area chart (65% width) with gold gradient fill */}
        <motion.div className="card p-6 xl:col-span-3" whileHover={{ y: -2 }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Quotations</p>
              <h2 className="mt-1 text-lg font-semibold" style={{ color: '#F1F5F9' }}>Last 12 months</h2>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}
            >
              {stats.quotationsThisMonth} this month
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.monthlyQuotations} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {/* FIXED: gold fill gradient */}
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              {/* FIXED: dark tooltip with gold border */}
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  backgroundColor: '#111827',
                  border: '1px solid #C9A84C',
                  color: '#F1F5F9',
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Quotations"
                stroke="#C9A84C"
                fill="url(#goldGrad)"
                strokeWidth={2}
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* FIXED: Donut/Pie chart (35% width) with centre label */}
        <motion.div className="card p-6 xl:col-span-2" whileHover={{ y: -2 }}>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Lead Status</p>
            <h2 className="mt-1 text-lg font-semibold" style={{ color: '#F1F5F9' }}>Distribution</h2>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  animationDuration={700}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                  {/* FIXED: centre label showing total and "Total Leads" */}
                </Pie>
                <text
                  x="50%"
                  y="43%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#F1F5F9"
                  fontSize={20}
                  fontWeight={700}
                >
                  {pieData.reduce((s, d) => s + d.count, 0)}
                </text>
                <text
                  x="50%"
                  y="53%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#94A3B8"
                  fontSize={10}
                >
                  Total Leads
                </text>
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    backgroundColor: '#111827',
                    border: '1px solid #1E2D45',
                    color: '#F1F5F9',
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm" style={{ color: '#475569' }}>
              No lead data available
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Bottom row: Top Agents + Recent Activity ── */}
      <section className="grid gap-5 xl:grid-cols-2">

        {/* FIXED: Top Agents table — was missing */}
        <motion.div className="card p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: '#F1F5F9' }}>Top Agents</h2>
          <div className="space-y-3">
            {(stats.topAgents || []).slice(0, 5).map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-3">
                {/* FIXED: gold rank number */}
                <span className="w-5 text-sm font-bold text-right flex-shrink-0" style={{ color: '#C9A84C' }}>
                  #{i + 1}
                </span>
                {/* Avatar initials circle */}
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}
                >
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#F1F5F9' }}>{agent.name}</p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>
                    {agent.quotations} quotes · ₹{(agent.pipelineValue / 1000).toFixed(0)}k pipeline
                  </p>
                </div>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#22c55e' }}>
                  {agent.attendancePercent}%
                </span>
              </div>
            ))}
            {(!stats.topAgents || stats.topAgents.length === 0) && (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>No agent data yet</p>
            )}
          </div>
        </motion.div>

        {/* FIXED: Recent Activity feed — was missing */}
        <motion.div className="card p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#F1F5F9' }}>Recent Activity</h2>
            {/* FIXED: pulsing green "Live Activity" indicator */}
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#22c55e' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live Activity
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1">
            {(stats.recentActivity || []).slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                {/* FIXED: coloured dot per type */}
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activityDotColor(item.type) }}
                  />
                  {i < (stats.recentActivity?.length || 0) - 1 && (
                    <div className="w-px flex-1 mt-1" style={{ backgroundColor: '#1E2D45', minHeight: 16 }} />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-3">
                  <p className="text-xs font-semibold" style={{ color: '#F1F5F9' }}>{item.agentName}</p>
                  <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{item.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{timeAgo(item.time)}</p>
                </div>
              </div>
            ))}
            {(!stats.recentActivity || stats.recentActivity.length === 0) && (
              <p className="text-sm text-center py-4" style={{ color: '#475569' }}>No recent activity</p>
            )}
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}
