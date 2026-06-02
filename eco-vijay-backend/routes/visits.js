const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'visits');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.body.user_id || 'unknown');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `visit_${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /visits
// Creates a new visit record for a field user
// Body: { user_id, company_name, visited_at, latitude, longitude }
// File: optional photo (form field name: 'photo')
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', authMiddleware, upload.single('photo'), async (req, res) => {
  const { user_id, company_name, visited_at, latitude, longitude } = req.body;

  if (!user_id || !company_name || !visited_at) {
    return res.status(400).json({
      error: 'user_id, company_name, and visited_at are required',
    });
  }

  try {
    // Verify user exists and is a field user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build the visit record
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/visits/${user_id}/${req.file.filename}`;
    }

    const visitData = {
      user_id,
      company_name,
      visited_at,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      photo_url: photoUrl,
    };

    // Insert visit record
    const { data, error } = await supabase
      .from('visits')
      .insert(visitData)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (err) {
    // Clean up uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete temp file:', unlinkErr);
      });
    }
    console.error('POST /visits error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /visits
// Returns visits for a specific user (query param: user_id)
// Optional filters: date_from, date_to
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const { user_id, date_from, date_to } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id query parameter is required' });
  }

  try {
    let query = supabase
      .from('visits')
      .select('*')
      .eq('user_id', user_id)
      .order('visited_at', { ascending: false });

    if (date_from) {
      query = query.gte('visited_at', new Date(date_from).toISOString());
    }

    if (date_to) {
      query = query.lte('visited_at', new Date(date_to).toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json(data || []);
  } catch (err) {
    console.error('GET /visits error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /visits/:id
// Returns a specific visit by ID
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    return res.json(data);
  } catch (err) {
    console.error('GET /visits/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
