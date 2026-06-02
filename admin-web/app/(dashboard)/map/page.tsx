'use client';
import React, { useEffect, useState, useRef } from 'react';
import { MapPin, Calendar, Info } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { getAdminDashboard } from '../../../lib/adminApi';

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

export default function MapPage() {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);
  const mapRef = useRef<any>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getAdminDashboard.getUsersLocations();
        const locationsData = res.data || [];
        setLocations(locationsData);
      } catch (err) {
        setError('Failed to load user locations.');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
    const interval = setInterval(loadLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initMap = () => {
      const locationsWithCoords = locations.filter(l => l.lat && l.lng);
      if (locationsWithCoords.length === 0) return;

      const centerLat = locationsWithCoords.reduce((sum, loc) => sum + loc.lat, 0) / locationsWithCoords.length;
      const centerLng = locationsWithCoords.reduce((sum, loc) => sum + loc.lng, 0) / locationsWithCoords.length;

      if (!googleMapRef.current) {
        googleMapRef.current = new (window as any).google.maps.Map(mapRef.current, {
          zoom: 12,
          center: { lat: centerLat || 18.5204, lng: centerLng || 73.8567 },
          mapTypeId: 'roadmap',
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#c9deff' }],
            },
          ],
        });
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add markers for each location
      locationsWithCoords.forEach(location => {
        const markerColor = location.role === 'field' || location.role === 'field_agent' ? '#10b981' : '#3b82f6';
        const markerLetter = location.role === 'field' || location.role === 'field_agent' ? 'F' : 'O';

        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50">
            <path d="M20 0C8.95 0 0 8.95 0 20c0 11 20 30 20 30s20-19 20-30c0-11.05-8.95-20-20-20z" fill="${markerColor}"/>
            <circle cx="20" cy="20" r="8" fill="white"/>
            <text x="20" y="24" font-size="12" font-weight="bold" fill="${markerColor}" text-anchor="middle">${markerLetter}</text>
          </svg>
        `;

        const marker = new (window as any).google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: googleMapRef.current,
          title: location.name,
          icon: {
            url: `data:image/svg+xml;base64,${btoa(svg)}`,
            scaledSize: new (window as any).google.maps.Size(40, 50),
            anchor: new (window as any).google.maps.Point(20, 50),
          },
        });

        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto">
              <p style="margin: 0; font-weight: bold; font-size: 14px">${location.name}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #666">
                ${location.role === 'field' || location.role === 'field_agent' ? '🚗 Field User' : '🏢 Office User'}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #666">
                <strong>Last Event:</strong> ${location.last_event_type === 'check_in' ? '✓ Check-In' : location.last_event_type === 'check_out' ? '✗ Check-Out' : '📍 Visit'}
              </p>
              ${location.last_event_time ? `
                <p style="margin: 4px 0; font-size: 12px; color: #666">
                  <strong>Time:</strong> ${new Date(location.last_event_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              ` : ''}
              ${location.company_name ? `
                <p style="margin: 4px 0; font-size: 12px; color: #666">
                  <strong>Company:</strong> ${location.company_name}
                </p>
              ` : ''}
              <p style="margin: 4px 0; font-size: 11px; color: #999; font-family: monospace">
                📍 ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}
              </p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMapRef.current, marker);
          setSelectedLocation(location);
        });

        markersRef.current.push(marker);
      });
    };

    // Load Google Maps script if not already loaded
    if (!(window as any).google) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setError('Google Maps API key not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        setError('Failed to load Google Maps. Check API key validity and browser console for details.');
        console.error('Google Maps script failed to load');
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [locations]);

  const officeUsers = locations.filter(l => (l.role === 'office' || l.role === 'office_user') && l.lat && l.lng).length;
  const fieldUsers = locations.filter(l => (l.role === 'field' || l.role === 'field_agent') && l.lat && l.lng).length;
  const locationsWithCoords = locations.filter(l => l.lat && l.lng);

  return (
    <div>
      <PageHeader
        title="User Locations Map"
        description="Real-time field and office user locations"
        action={
          <div className="flex items-center gap-3">
            <div className="text-sm text-text-secondary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Updates every 30s</span>
            </div>
            <div className="flex items-center gap-2 bg-navy-700 rounded-lg px-3 py-2">
              <Calendar size={16} className="text-text-secondary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-navy-700 text-text-primary text-sm border-0 focus:ring-0"
              />
            </div>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Map Card */}
          <div className="rounded-lg border border-navy-600 overflow-hidden relative bg-navy-800">
            {locationsWithCoords.length > 0 ? (
              <>
                <div ref={mapRef} style={{ height: '500px', width: '100%' }} />

                {/* Legend */}
                <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 z-30">
                  <h3 className="text-sm font-bold mb-3">Legend</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span className="text-xs">Office User ({officeUsers})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                      <span className="text-xs">Field User ({fieldUsers})</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold">{locationsWithCoords.length} users active today</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <Info size={48} className="text-text-secondary mx-auto opacity-30 mb-3" />
                  <p className="text-text-secondary">No location data available for {selectedDate}</p>
                </div>
              </div>
            )}
          </div>

          {/* Locations Table */}
          {locationsWithCoords.length > 0 && (
            <div className="rounded-lg border border-navy-600 overflow-hidden bg-navy-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-navy-700 border-b border-navy-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-text-secondary">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-text-secondary">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-text-secondary">Last Event</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-text-secondary">Time</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-text-secondary">Coordinates</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-text-secondary">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-600">
                    {locationsWithCoords.map((location) => (
                      <tr key={location.user_id} className="hover:bg-navy-700 transition cursor-pointer" onClick={() => setSelectedLocation(location)}>
                        <td className="px-6 py-4 font-medium text-text-primary">{location.name}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${location.role === 'field' || location.role === 'field_agent' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {location.role === 'field' || location.role === 'field_agent' ? 'Field' : 'Office'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary capitalize">{location.last_event_type || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {location.last_event_time ? new Date(location.last_event_time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-text-secondary">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://www.google.com/maps/search/${location.lat},${location.lng}`, '_blank');
                            }}
                            className="text-brand-primary hover:underline text-sm font-medium"
                          >
                            Maps →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
