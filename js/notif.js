// js/notif.js (FINAL - SAFE RENDER ONLY)
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
  const list  = document.getElementById("notifList");
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
    const url = String(it.action_url || "").trim();
    const dataUrl = url ? ` data-url="${escapeHtml(url)}"` : "";
    const style = url ? ` style="cursor:pointer;"` : "";
    return `
      <div class="notif-item"${style}${dataUrl}>
        <div class="notif-icon">${iconFor(it.type)}</div>
        <div class="notif-content">
          <div class="notif-title">${escapeHtml(it.title || "")}</div>
          <div class="notif-desc">${escapeHtml(it.message || "")}</div>
          <div class="notif-time">${timeLabel(it.days_left)}</div>
        </div>
      </div>
    `;
  }).join("");

  list.onclick = (e) => {
    const item = e.target?.closest?.(".notif-item");
    if(!item) return;
    const url = item.getAttribute("data-url");
    if(url) location.href = url;
  };
}

export async function initNotif({ baseUrl } = {}) {
  if (baseUrl) RUNTIME_BASE = baseUrl;

  async function refresh(){
    const items = await fetchNotificationsToday();
    renderNotifications(items);
  }

  await refresh();
  setInterval(refresh, 60_000);
}
