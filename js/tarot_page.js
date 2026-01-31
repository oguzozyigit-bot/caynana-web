// FILE: /js/tarot_page.js
// COLORFUL ORIGINAL TAROT: flip + vibrant backs + vibrant fronts (motor later)

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

// Renk paletleri (kartlara çeşit)
const PALETTES = [
  { a:"#ff3d71", b:"#6c5ce7", c:"#00d2d3" },
  { a:"#ffb300", b:"#00c2ff", c:"#bef264" },
  { a:"#ff5252", b:"#ffd86f", c:"#9b5cff" },
  { a:"#00d084", b:"#00a3ff", c:"#ff5fd7" },
  { a:"#ff7a00", b:"#ff3d71", c:"#00d2d3" },
];

// Orijinal kart listesi (kısa ama yeterli; istersen 22’ye çıkarırız)
const CARDS = [
  { key:"fool",    n:"Deli (0)",       sym:"🪶", u:"Yeni sayfa açılıyor. Cesaret et.", r:"Dağınıklık. Ayağını yere bas." },
  { key:"mag",     n:"Büyücü (I)",     sym:"✨", u:"Elindeki imkanlar yeter. Başlat.", r:"Planı netleştir. Kandırılma." },
  { key:"priest",  n:"Başrahibe (II)", sym:"🌙", u:"İç sesini dinle. Sabır.", r:"Kuruntuya kapılma. Kanıt ara." },
  { key:"emp",     n:"İmparator (IV)", sym:"🛡️", u:"Düzen kur. Sınır koy.", r:"Kontrolcülük ve inat." },
  { key:"love",    n:"Aşıklar (VI)",   sym:"💞", u:"Bir seçim var. Netleş.", r:"Kararsızlık." },
  { key:"chariot", n:"Savaş Arabası",  sym:"🏁", u:"Disiplinle kazanırsın.", r:"Hırsın gözünü kör etmesin." },
  { key:"strength",n:"Güç",            sym:"🦁", u:"Yumuşak güç kazanır.", r:"Öfke ve kontrol kaybı." },
  { key:"hermit",  n:"Ermiş",          sym:"🏮", u:"Geri çekil, netleş.", r:"Kopma, yalnızlaşma." },
  { key:"wheel",   n:"Kader Çarkı",    sym:"🎡", u:"Dönüm noktası.", r:"Aynı hatayı tekrar etme." },
  { key:"justice", n:"Adalet",         sym:"⚖️", u:"Hak yerini bulur.", r:"Dengesizlik." },
  { key:"tower",   n:"Kule",           sym:"🏛️", u:"Gerçek ortaya çıkar.", r:"Direnme, ders çıkar." },
  { key:"star",    n:"Yıldız",         sym:"⭐", u:"Ferahlık geliyor.", r:"Umudu erteleme." },
  { key:"sun",     n:"Güneş",          sym:"☀️", u:"Aydınlık ve rahatlama.", r:"Ego şişmesi." },
  { key:"moon",    n:"Ay",             sym:"🌫️", u:"Net değil, acele etme.", r:"Yanılsama." },
  { key:"world",   n:"Dünya",          sym:"🌍", u:"Emek karşılığı.", r:"Bitirmeden bırakma." },
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

function pickPalette(seedStr){
  // deterministic-ish
  let h = 0;
  for(let i=0;i<seedStr.length;i++) h = (h*31 + seedStr.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

// ✅ Kart sırtı: çok renkli premium desen (SVG)
function deckBackSVG(seed="kaynana"){
  const p = pickPalette(seed);
  return `
  <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.a}" stop-opacity="0.35"/>
        <stop offset="0.55" stop-color="${p.b}" stop-opacity="0.28"/>
        <stop offset="1" stop-color="${p.c}" stop-opacity="0.25"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="35%" r="70%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <pattern id="stars" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="6" r="1" fill="rgba(255,255,255,.25)"/>
        <circle cx="16" cy="14" r="1" fill="rgba(255,255,255,.18)"/>
        <circle cx="12" cy="4" r="0.8" fill="rgba(255,255,255,.16)"/>
      </pattern>
    </defs>

    <rect x="0" y="0" width="100" height="140" rx="16" fill="rgba(0,0,0,.75)"/>
    <rect x="6" y="8" width="88" height="124" rx="14" fill="url(#bg)"/>
    <rect x="6" y="8" width="88" height="124" rx="14" fill="url(#stars)" opacity="0.55"/>

    <circle cx="50" cy="70" r="28" fill="url(#glow)"/>
    <path d="M50 28 L58 52 L84 56 L64 72 L70 98 L50 86 L30 98 L36 72 L16 56 L42 52 Z"
          fill="rgba(255,255,255,.10)"/>
    <path d="M50 38 L56 54 L74 56 L60 66 L64 84 L50 74 L36 84 L40 66 L26 56 L44 54 Z"
          fill="rgba(0,0,0,.25)"/>

    <rect x="10" y="14" width="80" height="112" rx="12"
          fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
    <rect x="14" y="18" width="72" height="104" rx="10"
          fill="none" stroke="rgba(255,255,255,.10)" stroke-width="2"/>

    <text x="50" y="125" text-anchor="middle"
          font-family="system-ui, -apple-system, Segoe UI, Arial"
          font-size="9" font-weight="900"
          fill="rgba(255,255,255,.55)">Caynana Tarot</text>
  </svg>`;
}

// ✅ Kart yüzü: çok renkli simge illüstrasyonu (SVG)
function faceSVG(card){
  const p = pickPalette(card.key);
  const sym = card.sym || "✶";

  return `
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.a}" stop-opacity="0.28"/>
        <stop offset="0.55" stop-color="${p.b}" stop-opacity="0.22"/>
        <stop offset="1" stop-color="${p.c}" stop-opacity="0.20"/>
      </linearGradient>
      <radialGradient id="orb" cx="50%" cy="45%" r="60%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect x="10" y="10" width="100" height="100" rx="18"
          fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.16)" stroke-width="2"/>
    <rect x="14" y="14" width="92" height="92" rx="16" fill="url(#fbg)"/>
    <circle cx="60" cy="58" r="34" fill="url(#orb)"/>

    <!-- orbit lines -->
    <path d="M24 60 C40 34, 80 34, 96 60" stroke="rgba(255,255,255,.18)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M24 60 C40 86, 80 86, 96 60" stroke="rgba(255,255,255,.12)" stroke-width="3" fill="none" stroke-linecap="round"/>

    <!-- center symbol -->
    <text x="60" y="72" text-anchor="middle"
          font-family="Apple Color Emoji, Segoe UI Emoji, system-ui"
          font-size="38">${sym}</text>

    <!-- top mini marks -->
    <circle cx="30" cy="30" r="3" fill="rgba(255,255,255,.25)"/>
    <circle cx="90" cy="30" r="3" fill="rgba(255,255,255,.18)"/>
    <circle cx="30" cy="90" r="3" fill="rgba(255,255,255,.18)"/>
    <circle cx="90" cy="90" r="3" fill="rgba(255,255,255,.25)"/>
  </svg>`;
}

// ===== State =====
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

function showThinking(on){
  $("thinking").classList.toggle("show", !!on);
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

function makeLongReading(){
  const lines = [];
  lines.push(`<b>Evladım…</b> kartlar renkli ama ben daha renkliyim. 🙂`);
  lines.push(`<br><br><b>Kartların:</b>`);
  state.picked.forEach(p=>{
    const txt = p.rev ? p.card.r : p.card.u;
    lines.push(`<br>• <b>${p.posLabel}:</b> ${p.card.n} (${p.rev?"ters":"düz"}) — ${txt}`);
  });
  lines.push(`<br><br><b>Özet:</b>`);
  const revCount = state.picked.filter(x=>x.rev).length;
  lines.push(revCount >= Math.ceil(state.need/2)
    ? `Ters enerji fazla. “İnat etme, düzelt” diyor. Plan + sabır şart.`
    : `Enerji iyi. Doğru adımı atarsan işin açılır. Şımarmak yok 🙂`);
  lines.push(`<br><br><b>Kaynana tavsiyesi:</b> Bugün tek hedef seç. Bitir. Sonra diğerine geç.`);
  lines.push(`<br><br><b>Kapanış:</b> Neyse halin çıksın falın… ama ben sende toparlanma görüyorum.`);
  return lines.join("");
}

async function runReading(){
  showThinking(true);
  await sleep(6500);
  showThinking(false);
  const box = $("resultBox");
  box.innerHTML = makeLongReading();
  box.classList.add("show");
}

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

function buildGrid(){
  const grid = $("grid");
  grid.innerHTML = "";

  for(let i=0;i<16;i++){
    const wrap = document.createElement("div");
    wrap.className = "flip";
    wrap.dataset.slot = String(i);

    wrap.innerHTML = `
      <div class="inner">
        <div class="face back">
          <div class="backsvg">${deckBackSVG("slot:"+i)}</div>
        </div>
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

function flipReveal(wrap, card, rev, posLabel){
  const art = wrap.querySelector("[data-art]");
  const title = wrap.querySelector("[data-title]");
  const pos = wrap.querySelector("[data-pos]");
  const revEl = wrap.querySelector("[data-rev]");

  art.innerHTML = faceSVG(card);
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
  const rev = Math.random() < 0.38;
  const posLabel = POS[state.need][state.picked.length] || `Kart ${state.picked.length+1}`;

  state.picked.push({ card, rev, posLabel });

  flipReveal(wrap, card, rev, posLabel);
  wrap.classList.add("disabled");
  renderPicked();

  if(state.picked.length === state.need){
    setPill("Okunuyor…", true);
    document.querySelectorAll(".flip").forEach(el=>{
      if(!el.classList.contains("flipped")) el.classList.add("disabled");
    });
    runReading();
  }
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

  syncTopUI();
  renderNeed();
  setPill("Hazır", true);

  // deck stack art
  const b1 = $("deckBack1"), b2 = $("deckBack2"), b3 = $("deckBack3");
  if(b1) b1.innerHTML = deckBackSVG("stack1");
  if(b2) b2.innerHTML = deckBackSVG("stack2");
  if(b3) b3.innerHTML = deckBackSVG("stack3");

  buildGrid();
  bindSpreads();
  bindButtons();
});
