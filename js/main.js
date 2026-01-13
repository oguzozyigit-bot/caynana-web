// =========================================
// CAYNANA WEB APP - main.js (STABLE)
// Topbar: notif + persona + menu
// Profile: drawer içinde
// Pages: /pages/*.html dosyalarından fetch edilir
// Swipe / double-tap: mod değiştirir
// Footer çizgileri: aktif + sonraki 3 mod rengi
// =========================================

export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;

const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

const WEB_LOCK = false;
const PLAY_URL = "https://play.google.com/store/apps/details?id=ai.caynana.app";
const APK_URL = "#";

const TOKEN_KEY = "caynana_token";
export function getToken(){ return localStorage.getItem(TOKEN_KEY) || ""; }
function setToken(t){ t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
export function authHeaders(){ const t=getToken(); return t ? { Authorization:"Bearer "+t } : {}; }

const $ = (id)=>document.getElementById(id);

// DOM
const heroImage = $("heroImage");
const heroContent = $("heroContent");
const heroTitle = $("heroTitle");
const heroDesc = $("heroDesc");
const chatContainer = $("chatContainer");

const textInput = $("text");
const sendBtn = $("sendBtn");
const camBtn = $("camBtn");
const micBtn = $("micBtn");

const dock = $("dock");

const topbar = $("topbar");
const brandTap = $("brandTap");

const menuBtn = $("menuBtn");
const notifIconBtn = $("notifIconBtn");
const notifBadge = $("notifBadge");
const personaBtn = $("personaBtn");

const drawer = $("drawer");
const drawerMask = $("drawerMask");
const drawerClose = $("drawerClose");

const accountBtn = $("accountBtn");
const planBtn = $("planBtn");
const aboutBtn = $("aboutBtn");
const faqBtn = $("faqBtn");
const contactBtn = $("contactBtn");
const privacyBtn = $("privacyBtn");

const notifBtn = $("notifBtn");
const notifPill = $("notifPill");
const safeLogoutBtn = $("safeLogoutBtn");

const dpAvatar = $("dpAvatar");
const dpName = $("dpName");
const dpPlan = $("dpPlan");
const dpCN = $("dpCN");
const openProfileBtn = $("openProfileBtn");

const authModal = $("authModal");
const authCloseX = $("authCloseX");
const authClose = $("authClose");
const authLogout = $("authLogout");
const btnLoginTab = $("btnLoginTab");
const btnRegTab = $("btnRegTab");
const authEmail = $("authEmail");
const authPass = $("authPass");
const authSubmit = $("authSubmit");
const authStatus = $("authStatus");
const googleBtn = $("googleBtn");

const profileModal = $("profileModal");
const profileClose = $("profileClose");
const pfCloseBtn = $("pfCloseBtn");
const pfSave = $("pfSave");
const pfStatus = $("pfStatus");
const profileAvatarPreview = $("profileAvatarPreview");
const profileMainName = $("profileMainName");
const profilePlanTag = $("profilePlanTag");
const profileCNTag = $("profileCNTag");
const pfNick = $("pfNick");
const pfName = $("pfName");
const pfAge = $("pfAge");
const pfGender = $("pfGender");
const pfHeight = $("pfHeight");
const pfWeight = $("pfWeight");
const pfAvatar = $("pfAvatar");
const pfAvatarFile = $("pfAvatarFile");

const notifModal = $("notifModal");
const notifClose = $("notifClose");
const notifList = $("notifList");

const personaModal = $("personaModal");
const personaClose = $("personaClose");

const photoModal = $("photoModal");
const photoPreview = $("photoPreview");
const photoTitle = $("photoTitle");
const photoHint = $("photoHint");
const photoCancelBtn = $("photoCancelBtn");
const photoOkBtn = $("photoOkBtn");
const fileEl = $("fileInput");

const pageModal = $("pageModal");
const pageTitleEl = $("pageTitle");
const pageBodyEl = $("pageBody");
const pageClose = $("pageClose");

const webLock = $("webLock");
const lockAndroidBtn = $("lockAndroidBtn");
const lockApkBtn = $("lockApkBtn");

// footer lines
const ozLine0 = $("ozLine0");
const ozLine1 = $("ozLine1");
const ozLine2 = $("ozLine2");
const ozLine3 = $("ozLine3");

// State
let sessionId = "sess_" + Math.random().toString(36).slice(2,10);
let currentAudio = null;
let pendingImage = null;
let currentMode = "chat";
let currentPersona = "normal";
let isSending = false;

// plan
let currentPlan = "free"; // free|plus|pro
export const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

const PLAN_PERSONAS = {
  free: ["normal"],
  plus: ["normal","sevecen","kizgin"],
  pro:  ["normal","sevecen","kizgin","huysuz","itirazci"],
};

// Fal: 3 foto
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek","2/3: Yandan çek","3/3: Diğer yandan çek"];

if (window.marked) marked.setOptions({ mangle:false, headerIds:false });

function showModal(el){ if(el) el.classList.add("show"); }
function hideModal(el){ if(el) el.classList.remove("show"); }

function closeDrawer(){
  if(drawerMask) drawerMask.classList.remove("show");
  if(drawer) drawer.classList.remove("open");
}

function showPage(title, html){
  if(!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title;
  pageBodyEl.innerHTML = html;
  showModal(pageModal);
  closeDrawer();
}
function hidePage(){ hideModal(pageModal); }

function setAuthStatus(msg){ if(authStatus) authStatus.textContent = msg || ""; }
function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

// Dedikodu.js gibi şeyler kaldıysa kırılmasın diye:
window.App = { escapeHtml, showPage };

function scrollToBottom(force=false){
  if(!chatContainer) return;
  if(force){ requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight); return; }
  const near = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 260;
  if(!near) return;
  requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight);
}
window.addEventListener("resize", ()=> scrollToBottom(true));

async function typeWriterEffect(element, text, speed=26){
  return new Promise(resolve=>{
    let i=0;
    element.innerHTML="";
    element.classList.add("typing-cursor");
    function tick(){
      if(i<text.length){
        element.textContent += text.charAt(i++);
        scrollToBottom(true);
        setTimeout(tick, speed);
      }else{
        element.classList.remove("typing-cursor");
        if(window.DOMPurify && window.marked){
          element.innerHTML = DOMPurify.sanitize(marked.parse(text));
        }else{
          element.textContent = text;
        }
        scrollToBottom(true);
        resolve();
      }
    }
    tick();
  });
}

function assetUrl(relPath){
  return new URL(`../${relPath}`, import.meta.url).href;
}

/** =============================
 *  MODES
 *  ============================= */
const MODES = {
  chat:{ label:"Sohbet", icon:"fa-comments", color:"#FFB300",
    title:"Caynana ile<br>iki lafın belini kır.", desc:"Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"), ph:"Naber Caynana?", sugg:"Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle:{ top:"110px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  shopping:{ label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897",
    title:"Almadan önce<br>Caynana’ya sor.", desc:"Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"), ph:"Ne arıyorsun evladım?", sugg:"Her indirime atlayan sonunda pahalı öder.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  fal:{ label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6",
    title:"Fincanı kapat<br>tabakla gönder.", desc:"3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"), ph:"", sugg:"Sadece fincan + tabak.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  health:{ label:"Sağlık", icon:"fa-heart-pulse", color:"#EF4444",
    title:"Caynana Sağlık'la<br>turp gibi ol.", desc:"Neren ağrıyor söyle bakayım?",
    img: assetUrl("images/hero-health.png"), ph:"Şikayetin ne?", sugg:"Çay üstüne sakın soğuk su içme!",
    heroStyle:{ top:"110px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  diet:{ label:"Diyet", icon:"fa-carrot", color:"#84CC16",
    title:"Sağlıklı beslen<br>zinde kal!", desc:"Açlıktan değil, keyiften yiyin.",
    img: assetUrl("images/hero-diet.png"), ph:"Boy kilo kaç?", sugg:"Ekmek değil, yeşillik ye.",
    heroStyle:{ top:"110px", left:"24px", textAlign:"left", width:"auto", maxWidth:"75%" } },

  food:{ label:"Yemek", icon:"fa-utensils", color:"#F97316",
    title:"Bugün ne<br>pişirsem derdi biter.", desc:"Dolapta ne var söyle, tarif benden.",
    img: assetUrl("images/hero-food.png"), ph:"Dolapta ne var?", sugg:"Malzemeyi ziyan etme, bereket kaçar.",
    heroStyle:{ top:"110px", left:"24px", textAlign:"left", width:"auto", maxWidth:"75%" } },

  law:{ label:"Hukuk", icon:"fa-scale-balanced", color:"#3B82F6",
    title:"Hukuk işleri<br>şakaya gelmez.", desc:"Ben avukat değilim ama çok dava gördüm.",
    img: assetUrl("images/hero-law.png"), ph:"Derdini anlat.", sugg:"Sözleşmeye bakmadan imza atma!",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  astro:{ label:"Burç", icon:"fa-star", color:"#D946EF",
    title:"Yıldızlar senin için<br>ne diyor?", desc:"Merkür retrosu falan… dikkat et.",
    img: assetUrl("images/hero-astro.png"), ph:"Burcun ne?", sugg:"Yıldıznameye baktım, yolun açık.",
    heroStyle:{ top:"110px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  translate:{ label:"Çeviri", icon:"fa-language", color:"#64748B",
    title:"Çeviri lazım mı?<br>Söyle çevireyim.", desc:"Metni yapıştır veya fotoğrafını çek.",
    img: assetUrl("images/hero-translate.png"), ph:"Metni yaz.", sugg:"Bir lisan bir insan.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  dream:{ label:"Rüya", icon:"fa-cloud-moon", color:"#6366F1",
    title:"Rüyalar alemine<br>hoş geldin.", desc:"Hayırdır inşallah…",
    img: assetUrl("images/hero-dream.png"), ph:"Ne gördün?", sugg:"Rüyalar tersine çıkar derler ama…",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },
};

const DOCK_ORDER = Object.keys(MODES);

function applyHero(modeKey){
  const m = MODES[modeKey] || MODES.chat;
  document.documentElement.style.setProperty("--primary", m.color);

  if(heroImage) heroImage.src = m.img;
  if(heroTitle) heroTitle.innerHTML = m.title;
  if(heroDesc) heroDesc.innerHTML = m.desc;

  const hs = m.heroStyle || {};
  if(heroContent){
    heroContent.style.top = hs.top || "110px";
    heroContent.style.left = hs.left || "24px";
    heroContent.style.textAlign = hs.textAlign || "left";
    heroContent.style.width = hs.width || "auto";
    heroContent.style.maxWidth = hs.maxWidth || "70%";
  }

  if(textInput) textInput.placeholder = m.ph || "Bir şey yaz...";
  const sugg = $("suggestionText");
  if(sugg) sugg.textContent = m.sugg || "";

  paintFooterLines(modeKey);
}

function paintFooterLines(modeKey){
  const idx = DOCK_ORDER.indexOf(modeKey);
  const m0 = MODES[DOCK_ORDER[idx]];

  const m1 = MODES[DOCK_ORDER[(idx+1) % DOCK_ORDER.length]];
  const m2 = MODES[DOCK_ORDER[(idx+2) % DOCK_ORDER.length]];
  const m3 = MODES[DOCK_ORDER[(idx+3) % DOCK_ORDER.length]];

  if(ozLine0) ozLine0.style.background = m0?.color || "#ddd";
  if(ozLine1) ozLine1.style.background = m1?.color || "#ddd";
  if(ozLine2) ozLine2.style.background = m2?.color || "#ddd";
  if(ozLine3) ozLine3.style.background = m3?.color || "#ddd";
}

function renderDock(){
  if(!dock) return;
  dock.innerHTML = "";
  DOCK_ORDER.forEach(k=>{
    const m = MODES[k];
    const item = document.createElement("div");
    item.className = "dock-item" + (k===currentMode ? " active" : "");
    item.setAttribute("data-mode", k);
    item.innerHTML = `
      <div class="icon-box"><i class="fa-solid ${m.icon}"></i></div>
      <div class="dock-label">${m.label}</div>
    `;
    item.onclick = ()=> switchMode(k);
    dock.appendChild(item);
  });
}

const modeChats = {};
function saveCurrentModeChat(){ if(chatContainer) modeChats[currentMode] = chatContainer.innerHTML || ""; }
function loadModeChat(modeKey){
  if(!chatContainer || !heroContent) return;
  chatContainer.innerHTML = modeChats[modeKey] || "";
  if(!chatContainer.innerHTML.trim()){
    heroContent.style.display="block";
    chatContainer.style.display="none";
  }else{
    heroContent.style.display="none";
    chatContainer.style.display="block";
    scrollToBottom(true);
  }
}

function switchMode(modeKey){
  if(modeKey === currentMode) return;

  saveCurrentModeChat();
  currentMode = modeKey;

  document.querySelectorAll(".dock-item").forEach(el=>{
    el.classList.toggle("active", el.getAttribute("data-mode") === modeKey);
  });

  applyHero(modeKey);
  loadModeChat(modeKey);

  document.body.classList.toggle("fal-mode", modeKey === "fal");
  if(modeKey === "fal") resetFalCapture();
}

function cycleMode(step=1){
  const idx = DOCK_ORDER.indexOf(currentMode);
  const next = DOCK_ORDER[(idx + step + DOCK_ORDER.length) % DOCK_ORDER.length];
  switchMode(next);
}

/** =============================
 *  Pages from files
 *  ============================= */
async function showPageFromFile(title, path){
  try{
    const res = await fetch(path, { cache:"no-store" });
    const html = await res.text();
    showPage(title, html);
  }catch{
    showPage(title, `<div style="font-weight:1000;color:#111;">Dosya okunamadı</div><div style="margin-top:8px;color:#444;font-weight:900;">${escapeHtml(path)}</div>`);
  }
}

/** =============================
 *  Auth UI + Profile
 *  ============================= */
function isLoggedIn(){ return !!getToken(); }

function setProfileUI(profile){
  // display name: nick > name > email > Misafir
  const nick = (profile?.nick || "").trim();
  const name = (profile?.name || "").trim();
  const email = (profile?.email || "").trim();

  const display = nick || name || email || "Misafir";
  const plan = (profile?.plan || "free").toString().toUpperCase();
  const cn = (profile?.caynana_no || "CN-????").toString();
  const avatar = (profile?.avatar || profile?.picture || "").trim() || "https://via.placeholder.com/80";

  if(dpName) dpName.textContent = display;
  if(dpPlan) dpPlan.textContent = plan;
  if(dpCN) dpCN.textContent = cn;
  if(dpAvatar) dpAvatar.src = avatar;

  if(profileAvatarPreview) profileAvatarPreview.src = avatar;
  if(profileMainName) profileMainName.textContent = display;
  if(profilePlanTag) profilePlanTag.textContent = plan;
  if(profileCNTag) profileCNTag.textContent = cn;

  if(pfNick) pfNick.value = nick;
  if(pfName) pfName.value = name;
  if(pfAge) pfAge.value = profile?.age ?? "";
  if(pfGender) pfGender.value = profile?.gender ?? "";
  if(pfHeight) pfHeight.value = profile?.height ?? "";
  if(pfWeight) pfWeight.value = profile?.weight ?? "";
  if(pfAvatar) pfAvatar.value = (profile?.avatar || profile?.picture || "") || "";
}

async function pullPlanFromBackend(){
  if(!isLoggedIn()){
    currentPlan = "free";
    return;
  }
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/memory/get`, { method:"GET", headers:{...authHeaders()} });
    const j = await r.json().catch(()=> ({}));
    const plan = ((j.profile||{}).plan || "free").toLowerCase();
    currentPlan = (plan==="plus"||plan==="pro") ? plan : "free";

    // profile
    const prof = (j.profile||{});
    // status endpoint varsa cn+avatar için
    try{
      const rs = await fetch(`${BASE_DOMAIN}/api/dedikodu/status`, { method:"GET", headers:{...authHeaders()} });
      const js = await rs.json().catch(()=> ({}));
      if(rs.ok){
        prof.caynana_no = js.caynana_no;
        prof.display_name = js.display_name;
        prof.avatar = js.avatar;
      }
    }catch{}
    prof.plan = currentPlan;

    // normalize
    setProfileUI({
      nick: prof.nick || "",
      name: prof.name || prof.display_name || "",
      email: prof.email || "",
      plan: currentPlan,
      caynana_no: prof.caynana_no || "CN-????",
      avatar: prof.avatar || prof.picture || "",
      gender: prof.gender || "",
      age: prof.age || "",
      height: prof.height || "",
      weight: prof.weight || ""
    });

  }catch{
    currentPlan = "free";
  }
}

function applyAuthUI(){
  const on = isLoggedIn();
  if(safeLogoutBtn) safeLogoutBtn.style.display = on ? "flex" : "none";
}

function ensureGoogleButton(){
  if(!googleBtn) return;
  googleBtn.innerHTML = "";

  if(!window.google?.accounts?.id){
    setAuthStatus("Google bileşeni yüklenmedi (Chrome/WebView güncel mi?)");
    return;
  }

  try{
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp)=>{
        try{
          setAuthStatus("Google ile giriş yapılıyor…");
          const r = await fetch(`${BASE_DOMAIN}/api/auth/google`,{
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({ id_token: resp.credential })
          });
          const j = await r.json().catch(()=> ({}));
          if(!r.ok) throw new Error(j.detail || "Google giriş hatası");
          setToken(j.token);
          setAuthStatus(`Bağlandı ✅ (${j.email || "Google"})`);
          applyAuthUI();
          await pullPlanFromBackend();
          await refreshNotifications();
          setTimeout(()=> hideModal(authModal), 350);
        }catch(e){
          setAuthStatus("Hata: " + (e?.message || "Google giriş olmadı"));
        }
      }
    });

    google.accounts.id.renderButton(googleBtn,{
      theme:"outline",
      size:"large",
      text:"continue_with",
      shape:"pill",
      width: 280
    });
  }catch(e){
    setAuthStatus("Hata: " + (e?.message || "Google UI hata"));
  }
}

let authMode = "login";
async function handleAuthSubmit(){
  const email = (authEmail?.value||"").trim();
  const password = (authPass?.value||"").trim();
  setAuthStatus("İşlem yapıyorum…");
  try{
    const endpoint = authMode==="register" ? "/api/auth/register" : "/api/auth/login";
    const r = await fetch(`${BASE_DOMAIN}${endpoint}`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.detail || "Hata");
    setToken(j.token);
    setAuthStatus(`Bağlandı ✅ (${j.email || email})`);
    applyAuthUI();
    await pullPlanFromBackend();
    await refreshNotifications();
    setTimeout(()=> hideModal(authModal), 350);
  }catch(e){
    setAuthStatus("Hata: " + (e?.message || "Bilinmeyen"));
  }
}

/** =============================
 *  Notifications
 *  ============================= */
async function refreshNotifications(){
  // badge + drawer pill
  if(!isLoggedIn()){
    if(notifBadge) notifBadge.style.display="none";
    if(notifPill) notifPill.style.display="none";
    return;
  }
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/notifications`, { method:"GET", headers:{...authHeaders()} });
    const j = await r.json().catch(()=> ({}));
    const items = j.items || [];
    const unread = items.filter(x=> !x.is_read).length;

    if(notifBadge){
      if(unread>0){ notifBadge.style.display="flex"; notifBadge.textContent = String(unread>99?"99+":unread); }
      else notifBadge.style.display="none";
    }
    if(notifPill){
      if(unread>0){ notifPill.style.display="inline-block"; notifPill.textContent = String(unread>99?"99+":unread); }
      else notifPill.style.display="none";
    }
  }catch{
    // ignore
  }
}

async function openNotifications(){
  if(!isLoggedIn()){
    showModal(authModal);
    setAuthStatus("Bildirimler için giriş yap.");
    setTimeout(ensureGoogleButton, 120);
    return;
  }
  showModal(notifModal);
  if(notifList) notifList.innerHTML = `<div style="font-weight:1000;color:#666;">Yükleniyor…</div>`;

  try{
    const r = await fetch(`${BASE_DOMAIN}/api/notifications`, { method:"GET", headers:{...authHeaders()} });
    const j = await r.json().catch(()=> ({}));
    const items = j.items || [];

    if(!notifList) return;
    notifList.innerHTML = "";
    if(!items.length){
      notifList.innerHTML = `<div style="font-weight:1000;color:#666;">Bildirim yok.</div>`;
    }else{
      items.slice(0,30).forEach(it=>{
        const div = document.createElement("div");
        div.className = "notifItem" + (it.is_read ? "" : " unread");
        div.innerHTML = `
          <div class="notifItemTitle">${escapeHtml(it.title || "Bildirim")}</div>
          <div class="notifItemBody">${escapeHtml(it.body || "")}</div>
        `;
        div.onclick = async ()=>{
          if(it.is_read) return;
          try{
            await fetch(`${BASE_DOMAIN}/api/notifications/read`,{
              method:"POST",
              headers:{ "Content-Type":"application/json", ...authHeaders() },
              body: JSON.stringify({ id: it.id })
            });
            div.classList.remove("unread");
            await refreshNotifications();
          }catch{}
        };
        notifList.appendChild(div);
      });
    }

    await refreshNotifications();
  }catch{
    if(notifList) notifList.innerHTML = `<div style="font-weight:1000;color:#666;">Bildirimler alınamadı.</div>`;
  }
}

/** =============================
 *  Profile save
 *  ============================= */
async function saveProfile(){
  if(!isLoggedIn()){
    if(pfStatus) pfStatus.textContent = "Önce giriş yap.";
    return;
  }
  const prof = {
    nick: (pfNick?.value||"").trim(),
    name: (pfName?.value||"").trim(),
    age: pfAge?.value ? Number(pfAge.value) : "",
    gender: (pfGender?.value||"").trim(),
    height: pfHeight?.value ? Number(pfHeight.value) : "",
    weight: pfWeight?.value ? Number(pfWeight.value) : "",
    avatar: (pfAvatar?.value||"").trim()
  };

  if(pfStatus) pfStatus.textContent = "Kaydediyorum…";
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/memory/upsert`,{
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify({ profile: prof })
    });
    const j = await r.json().catch(()=> ({}));
    if(!r.ok) throw new Error(j.detail || "Kaydedilemedi");

    if(pfStatus) pfStatus.textContent = "Kaydedildi ✅";
    await pullPlanFromBackend();
    setTimeout(()=> hideModal(profileModal), 450);
  }catch(e){
    if(pfStatus) pfStatus.textContent = "Hata: " + (e?.message || "Kaydedilemedi");
  }
}

/** =============================
 *  Camera / Fal / Chat
 *  ============================= */
function openCamera(){ if(fileEl){ fileEl.value=""; fileEl.click(); } }

function setFalStepUI(){
  const t = $("falStepText");
  const s = $("falStepSub");
  if(!t||!s) return;
  if(falImages.length < 3){
    t.textContent = "Fal için 3 fotoğraf çek";
    s.textContent = FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  }else{
    t.textContent = "Fal hazır…";
    s.textContent = "Yorum hazırlanıyor";
  }
}
function resetFalCapture(){ falImages=[]; setFalStepUI(); }

async function falCheckOneImage(dataUrl){
  try{
    const r = await fetch(FAL_CHECK_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ image: dataUrl })
    });
    return await r.json();
  }catch{
    return { ok:false, reason:"Kontrol edemedim, tekrar dene." };
  }
}

function resetModalOnly(){
  pendingImage=null;
  if(photoPreview) photoPreview.src="";
  hideModal(photoModal);
  if(fileEl) fileEl.value="";
}

if(fileEl){
  fileEl.addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = async ()=>{
      const imgData = reader.result;

      if(currentMode === "fal"){
        const check = await falCheckOneImage(imgData);
        if(!check.ok){
          await addBubble("ai", check.reason || "Evladım bu fincan-tabak değil. Yeniden çek.", false, "");
          resetModalOnly();
          setTimeout(()=> openCamera(), 200);
          return;
        }
        falImages.push(imgData);
        setFalStepUI();
      }

      pendingImage = imgData;
      if(photoPreview) photoPreview.src = pendingImage;
      if(photoTitle) photoTitle.textContent = currentMode==="fal" ? "Fal fotoğrafı" : "Fotoğraf hazır";
      if(photoHint){
        photoHint.textContent = (currentMode==="fal")
          ? (falImages.length<3 ? `Tamam deyince ${FAL_STEPS[falImages.length] || "sonraki açı"} geçiyoruz.` : "Tamam deyince fala bakıyorum.")
          : "Tamam deyince Caynana hemen yoruma başlayacak.";
      }
      showModal(photoModal);
    };
    reader.readAsDataURL(f);
  });
}

if(photoCancelBtn){
  photoCancelBtn.onclick = ()=>{
    if(currentMode==="fal"){
      falImages = falImages.slice(0, Math.max(0, falImages.length-1));
      setFalStepUI();
    }
    resetModalOnly();
  };
}
if(photoOkBtn){
  photoOkBtn.onclick = async ()=>{
    hideModal(photoModal);

    if(currentMode==="fal"){
      if(falImages.length < 3){
        setTimeout(()=> openCamera(), 220);
        return;
      }
      // şimdilik son foto
      pendingImage = falImages[falImages.length-1];
      if(textInput) textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. Gerçekçi ve insani anlat.";
      await send();
      resetFalCapture();
      return;
    }

    if(textInput) textInput.value = "";
    await send();
  };
}

async function addBubble(role, text, isLoader=false, speech="", imgData=null, id=null){
  if(!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;
  if(id) div.id = id;

  let content = "";
  if(imgData){
    content += `<img class="chat-img" src="${imgData}" onclick="event.stopPropagation()">`;
  }

  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");

  heroContent.style.display="none";
  chatContainer.style.display="block";
  chatContainer.appendChild(div);
  scrollToBottom(true);

  if(role==="ai" && !isLoader){
    await typeWriterEffect(bubble, text);
  }else{
    bubble.innerHTML += (role==="user" ? escapeHtml(text) : text);
  }

  if(role==="ai"){
    const sp = (speech && speech.trim()) ? speech : (text || "").replace(/[*_`#>-]/g,"").slice(0,280);
    const btn = document.createElement("div");
    btn.className="audio-btn";
    btn.dataset.speech = sp;
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
  }

  scrollToBottom(true);
  return div;
}

// audio
if(chatContainer){
  chatContainer.addEventListener("click", async (e)=>{
    const btn = e.target.closest(".audio-btn");
    if(!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}
async function playAudio(text, btn){
  if(currentAudio){ currentAudio.pause(); currentAudio=null; }

  document.querySelectorAll(".audio-btn.playing").forEach(b=>{
    b.classList.remove("playing");
    b.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
  });

  const old = btn.innerHTML;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;

  try{
    const r = await fetch(SPEAK_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: currentPersona })
    });
    const blob = await r.blob();
    currentAudio = new Audio(URL.createObjectURL(blob));
    currentAudio.onended = ()=>{
      btn.classList.remove("playing");
      btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    };
    await currentAudio.play();
    btn.classList.add("playing");
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
  }catch{
    btn.innerHTML = old;
  }
}

async function send(){
  if(isSending) return;
  if(!textInput || !sendBtn) return;

  let val = (textInput.value || "").trim();
  if(pendingImage && val==="") val="Bu resmi yorumla";
  if(!val && !pendingImage) return;

  isSending = true;
  sendBtn.disabled = true;

  await addBubble("user", val, false, "", pendingImage);
  textInput.value="";

  const loaderId = "ldr_" + Date.now();
  await addBubble("ai", "<i class='fa-solid fa-spinner fa-spin'></i>", true, "", null, loaderId);

  const payload = { message: val, session_id: sessionId, image: pendingImage, mode: currentMode, persona: currentPersona };
  pendingImage = null;

  try{
    const res = await fetch(API_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=> ({}));

    const loader = document.getElementById(loaderId);
    if(loader) loader.remove();

    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");
  }catch{
    const loader = document.getElementById(loaderId);
    if(loader) loader.remove();
    await addBubble("ai","Bağlantı hatası oldu evladım. Bir daha dene.", false, "");
  }finally{
    isSending=false;
    sendBtn.disabled=false;
  }
}

/** =============================
 *  Mic
 *  ============================= */
function startMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return alert("Tarayıcı desteklemiyor");
  const r = new SR();
  r.lang="tr-TR";
  r.onresult = e => { if(textInput) textInput.value = e.results[0][0].transcript; send(); };
  r.start();
}

/** =============================
 *  Web lock
 *  ============================= */
function isMobile(){ return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent||""); }
function applyWebLock(){
  if(!WEB_LOCK) return;
  if(isMobile()) return;
  if(lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if(lockApkBtn) lockApkBtn.href = APK_URL;
  showModal(webLock);
}

/** =============================
 *  Swipe + double tap (hero)
 *  ============================= */
function bindHeroGestures(){
  if(!heroImage || !brandTap) return;

  // double click desktop
  brandTap.addEventListener("dblclick", ()=> cycleMode(1));

  // swipe mobile: sadece chat yokken (hero görünürken) mod değişsin
  let sx=0, sy=0, st=0;
  const target = heroImage;
  target.addEventListener("touchstart",(e)=>{
    if(chatContainer && chatContainer.style.display==="block") return;
    const t = e.touches[0];
    sx=t.clientX; sy=t.clientY; st=Date.now();
  }, {passive:true});

  target.addEventListener("touchend",(e)=>{
    if(chatContainer && chatContainer.style.display==="block") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const dt = Date.now() - st;
    if(dt>650) return;
    if(Math.abs(dx) < 50) return;
    if(Math.abs(dy) > 80) return;

    if(dx < 0) cycleMode(1);   // swipe left next
    else cycleMode(-1);        // swipe right prev
  }, {passive:true});
}

/** =============================
 *  Events
 *  ============================= */
function bindEvents(){
  // menu
  if(menuBtn && drawer && drawerMask){
    menuBtn.onclick = ()=>{ drawerMask.classList.add("show"); drawer.classList.add("open"); };
  }
  if(drawerClose) drawerClose.onclick = closeDrawer;
  if(drawerMask) drawerMask.onclick = closeDrawer;

  // persona
  if(personaBtn && personaModal){
    personaBtn.onclick = ()=>{ refreshPersonaLocks(); showModal(personaModal); };
  }
  if(personaClose && personaModal) personaClose.onclick = ()=> hideModal(personaModal);
  if(personaModal) personaModal.addEventListener("click",(e)=>{ if(e.target===personaModal) hideModal(personaModal); });

  document.querySelectorAll("#personaModal .persona-opt").forEach(opt=>{
    opt.addEventListener("click", ()=>{
      const id = opt.getAttribute("data-persona");
      const allow = new Set(PLAN_PERSONAS[currentPlan] || ["normal"]);
      if(!allow.has(id)){
        hideModal(personaModal);
        showPageFromFile("Üyelik", "./pages/plan.html");
        return;
      }
      currentPersona = id;
      refreshPersonaLocks();
      setTimeout(()=> hideModal(personaModal), 150);
    });
  });

  // notifications
  if(notifIconBtn) notifIconBtn.onclick = openNotifications;
  if(notifBtn) notifBtn.onclick = ()=>{ closeDrawer(); openNotifications(); };
  if(notifClose) notifClose.onclick = ()=> hideModal(notifModal);
  if(notifModal) notifModal.addEventListener("click",(e)=>{ if(e.target===notifModal) hideModal(notifModal); });

  // account/auth
  if(accountBtn) accountBtn.onclick = ()=>{
    closeDrawer();
    showModal(authModal);
    setAuthStatus(isLoggedIn() ? "Bağlı ✅" : "Bağlı değil ❌");
    setTimeout(ensureGoogleButton, 120);
  };
  if(authCloseX) authCloseX.onclick = ()=> hideModal(authModal);
  if(authClose) authClose.onclick = ()=> hideModal(authModal);
  if(authModal) authModal.addEventListener("click",(e)=>{ if(e.target===authModal) hideModal(authModal); });

  if(btnLoginTab && btnRegTab && authSubmit){
    btnLoginTab.onclick = ()=>{
      authMode="login";
      btnLoginTab.classList.add("tabActive");
      btnRegTab.classList.remove("tabActive");
      authSubmit.textContent="Giriş Yap";
    };
    btnRegTab.onclick = ()=>{
      authMode="register";
      btnRegTab.classList.add("tabActive");
      btnLoginTab.classList.remove("tabActive");
      authSubmit.textContent="Kayıt Ol";
    };
  }
  if(authSubmit) authSubmit.onclick = handleAuthSubmit;

  if(authLogout){
    authLogout.onclick = ()=>{
      setToken("");
      currentPlan="free";
      currentPersona="normal";
      applyAuthUI();
      setAuthStatus("Çıkış yapıldı ❌");
      refreshNotifications();
      pullPlanFromBackend(); // UI reset
    };
  }

  if(safeLogoutBtn){
    safeLogoutBtn.onclick = ()=>{
      setToken("");
      currentPlan="free";
      currentPersona="normal";
      applyAuthUI();
      closeDrawer();
      refreshNotifications();
      pullPlanFromBackend();
    };
  }

  // pages from files
  if(planBtn) planBtn.onclick = ()=> showPageFromFile("Üyelik", "./pages/plan.html");
  if(aboutBtn) aboutBtn.onclick = ()=> showPageFromFile("Hakkımızda", "./pages/about.html");
  if(faqBtn) faqBtn.onclick = ()=> showPageFromFile("Sık Sorulan Sorular", "./pages/faq.html");
  if(contactBtn) contactBtn.onclick = ()=> showPageFromFile("İletişim", "./pages/contact.html");
  if(privacyBtn) privacyBtn.onclick = ()=> showPageFromFile("Gizlilik", "./pages/privacy.html");

  if(pageClose) pageClose.onclick = hidePage;
  if(pageModal) pageModal.addEventListener("click",(e)=>{ if(e.target===pageModal) hidePage(); });

  // profile modal
  if(openProfileBtn) openProfileBtn.onclick = ()=>{
    closeDrawer();
    showModal(profileModal);
    if(pfStatus) pfStatus.textContent = "";
  };
  if(profileClose) profileClose.onclick = ()=> hideModal(profileModal);
  if(pfCloseBtn) pfCloseBtn.onclick = ()=> hideModal(profileModal);
  if(profileModal) profileModal.addEventListener("click",(e)=>{ if(e.target===profileModal) hideModal(profileModal); });
  if(pfSave) pfSave.onclick = saveProfile;

  // avatar file -> dataurl
  if(pfAvatarFile){
    pfAvatarFile.onchange = (e)=>{
      const f = e.target.files?.[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        const dataUrl = reader.result;
        if(pfAvatar) pfAvatar.value = dataUrl;
        if(profileAvatarPreview) profileAvatarPreview.src = dataUrl;
      };
      reader.readAsDataURL(f);
    };
  }

  // dock
  if(dock){
    // click guard drag
    let downX=0, downY=0, moved=false;
    dock.addEventListener("pointerdown",(e)=>{ downX=e.clientX; downY=e.clientY; moved=false; }, {passive:true});
    dock.addEventListener("pointermove",(e)=>{ if(Math.abs(e.clientX-downX)>10 || Math.abs(e.clientY-downY)>10) moved=true; }, {passive:true});
    dock.addEventListener("click",(e)=>{ if(moved){ e.preventDefault(); e.stopPropagation(); } }, true);
  }

  // camera/mic/send
  if(camBtn) camBtn.onclick = ()=> openCamera();
  if(micBtn) micBtn.onclick = ()=> startMic();
  if(textInput) textInput.addEventListener("keypress",(e)=>{ if(e.key==="Enter") send(); });
  if(sendBtn) sendBtn.onclick = ()=> send();
}

/** =============================
 *  persona locks
 *  ============================= */
function refreshPersonaLocks(){
  const allow = new Set(PLAN_PERSONAS[currentPlan] || ["normal"]);
  document.querySelectorAll("#personaModal .persona-opt").forEach(opt=>{
    const id = opt.getAttribute("data-persona");
    const icon = opt.querySelector("i");
    if(id === currentPersona){
      opt.classList.add("selected");
      opt.classList.remove("locked");
      if(icon){ icon.className="fa-solid fa-check"; icon.style.display="block"; }
      return;
    }
    opt.classList.remove("selected");
    if(!allow.has(id)){
      opt.classList.add("locked");
      if(icon){ icon.className="fa-solid fa-lock"; icon.style.display="block"; }
    }else{
      opt.classList.remove("locked");
      if(icon) icon.style.display="none";
    }
  });
}

/** =============================
 *  INIT
 *  ============================= */
async function init(){
  applyWebLock();
  if(lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if(lockApkBtn) lockApkBtn.href = APK_URL;

  renderDock();
  applyHero("chat");
  loadModeChat("chat");

  bindHeroGestures();
  bindEvents();

  applyAuthUI();
  await pullPlanFromBackend();
  refreshPersonaLocks();
  await refreshNotifications();
  setFalStepUI();
}

init();
