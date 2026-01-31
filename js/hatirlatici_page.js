// FILE: /js/hatirlatici_page.js
// ✅ Multiple times per reminder
// ✅ Presets: 2 dose / 3 dose / 4 dose
// ✅ Demo notifier

import { STORAGE_KEY } from "/js/config.js";
import { initMenuHistoryUI } from "/js/menu_history_ui.js";

const $ = (id)=>document.getElementById(id);

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function setJson(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2600);
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
function loadReminders(){ return safeJson(localStorage.getItem(storeKey()), []); }
function saveReminders(arr){ setJson(storeKey(), arr || []); }

// profile specials (read-only)
function profileSpecials(profile){
  const items = [];
  const push = (title, date)=>{
    if(!date) return;
    items.push({ title, date, times:["09:00"], type:"profile", source:"profile", repeat:"yearly" });
  };
  push("Eş Doğum Günü", profile.spouse_birth_date || profile.spouseBirthday || profile.spouse_birthday);
  push("Evlilik Yıldönümü", profile.wedding_anniversary || profile.weddingAnniversary || profile.evlilik_yildonumu);
  push("Nişan Yıldönümü", profile.engagement_anniversary || profile.engagementAnniversary || profile.nisan_yildonumu);

  const c1 = profile.child_birth_dates || profile.childBirthDates || profile.children_birthdays || profile.childBirthdays;
  if(Array.isArray(c1)) c1.forEach((d,i)=> push(`Çocuk ${i+1} Doğum Günü`, d));
  else if(c1 && typeof c1 === "object") Object.entries(c1).forEach(([k,v])=> push(`${k} Doğum Günü`, v));
  else if(typeof c1 === "string" && c1.trim()) push("Çocuk Doğum Günü", c1.trim());

  const s = profile.special_days || profile.specialDays;
  if(Array.isArray(s)){
    s.forEach((x)=>{
      if(x && typeof x === "object") push(x.title || "Özel Gün", x.date || x.when);
    });
  }
  return items;
}

function pad2(n){ return String(n).padStart(2,"0"); }
function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function nowHM(){
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function weekday(d=new Date()){ return d.getDay(); }

function repeatLabel(rep){
  const m = { once:"Tek sefer", daily:"Her gün", weekdays:"Hafta içi", weekly:"Haftalık", yearly:"Yıllık" };
  return m[rep] || rep || "Tek sefer";
}
function fmt(date, times){
  const d = String(date||"").trim();
  const tt = Array.isArray(times) ? times.join(", ") : "";
  return (d ? d : "—") + (tt ? ` • ${tt}` : "");
}

let tempTimes = [];

function normalizeTime(t){
  const s = String(t||"").trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if(!m) return "";
  const hh = Math.max(0, Math.min(23, parseInt(m[1],10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2],10)));
  return `${pad2(hh)}:${pad2(mm)}`;
}

function addTimeValue(t){
  const nt = normalizeTime(t);
  if(!nt) return;
  if(!tempTimes.includes(nt)) tempTimes.push(nt);
  tempTimes.sort();
}

function renderTimeChips(){
  const box = $("timeChips");
  if(!box) return;

  if(!tempTimes.length){
    box.innerHTML = `<div style="font-weight:900;color:rgba(255,255,255,.65);font-size:12px;">Saat ekle ya da hazır paket seç.</div>`;
    return;
  }

  box.innerHTML = tempTimes.map(t=>`
    <div class="chip">
      ${t}
      <div class="x" data-x="${t}">×</div>
    </div>
  `).join("");

  box.querySelectorAll("[data-x]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const v = el.getAttribute("data-x");
      tempTimes = tempTimes.filter(x => x !== v);
      renderTimeChips();
    });
  });
}

function addTime(){
  const t = normalizeTime($("timeAdd").value);
  if(!t) return toast("Saat seç evladım.");
  addTimeValue(t);
  $("timeAdd").value = "";
  renderTimeChips();
}

// ✅ presets
function preset(times){
  tempTimes = [];
  times.forEach(addTimeValue);
  renderTimeChips();
  toast("Hazır paket geldi evladım 🙂");
}

function presetClear(){
  tempTimes = [];
  renderTimeChips();
  toast("Temizledim evladım.");
}

function render(){
  const box = $("list");
  const profile = getUser();
  const customs = loadReminders();
  const prof = profileSpecials(profile).map(x => ({ ...x, id:`p:${x.title}:${x.date}`, readonly:true }));

  const all = [...prof, ...customs];
  all.sort((a,b)=> (String(a.date)+String((a.times||[])[0]||"")).localeCompare(String(b.date)+String((b.times||[])[0]||"")));

  if(!all.length){
    box.innerHTML = `<div style="font-weight:900;color:rgba(255,255,255,.70);">Henüz hatırlatıcı yok evladım 🙂</div>`;
    return;
  }

  box.innerHTML = all.map(it=>{
    const tags = [];
    tags.push(it.source === "profile" ? `<div class="tag sys">PROFİL</div>` : `<div class="tag user">SENİN</div>`);
    tags.push(`<div class="tag rep">🔁 ${repeatLabel(it.repeat)}</div>`);

    const delBtn = it.readonly ? "" : `<div class="del" data-del="${it.id}">×</div>`;

    return `
      <div class="item">
        <div class="l">
          <div class="t1">${it.title}</div>
          <div class="t2">${fmt(it.date, it.times || [])}</div>
          <div class="tags">${tags.join("")}</div>
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

function addReminder(){
  const title = String($("title").value||"").trim();
  const date = String($("date").value||"").trim();
  const type = String($("type").value||"custom").trim();
  const repeat = String($("repeat").value||"once").trim();

  if(!title) return toast("Evladım başlık yaz.");
  if(!tempTimes.length) return toast("Hazır paket seç ya da en az 1 saat ekle.");

  if(repeat === "once" && !date) return toast("Tek sefer için tarih seç evladım.");
  const useDate = date || todayISO();

  const id = "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const arr = loadReminders();
  arr.unshift({ id, title, date: useDate, times: [...tempTimes], type, source:"custom", repeat });

  saveReminders(arr);

  $("title").value = "";
  tempTimes = [];
  renderTimeChips();

  toast("Eklendi evladım.");
  render();
}

// notifier
function shouldFire(item, nowDate, nowTime){
  const rep = item.repeat || "once";
  const times = Array.isArray(item.times) ? item.times : [];
  if(!times.includes(nowTime)) return false;

  if(rep === "once") return item.date === nowDate;
  if(rep === "daily") return true;
  if(rep === "weekdays"){
    const wd = weekday();
    return wd >= 1 && wd <= 5;
  }
  if(rep === "weekly"){
    const base = new Date(item.date + "T00:00:00");
    return weekday() === base.getDay();
  }
  if(rep === "yearly"){
    const mdNow = nowDate.slice(5);
    const mdIt = String(item.date||"").slice(5);
    return mdIt === mdNow;
  }
  return false;
}

function firedKey(uid, itemId, nowDate, nowTime){
  return `caynana_rem_fired:${uid}:${itemId}:${nowDate}:${nowTime}`;
}

function startNotifier(){
  const uid = userKey();
  setInterval(()=>{
    const nowDate = todayISO();
    const nowTime = nowHM();

    const profile = getUser();
    const customs = loadReminders();
    const prof = profileSpecials(profile).map(x => ({ ...x, id:`p:${x.title}:${x.date}`, readonly:true }));
    const all = [...prof, ...customs];

    all.forEach(it=>{
      if(!shouldFire(it, nowDate, nowTime)) return;
      const k = firedKey(uid, it.id, nowDate, nowTime);
      if(localStorage.getItem(k) === "1") return;
      localStorage.setItem(k, "1");
      toast(`⏰ ${it.title} (${nowTime})`);
    });
  }, 20000);
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

  try{ $("date").value = todayISO(); }catch{}
  tempTimes = [];
  renderTimeChips();

  $("btnAddTime")?.addEventListener("click", addTime);
  $("timeAdd")?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){ e.preventDefault(); addTime(); }
  });

  // presets
  $("preset3")?.addEventListener("click", ()=> preset(["09:00","14:00","21:00"]));
  $("preset2")?.addEventListener("click", ()=> preset(["09:00","21:00"]));
  $("preset4")?.addEventListener("click", ()=> preset(["08:00","12:00","16:00","20:00"]));
  $("presetClear")?.addEventListener("click", presetClear);

  $("add")?.addEventListener("click", addReminder);
  $("goProfile")?.addEventListener("click", ()=> location.href="/pages/profil.html");

  render();
  startNotifier();
});
