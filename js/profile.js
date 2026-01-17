import { STORAGE_KEY } from './config.js';

// Global kullanıcı değişkeni
let currentUser = null;

// --- 1. BAŞLANGIÇ (INIT) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("👤 Profil Sayfası Yüklendi");

    // LocalStorage'dan veriyi çek
    const data = localStorage.getItem(STORAGE_KEY);
    
    // Eğer veri yoksa (Login olmadan gelmişse) ana sayfaya şutla
    if(!data) { 
        console.warn("⚠️ Kullanıcı verisi yok, ana sayfaya yönlendiriliyor.");
        window.location.replace('/'); 
        return;
    }

    try {
        currentUser = JSON.parse(data);
    } catch (e) {
        // Veri bozuksa temizle ve çık
        localStorage.removeItem(STORAGE_KEY);
        window.location.replace('/');
        return;
    }
    
    // Formu Doldur (Veriler varsa)
    fillForm();
});

// --- 2. FORM DOLDURMA ---
function fillForm() {
    // Google'dan gelen sabit veriler
    const avatarEl = document.getElementById('formAvatar');
    const nameEl = document.getElementById('formFullname');
    const idEl = document.getElementById('formID'); // Span veya Input olabilir

    if(avatarEl) avatarEl.src = currentUser.avatar || "https://via.placeholder.com/100";
    if(nameEl) nameEl.value = currentUser.fullname || "Misafir";
    
    // ID alanı text mi input mu kontrol et
    if(idEl) {
        if(idEl.tagName === 'INPUT') idEl.value = currentUser.id || "---";
        else idEl.innerText = currentUser.id || "---";
    }

    // Daha önce doldurulmuş alanlar varsa geri yükle
    setVal('formHitap', currentUser.hitap);
    setVal('formBotName', currentUser.botName);
    setVal('formDob', currentUser.dob);
    setVal('formGender', currentUser.gender);
    
    // Detay alanları tetikle
    if(currentUser.maritalStatus) {
        setVal('formStatus', currentUser.maritalStatus);
        toggleMarriedFields(); // UI'ı güncelle
    }
    if(currentUser.spouse) setVal('formSpouse', currentUser.spouse);
    
    if(currentUser.childCount) {
        setVal('formChildCount', currentUser.childCount);
        toggleChildFields(); // UI'ı güncelle
    }
    if(currentUser.childNames) setVal('formChildNames', currentUser.childNames);
    if(currentUser.childAges) setVal('formChildAges', currentUser.childAges);
    
    if(currentUser.team) setVal('formTeam', currentUser.team);
    if(currentUser.city) setVal('formCity', currentUser.city);
}

// --- 3. UI HELPERLAR ---

// Input değer atama yardımcısı (Hata vermez)
function setVal(id, val) {
    const el = document.getElementById(id);
    if(el && val) el.value = val;
}

// Input değer okuma yardımcısı
function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

// Global UI Fonksiyonları (HTML'den çağrılabilmesi için window'a atıyoruz)
window.toggleMarriedFields = function() {
    const val = getVal('formStatus');
    const div = document.getElementById('marriedFields');
    if(div) val === 'Evli' ? div.classList.add('show') : div.classList.remove('show');
}

window.toggleChildFields = function() {
    const val = getVal('formChildCount');
    const div = document.getElementById('childFields');
    if(div) val !== '0' ? div.classList.add('show') : div.classList.remove('show');
}

window.copyID = function() {
    if(currentUser && currentUser.id) {
        navigator.clipboard.writeText(currentUser.id);
        alert("Kimlik numarası kopyalandı: " + currentUser.id);
    }
}

// --- 4. KRİTİK İŞLEMLER: ÇIKIŞ & KAYDET ---

// Çıkış Yap (Döngüden Kurtarıcı)
window.logoutFromProfile = function() {
    if(confirm("Profil oluşturmayı iptal edip çıkış yapmak istiyor musun?")) {
        localStorage.removeItem(STORAGE_KEY);
        // Ana sayfaya (Login ekranına) zorla yönlendir
        window.location.replace('/'); 
    }
}

// Profili Kaydet
window.saveProfile = function() {
    // 1. Mecburi Alanları Al
    const hitap = getVal('formHitap');
    const botName = getVal('formBotName');
    const dob = getVal('formDob');
    const gender = getVal('formGender');

    // 2. Validasyon
    if(!hitap || !botName || !dob || !gender) {
        alert("Lütfen mecburi alanları (Hitap, İsim, Doğum Tarihi, Cinsiyet) doldur evladım.");
        return;
    }

    // 3. Objeyi Güncelle
    currentUser.hitap = hitap;
    currentUser.botName = botName;
    currentUser.dob = dob;
    currentUser.gender = gender;
    
    // Opsiyonel
    currentUser.maritalStatus = getVal('formStatus');
    currentUser.spouse = getVal('formSpouse');
    currentUser.childCount = getVal('formChildCount');
    currentUser.childNames = getVal('formChildNames');
    currentUser.childAges = getVal('formChildAges');
    currentUser.team = getVal('formTeam');
    currentUser.city = getVal('formCity');
    
    // Profil Tamamlandı İşareti (KİLİT NOKTA)
    currentUser.isProfileCompleted = true;
    currentUser.lastUpdated = new Date().toISOString();

    // 4. Kaydet
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));

    // 5. Görsel Geri Bildirim
    const btn = document.querySelector('.save-btn');
    if(btn) {
        btn.innerHTML = "✔ KAYDEDİLDİ";
        btn.style.background = "#4CAF50";
        btn.style.color = "#fff";
    }

    // 6. Yönlendir
    console.log("💾 Profil kaydedildi, yönlendiriliyor...");
    setTimeout(() => {
        window.location.replace('/'); // index.html'e temiz başlangıç
    }, 800);
}
