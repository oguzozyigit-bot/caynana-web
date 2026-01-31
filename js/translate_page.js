// FILE: /js/translate_page.js
// Translator device: text / voice / photo
// ✅ Two-panel tabletop mode (top rotated for other side)
// ✅ "OK" publishes translation to other side
// ✅ FREE: only TR/EN, single target
// ✅ PLUS/PRO: more languages + multi target chips
// ✅ Voice STT fills textarea, does NOT auto-send. Enter/Send -> draft. OK -> publish.
// ✅ Photo mode: select image -> preview; user types extracted text manually (OCR later).
// API hookup stub included: translateViaApi() tries BASE_DOMAIN /api/translate else fallback.

import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function setToast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__tto);
  window.__tto = setTimeout(()=> t.classList.remove("show"), 2400);
}
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function getUser(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return u && Object.keys(u).length ? u : safeJson(localStorage.getItem("caynana_user_v1"), {});
}

function getPlan(){
  const p = String(getUser().plan || "free").toLowerCase();
  return p;
}
function isFree(){ return getPlan() === "free"; }
function isPlus(){ return getPlan() === "plus"; }
function isPro(){ return getPlan() === "pro"; }

const LANGS_FREE = [
  { code:"tr", name:"Türkçe" },
  { code:"en", name:"İngilizce" }
];

const LANGS_FULL = [
  { code:"auto", name:"Algıla" },
  { code:"tr", name:"Türkçe" },
  { code:"en", name:"İngilizce" },
  { code:"de", name:"Almanca" },
  { code:"fr", name:"Fransızca" },
  { code:"es", name:"İspanyolca" },
  { code:"ar", name:"Arapça" },
  { code:"ru", name:"Rusça" },
];

let mode = "text"; // text | voice | photo
let listening = false;
let rec = null;

// Draft buffers
let lastSourceText = "";
let lastDraftTranslations = []; // [{lang, text}]
let lastChosenTargets = [];     // target lang codes for multi

function autoGrow(){
  const ta = $("msgInput");
  if(!ta) return;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

function setMode(m){
  mode = m;

  // tabs
  document.querySelectorAll("#modes .mode").forEach(el=>{
    el.classList.toggle("active", el.getAttribute("data-mode") === m);
  });

  // photo row toggle
  $("photoRow").classList.toggle("show", m === "photo");

  // camBtn behaves as photo button only in photo mode
  $("camBtn").style.opacity = (m === "photo") ? "1" : "0.45";

  // mic allowed in voice mode, but also can be used for dictation in text mode
  // we keep it on for both text/voice, but in photo it's optional
}

function langName(code){
  const list = isFree() ? LANGS_FREE : LANGS_FULL;
  const f = list.find(x=>x.code===code);
  if(f) return f.name;
  // if code from chips (no auto) fallback
  const f2 = LANGS_FULL.find(x=>x.code===code);
  return f2 ? f2.name : code;
}

function fillLangSelects(){
  const src = $("srcLang");
  const dst = $("dstLang");
  src.innerHTML = "";
  dst.innerHTML = "";

  const list = isFree() ? LANGS_FREE : LANGS_FULL;

  // source
  list.forEach(l=>{
    // FREE has no "auto"
    if(isFree() && l.code === "auto") return;
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = l.name;
    src.appendChild(opt);
  });

  // target
  // FREE only TR/EN single select
  if(isFree()){
    LANGS_FREE.forEach(l=>{
      const opt = document.createElement("option");
      opt.value = l.code;
      opt.textContent = l.name;
      dst.appendChild(opt);
    });
  }else{
    // single select still exists but PLUS/PRO uses chips for multi targets
    LANGS_FULL.filter(l=>l.code!=="auto").forEach(l=>{
      const opt = document.createElement("option");
      opt.value = l.code;
      opt.textContent = l.name;
      dst.appendChild(opt);
    });
  }

  // defaults
  // source default TR, target default EN
  src.value = isFree() ? "tr" : "auto";
  dst.value = "en";

  // multi targets for plus/pro
  if(!isFree()){
    $("dstMulti").style.display = "flex";
    buildTargetChips();
  }else{
    $("dstMulti").style.display = "none";
    lastChosenTargets = ["en"];
  }

  updatePanelLangLabels();
}

function buildTargetChips(){
  const box = $("dstMulti");
  box.innerHTML = "";

  // initial set: EN
  if(!lastChosenTargets.length) lastChosenTargets = ["en"];

  const all = LANGS_FULL.filter(l=>l.code!=="auto");
  all.forEach(l=>{
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = l.name;
    chip.dataset.code = l.code;

    // FREE lock (but box hidden in free anyway)
    if(isFree()) chip.classList.add("lock");

    chip.classList.toggle("on", lastChosenTargets.includes(l.code));

    chip.addEventListener("click", ()=>{
      if(isFree()) return;

      // PLUS/PRO: multi select, but keep at least one selected
      const code = l.code;
      const has = lastChosenTargets.includes(code);
      if(has){
        if(lastChosenTargets.length === 1){
          setToast("Evladım en az bir hedef dil seç.");
          return;
        }
        lastChosenTargets = lastChosenTargets.filter(x=>x!==code);
      }else{
        lastChosenTargets.push(code);
      }
      buildTargetChips();
      updatePanelLangLabels();
    });

    box.appendChild(chip);
  });
}

function updatePanelLangLabels(){
  const src = $("srcLang").value;
  const dstSingle = $("dstLang").value;

  $("meLang").textContent = `Kaynak: ${langName(src)}`;
  if(isFree()){
    $("themLang").textContent = `Hedef: ${langName(dstSingle)}`;
  }else{
    const names = lastChosenTargets.map(langName).join(", ");
    $("themLang").textContent = `Hedef: ${names}`;
  }
}

/* --------- Chat bubbles --------- */
function addMeBubble(text){
  const b = document.createElement("div");
  b.className = "bubble me";
  b.textContent = text;
  $("meBody").appendChild(b);
  $("meBody").scrollTop = $("meBody").scrollHeight;
}

function addThemBubble(text){
  const b = document.createElement("div");
  b.className = "bubble them";
  b.textContent = text;
  $("themBody").appendChild(b);
  $("themBody").scrollTop = $("themBody").scrollHeight;
}

function addSysMe(text){
  const b = document.createElement("div");
  b.className = "bubble sys";
  b.textContent = text;
  $("meBody").appendChild(b);
  $("meBody").scrollTop = $("meBody").scrollHeight;
}

function addKaynana(text){
  const b = document.createElement("div");
  b.className = "bubble kaynana";
  b.innerHTML = `<div class="tag">Kaynana</div>${escapeHTML(text)}`;
  $("meBody").appendChild(b);
  $("meBody").scrollTop = $("meBody").scrollHeight;
}

function escapeHTML(s=""){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

/* --------- Kaynana mini yorum --------- */
function kaynanaLine(){
  const sp = clamp(parseInt(getUser()?.sp_score ?? 10,10)||10, 0, 100);
  if(sp < 20) return "Evladım… cümleyi biraz yumuşattım, yoksa kavga çıkar.";
  if(sp < 50) return "Tamam, bunu gönder. Rezil olmazsın 🙂";
  return "Aferin evladım, bu sefer diplomatik olmuş.";
}

/* --------- Translation API stub --------- */
async function translateViaApi(text, src, targets){
  const payload = { text, source: src, targets };
  try{
    const r = await fetch(`${(BASE_DOMAIN||"").replace(/\/+$/,"")}/api/translate`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if(!r.ok) throw new Error("api");
    const data = await r.json();
    // expected: { ok:true, translations: { en:"...", de:"..." } }
    const out = [];
    const tr = data?.translations || data?.result || {};
    for(const t of targets){
      const val = String(tr[t] || "").trim();
      if(val) out.push({ lang:t, text: val });
    }
    return out;
  }catch{
    // fallback demo
    return targets.map(t=>({
      lang: t,
      text: `[${t.toUpperCase()}] ${text}`
    }));
  }
}

/* --------- Draft translate (Send) --------- */
async function makeDraft(){
  const text = String($("msgInput").value || "").trim();
  if(!text){
    setToast("Evladım bir şey söylemeden çevrilmez 🙂");
    return;
  }

  // In photo mode, we allow typed text as "extracted"
  const src = $("srcLang").value;
  const targets = isFree() ? [ $("dstLang").value ] : (lastChosenTargets.length ? lastChosenTargets : [ $("dstLang").value ]);

  lastSourceText = text;

  addMeBubble(text); // show what I said/typed
  addSysMe("Çeviri taslağı hazır. Okeylersen karşı tarafa gider.");

  // draft translation
  const out = await translateViaApi(text, src === "auto" ? "auto" : src, targets);
  lastDraftTranslations = out;

  // show draft in my side as system-ish lines
  if(out.length){
    out.forEach(o=>{
      addSysMe(`${langName(o.lang)}: ${o.text}`);
    });
  }else{
    addSysMe("Çeviri motoru bağlı değil evladım. (Demo gösterdim)");
  }

  addKaynana(kaynanaLine());

  // clear input but keep for editing if needed
  $("msgInput").value = "";
  autoGrow();
}

/* --------- Publish (OK) --------- */
function publish(){
  if(!lastDraftTranslations.length){
    setToast("Evladım önce çevir, sonra OK.");
    return;
  }
  // Send only the translated lines to other side
  lastDraftTranslations.forEach(o=>{
    addThemBubble(o.text);
  });
  setToast("OK. Karşı tarafa gitti.");

  // reset draft
  lastDraftTranslations = [];
  lastSourceText = "";
}

/* --------- Voice STT --------- */
function setMicUI(on){
  listening = !!on;
  $("micBtn").classList.toggle("listening", listening);
}

function startSTT(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    setToast("Bu cihaz konuşmayı yazıya çevirmiyor evladım.");
    return;
  }

  stopSTT();

  const rec0 = new SR();
  rec = rec0;
  setMicUI(true);

  // language: use srcLang if not auto
  const src = $("srcLang").value;
  rec0.lang = (src && src !== "auto") ? mapSpeechLang(src) : "tr-TR";
  rec0.interimResults = false;
  rec0.continuous = true;

  rec0.onresult = (e)=>{
    let chunk = "";
    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i]?.[0]?.transcript || "";
      chunk += t + " ";
    }
    chunk = chunk.trim();
    if(!chunk) return;

    const ta = $("msgInput");
    ta.value = (ta.value ? ta.value + " " : "") + chunk;
    autoGrow();
  };

  rec0.onerror = ()=> setToast("Mikrofon bir durdu evladım. Tekrar bas.");
  rec0.onend = ()=>{
    if(listening){
      try{ rec0.start(); }catch{}
    }
  };

  try{ rec0.start(); }catch{ setToast("Mikrofon açılamadı (izin/HTTPS)."); stopSTT(); }
}

function stopSTT(){
  try{ rec?.stop?.(); }catch{}
  rec = null;
  setMicUI(false);
}

function mapSpeechLang(code){
  const map = {
    tr:"tr-TR",
    en:"en-US",
    de:"de-DE",
    fr:"fr-FR",
    es:"es-ES",
    ar:"ar-SA",
    ru:"ru-RU"
  };
  return map[code] || "tr-TR";
}

/* --------- Photo mode (placeholder) --------- */
function openPhotoPicker(){
  $("photoInput").click();
}
function handlePhoto(file){
  if(!file) return;
  const url = URL.createObjectURL(file);
  $("photoPreview").src = url;
  $("photoPreview").style.display = "block";
  setToast("Foto geldi. Metni aşağıya yaz/düzelt, sonra Çevir + OK.");
}

/* --------- Boot --------- */
document.addEventListener("DOMContentLoaded", ()=>{
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  // Mode tabs
  document.querySelectorAll("#modes .mode").forEach(el=>{
    el.addEventListener("click", ()=> setMode(el.getAttribute("data-mode")));
  });

  // Lang selects
  fillLangSelects();
  $("srcLang").addEventListener("change", ()=>{
    // if voice running, restart to update lang
    if(listening){ stopSTT(); startSTT(); }
    updatePanelLangLabels();
  });
  $("dstLang").addEventListener("change", updatePanelLangLabels);

  // Default: multi targets for plus/pro
  if(!isFree()){
    lastChosenTargets = ["en"];
    buildTargetChips();
  }

  // Photo controls
  $("camBtn").addEventListener("click", ()=>{
    if(mode !== "photo"){
      setToast("Foto için önce Foto modunu seç evladım.");
      return;
    }
    openPhotoPicker();
  });

  $("photoBtn").addEventListener("click", openPhotoPicker);
  $("photoInput").addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if(f) handlePhoto(f);
  });

  // Buttons
  $("sendBtn").addEventListener("click", makeDraft);
  $("okBtn").addEventListener("click", publish);

  // Enter = draft translate (send), Shift+Enter newline
  $("msgInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      makeDraft();
    }
  });
  $("msgInput").addEventListener("input", autoGrow);

  // Mic toggle
  $("micBtn").addEventListener("click", ()=>{
    if(listening) stopSTT();
    else startSTT();
  });

  // Plan labels in panels
  const plan = getPlan().toUpperCase();
  $("meTitle").textContent = `Ben (${plan})`;
  $("themTitle").textContent = `Karşı Taraf`;

  // Mode initial
  setMode("text");

  // Friendly info
  addSysMe(isFree()
    ? "FREE: TR/EN + tek hedef. Çevir → OK → karşıya gider."
    : "PLUS/PRO: çoklu hedef dil açıldı. Çevir → OK → karşıya gider."
  );

  updatePanelLangLabels();
});
