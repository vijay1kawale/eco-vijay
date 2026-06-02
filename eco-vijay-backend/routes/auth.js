const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');

const router = express.Router();

const DEMO_USER = {
  id: 'demo-0000-0000-0000-000000000000',
  name: 'Demo Field Agent',
  email: 'demo@ecovijay.com',
  phone: '9999999999',
  role: 'field_agent',
  password: 'demo1234',
};

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Temporary demo login — remove once DB is set up
  if (email.toLowerCase().trim() === DEMO_USER.email && password === DEMO_USER.password) {
    const token = jwt.sign(
      { id: DEMO_USER.id, email: DEMO_USER.email, role: DEMO_USER.role, name: DEMO_USER.name },
      process.env.JWT_SECRET || 'demo-local-secret', // FIXED: fallback secret
      { expiresIn: '30d' }
    );
    return res.json({
      token,
      user: { id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email, phone: DEMO_USER.phone, role: DEMO_USER.role },
    });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (error) throw error;
    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // FIXED: check is_active before authenticating
    if (user.is_active === false) {
      return res.status(403).json({ error: 'Your account is deactivated. Please contact admin.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // FIXED: fallback JWT_SECRET + update last_login
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'demo-local-secret',
      { expiresIn: '30d' }
    );

    // FIXED: update last_login timestamp on successful login
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
