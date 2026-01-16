/* js/main.js (v32.0 - FINAL STABLE & FULL FEATURES) */

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";
const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com"; 

let isBusy = false;
let currentPersona = "normal";
let voiceEnabled = false;
const chatHistory = {};

// MODÜL AYARLARI
const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false, showMic: true },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true, showMic: true },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", showCam: false, showMic: true },
    'fal': { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", showCam: true, showMic: false, specialInput: 'fal' },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu hayırdır.", color: "#7986CB", icon: "fa-star", showCam: false, showMic: true },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", showCam: false, showMic: false },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", showCam: true, showMic: true },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "Diyet Listeni Hazırladım.", color: "#AED581", icon: "fa-carrot", showCam: false, showMic: true, specialInput: 'diet' },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true, showMic: true }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v32.0 Final Started");
    initDock();
    setAppMode('chat');
    checkLoginStatus(); 
    initSwipeDetection();
    
    // Google Init
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: false
            });
        } catch(e) { console.error(e); }
    }

    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// 🔥 GLOBAL FONKSİYONLAR (HAMBURGER MENÜ İÇİN ŞART) 🔥
window.openDrawer = () => { document.getElementById('drawerMask').style.display='flex'; };
window.closeDrawer = () => { document.getElementById('drawerMask').style.display='none'; };
window.triggerAuth = (msg) => { addBotMessage(msg); document.getElementById("authModal").style.display="flex"; };
window.handleGoogleLogin = () => { google.accounts.id.prompt(); };
window.clearCurrentChat = () => { document.getElementById('chatContainer').innerHTML=''; addBotMessage(MODE_CONFIG[window.currentAppMode].desc); };

// KİŞİLİK & SES
window.changePersona = (p) => { 
    currentPersona = p; 
    alert(`Kaynana Modu: ${p.toUpperCase()}\nArtık buna göre konuşacak.`); 
    window.closeDrawer(); 
};
window.toggleVoice = () => {
    voiceEnabled = !voiceEnabled;
    const i = document.getElementById('voiceIcon');
    i.className = voiceEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
    i.style.color = voiceEnabled ? "#4CAF50" : "#fff";
};

// YENİ: KAYNANA YORUM YAP (SESLİ KOMUT TETİKLEME)
window.triggerCommentary = () => {
    if(!localStorage.getItem("auth_token")) { window.triggerAuth("Önce giriş yap evladım."); return; }
    
    const badge = document.getElementById("caynanaSpeaking");
    badge.style.display = "block";
    badge.innerHTML = `<i class="fa-solid fa-lips fa-beat"></i> Yorum Yapıyor...`;
    
    // Simülasyon (Backend'e "commentary" isteği gidecek)
    setTimeout(() => {
        addBotMessage("Ay ben ne diyeyim şimdi buna... (Sesli Yorum Çalınıyor...)");
        badge.style.display = "none";
    }, 2000);
};

// --- MOD & UI ---
function initDock() {
    const dock = document.getElementById('dock');
    dock.innerHTML = ''; 
    MODULE_ORDER.forEach(key => {
        const conf = MODE_CONFIG[key];
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.dataset.mode = key;
        item.onclick = () => setAppMode(key);
        item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${conf.icon}"></i></div>`;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    const currentContainer = document.getElementById('chatContainer');
    const oldMode = window.currentAppMode || 'chat';
    if(currentContainer) chatHistory[oldMode] = currentContainer.innerHTML;

    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode];
    
    document.getElementById('heroTitle').innerHTML = cfg.title;
    document.getElementById('heroDesc').innerHTML = cfg.desc;
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    // Top Bar Mod İkonu
    const modeIcon = document.getElementById('currentModeIcon');
    modeIcon.innerHTML = `<i class="fa-solid ${cfg.icon}"></i>`;
    modeIcon.style.background = cfg.color;

    // Resim
    const heroImg = document.getElementById('heroImage');
    heroImg.style.opacity = '0';
    setTimeout(() => {
        heroImg.src = `./images/hero-${mode}.png`;
        heroImg.onload = () => heroImg.style.opacity = '1';
        heroImg.onerror = () => { heroImg.src = './images/hero-chat.png'; heroImg.style.opacity='1'; };
    }, 200);

    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.dataset.mode === mode) el.classList.add('active');
    });
    updateFooterBars(mode);

    // GİZLEME AYARLARI
    document.getElementById('falInputArea').style.display = (cfg.specialInput === 'fal') ? 'flex' : 'none';
    document.getElementById('stdInputArea').style.display = (cfg.specialInput === 'fal') ? 'none' : 'flex';
    document.getElementById('dietActions').style.display = (cfg.specialInput === 'diet') ? 'flex' : 'none';
    document.getElementById('camBtn').style.display = cfg.showCam ? 'flex' : 'none';
    document.getElementById('micBtn').style.display = cfg.showMic ? 'flex' : 'none';

    currentContainer.innerHTML = '';
    
    if (mode === 'diet') {
        loadDietContent();
    } else if (chatHistory[mode]) {
        currentContainer.innerHTML = chatHistory[mode];
        setTimeout(() => currentContainer.scrollTo({ top: currentContainer.scrollHeight, behavior: 'instant' }), 10);
    } else {
        const user = JSON.parse(localStorage.getItem("user_info") || "{}");
        addBotMessage(`Gel ${user.hitap || 'evladım'}, modumuz değişti.`);
    }
}

// --- OTURUM YÖNETİMİ ---
function checkLoginStatus() {
    const raw = localStorage.getItem("user_info");
    const menu = document.querySelector('.menu-list');
    const bar = document.getElementById('userInfoBar');
    
    if (raw) {
        const u = JSON.parse(raw);
        bar.classList.add('visible'); 
        document.getElementById('headerAvatar').src = u.picture || PLACEHOLDER_IMG;
        document.getElementById('headerHitap').innerText = (u.hitap || "DAMAT").toUpperCase();
        document.getElementById('headerName').innerText = u.name || "";

        menu.innerHTML = `
            <a href="pages/profil.html" class="menu-item highlight" style="border:1px solid var(--primary);"><i class="fa-solid fa-user-pen"></i> Profil</a>
            <a href="pages/hakkimizda.html" class="menu-item link-item"><i class="fa-solid fa-circle-info"></i> Hakkımızda</a>
            <a href="pages/gizlilik.html" class="menu-item link-item"><i class="fa-solid fa-shield-halved"></i> Gizlilik Politikası</a>
            <div style="margin-top:15px; border-top:1px solid #333;"></div>
            <div class="menu-item link-item" onclick="window.handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Çıkış</div>
            <div class="menu-item link-item" onclick="window.handleDeleteAccount()" style="color:#f44;"><i class="fa-solid fa-trash-can"></i> Sil</div>
        `;
    } else {
        bar.classList.remove('visible'); 
        menu.innerHTML = `<div class="menu-item highlight" onclick="document.getElementById('authModal').style.display='flex'"><i class="fa-solid fa-user-plus"></i> Giriş Yap</div>`;
    }
}

window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.handleDeleteAccount = () => { if(confirm("Hesabın silinecek?")) { localStorage.clear(); window.location.reload(); } };

// --- DİYET & SAĞLIK ---
window.generateDietList = (force) => { generateDietList(force); };
window.showBmiStatus = () => {
    const p = JSON.parse(localStorage.getItem("user_info") || "{}").profile;
    if(p) alert(`Boy: ${p.height}cm\nKilo: ${p.weight}kg\nYaş: ${p.age}`);
};

function loadDietContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const container = document.getElementById('chatContainer');
    if (!user.profile || !user.profile.weight) { addBotMessage("Önce profilini doldur."); return; }
    
    const today = new Date().toDateString();
    if (localStorage.getItem("daily_diet") && localStorage.getItem("diet_date") === today) {
        addBotMessage(`Bugünkü listen hazır ${user.hitap}.`);
        container.innerHTML += localStorage.getItem("daily_diet");
    } else { generateDietList(false); }
}

function generateDietList(forceNew) {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const p = user.profile;
    const bmi = (p.weight / ((p.height/100)**2)).toFixed(1);
    
    const menuHTML = `
    <div class="info-card">
        <div class="info-header"><i class="fa-solid fa-carrot"></i> Caynana Diyet Menüsü</div>
        <b>Sabah:</b> 1 Haşlanmış Yumurta, 2 Ceviz, Bol Yeşillik.<br>
        <b>Öğle:</b> Izgara Köfte (3 adet), Ayran.<br>
        <b>Akşam:</b> Zeytinyağlı Pırasa, Yoğurt.<br><br>
        <i>Endeksin: ${bmi}. Ona göre ye!</i>
    </div>`;
    
    localStorage.setItem("daily_diet", menuHTML);
    localStorage.setItem("diet_date", new Date().toDateString());
    
    const c = document.getElementById('chatContainer');
    if(forceNew) c.innerHTML = '';
    addBotMessage(`Endeksin: ${bmi}. İşte bugünkü listen:`);
    c.innerHTML += menuHTML;
    c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
}

// --- MESAJLAŞMA ---
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { window.triggerAuth("Giriş yap önce."); return; }
    
    isBusy = true; 
    document.getElementById("text").value = "";
    addBubble(txt, 'user');
    
    const badge = document.getElementById("caynanaSpeaking");
    badge.style.display = "block";
    badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Yazıyor...`;
    
    addLoading("Düşünüyor...");

    try {
        const u = JSON.parse(localStorage.getItem("user_info") || "{}");
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST", headers: { "Content-Type":"application/json", "Authorization":`Bearer ${localStorage.getItem("auth_token")}` },
            body: JSON.stringify({ message: txt, mode: window.currentAppMode, persona: currentPersona, user_name: u.hitap })
        });
        removeLoading();
        if(!res.ok) throw new Error();
        
        const data = await res.json();
        const ans = data.assistant_text || "...";
        
        if(voiceEnabled) {
            badge.innerHTML = `<i class="fa-solid fa-volume-high fa-beat"></i> Konuşuyor...`;
            setTimeout(() => badge.style.display="none", 5000); 
        } else { badge.style.display="none"; }

        // ALIŞVERİŞ İSE DETAYLI KART GÖSTER
        if (window.currentAppMode === 'shopping') {
            const shopHTML = `<div class="info-card"><div class="info-header"><i class="fa-solid fa-tag"></i> Kaynana Tavsiyesi</div>${ans}<br><br><b>Neden Almalısın?</b><br>Kaliteli mal, fiyatı da uygun.</div>`;
            document.getElementById('chatContainer').innerHTML += `<div class="msg-row bot">${shopHTML}</div>`;
        } else {
            typeWriterBubble(ans);
        }

        if(data.data) setTimeout(() => renderProducts(data.data), 500);

    } catch(e) { removeLoading(); addBotMessage("Hata oluştu."); }
    finally { isBusy = false; }
}

// --- YARDIMCILAR ---
function addBubble(t, r) { const c=document.getElementById("chatContainer"); c.innerHTML+=`<div class="msg-row ${r}"><div class="msg-bubble ${r}">${t}</div></div>`; c.scrollTop=c.scrollHeight; }
function addBotMessage(t) { const c=document.getElementById("chatContainer"); c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot">${t}</div></div>`; c.scrollTop=c.scrollHeight; }
function typeWriterBubble(t, cb) { 
    const c=document.getElementById("chatContainer"); const id="b"+Date.now();
    c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`; 
    const el=document.getElementById(id); let i=0; 
    function step(){ if(i>=t.length){if(cb)cb();return;} el.innerHTML+=t.charAt(i); i++; c.scrollTop=c.scrollHeight; setTimeout(step,10); } step(); 
}
function addLoading(t) { const c=document.getElementById("chatContainer"); removeLoading(); c.innerHTML+=`<div class="msg-row bot loading-bubble-wrap"><div class="msg-bubble bot">${t} <i class="fa-solid fa-spinner fa-spin"></i></div></div>`; c.scrollTop=c.scrollHeight; }
function removeLoading() { document.querySelectorAll('.loading-bubble-wrap').forEach(el=>el.remove()); }
function updateFooterBars(mode) { const idx=MODULE_ORDER.indexOf(mode); for(let i=0;i<4;i++){ document.getElementById(`line${i+1}`).style.background=MODE_CONFIG[MODULE_ORDER[(idx+i)%9]].color; } }
function initSwipeDetection() {
    let ts = 0;
    const m = document.getElementById('main');
    m.addEventListener('touchstart', e => { ts = e.changedTouches[0].screenX; });
    m.addEventListener('touchend', e => {
        const te = e.changedTouches[0].screenX;
        if (te < ts - 50) changeModule(1);
        if (te > ts + 50) changeModule(-1);
    });
}
function changeModule(dir) {
    let idx = MODULE_ORDER.indexOf(window.currentAppMode) + dir;
    if(idx >= MODULE_ORDER.length) idx = 0;
    if(idx < 0) idx = MODULE_ORDER.length - 1;
    setAppMode(MODULE_ORDER[idx]);
}
function parseJwt(t) { try{return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch(e){return{}} }
async function handleGoogleResponse(r) { 
    const u=parseJwt(r.credential); 
    const user={name:u.name, picture:u.picture, hitap:u.given_name};
    localStorage.setItem("user_info",JSON.stringify(user));
    try{ const res=await fetch(`${BASE_DOMAIN}/api/auth/google`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:r.credential})}); const d=await res.json(); if(d.token) localStorage.setItem("auth_token",d.token); }catch(e){}
    window.location.href="pages/profil.html"; 
}
function renderProducts(products) {
    const container = document.getElementById("chatContainer");
    products.slice(0, 5).forEach((p, index) => {
        setTimeout(() => {
            const wrap = document.createElement("div"); wrap.className = "msg-row bot";
            wrap.innerHTML = `<div class="product-card"><div class="pc-source">Trendyol</div><div class="pc-img-wrap"><img src="${p.image || PLACEHOLDER_IMG}" class="pc-img" onerror="this.src='${PLACEHOLDER_IMG}'"></div><div class="pc-content"><div class="pc-title">${p.title || "Ürün"}</div><div class="pc-info-row"><i class="fa-solid fa-circle-check"></i> ${p.reason || 'İncele'}</div><div class="pc-bottom-row"><div class="pc-price">${p.price || "Fiyat Gör"}</div><a href="${p.url}" target="_blank" class="pc-btn-mini">Ürüne Git</a></div></div></div>`;
            container.appendChild(wrap); container.scrollTop=container.scrollHeight;
        }, index * 260);
    });
}
