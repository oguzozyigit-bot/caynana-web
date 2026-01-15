/* js/main.js
   CAYNANA.AI - Ana Giriş Dosyası
   Bu dosya modülleri başlatır ve Arayüzü (UI) doldurur.
*/

// 1. Backend Adresi
export const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";

// 2. Modülleri İçe Aktar
import { initAuth } from './auth.js';
import { initChat } from './chat.js';
import { initFal } from './fal.js';
import { initUi } from './ui_modals.js'; 

// 3. Sayfa Yüklendiğinde Sistemi Başlat
document.addEventListener('DOMContentLoaded', async () => {
    console.log("👵 Caynana Web Başlatılıyor... (v9601)");

    // --- A. EKRANI DOLDUR (SİYAH EKRAN ÇÖZÜMÜ) ---
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDesc');
    const heroImage = document.getElementById('heroImage');
    const suggestionText = document.getElementById('suggestionText');

    // Başlıkları yaz
    if (heroTitle) heroTitle.innerText = "CAYNANA";
    if (heroDesc) heroDesc.innerHTML = "Yapay Zekânın<br>Geleneksel Aklı";
    
    // Alt öneri metni
    if (suggestionText) suggestionText.innerText = "Fal baktırmak için kameraya, sohbet için mikrofona bas evladım.";

    // Arkaplan resmi yoksa gizle (Kırık ikon görünmesin)
    if (heroImage && !heroImage.src.includes('http')) {
        heroImage.style.display = 'none';
        // Veya varsayılan bir renk verelim ki çok boş durmasın
        document.body.style.background = "linear-gradient(135deg, #1a1f2e 0%, #0b0f18 100%)";
    }

    // --- B. MODÜLLERİ BAŞLAT ---
    try {
        if (typeof initUi === 'function') initUi();
        if (typeof initAuth === 'function') await initAuth();
        if (typeof initChat === 'function') initChat();
        if (typeof initFal === 'function') initFal();

        console.log("✅ Arayüz Hazır.");

    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});
