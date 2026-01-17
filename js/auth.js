import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

let tokenClient;

/**
 * 1. Google İstemcisini Başlat
 * Sayfa yüklendiğinde bu fonksiyon çalışır ve Google kütüphanesini hazırlar.
 */
export function initAuth() {
    // Google Kütüphanesi yüklü mü kontrol et
    if (window.google) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    fetchGoogleProfile(tokenResponse.access_token);
                }
            },
        });
        console.log("🔒 Auth System: Ready");
    } else {
        console.error("🔴 Auth System: Google Library not found");
    }
}

/**
 * 2. Giriş İşlemini Tetikle (HTML Butonundan Çağrılır)
 * @param {string} provider - 'google' veya 'apple'
 */
export function handleLogin(provider) {
    // Sözleşme Checkbox Kontrolü
    const check = document.getElementById('agreementCheck');
    if (check && !check.checked) {
        alert("Lütfen önce kullanıcı sözleşmesini onayla evladım.");
        return;
    }

    if (provider === 'google') {
        if (tokenClient) {
            tokenClient.requestAccessToken(); // Google Penceresini Aç
        } else {
            alert("Google servisi yükleniyor, az bekle...");
        }
    } else if (provider === 'apple') {
        alert("Apple girişi yakında geliyor. Şimdilik Google'dan devam et.");
    }
}

/**
 * 3. Google Profil Verisini Çek ve Kaydet
 * @param {string} accessToken 
 */
function fetchGoogleProfile(accessToken) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(r => r.json())
    .then(data => {
        console.log("✅ Google Profile:", data);

        // Mevcut kullanıcıyı kontrol et (ID değişmesin diye)
        const existingUser = getUserInfo();
        
        // Yeni Kullanıcı Objesi
        const userData = {
            ...existingUser, // Varsa eski verileri koru
            id: existingUser.id || "CYN-" + data.sub.substr(0, 10), // ID Sabit
            fullname: data.name,
            email: data.email,
            avatar: data.picture,
            provider: 'google',
            // Eğer daha önce profil tamamlanmadıysa false kalır
            isProfileCompleted: existingUser.isProfileCompleted || false 
        };

        // LocalStorage'a yaz
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        
        // Yönlendirme Mantığı
        // Her giriş yapanı bir kere Profil sayfasına atalım ki teyit etsin
        window.location.href = 'pages/profil.html';
    })
    .catch(err => {
        console.error("Auth Error:", err);
        alert("Giriş yaparken bir hata oldu evladım.");
    });
}

/**
 * 4. Kullanıcı Bilgisini Getir (Helper)
 */
export function getUserInfo() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
}

/**
 * 5. Çıkış Yap
 */
export function logout() {
    if (confirm("Beni bırakıp gidiyor musun?")) {
        localStorage.removeItem(STORAGE_KEY);
        // Ana sayfaya (Login ekranına) dön
        window.location.href = window.location.origin + '/index.html'; 
    }
}

// Global Erişim (HTML onclick için)
window.handleLogin = handleLogin;
window.logout = logout;
