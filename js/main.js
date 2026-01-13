// =============================
// CAYNANA WEB APP (FINAL - SAFE + DEDIKODU MODU + HERO)
// =============================

/** ====== AYARLAR ====== */
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const API_URL = `${BASE_DOMAIN}/api/chat`;
const SPEAK_URL = `${BASE_DOMAIN}/api/speak`;
const FAL_CHECK_URL = `${BASE_DOMAIN}/api/fal/check`;

const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com";

// Web kilidi
const WEB_LOCK = false;
const PLAY_URL = "https://play.google.com/store/apps/details?id=ai.caynana.app";
const APK_URL  = "#";

// Altın = Pro
const IS_ALTIN = () => (currentPlan || "free").toLowerCase() === "pro";

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

// Fal
let falImages = [];
const FAL_STEPS = ["1/3: Üstten çek", "2/3: Yandan çek", "3/3: Diğer yandan çek"];

// Dedikodu client state (backend bağlayınca gerçek olur)
let dedikoduState = {
  inbox: [],        // [{title,text,read,invite_id,room_id,need_pro}]
  sentInvites: [],  // [{to,ts,status}]
};

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

function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

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
    title:"Caynana ile<br>iki lafın belini kır.", desc:"Biraz dur bakalım, neler anlatacaksın?",
    img: assetUrl("images/hero-chat.png"), ph:"Naber Caynana?", sugg:"Benim zamanımda her şey daha güzeldi ah ah…",
    heroStyle:{ top:"100px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  // ✅ NEW: Dedikodu modu (Altın/Pro)
  dedikodu:{ label:"Dedikodu", icon:"fa-comments", color:"#111111",
    title:"Dedikodu Odası<br>Altın Üyelere Özel",
    desc:"Evladım burada lafın ucu kaçar… Altın (Pro) olana açık.",
    img: assetUrl("images/hero-dedikodu.png"),
    ph:"", sugg:"Dedikodu varsa ben buradayım…",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  shopping:{ label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897",
    title:"Almadan önce<br>Caynana’ya sor.", desc:"Sonra “keşke” dememek için buradayım.",
    img: assetUrl("images/hero-shopping.png"), ph:"Ne arıyorsun evladım?", sugg:"Her indirime atlayan sonunda pahalı öder.",
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  fal:{ label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6",
    title:"Fincanı kapat<br>tabakla gönder.", desc:"3 açı çek: üstten, yandan, diğer yandan.",
    img: assetUrl("images/hero-fal.png"), ph:"", sugg:"Sadece fincan + tabak.",
    heroStyle:{ top:"100px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } },

  health:{ label:"Sağlık", icon:"fa-heart-pulse", color:"#EF4444",
    title:"Caynana Sağlık'la<br>turp gibi ol.", desc:"Neren ağrıyor söyle bakayım?",
    img: assetUrl("images/hero-health.png"), ph:"Şikayetin ne?", sugg:"Çay üstüne sakın soğuk su içme!",
    heroStyle:{ top:"110px", left:"24px", textAlign:"left", width:"auto", maxWidth:"70%" } },

  diet:{ label:"Diyet", icon:"fa-carrot", color:"#84CC16",
    title:"Sağlıklı beslen<br>zinde kal!", desc:"Açlıktan değil, keyiften yiyin.",
    img: assetUrl("images/hero-diet.png"), ph:"Boy kilo kaç?", sugg:"Ekmek değil, yeşillik ye.",
    heroStyle:{ top:"100px", left:"24px", textAlign:"left", width:"auto", maxWidth:"75%" } },

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
    heroStyle:{ top:"110px", left:"0", textAlign:"center", width:"100%", maxWidth:"100%" } }
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

// ✅ Dedikodu modunda chat ekranına geçmeyip panel açıyoruz.
function switchMode(modeKey){
  if(modeKey === currentMode) return;

  // Dedikodu: Altın değilse upsell + mod değiştirme
  if(modeKey === "dedikodu"){
    applyHero("dedikodu");
    if(!IS_ALTIN()){
      showPage("Dedikodu Odası (Altın)", upsellAltinHtml(
        "Dedikodu Odası kilitli",
        "Evladım burası Altın (Pro) üyelerin alanı. Altın olunca hem sen girersin hem arkadaşını çağırırsın."
      ));
      return; // mod değişmesin
    }
    // Altın ise dedikodu panel aç
    showPage("Dedikodu Odası", dedikoduPanelHtml());
    setTimeout(bindDedikoduPanel, 50);
    return; // mod değişmesin
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

/** ====== PLAN/PERSONA ====== */
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
  if(!getToken()){ currentPlan="free"; refreshPersonaLocks(); return; }
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/memory/get`, { method:"GET", headers:{...authHeaders()} });
    const j = await r.json().catch(()=> ({}));
    const plan = ((j.profile||{}).plan || "free").toLowerCase();
    currentPlan = (plan==="plus"||plan==="pro") ? plan : "free";
  }catch{
    currentPlan="free";
  }
  refreshPersonaLocks();
}

/** ====== DEDIKODU PANEL ====== */
function upsellAltinHtml(title, msg){
  return `
    <div style="display:grid; gap:10px;">
      <div style="font-weight:1000; font-size:15px; color:#111;">${escapeHtml(title)}</div>
      <div style="color:#444; font-weight:800; line-height:1.45;">${msg}</div>
      <div style="padding:12px; border:2px solid var(--primary); border-radius:16px; background:#fff8e1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:1000;">Altın (Pro)</div>
          <div style="font-weight:1000; color:var(--primary);">119,99 TL</div>
        </div>
        <div style="margin-top:6px; color:#444; font-weight:800; line-height:1.45;">
          Dedikodu Odası + tüm kaynana modları + sınırsız sohbet/fal
        </div>
      </div>
      <div style="font-size:12px; color:#666; font-weight:800;">
        Ödeme Google Play üzerinden yapılır.
      </div>
    </div>
  `;
}

function dedikoduPanelHtml(){
  return `
    <div style="display:grid; gap:12px;">
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Davet Et</div>
        <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.45;">
          Arkadaşının <b>Caynana Numarası</b> ile çağır.
        </div>
        <input id="ddInviteInput" style="margin-top:10px;width:100%;height:42px;border-radius:14px;border:1px solid #eee;padding:0 12px;font-weight:900;" placeholder="Örn: CN-9F3A12BC" />
        <button id="ddInviteBtn" style="margin-top:10px;width:100%;height:44px;border-radius:14px;border:none;background:var(--primary);color:#fff;font-weight:1000;cursor:pointer;">Davet Gönder</button>
        <div id="ddInviteStatus" style="margin-top:8px;font-size:12px;color:#666;font-weight:900;"></div>
      </div>

      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Gelen Davetler</div>
        <div id="ddInbox" style="margin-top:10px; display:grid; gap:10px;"></div>
      </div>

      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Gönderilen Davetler</div>
        <div id="ddSent" style="margin-top:10px; display:grid; gap:10px;"></div>
      </div>
    </div>
  `;
}

function bindDedikoduPanel(){
  const inp = document.getElementById("ddInviteInput");
  const btn = document.getElementById("ddInviteBtn");
  const st = document.getElementById("ddInviteStatus");

  // ✅ önce backend’den bildirim çek (varsa)
  pullDedikoduNotifications().finally(()=> {
    renderDedikoduLists();
    updateDedikoduMenuState();
  });

  if(btn){
    btn.onclick = async ()=>{
      const target = (inp?.value || "").trim().toUpperCase();
      if(!target){ if(st) st.textContent="Bir Caynana Numarası yaz."; return; }

      if(st) st.textContent="Davet gönderiyorum…";

      try{
        const r = await fetch(`${BASE_DOMAIN}/api/dedikodu/invite`,{
          method:"POST",
          headers:{ "Content-Type":"application/json", ...authHeaders() },
          body: JSON.stringify({ target_caynana_no: target })
        });
        const j = await r.json().catch(()=> ({}));

        if(!r.ok){
          if(st) st.textContent = (j.detail || "Davet gönderilemedi.");
        }else{
          if(st) st.textContent = j.message ? j.message : "Davet gönderildi ✅";
        }
      }catch{
        if(st) st.textContent = "Davet gönderilemedi (bağlantı).";
      }

      // Local gösterim
      dedikoduState.sentInvites.unshift({ to: target, ts: Date.now(), status: "PENDING" });
      renderDedikoduLists();
      if(inp) inp.value="";
    };
  }
}

async function pullDedikoduNotifications(){
  if(!getToken()) return;
  try{
    const r = await fetch(`${BASE_DOMAIN}/api/notifications`, { method:"GET", headers:{...authHeaders()} });
    const j = await r.json().catch(()=> ({}));
    const items = j.items || [];
    // dedikodu davetlerini inbox’a çevir
    dedikoduState.inbox = items
      .filter(x => (x.payload && x.payload.kind === "dedikodu_invite"))
      .map(x => ({
        id: x.id,
        title: x.title,
        text: x.body,
        read: x.is_read,
        invite_id: x.payload.invite_id,
        room_id: x.payload.room_id,
        need_pro: !!x.payload.need_pro
      }));
  }catch{
    // ignore
  }
}

function updateDedikoduMenuState(){
  const badge = document.getElementById("dedikoduBadge");
  if(!badge) return;
  const unread = (dedikoduState.inbox || []).filter(x=> !x.read).length;
  if(unread > 0){
    badge.style.display = "inline-block";
    badge.textContent = String(unread);
  }else{
    badge.style.display = "none";
  }
}

function renderDedikoduLists(){
  const inboxEl = document.getElementById("ddInbox");
  const sentEl = document.getElementById("ddSent");

  if(inboxEl){
    inboxEl.innerHTML = "";
    const items = dedikoduState.inbox || [];
    if(!items.length){
      inboxEl.innerHTML = `<div style="font-size:12px;color:#666;font-weight:800;">Şimdilik davet yok.</div>`;
    }else{
      items.forEach((x)=>{
        const box = document.createElement("div");
        box.style.cssText = "padding:10px;border:1px solid #eee;border-radius:14px;";
        box.innerHTML = `
          <div style="font-weight:1000;color:#111;">${escapeHtml(x.title || "Davet")}</div>
          <div style="margin-top:6px;color:#444;font-weight:800;line-height:1.35;">${escapeHtml(x.text || "")}</div>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <button data-id="${x.id}" data-invite="${x.invite_id||""}" data-act="accept" style="flex:1;height:36px;border-radius:12px;border:none;background:#111;color:#fff;font-weight:1000;cursor:pointer;">Kabul</button>
            <button data-id="${x.id}" data-invite="${x.invite_id||""}" data-act="reject" style="flex:1;height:36px;border-radius:12px;border:1px solid #eee;background:#fff;font-weight:1000;cursor:pointer;">Reddet</button>
          </div>
        `;
        inboxEl.appendChild(box);
      });

      inboxEl.querySelectorAll("button").forEach(b=>{
        b.onclick = async ()=>{
          const nid = b.getAttribute("data-id");
          const inviteId = b.getAttribute("data-invite");
          const act = b.getAttribute("data-act");

          if(!inviteId){ return; }

          if(act === "accept"){
            try{
              const r = await fetch(`${BASE_DOMAIN}/api/dedikodu/accept`,{
                method:"POST",
                headers:{ "Content-Type":"application/json", ...authHeaders() },
                body: JSON.stringify({ invite_id: Number(inviteId) })
              });
              const j = await r.json().catch(()=> ({}));
              if(!r.ok) throw new Error(j.detail || "Kabul edilemedi");
              // ok
              await fetch(`${BASE_DOMAIN}/api/notifications/read`,{
                method:"POST",
                headers:{ "Content-Type":"application/json", ...authHeaders() },
                body: JSON.stringify({ id: Number(nid) })
              });
              // UI
              dedikoduState.inbox = dedikoduState.inbox.map(x=> x.id===Number(nid) ? {...x, read:true} : x);
              updateDedikoduMenuState();
              renderDedikoduLists();
              showPage("Dedikodu Odası", `<div style="font-weight:1000;color:#111;">Katıldın ✅</div><div style="margin-top:8px;color:#444;font-weight:800;">Oda ID: <b>${escapeHtml(j.room_id||"")}</b></div><div style="margin-top:8px;color:#666;font-weight:800;">Mesajlaşma kısmını bir sonraki adımda “rooms/messages” ile bağlayacağız.</div>`);
            }catch(e){
              showPage("Dedikodu Odası", upsellAltinHtml("Katılamadın", escapeHtml(e?.message || "Hata")));
            }
          }

          if(act === "reject"){
            try{
              await fetch(`${BASE_DOMAIN}/api/dedikodu/reject`,{
                method:"POST",
                headers:{ "Content-Type":"application/json", ...authHeaders() },
                body: JSON.stringify({ invite_id: Number(inviteId) })
              });
              await fetch(`${BASE_DOMAIN}/api/notifications/read`,{
                method:"POST",
                headers:{ "Content-Type":"application/json", ...authHeaders() },
                body: JSON.stringify({ id: Number(nid) })
              });
              dedikoduState.inbox = dedikoduState.inbox.map(x=> x.id===Number(nid) ? {...x, read:true} : x);
              updateDedikoduMenuState();
              renderDedikoduLists();
            }catch{
              // ignore
            }
          }
        };
      });
    }
  }

  if(sentEl){
    sentEl.innerHTML = "";
    const items = dedikoduState.sentInvites || [];
    if(!items.length){
      sentEl.innerHTML = `<div style="font-size:12px;color:#666;font-weight:800;">Henüz davet yok.</div>`;
    }else{
      items.slice(0,6).forEach(x=>{
        const box = document.createElement("div");
        box.style.cssText="padding:10px;border:1px solid #eee;border-radius:14px;";
        box.innerHTML = `
          <div style="font-weight:1000;color:#111;">${escapeHtml(x.to)}</div>
          <div style="margin-top:6px;color:#444;font-weight:800;">Durum: ${escapeHtml(x.status || "PENDING")}</div>
        `;
        sentEl.appendChild(box);
      });
    }
  }
}

/** ====== GOOGLE SIGN-IN ====== */
function ensureGoogleButton(){
  if (!googleBtn) return;
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

          const r = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: resp.credential, credential: resp.credential })
          });

          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.detail || "Google giriş hatası");

          setToken(j.token);
          setAuthStatus(`Bağlandı ✅ (${j.email || "Google"})`);
          await pullPlanFromBackend();
          updateDedikoduMenuState();
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

/** ====== EMAIL AUTH ====== */
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
    updateDedikoduMenuState();
    setTimeout(() => hideModal(authModal), 450);
  } catch (e) {
    showAuthError(e);
  }
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
      updateDedikoduMenuState();
    };
  }

  if(planBtn) planBtn.onclick = ()=> showPage("Üyelik", planHtml());
  if(aboutBtn) aboutBtn.onclick = ()=> showPage("Hakkımızda", aboutHtml());
  if(faqBtn) faqBtn.onclick = ()=> showPage("SSS", faqHtml());
  if(contactBtn) contactBtn.onclick = ()=> showPage("İletişim", contactHtml());
  if(privacyBtn) privacyBtn.onclick = ()=> showPage("Gizlilik", privacyHtml());

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

/** ====== PAGES ====== */
function planHtml(){ return `<div style="font-weight:900">Üyelik sayfası hazır.</div>`; }
function aboutHtml(){ return `<p><b>Caynana</b> — Yapay zekânın geleneksel aklı.</p>`; }
function faqHtml(){ return `<p>SSS yakında.</p>`; }
function contactHtml(){ return `<p>Destek: <b>support@caynana.ai</b></p>`; }
function privacyHtml(){ return `<p>Gizlilik yakında.</p>`; }

/** ====== FAL UI ====== */
function setFalStepUI(){
  if (!falStepText || !falStepSub) return;
  if (falImages.length < 3) {
    falStepText.textContent = "Fal için 3 fotoğraf çek";
    falStepSub.textContent = FAL_STEPS[falImages.length] || "1/3: Üstten çek";
  } else {
    falStepText.textContent = "Fal hazır…";
    falStepSub.textContent = "Yorum hazırlanıyor";
  }
}
function resetFalCapture(){ falImages = []; setFalStepUI(); }

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

  pullPlanFromBackend();
  bindEvents();

  // Bildirimleri çekip badge güncelle (pro ise)
  pullDedikoduNotifications().finally(()=> updateDedikoduMenuState());

  const waitGoogle = setInterval(()=>{
    if(window.google?.accounts?.id){
      clearInterval(waitGoogle);
    }
  }, 150);
}

init();
