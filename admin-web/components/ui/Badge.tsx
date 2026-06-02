// FIXED: uses rgba colors that work on dark navy background
import React from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'gold';

const VARIANTS: Record<Variant, React.CSSProperties> = {
  success: { backgroundColor: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  warning: { backgroundColor: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  danger:  { backgroundColor: 'rgba(239,68,68,0.1)',    color: '#ef4444' },
  info:    { backgroundColor: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  neutral: { backgroundColor: 'rgba(148,163,184,0.1)', color: '#94a3b8' },
  purple:  { backgroundColor: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
  gold:    { backgroundColor: 'rgba(201,168,76,0.12)', color: '#C9A84C' },
};

export default function Badge({ label, variant = 'neutral' }: { label: string; variant?: Variant }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={VARIANTS[variant]}
    >
      {label}
    </span>
  );
}
