/* js/auth.js - TEK GİRİŞ (AUTO ID + TERMS + PROFILE SUGGEST) */
import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

let tokenClient;

export function initAuth() {
  if (window.google) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          fetchGoogleProfile(tokenResponse.access_token);
        }
      },
    });
  }
}

export function handleLogin(provider) {
  if (provider === "google") {
    if (tokenClient) tokenClient.requestAccessToken();
    else alert("Google servisi bekleniyor...");
    return;
  }
  // Apple şimdilik placeholder
  alert("Apple yakında evladım. Şimdilik Google ile devam et.");
}

async function fetchGoogleProfile(accessToken) {
  try {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const googleData = await r.json();

    const email = (googleData.email || "").trim().toLowerCase();
    if (!email) {
      alert("Google email vermedi evladım. Tekrar dene.");
      return;
    }

    // ✅ Ana kimlik: email
    const uid = email;

    // Localdeki eski veriyi bozmadan merge
    const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const updatedUser = {
      ...storedUser,
      id: uid,
      email,
      fullname: googleData.name || storedUser.fullname || "",
      avatar: googleData.picture || storedUser.avatar || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

    // ✅ Sunucudan profile meta çek (terms / profile completeness)
    const serverMeta = await fetchServerProfile(uid, email);

    // Sunucu meta varsa local user'a göm (profil hızlı açılsın)
    if (serverMeta) {
      Object.assign(updatedUser, serverMeta);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    }

    // ✅ Terms yoksa -> sözleşme overlay aç
    const termsOk = !!(serverMeta?.terms_accepted_at || updatedUser.terms_accepted_at);
    if (!termsOk) {
      window.showTermsOverlay?.(); // index.html’de tanımlayacağız
      return;
    }

    // ✅ İçeri al
    window.enterApp?.();

  } catch (err) {
    console.error("Auth Error:", err);
    alert("Girişte bir sorun oldu evladım. Tekrar dene.");
  }
}

async function fetchServerProfile(uid, email) {
  try {
    const url = `${BASE_DOMAIN}/api/profile/get?user_id=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.found && data?.meta) return data.meta;
    return {};
  } catch (e) {
    console.log("Profile get failed:", e);
    return {};
  }
}

// ✅ Terms onayını backend’e yaz
export async function acceptTerms() {
  const user = safeJson(localStorage.getItem(STORAGE_KEY), {});
  if (!user?.id || !user?.email) return false;

  const payload = {
    user_id: user.id,
    meta: {
      email: user.email,
      terms_accepted_at: new Date().toISOString(),
    },
  };

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/profile/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    if (out?.ok) {
      user.terms_accepted_at = payload.meta.terms_accepted_at;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return true;
    }
  } catch (e) {
    console.log("acceptTerms failed:", e);
  }
  return false;
}

// Soft logout (hafıza kalsın)
export function logout() {
  if (confirm("Oturumu kapatmak istiyor musun? (Bilgilerin silinmez)")) {
    const user = safeJson(localStorage.getItem(STORAGE_KEY), {});
    user.isSessionActive = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.location.href = "/index.html";
  }
}

function safeJson(s, fallback) {
  try { return JSON.parse(s || ""); } catch { return fallback; }
}
