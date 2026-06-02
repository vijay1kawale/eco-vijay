const express = require('express');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000001';

const ago = (d) => new Date(Date.now() - d * 86400000);
const fmt = (d, hh = 9, mm = 0) => { const x = new Date(d); x.setHours(hh, mm, 0, 0); return x.toISOString(); };

const DEMO_NAMES = ['Rahul Sharma', 'Priya Mehta', 'Sunita Patel', 'Deepak Joshi', 'Kavita Singh'];
const DEMO_IDS   = ['u001', 'u002', 'u004', 'u005', 'u006'];

function makeDemoAttendance() {
  const rows = [];
  for (let day = 0; day < 7; day++) {
    const d = ago(day);
    const dateStr = d.toISOString().split('T')[0];
    DEMO_IDS.forEach((uid, i) => {
      if (day === 0 && i > 3) return; // not everyone checked in today
      const inH = 8 + Math.floor(Math.random() * 2);
      const outH = 17 + Math.floor(Math.random() * 2);
      const checkIn = fmt(d, inH, Math.floor(Math.random() * 30));
      const checkOut = day === 0 && i < 2 ? null : fmt(d, outH, Math.floor(Math.random() * 30));
      const hours = checkOut ? (outH - inH + (Math.random() * 0.5)) : null;
      rows.push({
        id: `att-${day}-${uid}`,
        user_id: uid,
        user_name: DEMO_NAMES[i],
        date: dateStr,
        check_in: checkIn,
        check_out: checkOut,
        total_hours: hours ? Math.round(hours * 100) / 100 : null,
        status: checkOut ? (hours >= 4 ? 'present' : 'half_day') : 'present',
        check_in_lat: 18.52 + Math.random() * 0.1,
        check_in_lng: 73.85 + Math.random() * 0.1,
      });
    });
  }
  return rows;
}

// GET /admin/attendance
router.get('/', adminAuth, async (req, res) => {
  if (req.admin.id === DEMO_ADMIN_ID) {
    let rows = makeDemoAttendance();
    const { from, to, user_id } = req.query;
    if (from) rows = rows.filter(r => r.date >= from);
    if (to) rows = rows.filter(r => r.date <= to);
    if (user_id) rows = rows.filter(r => r.user_id === user_id);
    return res.json(rows);
  }

  try {
    let query = supabase
      .from('attendance')
      .select('*, users(name, email)')
      .order('date', { ascending: false })
      .order('check_in', { ascending: false })
      .limit(500);

    const { from, to, user_id } = req.query;
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map(r => ({
      ...r,
      user_name: r.users?.name || 'Unknown',
    }));
    return res.json(rows);
  } catch (err) {
    console.error('GET /admin/attendance error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
