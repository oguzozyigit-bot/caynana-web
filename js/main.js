/* js/main.js (v60.1 - AUTH.JS UYUMLU / TEK GİRİŞ / MENU & COLORS KORUNDU) */

import { BASE_DOMAIN, GOOGLE_CLIENT_ID, STORAGE_KEY, PLACEHOLDER_IMG } from "./config.js";
import { initAuth, handleLogin, logout } from "./auth.js";
import { initPartials } from "./partials.js";
import { initUi } from "./ui_modals.js";
import { initNotif } from "./notif.js";

// 1. MODE AYARLARI (AYNI)
const MODE_CONFIG = {
  chat:      { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false },
  shopping:  { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true },
  dedikodu:  { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", showCam: false },
  fal:       { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", showCam: true, specialInput: "fal" },
  astro:     { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Yıldızlar senin için parlıyor.", color: "#7986CB", icon: "fa-star", showCam: false, specialInput: "astro" },
  ruya:      { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", showCam: false },
  health:    { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", showCam: true },
  diet:      { title: "Boğazını Tut<br>Rahat Et.", desc: "Diyet Listeni Hazırladım.", color: "#AED581", icon: "fa-carrot", showCam: false, specialInput: "diet" },
  trans:     { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true }
};
const MODULE_ORDER = ["chat","shopping","dedikodu","fal","astro","ruya","health","diet","trans"];

let currentPersona = "normal";
let currentAudio = null;
let lastBotResponseText = "";
window.currentAppMode = "chat";

/* =========================
   HELPERS
========================= */
function safeJson(s, fallback={}){ try{ return JSON.parse(s||""); }catch{ return fallback; } }
function getUser(){
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}
function isLoggedIn(){
  const u = getUser();
  return !!(u?.isSessionActive && u?.id && u?.provider && u?.provider !== "guest");
}
function getHitap(u){
  // anayasa: önce ad; profil hitap varsa onu kullan
  const h = (u?.hitap || "").trim();
  if(h) return h;
  const full = (u?.fullname || "").trim();
  if(!full) return "Misafir";
  return full.split(/\s+/)[0]; // sadece ad
}

/* =========================
   BOOT
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  // UI modülleri (modal/drawer vs)
  try { initUi(); } catch(e) {}

  // partial'lar (menu/notif mount vs)
  try { await initPartials(); } catch(e) {}

  // auth init (GIS)
  try { initAuth(); } catch(e) {}

  // notif init (reminders)
  try { await initNotif({ baseUrl: BASE_DOMAIN }); } catch(e) {}

  initDock();
  setAppMode("chat");

  // ✅ Login sonrası tek kapı
  window.enterApp = () => {
    // login modal varsa kapat
    const am = document.getElementById("authModal");
    if (am) am.style.display = "none";

    updateUIForUser();
  };

  // İlk UI güncelle
  updateUIForUser();

  // send handlers
  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("text")?.addEventListener("keydown", (e) => { if(e.key === "Enter") sendMessage(); });

  // Eğer Google script yüklü değilse bile site kırılmasın
  // GOOGLE_CLIENT_ID burada sadece config bütünlüğü için duruyor
  void GOOGLE_CLIENT_ID;
});

/* =========================
   DOCK / MODE
========================= */
function initDock() {
  const dock = document.getElementById("dock");
  if(!dock) return;
  dock.innerHTML = "";

  MODULE_ORDER.forEach((key) => {
    const color = MODE_CONFIG[key].color;
    dock.innerHTML += `
      <div class="dock-item" onclick="setAppMode('${key}')">
        <div class="dock-icon" style="color:${color}; border-color:${color}40;">
          <i class="fa-solid ${MODE_CONFIG[key].icon}"></i>
        </div>
      </div>`;
  });
}

window.setAppMode = setAppMode;
function setAppMode(m) {
  window.currentAppMode = m;
  const c = MODE_CONFIG[m];
  if(!c) return;

  const heroTitle = document.getElementById("heroTitle");
  const heroDesc  = document.getElementById("heroDesc");
  if (heroTitle) heroTitle.innerHTML = c.title;
  if (heroDesc)  heroDesc.innerHTML  = c.desc;

  document.documentElement.style.setProperty("--primary", c.color);

  const img = document.getElementById("heroImage");
  if (img) {
    img.style.opacity = "0";
    setTimeout(() => {
      img.src = `./images/hero-${m}.png`;
      img.onload = () => (img.style.opacity = "1");
    }, 200);
  }

  ["falInputArea","stdInputArea","dietActions","astroActions"].forEach((i) => {
    const el = document.getElementById(i);
    if (el) el.style.display = "none";
  });

  if (c.specialInput === "fal") document.getElementById("falInputArea")?.style.display = "flex";
  else document.getElementById("stdInputArea")?.style.display = "flex";

  if (c.specialInput === "diet") document.getElementById("dietActions")?.style.display = "flex";
  if (c.specialInput === "astro") document.getElementById("astroActions")?.style.display = "flex";

  // ALT ÇİZGİLERİ RENKLENDİR
  const idx = MODULE_ORDER.indexOf(m);
  for (let i = 0; i < 4; i++) {
    const line = document.querySelector(`.oz-lines span:nth-child(${i + 1})`);
    const modeKey = MODULE_ORDER[(idx + i) % MODULE_ORDER.length];
    if (line) line.style.background = MODE_CONFIG[modeKey].color;
  }

  const chat = document.getElementById("chatContainer");
  if(chat) chat.innerHTML = "";
}

/* =========================
   MENU UPDATE (STORAGE_KEY UYUMLU)
========================= */
function updateUIForUser() {
  const u = getUser();
  const menu = document.querySelector(".menu-list");
  const footer = document.querySelector(".menu-footer");
  const userInfoBar = document.getElementById("userInfoBar");

  if (!menu || !footer) return;

  const logged = !!(u?.isSessionActive && u?.id);

  if (logged) {
    // GİRİŞ VAR
    userInfoBar?.classList.add("visible");

    const hitap = getHitap(u);
    const avatar = u.avatar || PLACEHOLDER_IMG;

    const headerHitap = document.getElementById("headerHitap");
    const headerAvatar = document.getElementById("headerAvatar");
    if (headerHitap) headerHitap.innerText = String(hitap || "MİSAFİR").toUpperCase();
    if (headerAvatar) headerAvatar.src = avatar;

    menu.innerHTML = `
      <div style="text-align:center; margin-bottom:15px;">
        <img src="${avatar}" style="width:60px; height:60px; border-radius:50%; border:2px solid var(--primary);">
        <div style="color:#fff; font-weight:700; margin-top:5px;">${hitap}</div>
      </div>
      <a href="pages/profil.html" class="menu-item" style="border:1px solid var(--primary);"><i class="fa-solid fa-user-pen"></i> Profil Düzenle</a>
      <a href="pages/sss.html" class="menu-item"><i class="fa-solid fa-circle-question"></i> S.S.S</a>
      <a href="pages/gizlilik.html" class="menu-item"><i class="fa-solid fa-shield-halved"></i> Gizlilik</a>
      <a href="pages/iletisim.html" class="menu-item"><i class="fa-solid fa-envelope"></i> İletişim</a>
      <div class="menu-item" onclick="window.handleLogout()" style="color:#f44; margin-top:15px;"><i class="fa-solid fa-right-from-bracket"></i> Çıkış Yap</div>
    `;
  } else {
    // GİRİŞ YOK
    userInfoBar?.classList.remove("visible");

    menu.innerHTML = `
      <div style="text-align:center; padding:20px; color:#ccc; font-size:13px;">
        Giriş yapmazsan seni tanıyamam evladım.
      </div>

      <!-- Google butonu (GIS prompt) -->
      <div class="menu-item" onclick="window.handleGoogleLogin()" style="background:#fff; color:#000; text-align:center; justify-content:center; cursor:pointer;">
        <i class="fa-brands fa-google"></i> Google ile Bağlan
      </div>

      <!-- Dev login (opsiyonel) -->
      <div class="menu-item" onclick="window.handleDevLogin()" style="background:#333; border:1px dashed #666; color:#aaa; text-align:center; justify-content:center; cursor:pointer; font-size:11px;">
        <i class="fa-solid fa-key"></i> Test Girişi
      </div>

      <a href="pages/sss.html" class="menu-item"><i class="fa-solid fa-circle-question"></i> S.S.S</a>
      <a href="pages/gizlilik.html" class="menu-item"><i class="fa-solid fa-shield-halved"></i> Gizlilik</a>
      <a href="pages/iletisim.html" class="menu-item"><i class="fa-solid fa-envelope"></i> İletişim</a>
    `;
  }

  footer.innerHTML = `<span>@CaynanaAI By Ozyigits</span>`;
}

/* =========================
   CHAT
========================= */
async function sendMessage() {
  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  // ✅ Dev bypass
  const token = localStorage.getItem("auth_token");
  if (token === "dev_token_bypass") {
    input.value = "";
    addBubble(txt, "user");
    const badge = document.getElementById("caynanaSpeaking");
    if (badge) { badge.style.display = "flex"; badge.innerText = "Yazıyor..."; }
    setTimeout(() => {
      typeWriter("Test modundasın, ses çalışmaz ama her şey yolunda.", () => {
        if (badge) badge.style.display = "none";
        addSpeakButton();
      });
    }, 500);
    return;
  }

  // ✅ Normal giriş kontrolü (auth.js)
  if (!isLoggedIn()) {
    triggerAuth("Giriş yap önce.");
    return;
  }

  input.value = "";
  addBubble(txt, "user");

  const badge = document.getElementById("caynanaSpeaking");
  if (badge) { badge.style.display = "flex"; badge.innerText = "Yazıyor..."; }

  try {
    const u = getUser();
    const idToken = (localStorage.getItem("google_id_token") || "").trim();

    const payload = {
      message: txt,
      mode: window.currentAppMode,
      persona: currentPersona,
      user_id: u.id,
      email: u.email || "",
      google_id_token: idToken || "",
      system_instruction: `Sen Caynanasın. Kullanıcı: ${getHitap(u) || "Evlat"}. Mod: ${currentPersona}.`
    };

    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    lastBotResponseText = data.assistant_text || "...";

    typeWriter(lastBotResponseText, () => {
      if (badge) badge.style.display = "none";
      addSpeakButton();
      if (data.data && data.data.length > 0) renderProducts(data.data);
    });

  } catch (e) {
    addBubble("Bağlantı koptu.", "bot");
    if (badge) badge.style.display = "none";
  }
}

function addSpeakButton() {
  const rows = document.querySelectorAll(".msg-row.bot");
  const lastRow = rows[rows.length - 1];
  if (lastRow) {
    const bubble = lastRow.querySelector(".msg-bubble");
    bubble?.insertAdjacentHTML(
      "beforeend",
      `<div class="speak-btn-inline" onclick="window.fetchAndPlayAudio()"><i class="fa-solid fa-volume-high"></i> Caynana'yı Konuştur</div>`
    );
  }
}

/* =========================
   SPEECH
========================= */
window.fetchAndPlayAudio = async () => {
  if (!lastBotResponseText) return;

  const token = localStorage.getItem("auth_token");
  if (token === "dev_token_bypass") { alert("Test modunda ses yok."); return; }

  const btns = document.querySelectorAll(".speak-btn-inline");
  const btn = btns[btns.length - 1];
  if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Hazırlanıyor...`;

  try {
    const u = getUser();
    const idToken = (localStorage.getItem("google_id_token") || "").trim();

    const res = await fetch(`${BASE_DOMAIN}/api/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text_to_comment: lastBotResponseText,
        persona: currentPersona,
        user_id: u.id,
        email: u.email || "",
        google_id_token: idToken || ""
      })
    });

    const data = await res.json();
    if (data.audio_data) {
      playAudioRaw(data.audio_data);
      if (btn) btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Tekrarla`;
    } else {
      if (btn) btn.innerHTML = `Hata`;
    }
  } catch (e) {
    if (btn) btn.innerHTML = `Hata`;
    alert("Backend bağlantısı yok.");
  }
};

function playAudioRaw(b64) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  try { currentAudio = new Audio("data:audio/mp3;base64," + b64); currentAudio.play(); } catch(e) {}
}

/* =========================
   GLOBAL UI HELPERS (KORUNDU / UYUMLANDI)
========================= */
window.openDrawer = () => { document.getElementById("drawerMask") && (document.getElementById("drawerMask").style.display = "flex"); };
window.closeDrawer = () => { document.getElementById("drawerMask") && (document.getElementById("drawerMask").style.display = "none"); };

window.openPersonaModal = () => { document.getElementById("personaModal") && (document.getElementById("personaModal").style.display = "flex"); };
window.changePersona = (p) => {
  currentPersona = p;
  const pm = document.getElementById("personaModal");
  if (pm) pm.style.display = "none";
  addBubble(`Mod: ${String(p || "").toUpperCase()}`, "bot");
};

window.clearCurrentChat = () => { const c = document.getElementById("chatContainer"); if(c) c.innerHTML = ""; };

window.handleLogout = () => {
  // auth.js soft logout
  try { logout(); } catch(e) { localStorage.clear(); window.location.reload(); }
};

window.handleGoogleLogin = () => {
  // auth.js prompt
  try { handleLogin("google"); } catch(e) { alert("Google yüklenemedi."); }
};

window.handleDevLogin = () => {
  // test: STORAGE_KEY + dev token
  const fake = { id: "dev@local", email: "dev@local", fullname: "Test Kullanıcı", avatar: "https://via.placeholder.com/150", provider: "dev", isSessionActive: true };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fake));
  localStorage.setItem("auth_token", "dev_token_bypass");
  window.location.reload();
};

window.triggerAuth = (m) => { addBubble(m, "bot"); triggerAuth(m); };

window.generateDietList = () => addBubble("Diyet listesi hazırlanıyor...", "bot");
window.loadAstroContent = () => addBubble("Yıldızlara bakılıyor...", "bot");

function triggerAuth(msg){
  // auth modal varsa aç, yoksa drawer aç
  const am = document.getElementById("authModal");
  if (am) am.style.display = "flex";
  else window.openDrawer?.();

  if (msg) addBubble(msg, "bot");
}

/* =========================
   CHAT UI HELPERS
========================= */
function addBubble(t, r) {
  const c = document.getElementById("chatContainer");
  if(!c) return;
  c.innerHTML += `<div class="msg-row ${r}"><div class="msg-bubble ${r}">${t}</div></div>`;
  c.scrollTop = c.scrollHeight;
}

function typeWriter(t, cb) {
  const c = document.getElementById("chatContainer");
  if(!c) return;
  const id = "b" + Date.now();
  c.innerHTML += `<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`;
  const el = document.getElementById(id);
  let i = 0;
  function s() {
    if (i >= t.length) { if (cb) cb(); return; }
    el.innerHTML += t.charAt(i);
    i++;
    c.scrollTop = c.scrollHeight;
    setTimeout(s, 15);
  }
  s();
}

function renderProducts(p) {
  const c = document.getElementById("chatContainer");
  if(!c) return;
  p.slice(0, 5).forEach((x, i) => {
    setTimeout(() => {
      c.innerHTML += `
        <div class="msg-row bot">
          <div class="product-card">
            <img src="${x.image || PLACEHOLDER_IMG}" class="pc-img">
            <div class="pc-content">
              <div class="pc-title">${x.title}</div>
              <div class="pc-price">${x.price}</div>
              <a href="${x.url}" target="_blank" class="pc-btn-mini">Git</a>
            </div>
          </div>
        </div>`;
      c.scrollTop = c.scrollHeight;
    }, i * 200);
  });
}
