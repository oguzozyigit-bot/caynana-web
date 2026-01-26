// js/auth.js (FINAL - Google GSI + JWT base64url UTF-8 decode + terms kalıcı + backend token cache)
// ✅ FIX: FedCM AbortError (prompt spam / çift init) -> kilit + throttle + cancel
// ✅ FIX: Türkçe karakter bozulması -> JWT payload UTF-8 decode (TextDecoder)
// ✅ FIX: ID gmail değil -> 2 harf + 8 rakam random, ardışık yok (kalıcı)

// js/config.js

export const GOOGLE_CLIENT_ID =
  "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

export const STORAGE_KEY = "caynana_user_v1";

// ✅ SENİN DOMAIN’İN
export const BASE_DOMAIN = "https://caynana.ai";

const API_TOKEN_KEY = "caynana_api_token";
const STABLE_ID_KEY = "caynana_stable_id_v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getAuthState(){
  if(!window.__CAYNANA_AUTH__) window.__CAYNANA_AUTH__ = {
    inited: false,
    promptInFlight: false,
    lastPromptAt: 0
  };
  return window.__CAYNANA_AUTH__;
}

export async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs){
    if (window.google?.accounts?.id) return true;
    await sleep(60);
  }
  return false;
}

// ---------------------------
// ✅ JWT decode (UTF-8 correct)
// ---------------------------
function base64UrlToBytes(base64Url){
  let b64 = String(base64Url || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);

  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function parseJwt(idToken = ""){
  try{
    const parts = String(idToken).split(".");
    if(parts.length < 2) return null;

    const bytes = base64UrlToBytes(parts[1]);
    const json = new TextDecoder("utf-8", { fatal:false }).decode(bytes);
    return JSON.parse(json);
  }catch(e){
    console.error("parseJwt failed:", e);
    return null;
  }
}

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function setApiToken(t){
  if(t) localStorage.setItem(API_TOKEN_KEY, t);
}
function clearApiToken(){
  localStorage.removeItem(API_TOKEN_KEY);
}

// ---------------------------
// ✅ Random ID: 2 harf + 8 rakam (ardışık yok)
// ---------------------------
function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickLetter(except){
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ch = "";
  for(let t=0;t<50;t++){
    ch = A[randInt(0, A.length-1)];
    if(ch !== except) return ch;
  }
  return ch || "X";
}

function buildNonSequentialDigits(len=8){
  const digits = [];
  for(let i=0;i<len;i++){
    let d = randInt(0,9);
    for(let t=0;t<120;t++){
      const prev = digits[i-1];
      const prev2 = digits[i-2];

      const ok1 = (prev === undefined) ? true : (d !== prev && Math.abs(d - prev) !== 1);
      const ok2 = (prev2 === undefined) ? true : (d !== prev2);

      if(ok1 && ok2) break;
      d = randInt(0,9);
    }
    digits.push(d);
  }
  return digits.join("");
}

function getOrCreateStableId(){
  const existing = (localStorage.getItem(STABLE_ID_KEY) || "").trim();
  if(existing) return existing;

  const a = pickLetter("");
  const b = pickLetter(a);
  const nums = buildNonSequentialDigits(8);
  const id = `${a}${b}${nums}`;

  localStorage.setItem(STABLE_ID_KEY, id);
  return id;
}

// ---------------------------
// Backend session token al (Google id_token -> backend token)
// ---------------------------
async function fetchBackendToken(googleIdToken){
  const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

// ---------------------------
// Google callback
// ---------------------------
async function handleGoogleResponse(res){
  try{
    const idToken = (res?.credential || "").trim();
    if(!idToken) return;

    localStorage.setItem("google_id_token", idToken);

    const payload = parseJwt(idToken);
    if(!payload?.email){
      alert("Google token çözülemedi. Client ID / domain ayarlarını kontrol et.");
      return;
    }

    const email = String(payload.email).toLowerCase().trim();
    const savedTermsAt = localStorage.getItem(termsKey(email)) || null;

    // ✅ ID gmail değil: kalıcı random ID
    const stableId = getOrCreateStableId();

    // user (main.js ile uyumlu)
    const user = {
      id: stableId,
      user_id: stableId,
      email: email,

      // ✅ Türkçe karakter bozulmaz (UTF-8 decode fix)
      fullname: payload.name || "",
      name: payload.name || "",
      display_name: payload.name || "",

      // ✅ profil sayfası picture/avatar arıyor olabilir
      picture: payload.picture || "",
      avatar: payload.picture || "",

      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
      terms_accepted_at: savedTermsAt,
      yp_percent: 50
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    // Backend session token’ı da al (silme vs. için gerekli)
    try{
      await fetchBackendToken(idToken);
    }catch(e){
      console.warn("backend token alınamadı:", e);
      clearApiToken();
    }

    // ✅ reload (mevcut akışın)
    window.location.reload();
  }catch(e){
    console.error("handleGoogleResponse error:", e);
    alert("Google girişinde hata oldu. Console'u kontrol et.");
  }
}

// ---------------------------
// initAuth (tek sefer, FedCM uyumlu)
// ---------------------------
export function initAuth() {
  const st = getAuthState();
  if(st.inited) return;

  if (!window.google?.accounts?.id) return;
  if(!GOOGLE_CLIENT_ID){
    console.error("GOOGLE_CLIENT_ID missing in config.js");
    return;
  }

  st.inited = true;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false,

    // ✅ FedCM stabilitesi
    use_fedcm_for_prompt: true,
    cancel_on_tap_outside: false
  });
}

// ---------------------------
// handleLogin (prompt spam yok, AbortError önleme)
// ---------------------------
export function handleLogin(provider) {
  if(provider === "google") {
    if(!window.google?.accounts?.id){
      alert("Google servisi yüklenemedi (GSI).");
      return;
    }

    // init garanti
    initAuth();

    const st = getAuthState();
    const now = Date.now();

    // ✅ 1) spam engeli
    if(st.promptInFlight) return;
    if(now - (st.lastPromptAt || 0) < 1200) return;

    st.promptInFlight = true;
    st.lastPromptAt = now;

    try{
      // ✅ 2) önceki prompt kalıntısını temizle (varsa)
      try{ window.google.accounts.id.cancel?.(); }catch(e){}

      // ✅ 3) prompt tek sefer (moment kontrolü)
      window.google.accounts.id.prompt((n)=>{
        try{
          if(n?.isNotDisplayed?.() || n?.isSkippedMoment?.() || n?.isDismissedMoment?.()){
            window.showGoogleButtonFallback?.("prompt not displayed");
          }
        }catch(e){}
        // kilidi bırak
        setTimeout(()=>{ st.promptInFlight = false; }, 600);
      });
    }catch(e){
      console.error("google prompt error:", e);
      window.showGoogleButtonFallback?.("prompt error");
      st.promptInFlight = false;
    }

  } else {
    alert("Apple girişi yakında evladım.");
  }
}

export async function acceptTerms() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  const email = String(user?.email || "").toLowerCase().trim();
  if(!email) return false;

  const ts = new Date().toISOString();
  localStorage.setItem(termsKey(email), ts);

  user.terms_accepted_at = ts;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return true;
}

export function logout() {
  if(confirm("Gidiyor musun evladım?")){
    try{ window.google?.accounts?.id?.disableAutoSelect?.(); }catch(e){}
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    localStorage.removeItem(API_TOKEN_KEY);
    // stable id kalsın (istersen sileriz ama genelde kalsın)
    window.location.reload();
  }
}
