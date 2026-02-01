// FILE: /js/teacher_page.js
// FINAL ++ Teacher Mode
// - 20 kelime zorunlu
// - Doğru söylemeden geçiş yok
// - Atla butonu (atlananlar sona kalır)
// - Büyük yeşil tik + "Congratulations!" (2 sn)
// - Sınav 10 soru / 8 doğru yeterli
// - 3 sınav hakkı, 3. kalışta ders reset

const $ = (id)=>document.getElementById(id);

const STORAGE = "caynana_teacher_v3";

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2000);
}

const LOCALES = { en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT" };

function speak(word, lang){
  return new Promise((res)=>{
    if(!("speechSynthesis" in window)){ res(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = LOCALES[lang] || "en-US";
    u.rate = 1.0;
    u.onend = ()=>res();
    window.speechSynthesis.speak(u);
  });
}

function similarity(a,b){
  a=a.toLowerCase().trim(); b=b.toLowerCase().trim();
  if(a===b) return 1;
  const m=a.length,n=b.length;
  const dp=[...Array(m+1)].map(()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;
  for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)
    for(let j=1;j<=n;j++)
      dp[i][j]=Math.min(
        dp[i-1][j]+1,
        dp[i][j-1]+1,
        dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)
      );
  return 1-dp[m][n]/Math.max(m,n);
}

const LESSON = [
  {tr:"elma",en:"apple"},
  {tr:"su",en:"water"},
  {tr:"ekmek",en:"bread"},
  {tr:"menü",en:"menu"},
  {tr:"fiyat",en:"price"},
  {tr:"evet",en:"yes"},
  {tr:"hayır",en:"no"},
  {tr:"merhaba",en:"hello"},
  {tr:"teşekkürler",en:"thank you"},
  {tr:"lütfen",en:"please"},
  {tr:"yardım",en:"help"},
  {tr:"tuvalet",en:"toilet"},
  {tr:"hesap",en:"bill"},
  {tr:"sıcak",en:"hot"},
  {tr:"soğuk",en:"cold"},
  {tr:"bugün",en:"today"},
  {tr:"yarın",en:"tomorrow"},
  {tr:"iyi",en:"good"},
  {tr:"kötü",en:"bad"},
  {tr:"anlamıyorum",en:"i don't understand"},
];

let state = JSON.parse(localStorage.getItem(STORAGE) || "{}");
if(!state.words){
  state = {
    pos:0,
    learned:{},
    skipped:{},
    examFails:0
  };
}

function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }

function current(){ return LESSON[state.pos]; }

function updateUI(){
  const w = current();
  $("wTarget").textContent = w.en;
  $("wTr").textContent = `Türkçesi: ${w.tr}`;
  $("lessonInfo").textContent = `Kelime ${Object.keys(state.learned).length}/20`;
}

async function correctFlow(){
  $("bigCheck").classList.add("show");
  await new Promise(r=>setTimeout(r,2000));
  $("bigCheck").classList.remove("show");

  state.learned[state.pos]=true;
  delete state.skipped[state.pos];

  nextWord();
}

function nextWord(){
  save();
  const remaining = LESSON.map((_,i)=>i).filter(i=>!state.learned[i]);
  if(remaining.length===0){
    startExam();
    return;
  }
  state.pos = remaining[0];
  save();
  updateUI();
  speak(current().en,"en");
}

async function startListen(){
  const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast("Mikrofon desteklenmiyor"); return; }
  const rec = new SR();
  rec.lang="en-US";
  rec.onresult=async(e)=>{
    const said=e.results[0][0].transcript;
    $("heardBox").textContent=said;
    const sc = similarity(current().en, said);
    if(sc>=0.92){
      await correctFlow();
    }else{
      toast("Tekrar et");
      speak(current().en,"en");
    }
  };
  rec.start();
}

function skipWord(){
  state.skipped[state.pos]=true;
  nextWord();
}

function startExam(){
  const score = confirm("Sınav başlıyor. Hazır mısın?");
  if(!score) return;
  let correct=0;
  for(let i=0;i<10;i++){
    const w = LESSON[Math.floor(Math.random()*20)];
    const ans = prompt(`Söyle: ${w.en}`);
    if(ans && similarity(w.en,ans)>=0.92) correct++;
  }
  if(correct>=8){
    alert("🎉 Tebrikler! Bu dersten geçtin.");
    localStorage.removeItem(STORAGE);
  }else{
    state.examFails++;
    save();
    if(state.examFails>=3){
      alert("Üzgünüm… Bu dersten kaldın.\nAma sen zeki bir çocuksun.\nBaştan öğreneceğiz.");
      localStorage.removeItem(STORAGE);
    }else{
      if(confirm("Sınavı geçemedin. Tekrar denemek ister misin?")){
        startExam();
      }
    }
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  updateUI();
  speak(current().en,"en");
  $("btnMic").onclick=startListen;
  $("btnSkip").onclick=skipWord;
});
