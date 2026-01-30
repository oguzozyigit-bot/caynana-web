// FILE: /js/main.js
// ROLLBACK-STABLE (ŞÜKÜR ÖNCESİ) + CHATSCROLL FIX
// ✅ Chat’i hiçbir eventte tekrar render ETME
// ✅ Sadece menü/history update
// ✅ Scroll: send sonrası + typing sırasında zorla aşağı
// ✅ KRİTİK FIX: scrollTop artık #chatScroll üzerinde (chat.html’de scroll yapan eleman bu)

import { BASE_DOMAIN, STORAGE_KEY, GOOGLE_CLIENT_ID } from "./config.js";
import { initAuth, logout, acceptTerms } from "./auth.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter, addBotBubble } from "./chat.js";
import { ChatStore } from "./chat_store.js";
import { initMenuHistoryUI } from "./menu_history_ui.js";

window.CAYNANA_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
window.CAYNANA_API_BASE = BASE_DOMAIN;
window.CAYNANA_STORAGE_KEY = STORAGE_KEY;

const $ = (id) => document.getElementById(id);
function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function termsKey(email=""){ return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`; }
function isLoggedUser(u){ return !!(u?.isSessionActive && (u?.id || u?.user_id) && u?.provider && u?.provider !== "guest"); }

window.setSeesawState = function(state){
  const bw = $("brandWrapper");
  if(!bw) return;
  bw.classList.remove("usering","botting","thinking");
  if(state === "user") bw.classList.add("usering");
  if(state === "bot")  bw.classList.add("botting","thinking");
};

// ✅ chat.html’de scroll yapan eleman: #chatScroll
function getScrollEl(){
  return $("chatScroll") || $("chat") || null;
}

function refreshPremiumBars() {
  const u = getUser();
  document.body.classList.toggle("is-logged", isLoggedUser(u));

  const yp = Number(u?.yp_percent ?? 19);
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  // ✅ Profil kartı bazen boş kalıyordu → burada garanti boya
  try {
    const nm = $("profileShortcutName");
    if(nm){
      nm.textContent = (u.fullname || u.name || u.display_name || u.email || "—");
    }
    const ico = $("profileShortcutIco");
    if(ico){
      const pic = u.picture || u.avatar || u.avatar_url;
      if(pic) ico.innerHTML = `<img src="${pic}" alt="avatar">`;
      else ico.textContent = "👤";
    }
  } catch {}
}

function bindHamburger(){
  const overlay = $("menuOverlay");
  $("hambBtn")?.addEventListener("click", ()=> overlay?.classList.add("open"));
  overlay?.addEventListener("click", (e)=> { if(e.target === overlay) overlay?.classList.remove("open"); });
}

function bindBottomBar(){
  document.querySelectorAll(".assistant-item").forEach(el=>{
    el.addEventListener("click", ()=> {
      const go = el.getAttribute("data-go");
      if(go) location.href = go;
    });
  });
}

function bindLogoutAndDelete(){
  $("logoutBtn")?.addEventListener("click", ()=> {
    try { logout(); } catch { window.location.replace("/index.html"); }
    setTimeout(()=> window.location.replace("/index.html"), 250);
  });

  $("deleteAccountBtn")?.addEventListener("click", ()=> {
    const ok = confirm("Hesabın kalıcı olarak silinecek. Emin misin evladım?");
    if(!ok) return;
    try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch(e){}

    try{
      const u0 = safeJson(localStorage.getItem(STORAGE_KEY), {});
      const uid = String(u0.user_id || u0.id || u0.email || "").trim().toLowerCase() || "guest";
      const email = String(u0.email || "").trim().toLowerCase();

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("google_id_token");
      localStorage.removeItem("caynana_api_token");
      if(email) localStorage.removeItem(termsKey(email));
      localStorage.removeItem("caynana_memory_profile");
      localStorage.removeItem(`caynana_chat_index::${uid}`);
      localStorage.removeItem(`caynana_chat_current::${uid}`);

      for(let i = localStorage.length - 1; i >= 0; i--){
        const k = localStorage.key(i);
        if(!k) continue;
        if(k.startsWith("caynana_chat_")) localStorage.removeItem(k);
        if(k.startsWith("caynana_chat_id:")) localStorage.removeItem(k);
        if(k.startsWith("caynana_kaynana_state:")) localStorage.removeItem(k);
      }
    }catch(e){}

    window.location.replace("/index.html");
  });
}

function gateAuthAndTerms(){
  const loginOverlay = $("loginOverlay");
  const termsOverlay = $("termsOverlay");
  const u = getUser();

  if(!isLoggedUser(u)){
    if(loginOverlay){ loginOverlay.classList.add("active"); loginOverlay.style.display="flex"; }
    if(termsOverlay){ termsOverlay.classList.remove("active"); termsOverlay.style.display="none"; }
    try { initAuth(); } catch {}
    return false;
  }

  const email = String(u?.email || "").toLowerCase().trim();
  const accepted = email ? !!localStorage.getItem(termsKey(email)) : !!u?.terms_accepted_at;
  if(!accepted){
    if(termsOverlay){ termsOverlay.classList.add("active"); termsOverlay.style.display="flex"; }
    if(loginOverlay){ loginOverlay.classList.remove("active"); loginOverlay.style.display="none"; }
    return false;
  }

  if(loginOverlay){ loginOverlay.classList.remove("active"); loginOverlay.style.display="none"; }
  if(termsOverlay){ termsOverlay.classList.remove("active"); termsOverlay.style.display="none"; }
  return true;
}

function bindTermsOverlay(){
  const termsOverlay = $("termsOverlay");
  if(!termsOverlay) return;

  $("closeTermsBtn")?.addEventListener("click", ()=> {
    try { logout(); } catch { window.location.replace("/index.html"); }
    setTimeout(()=> window.location.replace("/index.html"), 250);
  });

  const check = $("termsCheck");
  const acceptBtn = $("termsAcceptBtn");
  if(check && acceptBtn){
    const sync = ()=> {
      const ok = !!check.checked;
      acceptBtn.disabled = !ok;
      acceptBtn.style.opacity = ok ? "1" : "0.65";
    };
    sync();
    check.addEventListener("change", sync);
    acceptBtn.addEventListener("click", async ()=>{
      if(!check.checked) return;
      const ok = await acceptTerms();
      if(ok){
        termsOverlay.classList.remove("active");
        termsOverlay.style.display="none";
        refreshPremiumBars();
      }
    });
  }
}

// ✅ scroll helper: #chatScroll üzerinde çalışır (DOM gecikmesine dayanıklı)
function scrollBottom(){
  const sc = getScrollEl();
  if(!sc) return;
  requestAnimationFrame(()=>{ try{ sc.scrollTop = sc.scrollHeight; }catch{} });
  setTimeout(()=>{ try{ sc.scrollTop = sc.scrollHeight; }catch{} }, 20);
  setTimeout(()=>{ try{ sc.scrollTop = sc.scrollHeight; }catch{} }, 80);
}

function renderHistoryToChat(){
  const chatEl = $("chat");
  if(!chatEl) return;

  ChatStore.init();
  const hist = ChatStore.history() || [];
  chatEl.innerHTML = "";

  hist.forEach(m=>{
    if(m.role === "user") addUserBubble(m.content);
    else if(m.role === "assistant") addBotBubble(m.content);
  });

  // ✅ inner #chat değil, wrapper scroll
  scrollBottom();
}

function bindChatUI(){
  const input = $("msgInput");
  const sendBtn = $("sendBtn");
  const chatEl = $("chat");
  if(!input || !sendBtn || !chatEl) return;

  renderHistoryToChat();

  async function sendMessage(){
    const text = String(input.value || "").trim();
    if(!text) return;

    window.setSeesawState?.("user");

    input.value = "";
    input.style.height = "auto";

    addUserBubble(text);
    scrollBottom();

    window.setSeesawState?.("bot");
    const res = await fetchTextResponse(text, "chat");
    window.setSeesawState?.("idle");

    if(res?.text){
      typeWriter(res.text);

      // typing sırasında da alta tut
      setTimeout(()=>scrollBottom(), 120);
      setTimeout(()=>scrollBottom(), 420);
      setTimeout(()=>scrollBottom(), 900);
    }

    try { initMenuHistoryUI(); } catch {}
  }

  input.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("input", ()=>{
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });
}

function bindNewChatButton(){
  $("newChatBtn")?.addEventListener("click", ()=>{
    ChatStore.newChat();
    renderHistoryToChat();
    try { initMenuHistoryUI(); } catch {}
    $("menuOverlay")?.classList.remove("open");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindHamburger();
  bindBottomBar();
  bindLogoutAndDelete();
  bindTermsOverlay();

  try { initMenuHistoryUI(); } catch {}
  const ok = gateAuthAndTerms();
  refreshPremiumBars();
  try { initNotif(); } catch {}

  if(ok){
    bindChatUI();
    bindNewChatButton();
  }

  // ✅ Event: SADECE menü güncelle (chat’i yeniden çizme!)
  window.addEventListener("caynana:chats-updated", ()=>{
    try { initMenuHistoryUI(); } catch {}
    // chat render yok
  });
});
