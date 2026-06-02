// FIXED: dark navy/gold theme; added live IST clock; removed bg-white buttons
'use client';
import React, { useEffect, useState } from 'react';
import { Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useSidebarStore } from '../../stores/sidebarStore';
import api from '../../lib/api';

function useISTClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      setTime(
        ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    tick();
    // FIXED: updates every second
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function breadcrumb(pathname: string): string {
  const last = pathname.split('/').filter(Boolean).pop() || 'dashboard';
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
}

export default function Topbar() {
  const { user } = useAuthStore();
  const { toggle } = useSidebarStore();
  const router = useRouter();
  const pathname = usePathname();
  const clock = useISTClock();

  const handleLogout = async () => {
    try { await api.post('/admin/auth/logout', {}); } catch {}
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    // FIXED: rgba glass background + blur + gold bottom border — not bg-white
    <header
      className="topbar-glass px-5 flex items-center justify-between gap-4"
      style={{ height: 64 }}
    >
      <div className="flex items-center gap-3">
        {/* FIXED: hamburger for sidebar toggle */}
        <button
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
          style={{ color: '#94A3B8' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#F1F5F9')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
        >
          <Menu size={18} />
        </button>
        {/* Breadcrumb */}
        <span className="text-sm font-semibold" style={{ color: '#94A3B8' }}>
          {breadcrumb(pathname)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* FIXED: live IST clock */}
        <span
          className="hidden md:block text-xs font-mono px-3 py-1.5 rounded-lg"
          style={{ color: '#C9A84C', backgroundColor: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}
        >
          {clock} IST
        </span>

        {/* Notification bell */}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
          style={{ color: '#94A3B8', backgroundColor: 'transparent', border: '1px solid #1E2D45' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#F1F5F9';
            (e.currentTarget as HTMLElement).style.borderColor = '#C9A84C';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#94A3B8';
            (e.currentTarget as HTMLElement).style.borderColor = '#1E2D45';
          }}
        >
          <Bell size={16} />
        </button>

        {/* Admin avatar with initials */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-1.5"
          style={{ backgroundColor: '#111827', border: '1px solid #1E2D45' }}
        >
          {/* FIXED: gold avatar circle with dark text */}
          <div
            className="h-7 w-7 rounded-full grid place-items-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
          >
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-tight" style={{ color: '#F1F5F9' }}>
              {user?.name || 'Admin'}
            </div>
            <div className="text-xs capitalize" style={{ color: '#475569' }}>
              {user?.role || 'Administrator'}
            </div>
          </div>
          <ChevronDown size={14} style={{ color: '#475569' }} />
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
          style={{ color: '#94A3B8', border: '1px solid #1E2D45' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#ef4444';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#94A3B8';
            (e.currentTarget as HTMLElement).style.borderColor = '#1E2D45';
            (e.currentTarget as HTMLElement).style.backgroundColor = '';
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
