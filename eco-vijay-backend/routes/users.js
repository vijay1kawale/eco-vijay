const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /users/me — current user profile
router.get('/me', authMiddleware, async (req, res) => {
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
