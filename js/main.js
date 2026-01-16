/* js/main.js (v46.0 - SPEAK BUTTON FIXED) */

// --- 1. AYARLAR VE SABİTLER ---
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";
const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com"; 

const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false, showMic: true },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true, showMic: true },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", showCam: false, showMic: true },
    'fal': { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", showCam: true, showMic: false, specialInput: 'fal' },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Yıldızlar senin için parlıyor.", color: "#7986CB", icon: "fa-star", showCam: false, showMic: true, specialInput: 'astro' },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", showCam: false, showMic: false },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", showCam: true, showMic: true },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "Diyet Listeni Hazırladım.", color: "#AED581", icon: "fa-carrot", showCam: false, showMic: true, specialInput: 'diet' },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true, showMic: true }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

// --- 2. DEĞİŞKENLER ---
let isBusy = false;
let currentPersona = "normal";
let voiceEnabled = true;
let currentAudio = null;
window.currentAppMode = 'chat';

// --- 3. BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v46.0 (Button Fix) Started");
    
    initDock(); 
    setAppMode('chat'); 
    updateUIForUser(); 
    initSwipeDetection();
    
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: false
            });
        } catch(e) { console.error(e); }
    }

    const sendBtn = document.getElementById("sendBtn");
    const textInput = document.getElementById("text");
    if(sendBtn) sendBtn.addEventListener("click", sendMessage);
    if(textInput) textInput.addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// --- 4. SOHBET VE ZEKÂ ---
const SAFETY_PATTERNS = {
    suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam/i,
    substance: /uyuşturucu|bonzai|kokain|esrar/i,
    explicit: /s[iı]k|yarak|a[nm]cık|orospu|fahişe/i 
};

function generateSystemContext(persona, userName, userGender, maritalStatus) {
    let role = "Evlat";
    if (userGender === 'Erkek') role = "Damat/Oğul";
    else if (maritalStatus === 'Evli') role = "Gelin (Rakip)";
    else role = "Gelin Adayı";

    let baseMood = "Geleneksel Türk kaynanası.";
    if(persona === 'anne') baseMood = "Şefkatli, tonton anne.";
    if(persona === 'huysuz') baseMood = "Sürekli şikayet eden huysuz kadın.";
    if(persona === 'sinirli') baseMood = "Tahammülsüz, barut gibi.";
    if(persona === 'dobra') baseMood = "Lafını esirgemeyen, argo konuşan.";

    return `
        SENİN ROLÜN: Adın Caynana. Yapay zeka değilsin. Geleneksel bir Türk kadınısın.
        KULLANICI: ${role} (${userName}).
        HUYUN: ${baseMood}
        KURALLAR:
        1. Kullanıcının üslubuna AYNA TUT. Sertse sert, yumuşaksa yumuşak ol.
        2. Kısa ve öz konuş (Max 2 cümle).
        3. Asla "Yapay zekayım" deme.
    `;
}

async function fetchBotResponse(userMessage, mode, persona) {
    if (SAFETY_PATTERNS.suicide.test(userMessage)) return { assistant_text: "Aman evladım ağzından yel alsın! Git bir elini yüzünü yıka.", audio_data: null };
    if (SAFETY_PATTERNS.explicit.test(userMessage)) return { assistant_text: "Terbiyesizleşme! Karşında anan yaşında kadın var!", audio_data: null };

    const token = localStorage.getItem("auth_token");
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    const p = user.profile || {};

    const systemPrompt = generateSystemContext(persona, user.hitap || "Evladım", p.gender, p.maritalStatus);

    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
            message: userMessage, 
            system_instruction: systemPrompt,
            mode: "chat", 
            use_voice: true, 
            persona: persona 
        })
    });
    
    if(!res.ok) throw new Error("Sunucu hatası");
    return await res.json();
}

// --- 5. MESAJ GÖNDERME VE SES (DÜZELTİLDİ) ---
async function sendMessage() {
    if(isBusy) return;
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { triggerAuth("Giriş yap önce."); return; }

    isBusy = true;
    document.getElementById("text").value = "";
    addBubble(txt, 'user');
    
    const badge = document.getElementById("caynanaSpeaking");
    if(badge) { badge.style.display = "flex"; badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Düşünüyor...`; }

    try {
        const data = await fetchBotResponse(txt, window.currentAppMode, currentPersona);
        const ans = data.assistant_text || "...";
        
        typeWriter(ans, () => {
            if (data.audio_data) playAudioResponse(data.audio_data);
            else if(badge) badge.style.display = "none";

            // 🔥 BUTON EKLEME KISMI (ARTIK KOŞULSUZ ŞARTSIZ EKLİYOR) 🔥
            const rows = document.querySelectorAll('.msg-row.bot');
            const lastRow = rows[rows.length - 1];
            if(lastRow) {
                // Ses verisi varsa onu koy, yoksa boş string koy
                const audioContent = data.audio_data || "";
                lastRow.querySelector('.msg-bubble').insertAdjacentHTML('beforeend', 
                    `<div class="speak-btn-inline" onclick="window.replayLastAudio('${audioContent}')">
                        <i class="fa-solid fa-volume-high"></i> Dinle
                    </div>`
                );
            }

            if(data.data) renderProducts(data.data);
        });

    } catch(e) {
        addBubble("Bağlantı koptu.", 'bot');
        if(badge) badge.style.display = "none";
    } finally {
        isBusy = false;
    }
}

function playAudioResponse(base64Audio) {
    if (!base64Audio || !voiceEnabled) return;
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    try {
        currentAudio = new Audio("data:audio/mp3;base64," + base64Audio);
        const badge = document.getElementById("caynanaSpeaking");
        if(badge) { badge.style.display = "flex"; badge.innerHTML = `<i class="fa-solid fa-volume-high fa-beat-fade"></i> Konuşuyor...`; }
        
        currentAudio.play();
        currentAudio.onended = () => { if(badge) badge.style.display = "none"; };
    } catch (e) { console.error(e); }
}

// --- 6. UI YÖNETİMİ ---
function initDock() {
    const dock = document.getElementById('dock');
    if(!dock) return;
    dock.innerHTML = '';
    MODULE_ORDER.forEach(key => {
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.onclick = () => setAppMode(key);
        item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${MODE_CONFIG[key].icon}"></i></div>`;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode];
    
    document.getElementById('heroTitle').innerHTML = cfg.title;
    document.getElementById('heroDesc').innerHTML = cfg.desc;
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    const heroImg = document.getElementById('heroImage');
    heroImg.style.opacity = '0';
    setTimeout(() => { 
        heroImg.src = `./images/hero-${mode}.png`; 
        heroImg.onload = () => heroImg.style.opacity = '1';
        heroImg.onerror = () => { heroImg.src = './images/hero-chat.png'; heroImg.style.opacity='1'; };
    }, 200);

    const ids = ['falInputArea', 'stdInputArea', 'dietActions', 'astroActions'];
    ids.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });

    if(cfg.specialInput === 'fal') document.getElementById('falInputArea').style.display = 'flex';
    else document.getElementById('stdInputArea').style.display = 'flex';
    
    if(cfg.specialInput === 'diet') document.getElementById('dietActions').style.display = 'flex';
    if(cfg.specialInput === 'astro') document.getElementById('astroActions').style.display = 'flex';

    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.innerHTML.includes(cfg.icon)) el.classList.add('active');
    });

    const container = document.getElementById('chatContainer');
    container.innerHTML = '';
    if (mode === 'diet') loadDietContent();
    else if (mode === 'astro') loadAstroContent();
    else addBotMessage(cfg.desc);
}

// --- 7. GLOBAL FONKSİYONLAR ---
window.openDrawer = () => document.getElementById('drawerMask').style.display='flex';
window.closeDrawer = () => document.getElementById('drawerMask').style.display='none';
window.openPersonaModal = () => document.getElementById('personaModal').style.display='flex';
window.clearCurrentChat = () => { document.getElementById('chatContainer').innerHTML=''; addBotMessage(MODE_CONFIG[window.currentAppMode].desc); };
window.toggleVoice = () => {
    voiceEnabled = !voiceEnabled;
    const icon = document.getElementById('voiceIcon');
    if(icon) {
        icon.className = voiceEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
        icon.style.color = voiceEnabled ? "#4CAF50" : "#fff";
    }
};
window.handleGoogleLogin = () => google.accounts.id.prompt();
window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.handleDeleteAccount = () => { if(confirm("Emin misin?")) { localStorage.clear(); window.location.reload(); } };
window.changePersona = (p) => { 
    currentPersona = p; 
    document.querySelectorAll('.persona-option').forEach(el => el.classList.remove('selected'));
    document.getElementById('personaModal').style.display='none';
    addBotMessage(`Mod değişti: <b>${p.toUpperCase()}</b>`);
};
// 🔥 SES TEKRAR OYNATMA (GÜVENLİ) 🔥
window.replayLastAudio = (b64) => {
    if(!b64 || b64 === "undefined" || b64 === "") {
        alert("Ses verisi henüz gelmedi başkanım. Backend bağlanınca konuşacak.");
    } else {
        playAudioResponse(b64);
    }
};
window.triggerAuth = (msg) => { addBotMessage(msg); document.getElementById("authModal").style.display="flex"; };

window.generateDietList = () => loadDietContent();
window.showZodiacFeatures = () => addBotMessage("Burç özellikleri çok yakında...");
window.showBmiStatus = () => alert("Detaylı analiz hazırlanıyor...");

function loadDietContent() {
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    if (!user.profile || !user.profile.weight) { addBotMessage("Profilini doldur gel."); return; }
    const bmi = (user.profile.weight / ((user.profile.height/100)**2)).toFixed(1);
    document.getElementById('chatContainer').innerHTML = `<div class="info-card"><div class="info-header"><i class="fa-solid fa-carrot"></i> Diyet</div>Sabah: Yumurta<br>Öğle: Çorba<br><i>Endeks: ${bmi}</i></div>`;
}
function loadAstroContent() {
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
    document.getElementById('chatContainer').innerHTML = `<div class="astro-card"><div class="astro-date">${today}</div><div class="astro-sign">⭐ Günlük Yorum</div>Bugün şanslısın.</div>`;
}

// --- 8. YARDIMCILAR ---
function addBubble(text, role) { 
    const c=document.getElementById("chatContainer"); 
    c.innerHTML+=`<div class="msg-row ${role}"><div class="msg-bubble ${role}">${text}</div></div>`; 
    c.scrollTop=c.scrollHeight; 
}
function addBotMessage(text) { 
    const c=document.getElementById("chatContainer"); 
    c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot">${text}</div></div>`; 
    c.scrollTop=c.scrollHeight; 
}
function typeWriter(text, cb) { 
    const c=document.getElementById("chatContainer"); 
    const id="b"+Date.now(); 
    c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`; 
    const el=document.getElementById(id); 
    let i=0; 
    function step(){ 
        if(i>=text.length){if(cb)cb();return;} 
        el.innerHTML+=text.charAt(i); i++; 
        c.scrollTop=c.scrollHeight; 
        setTimeout(step,15); 
    } 
    step(); 
}
function updateUIForUser() {
    const raw = localStorage.getItem("user_info");
    const menu = document.querySelector('.menu-list');
    const bar = document.getElementById('userInfoBar');
    if (raw) {
        const u = JSON.parse(raw);
        if(bar) {
            bar.classList.add('visible'); 
            document.getElementById('headerAvatar').src = u.picture || PLACEHOLDER_IMG;
            let nick = u.hitap || "Misafir";
            if(nick.length > 10) nick = nick.substring(0, 10) + "..";
            document.getElementById('headerHitap').innerText = nick.toUpperCase();
        }
        if(menu) {
            menu.innerHTML = `<a href="pages/profil.html" class="menu-item">Profil</a><a href="pages/sss.html" class="menu-item">S.S.S</a><div class="menu-item" onclick="handleLogout()">Çıkış</div>`;
        }
    } else {
        if(bar) bar.classList.remove('visible'); 
        if(menu) menu.innerHTML = `<div class="menu-item" onclick="document.getElementById('authModal').style.display='flex'">Giriş Yap</div>`;
    }
}
function renderProducts(p) { p.slice(0,5).forEach((x,i)=>{ setTimeout(()=>{ document.getElementById("chatContainer").innerHTML+=`<div class="msg-row bot"><div class="product-card"><img src="${x.image||PLACEHOLDER_IMG}" class="pc-img"><div class="pc-content"><div class="pc-title">${x.title}</div><div class="pc-price">${x.price}</div><a href="${x.url}" target="_blank" class="pc-btn-mini">Git</a></div></div></div>`; },i*200); }); }
function initSwipeDetection() { let ts=0; const m=document.getElementById('main'); m.addEventListener('touchstart',e=>{ts=e.changedTouches[0].screenX}); m.addEventListener('touchend',e=>{ const te=e.changedTouches[0].screenX; if(te<ts-50)changeModule(1); if(te>ts+50)changeModule(-1); }); }
function changeModule(d) { let i=MODULE_ORDER.indexOf(window.currentAppMode)+d; if(i>=9)i=0; if(i<0)i=8; setAppMode(MODULE_ORDER[i]); }
function parseJwt(t) { try{return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')))}catch(e){return{}} }
async function handleGoogleResponse(r) { 
    const u=parseJwt(r.credential); 
    localStorage.setItem("user_info",JSON.stringify({name:u.name, picture:u.picture, hitap:u.given_name}));
    try{ await fetch(`${BASE_DOMAIN}/api/auth/google`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:r.credential})}); localStorage.setItem("auth_token",r.credential); }catch(e){}
    window.location.href="pages/profil.html"; 
}
