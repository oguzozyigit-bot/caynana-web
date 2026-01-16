/* js/main.js (v26.3 - FINAL STABLE & DEBUG) */

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

// 🔥 BURAYA RENDER'DAKİ GOOGLE CLIENT ID'Yİ YAPIŞTIR 🔥
const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com"; 

let isBusy = false;
const chatHistory = {};

// MOD YAPILANDIRMASI
const MODE_CONFIG = {
    'chat': { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments", welcome: "Ooo hoş geldin evladım! Gözüm yollarda kaldı. Gel otur şöyle, anlat bakalım derdin ne?" },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping", welcome: "Aman evladım, paranı sokağa atma. Ne lazım söyle, en uygununu bulayım sana." },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret", welcome: "Kız kim ne demiş? Anlat çabuk, aramızda kalacak söz." },
    'fal': { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot", welcome: "Hadi iç kahveni, kapat fincanı soğusun da gel." },
    'astro': { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu hayırdır.", color: "#7986CB", icon: "fa-star", welcome: "Yıldızlar bu ara karışık evladım. Burcun ne senin?" },
    'ruya': { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon", welcome: "Hayırdır inşallah de. Ne gördün rüyanda?" },
    'health': { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse", welcome: "Aman sağlığına dikkat et. Neren ağrıyor?" },
    'diet': { title: "Boğazını Tut<br>Rahat Et.", desc: "O böreği bırak.", color: "#AED581", icon: "fa-carrot", welcome: "O böreği yavaşça yere bırak evladım. Gel diyete başlayalım." },
    'trans': { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language", welcome: "Ne diyor bu gavurlar? Anlamadığın yeri sor bana." }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Caynana v26.3 Started (Access Token Mode)");
    initDock();
    setAppMode('chat');
    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

/* ... DOCK & UI ... */
function initDock() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    dock.innerHTML = ''; 
    MODULE_ORDER.forEach(key => {
        const conf = MODE_CONFIG[key];
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.dataset.mode = key;
        item.onclick = () => setAppMode(key);
        item.innerHTML = `<div class="dock-icon"><i class="fa-solid ${conf.icon}"></i></div><div class="dock-label">${key.toUpperCase()}</div>`;
        dock.appendChild(item);
    });
}
function setAppMode(mode) {
    const currentContainer = document.getElementById('chatContainer');
    const oldMode = window.currentAppMode || 'chat';
    if(currentContainer) chatHistory[oldMode] = currentContainer.innerHTML;
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode] || MODE_CONFIG['chat'];
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
    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.dataset.mode === mode) el.classList.add('active');
    });
    updateFooterBars(mode);
    if (chatHistory[mode]) {
        currentContainer.innerHTML = chatHistory[mode];
        setTimeout(() => currentContainer.scrollTo({ top: currentContainer.scrollHeight, behavior: 'instant' }), 10);
    } else {
        currentContainer.innerHTML = '';
        addBotMessage(cfg.welcome);
    }
}
function updateFooterBars(currentMode) {
    const idx = MODULE_ORDER.indexOf(currentMode);
    if(idx === -1) return;
    const lines = [document.getElementById('line1'), document.getElementById('line2'), document.getElementById('line3'), document.getElementById('line4')];
    for(let i=0; i<4; i++) {
        const targetIdx = (idx + i) % MODULE_ORDER.length; 
        const targetMode = MODULE_ORDER[targetIdx];
        if(lines[i]) lines[i].style.background = MODE_CONFIG[targetMode].color;
    }
}

/* ... CHAT ... */
async function sendMessage() {
    if(isBusy) return;
    const input = document.getElementById("text");
    const txt = input.value.trim();
    if(!txt) return;
    if(!localStorage.getItem("auth_token")) { triggerAuth("Giriş yap evladım."); return; }
    removeLoading();
    isBusy = true; input.disabled = true; input.style.opacity = "0.5";
    addBubble(txt, 'user');
    input.value = "";
    setCaynanaStatus("typing");
    addLoading("Caynana yazıyor...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);
    try {
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("auth_token")}` },
            body: JSON.stringify({ message: txt, mode: window.currentAppMode || "chat", persona: "normal" }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        removeLoading();
        if (res.status === 401) { triggerAuth("Süren dolmuş."); isBusy = false; input.disabled=false; input.style.opacity="1"; return; }
        if (!res.ok) { addBotMessage("Sunucu hatası evladım."); isBusy = false; input.disabled=false; input.style.opacity="1"; return; }
        const data = await res.json();
        const botText = (data?.assistant_text ?? "...").toString();
        typeWriterBubble(botText, () => {
            setCaynanaStatus("replied");
            if (Array.isArray(data?.data) && data.data.length > 0) setTimeout(() => renderProducts(data.data), 250);
        });
    } catch(err) {
        clearTimeout(timeoutId); removeLoading();
        addBotMessage("Bağlantı koptu evladım.");
    } finally {
        isBusy = false; input.disabled = false; input.style.opacity = "1"; input.focus();
        setTimeout(() => setCaynanaStatus("idle"), 1000);
    }
}

function addBubble(text, role) {
    const container = document.getElementById("chatContainer");
    const wrap = document.createElement("div"); wrap.className = "msg-row " + role;
    const bubble = document.createElement("div"); bubble.className = "msg-bubble " + role;
    bubble.textContent = ""; const parts = String(text).split("\n");
    parts.forEach((part, idx) => { bubble.appendChild(document.createTextNode(part)); if (idx !== parts.length - 1) bubble.appendChild(document.createElement("br")); });
    wrap.appendChild(bubble); container.appendChild(wrap); container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}
function addBotMessage(text) {
    const container = document.getElementById("chatContainer");
    const wrap = document.createElement("div"); wrap.className = "msg-row bot";
    const bubble = document.createElement("div"); bubble.className = "msg-bubble bot"; 
    bubble.innerHTML = text;
    wrap.appendChild(bubble); container.appendChild(wrap);
}
function typeWriterBubble(text, cb) {
    const container = document.getElementById("chatContainer");
    const wrap = document.createElement("div"); wrap.className = "msg-row bot";
    const bubble = document.createElement("div"); bubble.className = "msg-bubble bot";
    wrap.appendChild(bubble); container.appendChild(wrap);
    const s = String(text); let i = 0;
    function step() {
        if (i >= s.length) { if (cb) cb(); return; }
        const ch = s.charAt(i);
        if (ch === "\n") bubble.appendChild(document.createElement("br")); else bubble.appendChild(document.createTextNode(ch));
        i++; container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); setTimeout(step, 10);
    } step();
}
function addLoading(text) {
    const container = document.getElementById("chatContainer"); removeLoading();
    const wrap = document.createElement("div"); wrap.className = "msg-row bot loading-bubble-wrap";
    const bubble = document.createElement("div"); bubble.className = "msg-bubble bot";
    bubble.innerHTML = `${text} <i class="fa-solid fa-pen-nib fa-fade"></i>`;
    wrap.appendChild(bubble); container.appendChild(wrap); container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}
function removeLoading() { document.querySelectorAll('.loading-bubble-wrap').forEach(el => el.remove()); }
function renderProducts(products) {
    const container = document.getElementById("chatContainer");
    products.slice(0, 5).forEach((p, index) => {
        setTimeout(() => {
            const wrap = document.createElement("div"); wrap.className = "msg-row bot";
            const card = document.createElement("div"); card.className = "product-card";
            card.innerHTML = `<div class="pc-source">Trendyol</div><div class="pc-img-wrap"><img src="${p.image || PLACEHOLDER_IMG}" class="pc-img" onerror="this.src='${PLACEHOLDER_IMG}'"></div><div class="pc-content"><div class="pc-title">${p.title || "Ürün"}</div><div class="pc-info-row"><i class="fa-solid fa-circle-check"></i> ${p.reason || 'İncele'}</div><div class="pc-bottom-row"><div class="pc-price">${p.price || "Fiyat Gör"}</div><a href="${p.url}" target="_blank" class="pc-btn-mini">Ürüne Git</a></div></div>`;
            wrap.appendChild(card); container.appendChild(wrap); container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }, index * 260);
    });
}
function clearCurrentChat() {
    const container = document.getElementById('chatContainer');
    const mode = window.currentAppMode || 'chat';
    if(container) {
        container.innerHTML = ''; 
        addBotMessage(MODE_CONFIG[mode].welcome);
        chatHistory[mode] = container.innerHTML;
    }
}
function setCaynanaStatus(state) {
    const badge = document.getElementById("caynanaSpeaking");
    if(!badge) return;
    if(state === "typing") { badge.classList.add("is-typing"); badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Caynana yazıyor...`; }
    else { badge.classList.remove("is-typing"); badge.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Caynana dinliyor...`; }
}
window.clearCurrentChat = clearCurrentChat;
window.triggerAuth = (msg) => {
    addBotMessage(msg);
    document.getElementById("authModal").style.display = "flex";
};

// 🔥 GOOGLE LOGIN (UNIVERSAL ACCESS TOKEN) 🔥
window.handleGoogleLogin = () => {
    if (typeof google === 'undefined') { alert("Google servisi yüklenemedi. Lütfen sayfayı yenile."); return; }
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YAPISTIR")) { alert("JS Dosyasında Client ID eksik!"); return; }

    const btn = document.querySelector('.btn-google');
    const oldText = btn.innerHTML;
    
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Bağlanıyor...`;
    btn.style.opacity = "0.7"; btn.disabled = true;

    // initTokenClient: Access Token alır. Backend Secret gerektirmez.
    const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: (response) => {
            if (response.access_token) {
                console.log("🟢 Google Access Token Alındı...", response);
                verifyGoogleTokenOnBackend(response.access_token, btn, oldText);
            } else {
                console.warn("Google girişi iptal edildi.");
                resetGoogleBtn(btn, oldText);
            }
        },
    });

    // Pencereyi Aç
    client.requestAccessToken();
};

async function verifyGoogleTokenOnBackend(accessToken, btn, oldText) {
    try {
        // Backend ne isterse istesin diye her formatı gönderiyoruz
        const payload = { 
            token: accessToken,
            access_token: accessToken,
            google_token: accessToken,
            id_token: accessToken // Bazı sistemler buna da Access Token kabul eder
        };

        console.log("📤 Backend'e giden payload:", payload);

        const res = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        // HATA YAKALAMA
        if (!res.ok) {
            console.error("🔴 SUNUCU HATASI:", data);
            // Ekrana hatayı basıyoruz ki bilelim neymiş derdi
            const errMsg = data.message || data.error || JSON.stringify(data);
            alert("Sunucu Hatası: " + errMsg);
            throw new Error(errMsg);
        }

        if (data.token) {
            console.log("🚀 Giriş Başarılı:", data);
            localStorage.setItem("auth_token", data.token);
            
            document.getElementById('authModal').style.display = 'none';
            addBotMessage("Ooo hoş geldin evladım! Girişin tamam, artık seni tanıyorum.");
            
            resetGoogleBtn(btn, oldText);
        }

    } catch (err) {
        console.error(err);
        resetGoogleBtn(btn, oldText);
    }
}

function resetGoogleBtn(btn, oldText) {
    if(btn) { btn.innerHTML = oldText; btn.style.opacity = "1"; btn.disabled = false; }
}
