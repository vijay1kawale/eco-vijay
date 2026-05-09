const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const DEMO_ID = 'demo-0000-0000-0000-000000000000';

const DEMO_COMPANIES = [
  {
    id: 'comp-0001-0000-0000-000000000001',
    name: 'GreenTech Industries',
    mobile: '9876543210',
    pibo: 'Rajesh Sharma',
    gst: '27AABCU9603R1ZX',
    pan: 'AABCU9603R',
    address: '12, MIDC Industrial Area',
    city: 'Pune',
    pincode: '411019',
    state: 'Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
    company_type: 'Producer',
    industry: 'Electronics',
    company_status: 'Active',
    website: '',
    logo_url: '',
    lead_status: 'Interested',
    distance_km: 1.2,
  },
  {
    id: 'comp-0002-0000-0000-000000000002',
    name: 'EcoPlast Solutions',
    mobile: '9123456780',
    pibo: 'Priya Mehta',
    gst: '27AADCE2144L1Z5',
    pan: 'AADCE2144L',
    address: '45, Baner Road',
    city: 'Pune',
    pincode: '411045',
    state: 'Maharashtra',
    latitude: 18.5600,
    longitude: 73.7800,
    company_type: 'Importer',
    industry: 'Plastics',
    company_status: 'Active',
    website: '',
    logo_url: '',
    lead_status: 'New',
    distance_km: 3.5,
  },
  {
    id: 'comp-0003-0000-0000-000000000003',
    name: 'Bharat Batteries Ltd',
    mobile: '9988776655',
    pibo: 'Amit Verma',
    gst: '07AABCB1234M1ZA',
    pan: 'AABCB1234M',
    address: '78, Okhla Industrial Phase II',
    city: 'Delhi',
    pincode: '110020',
    state: 'Delhi',
    latitude: 28.5355,
    longitude: 77.2500,
    company_type: 'Brand Owner',
    industry: 'Battery',
    company_status: 'Active',
    website: '',
    logo_url: '',
    lead_status: 'Contacted',
    distance_km: 5.8,
  },
];

// GET /companies
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.id === DEMO_ID) {
    const { search } = req.query;
    const results = search
      ? DEMO_COMPANIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      : DEMO_COMPANIES;
    return res.json(results);
  }

  try {
    const { search } = req.query;
    let query = supabase.from('companies').select('*');
    if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('GET /companies error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /companies/nearby
router.get('/nearby', authMiddleware, async (req, res) => {
  if (req.user.id === DEMO_ID) {
    return res.json(DEMO_COMPANIES);
  }

  const { lat, lng, radius = 10 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

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

// GET /companies/:id
router.get('/:id', authMiddleware, async (req, res) => {
  if (req.user.id === DEMO_ID) {
    const company = DEMO_COMPANIES.find(c => c.id === req.params.id) || DEMO_COMPANIES[0];
    return res.json({ ...company, leads: [] });
  }

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
