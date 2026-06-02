// FIXED: Created missing leads route — PATCH /leads/:id
const express = require('express');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const DEMO_ID = 'demo-0000-0000-0000-000000000000';

const VALID_STATUSES = ['New', 'Prospect', 'Contacted', 'Interested', 'Negotiation', 'Closed', 'Lost'];

// PATCH /leads/:id — update lead_status and/or notes for a lead
router.patch('/:id', authMiddleware, async (req, res) => {
  const { lead_status, notes, value } = req.body;

  if (lead_status !== undefined && !VALID_STATUSES.includes(lead_status)) {
    return res.status(400).json({ error: `lead_status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const updates = { updated_at: new Date().toISOString() };
  if (lead_status !== undefined) updates.lead_status = lead_status;
  if (notes !== undefined) updates.notes = notes;
  if (value !== undefined) updates.value = value;

  if (Object.keys(updates).length === 1) {
    return res.status(400).json({ error: 'No fields to update. Provide lead_status, notes, or value.' });
  }

  if (req.user.id === DEMO_ID) {
    return res.json({ id: req.params.id, ...updates });
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Lead not found' });
      throw error;
    }
    return res.json(data);
  } catch (err) {
    console.error('PATCH /leads/:id error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /leads — returns leads for authenticated user
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.id === DEMO_ID) {
    return res.json([]);
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*, companies(name)')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('GET /leads error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
