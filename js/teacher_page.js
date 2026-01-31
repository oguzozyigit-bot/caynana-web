// FILE: /js/teacher_page.js
// Minimal Teacher Mode
// - Teacher shows target + Turkish meaning
// - Speaker button plays pronunciation (fast -> slow -> syllable)
// - One mic button: student speaks
// - If correct => auto next word
// - If wrong => "Tekrar et" + teacher repeats (fast->slow->syllable)

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2000);
}

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

  // Levenshtein-lite
  const m=a.length, n=b.length;
  const dp = Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;

  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  const dist = dp[m][n];
  return 1 - (dist / Math.max(m,n));
}

const LOCALES = { en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT" };

function speak(text, lang, rate=1.0){
  return new Promise((resolve)=>{
    if(!("speechSynthesis" in window)){
      resolve(false);
      return;
    }
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text||""));
      u.lang = LOCALES[lang] || "en-US";
      u.rate = rate;
      u.pitch = 1.0;
      u.onend = ()=> resolve(true);
      u.onerror = ()=> resolve(false);
      window.speechSynthesis.speak(u);
    }catch{
      resolve(false);
    }
  });
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

/* Ders seti (A1 mini) – istersen büyütürüz */
const DATA = {
  en: [
    { tr:"elma", target:"apple", slow:"ap-ple", syll:"ap … ple" },
    { tr:"su", target:"water", slow:"wa-ter", syll:"wa … ter" },
    { tr:"ekmek", target:"bread", slow:"bread", syll:"bread" },
    { tr:"teşekkürler", target:"thank you", slow:"thank you", syll:"thank … you" },
    { tr:"lütfen", target:"please", slow:"please", syll:"please" },
    { tr:"merhaba", target:"hello", slow:"hel-lo", syll:"hel … lo" },
    { tr:"güle güle", target:"goodbye", slow:"good-bye", syll:"good … bye" },
    { tr:"evet", target:"yes", slow:"yes", syll:"yes" },
    { tr:"hayır", target:"no", slow:"no", syll:"no" }
  ],
  de: [
    { tr:"elma", target:"apfel", slow:"ap-fel", syll:"ap … fel" },
    { tr:"su", target:"wasser", slow:"was-ser", syll:"was … ser" },
    { tr:"ekmek", target:"brot", slow:"brot", syll:"brot" },
    { tr:"teşekkürler", target:"danke", slow:"dan-ke", syll:"dan … ke" },
    { tr:"lütfen", target:"bitte", slow:"bit-te", syll:"bit … te" }
  ],
  fr: [
    { tr:"elma", target:"pomme", slow:"pom-me", syll:"pom … me" },
    { tr:"su", target:"eau", slow:"eau", syll:"eau" },
    { tr:"ekmek", target:"pain", slow:"pain", syll:"pain" },
    { tr:"teşekkürler", target:"merci", slow:"mer-ci", syll:"mer … ci" },
    { tr:"lütfen", target:"s'il vous plaît", slow:"s'il vous plaît", syll:"s'il … vous … plaît" }
  ],
  it: [
    { tr:"elma", target:"mela", slow:"me-la", syll:"me … la" },
    { tr:"su", target:"acqua", slow:"ac-qua", syll:"ac … qua" },
    { tr:"ekmek", target:"pane", slow:"pa-ne", syll:"pa … ne" },
    { tr:"teşekkürler", target:"grazie", slow:"gra-zie", syll:"gra … zie" },
    { tr:"lütfen", target:"per favore", slow:"per fa-vo-re", syll:"per … fa-vo-re" }
  ],
};

let lang = "en";
let i = 0;
let listening = false;

function curList(){ return DATA[lang] || DATA.en; }
function cur(){ return curList()[i]; }

function setUI(){
  const item = cur();
  $("wTarget").textContent = item.target;
  $("wTr").textContent = `Türkçesi: ${item.tr}`;
  $("repeatTxt").textContent = item.target;

  $("heardBox").textContent = "Söylediğin burada görünecek…";
  $("resultMsg").textContent = "—";
  $("resultMsg").className = "status";
  $("statusBadge").textContent = "Hazır";

  $("teacherMsg").textContent = "Hoparlöre basıp dinleyebilirsin.";
}

async function teacherSpeak(){
  const item = cur();
  $("teacherMsg").textContent = "Dinle…";
  await speak(item.target, lang, 1.0);
  await speak(item.target, lang, 0.78);
  await speak(item.syll || item.slow || item.target, lang, 0.62);
  $("teacherMsg").textContent = "Şimdi tekrar et.";
}

async function checkAndNext(heard){
  const item = cur();
  const score = similarity(item.target, heard);

  // strict: kelime 0.92
  const ok = score >= 0.92;

  if(ok){
    $("resultMsg").textContent = `Doğru ✅`;
    $("resultMsg").className = "status ok";
    $("statusBadge").textContent = "Doğru";
    toast("Aferin! Sonraki kelime…");

    // next
    i++;
    if(i >= curList().length) i = 0;
    setUI();

    // otomatik öğretmen tekrar söylesin
    await teacherSpeak();
  }else{
    $("resultMsg").textContent = `Yanlış ❌ Tekrar et`;
    $("resultMsg").className = "status bad";
    $("statusBadge").textContent = "Tekrar";
    toast("Olmadı. Tekrar et.");

    // öğretmen yeniden anlatır
    await teacherSpeak();
  }
}

function startListen(){
  if(listening) return;

  const rec = makeRecognizer(lang);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  listening = true;
  $("btnMic").classList.add("listening");
  $("statusBadge").textContent = "Dinliyorum…";

  rec.onresult = async (e)=>{
    const heard = e.results?.[0]?.[0]?.transcript || "";
    $("heardBox").textContent = heard ? `Söyledin: ${heard}` : "Duyamadım…";
    listening = false;
    $("btnMic").classList.remove("listening");

    if(!heard.trim()){
      $("statusBadge").textContent = "Tekrar";
      toast("Bir şey duymadım. Tekrar söyle.");
      await teacherSpeak();
      return;
    }

    await checkAndNext(heard);
  };

  rec.onerror = async ()=>{
    listening = false;
    $("btnMic").classList.remove("listening");
    $("statusBadge").textContent = "Hata";
    toast("Mikrofon hatası. İzin/HTTPS kontrol et.");
    await teacherSpeak();
  };

  rec.onend = ()=>{
    if(listening){
      listening = false;
      $("btnMic").classList.remove("listening");
      $("statusBadge").textContent = "Tekrar";
    }
  };

  try{ rec.start(); }
  catch{
    listening = false;
    $("btnMic").classList.remove("listening");
    toast("Mikrofon açılamadı.");
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  $("langSel").addEventListener("change", async ()=>{
    lang = $("langSel").value || "en";
    i = 0;
    setUI();
    await teacherSpeak();
  });

  $("btnSpeak").addEventListener("click", teacherSpeak);
  $("btnMic").addEventListener("click", startListen);

  setUI();
  await teacherSpeak();
});
