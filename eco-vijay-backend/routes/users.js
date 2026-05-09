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
      name: 'Demo User',
      email: 'demo@ecovijay.com',
      phone: '9999999999',
      role: 'admin',
      created_at: new Date().toISOString(),
    });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, created_at')
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

module.exports = router;
