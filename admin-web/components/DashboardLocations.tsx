'use client';
import React from 'react';

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

export default function DashboardLocations({ locations }: { locations: UserLocation[] }) {
  const locationsWithCoords = locations.filter((l) => l.lat && l.lng);

  if (!locationsWithCoords.length) return null;

  return (
    <div className="rounded-lg overflow-hidden">
      <table className="w-full">
        <thead style={{ backgroundColor: 'rgba(201,168,76,0.08)' }}>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94A3B8' }}>Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94A3B8' }}>Role</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94A3B8' }}>Last Event</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94A3B8' }}>Time</th>
            <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#94A3B8' }}>Coordinates</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
          {locationsWithCoords.map((location) => (
            <tr key={location.user_id} style={{ backgroundColor: 'transparent' }}>
              <td className="px-4 py-3 text-sm" style={{ color: '#F1F5F9' }}>
                {location.name}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: location.role === 'field' || location.role === 'field_agent' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                    color: location.role === 'field' || location.role === 'field_agent' ? '#10b981' : '#3b82f6',
                  }}
                >
                  {location.role === 'field' || location.role === 'field_agent' ? '🚗 Field' : '🏢 Office'}
                </span>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: '#94A3B8' }}>
                {location.last_event_type === 'check_in'
                  ? '✓ Check-In'
                  : location.last_event_type === 'check_out'
                  ? '✗ Check-Out'
                  : '📍 Visit'}
              </td>
              <td className="px-4 py-3 text-sm text-xs" style={{ color: '#94A3B8' }}>
                {location.last_event_time
                  ? new Date(location.last_event_time).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm font-mono text-xs" style={{ color: '#94A3B8' }}>
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
