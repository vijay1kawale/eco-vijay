const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// GET /admin/users
router.get('/', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, is_active, last_login, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    let users = data || [];
    const { search, role, status } = req.query;
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (role) users = users.filter(u => u.role === role);
    if (status === 'active')   users = users.filter(u => u.is_active);
    if (status === 'inactive') users = users.filter(u => !u.is_active);
    return res.json(users);
  } catch (err) {
    console.error('GET /admin/users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /admin/users  — creates a real user that can log into the mobile app
router.post('/', adminAuth, async (req, res) => {
  const { name, email, phone, role, password, office_id, assigned_office_lat, assigned_office_lng } = req.body;
  if (!name || !email || !role || !password) {
    return res.status(400).json({ error: 'name, email, role, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const insertObj = {
      name,
      email: email.toLowerCase().trim(),
      phone: phone || '',
      role,
      password_hash: hash,
      is_active: true,
    };
    // Optional office assignment
    if (office_id) insertObj.office_id = office_id;
    if (assigned_office_lat !== undefined) insertObj.assigned_office_lat = assigned_office_lat;
    if (assigned_office_lng !== undefined) insertObj.assigned_office_lng = assigned_office_lng;

    const { data, error } = await supabase
      .from('users')
      .insert(insertObj)
      .select('id, name, email, phone, role, is_active, created_at, office_id, assigned_office_lat, assigned_office_lng')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /admin/users error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /admin/users/:id
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, is_active, last_login, created_at')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'User not found' });
    return res.json(data);
  } catch (err) {
    console.error('GET /admin/users/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT /admin/users/:id — full replacement update
router.put('/:id', adminAuth, async (req, res) => {
  const { name, email, phone, role, is_active, password, office_id, assigned_office_lat, assigned_office_lng } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'name, email, and role are required' });
  }

  try {
    const updates = {
      name,
      email: email.toLowerCase().trim(),
      phone: phone || '',
      role,
      is_active: is_active !== false,
      updated_at: new Date().toISOString(),
    };
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    if (office_id !== undefined) updates.office_id = office_id;
    if (assigned_office_lat !== undefined) updates.assigned_office_lat = assigned_office_lat;
    if (assigned_office_lng !== undefined) updates.assigned_office_lng = assigned_office_lng;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, name, email, phone, role, is_active, last_login, created_at, office_id, assigned_office_lat, assigned_office_lng')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    console.error('PUT /admin/users/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PATCH /admin/users/:id — partial update
router.patch('/:id', adminAuth, async (req, res) => {
  const { name, email, phone, role, is_active, office_id, assigned_office_lat, assigned_office_lng } = req.body;

  try {
    const updates = {};
    if (name !== undefined)      updates.name = name;
    if (email !== undefined)     updates.email = email.toLowerCase().trim();
    if (phone !== undefined)     updates.phone = phone;
    if (role !== undefined)      updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    if (office_id !== undefined) updates.office_id = office_id;
    if (assigned_office_lat !== undefined) updates.assigned_office_lat = assigned_office_lat;
    if (assigned_office_lng !== undefined) updates.assigned_office_lng = assigned_office_lng;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, name, email, phone, role, is_active, last_login, created_at, office_id, assigned_office_lat, assigned_office_lng')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    console.error('PATCH /admin/users/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PATCH /admin/users/:id/deactivate
router.patch('/:id/deactivate', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, name, email, role, is_active')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    console.error('PATCH /admin/users/:id/deactivate error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PATCH /admin/users/:id/activate
router.patch('/:id/activate', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, name, email, role, is_active')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    console.error('PATCH /admin/users/:id/activate error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /admin/users/:id
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /admin/users/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
