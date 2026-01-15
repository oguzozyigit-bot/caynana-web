// CAYNANA WEB - main.js (v8000)
// ✅ Offline: sadece Google/Apple giriş + footer linkler, misafir yok.
// ✅ Online: avatar+isim+CN + Profil butonu + Güvenli Çıkış.
// ✅ İlk giriş: Profil zorunlu (gender/age/height/weight/fullname/nick).
// ✅ Modlar/Chat/Persona/Kamera/Mic: login şart.
// ✅ Shopping kartları ve diğer mevcut akış korunur (senin backend data yapına göre).

export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;
const NOTIF_URL = `${BASE_DOMAIN}/api/notifications`;
const PROFILE_ME_URL = `${BASE_DOMAIN}/api/profile/me`;
const PROFILE_SET_URL = `${BASE_DOMAIN}/api/profile/set`;
const MEMORY_GET_URL = `${BASE_DOMAIN}/api/memory/get`;

const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";
const TOKEN_KEY = "caynana_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function authHeaders() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}

// -------------------------
// GLOBAL FAILSAFE
// -------------------------
window.addEventListener("error", (e) => {
  try {
    const msg = (e && (e.message || e.error?.message)) || "Bilinmeyen JS hatası";
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;inset:12px;z-index:999999;background:#111;color:#fff;padding:14px;border-radius:14px;font:14px/1.4 system-ui;overflow:auto;";
    box.innerHTML =
      `<b>JS HATASI:</b><br>${msg}<br><br>` +
      `<small>Dosya: ${(e && e.filename) || "-"}<br>Satır: ${(e && e.lineno) || "-"}:${(e && e.colno) || "-"}</small>`;
    document.body.appendChild(box);
  } catch {}
});

// -------------------------
// STATE
// -------------------------
let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let pendingImage = null;
let currentAudio = null;
let isSending = false;

let currentMode = "chat";
let currentPersona = "normal";
let currentPlan = "free";

let meCache = null; // profile/me sonucu

// fal
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

if (window.marked) marked.setOptions({ mangle: false, headerIds: false });

const $ = (id) => document.getElementById(id);

// -------------------------
// DOM
// -------------------------
const mainEl = $("main");

const heroImage = $("heroImage");
const heroContent = $("heroContent");
const heroTitle = $("heroTitle");
const heroDesc = $("heroDesc");
const suggestionText = $("suggestionText");

const chatContainer = $("chatContainer");
const textInput = $("text");
const sendBtn = $("sendBtn");
const dock = $("dock");
const fileEl = $("fileInput");

const photoModal = $("photoModal");
const photoPreview = $("photoPreview");
const photoTitle = $("photoTitle");
const photoHint = $("photoHint");
const photoCancelBtn = $("photoCancelBtn");
const photoOkBtn = $("photoOkBtn");

const personaModal = $("personaModal");
const personaBtn = $("personaBtn");
const personaClose = $("personaClose");

const drawer = $("drawer");
const drawerMask = $("drawerMask");
const menuBtn = $("menuBtn");
const drawerClose = $("drawerClose");

const notifIconBtn = $("notifIconBtn");
const notifBadge = $("notifBadge");
const notifModal = $("notifModal");
const notifClose = $("notifClose");
const notifList = $("notifList");

const planBtn = $("planBtn");
const aboutBtn = $("aboutBtn");
const faqBtn = $("faqBtn");
const contactBtn = $("contactBtn");
const privacyBtn = $("privacyBtn");

const brandTap = $("brandTap");
const camBtn = $("camBtn");
const micBtn = $("micBtn");
const falCamBtn = $("falCamBtn");
const falStepText = $("falStepText");
const falStepSub = $("falStepSub");

const oz0 = $("ozLine0");
const oz1 = $("ozLine1");
const oz2 = $("ozLine2");
const oz3 = $("ozLine3");

// Drawer profile + login box
const drawerProfileCard = $("drawerProfileCard");
const drawerLoginBox = $("drawerLoginBox");
const dpAvatar = $("dpAvatar");
const dpName = $("dpName");
const dpPlan = $("dpPlan");
const dpCN = $("dpCN");
const openProfileBtn = $("openProfileBtn");
const safeLogoutBtn = $("safeLogoutBtn");
const btnLoginGoogle = $("btnLoginGoogle");
const btnLoginApple = $("btnLoginApple");

// Auth modal
const authModal = $("authModal");
const authCloseX = $("authCloseX");
const authClose = $("authClose");
const authStatus = $("authStatus");
const googleBtn = $("googleBtn");
const appleBtn = $("appleBtn");

// Profile modal
const profileModal = $("profileModal");
const profileCloseX = $("profileCloseX");
const profileAvatar = $("profileAvatar");
const profileEmail = $("profileEmail");
const profileCN = $("profileCN");
const profilePlan = $("profilePlan");
const profileSave = $("profileSave");
const profileStatus = $("profileStatus");

const pfFullName = $("pfFullName");
const pfNick = $("pfNick");
const pfGender = $("pfGender");
const pfAge = $("pfAge");
const pfHeight = $("pfHeight");
const pfWeight = $("pfWeight");

const pfBio = $("pfBio");
const pfMarital = $("pfMarital");
const pfKids = $("pfKids");
const pfKidsCount = $("pfKidsCount");
const pfKidsAges = $("pfKidsAges");
const pfSpouseName = $("pfSpouseName");
const pfCity = $("pfCity");
const pfJob = $("pfJob");
const pfPriority = $("pfPriority");

// Page modal
const pageModal = $("pageModal");
const pageTitleEl = $("pageTitle");
const pageBodyEl = $("pageBody");
const pageClose = $("pageClose");

// -------------------------
// UI helpers
// -------------------------
function showModal(el) { if (el) el.classList.add("show"); }
function hideModal(el) { if (el) el.classList.remove("show"); }

function setAuthStatus(msg) { if (authStatus) authStatus.textContent = msg || ""; }
function setProfileStatus(msg) { if (profileStatus) profileStatus.textContent = msg || ""; }

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function scrollToBottom(force = false) {
  if (!chatContainer) return;
  if (force) {
    requestAnimationFrame(() => (chatContainer.scrollTop = chatContainer.scrollHeight));
    return;
  }
  const near = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 260;
  if (!near) return;
  requestAnimationFrame(() => (chatContainer.scrollTop = chatContainer.scrollHeight));
}
window.addEventListener("resize", () => scrollToBottom(true));

async function typeWriterEffect(el, text, speed = 18) {
  return new Promise((resolve) => {
    let i = 0;
    el.innerHTML = "";
    el.classList.add("typing-cursor");
    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i++);
        scrollToBottom(true);
        setTimeout(tick, speed);
      } else {
        el.classList.remove("typing-cursor");
        if (window.DOMPurify && window.marked) el.innerHTML = DOMPurify.sanitize(marked.parse(text));
        else el.textContent = text;
        resolve();
      }
    }
    tick();
  });
}

function assetUrl(relPath) {
  return new URL(`../${relPath}`, import.meta.url).href;
}

// -------------------------
// SAFE FETCH
// -------------------------
async function apiFetch(url, opts = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { ...(opts.headers || {}) };
  const method = (opts.method || "GET").toUpperCase();

  if (opts.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, { ...opts, method, headers, signal: controller.signal, cache:"no-store" });
    if (res.status === 204) return { ok:true, status:204, data:null };

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isJson = ct.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg = (typeof data === "object" && (data.detail || data.message)) || (typeof data === "string" && data) || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return { ok:true, status:res.status, data };
  } catch (e) {
    if (String(e?.name || "").toLowerCase() === "aborterror") throw new Error("Zaman aşımı (sunucu yanıt vermedi).");
    if ((e && e.message === "Failed to fetch") || /failed to fetch/i.test(String(e?.message || ""))) {
      throw new Error("Sunucuya erişemedim (CORS / ağ / SSL).");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// -------------------------
// LOGIN GATE
// -------------------------
async function requireLogin(reasonText = "Evladım, önce giriş yapacaksın.") {
  await addBubble("ai", reasonText, false, "");
  openAuthModal();
}

function openAuthModal() {
  showModal(authModal);
  setAuthStatus("");
  setTimeout(ensureGoogleButton, 120);
}

// -------------------------
// Drawer state
// -------------------------
const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="18" fill="#222"/><text x="40" y="52" font-size="26" text-anchor="middle" fill="#fff" font-family="Arial">👵</text></svg>`);

function renderDrawerState() {
  const logged = !!getToken();

  if (drawerProfileCard) drawerProfileCard.style.display = logged ? "flex" : "none";
  if (drawerLoginBox) drawerLoginBox.style.display = logged ? "none" : "block";
  if (safeLogoutBtn) safeLogoutBtn.style.display = logged ? "flex" : "none";

  if (!logged) return;

  const me = meCache || {};
  const display = (me.display_name || me.email || "").trim() || "Üye";
  const cn = me.caynana_id || "CN-????";
  const plan = (me.plan || currentPlan || "free").toUpperCase();
  const avatar = (me.profile && me.profile.avatar_url) ? me.profile.avatar_url : "";

  if (dpName) dpName.textContent = display;
  if (dpCN) dpCN.textContent = cn;
  if (dpPlan) dpPlan.textContent = plan;
  if (dpAvatar) {
    dpAvatar.src = avatar || FALLBACK_AVATAR;
    dpAvatar.onerror = () => (dpAvatar.src = FALLBACK_AVATAR);
  }
}

// -------------------------
// Profile completeness
// -------------------------
function isProfileComplete(me) {
  const p = (me && me.profile) ? me.profile : {};
  const fullName = (p.full_name || me.profile?.full_name || me.profile?.fullName || me.profile?.name || me.profile?.fullname || me.profile?.full_name) ?? p.full_name;
  // Biz backend’e full_name/nickname/gender/age/height_cm/weight_kg gönderiyoruz:
  const ok =
    !!(p.full_name && String(p.full_name).trim()) &&
    !!(p.nickname && String(p.nickname).trim()) &&
    !!(p.gender && String(p.gender).trim()) &&
    Number.isFinite(Number(p.age)) && Number(p.age) > 0 &&
    Number.isFinite(Number(p.height_cm)) && Number(p.height_cm) > 0 &&
    Number.isFinite(Number(p.weight_kg)) && Number(p.weight_kg) > 0;

  // fullName değişkeni yukarıda kullanmadık; backend p.full_name esas.
  return ok;
}

function openProfileModal(force = false) {
  showModal(profileModal);
  setProfileStatus("");

  const me = meCache || {};
  const p = me.profile || {};

  if (profileEmail) profileEmail.textContent = me.email || "—";
  if (profileCN) profileCN.textContent = me.caynana_id || "CN-????";
  if (profilePlan) profilePlan.textContent = (me.plan || currentPlan || "free").toUpperCase();

  const avatar = p.avatar_url || "";
  if (profileAvatar) {
    profileAvatar.src = avatar || FALLBACK_AVATAR;
    profileAvatar.onerror = () => (profileAvatar.src = FALLBACK_AVATAR);
  }

  // doldur (varsa)
  if (pfFullName) pfFullName.value = p.full_name || "";
  if (pfNick) pfNick.value = p.nickname || "";
  if (pfGender) pfGender.value = p.gender || "";
  if (pfAge) pfAge.value = p.age ?? "";
  if (pfHeight) pfHeight.value = p.height_cm ?? "";
  if (pfWeight) pfWeight.value = p.weight_kg ?? "";

  // opsiyonelleri memory’ye yazacağız (backend profile_set şu an sadece bazı alanları alıyor).
  // Şimdilik frontend’de saklayıp ileride memory endpoint ile upsert edersin.
  if (pfBio) pfBio.value = "";
  if (pfMarital) pfMarital.value = "";
  if (pfKids) pfKids.value = "";
  if (pfKidsCount) pfKidsCount.value = "";
  if (pfKidsAges) pfKidsAges.value = "";
  if (pfSpouseName) pfSpouseName.value = "";
  if (pfCity) pfCity.value = "";
  if (pfJob) pfJob.value = "";
  if (pfPriority) pfPriority.value = "";

  // force ise kapatma yok
  if (profileCloseX) profileCloseX.style.display = force ? "none" : "inline-flex";
}

async function saveProfileRequired() {
  const full_name = (pfFullName?.value || "").trim();
  const nickname = (pfNick?.value || "").trim();
  const gender = (pfGender?.value || "").trim();
  const age = Number((pfAge?.value || "").trim());
  const height_cm = Number((pfHeight?.value || "").trim());
  const weight_kg = Number((pfWeight?.value || "").trim());

  if (!full_name || !nickname || !gender || !age || !height_cm || !weight_kg) {
    setProfileStatus("Lütfen zorunlu alanları doldur.");
    return;
  }

  setProfileStatus("Kaydediyorum…");

  try {
    await apiFetch(PROFILE_SET_URL, {
      method: "POST",
      headers: { ...authHeaders() },
      body: JSON.stringify({ full_name, nickname, gender, age, height_cm, weight_kg }),
    });

    // tekrar çek
    await pullMe();
    setProfileStatus("Kaydedildi ✅");
    setTimeout(() => hideModal(profileModal), 350);
  } catch (e) {
    setProfileStatus("Hata: " + (e?.message || "Kaydedilemedi"));
  }
}

// -------------------------
// Pull plan + me
// -------------------------
async function pullPlanFromBackend() {
  if (!getToken()) { currentPlan = "free"; return; }
  try {
    const r = await apiFetch(MEMORY_GET_URL, { method:"GET", headers:{...authHeaders()} });
    const j = r.data || {};
    const plan = ((j.profile || {}).plan || "free").toLowerCase();
    currentPlan = (plan === "plus" || plan === "pro") ? plan : "free";
  } catch {
    currentPlan = "free";
  }
}

async function pullMe() {
  if (!getToken()) { meCache = null; return null; }
  try {
    const r = await apiFetch(PROFILE_ME_URL, { method:"GET", headers:{...authHeaders()} });
    meCache = r.data || null;
    return meCache;
  } catch {
    meCache = null;
    return null;
  }
}

// -------------------------
// Pages
// -------------------------
async function openPageFromFile(title, path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    const html = await r.text();
    showPage(title, html);
  } catch {
    showPage(title, `<div style="font-weight:900;color:#b00;">Sayfa yüklenemedi</div>`);
  }
}
function showPage(title, html) {
  if (!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title;
  pageBodyEl.innerHTML = html;
  showModal(pageModal);
  closeDrawer();
}
function hidePage() { hideModal(pageModal); }

// -------------------------
// Modes
// -------------------------
const MODES = {
  chat: { label:"Sohbet", icon:"fa-comments", color:"#FFB300", title:"Caynana ile<br>iki lafın belini kır.", desc:"Biraz dur bakalım, neler anlatacaksın?", img:assetUrl("images/hero-chat.png"), ph:"Naber Caynana?", sugg:"Benim zamanımda her şey daha güzeldi ah ah…" },
  dedikodu: { label:"Dedikodu", icon:"fa-people-group", color:"#111111", title:"Dedikodu Odası", desc:"Evladım burada lafın ucu kaçar…", img:assetUrl("images/hero-dedikodu.png"), ph:"Bir şey yaz…", sugg:"Dedikodu varsa ben buradayım…" },
  shopping: { label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897", title:"Almadan önce<br>Caynana’ya sor.", desc:"Sonra “keşke” dememek için buradayım.", img:assetUrl("images/hero-shopping.png"), ph:"Ne arıyorsun evladım?", sugg:"Her indirime atlayan sonunda pahalı öder." },
  fal: { label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6", title:"Fincanı kapat<br>tabakla gönder.", desc:"3 açı çek: üstten, yandan, diğer yandan.", img:assetUrl("images/hero-fal.png"), ph:"", sugg:"Sadece fincan + tabak." },
  saglik: { label:"Sağlık", icon:"fa-heart-pulse", color:"#EF4444", title:"Caynana Sağlık'la<br>turp gibi ol.", desc:"Neren ağrıyor söyle bakayım?", img:assetUrl("images/hero-health.png"), ph:"Şikayetin ne?", sugg:"Çay üstüne sakın soğuk su içme!" },
  diyet: { label:"Diyet", icon:"fa-carrot", color:"#84CC16", title:"Sağlıklı beslen<br>zinde kal!", desc:"Açlıktan değil, keyiften yiyin.", img:assetUrl("images/hero-diet.png"), ph:"Boy kilo kaç?", sugg:"Ekmek değil, yeşillik ye." },
};
const MODE_KEYS = Object.keys(MODES);

function applyFooterLines(activeKey) {
  const idx = MODE_KEYS.indexOf(activeKey);
  const colors = [];
  for (let i = 0; i < 4; i++) colors.push(MODES[MODE_KEYS[(idx + i) % MODE_KEYS.length]].color);
  if (oz0) oz0.style.background = colors[0];
  if (oz1) oz1.style.background = colors[1];
  if (oz2) oz2.style.background = colors[2];
  if (oz3) oz3.style.background = colors[3];
}

function applyHero(modeKey) {
  const m = MODES[modeKey] || MODES.chat;
  document.documentElement.style.setProperty("--primary", m.color);
  if (heroImage) heroImage.src = m.img;
  if (heroTitle) heroTitle.innerHTML = m.title;
  if (heroDesc) heroDesc.innerHTML = m.desc;
  if (textInput) textInput.placeholder = m.ph || "Bir şey yaz...";
  if (suggestionText) suggestionText.textContent = m.sugg || "";
  applyFooterLines(modeKey);
}

function renderDock() {
  if (!dock) return;
  dock.innerHTML = "";
  MODE_KEYS.forEach((k) => {
    const m = MODES[k];
    const item = document.createElement("div");
    item.className = "dock-item" + (k === currentMode ? " active" : "");
    item.setAttribute("data-mode", k);
    item.innerHTML = `
      <div class="icon-box"><i class="fa-solid ${m.icon}"></i></div>
      <div class="dock-label">${m.label}</div>
    `;
    item.onclick = () => switchMode(k);
    dock.appendChild(item);
  });
}

const modeChats = {};
function saveModeChat() { if (chatContainer) modeChats[currentMode] = chatContainer.innerHTML || ""; }
function loadModeChat(modeKey) {
  if (!chatContainer || !heroContent) return;
  chatContainer.innerHTML = modeChats[modeKey] || "";
  if (!chatContainer.innerHTML.trim()) {
    heroContent.style.display="block"; chatContainer.style.display="none";
  } else {
    heroContent.style.display="none"; chatContainer.style.display="block";
    scrollToBottom(true);
  }
}

function switchMode(modeKey) {
  if (!getToken()) { requireLogin("Evladım, modlara geçmek için önce giriş yap."); return; }
  if (!meCache || !isProfileComplete(meCache)) { openProfileModal(true); return; }

  if (modeKey === currentMode) return;
  saveModeChat();
  currentMode = modeKey;

  document.querySelectorAll(".dock-item").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-mode") === modeKey);
  });

  applyHero(modeKey);
  loadModeChat(modeKey);

  document.body.classList.toggle("fal-mode", modeKey === "fal");
  if (modeKey !== "fal") { falImages = []; setFalStepUI(); }
  else { resetFalCapture(); }
}

// -------------------------
// Swipe + dblclick (PC) + double-tap (mobil)
// -------------------------
function bindSwipeAndDoubleTap() {
  const area = mainEl || $("main");
  if (!area) return;

  // swipe
  let sx = 0, sy = 0, active = false;

  area.addEventListener("pointerdown", (e) => {
    const chatVisible = chatContainer && chatContainer.style.display === "block";
    if (chatVisible) return;
    active = true; sx = e.clientX; sy = e.clientY;
  }, { passive:true });

  area.addEventListener("pointerup", (e) => {
    if (!active) return;
    active = false;

    if (!getToken()) return;
    if (!meCache || !isProfileComplete(meCache)) return;

    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;

    const step = dx < 0 ? 1 : -1;
    const idx = MODE_KEYS.indexOf(currentMode);
    const next = MODE_KEYS[(idx + step + MODE_KEYS.length) % MODE_KEYS.length];
    switchMode(next);
  }, { passive:true });

  // PC dblclick
  if (brandTap) {
    brandTap.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (!getToken()) return requireLogin("Önce giriş evladım.");
      if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);
      const idx = MODE_KEYS.indexOf(currentMode);
      const next = MODE_KEYS[(idx + 1) % MODE_KEYS.length];
      switchMode(next);
    });
  }

  // mobile double tap
  if (brandTap) {
    let lastTap = 0, lastX = 0, lastY = 0;
    brandTap.addEventListener("pointerup", (e) => {
      const now = Date.now();
      const dx = Math.abs((e.clientX||0) - lastX);
      const dy = Math.abs((e.clientY||0) - lastY);
      const isQuick = (now - lastTap) < 320;
      const isSameSpot = dx < 18 && dy < 18;

      if (isQuick && isSameSpot) {
        if (!getToken()) return requireLogin("Önce giriş evladım.");
        if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);
        const idx = MODE_KEYS.indexOf(currentMode);
        const next = MODE_KEYS[(idx + 1) % MODE_KEYS.length];
        switchMode(next);
        lastTap = 0;
        return;
      }
      lastTap = now; lastX = e.clientX||0; lastY = e.clientY||0;
    }, { passive:true });
  }
}

// -------------------------
// Fal UI
// -------------------------
function setFalStepUI() {
  if (!falStepText || !falStepSub) return;
  if (currentMode !== "fal") { falStepText.textContent = ""; falStepSub.textContent = ""; return; }

  if (falImages.length < 3) {
    falStepText.textContent = "Fal için 3 fotoğraf çek";
    falStepSub.textContent = FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  } else {
    falStepText.textContent = "Fal hazır…";
    falStepSub.textContent = "Yorum hazırlanıyor";
  }
}
function resetFalCapture() { falImages = []; setFalStepUI(); }

async function falCheckOneImage(dataUrl) {
  try {
    const r = await apiFetch(FAL_CHECK_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ image:dataUrl }),
    }, 25000);
    return r.data || { ok:false, reason:"Kontrol edilemedi." };
  } catch {
    return { ok:false, reason:"Kontrol edemedim, tekrar dene." };
  }
}

// -------------------------
// Photo
// -------------------------
function openCamera() {
  if (!getToken()) return requireLogin("Fotoğraf için önce giriş.");
  if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);
  if (fileEl) { fileEl.value = ""; fileEl.click(); }
}
function openFalCamera() { openCamera(); }

function resetModalOnly() {
  pendingImage = null;
  if (photoPreview) photoPreview.src = "";
  hideModal(photoModal);
  if (fileEl) fileEl.value = "";
}

if (fileEl) {
  fileEl.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const imgData = reader.result;

      if (currentMode === "fal") {
        const check = await falCheckOneImage(imgData);
        if (!check.ok) {
          await addBubble("ai", check.reason || "Evladım bu fincan-tabak değil.", false, "");
          resetModalOnly();
          setTimeout(() => openFalCamera(), 150);
          return;
        }
        falImages.push(imgData);
        setFalStepUI();
      }

      pendingImage = imgData;
      if (photoPreview) photoPreview.src = pendingImage;
      if (photoTitle) photoTitle.textContent = currentMode === "fal" ? "Fal fotoğrafı" : "Fotoğraf hazır";
      if (photoHint) photoHint.textContent = "Tamam deyince gönderiyorum.";
      showModal(photoModal);
    };
    reader.readAsDataURL(f);
  });
}

if (photoCancelBtn) photoCancelBtn.onclick = resetModalOnly;
if (photoOkBtn) {
  photoOkBtn.onclick = async () => {
    hideModal(photoModal);
    if (currentMode === "fal" && falImages.length < 3) { setTimeout(openFalCamera, 180); return; }
    if (currentMode === "fal" && textInput) textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. İnsani anlat.";
    await send();
    if (currentMode === "fal") resetFalCapture();
  };
}

// -------------------------
// Mic
// -------------------------
function startMic() {
  if (!getToken()) return requireLogin("Mikrofon için önce giriş.");
  if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert("Tarayıcı desteklemiyor");
  const r = new SR();
  r.lang = "tr-TR";
  r.onresult = (e) => {
    if (textInput) textInput.value = e.results[0][0].transcript;
    send();
  };
  r.start();
}

// -------------------------
// Bubbles + Audio
// -------------------------
async function addBubble(role, text, isLoader = false, speech = "") {
  if (!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;
  div.innerHTML = `<div class="bubble"></div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display = "none";
  chatContainer.style.display = "block";
  scrollToBottom(true);

  if (role === "ai" && !isLoader) await typeWriterEffect(bubble, text);
  else bubble.innerHTML = role === "user" ? escapeHtml(text) : text;

  if (role === "ai") {
    const sp = (speech && speech.trim()) ? speech : (text || "").replace(/[*_`#>-]/g, "").slice(0, 260);
    const btn = document.createElement("div");
    btn.className = "audio-btn";
    btn.dataset.speech = sp;
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
  }

  scrollToBottom(true);
  return div;
}

if (chatContainer) {
  chatContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".audio-btn");
    if (!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}

async function playAudio(text, btn) {
  if (!getToken()) return requireLogin("Ses için önce giriş.");
  if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);

  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  const old = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;

  try {
    const res = await fetch(SPEAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: currentPersona }),
    });
    if (!res.ok) throw new Error("TTS çalışmadı");
    const blob = await res.blob();
    currentAudio = new Audio(URL.createObjectURL(blob));
    currentAudio.onended = () => (btn.innerHTML = old);
    await currentAudio.play();
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
  } catch {
    btn.innerHTML = old;
  }
}

// -------------------------
// Send
// -------------------------
async function send() {
  if (isSending) return;

  if (!getToken()) return requireLogin("Evladım, üyelik olmadan sohbet yok. Önce giriş.");
  if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);

  let val = (textInput?.value || "").trim();
  if (pendingImage && !val) val = "Bu resmi yorumla";
  if (!val && !pendingImage) return;

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;

  await addBubble("user", val);
  if (textInput) textInput.value = "";

  const loaderId = "ldr_" + Date.now();
  const loader = document.createElement("div");
  loader.className = "msg ai";
  loader.id = loaderId;
  loader.innerHTML = `<div class="bubble"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
  chatContainer.appendChild(loader);
  scrollToBottom(true);

  const payload = { message: val, session_id: sessionId, image: pendingImage, mode: currentMode, persona: currentPersona };
  pendingImage = null;

  try {
    const r = await apiFetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }, 25000);

    const data = r.data || {};
    const l = document.getElementById(loaderId);
    if (l) l.remove();

    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");
  } catch (e) {
    const l = document.getElementById(loaderId);
    if (l) l.remove();
    await addBubble("ai", `Bağlantı sorunu: ${e?.message || "Hata"}`, false, "");
  } finally {
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// -------------------------
// Google GSI (sadece Google)
// -------------------------
function ensureGoogleButton() {
  if (!googleBtn) return;
  googleBtn.innerHTML = "";

  if (!window.google?.accounts?.id) {
    setAuthStatus("Hata: Google bileşeni yüklenmedi.");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (resp) => {
      try {
        setAuthStatus("Google ile giriş yapılıyor…");
        const r = await apiFetch(`${BASE_DOMAIN}/api/auth/google`, {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ id_token: resp.credential }),
        });

        const j = r.data || {};
        if (!j.token) throw new Error(j.detail || "Google giriş başarısız");

        setToken(j.token);
        setAuthStatus("Bağlandı ✅");

        await pullPlanFromBackend();
        await pullMe();
        renderDrawerState();

        hideModal(authModal);

        // ilk giriş -> profil zorunlu
        if (!meCache || !isProfileComplete(meCache)) {
          openProfileModal(true);
        }
      } catch (e) {
        setAuthStatus("Hata: " + (e?.message || "Giriş başarısız"));
      }
    },
  });

  google.accounts.id.renderButton(googleBtn, { theme:"outline", size:"large", text:"continue_with", shape:"pill" });
}

// -------------------------
// Persona modal
// -------------------------
function openPersona() {
  if (!getToken()) return requireLogin("Kaynana modları için önce giriş.");
  if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);
  showModal(personaModal);
}

// -------------------------
// Notifications
// -------------------------
async function openNotifications() {
  showModal(notifModal);
  if (!notifList) return;

  if (!getToken()) {
    notifList.innerHTML = `<div style="font-weight:900;color:#666;">Önce giriş yap evladım.</div>`;
    return;
  }

  notifList.innerHTML = `<div style="font-weight:900;color:#444;">Yükleniyor…</div>`;
  try {
    const r = await apiFetch(NOTIF_URL, { method:"GET", headers:{ ...authHeaders() } });
    const j = r.data || {};
    const items = j.items || [];
    const n = items.length;

    if (notifBadge) {
      notifBadge.style.display = n > 0 ? "flex" : "none";
      notifBadge.textContent = String(n > 99 ? "99+" : n);
    }

    if (!items.length) {
      notifList.innerHTML = `<div style="font-weight:900;color:#666;">Bildirim yok.</div>`;
      return;
    }

    notifList.innerHTML = items.map((it) => {
      const title = it.title || "Bildirim";
      const body = it.text || it.body || it.message || "";
      return `
        <div class="notifItem">
          <div class="notifItemTitle">${escapeHtml(title)}</div>
          <div class="notifItemBody">${escapeHtml(body)}</div>
        </div>`;
    }).join("");
  } catch (e) {
    notifList.innerHTML = `<div style="font-weight:900;color:#b00;">${escapeHtml(e.message || "Hata")}</div>`;
  }
}

// -------------------------
// Events
// -------------------------
function openDrawer() { if (drawerMask) drawerMask.classList.add("show"); if (drawer) drawer.classList.add("open"); }
function closeDrawer() { if (drawerMask) drawerMask.classList.remove("show"); if (drawer) drawer.classList.remove("open"); }

function bindEvents() {
  // drawer
  if (menuBtn) menuBtn.onclick = openDrawer;
  if (drawerClose) drawerClose.onclick = closeDrawer;
  if (drawerMask) drawerMask.onclick = closeDrawer;

  // drawer login buttons
  if (btnLoginGoogle) btnLoginGoogle.onclick = () => { openAuthModal(); closeDrawer(); };
  if (btnLoginApple) btnLoginApple.onclick = () => alert("Apple giriş yakında 🙂");

  // open profile
  if (openProfileBtn) openProfileBtn.onclick = () => { openProfileModal(false); closeDrawer(); };

  // logout
  if (safeLogoutBtn) {
    safeLogoutBtn.onclick = () => {
      setToken("");
      meCache = null;
      currentPlan = "free";
      closeDrawer();
      // temiz görüntü: hero’ya dön
      if (chatContainer) chatContainer.innerHTML = "";
      if (heroContent) heroContent.style.display = "block";
      if (chatContainer) chatContainer.style.display = "none";
      applyHero("chat");
      renderDrawerState();
    };
  }

  // persona
  if (personaBtn) personaBtn.onclick = openPersona;
  if (personaClose) personaClose.onclick = () => hideModal(personaModal);
  if (personaModal) personaModal.addEventListener("click", (e) => { if (e.target === personaModal) hideModal(personaModal); });

  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      if (!getToken()) return requireLogin("Kaynana modları için önce giriş.");
      if (!meCache || !isProfileComplete(meCache)) return openProfileModal(true);

      document.querySelectorAll("#personaModal .persona-opt").forEach((x) => x.classList.remove("selected"));
      opt.classList.add("selected");
      currentPersona = opt.getAttribute("data-persona") || "normal";
      setTimeout(() => hideModal(personaModal), 150);
    });
  });

  // auth modal close
  if (authCloseX) authCloseX.onclick = () => hideModal(authModal);
  if (authClose) authClose.onclick = () => hideModal(authModal);
  if (appleBtn) appleBtn.onclick = () => alert("Apple giriş yakında 🙂");

  // profile modal close (force modda gizlenir)
  if (profileCloseX) profileCloseX.onclick = () => hideModal(profileModal);
  if (profileModal) profileModal.addEventListener("click", (e) => { if (e.target === profileModal) hideModal(profileModal); });
  if (profileSave) profileSave.onclick = saveProfileRequired;

  // pages
  if (aboutBtn) aboutBtn.onclick = () => openPageFromFile("Hakkımızda", "./pages/hakkimizda.html");
  if (faqBtn) faqBtn.onclick = () => openPageFromFile("Sık Sorulan Sorular", "./pages/sss.html");
  if (contactBtn) contactBtn.onclick = () => openPageFromFile("İletişim", "./pages/iletisim.html");
  if (privacyBtn) privacyBtn.onclick = () => openPageFromFile("Gizlilik", "./pages/gizlilik.html");

  if (pageClose) pageClose.onclick = hidePage;
  if (pageModal) pageModal.addEventListener("click", (e) => { if (e.target === pageModal) hidePage(); });

  // notifications
  if (notifIconBtn) notifIconBtn.onclick = openNotifications;
  if (notifClose) notifClose.onclick = () => hideModal(notifModal);
  if (notifModal) notifModal.addEventListener("click", (e) => { if (e.target === notifModal) hideModal(notifModal); });

  // actions
  if (camBtn) camBtn.onclick = openCamera;
  if (falCamBtn) falCamBtn.onclick = openFalCamera;
  if (micBtn) micBtn.onclick = startMic;

  if (textInput) textInput.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
  if (sendBtn) sendBtn.onclick = send;
}

// -------------------------
// Init
// -------------------------
async function init() {
  // Fal UI
  document.body.classList.remove("fal-mode");
  falImages = [];
  setFalStepUI();

  renderDock();
  applyHero("chat");
  loadModeChat("chat");

  bindSwipeAndDoubleTap();
  bindEvents();

  if (getToken()) {
    await pullPlanFromBackend();
    await pullMe();
  }

  renderDrawerState();

  // token var ama profil eksikse: direkt profile
  if (getToken() && (!meCache || !isProfileComplete(meCache))) {
    openProfileModal(true);
  }
}
init();
