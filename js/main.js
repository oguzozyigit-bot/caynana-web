/* js/main.js (v4.0 - ULTIMATE LOGIC) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth, checkLoginStatus } from './auth.js';
import { initChat } from './chat.js';
import { initUi, setupPersonaModal, setupNotifications } from './ui_modals.js';
import { initProfile } from './profile.js';

// --- MODÜL SIRALAMASI (İstediğin Sıra) ---
const MODULE_ORDER = [
    'chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'
];

// --- MODÜL AYARLARI ---
const MODE_CONFIG = {
    'chat':     { title: "Caynana ile<br>İki Lafın Belini Kır.", desc: "Hadi gel evladım, anlat bakalım.", color: "#FFC107", wit: "Benim zamanımda...", icon: "fa-comments" },
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını, en uygununu bulurum.", color: "#00E676", wit: "Ucuz etin yahnisi...", icon: "fa-bag-shopping" },
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

// --- SOHBET HAFIZASI (Her mod için ayrı) ---
// chatHistory['chat'] = HTML String
const chatHistory = {}; 

// --- DOCK OLUŞTURMA ---
function initDock() {
    const dock = document.getElementById('dock');
    dock.innerHTML = '';
    
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
    
    // 1. Önceki modun sohbetini kaydet
    const container = document.getElementById('chatContainer');
    chatHistory[prevMode] = container.innerHTML;

    // 2. Yeni moda geç
    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode] || MODE_CONFIG['chat'];
    
    // 3. Yazıları ve Renkleri Güncelle
    document.getElementById('heroTitle').innerHTML = cfg.title;
    document.getElementById('heroDesc').innerHTML = cfg.desc;
    document.getElementById('suggestionText').innerText = cfg.wit;
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    // 4. Alt Çizgileri Güncelle (Akıllı Renkler)
    updateFooterBars(mode);

    // 5. Resmi Değiştir
    const img = document.getElementById('heroImage');
    const targetSrc = HERO_IMAGES[mode] || HERO_IMAGES['chat'];
    if(img) {
        img.style.opacity = '0.4';
        setTimeout(() => { img.src = targetSrc; img.style.opacity = '1'; }, 250);
    }
    
    // 6. Dock Active
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    const activeDock = document.querySelector(`.dock-item[data-mode="${mode}"]`);
    if(activeDock) {
        activeDock.classList.add('active');
        // Seçili olanı ekranda ortala (Scroll)
        activeDock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    // 7. Sohbeti Geri Yükle veya Temizle
    container.innerHTML = chatHistory[mode] || '';
    // En alta kaydır
    container.scrollTop = container.scrollHeight;

    // 8. FAL MODU ÖZEL UI
    const stdInput = document.getElementById('stdInputArea');
    const falInput = document.getElementById('falInputArea');
    
    if (mode === 'fal') {
        stdInput.style.display = 'none';
        falInput.style.display = 'flex';
    } else {
        stdInput.style.display = 'flex';
        falInput.style.display = 'none';
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
        // Döngüsel indeks (Modüller biterse başa döner)
        const targetIdx = (idx + i) % MODULE_ORDER.length; 
        const targetMode = MODULE_ORDER[targetIdx];
        const color = MODE_CONFIG[targetMode].color;
        
        if(lines[i]) lines[i].style.background = color;
    }
}

// --- HAREKETLER (SWIPE & DOUBLE TAP) ---
function setupGestures() {
    const zone = document.getElementById('app');
    let touchStartX = 0;
    let lastTap = 0;

    zone.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});

    zone.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        handleSwipe(touchStartX, touchEndX);
        
        // Double Tap
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        if (tapLength < 300 && tapLength > 0) {
            navigateModule(1); // Sonraki modül
            e.preventDefault();
        }
        lastTap = currentTime;
    });
    
    // Masaüstü için çift tıklama
    zone.addEventListener('dblclick', () => navigateModule(1));
}

function handleSwipe(start, end) {
    if (start - end > 60) navigateModule(1); // Sola kaydır -> İleri
    if (end - start > 60) navigateModule(-1); // Sağa kaydır -> Geri
}

function navigateModule(direction) {
    const current = window.currentAppMode || 'chat';
    let idx = MODULE_ORDER.indexOf(current);
    idx += direction;
    
    if (idx >= MODULE_ORDER.length) idx = 0;
    if (idx < 0) idx = MODULE_ORDER.length - 1;
    
    setHeroMode(MODULE_ORDER[idx]);
}

// --- BAŞLATMA ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Caynana Ultimate V4 Başlatılıyor...");
    
    initDock(); // Dock'u oluştur
    setupGestures(); // Hareketleri dinle
    
    // Butonlar
    document.getElementById('camBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('falCamBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    
    // Ses
    const vBtn = document.getElementById('voiceToggleBtn');
    vBtn.addEventListener('click', () => {
        window.isVoiceOn = !window.isVoiceOn;
        document.getElementById('voiceIcon').className = window.isVoiceOn ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
        vBtn.style.background = window.isVoiceOn ? "var(--primary)" : "";
        vBtn.style.color = window.isVoiceOn ? "#000" : "#fff";
    });

    setHeroMode('chat'); 

    try {
        if (typeof initUi === 'function') initUi();
        if (typeof initAuth === 'function') await initAuth();
        await checkLoginStatus(); 
        if (typeof initProfile === 'function') initProfile();
        if (typeof initChat === 'function') initChat();
    } catch (e) { console.error(e); }
});
