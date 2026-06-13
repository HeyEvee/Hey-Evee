// api/airtable.js
// Checks membership status AND handles password set/get

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  // PATCH — update profile fields in Airtable
  if (req.method === 'PATCH') {
    let body2 = req.body;
    if (typeof body2 === 'string') { try { body2 = JSON.parse(body2); } catch(e) { body2 = {}; } }
    const { email: patchEmail, fields: patchFields } = body2 || {};
    if (!patchEmail || !patchFields) return res.status(400).json({ error: 'Email and fields required' });
    const token2 = process.env.AIRTABLE_TOKEN;
    const BASE2 = 'appZtgVfaI0Xlkqau';
    const TABLE2 = 'tblS1ezJBCcfPOttZ';
    try {
      const formula2 = encodeURIComponent('LOWER({email})="' + patchEmail.toLowerCase() + '"');
      const find2 = await fetch('https://api.airtable.com/v0/' + BASE2 + '/' + TABLE2 + '?filterByFormula=' + formula2 + '&maxRecords=1', { headers: { 'Authorization': 'Bearer ' + token2 } });
      const found2 = await find2.json();
      if (!found2.records || !found2.records.length) return res.status(404).json({ error: 'Member not found' });
      const rec2 = found2.records[0];
      // Only update allowed profile fields
      const allowed = ['name','niche','bio','instagram','tiktok','youtube','username','followers'];
      const safeFields = {};
      allowed.forEach(function(k){ if(patchFields[k] !== undefined) safeFields[k] = patchFields[k]; });
      await fetch('https://api.airtable.com/v0/' + BASE2 + '/' + TABLE2 + '/' + rec2.id, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token2, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: safeFields })
      });
      return res.status(200).json({ success: true });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { email, setPassword } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const token   = process.env.AIRTABLE_TOKEN;
  const BASE_ID = 'appZtgVfaI0Xlkqau';
  const TABLE   = 'tblS1ezJBCcfPOttZ';

  try {
    const formula  = encodeURIComponent('LOWER({email})=LOWER("' + email.trim() + '")');
    const checkRes = await fetch(
      'https://api.airtable.com/v0/' + BASE_ID + '/' + TABLE + '?filterByFormula=' + formula + '&maxRecords=1',
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    const data = await checkRes.json();

    if (!data.records || data.records.length === 0) {
      return res.status(200).json({ plan: 'starter', status: 'active', name: '', password: '' });
    }

    const record = data.records[0];
    const fields = record.fields || {};

    // If setPassword provided, update it in Airtable
    if (setPassword) {
      await fetch(
        'https://api.airtable.com/v0/' + BASE_ID + '/' + TABLE + '/' + record.id,
        {
          method: 'PATCH',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { password: setPassword } })
        }
      );
    }

    return res.status(200).json({
      plan:      fields.plan      || 'starter',
      status:    fields.status    || 'active',
      name:      fields.name      || '',
      password:  fields.password  || '',
      niche:     fields.niche     || '',
      bio:       fields.bio       || '',
      instagram: fields.instagram || '',
      tiktok:    fields.tiktok    || '',
      youtube:   fields.youtube   || '',
      username:  fields.username  || '',
      followers: fields.followers || '',
      stage:     fields.stage     || '',
      goal:      fields.goal      || ''
    });

  } catch (err) {
    console.error('Airtable error:', err.message);
    return res.status(200).json({ plan: 'starter', status: 'active', name: '', password: '' });
  }
}
