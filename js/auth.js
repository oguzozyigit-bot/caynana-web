/* js/auth.js - HAFIZA KORUMALI (SOFT LOGOUT) */
import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

let tokenClient;
let currentMode = 'login'; 

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
        else alert("Google servisi bekleniyor...");
    } else {
        window.location.href = 'pages/apple-yakinda.html';
    }
}

function fetchGoogleProfile(accessToken) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(r => r.json())
    .then(googleData => {
        // 1. MEVCUT VERİYİ OKU (SİLMEDEN!)
        let storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        const newGoogleID = "CYN-" + googleData.sub.substr(0, 10);

        // 2. VERİLERİ GÜNCELLE (Merge)
        const updatedUser = {
            ...storedUser, 
            id: storedUser.id || newGoogleID, 
            fullname: googleData.name, 
            email: googleData.email,   
            avatar: googleData.picture,
            provider: 'google',
            isSessionActive: true // GİRİŞ BAŞARILI, OTURUM AÇIK
        };

        // 3. SENARYOLAR
        if (currentMode === 'login') {
            // GİRİŞ MODU: Sadece profil tamamlanmışsa içeri al
            if (!updatedUser.isProfileCompleted) {
                alert("Seni tanıyamadım evladım. Kaydın yok. Lütfen 'ÜYE OL' butonuna bas.");
                return; 
            }
            
            // Kaydet ve İçeri Al
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            window.location.href = 'index.html'; // Sayfayı yenile ve gir

        } else {
            // KAYIT MODU
            if (updatedUser.isProfileCompleted) {
                if(confirm("Zaten bizimlesin evladım. Giriş yapılsın mı?")) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
                    window.location.href = 'index.html';
                    return;
                }
            }
            // Yeni Kayıt -> Profile
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            window.location.href = 'pages/profil.html';
        }
    })
    .catch(err => {
        console.error("Auth Error:", err);
    });
}

// --- KRİTİK GÜNCELLEME: SOFT LOGOUT ---
// Veriyi silmez, sadece "isSessionActive = false" yapar.
export function logout() {
    if (confirm("Oturumu kapatmak istiyor musun? (Bilgilerin silinmez)")) {
        let user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        user.isSessionActive = false; // Sadece oturumu düşür
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        window.location.href = '/index.html';
    }
}
