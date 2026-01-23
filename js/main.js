// js/main.js (v5.2 PREMIUM - NO HTML LOSS)
// HTML'e dokunmadan: giriş, terms, menü, notif, fal, chat, animasyonları bağlar.

import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function setUser(u) { localStorage.setItem(STORAGE_KEY, JSON.stringify(u || {})); }

function firstName(full = "") {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
}

// --------------------
// GLOBAL UI HOOKS (auth.js çağırır)
// --------------------
window.enterApp = () => {
  $("loginOverlay")?.classList.remove("active");
  $("loginOverlay") && ($("loginOverlay").style.display = "none");
  refreshPremiumBars();
};

window.showTermsOverlay = () => {
  const t = $("termsOverlay");
  if (!t) return;
  t.classList.add("active");
  t.style.display = "flex";
};

// Google prompt gösterilemezse dev hint
window.showGoogleButtonFallback = (reason = "unknown") => {
  const hint = $("loginHint");
  if (hint) hint.textContent = `Google penceresi açılamadı (${reason}). Alttaki butonu tekrar dene.`;
};

// --------------------
// Premium UI state
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider !== "guest");
  document.body.classList.toggle("is-logged", logged);

  const name = (u.hitap || firstName(u.fullname) || u.email || "MİSAFİR").toUpperCase();
  const hint = $("loginHint");
  if (hint && !logged) hint.textContent = "Servisler hazır. Google ile devam et evladım.";

  // Samimiyet meter (şimdilik local)
  const yp = Number((u?.yp_percent ?? 50));
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  // Profil butonu login yoksa overlay açsın
  const profileBtn = $("profileBtn");
  if (profileBtn) {
    profileBtn.onclick = () => {
      if (!logged) {
        $("loginOverlay")?.classList.add("active");
        $("loginOverlay") && ($("loginOverlay").style.display = "flex");
        return;
      }
      location.href = "pages/profil.html";
    };
  }

  // Menü footer aksiyonları login yoksa auth açsın
  $("logoutBtn") && ($("logoutBtn").onclick = () => {
    if (!logged) {
      $("loginOverlay")?.classList.add("active");
      $("loginOverlay") && ($("loginOverlay").style.display = "flex");
      return;
    }
    logout();
  });

  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = async () => {
    if (!logged) {
      alert("Önce giriş yap evladım.");
      return;
    }
    await deleteAccount();
  });

  // Brand title subtitle (premium hissi)
  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? name : "MİSAFİR";
}

// --------------------
// Menu (grid doldur + aksiyon bağla)
// --------------------
const MENU_ITEMS = [
  { key: "chat",       label: "Sohbet",      sub: "Dertleş",      ico: "💬" },
  { key: "dedikodu",   label: "Dedikodu",    sub: "Özel oda",     ico: "🕵️" },
  { key: "shopping",   label: "Alışveriş",   sub: "Tasarruf et",  ico: "🛍️" },
  { key: "translate",  label: "Tercüman",    sub: "Çeviri",       ico: "🌍" },
  { key: "diet",       label: "Diyet",       sub: "Plan",         ico: "🥗" },
  { key: "health",     label: "Sağlık",      sub: "Danış",        ico: "❤️" },
  { key: "special",    label: "Özel Gün",    sub: "Hatırla",      ico: "🎉" },
  { key: "reminder",   label: "Hatırlatıcı", sub: "Alarm",        ico: "⏰" },
  { key: "fal",        label: "Kahve Falı",  sub: "Günde 1",      ico: "☕" },
  { key: "tarot",      label: "Tarot",       sub: "Kart seç",     ico: "🃏" },
  { key: "horoscope",  label: "Burç",        sub: "Günlük",       ico: "♈" },
  { key: "dream",      label: "Rüya",        sub: "Yorumla",      ico: "🌙" },

  // ✅ PRO EK: Yan menü sayfaları (ikonlu, overlay ile açılır)
  { key: "about",      label: "Hakkımızda",  sub: "Biz kimiz?",   ico: "ℹ️" },
  { key: "faq",        label: "SSS",         sub: "Sorular",      ico: "❓" },
  { key: "privacy",    label: "Gizlilik",    sub: "Güven",        ico: "🔒" },
  { key: "contact",    label: "İletişim",    sub: "Bize yaz",     ico: "✉️" },
  { key: "terms",      label: "Sözleşme",    sub: "Kurallar",     ico: "📄" },
];

function populateMenuGrid() {
  const grid = $("mainMenu");
  if (!grid) return;

  // boşsa doldur; doluysa dokunma
  if (grid.children.length > 0) return;

  grid.innerHTML = MENU_ITEMS.map(m => `
    <div class="menu-action" data-action="${m.key}">
      <div class="ico">${m.ico}</div>
      <div><div>${m.label}</div><small>${m.sub}</small></div>
    </div>
  `).join("");
}

function openMenu() { $("menuOverlay")?.classList.add("open"); }
function closeMenu() { $("menuOverlay")?.classList.remove("open"); }

// ✅ PRO: Sayfa içerikleri (girişte güven veren metinler)
const STATIC_PAGES = {
  about: {
    title: "Hakkımızda",
    html: `
      <h2>Caynana.AI</h2>
      <p><b>Yapay Zekânın Geleneksel Aklı</b> yaklaşımıyla sohbetten gündelik rehberliğe kadar yanında olan dijital asistandır.</p>
      <ul>
        <li>Hızlı, pratik ve samimi deneyim</li>
        <li>Gizlilik ve güven odaklı yaklaşım</li>
        <li>Şeffaf sözleşme ve hesap yönetimi</li>
      </ul>
      <p style="color:#9aa; font-size:12px;">@CaynanaAI By Ozyigits2026</p>
    `
  },
  faq: {
    title: "SSS",
    html: `
      <h2>Sık Sorulan Sorular</h2>
      <p><b>Ücretli mi?</b> Şimdilik ücretsiz üyelikle giriş yapılır.</p>
      <p><b>Fal kesin mi?</b> Hayır, eğlence amaçlı yapay zeka yorumudur.</p>
      <p><b>Apple girişi?</b> Hazırlanıyor. Şimdilik Google ile devam edebilirsin.</p>
      <p style="color:#9aa; font-size:12px;">@CaynanaAI By Ozyigits2026</p>
    `
  },
  privacy: {
    title: "Gizlilik",
    html: `
      <h2>Gizlilik Politikası</h2>
      <p>Verileriniz; hizmeti sunmak, güvenliği sağlamak ve deneyimi iyileştirmek için işlenir.</p>
      <ul>
        <li>Gereksiz veri toplamayız</li>
        <li>Yetkisiz erişime karşı koruma uygularız</li>
        <li>Şeffaf bilgilendirme prensibi</li>
      </ul>
      <p style="color:#9aa; font-size:12px;">@CaynanaAI By Ozyigits2026</p>
    `
  },
  contact: {
    title: "İletişim",
    html: `
      <h2>İletişim</h2>
      <p>Görüş/öneri için bize yazabilirsin.</p>
      <p><b>Not:</b> İstersen buraya gerçek iletişim mailini/kanalını sonra ekleriz.</p>
      <p style="color:#9aa; font-size:12px;">@CaynanaAI By Ozyigits2026</p>
    `
  },
  terms: {
    title: "Sözleşme",
    html: `
      <h2>Kullanıcı Sözleşmesi</h2>
      <p>1) Caynana AI eğlence ve rehberlik amaçlıdır. Kritik kararlar için profesyonel görüş al.</p>
      <p>2) Fal ve yorumlar yapay zekâ üretimidir.</p>
      <p>3) Veriler hizmeti sunmak ve güvenliği sağlamak amacıyla işlenir.</p>
      <p style="color:#9aa; font-size:12px;">@CaynanaAI By Ozyigits2026</p>
    `
  }
};

function openPageByKey(key){
  const p = STATIC_PAGES[key];
  if(!p) return;
  openPage(p.title, p.html);
}

async function handleMenuAction(action) {
  closeMenu();

  // ✅ PRO: statik sayfalar overlay
  if (["about","faq","privacy","contact","terms"].includes(action)) {
    openPageByKey(action);
    return;
  }

  if (action === "fal") { openFalPanel(); return; }
  if (action === "reminder") { location.href = "pages/hatirlatici.html"; return; }
  if (action === "tarot") { location.href = "pages/tarot.html"; return; }
  if (action === "horoscope") { location.href = "pages/burc.html"; return; }
  if (action === "dream") { location.href = "pages/ruya.html"; return; }

  // chat modları
  if (action === "dedikodu") { await sendForced("Dedikodu modundayız. Anlat bakalım… 😏", "dedikodu"); return; }
  if (action === "shopping") { await sendForced("Alışverişe geçtik. Ne alacaksın?", "shopping"); return; }
  if (action === "translate") { await sendForced("Çeviri: metni yapıştır, dilini söyle.", "trans"); return; }
  if (action === "diet") { await sendForced("Diyet: hedefin ne? kilo mu koruma mı?", "diet"); return; }
  if (action === "health") { await sendForced("Sağlık: ne şikayetin var?", "health"); return; }
  if (action === "special") { await sendForced("Özel gün: hangi tarihleri ekleyelim?", "chat"); return; }
  if (action === "chat") { await sendForced("Anlat bakalım evladım.", "chat"); return; }

  // fallback
  location.href = `pages/${action}.html`;
}

// --------------------
// Chat send
// --------------------
let currentMode = "chat";
let chatHistory = [];

function setBrandState(state) {
  const bw = $("brandWrapper");
  const mf = $("mobileFrame");
  if (bw) {
    bw.classList.remove("usering","botting","thinking","talking");
    if (state) bw.classList.add(state);
  }
  if (mf) {
    mf.classList.remove("usering","botting","thinking","talking");
    if (state) mf.classList.add(state);
  }
}

async function sendForced(text, mode="chat") {
  currentMode = mode;
  await doSend(text, true);
}

// ✅ PRO: “kim yazdı/yarattı” özel cevap
function specialAnswerIfNeeded(txt){
  const s = String(txt || "").trim();

  // kim yazdı / kim yarattı
  if (/(seni\s*kim\s*(yazd[ıi]|yaratt[ıi]|yapt[ıi])|kim\s*yazd[ıi]\s*seni|kim\s*yaratt[ıi])/i.test(s)){
    return "Benim arkamda işinde tecrübeli oldukça büyük bir yazılım kadrosu var. Beni şu yazdı ya da yarattı diye kesin isim veremem; ama akıl takımının başı Oğuz Özyiğit, onu söyleyebilirim.";
  }
  return null;
}

async function doSend(forcedText = null, isSystem = false) {
  const input = $("msgInput");
  const txt = String(forcedText ?? input?.value ?? "").trim();
  if (!txt) return;

  // UI: user bubble
  setBrandState("usering");
  addUserBubble(txt);
  if (input && forcedText === null) input.value = "";

  // history
  chatHistory.push({ role: "user", content: txt });

  // ✅ PRO: özel cevap varsa backend'e gitme
  const special = specialAnswerIfNeeded(txt);
  if (special) {
    setBrandState("botting");
    setTimeout(() => setBrandState("talking"), 120);
    typeWriter(special, "chat");
    chatHistory.push({ role: "assistant", content: special });
    setTimeout(() => setBrandState(null), 650);
    return;
  }

  // loading
  setTimeout(() => setBrandState("thinking"), 120);
  const holder = document.createElement("div");
  holder.className = "bubble bot loading";
  holder.textContent = "…";
  $("chat")?.appendChild(holder);
  holder.scrollIntoView({ behavior: "smooth", block: "end" });

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const out = await fetchTextResponse(txt, currentMode, chatHistory);
    reply = out?.text || reply;
  } catch (e) {}

  try { holder.remove(); } catch (e) {}

  setBrandState("botting");
  setTimeout(() => setBrandState("talking"), 120);
  typeWriter(reply, "chat");
  chatHistory.push({ role: "assistant", content: reply });
  setTimeout(() => setBrandState(null), 650);
}

// --------------------
// Eyes tracking (premium smooth, donmasız)
// --------------------
function setGaze(x, y) {
  const L = $("eyeL"), R = $("eyeR");
  if (!L || !R) return;
  const gx = Math.min(Math.max(x * 20, -20), 20);
  const gy = Math.min(Math.max(y * 14, -14), 14);
  L.style.setProperty("--gx", gx + "px"); L.style.setProperty("--gy", gy + "px");
  R.style.setProperty("--gx", gx + "px"); R.style.setProperty("--gy", gy + "px");
}
function setLids(top, bot=0) {
  const L = $("eyeL"), R = $("eyeR");
  if (!L || !R) return;
  [L, R].forEach(e => {
    e.querySelector(".lid-top").style.height = top + "%";
    e.querySelector(".lid-bot").style.height = bot + "%";
  });
}

let isTracking = false;
let idleTimer = null;

function resetIdle() {
  $("mobileFrame")?.classList.remove("sleeping");
  setLids(0,0);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!isTracking) {
      $("mobileFrame")?.classList.add("sleeping");
      setLids(60,20);
    }
  }, 30000);
}

function autoLook() {
  if ($("mobileFrame")?.classList.contains("sleeping") || isTracking) return;
  const rx = (Math.random()-0.5)*1.6;
  const ry = (Math.random()-0.5)*0.6;
  setGaze(rx, ry);
  setTimeout(() => setGaze(0,0), 900);
}

// pointermove throttle
let _raf=0, _lastEvt=null, _rect=null, _rectAt=0, _idleAt=0;
function getRect(){
  const now = performance.now();
  if(!_rect || (now - _rectAt) > 250){
    _rect = $("mobileFrame")?.getBoundingClientRect() || null;
    _rectAt = now;
  }
  return _rect;
}
window.addEventListener("resize", ()=>{ _rect=null; });

window.addEventListener("pointermove", (e)=>{
  _lastEvt = e;
  const now = performance.now();
  if(now - _idleAt > 500){ _idleAt = now; resetIdle(); }
  if(isTracking) return;
  if(_raf) return;
  _raf = requestAnimationFrame(()=>{
    _raf=0;
    const r = getRect();
    if(!r || r.width<=0 || r.height<=0) return;
    const x = ((_lastEvt.clientX - r.left) / r.width) * 2 - 1;
    const y = ((_lastEvt.clientY - r.top) / r.height) * 2 - 1;
    setGaze(x,y);
  });
}, { passive:true });

// --------------------
// Fal binding
// --------------------
function bindFalUI(){
  // close
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());

  // input
  const fi = $("falInput");
  if (fi) {
    fi.onchange = () => handleFalPhoto(fi);
  }

  // fix invalid #gold in HTML
  const lt = $("loadingText");
  if (lt) lt.style.color = "var(--gold)";
}

// --------------------
// Page overlay (tek ekran içerik)
// --------------------
function openPage(title, html){
  const po = $("pageOverlay");
  if(!po) return;
  $("pageTitle").textContent = title || "";
  $("pageContent").innerHTML = html || "";
  po.classList.add("active");
  po.style.display = "flex";
}
function closePage(){
  const po = $("pageOverlay");
  if(!po) return;
  po.classList.remove("active");
  po.style.display = "none";
}
function bindPageOverlay(){
  $("closePageBtn") && ($("closePageBtn").onclick = closePage);
  $("pageOverlay") && ($("pageOverlay").onclick = (e)=>{ if(e.target === $("pageOverlay")) closePage(); });
}

// ✅ PRO: Footer + Login alt linkleri overlay'e bağla (HTML'e dokunmadan)
function bindStaticLinks(){
  // footer linkleri (pages/*.html ise yakala, overlay aç)
  document.querySelectorAll(".footer-links a").forEach(a=>{
    a.addEventListener("click", (e)=>{
      const href = (a.getAttribute("href") || "").toLowerCase();
      // eğer zaten data-page varsa ona göre
      const dp = a.getAttribute("data-page");
      if(dp && STATIC_PAGES[dp]){
        e.preventDefault();
        openPageByKey(dp);
        return;
      }
      if(href.includes("hakkimizda")) { e.preventDefault(); openPageByKey("about"); return; }
      if(href.includes("sss"))       { e.preventDefault(); openPageByKey("faq"); return; }
      if(href.includes("gizlilik"))  { e.preventDefault(); openPageByKey("privacy"); return; }
      if(href.includes("iletisim"))  { e.preventDefault(); openPageByKey("contact"); return; }
    });
  });

  // login alt linkleri varsa (data-page veya href ile)
  document.querySelectorAll("[data-page]").forEach(a=>{
    const k = a.getAttribute("data-page");
    if(!k || !STATIC_PAGES[k]) return;
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      openPageByKey(k);
    });
  });
}

// --------------------
// Account delete
// --------------------
async function deleteAccount(){
  const u = getUser();
  if(!u?.id) return;
  if(!confirm("Hesabını kalıcı silmek istiyor musun?")) return;

  const idToken = (localStorage.getItem("google_id_token") || "").trim();

  // 1) profile/delete dene
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/profile/delete`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ user_id: u.id, email: u.email || "", google_id_token: idToken || "" })
    });
    if(r.ok){
      alert("Hesabın silindi.");
      localStorage.clear();
      location.reload();
      return;
    }
  }catch(e){}

  // 2) fallback deleted_at
  try{
    const r2 = await fetch(`${BASE_DOMAIN}/api/profile/update`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        user_id: u.id,
        meta:{ email:u.email || "", deleted_at:new Date().toISOString() },
        google_id_token: idToken || ""
      })
    });
    if(r2.ok){
      alert("Silme talebin alındı.");
      localStorage.clear();
      location.reload();
      return;
    }
  }catch(e){}

  alert("Silme endpoint'i yok/çalışmıyor. Backend'e eklenmeli.");
}

// --------------------
// Login / Terms
// --------------------
async function waitForGsi(timeoutMs = 8000){
  const t0 = Date.now();
  while(Date.now() - t0 < timeoutMs){
    if(window.google?.accounts?.id) return true;
    await sleep(60);
  }
  return false;
}

function bindAuthUI(){
  $("googleLoginBtn") && ($("googleLoginBtn").onclick = () => handleLogin("google"));

  // ✅ PRO: Apple tıklayana Kaynana dili (hazırlanıyor)
  $("appleLoginBtn") && ($("appleLoginBtn").onclick = () => {
    alert("Evladım Apple daha hazırlanıyor… Şimdilik Google’la gel, elin boş dönme 🙂");
  });

  $("devLoginBtn") && ($("devLoginBtn").onclick = () => {
    const fake = { id:"dev@local", email:"dev@local", fullname:"Test Kullanıcı", avatar:"", provider:"dev", isSessionActive:true, lastLoginAt:new Date().toISOString() };
    setUser(fake);
    $("loginOverlay")?.classList.remove("active");
    $("loginOverlay") && ($("loginOverlay").style.display = "none");
    refreshPremiumBars();
  });

  $("termsAcceptBtn") && ($("termsAcceptBtn").onclick = async () => {
    if(!$("termsCheck")?.checked) return alert("Onayla evladım.");
    const ok = await acceptTerms();
    if(!ok) return alert("Sözleşme kaydedilemedi.");
    $("termsOverlay")?.classList.remove("active");
    $("termsOverlay") && ($("termsOverlay").style.display = "none");
    refreshPremiumBars();
  });
}

// --------------------
// Notif UI
// --------------------
function bindNotifUI(){
  $("notifBtn") && ($("notifBtn").onclick = () => {
    $("notifDropdown")?.classList.toggle("show");
    if($("notifBadge")) $("notifBadge").style.display = "none";
  });

  // dışarı tıkla kapan
  document.addEventListener("click", (e)=>{
    const dd = $("notifDropdown");
    if(!dd) return;
    if(e.target?.closest?.("#notifBtn")) return;
    if(e.target?.closest?.("#notifDropdown")) return;
    dd.classList.remove("show");
  });
}

// --------------------
// Menu UI binding
// --------------------
function bindMenuUI(){
  $("hambBtn") && ($("hambBtn").onclick = openMenu);
  $("menuOverlay") && ($("menuOverlay").onclick = (e)=>{ if(e.target === $("menuOverlay")) closeMenu(); });

  $("newChatBtn") && ($("newChatBtn").onclick = () => {
    closeMenu();
    $("chat") && ($("chat").innerHTML = "");
    chatHistory = [];
    setBrandState(null);
  });

  // grid delegation
  $("mainMenu") && ($("mainMenu").onclick = (e)=>{
    const it = e.target?.closest?.(".menu-action");
    if(!it) return;
    handleMenuAction(it.getAttribute("data-action"));
  });
}

// --------------------
// Buttons
// --------------------
function bindComposer(){
  $("sendBtn") && ($("sendBtn").onclick = ()=> doSend());
  $("msgInput") && ($("msgInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      doSend();
    }
  }));

  // tracking toggle
  const toggle = ()=>{
    $("mobileFrame")?.classList.toggle("tracking-active");
    isTracking = !isTracking;
    resetIdle();
  };
  $("camBtn") && ($("camBtn").onclick = toggle);
  $("mainTrackBtn") && ($("mainTrackBtn").onclick = toggle);
  $("trackToggleBtn") && ($("trackToggleBtn").onclick = toggle);
}

// --------------------
// BOOT
// --------------------
document.addEventListener("DOMContentLoaded", async ()=>{
  // premium class (CSS patch bunu kullanıyor)
  document.body.classList.add("premium-ui");

  populateMenuGrid();
  bindMenuUI();
  bindNotifUI();
  bindComposer();
  bindFalUI();
  bindPageOverlay();
  bindAuthUI();

  // ✅ PRO: footer/login linkleri overlay'e bağla
  bindStaticLinks();

  // profile btn route
  $("profileBtn") && ($("profileBtn").onclick = () => {
    const u = getUser();
    const logged = !!(u?.isSessionActive && u?.id && u?.provider !== "guest");
    if(!logged){
      $("loginOverlay")?.classList.add("active");
      $("loginOverlay") && ($("loginOverlay").style.display = "flex");
      return;
    }
    location.href = "pages/profil.html";
  });

  // init notif + auth
  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e) {}
  const okGsi = await waitForGsi();
  if(okGsi) $("loginHint") && ($("loginHint").textContent = "Google hazır. Devam et evladım.");
  initAuth();

  // logout / delete
  $("logoutBtn") && ($("logoutBtn").onclick = () => logout());
  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = () => deleteAccount());

  // session check
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id);
  if(logged){
    $("loginOverlay")?.classList.remove("active");
    $("loginOverlay") && ($("loginOverlay").style.display = "none");
    if(!u.terms_accepted_at){
      window.showTermsOverlay?.();
    }
  } else {
    $("loginOverlay")?.classList.add("active");
    $("loginOverlay") && ($("loginOverlay").style.display = "flex");
  }

  refreshPremiumBars();
  resetIdle();
  setInterval(autoLook, 4000);
});
