// FILE: /js/tarot_page.js
// FINAL-DESIGN: beautiful deck + flip reveal + custom SVG “tarot-like” art (copyright-safe)

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id) => document.getElementById(id);

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2100);
}
function syncTopUI(){
  try{
    const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const s = clamp(parseInt(u.sp_score ?? 10,10)||10, 0, 100);
    if($("ypFill")) $("ypFill").style.width = `${s}%`;
    if($("ypNum")) $("ypNum").textContent = `${s}/100`;
    if($("planChip")) $("planChip").textContent = String(u.plan || "FREE").toUpperCase();
  }catch{}
}

const POS = {
  1:["Günlük mesaj"],
  3:["Geçmiş","Şimdi","Gelecek"],
  5:["Durum","Engel","Tavsiye","Dış Etki","Sonuç"]
};

// ✅ “Tarot hissi” veren ama telifli kopya olmayan özgün kart yüzleri
const CARDS = [
  { key:"fool",    n:"Deli (0)",       sym:"🪶", tone:["başlangıç","cesaret","risk"], u:"Yeni sayfa açılıyor. Cesaret et.", r:"Dağınıklık ve acele. Ayağını yere bas." },
  { key:"mag",     n:"Büyücü (I)",     sym:"✨", tone:["niyet","beceri","fırsat"], u:"Elindeki imkanlar yeter. Başlat.", r:"Planı netleştir. Kandırılma." },
  { key:"priest",  n:"Başrahibe (II)", sym:"🌙", tone:["sezgi","sır","sabır"], u:"İç sesini dinle. Sabır.", r:"Kuruntuya kapılma. Kanıt ara." },
  { key:"emp",     n:"İmparator (IV)", sym:"🛡️", tone:["düzen","sınır","otorite"], u:"Düzen kur. Sınır koy.", r:"Kontrolcülük ve inat." },
  { key:"love",    n:"Aşıklar (VI)",   sym:"💞", tone:["seçim","uyum","bağ"], u:"Bir seçim var. Netleş.", r:"Kararsızlık." },
  { key:"chariot", n:"Savaş Arabası",  sym:"🏁", tone:["irade","hız","zafer"], u:"Disiplinle kazanırsın.", r:"Hırsın gözünü kör etmesin." },
  { key:"strength",n:"Güç",            sym:"🦁", tone:["sabır","özdenetim"], u:"Yumuşak güç kazanır.", r:"Öfke ve kontrol kaybı." },
  { key:"hermit",  n:"Ermiş",          sym:"🏮", tone:["içgörü","sakinlik"], u:"Geri çekil, netleş.", r:"Kopma, yalnızlaşma." },
  { key:"wheel",   n:"Kader Çarkı",    sym:"🎡", tone:["dönüm","şans"], u:"Dönüm noktası.", r:"Aynı hatayı tekrar etme." },
  { key:"justice", n:"Adalet",         sym:"⚖️", tone:["denge","hak"], u:"Hak yerini bulur.", r:"Dengesizlik." },
  { key:"hang",    n:"Asılan Adam",    sym:"🪢", tone:["bekleme","bakış"], u:"Farklı açıdan bak.", r:"Kurban psikolojisi." },
  { key:"death",   n:"Dönüşüm",        sym:"🦋", tone:["bitış","yenilenme"], u:"Kapanış hayırlı.", r:"Değişimden kaçma." },
  { key:"tower",   n:"Kule",           sym:"🏛️", tone:["sarsıntı","gerçek"], u:"Gerçek ortaya çıkar.", r:"Direnme, ders çıkar." },
  { key:"star",    n:"Yıldız",         sym:"⭐", tone:["umut","ilham"], u:"Ferahlık geliyor.", r:"Umudu erteleme." },
  { key:"moon",    n:"Ay",             sym:"🌫️", tone:["belirsizlik"], u:"Net değil, acele etme.", r:"Yanılsama." },
  { key:"sun",     n:"Güneş",          sym:"☀️", tone:["başarı","açıklık"], u:"Aydınlık ve rahatlama.", r:"Ego şişmesi." },
  { key:"world",   n:"Dünya",          sym:"🌍", tone:["tamamlama"], u:"Emek karşılığı.", r:"Bitirmeden bırakma." }
];

function pickUniqueCard(used){
  for(let t=0;t<200;t++){
    const c = CARDS[Math.floor(Math.random()*CARDS.length)];
    if(!used.has(c.key)){
      used.add(c.key);
      return c;
    }
  }
  return CARDS[Math.floor(Math.random()*CARDS.length)];
}

/* ===== SVG ART (özgün) ===== */
function svgArt(cardKey){
  // Her kart key’ine göre farklı ama basit “ikonik” çizim:
  const base = (inner) => `
    <svg viewBox="0 0 100 120">
      <defs>
        <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="rgba(255,179,0,.22)"/>
          <stop offset="1" stop-color="rgba(190,242,100,.18)"/>
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="80" height="100" rx="14" fill="rgba(0,0,0,.15)" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
      <circle cx="50" cy="60" r="26" fill="url(#gl)" opacity=".65"/>
      ${inner}
      <path d="M18 22h64" stroke="rgba(255,255,255,.10)" stroke-width="2" stroke-linecap="round"/>
      <path d="M18 98h64" stroke="rgba(255,255,255,.10)" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const map = {
    fool: base(`<path d="M50 34c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18z" fill="rgba(255,255,255,.10)"/>
               <path d="M38 76c8 6 16 6 24 0" stroke="rgba(255,255,255,.18)" stroke-width="3" stroke-linecap="round"/>`),
    mag: base(`<path d="M30 78h40" stroke="rgba(255,255,255,.18)" stroke-width="3" stroke-linecap="round"/>
              <path d="M50 30v56" stroke="rgba(255,255,255,.12)" stroke-width="3" stroke-linecap="round"/>
              <path d="M38 40h24" stroke="rgba(190,242,100,.35)" stroke-width="3" stroke-linecap="round"/>`),
    priest: base(`<path d="M50 30c10 6 16 16 16 30s-6 24-16 30c-10-6-16-16-16-30s6-24 16-30z" fill="rgba(255,255,255,.10)"/>
                 <path d="M36 60h28" stroke="rgba(255,179,0,.25)" stroke-width="3" stroke-linecap="round"/>`),
    emp: base(`<rect x="36" y="34" width="28" height="52" rx="10" fill="rgba(255,255,255,.10)"/>
              <path d="M36 54h28" stroke="rgba(255,255,255,.16)" stroke-width="3"/>`),
    love: base(`<path d="M50 84c18-10 28-22 18-34-6-8-16-4-18 2-2-6-12-10-18-2-10 12 0 24 18 34z" fill="rgba(190,242,100,.18)"/>`),
    chariot: base(`<path d="M30 74h40l-6 14H36z" fill="rgba(255,255,255,.10)"/>
                  <circle cx="38" cy="92" r="6" fill="rgba(255,179,0,.20)"/>
                  <circle cx="62" cy="92" r="6" fill="rgba(190,242,100,.18)"/>`),
    strength: base(`<path d="M38 78c0-12 6-20 12-20s12 8 12 20" stroke="rgba(255,255,255,.16)" stroke-width="4" fill="none" stroke-linecap="round"/>
                   <path d="M44 52c8 6 16 6 24 0" stroke="rgba(255,179,0,.22)" stroke-width="3" stroke-linecap="round"/>`),
    hermit: base(`<path d="M50 26v66" stroke="rgba(255,255,255,.14)" stroke-width="3" stroke-linecap="round"/>
                 <circle cx="50" cy="40" r="10" fill="rgba(190,242,100,.14)"/>`),
    wheel: base(`<circle cx="50" cy="60" r="22" stroke="rgba(255,255,255,.18)" stroke-width="3" fill="none"/>
                <path d="M50 38v44M28 60h44M35 45l30 30M65 45L35 75" stroke="rgba(255,179,0,.20)" stroke-width="2" stroke-linecap="round"/>`),
    justice: base(`<path d="M50 30v62" stroke="rgba(255,255,255,.14)" stroke-width="3" stroke-linecap="round"/>
                  <path d="M30 46h40" stroke="rgba(255,255,255,.18)" stroke-width="3" stroke-linecap="round"/>
                  <path d="M36 46l-8 16h16zM64 46l-8 16h16z" fill="rgba(190,242,100,.14)"/>`),
    hang: base(`<path d="M50 28v18" stroke="rgba(255,255,255,.14)" stroke-width="3" stroke-linecap="round"/>
               <path d="M50 46c10 0 14 8 14 16s-4 16-14 16-14-8-14-16 4-16 14-16z" fill="rgba(255,255,255,.10)"/>`),
    death: base(`<path d="M36 86c8-10 20-10 28 0" stroke="rgba(190,242,100,.22)" stroke-width="4" stroke-linecap="round"/>
               <path d="M50 34c10 8 16 18 16 26S60 82 50 90c-10-8-16-18-16-30s6-18 16-26z" fill="rgba(255,255,255,.08)"/>`),
    tower: base(`<rect x="42" y="28" width="16" height="70" rx="6" fill="rgba(255,255,255,.10)"/>
               <path d="M34 50l32 18" stroke="rgba(255,82,82,.22)" stroke-width="3" stroke-linecap="round"/>`),
    star: base(`<path d="M50 28l6 18h18l-14 10 6 18-16-12-16 12 6-18-14-10h18z" fill="rgba(255,179,0,.18)"/>`),
    moon: base(`<path d="M58 34c-10 2-16 12-14 22 2 12 14 20 26 16-8 8-22 8-32-2-12-12-8-32 6-36 6-2 10-2 14 0z" fill="rgba(255,255,255,.10)"/>`),
    sun: base(`<circle cx="50" cy="60" r="18" fill="rgba(255,179,0,.22)"/>
              <path d="M50 30v10M50 80v10M20 60h10M70 60h10M30 40l7 7M63 73l7 7M30 80l7-7M63 47l7-7"
                    stroke="rgba(255,255,255,.14)" stroke-width="2" stroke-linecap="round"/>`),
    world: base(`<circle cx="50" cy="60" r="22" fill="rgba(190,242,100,.12)" stroke="rgba(255,255,255,.16)" stroke-width="2"/>
                <path d="M28 60h44M50 38c7 7 7 37 0 44M50 38c-7 7-7 37 0 44" stroke="rgba(255,255,255,.14)" stroke-width="2"/>`)
  };

  return map[cardKey] || map.fool;
}

/* ===== State ===== */
const state = {
  need: 1,
  ready: false,
  used: new Set(),
  picked: [] // {card, rev, posLabel}
};

function renderNeed(){
  $("needTxt").textContent = `Seçilecek: ${state.need} kart`;
}

function setPill(text, good=true){
  const p = $("statePill");
  if(!p) return;
  p.textContent = text;
  p.style.borderColor = good ? "rgba(190,242,100,.25)" : "rgba(255,82,82,.25)";
  p.style.background  = good ? "rgba(190,242,100,.10)" : "rgba(255,82,82,.10)";
  p.style.color       = good ? "rgba(190,242,100,.95)" : "rgba(255,82,82,.95)";
}

function buildGrid(){
  const grid = $("grid");
  grid.innerHTML = "";
  for(let i=0;i<16;i++){
    const wrap = document.createElement("div");
    wrap.className = "flip";
    wrap.dataset.slot = String(i);

    wrap.innerHTML = `
      <div class="inner">
        <div class="face back"></div>
        <div class="face front">
          <div class="frame" data-art></div>
          <div class="title" data-title>—</div>
          <div class="meta">
            <span class="tag" data-pos>—</span>
            <span class="tag" data-rev>—</span>
          </div>
        </div>
      </div>
    `;

    wrap.querySelector(".back").addEventListener("click", ()=> onPick(wrap));
    grid.appendChild(wrap);
  }
}

function renderPicked(){
  const box = $("picked");
  box.innerHTML = "";
  state.picked.forEach((p)=>{
    const div = document.createElement("div");
    div.className = "picked-card";
    div.innerHTML = `
      <div class="picked-pos">${p.posLabel}</div>
      <div class="picked-name">${p.card.n}</div>
      <div class="picked-tag ${p.rev ? "rev" : ""}">${p.rev ? "TERS" : "DÜZ"}</div>
    `;
    box.appendChild(div);
  });
}

function showThinking(on){
  $("thinking").classList.toggle("show", !!on);
}

function makeLongReading(){
  const lines = [];
  lines.push(`<b>Evladım…</b> açılımın tamam. Şimdi “kaynana gibi” net konuşacağım.`);
  lines.push(`<br><br><b>Kartların:</b>`);
  state.picked.forEach(p=>{
    const txt = p.rev ? p.card.r : p.card.u;
    lines.push(`<br>• <b>${p.posLabel}:</b> ${p.card.n} (${p.rev?"ters":"düz"}) — ${txt}`);
  });
  lines.push(`<br><br><b>Özet:</b>`);
  const revCount = state.picked.filter(x=>x.rev).length;
  lines.push(revCount >= Math.ceil(state.need/2)
    ? `Ters enerji fazla. Yani “inat etme, düzelt” diyor. Plan + sabır şart.`
    : `Enerji iyi. Doğru adımı atarsan işin açılır. Şımarmak yok 🙂`);
  lines.push(`<br><br><b>Kaynana tavsiyesi:</b> Bugün tek hedef seç. Bitir. Sonra diğerine geç.`);
  lines.push(`<br><br><b>Kapanış:</b> Neyse halin çıksın falın… ama ben sende toparlanma görüyorum.`);
  return lines.join("");
}

async function runReading(){
  showThinking(true);
  await sleep(7000);
  showThinking(false);

  const box = $("resultBox");
  box.innerHTML = makeLongReading();
  box.classList.add("show");
}

/* ===== Actions ===== */
function resetAll(){
  state.ready = false;
  state.used = new Set();
  state.picked = [];
  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";
  setPill("Hazır", true);
  buildGrid();
  renderPicked();
  toast("Sıfırlandı evladım.");
}

function bindSpreads(){
  document.querySelectorAll("#spreads .seg").forEach(seg=>{
    seg.addEventListener("click", ()=>{
      document.querySelectorAll("#spreads .seg").forEach(x=>x.classList.remove("active"));
      seg.classList.add("active");
      state.need = parseInt(seg.getAttribute("data-n"),10);
      renderNeed();
      resetAll();
    });
  });
}

function bindButtons(){
  $("btnShuffle").addEventListener("click", ()=>{
    state.ready = true;
    setPill("Karıştı", true);
    toast("Karıştırdım evladım. Seç bakalım.");
  });
  $("btnReset").addEventListener("click", resetAll);
}

function flipReveal(wrap, card, rev, posLabel){
  const art = wrap.querySelector("[data-art]");
  const title = wrap.querySelector("[data-title]");
  const pos = wrap.querySelector("[data-pos]");
  const revEl = wrap.querySelector("[data-rev]");

  art.innerHTML = svgArt(card.key);
  title.textContent = card.n;
  pos.textContent = posLabel;
  revEl.textContent = rev ? "TERS" : "DÜZ";
  revEl.classList.toggle("rev", !!rev);

  wrap.classList.add("flipped");
}

function onPick(wrap){
  if(!state.ready){
    toast("Önce karıştır evladım.");
    return;
  }
  if(state.picked.length >= state.need){
    toast("Yeter evladım. Fazlası kafa karıştırır.");
    return;
  }
  if(wrap.classList.contains("flipped")) return;

  const card = pickUniqueCard(state.used);
  const rev = Math.random() < 0.35;
  const posLabel = POS[state.need][state.picked.length] || `Kart ${state.picked.length+1}`;

  state.picked.push({ card, rev, posLabel });

  // flip + reveal
  flipReveal(wrap, card, rev, posLabel);
  wrap.classList.add("disabled");
  wrap.classList.add("selected");

  renderPicked();

  if(state.picked.length === state.need){
    setPill("Okunuyor…", true);
    // kalan kartları disable
    document.querySelectorAll(".flip").forEach(el=>{
      if(!el.classList.contains("flipped")) el.classList.add("disabled");
    });
    runReading();
  }
}

/* ===== Boot ===== */
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

  syncTopUI();
  renderNeed();
  setPill("Hazır", true);

  buildGrid();
  bindSpreads();
  bindButtons();
});
