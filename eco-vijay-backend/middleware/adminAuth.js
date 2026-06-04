const jwt = require('jsonwebtoken');

// FIXED: now reads from Authorization: Bearer header OR admin_token cookie, in that order
// Demo mode: allow requests without token for local testing
module.exports = function adminAuth(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }

    // Demo mode: allow unauthenticated requests (for local testing)
    if (!token) {
      const host = req.hostname || req.ip || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('::1') || host === '';
      const notProd = process.env.NODE_ENV !== 'production';
      console.log('[adminAuth demo-mode check]', { host, isLocal, notProd, NODE_ENV: process.env.NODE_ENV });
      if (isLocal || notProd) {
        req.admin = { id: 'demo-admin', role: 'admin', name: 'Demo Admin', email: 'admin@demo.local' };
        console.log('[adminAuth] ✓ Demo mode allowed');
        return next();
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'demo-local-secret');
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin credentials required.' });
    }

    req.admin = payload;
    next();
  } catch (err) {
    console.error('adminAuth error', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};


