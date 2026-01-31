// FILE: /js/dream_page.js
// Continuous STT until user presses "Bitti"
// ✅ No interim spam on screen (only final chunks) -> less "saçmalama"
// ✅ Typewriter transcript
// ✅ Daily limit (once/day)

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2400);
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

// Daily limit
function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function limitKey(){ return `caynana_dream_daily:${todayKey()}`; }
function isUsedToday(){ return (localStorage.getItem(limitKey())||"") === "1"; }
function markUsed(){ localStorage.setItem(limitKey(),"1"); }

function showThinking(on){
  $("thinking")?.classList.toggle("show", !!on);
}

const state = {
  listening: false,
  buffer: "",
  rec: null,
  restarting: false
};

function setMicUI(on){
  const b = $("micBtn");
  if(!b) return;
  b.classList.toggle("listening", !!on);

  $("hintTxt").innerHTML = on
    ? `<b>Seni dinliyorum evladım…</b> Bitince <b>Bitti</b>’ye bas, tabir edeyim.`
    : `<b>Rüyanı bana anlat evladım.</b> Mikrofonu aç, konuş. Bitince <b>Bitti</b>’ye bas.`;
}

async function typewriterAppend(text){
  const box = $("transcript");
  if(!box) return;

  const s = String(text||"");
  if(!s.trim()) return;

  if(box.textContent.trim() === "—") box.textContent = "";

  for(let i=0;i<s.length;i++){
    box.textContent += s[i];
    box.scrollTop = box.scrollHeight;
    await sleep(18);
  }
}

function stopListening(){
  state.listening = false;
  state.restarting = false;
  try{ state.rec?.stop?.(); }catch{}
  state.rec = null;
  setMicUI(false);
}

function ensureSpeechSupport(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  return SR;
}

function startListening(){
  if(isUsedToday()){
    toast("Evladım bugün rüya tabirini yaptık. Yarın gel 🙂");
    return;
  }

  const SR = ensureSpeechSupport();
  if(!SR){
    toast("Bu cihazda konuşmayı yazıya çevirme yok evladım. (Tarayıcı desteklemiyor)");
    return;
  }

  // reset result view
  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";

  // stop existing
  stopListening();

  const rec = new SR();
  state.rec = rec;
  state.listening = true;
  setMicUI(true);

  rec.lang = "tr-TR";
  rec.interimResults = false;   // ✅ interim yok (saçmalama azalır)
  rec.continuous = true;

  rec.onresult = async (e)=>{
    // sadece final gelir
    let chunk = "";
    for(let i=e.resultIndex; i<e.results.length; i++){
      const res = e.results[i];
      const t = res?.[0]?.transcript || "";
      chunk += t + " ";
    }
    chunk = chunk.trim();
    if(!chunk) return;

    // buffer + daktilo
    state.buffer += (state.buffer ? " " : "") + chunk;
    await typewriterAppend(chunk + " ");
  };

  rec.onerror = ()=>{
    // no-speech / network / aborted gibi
    // “saçmalıyor” hissi vermesin diye kısa toast
    toast("Evladım bir durdu. Devam et, ben yeniden açarım.");
  };

  rec.onend = ()=>{
    // kullanıcı dinleme modundaysa otomatik yeniden başlat
    if(state.listening){
      if(state.restarting) return;
      state.restarting = true;
      setTimeout(()=>{
        state.restarting = false;
        try{ rec.start(); }catch{}
      }, 180);
    }
  };

  try{ rec.start(); }catch(e){
    toast("Mikrofon açılamadı evladım. HTTPS ve izin lazım.");
    stopListening();
  }
}

async function runInterpretation(){
  if(isUsedToday()){
    toast("Evladım bugün rüya tabiri hakkın doldu. Yarın gel 🙂");
    return;
  }

  const txt = String(state.buffer||"").trim();
  if(!txt){
    toast("Evladım rüya yoksa tabir de yok. Bir şey anlat 🙂");
    return;
  }

  markUsed();

  showThinking(true);
  await sleep(6500);
  showThinking(false);

  const box = $("resultBox");
  box.innerHTML = `
    <b>Evladım…</b> rüyandaki semboller “kafanın doluluğunu” anlatıyor. <br><br>
    <b>1)</b> Kaçma/kovalanma gördüysen: ertelediğin iş var. <br>
    <b>2)</b> Su/yağmur geçtiyse: ferahlama geliyor ama önce içini dökmen lazım. <br>
    <b>3)</b> Düşme/merdiven varsa: hedefin var; ama adım adım git. <br><br>
    <b>Kaynana hükmü:</b> Rüya tabiri dakika başı değişmez evladım 😄 Bugünlük bu kadar. <b>Yarın gel</b>.
  `;
  box.classList.add("show");

  toast("Tabir bitti evladım. Yarın gel 🙂");
}

function clearAll(){
  stopListening();
  state.buffer = "";
  $("transcript").textContent = "—";
  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";
  toast("Temizledim evladım.");
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

  $("micBtn")?.addEventListener("click", ()=>{
    if(state.listening){
      // toggle off
      toast("Tamam evladım, kapattım. Bitince ‘Bitti’ basarsın.");
      stopListening();
    }else{
      startListening();
    }
  });

  $("btnClear")?.addEventListener("click", clearAll);

  $("btnDone")?.addEventListener("click", async ()=>{
    if(state.listening) stopListening();
    toast("Tamam evladım. Tabiri yapıyorum…");
    await runInterpretation();
  });

  if(isUsedToday()){
    toast("Bugün rüya tabiri yaptın evladım. Yarın gel 🙂");
  }
});
