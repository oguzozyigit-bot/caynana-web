// FILE: /js/teacher_duo.js
// Duo Practice: 10 tur, sırayla tek hak, doğruysa puan.
// Alt panel 180° (HTML rotate).
// Lang from URL: ?lang=en|de|fr|it (kelimeleri o dile göre çeker)

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1600);
}

function getLang(){
  const u = new URL(location.href);
  const q = (u.searchParams.get("lang") || "en").toLowerCase().trim();
  return ["en","de","fr","it"].includes(q) ? q : "en";
}
const lang = getLang();

const LOCALES = { en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT" };
const LANG_LABEL = { en:"🇬🇧 Duo Practice", de:"🇩🇪 Duo Practice", fr:"🇫🇷 Duo Practice", it:"🇮🇹 Duo Practice" };

const WORDS = {
  en: ["apple","water","bread","menu","price","yes","no","hello","goodbye","thank you","please","help","toilet","the bill","hot","cold","today","excuse me","very good","i don't understand"],
  de: ["apfel","wasser","brot","speisekarte","preis","ja","nein","hallo","tschüss","danke","bitte","hilfe","toilette","die rechnung","heiß","kalt","heute","entschuldigung","sehr gut","ich verstehe nicht"],
  fr: ["pomme","eau","pain","menu","prix","oui","non","bonjour","au revoir","merci","s'il vous plaît","aide","toilettes","l'addition","chaud","froid","aujourd'hui","excusez-moi","très bien","je ne comprends pas"],
  it: ["mela","acqua","pane","menu","prezzo","sì","no","ciao","arrivederci","grazie","per favore","aiuto","bagno","il conto","caldo","freddo","oggi","scusi","molto bene","non capisco"],
};

function norm(s){ return String(s||"").toLowerCase().trim().replace(/[.,!?;:]/g,"").replace(/\s+/g," "); }

function similarity(a,b){
  a=norm(a); b=norm(b);
  if(a===b) return 1;
  const m=a.length,n=b.length;
  const dp=[...Array(m+1)].map(()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    const c=a[i-1]===b[j-1]?0:1;
    dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c);
  }
  return 1-dp[m][n]/Math.max(m,n);
}

function makeRec(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = LOCALES[lang] || "en-US";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

let turn = "A";
let scoreA = 0, scoreB = 0;
let round = 0;
let curWord = "";
let busy = false;

function pickWord(){
  const arr = WORDS[lang] || WORDS.en;
  curWord = arr[Math.floor(Math.random()*arr.length)];
  $("wordA").textContent = curWord;
  $("wordB").textContent = curWord;
}

function setHints(){
  $("hintA").textContent = (turn==="A") ? `Sıran sende. Tek hak. (${round+1}/10)` : "Sıra karşı tarafta.";
  $("hintB").textContent = (turn==="B") ? `Sıran sende. Tek hak. (${round+1}/10)` : "Sıra karşı tarafta.";
}

function updateScores(){
  $("scoreA").textContent = String(scoreA);
  $("scoreB").textContent = String(scoreB);
}

function endMatch(){
  const winner =
    scoreA===scoreB ? "Berabere 😄" :
    (scoreA>scoreB ? "Oyuncu A kazandı 🏆" : "Oyuncu B kazandı 🏆");

  alert(`Bitti evladım!\nSkor A:${scoreA}  B:${scoreB}\n${winner}`);

  round = 0;
  scoreA = 0;
  scoreB = 0;
  turn = "A";
  pickWord();
  setHints();
  updateScores();
}

function nextTurn(){
  round++;
  if(round >= 10){
    endMatch();
    return;
  }
  turn = (turn==="A") ? "B" : "A";
  pickWord();
  setHints();
  updateScores();
}

function listenFor(player){
  if(busy) return;
  if(player !== turn) { toast("Sıra sende değil."); return; }

  const rec = makeRec();
  if(!rec){ alert("Bu cihaz konuşmayı yazıya çevirmiyor."); return; }

  busy = true;

  rec.onresult = (e)=>{
    const said = e.results?.[0]?.[0]?.transcript || "";
    const sc = similarity(curWord, said);
    const ok = sc >= 0.92;

    if(ok){
      if(player==="A") scoreA++; else scoreB++;
      toast("Doğru ✅");
    }else{
      toast("Yanlış ❌");
    }

    updateScores();
    busy = false;
    nextTurn();
  };

  rec.onerror = ()=>{
    busy = false;
    nextTurn();
  };

  try{ rec.start(); }
  catch{
    busy = false;
    nextTurn();
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("langPill").textContent = LANG_LABEL[lang] || "Duo Practice";

  $("backBtn").addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href="/pages/chat.html";
  });

  pickWord();
  setHints();
  updateScores();

  $("micA").addEventListener("click", ()=> listenFor("A"));
  $("micB").addEventListener("click", ()=> listenFor("B"));
});
