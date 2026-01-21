// js/menu.js (v1.1 - FAIL-SAFE + IDEMPOTENT)
// - menuContainer varsa ve boşsa partial inject eder
// - doluysa dokunmaz
// - fetch patlarsa siteyi kırmaz
// - event binding çift bağlanmaz (cloneNode)

/* Public */
export async function initMenu() {
  await loadMenuPartial();
  bindMenuEvents();
}

/* =========================
   PARTIAL LOADER
========================= */
async function loadMenuPartial() {
  const container = document.getElementById("menuContainer");
  if (!container) return;

  // Zaten içerik varsa dokunma
  if (container.children.length > 0 || (container.innerHTML || "").trim().length > 0) return;

  try {
    const res = await fetch("partials/menu.html", { cache: "no-cache" });
    if (!res.ok) throw new Error("menu partial http " + res.status);
    const html = await res.text();
    container.innerHTML = html;
  } catch (e) {
    console.warn("menu partial yüklenemedi, devam:", e);
    // fallback: hiçbir şey basma (siteyi kırma)
  }
}

/* =========================
   EVENTS (IDEMPOTENT)
========================= */
function bindMenuEvents() {
  const overlay = document.getElementById("menuOverlay");
  const hambBtn = document.getElementById("hambBtn");

  // Elemanlar yoksa sessiz çık
  if (!overlay && !hambBtn) return;

  // ✅ Çift init olursa çift event olmasın
  if (hambBtn) {
    const newBtn = hambBtn.cloneNode(true);
    hambBtn.parentNode.replaceChild(newBtn, hambBtn);
    newBtn.addEventListener("click", () => toggleMenu());
  }

  // overlay dışına tıklayınca kapat (idempotent)
  if (overlay) {
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);

    newOverlay.addEventListener("click", (e) => {
      if (e.target === newOverlay) toggleMenu(false);
    });
  }
}

/* =========================
   TOGGLE
========================= */
export function toggleMenu(force) {
  const overlay = document.getElementById("menuOverlay");
  if (!overlay) return;

  if (typeof force === "boolean") {
    overlay.classList.toggle("open", force);
  } else {
    overlay.classList.toggle("open");
  }
}
