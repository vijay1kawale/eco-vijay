const express = require('express');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000001';

const ago = (m) => new Date(Date.now() - m * 60000).toISOString();

const DEMO_LOGS = [
  { id: 'log001', admin_name: 'Demo Admin', action: 'login',           resource_type: 'auth',       resource_id: null,  details: null,                             created_at: ago(5) },
  { id: 'log002', admin_name: 'Demo Admin', action: 'view_users',      resource_type: 'users',      resource_id: null,  details: null,                             created_at: ago(8) },
  { id: 'log003', admin_name: 'Demo Admin', action: 'create_user',     resource_type: 'users',      resource_id: 'u004', details: { name: 'Sunita Patel' },        created_at: ago(120) },
  { id: 'log004', admin_name: 'Demo Admin', action: 'deactivate_user', resource_type: 'users',      resource_id: 'u003', details: { name: 'Amit Verma' },          created_at: ago(200) },
  { id: 'log005', admin_name: 'Demo Admin', action: 'export_report',   resource_type: 'reports',    resource_id: null,  details: { type: 'attendance', fmt: 'xlsx' }, created_at: ago(300) },
  { id: 'log006', admin_name: 'Demo Admin', action: 'view_dashboard',  resource_type: 'dashboard',  resource_id: null,  details: null,                             created_at: ago(310) },
  { id: 'log007', admin_name: 'Demo Admin', action: 'update_user',     resource_type: 'users',      resource_id: 'u001', details: { field: 'role', value: 'agent' }, created_at: ago(1440) },
  { id: 'log008', admin_name: 'Demo Admin', action: 'logout',          resource_type: 'auth',       resource_id: null,  details: null,                             created_at: ago(1500) },
  { id: 'log009', admin_name: 'Demo Admin', action: 'login',           resource_type: 'auth',       resource_id: null,  details: null,                             created_at: ago(1510) },
  { id: 'log010', admin_name: 'Demo Admin', action: 'export_report',   resource_type: 'reports',    resource_id: null,  details: { type: 'quotations', fmt: 'pdf' }, created_at: ago(2880) },
];

// GET /admin/activity-logs
router.get('/', adminAuth, async (req, res) => {
  if (req.admin.id === DEMO_ADMIN_ID) {
    return res.json(DEMO_LOGS);
  }

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    // Table may not exist yet — return empty array gracefully
    if (error && error.code === '42P01') return res.json([]);
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('GET /admin/activity-logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/activity-logs  (called internally by other admin routes)
router.post('/', adminAuth, async (req, res) => {
  const { action, resource_type, resource_id, details } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });

  if (req.admin.id === DEMO_ADMIN_ID) return res.status(201).json({ ok: true });

  try {
    const { data, error } = await supabase.from('activity_logs').insert({
      admin_id: req.admin.id,
      admin_name: req.admin.name || req.admin.email,
      action,
      resource_type: resource_type || null,
      resource_id: resource_id || null,
      details: details || null,
    }).select().single();

    if (error && error.code === '42P01') return res.status(201).json({ ok: true }); // table not yet created
    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /admin/activity-logs error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
