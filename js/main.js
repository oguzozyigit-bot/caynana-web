/* js/main.js (v50.0 - STABLE & ALL FEATURES) */

// 1. AYARLAR
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const GOOGLE_CLIENT_ID = "530064560706-03ga0q36t703ve7gmahr98.apps.googleusercontent.com"; 
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", showCam: false },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", showCam: true },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", showCam: false },
    'fal': { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", showCam: true, specialInput: 'fal' },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Yıldızlar senin için parlıyor.", color: "#7986CB", icon: "fa-star", showCam: false, specialInput: 'astro' },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", showCam: false },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", showCam: true },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "Diyet Listeni Hazırladım.", color: "#AED581", icon: "fa-carrot", showCam: false, specialInput: 'diet' },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", showCam: true }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

let currentPersona = "normal";
let currentAudio = null;
let lastBotResponseText = "";
window.currentAppMode = 'chat';

// 2. BAŞLATMA
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v50.0 Ready");
    initDock();
    setAppMode('chat');
    updateUIForUser();
    
    // Google Login
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try { google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse, auto_select: false }); } catch(e) {}
    }

    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// 3. MESAJ GÖNDERME
async function sendMessage() {
    const txt = document.getElementById("text").value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { triggerAuth("Giriş yap önce."); return; }

    document.getElementById("text").value = "";
    addBubble(txt, 'user');
    
    const badge = document.getElementById("caynanaSpeaking");
    badge.style.display = "flex"; badge.innerText = "Yazıyor...";

    try {
        const token = localStorage.getItem("auth_token");
        const user = JSON.parse(localStorage.getItem("user_info") || "{}");
        
        // Sadece Yazı İsteği
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ 
                message: txt, 
                mode: window.currentAppMode, 
                persona: currentPersona,
                system_instruction: `Sen Caynanasın. Kullanıcı: ${user.hitap || 'Evlat'}. Mod: ${currentPersona}. Kısa cevap ver.`
            })
        });
        
        const data = await res.json();
        const ans = data.assistant_text || "...";
        lastBotResponseText = ans;

        typeWriter(ans, () => {
            badge.style.display = "none";
            
            // 🔥 BUTON EKLE (GARANTİLİ) 🔥
            const rows = document.querySelectorAll('.msg-row.bot');
            const lastRow = rows[rows.length - 1];
            if(lastRow) {
                lastRow.querySelector('.msg-bubble').insertAdjacentHTML('beforeend', 
                    `<div class="speak-btn-inline" onclick="window.fetchAndPlayAudio()">
                        <i class="fa-solid fa-volume-high"></i> Dinle
                    </div>`
                );
            }
            if(data.data && data.data.length > 0) renderProducts(data.data);
        });

    } catch(e) {
        addBubble("Bağlantı koptu.", 'bot');
        badge.style.display = "none";
    }
}

// 4. SES İŞLEMİ (TIKLA -> GETİR -> ÇAL)
window.fetchAndPlayAudio = async () => {
    if(!lastBotResponseText) return;
    
    // Butonu bul ve güncelle
    const btns = document.querySelectorAll('.speak-btn-inline');
    const btn = btns[btns.length - 1];
    if(btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Hazırlanıyor...`;

    try {
        const res = await fetch(`${BASE_DOMAIN}/api/speech`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text_to_comment: lastBotResponseText, 
                persona: currentPersona 
            })
        });
        
        // Eğer backend cevap vermezse veya hata dönerse (Mevcut durumda muhtemel)
        if(!res.ok) throw new Error("Backend yok");

        const data = await res.json();
        
        if(data.audio_data) {
            playAudioRaw(data.audio_data);
            if(btn) btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Tekrarla`;
        } else {
            throw new Error("Ses verisi boş");
        }
    } catch(e) {
        console.warn("Ses hatası:", e);
        if(btn) btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Hata`;
        // 🔥 KAYNANA USULÜ HATA MESAJI 🔥
        alert("Evde elektrik yokken ütü çalışmaz ya, backend gelince konuşacağım evladım. 😅");
    }
};

function playAudioRaw(b64) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    try {
        currentAudio = new Audio("data:audio/mp3;base64," + b64);
        const badge = document.getElementById("caynanaSpeaking");
        badge.style.display = "flex"; badge.innerText = "Konuşuyor...";
        currentAudio.play();
        currentAudio.onended = () => { badge.style.display = "none"; };
    } catch(e) { console.error(e); }
}

// 5. YARDIMCILAR & UI
function initDock() {
    const dock = document.getElementById('dock');
    dock.innerHTML = '';
    MODULE_ORDER.forEach(key => {
        dock.innerHTML += `<div class="dock-item" onclick="setAppMode('${key}')"><div class="dock-icon"><i class="fa-solid ${MODE_CONFIG[key].icon}"></i></div></div>`;
    });
}

function setAppMode(m) {
    window.currentAppMode = m;
    const c = MODE_CONFIG[m];
    document.getElementById('heroTitle').innerHTML = c.title;
    document.getElementById('heroDesc').innerHTML = c.desc;
    document.documentElement.style.setProperty('--primary', c.color);
    
    // Resim Değişimi
    const img = document.getElementById('heroImage');
    img.style.opacity = '0';
    setTimeout(() => { img.src = `./images/hero-${m}.png`; img.onload = () => img.style.opacity = '1'; }, 200);

    // Buton Gizle/Göster
    ['falInputArea','stdInputArea','dietActions','astroActions'].forEach(i=>document.getElementById(i).style.display='none');
    if(c.specialInput === 'fal') document.getElementById('falInputArea').style.display='flex';
    else document.getElementById('stdInputArea').style.display='flex';
    if(c.specialInput === 'diet') document.getElementById('dietActions').style.display='flex';
    if(c.specialInput === 'astro') document.getElementById('astroActions').style.display='flex';

    // Renkli Çizgiler
    const idx = MODULE_ORDER.indexOf(m);
    for(let i=0; i<4; i++) {
        const line = document.getElementById(`line${i+1}`);
        if(line) line.style.background = MODE_CONFIG[MODULE_ORDER[(idx+i)%9]].color;
    }

    document.getElementById('chatContainer').innerHTML = '';
}

function updateUIForUser() {
    const r = localStorage.getItem("user_info");
    const menu = document.querySelector('.menu-list');
    if(r) {
        const u = JSON.parse(r);
        document.getElementById('userInfoBar').classList.add('visible');
        document.getElementById('headerHitap').innerText = u.hitap.toUpperCase();
        document.getElementById('headerAvatar').src = u.picture || PLACEHOLDER_IMG;
        menu.innerHTML = `<a href="pages/profil.html" class="menu-item">Profil</a><a href="pages/sss.html" class="menu-item">S.S.S</a><div class="menu-item" onclick="window.handleLogout()">Çıkış</div>`;
    } else {
        menu.innerHTML = `<div class="menu-item" onclick="document.getElementById('authModal').style.display='flex'">Giriş Yap</div>`;
    }
}

// Global Binding
window.openDrawer = () => document.getElementById('drawerMask').style.display='flex';
window.closeDrawer = () => document.getElementById('drawerMask').style.display='none';
window.openPersonaModal = () => document.getElementById('personaModal').style.display='flex';
window.changePersona = (p) => { currentPersona=p; document.getElementById('personaModal').style.display='none'; addBubble(`Mod: ${p.toUpperCase()}`, 'bot'); };
window.clearCurrentChat = () => { document.getElementById('chatContainer').innerHTML=''; };
window.handleLogout = () => { localStorage.clear(); window.location.reload(); };
window.handleGoogleLogin = () => google.accounts.id.prompt();
window.toggleVoice = () => alert("Sesi her mesajda 'Dinle' butonuyla açabilirsin.");
window.triggerAuth = (m) => { addBubble(m, 'bot'); document.getElementById('authModal').style.display='flex'; };
window.generateDietList = () => addBubble("Diyet listesi hazırlanıyor...", 'bot');
window.loadAstroContent = () => addBubble("Yıldızlara bakılıyor...", 'bot');

function addBubble(t, r) { const c=document.getElementById('chatContainer'); c.innerHTML+=`<div class="msg-row ${r}"><div class="msg-bubble ${r}">${t}</div></div>`; c.scrollTop=c.scrollHeight; }
function typeWriter(t, cb) { const c=document.getElementById('chatContainer'); const id="b"+Date.now(); c.innerHTML+=`<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`; const el=document.getElementById(id); let i=0; function s(){ if(i>=t.length){if(cb)cb();return;} el.innerHTML+=t.charAt(i); i++; c.scrollTop=c.scrollHeight; setTimeout(s,15); } s(); }
async function handleGoogleResponse(r) { const p=JSON.parse(atob(r.credential.split('.')[1])); localStorage.setItem("user_info",JSON.stringify({hitap:p.given_name, picture:p.picture})); localStorage.setItem("auth_token", "demo_token"); window.location.href="pages/profil.html"; }
function renderProducts(p) { p.slice(0,5).forEach((x,i)=>{ setTimeout(()=>{ document.getElementById("chatContainer").innerHTML+=`<div class="msg-row bot"><div class="product-card"><img src="${x.image||PLACEHOLDER_IMG}" class="pc-img"><div class="pc-content"><div class="pc-title">${x.title}</div><div class="pc-price">${x.price}</div><a href="${x.url}" target="_blank" class="pc-btn-mini">Git</a></div></div></div>`; },i*200); }); }
