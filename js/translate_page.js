// FILE: /js/translate_page.js
// ✅ Pro tabletop translator (two sides, full history + scroll)
// ✅ Custom dropdown opens to the right (toward selection side)
// ✅ Auto-follow only if user is near bottom (WhatsApp feel)
// ✅ Wave animates only while listening (frameRoot.listening)
// ✅ Minimal brand slogan translated by selected language (small dictionary)

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
  { code:"tr", name:"Türkçe", speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"English", speech:"en-US", tts:"en-US" },
  { code:"de", name:"Deutsch", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Français", speech:"fr-FR", tts:"fr-FR" },
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

function sloganFor(code){
  return SLOGAN_MAP[code] || SLOGAN_TR;
}

function speechLocale(code){
  return LANGS.find(x=>x.code===code)?.speech || "en-US";
}
function ttsLocale(code){
  return LANGS.find(x=>x.code===code)?.tts || "en-US";
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

/* ---- Auto-follow logic per side ---- */
const follow = { top:true, bot:true };

function isNearBottom(el, slack=140){
  try{
    return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack;
  }catch{ return true; }
}

function hookScrollFollow(sideName, el){
  el.addEventListener("scroll", ()=>{
    follow[sideName] = isNearBottom(el);
  }, { passive:true });
}

function scrollIfNeeded(sideName, el){
  if(follow[sideName]){
    el.scrollTop = el.scrollHeight;
  }
}

function addBubble(sideName, kind, label, text){
  const wrap = $(sideName === "top" ? "topBody" : "botBody");
  if(!wrap) return;

  const b = document.createElement("div");
  b.className = `bubble ${kind}`;

  // label tiny
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

/* ---- Custom dropdown ---- */
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
    const nm = LANGS.find(l=>l.code===code)?.name || code;
    txt.textContent = nm;
    onChange?.(code);
  }

  menu.innerHTML = LANGS.map(l=>`
    <div class="dd-item" data-code="${l.code}">
      <div>${l.name}</div>
      <div class="mini">${l.code.toUpperCase()}</div>
    </div>
  `).join("");

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

  return {
    get: ()=> current,
    set: (c)=> setValue(c)
  };
}

/* ---- Speaker + Mic state ---- */
let active = null; // "top" | "bot" | null
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

async function onFinal(side, srcCode, dstCode, finalText){
  const otherSide = (side === "top") ? "bot" : "top";
  const otherStatus = $(otherSide === "top" ? "topStatus" : "botStatus");
  const otherWrap = $(otherSide === "top" ? "topBody" : "botBody");

  // 1) Speaker sees transcript in their own language
  addBubble(side, "them", "Duyulan", finalText);

  // 2) Other side sees translation in their language
  otherStatus.textContent = "Çeviriyor…";
  const out = await translateViaApi(finalText, srcCode, dstCode);
  addBubble(otherSide, "me", "Çeviri", out);

  otherStatus.textContent = "Hazır";
  scrollIfNeeded(otherSide, otherWrap);
}

function startSide(side, getLang, getOtherLang){
  if(active && active !== side){
    stopAll();
  }

  const srcCode = getLang();
  const dstCode = getOtherLang();

  const rec = buildRecognizer(srcCode);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor evladım.");
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

    // Canlı metni göstermek için (çok spam yapmadan) en alttaki "Duyulan" alanını güncelle:
    // burada basit: status'a kısa yaz
    const st = $(side === "top" ? "topStatus" : "botStatus");
    st.textContent = "Dinliyor…";
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

/* ---- TTS ---- */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return toast("Okunacak bir şey yok evladım.");
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

/* ---- Boot ---- */
document.addEventListener("DOMContentLoaded", ()=>{
  // Back
  $("backBtn").addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  // scroll follow hooks
  hookScrollFollow("top", $("topBody"));
  hookScrollFollow("bot", $("botBody"));

  // dropdowns
  const topDD = buildDropdown("ddTop","ddTopBtn","ddTopTxt","ddTopMenu","en", (code)=>{
    $("sloganTop").textContent = sloganFor(code);
  });

  const botDD = buildDropdown("ddBot","ddBotBtn","ddBotTxt","ddBotMenu","tr", (code)=>{
    $("sloganBot").textContent = sloganFor(code);
  });

  // init slogans
  $("sloganTop").textContent = sloganFor(topDD.get());
  $("sloganBot").textContent = sloganFor(botDD.get());

  // Mic buttons
  $("topMic").addEventListener("click", ()=> startSide("top", ()=>topDD.get(), ()=>botDD.get()));
  $("botMic").addEventListener("click", ()=> startSide("bot", ()=>botDD.get(), ()=>topDD.get()));

  // Stop listening if lang changes mid-listen
  // (custom dropdown already stops via stopAll when you tap mic again; keep simple)
  // If you want: onChange could call stopAll() if active==that side. Not necessary now.

  // Speaker buttons:
  // - Top speak reads "topTranslated" (which is actually on BOT side in this new log approach we don't keep ids)
  // We will speak the LAST translation bubble for that side by reading last bubble text.
  function lastBubbleText(sideName){
    const wrap = $(sideName === "top" ? "topBody" : "botBody");
    const bubbles = wrap.querySelectorAll(".bubble");
    if(!bubbles.length) return "";
    return String(bubbles[bubbles.length-1].innerText || "").replace(/^.*\n/, "").trim();
  }

  $("botSpeak").addEventListener("click", ()=>{
    // Ben tarafı hoparlör: karşı tarafa çevrileni okut (son bubble genelde çeviri)
    speak(lastBubbleText("bot"), topDD.get());
  });

  $("topSpeak").addEventListener("click", ()=>{
    // Karşı taraf hoparlör: bana çevrileni okut
    speak(lastBubbleText("top"), botDD.get());
  });

  // Start empty (no needless text)
  $("topBody").innerHTML = "";
  $("botBody").innerHTML = "";

  // wave idle
  setWaveListening(false);
});
