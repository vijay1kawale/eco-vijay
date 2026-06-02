import React from 'react';
import Shell from '../../components/layout/Shell';
import AuthInitializer from '../../components/layout/AuthInitializer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <AuthInitializer />
      {children}
    </Shell>
  );
}
