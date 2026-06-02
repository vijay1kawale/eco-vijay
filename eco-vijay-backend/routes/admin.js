const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'demo-local-secret';

const DEMO_ADMIN = {
  id: 'demo-admin-0000-0000-0000-000000000001',
  name: 'Demo Admin',
  email: 'admin@demo.com',
  password: 'admin1234',
  role: 'admin',
};

// POST /admin/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  // Demo fallback — works without a database connection
  if (email.toLowerCase().trim() === DEMO_ADMIN.email && password === DEMO_ADMIN.password) {
    const token = jwt.sign(
      { id: DEMO_ADMIN.id, email: DEMO_ADMIN.email, role: DEMO_ADMIN.role, name: DEMO_ADMIN.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ user: { id: DEMO_ADMIN.id, name: DEMO_ADMIN.name, email: DEMO_ADMIN.email, role: DEMO_ADMIN.role } });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .limit(1);
    if (error) throw error;
    if (!users || users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];

    if (user.is_active === false) return res.status(403).json({ error: 'User is blocked' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Access denied. Admin credentials required.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set httpOnly cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // update last_login
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Admin login error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// FIXED: GET /admin/leads — admin view of all leads
router.get('/leads', adminAuth, async (req, res) => {
  const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000001';
  if (req.admin.id === DEMO_ADMIN_ID) {
    return res.json([
      { id: 'l001', company_name: 'GreenTech Industries', agent_name: 'Rahul Sharma', lead_status: 'Interested', value: 50000, updated_at: new Date().toISOString() },
      { id: 'l002', company_name: 'EcoPlast Solutions',   agent_name: 'Priya Mehta',  lead_status: 'New',        value: 30000, updated_at: new Date().toISOString() },
      { id: 'l003', company_name: 'Bharat Batteries Ltd', agent_name: 'Sunita Patel', lead_status: 'Contacted',  value: 75000, updated_at: new Date().toISOString() },
    ]);
  }
  try {
    const { data, error } = await supabase.from('leads').select('*, companies(name), users(name)').order('updated_at', { ascending: false });
    if (error) throw error;
    return res.json((data || []).map(l => ({ ...l, company_name: l.companies?.name || 'Unknown', agent_name: l.users?.name || 'Unknown' })));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/auth/logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('admin_token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
});

// GET /admin/auth/me - read user from cookie
router.get('/auth/me', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });

    // Demo admin — return static user without DB
    if (payload.id === DEMO_ADMIN.id) {
      return res.json({ id: DEMO_ADMIN.id, name: DEMO_ADMIN.name, email: DEMO_ADMIN.email, role: DEMO_ADMIN.role });
    }

    const { data: users, error } = await supabase.from('users').select('id, name, email, role').eq('id', payload.id).limit(1);
    if (error) throw error;
    if (!users || users.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json(users[0]);
  } catch (err) {
    console.error('GET /admin/auth/me error', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

// POST /admin/auth/change-password
router.post('/auth/change-password', adminAuth, async (req, res) => {
  const { current, password } = req.body;
  if (!current || !password) return res.status(400).json({ error: 'current and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Demo admin — accept any change without DB
  if (req.admin.id === DEMO_ADMIN.id) return res.json({ ok: true });

  try {
    const { data: users, error } = await supabase.from('users').select('password_hash').eq('id', req.admin.id).limit(1);
    if (error || !users || users.length === 0) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(current, users[0].password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(password, 10);
    const { error: updateError } = await supabase.from('users').update({ password_hash: hash }).eq('id', req.admin.id);
    if (updateError) throw updateError;

    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /admin/auth/change-password error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
