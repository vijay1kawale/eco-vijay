const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const DEMO_ID = 'demo-0000-0000-0000-000000000000';

// City-level coordinate fallbacks for companies without GPS coordinates
const CITY_COORDS = {
  'nagpur':           { lat: 21.1458, lng: 79.0882 },
  'pune':             { lat: 18.5204, lng: 73.8567 },
  'mumbai':           { lat: 19.0760, lng: 72.8777 },
  'mumbai suburban':  { lat: 19.0760, lng: 72.8777 },
  'palghar':          { lat: 19.6967, lng: 72.7697 },
  'thane':            { lat: 19.2183, lng: 72.9781 },
  'nashik':           { lat: 20.0059, lng: 73.7903 },
  'aurangabad':       { lat: 19.8762, lng: 75.3433 },
  'kolhapur':         { lat: 16.7050, lng: 74.2433 },
  'solapur':          { lat: 17.6599, lng: 75.9064 },
  'navi mumbai':      { lat: 19.0330, lng: 73.0297 },
  'delhi':            { lat: 28.6139, lng: 77.2090 },
  'new delhi':        { lat: 28.6139, lng: 77.2090 },
  'bangalore':        { lat: 12.9716, lng: 77.5946 },
  'bengaluru':        { lat: 12.9716, lng: 77.5946 },
  'hyderabad':        { lat: 17.3850, lng: 78.4867 },
  'chennai':          { lat: 13.0827, lng: 80.2707 },
  'kolkata':          { lat: 22.5726, lng: 88.3639 },
  'ahmedabad':        { lat: 23.0225, lng: 72.5714 },
  'surat':            { lat: 21.1702, lng: 72.8311 },
  'jaipur':           { lat: 26.9124, lng: 75.7873 },
  'lucknow':          { lat: 26.8467, lng: 80.9462 },
  'indore':           { lat: 22.7196, lng: 75.8577 },
  'bhopal':           { lat: 23.2599, lng: 77.4126 },
  'chandigarh':       { lat: 30.7333, lng: 76.7794 },
  'patna':            { lat: 25.5941, lng: 85.1376 },
  'coimbatore':       { lat: 11.0168, lng: 76.9558 },
  'vadodara':         { lat: 22.3072, lng: 73.1812 },
};

function resolveCoords(company) {
  if (company.latitude != null && company.longitude != null) {
    return { lat: Number(company.latitude), lng: Number(company.longitude) };
  }
  const key = (company.city || '').toLowerCase().trim();
  return CITY_COORDS[key] || null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function enrichCompany(c) {
  const coords = resolveCoords(c);
  return {
    ...c,
    latitude:  c.latitude  ?? coords?.lat ?? null,
    longitude: c.longitude ?? coords?.lng ?? null,
  };
}

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
    return res.json(data.map(enrichCompany));
  } catch (err) {
    console.error('GET /companies error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /companies/nearby?lat=&lng=&radius=70
router.get('/nearby', authMiddleware, async (req, res) => {
  if (req.user.id === DEMO_ID) {
    return res.json(DEMO_COMPANIES);
  }

  const { lat, lng, radius = 70 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseFloat(radius);

  try {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) throw error;

    const nearby = data
      .map(c => {
        const coords = resolveCoords(c);
        if (!coords) return null;
        const dist = haversineKm(userLat, userLng, coords.lat, coords.lng);
        if (dist > radiusKm) return null;
        return {
          ...c,
          latitude:    c.latitude  ?? coords.lat,
          longitude:   c.longitude ?? coords.lng,
          distance_km: Math.round(dist * 10) / 10,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance_km - b.distance_km);

    return res.json(nearby);
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
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (compErr) throw compErr;
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', req.params.id);

    return res.json({ ...enrichCompany(company), leads: leads || [] });
  } catch (err) {
    console.error('GET /companies/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /companies/:id — update lead_status and/or notes
router.patch('/:id', authMiddleware, async (req, res) => {
  const { lead_status, notes } = req.body;
  const updates = {};
  if (lead_status !== undefined) updates.lead_status = lead_status;
  if (notes !== undefined) updates.notes = notes;
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length === 1) {
    // Only updated_at was set — nothing to change
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    console.error('PATCH /companies/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
