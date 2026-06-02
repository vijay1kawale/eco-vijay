const jwt = require('jsonwebtoken');

// FIXED: now reads from Authorization: Bearer header OR admin_token cookie, in that order
module.exports = function adminAuth(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

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
