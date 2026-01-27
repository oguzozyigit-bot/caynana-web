// js/main.js (FINAL - Menu restore + icons + 3 blocks + history trash + diet page + stable auth)



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



function getBootState(){

  if(!window.__CAYNANA_BOOT__) window.__CAYNANA_BOOT__ = {

    authInited:false,

    loginInFlight:false,

    lastLoginAt:0

  };

  return window.__CAYNANA_BOOT__;

}



function refreshPremiumBars(){

  const u = getUser();

  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");



  // Samimiyet

  const yp = Number(u?.yp_percent ?? 19);

  const p = Math.max(5, Math.min(100, yp));

  if ($("ypNum")) $("ypNum").textContent = `${p}%`;

  if ($("ypFill")) $("ypFill").style.width = `${p}%`;



  // Menü profil kısayolu: isim + avatar (index.html içindeki id’lerle uyumlu)

  try{

    const full = (u.fullname || u.name || u.display_name || "").trim();

    const pic  = (u.picture || u.avatar || u.avatar_url || u.photo_url || "").trim();



    const nm = $("profileShortcutName");

    if(nm) nm.textContent = full || "—";



    const ico = $("profileShortcutIco");

    if(ico){

      if(pic) ico.innerHTML = `<img src="${pic}" alt="avatar">`;

      else ico.textContent = "👤";

    }

  }catch(e){}

}



// ---------- Chat helpers ----------

function isNearBottom(el, slack = 80){

  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }

  catch{ return true; }

}



function ensureChatVisible(){

  const chatEl = $("chat");

  if(!chatEl) return;

  chatEl.style.display = "block";

  chatEl.classList.remove("chat-empty");

}



function setChatVisibilityFromStore(){

  const chatEl = $("chat");

  if(!chatEl) return;



  let h = [];

  try{ h = ChatStore.history() || []; }catch(e){ h = []; }



  if(!h || h.length === 0){

    chatEl.style.display = "none";

    chatEl.classList.add("chat-empty");

  }else{

    chatEl.style.display = "block";

    chatEl.classList.remove("chat-empty");

  }

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



// ---------- NAV ----------

function goProfile(){ location.href = "/pages/profil.html"; }

function goDiet(){ location.href = "/pages/diyet.html"; }



// ---------- MENU ITEMS (3 blok) ----------

const MENU_ITEMS = [

  // ASİSTAN

  { key:"chat",      label:"Sohbet",     ico:"💬", group:"asistan" },

  { key:"dedikodu",  label:"Dedikodu",   ico:"🕵️", group:"asistan" },

  { key:"shopping",  label:"Alışveriş",  ico:"🛍️", group:"asistan" },

  { key:"translate", label:"Tercüman",   ico:"🌍", group:"asistan" },

  { key:"diet",      label:"Diyet",      ico:"🥗", group:"asistan" },

  { key:"health",    label:"Sağlık",     ico:"❤️", group:"asistan" },



  // ASTRO

  { key:"fal",       label:"Kahve Falı", ico:"☕", group:"astro" },

  { key:"tarot",     label:"Tarot",      ico:"🃏", group:"astro" },

  { key:"horoscope", label:"Burç",       ico:"♈", group:"astro" },

  { key:"dream",     label:"Rüya",       ico:"🌙", group:"astro" },



  // KURUMSAL

  { key:"profile",   label:"Profil Düzenle", ico:"👤", group:"kurumsal", tone:"orange" },

  { key:"hakkimizda",label:"Hakkımızda", ico:"ℹ️", group:"kurumsal" },

  { key:"sss",       label:"SSS",        ico:"❓", group:"kurumsal" },

  { key:"gizlilik",  label:"Gizlilik",   ico:"🔒", group:"kurumsal" },

  { key:"iletisim",  label:"İletişim",   ico:"✉️", group:"kurumsal" },

  { key:"sozlesme",  label:"Sözleşme",   ico:"📄", group:"kurumsal" },

  { key:"uyelik",    label:"Üyelik",     ico:"🪪", group:"kurumsal" },

];



function menuItemHtml(m){

  // small satırı index.html’de CSS ile saklı zaten, yine de DOM bozulmasın diye koymuyoruz

  return `

    <div class="menu-action ${m.tone ? `tone-${m.tone}` : ""}" data-action="${m.key}">

      <div class="ico">${m.ico}</div>

      <div><div>${m.label}</div></div>

    </div>

  `;

}



function populateMenuGrid(){

  const gA = $("menuAsistan");

  const gB = $("menuAstro");

  const gC = $("menuKurumsal");

  if(!gA || !gB || !gC) return;



  gA.innerHTML = MENU_ITEMS.filter(x=>x.group==="asistan").map(menuItemHtml).join("");

  gB.innerHTML = MENU_ITEMS.filter(x=>x.group==="astro").map(menuItemHtml).join("");

  gC.innerHTML = MENU_ITEMS.filter(x=>x.group==="kurumsal").map(menuItemHtml).join("");

}



// ---------- MENU OPEN/CLOSE ----------

function openMenu(){ $("menuOverlay")?.classList.add("open"); }

function closeMenu(){ $("menuOverlay")?.classList.remove("open"); }



function goPage(key){

  const map = {

    hakkimizda:"/pages/hakkimizda.html",

    iletisim:"/pages/iletisim.html",

    gizlilik:"/pages/gizlilik.html",

    sozlesme:"/pages/sozlesme.html",

    sss:"/pages/sss.html",

    uyelik:"/pages/uyelik.html",

  };

  if(map[key]) location.href = map[key];

}



async function handleMenuAction(action){

  closeMenu();



  if (["hakkimizda","iletisim","gizlilik","sozlesme","sss","uyelik"].includes(action)) return goPage(action);

  if (action === "profile") return goProfile();

  if (action === "diet") return goDiet();



  if (action === "fal") return openFalPanel();

  if (action === "tarot") return (location.href = "/pages/tarot.html");

  if (action === "horoscope") return (location.href = "/pages/burc.html");

  if (action === "dream") return (location.href = "/pages/ruya.html");



  // sohbet modları (tek sayfada)

  currentMode = action || "chat";

}



// ---------- HISTORY ----------

function renderHistoryList(){

  const listEl = $("historyList");

  if(!listEl) return;



  const items = ChatStore.list();

  listEl.innerHTML = "";



  items.forEach(c=>{

    const row = document.createElement("div");

    row.className = "history-row";

    row.setAttribute("data-id", c.id);



    const title = String(c.title || "Sohbet").trim().slice(0, 15) || "Sohbet";



    row.innerHTML = `

      <div class="history-title">${title}</div>

      <button class="history-del" aria-label="Sil" title="Sil">${trashSvg()}</button>

    `;



    row.addEventListener("click", ()=>{

      ChatStore.currentId = c.id;

      renderChatFromStore();

      closeMenu();

    });



    row.querySelector(".history-del")?.addEventListener("click",(e)=>{

      e.stopPropagation();

      ChatStore.deleteChat(c.id);

      renderHistoryList();

      renderChatFromStore();

    });



    listEl.appendChild(row);

  });

}



// ---------- CHAT ----------

let currentMode = "chat";



function renderChatFromStore(){

  const chatEl = $("chat");

  if(!chatEl) return;



  const follow = isNearBottom(chatEl);



  chatEl.innerHTML = "";

  let h = [];

  try{ h = ChatStore.history() || []; }catch(e){ h = []; }



  h.forEach(m=>{

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



async function doSend(forcedText = null){

  const input = $("msgInput");

  const txt = String(forcedText ?? input?.value ?? "").trim();

  if(!txt) return;



  ensureChatVisible();



  addUserBubble(txt);

  if(input && forcedText === null) input.value = "";



  storeAddOnce("user", txt);

  ensureTitleOnFirstUserMessage(txt);

  renderHistoryList();



  const chatEl = $("chat");

  const holder = document.createElement("div");

  holder.className = "bubble bot loading";

  holder.textContent = "…";

  chatEl?.appendChild(holder);

  chatEl && (chatEl.scrollTop = chatEl.scrollHeight);



  let reply = "Evladım bir şeyler ters gitti.";

  try{

    const hist = (ChatStore.history() || []).map(m => ({ role:m.role, content:m.content }));

    const out = await fetchTextResponse(txt, currentMode, hist);

    reply = out?.text || reply;

  }catch(e){}



  try{ holder.remove(); }catch(e){}



  typeWriter(reply, "chat");

  storeAddOnce("assistant", reply);

}



// ---------- BINDINGS ----------

function bindMenuDelegationTo(el){

  if(!el) return;

  el.addEventListener("click",(e)=>{

    const it = e.target?.closest?.(".menu-action");

    if(!it) return;

    handleMenuAction(it.getAttribute("data-action"));

  });

}



function bindMenuUI(){

  $("hambBtn") && ($("hambBtn").onclick = openMenu);

  $("menuOverlay") && ($("menuOverlay").onclick = (e)=>{ if(e.target === $("menuOverlay")) closeMenu(); });



  $("newChatBtn") && ($("newChatBtn").onclick = ()=>{

    ChatStore.newChat();

    renderChatFromStore();

    renderHistoryList();

    currentMode = "chat";

    closeMenu();

  });



  bindMenuDelegationTo($("menuAsistan"));

  bindMenuDelegationTo($("menuAstro"));

  bindMenuDelegationTo($("menuKurumsal"));



  $("profileShortcutBtn") && ($("profileShortcutBtn").onclick = ()=>{

    closeMenu(); goProfile();

  });



  $("logoutBtn") && ($("logoutBtn").onclick = ()=> logout());

  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = ()=> alert("Hesabımı Sil: backend endpoint aktif olunca bağlanacak."));

}



function bindComposer(){

  $("sendBtn") && ($("sendBtn").onclick = ()=> doSend());

  $("msgInput") && ($("msgInput").addEventListener("keydown",(e)=>{

    if(e.key === "Enter" && !e.shiftKey){

      e.preventDefault();

      doSend();

    }

  }));



  // Fal butonları varsa bağla (index.html’de var)

  $("camBtn") && ($("camBtn").onclick = ()=> openFalPanel());

  $("closeFalBtn") && ($("closeFalBtn").onclick = ()=> closeFalPanel());

  const fi = $("falInput");

  if(fi) fi.onchange = ()=> handleFalPhoto(fi);

}



function bindAuthUI(){

  $("googleLoginBtn") && ($("googleLoginBtn").onclick = async ()=>{

    const st = getBootState();

    const now = Date.now();

    if(st.loginInFlight) return;

    if(now - (st.lastLoginAt || 0) < 900) return;



    st.loginInFlight = true;

    st.lastLoginAt = now;

    try{ await handleLogin("google"); }

    finally{ setTimeout(()=>{ st.loginInFlight = false; }, 1200); }

  });



  $("appleLoginBtn") && ($("appleLoginBtn").onclick = ()=>{

    alert("Apple girişi hazırlanıyor. Google ile giriş yapabilirsiniz.\nÜyelik ücretsizdir.");

  });



  $("termsAcceptBtn") && ($("termsAcceptBtn").onclick = async ()=>{

    if(!$("termsCheck")?.checked) return alert("Onayla evladım.");

    const ok = await acceptTerms();

    if(!ok) return alert("Sözleşme kaydedilemedi.");

    $("termsOverlay")?.classList.remove("active");

    if ($("termsOverlay")) $("termsOverlay").style.display = "none";

    refreshPremiumBars();

  });

}



// ---------- BOOT ----------

document.addEventListener("DOMContentLoaded", async ()=>{

  populateMenuGrid();          // ✅ MENÜ BUTONLARI BASILIR

  bindMenuUI();

  bindComposer();

  bindAuthUI();



  try{ await initNotif({ baseUrl: BASE_DOMAIN }); }catch(e){}



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



  if (logged) {

    $("loginOverlay")?.classList.remove("active");

    $("loginOverlay") && ($("loginOverlay").style.display = "none");

    if (!u.terms_accepted_at) {

      $("termsOverlay")?.classList.add("active");

      $("termsOverlay") && ($("termsOverlay").style.display = "flex");

    }

  } else {

    $("loginOverlay")?.classList.add("active");

    $("loginOverlay") && ($("loginOverlay").style.display = "flex");

  }



  refreshPremiumBars();



  try{

    ChatStore.init();

    renderChatFromStore();

    renderHistoryList();

  }catch(e){}



  setChatVisibilityFromStore();

});



window.addEventListener("pageshow", ()=>{ try{ refreshPremiumBars(); }catch(e){} });
