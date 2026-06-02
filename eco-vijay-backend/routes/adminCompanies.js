const express = require('express');
const supabase = require('../supabase');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const DEMO_ADMIN_ID = 'demo-admin-0000-0000-0000-000000000001';

const DEMO_COMPANIES = [
  {
    id: 'comp-0001-0000-0000-000000000001',
    name: 'GreenTech Industries', mobile: '9876543210', pibo: 'Rajesh Sharma',
    gst: '27AABCU9603R1ZX', pan: 'AABCU9603R', address: '12, MIDC Industrial Area',
    city: 'Pune', pincode: '411019', state: 'Maharashtra',
    latitude: 18.5204, longitude: 73.8567,
    company_type: 'Producer', industry: 'Electronics', company_status: 'Active',
    website: '', logo_url: '', lead_status: 'Interested',
  },
  {
    id: 'comp-0002-0000-0000-000000000002',
    name: 'EcoPlast Solutions', mobile: '9123456780', pibo: 'Priya Mehta',
    gst: '27AADCE2144L1Z5', pan: 'AADCE2144L', address: '45, Baner Road',
    city: 'Pune', pincode: '411045', state: 'Maharashtra',
    latitude: 18.5600, longitude: 73.7800,
    company_type: 'Importer', industry: 'Plastics', company_status: 'Active',
    website: '', logo_url: '', lead_status: 'New',
  },
  {
    id: 'comp-0003-0000-0000-000000000003',
    name: 'Bharat Batteries Ltd', mobile: '9988776655', pibo: 'Amit Verma',
    gst: '07AABCB1234M1ZA', pan: 'AABCB1234M', address: '78, Okhla Industrial Phase II',
    city: 'Delhi', pincode: '110020', state: 'Delhi',
    latitude: 28.5355, longitude: 77.2500,
    company_type: 'Brand Owner', industry: 'Battery', company_status: 'Active',
    website: '', logo_url: '', lead_status: 'Contacted',
  },
  {
    id: 'comp-0004-0000-0000-000000000004',
    name: 'SolarEdge Systems', mobile: '9871100223', pibo: 'Sunita Agarwal',
    gst: '06AABCS1234M2ZB', pan: 'AABCS1234M', address: '14, Sector 18',
    city: 'Noida', pincode: '201301', state: 'Uttar Pradesh',
    latitude: 28.5355, longitude: 77.3910,
    company_type: 'Producer', industry: 'Solar', company_status: 'Active',
    website: '', logo_url: '', lead_status: 'Converted',
  },
  {
    id: 'comp-0005-0000-0000-000000000005',
    name: 'TechRecycle Corp', mobile: '9741122334', pibo: 'Vijay Nair',
    gst: '29AABCT9876N1ZC', pan: 'AABCT9876N', address: '22, Electronics City',
    city: 'Bangalore', pincode: '560100', state: 'Karnataka',
    latitude: 12.8399, longitude: 77.6770,
    company_type: 'Recycler', industry: 'E-Waste', company_status: 'Active',
    website: '', logo_url: '', lead_status: 'Lost',
  },
];

// GET /admin/companies
router.get('/', adminAuth, async (req, res) => {
  if (req.admin.id === DEMO_ADMIN_ID) {
    let companies = [...DEMO_COMPANIES];
    const { search } = req.query;
    if (search) {
      const q = search.toLowerCase();
      companies = companies.filter(c =>
        c.name.toLowerCase().includes(q) || (c.pibo || '').toLowerCase().includes(q)
      );
    }
    return res.json(companies);
  }

  try {
    const { search } = req.query;
    let query = supabase.from('companies').select('*');
    if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('GET /admin/companies error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /admin/companies/:id — update lead_status and/or notes
router.patch('/:id', adminAuth, async (req, res) => {
  const { lead_status, notes } = req.body;

  if (req.admin.id === DEMO_ADMIN_ID) {
    const company = DEMO_COMPANIES.find(c => c.id === req.params.id) || { id: req.params.id };
    return res.json({ ...company, lead_status: lead_status ?? company.lead_status, notes });
  }

  try {
    const updates = { updated_at: new Date().toISOString() };
    if (lead_status !== undefined) updates.lead_status = lead_status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    console.error('PATCH /admin/companies/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
