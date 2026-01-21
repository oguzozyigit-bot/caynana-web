// js/notif.js
import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";

let RUNTIME_BASE = null;

function escapeHtml(s=""){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function iconFor(type){
  if(type==="match") return "⚽";
  if(type==="horoscope") return "♈";
  if(type==="diet") return "🥗";
  if(type==="spouse_bday") return "🎂";
  if(type==="child_bday") return "🧒";
  if(type==="wedding") return "💍";
  if(type==="engagement") return "💐";
  if(type==="met") return "✨";
  if(type==="period_check") return "🌙";
  return "🔔";
}

function timeLabel(daysLeft){
  if(daysLeft === 0) return "Bugün";
  if(daysLeft === 1) return "1 gün kaldı";
  if(daysLeft === 2) return "2 gün kaldı";
  if(daysLeft === 3) return "3 gün kaldı";
  return "";
}

async function fetchNotificationsToday(){
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  if(!user?.id) return [];

  try{
    const apiBase = RUNTIME_BASE || BASE_DOMAIN;
    const url = `${apiBase}/api/reminders/today?user_id=${encodeURIComponent(user.id)}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return data?.items || [];
  }catch(e){
    console.log("notif fetch err:", e);
    return [];
  }
}

/* =========================
   RENDER (SCOPE SAFE)
========================= */
function renderNotifications(items, { mount } = {}){
  const root = mount || document;
  const badge = root.querySelector("#notifBadge");
  const list  = root.querySelector("#notifList");
  if(!list) return;

  if(badge) badge.style.display = items.length ? "block" : "none";

  if(!items.length){
    list.innerHTML = `
      <div class="notif-item">
        <div class="notif-icon">🧿</div>
        <div class="notif-content">
          <div class="notif-title">Bugün sakin</div>
          <div class="notif-desc">Evladım bugün hatırlatmam yok. Ben yine buradayım.</div>
          <div class="notif-time">—</div>
        </div>
      </div>`;
    return;
  }

  // ✅ Inline onclick yok → data-url var
  list.innerHTML = items.map(it => {
    const url = (it.action_url || "").trim();
    const clickableClass = url ? "notif-clickable" : "";
    const dataUrl = url ? `data-url="${escapeHtml(url)}"` : "";
    return `
      <div class="notif-item ${clickableClass}" ${dataUrl}>
        <div class="notif-icon">${iconFor(it.type)}</div>
        <div class="notif-content">
          <div class="notif-title">${escapeHtml(it.title || "")}</div>
          <div class="notif-desc">${escapeHtml(it.message || "")}</div>
          <div class="notif-time">${timeLabel(it.days_left)}</div>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   PARTIAL LOADER
========================= */
export async function loadNotifPartial({ containerId = "notifMount" } = {}){
  const mount = document.getElementById(containerId);
  if(!mount) return;

  // Zaten doluysa tekrar yükleme (index.html'de varsa koru)
  if (mount.children.length > 0 || (mount.innerHTML || "").trim().length > 0) return;

  // Eğer HTML boşsa partial yükle (Fallback)
  try{
    const res = await fetch("./partials/notif.html", { cache: "no-cache" });
    if(!res.ok) throw new Error("notif partial http " + res.status);
    mount.innerHTML = await res.text();
  }catch(e){
    // Partial yoksa manuel bas
    mount.innerHTML = `
      <button class="notif-btn" id="notifBtn" type="button" aria-label="Bildirimler">
        <svg viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <div class="badge" id="notifBadge" style="display:none;"></div>
      </button>
      <div class="notification-dropdown" id="notifDropdown">
        <div class="notif-header">Bildirimler</div>
        <div class="notif-list" id="notifList"></div>
      </div>
    `;
  }
}

/* =========================
   UI BINDINGS (SCOPE SAFE)
========================= */
function bindNotifUi({ mount } = {}){
  const root = mount || document;
  const btn = root.querySelector("#notifBtn");
  const dd  = root.querySelector("#notifDropdown");
  const badge = root.querySelector("#notifBadge");
  const list = root.querySelector("#notifList");

  if(!btn || !dd) return;

  // Çift init olursa event çakışmasın
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", (e) => {
    e.preventDefault();
    dd.classList.toggle("show");
    if (badge) badge.style.display = "none";
  });

  // ✅ Tıklanabilir item navigation (event delegation)
  if (list) {
    const newList = list.cloneNode(true);
    list.parentNode.replaceChild(newList, list);

    newList.addEventListener("click", (e) => {
      const item = e.target?.closest?.(".notif-item");
      if(!item) return;
      const url = item.getAttribute("data-url");
      if(url) window.location.href = url;
    });
  }

  // ✅ Dışarı tıkla kapan (tek ekran davranışı)
  document.addEventListener("click", (e) => {
    const inside = root.contains(e.target);
    if(!inside && dd.classList.contains("show")) dd.classList.remove("show");
  });
}

/* =========================
   INIT
========================= */
export async function initNotifications({ mount } = {}){
  const root = mount || document;

  async function refresh(){
    const items = await fetchNotificationsToday();
    // mount içini scoped render
    renderNotifications(items, { mount: root });
  }

  // UI event’leri bağla (id çakışmasını minimize eder)
  bindNotifUi({ mount: root });

  // İlk yükleme
  await refresh();

  // Dakikada bir güncelle
  setInterval(refresh, 60_000);
}

export async function initNotif({ baseUrl } = {}) {
  if (baseUrl) RUNTIME_BASE = baseUrl;

  await loadNotifPartial({ containerId: "notifMount" });

  // notifMount scope al
  const mount = document.getElementById("notifMount") || document;
  return initNotifications({ mount });
}
