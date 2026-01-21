/* js/ui_modals.js (v1.1 - TEK EKRAN / ANAYASA UYUMLU) */

// --- ANA UI BAŞLATICI ---
export function initUi() {
  console.log("🎨 UI Modülleri Başlatılıyor...");

  setupMenuDrawer();
  setupModals();
  setupPersonaModal();
  setupNotifications();
  setupPhotoModal();
}

// --- MENÜ (DRAWER) ---
function setupMenuDrawer() {
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("drawerClose");
  const drawer = document.getElementById("drawer");
  const mask = document.getElementById("drawerMask");

  function toggleDrawer(show) {
    if (!drawer || !mask) return;
    if (show) {
      drawer.classList.add("open");
      mask.style.display = "block";
    } else {
      drawer.classList.remove("open");
      mask.style.display = "none";
    }
  }

  if (menuBtn) menuBtn.addEventListener("click", () => toggleDrawer(true));
  if (closeBtn) closeBtn.addEventListener("click", () => toggleDrawer(false));
  if (mask) mask.addEventListener("click", () => toggleDrawer(false));

  setupDrawerLinks(toggleDrawer);
}

function setupDrawerLinks(toggleDrawer) {
  // Profil
  const openProfile = document.getElementById("openProfileBtn");
  if (openProfile) {
    openProfile.addEventListener("click", () => {
      toggleDrawer(false);
      const pm = document.getElementById("profileModal");
      if (pm) pm.style.display = "flex";
    });
  }

  // Giriş (opsiyonel) - Auth modal varsa açar.
  // Not: V1’de Google giriş zorunlu ise zaten app açılışında göster.
  const openLogin = document.getElementById("openLoginBtn");
  if (openLogin) {
    openLogin.addEventListener("click", () => {
      toggleDrawer(false);
      const am = document.getElementById("authModal");
      if (am) am.style.display = "flex";
    });
  }

  // Sayfa içerikleri (tek ekranı bozmadan modal)
  bindPageModal("aboutBtn", "Hakkımızda",
    "Caynana.ai, yapay zekânın geleneksel aklıdır.<br>Anne şefkatiyle yaklaşır ama lafını da esirgemez.");
  bindPageModal("faqBtn", "Sık Sorulan Sorular",
    "<b>Ücretli mi?</b><br>Hayır, temel kullanım ücretsiz.<br><br><b>Fal gerçek mi?</b><br>Eğlence amaçlıdır evladım.");
  bindPageModal("contactBtn", "İletişim",
    "Bize her zaman yazabilirsin: iletisim@caynana.ai");
  bindPageModal("privacyBtn", "Gizlilik",
    "Verilerin bizde güvende. Kimseyle paylaşmıyoruz.");

  function bindPageModal(btnId, title, content) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      toggleDrawer(false);
      showPage(title, content);
    });
  }
}

// --- SAYFA MODALI ---
function showPage(title, content) {
  const modal = document.getElementById("pageModal");
  const tEl = document.getElementById("pageTitle");
  const bEl = document.getElementById("pageBody");

  if (tEl) tEl.innerText = title;
  if (bEl) bEl.innerHTML = content;
  if (modal) modal.style.display = "flex";

  const close = document.getElementById("pageClose");
  if (close && modal) {
    const newClose = close.cloneNode(true);
    close.parentNode.replaceChild(newClose, close);
    newClose.addEventListener("click", () => (modal.style.display = "none"));
  }
}

// --- PERSONA MODALI (opsiyonel) ---
export function setupPersonaModal() {
  const btn = document.getElementById("personaBtn");
  const modal = document.getElementById("personaModal");
  const close = document.getElementById("personaClose");

  if (btn && modal) btn.addEventListener("click", () => (modal.style.display = "flex"));
  if (close && modal) close.addEventListener("click", () => (modal.style.display = "none"));

  document.querySelectorAll(".persona-opt").forEach((opt) => {
    if (opt.classList.contains("locked")) return;
    opt.addEventListener("click", () => {
      document.querySelectorAll(".persona-opt").forEach((el) => el.classList.remove("selected"));
      opt.classList.add("selected");
      if (modal) modal.style.display = "none";
    });
  });
}

// --- BİLDİRİMLER (opsiyonel) ---
export function setupNotifications() {
  const btn = document.getElementById("notifIconBtn");
  const modal = document.getElementById("notifModal");
  const close = document.getElementById("notifClose");
  const list = document.getElementById("notifList");

  if (btn && modal) {
    btn.addEventListener("click", () => {
      modal.style.display = "flex";
      const badge = document.getElementById("notifBadge");
      if (badge) badge.style.display = "none";
    });
  }
  if (close && modal) close.addEventListener("click", () => (modal.style.display = "none"));

  if (list && list.children.length === 0) {
    list.innerHTML = `
      <div style="padding:15px; border-bottom:1px solid rgba(255,255,255,.08);">
        <div style="font-weight:800;">Hoş geldin evladım</div>
        <div style="font-size:13px; color:#aaa; margin-top:4px;">Caynana seni özlemişti.</div>
      </div>`;
  }
}

// --- FOTOĞRAF MODALI (fal için) ---
function setupPhotoModal() {
  const cancel = document.getElementById("photoCancelBtn");
  const modal = document.getElementById("photoModal");
  if (cancel && modal) cancel.addEventListener("click", () => (modal.style.display = "none"));
}

// --- GENEL MODAL KAPATMA (MASK) ---
function setupModals() {
  document.querySelectorAll(".modalMask").forEach((mask) => {
    mask.addEventListener("click", (e) => {
      if (e.target !== mask) return;

      // Zorunlu profil kapatılamaz
      if (mask.id === "profileModal") {
        const closeBtn = document.getElementById("profileCloseX");
        if (closeBtn && closeBtn.style.display === "none") return;
      }

      mask.style.display = "none";
    });
  });

  // Auth modal kapatma
  const authModal = document.getElementById("authModal");
  const authClose = document.getElementById("authClose");
  const authCloseX = document.getElementById("authCloseX");

  if (authModal) {
    if (authClose) authClose.addEventListener("click", () => (authModal.style.display = "none"));
    if (authCloseX) authCloseX.addEventListener("click", () => (authModal.style.display = "none"));
  }
}
