// FIXED: Excel import/export routes for users and companies
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000001';

// Multer: store upload in memory so we can parse with XLSX
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────

// GET /admin/users/template — blank Excel template for user import
router.get('/users/template', adminAuth, (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['full_name', 'email', 'phone', 'role', 'password'],
    ['John Doe', 'john@example.com', '9876543210', 'field_agent', 'changeme123'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="user_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});

// POST /admin/users/import — upload Excel, create users
router.post('/users/import', adminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const required = ['full_name', 'email', 'role'];
  const errors = [];
  const created = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const missing = required.filter(k => !row[k]);
    if (missing.length > 0) {
      errors.push(`Row ${rowNum}: missing columns — ${missing.join(', ')}`);
      continue;
    }

    const validRoles = ['field_agent', 'manager', 'admin', 'hr', 'office_user'];
    if (!validRoles.includes(row.role)) {
      errors.push(`Row ${rowNum}: invalid role "${row.role}" — must be one of ${validRoles.join(', ')}`);
      continue;
    }

    if (req.admin.id === DEMO_ADMIN_ID) {
      created.push({ name: row.full_name, email: row.email });
      continue;
    }

    try {
      const password = row.password || 'changeme123';
      const hash = await bcrypt.hash(password, 10);
      const { error } = await supabase.from('users').insert({
        name: row.full_name,
        email: String(row.email).toLowerCase().trim(),
        phone: row.phone || '',
        role: row.role,
        password_hash: hash,
        is_active: true,
      });
      if (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      } else {
        created.push({ name: row.full_name, email: row.email });
      }
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err.message}`);
    }
  }

  return res.json({ success: created.length, errors });
});

// GET /admin/users/export — all users as Excel download
router.get('/users/export', adminAuth, async (req, res) => {
  let users = [];

  if (req.admin.id === DEMO_ADMIN_ID) {
    users = [
      { 'Full Name': 'Rahul Sharma', Email: 'rahul@ecovijay.com', Phone: '9876543210', Role: 'field_agent', Status: 'Active', 'Date Joined': '2024-12-22' },
    ];
  } else {
    const { data, error } = await supabase.from('users')
      .select('name, email, phone, role, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    users = (data || []).map(u => ({
      'Full Name': u.name,
      Email: u.email,
      Phone: u.phone || '',
      Role: u.role,
      Status: u.is_active ? 'Active' : 'Inactive',
      'Date Joined': u.created_at ? u.created_at.split('T')[0] : '',
    }));
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(users);
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="EcoVijay_Users.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});

// ─────────────────────────────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────────────────────────────

// GET /admin/companies/template — blank Excel template for company import
router.get('/companies/template', adminAuth, (req, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['name', 'address', 'city', 'state', 'industry', 'gst', 'company_status', 'latitude', 'longitude'],
    ['Example Corp', '123 MG Road', 'Mumbai', 'Maharashtra', 'Electronics', '27AABCE1234F1ZX', 'Active', '19.0760', '72.8777'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Companies');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="company_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});

// POST /admin/companies/import — upload Excel, create companies
router.post('/companies/import', adminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const errors = [];
  const created = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.name) {
      errors.push(`Row ${rowNum}: name is required`);
      continue;
    }

    if (req.admin.id === DEMO_ADMIN_ID) {
      created.push({ name: row.name });
      continue;
    }

    try {
      const { error } = await supabase.from('companies').insert({
        name: row.name,
        address: row.address || null,
        city: row.city || null,
        state: row.state || null,
        industry: row.industry || null,
        gst: row.gst || null,
        company_status: row.company_status || 'Active',
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
      });
      if (error) {
        errors.push(`Row ${rowNum}: ${error.message}`);
      } else {
        created.push({ name: row.name });
      }
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err.message}`);
    }
  }

  return res.json({ success: created.length, errors });
});

// GET /admin/companies/export — all companies as Excel download
router.get('/companies/export', adminAuth, async (req, res) => {
  let companies = [];

  if (req.admin.id === DEMO_ADMIN_ID) {
    companies = [{ Name: 'GreenTech Industries', City: 'Pune', State: 'Maharashtra', Industry: 'Electronics', Status: 'Active' }];
  } else {
    const { data, error } = await supabase.from('companies')
      .select('name, address, city, state, industry, gst, company_status, latitude, longitude, created_at')
      .order('name');
    if (error) return res.status(500).json({ error: error.message });
    companies = (data || []).map(c => ({
      Name: c.name,
      Address: c.address || '',
      City: c.city || '',
      State: c.state || '',
      Industry: c.industry || '',
      GST: c.gst || '',
      Status: c.company_status || '',
      Latitude: c.latitude || '',
      Longitude: c.longitude || '',
      'Date Added': c.created_at ? c.created_at.split('T')[0] : '',
    }));
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(companies);
  XLSX.utils.book_append_sheet(wb, ws, 'Companies');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="EcoVijay_Companies.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});

// ─────────────────────────────────────────────────────────────────────
// QUOTATIONS EXPORT
// ─────────────────────────────────────────────────────────────────────

// GET /admin/quotations/export — all quotations as Excel download
router.get('/quotations/export', adminAuth, async (req, res) => {
  let quotations = [];

  if (req.admin.id !== DEMO_ADMIN_ID) {
    const { data, error } = await supabase.from('quotations')
      .select('service_type, price, sent_at, notes, users(name), companies(name)')
      .order('sent_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    quotations = (data || []).map(q => ({
      Agent: q.users?.name || '',
      Company: q.companies?.name || '',
      'Service Type': q.service_type,
      'Price (₹)': q.price,
      Notes: q.notes || '',
      'Sent At': q.sent_at ? q.sent_at.split('T')[0] : '',
    }));
  } else {
    quotations = [{ Agent: 'Rahul Sharma', Company: 'GreenTech', 'Service Type': 'Plastic EPR', 'Price (₹)': 25000, Notes: '', 'Sent At': '2026-05-20' }];
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(quotations);
  XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="EcoVijay_Quotations.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return res.send(buf);
});

module.exports = router;
