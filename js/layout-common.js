// FILE: /js/layout-common.js  (REPLACE ALL)
// PURPOSE: Build bottom quick menu items with minimal SVG icons + active state
document.addEventListener("DOMContentLoaded", () => {

  // ✅ bottom bar: mevcut HTML içindeki .assistant-bar’ı doldur
  const bar = document.getElementById("assistantBar");
  if(bar){
    const items = [
      { label:"Sohbet",     href:"/pages/chat.html",    icon:"chat" },
      { label:"Alışveriş",  href:"/pages/translate.html", icon:"bag" },
      { label:"Tercüman",   href:"/pages/profil.html",  icon:"globe" },
      { label:"Dedikodu",   href:"/pages/gossip.html",  icon:"spark" },
      { label:"Diyet",      href:"/pages/diyet.html",   icon:"leaf" },
      { label:"Sağlık",     href:"/pages/health.html",  icon:"heart" },
      { label:"Kahve",      href:"/pages/fal.html",     icon:"cup" },
      { label:"Tarot",      href:"/pages/tarot.html",   icon:"cards" },
      { label:"Rüya",       href:"/pages/dream.html",   icon:"eye" },
      { label:"Burç",       href:"/pages/astro.html",   icon:"star" },
    ];

    const iconSvg = (name) => {
      const map = {
        chat: `<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8"/><path d="M8 13h6"/></svg>`,
        bag: `<svg viewBox="0 0 24 24"><path d="M6 7h14l-1.2 14H7.2z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>`,
        globe:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3.5 3 14 0 18"/><path d="M12 3c-3 3.5-3 14 0 18"/></svg>`,
        spark:`<svg viewBox="0 0 24 24"><path d="M12 2l1.2 4.3L17.5 8l-4.3 1.2L12 13.5l-1.2-4.3L6.5 8l4.3-1.7z"/><path d="M19 13l.7 2.5L22 16l-2.3.7L19 19l-.7-2.3L16 16l2.3-.5z"/></svg>`,
        leaf:`<svg viewBox="0 0 24 24"><path d="M4 14c6-10 14-8 16-8-1 12-9 16-16 16 0-2 0-5 0-8z"/><path d="M7 17c3-3 6-5 12-8"/></svg>`,
        heart:`<svg viewBox="0 0 24 24"><path d="M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11z"/></svg>`,
        cup:`<svg viewBox="0 0 24 24"><path d="M4 3h13v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M17 6h2a3 3 0 0 1 0 6h-2"/><path d="M4 21h16"/></svg>`,
        cards:`<svg viewBox="0 0 24 24"><rect x="7" y="3" width="12" height="18" rx="2"/><path d="M5 7V5a2 2 0 0 1 2-2"/><path d="M9 8h6"/><path d="M9 12h6"/></svg>`,
        eye:`<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>`,
        star:`<svg viewBox="0 0 24 24"><path d="M12 2l2.6 7.5H22l-6 4.2 2.3 7.3L12 16.7 5.7 21l2.3-7.3-6-4.2h7.4z"/></svg>`,
      };
      return map[name] || map.chat;
    };

    bar.innerHTML = items.map(it => `
      <div class="assistant-item" data-go="${it.href}">
        <div class="ico-wrap">${iconSvg(it.icon)}</div>
        <div class="lbl">${it.label}</div>
      </div>
    `).join("");

    // click
    bar.querySelectorAll(".assistant-item").forEach(el=>{
      el.addEventListener("click", ()=>{
        const go = el.getAttribute("data-go");
        if(go) location.href = go;
      });
    });

    // active
    const path = location.pathname || "";
    bar.querySelectorAll(".assistant-item").forEach(el=>{
      const go = el.getAttribute("data-go") || "";
      const active = go && path.endsWith(go);
      el.classList.toggle("active", !!active);
    });
  }

  // hamburger aç/kapa (varsa)
  const hamb = document.getElementById("hambBtn");
  const overlay = document.getElementById("menuOverlay");
  if(hamb && overlay){
    hamb.addEventListener("click", ()=> overlay.classList.add("open"));
    overlay.addEventListener("click", (e)=> { if(e.target === overlay) overlay.classList.remove("open"); });
  }
});
