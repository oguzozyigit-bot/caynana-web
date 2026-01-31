// FILE: /js/specialdays_page.js
// Reads special dates from profile (tolerant keys), renders list.
// No motor yet; purely design.

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function esc(s=""){ return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

function getProfile(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return u && Object.keys(u).length ? u : safeJson(localStorage.getItem("caynana_user_v1"), {});
}

function pushItem(items, icon, title, date){
  if(!date) return;
  items.push({ icon, title, date });
}

function render(){
  const p = getProfile();
  const items = [];

  // Eş
  pushItem(items, "🎂", "Eş Doğum Günü", p.spouse_birth_date || p.spouseBirthday || p.spouse_birthday);
  // Yıldönümleri
  pushItem(items, "💍", "Evlilik Yıldönümü", p.wedding_anniversary || p.weddingAnniversary || p.evlilik_yildonumu);
  pushItem(items, "💐", "Nişan Yıldönümü", p.engagement_anniversary || p.engagementAnniversary || p.nisan_yildonumu);

  // Çocuk doğum günleri (array / object / string toleranslı)
  const c1 = p.child_birth_dates || p.childBirthDates || p.children_birthdays || p.childBirthdays;
  if(Array.isArray(c1)){
    c1.forEach((d, i)=> pushItem(items, "🧸", `Çocuk ${i+1} Doğum Günü`, d));
  }else if(c1 && typeof c1 === "object"){
    Object.entries(c1).forEach(([k,v])=> pushItem(items, "🧸", `${k} Doğum Günü`, v));
  }else if(typeof c1 === "string" && c1.trim()){
    pushItem(items, "🧸", "Çocuk Doğum Günü", c1.trim());
  }

  // Manuel özel günler (specialDays)
  const s = p.special_days || p.specialDays;
  if(Array.isArray(s)){
    s.forEach((x)=>{
      if(x && typeof x === "object"){
        pushItem(items, "🎈", x.title || "Özel Gün", x.date || x.when);
      }
    });
  }

  const box = $("list");
  if(!box) return;

  if(!items.length){
    box.innerHTML = `
      <div style="font-weight:1000;color:#fff;font-size:14px;">Henüz özel gün yok</div>
      <div style="margin-top:8px;font-weight:900;color:rgba(255,255,255,.70);font-size:12px;line-height:1.4;">
        Evladım… tarih yoksa bildirim de yok 😄 Profilde tarihleri gir, ben de unutmam.
      </div>
    `;
    return;
  }

  box.innerHTML = items.map(it=>`
    <div class="item">
      <div class="dot">${esc(it.icon)}</div>
      <div style="flex:1;min-width:0;">
        <div class="t1">${esc(it.title)}</div>
        <div class="t2">${esc(String(it.date))}</div>
      </div>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", ()=>{
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  try{ initMenuHistoryUI(); }catch{}

  // hamburger
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  $("goProfile")?.addEventListener("click", ()=> location.href="/pages/profil.html");

  render();
});
