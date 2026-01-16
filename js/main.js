/* js/main.js (v10.1 - DOCK FIX & MODULES RESTORE) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth, checkLoginStatus } from './auth.js';
import { initChat } from './chat.js';
import { initUi, setupPersonaModal, setupNotifications } from './ui_modals.js';
import { initProfile } from './profile.js';

// --- MODÜL SIRALAMASI VE AYARLARI ---
const MODULE_ORDER = [
    'chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'
];

const MODE_CONFIG = {
    'chat':     { title: "Caynana ile<br>İki Lafın Belini Kır.", desc: "Hadi gel evladım, anlat bakalım.", color: "#FFC107", wit: "Benim zamanımda...", icon: "fa-comments" },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "Ne lazımsa söyle, en uygununu bulayım.", color: "#00E676", wit: "Ucuz etin yahnisi...", icon: "fa-bag-shopping" },
    'dedikodu': { title: "Dedikodu Odası<br>Sadece Bize Özel.", desc: "Duvarların kulağı var, sessiz ol.", color: "#E0E0E0", wit: "Kız kim ne demiş?", icon: "fa-user-secret" },
    'fal':      { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#D500F9", wit: "Soğut gel fincanı...", icon: "fa-mug-hot" },
    'astro':    { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu falan, hayırdır inşallah.", color: "#3D5AFE", wit: "Burcun ne senin?", icon: "fa-star" },
    'ruya':     { title: "Rüyalar Alemi<br>Hayırdır İnşallah.", desc: "Kabus mu gördün, müjde mi?", color: "#00B0FF", wit: "Suya anlat...", icon: "fa-cloud-moon" },
    'health':   { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor söyle bakayım?", color: "#FF1744", wit: "Ayağını sıcak tut...", icon: "fa-heart-pulse" },
    'diet':     { title: "Boğazını Tut<br>Rahat Et.", desc: "O böreği yavaşça yere bırak.", color: "#76FF03", wit: "Su içsen yarıyor mu?", icon: "fa-carrot" },
    'trans':    { title: "Gavurca Dedikleri<br>Ne Demişler?", desc: "Anlamadığın dili bana sor.", color: "#FF6D00", wit: "Hello hello...", icon: "fa-language" }
};

const HERO_IMAGES = {
    'chat': './images/hero-chat.png', 'shopping': './images/hero-shopping.png',
    'dedikodu': './images/hero-dedikodu.png', 'fal': './images/hero-fal.png',
    'astro': './images/hero-astro.png', 'ruya': './images/hero-dream.png',
    'health': './images/hero-health.png', 'diet': './images/hero-diet.png',
    'trans': './images/hero-chat.png'
};

// SOHBET HAFIZASI (Her modülün konuşmasını hatırlar)
const chatHistory = {}; 

// --- DOCK (İKONLARI ÇİZEN FONKSİYON) ---
function initDock() {
    const dock = document.getElementById('dock');
    if (!dock) {
        console.error("HATA: #dock elementi bulunamadı!");
        return;
    }
    dock.innerHTML = ''; // Temizle
    
    MODULE_ORDER.forEach(key => {
        const conf = MODE_CONFIG[key];
        const item = document.createElement('div');
        item.className = 'dock-item';
        item.setAttribute('data-mode', key);
        item.onclick = () => setHeroMode(key);
        
        item.innerHTML = `
            <div class="dock-icon"><i class="fa-solid ${conf.icon}"></i></div>
            <div class="dock-label">${key.toUpperCase()}</div>
        `;
        dock.appendChild(item);
    });
}

// --- MOD DEĞİŞTİRME ---
export const setHeroMode = (mode) => {
    const prevMode = window.currentAppMode || 'chat';
    
    // 1. Önceki sohbeti kaydet
    const container = document.getElementById('chatContainer');
    if (container) chatHistory[prevMode] = container.innerHTML;

    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode] || MODE_CONFIG['chat'];
    
    // 2. Yazıları Güncelle
    const titleEl = document.getElementById('heroTitle');
    const descEl = document.getElementById('heroDesc');
    const witEl = document.getElementById('suggestionText');
    
    if(titleEl) titleEl.innerHTML = cfg.title;
    if(descEl) descEl.innerHTML = cfg.desc;
    if(witEl) witEl.innerText = cfg.wit;
    
    // 3. Rengi Değiştir
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    // 4. Alt Çizgileri Güncelle
    updateFooterBars(mode);

    // 5. Resmi Değiştir
    const img = document.getElementById('heroImage');
    const targetSrc = HERO_IMAGES[mode] || HERO_IMAGES['chat'];
    if(img) {
        img.style.opacity = '0.1'; // Geçiş efekti
        setTimeout(() => { 
            img.src = targetSrc; 
            img.onload = () => { img.style.opacity = '1'; };
            // Cache durumunda hemen göster
            setTimeout(() => { img.style.opacity = '1'; }, 100);
        }, 200);
    }
    
    // 6. Aktif İkonu Parlat
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    const activeDock = document.querySelector(`.dock-item[data-mode="${mode}"]`);
    if(activeDock) {
        activeDock.classList.add('active');
        activeDock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // 7. Sohbeti Geri Yükle
    if (container) {
        container.innerHTML = chatHistory[mode] || '';
        container.scrollTop = container.scrollHeight;
    }

    // 8. Fal Modu Kamera Kontrolü
    const stdInput = document.getElementById('stdInputArea');
    const falInput = document.getElementById('falInputArea');
    
    if (mode === 'fal') {
        if(stdInput) stdInput.style.display = 'none';
        if(falInput) falInput.style.display = 'flex';
    } else {
        if(stdInput) stdInput.style.display = 'flex';
        if(falInput) falInput.style.display = 'none';
    }
};

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

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Caynana v10.1 Başlatılıyor...");
    
    initDock(); // İKONLARI ÇİZ
    
    // Event Listeners
    const camBtn = document.getElementById('camBtn');
    if(camBtn) camBtn.addEventListener('click', () => document.getElementById('fileInput').click());
    
    const falCamBtn = document.getElementById('falCamBtn');
    if(falCamBtn) falCamBtn.addEventListener('click', () => document.getElementById('fileInput').click());
    
    const vBtn = document.getElementById('voiceToggleBtn');
    if(vBtn) {
        vBtn.addEventListener('click', () => {
            window.isVoiceOn = !window.isVoiceOn;
            const vIcon = document.getElementById('voiceIcon');
            vIcon.className = window.isVoiceOn ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
            vBtn.style.background = window.isVoiceOn ? "var(--primary)" : "";
            vBtn.style.color = window.isVoiceOn ? "#000" : "";
        });
    }

    // İlk Başlatma
    setHeroMode('chat'); 

    try {
        if (typeof initUi === 'function') initUi();
        if (typeof initAuth === 'function') await initAuth();
        await checkLoginStatus(); 
        if (typeof initProfile === 'function') initProfile();
        if (typeof initChat === 'function') initChat();
    } catch (e) { console.error(e); }
});
