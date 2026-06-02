const express = require('express');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/visits
// Returns all visits with user and company information
// Optional filters: user_id, date_from, date_to
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
  const { user_id, date_from, date_to } = req.query;

  try {
    let query = supabase
      .from('visits')
      .select(`
        id,
        user_id,
        company_name,
        visited_at,
        latitude,
        longitude,
        photo_url,
        created_at,
        users(name, role)
      `)
      .order('visited_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (date_from) {
      query = query.gte('visited_at', new Date(date_from).toISOString());
    }

    if (date_to) {
      query = query.lte('visited_at', new Date(date_to).toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const formatted = (data || []).map(visit => ({
      id: visit.id,
      user_id: visit.user_id,
      user_name: visit.users?.name || 'Unknown',
      role: visit.users?.role || 'Unknown',
      company_name: visit.company_name,
      visited_at: visit.visited_at,
      latitude: visit.latitude,
      longitude: visit.longitude,
      photo_url: visit.photo_url,
      created_at: visit.created_at,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('GET /admin/visits error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/visits/:id
// Returns a specific visit by ID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select(`
        id,
        user_id,
        company_name,
        visited_at,
        latitude,
        longitude,
        photo_url,
        created_at,
        users(name, role)
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const formatted = {
      id: data.id,
      user_id: data.user_id,
      user_name: data.users?.name || 'Unknown',
      role: data.users?.role || 'Unknown',
      company_name: data.company_name,
      visited_at: data.visited_at,
      latitude: data.latitude,
      longitude: data.longitude,
      photo_url: data.photo_url,
      created_at: data.created_at,
    };

    return res.json(formatted);
  } catch (err) {
    console.error('GET /admin/visits/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
