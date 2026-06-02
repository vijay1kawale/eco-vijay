const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');

const CSV_FILE = path.join(__dirname, 'companies.csv');

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = [];
    let cur = '', inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] || null);
    return obj;
  });
}

async function run() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error('companies.csv not found in backend folder');
    process.exit(1);
  }

  const rows = parseCSV(fs.readFileSync(CSV_FILE, 'utf8'));
  console.log(`Parsed ${rows.length} rows`);

  // Get admin user id for leads
  const { data: users } = await supabase.from('users').select('id').eq('role', 'admin').limit(1);
  const adminId = users?.[0]?.id;

  let inserted = 0, failed = 0;

  for (const row of rows) {
    // Insert company
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({
        name:           row.name,
        mobile:         row.mobile,
        pibo:           row.pibo,
        gst:            row.gst,
        pan:            row.pan,
        address:        row.address,
        city:           row.city,
        pincode:        row.pincode,
        state:          row.state,
        company_type:   row.company_type,
        industry:       row.industry,
        company_status: row.company_status,
      })
      .select('id')
      .single();

    if (compErr) {
      console.error(`Failed: ${row.name} —`, compErr.message);
      failed++;
      continue;
    }

    // Insert lead if we have an admin user
    if (adminId && (row.lead_status || row.value)) {
      await supabase.from('leads').insert({
        company_id:  company.id,
        user_id:     adminId,
        lead_status: row.lead_status || 'Prospect',
        value:       row.value ? parseFloat(row.value) : null,
      });
    }

    inserted++;
    process.stdout.write(`\r✓ ${inserted} inserted`);
  }

  console.log(`\nDone: ${inserted} inserted, ${failed} failed`);
}

run().catch(console.error);
