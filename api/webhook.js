// /api/webhook.js
// Stripe webhook - adds members to Airtable + sends welcome email

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const airtableToken = process.env.AIRTABLE_TOKEN;
  const resendKey     = process.env.RESEND_API_KEY;

  const BASE_ID  = 'appZtgVfaI0Xlkqau';
  const TABLE_ID = 'tblS1ezJBCcfPOttZ';

  const rawBody = await getRawBuffer(req);
  let event;

  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('Failed to parse webhook body:', err.message);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const type = event.type;
  console.log('Webhook received:', type);

  if (type === 'checkout.session.completed') {
    const session = event.data.object;
    const email   = (session.customer_details && session.customer_details.email) || session.customer_email;
    const name    = (session.customer_details && session.customer_details.name) || '';
    const custId  = session.customer || '';
    const amount  = session.amount_total;
    const plan    = amount >= 19700 ? 'vip' : 'starter';

    if (email) {
      await upsertMember(airtableToken, BASE_ID, TABLE_ID, {
        email, name, plan, status: 'active',
        stripe_id: custId,
        joined: new Date().toISOString().split('T')[0]
      });
      await sendWelcomeEmail(resendKey, email, name, plan);
      console.log('Member added + emailed:', email, 'as', plan);
    }
  }

  if (type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await updateMemberStatus(airtableToken, BASE_ID, TABLE_ID, sub.customer, 'cancelled');
    console.log('Member cancelled:', sub.customer);
  }

  return res.status(200).json({ received: true });
}

function getRawBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end',  ()    => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function sendWelcomeEmail(apiKey, email, name, plan) {
  if (!apiKey) { console.log('Resend not configured'); return; }

  const firstName = name ? name.split(' ')[0] : 'Mama';
  const isVip     = plan === 'vip';
  const planBadge = isVip ? 'Lifetime VIP Member' : 'Hey Evee Access Member';

  const vipExtras = isVip
    ? '<div style="background:linear-gradient(135deg,#1a0d08,#2e1208);border-radius:16px;padding:24px;margin:24px 0;text-align:center"><p style="font-size:11px;font-weight:900;color:rgba(201,150,58,.8);letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">You are a Founding Member</p><p style="font-family:Georgia,serif;font-size:20px;color:#fff;margin:0 0 8px;line-height:1.4">All 8 courses. The full Money Dashboard. VIP Inner Circle. Yours forever.</p><p style="font-size:12px;color:rgba(255,255,255,.45);margin:0">One payment. Lifetime access. Every future course included.</p></div>'
    : '<div style="background:#fdf8f5;border-radius:16px;padding:20px;margin:24px 0;border:1px solid rgba(196,97,74,.12)"><p style="font-size:13px;font-weight:700;color:#1a0d08;margin:0 0 6px">What you have access to right now:</p><p style="font-size:13px;color:#7a4a3a;line-height:1.7;margin:0">✓ Unlimited Evee AI chat<br/>✓ Courses 01 and 02 — CEO Mindset + Find Your Niche<br/>✓ Content Planner with weekly ideas<br/>✓ Mama Circle community<br/>✓ Affiliate platform directory</p><p style="font-size:12px;color:#c4614a;font-weight:700;margin:12px 0 0">Upgrade to Lifetime VIP anytime to unlock all 8 courses and every feature.</p></div>';

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f5ede8;font-family:Helvetica,Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px 16px"><div style="text-align:center;margin-bottom:24px"><p style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1a0d08;margin:0">Hey Evee</p><p style="font-size:11px;color:#b09080;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase">For creators who mean business</p></div><div style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(26,13,8,.08)"><div style="background:linear-gradient(135deg,#c4614a,#d4507a);padding:32px 28px;text-align:center"><p style="font-size:11px;font-weight:900;color:rgba(255,255,255,.7);letter-spacing:2px;text-transform:uppercase;margin:0 0 10px">' + planBadge + '</p><p style="font-family:Georgia,serif;font-size:28px;color:#fff;margin:0 0 8px;line-height:1.2">Welcome to the circle,<br/>' + firstName + '!</p><p style="font-size:14px;color:rgba(255,255,255,.75);margin:0;line-height:1.6">You just made one of the best decisions for your creator business.</p></div><div style="padding:28px"><p style="font-size:15px;color:#3a1e14;line-height:1.75;margin:0 0 20px">Hey ' + firstName + '! I am so excited you are here. I built Hey Evee because I was a mom of four figuring out content creation completely alone and I knew there had to be a better way. You are exactly who this was made for.</p>' + vipExtras + '<div style="background:linear-gradient(135deg,rgba(196,97,74,.06),rgba(212,80,122,.04));border-radius:16px;padding:20px;margin:0 0 24px;border:1px solid rgba(196,97,74,.12)"><p style="font-size:13px;font-weight:900;color:#c4614a;text-transform:uppercase;letter-spacing:1px;margin:0 0 14px">How to get started in 2 minutes</p><p style="font-size:13px;color:#3a1e14;line-height:1.9;margin:0"><strong>1.</strong> Go to <a href="https://app.heyevee.com" style="color:#c4614a;font-weight:700;text-decoration:none">app.heyevee.com</a><br/><strong>2.</strong> Click Create Account using <strong>this exact email address</strong><br/><strong>3.</strong> Tell Evee your niche and say hi</p></div><div style="background:#edf6f1;border-radius:12px;padding:14px 16px;margin:0 0 24px;border-left:4px solid #2a7a50"><p style="font-size:13px;color:#2a7a50;font-weight:700;margin:0">No access code needed. Your email is your key. Create your account and you are in automatically.</p></div><div style="text-align:center;margin:0 0 24px"><a href="https://app.heyevee.com" style="display:inline-block;background:linear-gradient(135deg,#c4614a,#d4507a);color:#fff;font-size:15px;font-weight:800;text-decoration:none;border-radius:26px;padding:14px 36px">Open Hey Evee</a></div><p style="font-size:13px;color:#9a7060;line-height:1.75;margin:0">I cannot wait to see what you build, ' + firstName + '. You already made the hardest decision. Now let Evee help you make it real.</p><p style="font-size:13px;color:#9a7060;margin:16px 0 0">With love,<br/><strong style="color:#1a0d08">Simone</strong><br/><span style="font-size:12px;color:#b09080">Founder, Hey Evee &bull; Mom of Four</span></p></div></div><div style="text-align:center;padding:20px 0"><p style="font-size:11px;color:#b09080;margin:0;line-height:1.8">&copy; 2026 Hey Evee &bull; <a href="https://heyevee.com" style="color:#b09080;text-decoration:none">heyevee.com</a><br/>Questions? <a href="mailto:hello@heyevee.com" style="color:#c4614a;text-decoration:none;font-weight:700">hello@heyevee.com</a></p></div></div></body></html>';

  const subject = isVip
    ? 'You are in ' + firstName + '! Your Lifetime VIP access is ready'
    : 'Welcome to Hey Evee ' + firstName + '! Your account is ready';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Simone at Hey Evee <hello@heyevee.com>',
        to:      [email],
        subject: subject,
        html:    html
      })
    });
    if (!response.ok) {
      console.error('Resend error:', await response.text());
    } else {
      console.log('Welcome email sent to', email);
    }
  } catch (err) {
    console.error('Email failed:', err.message);
  }
}

async function upsertMember(token, baseId, tableId, member) {
  if (!token) return;
  try {
    const formula   = encodeURIComponent('LOWER({email})=LOWER("' + member.email + '")');
    const checkUrl  = 'https://api.airtable.com/v0/' + baseId + '/' + tableId + '?filterByFormula=' + formula + '&maxRecords=1';
    const checkRes  = await fetch(checkUrl, { headers: { 'Authorization': 'Bearer ' + token } });
    const checkData = await checkRes.json();
    const fields    = { email: member.email, name: member.name, plan: member.plan, status: member.status, stripe_id: member.stripe_id, joined: member.joined };

    if (checkData.records && checkData.records.length > 0) {
      await fetch('https://api.airtable.com/v0/' + baseId + '/' + tableId + '/' + checkData.records[0].id, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
      });
    } else {
      await fetch('https://api.airtable.com/v0/' + baseId + '/' + tableId, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [{ fields }] })
      });
    }
  } catch (err) { console.error('Airtable error:', err.message); }
}

async function updateMemberStatus(token, baseId, tableId, stripeId, status) {
  if (!token || !stripeId) return;
  try {
    const formula   = encodeURIComponent('{stripe_id}="' + stripeId + '"');
    const checkUrl  = 'https://api.airtable.com/v0/' + baseId + '/' + tableId + '?filterByFormula=' + formula + '&maxRecords=1';
    const checkRes  = await fetch(checkUrl, { headers: { 'Authorization': 'Bearer ' + token } });
    const checkData = await checkRes.json();
    if (checkData.records && checkData.records.length > 0) {
      await fetch('https://api.airtable.com/v0/' + baseId + '/' + tableId + '/' + checkData.records[0].id, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { status } })
      });
    }
  } catch (err) { console.error('Airtable status error:', err.message); }
}
