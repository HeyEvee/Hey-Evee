// api/password-reset.js
// Receives email, generates reset token, stores in Airtable, sends email via Resend

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const airtableToken = process.env.AIRTABLE_TOKEN;
  const resendKey     = process.env.RESEND_API_KEY;
  const BASE_ID       = 'appZtgVfaI0Xlkqau';
  const TABLE_ID      = 'tblS1ezJBCcfPOttZ';

  try {
    // 1. Find member by email
    const formula  = encodeURIComponent('LOWER({email})=LOWER("' + email.trim() + '")');
    const checkRes = await fetch(
      'https://api.airtable.com/v0/' + BASE_ID + '/' + TABLE_ID + '?filterByFormula=' + formula + '&maxRecords=1',
      { headers: { 'Authorization': 'Bearer ' + airtableToken } }
    );
    const checkData = await checkRes.json();

    // Always return success even if email not found (security best practice)
    if (!checkData.records || checkData.records.length === 0) {
      return res.status(200).json({ success: true });
    }

    const record = checkData.records[0];

    // 2. Generate a secure token + expiry (1 hour from now)
    const token   = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiry  = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 3. Store token in Airtable
    await fetch(
      'https://api.airtable.com/v0/' + BASE_ID + '/' + TABLE_ID + '/' + record.id,
      {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + airtableToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { reset_token: token, reset_expiry: expiry } })
      }
    );

    // 4. Send reset email via Resend
    const resetUrl = 'https://app.tryheyevie.com/reset?token=' + token;
    const firstName = (record.fields && record.fields.name) ? record.fields.name.split(' ')[0] : 'Mama';

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f5ede8;font-family:Helvetica,Arial,sans-serif">'
      + '<div style="max-width:520px;margin:0 auto;padding:32px 16px">'
      + '<div style="text-align:center;margin-bottom:20px"><p style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#1a0d08;margin:0">Hey Evie</p></div>'
      + '<div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(26,13,8,.08)">'
      + '<div style="background:linear-gradient(135deg,#c4614a,#d4507a);padding:28px 24px;text-align:center">'
      + '<p style="font-family:Georgia,serif;font-size:22px;color:#fff;margin:0">Reset Your Password</p>'
      + '</div>'
      + '<div style="padding:28px 24px">'
      + '<p style="font-size:15px;color:#3a1e14;line-height:1.7;margin:0 0 16px">Hey ' + firstName + '! No worries — it happens to the best of us. Click the button below to set a new password.</p>'
      + '<div style="text-align:center;margin:24px 0">'
      + '<a href="' + resetUrl + '" style="display:inline-block;background:linear-gradient(135deg,#c4614a,#d4507a);color:#fff;font-size:15px;font-weight:800;text-decoration:none;border-radius:24px;padding:14px 36px">Reset My Password</a>'
      + '</div>'
      + '<p style="font-size:12px;color:#9a7060;text-align:center;line-height:1.6;margin:0">This link expires in 1 hour.<br/>If you did not request this, just ignore this email — your account is safe.</p>'
      + '</div></div>'
      + '<div style="text-align:center;padding:16px 0"><p style="font-size:11px;color:#b09080;margin:0">Hey Evie &bull; <a href="mailto:heyevie@tryheyevie.com" style="color:#c4614a;text-decoration:none">heyevie@tryheyevie.com</a></p></div>'
      + '</div></body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Simone at Hey Evie <heyevie@tryheyevie.com>',
        to:      [email.trim()],
        subject: 'Reset your Hey Evie password',
        html:    html
      })
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Password reset error:', err.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
