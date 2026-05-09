const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /companies — all companies, optional ?search=
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    let query = supabase.from('companies').select('*');

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('GET /companies error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /companies/nearby — requires ?lat=&lng=&radius= (radius in km)
router.get('/nearby', authMiddleware, async (req, res) => {
  const { lat, lng, radius = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  try {
    const { data, error } = await supabase.rpc('nearby_companies', {
      user_lat: parseFloat(lat),
      user_lng: parseFloat(lng),
      radius_km: parseFloat(radius),
    });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('GET /companies/nearby error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /companies/:id — single company
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*, leads(*)')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Company not found' });

    return res.json(data);
  } catch (err) {
    console.error('GET /companies/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
