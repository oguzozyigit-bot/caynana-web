/* js/profile.js (v1.0 - ANAYASA UYUMLU PROFIL) */
import { BASE_DOMAIN } from "./config.js";

let currentProfile = {};
let lastUserInfo = {};

export function initProfile() {
  console.log("👤 Profil Modülü Başlatılıyor...");

  // Save
  const saveBtn = document.getElementById("profileSave");
  if (saveBtn) {
    saveBtn.onclick = null;
    saveBtn.addEventListener("click", saveProfile);
  }

  // Close (zorunlu modda gizlenecek)
  const closeBtn = document.getElementById("profileCloseX");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const modal = document.getElementById("profileModal");
      if (modal && modal.dataset.locked !== "1") modal.style.display = "none";
    });
  }
}

/**
 * forceCheck=true → Profil eksikse modal zorunlu açılır ve kapatılamaz.
 */
export async function loadProfile(forceCheck = false) {
  const token = localStorage.getItem("auth_token");
  const userInfo = safeJSON(localStorage.getItem("user_info")) || {};
  lastUserInfo = userInfo;

  // ID kilitli: Google sub (auth decode eden modülün user_info.id yazması lazım)
  const lockedId = userInfo.id || userInfo.user_id || null;

  // 1) Önce local profili oku (hız)
  const localProf = userInfo.profile || safeJSON(localStorage.getItem("profile_local")) || {};
  currentProfile = localProf;

  // UI doldur
  updateUI(currentProfile, lockedId, userInfo.avatar || "");
  fillForm(currentProfile, lockedId);

  // 2) Backend varsa dene (opsiyonel)
  if (token) {
    try {
      const res = await fetch(`${BASE_DOMAIN}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const prof = (data.profile || {});
        currentProfile = prof;

        // local'e yaz (fallback)
        userInfo.profile = prof;
        localStorage.setItem("user_info", JSON.stringify(userInfo));
        localStorage.setItem("profile_local", JSON.stringify(prof));

        updateUI(prof, data.user_id || lockedId, userInfo.avatar || "");
        fillForm(prof, data.user_id || lockedId);
      }
    } catch (e) {
      // backend yoksa sorun değil
      console.log("ℹ️ profile/me erişilemedi, local ile devam.");
    }
  }

  // 3) Zorunlu kontrol
  if (forceCheck) {
    if (!isProfileValid(currentProfile, lockedId)) {
      console.log("⚠️ Profil eksik! Zorunlu açılıyor...");
      openProfileModal(false); // kapatılamaz
    }
  }
}

export function openProfileModal(canClose = true) {
  const modal = document.getElementById("profileModal");
  const closeBtn = document.getElementById("profileCloseX");
  if (!modal) return;

  modal.style.display = "flex";
  modal.dataset.locked = canClose ? "0" : "1";

  if (closeBtn) {
    closeBtn.style.display = canClose ? "block" : "none";
  }
}

export async function saveProfile() {
  const token = localStorage.getItem("auth_token");
  const userInfo = safeJSON(localStorage.getItem("user_info")) || {};
  const lockedId = userInfo.id || userInfo.user_id || null;

  // Anayasa zorunluları:
  const p = {
    hitap: val("pfHitap"),                 // zorunlu
    gender: val("pfGender"),               // zorunlu
    maritalStatus: val("pfMaritalStatus"), // zorunlu

    // Opsiyoneller:
    team: val("pfTeam"),
    region: val("pfRegion"),
    city: val("pfCity")
  };

  // Zorunlu kontrol (ID + 3 alan)
  if (!lockedId || !p.hitap || !p.gender || !p.maritalStatus) {
    alert("Evladım… Profil zorunlu: Hitap, Cinsiyet, Medeni Hâl. (ID zaten kilitli.)");
    openProfileModal(false);
    return;
  }

  const statusDiv = document.getElementById("profileStatus");
  if (statusDiv) statusDiv.innerText = "Kaydediyorum...";

  // 1) Local’e kaydet (her koşulda)
  userInfo.profile = p;
  localStorage.setItem("user_info", JSON.stringify(userInfo));
  localStorage.setItem("profile_local", JSON.stringify(p));
  currentProfile = p;

  // UI güncelle
  updateUI(p, lockedId, userInfo.avatar || "");

  // 2) Backend varsa gönder (opsiyonel)
  if (token) {
    try {
      const res = await fetch(`${BASE_DOMAIN}/api/profile/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ profile: p })
      });

      if (!res.ok) {
        // backend yoksa bile local çalışır
        console.log("ℹ️ profile/set başarısız, local ile devam.");
      }
    } catch (e) {
      console.log("ℹ️ profile/set erişilemedi, local ile devam.");
    }
  }

  // Modalı kapat (kilit kaldır)
  const modal = document.getElementById("profileModal");
  if (modal) {
    modal.dataset.locked = "0";
    modal.style.display = "none";
  }

  if (statusDiv) statusDiv.innerText = "Aferin. Kaydettim.";
  setTimeout(() => { if (statusDiv) statusDiv.innerText = ""; }, 900);
}

/* ---------------- Helpers ---------------- */

function val(id) {
  const el = document.getElementById(id);
  return el ? (el.value || "").trim() : "";
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = (v ?? "");
}

function safeJSON(s) {
  try { return JSON.parse(s || ""); } catch { return null; }
}

function fillForm(p, lockedId) {
  // ID kilitli gösterim (input değil text)
  const idEl = document.getElementById("pfId");
  if (idEl) idEl.innerText = lockedId ? lockedId : "-";

  setVal("pfHitap", p.hitap);
  setVal("pfGender", p.gender);
  setVal("pfMaritalStatus", p.maritalStatus);
  setVal("pfTeam", p.team);
  setVal("pfRegion", p.region);
  setVal("pfCity", p.city);
}

function updateUI(p, lockedId, avatarUrl) {
  // Drawer alanları (senin HTML’ine göre ids)
  const dName = document.getElementById("dpName");
  const dCN = document.getElementById("dpCN");
  const dAvatar = document.getElementById("dpAvatar");

  // Modal başlık alanları
  const pCN = document.getElementById("profileCN");
  const pAvatar = document.getElementById("profileAvatar");

  const name = (p.hitap || lastUserInfo.hitap || "Evladım");
  const idStr = lockedId || "CN-????";

  if (dName) dName.innerText = name;
  if (dCN) dCN.innerText = `ID: ${idStr}`;
  if (pCN) pCN.innerText = `ID: ${idStr}`;

  if (avatarUrl) {
    if (dAvatar) dAvatar.src = avatarUrl;
    if (pAvatar) pAvatar.src = avatarUrl;
  }
}

function isProfileValid(p, lockedId) {
  return !!(lockedId && p && p.hitap && p.gender && p.maritalStatus);
}
// ... (Mevcut kodların altına ekle) ...

// Profil Sayfasından Çıkış Yapma (Döngüyü Kırmak İçin)
window.logoutFromProfile = function() {
    if(confirm("Profil oluşturmayı iptal edip çıkış yapmak istiyor musun?")) {
        localStorage.removeItem(STORAGE_KEY); // Hafızayı sil
        window.location.href = '../index.html'; // Ana sayfaya (Login'e) dön
    }
}
