// FILE: /js/membership_page.js
// ✅ Fix: badges no overlap (uses badge-wrap)
// ✅ Color themes per plan (free/plus/pro)
// ✅ Each plan has bottom "upgrade icon"
// ✅ If current plan is PRO -> PRO card shows "EN ÜST PLAN" (no upgrade icon)
// ✅ Clicking card selects; clicking upgrade button selects + scrolls CTA

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function setJson(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

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
function setUser(u){
  setJson(STORAGE_KEY, u);
  setJson("caynana_user_v1", u);
}

const PLANS = [
  {
    key:"free",
    css:"free",
    name:"FREE",
    price:"0 TL",
    sub:"Süresiz",
    chips:["Süresiz", "Başlangıç"],
    features:[
      "Sohbet: günde <b>5 dakika</b>",
      "Astro: günde <b>1 adet</b> (Kahve/Tarot/Rüya/Burç toplam 1)",
      "Alışveriş: günde <b>1 tavsiye</b>",
      "Tercüman: <b>10 sorgu</b>, tek dil seçimi",
      "Diyet: ayda <b>7 günlük menü</b>",
      "Sağlık: <b>sınır yok</b>",
      "Dedikodu Kazanı: <b>giriş yok</b>",
      "Regl Takibi: <b>var</b>",
      "Takım bildirimi: haftada <b>1</b>"
    ],
    astro:[
      "Kahve Falı: günde 1",
      "Tarot: günde 1",
      "Rüya Tabiri: günde 1",
      "Günlük Burç: günde 1"
    ]
  },
  {
    key:"plus",
    css:"plus",
    name:"PLUS",
    price:"99 TL",
    sub:"30 gün iptal yok • oto yenileme",
    reco:true,
    chips:["En iyi fiyat", "Daha geniş"],
    features:[
      "Sohbet: <b>60 dakika</b>",
      "Alışveriş: <b>5 tavsiye</b>",
      "Tercüman: <b>sınırsız</b>",
      "Dedikodu Kazanı: <b>sınırsız</b>",
      "Diyet: <b>sınırsız</b>",
      "Sağlık: <b>sınırsız</b>",
      "Regl Takibi: <b>sürekli</b>",
      "Takım bildirimi: <b>sınırsız</b>",
      "Özel günler bildirimi: <b>sınırsız</b>"
    ],
    astro:[
      "Kahve Falı: günde 1",
      "Tarot: günde 1",
      "Rüya Tabiri: günde 1",
      "Günlük Burç: günde 1"
    ]
  },
  {
    key:"pro",
    css:"pro",
    name:"PRO",
    price:"249 TL",
    sub:"30 gün iptal yok • oto yenileme",
    chips:["Tam güç", "Sesli Kaynana"],
    features:[
      "Sohbet: <b>sınırsız</b>",
      "Kaynana: <b>sesini duyacağız</b>",
      "Tercüman: <b>sınırsız</b>",
      "Dedikodu: <b>sınırsız</b>",
      "Diyet: <b>sınırsız</b>",
      "Alışveriş: <b>sınırsız</b>",
      "Sağlık: <b>sınırsız</b>",
      "Regl: <b>sınırsız</b>",
      "Takım bildirimi: <b>sınırsız</b>",
      "Özel günler bildirimi: <b>sınırsız</b>"
    ],
    astro:[
      "Kahve Falı: günde 2",
      "Tarot: günde 2",
      "Rüya Tabiri: günde 2",
      "Günlük Burç: günde 1"
    ]
  }
];

let selected = "plus";

function planPillText(p){
  return `Plan: ${String(p||"FREE").toUpperCase()}`;
}

function iconUp(){
  return `<svg viewBox="0 0 24 24"><path d="M12 19V5"></path><path d="M7 10l5-5 5 5"></path></svg>`;
}
function iconCheck(){
  return `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>`;
}
function iconCrown(){
  return `<svg viewBox="0 0 24 24"><path d="M3 7l4 4 5-7 5 7 4-4v13H3z"></path></svg>`;
}

function render(){
  const wrap = $("plans");
  wrap.innerHTML = "";

  const user = getUser();
  const cur = String(user.plan || "free").toLowerCase();
  $("curPlanPill").textContent = planPillText(cur);

  PLANS.forEach(p=>{
    const el = document.createElement("div");
    el.className = `plan ${p.css}` + (p.reco ? " reco" : "") + (selected === p.key ? " selected" : "");

    // chips
    const chips = (p.chips||[]).map((x,i)=>{
      const cls = "chip " + p.css;
      return `<span class="${cls}">${x}</span>`;
    }).join("");

    // features + astro
    const feats = (p.features||[]).map(x=>`<div class="li"><div class="b">✓</div><div class="t">${x}</div></div>`).join("");
    const astro = (p.astro||[]).map(x=>`<div class="li"><div class="b">✶</div><div class="t">${x}</div></div>`).join("");

    // badges (no overlap)
    const leftBadge = (cur === p.key) ? `<div class="badge current">MEVCUT PLAN</div>` : `<div style="width:1px;height:1px;opacity:0"></div>`;
    const rightBadge = (p.reco) ? `<div class="badge reco">ÖNERİLEN</div>` : `<div style="width:1px;height:1px;opacity:0"></div>`;

    // bottom action
    let bottomRight = "";
    if(cur === p.key){
      if(cur === "pro"){
        bottomRight = `<div class="status-pill">${iconCrown()} EN ÜST PLAN</div>`;
      }else{
        bottomRight = `<div class="status-pill">${iconCheck()} AKTİF</div>`;
      }
    }else{
      bottomRight = `<button class="upgrade-btn ${p.css}" data-up="${p.key}">${iconUp()} YÜKSELT</button>`;
    }

    el.innerHTML = `
      <div class="badge-wrap">
        ${leftBadge}
        ${rightBadge}
      </div>

      <div class="plan-head">
        <div>
          <div class="plan-name">${p.name}</div>
          <div class="mini">${chips}</div>
        </div>
        <div class="plan-price">
          <div class="price-big">${p.price}</div>
          <div class="price-sub">${p.sub}</div>
        </div>
      </div>

      <div class="sub" style="margin-top:10px; font-weight:1000; color:rgba(255,255,255,.80);">Genel</div>
      <div class="list">${feats}</div>

      <div class="sub" style="margin-top:12px; font-weight:1000; color:rgba(255,255,255,.80);">Astro Limits</div>
      <div class="list">${astro}</div>

      <div class="sub" style="margin-top:10px; color:rgba(255,255,255,.60); font-size:11px;">
        ${p.key==="free" ? "FREE süresizdir." : "Abone olunca 30 gün iptal yok; iptal etmezsen otomatik yenilenir."}
      </div>

      <div class="plan-bottom">
        <div class="status-pill">${p.key==="free" ? "🟠" : (p.key==="plus" ? "🟢" : "🔴")} ${p.name}</div>
        ${bottomRight}
      </div>
    `;

    // select by click (but ignore clicking the upgrade button)
    el.addEventListener("click", (ev)=>{
      const btn = ev.target?.closest?.("button[data-up]");
      if(btn) return;
      selected = p.key;
      render();
    });

    // upgrade button
    const upBtn = el.querySelector("button[data-up]");
    if(upBtn){
      upBtn.addEventListener("click", (ev)=>{
        ev.stopPropagation();
        selected = upBtn.getAttribute("data-up");
        render();
        // scroll to CTA
        try{ $("btnBuy").scrollIntoView({ behavior:"smooth", block:"center" }); }catch{}
      });
    }

    wrap.appendChild(el);
  });
}

function applyPlan(planKey){
  const u = getUser();
  u.plan = planKey;
  setUser(u);
  toast(`Tamam evladım. Planın ${String(planKey).toUpperCase()} oldu (demo).`);
  render();
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

  const cur = String(getUser().plan || "free").toLowerCase();
  selected = (cur === "free") ? "plus" : cur;
  render();

  $("btnBuy")?.addEventListener("click", ()=>{
    const cur2 = String(getUser().plan || "free").toLowerCase();
    if(selected === cur2){
      toast("Zaten bu plandasın evladım 🙂");
      return;
    }

    if(selected === "plus"){
      const ok = confirm("PLUS (99 TL) — 30 gün iptal yok, iptal etmezsen otomatik yenilenir.\nGoogle Play ile ödeme alınacak.\nDevam edelim mi?");
      if(!ok) return;
      applyPlan("plus");
      return;
    }

    if(selected === "pro"){
      const ok = confirm("PRO (249 TL) — 30 gün iptal yok, iptal etmezsen otomatik yenilenir.\nGoogle Play ile ödeme alınacak.\nDevam edelim mi?");
      if(!ok) return;
      applyPlan("pro");
      return;
    }

    const ok = confirm("FREE’e dönmek istiyor musun? (Demo)");
    if(!ok) return;
    applyPlan("free");
  });

  $("btnRestore")?.addEventListener("click", ()=>{
    const cur3 = String(getUser().plan || "free").toLowerCase();
    toast(`Plan yenilendi: ${cur3.toUpperCase()} (demo)`);
    render();
  });
});
