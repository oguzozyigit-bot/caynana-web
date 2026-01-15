/* js/main.js - (Full UI + Yerel Görseller v9605) */
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

import { initAuth } from './auth.js';
import { initChat } from './chat.js';
import { initFal } from './fal.js';
import { initUi } from './ui_modals.js'; 

// Resim Haritası (GitHub'daki dosya isimlerine göre)
const HERO_IMAGES = {
    'chat': './images/hero-chat.png',
    'fal': './images/hero-fal.png',
    'dream': './images/hero-dream.png',
    'shopping': './images/hero-shopping.png',
    'diet': './images/hero-diet.png',
    'health': './images/hero-health.png',
    'astro': './images/hero-astro.png',
    'dedikodu': './images/hero-dedikodu.png',
    'default': './images/hero-chat.png'
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("👵 Caynana Web Başlatılıyor... (v9605)");

    // --- 1. GÖRSELLERİ VE METİNLERİ YÜKLE ---
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDesc');
    const heroImage = document.getElementById('heroImage');
    const suggestionText = document.getElementById('suggestionText');

    if (heroTitle) heroTitle.innerText = "CAYNANA";
    if (heroDesc) heroDesc.innerHTML = "Yapay Zekânın<br>Geleneksel Aklı";
    if (suggestionText) suggestionText.innerText = "Fal baktırmak için kameraya, sohbet için mikrofona bas evladım.";

    // Arkaplan Resmi Ayarı (Yerel Dosyadan)
    if (heroImage) {
        // Hata olursa varsayılanı yükle
        heroImage.onerror = function() {
            console.warn("Resim yüklenemedi, varsayılana dönülüyor:", this.src);
            if (this.src !== HERO_IMAGES.default) this.src = HERO_IMAGES.default;
        };

        // Başlangıç resmi (Chat)
        heroImage.src = HERO_IMAGES.chat;
        heroImage.style.display = 'block';
        heroImage.style.opacity = '0.4'; // Yazı okunsun diye hafif flu
    }

    // --- 2. MODÜLLERİ BAŞLAT ---
    try {
        if (typeof initUi === 'function') initUi();
        if (typeof initAuth === 'function') await initAuth();
        if (typeof initChat === 'function') initChat();
        if (typeof initFal === 'function') initFal();
        
        console.log("✅ Sistem ve Görseller Aktif!");
    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});

// Dışarıdan resim değiştirmek için yardımcı fonksiyon
export function setHeroMode(mode) {
    const img = document.getElementById('heroImage');
    if (img && HERO_IMAGES[mode]) {
        img.src = HERO_IMAGES[mode];
    }
}
