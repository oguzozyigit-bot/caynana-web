// FILE: /js/translate_page.js
// ✅ Dropdown: search + scroll (fix)
// ✅ Many languages
// ✅ Translate works with backend payload {text, from_lang, to_lang}
// ✅ No TR/EN labels, no extra UI labels

import { BASE_DOMAIN } from "/js/config.js";
const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2000);
}

function setWaveListening(on){
  $("frameRoot")?.classList.toggle("listening", !!on);
}

/* 40+ language list */
const LANGS = [
  { code:"tr", name:"Türkçe",  speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"English", speech:"en-US", tts:"en-US" },
  { code:"en_gb", name:"English (UK)", speech:"en-GB", tts:"en-GB" },
  { code:"de", name:"Deutsch", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Français", speech:"fr-FR", tts:"fr-FR" },
  { code:"es", name:"Español", speech:"es-ES", tts:"es-ES" },
  { code:"it", name:"Italiano", speech:"it-IT", tts:"it-IT" },
  { code:"pt", name:"Português (BR)", speech:"pt-BR", tts:"pt-BR" },
  { code:"pt_pt", name:"Português (PT)", speech:"pt-PT", tts:"pt-PT" },
  { code:"nl", name:"Nederlands", speech:"nl-NL", tts:"nl-NL" },
  { code:"sv", name:"Svenska", speech:"sv-SE", tts:"sv-SE" },
  { code:"no", name:"Norsk", speech:"nb-NO", tts:"nb-NO" },
  { code:"da", name:"Dansk", speech:"da-DK", tts:"da-DK" },
  { code:"fi", name:"Suomi", speech:"fi-FI", tts:"fi-FI" },
  { code:"pl", name:"Polski", speech:"pl-PL", tts:"pl-PL" },
  { code:"cs", name:"Čeština", speech:"cs-CZ", tts:"cs-CZ" },
  { code:"sk", name:"Slovenčina", speech:"sk-SK", tts:"sk-SK" },
  { code:"hu", name:"Magyar", speech:"hu-HU", tts:"hu-HU" },
  { code:"ro", name:"Română", speech:"ro-RO", tts:"ro-RO" },
  { code:"bg", name:"Български", speech:"bg-BG", tts:"bg-BG" },
  { code:"el", name:"Ελληνικά", speech:"el-GR", tts:"el-GR" },
  { code:"uk", name:"Українська", speech:"uk-UA", tts:"uk-UA" },
  { code:"ru", name:"Русский", speech:"ru-RU", tts:"ru-RU" },
  { code:"ar", name:"العربية", speech:"ar-SA", tts:"ar-SA" },
  { code:"he", name:"עברית", speech:"he-IL", tts:"he-IL" },
  { code:"fa", name:"فارسی", speech:"fa-IR", tts:"fa-IR" },
  { code:"hi", name:"हिन्दी", speech:"hi-IN", tts:"hi-IN" },
  { code:"ur", name:"اردو", speech:"ur-PK", tts:"ur-PK" },
  { code:"bn", name:"বাংলা", speech:"bn-BD", tts:"bn-BD" },
  { code:"ta", name:"தமிழ்", speech:"ta-IN", tts:"ta-IN" },
  { code:"te", name:"తెలుగు", speech:"te-IN", tts:"te-IN" },
  { code:"mr", name:"मराठी", speech:"mr-IN", tts:"mr-IN" },
  { code:"th", name:"ไทย", speech:"th-TH", tts:"th-TH" },
  { code:"vi", name:"Tiếng Việt", speech:"vi-VN", tts:"vi-VN" },
  { code:"id", name:"Bahasa Indonesia", speech:"id-ID", tts:"id-ID" },
  { code:"ms", name:"Bahasa Melayu", speech:"ms-MY", tts:"ms-MY" },
  { code:"tl", name:"Filipino", speech:"fil-PH", tts:"fil-PH" },
  { code:"zh_cn", name:"中文 (简体)", speech:"zh-CN", tts:"zh-CN" },
  { code:"zh_tw", name:"中文 (繁體)", speech:"zh-TW", tts:"zh-TW" },
  { code:"ja", name:"日本語", speech:"ja-JP", tts:"ja-JP" },
  { code:"ko", name:"한국어", speech:"ko-KR", tts:"ko-KR" },
  { code:"af", name:"Afrikaans", speech:"af-ZA", tts:"af-ZA" },
  { code:"sw", name:"Kiswahili", speech:"sw-KE", tts:"sw-KE" },
  { code:"zu", name:"isiZulu", speech:"zu-ZA", tts:"zu-ZA" },
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

const normLang = (c)=> String(c||"").toLowerCase().split("_")[0];
function speechLocale(code){ return LANGS.find(x=>x.code===code)?.speech || "en-US"; }
function ttsLocale(code){ return LANGS.find(x=>x.code===code)?.tts || "en-US"; }

function apiBase(){ return String(BASE_DOMAIN || "").replace(/\/+$/,""); }

/* ✅ Backend translate: {text, from_lang, to_lang} */
async function translateViaApi(text, fromLang, toLang){
  const base = apiBase();
  if(!base) return text;

  const payload = {
    text: String(text || ""),
    from_lang: fromLang ? normLang(fromLang) : null,
    to_lang: normLang(toLang || "en")
  };

  try{
    const r = await fetch(`${base}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json", "accept":"application/json" },
      body: JSON.stringify(payload)
    });
    if(!r.ok){
      const t = await r.text().catch(()=> "");
      throw new Error(`translate ${r.status} ${t}`);
    }
    const data = await r.json().catch(()=> ({}));
    return String(data?.translated || "").trim() || text;
  }catch(e){
    console.warn("translateViaApi failed:", e);
    return text;
  }
}

/* TTS (browser) - speaker is mute toggle only; auto speak on */
const mute = { top:false, bot:false };
function setMute(side, on){
  mute[side] = !!on;
  const btn = $(side === "top" ? "topSpeak" : "botSpeak");
  btn?.classList.toggle("muted", mute[side]);
}
function speakAuto(text, langCode, side){
  if(mute[side]) return;
  const t = String(text||"").trim();
  if(!t) return;
  if(!("speechSynthesis" in window)) return;

  try{
    const u = new SpeechSynthesisUtterance(t);
    u.lang = ttsLocale(langCode);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{}
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

/* Bubbles */
function addBubble(sideName, kind, text){
  const wrap = $(sideName === "top" ? "topBody" : "botBody");
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;
  b.textContent = text || "—";
  wrap.appendChild(b);
  scrollIfNeeded(sideName, wrap);
}

/* Speech recognition */
function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = speechLocale(langCode);
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

let active = null;
let topRec = null;
let botRec = null;

function setMicUI(side, on){
  const mic = $(side === "top" ? "topMic" : "botMic");
  mic?.classList.toggle("listening", !!on);
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

async function onFinal(side, srcCode, dstCode, finalText){
  const otherSide = (side === "top") ? "bot" : "top";

  // transcript on speaker side
  addBubble(side, "them", finalText);

  // translation on other side
  const out = await translateViaApi(finalText, srcCode, dstCode);
  addBubble(otherSide, "me", out);

  // auto speak to listener side
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
    toast("Mikrofon açılamadı.");
    stopAll();
  }
}

/* ✅ Dropdown with search + filter + scroll */
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

  // build menu: search + items
  menu.innerHTML = `
    <div class="dd-search-wrap">
      <input class="dd-search" type="text" placeholder="Ara..." />
    </div>
    <div class="dd-items"></div>
  `;

  const itemsWrap = menu.querySelector(".dd-items");
  itemsWrap.innerHTML = LANGS.map(l=>`<div class="dd-item" data-code="${l.code}">${l.name}</div>`).join("");

  // click select
  itemsWrap.querySelectorAll(".dd-item").forEach(it=>{
    it.addEventListener("click", ()=>{
      const code = it.getAttribute("data-code");
      closeAll();
      setValue(code);
    });
  });

  // search filter
  const search = menu.querySelector(".dd-search");
  const filter = ()=>{
    const q = String(search.value || "").trim().toLowerCase();
    itemsWrap.querySelectorAll(".dd-item").forEach(it=>{
      const label = String(it.textContent || "").toLowerCase();
      it.classList.toggle("hidden", q && !label.includes(q));
    });
  };
  search.addEventListener("input", filter);

  btn.addEventListener("click", (e)=>{
    e.stopPropagation();
    const open = dd.classList.contains("open");
    closeAll();
    dd.classList.toggle("open", !open);

    // open focus
    if(!open){
      setTimeout(()=>{ try{ search.focus(); }catch{} }, 0);
    }
  });

  // Prevent closing when scrolling inside menu
  menu.addEventListener("touchmove", (e)=> e.stopPropagation(), { passive:true });
  menu.addEventListener("wheel", (e)=> e.stopPropagation(), { passive:true });

  document.addEventListener("click", ()=> closeAll());

  setValue(defCode);

  return { get: ()=> current };
}

/* Boot */
document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  hookScrollFollow("top", $("topBody"));
  hookScrollFollow("bot", $("botBody"));

  const topDD = buildDropdown("ddTop","ddTopBtn","ddTopTxt","ddTopMenu","en", (code)=>{
    $("sloganTop").textContent = sloganFor(normLang(code));
  });

  const botDD = buildDropdown("ddBot","ddBotBtn","ddBotTxt","ddBotMenu","tr", (code)=>{
    $("sloganBot").textContent = sloganFor(normLang(code));
  });

  $("sloganTop").textContent = sloganFor(normLang(topDD.get()));
  $("sloganBot").textContent = sloganFor(normLang(botDD.get()));

  $("topBody").innerHTML = "";
  $("botBody").innerHTML = "";

  $("topSpeak")?.addEventListener("click", ()=>{ setMute("top", !mute.top); toast(mute.top ? "Ses kapalı" : "Ses açık"); });
  $("botSpeak")?.addEventListener("click", ()=>{ setMute("bot", !mute.bot); toast(mute.bot ? "Ses kapalı" : "Ses açık"); });

  setMute("top", false);
  setMute("bot", false);

  $("topMic")?.addEventListener("click", ()=> startSide("top", ()=>topDD.get(), ()=>botDD.get()));
  $("botMic")?.addEventListener("click", ()=> startSide("bot", ()=>botDD.get(), ()=>topDD.get()));

  setWaveListening(false);
});
