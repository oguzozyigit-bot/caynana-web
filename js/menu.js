// js/menu.js
export async function initMenu() {
  await loadMenuPartial();
  bindMenuEvents();
}

async function loadMenuPartial() {
  const res = await fetch("partials/menu.html");
  const html = await res.text();
  const container = document.getElementById("menuContainer");
  if (container) container.innerHTML = html;
}

function bindMenuEvents() {
  const overlay = document.getElementById("menuOverlay");
  const hambBtn = document.getElementById("hambBtn");

  if (hambBtn && overlay) {
    hambBtn.addEventListener("click", () => toggleMenu());
  }

  // overlay dışına tıklayınca kapat
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) toggleMenu(false);
    });
  }
}

export function toggleMenu(force) {
  const overlay = document.getElementById("menuOverlay");
  if (!overlay) return;

  if (typeof force === "boolean") {
    overlay.classList.toggle("open", force);
  } else {
    overlay.classList.toggle("open");
  }
}
