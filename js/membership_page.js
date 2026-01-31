// FILE: /js/membership_page.js
// Plans: FREE / PLUS / PRO (design-first)
// ✅ Limits exactly as specified
// ✅ Save selected plan to localStorage (STORAGE_KEY plan)
// ✅ 30 days no-cancel rule shown for PLUS/PRO
// ✅ Google Play note (text only)
// ✅ NEW: "MEVCUT PLAN" badge on current plan card

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

function render(){
  const wrap = $("plans");
  wrap.innerHTML = "";

  const user = getUser();
  const cur = String(user.plan || "free").toLowerCase();

  $("curPlanPill").textContent = planPillText(cur);

  PLANS.forEach(p=>{
    const el = document.createElement("div");
    el.className = "plan" + (p.reco ? " reco" : "") + (selected === p.key ? " selected" : "");

    const chips = (p.chips||[]).map((x,i)=>{
      const cls = (p.key==="plus" && i===0) ? "chip gold" : (p.key==="pro" && i===0 ? "chip green" : "chip");
      return `<span class="${cls}">${x}</span>`;
    }).join("");

    const feats = (p.features||[]).map(x=>`<div class="li"><div class="b">✓</div><div class="t">${x}</div></div>`).join("");
    const astro = (p.astro||[]).map(x=>`<div class="li"><div class="b">✶</div><div class="t">${x}</div></div>`).join("");

    const currentBadge = (cur === p.key)
      ? `<div style="
            position:absolute; left:12px; top:12px;
            padding:6px 10px;
            border-radius:999px;
            border:1px solid rgba(190,242,100,.25);
            background: rgba(190,242,100,.10);
            color: rgba(190,242,100,.95);
            font-weight: 1000;
            font-size: 10px;
            letter-spacing:.6px;
          ">MEVCUT PLAN</div>`
      : "";

    el.innerHTML = `
      ${currentBadge}
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
    `;

    el.addEventListener("click", ()=>{
      selected = p.key;
      render();
    });

    wrap.appendChild(el);

    // current plan border a bit warmer
    if(cur === p.key){
      el.style.borderColor = "rgba(255,179,0,.28)";
    }
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
