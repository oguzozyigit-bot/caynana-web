/* js/auth.js - HAFIZA KORUMALI SÜRÜM */
import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

let tokenClient;
let currentMode = 'login'; // 'login' veya 'signup'

export function initAuth() {
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
    }
}

export function handleLogin(provider, mode) {
    currentMode = mode; // Niyetimiz ne?
    
    // ÜYE OL ise Sözleşme Şart
    if (currentMode === 'signup') {
        const check = document.getElementById('agreementCheck');
        if (check && !check.checked) {
            alert("Üye olmak için sözleşmeyi kabul etmelisin evladım.");
            return;
        }
    }

    if (provider === 'google') {
        if(tokenClient) tokenClient.requestAccessToken();
    } else if (provider === 'apple') {
        window.location.href = 'pages/apple-yakinda.html';
    }
}

function fetchGoogleProfile(accessToken) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(r => r.json())
    .then(googleData => {
        
        // 1. MEVCUT HAFIZAYI OKU (SİLMEDEN!)
        let storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const newGoogleID = "CYN-" + googleData.sub.substr(0, 10);

        // 2. KULLANICIYI BİRLEŞTİR (MERGE) - ESKİ VERİYİ KORU
        // Burası çok önemli: storedUser'ı önce yayıyoruz ki 'hitap', 'botName' kaybolmasın.
        const updatedUser = {
            ...storedUser, 
            id: newGoogleID,
            fullname: googleData.name, // Google adını güncelle
            email: googleData.email,   // Email güncelle
            avatar: googleData.picture,// Resim güncelle
            provider: 'google'
        };

        // 3. SENARYOLAR
        if (currentMode === 'login') {
            // GİRİŞ MODU: İçeride "Profil Tamamlandı" mührü var mı?
            if (!updatedUser.isProfileCompleted) {
                alert("Seni tanıyamadım evladım. Daha önce profil oluşturmamışsın. Lütfen 'ÜYE OL' butonunu kullan.");
                return; 
            }
            
            // Tanıdık, veriyi güncelle ve içeri al
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            document.getElementById('loginOverlay').classList.remove('active');
            
            // Sohbeti hafızadaki isimle başlat
            if(window.startChat) window.startChat(updatedUser);

        } else {
            // KAYIT MODU:
            if (updatedUser.isProfileCompleted) {
                if(confirm("Sen zaten bizim evlatsın. Giriş yapılsın mı?")) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
                    document.getElementById('loginOverlay').classList.remove('active');
                    if(window.startChat) window.startChat(updatedUser);
                    return;
                }
            }
            // Yeni kayıt ise profil sayfasına gönder
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            window.location.href = 'pages/profil.html';
        }
    })
    .catch(err => {
        console.error("Google Hatası:", err);
    });
}

export function logout() {
    if (confirm("Beni bırakıp gidiyor musun?")) {
        // Çıkışta hafızayı silmeyelim ki geri gelince hatırlasın istersen
        // Ama güvenlik için genelde silinir. Sen silme dediğin için yorum satırı yapıyorum:
        // localStorage.removeItem(STORAGE_KEY); 
        window.location.reload();
    }
}
