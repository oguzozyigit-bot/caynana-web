/* js/auth.js - HAFIZA KORUMALI & ÇIKIŞ FIX */
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
    currentMode = mode; 
    
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
        
        // 1. MEVCUT HAFIZAYI OKU
        let storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const newGoogleID = "CYN-" + googleData.sub.substr(0, 10);

        // 2. KULLANICIYI BİRLEŞTİR (MERGE)
        // storedUser'ı önce yayıyoruz ki eski ayarlar (hitap, botName) silinmesin
        const updatedUser = {
            ...storedUser, 
            id: storedUser.id || newGoogleID, // Varsa eski ID'yi koru
            fullname: googleData.name, 
            email: googleData.email,   
            avatar: googleData.picture,
            provider: 'google'
        };

        // 3. SENARYOLAR
        if (currentMode === 'login') {
            // GİRİŞ MODU
            if (!updatedUser.isProfileCompleted) {
                alert("Seni tanıyamadım evladım. Kaydın yok veya profilin yarım kalmış. Lütfen 'ÜYE OL' butonuna bas.");
                return; 
            }
            
            // Veriyi güncelle ve içeri al
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            
            // Overlay varsa kaldır
            const overlay = document.getElementById('loginOverlay');
            if(overlay) overlay.classList.remove('active');
            
            // Sohbeti başlat (index.html'deki fonksiyonu tetikle)
            if(window.startChat) window.startChat(updatedUser);

        } else {
            // KAYIT MODU
            if (updatedUser.isProfileCompleted) {
                if(confirm("Sen zaten bizim evlatsın. Giriş yapılsın mı?")) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
                    document.getElementById('loginOverlay').classList.remove('active');
                    if(window.startChat) window.startChat(updatedUser);
                    return;
                }
            }
            // Yeni kayıt -> Profile git
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            window.location.href = 'pages/profil.html';
        }
    })
    .catch(err => {
        console.error("Google Hatası:", err);
    });
}

// Çıkış Fonksiyonu (Artık çalışacak)
export function logout() {
    if (confirm("Beni bırakıp gidiyor musun?")) {
        localStorage.removeItem(STORAGE_KEY); 
        window.location.href = window.location.origin + '/index.html'; // Tam yenileme
    }
}
