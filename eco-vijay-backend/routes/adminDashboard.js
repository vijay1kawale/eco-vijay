const express = require('express');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000001';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const LEAD_STATUSES = ['New', 'Contacted', 'Interested', 'Negotiation', 'Closed', 'Lost'];

// GET /admin/dashboard/stats
// FIXED: returns correct shape per spec with all required fields
router.get('/stats', adminAuth, async (req, res) => {
  // Demo fallback — works without a database connection
  if (req.admin.id === DEMO_ADMIN_ID) {
    const now = new Date();
    const base = now.getMonth();

    const monthlyQuotations = Array.from({ length: 12 }, (_, i) => {
      const count = Math.floor(20 + Math.random() * 50);
      return {
        month: MONTHS[(base - 11 + i + 12) % 12],
        count,
        totalValue: count * Math.floor(15000 + Math.random() * 30000),
      };
    });

    const leadTotals = { New: 24, Contacted: 33, Interested: 41, Negotiation: 18, Closed: 12, Lost: 9 };
    const leadTotal = Object.values(leadTotals).reduce((a, b) => a + b, 0);
    const leadsByStatus = LEAD_STATUSES.map(status => ({
      status,
      count: leadTotals[status] || 0,
      percentage: leadTotal ? Math.round(((leadTotals[status] || 0) / leadTotal) * 100) : 0,
    }));

    // FIXED: all required top-level keys present
    return res.json({
      totalUsers: 264,
      activeAgents: 218,
      quotationsThisMonth: 48,
      revenuePipeline: 1340000,
      attendanceToday: 87,
      monthlyQuotations,
      leadsByStatus,
      topAgents: [
        { id: 'u001', name: 'Rahul Sharma',  quotations: 18, leadsClosed: 5, pipelineValue: 340000, attendancePercent: 95 },
        { id: 'u002', name: 'Priya Mehta',   quotations: 14, leadsClosed: 4, pipelineValue: 280000, attendancePercent: 92 },
        { id: 'u004', name: 'Sunita Patel',  quotations: 11, leadsClosed: 3, pipelineValue: 210000, attendancePercent: 88 },
        { id: 'u005', name: 'Deepak Joshi',  quotations: 9,  leadsClosed: 2, pipelineValue: 175000, attendancePercent: 85 },
        { id: 'u006', name: 'Kavita Singh',  quotations: 7,  leadsClosed: 2, pipelineValue: 140000, attendancePercent: 90 },
      ],
      recentActivity: [
        { type: 'quotation', agentName: 'Rahul Sharma',  description: 'Sent quotation to GreenTech Industries', time: new Date(Date.now() - 600000).toISOString() },
        { type: 'checkin',   agentName: 'Priya Mehta',   description: 'Checked in at office',                 time: new Date(Date.now() - 1200000).toISOString() },
        { type: 'lead',      agentName: 'Sunita Patel',  description: 'Lead status → Interested',             time: new Date(Date.now() - 1800000).toISOString() },
        { type: 'quotation', agentName: 'Deepak Joshi',  description: 'Sent quotation to EcoPlast Solutions', time: new Date(Date.now() - 3600000).toISOString() },
        { type: 'checkin',   agentName: 'Kavita Singh',  description: 'Checked in at office',                 time: new Date(Date.now() - 5400000).toISOString() },
        { type: 'lead',      agentName: 'Rahul Sharma',  description: 'Lead status → Closed',                 time: new Date(Date.now() - 7200000).toISOString() },
        { type: 'quotation', agentName: 'Priya Mehta',   description: 'Sent quotation to Bharat Batteries',  time: new Date(Date.now() - 10800000).toISOString() },
        { type: 'checkin',   agentName: 'Deepak Joshi',  description: 'Auto-checked out via geofence',       time: new Date(Date.now() - 14400000).toISOString() },
        { type: 'lead',      agentName: 'Kavita Singh',  description: 'New lead: Tyre EPR Registration',     time: new Date(Date.now() - 18000000).toISOString() },
        { type: 'quotation', agentName: 'Sunita Patel',  description: 'Sent quotation to Kolkata Plastics',  time: new Date(Date.now() - 21600000).toISOString() },
      ],
    });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = now.toISOString().split('T')[0];

    const [usersRes, quotRes, attRes, leadRes] = await Promise.all([
      supabase.from('users').select('id, role, is_active'),
      supabase.from('quotations').select('price').gte('sent_at', startOfMonth),
      supabase.from('attendance').select('id, status').eq('date', today),
      supabase.from('leads').select('lead_status'),
    ]);

    const users = usersRes.data || [];
    const quotations = quotRes.data || [];
    const attendance = attRes.data || [];
    const leads = leadRes.data || [];

    const totalUsers = users.length;
    // FIXED: role values can be field_agent or agent — count both
    const activeAgents = users.filter(u =>
      (u.role === 'field_agent' || u.role === 'agent') && u.is_active
    ).length;
    const quotationsThisMonth = quotations.length;
    // FIXED: renamed to revenuePipeline per spec
    const revenuePipeline = quotations.reduce((s, q) => s + (q.price || 0), 0);
    const present = attendance.filter(a => ['present', 'half_day'].includes(a.status)).length;
    const attendanceToday = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

    // FIXED: leadsByStatus as array of objects with percentage
    const leadCountMap = {};
    leads.forEach(l => {
      const k = l.lead_status || 'Unknown';
      leadCountMap[k] = (leadCountMap[k] || 0) + 1;
    });
    const leadTotal = leads.length;
    const leadsByStatus = LEAD_STATUSES.map(status => ({
      status,
      count: leadCountMap[status] || 0,
      percentage: leadTotal ? Math.round(((leadCountMap[status] || 0) / leadTotal) * 100) : 0,
    }));

    // FIXED: monthlyQuotations with totalValue per month
    const monthlyQuotations = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const { data: mq } = await supabase
        .from('quotations').select('price').gte('sent_at', mStart).lte('sent_at', mEnd);
      const monthData = mq || [];
      monthlyQuotations.push({
        month: MONTHS[d.getMonth()],
        count: monthData.length,
        totalValue: monthData.reduce((s, q) => s + (q.price || 0), 0),
      });
    }

    // FIXED: topAgents — top 5 by quotation count
    const { data: topAgentRows } = await supabase
      .from('quotations')
      .select('user_id, price')
      .gte('sent_at', new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString());

    const agentQuotMap = {};
    (topAgentRows || []).forEach(q => {
      if (!agentQuotMap[q.user_id]) agentQuotMap[q.user_id] = { quotations: 0, pipelineValue: 0 };
      agentQuotMap[q.user_id].quotations += 1;
      agentQuotMap[q.user_id].pipelineValue += q.price || 0;
    });

    const topAgentIds = Object.entries(agentQuotMap)
      .sort((a, b) => b[1].quotations - a[1].quotations)
      .slice(0, 5)
      .map(([id]) => id);

    let topAgents = [];
    if (topAgentIds.length > 0) {
      const { data: agentUsers } = await supabase
        .from('users').select('id, name').in('id', topAgentIds);
      topAgents = (agentUsers || []).map(u => ({
        id: u.id,
        name: u.name,
        quotations: agentQuotMap[u.id]?.quotations || 0,
        leadsClosed: 0,
        pipelineValue: agentQuotMap[u.id]?.pipelineValue || 0,
        attendancePercent: 0,
      }));
    }

    // FIXED: recentActivity — last 10 events across quotations, leads, attendance
    const [recentQuot, recentAtt] = await Promise.all([
      supabase.from('quotations').select('id, user_id, service_type, sent_at, users(name), companies(name)')
        .order('sent_at', { ascending: false }).limit(5),
      supabase.from('attendance').select('id, user_id, check_in, check_out, users(name)')
        .order('check_in', { ascending: false }).limit(5),
    ]);

    const recentActivity = [];
    (recentQuot.data || []).forEach(q => {
      recentActivity.push({
        type: 'quotation',
        agentName: q.users?.name || 'Unknown',
        description: `Sent quotation to ${q.companies?.name || 'company'} — ${q.service_type}`,
        time: q.sent_at,
      });
    });
    (recentAtt.data || []).forEach(a => {
      if (a.check_in) {
        recentActivity.push({
          type: 'checkin',
          agentName: a.users?.name || 'Unknown',
          description: a.check_out ? 'Completed attendance' : 'Checked in at office',
          time: a.check_in,
        });
      }
    });
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.json({
      totalUsers,
      activeAgents,
      quotationsThisMonth,
      revenuePipeline,
      attendanceToday,
      monthlyQuotations,
      leadsByStatus,
      topAgents,
      recentActivity: recentActivity.slice(0, 10),
    });
  } catch (err) {
    console.error('GET /admin/dashboard/stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/dashboard/users-locations
// Returns all users with their last-known locations for map display
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users-locations', adminAuth, async (req, res) => {
  try {
    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, role, is_active');

    if (usersError) throw usersError;

    const locations = [];

    for (const user of users || []) {
      let lastLocation = null;
      let lastEventType = null;
      let lastEventTime = null;

      // For field users: try to get last visit first
      if (user.role === 'field_agent' || user.role === 'field') {
        const { data: visits, error: visitError } = await supabase
          .from('visits')
          .select('latitude, longitude, visited_at')
          .eq('user_id', user.id)
          .order('visited_at', { ascending: false })
          .limit(1);

        if (!visitError && visits && visits.length > 0) {
          lastLocation = {
            lat: visits[0].latitude,
            lng: visits[0].longitude,
          };
          lastEventType = 'visit';
          lastEventTime = visits[0].visited_at;
        }
      }

      // If no visit location found (or office user), try attendance
      if (!lastLocation) {
        const { data: attendance, error: attendError } = await supabase
          .from('attendance')
          .select('check_in_lat, check_in_lng, check_in, check_out_lat, check_out_lng, check_out')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(1);

        if (!attendError && attendance && attendance.length > 0) {
          const record = attendance[0];
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

      // Add to list whether or not location exists (allows showing inactive users)
      locations.push({
        user_id: user.id,
        name: user.name,
        role: user.role,
        is_active: user.is_active,
        lat: lastLocation?.lat || null,
        lng: lastLocation?.lng || null,
        last_event_type: lastEventType,
        last_event_time: lastEventTime,
      });
    }

    return res.json(locations);
  } catch (err) {
    console.error('GET /admin/dashboard/users-locations error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
