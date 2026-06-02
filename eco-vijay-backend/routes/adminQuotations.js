const express = require('express');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000001';

const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();

const DEMO_QUOTATIONS = [
  { id: 'q001', company_name: 'GreenTech Industries', agent_name: 'Rahul Sharma', service_type: 'Plastic EPR Registration', price: 25000, sent_via: ['whatsapp'], status: 'sent', sent_at: ago(1) },
  { id: 'q002', company_name: 'EcoPlast Solutions',   agent_name: 'Priya Mehta',  service_type: 'E-Waste EPR Registration', price: 18000, sent_via: ['email', 'whatsapp'], status: 'sent', sent_at: ago(2) },
  { id: 'q003', company_name: 'Bharat Batteries Ltd', agent_name: 'Sunita Patel', service_type: 'Battery EPR Compliance',  price: 32000, sent_via: ['email'], status: 'sent', sent_at: ago(3) },
  { id: 'q004', company_name: 'EcoPlast Solutions',   agent_name: 'Deepak Joshi', service_type: 'Tyre EPR Registration',    price: 14500, sent_via: ['sms'],   status: 'sent', sent_at: ago(5) },
  { id: 'q005', company_name: 'GreenTech Industries', agent_name: 'Kavita Singh', service_type: 'Plastic EPR Registration', price: 27000, sent_via: ['email'], status: 'sent', sent_at: ago(7) },
  { id: 'q006', company_name: 'Bharat Batteries Ltd', agent_name: 'Rahul Sharma', service_type: 'E-Waste EPR Registration', price: 21000, sent_via: ['whatsapp'], status: 'sent', sent_at: ago(10) },
  { id: 'q007', company_name: 'EcoPlast Solutions',   agent_name: 'Priya Mehta',  service_type: 'Battery EPR Compliance',  price: 35000, sent_via: ['email'], status: 'sent', sent_at: ago(12) },
];

// GET /admin/quotations
router.get('/', adminAuth, async (req, res) => {
  if (req.admin.id === DEMO_ADMIN_ID) {
    let rows = [...DEMO_QUOTATIONS];
    const { search, service_type, from, to } = req.query;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.company_name.toLowerCase().includes(q) || r.agent_name.toLowerCase().includes(q));
    }
    if (service_type) rows = rows.filter(r => r.service_type === service_type);
    if (from) rows = rows.filter(r => r.sent_at >= from);
    if (to) rows = rows.filter(r => r.sent_at <= to);
    return res.json(rows);
  }

  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, companies(name), users(name)')
      .order('sent_at', { ascending: false });
    if (error) throw error;

    const rows = (data || []).map(r => ({
      ...r,
      company_name: r.companies?.name || 'Unknown',
      agent_name: r.users?.name || 'Unknown',
    }));
    return res.json(rows);
  } catch (err) {
    console.error('GET /admin/quotations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
