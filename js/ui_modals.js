/* js/ui_modals.js
   Tüm Pencereler (Drawer, Modal, Bildirimler) ve Tıklama Olayları
*/

export function initUi() {
    console.log("🎨 UI Modülleri (Menü, Modlar) Bağlanıyor...");

    // --- 1. MENÜ (DRAWER) ---
    const menuBtn = document.getElementById('menuBtn');
    const drawer = document.getElementById('drawer');
    const drawerMask = document.getElementById('drawerMask');
    const drawerClose = document.getElementById('drawerClose');

    function toggleDrawer(show) {
        if (!drawer || !drawerMask) return;
        const disp = show ? 'block' : 'none';
        const trans = show ? 'translateX(0)' : 'translateX(100%)';
        
        drawerMask.style.display = disp;
        // Drawer animasyonu için class veya style
        drawer.style.transform = trans;
        // Eğer CSS ile kontrol ediliyorsa class ekle/çıkar:
        if (show) drawer.classList.add('open'); else drawer.classList.remove('open');
    }

    if (menuBtn) menuBtn.addEventListener('click', () => toggleDrawer(true));
    if (drawerClose) drawerClose.addEventListener('click', () => toggleDrawer(false));
    if (drawerMask) drawerMask.addEventListener('click', () => toggleDrawer(false));


    // --- 2. PERSONA (KAYNANA MODLARI) ---
    const personaBtn = document.getElementById('personaBtn');
    const personaModal = document.getElementById('personaModal');
    const personaClose = document.getElementById('personaClose');

    if (personaBtn && personaModal) {
        personaBtn.addEventListener('click', () => {
            personaModal.style.display = 'flex';
        });
    }
    if (personaClose && personaModal) {
        personaClose.addEventListener('click', () => {
            personaModal.style.display = 'none';
        });
    }

    // Persona Seçimi (Tıklayınca seçili yap)
    const personaOpts = document.querySelectorAll('.persona-opt');
    personaOpts.forEach(opt => {
        opt.addEventListener('click', () => {
            // Hepsinden seçimi kaldır
            personaOpts.forEach(o => o.classList.remove('selected'));
            // Buna ekle
            opt.classList.add('selected');
            console.log("Mod seçildi:", opt.dataset.persona);
            
            // Seçimden sonra kapatmak istersen:
            // if(personaModal) personaModal.style.display = 'none';
        });
    });


    // --- 3. BİLDİRİMLER ---
    const notifBtn = document.getElementById('notifIconBtn');
    const notifModal = document.getElementById('notifModal');
    const notifClose = document.getElementById('notifClose');

    if (notifBtn && notifModal) {
        notifBtn.addEventListener('click', () => {
            notifModal.style.display = 'flex';
        });
    }
    if (notifClose && notifModal) {
        notifClose.addEventListener('click', () => {
            notifModal.style.display = 'none';
        });
    }
    
    // --- 4. PROFİL & GİRİŞ ---
    const openLoginBtn = document.getElementById('openLoginBtn');
    const openProfileBtn = document.getElementById('openProfileBtn'); // Drawer içindeki
    const authCloseX = document.getElementById('authCloseX');
    const authClose = document.getElementById('authClose');
    const authModal = document.getElementById('authModal');

    // Giriş Modalını Aç
    window.openLoginModal = function() {
        if (authModal) authModal.style.display = 'flex';
    };

    if (openLoginBtn) openLoginBtn.addEventListener('click', window.openLoginModal);
    
    // Kapatma Tuşları
    if (authCloseX) authCloseX.addEventListener('click', () => authModal.style.display = 'none');
    if (authClose) authClose.addEventListener('click', () => authModal.style.display = 'none');
}
