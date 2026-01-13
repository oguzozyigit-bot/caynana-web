// caynana-web/js/main.js
// CORE: chat + auth + fal + UI
import "./dedikodu.js";

/** ====== AYARLAR ====== */
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;
const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

const WEB_LOCK = false;
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
const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

const PLAN_PERSONAS = {
  free: ["normal"],
  plus: ["normal", "sevecen", "kizgin"],
  pro:  ["normal", "sevecen", "kizgin", "huysuz", "itirazci"]
};

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
function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function setAuthStatusMsg(msg){ if(authStatus) authStatus.textContent = msg; }

function showAuthError(err){
  if(!authStatus) return;
  if(typeof err==="string") authStatus.textContent="Hata: "+err;
  else if(err?.message) authStatus.textContent="Hata: "+err.message;
  else authStatus.textContent="Hata: (bilinmeyen)";
}

function isMobile(){ return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""); }

function scrollToBottom(force=false){
  if(!chatContainer) return;
  if(force){ requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight); return; }
  const near=(chatContainer.scrollHeight-chatContainer.scrollTop-chatContainer.clientHeight)<260;
  if(!near) return;
  requestAnimationFrame(()=> chatContainer.scrollTop = chatContainer.scrollHeight);
}
window.addEventListener("resize", ()=> scrollToBottom(true));

async function typeWriterEffect(el, text, speed=18){
  return new Promise(resolve=>{
    let i=0;
    el.innerHTML="";
    el.classList.add("typing-cursor");
    function tick(){
      if(i<text.length){
        el.textContent += text.charAt(i++);
        scrollToBottom(true);
        setTimeout(tick, speed);
      }else{
        el.classList.remove("typing-cursor");
        if(window.DOMPurify && window.marked) el.innerHTML = DOMPurify.sanitize(marked.parse(text));
        else el.textContent=text;
        scrollToBottom(true);
        resolve();
      }
    }
    tick();
  });
}

function showModal(el){ if(el) el.classList.add("show"); }
function hideModal(el){ if(el) el.classList.remove("show"); }

function showPage(title, html){
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
    title:"Caynana ile<br>iki lafın belini kır.",
    desc:"Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"),
    ph:"Naber Caynana?",
    sugg:"Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle:{ top:"100px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  dedikodu:{ label:"Dedikodu", icon:"fa-people-group", color:"#111111",
    title:"Dedikodu Odası<br>Altın Üyelere Özel",
    desc:"Evladım burada lafın ucu kaçar… Altın (Pro) olana açık.",
    img: assetUrl("images/hero-dedikodu.png"),
    ph:"",
    sugg:"Dedikodu varsa ben buradayım…",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  shopping:{ label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897",
    title:"Almadan önce<br>Caynana’ya sor.",
    desc:"Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"),
    ph:"Ne arıyorsun evladım?",
    sugg:"Her indirime atlayan sonunda pahalı öder.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  fal:{ label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6",
    title:"Fincanı kapat<br>tabakla gönder.",
    desc:"3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"),
    ph:"",
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

function switchMode(modeKey){
  if(modeKey === currentMode) return;

  if(modeKey === "dedikodu"){
    applyHero("dedikodu");
    window.Dedikodu?.openPanel?.();
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

/** ====== PLAN / PERSONA ====== */
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

async function pullPlanFromBackend(){
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

/** ====== CHAT ====== */
async function addBubble(role, text, isLoader=false, speech="", imgData=null, id=null){
  if(!chatContainer || !heroContent) return null;

  const div=document.createElement("div");
  div.className="msg "+role;
  if(id) div.id=id;

  let content="";
  if(imgData) content += `<img class="chat-img" src="${imgData}" onclick="event.stopPropagation()">`;

  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");

  chatContainer.appendChild(div);
  heroContent.style.display="none";
  chatContainer.style.display="block";
  scrollToBottom(true);

  if(role==="ai" && !isLoader) await typeWriterEffect(bubble, text);
  else bubble.innerHTML += (role==="user" ? escapeHtml(text) : text);

  if(role==="ai"){
    const sp = (speech && speech.trim()) ? speech : (text||"").replace(/[*_`#>-]/g,"").slice(0,280);
    const btn=document.createElement("div");
    btn.className="audio-btn";
    btn.dataset.speech=sp;
    btn.innerHTML=`<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    div.appendChild(btn);
  }

  scrollToBottom(true);
  return div;
}

if(chatContainer){
  chatContainer.addEventListener("click", async (e)=>{
    const btn=e.target.closest(".audio-btn");
    if(!btn) return;
    await playAudio(btn.dataset.speech, btn);
  });
}

async function playAudio(text, btn){
  if(currentAudio){ currentAudio.pause(); currentAudio=null; }

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
    currentAudio.onended = ()=> btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
    await currentAudio.play();
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Durdur`;
    btn.onclick = ()=> { currentAudio?.pause(); currentAudio=null; btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`; btn.onclick=null; };
  }catch{
    btn.innerHTML = old;
  }
}

async function send(){
  if(isSending) return;
  if(!textInput || !sendBtn) return;

  let val=(textInput.value||"").trim();
  if(pendingImage && val==="") val="Bu resmi yorumla";
  if(!val && !pendingImage) return;

  isSending=true;
  sendBtn.disabled=true;

  await addBubble("user", val, false, "", pendingImage);
  textInput.value="";

  const loaderId="ldr_"+Date.now();
  await addBubble("ai","<i class='fa-solid fa-spinner fa-spin'></i>",true,"",null,loaderId);

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

/** ====== FAL ====== */
function setFalStepUI(){
  if(!falStepText || !falStepSub) return;
  if(falImages.length<3){
    falStepText.textContent="Fal için 3 fotoğraf çek";
    falStepSub.textContent=FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  }else{
    falStepText.textContent="Fal hazır…";
    falStepSub.textContent="Yorum hazırlanıyor";
  }
}
function resetFalCapture(){ falImages=[]; setFalStepUI(); }

function openCamera(){ if(fileEl){ fileEl.value=""; fileEl.click(); } }
function openFalCamera(){ openCamera(); }

async function falCheckOneImage(dataUrl){
  try{
    const r = await fetch(FAL_CHECK_URL,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ image:dataUrl })
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
          setTimeout(openFalCamera, 200);
          return;
        }
        falImages.push(imgData);
        setFalStepUI();
      }

      pendingImage = imgData;
      if(photoPreview) photoPreview.src = pendingImage;
      if(photoTitle) photoTitle.textContent = currentMode==="fal" ? "Fal fotoğrafı" : "Fotoğraf hazır";
      if(photoHint) photoHint.textContent = "Tamam deyince Caynana yoruma başlayacak.";
      showModal(photoModal);
    };
    r.readAsDataURL(f);
  });
}

if(photoCancelBtn) photoCancelBtn.onclick = resetModalOnly;
if(photoOkBtn){
  photoOkBtn.onclick = async ()=>{
    hideModal(photoModal);
    if(currentMode==="fal" && falImages.length<3){
      setTimeout(openFalCamera, 220);
      return;
    }
    if(currentMode==="fal") textInput.value = "Fal bak: fincanı 3 açıdan gönderdim. Gerçekçi ve insani anlat.";
    await send();
    if(currentMode==="fal") resetFalCapture();
  };
}

/** ====== MIC ====== */
function startMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return alert("Tarayıcı desteklemiyor");
  const r=new SR();
  r.lang="tr-TR";
  r.onresult = e=>{ textInput.value=e.results[0][0].transcript; send(); };
  r.start();
}

/** ====== GOOGLE SIGN-IN ====== */
function ensureGoogleButton(){
  if(!googleBtn) return;
  googleBtn.innerHTML="";

  if(!window.google?.accounts?.id){
    showAuthError("Google bileşeni yüklenmedi. (Android System WebView/Chrome güncel mi?)");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (resp)=>{
      try{
        setAuthStatusMsg("Google ile giriş yapılıyor…");
        const r = await fetch(`${BASE_DOMAIN}/api/auth/google`,{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ id_token: resp.credential })
        });
        const j = await r.json().catch(()=> ({}));
        if(!r.ok) throw new Error(j.detail || "Google giriş hatası");
        setToken(j.token);
        setAuthStatusMsg(`Bağlandı ✅ (${j.email || "Google"})`);
        await pullPlanFromBackend();
        await window.Dedikodu?.refreshInbox?.();
        window.Dedikodu?.refreshBadge?.();
        setTimeout(()=> hideModal(authModal), 450);
      }catch(e){
        showAuthError(e);
      }
    }
  });

  google.accounts.id.renderButton(googleBtn,{
    theme:"outline", size:"large", text:"continue_with", shape:"pill", width:280
  });
}

/** ====== AUTH ====== */
let authMode="login";
async function handleAuthSubmit(){
  const email=(authEmail?.value||"").trim();
  const password=(authPass?.value||"").trim();
  setAuthStatusMsg("İşlem yapıyorum…");

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
    setAuthStatusMsg(`Bağlandı ✅ (${j.email || email})`);
    await pullPlanFromBackend();
    await window.Dedikodu?.refreshInbox?.();
    window.Dedikodu?.refreshBadge?.();
    setTimeout(()=> hideModal(authModal), 450);
  }catch(e){
    showAuthError(e);
  }
}

/** ====== PAGES ====== */
function planHtml(){ return `<div style="font-weight:1000">Üyelik sayfası hazır.</div>`; }
function aboutHtml(){ return `<p><b>Caynana</b> — Yapay zekânın geleneksel aklı.</p>`; }
function faqHtml(){ return `<p>SSS yakında.</p>`; }
function contactHtml(){ return `<p>Destek: <b>support@caynana.ai</b></p>`; }
function privacyHtml(){ return `<p>Gizlilik yakında.</p>`; }

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
  if(personaBtn) personaBtn.onclick = ()=> { refreshPersonaLocks(); showModal(personaModal); };
  if(personaClose) personaClose.onclick = ()=> hideModal(personaModal);
  if(personaModal) personaModal.addEventListener("click",(e)=>{ if(e.target===personaModal) hideModal(personaModal); });

  document.querySelectorAll("#personaModal .persona-opt").forEach(opt=>{
    opt.onclick = ()=>{
      const id=opt.getAttribute("data-persona");
      if(!allowedPersonas().includes(id)){
        hideModal(personaModal);
        showPage("Üyelik", planHtml());
        return;
      }
      currentPersona=id;
      refreshPersonaLocks();
      setTimeout(()=> hideModal(personaModal), 120);
    };
  });

  if(menuBtn) menuBtn.onclick = ()=> { drawerMask?.classList.add("show"); drawer?.classList.add("open"); };
  if(drawerClose) drawerClose.onclick = ()=> { drawerMask?.classList.remove("show"); drawer?.classList.remove("open"); };
  if(drawerMask) drawerMask.onclick = ()=> { drawerMask.classList.remove("show"); drawer?.classList.remove("open"); };

  if(pageClose) pageClose.onclick = hidePage;
  if(pageModal) pageModal.addEventListener("click",(e)=>{ if(e.target===pageModal) hidePage(); });

  if(accountBtn) accountBtn.onclick = ()=> { showModal(authModal); setAuthStatusMsg(getToken()? "Bağlı ✅":"Bağlı değil ❌"); setTimeout(ensureGoogleButton,120); };
  if(authClose) authClose.onclick = ()=> hideModal(authModal);
  if(authCloseX) authCloseX.onclick = ()=> hideModal(authModal);

  if(btnLoginTab && btnRegTab){
    btnLoginTab.onclick = ()=> { authMode="login"; btnLoginTab.classList.add("tabActive"); btnRegTab.classList.remove("tabActive"); authSubmit.textContent="Giriş Yap"; };
    btnRegTab.onclick = ()=> { authMode="register"; btnRegTab.classList.add("tabActive"); btnLoginTab.classList.remove("tabActive"); authSubmit.textContent="Kayıt Ol"; };
  }

  if(authSubmit) authSubmit.onclick = handleAuthSubmit;

  if(authLogout) authLogout.onclick = async ()=>{ setToken(""); currentPlan="free"; currentPersona="normal"; refreshPersonaLocks(); setAuthStatusMsg("Çıkış yapıldı ❌"); inbox=[]; window.Dedikodu?.refreshBadge?.(); };

  if(planBtn) planBtn.onclick = ()=> showPage("Üyelik", planHtml());
  if(aboutBtn) aboutBtn.onclick = ()=> showPage("Hakkımızda", aboutHtml());
  if(faqBtn) faqBtn.onclick = ()=> showPage("SSS", faqHtml());
  if(contactBtn) contactBtn.onclick = ()=> showPage("İletişim", contactHtml());
  if(privacyBtn) privacyBtn.onclick = ()=> showPage("Gizlilik", privacyHtml());

  if(brandTap) brandTap.onclick = ()=> switchMode("dedikodu"); // hızlı test için
  if(camBtn) camBtn.onclick = openCamera;
  if(falCamBtn) falCamBtn.onclick = openFalCamera;
  if(micBtn) micBtn.onclick = startMic;
  if(textInput) textInput.addEventListener("keypress",(e)=>{ if(e.key==="Enter") send(); });
  if(sendBtn) sendBtn.onclick = send;
}

/** ====== INIT ====== */
async function init(){
  applyWebLock();
  if(lockAndroidBtn) lockAndroidBtn.href = PLAY_URL;
  if(lockApkBtn) lockApkBtn.href = APK_URL;

  renderDock();
  applyHero("chat");
  loadModeChat("chat");
  document.body.classList.remove("fal-mode");
  setFalStepUI();

  await pullPlanFromBackend();
  await window.Dedikodu?.refreshInbox?.();
  window.Dedikodu?.refreshBadge?.();

  bindEvents();
}
init();

/** === App Bridge (dedikodu.js bunu kullanıyor) === */
window.App = {
  BASE_DOMAIN,
  showPage,
  escapeHtml,
  authHeaders,
  getToken,
  IS_ALTIN,
  pullPlanFromBackend
};
