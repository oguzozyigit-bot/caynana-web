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

function renderNotifications(items){
  const badge = document.getElementById("notifBadge");
  const list = document.getElementById("notifList");
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

  list.innerHTML = items.map(it => {
    const clickable = it.action_url ? "cursor:pointer;" : "";
    const onclick = it.action_url ? `location.href='${it.action_url}'` : "";
    return `
      <div class="notif-item" style="${clickable}" onclick="${onclick}">
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
      <button class="notif-btn" id="notifBtn">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <div class="badge" id="notifBadge" style="display:none;"></div>
      </button>
      <div class="notification-dropdown" id="notifDropdown">
        <div class="notif-header">Bildirimler</div>
        <div class="notif-list" id="notifList"></div>
      </div>
    `;
  }
}

export async function initNotifications(){
  async function refresh(){
    const items = await fetchNotificationsToday();
    renderNotifications(items);
  }

  // İlk yükleme
  await refresh();

  // Dakikada bir güncelle
  setInterval(refresh, 60_000);

  // NOT: Buradaki click listener'ları sildim çünkü index.html zaten yönetiyor.
  // Çakışma engellendi.
}

export async function initNotif({ baseUrl } = {}) {
  if (baseUrl) RUNTIME_BASE = baseUrl;
  await loadNotifPartial({ containerId: "notifMount" });
  return initNotifications();
}
