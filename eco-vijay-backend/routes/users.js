const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const DEMO_ID = 'demo-0000-0000-0000-000000000000';

// GET /users/me
router.get('/me', authMiddleware, async (req, res) => {
  // Demo fallback
  if (req.user.id === DEMO_ID) {
    return res.json({
      id: DEMO_ID,
      name: 'Demo Field Agent',
      email: 'demo@ecovijay.com',
      phone: '9999999999',
      role: 'field_agent',
      office_id: null,
      office_lat: null,
      office_lng: null,
      created_at: new Date().toISOString(),
    });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, office_id, assigned_office_lat, assigned_office_lng, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'User not found' });
    return res.json(data);
  } catch (err) {
    console.error('GET /users/me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /users/last-locations?date=YYYY-MM-DD
// Returns users with location events on specified date (default: today)
// Priority: Field user → last visit, then last check-out/check-in
//          Office user → last check-out, then check-in
// Only returns users with at least one event on the date
// ─────────────────────────────────────────────────────────────────────────────
router.get('/last-locations', authMiddleware, async (req, res) => {
  try {
    // Get date from query or default to today
    let date = req.query.date;
    if (!date) {
      const now = new Date();
      date = now.toISOString().split('T')[0];
    }

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, role, is_active')
      .eq('is_active', true);

    if (usersError) throw usersError;

    const locations = [];

    for (const user of users || []) {
      let lastLocation = null;
      let lastEventType = null;
      let lastEventTime = null;
      let companyName = null;
      let photoUrl = null;

      // For field users: try to get last visit first for the date
      if (user.role === 'field_agent' || user.role === 'field') {
        const { data: visits, error: visitError } = await supabase
          .from('visits')
          .select('latitude, longitude, visited_at, company_name, photo_url')
          .eq('user_id', user.id)
          .gte('visited_at', `${date}T00:00:00`)
          .lte('visited_at', `${date}T23:59:59`)
          .order('visited_at', { ascending: false })
          .limit(1);

        if (!visitError && visits && visits.length > 0) {
          lastLocation = {
            lat: visits[0].latitude,
            lng: visits[0].longitude,
          };
          lastEventType = 'visit';
          lastEventTime = visits[0].visited_at;
          companyName = visits[0].company_name || null;
          photoUrl = visits[0].photo_url || null;
        }
      }

      // If no visit location found (or office user), try attendance for the date
      if (!lastLocation) {
        const { data: attendance, error: attendError } = await supabase
          .from('attendance')
          .select('check_in_lat, check_in_lng, check_in, check_out_lat, check_out_lng, check_out, date')
          .eq('user_id', user.id)
          .eq('date', date)
          .limit(1);

        if (!attendError && attendance && attendance.length > 0) {
          const record = attendance[0];
          // Priority: check_out > check_in
          if (record.check_out_lat !== null && record.check_out_lng !== null) {
            lastLocation = {
              lat: record.check_out_lat,
              lng: record.check_out_lng,
            };
            lastEventType = 'check_out';
            lastEventTime = record.check_out;
          } else if (record.check_in_lat !== null && record.check_in_lng !== null) {
            lastLocation = {
              lat: record.check_in_lat,
              lng: record.check_in_lng,
            };
            lastEventType = 'check_in';
            lastEventTime = record.check_in;
          }
        }
      }

      // Only add to list if we found a location for this date
      if (lastLocation) {
        locations.push({
          user_id: user.id,
          name: user.name,
          role: user.role,
          lat: lastLocation.lat,
          lng: lastLocation.lng,
          last_event_type: lastEventType,
          last_event_time: lastEventTime,
          company_name: companyName,
          photo_url: photoUrl,
        });
      }
    }

    return res.json(locations);
  } catch (err) {
    console.error('GET /users/last-locations error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
