/* js/dock.js - Modül İkonları ve Geçişler */
import { setHeroMode } from './main.js';

// Modül Listesi (Anayasa'ya Uygun)
const MODULES = [
    { id: 'chat',     icon: 'fa-comment',       label: 'Sohbet' },
    { id: 'fal',      icon: 'fa-eye',           label: 'Fal' }, // veya fa-coffee
    { id: 'shopping', icon: 'fa-bag-shopping',  label: 'Alışveriş' },
    { id: 'dedikodu', icon: 'fa-user-group',    label: 'Dedikodu' },
    { id: 'health',   icon: 'fa-heart-pulse',   label: 'Sağlık' },
    { id: 'diet',     icon: 'fa-carrot',        label: 'Diyet' },
    { id: 'astro',    icon: 'fa-star',          label: 'Astro' }
];

export function initDock() {
    console.log("⚓ Dock (Modüller) Hazırlanıyor...");
    
    const dock = document.getElementById('dock');
    if (!dock) return;

    dock.innerHTML = ''; // Temizle

    MODULES.forEach(mod => {
        const item = document.createElement('div');
        item.className = 'dock-item';
        if (mod.id === 'chat') item.classList.add('active'); // Varsayılan aktif
        
        item.innerHTML = `
            <div class="dock-icon"><i class="fa-solid ${mod.icon}"></i></div>
            <div class="dock-label">${mod.label}</div>
        `;

        item.addEventListener('click', () => {
            // 1. Aktif sınıfını değiştir
            document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');

            // 2. Modu değiştir (Resim vb.)
            if (typeof setHeroMode === 'function') {
                setHeroMode(mod.id);
            }

            // 3. Kullanıcıya bilgi ver (veya Chat inputuna odaklan)
            console.log(`Mod Değişti: ${mod.label}`);
            
            // Eğer Fal ise kamera butonunu öne çıkarabiliriz
            const falUI = document.querySelector('.fal-only');
            if (mod.id === 'fal') {
                 if(falUI) falUI.style.display = 'flex';
            } else {
                 if(falUI) falUI.style.display = 'none';
            }
        });

        dock.appendChild(item);
    });
}
