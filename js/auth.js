/* js/auth.js - TEK GİRİŞ (ID_TOKEN) + TERMS + PROFILE - FINAL (CORS FIX) */
import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

/*
  ✅ Bu sürümde:
  - google.accounts.id (One Tap / Sign in with Google) ile ID TOKEN (JWT) alırız.
  - Tarayıcıdan googleapis userinfo çağrısı YOK → CORS yok.
  - Email / name / picture JWT içinden gelir.
  - Mevcut backend /api/profile/get ve /api/profile/update aynı şekilde çalışır.
*/

export function initAuth() {
  // Google Identity Services yüklendiyse init et
  if (!window.google || !google.accounts || !google.accounts.id) {
    console.warn("Google Identity henüz hazır değil.");
    return;
  }

  // Button render (istersen görünür buton yerine kendi butonunu kullan)
  // Biz kendi butonumuza basınca prompt tetikleyeceğiz.
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      const idToken = (response && response.credential) ? String(response.credential) : "";
      if (!idToken) {
        console.warn("Google credential (id_token) gelmedi.");
        return;
      }
      // Token'ı sakla (ileride backend auth yaparsan kullanırsın)
      localStorage.setItem("google_id_token", idToken);
      fetchGoogleProfileFromIdToken(idToken);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

export function handleLogin(provider) {
  if (provider === "google") {
    if (!window.google || !google.accounts || !google.accounts.id) {
      alert("Google servisi bekleniyor...");
      return;
    }
    // One Tap / popup prompt
    google.accounts.id.prompt((notif) => {
      // Bazı tarayıcılarda prompt kapalıysa kullanıcıya bilgi verelim
      if (notif.isNotDisplayed?.() || notif.isSkippedMoment?.()) {
        console.warn("Google prompt gösterilemedi:", notif.getNotDisplayedReason?.() || notif.getSkippedReason?.());
      }
    });
    return;
  }

  alert("Apple yakında evladım. Şimdilik Google ile devam et.");
}

/* =========================
   ID TOKEN ile Profil Çekme
========================= */
async function fetchGoogleProfileFromIdToken(idToken) {
  try {
    // JWT decode → email, name, picture
    const claims = decodeJwtPayload(idToken) || {};
    const email = String(claims.email || "").trim().toLowerCase();
    const name = String(claims.name || "").trim();
    const picture = String(claims.picture || "").trim();

    // Email yoksa: misafir devam (chat açılsın)
    if (!email) {
      console.warn("Google email alınamadı. Misafir moduna geçiliyor.");
      const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
      const updatedUser = {
        ...storedUser,
        id: storedUser?.id || "guest",
        provider: "guest",
        isSessionActive: true,
        lastLoginAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      window.enterApp?.();
      return;
    }

    // ✅ Ana kimlik: email
    const uid = email;

    // Local merge
    const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const updatedUser = {
      ...storedUser,
      id: uid,
      email,
      fullname: name || storedUser.fullname || "",
      avatar: picture || storedUser.avatar || "",
      provider: "google",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

    // ✅ Sunucu profili (fail olursa kilitleme yok)
    let serverMeta = {};
    try {
      serverMeta = await fetchServerProfile(uid, email);
    } catch (e) {
      console.warn("Server profile alınamadı, chat devam ediyor", e);
      serverMeta = {};
    }

    // Sunucu meta varsa local’e göm
    if (serverMeta && typeof serverMeta === "object") {
      Object.assign(updatedUser, serverMeta);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    }

    // ✅ Terms kontrol (kilitleme yok, sadece overlay)
    const termsOk = !!(serverMeta?.terms_accepted_at || updatedUser.terms_accepted_at);
    if (!termsOk) {
      window.showTermsOverlay?.();
    }

    // ✅ Tek noktadan içeri al
    window.enterApp?.();
    return;

  } catch (err) {
    console.error("Auth Error:", err);

    // Burada da kilitleme yok → misafir devam
    const storedUser = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const updatedUser = {
      ...storedUser,
      id: storedUser?.id || "guest",
      provider: storedUser?.provider || "guest",
      isSessionActive: true,
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    window.enterApp?.();
  }
}

/* =========================
   Backend Profile
========================= */
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

/*
  ID Token (JWT) payload decode
*/
function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
