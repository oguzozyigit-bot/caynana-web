/* js/main.js (v13.1 - PASTEL & MATTE COLORS) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth, checkLoginStatus } from './auth.js';
import { initChat } from './chat.js';
import { initUi } from './ui_modals.js';
import { initProfile } from './profile.js';

const MODULE_ORDER = [
    'chat', 'shopping', 'dedikodu', 'fal', 'astro', 'ruya', 'health', 'diet', 'trans'
];

// ✨ YENİ PASTEL RENK PALETİ ✨
const MODE_CONFIG = {
    'chat':     { title: "Caynana ile<br>Dertleş.", desc: "Hadi gel evladım, anlat bakalım.", color: "#E6C25B", wit: "Benim zamanımda...", icon: "fa-comments" }, // Mat Altın
    'shopping': { title: "Paranı Çarçur Etme<br>Bana Sor.", desc: "En sağlamını bulurum.", color: "#81C784", wit: "Ucuz etin yahnisi...", icon: "fa-bag-shopping" }, // Pastel Yeşil (Adaçayı)
    'dedikodu': { title: "Dedikodu Odası<br>Bize Özel.", desc: "Duvarların kulağı var.", color: "#90A4AE", wit: "Kız kim ne demiş?", icon: "fa-user-secret" }, // Mat Gri/Mavi
    'fal':      { title: "Kapat Fincanı<br>Gelsin Kısmetin.", desc: "Fotoğrafı çek, niyetini tut.", color: "#CE93D8", wit: "Soğut gel fincanı...", icon: "fa-mug-hot" }, // Lavanta
    'astro':    { title: "Yıldızlar Ne Diyor<br>Bakalım.", desc: "Merkür retrosu hayırdır.", color: "#7986CB", wit: "Burcun ne senin?", icon: "fa-star" }, // Pastel İndigo
    'ruya':     { title: "Rüyalar Alemi<br>Hayırdır.", desc: "Kabus mu gördün?", color: "#81D4FA", wit: "Suya anlat...", icon: "fa-cloud-moon" }, // Bebek Mavisi
    'health':   { title: "Önce Sağlık<br>Gerisi Yalan.", desc: "Neren ağrıyor?", color: "#E57373", wit: "Ayağını sıcak tut...", icon: "fa-heart-pulse" }, // Somon
    'diet':     { title: "Boğazını Tut<br>Rahat Et.", desc: "O böreği bırak.", color: "#AED581", wit: "Su içsen yarıyor mu?", icon: "fa-carrot" }, // Pastel Lime
    'trans':    { title: "Gavurca<br>Ne Demişler?", desc: "Anlamadığını sor.", color: "#FFB74D", wit: "Hello hello...", icon: "fa-language" } // Kayısı
};

const HERO_IMAGES = {
    'chat': './images/hero-chat.png', 'shopping': './images/hero-shopping.png',
    'dedikodu': './images/hero-dedikodu.png', 'fal': './images/hero-fal.png',
    'astro': './images/hero-astro.png', 'ruya': './images/hero-dream.png',
    'health': './images/hero-health.png', 'diet': './images/hero-diet.png',
    'trans': './images/hero-chat.png'
};

const chatHistory = {}; 

function initDock() {
    const dock = document.getElementById('dock');
    if (!dock) {
        console.error("HATA: #dock bulunamadı!");
        return;
    }
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

export const setHeroMode = (mode) => {
    const prevMode = window.currentAppMode || 'chat';
    const container = document.getElementById('chatContainer');
    if (container) chatHistory[prevMode] = container.innerHTML;

    window.currentAppMode = mode;
    const cfg = MODE_CONFIG[mode] || MODE_CONFIG['chat'];
    
    const titleEl = document.getElementById('heroTitle');
    const descEl = document.getElementById('heroDesc');
    const witEl = document.getElementById('suggestionText');
    
    if(titleEl) titleEl.innerHTML = cfg.title;
    if(descEl) descEl.innerHTML = cfg.desc;
    if(witEl) witEl.innerText = cfg.wit;
    
    document.documentElement.style.setProperty('--primary', cfg.color);
    
    const img = document.getElementById('heroImage');
    const targetSrc = HERO_IMAGES[mode] || HERO_IMAGES['chat'];
    if(img) {
        img.style.opacity = '0.1';
        setTimeout(() => { 
            img.src = targetSrc; 
            img.onload = () => { img.style.opacity = '1'; };
            setTimeout(() => { img.style.opacity = '1'; }, 100);
        }, 200);
    }
    
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    const activeDock = document.querySelector(`.dock-item[data-mode="${mode}"]`);
    if(activeDock) {
        activeDock.classList.add('active');
        activeDock.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    if (container) {
        container.innerHTML = chatHistory[mode] || '';
        container.scrollTop = container.scrollHeight;
    }

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Caynana v13.1 (Pastel) Başlatılıyor...");
    initDock(); 
    setHeroMode('chat'); 

    const camBtn = document.getElementById('camBtn');
    if(camBtn) camBtn.addEventListener('click', () => document.getElementById('fileInput').click());

    try {
        if (typeof initUi === 'function') initUi();
        if (typeof initAuth === 'function') await initAuth();
        await checkLoginStatus(); 
        if (typeof initProfile === 'function') initProfile();
        if (typeof initChat === 'function') initChat();
    } catch (e) { console.error(e); }
});
