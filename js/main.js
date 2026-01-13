// =============================
// CAYNANA WEB APP (FINAL - SAFE)
// =============================

/** ====== AYARLAR ====== */
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;

const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

// Web kilidi (webden kullanım istemiyorsan true bırak)
const WEB_LOCK = false; // true => masaüstünde kilit ekranı
const PLAY_URL = "https://play.google.com/store/apps/details?id=ai.caynana.app";
const APK_URL  = "#";

/** ====== STATE ====== */
const TOKEN_KEY = "caynana_token";
const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
const authHeaders = () => (getToken() ? { "Authorization": "Bearer " + getToken() } : {});

let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let currentAudio = null;
let pendingImage = null;
let currentMode = "chat";
let currentPersona = "normal";
let isSending = false;

let currentPlan = "free"; // free | plus | pro
const PLAN_PERSONAS = {
  free: ["normal"],
  plus: ["normal", "sevecen", "kizgin"],
  pro:  ["normal", "sevecen", "kizgin", "huysuz", "itirazci"]
};

// Fal: 3 foto
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

if (window.marked) marked.setOptions({ mangle: false, headerIds: false });

/** ====== DOM ====== */
const $ = (id) => document.getElementById(id);

const chatContainer = $("chatContainer");
const heroContent = $("heroContent");
const heroImage = $("heroImage");
const heroTitle = $("heroTitle");
const heroDesc = $("heroDesc");

const suggestionText = $("suggestionText");
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
const drawerClose = $("drawerClose"); // HTML'de yoksa sorun değil

const authModal = $("authModal");
const accountBtn = $("accountBtn");
const authClose = $("authClose");
const authCloseX = $("authCloseX"); // HTML'de yoksa sorun değil
const authLogout = $("authLogout");

const btnLoginTab = $("btnLoginTab");
const btnRegTab = $("btnRegTab");
const authEmail = $("authEmail");
const authPass = $("authPass");
const authSubmit = $("authSubmit");
const authStatus = $("authStatus");
const googleBtn = $("googleBtn");

const pageModal = $("pageModal");
const pageTitleEl = $("pageTitle");
const pageBodyEl = $("pageBody");
const pageClose = $("pageClose");

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

const webLock = $("webLock");
const lockAndroidBtn = $("lockAndroidBtn");
const lockApkBtn = $("lockApkBtn");

/** ====== HELPERS ====== */
function setAuthStatus(msg){
  if (authStatus) authStatus.textContent = msg;
}

function showAuthError(err){
  if (!authStatus) return;
  if (typeof err === "string") authStatus.textContent = "Hata: " + err;
  else if (err?.message) authStatus.textContent = "Hata: " + err.message;
  else {
    try { authStatus.textContent = "Hata: " + JSON.stringify(err); }
    catch { authStatus.textContent = "Hata: (bilinmeyen)"; }
  }
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function scrollToBottom(force = false) {
  if (!chatContainer) return;
  if (force) {
    requestAnimationFrame(() => chatContainer.scrollTop = chatContainer.scrollHeight);
    return;
  }
  const near = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 260;
  if (!near) return;
  requestAnimationFrame(() => chatContainer.scrollTop = chatContainer.scrollHeight);
}
window.addEventListener("resize", () => scrollToBottom(true));

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}

async function typeWriterEffect(element, text, speed = 26) {
  return new Promise(resolve => {
    let i = 0;
    element.innerHTML = "";
    element.classList.add("typing-cursor");
    function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        scrollToBottom(true);
        setTimeout(tick, speed);
      } else {
        element.classList.remove("typing-cursor");
        if (window.DOMPurify && window.marked) {
          element.innerHTML = DOMPurify.sanitize(marked.parse(text));
        } else {
          element.textContent = text;
        }
        scrollToBottom(true);
        resolve();
      }
    }
    tick();
  });
}

function showModal(el) { if (el) el.classList.add("show"); }
function hideModal(el) { if (el) el.classList.remove("show"); }

function showPage(title, html) {
  if (!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title;
  pageBodyEl.innerHTML = html;
  showModal(pageModal);
  if (drawerMask) drawerMask.classList.remove("show");
  if (drawer) drawer.classList.remove("open");
}
function hidePage() { hideModal(pageModal); }

/** ====== ASSET URLS ====== */
function assetUrl(relPath) {
  return new URL(`../${relPath}`, import.meta.url).href;
}

/** ====== MODES ====== */
const MODES = {
  chat: {
    label: "Sohbet", icon: "fa-comments", color: "#FFB300",
    title: "Caynana ile<br>iki lafın belini kır.",
    desc: "Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"),
    ph: "Naber Caynana?",
    sugg: "Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle: { top: "100px", left: "24px", textAlign: "left", width: "auto", maxWidth: "70%" }
  },
  shopping: {
    label: "Alışveriş", icon: "fa-bag-shopping", color: "#00C897",
    title: "Almadan önce<br>Caynana’ya sor.",
    desc: "Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"),
    ph: "Ne arıyorsun evladım?",
    sugg: "Her indirime atlayan sonunda pahalı öder.",
    heroStyle: { top: "110px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" }
  },
  fal: {
    label: "Fal", icon: "fa-mug-hot", color: "#8B5CF6",
    title: "Fincanı kapat<br>tabakla gönder.",
    desc: "3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"),
    ph: "",
    sugg: "Sadece fincan + tabak.",
    heroStyle: { top: "100px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" }
  },
  health: {
    label: "Sağlık", icon: "fa-heart-pulse", color: "#EF4444",
    title: "Caynana Sağlık'la<br>turp gibi ol.",
    desc: "Neren ağrıyor söyle bakayım?",
    img: assetUrl("images/hero-health.png"),
    ph: "Şikayetin ne?",
    sugg: "Çay üstüne sakın soğuk su içme!",
    heroStyle: { top: "110px", left: "24px", textAlign: "left", width: "auto", maxWidth: "70%" }
  },
  diet: {
    label: "Diyet", icon: "fa-carrot", color: "#84CC16",
    title: "Sağlıklı beslen<br>zinde kal!",
    desc: "Açlıktan değil, keyiften yiyin.",
    img: assetUrl("images/hero-diet.png"),
    ph: "Boy kilo kaç?",
    sugg: "Ekmek değil, yeşillik ye.",
    heroStyle: { top: "100px", left: "24px", textAlign: "left", width: "auto", maxWidth: "75%" }
  },
  food: {
    label: "Yemek", icon: "fa-utensils", color: "#F97316",
    title: "Bugün ne<br>pişirsem derdi biter.",
    desc: "Dolapta ne var söyle, tarif benden.",
    img: assetUrl("images/hero-food.png"),
    ph: "Dolapta ne var?",
    sugg: "Malzemeyi ziyan etme, bereket kaçar.",
    heroStyle: { top: "110px", left: "24px", textAlign: "left", width: "auto", maxWidth: "75%" }
  },
  law: {
    label: "Hukuk", icon: "fa-scale-balanced", color: "#3B82F6",
    title: "Hukuk işleri<br>şakaya gelmez.",
    desc: "Ben avukat değilim ama çok dava gördüm.",
    img: assetUrl("images/hero-law.png"),
    ph: "Derdini anlat.",
    sugg: "Sözleşmeye bakmadan imza atma!",
    heroStyle: { top: "110px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" }
  },
  astro: {
    label: "Burç", icon: "fa-star", color: "#D946EF",
    title: "Yıldızlar senin için<br>ne diyor?",
    desc: "Merkür retrosu falan… dikkat et.",
    img: assetUrl("images/hero-astro.png"),
    ph: "Burcun ne?",
    sugg: "Yıldıznameye baktım, yolun açık.",
    heroStyle: { top: "110px", left: "24px", textAlign: "left", width: "auto", maxWidth: "70%" }
  },
  translate: {
    label: "Çeviri", icon: "fa-language", color: "#64748B",
    title: "Çeviri lazım mı?<br>Söyle çevireyim.",
    desc: "Metni yapıştır veya fotoğrafını çek.",
    img: assetUrl("images/hero-translate.png"),
    ph: "Metni yaz.",
    sugg: "Bir lisan bir insan.",
    heroStyle: { top: "110px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" }
  },
  dream: {
    label: "Rüya", icon: "fa-cloud-moon", color: "#6366F1",
    title: "Rüyalar alemine<br>hoş geldin.",
    desc: "Hayırdır inşallah…",
    img: assetUrl("images/hero-dream.png"),
    ph: "Ne gördün?",
    sugg: "Rüyalar tersine çıkar derler ama…",
    heroStyle: { top: "110px", left: "0", textAlign: "center", width: "100%", maxWidth: "100%" }
  }
};

function applyHero(modeKey) {
  const m = MODES[modeKey] || MODES.chat;
  document.documentElement.style.setProperty("--primary", m.color);
  if (heroImage) heroImage.src = m.img;
  if (heroTitle) heroTitle.innerHTML = m.title;
  if (heroDesc) heroDesc.innerHTML = m.desc;

  const hs = m.heroStyle || {};
  if (heroContent) {
    heroContent.style.top = hs.top || "100px";
    heroContent.style.left = hs.left || "24px";
    heroContent.style.textAlign = hs.textAlign || "left";
    heroContent.style.width = hs.width || "auto";
    heroContent.style.maxWidth = hs.maxWidth || "70%";
  }

  if (textInput) textInput.placeholder = m.ph || "Bir şey yaz...";
  if (suggestionText) suggestionText.textContent = m.sugg || "";

  const dyn = document.querySelector(".oz-l-dynamic");
  if (dyn) dyn.style.background = m.color;
}

const modeChats = {};
function saveCurrentModeChat() { if (chatContainer) modeChats[currentMode] = chatContainer.innerHTML || ""; }
function loadModeChat(modeKey) {
  if (!chatContainer || !heroContent) return;
  chatContainer.innerHTML = modeChats[modeKey] || "";
  if (!chatContainer.innerHTML.trim()) {
    heroContent.style.display = "block";
    chatContainer.style.display = "none";
  } else {
    heroContent.style.display = "none";
    chatContainer.style.display = "block";
    scrollToBottom(true);
  }
}

function switchMode(modeKey) {
  if (modeKey === currentMode) return;
  saveCurrentModeChat();
  currentMode = modeKey;

  document.querySelectorAll(".dock-item").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-mode") === modeKey);
  });

  applyHero(modeKey);
  loadModeChat(modeKey);

  document.body.classList.toggle("fal-mode", modeKey === "fal");
  if (modeKey === "fal") resetFalCapture();
}

/** ====== DOCK ====== */
function renderDock() {
  if (!dock) return;
  dock.innerHTML = "";
  Object.keys(MODES).forEach(k => {
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

(function dockDragClickGuard() {
  if (!dock) return;
  let downX = 0, downY = 0, moved = false;
  dock.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; moved = false; }, { passive: true });
  dock.addEventListener("pointermove", (e) => {
    if (Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10) moved = true;
  }, { passive: true });
  dock.addEventListener("click", (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

/** ====== PERSONA + PLAN ====== */
function allowedPersonas() { return PLAN_PERSONAS[currentPlan] || ["normal"]; }

function refreshPersonaLocks() {
  const allow = new Set(allowedPersonas());
  document.querySelectorAll("#personaModal .persona-opt").forEach(opt => {
    const id = opt.getAttribute("data-persona");
    const icon = opt.querySelector("i");

    if (id === currentPersona) {
      opt.classList.add("selected");
      opt.classList.remove("locked");
      if (icon) { icon.className = "fa-solid fa-check"; icon.style.display = "block"; }
      return;
    }

    opt.classList.remove("selected");

    if (!allow.has(id)) {
      opt.classList.add("locked");
      if (icon) { icon.className = "fa-solid fa-lock"; icon.style.display = "block"; }
    } else {
      opt.classList.remove("locked");
      if (icon) icon.style.display = "none";
    }
  });
}

async function pullPlanFromBackend() {
  if (!getToken()) { currentPlan = "free"; refreshPersonaLocks(); return; }
  try {
    const r = await fetch(`${BASE_DOMAIN}/api/memory/get`, { method: "GET", headers: { ...authHeaders() } });
    const j = await r.json();
    const plan = ((j.profile || {}).plan || "free").toLowerCase();
    currentPlan = (plan === "plus" || plan === "pro") ? plan : "free";
  } catch {
    currentPlan = "free";
  }
  refreshPersonaLocks();
}

/** ====== GOOGLE SIGN-IN (GSI) ====== */
// Not: Google, gsi/client yüklü değilse WebView'de gözükmez.
// Bu fonksiyon auth modal açıldığında tekrar render eder.
function ensureGoogleButton() {
  if (!googleBtn) return;

  // temizle (webview bazen ikinci renderda bozuluyor)
  googleBtn.innerHTML = "";

  if (!window.google?.accounts?.id) {
    showAuthError("Google bileşeni yüklenmedi. (Android System WebView/Chrome güncel mi?)");
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        try {
          setAuthStatus("Google ile giriş yapılıyor…");

          // ✅ Backend’in beklediği alan: id_token
          const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: resp.credential })
          });

          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.detail || "Google giriş hatası");

          setToken(j.token);
          setAuthStatus(`Bağlandı ✅ (${j.email || "Google"})`);
          await pullPlanFromBackend();
          setTimeout(() => hideModal(authModal), 450);
        } catch (e) {
          showAuthError(e);
        }
      }
    });

    google.accounts.id.renderButton(googleBtn, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 280
    });
  } catch (e) {
    showAuthError(e);
  }
}

/** ====== EMAIL LOGIN/REGISTER ====== */
let authMode = "login";
async function handleAuthSubmit(){
  const email = (authEmail?.value || "").trim();
  const password = (authPass?.value || "").trim();
  setAuthStatus("İşlem yapıyorum…");

  try {
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const r = await fetch(`${BASE_DOMAIN}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.detail || "Hata");

    setToken(j.token);
    setAuthStatus(`Bağlandı ✅ (${j.email || email})`);
    await pullPlanFromBackend();
    setTimeout(() => hideModal(authModal), 450);
  } catch (e) {
    showAuthError(e);
  }
}

/** ====== PHOTO / FAL ====== */
function openCamera() { if (fileEl) { fileEl.value = ""; fileEl.click(); } }
function openFalCamera() { openCamera(); }

function setFalStepUI() {
  if (!falStepText || !falStepSub) return;
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
    const r = await fetch(FAL_CHECK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: dataUrl })
    });
    return await r.json();
  } catch {
    return { ok: false, reason: "Kontrol edemedim, tekrar dene." };
  }
}

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
          await addBubble("ai", check.reason || "Evladım bu fincan-tabak değil. Yeniden çek.", false, "");
          resetModalOnly();
          setTimeout(() => openFalCamera(), 200);
          return;
        }

        falImages.push(imgData);
        setFalStepUI();

        pendingImage = imgData;
        if (photoPreview) photoPreview.src = pendingImage;
        if (photoTitle) photoTitle.textContent = "Fal fotoğrafı";
        if (photoHint) {
          photoHint.textContent = (falImages.length < 3)
            ? `Tamam deyince ${FAL_STEPS[falImages.length] || "bir sonraki açıya"} geçiyoruz.`
            : "Tamam deyince fala bakıyorum.";
        }
        showModal(photoModal);
        return;
      }

      pendingImage = imgData;
      if (photoPreview) photoPreview.src = pendingImage;
      if (photoTitle) photoTitle.textContent = "Fotoğraf hazır";
      if (photoHint) photoHint.textContent = "Tamam deyince Caynana hemen yoruma başlayacak.";
      showModal(photoModal);
    };
    reader.readAsDataURL(f);
  });
}

if (photoCancelBtn) {
  photoCancelBtn.onclick = () => {
    if (currentMode === "fal") {
      falImages = falImages.slice(0, Math.max(0, falImages.length - 1));
      setFalStepUI();
    }
    resetModalOnly();
  };
}

if (photoOkBtn) {
  photoOkBtn.onclick = async () => {
    hideModal(photoModal);

    if (currentMode === "fal") {
      if (falImages.length < 3) {
        setTimeout(() => openFalCamera(), 220);
        return;
      }
      const collage = await makeFalCollage(falImages);
      pendingImage = collage;
      if (textInput) textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. Gerçekçi ve insani anlat.";
      await send();
      resetFalCapture();
      return;
    }

    if (textInput) textInput.value = "";
    await send();
  };
}

async function makeFalCollage(imgList) {
  const imgs = await Promise.all(imgList.map(loadImage));
  const W = 900, H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  const pad = 18;
  const cellW = (W - pad * 3) / 2;
  const cellH = (H - pad * 3) / 2;

  drawContain(ctx, imgs[0], pad, pad, cellW, cellH);
  drawContain(ctx, imgs[1], pad * 2 + cellW, pad, cellW, cellH);
  drawContain(ctx, imgs[2], pad, pad * 2 + cellH, W - pad * 2, cellH);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawContain(ctx, img, x, y, w, h) {
  const iw = img.width, ih = img.height;
  const ir = iw / ih, r = w / h;

  let dw = w, dh = h, dx = x, dy = y;
  if (ir > r) { dh = w / ir; dy = y + (h - dh) / 2; }
  else { dw = h * ir; dx = x + (w - dw) / 2; }

  ctx.save();
  roundRect(ctx, x, y, w, h, 16);
  ctx.clip();
  ctx.fillStyle = "#f6f6f6";
  ctx.fillRect(x, y, w, h);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();
}

/** ====== CHAT BUBBLES + CARDS ====== */
async function addBubble(role, text, isLoader = false, speech = "", imgData = null, id = null) {
  if (!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;
  if (id) div.id = id;

  let content = "";
  if (imgData) {
    content += `<img class="chat-img" src="${imgData}" onclick="event.stopPropagation()">`;
  }

  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display = "none";
  chatContainer.style.display = "block";
  scrollToBottom(true);

  if (role === "ai" && !isLoader) {
    await typeWriterEffect(bubble, text);
  } else {
    bubble.innerHTML += (role === "user" ? escapeHtml(text) : text);
    scrollToBottom(true);
  }

  if (role === "ai") {
    const sp = (speech && speech.trim()) ? speech : (text || "").replace(/[*_`#>-]/g, "").slice(0, 280);
    const btn = document.createElement("div");
    btn.className = "audio-btn";
    btn.dataset.speech = sp;
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
    scrollToBottom(true);
  }

  return div;
}

function renderCards(list) {
  if (!chatContainer) return;
  const wrap = document.createElement("div");
  wrap.className = "cards";

  (list || []).forEach((p, idx) => {
    const badge = (idx === 0) ? { k: "gold", t: "ALTIN" } : (idx === 1) ? { k: "silver", t: "GÜMÜŞ" } : null;
    const bHtml = badge ? `<div class="card-badge ${badge.k}">${badge.t}</div>` : "";
    const score = p.caynana_score || 70;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${bHtml}
      <img class="pimg" src="${p.image || ""}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300?text=Urun';">
      <div class="card-body">
        <div class="title">${escapeHtml(p.title || "")}</div>
        <div class="price">${escapeHtml(p.price || "")}</div>
        <div class="score-wrap">
          <span>Caynana Puanı</span>
          <span class="score-pill">${score}</span>
        </div>
        <a class="btnLink" href="${p.url || "#"}" target="_blank" rel="noopener">İNCELE</a>
      </div>
    `;
    wrap.appendChild(div);
  });

  chatContainer.appendChild(wrap);
  scrollToBottom(true);
}

/** ====== AUDIO (TTS) ====== */
if (chatContainer) {
  chatContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".audio-btn");
    if (!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}

async function playAudio(text, btn) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

  document.querySelectorAll(".audio-btn.playing").forEach(b => {
    b.classList.remove("playing");
    b.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
  });

  const oldHtml = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;

  try {
    const r = await fetch(SPEAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: currentPersona })
    });

    const blob = await r.blob();
    currentAudio = new Audio(URL.createObjectURL(blob));
    currentAudio.onended = () => {
      btn.classList.remove("playing");
      btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    };
    await currentAudio.play();
    btn.classList.add("playing");
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
  } catch {
    btn.innerHTML = oldHtml;
  }
}

/** ====== SEND ====== */
async function send() {
  if (isSending) return;
  if (!textInput || !sendBtn || !chatContainer || !heroContent) return;

  let val = (textInput.value || "").trim();
  if (pendingImage && val === "") val = "Bu resmi yorumla";
  if (!val && !pendingImage) return;

  isSending = true;
  sendBtn.disabled = true;

  heroContent.style.display = "none";
  chatContainer.style.display = "block";

  await addBubble("user", val, false, "", pendingImage);
  textInput.value = "";

  const loaderId = "ldr_" + Date.now();
  await addBubble("ai", "<i class='fa-solid fa-spinner fa-spin'></i>", true, "", null, loaderId);

  const payload = { message: val, session_id: sessionId, image: pendingImage, mode: currentMode, persona: currentPersona };
  pendingImage = null;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();

    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");

    if (currentMode === "shopping" && Array.isArray(data.data) && data.data.length > 0) {
      renderCards(data.data);
    }

    scrollToBottom(true);
    saveCurrentModeChat();
  } catch {
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();
    await addBubble("ai", "Bağlantı hatası oldu evladım. Bir daha dene.", false, "");
    saveCurrentModeChat();
  } finally {
    isSending = false;
    sendBtn.disabled = false;
  }
}

/** ====== PAGES ====== */
function planHtml() {
  return `
    <div style="display:grid; gap:10px;">
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Free</div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">
          Günlük <b>2 fal</b> • Sınırlı sohbet • Sadece <b>Normal</b> Kaynana
        </div>
      </div>
      <div style="padding:12px;border:2px solid var(--primary);border-radius:16px;background:#fff8e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Plus</div>
          <div style="font-weight:1000;color:var(--primary);">79,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">
          Günlük <b>5 fal</b> • Daha fazla sohbet • <b>Sevecen</b> + <b>Kızgın</b> mod açılır
        </div>
      </div>
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Pro</div>
          <div style="font-weight:1000;color:#111;">119,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">
          <b>Sınırsız</b> fal/sohbet • <b>Huysuz</b> + <b>İtirazcı</b> dahil tüm modlar
        </div>
      </div>
      <div style="font-size:12px;color:#666;font-weight:800;line-height:1.5;">
        Ödemeler <b>Google Play</b> üzerinden yapılır. Kart bilgisi uygulamada tutulmaz.
        Abonelik iptali: Google Play → Abonelikler.
      </div>
    </div>
  `;
}
function aboutHtml() { return `<p><b>Caynana</b>, “Yapay zekânın geleneksel aklı”. Sohbet, fal ve yorum içerikleri eğlence ve rehberlik amaçlıdır.</p><p style="margin-top:8px;">Üyelik ile limitler genişler ve kaynana modları açılır.</p>`; }
function faqHtml() { return `<p><b>1) Üyelik nasıl iptal edilir?</b><br>Google Play → Abonelikler kısmından.</p><p style="margin-top:8px;"><b>2) Ücretsiz kullanım var mı?</b><br>Var: Günlük limit bulunur.</p><p style="margin-top:8px;"><b>3) Alışveriş modülü ücretli mi?</b><br>Hayır, alışveriş sınırsızdır.</p><p style="margin-top:8px;"><b>4) Fal kesin mi?</b><br>Fal eğlencedir, kesin hüküm içermez.</p>`; }
function contactHtml() { return `<p>Destek: <b>support@caynana.ai</b></p><p style="margin-top:8px;">Geri bildirim: Uygulama içinden veya e-posta ile.</p>`; }
function privacyHtml() { return `<p><b>Gizlilik</b><br>Minimum veri prensibiyle çalışırız. Hesap için e-posta saklanır.</p><p style="margin-top:8px;">Ödeme işlemleri Google Play üzerinden yürür. Kart bilgisi uygulama tarafından tutulmaz.</p>`; }

/** ====== MODE CYCLE ====== */
const modeKeys = Object.keys(MODES);
function cycleMode(step = 1) {
  const idx = modeKeys.indexOf(currentMode);
  const next = modeKeys[(idx + step + modeKeys.length) % modeKeys.length];
  switchMode(next);
}

/** ====== WEB LOCK ====== */
function applyWebLock() {
  if (!WEB_LOCK) return;
  if (isMobile()) return;

  if (lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if (lockApkBtn) lockApkBtn.href = APK_URL;
  showModal(webLock);
}

/** ====== EVENTS SAFE BIND ====== */
function bindEvents(){
  if (personaBtn && personaModal) {
    personaBtn.onclick = () => { refreshPersonaLocks(); showModal(personaModal); };
  }
  if (personaClose && personaModal) personaClose.onclick = () => hideModal(personaModal);
  if (personaModal) personaModal.addEventListener("click", (e) => { if (e.target === personaModal) hideModal(personaModal); });

  document.querySelectorAll("#personaModal .persona-opt").forEach(opt => {
    opt.addEventListener("click", () => {
      const id = opt.getAttribute("data-persona");
      const allow = new Set(allowedPersonas());
      if (!allow.has(id)) {
        hideModal(personaModal);
        showPage("Üyelik", planHtml());
        return;
      }
      currentPersona = id;
      refreshPersonaLocks();
      setTimeout(() => hideModal(personaModal), 150);
    });
  });

  if (menuBtn && drawer && drawerMask) {
    menuBtn.onclick = () => { drawerMask.classList.add("show"); drawer.classList.add("open"); };
  }
  if (drawerClose && drawer && drawerMask) {
    drawerClose.onclick = () => { drawerMask.classList.remove("show"); drawer.classList.remove("open"); };
  }
  if (drawerMask && drawer) {
    drawerMask.onclick = () => { drawerMask.classList.remove("show"); drawer.classList.remove("open"); };
  }

  if (pageClose) pageClose.onclick = hidePage;
  if (pageModal) pageModal.addEventListener("click", (e) => { if (e.target === pageModal) hidePage(); });

  if (accountBtn && authModal) {
    accountBtn.onclick = () => {
      showModal(authModal);
      setAuthStatus(getToken() ? "Bağlı ✅" : "Bağlı değil ❌");
      // ✅ Auth açılınca google butonu render et
      setTimeout(ensureGoogleButton, 120);
    };
  }
  if (authClose && authModal) authClose.onclick = () => hideModal(authModal);
  if (authCloseX && authModal) authCloseX.onclick = () => hideModal(authModal);
  if (authModal) authModal.addEventListener("click", (e) => { if (e.target === authModal) hideModal(authModal); });

  if (btnLoginTab && btnRegTab && authSubmit) {
    btnLoginTab.onclick = () => {
      authMode = "login";
      btnLoginTab.classList.add("tabActive");
      btnRegTab.classList.remove("tabActive");
      authSubmit.textContent = "Giriş Yap";
    };
    btnRegTab.onclick = () => {
      authMode = "register";
      btnRegTab.classList.add("tabActive");
      btnLoginTab.classList.remove("tabActive");
      authSubmit.textContent = "Kayıt Ol";
    };
  }

  if (authSubmit) authSubmit.onclick = handleAuthSubmit;

  if (authLogout) {
    authLogout.onclick = async () => {
      setToken("");
      currentPlan = "free";
      currentPersona = "normal";
      refreshPersonaLocks();
      setAuthStatus("Çıkış yapıldı ❌");
    };
  }

  if (planBtn) planBtn.onclick = () => showPage("Üyelik", planHtml());
  if (aboutBtn) aboutBtn.onclick = () => showPage("Hakkımızda", aboutHtml());
  if (faqBtn) faqBtn.onclick = () => showPage("Sık Sorulan Sorular", faqHtml());
  if (contactBtn) contactBtn.onclick = () => showPage("İletişim", contactHtml());
  if (privacyBtn) privacyBtn.onclick = () => showPage("Gizlilik", privacyHtml());

  if (brandTap) brandTap.onclick = () => cycleMode(1);

  if (camBtn) camBtn.onclick = () => openCamera();
  if (falCamBtn) falCamBtn.onclick = () => openFalCamera();

  if (textInput) textInput.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
  if (sendBtn) sendBtn.onclick = () => send();

  if (micBtn) micBtn.onclick = () => startMic();
}

/** ====== INIT ====== */
function init() {
  applyWebLock();

  if (lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if (lockApkBtn) lockApkBtn.href = APK_URL;

  renderDock();
  applyHero("chat");
  loadModeChat("chat");

  document.body.classList.remove("fal-mode");
  setFalStepUI();

  // plan
  pullPlanFromBackend();

  // events
  bindEvents();

  // Google script gelince hazırla (modal açılınca da render ediyoruz)
  const waitGoogle = setInterval(() => {
    if (window.google?.accounts?.id) {
      clearInterval(waitGoogle);
      // burada direkt render etmiyoruz, auth açılınca render daha sağlam
    }
  }, 150);
}

init();
