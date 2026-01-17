import { GOOGLE_CLIENT_ID, STORAGE_KEY } from "./config.js";

let tokenClient;
let currentMode = 'login'; // 'login' veya 'signup'

// 1. Google İstemcisini Başlat
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

// 2. Butona Tıklayınca (Login veya Signup Ayırımı)
export function handleLogin(provider, mode) {
    currentMode = mode; // Niyetimiz ne? (Giriş mi Kayıt mı)

    // A) KAYIT OL MODU (Sözleşme Zorunlu)
    if (currentMode === 'signup') {
        const check = document.getElementById('agreementCheck');
        if (check && !check.checked) {
            alert("Üye olmak için sözleşmeyi kabul etmelisin evladım.");
            return;
        }
    }
    
    // B) GİRİŞ YAP MODU (Sözleşme Yok - Direkt Google)
    if (provider === 'google') {
        if (tokenClient) {
            tokenClient.requestAccessToken();
        } else {
            alert("Google servisi hazırlanıyor, az bekle...");
        }
    } else {
        alert("Apple yakında geliyor.");
    }
}

// 3. Google Verisi Gelince Ne Yapacağız?
function fetchGoogleProfile(accessToken) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(r => r.json())
    .then(googleData => {
        // --- KRİTİK NOKTA: VERİ KORUMA ---
        
        // 1. Mevcut (Eski) Veriyi Çek
        let storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        
        // 2. Google ID Kontrolü (Başkasının verisini yüklemeyelim)
        const newGoogleID = "CYN-" + googleData.sub.substr(0, 10);
        
        // Eğer LocalStorage'da veri var ama ID'ler farklıysa -> Sıfırla (Yeni hesap)
        if(storedUser.id && storedUser.id !== newGoogleID) {
            storedUser = {}; 
        }

        // 3. Mantık Çatalı
        if (currentMode === 'login') {
            // --- GİRİŞ SENARYOSU ---
            if (!storedUser.id || !storedUser.isProfileCompleted) {
                // Kaydı yoksa veya profil yarım kalmışsa içeri alma!
                alert("Seni tanıyamadım evladım. Önce 'Üye Ol' butonundan kayıt aç.");
                return; // DUR.
            }
            
            // Kayıt var, sadece Google bilgilerini (Avatar/Email) güncelle, HİTAP'A DOKUNMA
            storedUser.fullname = googleData.name;
            storedUser.avatar = googleData.picture;
            storedUser.email = googleData.email;
            
            // Kaydet ve Sohbeti Başlat
            localStorage.setItem(STORAGE_KEY, JSON.stringify(storedUser));
            
            // Perdeyi kaldır ve konuşmaya başla
            document.getElementById('loginOverlay').classList.remove('active');
            
            // index.html'deki startChat fonksiyonunu tetikle (Hitap ile)
            if(window.startChat) window.startChat(storedUser);

        } else {
            // --- KAYIT (SIGNUP) SENARYOSU ---
            
            // Eğer zaten üyeyse uyarı ver ama yine de güncelle
            if (storedUser.isProfileCompleted) {
                if(confirm("Sen zaten üyesin evladım. Giriş yapılsın mı?")) {
                    document.getElementById('loginOverlay').classList.remove('active');
                    if(window.startChat) window.startChat(storedUser);
                    return;
                }
            }

            // Yeni Kullanıcı Objesi Oluştur (Eski verileri koruyarak merge et)
            const newUser = {
                ...storedUser, // Varsa eski ayarları koru
                id: newGoogleID,
                fullname: googleData.name,
                email: googleData.email,
                avatar: googleData.picture,
                provider: 'google',
                isProfileCompleted: storedUser.isProfileCompleted || false // Silme!
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
            
            // Profil sayfasına yönlendir (Kayıt tamamlamak için)
            window.location.href = 'pages/profil.html';
        }
    })
    .catch(err => {
        console.error(err);
        alert("Google ile bağlantı kuramadık.");
    });
}

// Helper: Kullanıcı Bilgisi
export function getUserInfo() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

// Helper: Çıkış
export function logout() {
    if (confirm("Beni bırakıp gidiyor musun?")) {
        // Tamamen silme ki geri gelince hatırlayalım (İsteğe bağlı)
        // Ama güvenlik için çıkışta temizlemek iyidir:
        localStorage.removeItem(STORAGE_KEY); 
        window.location.reload();
    }
}
