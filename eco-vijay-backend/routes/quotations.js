const express = require('express');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const supabase = require('../supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Clients are initialised lazily so the server starts even with placeholder credentials
function getSgMail() {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  return sgMail;
}

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// POST /quotations — create and send quotation
router.post('/', authMiddleware, async (req, res) => {
  const { company_id, service_type, price, notes, sent_via } = req.body;

  if (!company_id || !service_type || !price || !sent_via || !Array.isArray(sent_via)) {
    return res.status(400).json({ error: 'company_id, service_type, price, and sent_via are required' });
  }

  try {
    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Insert quotation record
    const { data: quotation, error: insertError } = await supabase
      .from('quotations')
      .insert({
        company_id,
        user_id: req.user.id,
        service_type,
        price: parseFloat(price),
        notes: notes || '',
        sent_via,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const quotationText = buildQuotationText(company, service_type, price, notes, req.user.name);
    const errors = [];

    // Send Email
    if (sent_via.includes('email') && company.email) {
      try {
        await getSgMail().send({
          to: company.email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: `EPR Compliance Quotation — ${service_type}`,
          text: quotationText,
          html: `<pre style="font-family: Arial, sans-serif;">${quotationText}</pre>`,
        });
      } catch (emailErr) {
        console.error('SendGrid error:', emailErr.message);
        errors.push('email');
      }
    }

    // Send WhatsApp
    if (sent_via.includes('whatsapp') && company.mobile) {
      try {
        await getTwilioClient().messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM,
          to: `whatsapp:+91${company.mobile}`,
          body: quotationText,
        });
      } catch (waErr) {
        console.error('Twilio WhatsApp error:', waErr.message);
        errors.push('whatsapp');
      }
    }

    // Send SMS
    if (sent_via.includes('sms') && company.mobile) {
      try {
        await getTwilioClient().messages.create({
          from: process.env.TWILIO_SMS_FROM,
          to: `+91${company.mobile}`,
          body: quotationText.substring(0, 1600),
        });
      } catch (smsErr) {
        console.error('Twilio SMS error:', smsErr.message);
        errors.push('sms');
      }
    }

    return res.status(201).json({
      quotation,
      send_errors: errors.length > 0 ? errors : null,
    });
  } catch (err) {
    console.error('POST /quotations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /quotations/sent — all quotations for current user
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, companies(name)')
      .eq('user_id', req.user.id)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error('GET /quotations/sent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function buildQuotationText(company, serviceType, price, notes, agentName) {
  return `
Dear ${company.pibo || company.name},

We are pleased to present our EPR compliance quotation for your organisation.

Company: ${company.name}
Service: ${serviceType}
Quotation Amount: ₹${parseFloat(price).toLocaleString('en-IN')}
${notes ? `Notes: ${notes}` : ''}

Our team at Eco-Vijay is committed to ensuring your full compliance with Extended Producer Responsibility (EPR) regulations.

Please feel free to contact us for any queries.

Warm regards,
${agentName}
Eco-Vijay Compliance Services
  `.trim();
}

module.exports = router;
