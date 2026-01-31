// FILE: /js/main.js
// FINAL - GLOBAL ONLY (ÜST/ALT BAR DOKUNMAZ)
// ✅ Auth + Terms gating
// ✅ Hamburger open/close
// ✅ Bottom bar navigation
// ✅ Logout / delete account
// ✅ Notif init
// ✅ Menü/history UI update (SADECE menü)
// ✅ SP tek kaynak: caynana_user_v1.sp_score -> ypFill/ypNum
// ❌ Chat render / send / typewriter burada YOK (chat_page.js yönetir)

import { BASE_DOMAIN, STORAGE_KEY, GOOGLE_CLIENT_ID } from "./config.js";
import { initAuth, logout, acceptTerms } from "./auth.js";
import { initNotif } from "./notif.js";

// ✅ CACHE FIX: menü dosyasını cache kırarak yükle
import { initMenuHistoryUI } from "./menu_history_ui.js?v=2";

window.CAYNANA_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID;
window.CAYNANA_API_BASE = BASE_DOMAIN;
window.CAYNANA_STORAGE_KEY = STORAGE_KEY;

const $ = (id) => document.getElementById(id);
function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function termsKey(email=""){ return `caynana_terms_accepted_at::${String(email||"").toLowerCase().trim()}`; }
function isLoggedUser(u){ return !!(u?.isSessionActive && (u?.id || u?.user_id) && u?.provider && u?.provider !== "guest"); }

// ✅ Tahtaravalli state API (chat_page.js kullanabilir)
window.setSeesawState = function(state){
  const bw = $("brandWrapper");
  if(!bw) return;
  bw.classList.remove("usering","botting","thinking");
  if(state === "user") bw.classList.add("usering");
  if(state === "bot")  bw.classList.add("botting","thinking");
};

function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

// ✅ SP tek kaynak: caynana_user_v1.sp_score
function refreshSP(){
  const u = getUser();
  const sp = clamp(parseInt(u?.sp_score ?? 10, 10) || 10, 0, 100);
  if ($("ypNum")) $("ypNum").textContent = `${sp}/100`;
  if ($("ypFill")) $("ypFill").style.width = `${sp}%`;
}

function refreshTopProfileShortcut(){
  const u = getUser();

  // plan chip (FREE default)
  try{
    const plan = String(u?.plan || "FREE").toUpperCase();
    if($("planChip")) $("planChip").textContent = plan || "FREE";
  }catch{}

  // profil kısa kart (menü içinde)
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

function refreshBars(){
  const u = getUser();
  document.body.classList.toggle("is-logged", isLoggedUser(u));
  refreshSP();
  refreshTopProfileShortcut();
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
        refreshBars();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindHamburger();
  bindBottomBar();
  bindLogoutAndDelete();
  bindTermsOverlay();

  // Menü listesi ve modüller (layout-common.js ve/veya menu_history_ui.js yapar)
  try { initMenuHistoryUI(); } catch {}

  const ok = gateAuthAndTerms();
  refreshBars();
  try { initNotif(); } catch {}

  // ✅ CHAT’e dokunma: chat_page.js zaten yönetiyor

  // ✅ Sadece menü güncelle (chat’i yeniden çizme!)
  window.addEventListener("caynana:chats-updated", ()=>{
    try { initMenuHistoryUI(); } catch {}
  });

  // ✅ SP değişirse (chat.js günceller) anında yansısın
  window.addEventListener("storage", (e)=>{
    if(!e || !e.key) return;
    if(e.key === STORAGE_KEY) refreshBars();
  });

  void ok;
});
