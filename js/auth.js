/* js/auth.js - TEK GİRİŞ (ID_TOKEN) + TERMS + PROFILE - FINAL (CORS FIX + FALLBACK BUTTON) */
import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

/*
  ✅ Bu sürümde:
  - google.accounts.id ile ID TOKEN (JWT) alırız.
  - Tarayıcıdan googleapis userinfo çağrısı YOK → CORS yok.
  - Email / name / picture JWT içinden gelir.
  - /api/profile/get ve /api/profile/update aynı şekilde çalışır.
  - prompt görünmezse renderButton fallback devreye girer.
*/

let _gisInitialized = false;

export function initAuth() {
  if (_gisInitialized) return;

  // Google Identity Services yüklendiyse init et
  if (!window.google || !google.accounts || !google.accounts.id) {
    console.warn("Google Identity henüz hazır değil.");
    return;
  }

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

  _gisInitialized = true;

  // ✅ Fallback: sayfada bir div varsa Google butonu render et
  // HTML'de örnek: <div id="googleBtnMount"></div>
  const mount = document.getElementById("googleBtnMount");
  if (mount) {
    try {
      google.accounts.id.renderButton(mount, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 260
      });
    } catch (e) {
      console.warn("renderButton failed:", e);
    }
  }
}

export function handleLogin(provider) {
  if (provider !== "google") {
    alert("Apple yakında evladım. Şimdilik Google ile devam et.");
    return;
  }

  if (!window.google || !google.accounts || !google.accounts.id) {
    alert("Google servisi bekleniyor...");
    return;
  }

  // One Tap / popup prompt
  google.accounts.id.prompt((notif) => {
    // Prompt kapanır / görünmez olursa fallback buton devreye girsin
    const notDisplayed = notif.isNotDisplayed?.();
    const skipped = notif.isSkippedMoment?.();

    if (notDisplayed || skipped) {
      const reason = notif.getNotDisplayedReason?.() || notif.getSkippedReason?.() || "unknown";
      console.warn("Google prompt gösterilemedi:", reason);

      // Kullanıcıya “fallback buton” göster
      // (UI senin tarafta: istersen bir modal açtır)
      window.showGoogleButtonFallback?.(reason);

      // Eğer sayfada mount yoksa en azından bilgi verelim
      const mount = document.getElementById("googleBtnMount");
      if (!mount) {
        alert("Google giriş penceresi açılamadı. Lütfen sayfada Google butonunu kullan (googleBtnMount).");
      }
    }
  });
}

/* =========================
   ID TOKEN ile Profil Çekme
========================= */
async function fetchGoogleProfileFromIdToken(idToken) {
  try {
    // JWT decode → email, name, picture
    const claims = decodeJwtPayload(idToken) || {};

    // ✅ Basit doğrulamalar (UI güveni için)
    // Not: Asıl doğrulama backend’de yapılır; burada sadece “bozuk token”ı elemek için.
    if (claims.aud && String(claims.aud) !== String(GOOGLE_CLIENT_ID)) {
      throw new Error("JWT aud uyuşmuyor (client_id).");
    }
    if (claims.exp && Date.now() > (Number(claims.exp) * 1000)) {
      throw new Error("JWT süresi dolmuş (exp).");
    }

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
    const res = await fetch(url, { method: "GET" });
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
  - base64url + padding fix
*/
function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    let base64Url = parts[1];
    base64Url = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // ✅ padding fix
    const pad = base64Url.length % 4;
    if (pad) base64Url += "=".repeat(4 - pad);

    const json = decodeURIComponent(
      atob(base64Url)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
