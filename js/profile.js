/* js/profile.js - FINAL FIXED */
import { STORAGE_KEY } from './config.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    const data = localStorage.getItem(STORAGE_KEY);
    
    // Veri yoksa ana sayfaya at
    if(!data) { 
        window.location.href = '../index.html'; 
        return;
    }

    try {
        currentUser = JSON.parse(data);
    } catch (e) {
        localStorage.clear();
        window.location.href = '../index.html';
        return;
    }
    
    fillForm();
    
    // Tarih Girişi Formatlayıcı (GG.AA.YYYY)
    const dobInput = document.getElementById('formDob');
    if(dobInput) {
        dobInput.addEventListener('input', function(e) {
            let v = this.value.replace(/\D/g, ''); // Sadece rakam
            if (v.length > 2) v = v.slice(0,2) + '.' + v.slice(2);
            if (v.length > 5) v = v.slice(0,5) + '.' + v.slice(5,9);
            this.value = v;
        });
    }
});

function fillForm() {
    const avatarEl = document.getElementById('formAvatar');
    const nameEl = document.getElementById('formFullname');
    const idEl = document.getElementById('formID');

    if(avatarEl) avatarEl.src = currentUser.avatar || "https://via.placeholder.com/100";
    if(nameEl) nameEl.value = currentUser.fullname || "Misafir";
    if(idEl) idEl.innerText = currentUser.id || "---";

    setVal('formHitap', currentUser.hitap);
    setVal('formBotName', currentUser.botName);
    setVal('formDob', currentUser.dob);
    setVal('formGender', currentUser.gender);
    
    if(currentUser.maritalStatus) {
        setVal('formStatus', currentUser.maritalStatus);
        toggleMarriedFields();
    }
    if(currentUser.spouse) setVal('formSpouse', currentUser.spouse);
    
    if(currentUser.childCount) {
        setVal('formChildCount', currentUser.childCount);
        toggleChildFields();
    }
    if(currentUser.childNames) setVal('formChildNames', currentUser.childNames);
    if(currentUser.childAges) setVal('formChildAges', currentUser.childAges);
    
    if(currentUser.team) setVal('formTeam', currentUser.team);
    if(currentUser.city) setVal('formCity', currentUser.city);
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if(el && val) el.value = val;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
}

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
        alert("Kopyalandı: " + currentUser.id);
    }
}

// ÇIKIŞ YAP (DÖNGÜDEN KURTARICI)
window.logoutFromProfile = function() {
    if(confirm("Çıkış yapıp ana sayfaya dönmek istiyor musun?")) {
        localStorage.clear();
        window.location.replace('../index.html');
    }
}

window.saveProfile = function() {
    const hitap = getVal('formHitap');
    const botName = getVal('formBotName');
    const dob = getVal('formDob');
    const gender = getVal('formGender');

    if(!hitap || !botName || !dob || !gender) {
        alert("Lütfen mecburi alanları (Hitap, İsim, Doğum Tarihi, Cinsiyet) doldur.");
        return;
    }

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
    
    currentUser.isProfileCompleted = true;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));

    const btn = document.querySelector('.save-btn');
    if(btn) {
        btn.innerHTML = "✔ KAYDEDİLDİ";
        btn.style.background = "#4CAF50";
    }

    setTimeout(() => {
        window.location.replace('../index.html');
    }, 800);
}
