// FIXED: dark navy sidebar, gold active state, collapse persisted to localStorage
'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, Target, FileText,
  Building2, BarChart2, Activity, Settings, ShieldCheck,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { useSidebarStore } from '../../stores/sidebarStore';
import api from '../../lib/api';

const navItems = [
  { label: 'Dashboard',     href: '/dashboard',     Icon: LayoutDashboard },
  { label: 'Users',         href: '/users',         Icon: Users },
  { label: 'Permissions',   href: '/permissions',   Icon: ShieldCheck },
  { label: 'Attendance',    href: '/attendance',    Icon: Clock },
  { label: 'Leads',         href: '/leads',         Icon: Target },
  { label: 'Quotations',    href: '/quotations',    Icon: FileText },
  { label: 'Companies',     href: '/companies',     Icon: Building2 },
  { label: 'Reports',       href: '/reports',       Icon: BarChart2 },
  { label: 'Activity Logs', href: '/activity-logs', Icon: Activity },
  { label: 'Settings',      href: '/settings',      Icon: Settings },
];

const STORAGE_KEY = 'sidebar_collapsed';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle, setCollapsed } = useSidebarStore();

  // FIXED: persist collapse state in localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  const handleToggle = () => {
    const next = !collapsed;
    toggle();
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  // FIXED: logout clears admin_token cookie and redirects to login
  const handleLogout = async () => {
    try {
      await api.post('/admin/auth/logout', {});
    } catch {}
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="flex-shrink-0 min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: '#0D1321', borderRight: '1px solid #1E2D45' }}
    >
      {/* Brand + toggle */}
      <div
        className="flex items-center justify-between px-4 py-5"
        style={{ borderBottom: '1px solid #1E2D45', height: 64 }}
      >
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="text-base font-bold leading-tight" style={{ color: '#F1F5F9' }}>Eco Vijay</div>
              <div className="text-xs" style={{ color: '#475569' }}>Admin Panel</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleToggle}
          className="flex-shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
          style={{ color: '#94A3B8' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all"
              style={
                active
                  ? {
                      // FIXED: gold active state per spec
                      backgroundColor: 'rgba(201,168,76,0.08)',
                      borderLeft: '2px solid #C9A84C',
                      color: '#C9A84C',
                      paddingLeft: collapsed ? 10 : 10,
                    }
                  : {
                      color: '#94A3B8',
                      borderLeft: '2px solid transparent',
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLElement).style.color = '#F1F5F9';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                }
              }}
            >
              <Icon size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* FIXED: Logout button — clears cookie and redirects */}
      <div className="px-2 pb-4" style={{ borderTop: '1px solid #1E2D45', paddingTop: 12 }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm transition"
          style={{ color: '#94A3B8' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#ef4444';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#94A3B8';
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
          }}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="font-medium whitespace-nowrap overflow-hidden"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
