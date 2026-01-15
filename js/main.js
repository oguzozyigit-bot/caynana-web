/* js/main.js - (v9905 - CANLI GÖRSEL + ESPİRİLİ LAFLAR) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth, checkLoginStatus } from './auth.js';
import { initChat } from './chat.js';
import { initUi, setupPersonaModal, setupNotifications } from './ui_modals.js';
import { initProfile } from './profile.js';
import { initDock } from './dock.js';

// --- CAYNANA ESPİRİLİ LAFLARI (Modüle Göre) ---
const MODULE_WIT = {
    'chat':     "Anlat bakalım, yine ne derdin var?",
    'fal':      "Kapat fincanı, soğut gel. Bakalım neler çıkacak...",
    'shopping': "Paran cebine batıyor herhalde? Gel bakalım...",
    'dedikodu': "Kız kim ne demiş? Çatlarım anlat hadi!",
    'health':   "Ayol ben doktor muyum? Ama dur bir nane limon...",
    'diet':     "O böreği yavaşça yere bırak evladım.",
    'astro':    "Yıldızlar tersine dönmüş diyorlar, hayırdır inşallah.",
    'default':  "Hayırdır evladım, bir sessizlik oldu?"
};

// Resim Haritası
const HERO_IMAGES = {
    'chat':     './images/hero-chat.png',
    'fal':      './images/hero-fal.png',
    'dream':    './images/hero-dream.png',
    'shopping': './images/hero-shopping.png',
    'diet':     './images/hero-diet.png',
    'health':   './images/hero-health.png',
    'astro':    './images/hero-astro.png',
    'dedikodu': './images/hero-dedikodu.png',
    'default':  './images/hero-chat.png'
};

// --- MOD DEĞİŞTİRME FONKSİYONU (Resim + Laf) ---
export const setHeroMode = (mode) => {
    // 1. Global modu güncelle (chat.js kullanacak)
    window.currentAppMode = mode;

    // 2. Resmi Değiştir (Efektli)
    const img = document.getElementById('heroImage');
    const targetSrc = HERO_IMAGES[mode] || HERO_IMAGES['default'];
    
    if (img) {
        img.style.opacity = '0'; // Önce söndür
        setTimeout(() => {
            img.src = targetSrc;
            // Yüklendiğinde eski canlılığına (0.9) getir
            img.onload = () => { img.style.opacity = '0.9'; };
            // Cache durumunda garanti olsun
            setTimeout(() => { img.style.opacity = '0.9'; }, 100);
        }, 200);
    }

    // 3. Espirili Lafı Değiştir (#suggestionText)
    const suggestionText = document.getElementById('suggestionText');
    if (suggestionText) {
        // Hafif bir yanıp sönme efekti ile metni değiştir
        suggestionText.style.opacity = '0';
        setTimeout(() => {
            suggestionText.innerText = MODULE_WIT[mode] || MODULE_WIT['default'];
            suggestionText.style.opacity = '1';
        }, 200);
    }

    // 4. Fal Modu Kontrolü (Kamera butonu için)
    if (mode === 'fal') {
        document.body.classList.add('fal-mode');
    } else {
        document.body.classList.remove('fal-mode');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("👵 Caynana Web Başlatılıyor... (v9905 - Canlı Mod)");

    // --- BAŞLANGIÇ AYARLARI ---
    const heroImage = document.getElementById('heroImage');
    
    // Başlangıç resmi ve opaklığı
    if (heroImage) {
        heroImage.src = HERO_IMAGES.chat;
        heroImage.style.display = 'block';
        heroImage.style.opacity = '0.9'; // Canlı başlangıç
    }

    // Başlangıç modu ve lafı
    setHeroMode('chat');

    // --- MODÜLLERİ BAŞLAT ---
    try {
        if (typeof initUi === 'function') initUi();
        if (typeof setupPersonaModal === 'function') setupPersonaModal();
        if (typeof setupNotifications === 'function') setupNotifications();
        
        if (typeof initDock === 'function') initDock();
        
        // Auth ve Profil (Sıralı)
        if (typeof initAuth === 'function') await initAuth();
        await checkLoginStatus(); 
        if (typeof initProfile === 'function') initProfile();
        
        if (typeof initChat === 'function') initChat();
        
        console.log("✅ Sistem Aktif! Modüller Yerleşti.");
    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});
