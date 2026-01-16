/* js/auth.js - KİMLİK YÖNETİMİ */
import { BASE_DOMAIN, PLACEHOLDER_IMG } from './config.js';

export function checkLoginStatus() {
    const raw = localStorage.getItem("user_info");
    const menu = document.querySelector('.menu-list');
    const bar = document.getElementById('userInfoBar');
    
    if (raw) {
        const u = JSON.parse(raw);
        if(bar) {
            bar.classList.add('visible'); 
            document.getElementById('headerAvatar').src = u.picture || PLACEHOLDER_IMG;
            document.getElementById('headerHitap').innerText = (u.hitap || "DAMAT").toUpperCase();
            document.getElementById('headerName').innerText = u.name || "";
        }
        if(menu) {
            menu.innerHTML = `
                <a href="pages/profil.html" class="menu-item highlight" style="border:1px solid var(--primary);"><i class="fa-solid fa-user-pen"></i> Profil</a>
                <a href="pages/hakkimizda.html" class="menu-item link-item"><i class="fa-solid fa-circle-info"></i> Hakkımızda</a>
                <div style="margin-top:10px; border-top:1px solid #333;"></div>
                <div class="menu-item link-item" onclick="window.handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Çıkış</div>
            `;
        }
    } else {
        if(bar) bar.classList.remove('visible'); 
        if(menu) menu.innerHTML = `<div class="menu-item highlight" onclick="document.getElementById('authModal').style.display='flex'"><i class="fa-solid fa-user-plus"></i> Giriş Yap</div>`;
    }
}

export function parseJwt(token) {
    try {
        return JSON.parse(decodeURIComponent(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch(e){ return {} }
}

export async function verifyBackendToken(credential) {
    try {
        const res = await fetch(`${BASE_DOMAIN}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: credential })
        });
        const data = await res.json();
        if (data.token) localStorage.setItem("auth_token", data.token);
    } catch (e) { console.error("Backend Auth Error", e); }
}
