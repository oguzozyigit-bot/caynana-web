// FILE: /js/fal_page.js
// DESIGN-FIRST (3 photo flow + strict object rule + 10s thinking + long demo reading)

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2200);
}

function syncSP(){
  try{
    const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const s = Math.max(0, Math.min(100, parseInt(u.sp_score ?? 10,10) || 10));
    if($("ypFill")) $("ypFill").style.width = `${s}%`;
    if($("ypNum")) $("ypNum").textContent = `${s}/100`;
    if($("planChip")) $("planChip").textContent = String(u.plan || "FREE").toUpperCase();
  }catch{}
}

const state = {
  shots: [null, null, null], // dataURL
  idx: 0
};

// Basit “nesne kontrol” (tasarım aşaması): gerçek model yok.
// Şimdilik kullanıcıyı uyaracak kuralı UI üzerinden uygularız.
function isLikelyCoffeeOrPlate(file){
  // Gerçek kontrol yok. Tasarım aşaması: kullanıcı yanlış çekerse “Ben bunu fincan sanmam” diye uyar butonu koyuyoruz.
  // İstersen sonraki aşamada backend vision ile kontrol ederiz.
  return true;
}

function renderShots(){
  const root = $("shots");
  if(!root) return;
  root.querySelectorAll(".shot").forEach(el=>{
    const i = parseInt(el.getAttribute("data-i"),10);
    const d = state.shots[i];
    el.innerHTML = `<div class="badgeN">${i+1}</div>` + (d ? `<img src="${d}" alt="shot${i+1}">` : (i===0?"Fincan İçi":i===1?"Fincan Dışı":"Tabak"));
  });
}

function resetAll(){
  state.shots = [null,null,null];
  state.idx = 0;
  renderShots();
  $("resultBox").classList.remove("show");
  $("resultBox").innerHTML = "";
  toast("Sıfırlandı evladım. Baştan çek.");
}

function showThinking(on){
  const ov = $("thinking");
  if(!ov) return;
  ov.classList.toggle("show", !!on);
}

function longFalText(){
  return `
<b>Evladım…</b> fincanın dibinde bir “yol” görünüyor. Bu yol kısa değil; sabır istiyor.
<br><br>
<b>İş tarafı:</b> Önüne iki seçenek geliyor. Biri hızlı para, biri temiz vicdan. Kaynana olarak söylüyorum: temiz olanı seç, sonra rahat edersin.
<br><br>
<b>Aşk tarafı:</b> Kalp çıkmış ama üstünde ince bir çizik var. Kırgınlık var; konuşursan düzelir. Gurur yapma.
<br><br>
<b>Para:</b> Küçük küçük girişler görünüyor. “Damla damla göl olur” derler ya, aynen o.
<br><br>
<b>Ev ve aile:</b> Tabakta bir kuş izi var. Haber geliyor. Telefon çalarsa aç, kaçma.
<br><br>
<b>Uyarı:</b> Fincanın kenarında dağ gibi bir gölge var. Bu “erteleme” senin düşmanın. Bir şeyi yarına atma.
<br><br>
<b>Kapanış:</b> Neyse halin çıksın falın… ama ben senden umut gördüm. Hadi bir adım at evladım.
`;
}

async function runFal(){
  // 10 saniye düşünme
  showThinking(true);
  await new Promise(r=>setTimeout(r, 10000));
  showThinking(false);

  const box = $("resultBox");
  box.innerHTML = longFalText();
  box.classList.add("show");
}

document.addEventListener("DOMContentLoaded", ()=>{
  // login guard
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  // menu + hamburger
  try{ initMenuHistoryUI(); }catch{}
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  syncSP();
  renderShots();

  const cam = $("camInput");

  $("btnTake")?.addEventListener("click", ()=>{
    // sıradaki foto
    state.idx = state.shots.findIndex(x=>!x);
    if(state.idx < 0) state.idx = 2;
    cam.click();
  });

  cam?.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;

    if(!isLikelyCoffeeOrPlate(f)){
      toast("Evladım bu fincan mı, saksı mı? Tekrar çek.");
      cam.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async ()=>{
      state.idx = state.shots.findIndex(x=>!x);
      if(state.idx < 0) state.idx = 2;

      state.shots[state.idx] = String(reader.result||"");
      renderShots();

      cam.value = "";

      const done = state.shots.every(Boolean);
      if(done){
        toast("Tamam… şimdi bakıyorum evladım.");
        await runFal();
      }else{
        const left = state.shots.filter(x=>!x).length;
        toast(`Güzel. ${left} foto kaldı evladım.`);
      }
    };
    reader.readAsDataURL(f);
  });

  $("btnReset")?.addEventListener("click", resetAll);
});
