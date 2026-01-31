// FILE: /js/tarot_page.js
// FULL DECK (78) + hidden horizontal scroll + flip reveal + colorful original SVG art

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

const PALETTES = [
  { a:"#ff3d71", b:"#6c5ce7", c:"#00d2d3" },
  { a:"#ffb300", b:"#00c2ff", c:"#bef264" },
  { a:"#ff5252", b:"#ffd86f", c:"#9b5cff" },
  { a:"#00d084", b:"#00a3ff", c:"#ff5fd7" },
  { a:"#ff7a00", b:"#ff3d71", c:"#00d2d3" },
];

function hashStr(s){
  let h=0;
  for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function pickPalette(seedStr){
  const h = hashStr(seedStr);
  return PALETTES[h % PALETTES.length];
}

// --------- FULL DECK GENERATION (78) ----------
const MAJOR = [
  "Deli (0)","Büyücü (I)","Başrahibe (II)","İmparatoriçe (III)","İmparator (IV)","Aziz (V)",
  "Aşıklar (VI)","Savaş Arabası (VII)","Güç (VIII)","Ermiş (IX)","Kader Çarkı (X)","Adalet (XI)",
  "Asılan Adam (XII)","Dönüşüm (XIII)","Denge (XIV)","Şeytan (XV)","Kule (XVI)","Yıldız (XVII)",
  "Ay (XVIII)","Güneş (XIX)","Mahkeme (XX)","Dünya (XXI)"
];

const SUITS = [
  { key:"asalar", name:"Asalar", sym:"🪵", accent:"#ffb300" },
  { key:"kupalar", name:"Kupalar", sym:"🏺", accent:"#00c2ff" },
  { key:"kiliclar", name:"Kılıçlar", sym:"⚔️", accent:"#ff5252" },
  { key:"tilsimlar", name:"Tılsımlar", sym:"🪙", accent:"#bef264" },
];

const RANKS = [
  { key:"as",  name:"As",  sym:"✶" },
  ...Array.from({length:9},(_,i)=>({ key:String(i+2), name:String(i+2), sym:"•" })), // 2..10
  { key:"vale",    name:"Vale",    sym:"♟️" },
  { key:"sovalye", name:"Şövalye", sym:"🏇" },
  { key:"kralice", name:"Kraliçe", sym:"👑" },
  { key:"kral",    name:"Kral",    sym:"👑" },
];

function buildDeck(){
  const deck = [];

  // Major 22
  MAJOR.forEach((nm, idx)=>{
    deck.push({
      id: `major_${idx}`,
      type: "major",
      name: nm,
      suit: null,
      rank: null,
      sym: "🃏",
      seed: `major:${idx}:${nm}`
    });
  });

  // Minor 56
  SUITS.forEach(s=>{
    RANKS.forEach(r=>{
      deck.push({
        id: `minor_${s.key}_${r.key}`,
        type: "minor",
        name: `${s.name} - ${r.name}`,
        suit: s,
        rank: r,
        sym: s.sym,
        seed: `minor:${s.key}:${r.key}`
      });
    });
  });

  return deck; // 78
}

const FULL_DECK = buildDeck();

// --------- COLORFUL SVG BACK ----------
function deckBackSVG(seed){
  const p = pickPalette(seed);
  return `
  <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.a}" stop-opacity="0.40"/>
        <stop offset="0.55" stop-color="${p.b}" stop-opacity="0.30"/>
        <stop offset="1" stop-color="${p.c}" stop-opacity="0.28"/>
      </linearGradient>
      <radialGradient id="orb" cx="50%" cy="40%" r="70%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <pattern id="stars" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="6" r="1" fill="rgba(255,255,255,.30)"/>
        <circle cx="14" cy="14" r="1" fill="rgba(255,255,255,.20)"/>
        <circle cx="12" cy="4" r="0.8" fill="rgba(255,255,255,.18)"/>
      </pattern>
    </defs>

    <rect x="0" y="0" width="100" height="140" rx="16" fill="rgba(0,0,0,.80)"/>
    <rect x="6" y="8" width="88" height="124" rx="14" fill="url(#bg)"/>
    <rect x="6" y="8" width="88" height="124" rx="14" fill="url(#stars)" opacity="0.60"/>
    <circle cx="50" cy="70" r="28" fill="url(#orb)"/>

    <path d="M50 26 L60 52 L88 56 L66 72 L72 100 L50 86 L28 100 L34 72 L12 56 L40 52 Z"
          fill="rgba(255,255,255,.12)"/>
    <path d="M50 36 L56 52 L74 54 L60 64 L64 84 L50 74 L36 84 L40 64 L26 54 L44 52 Z"
          fill="rgba(0,0,0,.28)"/>

    <rect x="10" y="14" width="80" height="112" rx="12"
          fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
    <text x="50" y="126" text-anchor="middle"
          font-family="system-ui, -apple-system, Segoe UI, Arial"
          font-size="9" font-weight="900"
          fill="rgba(255,255,255,.62)">Caynana Tarot</text>
  </svg>`;
}

// --------- COLORFUL SVG FACE ----------
function faceSVG(card, rev){
  const p = pickPalette(card.seed);
  const suitAccent = card.suit?.accent || p.a;
  const title = card.type === "major" ? card.name : card.name;
  const sym = card.type === "major" ? "✶" : (card.suit?.sym || "✶");
  const rankSym = card.rank?.sym || "✶";

  // “ters” görseli: iç frame’i 180 döndürürüz
  const rot = rev ? `transform="rotate(180 60 60)"` : "";

  return `
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${p.a}" stop-opacity="0.34"/>
        <stop offset="0.55" stop-color="${p.b}" stop-opacity="0.26"/>
        <stop offset="1" stop-color="${p.c}" stop-opacity="0.24"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="45%" r="60%">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <g ${rot}>
      <rect x="10" y="10" width="100" height="100" rx="18"
            fill="rgba(0,0,0,.34)" stroke="rgba(255,255,255,.16)" stroke-width="2"/>
      <rect x="14" y="14" width="92" height="92" rx="16" fill="url(#fbg)"/>
      <circle cx="60" cy="58" r="34" fill="url(#glow)"/>

      <path d="M24 60 C40 34, 80 34, 96 60" stroke="rgba(255,255,255,.18)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M24 60 C40 86, 80 86, 96 60" stroke="rgba(255,255,255,.12)" stroke-width="3" fill="none" stroke-linecap="round"/>

      <circle cx="60" cy="60" r="20" fill="rgba(0,0,0,.22)" stroke="rgba(255,255,255,.14)" stroke-width="2"/>
      <text x="60" y="70" text-anchor="middle"
            font-family="Apple Color Emoji, Segoe UI Emoji, system-ui"
            font-size="30">${sym}</text>

      <text x="22" y="28" font-family="system-ui, -apple-system, Segoe UI, Arial"
            font-size="12" font-weight="900" fill="${suitAccent}" opacity="0.95">${rankSym}</text>
      <text x="98" y="100" text-anchor="end" font-family="system-ui, -apple-system, Segoe UI, Arial"
            font-size="12" font-weight="900" fill="${suitAccent}" opacity="0.85">${rankSym}</text>
    </g>
  </svg>`;
}

// --------- STATE ----------
const state = {
  need: 1,
  ready: false,
  used: new Set(),   // selected card ids
  picked: []         // {card, rev, posLabel}
};

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

function renderNeed(){
  const txt = $("needTxt");
  if(txt) txt.textContent = `Seçilecek: ${state.need} kart`;
}

function renderPicked(){
  const box = $("picked");
  box.innerHTML = "";
  state.picked.forEach(p=>{
    const div = document.createElement("div");
    div.className = "picked-card";
    div.innerHTML = `
      <div class="picked-pos">${p.posLabel}</div>
      <div class="picked-name">${p.card.name}</div>
      <div class="picked-tag ${p.rev ? "rev" : ""}">${p.rev ? "TERS" : "DÜZ"}</div>
    `;
    box.appendChild(div);
  });
}

function makeLongReading(){
  const lines = [];
  lines.push(`<b>Evladım…</b> tam deste seçtin, iyi. Şimdi kartların diliyle konuşacağım.`);
  lines.push(`<br><br><b>Seçtiklerin:</b>`);
  state.picked.forEach(p=>{
    lines.push(`<br>• <b>${p.posLabel}:</b> ${p.card.name} (${p.rev?"ters":"düz"})`);
  });
  lines.push(`<br><br><b>Kaynana yorumu:</b>`);
  const revCount = state.picked.filter(x=>x.rev).length;
  lines.push(revCount >= Math.ceil(state.need/2)
    ? `Ters çok. “Düzelt, toparla, plan yap” diyor.`
    : `Genel enerji iyi. “Devam et” diyor ama şımarmak yok 🙂`);
  lines.push(`<br><br><b>Son söz:</b> Neyse halin çıksın falın… Hadi bakalım.`);
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

// --------- BUILD STRIP (78) ----------
function buildDeckStrip(){
  const strip = $("deckStrip");
  strip.innerHTML = "";

  FULL_DECK.forEach((card, idx)=>{
    const flip = document.createElement("div");
    flip.className = "flip";
    flip.dataset.id = card.id;

    flip.innerHTML = `
      <div class="inner">
        <div class="face back">
          <div class="backsvg">${deckBackSVG(card.seed + ":" + idx)}</div>
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

    flip.querySelector(".back").addEventListener("click", ()=> onPick(flip, card));
    strip.appendChild(flip);
  });
}

// --------- PICK FLOW ----------
function onPick(flipEl, card){
  if(!state.ready){
    toast("Önce karıştır evladım.");
    return;
  }
  if(state.picked.length >= state.need){
    toast("Yeter evladım. Fazlası kafa karıştırır.");
    return;
  }
  if(state.used.has(card.id)) return;

  const posLabel = POS[state.need][state.picked.length] || `Kart ${state.picked.length+1}`;
  const rev = Math.random() < 0.38;

  // state
  state.used.add(card.id);
  state.picked.push({ card, rev, posLabel });

  // flip reveal
  const art = flipEl.querySelector("[data-art]");
  const title = flipEl.querySelector("[data-title]");
  const pos = flipEl.querySelector("[data-pos]");
  const revEl = flipEl.querySelector("[data-rev]");

  art.innerHTML = faceSVG(card, rev);
  title.textContent = card.name;
  pos.textContent = posLabel;
  revEl.textContent = rev ? "TERS" : "DÜZ";
  revEl.classList.toggle("rev", !!rev);

  flipEl.classList.add("flipped");
  flipEl.classList.add("disabled");

  renderPicked();

  if(state.picked.length === state.need){
    setPill("Okunuyor…", true);
    // diğerlerini disable hissi (tam kilitleme yok; ama tıklanamaz çünkü state.need doldu)
    runReading();
  }
}

// --------- CONTROLS ----------
function resetAll(){
  state.ready = false;
  state.used = new Set();
  state.picked = [];
  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";
  setPill("Hazır", true);
  renderNeed();
  renderPicked();

  // stripte flipleri geri al
  document.querySelectorAll(".flip").forEach(el=>{
    el.classList.remove("flipped");
    el.classList.remove("disabled");
  });
  toast("Sıfırlandı evladım.");
}

function bindSpreads(){
  document.querySelectorAll("#spreads .seg").forEach(seg=>{
    seg.addEventListener("click", ()=>{
      document.querySelectorAll("#spreads .seg").forEach(x=>x.classList.remove("active"));
      seg.classList.add("active");
      state.need = parseInt(seg.getAttribute("data-n"),10);
      resetAll();
    });
  });
}

function bindButtons(){
  $("btnShuffle").addEventListener("click", ()=>{
    state.ready = true;
    setPill("Karıştı", true);
    toast("Karıştırdım evladım. Kaydır, seç.");
  });
  $("btnReset").addEventListener("click", resetAll);
}

// --------- BOOT ----------
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
  setPill("Hazır", true);
  renderNeed();
  renderPicked();

  buildDeckStrip();
  bindSpreads();
  bindButtons();
});
