// FILE: /js/main.js
// VERSION: vFINAL+2g (FIX DOUBLE REPLY + FIX AUTOSCROLL DURING TYPING + SAFE LIVE UPDATES)

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

function termsKey(email=""){
  return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`;
}

function isLoggedUser(u){
  return !!(u?.isSessionActive && (u?.id || u?.user_id) && u?.provider && u?.provider !== "guest");
}

/* ✅ seesaw state (user/bot/idle) */
window.setSeesawState = function(state){
  const bw = $("brandWrapper");
  if(!bw) return;
  bw.classList.remove("usering","botting","thinking");
  if(state === "user") bw.classList.add("usering");
  if(state === "bot")  bw.classList.add("botting","thinking");
  if(state === "idle") return;
};

function refreshPremiumBars() {
  const u = getUser();
  const logged = isLoggedUser(u);
  document.body.classList.toggle("is-logged", logged);

  const yp = Number(u?.yp_percent ?? 19);
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  try {
    const name = (u.fullname || u.name || u.display_name || u.email || "—");
    const nm = $("profileShortcutName");
    if(nm) nm.textContent = name;

    const pic = u.picture || u.avatar || u.avatar_url;
    const ico = $("profileShortcutIco");
    if(ico && pic) ico.innerHTML = `<img src="${pic}" alt="avatar">`;
  } catch {}
}

function bindHamburger(){
  const hamb = $("hambBtn");
  const overlay = $("menuOverlay");
  if(!hamb || !overlay) return;

  hamb.addEventListener("click", ()=> overlay.classList.add("open"));
  overlay.addEventListener("click", (e)=> { if(e.target === overlay) overlay.classList.remove("open"); });
}

function bindBottomBar(){
  document.querySelectorAll(".assistant-item").forEach(el=>{
    el.addEventListener("click", ()=>{
      const go = el.getAttribute("data-go");
      if(go) location.href = go;
    });
  });
}

function bindLogoutAndDelete(){
  const logoutBtn = $("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", ()=> {
      try { logout(); } catch { window.location.replace("/index.html"); }
    });
  }

  const del = $("deleteAccountBtn");
  if(del){
    del.addEventListener("click", ()=>{
      const ok = confirm("Hesabın kalıcı olarak silinecek. Emin misin evladım?");
      if(!ok) return;

      // UID’yi silmeden önce al
      const u0 = (()=>{ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}catch{return {}} })();
      const uid = String(u0.user_id || u0.id || u0.email || "").trim().toLowerCase() || "guest";

      try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch(e){}

      try{
        localStorage.removeItem("caynana_user_v1");
        localStorage.removeItem("google_id_token");
        localStorage.removeItem("caynana_api_token");
        localStorage.removeItem(`caynana_terms_accepted_at::${uid}`);
        localStorage.removeItem("caynana_memory_profile");
        localStorage.removeItem(`caynana_chat_index::${uid}`);
        localStorage.removeItem(`caynana_chat_current::${uid}`);

        // tüm chat parçalarını süpür
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
}

function gateAuthAndTerms(){
  const loginOverlay = $("loginOverlay");
  const termsOverlay = $("termsOverlay");

  const u = getUser();
  const logged = isLoggedUser(u);

  if(!logged){
    if(loginOverlay){ loginOverlay.classList.add("active"); loginOverlay.style.display = "flex"; }
    if(termsOverlay){ termsOverlay.classList.remove("active"); termsOverlay.style.display = "none"; }
    try { initAuth(); } catch {}
    return false;
  }

  const email = String(u?.email || "").toLowerCase().trim();
  const accepted = email ? !!localStorage.getItem(termsKey(email)) : !!u?.terms_accepted_at;

  if(!accepted){
    if(termsOverlay){ termsOverlay.classList.add("active"); termsOverlay.style.display = "flex"; }
    if(loginOverlay){ loginOverlay.classList.remove("active"); loginOverlay.style.display = "none"; }
    return false;
  }

  if(loginOverlay){ loginOverlay.classList.remove("active"); loginOverlay.style.display = "none"; }
  if(termsOverlay){ termsOverlay.classList.remove("active"); termsOverlay.style.display = "none"; }
  return true;
}

function bindTermsOverlay(){
  const termsOverlay = $("termsOverlay");
  if(!termsOverlay) return;

  const closeBtn = $("closeTermsBtn");
  const check = $("termsCheck");
  const acceptBtn = $("termsAcceptBtn");

  if(closeBtn){
    closeBtn.addEventListener("click", ()=> {
      try { logout(); } catch { window.location.replace("/index.html"); }
    });
  }

  if(check && acceptBtn){
    const sync = ()=>{
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
        termsOverlay.style.display = "none";
        refreshPremiumBars();
      }
    });
  }
}

/* ✅ kullanıcı alttaysa zıplat */
function isNearBottom(el, slack=140){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch{ return true; }
}

let __lastRenderedChatId = null;

/* ✅ Chat ekranını current sohbete göre yeniden bas */
function renderHistoryToChat(){
  const chatEl = $("chat");
  if(!chatEl) return;

  try{
    ChatStore.init();
    __lastRenderedChatId = ChatStore.currentId;

    const hist = ChatStore.history() || [];
    chatEl.innerHTML = "";

    if(Array.isArray(hist) && hist.length){
      hist.forEach(m=>{
        if(m.role === "user") addUserBubble(m.content);
        else if(m.role === "assistant") addBotBubble(m.content);
      });

      chatEl.scrollTop = chatEl.scrollHeight;
    }
  }catch{}
}

/* ✅ typing sırasında scroll’u “yakala” */
function keepScrollAtBottomWhileTyping(chatEl, approxMs){
  if(!chatEl) return ()=>{};
  const stopAt = Date.now() + Math.max(600, approxMs || 1200);

  const timer = setInterval(()=>{
    // kullanıcı yukarı çıktıysa zorlamayalım
    if(!isNearBottom(chatEl, 260)) return;
    chatEl.scrollTop = chatEl.scrollHeight;
    if(Date.now() > stopAt) clearInterval(timer);
  }, 80);

  return ()=> clearInterval(timer);
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

    const wasNear = isNearBottom(chatEl, 220);

    window.setSeesawState?.("user");

    input.value = "";
    input.style.height = "auto";

    addUserBubble(text);

    if(wasNear) chatEl.scrollTop = chatEl.scrollHeight;

    window.setSeesawState?.("bot");
    const res = await fetchTextResponse(text, "chat");
    window.setSeesawState?.("idle");

    if(res?.text){
      // typing süresince scroll takipçisi
      const approx = Math.min(12000, (String(res.text).length * 28) + 600);
      const stop = keepScrollAtBottomWhileTyping(chatEl, approx);
      try{
        typeWriter(res.text);
      } finally {
        setTimeout(()=> stop(), approx + 200);
      }
    }

    // ✅ Başlık/menü anında güncellensin
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

  // mic (webkit)
  const micBtn = $("micBtn");
  if(micBtn && "webkitSpeechRecognition" in window){
    const Rec = window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = "tr-TR";
    rec.continuous = false;
    rec.interimResults = false;

    micBtn.addEventListener("click", ()=>{
      try { rec.start(); } catch {}
    });

    rec.onresult = (ev)=>{
      const t = ev.results?.[0]?.[0]?.transcript || "";
      if(!t) return;
      input.value = t;
      sendMessage();
    };
  }
}

function bindNewChatButton(){
  const btn = $("newChatBtn");
  if(!btn) return;

  btn.addEventListener("click", ()=>{
    ChatStore.newChat();
    renderHistoryToChat();
    try { initMenuHistoryUI(); } catch {}

    const overlay = $("menuOverlay");
    if(overlay) overlay.classList.remove("open");
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

  // ✅ LIVE UPDATE:
  // - Menü her zaman güncellensin
  // - Chat SADECE sohbet değiştiyse (seçim/silme/yeni sohbet) yeniden render edilsin
  window.addEventListener("caynana:chats-updated", ()=>{
    try { initMenuHistoryUI(); } catch {}

    try{
      ChatStore.init();
      if(ChatStore.currentId && ChatStore.currentId !== __lastRenderedChatId){
        renderHistoryToChat();
      }
    } catch {}
  });
});
