const express = require('express');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const DEMO_ID = 'demo-0000-0000-0000-000000000000';

const DEMO_QUOTATIONS = [
  {
    id: 'quot-0001-0000-0000-000000000001',
    company_id: 'comp-0001-0000-0000-000000000001',
    user_id: DEMO_ID,
    service_type: 'Plastic EPR Registration',
    price: 25000,
    notes: 'Includes annual filing',
    sent_via: ['whatsapp'],
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    status: 'sent',
    companies: { name: 'GreenTech Industries' },
  },
  {
    id: 'quot-0002-0000-0000-000000000002',
    company_id: 'comp-0002-0000-0000-000000000002',
    user_id: DEMO_ID,
    service_type: 'E-Waste EPR Registration',
    price: 18000,
    notes: '',
    sent_via: ['email', 'whatsapp'],
    sent_at: new Date(Date.now() - 172800000).toISOString(),
    status: 'sent',
    companies: { name: 'EcoPlast Solutions' },
  },
];

function getSgMail() {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  return sgMail;
}

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// POST /quotations
router.post('/', authMiddleware, async (req, res) => {
  const { company_id, service_type, price, notes, sent_via } = req.body;
  if (!company_id || !service_type || !price || !sent_via || !Array.isArray(sent_via)) {
    return res.status(400).json({ error: 'company_id, service_type, price, and sent_via are required' });
  }

  if (req.user.id === DEMO_ID) {
    return res.status(201).json({
      quotation: {
        id: `quot-demo-${Date.now()}`,
        company_id, user_id: DEMO_ID, service_type,
        price: parseFloat(price), notes: notes || '',
        sent_via, sent_at: new Date().toISOString(), status: 'sent',
      },
      send_errors: null,
    });
  }

  try {
    const { data: company, error: companyError } = await supabase
      .from('companies').select('*').eq('id', company_id).single();
    if (companyError || !company) return res.status(404).json({ error: 'Company not found' });

    const { data: quotation, error: insertError } = await supabase
      .from('quotations')
      .insert({ company_id, user_id: req.user.id, service_type, price: parseFloat(price), notes: notes || '', sent_via, sent_at: new Date().toISOString(), status: 'sent' })
      .select().single();
    if (insertError) throw insertError;

    const quotationText = buildQuotationText(company, service_type, price, notes, req.user.name);
    const errors = [];

    if (sent_via.includes('email') && company.email) {
      try {
        await getSgMail().send({ to: company.email, from: process.env.SENDGRID_FROM_EMAIL, subject: `EPR Compliance Quotation — ${service_type}`, text: quotationText, html: `<pre>${quotationText}</pre>` });
      } catch (e) { console.error('SendGrid error:', e.message); errors.push('email'); }
    }
    if (sent_via.includes('whatsapp') && company.mobile) {
      try {
        await getTwilioClient().messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: `whatsapp:+91${company.mobile}`, body: quotationText });
      } catch (e) { console.error('Twilio WhatsApp error:', e.message); errors.push('whatsapp'); }
    }
    if (sent_via.includes('sms') && company.mobile) {
      try {
        await getTwilioClient().messages.create({ from: process.env.TWILIO_SMS_FROM, to: `+91${company.mobile}`, body: quotationText.substring(0, 1600) });
      } catch (e) { console.error('Twilio SMS error:', e.message); errors.push('sms'); }
    }

    return res.status(201).json({ quotation, send_errors: errors.length > 0 ? errors : null });
  } catch (err) {
    console.error('POST /quotations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /quotations/sent
router.get('/sent', authMiddleware, async (req, res) => {
  if (req.user.id === DEMO_ID) {
    return res.json(DEMO_QUOTATIONS);
  }

  try {
    const { data, error } = await supabase
      .from('quotations').select('*, companies(name)')
      .eq('user_id', req.user.id).order('sent_at', { ascending: false });
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('GET /quotations/sent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function buildQuotationText(company, serviceType, price, notes, agentName) {
  return `Dear ${company.pibo || company.name},

We are pleased to present our EPR compliance quotation for your organisation.

Company: ${company.name}
Service: ${serviceType}
Quotation Amount: ₹${parseFloat(price).toLocaleString('en-IN')}
${notes ? `Notes: ${notes}` : ''}

Our team at Eco-Vijay is committed to ensuring your full compliance with EPR regulations.

Warm regards,
${agentName}
Eco-Vijay Compliance Services`.trim();
}

module.exports = router;
