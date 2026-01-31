// FILE: /js/translate_page.js
// ✅ Two-sided pro tabletop translator
// ✅ Two mic buttons (one mic at a time)
// ✅ Each side chooses its own spoken language
// ✅ When one side speaks:
//    - show transcript on that side (same language)
//    - translate to other side language and show on other side
// ✅ Speaker buttons: use WebSpeech TTS if available (fallback toast)

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

const LANGS = [
  { code:"tr", name:"Türkçe", speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"English", speech:"en-US", tts:"en-US" },
  { code:"de", name:"Deutsch", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Français", speech:"fr-FR", tts:"fr-FR" },
  { code:"es", name:"Español", speech:"es-ES", tts:"es-ES" },
  { code:"ar", name:"العربية", speech:"ar-SA", tts:"ar-SA" },
  { code:"ru", name:"Русский", speech:"ru-RU", tts:"ru-RU" },
];

function fillSelect(sel, def){
  sel.innerHTML = LANGS.map(l=>`<option value="${l.code}">${l.name}</option>`).join("");
  sel.value = def;
}

function speechLocale(code){
  const f = LANGS.find(x=>x.code===code);
  return f?.speech || "en-US";
}
function ttsLocale(code){
  const f = LANGS.find(x=>x.code===code);
  return f?.tts || "en-US";
}

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

function setMicUI(sideName, on){
  const mic = $(sideName === "top" ? "topMic" : "botMic");
  const st  = $(sideName === "top" ? "topStatus" : "botStatus");
  mic.classList.toggle("listening", !!on);
  st.textContent = on ? "Dinliyor…" : "Hazır";
}

let active = null; // "top" | "bot" | null
let topRec = null;
let botRec = null;

// Side objects
const TOP = { name:"top", langSel:"topLang", heardId:"topHeard", transId:"topTranslated", statusId:"topStatus" };
const BOT = { name:"bot", langSel:"botLang", heardId:"botHeard", transId:"botTranslated", statusId:"botStatus" };

function other(side){ return side.name === "top" ? BOT : TOP; }

function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null;
  botRec = null;
  active = null;
  setMicUI("top", false);
  setMicUI("bot", false);
}

async function onFinal(side, finalText){
  const srcCode = $(side.langSel).value;
  const dstCode = $(other(side).langSel).value;

  // Transcript on speaker side
  $(side.heardId).textContent = finalText || "—";

  // Translate and show on other side
  $(other(side).statusId).textContent = "Çeviriyor…";
  const out = await translateViaApi(finalText, srcCode, dstCode);
  $(other(side).transId).textContent = out || "—";
  $(other(side).statusId).textContent = "Hazır";
}

function startSide(side){
  if(active && active !== side.name){
    stopAll();
  }

  const lang = $(side.langSel).value;
  const rec = buildRecognizer(lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor evladım.");
    return;
  }

  active = side.name;
  setMicUI(side.name, true);

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
    $(side.heardId).textContent = live || "…";
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sıkıntısı olabilir.");
    stopAll();
  };

  rec.onend = async ()=>{
    const txt = (finalText || live || "").trim();
    setMicUI(side.name, false);

    if(!txt){
      $(side.heardId).textContent = "—";
      active = null;
      return;
    }

    await onFinal(side, txt);
    active = null;
  };

  if(side.name === "top") topRec = rec;
  else botRec = rec;

  try{ rec.start(); }
  catch{
    toast("Mikrofon açılamadı. (İzin verildi mi?)");
    stopAll();
  }
}

/* ✅ Hoparlör: ilgili paneldeki çeviri metnini seslendir */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t || t === "—") return toast("Okunacak bir şey yok evladım.");
  if(!("speechSynthesis" in window)) return toast("Hoparlör motoru yok evladım. (TTS sonra)");

  try{
    const u = new SpeechSynthesisUtterance(t);
    u.lang = ttsLocale(langCode);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{
    toast("Seslendirme çalışmadı evladım.");
  }
}

function bind(){
  // back
  $("backBtn").addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  // fill selects (default: Ben TR, Karşı EN)
  fillSelect($("botLang"), "tr");
  fillSelect($("topLang"), "en");

  // mic buttons
  $("botMic").addEventListener("click", ()=> startSide(BOT));
  $("topMic").addEventListener("click", ()=> startSide(TOP));

  // stop when changing lang
  $("botLang").addEventListener("change", ()=> { if(active==="bot") stopAll(); });
  $("topLang").addEventListener("change", ()=> { if(active==="top") stopAll(); });

  // speaker buttons
  $("botSpeak").addEventListener("click", ()=>{
    // Bot panel -> translated for other (English etc.) is in botTranslated
    const lang = $("topLang").value; // what other side should hear
    speak($("botTranslated").textContent, lang);
  });
  $("topSpeak").addEventListener("click", ()=>{
    // Top panel -> translated for me is in topTranslated (Turkish etc.)
    const lang = $("botLang").value; // what I should hear
    speak($("topTranslated").textContent, lang);
  });
}

document.addEventListener("DOMContentLoaded", bind);
