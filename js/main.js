// js/main.js (FINAL - Single Bind, Pages, Terms Gate, Delete Account via backend token)
// + ChatStore sohbet listesi + kalıcı hafıza (son 10) + menüden geçiş/silme
// ✅ max 15 karakter başlık
// ✅ diyet menüsü ayrı sayfa: /pages/diyet.html
// ✅ yarım kalan "loginOverlay active" satırı FIX
// ✅ logout sonrası sağda sözleşme/overlay kalma FIX

import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { ChatStore } from "./chat_store.js";

const $ = (id) => document.getElementById(id);
const API_TOKEN_KEY = "caynana_api_token";

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}
function getApiToken(){ return (localStorage.getItem(API_TOKEN_KEY) || "").trim(); }
function setApiToken(t){ if(t) localStorage.setItem(API_TOKEN_KEY, t); }
function clearApiToken(){ localStorage.removeItem(API_TOKEN_KEY); }

function getBootState(){
  if(!window.__CAYNANA_BOOT__) window.__CAYNANA_BOOT__ = {
    gsiReady: false,
    authInited: false,
    loginInFlight: false,
    lastLoginAt: 0
  };
  return window.__CAYNANA_BOOT__;
}

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

/* ✅ Çıkış / logged değilken: sağda sözleşme kalmasın, menü/overlay açık kalmasın */
function forceCloseAllOverlays(){
  const ids = ["termsOverlay","pageOverlay","menuOverlay","notifDropdown"];
  ids.forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.classList.remove("active","open","show");
    if(id !== "notifDropdown") el.style.display = "none";
  });
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

  const yp = Number((u?.yp_percent ?? 19));
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? name : "MİSAFİR";
}

// --------------------
// SMALL UI HELPERS
// --------------------
function isNearBottom(el, slack = 80){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch(e){ return true; }
}

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
  return s.slice(0, 15); // ✅ 15 karakter
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

// ✅ NAV
function goProfile(){ location.href = "/pages/profil.html"; }
function goDiet(){ location.href = "/pages/diyet.html"; }

// --------------------
// MENU (3 BLOK)
// --------------------
const MENU_ITEMS = [
  // ASISTAN
  { key: "chat",       label: "Sohbet",      ico: "💬", group:"asistan" },
  { key: "dedikodu",   label: "Dedikodu",    ico: "🕵️", group:"asistan" },
  { key: "shopping",   label: "Alışveriş",   ico: "🛍️", group:"asistan" },
  { key: "translate",  label: "Tercüman",    ico: "🌍", group:"asistan" },
  { key: "diet",       label: "Diyet",       ico: "🥗", group:"asistan" },
  { key: "health",     label: "Sağlık",      ico: "❤️", group:"asistan" },

  // ASTRO
  { key: "fal",        label: "Kahve Falı",  ico: "☕", group:"astro" },
  { key: "tarot",      label: "Tarot",       ico: "🃏", group:"astro" },
  { key: "horoscope",  label: "Burç",        ico: "♈", group:"astro" },
  { key: "dream",      label: "Rüya",        ico: "🌙", group:"astro" },

  // KURUMSAL
  { key: "profile",    label: "Profil Düzenle", ico: "👤", group:"kurumsal", tone:"orange" },
  { key: "hakkimizda", label: "Hakkımızda",  ico: "ℹ️", group:"kurumsal" },
  { key: "sss",        label: "SSS",         ico: "❓", group:"kurumsal" },
  { key: "gizlilik",   label: "Gizlilik",    ico: "🔒", group:"kurumsal" },
  { key: "iletisim",   label: "İletişim",    ico: "✉️", group:"kurumsal" },
  { key: "sozlesme",   label: "Sözleşme",    ico: "📄", group:"kurumsal" },
  { key: "uyelik",     label: "Üyelik",      ico: "🪪", group:"kurumsal" },
];

function menuItemHtml(m){
  return `
    <div class="menu-action ${m.tone ? `tone-${m.tone}` : ""}" data-action="${m.key}">
      <div class="ico">${m.ico}</div>
      <div><div>${m.label}</div></div>
    </div>
  `;
}

function populateMenuGrid() {
  const gA = $("menuAsistan");
  const gB = $("menuAstro");
  const gC = $("menuKurumsal");
  if(!gA || !gB || !gC) return;

  gA.innerHTML = MENU_ITEMS.filter(x => x.group === "asistan").map(menuItemHtml).join("");
  gB.innerHTML = MENU_ITEMS.filter(x => x.group === "astro").map(menuItemHtml).join("");
  gC.innerHTML = MENU_ITEMS.filter(x => x.group === "kurumsal").map(menuItemHtml).join("");
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

  if (["hakkimizda","iletisim","gizlilik","sozlesme","sss","uyelik"].includes(action)) return goPage(action);
  if (action === "profile") return goProfile();
  if (action === "diet") return goDiet();

  if (action === "fal") return openFalPanel();
  if (action === "tarot") return (location.href = "/pages/tarot.html");
  if (action === "horoscope") return (location.href = "/pages/burc.html");
  if (action === "dream") return (location.href = "/pages/ruya.html");

  currentMode = action || "chat";
}

// --------------------
// CHAT
// --------------------
let currentMode = "chat";

function renderChatFromStore(){
  const chatEl = $("chat");
  if(!chatEl) return;

  const follow = isNearBottom(chatEl);

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

  if(follow) chatEl.scrollTop = chatEl.scrollHeight;
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

  addUserBubble(txt);
  if (input && forcedText === null) input.value = "";

  storeAddOnce("user", txt);
  ensureTitleOnFirstUserMessage(txt);
  renderHistoryList();

  const holder = document.createElement("div");
  holder.className = "bubble bot loading";
  holder.textContent = "…";
  $("chat")?.appendChild(holder);

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const hist = (ChatStore.history() || []).map(m => ({ role: m.role, content: m.content }));
    const out = await fetchTextResponse(txt, currentMode, hist);
    reply = out?.text || reply;
  } catch (e) {}

  try { holder.remove(); } catch (e) {}

  typeWriter(reply, "chat");
  storeAddOnce("assistant", reply);
}

// --------------------
// FAL
// --------------------
function bindFalUI(){
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());
  const fi = $("falInput");
  if (fi) fi.onchange = () => handleFalPhoto(fi);
}

// --------------------
// DELETE ACCOUNT
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
    if(!r.ok && r.status === 401){
      clearApiToken();
      apiToken = await ensureBackendSessionToken();
      r = await callSet(apiToken);
    }

    if(!r.ok){
      alert("Hesap silinemedi.");
      return;
    }

    localStorage.removeItem(termsKey(email));
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    clearApiToken();

    alert("Hesabın silindi.");
    window.location.href = "/";
  }catch(e){
    alert("Hesap silinemedi. Lütfen tekrar dene.");
  }
}

// --------------------
// AUTH UI
// --------------------
function bindAuthUI(){
  $("googleLoginBtn") && ($("googleLoginBtn").onclick = async () => {
    const st = getBootState();
    const now = Date.now();
    if(st.loginInFlight) return;
    if(now - (st.lastLoginAt || 0) < 900) return;

    st.loginInFlight = true;
    st.lastLoginAt = now;

    try{
      await handleLogin("google");
    }finally{
      setTimeout(()=>{ st.loginInFlight = false; }, 1200);
    }
  });

  $("appleLoginBtn") && ($("appleLoginBtn").onclick = () => {
    alert("Apple girişi hazırlanıyor. Google ile giriş yapabilirsiniz.\nÜyelik ücretsizdir.");
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
// HISTORY LIST
// --------------------
function renderHistoryList(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list();
  listEl.innerHTML = "";

  items.forEach(c => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.setAttribute("data-id", c.id);

    let title = (c.title || "Sohbet").toString().trim().slice(0, 15) || "Sohbet";

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
    currentMode = "chat";
    closeMenu();
  });

  bindMenuDelegationTo($("menuAsistan"));
  bindMenuDelegationTo($("menuAstro"));
  bindMenuDelegationTo($("menuKurumsal"));

  $("profileShortcutBtn") && ($("profileShortcutBtn").onclick = () => {
    closeMenu();
    goProfile();
  });

  // ✅ ÇIKIŞ: önce overlayleri kapat sonra logout
  $("logoutBtn") && ($("logoutBtn").onclick = () => {
    forceCloseAllOverlays();
    logout();
  });

  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = async () => {
    const u2 = getUser();
    const okLogged = !!(u2?.isSessionActive && u2?.id && u2?.provider && u2?.provider !== "guest");
    if(!okLogged) return alert("Önce giriş yap evladım.");
    await deleteAccount();
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
// BOOT
// --------------------
document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("premium-ui");

  populateMenuGrid();
  bindMenuUI();
  bindNotifUI();
  bindComposer();
  bindFalUI();
  bindAuthUI();

  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e){}

  // GSI
  try{
    await waitForGsi();
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
    if ($("loginOverlay")) $("loginOverlay").style.display = "none";
    if (!u.terms_accepted_at) window.showTermsOverlay?.();
  } else {
    // ✅ logged değilken: terms/page/menu/notif açık kalmasın
    forceCloseAllOverlays();
    const lo = $("loginOverlay");
    lo?.classList.add("active");
    if (lo) lo.style.display = "flex";
  }

  refreshPremiumBars();

  try{
    ChatStore.init();
    renderChatFromStore();
    renderHistoryList();
  }catch(e){}

  setChatVisibilityFromStore();
});

window.addEventListener("pageshow", () => {
  try{ refreshPremiumBars(); }catch(e){}
});
