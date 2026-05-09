const express = require('express');
const axios = require('axios');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /geocode/batch — admin-only, geocodes companies missing lat/lng
router.post('/batch', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin role required' });
  }

  try {
    // Fetch companies with missing lat/lng
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name, address, city, state, pincode')
      .or('latitude.is.null,longitude.is.null');

    if (error) throw error;
    if (!companies || companies.length === 0) {
      return res.json({ message: 'All companies already have coordinates', updated: 0 });
    }

    let updated = 0;
    const failures = [];

    for (const company of companies) {
      try {
        const addressQuery = [
          company.address,
          company.city,
          company.state,
          company.pincode,
          'India',
        ]
          .filter(Boolean)
          .join(', ');

        const geoRes = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address: addressQuery,
            key: process.env.GOOGLE_GEOCODING_API_KEY,
          },
        });

        if (
          geoRes.data.status === 'OK' &&
          geoRes.data.results &&
          geoRes.data.results.length > 0
        ) {
          const location = geoRes.data.results[0].geometry.location;

          const { error: updateError } = await supabase
            .from('companies')
            .update({ latitude: location.lat, longitude: location.lng })
            .eq('id', company.id);

          if (updateError) throw updateError;
          updated++;
        } else {
          failures.push({ id: company.id, name: company.name, status: geoRes.data.status });
        }

        // Respect Google Geocoding API rate limit
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (companyErr) {
        console.error(`Geocode failed for company ${company.id}:`, companyErr.message);
        failures.push({ id: company.id, name: company.name, error: companyErr.message });
      }
    }

    return res.json({ updated, failures });
  } catch (err) {
    console.error('POST /geocode/batch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
