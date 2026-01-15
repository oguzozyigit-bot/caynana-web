/* js/profile.js (ANAYASA MADDE 12 - PROFİL YÖNETİMİ)
   Zorunlu Alanlar: Ad, Takma Ad, Cinsiyet, Yaş, Boy, Kilo.
   Bunlar yoksa modal kapanmaz.
*/
import { BASE_DOMAIN } from './main.js';
import { currentUser } from './auth.js';

let currentProfile = {};

// --- PROFİLİ YÜKLE ---
export async function loadProfile(forceCheck = false) {
    if (!currentUser) return;

    try {
        const res = await fetch(`${BASE_DOMAIN}/api/profile/me`, {
            headers: { "Authorization": `Bearer ${currentUser.token}` }
        });
        const data = await res.json();
        
        if (res.ok) {
            const prof = data.profile || {};
            currentProfile = prof;
            
            // Arayüzü Doldur (Drawer'daki isim vb.)
            updateUI(prof, data.user_id, data.plan);
            
            // Modal içindeki inputları doldur
            fillForm(prof);

            // ZORUNLU KONTROL (İlk giriş mi?)
            if (forceCheck) {
                if (!isProfileValid(prof)) {
                    console.log("⚠️ Profil eksik! Zorunlu açılıyor...");
                    openProfileModal(false); // false = kapatılamaz (closeBtn gizlenmeli)
                }
            }
        }
    } catch (err) {
        console.error("Profil Yükleme Hatası:", err);
    }
}

// --- MODAL AÇMA ---
export function openProfileModal(canClose = true) {
    const modal = document.getElementById('profileModal');
    const closeBtn = document.getElementById('profileCloseX');
    
    if (modal) {
        modal.style.display = 'flex';
        // Eğer zorunluysa kapatma tuşunu gizle
        if (!canClose) {
            if (closeBtn) closeBtn.style.display = 'none';
        } else {
            if (closeBtn) closeBtn.style.display = 'block';
        }
    }
}

// --- KAYDETME İŞLEMİ ---
export async function saveProfile() {
    // Formdan verileri al
    const p = {
        name: val('pfFullName'),
        nick: val('pfNick'),
        gender: val('pfGender'),
        age: val('pfAge'),
        height: val('pfHeight'),
        weight: val('pfWeight'),
        // Opsiyoneller
        bio: val('pfBio'),
        marital: val('pfMarital'),
        kids: val('pfKids'),
        spouse_name: val('pfSpouseName'),
        city: val('pfCity'),
        job: val('pfJob'),
        priority: val('pfPriority')
    };

    // Zorunlu Alan Kontrolü
    if (!p.name || !p.nick || !p.gender || !p.age || !p.height || !p.weight) {
        alert("Evladım zorunlu alanları (Ad, Takma Ad, Cinsiyet, Yaş, Boy, Kilo) doldurmadan seni bırakmam!");
        return;
    }

    const statusDiv = document.getElementById('profileStatus');
    if (statusDiv) statusDiv.innerText = "Kaydediliyor...";

    try {
        const res = await fetch(`${BASE_DOMAIN}/api/profile/set`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
            },
            body: JSON.stringify({ profile: p })
        });

        if (res.ok) {
            if (statusDiv) statusDiv.innerText = "Aferin, kaydettim.";
            // Modalı kapatmaya izin ver ve kapat
            const closeBtn = document.getElementById('profileCloseX');
            if (closeBtn) closeBtn.style.display = 'block';
            setTimeout(() => {
                document.getElementById('profileModal').style.display = 'none';
                statusDiv.innerText = "";
            }, 1000);
            
            // UI güncelle
            loadProfile(false);
        } else {
            if (statusDiv) statusDiv.innerText = "Hata oluştu.";
        }
    } catch (e) {
        console.error(e);
        if (statusDiv) statusDiv.innerText = "Sunucu hatası.";
    }
}

// --- YARDIMCILAR ---
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

function fillForm(p) {
    setVal('pfFullName', p.name);
    setVal('pfNick', p.nick);
    setVal('pfGender', p.gender);
    setVal('pfAge', p.age);
    setVal('pfHeight', p.height);
    setVal('pfWeight', p.weight);
    setVal('pfBio', p.bio);
    setVal('pfMarital', p.marital);
    setVal('pfKids', p.kids);
    setVal('pfSpouseName', p.spouse_name);
    setVal('pfCity', p.city);
    setVal('pfJob', p.job);
    setVal('pfPriority', p.priority);
}

function setVal(id, v) {
    const el = document.getElementById(id);
    if (el && v) el.value = v;
}

function updateUI(p, uid, plan) {
    // Drawer içindeki alanlar
    const dName = document.getElementById('dpName');
    const dPlan = document.getElementById('dpPlan');
    const dCN = document.getElementById('dpCN');
    
    // Modal içindeki başlık
    const pEmail = document.getElementById('profileEmail');
    const pCN = document.getElementById('profileCN');
    const pPlan = document.getElementById('profilePlan');
    const pAvatar = document.getElementById('profileAvatar');
    const dAvatar = document.getElementById('dpAvatar');

    const name = p.nick || p.name || "Evladım";
    const idStr = uid || "CN-????";
    const planStr = (plan || "FREE").toUpperCase();

    if (dName) dName.innerText = name;
    if (dPlan) dPlan.innerText = planStr;
    if (dCN) dCN.innerText = idStr;

    if (pEmail) pEmail.innerText = name; // Email yerine isim gösterelim, daha şık
    if (pCN) pCN.innerText = idStr;
    if (pPlan) pPlan.innerText = planStr;

    if (p.avatar) {
        if (pAvatar) pAvatar.src = p.avatar;
        if (dAvatar) dAvatar.src = p.avatar;
    }
}

function isProfileValid(p) {
    // Zorunlu alanların doluluğunu kontrol et
    return (p.name && p.nick && p.gender && p.age && p.height && p.weight);
}

// Kaydet butonunu dinle (Main.js'den çağrılacak veya burada beklenecek)
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('profileSave');
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);
});
