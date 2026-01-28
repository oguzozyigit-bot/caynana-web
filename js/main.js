// =========================================================
// FILE: /js/main.js
// VERSION: vFINAL+1 (Expose Config to window for index.html + GSI)
// CHANGE: config.js export olduğu için inline/diğer scriptler client_id görmüyordu.
//         Burada window’a basıyoruz.
// =========================================================

// ⛔️ ESKİ:
// import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";

// ✅ YENİ:
import { BASE_DOMAIN, STORAGE_KEY, GOOGLE_CLIENT_ID } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { ChatStore } from "./chat_store.js";

// ✅ CONFIG BRIDGE (index.html / auth.js / diğer yerler görebilsin)
window.CAYNANA_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
window.CAYNANA_API_BASE = BASE_DOMAIN;
window.CAYNANA_STORAGE_KEY = STORAGE_KEY;

const $ = (id) => document.getElementById(id);
const API_TOKEN_KEY = "caynana_api_token";

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}
function getApiToken(){ return (localStorage.getItem(API_TOKEN_KEY) || "").trim(); }
function setApiToken(t){ if(t) localStorage.setItem(API_TOKEN_KEY, t); }
function clearApiToken(){ localStorage.removeItem(API_TOKEN_KEY); }

function getBootState(){
  if(!window.__CAYNANA_BOOT__) window.__CAYNANA_BOOT__ = {
    gsiReady: false,
    authInited: false,
    loginInFlight: false,
    lastLoginAt: 0
  };
  return window.__CAYNANA_BOOT__;
}

async function ensureBackendSessionToken(){
  const existing = getApiToken();
  if(existing) return existing;

  const googleIdToken = (localStorage.getItem("google_id_token") || "").trim();
  if(!googleIdToken) throw new Error("google_id_token missing");

  const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      google_id_token: googleIdToken,
      id_token: googleIdToken,
      token: googleIdToken
    })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(`auth/google failed: ${r.status} ${txt}`);

  let data = {};
  try { data = JSON.parse(txt || "{}"); } catch(e) {}

  const token =
    (data.token ||
     data.access_token ||
     data.api_token ||
     data.jwt ||
     data.session_token ||
     data.auth_token ||
     data.bearer ||
     data.accessToken ||
     "").trim();

  if(!token) throw new Error("auth/google token not found in response");
  setApiToken(token);
  return token;
}

/* ✅ Çıkış / logged değilken: sağda sözleşme kalmasın, menü/overlay açık kalmasın */
function forceCloseAllOverlays(){
  const ids = ["termsOverlay","pageOverlay","menuOverlay","notifDropdown"];
  ids.forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.classList.remove("active","open","show");
    if(id !== "notifDropdown") el.style.display = "none";
  });
}

// --------------------
// GLOBAL HOOKS
// --------------------
window.enterApp = () => {
  $("loginOverlay")?.classList.remove("active");
  if ($("loginOverlay")) $("loginOverlay").style.display = "none";
  refreshPremiumBars();
};

window.showTermsOverlay = () => {
  const t = $("termsOverlay");
  if (!t) return;
  t.classList.add("active");
  t.style.display = "flex";
};

window.showGoogleButtonFallback = (reason = "unknown") => {
  const hint = $("loginHint");
  if (hint) hint.textContent = `Google girişi açılamadı (${reason}). Sayfayı yenileyip tekrar dene.`;
};

// --------------------
// UI STATE
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
  document.body.classList.toggle("is-logged", logged);

  const name = (u.hitap || (u.fullname || "").split(/\s+/)[0] || u.email || "MİSAFİR").toUpperCase();

  const yp = Number((u?.yp_percent ?? 19));
  const p = Math.max(5, Math.min(100, yp));

  // ⚠️ Sen "yüzde işareti yok" istemiştin; istersen aşağıdaki satırı `${p}` yap.
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? name : "MİSAFİR";
}

// ... (dosyanın geri kalanı aynen devam)
// 👇 Sadece yukarıdaki IMPORT + window bridge ekledik.
