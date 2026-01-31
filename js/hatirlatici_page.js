// FILE: /js/hatirlatici_page.js
// Hatırlatıcı: custom reminders + profile-based special days (read-only import)
// Storage: localStorage (per user)
// (Real notifications later)

import { STORAGE_KEY } from "/js/config.js";
import { initMenuHistoryUI } from "/js/menu_history_ui.js";

const $ = (id)=>document.getElementById(id);

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function setJson(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function esc(s=""){ return String(s); }

function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2400);
}

function getUser(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return u && Object.keys(u).length ? u : safeJson(localStorage.getItem("caynana_user_v1"), {});
}

function userKey(){
  const u = getUser();
  const uid = String(u.user_id || u.id || u.email || "guest").toLowerCase().trim();
  return uid || "guest";
}

function storeKey(){
  return `caynana_reminders:${userKey()}`;
}

function loadReminders(){
  return safeJson(localStorage.getItem(storeKey()), []);
}
function saveReminders(arr){
  setJson(storeKey(), arr || []);
}

function profileSpecials(profile){
  const items = [];

  const push = (title, date)=>{
    if(!date) return;
    items.push({ title, date, time:"09:00", type:"profile", source:"profile" });
  };

  push("Eş Doğum Günü", profile.spouse_birth_date || profile.spouseBirthday || profile.spouse_birthday);
  push("Evlilik Yıldönümü", profile.wedding_anniversary || profile.weddingAnniversary || profile.evlilik_yildonumu);
  push("Nişan Yıldönümü", profile.engagement_anniversary || profile.engagementAnniversary || profile.nisan_yildonumu);

  const c1 = profile.child_birth_dates || profile.childBirthDates || profile.children_birthdays || profile.childBirthdays;
  if(Array.isArray(c1)){
    c1.forEach((d,i)=> push(`Çocuk ${i+1} Doğum Günü`, d));
  }else if(c1 && typeof c1 === "object"){
    Object.entries(c1).forEach(([k,v])=> push(`${k} Doğum Günü`, v));
  }else if(typeof c1 === "string" && c1.trim()){
    push("Çocuk Doğum Günü", c1.trim());
  }

  const s = profile.special_days || profile.specialDays;
  if(Array.isArray(s)){
    s.forEach((x)=>{
      if(x && typeof x === "object"){
        push(x.title || "Özel Gün", x.date || x.when);
      }
    });
  }

  return items;
}

function fmt(date, time){
  const d = String(date||"").trim();
  const t = String(time||"").trim();
  return (d ? d : "—") + (t ? ` • ${t}` : "");
}

function render(){
  const box = $("list");
  const profile = getUser();
  const customs = loadReminders();

  // profile specials: göster ama kaydetme zorunlu değil (motor gelince birleşir)
  const prof = profileSpecials(profile);

  const all = [
    ...prof.map(x => ({ ...x, id:`p:${x.title}:${x.date}`, readonly:true })),
    ...customs
  ].sort((a,b)=> (String(a.date)+String(a.time)).localeCompare(String(b.date)+String(b.time)));

  if(!all.length){
    box.innerHTML = `<div style="font-weight:900;color:rgba(255,255,255,.70);">Henüz hatırlatıcı yok evladım 🙂</div>`;
    return;
  }

  box.innerHTML = all.map(it=>{
    const tag = it.source === "profile"
      ? `<div class="tag sys">PROFİL</div>`
      : `<div class="tag user">SENİN</div>`;
    const delBtn = it.readonly ? "" : `<div class="del" data-del="${it.id}">×</div>`;

    return `
      <div class="item">
        <div class="l">
          <div class="t1">${esc(it.title)}</div>
          <div class="t2">${fmt(it.date, it.time)}</div>
          ${tag}
        </div>
        ${delBtn}
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      const arr = loadReminders().filter(x => String(x.id) !== String(id));
      saveReminders(arr);
      toast("Sildim evladım.");
      render();
    });
  });
}

function add(){
  const title = String($("title").value||"").trim();
  const date = String($("date").value||"").trim();
  const time = String($("time").value||"").trim();
  const type = String($("type").value||"custom").trim();

  if(!title) return toast("Evladım başlık yaz.");
  if(!date) return toast("Evladım tarih seç.");

  const id = "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  const arr = loadReminders();
  arr.unshift({ id, title, date, time: time || "09:00", type, source:"custom" });
  saveReminders(arr);

  $("title").value = "";
  toast("Eklendi evladım.");
  render();
}

document.addEventListener("DOMContentLoaded", ()=>{
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  try{ initMenuHistoryUI(); }catch{}

  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  $("add")?.addEventListener("click", add);
  $("goProfile")?.addEventListener("click", ()=> location.href="/pages/profil.html");

  render();
});
