import { APP_MODULES } from "./config.js";
import { initAuth, handleLogin, logout, acceptTerms, waitForGsi } from "./auth.js";
import { initEyes, showPage, closePage } from "./ui.js";
import { initNotif } from "./notif.js";
import { fetchTextResponse, addUserBubble, typeWriter } from "./chat.js";
import { openFalPanel, closeFalPanel, handleFalPhoto } from "./fal.js";
import { openDedikoduPanel } from "./dedikodu.js";
import { STORAGE_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
window.currentAppMode = 'chat';

document.addEventListener("DOMContentLoaded", async () => {
    initEyes();
    
    // Google Scriptini Bekle (Çalışmazsa test butonu zaten var)
    const gsiReady = await waitForGsi();
    if(gsiReady) {
        const hint = $('loginHint');
        if(hint) hint.textContent = "Hadi giriş yap.";
        initAuth();
    } else {
        const hint = $('loginHint');
        if(hint) hint.textContent = "Google yüklenemedi, Test Girişini kullan.";
    }

    // --- EVENT LISTENERS ---

    // 1. Menü Aç/Kapa
    $('hambBtn')?.addEventListener('click', () => $('menuOverlay').classList.add('open'));
    $('menuOverlay')?.addEventListener('click', (e) => {
        if(e.target.id === 'menuOverlay') $('menuOverlay').classList.remove('open');
    });

    // 2. Mesaj Gönder
    $('sendBtn')?.addEventListener('click', sendMessage);
    $('msgInput')?.addEventListener('keydown', (e) => { if(e.key==='Enter') sendMessage(); });

    // 3. Bildirimler
    $('notifBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        $('notifDropdown').classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if(!$('notifBtn').contains(e.target)) $('notifDropdown').classList.remove('show');
    });

    // 4. LOGIN BUTONLARI
    $('googleLoginBtn')?.addEventListener('click', () => handleLogin('google'));
    $('appleLoginBtn')?.addEventListener('click', () => handleLogin('apple'));
    
    // 🔥 TEST GİRİŞİ (BYPASS) BUTONU 🔥
    $('devLoginBtn')?.addEventListener('click', () => {
        const fakeUser = {
            id: "test-user-id",
            email: "test@caynana.ai",
            name: "Test Kullanıcısı",
            avatar: "https://via.placeholder.com/150",
            termsAccepted: true,
            isSessionActive: true
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeUser));
        localStorage.setItem("google_id_token", "dev_token_bypass"); // Sahte token
        window.location.reload(); // Sayfayı yenile ve içeri gir
    });

    // 5. Sözleşme Onayı
    $('termsAcceptBtn')?.addEventListener('click', async () => {
        if($('termsCheck').checked) {
            await acceptTerms();
            $('termsOverlay').style.display = 'none';
            checkSession();
        } else {
            alert("Sözleşmeyi onayla evladım.");
        }
    });

    // 6. Diğer UI İşlevleri (Fal, Modal vb.)
    $('closeFalBtn')?.addEventListener('click', closeFalPanel);
    $('falInput')?.addEventListener('change', (e) => handleFalPhoto(e.target));
    $('closePageBtn')?.addEventListener('click', closePage);

    // 7. Grid Menü Butonları
    const actions = {
        'fal': openFalPanel,
        'dedikodu': openDedikoduPanel,
        'shopping': () => { window.currentAppMode='shopping'; sendMessage("Alışveriş modundayız, ne lazım?"); },
        'diet': () => { window.currentAppMode='diet'; sendMessage("Diyet için boyun kilon kaç?"); },
        'health': () => { window.currentAppMode='health'; sendMessage("Neren ağrıyor evladım?"); },
        'translate': () => { window.currentAppMode='trans'; sendMessage("Çevireceğin şeyi yaz."); },
        'astro': () => window.location.href = 'pages/burc.html',
        'dream': () => window.location.href = 'pages/ruya.html',
        'tarot': () => window.location.href = 'pages/tarot.html'
    };

    const grid = $('mainMenu');
    if(grid) {
        grid.innerHTML = `
            <div class="menu-action" data-act="shopping"><div class="ico">🛍️</div><div>Alışveriş</div></div>
            <div class="menu-action" data-act="translate"><div class="ico">🌍</div><div>Tercüman</div></div>
            <div class="menu-action" data-act="diet"><div class="ico">🥗</div><div>Diyet</div></div>
            <div class="menu-action" data-act="health"><div class="ico">❤️</div><div>Sağlık</div></div>
            <div class="menu-action" data-act="fal"><div class="ico">☕</div><div>Fal</div></div>
            <div class="menu-action" data-act="dedikodu"><div class="ico">🤫</div><div>Dedikodu</div></div>
            <div class="menu-action" data-act="astro"><div class="ico">♈</div><div>Burç</div></div>
            <div class="menu-action" data-act="tarot"><div class="ico">🃏</div><div>Tarot</div></div>
        `;
        grid.querySelectorAll('.menu-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const act = btn.dataset.act;
                $('menuOverlay').classList.remove('open');
                if(actions[act]) actions[act]();
            });
        });
    }

    // 8. Çıkış İşlemleri
    $('logoutBtn')?.addEventListener('click', logout);
    $('deleteAccountBtn')?.addEventListener('click', () => { if(confirm("Silmek istediğine emin misin?")) logout(); });

    // 9. Kamera/Göz Takip
    const toggleCam = () => { $('mobileFrame').classList.toggle('tracking-active'); };
    $('camBtn')?.addEventListener('click', toggleCam);
    $('trackToggleBtn')?.addEventListener('click', toggleCam);
    $('mainTrackBtn')?.addEventListener('click', toggleCam);

    checkSession();
});

async function sendMessage(overrideText) {
    const inp = $('msgInput');
    const txt = typeof overrideText === 'string' ? overrideText : inp.value.trim();
    if(!txt) return;

    // Token yoksa uyarı ver
    if(!localStorage.getItem("google_id_token")) {
        alert("Önce giriş yap evladım.");
        return;
    }

    addUserBubble(txt);
    inp.value = "";

    const chat = $('chat');
    const loadBubble = document.createElement('div');
    loadBubble.className = 'bubble bot loading';
    loadBubble.textContent = "…";
    chat.appendChild(loadBubble);
    chat.scrollTop = chat.scrollHeight;

    $('brandWrapper').classList.add('thinking');
    
    // API'ye gönder
    const res = await fetchTextResponse(txt);
    
    loadBubble.remove();
    $('brandWrapper').classList.remove('thinking');
    $('brandWrapper').classList.add('talking');
    $('mobileFrame').classList.add('talking');

    typeWriter(res.text);

    setTimeout(() => {
        $('brandWrapper').classList.remove('talking');
        $('mobileFrame').classList.remove('talking');
    }, Math.max(2000, res.text.length * 50));
}

function checkSession() {
    const user = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Eğer kullanıcı varsa login ekranını kaldır
    if(user && user.id) {
        $('loginOverlay').classList.remove('active');
        if(!user.termsAccepted) {
            $('termsOverlay').style.display = 'flex';
        } else {
            $('termsOverlay').style.display = 'none';
            initNotif();
            if($('chat').children.length === 0) setTimeout(() => typeWriter(`Hoş geldin ${user.name || 'evladım'}.`), 500);
        }
    } else {
        // Yoksa login ekranını göster
        $('loginOverlay').classList.add('active');
    }
}
