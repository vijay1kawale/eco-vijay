const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper: calculate distance in meters using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /attendance/checkin
// Body: { user_id, check_in, check_in_lat, check_in_lng, date }
// For office users: geofence check (must be within 100m of office coordinates)
// For field users: no geofence restriction
// ─────────────────────────────────────────────────────────────────────────────
router.post('/checkin', authMiddleware, async (req, res) => {
  const {
    user_id,
    check_in,
    check_in_lat,
    check_in_lng,
    location_lat,
    location_lng,
    date,
  } = req.body;

  if (!user_id || !check_in || !date) {
    return res.status(400).json({ error: 'user_id, check_in, and date are required' });
  }

  const latitude = check_in_lat ?? location_lat ?? null;
  const longitude = check_in_lng ?? location_lng ?? null;

  try {
    // Fetch user info to get role and office location
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, assigned_office_lat, assigned_office_lng')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Geofence check for office users
    if (user.role === 'office' || user.role === 'office_user') {
      if (user.assigned_office_lat !== null && user.assigned_office_lng !== null) {
        if (latitude === null || longitude === null) {
          return res.status(400).json({ error: 'Location is required for office users' });
        }

        const distance = calculateDistance(
          latitude,
          longitude,
          user.assigned_office_lat,
          user.assigned_office_lng
        );

        if (distance > 100) { // 100 meters
          return res.status(403).json({
            error: 'You must be within office premises to check in.',
            details: `You are ${Math.round(distance)} meters away from the office.`,
          });
        }
      }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('attendance')
      .select('id, check_in')
      .eq('user_id', user_id)
      .eq('date', date)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      const update = {};
      if (!existing.check_in) {
        update.check_in = check_in;
        update.check_in_lat = latitude;
        update.check_in_lng = longitude;
        update.status = 'present';
      }

      const { data, error } = await supabase
        .from('attendance')
        .update(update)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id,
        date,
        check_in,
        check_in_lat: latitude,
        check_in_lng: longitude,
        status: 'present',
        visit_logs: [],
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /attendance/checkin error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /attendance/checkout
// Body: { attendance_id, check_out, check_out_lat, check_out_lng }
// For office users: geofence check (must be within 100m of office coordinates)
// For field users: no geofence restriction
// ─────────────────────────────────────────────────────────────────────────────
router.post('/checkout', authMiddleware, async (req, res) => {
  const {
    attendance_id,
    check_out,
    check_out_lat,
    check_out_lng,
    location_lat,
    location_lng,
  } = req.body;

  if (!attendance_id || !check_out) {
    return res.status(400).json({ error: 'attendance_id and check_out are required' });
  }

  const latitude = check_out_lat ?? location_lat ?? null;
  const longitude = check_out_lng ?? location_lng ?? null;

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('attendance')
      .select('id, check_in, user_id')
      .eq('id', attendance_id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Fetch user info to get role and office location
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, assigned_office_lat, assigned_office_lng')
      .eq('id', existing.user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Geofence check for office users on checkout
    if (user.role === 'office' || user.role === 'office_user') {
      if (user.assigned_office_lat !== null && user.assigned_office_lng !== null) {
        if (latitude === null || longitude === null) {
          return res.status(400).json({ error: 'Location is required for office users' });
        }

        const distance = calculateDistance(
          latitude,
          longitude,
          user.assigned_office_lat,
          user.assigned_office_lng
        );

        if (distance > 100) { // 100 meters
          return res.status(403).json({
            error: 'You must be within office premises to check out.',
            details: `You are ${Math.round(distance)} meters away from the office.`,
          });
        }
      }
    }

    let totalHours = null;
    let status = 'present';
    if (existing.check_in) {
      const inMs = new Date(existing.check_in).getTime();
      const outMs = new Date(check_out).getTime();
      if (outMs > inMs) {
        totalHours = (outMs - inMs) / (1000 * 60 * 60);
        status = totalHours >= 4 ? 'present' : 'half_day';
      }
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out,
        check_out_lat: latitude,
        check_out_lng: longitude,
        total_hours: totalHours !== null ? Math.round(totalHours * 100) / 100 : null,
        status,
      })
      .eq('id', attendance_id)
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('POST /attendance/checkout error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /attendance/visit
// Body: { user_id, location_lat, location_lng, visited_at, note? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/visit', authMiddleware, async (req, res) => {
  const { user_id, location_lat, location_lng, visited_at, note } = req.body;

  if (!user_id || !visited_at) {
    return res.status(400).json({ error: 'user_id and visited_at are required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const visitEntry = {
    lat: location_lat,
    lng: location_lng,
    visited_at,
    note: note || null,
  };

  try {
    // Look for today's attendance record
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, visit_logs')
      .eq('user_id', user_id)
      .eq('date', today)
      .single();

    if (existing) {
      // Append to existing visit_logs
      const currentLogs = Array.isArray(existing.visit_logs)
        ? existing.visit_logs
        : [];
      currentLogs.push(visitEntry);

      const { data, error } = await supabase
        .from('attendance')
        .update({ visit_logs: currentLogs })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }

    // No attendance record today — create one with just the visit log
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id,
        date: today,
        status: 'absent',
        visit_logs: [visitEntry],
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /attendance/visit error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /attendance/today
// Returns today's attendance record for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/today', authMiddleware, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (error && error.code === 'PGRST116') {
      // No row found — return null
      return res.json(null);
    }
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('GET /attendance/today error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /attendance/history
// Returns the last 30 days of attendance for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  // 30 days ago
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromStr = fromDate.toISOString().split('T')[0];

  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromStr)
      .order('date', { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    console.error('GET /attendance/history error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
