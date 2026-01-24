// js/auth.js (v5.2 FINAL - Google Login FIX + JWT decode + terms_accepted_at uyumu)

import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs){
    if (window.google?.accounts?.id) return true;
    await sleep(50);
  }
  return false;
}

// --- Base64URL -> JSON decode (FIX) ---
function parseJwt(idToken = ""){
  try{
    const parts = String(idToken).split(".");
    if(parts.length < 2) return null;

    let base64Url = parts[1];
    // base64url -> base64
    base64Url = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // padding ekle
    const pad = base64Url.length % 4;
    if(pad) base64Url += "=".repeat(4 - pad);

    const json = atob(base64Url);
    return JSON.parse(json);
  }catch(e){
    console.error("parseJwt failed:", e);
    return null;
  }
}

export function initAuth() {
  // GSI hazır değilse çık
  if (!window.google?.accounts?.id) return;

  // initialize
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false,
    // itp_support: true // istersen açabilirsin (Safari vb.)
  });

  // İstersen burada otomatik prompt deneme yapma,
  // butonla tetikleyelim (popup/3rd party cookie daha stabil)
}

async function handleGoogleResponse(res){
  try{
    const token = res?.credential || "";
    if(!token) {
      console.warn("GSI callback geldi ama credential boş:", res);
      return;
    }

    // ID token sakla
    localStorage.setItem("google_id_token", token);

    // JWT payload decode (FIX)
    const payload = parseJwt(token);
    if(!payload?.email){
      alert("Google token çözülemedi. Client ID / domain ayarlarını kontrol et.");
      return;
    }

    // User objesi: main.js ile UYUMLU alanlar
    const user = {
      id: payload.email,                 // benzersiz id
      email: payload.email,
      fullname: payload.name || "",      // main.js bunu kullanıyor
      avatar: payload.picture || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),

      // main.js terms kontrolü buradan yapıyor:
      terms_accepted_at: null,

      // opsiyonel: samimiyet
      yp_percent: 50
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.location.reload();
  }catch(e){
    console.error("handleGoogleResponse error:", e);
    alert("Google girişinde bir hata oldu. Console'u kontrol et.");
  }
}

export function handleLogin(provider) {
  if(provider === "google") {
    if(window.google?.accounts?.id){
      // Prompt aç
      window.google.accounts.id.prompt((n)=>{
        // bazen prompt gösterilemeyebilir
        if(n?.isNotDisplayed?.() || n?.isSkippedMoment?.()){
          console.warn("Google prompt gösterilemedi:", n);
          window.showGoogleButtonFallback?.("prompt not displayed");
        }
      });
    } else {
      alert("Google servisi yüklenemedi (GSI).");
    }
  } else {
    alert("Apple girişi yakında evladım.");
  }
}

export async function acceptTerms() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  if(user?.id){
    user.terms_accepted_at = new Date().toISOString(); // ✅ main.js ile uyumlu
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return true;
  }
  return false;
}

export function logout() {
  if(confirm("Gidiyor musun evladım?")){
    try{
      window.google?.accounts?.id?.disableAutoSelect?.();
    }catch(e){}
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    window.location.reload();
  }
}
