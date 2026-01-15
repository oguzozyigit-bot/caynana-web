// main.js v9500
// ✅ Modüller: chat + shopping (premium single-column cards) + fal + saglik + diyet
// ✅ Swipe + double-tap/dblclick mod değişimi
// ✅ Login: sadece Google (Apple placeholder)
// ✅ İlk girişte profil zorunlu (profil eksikse otomatik açılır)
// ✅ Avatar Google’dan gelir, burada değişmez
// ✅ Güvenli çıkış: token + tüm sohbetleri (modeChats) temizler

export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;
const NOTIF_URL = `${BASE_DOMAIN}/api/notifications`;
const PROFILE_ME_URL = `${BASE_DOMAIN}/api/profile/me`;
const PROFILE_SET_URL = `${BASE_DOMAIN}/api/profile/set`;

const GOOGLE_CLIENT_ID =
  "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

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
let meCache = null;

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

const pageModal = $("pageModal");
const pageTitleEl = $("pageTitle");
const pageBodyEl = $("pageBody");
const pageClose = $("pageClose");

const aboutBtn = $("aboutBtn");
const faqBtn = $("faqBtn");
const contactBtn = $("contactBtn");
const privacyBtn = $("privacyBtn");

// Drawer blocks
const drawerProfileCard = $("drawerProfileCard");
const guestLoginBlock = $("guestLoginBlock");
const openLoginBtn = $("openLoginBtn");
const openAppleBtn = $("openAppleBtn");
const safeLogoutBtn = $("safeLogoutBtn");
const openProfileBtn = $("openProfileBtn");

// Drawer profile bits
const dpAvatar = $("dpAvatar");
const dpName = $("dpName");
const dpPlan = $("dpPlan");
const dpCN = $("dpCN");

// Auth modal
const authModal = $("authModal");
const authCloseX = $("authCloseX");
const authClose = $("authClose");
const googleBtn = $("googleBtn");
const appleLoginBtn = $("appleLoginBtn");
const authStatus = $("authStatus");

// Profile modal
const profileModal = $("profileModal");
const profileCloseX = $("profileCloseX");
const profileAvatar = $("profileAvatar");
const profileEmail = $("profileEmail");
const profileCN = $("profileCN");
const profilePlan = $("profilePlan");
const profileSave = $("profileSave");
const profileStatus = $("profileStatus");

// Profile inputs
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

// -------------------------
// Helpers
// -------------------------
function showModal(el) { if (el) el.classList.add("show"); }
function hideModal(el) { if (el) el.classList.remove("show"); }

function setAuthStatus(msg) { if (authStatus) authStatus.textContent = msg; }
function setProfileStatus(msg) { if (profileStatus) profileStatus.textContent = msg; }

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
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
async function apiFetch(url, opts = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { ...(opts.headers || {}) };
  const method = (opts.method || "GET").toUpperCase();

  if (opts.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, { ...opts, method, headers, signal: controller.signal, cache: "no-store" });

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isJson = ct.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (typeof data === "object" && (data.detail || data.message)) ||
        (typeof data === "string" && data) ||
        `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    if (String(e?.name || "").toLowerCase() === "aborterror") throw new Error("Zaman aşımı.");
    if ((e && e.message === "Failed to fetch") || /failed to fetch/i.test(String(e?.message || ""))) {
      throw new Error("Sunucuya erişemedim (CORS / ağ / SSL).");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// -------------------------
// AUTH MODAL
// -------------------------
function openAuth() {
  showModal(authModal);
  setAuthStatus("");
  setTimeout(ensureGoogleButton, 80);
}
function closeAuth() { hideModal(authModal); }

// -------------------------
// MENU UI STATE
// -------------------------
const FALLBACK_AVATAR =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="20" fill="#222"/><text x="40" y="50" font-size="26" text-anchor="middle" fill="#fff" font-family="Arial">👵</text></svg>`);

function setMenuLoggedOut() {
  if (drawerProfileCard) drawerProfileCard.style.display = "none";
  if (guestLoginBlock) guestLoginBlock.style.display = "block";
  if (safeLogoutBtn) safeLogoutBtn.style.display = "none";
  lockPersonaUI();
}

function setMenuLoggedIn() {
  if (drawerProfileCard) drawerProfileCard.style.display = "flex";
  if (guestLoginBlock) guestLoginBlock.style.display = "none";
  if (safeLogoutBtn) safeLogoutBtn.style.display = "flex";
  unlockPersonaUI();
}

function lockPersonaUI() {
  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    const k = opt.getAttribute("data-persona");
    if (k === "normal") opt.classList.remove("locked");
    else opt.classList.add("locked");
  });
}
function unlockPersonaUI() {
  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => opt.classList.remove("locked"));
}

// -------------------------
// PROFILE helpers
// -------------------------
function syncKidsFields() {
  const v = (pfKids?.value || "").toLowerCase();
  const show = (v === "var");
  if (pfKidsCount) pfKidsCount.style.display = show ? "block" : "none";
  if (pfKidsAges) pfKidsAges.style.display = show ? "block" : "none";
  if (!show) {
    if (pfKidsCount) pfKidsCount.value = "";
    if (pfKidsAges) pfKidsAges.value = "";
  }
}

function isProfileComplete(me) {
  if (!me) return false;
  const p = me.profile || {};
  const full = String(p.full_name || "").trim();
  const nick = String(p.nickname || "").trim();
  const gender = String(p.gender || "").trim();
  const age = String(p.age ?? "").trim();
  const h = String(p.height_cm ?? "").trim();
  const w = String(p.weight_kg ?? "").trim();
  return !!(full && nick && gender && age && h && w);
}

async function fetchMeSafe() {
  if (!getToken()) return null;
  try {
    const r = await apiFetch(PROFILE_ME_URL, { method: "GET", headers: { ...authHeaders() } }, 20000);
    meCache = r.data || null;
    return meCache;
  } catch {
    return null;
  }
}

function fillDrawer(me) {
  if (!me) return;
  const display = (me.display_name || me.email || "Üye").trim();
  const idText = (me.caynana_id || "ID-????").trim();
  const plan = (me.plan || "free").toUpperCase();
  const avatar = (me.profile && me.profile.avatar_url) ? me.profile.avatar_url : "";

  if (dpName) dpName.textContent = display;
  if (dpCN) dpCN.textContent = idText;
  if (dpPlan) dpPlan.textContent = plan;

  if (dpAvatar) {
    dpAvatar.src = avatar || FALLBACK_AVATAR;
    dpAvatar.onerror = () => (dpAvatar.src = FALLBACK_AVATAR);
  }
}

function fillProfileModal(me) {
  if (!me) return;

  const email = (me.email || "").trim();
  const idText = (me.caynana_id || "ID-????").trim();
  const plan = (me.plan || "free").toUpperCase();
  const avatar = (me.profile && me.profile.avatar_url) ? me.profile.avatar_url : "";

  if (profileEmail) profileEmail.textContent = email || "—";
  if (profileCN) profileCN.textContent = idText;
  if (profilePlan) profilePlan.textContent = plan;

  if (profileAvatar) {
    profileAvatar.src = avatar || FALLBACK_AVATAR;
    profileAvatar.onerror = () => (profileAvatar.src = FALLBACK_AVATAR);
  }

  const p = me.profile || {};
  if (pfFullName) pfFullName.value = p.full_name || "";
  if (pfNick) pfNick.value = p.nickname || "";
  if (pfGender) pfGender.value = p.gender || "";
  if (pfAge) pfAge.value = (p.age ?? "") === null ? "" : String(p.age ?? "");
  if (pfHeight) pfHeight.value = (p.height_cm ?? "") === null ? "" : String(p.height_cm ?? "");
  if (pfWeight) pfWeight.value = (p.weight_kg ?? "") === null ? "" : String(p.weight_kg ?? "");

  if (pfBio) pfBio.value = p.bio || "";
  if (pfMarital) pfMarital.value = p.marital || "";
  if (pfKids) pfKids.value = p.kids || "";
  if (pfKidsCount) pfKidsCount.value = (p.kids_count ?? "") === null ? "" : String(p.kids_count ?? "");
  if (pfKidsAges) pfKidsAges.value = p.kids_ages || "";
  if (pfSpouseName) pfSpouseName.value = p.spouse_name || "";
  if (pfCity) pfCity.value = p.city || "";
  if (pfJob) pfJob.value = p.job || "";
  if (pfPriority) pfPriority.value = p.priority || "";

  syncKidsFields();
}

function openProfile(force = false) {
  showModal(profileModal);
  setProfileStatus(force ? "Devam etmek için zorunlu alanları doldur." : "");
}
function closeProfile() { hideModal(profileModal); setProfileStatus(""); }

async function saveProfile() {
  const full_name = (pfFullName?.value || "").trim();
  const nickname = (pfNick?.value || "").trim();
  const gender = (pfGender?.value || "").trim();
  const age = parseInt((pfAge?.value || "").trim(), 10);
  const height_cm = parseInt((pfHeight?.value || "").trim(), 10);
  const weight_kg = parseInt((pfWeight?.value || "").trim(), 10);

  if (!full_name || !nickname || !gender || !Number.isFinite(age) || !Number.isFinite(height_cm) || !Number.isFinite(weight_kg)) {
    setProfileStatus("Zorunlu alanlar eksik. (Ad Soyad, Takma Ad, Cinsiyet, Yaş, Boy, Kilo)");
    return;
  }

  const payload = {
    full_name, nickname, gender, age, height_cm, weight_kg,
    bio: (pfBio?.value || "").trim(),
    marital: (pfMarital?.value || "").trim(),
    kids: (pfKids?.value || "").trim(),
    kids_count: (pfKidsCount?.value || "").trim() ? parseInt(pfKidsCount.value, 10) : null,
    kids_ages: (pfKidsAges?.value || "").trim(),
    spouse_name: (pfSpouseName?.value || "").trim(),
    city: (pfCity?.value || "").trim(),
    job: (pfJob?.value || "").trim(),
    priority: (pfPriority?.value || "").trim(),
  };

  setProfileStatus("Kaydediyorum…");
  try {
    await apiFetch(PROFILE_SET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }, 20000);

    setProfileStatus("Kaydedildi ✅");
    const me = await fetchMeSafe();
    if (me) fillDrawer(me);
    closeProfile();
  } catch (e) {
    setProfileStatus("Hata: " + (e?.message || "Kaydedilemedi"));
  }
}

// -------------------------
// REQUIRE LOGIN
// -------------------------
async function requireLogin(reasonText = "Evladım, önce Google ile giriş yapacaksın.") {
  await addBubble("ai", reasonText, false, "");
  openAuth();
}

// -------------------------
// GOOGLE GSI
// -------------------------
function ensureGoogleButton() {
  if (!googleBtn) return;
  googleBtn.innerHTML = "";

  if (!window.google?.accounts?.id) {
    setAuthStatus("Hata: Google bileşeni yüklenmedi.");
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (resp) => {
      try {
        setAuthStatus("Caynana’ya giriş yapılıyor… Lütfen bekleyiniz.");
        const r = await apiFetch(`${BASE_DOMAIN}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: resp.credential }),
        }, 25000);

        const j = r.data || {};
        if (!j.token) throw new Error(j.detail || "Google giriş başarısız");

        setToken(j.token);

        closeAuth();
        closeDrawer();
        setMenuLoggedIn();

        const me = await fetchMeSafe();
        if (me) {
          currentPlan = (me.plan || "free").toLowerCase();
          fillDrawer(me);

          if (!isProfileComplete(me)) {
            fillProfileModal(me);
            openProfile(true);
          }
        } else {
          if (dpAvatar) dpAvatar.src = FALLBACK_AVATAR;
          if (dpName) dpName.textContent = "Üye";
          if (dpCN) dpCN.textContent = "ID-????";
          if (dpPlan) dpPlan.textContent = "FREE";
        }
      } catch (e) {
        setAuthStatus("Hata: " + (e?.message || "Giriş başarısız"));
      }
    },
  });

  window.google.accounts.id.renderButton(googleBtn, {
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
  });
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
    const r = await apiFetch(NOTIF_URL, { method: "GET", headers: { ...authHeaders() } });
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
// Drawer / Page
// -------------------------
function openDrawer() { if (drawerMask) drawerMask.classList.add("show"); if (drawer) drawer.classList.add("open"); }
function closeDrawer() { if (drawerMask) drawerMask.classList.remove("show"); if (drawer) drawer.classList.remove("open"); }

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
// MODES
// -------------------------
const MODES = {
  chat: { label:"Sohbet", icon:"fa-comments", color:"#FFB300", title:"Caynana ile<br>iki lafın belini kır.", desc:"Biraz dur bakalım, neler anlatacaksın?", img:assetUrl("images/hero-chat.png"), ph:"Naber Caynana?", sugg:"Benim zamanımda her şey daha güzeldi ah ah…" },
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
    item.onclick = () => {
      if (!getToken()) return requireLogin("Evladım, modlara geçmek için önce giriş yap.");
      switchMode(k);
    };
    dock.appendChild(item);
  });
}

const modeChats = {};
function saveModeChat() { if (chatContainer) modeChats[currentMode] = chatContainer.innerHTML || ""; }
function loadModeChat(modeKey) {
  if (!chatContainer || !heroContent) return;
  chatContainer.innerHTML = modeChats[modeKey] || "";
  if (!chatContainer.innerHTML.trim()) { heroContent.style.display="block"; chatContainer.style.display="none"; }
  else { heroContent.style.display="none"; chatContainer.style.display="block"; scrollToBottom(true); }
}
function switchMode(modeKey) {
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
// Swipe + Double Tap / Dblclick
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
      if (!getToken()) return requireLogin("Evladım, modlara geçmek için önce giriş yap.");
      const idx = MODE_KEYS.indexOf(currentMode);
      const next = MODE_KEYS[(idx + 1) % MODE_KEYS.length];
      switchMode(next);
    });
  }

  // mobile double-tap
  if (brandTap) {
    let lastTap = 0;
    let lastX = 0, lastY = 0;
    brandTap.addEventListener("pointerup", (e) => {
      const now = Date.now();
      const dx = Math.abs((e.clientX || 0) - lastX);
      const dy = Math.abs((e.clientY || 0) - lastY);

      const isQuick = (now - lastTap) < 320;
      const isSameSpot = dx < 18 && dy < 18;

      if (isQuick && isSameSpot) {
        if (!getToken()) return requireLogin("Evladım, modlara geçmek için önce giriş yap.");
        const idx = MODE_KEYS.indexOf(currentMode);
        const next = MODE_KEYS[(idx + 1) % MODE_KEYS.length];
        switchMode(next);
        lastTap = 0;
        return;
      }
      lastTap = now; lastX = e.clientX || 0; lastY = e.clientY || 0;
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl }),
    }, 25000);
    return r.data || { ok: false, reason: "Kontrol edilemedi." };
  } catch {
    return { ok: false, reason: "Kontrol edemedim, tekrar dene." };
  }
}

// -------------------------
// Photo modal
// -------------------------
function resetModalOnly() {
  pendingImage = null;
  if (photoPreview) photoPreview.src = "";
  hideModal(photoModal);
  if (fileEl) fileEl.value = "";
}
if (photoCancelBtn) photoCancelBtn.onclick = resetModalOnly;

// -------------------------
// Bubbles + TTS
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

  // AI mesajına ses butonu
  if (role === "ai") {
    const sp = (speech && speech.trim()) ? speech : (text || "").replace(/[*_`#>-]/g, "").slice(0, 240);
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
  if (!getToken()) return requireLogin("Evladım, ses için önce giriş yap.");
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
// Shopping premium cards (tek sütun) — renk sabit, yıldız sayısı değişir
// -------------------------
function ensureShoppingStyles() {
  if (document.getElementById("caynanaShopStyles")) return;

  const s = document.createElement("style");
  s.id = "caynanaShopStyles";
  s.textContent = `
  @keyframes slideUpFade { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  .shopWrap{ margin-top:14px; display:flex; flex-direction:column; gap:14px; padding-bottom:18px; }
  .shopCard{
    background:#fff; border:1px solid rgba(0,0,0,0.06);
    border-radius:22px; overflow:hidden; position:relative;
    box-shadow:0 14px 34px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.65) inset;
    animation:slideUpFade .45s ease both;
  }
  .shopTop{ display:flex; gap:14px; padding:14px; align-items:center; position:relative; z-index:1; }
  .shopImgBox{
    width:110px; min-width:110px; height:110px; border-radius:18px;
    background:#fff; border:1px solid rgba(0,0,0,0.06);
    box-shadow:0 10px 22px rgba(0,0,0,0.08);
    display:flex; align-items:center; justify-content:center; overflow:hidden;
  }
  .shopImgBox img{ width:92%; height:92%; object-fit:contain; }
  .shopMeta{ flex:1; min-width:0; }
  .shopTitle{
    font-weight:950; color:#151515; font-size:15px; line-height:1.25; letter-spacing:-.2px;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
  }
  .shopPrice{ margin-top:6px; font-size:18px; font-weight:1000; color:var(--primary,#00C897); letter-spacing:-.6px; }

  .starBadge{
    margin-top:10px; display:inline-flex; align-items:center; gap:8px;
    padding:6px 12px 6px 6px; border-radius:999px;
    background:rgba(255,255,255,0.88); border:1px solid rgba(0,0,0,0.08);
    box-shadow:0 10px 22px rgba(0,0,0,0.10); backdrop-filter:blur(10px);
  }
  .starPill{
    width:30px; height:30px; border-radius:999px; display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:14px; font-weight:1000;
    background: linear-gradient(135deg,#FFB300,#FF6A00);
    box-shadow:0 10px 22px rgba(0,0,0,0.18);
  }
  .starLabel{ font-weight:1000; font-size:11px; color:#2b2b2b; letter-spacing:.3px; text-transform:uppercase; white-space:nowrap; }
  .stars{ font-weight:1000; font-size:12px; letter-spacing:-1px; color:#FFB300; white-space:nowrap; }

  .shopWhy{
    margin:0 14px 14px 14px; padding:12px 14px; border-radius:18px;
    background:#FFFBF0; border:1px solid rgba(255,179,0,0.14); border-left:5px solid #FFB300;
    font-weight:850; font-size:13px; line-height:1.45; color:#4e3a2f;
  }
  .shopBtn{
    margin:0 14px 14px 14px; height:50px; border-radius:16px;
    display:flex; align-items:center; justify-content:center; gap:10px;
    text-decoration:none; color:#fff; font-weight:1000;
    background: linear-gradient(135deg, var(--primary,#00C897), #111);
    box-shadow:0 14px 28px rgba(0,0,0,0.20);
  }
  .shopBtn:active{ transform:scale(.99); }
  `;
  document.head.appendChild(s);
}

function normStr(x){ return (x==null ? "" : String(x)).trim(); }
function pickUrl(p){ return normStr(p.url || p.link || p.product_url || p.productUrl || p.href); }
function pickTitle(p){ return normStr(p.title || p.name || p.product_title || p.productTitle || "Ürün"); }
function pickImg(p){ return normStr(p.image || p.image_url || p.imageUrl || p.img || p.thumbnail); }
function pickPrice(p){
  const raw = normStr(p.price || p.price_text || p.priceText || p.display_price || "");
  if (!raw) return "";
  if (/fiyat/i.test(raw) && /tıkla/i.test(raw)) return "";
  return raw;
}
function starsText(n){ return "★★★★★".slice(0,n) + "☆☆☆☆☆".slice(0,5-n); }

function buildWhyText(p, idx){
  const c = normStr(p.reason || p.why || p.caynana_reason || p.note);
  if (c) return c;

  const title = pickTitle(p).toLowerCase();
  const hints = [];
  if (/raf|dolap|kitap|ayakkabı/i.test(title)) hints.push("kurulum ve ölçü uyumu");
  if (/ahşap|mdf|metal/i.test(title)) hints.push("malzeme/iskelet sağlamlığı");
  if (/banyo|mutfak/i.test(title)) hints.push("nem/temizlik uyumu");
  if (!hints.length) hints.push("fiyat/performans dengesi");

  const variants = [
    `Evladım bunu öne aldım çünkü ${hints[0]} tarafı daha temiz duruyor. Ölçünü yazarsan daha da nokta atışı seçeriz.`,
    `Şuna “temiz tercih” derim: ${hints[0]} iyi. Satıcı yorumlarına bir bak, sonra “keşke” demeyelim.`,
    `Bu seçenek ${hints[0]} açısından daha güven veriyor. Aşırı ucuzun peşine düşme, dayanım önemli.`,
    `Bunu alternatif diye koydum: ${hints[0]} fena değil. Kurulum/yerleşimi kontrol edersen tadından yenmez.`,
  ];
  return variants[idx % variants.length];
}

function renderShoppingCards(products){
  if (!chatContainer) return;
  ensureShoppingStyles();

  const wrap = document.createElement("div");
  wrap.className = "shopWrap";

  (products || []).slice(0,6).forEach((p,i)=>{
    const url = pickUrl(p);
    const title = pickTitle(p);
    const img = pickImg(p);
    const price = pickPrice(p);
    const why = buildWhyText(p, i);
    const stars = Math.max(0, 5 - i); // 5,4,3,2,1,0

    const card = document.createElement("div");
    card.className = "shopCard";

    const top = document.createElement("div");
    top.className = "shopTop";

    const imgBox = document.createElement("div");
    imgBox.className = "shopImgBox";
    if (img){
      const im = document.createElement("img");
      im.src = img;
      im.alt = "img";
      im.onerror = () => { imgBox.innerHTML = `<div style="font-weight:900;color:#777;font-size:12px;">Görsel yok</div>`; };
      imgBox.appendChild(im);
    } else {
      imgBox.innerHTML = `<div style="font-weight:900;color:#777;font-size:12px;">Görsel yok</div>`;
    }

    const meta = document.createElement("div");
    meta.className = "shopMeta";
    meta.innerHTML = `
      <div class="shopTitle">${escapeHtml(title)}</div>
      ${price ? `<div class="shopPrice">${escapeHtml(price)}</div>` : ``}
      ${stars>0 ? `
        <div class="starBadge">
          <span class="starPill">★</span>
          <span class="starLabel">Caynana Yıldızları</span>
          <span class="stars">${escapeHtml(starsText(stars))}</span>
        </div>` : ``}
    `;

    top.appendChild(imgBox);
    top.appendChild(meta);

    const whyEl = document.createElement("div");
    whyEl.className = "shopWhy";
    whyEl.textContent = "👵 " + why;

    const btn = document.createElement("a");
    btn.className = "shopBtn";
    btn.target = "_blank";
    btn.rel = "noopener";
    if (url){
      btn.href = url;
      btn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Caynana Öneriyor — Ürüne Git`;
    } else {
      btn.href = "#";
      btn.style.opacity = "0.55";
      btn.style.pointerEvents = "none";
      btn.textContent = "Link yok (kaynak gelmedi)";
    }

    card.appendChild(top);
    card.appendChild(whyEl);
    card.appendChild(btn);

    wrap.appendChild(card);
  });

  chatContainer.appendChild(wrap);
  scrollToBottom(true);
}

// -------------------------
// Mic / Camera
// -------------------------
function startMic() {
  if (!getToken()) return requireLogin("Evladım, mikrofon için önce giriş yap.");
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
function openCamera() {
  if (!getToken()) return requireLogin("Evladım, fotoğraf göndermek için önce giriş yap.");
  if (fileEl) { fileEl.value = ""; fileEl.click(); }
}
function openFalCamera() { openCamera(); }

// -------------------------
// file input handling
// -------------------------
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

if (photoOkBtn) {
  photoOkBtn.onclick = async () => {
    hideModal(photoModal);

    if (currentMode === "fal" && falImages.length < 3) {
      setTimeout(() => openFalCamera(), 180);
      return;
    }

    if (currentMode === "fal" && textInput) {
      textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. İnsani anlat.";
    }

    await send();
    if (currentMode === "fal") resetFalCapture();
  };
}

// -------------------------
// SEND (tam) + shopping render
// -------------------------
async function send() {
  if (isSending) return;
  if (!getToken()) return requireLogin("Evladım, önce Google ile giriş yap.");

  let val = (textInput?.value || "").trim();
  if (pendingImage && !val) val = "Bu resmi yorumla";
  if (!val && !pendingImage) return;

  isSending = true;
  if (sendBtn) sendBtn.disabled = true;

  await addBubble("user", val);
  if (textInput) textInput.value = "";

  const loader = document.createElement("div");
  loader.className = "msg ai";
  loader.innerHTML = `<div class="bubble"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
  chatContainer.appendChild(loader);
  scrollToBottom(true);

  try {
    const r = await apiFetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        message: val,
        session_id: sessionId,
        image: pendingImage,
        mode: currentMode,
        persona: currentPersona
      }),
    }, 25000);

    pendingImage = null;
    loader.remove();

    const data = r.data || {};
    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");

    if (currentMode === "shopping" && Array.isArray(data.data) && data.data.length) {
      renderShoppingCards(data.data);
    }
  } catch (e) {
    pendingImage = null;
    loader.remove();
    await addBubble("ai", "Bağlantı sorunu: " + (e?.message || "Hata"), false, "");
  } finally {
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// -------------------------
// EVENTS
// -------------------------
function bindEvents() {
  // drawer
  if (menuBtn) menuBtn.onclick = openDrawer;
  if (drawerClose) drawerClose.onclick = closeDrawer;
  if (drawerMask) drawerMask.onclick = closeDrawer;

  // guest login buttons
  if (openLoginBtn) openLoginBtn.onclick = () => { openAuth(); closeDrawer(); };
  if (openAppleBtn) openAppleBtn.onclick = () => alert("Apple ile giriş yakında 👀");

  // auth close
  if (authCloseX) authCloseX.onclick = closeAuth;
  if (authClose) authClose.onclick = closeAuth;
  if (appleLoginBtn) appleLoginBtn.onclick = () => alert("Apple ile giriş yakında 👀");

  // profile modal
  if (profileCloseX) profileCloseX.onclick = closeProfile;
  if (profileSave) profileSave.onclick = saveProfile;
  if (pfKids) pfKids.addEventListener("change", syncKidsFields);

  if (openProfileBtn) openProfileBtn.onclick = async () => {
    if (!getToken()) return requireLogin("Evladım, profil için önce giriş.");
    const me = await fetchMeSafe();
    if (me) fillProfileModal(me);
    openProfile(false);
    closeDrawer();
  };

  // logout: token + sohbetleri temizle
  if (safeLogoutBtn) safeLogoutBtn.onclick = () => {
    setToken("");
    meCache = null;
    // sohbetleri temizle
    Object.keys(modeChats).forEach(k => modeChats[k] = "");
    if (chatContainer) chatContainer.innerHTML = "";
    if (heroContent) heroContent.style.display = "block";
    if (chatContainer) chatContainer.style.display = "none";

    setMenuLoggedOut();
    currentMode = "chat";
    applyHero("chat");
    renderDock();
    closeDrawer();
  };

  // persona
  if (personaBtn) personaBtn.onclick = () => {
    if (!getToken()) return requireLogin("Evladım, kaynana modları için giriş.");
    showModal(personaModal);
  };
  if (personaClose) personaClose.onclick = () => hideModal(personaModal);

  document.querySelectorAll("#personaModal .persona-opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      if (!getToken()) return requireLogin("Evladım, kaynana modları için giriş.");
      if (opt.classList.contains("locked")) return;
      document.querySelectorAll("#personaModal .persona-opt").forEach((x) => x.classList.remove("selected"));
      opt.classList.add("selected");
      currentPersona = opt.getAttribute("data-persona") || "normal";
      setTimeout(() => hideModal(personaModal), 120);
    });
  });

  // pages
  if (aboutBtn) aboutBtn.onclick = () => openPageFromFile("Hakkımızda", "./pages/hakkimizda.html");
  if (faqBtn) faqBtn.onclick = () => openPageFromFile("Sık Sorulan Sorular", "./pages/sss.html");
  if (contactBtn) contactBtn.onclick = () => openPageFromFile("İletişim", "./pages/iletisim.html");
  if (privacyBtn) privacyBtn.onclick = () => openPageFromFile("Gizlilik", "./pages/gizlilik.html");
  if (pageClose) pageClose.onclick = hidePage;

  // notifications
  if (notifIconBtn) notifIconBtn.onclick = openNotifications;
  if (notifClose) notifClose.onclick = () => hideModal(notifModal);

  // actions
  if (camBtn) camBtn.onclick = openCamera;
  if (falCamBtn) falCamBtn.onclick = openFalCamera;
  if (micBtn) micBtn.onclick = startMic;
  if (sendBtn) sendBtn.onclick = send;
  if (textInput) textInput.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
}

// -------------------------
// INIT
// -------------------------
async function init() {
  renderDock();
  applyHero("chat");
  loadModeChat("chat");
  setFalStepUI();

  bindSwipeAndDoubleTap();
  bindEvents();

  if (!getToken()) {
    setMenuLoggedOut();
  } else {
    setMenuLoggedIn();
    const me = await fetchMeSafe();
    if (me) {
      fillDrawer(me);
      if (!isProfileComplete(me)) {
        fillProfileModal(me);
        openProfile(true);
      }
    }
  }
}
init();
