// FILE: /js/teacher_page.js
// GUARANTEED single-speak:
// - Teacher says ONLY target word ONCE
// - No slow, no syllable, no extra talk
// - Prevent double/triple event binding
// - Speaker uses pointerdown only, with lock

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1400);
}

const LOCALES = { en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT" };

function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/[’']/g,"'")
    .replace(/[.,!?;:]/g,"")
    .replace(/\s+/g," ");
}

function similarity(a,b){
  a = norm(a); b = norm(b);
  if(!a || !b) return 0;
  if(a === b) return 1;
  const m=a.length, n=b.length;
  const dp = Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  const dist = dp[m][n];
  return 1 - (dist / Math.max(m,n));
}

function makeRecognizer(lang){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = LOCALES[lang] || "en-US";
  rec.interimResults = false;
  rec.continuous = false;
  return rec;
}

// ✅ A1 starter
const DATA = {
  en: [
    { tr:"elma", target:"apple" },
    { tr:"su", target:"water" },
    { tr:"ekmek", target:"bread" },
    { tr:"teşekkürler", target:"thank you" },
    { tr:"lütfen", target:"please" },
    { tr:"menü", target:"menu" },
    { tr:"fiyat", target:"price" },
    { tr:"evet", target:"yes" },
    { tr:"hayır", target:"no" },
    { tr:"merhaba", target:"hello" },
  ],
  de: [
    { tr:"elma", target:"apfel" },
    { tr:"su", target:"wasser" },
    { tr:"ekmek", target:"brot" },
    { tr:"teşekkürler", target:"danke" },
    { tr:"lütfen", target:"bitte" },
    { tr:"menü", target:"speisekarte" },
  ],
  fr: [
    { tr:"elma", target:"pomme" },
    { tr:"su", target:"eau" },
    { tr:"ekmek", target:"pain" },
    { tr:"teşekkürler", target:"merci" },
    { tr:"lütfen", target:"s'il vous plaît" },
    { tr:"menü", target:"menu" },
  ],
  it: [
    { tr:"elma", target:"mela" },
    { tr:"su", target:"acqua" },
    { tr:"ekmek", target:"pane" },
    { tr:"teşekkürler", target:"grazie" },
    { tr:"lütfen", target:"per favore" },
    { tr:"menü", target:"menu" },
  ],
};

const state = (()=>{
  if(!window.__CAYNANA_TEACHER__) window.__CAYNANA_TEACHER__ = {
    lang: "en",
    idx: 0,
    listening: false,
    speaking: false,
    bound: false
  };
  return window.__CAYNANA_TEACHER__;
})();

function list(){ return DATA[state.lang] || DATA.en; }
function cur(){ return list()[state.idx]; }

function setUI(){
  const item = cur();
  $("wTarget").textContent = item.target;
  $("wTr").textContent = `Türkçesi: ${item.tr}`;
  $("repeatTxt").textContent = item.target;

  $("teacherStatus").textContent = "—";
  $("heardBox").textContent = "Söylediğin burada görünecek…";
  $("resultMsg").textContent = "—";
  $("resultMsg").className = "status";
  $("scoreTop").textContent = "—";
  $("studentTop").textContent = "Mikrofona bas ve söyle.";
}

async function speakOnce(word){
  if(!("speechSynthesis" in window)) {
    toast("Ses motoru yok.");
    return false;
  }

  // ✅ lock: asla üst üste bindirme
  if(state.speaking) return false;
  state.speaking = true;

  try{
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(String(word||""));
    u.lang = LOCALES[state.lang] || "en-US";
    u.rate = 1.0;    // ✅ SABİT
    u.pitch = 1.0;

    const done = ()=>{ state.speaking = false; };

    u.onend = done;
    u.onerror = done;

    window.speechSynthesis.speak(u);

    // güvenlik: bazı cihazlarda onend gecikir
    setTimeout(()=>{ state.speaking = false; }, 4500);

    return true;
  }catch{
    state.speaking = false;
    return false;
  }
}

async function teacherSpeak(){
  const item = cur();
  $("teacherStatus").textContent = "🔊";
  await speakOnce(item.target);      // ✅ TEK KERE
  $("teacherStatus").textContent = "—";
}

async function onWrong(score){
  $("resultMsg").textContent = "Yanlış ❌ Tekrar et";
  $("resultMsg").className = "status bad";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Tekrar et");
  await teacherSpeak();
}

async function onCorrect(score){
  $("resultMsg").textContent = "Doğru ✅";
  $("resultMsg").className = "status ok";
  $("scoreTop").textContent = `Skor: ${Math.round(score*100)}%`;
  toast("Aferin");

  state.idx++;
  if(state.idx >= list().length) state.idx = 0;

  setUI();
  await teacherSpeak();
}

async function startListen(){
  if(state.listening) return;

  const rec = makeRecognizer(state.lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  state.listening = true;
  $("btnMic").classList.add("listening");
  $("studentTop").textContent = "Dinliyorum…";

  const expected = cur().target;

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    $("heardBox").textContent = heard ? `Söyledin: ${heard}` : "Duyamadım…";

    state.listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";

    if(!heard.trim()){
      toast("Duyamadım. Tekrar.");
      await teacherSpeak();
      return;
    }

    const sc = similarity(expected, heard);
    if(sc >= 0.92) await onCorrect(sc);
    else await onWrong(sc);
  };

  rec.onerror = async ()=>{
    state.listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon hatası (izin/HTTPS)");
    await teacherSpeak();
  };

  rec.onend = ()=>{
    if(state.listening){
      state.listening = false;
      $("btnMic").classList.remove("listening");
      $("studentTop").textContent = "Mikrofona bas ve söyle.";
    }
  };

  try{ rec.start(); }
  catch{
    state.listening = false;
    $("btnMic").classList.remove("listening");
    $("studentTop").textContent = "Mikrofona bas ve söyle.";
    toast("Mikrofon açılamadı.");
  }
}

function bindOnce(){
  if(state.bound) return;
  state.bound = true;

  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/chat.html";
  });

  $("langSel")?.addEventListener("change", async ()=>{
    state.lang = $("langSel").value || "en";
    state.idx = 0;
    setUI();
    await teacherSpeak();
  });

  // ✅ Speaker: pointerdown only (click spam yok)
  $("btnSpeak")?.addEventListener("pointerdown", async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    await teacherSpeak();
  });

  $("btnMic")?.addEventListener("pointerdown", async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    await startListen();
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  bindOnce();
  setUI();
  await teacherSpeak();  // ilk açılışta 1 kez
});
