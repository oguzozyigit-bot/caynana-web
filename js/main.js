// js/main.js (FULL FIX - RESTORATION VERSION)
// ✅ ID Uyuşmazlığı Giderildi: "chat" vs "chatArea" sorunu çözüldü.
// ✅ Google Login: Buton bağlantısı sağlamlaştırıldı.
// ✅ Profil Resmi: Google'dan gelen resim "pAvatar" içine işlenir.
// ✅ Veri Kaybı Yok: Eski sohbetlerin duruyor, sadece görünür yapıyoruz.

import { BASE_DOMAIN, STORAGE_KEY } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { ChatStore } from "./chat_store.js";

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
  if(!token) throw new Error("auth/google token not found");
  setApiToken(token);
  return token;
}

// --------------------
// GLOBAL HOOKS
// --------------------
window.enterApp = () => {
  const lo = $("loginOverlay");
  if(lo) { lo.classList.remove("active"); lo.style.display = "none"; }
  refreshPremiumBars();
};

window.showTermsOverlay = () => {
  const to = $("termsOverlay");
  if(to) { to.classList.add("active"); to.style.display = "flex"; }
};

window.showGoogleButtonFallback = (reason = "unknown") => {
  const hint = $("loginHint");
  if (hint) hint.textContent = `Google yanıt vermedi (${reason}). Yenile.`;
};

// --------------------
// UI STATE (PROFIL RESMİ TAMİRİ)
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
  document.body.classList.toggle("is-logged", logged);

  const fullName = (u.fullname || u.name || u.display_name || "Misafir").trim();
  const shortName = fullName.split(/\s+/)[0].toUpperCase();

  // Üst Bar İsmi
  const bw = $("brandWrapper"); // eski tasarım
  if (bw) bw.dataset.user = logged ? shortName : "MİSAFİR";

  // Samimiyet Barı
  const yp = Number((u?.yp_percent ?? 19));
  const p = Math.max(5, Math.min(100, yp));
  if ($("spVal")) $("spVal").textContent = `${p}%`;
  if ($("spFill")) $("spFill").style.width = `${p}%`;
  if ($("ypNum")) $("ypNum").textContent = `${p}%`; // fallback
  if ($("ypFill")) $("ypFill").style.width = `${p}%`; // fallback

  // ✅ Profil Kartı (Avatar + İsim)
  const pNameEl = $("pName");
  const pAvatarEl = $("pAvatar"); // yeni tasarım
  const profileShortcutName = $("profileShortcutName"); // eski tasarım
  const profileShortcutIco = $("profileShortcutIco"); // eski tasarım

  // İsim güncelle
  if(pNameEl) pNameEl.textContent = logged ? fullName : "Misafir";
  if(profileShortcutName) profileShortcutName.textContent = logged ? fullName : "—";

  // Avatar güncelle
  const pic = (u.picture || u.avatar || u.avatar_url || u.photo_url || "").trim();
  const imgTag = `<img src="${pic}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="u">`;

  if(pAvatarEl){
    if(logged && pic) { pAvatarEl.innerHTML = imgTag; pAvatarEl.style.fontSize = "0"; }
    else { pAvatarEl.innerHTML = "👤"; pAvatarEl.style.fontSize = "20px"; }
  }
  if(profileShortcutIco){
    if(logged && pic) { profileShortcutIco.innerHTML = imgTag; }
    else { profileShortcutIco.innerHTML = "👤"; }
  }
}

// --------------------
// CHAT & UI HELPERS (DÜZELTİLDİ: ID ÇAKIŞMASI GİDERİLDİ)
// --------------------
function getChatElement(){
  // Hem yeni (chatArea) hem eski (chat) ID'yi destekle
  return $("chatArea") || $("chat");
}

function ensureChatVisible(){
  const el = getChatElement();
  if(!el) return;
  el.style.display = "block"; // veya flex
  el.classList.remove("chat-empty");
  // Yeni tasarımda empty-msg divi varsa gizle
  const empty = el.querySelector(".empty-msg");
  if(empty) empty.style.display = "none";
}

function isNearBottom(el, slack = 80){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch(e){ return true; }
}

function trashSvg(){
  return `<svg class="ico-trash" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
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
function openMenu() { 
  $("menuOverlay")?.classList.add("open"); 
  $("menuOverlay")?.classList.add("active"); // fallback
}
function closeMenu() { 
  $("menuOverlay")?.classList.remove("open"); 
  $("menuOverlay")?.classList.remove("active"); // fallback
}

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

function renderChatFromStore(){
  const chatEl = getChatElement();
  if(!chatEl) return;

  const follow = isNearBottom(chatEl);
  
  // İçeriği temizle ama empty-msg yapısını korumak için innerHTML sıfırlanabilir,
  // eğer boşsa tekrar eklenir.
  chatEl.innerHTML = "";
  
  let h = [];
  try { h = ChatStore.history() || []; } catch(e){ h = []; }

  if(h.length === 0) {
    chatEl.innerHTML = `<div class="empty-msg" style="text-align:center;margin-top:40%;color:#555;">Kaynana burada evladım...<br>Hadi bir şeyler yaz.</div>`;
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

  // User Bubble
  const uBub = document.createElement("div");
  uBub.className = "bubble user";
  uBub.textContent = txt;
  const chatEl = getChatElement();
  chatEl.appendChild(uBub);
  
  if (input && forcedText === null) input.value = "";
  chatEl.scrollTop = chatEl.scrollHeight;

  storeAddOnce("user", txt);
  ensureTitleOnFirstUserMessage(txt);
  renderHistoryList(); // Listeyi güncelle (başlık değişebilir)

  // Loading
  const holder = document.createElement("div");
  holder.className = "bubble bot loading";
  holder.textContent = "…";
  chatEl.appendChild(holder);
  chatEl.scrollTop = chatEl.scrollHeight;

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const hist = (ChatStore.history() || []).map(m => ({ role: m.role, content: m.content }));
    const out = await fetchTextResponse(txt, currentMode, hist);
    reply = out?.text || reply;
  } catch (e) {}

  try { holder.remove(); } catch (e) {}

  // Bot Bubble
  const bBub = document.createElement("div");
  bBub.className = "bubble bot";
  bBub.textContent = reply;
  chatEl.appendChild(bBub);
  
  chatEl.scrollTop = chatEl.scrollHeight;
  storeAddOnce("assistant", reply);
}

// --------------------
// HISTORY LIST (Sidebar)
// --------------------
function renderHistoryList(){
  const listEl = $("historyList"); // Eski tasarım için
  if(!listEl) return; // Yeni tasarımda yoksa hata vermesin

  const items = ChatStore.list(); 
  listEl.innerHTML = "";

  items.forEach(c => {
    const row = document.createElement("div");
    row.className = "history-row"; // CSS'te bu class olmalı
    
    let title = (c.title || "Sohbet").toString().trim().slice(0, 15) || "Sohbet";
    row.innerHTML = `<div>${title}</div><div class="del-btn">${trashSvg()}</div>`;
    
    // Tıklayınca sohbeti aç
    row.onclick = () => {
      ChatStore.currentId = c.id;
      renderChatFromStore();
      closeMenu();
    };
    
    // Silme butonu
    const delBtn = row.querySelector(".del-btn");
    if(delBtn) delBtn.onclick = (e) => {
      e.stopPropagation();
      ChatStore.deleteChat(c.id);
      renderHistoryList();
      renderChatFromStore();
    };

    listEl.appendChild(row);
  });
}

// --------------------
// DELETE ACCOUNT
// --------------------
async function deleteAccount(){
  const u0 = getUser();
  if(!u0?.id) return alert("Önce giriş yap evladım.");
  if(!confirm("Hesabını silmek istiyor musun?")) return;

  try{
    let apiToken = await ensureBackendSessionToken();
    await fetch(`${BASE_DOMAIN}/api/profile/set`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": `Bearer ${apiToken}` },
      body: JSON.stringify({ user_id: u0.id, meta: { deleted_at: new Date().toISOString() } })
    });
    
    localStorage.clear();
    location.reload();
  }catch(e){
    alert("Hata oluştu.");
  }
}

// --------------------
// BINDINGS
// --------------------
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
  if(aBtn) aBtn.onclick = () => alert("Apple yakında geliyor.");

  // Terms Button
  const tBtn = $("termsAcceptBtn");
  if(tBtn) tBtn.onclick = async () => {
    if(!$("termsCheck")?.checked) return alert("Onayla evladım.");
    if(await acceptTerms()){
      $("termsOverlay")?.classList.remove("active");
      $("termsOverlay").style.display = "none";
      refreshPremiumBars();
    }
  };
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

  // Profil Kısayol (id=profileBtn veya profileShortcutBtn)
  const pBtn = $("profileBtn") || $("profileShortcutBtn");
  if(pBtn) pBtn.onclick = () => { closeMenu(); goProfile(); };

  // Footer Linkleri
  document.querySelectorAll(".sub-link").forEach(link => {
    link.addEventListener("click", () => {
      if(link.innerText.includes("Çıkış")) logout();
      if(link.innerText.includes("Sil")) deleteAccount();
    });
  });
  
  // Menu Item Click
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
      const txt = item.querySelector(".m-text")?.innerText?.trim();
      closeMenu();
      if(txt === "Hakkımızda") goPage("hakkimizda");
      else if(txt === "İletişim") goPage("iletisim");
      else if(txt === "Diyet" || txt === "Plan") goDiet();
      else if(txt === "Kahve Falı") openFalPanel();
      else if(txt === "Sohbet") currentMode = "chat";
      // ...
    });
  });
}

function bindComposer(){
  $("sendBtn") && ($("sendBtn").onclick = ()=> doSend());
  $("msgInput") && ($("msgInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
  }));
  $("camBtn") && ($("camBtn").onclick = () => openFalPanel());
  
  // Fal paneli kapatma
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());
  const fi = $("falInput");
  if (fi) fi.onchange = () => handleFalPhoto(fi);
}

// --------------------
// BOOT
// --------------------
document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("premium-ui");

  bindMenuUI();
  bindComposer();
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
  }catch(e){}

  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");

  const lo = $("loginOverlay");
  const to = $("termsOverlay");

  if (logged) {
    if(lo) { lo.classList.remove("active"); lo.style.display = "none"; }
    if (!u.terms_accepted_at && to) { to.classList.add("active"); to.style.display = "flex"; }
  } else {
    if(lo) { lo.classList.add("active"); lo.style.display = "flex"; }
  }

  refreshPremiumBars();

  try{
    ChatStore.init();
    renderChatFromStore();
    renderHistoryList();
  }catch(e){}
});

window.addEventListener("pageshow", () => {
  try{ refreshPremiumBars(); }catch(e){}
});
