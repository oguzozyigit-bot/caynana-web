// FILE: /js/translate_page.js
// ✅ No TR/EN labels anywhere
// ✅ History log + scroll + auto-follow if near bottom
// ✅ Wave animates when listening
// ✅ Speaker: default ON (auto speak). Tap speaker toggles MUTE (no manual speak).
// ✅ Slogan translates based on selected language.

import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2400);
}

function setWaveListening(on){
  $("frameRoot")?.classList.toggle("listening", !!on);
}

const LANGS = [
  { code:"tr", name:"Türkçe",  speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"English", speech:"en-US", tts:"en-US" },
  { code:"de", name:"Deutsch", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Français",speech:"fr-FR", tts:"fr-FR" },
  { code:"es", name:"Español", speech:"es-ES", tts:"es-ES" },
  { code:"ar", name:"العربية", speech:"ar-SA", tts:"ar-SA" },
  { code:"ru", name:"Русский", speech:"ru-RU", tts:"ru-RU" },
];

const SLOGAN_TR = "Yapay Zekânın Geleneksel Aklı";
const SLOGAN_MAP = {
  tr: SLOGAN_TR,
  en: "The Traditional Mind of AI",
  de: "Der traditionelle Verstand der KI",
  fr: "L’esprit traditionnel de l’IA",
  es: "La mente tradicional de la IA",
  ar: "عقل الذكاء الاصطناعي التقليدي",
  ru: "Традиционный разум ИИ"
};
function sloganFor(code){ return SLOGAN_MAP[code] || SLOGAN_TR; }

function speechLocale(code){ return LANGS.find(x=>x.code===code)?.speech || "en-US"; }
function ttsLocale(code){ return LANGS.find(x=>x.code===code)?.tts || "en-US"; }

async function translateViaApi(text, source, target){
  const base = (BASE_DOMAIN || "").replace(/\/+$/,"");
  if(!base) return `[${target.toUpperCase()}] ${text}`;
  try{
    const r = await fetch(`${base}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text, source, target })
    });
    if(!r.ok) throw new Error("api");
    const data = await r.json();
    const out = String(data?.text || data?.translation || data?.translated || "").trim();
    return out || `[${target.toUpperCase()}] ${text}`;
  }catch{
    return `[${target.toUpperCase()}] ${text}`;
  }
}

function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = speechLocale(langCode);
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

/* Auto-follow per side */
const follow = { top:true, bot:true };
function isNearBottom(el, slack=140){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch{ return true; }
}
function hookScrollFollow(sideName, el){
  el.addEventListener("scroll", ()=>{ follow[sideName] = isNearBottom(el); }, { passive:true });
}
function scrollIfNeeded(sideName, el){
  if(follow[sideName]) el.scrollTop = el.scrollHeight;
}

/* Add message bubbles */
function addBubble(sideName, kind, label, text){
  const wrap = $(sideName === "top" ? "topBody" : "botBody");
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;

  if(label){
    const lab = document.createElement("div");
    lab.className = "label";
    lab.textContent = label;
    b.appendChild(lab);
  }

  const tx = document.createElement("div");
  tx.textContent = text || "—";
  b.appendChild(tx);

  wrap.appendChild(b);
  scrollIfNeeded(sideName, wrap);
}

/* Custom dropdown */
function buildDropdown(ddId, btnId, txtId, menuId, defCode, onChange){
  const dd = $(ddId);
  const btn = $(btnId);
  const txt = $(txtId);
  const menu = $(menuId);

  let current = defCode;

  function closeAll(){
    document.querySelectorAll(".dd.open").forEach(x=> x.classList.remove("open"));
  }

  function setValue(code){
    current = code;
    txt.textContent = (LANGS.find(l=>l.code===code)?.name || code);
    onChange?.(code);
  }

  // ✅ no TR/EN codes, only names
  menu.innerHTML = LANGS.map(l=>`<div class="dd-item" data-code="${l.code}">${l.name}</div>`).join("");

  menu.querySelectorAll(".dd-item").forEach(it=>{
    it.addEventListener("click", ()=>{
      const code = it.getAttribute("data-code");
      closeAll();
      setValue(code);
    });
  });

  btn.addEventListener("click", (e)=>{
    e.stopPropagation();
    const open = dd.classList.contains("open");
    closeAll();
    dd.classList.toggle("open", !open);
  });

  document.addEventListener("click", ()=> closeAll());

  setValue(defCode);

  return { get: ()=> current, set: (c)=> setValue(c) };
}

/* Mic + wave */
let active = null;
let topRec = null;
let botRec = null;

function setMicUI(side, on){
  const mic = $(side === "top" ? "topMic" : "botMic");
  const st  = $(side === "top" ? "topStatus" : "botStatus");
  mic.classList.toggle("listening", !!on);
  st.textContent = on ? "Dinliyor…" : "Hazır";
  setWaveListening(!!on);
}

function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null;
  botRec = null;
  active = null;
  setMicUI("top", false);
  setMicUI("bot", false);
  setWaveListening(false);
}

/* ✅ Auto speak toggle (mute) */
const mute = { top:false, bot:false }; // false => speak ON
function setMute(side, on){
  mute[side] = !!on;
  const btn = $(side === "top" ? "topSpeak" : "botSpeak");
  btn.classList.toggle("muted", mute[side]);
}

function speakAuto(text, langCode, side){
  if(mute[side]) return; // muted, do nothing
  const t = String(text||"").trim();
  if(!t) return;

  if(!("speechSynthesis" in window)) return; // no toast spam

  try{
    const u = new SpeechSynthesisUtterance(t);
    u.lang = ttsLocale(langCode);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{}
}

async function onFinal(side, srcCode, dstCode, finalText){
  const otherSide = (side === "top") ? "bot" : "top";
  const otherStatus = $(otherSide === "top" ? "topStatus" : "botStatus");

  // Speaker transcript (their own language)
  addBubble(side, "them", "Duyulan", finalText);

  // Translation shown on other side
  otherStatus.textContent = "Çeviriyor…";
  const out = await translateViaApi(finalText, srcCode, dstCode);
  addBubble(otherSide, "me", "Çeviri", out);
  otherStatus.textContent = "Hazır";

  // ✅ Auto speak translation to the listener side (otherSide)
  speakAuto(out, dstCode, otherSide);
}

function startSide(side, getLang, getOtherLang){
  if(active && active !== side){
    stopAll();
  }

  const srcCode = getLang();
  const dstCode = getOtherLang();

  const rec = buildRecognizer(srcCode);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  active = side;
  setMicUI(side, true);

  let live = "";
  let finalText = "";

  rec.onresult = (e)=>{
    let chunk = "";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t = e.results[i]?.[0]?.transcript || "";
      if(e.results[i].isFinal) finalText += t + " ";
      else chunk += t + " ";
    }
    live = (finalText + chunk).trim();
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sıkıntısı olabilir.");
    stopAll();
  };

  rec.onend = async ()=>{
    const txt = (finalText || live || "").trim();
    setMicUI(side, false);

    if(!txt){
      active = null;
      return;
    }

    await onFinal(side, srcCode, dstCode, txt);
    active = null;
  };

  if(side === "top") topRec = rec;
  else botRec = rec;

  try{ rec.start(); }
  catch{
    toast("Mikrofon açılamadı. (İzin verildi mi?)");
    stopAll();
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn").addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  // scroll follow
  hookScrollFollow("top", $("topBody"));
  hookScrollFollow("bot", $("botBody"));

  // dropdowns
  const topDD = buildDropdown("ddTop","ddTopBtn","ddTopTxt","ddTopMenu","en", (code)=>{
    $("sloganTop").textContent = sloganFor(code);
    // if currently listening on top, restart on next tap (we keep simple)
  });

  const botDD = buildDropdown("ddBot","ddBotBtn","ddBotTxt","ddBotMenu","tr", (code)=>{
    $("sloganBot").textContent = sloganFor(code);
  });

  // slogans
  $("sloganTop").textContent = sloganFor(topDD.get());
  $("sloganBot").textContent = sloganFor(botDD.get());

  // init bodies empty
  $("topBody").innerHTML = "";
  $("botBody").innerHTML = "";

  // speaker buttons now toggle mute (NOT speak)
  $("topSpeak").addEventListener("click", ()=>{
    setMute("top", !mute.top);
    toast(mute.top ? "Karşı taraf sesi kapalı" : "Karşı taraf sesi açık");
  });
  $("botSpeak").addEventListener("click", ()=>{
    setMute("bot", !mute.bot);
    toast(mute.bot ? "Benim ses kapalı" : "Benim ses açık");
  });

  // default: sound ON
  setMute("top", false);
  setMute("bot", false);

  // mic buttons
  $("topMic").addEventListener("click", ()=> startSide("top", ()=>topDD.get(), ()=>botDD.get()));
  $("botMic").addEventListener("click", ()=> startSide("bot", ()=>botDD.get(), ()=>topDD.get()));

  setWaveListening(false);
});
