// IVEHUB portal + z.ai token monitor â€” http://localhost:3007
// Login-gated. Password via ENV IVE_PASS (default set below). Session cookie after login.
import { DatabaseSync } from 'node:sqlite';
import http from 'node:http';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const PORT = 3007;
const PASS = process.env.IVE_PASS || (console.error("Set IVE_PASS env var"), process.exit(1));
const USER = process.env.IVE_USER || (console.error("Set IVE_USER env var"), process.exit(1));
const COOKIE = 'ive_session';
const sessions = new Set(); // in-memory session tokens

function getKey() {
  const g = new DatabaseSync('C:/Users/tm/.openclaw/state/openclaw.sqlite', { readOnly: true });
  const row = g.prepare("SELECT value_json FROM config_machine_state WHERE state_key='authProfiles.store'").get();
  return JSON.parse(row.value_json).profiles['zai:default'].key;
}

async function fetchUsage() {
  const key = getKey();
  const res = await fetch('https://api.z.ai/api/monitor/usage/quota/limit', {
    headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
  });
  const j = await res.json();
  if (!j || j.success !== true) throw new Error(j?.msg || `HTTP ${res.status}`);
  const windows = [];
  for (const l of j.data?.limits || []) {
    windows.push({
      type: l.type,
      hours: l.type === 'TOKENS_LIMIT' && l.unit === 3 ? l.number : null,
      percent: l.percentage ?? 0,
      usage: l.usage ?? null,
      remaining: l.remaining ?? null,
      resetMs: l.nextResetTime ?? null,
    });
  }
  return { plan: j.data?.level || '?', windows, fetchedAt: Date.now() };
}

const APPS = [
  ['Office TV Dashboard', 'http://101.32.243.8:3050/', 'ðŸ“º', 'Live ops floor view'],
  ['CRM Dashboard', 'http://101.32.243.8:4001/', 'ðŸ“Š', 'Pipeline & follow-ups'],
  ['Oversight Module App', 'http://101.32.243.8:4000/', 'ðŸ›°ï¸', 'Genset fleet command'],
  ['Customer Oversight Module', 'https://monitoring.genset.com.my/', 'ðŸ”§', 'Customer-facing monitor'],
  ['Inventory App', 'https://mgm-inventory-app.netlify.app/', 'ðŸ“¦', 'Stock & parts'],
  ['Petty Cash App', 'https://pettycash.genset.com.my/', 'ðŸ’°', 'Vouchers & approvals'],
  ['Leave App', 'https://mgmleave.genset.com.my/', 'ðŸŒ´', 'Leave requests & MC'],
  ['Old Dashboard', 'https://deft-creponne-5db2c0.netlify.app/', 'ðŸ•¹ï¸', 'Legacy dashboard'],
];

const LUNAR_APPS = [
  ['Fleet Management', 'https://fleet.lunar.com.my/', 'ðŸš¢', 'Vessel fleet dashboard'],
  ['Purchasing Admin', 'https://purchasing.lunar.com.my/admin', 'ðŸ›’', 'Purchase orders & approvals'],
  ['Lunar Dashboard', 'http://101.32.243.8:3031/', 'ðŸ“ˆ', 'Lunar operations overview'],
];

const DB_APPS = [
  ['Lead Tracker Dashboard', 'https://docs.google.com/spreadsheets/d/1gOa7ahO8j6emUF8dppvVePYhTgv7wjzHO8zQ5vnezes/edit?gid=708855132#gid=708855132', 'ðŸ“‹', 'Leads pipeline sheet'],
  ['Petty Cash / Leave', 'https://docs.google.com/spreadsheets/d/16mcOW7MDfIW4DPGyKj1B9OB9ezvHdGhlTp1GOsBXlrg/edit?gid=365126685#gid=365126685', 'ðŸ’µ', 'Petty cash & leave records'],
  ['WA & Email Database', 'https://docs.google.com/spreadsheets/d/161JDSHbUCmtv8c1MB9WY0pOVfXD9_9vawkqnl5IBido/edit?pli=1&gid=214944863#gid=214944863', 'ðŸ“®', 'WhatsApp & email contacts'],
  ['NocoDB MGM', 'https://mgmgenerator.com/nocodb/dashboard/#/default/pu7hatrkbloa642/m88mc46pwzmq5o5/vwdgiudw8hsvf6c3/genset-service-tracking', 'ðŸ—„ï¸', 'Genset service tracking'],
  ['OLD genset api', 'https://gensetapi.genset.com.my/api/genset-list', 'ðŸ”—', 'Legacy genset feed'],
];

const appCards = APPS.map(([name, url, icon, desc]) =>
  `<a class="app" href="${url}" target="_blank" rel="noopener">
     <span class="ico">${icon}</span>
     <span class="txt"><span class="nm">${name}</span><span class="desc">${desc}</span><span class="url">${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></span>
     <span class="arrow">â†’</span>
   </a>`
).join('\n');

const lunarCards = LUNAR_APPS.map(([name, url, icon, desc]) =>
  `<a class="app" href="${url}" target="_blank" rel="noopener">
     <span class="ico">${icon}</span>
     <span class="txt"><span class="nm">${name}</span><span class="desc">${desc}</span><span class="url">${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></span>
     <span class="arrow">â†’</span>
   </a>`
).join('\n');

const dbCards = DB_APPS.map(([name, url, icon, desc]) =>
  `<a class="app" href="${url}" target="_blank" rel="noopener">
     <span class="ico">${icon}</span>
     <span class="txt"><span class="nm">${name}</span><span class="desc">${desc}</span><span class="url">${url.replace(/^https?:\/\//, '').split('/')[0]}</span></span>
     <span class="arrow">â†’</span>
   </a>`
).join('\n');

const MODU_APPS = [
  ['gmpmobile app', 'https://gmpmobile.netlify.app/', '\u{1F4F1}', 'GMP mobile app'],
  ['tbsn app', 'https://tbsn.netlify.app/', '\u{1F310}', 'TBSN app'],
  ['women app', 'https://womenempowermentapp.netlify.app/', '\u{1F338}', 'Women empowerment app'],
  ['sanyog dashboard', 'https://adminhrdashboard.netlify.app/', '\u{1F4CA}', 'Sanyog HR dashboard'],
  // add more MODU apps here: ['Name', 'https://url', 'icon', 'Description'],
];

const moduCards = MODU_APPS.map(([name, url, icon, desc]) =>
  `<a class="app" href="${url}" target="_blank" rel="noopener">
     <span class="ico">${icon}</span>
     <span class="txt"><span class="nm">${name}</span><span class="desc">${desc}</span><span class="url">${url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></span>
     <span class="arrow">&#8594;</span>
   </a>`
).join('\n');

const LOGIN_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>IVEHUB Â· Sign in</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'Segoe UI',system-ui,sans-serif;background:#070b14;color:#e8edf5;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
 .bg{position:fixed;inset:0;overflow:hidden}
 .orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:.4;animation:drift 20s ease-in-out infinite alternate}
 .orb.a{width:560px;height:560px;background:#0ea5e9;top:-180px;left:-140px}
 .orb.b{width:480px;height:480px;background:#6366f1;bottom:-160px;right:-120px;animation-delay:-8s}
 .orb.c{width:360px;height:360px;background:#10b981;top:45%;left:60%;animation-delay:-15s;opacity:.25}
 @keyframes drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(70px,50px) scale(1.15)}100%{transform:translate(-50px,80px) scale(.92)}}
 .grid{position:fixed;inset:0;background-image:linear-gradient(rgba(125,211,252,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(125,211,252,.045) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse at center,black 30%,transparent 75%)}
 .card{position:relative;z-index:2;width:min(420px,92vw);padding:46px 40px 40px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02));backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.1);border-radius:24px;box-shadow:0 30px 80px rgba(2,8,23,.7),inset 0 1px 0 rgba(255,255,255,.08);animation:rise .9s cubic-bezier(.22,1,.36,1) both;text-align:center}
 @keyframes rise{from{opacity:0;transform:translateY(40px) scale(.95)}to{opacity:1;transform:none}}
 .logo{width:84px;height:84px;margin:0 auto 18px;border-radius:22px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.5rem;letter-spacing:1px;color:#7dd3fc;background:linear-gradient(145deg,#0c4a6e,#0891b2);border:2px solid rgba(125,211,252,.7);box-shadow:0 14px 44px rgba(14,165,233,.45),inset 0 0 26px rgba(125,211,252,.25);animation:logoIn 1s cubic-bezier(.34,1.56,.64,1) both .15s}
 @keyframes logoIn{from{opacity:0;transform:scale(.5) rotate(-14deg)}to{opacity:1;transform:none}}
 .ring{position:absolute;inset:-14px;border-radius:28px;border:1px dashed rgba(56,189,248,.4);animation:spin 12s linear infinite}
 .logo-wrap{position:relative;display:inline-block}
 @keyframes spin{to{transform:rotate(360deg)}}
 h1{font-size:1.5rem;font-weight:800;letter-spacing:2px;background:linear-gradient(90deg,#7dd3fc,#a5b4fc,#6ee7b7,#7dd3fc);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 6s linear infinite}
 @keyframes shine{to{background-position:300% 0}}
 .sub{color:#8aa0b8;font-size:.78rem;letter-spacing:3px;text-transform:uppercase;margin:8px 0 30px}
 .field{position:relative;margin-bottom:16px;animation:fadeUp .7s ease both .35s}
 input{width:100%;padding:15px 18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:14px;color:#e8edf5;font-size:1rem;outline:none;transition:all .3s;text-align:center;letter-spacing:6px}
 input::placeholder{letter-spacing:2px;color:#51657d}
 input:focus{border-color:rgba(56,189,248,.6);box-shadow:0 0 0 4px rgba(56,189,248,.12);background:rgba(56,189,248,.06)}
 button{width:100%;padding:15px;border:none;border-radius:14px;background:linear-gradient(90deg,#0891b2,#0ea5e9);color:#fff;font-size:1rem;font-weight:700;letter-spacing:2px;cursor:pointer;transition:all .3s;animation:fadeUp .7s ease both .45s;position:relative;overflow:hidden}
 button:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(14,165,233,.4)}
 button:active{transform:scale(.98)}
 button::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-100%);animation:sweep 3s ease infinite}
 @keyframes sweep{60%,100%{transform:translateX(100%)}}
 .err{color:#f87171;font-size:.8rem;min-height:20px;margin-top:12px;animation:fadeUp .3s ease both}
 .shake{animation:shake .5s ease}
 @keyframes shake{20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}
 .foot{margin-top:26px;color:#46586e;font-size:.68rem;letter-spacing:2px;animation:fadeUp .8s ease both .55s}
 @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
</style></head><body>
<div class="bg"><div class="orb a"></div><div class="orb b"></div><div class="orb c"></div></div>
<div class="grid"></div>
<form class="card" id="f" method="post" action="/login">
 <div class="logo-wrap"><div class="ring"></div><div class="logo"><img src="/logo.png" alt="IVEHUB" style="width:100%;height:100%;object-fit:cover;border-radius:20px"></div></div>
 <h1>IVEHUB</h1>
 <div class="sub">Operations Control Portal</div>
 <div class="field"><input type="text" name="user" placeholder="Username" autocomplete="username" style="letter-spacing:2px"></div>
 <div class="field"><input type="password" name="pass" placeholder="Password" autofocus autocomplete="current-password"></div>
 <button type="submit">UNLOCK PORTAL</button>
 <div class="err" id="err"></div>
 <div class="foot">RESTRICTED Â· AUTHORISED ACCESS ONLY</div>
</form>
<script>
const q = new URLSearchParams(location.search);
if (q.get('e') === '1') { document.getElementById('err').textContent = 'Access code incorrect â€” try again'; document.getElementById('f').classList.add('shake'); }
</script>
</body></html>`;

const MAIN_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>IVEHUB</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 *{box-sizing:border-box}
 body{font-family:'Segoe UI',system-ui,sans-serif;background:#070b14;color:#e8edf5;margin:0;min-height:100vh;overflow-x:hidden}
 .bg{position:fixed;inset:0;z-index:0;overflow:hidden}
 .orb{position:absolute;border-radius:50%;filter:blur(90px);opacity:.35;animation:drift 22s ease-in-out infinite alternate}
 .orb.a{width:520px;height:520px;background:#0ea5e9;top:-160px;left:-120px}
 .orb.b{width:460px;height:460px;background:#6366f1;bottom:-140px;right:-100px;animation-delay:-7s}
 .orb.c{width:340px;height:340px;background:#10b981;top:40%;left:55%;animation-delay:-14s;opacity:.22}
 @keyframes drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,40px) scale(1.12)}100%{transform:translate(-40px,70px) scale(.95)}}
 .wrap{position:relative;z-index:1;max-width:1060px;margin:0 auto;padding:48px 24px 60px}
 header{text-align:center;margin-bottom:36px;animation:fadeDown .8s ease both}
 .brand{font-size:2.4rem;font-weight:800;letter-spacing:3px;background:linear-gradient(90deg,#7dd3fc,#a5b4fc,#6ee7b7,#7dd3fc);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 8s linear infinite}
 @keyframes shine{to{background-position:300% 0}}
 .tag{color:#8aa0b8;font-size:.85rem;letter-spacing:4px;text-transform:uppercase;margin-top:6px}
 /* welcome banner */
 /* splash overlay */
 .splash{position:fixed;inset:0;z-index:99;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#0c1526 0%,#05080f 70%)}
 .splash.show{display:flex;animation:splashOut .6s ease 2.4s forwards}
 .splash.done{display:none}
 @keyframes splashOut{to{opacity:0;visibility:hidden}}
 .s-inner{text-align:center;animation:fadeUp .7s ease both}
 .s-logo-wrap{position:relative;display:inline-block;margin-bottom:26px;animation:logoIn .9s cubic-bezier(.34,1.56,.64,1) both .15s}
 .s-logo{width:110px;height:110px;border-radius:28px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:2rem;letter-spacing:1px;color:#7dd3fc;background:linear-gradient(145deg,#0c4a6e,#0891b2);border:2px solid rgba(125,211,252,.7);box-shadow:0 18px 60px rgba(14,165,233,.5),inset 0 0 34px rgba(125,211,252,.25)}
 .s-ring{position:absolute;inset:-18px;border-radius:36px;border:1px dashed rgba(56,189,248,.45);animation:spin 8s linear infinite}
 .s-hello{font-size:2rem;font-weight:800;letter-spacing:1px;background:linear-gradient(90deg,#7dd3fc,#6ee7b7,#a5b4fc,#7dd3fc);background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shine 3s linear infinite, fadeUp .8s ease both .5s}
 .s-sub{color:#8aa0b8;font-size:.8rem;letter-spacing:3px;text-transform:uppercase;margin-top:12px;animation:fadeUp .8s ease both .8s}
 .s-loader{display:flex;gap:8px;justify-content:center;margin-top:26px;animation:fadeUp .8s ease both 1s}
 .s-loader span{width:10px;height:10px;border-radius:50%;background:#38bdf8;animation:bounce 1s ease infinite}
 .s-loader span:nth-child(2){animation-delay:.15s;background:#6ee7b7}
 .s-loader span:nth-child(3){animation-delay:.3s;background:#a5b4fc}
 @keyframes bounce{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-12px);opacity:1}}
 .welcome{margin:0 auto 30px;max-width:640px;padding:16px 24px;background:linear-gradient(145deg,rgba(56,189,248,.12),rgba(99,102,241,.08));border:1px solid rgba(125,211,252,.35);border-radius:18px;text-align:center;animation:popIn 1s cubic-bezier(.34,1.56,.64,1) both .5s;position:relative;overflow:hidden}
 .welcome::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(125,211,252,.18),transparent);transform:translateX(-100%);animation:sweep 3.5s ease infinite}
 .welcome .w1{font-size:1.25rem;font-weight:800;letter-spacing:1px;background:linear-gradient(90deg,#7dd3fc,#6ee7b7);-webkit-background-clip:text;background-clip:text;color:transparent}
 .welcome .w2{color:#8aa0b8;font-size:.74rem;letter-spacing:2px;margin-top:4px;text-transform:uppercase}
 @keyframes popIn{from{opacity:0;transform:scale(.7)}60%{transform:scale(1.05)}to{opacity:1;transform:scale(1)}}
 .live{display:inline-flex;align-items:center;gap:7px;margin-top:14px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.35);color:#6ee7b7;font-size:.72rem;padding:5px 14px;border-radius:99px}
 .dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 0 rgba(16,185,129,.6);animation:pulse 2s infinite}
 @keyframes pulse{70%{box-shadow:0 0 0 9px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
 h2{font-size:.8rem;color:#7c96b4;margin:34px 0 16px;letter-spacing:3px;text-transform:uppercase;display:flex;align-items:center;gap:12px;animation:fadeUp .8s ease both}
 h2::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(125,211,252,.35),transparent)}
 .glass{background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02));backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.09);border-radius:18px}
 .usage{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
 .card{padding:24px 26px;position:relative;overflow:hidden;animation:fadeUp .8s ease both}
 .card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--glow,#4ade80),transparent);opacity:.8}
 .row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
 .label{font-weight:600;font-size:.98rem;color:#c7d4e4}
 .pct{font-size:2.2rem;font-weight:800;font-variant-numeric:tabular-nums}
 .pct.ok{color:#4ade80;text-shadow:0 0 18px rgba(74,222,128,.4)}
 .pct.warn{color:#fbbf24;text-shadow:0 0 18px rgba(251,191,36,.4)}
 .pct.danger{color:#f87171;text-shadow:0 0 18px rgba(248,113,113,.45);animation:blink 1.2s infinite}
 @keyframes blink{50%{opacity:.55}}
 .bar{height:9px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden}
 .fill{height:100%;border-radius:99px;transition:width 1s cubic-bezier(.22,1,.36,1);position:relative}
 .fill.ok{background:linear-gradient(90deg,#22c55e,#4ade80);box-shadow:0 0 14px rgba(74,222,128,.5)}
 .fill.warn{background:linear-gradient(90deg,#f59e0b,#fbbf24);box-shadow:0 0 14px rgba(251,191,36,.5)}
 .fill.danger{background:linear-gradient(90deg,#ef4444,#f87171);box-shadow:0 0 16px rgba(248,113,113,.6)}
 .fill::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);transform:translateX(-100%);animation:sweep 2.6s ease infinite}
 @keyframes sweep{60%,100%{transform:translateX(100%)}}
 .meta{color:#8aa0b8;font-size:.78rem;margin-top:12px}
 .planchip{display:inline-block;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.3);color:#7dd3fc;padding:2px 12px;border-radius:99px;font-size:.7rem;margin-left:8px;vertical-align:middle;letter-spacing:1px}
 .topbar{position:fixed;top:18px;right:22px;z-index:5;display:flex;gap:10px;animation:fadeDown .8s ease both .8s}
 .btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#c7d4e4;padding:8px 16px;border-radius:12px;font-size:.75rem;letter-spacing:1px;cursor:pointer;text-decoration:none;transition:all .25s}
 .btn:hover{background:rgba(248,113,113,.14);border-color:rgba(248,113,113,.4);color:#f87171}
 /* MGM hub folder */
 .hubs{display:flex;justify-content:center;gap:70px;flex-wrap:wrap}
 .lunar-tile{color:#c4b5fd;border-color:rgba(167,139,250,.55);box-shadow:0 10px 40px rgba(139,92,246,.28), inset 0 0 26px rgba(167,139,250,.12)}
 .hub.lunar .front{background:linear-gradient(145deg,#4c1d95,#7c3aed);border-color:rgba(196,181,253,.8);box-shadow:0 14px 48px rgba(139,92,246,.45), inset 0 0 30px rgba(196,181,253,.25)}
 .lunar-ring{border-color:rgba(167,139,250,.35)!important}
 .lunar-badge{background:linear-gradient(145deg,#4c1d95,#7c3aed);border-color:rgba(196,181,253,.7);color:#ddd6fe;box-shadow:0 8px 26px rgba(139,92,246,.4)}
 .db-tile{color:#6ee7b7;border-color:rgba(52,211,153,.55);box-shadow:0 10px 40px rgba(16,185,129,.28), inset 0 0 26px rgba(52,211,153,.12)}
 .hub.db .front{background:linear-gradient(145deg,#064e3b,#059669);border-color:rgba(110,231,183,.8);box-shadow:0 14px 48px rgba(16,185,129,.45), inset 0 0 30px rgba(110,231,183,.25)}
 .db-ring{border-color:rgba(52,211,153,.35)!important}
 .db-badge{background:linear-gradient(145deg,#064e3b,#059669);border-color:rgba(110,231,183,.7);color:#d1fae5;box-shadow:0 8px 26px rgba(16,185,129,.4)}
 .modu-tile{color:#fcd34d;border-color:rgba(251,191,36,.55);box-shadow:0 10px 40px rgba(245,158,11,.28), inset 0 0 26px rgba(251,191,36,.12)}
 .hub.modu .front{background:linear-gradient(145deg,#7c2d12,#ea580c);border-color:rgba(252,211,77,.8);box-shadow:0 14px 48px rgba(245,158,11,.45), inset 0 0 30px rgba(252,211,77,.25);font-size:1.7rem}
 .modu-ring{border-color:rgba(251,191,36,.35)!important}
 .modu-badge{background:linear-gradient(145deg,#7c2d12,#ea580c);border-color:rgba(252,211,77,.7);color:#fde68a;box-shadow:0 8px 26px rgba(245,158,11,.4);font-size:.9rem}
 .hub-area{display:flex;flex-direction:column;align-items:center;animation:fadeUp .8s ease both}
 .hub{position:relative;width:190px;height:190px;cursor:pointer;border:none;background:none;padding:0;transition:transform .3s cubic-bezier(.22,1,.36,1)}
 .hub:hover{transform:scale(1.07)}
 .hub:active{transform:scale(.97)}
 .hub-tile{position:absolute;width:112px;height:112px;border-radius:26px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:2rem;letter-spacing:1px;color:#7dd3fc;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02));border:1.5px solid rgba(56,189,248,.55);box-shadow:0 10px 40px rgba(14,165,233,.28), inset 0 0 26px rgba(56,189,248,.12);backdrop-filter:blur(10px);transition:all .35s cubic-bezier(.22,1,.36,1)}
 .hub-tile.t1{left:0;top:14px;z-index:2;transform:rotate(-8deg)}
 .hub-tile.t2{right:0;top:14px;z-index:2;transform:rotate(8deg)}
 .hub-tile.front{left:50%;top:50%;z-index:3;transform:translate(-50%,-50%);width:126px;height:126px;border-radius:30px;font-size:2.3rem;background:linear-gradient(145deg,#0c4a6e,#0891b2);border:2px solid rgba(125,211,252,.8);box-shadow:0 14px 48px rgba(14,165,233,.45), inset 0 0 30px rgba(125,211,252,.25)}
 .hub:hover .t1{transform:rotate(-16deg) translate(-14px,2px)}
 .hub:hover .t2{transform:rotate(16deg) translate(14px,2px)}
 .hub .ring{position:absolute;inset:-16px;border-radius:50%;border:1px dashed rgba(56,189,248,.35);animation:spin 14s linear infinite}
 @keyframes spin{to{transform:rotate(360deg)}}
 .hub-label{margin-top:18px;color:#a8bdd2;font-weight:700;letter-spacing:3px;font-size:1rem;text-transform:uppercase;text-align:center}
 .hub-hint{color:#5b7189;font-size:.72rem;margin-top:5px;letter-spacing:1px;transition:color .3s}
 .hub-area:hover .hub-hint{color:#7dd3fc}
 .overlay{position:fixed;inset:0;z-index:10;background:rgba(4,8,18,.82);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .35s}
 .overlay.open{opacity:1;pointer-events:auto}
 .panel{width:min(940px,92vw);max-height:86vh;overflow:auto;padding:30px 30px 26px;transform:translateY(26px) scale(.96);transition:transform .4s cubic-bezier(.22,1,.36,1)}
 .overlay.open .panel{transform:none}
 .panel-head{display:flex;align-items:center;gap:16px;margin-bottom:22px}
 .panel-mgm{width:58px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15rem;color:#7dd3fc;background:linear-gradient(145deg,#0c4a6e,#0891b2);border:1.5px solid rgba(125,211,252,.7);box-shadow:0 8px 26px rgba(14,165,233,.4);flex:none}
 .panel-title{font-size:1.15rem;font-weight:750;letter-spacing:1px}
 .panel-sub{color:#8aa0b8;font-size:.74rem;margin-top:3px}
 .close{margin-left:auto;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#c7d4e4;width:38px;height:38px;border-radius:12px;font-size:1rem;cursor:pointer;transition:all .2s}
 .close:hover{background:rgba(248,113,113,.15);border-color:rgba(248,113,113,.4);color:#f87171}
 .apps{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:13px}
 .app{display:flex;align-items:center;gap:14px;padding:16px 18px;text-decoration:none;color:inherit;position:relative;overflow:hidden;transition:transform .25s cubic-bezier(.22,1,.36,1),border-color .25s,box-shadow .25s;opacity:0;transform:translateY(14px)}
 .overlay.open .app{animation:fadeUp .45s ease forwards}
 .overlay.open .app:nth-child(1){animation-delay:.05s}.overlay.open .app:nth-child(2){animation-delay:.1s}.overlay.open .app:nth-child(3){animation-delay:.15s}.overlay.open .app:nth-child(4){animation-delay:.2s}.overlay.open .app:nth-child(5){animation-delay:.25s}.overlay.open .app:nth-child(6){animation-delay:.3s}.overlay.open .app:nth-child(7){animation-delay:.35s}
 .app::after{content:'';position:absolute;inset:0;background:radial-gradient(500px circle at var(--mx,50%) var(--my,50%),rgba(125,211,252,.12),transparent 42%);opacity:0;transition:opacity .3s}
 .app:hover{transform:translateY(-3px);border-color:rgba(125,211,252,.5);box-shadow:0 14px 34px rgba(2,8,23,.6),0 0 0 1px rgba(125,211,252,.15)}
 .app:hover::after{opacity:1}
 .ico{font-size:1.6rem;flex:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))}
 .txt{flex:1;min-width:0}
 .nm{display:block;font-weight:650;font-size:.95rem;color:#eef4fb}
 .desc{display:block;color:#8aa0b8;font-size:.75rem;margin-top:3px}
 .url{display:block;color:#5b7189;font-size:.65rem;margin-top:4px;word-break:break-all}
 .arrow{flex:none;color:#38bdf8;font-size:1.1rem;transform:translateX(-6px);opacity:0;transition:all .25s}
 .app:hover .arrow{transform:translateX(0);opacity:1}
 footer{text-align:center;color:#46586e;font-size:.7rem;margin-top:52px;letter-spacing:1px;animation:fadeUp 1s ease both}
 @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
 @keyframes fadeDown{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:none}}
 @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style></head><body>
<div class="bg"><div class="orb a"></div><div class="orb b"></div><div class="orb c"></div></div>
<div class="topbar"><a class="btn" href="/logout">LOCK â¬¦</a></div>

<div class="splash" id="splash">
 <div class="s-inner">
  <div class="s-logo-wrap"><div class="s-ring"></div><div class="s-logo"><img src="/logo.png" alt="IVEHUB" style="width:100%;height:100%;object-fit:cover;border-radius:26px"></div></div>
  <div class="s-hello">Welcome back, Boss</div>
  <div class="s-sub">Preparing your command centerâ€¦</div>
  <div class="s-loader"><span></span><span></span><span></span></div>
 </div>
</div>
<div class="wrap">
 <header>
  <div class="brand">IVEHUB</div>
  <div class="tag">Operations Control Portal</div>
  <div class="live"><span class="dot"></span> ALL SYSTEMS LIVE</div>
 </header>

 <div class="welcome" id="welcome">
  <div class="w1">ðŸ‘‹ Welcome back, Boss</div>
  <div class="w2">Everything is running smoothly today</div>
 </div>

 <h2>âš¡ OpenClaw Token Usage <span class="planchip" id="plan"></span></h2>
 <div class="usage" id="cards"><div class="glass card" style="color:#8aa0b8">loadingâ€¦</div></div>

 <h2>ðŸ“ Applications</h2>
 <div class="hubs">
  <div class="hub-area">
   <button class="hub" id="hub" title="Open MGM apps">
    <span class="ring"></span>
    <span class="hub-tile t1"></span>
    <span class="hub-tile t2"></span>
    <span class="hub-tile front">MGM</span>
   </button>
   <div class="hub-label">MGM Apps</div>
   <div class="hub-hint">8 applications inside</div>
  </div>
  <div class="hub-area">
   <button class="hub lunar" id="hubLunar" title="Open Lunar apps">
    <span class="ring lunar-ring"></span>
    <span class="hub-tile lunar-tile t1"></span>
    <span class="hub-tile lunar-tile t2"></span>
    <span class="hub-tile lunar-tile front">ðŸŒ™</span>
   </button>
   <div class="hub-label">Lunar Apps</div>
   <div class="hub-hint">3 applications inside</div>
  </div>
  <div class="hub-area">
   <button class="hub db" id="hubDb" title="Open Databases">
    <span class="ring db-ring"></span>
    <span class="hub-tile db-tile t1"></span>
    <span class="hub-tile db-tile t2"></span>
    <span class="hub-tile db-tile front">ðŸ—„ï¸</span>
   </button>
   <div class="hub-label">Databases</div>
   <div class="hub-hint">5 data sources inside</div>
  </div>
  <div class="hub-area">
   <button class="hub modu" id="hubModu" title="Open MODU apps">
    <span class="ring modu-ring"></span>
    <span class="hub-tile modu-tile t1"></span>
    <span class="hub-tile modu-tile t2"></span>
    <span class="hub-tile modu-tile front">MODU</span>
   </button>
   <div class="hub-label">MODU Apps</div>
   <div class="hub-hint">4 applications inside</div>
  </div>
 </div>

 <footer>IVEHUB Â· PORTAL v2 Â· <span id="updated"></span></footer>
</div>

<div class="overlay" id="ov">
 <div class="glass panel">
  <div class="panel-head">
   <div class="panel-mgm"><img src="/logo.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px"></div>
   <div>
    <div class="panel-title">MGM Applications</div>
    <div class="panel-sub">8 apps Â· click any to open in a new window</div>
   </div>
   <button class="close" id="closeBtn" title="Close">âœ•</button>
  </div>
  <div class="apps">
${appCards}
  </div>
 </div>
</div>

<div class="overlay" id="ovLunar">
 <div class="glass panel">
  <div class="panel-head">
   <div class="panel-mgm lunar-badge">ðŸŒ™</div>
   <div>
    <div class="panel-title">Lunar Applications</div>
    <div class="panel-sub">3 apps Â· click any to open in a new window</div>
   </div>
   <button class="close" id="closeBtnLunar" title="Close">âœ•</button>
  </div>
  <div class="apps">
${lunarCards}
  </div>
 </div>
</div>

<div class="overlay" id="ovDb">
 <div class="glass panel">
  <div class="panel-head">
   <div class="panel-mgm db-badge">ðŸ—„ï¸</div>
   <div>
    <div class="panel-title">Databases</div>
    <div class="panel-sub">5 data sources Â· click any to open in a new window</div>
   </div>
   <button class="close" id="closeBtnDb" title="Close">âœ•</button>
  </div>
  <div class="apps">
${dbCards}
  </div>
 </div>
</div>

<div class="overlay" id="ovModu">
 <div class="glass panel">
  <div class="panel-head">
   <div class="panel-mgm modu-badge">MODU</div>
   <div>
    <div class="panel-title">MODU Applications</div>
    <div class="panel-sub">${MODU_APPS.length} apps &#183; click any to open in a new window</div>
   </div>
   <button class="close" id="closeBtnModu" title="Close">&#10005;</button>
  </div>
  <div class="apps">
${moduCards}
  </div>
 </div>
</div>

<script>
// welcome splash after fresh login
if (new URLSearchParams(location.search).get('w') === '1') {
  const sp = document.getElementById('splash');
  sp.classList.add('show');
  setTimeout(()=>{ sp.classList.add('done'); history.replaceState(null,'','/'); }, 3100);
}
setTimeout(()=>{ const w=document.getElementById('welcome'); if(w) w.style.opacity='0.95'; }, 4000);
const ov = document.getElementById('ov');
document.getElementById('hub').addEventListener('click', ()=> ov.classList.add('open'));
document.getElementById('closeBtn').addEventListener('click', ()=> ov.classList.remove('open'));
ov.addEventListener('click', e=>{ if(e.target===ov) ov.classList.remove('open'); });
const ovL = document.getElementById('ovLunar');
document.getElementById('hubLunar').addEventListener('click', ()=> ovL.classList.add('open'));
document.getElementById('closeBtnLunar').addEventListener('click', ()=> ovL.classList.remove('open'));
ovL.addEventListener('click', e=>{ if(e.target===ovL) ovL.classList.remove('open'); });
const ovD = document.getElementById('ovDb');
document.getElementById('hubDb').addEventListener('click', ()=> ovD.classList.add('open'));
document.getElementById('closeBtnDb').addEventListener('click', ()=> ovD.classList.remove('open'));
ovD.addEventListener('click', e=>{ if(e.target===ovD) ovD.classList.remove('open'); });
const ovM = document.getElementById('ovModu');
document.getElementById('hubModu').addEventListener('click', ()=> ovM.classList.add('open'));
document.getElementById('closeBtnModu').addEventListener('click', ()=> ovM.classList.remove('open'));
ovM.addEventListener('click', e=>{ if(e.target===ovM) ovM.classList.remove('open'); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ ov.classList.remove('open'); ovL.classList.remove('open'); ovD.classList.remove('open'); ovM.classList.remove('open'); } });
document.querySelectorAll('.app').forEach(a=>{
 a.addEventListener('mousemove',e=>{
  const r=a.getBoundingClientRect();
  a.style.setProperty('--mx',(e.clientX-r.left)+'px');
  a.style.setProperty('--my',(e.clientY-r.top)+'px');
 });
});
function render(d){
 document.getElementById('plan').textContent = d.plan.toUpperCase();
 document.getElementById('updated').textContent = 'usage synced ' + new Date(d.fetchedAt).toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'});
 const el = document.getElementById('cards'); el.innerHTML = '';
 for(const w of d.windows){
  const p = w.percent, cls = p>=80?'danger':p>=50?'warn':'ok';
  const glow = p>=80?'#f87171':p>=50?'#fbbf24':'#4ade80';
  const label = w.type==='TOKENS_LIMIT' ? ('5-Hour Window ('+w.hours+'h)') : 'Monthly Quota';
  const reset = w.resetMs ? new Date(w.resetMs).toLocaleString('en-MY',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '?';
  const extra = (w.usage!=null&&w.remaining!=null) ? (' Â· used '+w.usage+' Â· left '+w.remaining) : '';
  el.innerHTML += \`<div class="glass card" style="--glow:\${glow};animation-delay:.1s">
    <div class="row"><span class="label">\${label}</span><span class="pct \${cls}">\${p}%</span></div>
    <div class="bar"><div class="fill \${cls}" style="width:\${p}%"></div></div>
    <div class="meta">resets \${reset}\${extra}</div></div>\`;
 }
}
async function refresh(){
 try{ const r = await fetch('/api/usage'); const d = await r.json(); if(d.error) throw new Error(d.error); render(d); }
 catch(e){ document.getElementById('updated').textContent = 'sync error: '+e.message; }
}
refresh(); setInterval(refresh, 60000);
</script></body></html>`;

function isAuthed(req) {
  const c = (req.headers.cookie || '').split(/;\s*/).find(s => s.startsWith(COOKIE + '='));
  return c && sessions.has(c.slice(COOKIE.length + 1));
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/login' && req.method === 'POST') {
    let body = '';
    req.on('data', ch => { body += ch; if (body.length > 1e4) req.destroy(); });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const pass = params.get('pass') || '';
      const user = (params.get('user') || '').trim();
      if (pass === PASS && user === USER) {
        const tok = crypto.randomBytes(24).toString('hex');
        sessions.add(tok);
        res.writeHead(302, { 'Set-Cookie': `${COOKIE}=${tok}; HttpOnly; SameSite=Lax; Path=/`, Location: '/?w=1' });
        res.end();
      } else {
        res.writeHead(302, { Location: '/?e=1' });
        res.end();
      }
    });
    return;
  }
  if (url === '/logout') {
    const c = (req.headers.cookie || '').split(/;\s*/).find(s => s.startsWith(COOKIE + '='));
    if (c) sessions.delete(c.slice(COOKIE.length + 1));
    res.writeHead(302, { 'Set-Cookie': `${COOKIE}=; Max-Age=0; Path=/`, Location: '/' });
    res.end();
    return;
  }
  if (url === '/logo.png') {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
    res.end(readFileSync('C:/Users/tm/scripts/ivehub-totoro.png'));
    return;
  }
  if (!isAuthed(req)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(LOGIN_PAGE);
    return;
  }
  if (url === '/api/usage') {
    try {
      const d = await fetchUsage();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(d));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(MAIN_PAGE);
});
server.listen(PORT, () => console.log(`IVEHUB portal (login-gated) on http://localhost:${PORT}`));

