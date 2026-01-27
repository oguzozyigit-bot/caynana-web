// js/main.js (FINAL - AUTO FIX VERSION)
// ✅ Zombie Session Fix: Eski/Bozuk oturum varsa otomatik temizler ve giriş ekranını getirir.
// ✅ Profil ve Giriş Koruması: Veri bütünlüğünü kontrol eder.

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

// --------------------
// ✅ GSI / AUTH BOOT STATE
// --------------------
function getBootState(){
  if(!window.CAYNANA_BOOT) window.CAYNANA_BOOT = {
    gsiReady: false,
    authInited: false,
    loginInFlight: false,
    lastLoginAt: 0
  };
  return window.CAYNANA_BOOT;
}

// --- Backend Token ---
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

  const token = (data.token || data.access_token || data.api_token || "").trim();
  if(!token) throw new Error("Token not found");
  
  setApiToken(token);
  return token;
}

// --------------------
// GLOBAL HOOKS
// --------------------
window.enterApp = () => {
  $("loginOverlay")?.classList.remove("active");
  refreshPremiumBars();
};

window.showTermsOverlay = () => {
  $("termsOverlay")?.classList.add("active");
};

window.showGoogleButtonFallback = (reason = "unknown") => {
  const hint = $("loginHint");
  if (hint) hint.textContent = `Google servisi yanıt vermedi (${reason}). Yenileyin.`;
};

// --------------------
// UI STATE (PROFIL RESMİ + İSMİ)
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  // Guest kontrolünü sıkılaştırdık
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
  
  document.body.classList.toggle("is-logged", logged);

  // İsim (Bozuksa Misafir dön)
  const fullName = (u.fullname || u.name || u.display_name || "Misafir").trim();
  const firstName = fullName.split(/\s+/)[0].toUpperCase();
  
  // Üst Bar (Varsa)
  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? firstName : "MİSAFİR";

  // Samimiyet Barı
  const yp = Number((u?.yp_percent ?? 19));
  const p = Math.max(5, Math.min(100, yp));
  if ($("spVal")) $("spVal").textContent = `${p}%`;
  if ($("spFill")) $("spFill").style.width = `${p}%`;
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  // ✅ Profil Kartı (Sidebar)
  const pNameEl = $("pName");
  const pAvatarEl = $("pAvatar");
  const pic = (u.picture || u.avatar || u.avatar_url || u.photo_url || "").trim();

  if(pNameEl) pNameEl.textContent = logged ? fullName : "Misafir";
  
  if(pAvatarEl){
    if(logged && pic){
      pAvatarEl.innerHTML = `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;" alt="user">`;
      pAvatarEl.style.fontSize = "0"; 
    } else {
      pAvatarEl.innerHTML = "👤";
      pAvatarEl.style.fontSize = "20px";
    }
  }
}

// --------------------
// CHAT & UI HELPERS
// --------------------
function setChatVisibilityFromStore(){
  const chatEl = $("chatArea");
  if(!chatEl) return;
  // Yeni tasarımda chat hep görünür, placeholder var
}

function ensureChatVisible(){
  const chatEl = $("chatArea");
  if(chatEl) {
    const emptyMsg = chatEl.querySelector(".empty-msg");
    if(emptyMsg) emptyMsg.style.display = "none";
  }
}

function isNearBottom(el, slack = 80){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch(e){ return true; }
}

function makeChatTitleFromFirstMsg(text=""){
  const s = String(text || "").trim().replace(/\s+/g, " ");
  return s ? s.slice(0, 15) : "Sohbet";
}

function trySetChatTitle(title){
  try{
    if(typeof ChatStore.setTitle === "function") ChatStore.setTitle(ChatStore.currentId, title);
    else if(typeof ChatStore.renameChat === "function") ChatStore.renameChat(ChatStore.currentId, title);
  }catch(e){}
}

function ensureTitleOnFirstUserMessage(userText){
  try{
    const list = ChatStore.list?.() || [];
    const cur = list.find(x => x.id === ChatStore.currentId);
    if(!String(cur?.title || "").trim()){
      trySetChatTitle(makeChatTitleFromFirstMsg(userText));
    }
  }catch(e){}
}

function goProfile(){ location.href = "/pages/profil.html"; }
function goDiet(){ location.href = "/pages/diyet.html"; }

// --------------------
// MENU MANAGEMENT
// --------------------
function openMenu() { $("menuOverlay")?.classList.add("active"); }
function closeMenu() { $("menuOverlay")?.classList.remove("active"); }

function goPage(key){
  const map = {
    hakkimizda: "/pages/hakkimizda.html",
    iletisim:   "/pages/iletisim.html",
    gizlilik:   "/pages/gizlilik.html",
    sozlesme:   "/pages/sozlesme.html",
    sss:        "/pages/sss.html",
    uyelik:     "/pages/uyelik.html",
  };
  if(map[key]) location.href = map[key];
}

// --------------------
// CHAT LOGIC
// --------------------
let currentMode = "chat";

function syncFromStore(){} // Placeholder if needed

function renderChatFromStore(){
  const chatEl = $("chatArea");
  if(!chatEl) return;

  const follow = isNearBottom(chatEl);
  chatEl.innerHTML = "";
  
  let h = [];
  try { h = ChatStore.history() || []; } catch(e){ h = []; }

  if(h.length === 0) {
    chatEl.innerHTML = `<div class="empty-msg">Kaynana burada evladım...<br>Hadi bir şeyler yaz da laflayalım.</div>`;
    return;
  }

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
}

function storeAddOnce(role, content){
  try{
    const h = ChatStore.history() || [];
    const last = h[h.length - 1];
    const r = String(role || "").toLowerCase();
    if(last && String(last.role).toLowerCase() === r && String(last.content) === content) return;
    ChatStore.add(r, content);
  }catch(e){
    try{ ChatStore.add(role, content); }catch(_){}
  }
}

async function doSend(forcedText = null) {
  const input = $("msgInput");
  const txt = String(forcedText ?? input?.value ?? "").trim();
  if (!txt) return;

  ensureChatVisible();

  // User UI
  const uBub = document.createElement("div");
  uBub.className = "bubble user";
  uBub.textContent = txt;
  $("chatArea").appendChild(uBub);
  
  if (input && forcedText === null) input.value = "";
  $("chatArea").scrollTop = $("chatArea").scrollHeight;

  storeAddOnce("user", txt);
  ensureTitleOnFirstUserMessage(txt);

  // Loading UI
  const holder = document.createElement("div");
  holder.className = "bubble bot loading";
  holder.textContent = "…";
  $("chatArea")?.appendChild(holder);
  $("chatArea").scrollTop = $("chatArea").scrollHeight;

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const hist = (ChatStore.history() || []).map(m => ({ role: m.role, content: m.content }));
    const out = await fetchTextResponse(txt, currentMode, hist);
    reply = out?.text || reply;
  } catch (e) {}

  try { holder.remove(); } catch (e) {}

  // Bot UI
  const bBub = document.createElement("div");
  bBub.className = "bubble bot";
  // Eğer typeWriter varsa (chat.js'den gelen), onu kullanabiliriz ama basitlik için direct basıyoruz
  bBub.textContent = reply;
  $("chatArea").appendChild(bBub);
  
  $("chatArea").scrollTop = $("chatArea").scrollHeight;
  storeAddOnce("assistant", reply);
}

// --------------------
// UI BINDINGS
// --------------------
function bindFalUI(){
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());
  const fi = $("falInput");
  if (fi) fi.onchange = () => handleFalPhoto(fi);
}

async function deleteAccount(){
  const u0 = getUser();
  if(!u0?.id) return alert("Önce giriş yap evladım.");
  if(!confirm("Hesabını silmek istiyor musun?")) return;

  try{
    let apiToken = await ensureBackendSessionToken();
    const r = await fetch(`${BASE_DOMAIN}/api/profile/set`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": `Bearer ${apiToken}` },
      body: JSON.stringify({ user_id: u0.id, meta: { deleted_at: new Date().toISOString() } })
    });
    
    if(!r.ok) throw new Error("Silinemedi");
    
    localStorage.clear();
    location.reload();
  }catch(e){
    alert("Hata oluştu.");
  }
}

function bindAuthUI(){
  // Google Button
  const gBtn = $("googleLoginBtn");
  if(gBtn) gBtn.onclick = async () => {
    const st = getBootState();
    if(st.loginInFlight) return;
    st.loginInFlight = true;
    try{ await handleLogin("google"); }
    finally{ setTimeout(()=>{ st.loginInFlight = false; }, 1000); }
  };

  // Apple Button
  const aBtn = document.querySelector(".auth-btn.apple");
  if(aBtn) aBtn.onclick = () => alert("Apple yakında geliyor evladım.");

  // Terms Button
  $("termsAcceptBtn") && ($("termsAcceptBtn").onclick = async () => {
    if(!$("termsCheck")?.checked) return alert("Onayla evladım.");
    if(await acceptTerms()){
      $("termsOverlay")?.classList.remove("active");
      refreshPremiumBars();
    }
  });
}

function bindMenuUI(){
  $("hambBtn") && ($("hambBtn").onclick = openMenu);
  $("menuOverlay") && ($("menuOverlay").onclick = (e)=>{ if(e.target === $("menuOverlay")) closeMenu(); });

  $("newChatBtn") && ($("newChatBtn").onclick = () => {
    ChatStore.newChat();
    renderChatFromStore();
    currentMode = "chat";
    closeMenu();
  });

  $("profileBtn") && ($("profileBtn").onclick = () => { closeMenu(); goProfile(); });

  // Menu items click
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const txt = item.querySelector(".m-text")?.innerText?.trim();
      closeMenu();
      if(txt === "Sohbet") currentMode = "chat";
      else if(txt === "Gıybet Modu") currentMode = "dedikodu";
      else if(txt === "Kahve Falı") openFalPanel();
      else if(txt === "Diyet") goDiet();
      else if(txt === "Hakkımızda") goPage("hakkimizda");
      else if(txt === "İletişim") goPage("iletisim");
      // ... diğer linkler
    });
  });

  // Footer links
  document.querySelectorAll(".sub-link").forEach(link => {
    link.addEventListener("click", () => {
      if(link.innerText.includes("Çıkış")) { logout(); }
      if(link.innerText.includes("Sil")) { deleteAccount(); }
    });
  });
}

function bindComposer(){
  $("sendBtn") && ($("sendBtn").onclick = ()=> doSend());
  $("msgInput") && ($("msgInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
  }));
  $("camBtn") && ($("camBtn").onclick = () => openFalPanel());
}

// --------------------
// BOOTSTRAP (KENDİNİ ONARAN BAŞLANGIÇ)
// --------------------
document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("premium-ui");

  // 1. UI Bindings
  bindMenuUI();
  bindComposer();
  bindFalUI();
  bindAuthUI();

  // 2. Bildirimler
  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e){}

  // 3. GSI Init (Google)
  try{
    await waitForGsi();
    const st = getBootState();
    if(!st.authInited){
      st.authInited = true;
      initAuth(); // Bu fonksiyon auth.js içinde, Google prompt'unu hazırlar
    }
  }catch(e){}

  // 4. SESSION KONTROL & AUTO-FIX
  const u = getUser();
  // Basit session kontrolü
  const hasSession = !!(u?.isSessionActive);
  // Veri bütünlüğü kontrolü (Adı yoksa bozuktur)
  const isDataValid = !!(u?.fullname || u?.name || u?.display_name);

  if (hasSession) {
    if (!isDataValid) {
      console.warn("⚠️ Bozuk oturum tespit edildi. Otomatik çıkış yapılıyor...");
      logout(); // Veri bozuksa temizle ve reload et -> Giriş ekranı gelir
      return;
    }
    // Her şey yolundaysa Login ekranını kaldır
    $("loginOverlay")?.classList.remove("active");
    if (!u.terms_accepted_at) window.showTermsOverlay?.();
  } else {
    // Oturum yoksa Login ekranını göster
    $("loginOverlay")?.classList.add("active");
  }

  refreshPremiumBars();

  // 5. Chat Geçmişi Yükle
  try{
    ChatStore.init();
    renderChatFromStore();
  }catch(e){}
});

window.addEventListener("pageshow", () => {
  try{ refreshPremiumBars(); }catch(e){}
});
