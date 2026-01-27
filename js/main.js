// js/main.js (FINAL - Single Bind, Pages, Terms Gate, Delete Account via backend token)
// + ChatStore sohbet listesi + kalıcı hafıza (son 10) + menüden geçiş/silme
// ✅ FIX: ChatStore.load() yoktu → UI render fonksiyonu eklendi (eksiltme yok)
// ✅ FIX: Çift kayıt (user/assistant iki kez ekleniyordu) → storeAddOnce guard (eksiltme yok)
//
// ✅ FINAL: 3 BLOK MENU (Asistan / Astro AI / Kurumsal)
// ✅ FINAL: Profil erişimi (üst ikon + menü + yeni sohbet altı turuncu kısayol)
// ✅ FINAL: Yeni sohbet başlığı = ilk user mesajı (max 10 karakter)
// ✅ FINAL: History silme ikonu kibar SVG + aynı satır
// ✅ FINAL: Yeni sohbet oluşmadan chat alanı görünmez
//
// ✅ FIX (YENİ): FedCM AbortError / Google giriş bazen “profil dönüşü” sonrası bozuluyor
//    Sebep: GSI init/prompt iki kez tetiklenebiliyor (özellikle bfcache / tekrar mount / çift click).
//    Çözüm: main.js içinde “tek sefer initAuth + tek sefer handleLogin” kilidi eklendi. (Eksiltme yok)

// 🔹 TÜM IMPORTLAR EN ÜSTTE
import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { ChatStore } from "./chat_store.js";

// 🔹 IMPORTLARDAN SONRA NORMAL KOD GELİR

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const API_TOKEN_KEY = "caynana_api_token";

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function getApiToken(){ return (localStorage.getItem(API_TOKEN_KEY) || "").trim(); }
function setApiToken(t){ if(t) localStorage.setItem(API_TOKEN_KEY, t); }
function clearApiToken(){ localStorage.removeItem(API_TOKEN_KEY); }

// --------------------
// ✅ GSI / AUTH KİLİTLERİ (AbortError önleme)
// --------------------
function getBootState(){
  if(!window.__CAYNANA_BOOT__) window.__CAYNANA_BOOT__ = {
    gsiReady: false,
    authInited: false,
    loginInFlight: false,
    lastLoginAt: 0
  };
  return window.__CAYNANA_BOOT__;
}

// --- backend token al (Google token -> backend token) ---
async function ensureBackendSessionToken(){
  const existing = getApiToken();
  if(existing) return existing;

  const googleIdToken = (localStorage.getItem("google_id_token") || "").trim();
  if(!googleIdToken) throw new Error("google_id_token missing");

  const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      google_id_token: googleIdToken,
      id_token: googleIdToken,
      token: googleIdToken
    })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(`auth/google failed: ${r.status} ${txt}`);

  let data = {};
  try { data = JSON.parse(txt || "{}"); } catch(e) {}

  const token =
    (data.token ||
     data.access_token ||
     data.api_token ||
     data.jwt ||
     data.session_token ||
     data.auth_token ||
     data.bearer ||
     data.accessToken ||
     "").trim();

  if(!token) throw new Error("auth/google token not found in response");
  setApiToken(token);
  return token;
}

// --------------------
// GLOBAL HOOKS
// --------------------
window.enterApp = () => {
  $("loginOverlay")?.classList.remove("active");
  if ($("loginOverlay")) $("loginOverlay").style.display = "none";
  refreshPremiumBars();
};

window.showTermsOverlay = () => {
  const t = $("termsOverlay");
  if (!t) return;
  t.classList.add("active");
  t.style.display = "flex";
};

window.showGoogleButtonFallback = (reason = "unknown") => {
  const hint = $("loginHint");
  if (hint) hint.textContent = `Google girişi açılamadı (${reason}). Sayfayı yenileyip tekrar dene.`;
};

// --------------------
// UI STATE
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
  document.body.classList.toggle("is-logged", logged);

  const name = (u.hitap || (u.fullname || "").split(/\s+/)[0] || u.email || "MİSAFİR").toUpperCase();

  const yp = Number((u?.yp_percent ?? 50));
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? name : "MİSAFİR";
}

// --------------------
// SMALL UI HELPERS
// --------------------
function setChatVisibilityFromStore(){
  const chatEl = $("chat");
  if(!chatEl) return;

  let h = [];
  try { h = ChatStore.history() || []; } catch(e){ h = []; }

  if(!h || h.length === 0){
    chatEl.style.display = "none";
    chatEl.classList.add("chat-empty");
  }else{
    chatEl.style.display = "block";
    chatEl.classList.remove("chat-empty");
  }
}

function ensureChatVisible(){
  const chatEl = $("chat");
  if(!chatEl) return;
  chatEl.style.display = "block";
  chatEl.classList.remove("chat-empty");
}

function trashSvg(){
  return `
  <svg class="ico-trash" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6 7l1 14h10l1-14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  </svg>`;
}

function makeChatTitleFromFirstMsg(text=""){
  const s = String(text || "").trim().replace(/\s+/g, " ");
  if(!s) return "Sohbet";
  return s.slice(0, 15);
}

function trySetChatTitle(title){
  const t = String(title || "").trim();
  if(!t) return;

  try{
    if(typeof ChatStore.setTitle === "function"){
      ChatStore.setTitle(ChatStore.currentId, t);
      return;
    }
    if(typeof ChatStore.renameChat === "function"){
      ChatStore.renameChat(ChatStore.currentId, t);
      return;
    }
    if(typeof ChatStore.updateTitle === "function"){
      ChatStore.updateTitle(ChatStore.currentId, t);
      return;
    }
  }catch(e){}
}

function ensureTitleOnFirstUserMessage(userText){
  try{
    const list = ChatStore.list?.() || [];
    const curId = ChatStore.currentId;
    const cur = list.find(x => x.id === curId);
    const curTitle = String(cur?.title || "").trim();
    if(curTitle) return;

    const title = makeChatTitleFromFirstMsg(userText);
    trySetChatTitle(title);
  }catch(e){}
}

// ✅ PROFIL NAV
function goProfile(){
  location.href = "/pages/profil.html";
}

// --------------------
// MENU (3 BLOK)
// --------------------
const MENU_ITEMS = [
  // ASISTAN
  { key: "chat",       label: "Sohbet",      sub: "Dertleş",      ico: "💬", group:"asistan" },
  { key: "dedikodu",   label: "Dedikodu",    sub: "Özel oda",     ico: "🕵️", group:"asistan" },
  { key: "shopping",   label: "Alışveriş",   sub: "Tasarruf et",  ico: "🛍️", group:"asistan" },
  { key: "translate",  label: "Tercüman",    sub: "Çeviri",       ico: "🌍", group:"asistan" },
  { key: "diet",       label: "Diyet",       sub: "Plan",         ico: "🥗", group:"asistan" },
  { key: "health",     label: "Sağlık",      sub: "Danış",        ico: "❤️", group:"asistan" },

  // ASTRO
  { key: "fal",        label: "Kahve Falı",  sub: "Günde 1",      ico: "☕", group:"astro" },
  { key: "tarot",      label: "Tarot",       sub: "Kart seç",     ico: "🃏", group:"astro" },
  { key: "horoscope",  label: "Burç",        sub: "Günlük",       ico: "♈", group:"astro" },
  { key: "dream",      label: "Rüya",        sub: "Yorumla",      ico: "🌙", group:"astro" },

  // KURUMSAL
  { key: "profile",    label: "Profil Düzenle", sub: "Bilgilerini güncelle", ico: "👤", group:"kurumsal", tone:"orange" },
  { key: "hakkimizda", label: "Hakkımızda",  sub: "Biz kimiz?",   ico: "ℹ️", group:"kurumsal" },
  { key: "sss",        label: "SSS",         sub: "Sorular",      ico: "❓", group:"kurumsal" },
  { key: "gizlilik",   label: "Gizlilik",    sub: "Güven",        ico: "🔒", group:"kurumsal" },
  { key: "iletisim",   label: "İletişim",    sub: "Bize yaz",     ico: "✉️", group:"kurumsal" },
  { key: "sozlesme",   label: "Sözleşme",    sub: "Kurallar",     ico: "📄", group:"kurumsal" },
  { key: "uyelik",     label: "Üyelik",      sub: "Detaylar",     ico: "🪪", group:"kurumsal" },
];

function menuItemHtml(m){
  return `
    <div class="menu-action ${m.group ? `grp-${m.group}` : ""} ${m.tone ? `tone-${m.tone}` : ""}" data-action="${m.key}">
      <div class="ico">${m.ico}</div>
      <div><div>${m.label}</div><small>${m.sub}</small></div>
    </div>
  `;
}

function populateMenuGrid() {
  // 3 grid
  const gA = $("menuAsistan");
  const gB = $("menuAstro");
  const gC = $("menuKurumsal");

  // fallback: eski id varsa
  const legacy = $("mainMenu");

  // zaten doluysa tekrar basma
  if ((gA && gA.children.length) || (gB && gB.children.length) || (gC && gC.children.length) || (legacy && legacy.children.length)) return;

  const asistanItems = MENU_ITEMS.filter(x => x.group === "asistan");
  const astroItems   = MENU_ITEMS.filter(x => x.group === "astro");
  const kurumsalItems= MENU_ITEMS.filter(x => x.group === "kurumsal");

  if(gA) gA.innerHTML = asistanItems.map(menuItemHtml).join("");
  if(gB) gB.innerHTML = astroItems.map(menuItemHtml).join("");
  if(gC) gC.innerHTML = kurumsalItems.map(menuItemHtml).join("");

  // legacy varsa hepsini bas (geriye uyum)
  if(legacy && (!gA && !gB && !gC)){
    legacy.innerHTML = MENU_ITEMS.map(menuItemHtml).join("");
  }
}

function openMenu() { $("menuOverlay")?.classList.add("open"); }
function closeMenu() { $("menuOverlay")?.classList.remove("open"); }

function goPage(key){
  const map = {
    hakkimizda: "/pages/hakkimizda.html",
    iletisim:   "/pages/iletisim.html",
    gizlilik:   "/pages/gizlilik.html",
    sozlesme:   "/pages/sozlesme.html",
    sss:        "/pages/sss.html",
    uyelik:     "/pages/uyelik.html",
  };
  const url = map[key];
  if (url) location.href = url;
}

async function handleMenuAction(action) {
  closeMenu();

  if (["hakkimizda","iletisim","gizlilik","sozlesme","sss","uyelik"].includes(action)) {
    goPage(action);
    return;
  }

  if (action === "profile") { goProfile(); return; }

  if (action === "fal") { openFalPanel(); return; }
  if (action === "tarot") { location.href = "pages/tarot.html"; return; }
  if (action === "horoscope") { location.href = "pages/burc.html"; return; }
  if (action === "dream") { location.href = "pages/ruya.html"; return; }

  if (action === "dedikodu") { currentMode = "dedikodu"; return; }
  if (action === "shopping") { currentMode = "shopping"; return; }
  if (action === "translate") { currentMode = "trans"; return; }
  if (action === "diet") { currentMode = "diet"; return; }
  if (action === "health") { currentMode = "health"; return; }
  if (action === "chat") { currentMode = "chat"; return; }

  location.href = `pages/${action}.html`;
}

// --------------------
// CHAT
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

function syncFromStore(){
  try{
    const h = ChatStore.history() || [];
    chatHistory = h.map(m => ({ role: m.role, content: m.content }));
  }catch(e){
    chatHistory = [];
  }
}

function renderChatFromStore(){
  const chatEl = $("chat");
  if(!chatEl) return;

  chatEl.innerHTML = "";
  let h = [];
  try { h = ChatStore.history() || []; } catch(e){ h = []; }

  h.forEach(m => {
    const role = String(m?.role || "").toLowerCase();
    const content = String(m?.content || "");
    if(!content) return;

    const bubble = document.createElement("div");
    bubble.className = `bubble ${role === "user" ? "user" : "bot"}`;
    bubble.textContent = content;
    chatEl.appendChild(bubble);
  });

  chatEl.scrollTop = chatEl.scrollHeight;
  syncFromStore();
  setChatVisibilityFromStore();
}

function storeAddOnce(role, content){
  try{
    const h = ChatStore.history() || [];
    const last = h[h.length - 1];
    const r = String(role || "").toLowerCase();
    const c = String(content || "");
    if(last && String(last.role||"").toLowerCase() === r && String(last.content||"") === c) return;
    ChatStore.add(r, c);
  }catch(e){
    try{ ChatStore.add(role, content); }catch(_){}
  }
}

async function doSend(forcedText = null) {
  const input = $("msgInput");
  const txt = String(forcedText ?? input?.value ?? "").trim();
  if (!txt) return;

  ensureChatVisible();

  setBrandState("usering");
  addUserBubble(txt);
  if (input && forcedText === null) input.value = "";

  storeAddOnce("user", txt);
  ensureTitleOnFirstUserMessage(txt);
  syncFromStore();
  renderHistoryList();

  setTimeout(() => setBrandState("thinking"), 120);
  const holder = document.createElement("div");
  holder.className = "bubble bot loading";
  holder.textContent = "…";
  $("chat")?.appendChild(holder);

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const out = await fetchTextResponse(txt, currentMode, chatHistory);
    reply = out?.text || reply;
  } catch (e) {}

  try { holder.remove(); } catch (e) {}

  setBrandState("botting");
  setTimeout(() => setBrandState("talking"), 120);
  typeWriter(reply, "chat");

  storeAddOnce("assistant", reply);
  syncFromStore();

  setTimeout(() => setBrandState(null), 650);
}

// --------------------
// FAL
// --------------------
function bindFalUI(){
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());
  const fi = $("falInput");
  if (fi) fi.onchange = () => handleFalPhoto(fi);
  const lt = $("loadingText");
  if (lt) lt.style.color = "var(--gold)";
}

// --------------------
// DELETE ACCOUNT (FINAL)
// --------------------
async function deleteAccount(){
  const u0 = getUser();
  const uid = (u0?.id || "").trim();
  const email = (u0?.email || uid).trim().toLowerCase();

  if(!uid) return alert("Önce giriş yap evladım.");
  if(!confirm("Hesabını silmek istiyor musun? Bu işlem geri alınamaz.")) return;

  try{
    let apiToken = await ensureBackendSessionToken();

    const callSet = async (token) => {
      return fetch(`${BASE_DOMAIN}/api/profile/set`, {
        method: "POST",
        headers: {
          "Content-Type":"application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: uid,
          meta: { email, deleted_at: new Date().toISOString() },
          token, access_token: token
        })
      });
    };

    let r = await callSet(apiToken);
    let txt = await r.text().catch(()=> "");

    if(!r.ok && r.status === 401){
      clearApiToken();
      apiToken = await ensureBackendSessionToken();
      r = await callSet(apiToken);
      txt = await r.text().catch(()=> "");
    }

    if(!r.ok){
      console.error("deleteAccount failed:", r.status, txt);
      alert(`Hesap silinemedi. (${r.status})`);
      return;
    }

    localStorage.removeItem(termsKey(email));
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    clearApiToken();

    alert("Hesabın silindi.");
    window.location.href = "/";
  }catch(e){
    console.error("deleteAccount exception:", e);
    alert("Hesap silinemedi. Lütfen tekrar dene.");
  }
}

// --------------------
// AUTH UI
// --------------------
function bindAuthUI(){
  // ✅ FIX: Çift tık / çift bind / bfcache sonrası spam login olmasın
  $("googleLoginBtn") && ($("googleLoginBtn").onclick = async () => {
    const st = getBootState();
    const now = Date.now();

    // 900ms içinde tekrar tıklamayı yut
    if(st.loginInFlight) return;
    if(now - (st.lastLoginAt || 0) < 900) return;

    st.loginInFlight = true;
    st.lastLoginAt = now;

    try{
      await handleLogin("google");
    }finally{
      // küçük gecikme: GSI popup açılırken ikinci click'i engeller
      setTimeout(()=>{ st.loginInFlight = false; }, 1200);
    }
  });

  $("appleLoginBtn") && ($("appleLoginBtn").onclick = () => {
    alert("Evladım Apple daha hazırlanıyor… Şimdilik Google’la gel 🙂");
  });

  $("termsAcceptBtn") && ($("termsAcceptBtn").onclick = async () => {
    if(!$("termsCheck")?.checked) return alert("Onayla evladım.");
    const ok = await acceptTerms();
    if(!ok) return alert("Sözleşme kaydedilemedi.");
    $("termsOverlay")?.classList.remove("active");
    if ($("termsOverlay")) $("termsOverlay").style.display = "none";
    refreshPremiumBars();
  });
}

// --------------------
// NOTIF UI
// --------------------
function bindNotifUI(){
  $("notifBtn") && ($("notifBtn").onclick = () => {
    $("notifDropdown")?.classList.toggle("show");
    if($("notifBadge")) $("notifBadge").style.display = "none";
  });

  document.addEventListener("click", (e)=>{
    const dd = $("notifDropdown");
    if(!dd) return;
    if(e.target?.closest?.("#notifBtn")) return;
    if(e.target?.closest?.("#notifDropdown")) return;
    dd.classList.remove("show");
  });
}

// --------------------
// HISTORY LIST (Hamburger menü)
// --------------------
function renderHistoryList(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list(); // son 10
  listEl.innerHTML = "";

  items.forEach(c => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.setAttribute("data-id", c.id);

    let title = (c.title || "Sohbet").toString();
    title = title.trim().slice(0, 15) || "Sohbet";

    row.innerHTML = `
      <div class="history-title">${title}</div>
      <button class="history-del" aria-label="Sil" title="Sil">
        ${trashSvg()}
      </button>
    `;

    row.addEventListener("click", () => {
      ChatStore.currentId = c.id;
      renderChatFromStore();
      closeMenu();
    });

    row.querySelector(".history-del")?.addEventListener("click", (e) => {
      e.stopPropagation();
      ChatStore.deleteChat(c.id);
      renderHistoryList();
      renderChatFromStore();
    });

    listEl.appendChild(row);
  });
}

// --------------------
// MENU UI
// --------------------
function bindMenuDelegationTo(el){
  if(!el) return;
  el.addEventListener("click", (e)=>{
    const it = e.target?.closest?.(".menu-action");
    if(!it) return;
    handleMenuAction(it.getAttribute("data-action"));
  });
}

function bindMenuUI(){
  $("hambBtn") && ($("hambBtn").onclick = openMenu);
  $("menuOverlay") && ($("menuOverlay").onclick = (e)=>{ if(e.target === $("menuOverlay")) closeMenu(); });

  $("newChatBtn") && ($("newChatBtn").onclick = () => {
    ChatStore.newChat();
    renderChatFromStore();
    renderHistoryList();
    setBrandState(null);
    currentMode = "chat";
    closeMenu();
  });

  // ✅ 3 grid delegation
  bindMenuDelegationTo($("menuAsistan"));
  bindMenuDelegationTo($("menuAstro"));
  bindMenuDelegationTo($("menuKurumsal"));

  // ✅ legacy grid delegation (eski html kalırsa)
  bindMenuDelegationTo($("mainMenu"));

  // ✅ Yeni sohbet altında turuncu profil kısayolu (index.html’de var)
  $("profileShortcutBtn") && ($("profileShortcutBtn").onclick = () => {
    closeMenu();
    goProfile();
  });
}

// --------------------
// COMPOSER
// --------------------
function bindComposer(){
  $("sendBtn") && ($("sendBtn").onclick = ()=> doSend());
  $("msgInput") && ($("msgInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      doSend();
    }
  }));

  $("camBtn") && ($("camBtn").onclick = () => openFalPanel());
}

// --------------------
// BOOT (TEK YER)
// --------------------
document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("premium-ui");

  populateMenuGrid();
  bindMenuUI();
  bindNotifUI();
  bindComposer();
  bindFalUI();
  bindAuthUI();

  // ✅ üst profil ikon
  $("profileBtn") && ($("profileBtn").onclick = () => goProfile());

  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e){}

  // ✅ GSI (tek sefer initAuth) - AbortError önleme
  try{
    await waitForGsi();
    $("loginHint") && ($("loginHint").textContent = "Google hazır. Devam et evladım.");

    const st = getBootState();
    if(!st.authInited){
      st.authInited = true;
      initAuth();
    }
  }catch(e){
    window.showGoogleButtonFallback?.("GSI yüklenemedi");
  }

  // session
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");

  if (logged) {
    $("loginOverlay")?.classList.remove("active");
    $("loginOverlay") && ($("loginOverlay").style.display = "none");
    if (!u.terms_accepted_at) window.showTermsOverlay?.();
  } else {
    $("loginOverlay")?.classList.add("active");
    $("loginOverlay") && ($("loginOverlay").style.display = "flex");
  }

  $("logoutBtn") && ($("logoutBtn").onclick = () => logout());
  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = async () => {
    const u2 = getUser();
    const okLogged = !!(u2?.isSessionActive && u2?.id && u2?.provider && u2?.provider !== "guest");
    if(!okLogged) return alert("Önce giriş yap evladım.");
    await deleteAccount();
  });

  refreshPremiumBars();

  try{
    ChatStore.init();
    renderChatFromStore();
    renderHistoryList();
  }catch(e){}

  setChatVisibilityFromStore();
});

// ✅ bfcache / geri dönüşlerde: UI barlarını güncelle (eksiltme yok, sadece toparlar)
window.addEventListener("pageshow", () => {
  try{ refreshPremiumBars(); }catch(e){}
});
