// --- BACKEND SESSION TOKEN (api/auth/google -> api token) ---
const API_TOKEN_KEY = "caynana_api_token";

function getApiToken(){
  return (localStorage.getItem(API_TOKEN_KEY) || "").trim();
}
function setApiToken(t){
  if(t) localStorage.setItem(API_TOKEN_KEY, t);
}
function clearApiToken(){
  localStorage.removeItem(API_TOKEN_KEY);
}

/**
 * Backend Google token'ı doğrudan kabul etmiyor.
 * Önce /api/auth/google ile backend session token alıyoruz.
 */
async function ensureBackendSessionToken(){
  const existing = getApiToken();
  if(existing) return existing;

  const googleIdToken = (localStorage.getItem("google_id_token") || "").trim();
  if(!googleIdToken) throw new Error("google_id_token missing");

  const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ google_id_token: googleIdToken })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(`auth/google failed: ${r.status} ${txt}`);

  let data = {};
  try { data = JSON.parse(txt || "{}"); } catch(e) {}

  // olası token alan adları (backend hangisini döndürüyorsa)
  const token =
    (data.token || data.access_token || data.api_token || data.jwt || data.session_token || "").trim();

  if(!token) throw new Error("auth/google token not found in response");
  setApiToken(token);
  return token;
}

// --------------------
// GLOBAL UI HOOKS (auth.js çağırır)
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
// Premium UI state
// --------------------
function refreshPremiumBars() {
  const u = getUser();
  const logged = !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
  document.body.classList.toggle("is-logged", logged);

  const name = (u.hitap || firstName(u.fullname) || u.email || "MİSAFİR").toUpperCase();
  const hint = $("loginHint");
  if (hint && !logged) hint.textContent = "Servisler hazır. Google ile devam et evladım.";

  const yp = Number((u?.yp_percent ?? 50));
  const p = Math.max(5, Math.min(100, yp));
  if ($("ypNum")) $("ypNum").textContent = `${p}%`;
  if ($("ypFill")) $("ypFill").style.width = `${p}%`;

  const profileBtn = $("profileBtn");
  if (profileBtn) {
    profileBtn.onclick = () => {
      if (!logged) {
        $("loginOverlay")?.classList.add("active");
        if ($("loginOverlay")) $("loginOverlay").style.display = "flex";
        return;
      }
      location.href = "pages/profil.html";
    };
  }

  // logout
  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (!logged) {
        $("loginOverlay")?.classList.add("active");
        if ($("loginOverlay")) $("loginOverlay").style.display = "flex";
        return;
      }
      logout();
    };
  }

  // delete
  const delBtn = $("deleteAccountBtn");
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!logged) return alert("Önce giriş yap evladım.");
      await deleteAccount();
    };
  }

  const bw = $("brandWrapper");
  if (bw) bw.dataset.user = logged ? name : "MİSAFİR";
}

// --------------------
// Menu
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
  if (action === "reminder") { location.href = "pages/hatirlatici.html"; return; }
  if (action === "tarot") { location.href = "pages/tarot.html"; return; }
  if (action === "horoscope") { location.href = "pages/burc.html"; return; }
  if (action === "dream") { location.href = "pages/ruya.html"; return; }

  if (action === "dedikodu") { await sendForced("Dedikodu modundayız. Anlat bakalım… 😏", "dedikodu"); return; }
  if (action === "shopping") { await sendForced("Alışverişe geçtik. Ne alacaksın?", "shopping"); return; }
  if (action === "translate") { await sendForced("Çeviri: metni yapıştır, dilini söyle.", "trans"); return; }
  if (action === "diet") { await sendForced("Diyet: hedefin ne? kilo mu koruma mı?", "diet"); return; }
  if (action === "health") { await sendForced("Sağlık: ne şikayetin var?", "health"); return; }
  if (action === "special") { await sendForced("Özel gün: hangi tarihleri ekleyelim?", "chat"); return; }
  if (action === "chat") { await sendForced("Anlat bakalım evladım.", "chat"); return; }

  location.href = `pages/${action}.html`;
}

// --------------------
// Chat
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

function specialAnswerIfNeeded(txt){
  const s = String(txt || "").trim();
  if (/(seni\s*kim\s*(yazd[ıi]|yaratt[ıi]|yapt[ıi])|kim\s*yazd[ıi]\s*seni|kim\s*yaratt[ıi])/i.test(s)){
    return "Benim arkamda işinde tecrübeli oldukça büyük bir yazılım kadrosu var. Beni şu yazdı ya da yarattı diye kesin isim veremem; ama akıl takımının başı Oğuz Özyiğit, onu söyleyebilirim.";
  }
  return null;
}

async function doSend(forcedText = null) {
  const input = $("msgInput");
  const txt = String(forcedText ?? input?.value ?? "").trim();
  if (!txt) return;

  setBrandState("usering");
  addUserBubble(txt);
  if (input && forcedText === null) input.value = "";

  chatHistory.push({ role: "user", content: txt });

  const special = specialAnswerIfNeeded(txt);
  if (special) {
    setBrandState("botting");
    setTimeout(() => setBrandState("talking"), 120);
    typeWriter(special, "chat");
    chatHistory.push({ role: "assistant", content: special });
    setTimeout(() => setBrandState(null), 650);
    return;
  }

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
// Fal
// --------------------
function bindFalUI(){
  $("closeFalBtn") && ($("closeFalBtn").onclick = () => closeFalPanel());
  const fi = $("falInput");
  if (fi) fi.onchange = () => handleFalPhoto(fi);
  const lt = $("loadingText");
  if (lt) lt.style.color = "var(--gold)";
}

// --------------------
// DELETE ACCOUNT (FINAL: token doğrula -> profile/set)
// --------------------
async function deleteAccount(){
  const u0 = getUser();
  const uid = (u0?.id || "").trim();
  const email = (u0?.email || uid).trim().toLowerCase();

  if(!uid) return alert("Önce giriş yap evladım.");
  if(!confirm("Hesabını silmek istiyor musun? Bu işlem geri alınamaz.")) return;

  try {
    const apiToken = await ensureBackendSessionToken();

    const r = await fetch(`${BASE_DOMAIN}/api/profile/set`, {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "Authorization": `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        user_id: uid,
        meta: { email, deleted_at: new Date().toISOString() }
      })
    });

    const bodyText = await r.text().catch(()=> "");
    if(!r.ok){
      console.error("deleteAccount failed:", r.status, bodyText);

      // 401 ise token yenile 1 kez dene
      if(r.status === 401){
        clearApiToken();
        const apiToken2 = await ensureBackendSessionToken();
        const r2 = await fetch(`${BASE_DOMAIN}/api/profile/set`, {
          method: "POST",
          headers: {
            "Content-Type":"application/json",
            "Authorization": `Bearer ${apiToken2}`
          },
          body: JSON.stringify({
            user_id: uid,
            meta: { email, deleted_at: new Date().toISOString() }
          })
        });
        const t2 = await r2.text().catch(()=> "");
        if(!r2.ok){
          console.error("deleteAccount retry failed:", r2.status, t2);
          alert(`Hesap silinemedi. (${r2.status})`);
          return;
        }
      } else {
        alert(`Hesap silinemedi. (${r.status})`);
        return;
      }
    }

    // terms + session temizle
    localStorage.removeItem(termsKey(email));
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("google_id_token");
    clearApiToken();

    alert("Hesabın silindi.");
    window.location.href = "/";
  } catch (e) {
    console.error("deleteAccount exception:", e);
    alert("Hesap silinemedi. Lütfen tekrar dene.");
  }
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

async function googleLoginSmart(){
  const hint = $("loginHint");
  try{
    if(window.google?.accounts?.id){
      window.google.accounts.id.prompt((n)=>{
        if (n?.isNotDisplayed?.() || n?.isSkippedMoment?.()){
          if(hint) hint.textContent = "Google penceresi açılamadı. Tekrar deniyorum...";
          handleLogin("google");
        }
      });
      return;
    }
  }catch(e){}
  handleLogin("google");
}

function bindAuthUI(){
  $("googleLoginBtn") && ($("googleLoginBtn").onclick = () => googleLoginSmart());

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
// Notif
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
// Menu UI
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
// Composer
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
  // ---- UI BASE ----
  document.body.classList.add("premium-ui");

  // ---- MENÜ / UI BAĞLARI ----
  populateMenuGrid();
  bindMenuUI();
  bindNotifUI();
  bindComposer();
  bindFalUI();
  bindAuthUI();

  // ---- NOTIF INIT ----
  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e){}

  // ---- GOOGLE GSI ----
  try {
    await waitForGsi();
    $("loginHint") && ($("loginHint").textContent = "Google hazır. Devam et evladım.");
    initAuth();
  } catch(e){
    window.showGoogleButtonFallback?.("GSI yüklenemedi");
  }

  // ---- SESSION CHECK (TEK YER) ----
  const u = getUser();
  const logged =
    !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");

  if (logged) {
    // login overlay kapat
    $("loginOverlay")?.classList.remove("active");
    $("loginOverlay") && ($("loginOverlay").style.display = "none");

    // ilk girişte sözleşme
    if (!u.terms_accepted_at) {
      window.showTermsOverlay?.();
    }
  } else {
    // login overlay aç
    $("loginOverlay")?.classList.add("active");
    $("loginOverlay") && ($("loginOverlay").style.display = "flex");
  }

  // ---- HEADER / MENU BUTONLARI (TEK BIND) ----
  $("logoutBtn") && ($("logoutBtn").onclick = () => logout());

  $("deleteAccountBtn") && ($("deleteAccountBtn").onclick = async () => {
    const u2 = getUser();
    const okLogged =
      !!(u2?.isSessionActive && u2?.id && u2?.provider && u2?.provider !== "guest");
    if (!okLogged) return alert("Önce giriş yap evladım.");
    await deleteAccount();
  });

  // ---- ÜST BAR / PREMIUM ----
  refreshPremiumBars();
});

