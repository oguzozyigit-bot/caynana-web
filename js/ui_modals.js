/* js/ui_modals.js (FIXED v9908 - setupNotifications EKLENDİ) */
import { setHeroMode } from './main.js';

// --- ANA UI BAŞLATICI ---
export function initUi() {
    console.log("🎨 UI Modülleri Başlatılıyor...");
    
    setupMenuDrawer();
    setupModals();
    setupPersonaModal();  // Main.js bunu istiyor
    setupNotifications(); // Main.js bunu istiyor (HATA BURADAYDI)
    setupPhotoModal();    // Fal için gerekli
}

// --- MENÜ (DRAWER) ---
function setupMenuDrawer() {
    const menuBtn = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('drawerClose');
    const drawer = document.getElementById('drawer');
    const mask = document.getElementById('drawerMask');

    function toggleDrawer(show) {
        if (show) {
            drawer.classList.add('open');
            mask.style.display = 'block';
        } else {
            drawer.classList.remove('open');
            mask.style.display = 'none';
        }
    }

    if (menuBtn) menuBtn.addEventListener('click', () => toggleDrawer(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));
    if (mask) mask.addEventListener('click', () => toggleDrawer(false));

    // Menü Linkleri
    setupDrawerLinks(toggleDrawer);
}

function setupDrawerLinks(closeDrawer) {
    // Profil
    const openProfile = document.getElementById('openProfileBtn');
    if (openProfile) openProfile.addEventListener('click', () => {
        closeDrawer(false);
        const pm = document.getElementById('profileModal');
        if(pm) pm.style.display = 'flex';
    });
    
    // Auth (Giriş)
    const openLogin = document.getElementById('openLoginBtn');
    if (openLogin) openLogin.addEventListener('click', () => {
        closeDrawer(false);
        const am = document.getElementById('authModal');
        if(am) am.style.display = 'flex';
    });

    // Hakkımızda vb. (Page Modal)
    bindPageModal('aboutBtn', 'Hakkımızda', 'Caynana.ai, yapay zekanın geleneksel aklıdır.<br>Size anne şefkatiyle yaklaşır ama lafını da esirgemez.');
    bindPageModal('faqBtn', 'Sık Sorulan Sorular', '<b>Ücretli mi?</b><br>Hayır, temel kullanım ücretsiz.<br><br><b>Fal gerçek mi?</b><br>Eğlence amaçlıdır evladım.');
    bindPageModal('contactBtn', 'İletişim', 'Bize her zaman yazabilirsin: iletisim@caynana.ai');
    bindPageModal('privacyBtn', 'Gizlilik', 'Verilerin bizimle güvende. Kimseyle paylaşmıyoruz.');
    
    function bindPageModal(btnId, title, content) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                closeDrawer(false);
                showPage(title, content);
            });
        }
    }
}

// --- SAYFA MODALI (Hakkımızda vs) ---
function showPage(title, content) {
    const modal = document.getElementById('pageModal');
    const tEl = document.getElementById('pageTitle');
    const bEl = document.getElementById('pageBody');
    
    if (tEl) tEl.innerText = title;
    if (bEl) bEl.innerHTML = content;
    if (modal) modal.style.display = 'flex';
    
    // Kapatma
    const close = document.getElementById('pageClose');
    if (close) {
        // Event listener birikmesini önlemek için clone
        const newClose = close.cloneNode(true);
        close.parentNode.replaceChild(newClose, close);
        newClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
}

// --- PERSONA MODALI ---
export function setupPersonaModal() {
    const btn = document.getElementById('personaBtn');
    const modal = document.getElementById('personaModal');
    const close = document.getElementById('personaClose');
    
    if (btn && modal) {
        btn.addEventListener('click', () => modal.style.display = 'flex');
    }
    if (close && modal) {
        close.addEventListener('click', () => modal.style.display = 'none');
    }

    // Seçenekler
    document.querySelectorAll('.persona-opt').forEach(opt => {
        if (opt.classList.contains('locked')) return;
        
        opt.addEventListener('click', () => {
            document.querySelectorAll('.persona-opt').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            
            // Seçilince kapat
            if(modal) modal.style.display = 'none';
            // İleride backend'e persona bilgisi gönderilebilir
        });
    });
}

// --- BİLDİRİMLER (EKSİK OLAN BUYDU) ---
export function setupNotifications() {
    const btn = document.getElementById('notifIconBtn');
    const modal = document.getElementById('notifModal');
    const close = document.getElementById('notifClose');
    const list = document.getElementById('notifList');

    if (btn && modal) {
        btn.addEventListener('click', () => {
            modal.style.display = 'flex';
            // Badge sıfırla
            const badge = document.getElementById('notifBadge');
            if(badge) badge.style.display = 'none';
        });
    }
    if (close && modal) {
        close.addEventListener('click', () => modal.style.display = 'none');
    }
    
    // Örnek bildirim doldur (Boş kalmasın)
    if (list && list.children.length === 0) {
        list.innerHTML = `
            <div style="padding:15px; border-bottom:1px solid #eee;">
                <div style="font-weight:800;">Hoşgeldin Evladım</div>
                <div style="font-size:13px; color:#555; margin-top:4px;">Caynana seni çok özlemişti.</div>
            </div>
        `;
    }
}

// --- FOTOĞRAF MODALI (FAL İÇİN) ---
function setupPhotoModal() {
    // Fal.js içinden çağrılır veya buradan yönetilir
    // Şimdilik sadece kapatma butonunu bağlayalım
    const cancel = document.getElementById('photoCancelBtn');
    const modal = document.getElementById('photoModal');
    
    if (cancel && modal) {
        cancel.addEventListener('click', () => modal.style.display = 'none');
    }
}

// --- GENEL MODAL KAPATMA (MASK TIKLAMA) ---
function setupModals() {
    document.querySelectorAll('.modalMask').forEach(mask => {
        mask.addEventListener('click', (e) => {
            if (e.target === mask) {
                // Zorunlu profili kapatamasın
                if (mask.id === 'profileModal') {
                    const closeBtn = document.getElementById('profileCloseX');
                    if (closeBtn && closeBtn.style.display === 'none') return;
                }
                mask.style.display = 'none';
            }
        });
    });

    // Auth kapatma
    const authClose = document.getElementById('authClose');
    const authCloseX = document.getElementById('authCloseX');
    const authModal = document.getElementById('authModal');
    
    if (authModal) {
        if (authClose) authClose.addEventListener('click', () => authModal.style.display = 'none');
        if (authCloseX) authCloseX.addEventListener('click', () => authModal.style.display = 'none');
    }
}
