// js/main.js (FINAL - Single Bind, Pages, Terms Gate, Delete Account via backend token)

import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const API_TOKEN_KEY = "caynana_api_token";

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function firstName(full = "") {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
}

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function getApiToken(){ return (localStorage.getItem(API_TOKEN_KEY) || "").trim(); }
function setApiToken(t){ if(t) localStorage.setItem(API_TOKEN_KEY, t); }
function clearApiToken(){ localStorage.removeItem(API_TOKEN_KEY); }

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

  const name = (u.hitap || firstName(u.fullname) || u.email || "MİSAFİR").toUpperCase();

  const yp = Number((u?.yp_percent ?? 50));
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? name : "MİSAFİR";
}

// --------------------
// MENU
// --------------------
const MENU_ITEMS = [
  { key: "chat",       label: "Sohbet",      sub: "Dertleş",      ico: "💬" },
  { key: "dedikodu",   label: "Dedikodu",    sub: "Özel oda",     ico: "🕵️" },
  { key: "shopping",   label: "Alışveriş",   sub: "Tasarruf et",  ico: "🛍️" },
  { key: "translate",  label: "Tercüman",    sub: "Çeviri",       ico: "🌍" },
  { key: "diet",       label: "Diyet",       sub: "Plan",         ico: "🥗" },
  { key: "health",     label: "Sağlık",      sub: "Danış",        ico: "❤️" },
  { key: "fal",        label: "Kahve Falı",  sub: "Günde 1",      ico: "☕" },
  { key: "tarot",      label: "Tarot",       sub: "Kart seç",     ico: "🃏" },
  { key: "horoscope",  label: "Burç",        sub: "Günlük",       ico: "♈" },
  { key: "dream",      label: "Rüya",        sub: "Yorumla",      ico: "🌙" },

  { key: "hakkimizda", label: "Hakkımızda",  sub: "Biz kimiz?",   ico: "ℹ️" },
  { key: "sss",        label: "SSS",         sub: "Sorular",      ico: "❓" },
  { key: "gizlilik",   label: "Gizlilik",    sub: "Güven",        ico: "🔒" },
  { key: "iletisim",   label: "İletişim",    sub: "Bize yaz",     ico: "✉️" },
  { key: "sozlesme",   label: "Sözleşme",    sub: "Kurallar",     ico: "📄" },
  { key: "uyelik",     label: "Üyelik",      sub: "Detaylar",     ico: "🪪" },
];

function populateMenuGrid() {
  const grid = $("mainMenu");
  if (!grid) return;
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

  if (action === "fal") { openFalPanel(); return; }
  if (action === "tarot") { location.href = "pages/tarot.html"; return; }
  if (action === "horoscope") { location.href = "pages/burc.html"; return; }
  if (action === "dream") { location.href = "pages/ruya.html"; return; }

  if (action === "dedikodu") { await sendForced("Dedikodu modundayız. Anlat bakalım… 😏", "dedikodu"); return; }
  if (action === "shopping") { await sendForced("Alışverişe geçtik. Ne alacaksın?", "shopping"); return; }
  if (action === "translate") { await sendForced("Çeviri: metni yapıştır, dilini söyle.", "trans"); return; }
  if (action === "diet") { await sendForced("Diyet: hedefin ne? kilo mu koruma mı?", "diet"); return; }
  if (action === "health") { await sendForced("Sağlık: ne şikayetin var?", "health"); return; }
  if (action === "chat") { await sendForced("Anlat bakalım evladım.", "chat"); return; }

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

async function sendForced(text, mode="chat") {
  currentMode = mode;
  await doSend(text);
}

async function doSend(forcedText = null) {
  const input = $("msgInput");
  const txt = String(forcedText ?? input?.value ?? "").trim();
  if (!txt) return;

  setBrandState("usering");
  addUserBubble(txt);
  if (input && forcedText === null) input.value = "";

  chatHistory.push({ role: "user", content: txt });

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
  chatHistory.push({ role: "assistant", content: reply });
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
/// 1) backend token al (/api/auth/google)
/// 2) profile/set -> deleted_at
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
          token, access_token: token // backend body’den okuyorsa da yakalasın
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

    // silindi: terms + session temizle
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
  $("googleLoginBtn") && ($("googleLoginBtn").onclick = () => handleLogin("google"));

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
// MENU UI
// --------------------
function bindMenuUI(){
  $("hambBtn") && ($("hambBtn").onclick = openMenu);
  $("menuOverlay") && ($("menuOverlay").onclick = (e)=>{ if(e.target === $("menuOverlay")) closeMenu(); });

  $("newChatBtn") && ($("newChatBtn").onclick = () => {
    closeMenu();
    if ($("chat")) $("chat").innerHTML = "";
    chatHistory = [];
    setBrandState(null);
  });

  $("mainMenu") && ($("mainMenu").onclick = (e)=>{
    const it = e.target?.closest?.(".menu-action");
    if(!it) return;
    handleMenuAction(it.getAttribute("data-action"));
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

  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e){}

  // GSI
  try{
    await waitForGsi();
    $("loginHint") && ($("loginHint").textContent = "Google hazır. Devam et evladım.");
    initAuth();
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

  // tek bind: logout + delete
  $("logoutBtn") && ($("logoutBtn").onclick = () => logout());
  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = async () => {
    const u2 = getUser();
    const okLogged = !!(u2?.isSessionActive && u2?.id && u2?.provider && u2?.provider !== "guest");
    if(!okLogged) return alert("Önce giriş yap evladım.");
    await deleteAccount();
  });

  refreshPremiumBars();
});
