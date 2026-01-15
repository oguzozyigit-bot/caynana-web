/* js/ui_modals.js
   Açılır Pencereler ve UI Etkileşimleri
*/

export function initUi() {
    console.log("🎨 UI Modülleri Yüklendi...");
    // Modal kapatma butonlarını dinle
    const closeBtns = document.querySelectorAll('.close-modal');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
}

// Global modal açma fonksiyonları
window.openLoginModal = function() {
    const m = document.getElementById('login-modal');
    if (m) m.style.display = 'flex';
}
