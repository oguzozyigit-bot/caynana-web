/* js/auth.js (FINAL - GOOGLE ONLY v9700)
   Anayasa Madde 11: Sadece Google Girişi
   Anayasa Madde 18: Güvenli Çıkış
*/
import { BASE_DOMAIN } from './main.js';
import { loadProfile, openProfileModal } from './profile.js'; // Profil yöneticisi lazım

// Mevcut kullanıcı durumu
export let currentUser = null;

// --- BAŞLATMA ---
export async function initAuth() {
    console.log("🔒 Auth Modülü (Google Only) Başlatılıyor...");
    
    // 1. Önceki oturumu kontrol et
    checkLoginStatus();

    // 2. Google Kütüphanesini Bekle ve Başlat
    const interval = setInterval(() => {
        if (window.google && window.google.accounts) {
            clearInterval(interval);
            initGoogleButton();
        }
    }, 100);
}

// --- GOOGLE BUTONU ---
function initGoogleButton() {
    const googleBtnContainer = document.getElementById('googleBtn');
    if (!googleBtnContainer) return;

    // Google İstemcisini Hazırla
    // NOT: client_id'yi kendi Google Cloud Console'undan alıp HTML'e veya buraya eklemelisin.
    // HTML'de <meta name="google-signin-client_id" ...> varsa oradan otomatik çeker.
    // Yoksa initialize içine clientId: '...' ekle.
    
    try {
        window.google.accounts.id.initialize({
            client_id: "1030744341756-bo7iqng4lftnmcm4l154cfu5sgmahr98.apps.googleusercontent.com", // 
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: false
        });

        // Butonu Çiz (Siyah Tema - Anayasa Uygun)
        window.google.accounts.id.renderButton(
            googleBtnContainer,
            { theme: "filled_black", size: "large", width: "250", text: "continue_with" }
        );
        console.log("✅ Google Butonu Hazırlandı.");
    } catch (e) {
        console.error("Google Auth Başlatma Hatası:", e);
    }
}

// --- GİRİŞ İŞLEMİ (BACKEND İLE KONUŞMA) ---
async function handleGoogleResponse(response) {
    console.log("🌍 Google'dan Cevap Geldi, Backend'e Soruluyor...");
    
    const idToken = response.credential;
    const statusDiv = document.getElementById('authStatus');
    if (statusDiv) statusDiv.innerText = "Caynana'ya giriş yapılıyor, sabret evladım...";

    try {
        const res = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: idToken })
        });
        
        const data = await res.json();
        
        if (res.ok && data.token) {
            // BAŞARILI
            localStorage.setItem("auth_token", data.token);
            localStorage.setItem("user_id", data.user_id); // CN-XXXX
            
            // Modal kapat
            const authModal = document.getElementById('authModal');
            if (authModal) authModal.style.display = 'none';

            // Durumu güncelle
            await checkLoginStatus();

            // ANAYASA MADDE 12: İlk girişte profil zorunlu mu?
            // Backend'den profil bilgisini çekip kontrol edeceğiz.
            await loadProfile(true); // true = eksikse zorla aç

        } else {
            if (statusDiv) statusDiv.innerText = "Hata: " + (data.detail || "Giriş başarısız.");
        }
    } catch (err) {
        console.error("Login Back-end Hatası:", err);
        if (statusDiv) statusDiv.innerText = "Sunucuya ulaşılamadı evladım.";
    }
}

// --- DURUM KONTROLÜ ---
export async function checkLoginStatus() {
    const token = localStorage.getItem("auth_token");
    const drawerProfile = document.getElementById('drawerProfileCard');
    const guestBlock = document.getElementById('guestLoginBlock');
    const logoutBtn = document.getElementById('safeLogoutBtn');

    if (token) {
        // GİRİŞ YAPILMIŞ
        currentUser = { token: token, id: localStorage.getItem("user_id") };
        document.body.classList.add("logged-in");
        
        if (drawerProfile) drawerProfile.style.display = 'flex';
        if (guestBlock) guestBlock.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.style.display = 'flex';
            logoutBtn.onclick = logout; // Tıklayınca çıkış
        }

        // Kullanıcı adını ve ID'yi arayüze yaz
        // (Bu veriler normalde profile.js'den gelir ama hızlıca ID'yi yazalım)
        const dpCN = document.getElementById('dpCN');
        if (dpCN) dpCN.innerText = currentUser.id || "CN-???";

    } else {
        // MİSAFİR
        currentUser = null;
        document.body.classList.remove("logged-in");
        
        if (drawerProfile) drawerProfile.style.display = 'none';
        if (guestBlock) guestBlock.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// --- GÜVENLİ ÇIKIŞ (ANAYASA MADDE 18) ---
export function logout() {
    console.log("🚪 Güvenli Çıkış Yapılıyor...");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");
    
    // Sohbet geçmişini temizle (LocalStorage'da tutuyorsan)
    localStorage.removeItem("chat_history"); 
    
    location.reload();
}
