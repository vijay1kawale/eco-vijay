'use client';
import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0A0F1E', color: '#F1F5F9' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
