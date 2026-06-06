<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<title>Reset Password — Hey Evee</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fdf8f5;font-family:'Nunito',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:24px;padding:36px 28px;width:100%;max-width:380px;box-shadow:0 12px 40px rgba(196,97,74,0.12);text-align:center}
.av{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#c4614a,#d4507a);display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.av span{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:#fff}
h1{font-family:'Playfair Display',serif;font-size:22px;color:#1a0d08;margin-bottom:6px}
.sub{font-size:13px;color:#9a7060;margin-bottom:22px;line-height:1.6}
input{width:100%;padding:12px 16px;background:#fff;border:1.5px solid rgba(196,97,74,0.2);border-radius:14px;font-size:14px;color:#1a0d08;outline:none;margin-bottom:10px;font-family:'Nunito',sans-serif;display:block}
input:focus{border-color:#c4614a}
.btn{width:100%;padding:14px;background:linear-gradient(135deg,#c4614a,#d4507a);color:#fff;border:none;border-radius:22px;font-size:14px;font-weight:900;font-family:'Nunito',sans-serif;cursor:pointer;margin-top:4px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.msg{font-size:13px;font-weight:700;margin:10px 0;padding:10px 14px;border-radius:12px}
.msg.success{background:#edf6f1;color:#2a7a50}
.msg.error{background:#fff5f5;color:#c04040}
.back{font-size:12px;color:#b09080;margin-top:14px;cursor:pointer}
.back a{color:#c4614a;font-weight:700;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="av"><span>E</span></div>
  <h1>Set New Password</h1>
  <p class="sub">Choose a strong password for your Hey Evee account.</p>
  <div id="msg" style="display:none" class="msg"></div>
  <div id="form-wrap">
    <input type="password" id="pw1" placeholder="New password (8+ chars, number, symbol)"/>
    <input type="password" id="pw2" placeholder="Confirm new password"/>
    <button class="btn" id="submit-btn" onclick="submitReset()">Update My Password</button>
  </div>
  <p class="back"><a href="https://tryheyevee.com">← Back to Hey Evee</a></p>
</div>

<script>
function getToken(){
  return new URLSearchParams(window.location.search).get('token') || '';
}

function showMsg(text, type){
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
}

async function submitReset(){
  var pw1 = document.getElementById('pw1').value;
  var pw2 = document.getElementById('pw2').value;
  var btn = document.getElementById('submit-btn');
  var token = getToken();

  if(!token){ showMsg('Invalid reset link. Please request a new one.', 'error'); return; }
  if(pw1.length < 8){ showMsg('Password must be at least 8 characters.', 'error'); return; }
  if(!/[0-9]/.test(pw1)){ showMsg('Password must include a number.', 'error'); return; }
  if(!/[^a-zA-Z0-9]/.test(pw1)){ showMsg('Password must include a symbol (!, @, #, etc.).', 'error'); return; }
  if(pw1 !== pw2){ showMsg('Passwords do not match.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Updating…';

  try {
    var res = await fetch('/api/reset-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token, password: pw1 })
    });
    var data = await res.json();

    if(data.success){
      document.getElementById('form-wrap').style.display = 'none';
      showMsg('Password updated! Redirecting you to sign in…', 'success');
      setTimeout(function(){ window.location.href = 'https://tryheyevee.com'; }, 2500);
    } else {
      showMsg(data.error || 'Something went wrong. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Update My Password';
    }
  } catch(err) {
    showMsg('Connection error. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Update My Password';
  }
}

// Check token on load
if(!getToken()){
  document.getElementById('msg').textContent = 'Invalid reset link. Please request a new one from the app.';
  document.getElementById('msg').className = 'msg error';
  document.getElementById('msg').style.display = 'block';
  document.getElementById('form-wrap').style.display = 'none';
}
</script>
</body>
</html>
