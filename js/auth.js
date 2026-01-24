// js/auth.js (FINAL - Google GSI + JWT base64url decode + main.js uyumu)

import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GSI hazır mı?
export async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs){
    if (window.google?.accounts?.id) return true;
    await sleep(50);
  }
  return false;
}

// Base64URL -> JSON (FIX)
function parseJwt(idToken = ""){
  try{
    const parts = String(idToken).split(".");
    if(parts.length < 2) return null;

    let base64Url = parts[1];
    base64Url = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // padding
    const pad = base64Url.length % 4;
    if(pad) base64Url += "=".repeat(4 - pad);

    return JSON.parse(atob(base64Url));
  }catch(e){
    console.error("parseJwt failed:", e);
    return null;
  }
}

export function initAuth() {
  if (!window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false
  });
}

// Google callback
async function handleGoogleResponse(res){
  try{
    const token = res?.credential || "";
    if(!token) return;

    localStorage.setItem("google_id_token", token);

    const payload = parseJwt(token);
    if(!payload?.email){
      alert("Google token çözülemedi. Client ID / domain ayarlarını kontrol et.");
      return;
    }

    // ✅ main.js ile uyumlu user objesi
    const user = {
      id: payload.email,
      email: payload.email,
      fullname: payload.name || "",      // main.js firstName(u.fullname) kullanıyor
      avatar: payload.picture || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),

      // ✅ terms gate
      terms_accepted_at: null,

      // opsiyonel
      yp_percent: 50
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.location.reload();
  }catch(e){
    console.error("handleGoogleResponse error:", e);
    alert("Google girişinde hata oldu. Console'u kontrol et.");
  }
}

export function handleLogin(provider) {
  if(provider === "google") {
    if(window.google?.accounts?.id){
      window.google.accounts.id.prompt((n)=>{
        // prompt çıkmadıysa yardımcı mesaj
        if(n?.isNotDisplayed?.() || n?.isSkippedMoment?.()){
          console.warn("Google prompt gösterilemedi:", n);
          window.showGoogleButtonFallback?.("prompt not displayed");
        }
      });
    } else {
      alert("Google servisi yüklenemedi.");
    }
  } else {
    alert("Apple girişi yakında evladım.");
  }
}

export async function acceptTerms() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  if(user?.id){
    // ✅ main.js bunu arıyor
    user.terms_accepted_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return true;
  }
  return false;
}

export function logout() {
  if(confirm("Gidiyor musun evladım?")){
    try{ window.google?.accounts?.id?.disableAutoSelect?.(); }catch(e){}
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    window.location.reload();
  }
}
