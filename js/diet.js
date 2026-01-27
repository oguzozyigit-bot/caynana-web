import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";

const DIET_ENDPOINT = "/api/diet/today";
const $ = (id) => document.getElementById(id);

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function norm(s){ return String(s || "").trim(); }

function trDayName(d = new Date()){
  const days = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  return days[d.getDay()];
}

function todayStr(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

function setChip(el, text, kind=""){
  if(!el) return;
  el.classList.remove("ok","warn","bad");
  if(kind) el.classList.add(kind);
  el.textContent = text;
}

function statusKind(status=""){
  const s = String(status||"").toLowerCase();
  if(s.includes("normal")) return "ok";
  if(s.includes("kilolu")) return "warn";
  if(s.includes("obez")) return "bad";
  if(s.includes("zayıf") || s.includes("zayif")) return "warn";
  return "";
}

// ✅ Plan key uyumu (backend: ara_ogun, su) + eski uyum (ara)
function normalizePlan(plan = {}){
  const p = plan || {};
  return {
    kahvalti: String(p.kahvalti ?? "").trim(),
    ara_ogun: String(p.ara_ogun ?? p.ara ?? "").trim(),
    ogle: String(p.ogle ?? "").trim(),
    aksam: String(p.aksam ?? "").trim(),
    su: String(p.su ?? "").trim(),
  };
}

function buildShareText(data){
  const day = `${trDayName()} • ${todayStr()}`;
  const bmi = data?.bmi != null ? String(data.bmi) : "—";
  const st  = data?.status || "—";

  const plan = normalizePlan(data?.plan || {});
  const kahvalti = plan.kahvalti || "-";
  const araOgun  = plan.ara_ogun || "-";
  const ogle     = plan.ogle || "-";
  const aksam    = plan.aksam || "-";
  const su       = plan.su || "";

  const lines = [
    `🍽️ Diyet Menüsü (${day})`,
    `VKİ: ${bmi} | Durum: ${st}`,
    "",
    `🥣 Kahvaltı: ${kahvalti}`,
    `🍎 Ara Öğün: ${araOgun}`,
    `🍽️ Öğle: ${ogle}`,
    `🌙 Akşam: ${aksam}`,
  ];

  if(su) lines.push(`💧 Su: ${su}`);

  lines.push("", "@CaynanaAI");
  return lines.join("\n");
}

function renderMeals(planRaw){
  const grid = $("mealsGrid");
  if(!grid) return;
  grid.innerHTML = "";

  const plan = normalizePlan(planRaw);

  const items = [
    { key:"kahvalti", title:"Kahvaltı", icon:"🥣", val: plan.kahvalti || "—" },
    { key:"ara_ogun", title:"Ara Öğün", icon:"🍎", val: plan.ara_ogun || "—" },
    { key:"ogle",     title:"Öğle",     icon:"🍽️", val: plan.ogle || "—" },
    { key:"aksam",    title:"Akşam",    icon:"🌙", val: plan.aksam || "—" },
  ];

  items.forEach(it=>{
    const div = document.createElement("div");
    div.className = "diet-meal";
    div.innerHTML = `
      <div class="diet-meal-head">
        <div class="mttl">${it.icon} ${it.title}</div>
      </div>
      <div class="diet-meal-body">${String(it.val).trim() || "—"}</div>
    `;
    grid.appendChild(div);
  });

  // su hedefi varsa ayrı küçük kart
  if(plan.su){
    const div = document.createElement("div");
    div.className = "diet-meal";
    div.innerHTML = `
      <div class="diet-meal-head">
        <div class="mttl">💧 Su</div>
      </div>
      <div class="diet-meal-body">${plan.su}</div>
    `;
    grid.appendChild(div);
  }
}

function renderPrint(planRaw, meta){
  const printGrid = $("printGrid");
  if(!printGrid) return;
  printGrid.innerHTML = "";

  const plan = normalizePlan(planRaw);

  const items = [
    { key:"kahvalti", title:"Kahvaltı", val: plan.kahvalti || "—" },
    { key:"ara_ogun", title:"Ara Öğün", val: plan.ara_ogun || "—" },
    { key:"ogle",     title:"Öğle",     val: plan.ogle || "—" },
    { key:"aksam",    title:"Akşam",    val: plan.aksam || "—" },
  ];

  items.forEach(it=>{
    const b = document.createElement("div");
    b.className = "print-box";
    b.innerHTML = `
      <div class="h">${it.title}</div>
      <div class="b">${String(it.val).trim() || "—"}</div>
    `;
    printGrid.appendChild(b);
  });

  if(plan.su){
    const b = document.createElement("div");
    b.className = "print-box";
    b.innerHTML = `
      <div class="h">Su</div>
      <div class="b">${plan.su}</div>
    `;
    printGrid.appendChild(b);
  }

  const bmi = meta?.bmi != null ? `VKİ: ${meta.bmi}` : "VKİ: —";
  const st  = meta?.status ? `Durum: ${meta.status}` : "Durum: —";
  const dt  = meta?.date ? `Tarih: ${meta.date}` : `Tarih: ${todayStr()}`;

  $("printBmi").textContent = bmi;
  $("printStatus").textContent = st;
  $("printDate").textContent = dt;
  $("printDayLine").textContent = `${trDayName()} • ${todayStr()}`;

  const kind = statusKind(meta?.status || "");
  ["printBmi","printStatus","printDate"].forEach(id=>{
    const el = $(id);
    if(el){
      el.classList.remove("ok","warn","bad");
      if(kind) el.classList.add(kind);
    }
  });
}

// ✅ TR saatini güvenli almak (Intl)
function getTrNow(){
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const map = {};
  for(const p of parts) map[p.type] = p.value;
  return new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`);
}

// ✅ Her gün 06:00 TR’de yenile
function scheduleDailyRefreshAt6(){
  const scheduleNext = () => {
    const trNow = getTrNow();
    const next = new Date(trNow);

    // bugünün 06:00:10'u geçtiyse yarın 06:00:10
    next.setHours(6, 0, 10, 0);
    if(next.getTime() <= trNow.getTime()){
      next.setDate(next.getDate() + 1);
      next.setHours(6, 0, 10, 0);
    }

    const ms = Math.max(1000, next.getTime() - trNow.getTime());
    if(window.__DIET_DAILY_TIMER__) clearTimeout(window.__DIET_DAILY_TIMER__);

    window.__DIET_DAILY_TIMER__ = setTimeout(async () => {
      try{ await fetchDiet(); }catch(e){}
      finally{ scheduleNext(); }
    }, ms);
  };

  scheduleNext();
}

// ✅ Profil eksikse gösterilecek “Profil Güncelle” çağrısı
function showNeedProfile(message){
  $("heroTitle").textContent = "Diyet için profil gerekli";
  $("heroSub").textContent = message || "Evladım, diyet için bazı bilgilere ihtiyacım var.";
  $("hintLine").textContent = "Profil sayfasında: Cinsiyet, Doğum tarihi, Boy ve Kilo alanlarını doldur; sonra buraya gel.";

  setChip($("statusChip"), "Profil eksik", "warn");
  setChip($("bmiChip"), "VKİ: —", "warn");
  setChip($("dateChip"), todayStr(), "");

  // butonlar: WhatsApp/PDF kapat, profil butonu “Profil Güncelle”
  const shareBtn = $("shareBtn");
  const pdfBtn = $("pdfBtn");
  const profileBtn = $("profileBtn");

  if(shareBtn) shareBtn.style.display = "none";
  if(pdfBtn) pdfBtn.style.display = "none";
  if(profileBtn){
    profileBtn.style.display = "flex";
    profileBtn.classList.remove("ghost");
    profileBtn.classList.add("primary"); // eğer css yoksa sorun değil
    profileBtn.textContent = "👤 Profil Güncelle";
  }

  renderMeals({ kahvalti:"—", ara_ogun:"—", ogle:"—", aksam:"—", su:"" });
  renderPrint({ kahvalti:"—", ara_ogun:"—", ogle:"—", aksam:"—", su:"" }, { date: todayStr(), bmi: null, status:"Profil eksik" });

  window.__DIET_LAST__ = null;
}

function showPlanUI(data){
  // butonlar: WhatsApp/PDF açık, profil butonu gizli (artık gerek yok)
  const shareBtn = $("shareBtn");
  const pdfBtn = $("pdfBtn");
  const profileBtn = $("profileBtn");

  if(shareBtn) shareBtn.style.display = "flex";
  if(pdfBtn) pdfBtn.style.display = "flex";
  if(profileBtn) profileBtn.style.display = "none";
}

async function fetchDiet(){
  const user = safeJson(localStorage.getItem(STORAGE_KEY), {});
  const userId = norm(user?.id || user?.user_id || user?.email || "");
  if(!userId){
    showNeedProfile("Evladım önce giriş yap.");
    return;
  }

  // gün satırı
  const dayLine = `${trDayName()} • ${todayStr()}`;
  if($("dayLine")) $("dayLine").textContent = dayLine;

  // loading state
  $("heroTitle").textContent = "Bugünün Diyet Menüsü";
  $("heroSub").textContent = "Plan hazırlanıyor…";
  $("hintLine").textContent = "";

  try{
    const res = await fetch(`${BASE_DOMAIN}${DIET_ENDPOINT}`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ user_id: userId })
    });

    const data = await res.json().catch(()=> ({}));
    const dt = data?.date || todayStr();
    setChip($("dateChip"), dt, "");

    if(!data?.ok){
      showNeedProfile(data?.message || "Evladım, diyet için önce profilini doldur.");
      return;
    }

    // plan UI
    showPlanUI(data);

    const bmi = data?.bmi;
    const status = data?.status || "";
    const kind = statusKind(status);

    setChip($("statusChip"), `Durum: ${status}`, kind);
    setChip($("bmiChip"), (bmi != null ? `VKİ: ${bmi}` : "VKİ: —"), kind);

    $("heroTitle").textContent = "Bugünün Diyet Menüsü";
    $("heroSub").textContent = "Evladım, bugün bunu uygula. Yarın sabah 06:00’dan sonra yenisi gelir.";
    $("hintLine").textContent = "İpucu: Su içmeyi unutma. Şekerli içecek yok. Hadi bakalım.";

    renderMeals(data?.plan || {});
    renderPrint(data?.plan || {}, data);

    window.__DIET_LAST__ = data;

  }catch(e){
    showNeedProfile("Bağlantı gitti gibi… Diyet menüsü çekilemedi. Birazdan tekrar dene.");
  }
}

// -------- Buttons / Menu --------
function bindUI(){
  // Menü / hamburger
  const hamb = $("hambBtn");
  const overlay = $("menuOverlay");
  if(hamb && overlay){
    hamb.addEventListener("click", ()=> overlay.classList.add("open"));
    overlay.addEventListener("click", (e)=>{ if(e.target === overlay) overlay.classList.remove("open"); });
  }

  // Menü kısa yolları (varsa)
  $("goHomeBtn")?.addEventListener("click", ()=> location.href = "/");
  $("menuGoChat")?.addEventListener("click", ()=> location.href = "/");
  $("menuGoDiet")?.addEventListener("click", ()=> location.href = "/pages/diyet.html");

  // Profil butonu: Profil Güncelle
  $("profileBtn")?.addEventListener("click", ()=> location.href = "/pages/profil.html");

  // WhatsApp
  $("shareBtn")?.addEventListener("click", ()=>{
    const data = window.__DIET_LAST__ || {};
    const text = buildShareText(data);
    const url = "https://wa.me/?text=" + encodeURIComponent(text);
    window.open(url, "_blank");
  });

  // PDF (print)
  $("pdfBtn")?.addEventListener("click", ()=> window.print());

  // Menüde profil kısayolu (varsa)
  $("profileShortcutBtn")?.addEventListener("click", ()=> location.href="/pages/profil.html");

  // Profil avatar / isim bas
  try{
    const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const pic = (u.picture || u.avatar || u.avatar_url || u.photo_url || "").trim();
    const full = (u.fullname || u.name || u.display_name || "").trim();
    const ico = $("profileShortcutIco");
    if(ico){
      ico.innerHTML = pic ? `<img src="${pic}" alt="avatar" style="width:100%;height:100%;object-fit:cover;display:block;">` : "👤";
    }
    const nm = $("profileShortcutName");
    if(nm) nm.textContent = full || "—";
  }catch(e){}
}

document.addEventListener("DOMContentLoaded", async ()=>{
  bindUI();
  await fetchDiet();
  scheduleDailyRefreshAt6(); // ✅ her gün 06:00 TR
});
```0
