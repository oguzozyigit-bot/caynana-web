// =============================
// CAYNANA WEB APP (CORE - FINAL)
// =============================

import "./dedikodu.js";

/** ====== AYARLAR ====== */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;

const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

// Web kilidi
const WEB_LOCK = false;
const PLAY_URL = "https://play.google.com/store/apps/details?id=ai.caynana.app";
const APK_URL  = "#";

/** ====== STATE ====== */
const TOKEN_KEY = "caynana_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
export const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
export const authHeaders = () => (getToken() ? { "Authorization": "Bearer " + getToken() } : {});

let sessionId = "sess_" + Math.random().toString(36).slice(2, 10);
let currentAudio = null;
let pendingImage = null;
let currentMode = "chat";
let currentPersona = "normal";
let isSending = false;

let currentPlan = "free"; // free | plus | pro
export const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

const PLAN_PERSONAS = {
  free: ["normal"],
  plus: ["normal", "sevecen", "kizgin"],
  pro:  ["normal", "sevecen", "kizgin", "huysuz", "itirazci"]
};

// Fal
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

if (window.marked) marked.setOptions({ mangle:false, headerIds:false });

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
const drawerClose = $("drawerClose");

const authModal = $("authModal");
const accountBtn = $("accountBtn");
const authClose = $("authClose");
const authCloseX = $("authCloseX");
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
const dedikoduBtn = $("dedikoduBtn"); // drawer'da varsa

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
export function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function setAuthStatus(msg){ if (authStatus) authStatus.textContent = msg; }

function showAuthError(err){
  if (!authStatus) return;
  if (typeof err === "string") authStatus.textContent = "Hata: " + err;
  else if (err?.message) authStatus.textContent = "Hata: " + err.message;
  else {
    try { authStatus.textContent = "Hata: " + JSON.stringify(err); }
    catch { authStatus.textContent = "Hata: (bilinmeyen)"; }
  }
}

function isMobile(){ return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""); }

function scrollToBottom(force=false){
  if (!chatContainer) return;
  if(force){ requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight); return; }
  const near = (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) < 260;
  if(!near) return;
  requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight);
}
window.addEventListener("resize", ()=> scrollToBottom(true));

async function typeWriterEffect(element, text, speed=20){
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
        if(window.DOMPurify && window.marked) element.innerHTML = DOMPurify.sanitize(marked.parse(text));
        else element.textContent = text;
        scrollToBottom(true);
        resolve();
      }
    }
    tick();
  });
}

function showModal(el){ if(el) el.classList.add("show"); }
function hideModal(el){ if(el) el.classList.remove("show"); }

export function showPage(title, html){
  if(!pageModal || !pageTitleEl || !pageBodyEl) return;
  pageTitleEl.textContent = title;
  pageBodyEl.innerHTML = html;
  showModal(pageModal);
  if(drawerMask) drawerMask.classList.remove("show");
  if(drawer) drawer.classList.remove("open");
}
function hidePage(){ hideModal(pageModal); }

function assetUrl(relPath){
  return new URL(`../${relPath}`, import.meta.url).href;
}

/** ====== MODES ====== */
const MODES = {
  chat:{ label:"Sohbet", icon:"fa-comments", color:"#FFB300",
    title:"Caynana ile<br>iki lafın belini kır.", desc:"Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"), ph:"Naber Caynana?",
    sugg:"Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle:{ top:"100px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  dedikodu:{ label:"Dedikodu", icon:"fa-people-group", color:"#111111",
    title:"Dedikodu Odası<br>Altın Üyelere Özel",
    desc:"Evladım burada lafın ucu kaçar… Altın (Pro) olana açık.",
    img: assetUrl("images/hero-dedikodu.png"),
    ph:"", sugg:"Dedikodu varsa ben buradayım…",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  shopping:{ label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897",
    title:"Almadan önce<br>Caynana’ya sor.", desc:"Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"), ph:"Ne arıyorsun evladım?",
    sugg:"Her indirime atlayan sonunda pahalı öder.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  fal:{ label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6",
    title:"Fincanı kapat<br>tabakla gönder.", desc:"3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"), ph:"",
    sugg:"Sadece fincan + tabak.",
    heroStyle:{ top:"100px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },
};

function applyHero(modeKey){
  const m = MODES[modeKey] || MODES.chat;
  document.documentElement.style.setProperty("--primary", m.color);
  if(heroImage) heroImage.src = m.img;
  if(heroTitle) heroTitle.innerHTML = m.title;
  if(heroDesc) heroDesc.innerHTML = m.desc;

  const hs = m.heroStyle || {};
  if(heroContent){
    heroContent.style.top = hs.top || "100px";
    heroContent.style.left = hs.left || "24px";
    heroContent.style.textAlign = hs.textAlign || "left";
    heroContent.style.width = hs.width || "auto";
    heroContent.style.maxWidth = hs.maxWidth || "70%";
  }
  if(textInput) textInput.placeholder = m.ph || "Bir şey yaz...";
  if(suggestionText) suggestionText.textContent = m.sugg || "";
  const dyn = document.querySelector(".oz-l-dynamic");
  if(dyn) dyn.style.background = m.color;
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

/** ✅ Dedikodu mode: panel aç, chat’e geçme */
function switchMode(modeKey){
  if(modeKey === currentMode) return;

  if(modeKey === "dedikodu"){
    applyHero("dedikodu");
    window.Dedikodu?.openPanel?.(); // dedikodu.js
    return;
  }

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

/** ====== DOCK ====== */
function renderDock(){
  if(!dock) return;
  dock.innerHTML="";
  Object.keys(MODES).forEach(k=>{
    const m = MODES[k];
    const item = document.createElement("div");
    item.className="dock-item" + (k===currentMode ? " active":"");
    item.setAttribute("data-mode", k);
    item.innerHTML = `
      <div class="icon-box"><i class="fa-solid ${m.icon}"></i></div>
      <div class="dock-label">${m.label}</div>
    `;
    item.onclick = ()=> switchMode(k);
    dock.appendChild(item);
  });
}

// drag guard
(function(){
  if(!dock) return;
  let downX=0, downY=0, moved=false;
  dock.addEventListener("pointerdown",(e)=>{ downX=e.clientX; downY=e.clientY; moved=false; },{passive:true});
  dock.addEventListener("pointermove",(e)=>{ if(Math.abs(e.clientX-downX)>10 || Math.abs(e.clientY-downY)>10) moved=true; },{passive:true});
  dock.addEventListener("click",(e)=>{ if(moved){ e.preventDefault(); e.stopPropagation(); } },true);
})();

/** ====== PERSONA + PLAN ====== */
function allowedPersonas(){ return PLAN_PERSONAS[currentPlan] || ["normal"]; }

function refreshPersonaLocks(){
  const allow = new Set(allowedPersonas());
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

export async function pullPlanFromBackend(){
  if(!getToken()){ currentPlan="free"; refreshPersonaLocks(); return currentPlan; }
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/memory/get`, { method:"GET", headers:{...authHeaders()} });
    const j = await r.json().catch(()=> ({}));
    const plan = ((j.profile||{}).plan || "free").toLowerCase();
    currentPlan = (plan==="plus"||plan==="pro") ? plan : "free";
  }catch{
    currentPlan="free";
  }
  refreshPersonaLocks();
  return currentPlan;
}

/** ====== CHAT UI ====== */
async function addBubble(role, text, isLoader=false, speech="", imgData=null, id=null){
  if(!chatContainer || !heroContent) return null;

  const div = document.createElement("div");
  div.className = "msg " + role;
  if(id) div.id = id;

  let content="";
  if(imgData){
    content += `<img class="chat-img" src="${imgData}" onclick="event.stopPropagation()">`;
  }

  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display="none";
  chatContainer.style.display="block";
  scrollToBottom(true);

  if(role==="ai" && !isLoader) await typeWriterEffect(bubble, text);
  else { bubble.innerHTML += (role==="user" ? escapeHtml(text) : text); scrollToBottom(true); }

  if(role==="ai"){
    const sp = (speech && speech.trim()) ? speech : (text||"").replace(/[*_`#>-]/g,"").slice(0,280);
    const btn = document.createElement("div");
    btn.className="audio-btn";
    btn.dataset.speech = sp;
    btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
    scrollToBottom(true);
  }
  return div;
}

/** ====== AUDIO (TTS) ====== */
if(chatContainer){
  chatContainer.addEventListener("click", async (e)=>{
    const btn=e.target.closest(".audio-btn");
    if(!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}

async function playAudio(text, btn){
  if(currentAudio){ currentAudio.pause(); currentAudio=null; }
  document.querySelectorAll(".audio-btn.playing").forEach(b=>{
    b.classList.remove("playing");
    b.innerHTML=`<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
  });

  const old=btn.innerHTML;
  btn.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor`;

  try{
    const r = await fetch(SPEAK_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: currentPersona })
    });
    const blob=await r.blob();
    currentAudio=new Audio(URL.createObjectURL(blob));
    currentAudio.onended=()=>{
      btn.classList.remove("playing");
      btn.innerHTML=`<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    };
    await currentAudio.play();
    btn.classList.add("playing");
    btn.innerHTML=`<i class="fa-solid fa-stop"></i> Durdur`;
  }catch{
    btn.innerHTML=old;
  }
}

/** ====== SEND ====== */
async function send(){
  if(isSending) return;
  if(!textInput || !sendBtn) return;

  let val=(textInput.value||"").trim();
  if(pendingImage && val==="") val="Bu resmi yorumla";
  if(!val && !pendingImage) return;

  isSending=true;
  sendBtn.disabled=true;

  heroContent.style.display="none";
  chatContainer.style.display="block";

  await addBubble("user", val, false, "", pendingImage);
  textInput.value="";

  const loaderId="ldr_"+Date.now();
  await addBubble("ai", "<i class='fa-solid fa-spinner fa-spin'></i>", true, "", null, loaderId);

  const payload = { message: val, session_id: sessionId, image: pendingImage, mode: currentMode, persona: currentPersona };
  pendingImage=null;

  try{
    const res = await fetch(API_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json", ...authHeaders() },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=> ({}));

    document.getElementById(loaderId)?.remove();
    await addBubble("ai", data.assistant_text || "Bir şey diyemedim evladım.", false, data.speech_text || "");
    scrollToBottom(true);
    saveCurrentModeChat();
  }catch{
    document.getElementById(loaderId)?.remove();
    await addBubble("ai","Bağlantı hatası oldu evladım. Bir daha dene.",false,"");
    saveCurrentModeChat();
  }finally{
    isSending=false;
    sendBtn.disabled=false;
  }
}

/** ====== FAL UI ====== */
function openCamera(){ if(fileEl){ fileEl.value=""; fileEl.click(); } }
function openFalCamera(){ openCamera(); }

function setFalStepUI(){
  if(!falStepText || !falStepSub) return;
  if(falImages.length < 3){
    falStepText.textContent="Fal için 3 fotoğraf çek";
    falStepSub.textContent = FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  }else{
    falStepText.textContent="Fal hazır…";
    falStepSub.textContent="Yorum hazırlanıyor";
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

    const r = new FileReader();
    r.onload = async ()=>{
      const imgData = r.result;

      if(currentMode==="fal"){
        const check = await falCheckOneImage(imgData);
        if(!check.ok){
          await addBubble("ai", check.reason || "Evladım bu fincan-tabak değil. Yeniden çek.", false, "");
          resetModalOnly();
          setTimeout(()=> openFalCamera(), 200);
          return;
        }

        falImages.push(imgData);
        setFalStepUI();

        pendingImage = imgData;
        if(photoPreview) photoPreview.src = pendingImage;
        if(photoTitle) photoTitle.textContent = "Fal fotoğrafı";
        if(photoHint){
          photoHint.textContent = (falImages.length<3)
            ? `Tamam deyince ${FAL_STEPS[falImages.length] || "bir sonraki açıya"} geçiyoruz.`
            : "Tamam deyince fala bakıyorum.";
        }
        showModal(photoModal);
        return;
      }

      pendingImage = imgData;
      if(photoPreview) photoPreview.src = pendingImage;
      if(photoTitle) photoTitle.textContent="Fotoğraf hazır";
      if(photoHint) photoHint.textContent="Tamam deyince Caynana hemen yoruma başlayacak.";
      showModal(photoModal);
    };
    r.readAsDataURL(f);
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
        setTimeout(()=> openFalCamera(), 220);
        return;
      }
      // kolaj yoksa bile tek görsel gönder
      if(textInput) textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. Gerçekçi ve insani anlat.";
      await send();
      resetFalCapture();
      return;
    }

    if(textInput) textInput.value="";
    await send();
  };
}

/** ====== MIC ====== */
function startMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return alert("Tarayıcı desteklemiyor");
  const r = new SR();
  r.lang="tr-TR";
  r.onresult = e => { textInput.value = e.results[0][0].transcript; send(); };
  r.start();
}

/** ====== PAGES ====== */
function planHtml(){
  return `
    <div style="display:grid; gap:10px;">
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Free</div>
        <div style="margin-top:6px;color:#444;font-weight:800;">Günlük 2 fal • Sınırlı sohbet</div>
      </div>
      <div style="padding:12px;border:2px solid var(--primary);border-radius:16px;background:#fff8e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Plus</div>
          <div style="font-weight:1000;color:var(--primary);">79,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;">Günlük 5 fal • Daha fazla sohbet</div>
      </div>
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;color:#111;">Altın (Pro)</div>
          <div style="font-weight:1000;color:#111;">119,99 TL</div>
        </div>
        <div style="margin-top:6px;color:#444;font-weight:800;">Dedikodu Odası + Sınırsız</div>
      </div>
    </div>
  `;
}
function aboutHtml(){ return `<p><b>Caynana</b> — Yapay zekânın geleneksel aklı.</p>`; }
function faqHtml(){ return `<p>SSS yakında.</p>`; }
function contactHtml(){ return `<p>Destek: <b>support@caynana.ai</b></p>`; }
function privacyHtml(){ return `<p>Gizlilik yakında.</p>`; }

/** ====== GOOGLE SIGN-IN ====== */
function ensureGoogleButton(){
  if(!googleBtn) return;
  googleBtn.innerHTML = "";

  if(!window.google?.accounts?.id){
    showAuthError("Google bileşeni yüklenmedi. (Android System WebView/Chrome güncel mi?)");
    return;
  }

  try{
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp)=>{
        try{
          setAuthStatus("Google ile giriş yapılıyor…");
          const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({ id_token: resp.credential })
          });
          const j = await r.json().catch(()=> ({}));
          if(!r.ok) throw new Error(j.detail || "Google giriş hatası");
          setToken(j.token);
          setAuthStatus(`Bağlandı ✅ (${j.email || "Google"})`);
          await pullPlanFromBackend();
          window.Dedikodu?.refreshBadge?.();
          setTimeout(()=> hideModal(authModal), 450);
        }catch(e){
          showAuthError(e);
        }
      }
    });

    google.accounts.id.renderButton(googleBtn, {
      theme:"outline", size:"large", text:"continue_with", shape:"pill", width:280
    });
  }catch(e){
    showAuthError(e);
  }
}

/** ====== EMAIL AUTH ====== */
let authMode="login";
async function handleAuthSubmit(){
  const email=(authEmail?.value||"").trim();
  const password=(authPass?.value||"").trim();
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
    await pullPlanFromBackend();
    window.Dedikodu?.refreshBadge?.();
    setTimeout(()=> hideModal(authModal), 450);
  }catch(e){
    showAuthError(e);
  }
}

/** ====== WEB LOCK ====== */
function applyWebLock(){
  if(!WEB_LOCK) return;
  if(isMobile()) return;
  if(lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if(lockApkBtn) lockApkBtn.href = APK_URL;
  showModal(webLock);
}

/** ====== EVENTS ====== */
function bindEvents(){
  if(personaBtn && personaModal) personaBtn.onclick = ()=>{ refreshPersonaLocks(); showModal(personaModal); };
  if(personaClose && personaModal) personaClose.onclick = ()=> hideModal(personaModal);
  if(personaModal) personaModal.addEventListener("click",(e)=>{ if(e.target===personaModal) hideModal(personaModal); });

  document.querySelectorAll("#personaModal .persona-opt").forEach(opt=>{
    opt.addEventListener("click", ()=>{
      const id = opt.getAttribute("data-persona");
      const allow = new Set(allowedPersonas());
      if(!allow.has(id)){
        hideModal(personaModal);
        showPage("Üyelik", planHtml());
        return;
      }
      currentPersona=id;
      refreshPersonaLocks();
      setTimeout(()=> hideModal(personaModal), 150);
    });
  });

  if(menuBtn && drawer && drawerMask) menuBtn.onclick = ()=>{ drawerMask.classList.add("show"); drawer.classList.add("open"); };
  if(drawerClose && drawer && drawerMask) drawerClose.onclick = ()=>{ drawerMask.classList.remove("show"); drawer.classList.remove("open"); };
  if(drawerMask && drawer) drawerMask.onclick = ()=>{ drawerMask.classList.remove("show"); drawer.classList.remove("open"); };

  if(pageClose) pageClose.onclick = hidePage;
  if(pageModal) pageModal.addEventListener("click",(e)=>{ if(e.target===pageModal) hidePage(); });

  if(accountBtn && authModal){
    accountBtn.onclick = ()=>{
      showModal(authModal);
      setAuthStatus(getToken() ? "Bağlı ✅" : "Bağlı değil ❌");
      setTimeout(ensureGoogleButton, 120);
    };
  }
  if(authClose) authClose.onclick = ()=> hideModal(authModal);
  if(authCloseX) authCloseX.onclick = ()=> hideModal(authModal);
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
      refreshPersonaLocks();
      setAuthStatus("Çıkış yapıldı ❌");
      window.Dedikodu?.refreshBadge?.();
    };
  }

  if(planBtn) planBtn.onclick = ()=> showPage("Üyelik", planHtml());
  if(aboutBtn) aboutBtn.onclick = ()=> showPage("Hakkımızda", aboutHtml());
  if(faqBtn) faqBtn.onclick = ()=> showPage("SSS", faqHtml());
  if(contactBtn) contactBtn.onclick = ()=> showPage("İletişim", contactHtml());
  if(privacyBtn) privacyBtn.onclick = ()=> showPage("Gizlilik", privacyHtml());

  // Dedikodu drawer button (varsa)
  if(dedikoduBtn) dedikoduBtn.onclick = ()=> { applyHero("dedikodu"); window.Dedikodu?.openPanel?.(); };

  if(brandTap) brandTap.onclick = ()=> cycleMode(1);

  if(camBtn) camBtn.onclick = ()=> openCamera();
  if(falCamBtn) falCamBtn.onclick = ()=> openFalCamera();
  if(micBtn) micBtn.onclick = ()=> startMic();

  if(textInput) textInput.addEventListener("keypress",(e)=>{ if(e.key==="Enter") send(); });
  if(sendBtn) sendBtn.onclick = ()=> send();
}

/** ====== MODE CYCLE ====== */
const modeKeys = Object.keys(MODES);
function cycleMode(step=1){
  const idx = modeKeys.indexOf(currentMode);
  const next = modeKeys[(idx + step + modeKeys.length) % modeKeys.length];
  switchMode(next);
}

/** ====== INIT ====== */
function init(){
  applyWebLock();
  if(lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if(lockApkBtn) lockApkBtn.href = APK_URL;

  renderDock();
  applyHero("chat");
  loadModeChat("chat");
  document.body.classList.remove("fal-mode");
  setFalStepUI();

  pullPlanFromBackend().finally(()=> window.Dedikodu?.refreshBadge?.());
  bindEvents();

  const waitGoogle = setInterval(()=>{
    if(window.google?.accounts?.id){
      clearInterval(waitGoogle);
    }
  }, 150);
}

init();

// App bridge for dedikodu.js
window.App = {
  BASE_DOMAIN,
  showPage,
  escapeHtml,
  authHeaders,
  getToken,
  IS_ALTIN,
  pullPlanFromBackend
};
