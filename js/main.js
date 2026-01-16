/* js/main.js (v21.0 - COLORS RESTORED) */
import { initChat, triggerAuth } from './chat.js';

const MODE_CONFIG = {
    'chat':     { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", icon: "fa-comments" },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", icon: "fa-bag-shopping" },
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", icon: "fa-user-secret" },
    'fal':      { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", icon: "fa-mug-hot" },
    'astro':    { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu hayırdır.", color: "#7986CB", icon: "fa-star" },
    'ruya':     { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", icon: "fa-cloud-moon" },
    'health':   { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", icon: "fa-heart-pulse" },
    'diet':     { title: "Boğazını Tut<br>Rahat Et.", desc: "O böreği bırak.", color: "#AED581", icon: "fa-carrot" },
    'trans':    { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", icon: "fa-language" }
};
const MODULE_ORDER = ['chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'];

function initDock() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    dock.innerHTML = ''; 
    
    MODULE_ORDER.forEach(key => {
        const conf = MODE_CONFIG[key];
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.dataset.mode = key; // Modu etikete işle
        item.onclick = () => setAppMode(key);
        
        item.innerHTML = `
            <div class="dock-icon"><i class="fa-solid ${conf.icon}"></i></div>
            <div class="dock-label">${key.toUpperCase()}</div>
        `;
        dock.appendChild(item);
    });
}

function setAppMode(mode) {
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode] || MODE_CONFIG['chat'];
    
    // UI Güncelle
    const titleEl = document.getElementById('heroTitle');
    const descEl = document.getElementById('heroDesc');
    
    if(titleEl) titleEl.innerHTML = cfg.title;
    if(descEl) descEl.innerHTML = cfg.desc;
    
    // Ana Rengi Değiştir
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    // İkon Aktifliği & Renk Ayarı
    document.querySelectorAll('.dock-item').forEach(el => {
        el.classList.remove('active');
        if(el.dataset.mode === mode) {
            el.classList.add('active');
        }
    });

    // Alt Çizgileri Renklendir
    updateFooterBars(mode);
}

// 🔥 BU FONKSİYON EKSİKTİ, GERİ GELDİ 🔥
function updateFooterBars(currentMode) {
    const idx = MODULE_ORDER.indexOf(currentMode);
    if(idx === -1) return;

    const lines = [
        document.getElementById('line1'),
        document.getElementById('line2'),
        document.getElementById('line3'),
        document.getElementById('line4')
    ];

    for(let i=0; i<4; i++) {
        const targetIdx = (idx + i) % MODULE_ORDER.length; 
        const targetMode = MODULE_ORDER[targetIdx];
        const color = MODE_CONFIG[targetMode].color;
        
        if(lines[i]) lines[i].style.background = color;
    }
}

window.triggerAuth = triggerAuth;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Main System Loaded v21");
    initChat();
    initDock();
    setAppMode('chat');
});
