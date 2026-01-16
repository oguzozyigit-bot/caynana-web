/* js/main.js (v28.0 - MEMBER MANAGEMENT SYSTEM) */

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

// 🔥 RENDER GOOGLE CLIENT ID 🔥
const GOOGLE_CLIENT_ID = "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com"; 

let isBusy = false;
const chatHistory = {};

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
    console.log("🚀 Caynana v28.0 System Ready");
    initDock();
    setAppMode('chat');
    checkLoginStatus(); // 🔥 GİRİŞ KONTROLÜ BAŞLAT 🔥
    
    // Google Init
    if(typeof google !== 'undefined' && GOOGLE_CLIENT_ID) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse,
                auto_select: false
            });
        } catch(e) { console.error("Google Init Error:", e); }
    }

    document.getElementById("sendBtn").addEventListener("click", sendMessage);
    document.getElementById("text").addEventListener("keydown", (e) => { if(e.key==="Enter") sendMessage(); });
});

// 🔥 OTURUM & MENÜ YÖNETİMİ 🔥
function checkLoginStatus() {
    const rawUser = localStorage.getItem("user_info");
    const menuList = document.querySelector('.menu-list');
    const slogan = document.querySelector('.brand-slogan');
    
    if (rawUser) {
        // --- KULLANICI GİRİŞ YAPMIŞ ---
        const user = JSON.parse(rawUser);
        const userName = user.hitap || user.name || "Evladım";

        // 1. Ana Sayfa Sloganını Değiştir
        if(slogan) {
            slogan.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#4CAF50;"></i> Hoş geldin, <b>${userName}</b>`;
            slogan.style.color = "#fff";
        }

        // 2. Menüyü Güncelle (Profil + Çıkış + Sil)
        if(menuList) {
            menuList.innerHTML = `
                <a href="pages/profil.html" class="menu-item highlight" style="background: rgba(230, 194, 91, 0.15); border-color: var(--primary);">
                    <i class="fa-solid fa-user-pen"></i> Profil (Güncelle)
                </a>

                <a href="pages/hakkimizda.html" class="menu-item link-item"><i class="fa-solid fa-circle-info"></i> Hakkımızda</a>
                <a href="pages/faq.html" class="menu-item link-item"><i class="fa-solid fa-circle-question"></i> S.S.S</a>
                <a href="pages/iletisim.html" class="menu-item link-item"><i class="fa-solid fa-envelope"></i> İletişim</a>
                <a href="pages/gizlilik.html" class="menu-item link-item"><i class="fa-solid fa-shield-halved"></i> Gizlilik Politikası</a>

                <div style="margin-top:20px; border-top:1px solid #333; padding-top:10px;"></div>

                <div class="menu-item link-item" onclick="handleLogout()">
                    <i class="fa-solid fa-right-from-bracket"></i> Güvenli Çıkış
                </div>

                <div class="menu-item link-item" onclick="handleDeleteAccount()" style="color: #ff4444;">
                    <i class="fa-solid fa-trash-can"></i> Hesabımı Sil
                </div>
            `;
        }

    } else {
        // --- MİSAFİR MODU ---
        if(slogan) slogan.innerHTML = "Yapay Zekânın Geleneksel Aklı";
        
        if(menuList) {
            menuList.innerHTML = `
                <div class="menu-item highlight" onclick="document.getElementById('authModal').style.display='flex'">
                    <i class="fa-solid fa-user-plus"></i> Giriş Yap / Üye Ol
                </div>
                <a href="pages/hakkimizda.html" class="menu-item link-item"><i class="fa-solid fa-circle-info"></i> Hakkımızda</a>
                <a href="pages/faq.html" class="menu-item link-item"><i class="fa-solid fa-circle-question"></i> S.S.S</a>
                <a href="pages/iletisim.html" class="menu-item link-item"><i class="fa-solid fa-envelope"></i> İletişim</a>
                <a href="pages/gizlilik.html" class="menu-item link-item"><i class="fa-solid fa-shield-halved"></i> Gizlilik Politikası</a>
            `;
        }
    }
}

// ÇIKIŞ YAPMA
window.handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    window.location.reload();
};

// HESAP SİLME (ÖNEMLİ)
window.handleDeleteAccount = () => {
    // Emin misin sorusu
    if(confirm("Başkanım, emin misin? Tüm profil bilgilerin ve geçmişin silinecek. Bu işlemin geri dönüşü yok!")) {
        // İkinci teyit (Yanlışlıkla basmasınlar)
        if(confirm("Son kararın mı? Seni özleriz bak...")) {
            // Silme işlemi
            localStorage.clear();
            alert("Hesabın başarıyla silindi. Kendine iyi bak evladım.");
            window.location.reload();
        }
    }
};

/* ... DOCK & UI (STANDART KODLAR) ... */
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

// 🔥 GOOGLE GİRİŞ (JWT) 🔥
window.handleGoogleLogin = () => {
    const btn = document.querySelector('.btn-google');
    if(btn) { btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Bağlanıyor...`; btn.disabled = true; }

    google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
            if(btn) { btn.innerHTML = 'Tekrar Dene'; btn.disabled=false; }
        }
    });
};

async function handleGoogleResponse(response) {
    console.log("🟢 Google JWT:", response);
    const credential = response.credential;
    try {
        const payload = { token: credential, credential: credential, id_token: credential, google_token: credential };
        const res = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Giriş reddedildi.");

        if (data.token) {
            localStorage.setItem("auth_token", data.token);
            // KULLANICI BİLGİSİNİ KAYDET
            const userData = data.user || { name: "Misafir", picture: PLACEHOLDER_IMG };
            localStorage.setItem("user_info", JSON.stringify(userData));

            document.getElementById('authModal').style.display = 'none';
            // Sayfayı yenile ki menüler güncellensin
            window.location.href = "pages/profil.html"; 
        }
    } catch (err) {
        alert("Hata: " + err.message);
        const btn = document.querySelector('.btn-google');
        if(btn) { btn.innerHTML = 'Google ile Bağlan'; btn.disabled = false; }
    }
}
