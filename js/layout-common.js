// FILE: /js/layout-common.js
// FINAL - BARLARA DOKUNMAZ: sadece içerik mount eder
// ✅ assistantBar: 10 ikon, sadece aktif label görünür
// ✅ SP sync: tek kaynak sp_score -> ypFill/ypNum günceller (tüm sayfalarda)
// ✅ hamburger open/close
// ✅ menuAsistan / menuAstro / menuKurumsal doldurur (koşullu: regl, özel günler, takım)

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // ----------------------------
  // Helpers: localStorage profile
  // ----------------------------
  function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }

  // Tek kaynağa yakın okuma: önce caynana_user_v1, sonra STORAGE_KEY olabilecek adaylar
  function getUserLocal(){
    const candidates = [
      "caynana_user_v1",
      "caynana_profile_v1",
      "caynana_user",
      "caynana_user_v2",
      "caynana_profile",
      "STORAGE_KEY", // bazen yanlışlıkla key adıyla kaydediliyor
    ];

    // Önce bilinenler
    for (const k of candidates){
      const obj = safeJson(localStorage.getItem(k), null);
      if (obj && typeof obj === "object" && Object.keys(obj).length) return obj;
    }

    // En son: localStorage’da sp_score içeren bir json bulmaya çalış
    try{
      for (let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        if(!key) continue;
        const raw = localStorage.getItem(key) || "";
        if(raw && raw[0] === "{"){
          const obj = safeJson(raw, null);
          if(obj && typeof obj === "object" && ("sp_score" in obj || "plan" in obj || "user_id" in obj)) return obj;
        }
      }
    }catch{}

    return {};
  }

  // ----------------------------
  // ✅ SP Sync (tek yer)
  // ----------------------------
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function setSamimiyetUI(score){
    const s = clamp(parseInt(score || 0, 10) || 0, 0, 100);
    const fill = $("ypFill");
    const num  = $("ypNum");
    if(fill) fill.style.width = `${s}%`;
    if(num)  num.textContent = `${s}/100`;
  }

  function syncSP(){
    const u = getUserLocal();
    if (u && (u.sp_score !== undefined && u.sp_score !== null)) {
      setSamimiyetUI(u.sp_score);
    }
  }

  // Sayfa açılışında bir kez
  syncSP();

  // Diğer scriptler sp_score’ı güncellerse, aynı tab’da da anında güncellensin:
  window.addEventListener("storage", (e) => {
    if(!e || !e.key) return;
    if (String(e.key).includes("caynana") || String(e.key).includes("profile") || String(e.key).includes("STORAGE")) {
      syncSP();
    }
  });

  // ----------------------------
  // ✅ assistantBar (10 ikon)
  // ----------------------------
  const bar = $("assistantBar");

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

  const barItems = [
    { label:"Sohbet",     href:"/pages/chat.html",      icon:"chat"  },
    { label:"Alışveriş",  href:"/pages/translate.html", icon:"bag"   },
    { label:"Tercüman",   href:"/pages/profil.html",    icon:"globe" },
    { label:"Dedikodu",   href:"/pages/gossip.html",    icon:"spark" },
    { label:"Diyet",      href:"/pages/diyet.html",     icon:"leaf"  },
    { label:"Sağlık",     href:"/pages/health.html",    icon:"heart" },
    { label:"Kahve",      href:"/pages/fal.html",       icon:"cup"   },
    { label:"Tarot",      href:"/pages/tarot.html",     icon:"cards" },
    { label:"Rüya",       href:"/pages/dream.html",     icon:"eye"   },
    { label:"Burç",       href:"/pages/astro.html",     icon:"star"  },
  ];

  function setBarLabelsVisibility(){
    if(!bar) return;
    bar.querySelectorAll(".assistant-item").forEach(el=>{
      const isActive = el.classList.contains("active");
      const lbl = el.querySelector(".lbl");
      if(lbl) lbl.style.display = isActive ? "block" : "none";
    });
  }

  if (bar) {
    bar.innerHTML = barItems.map(it => `
      <div class="assistant-item" data-go="${it.href}">
        <div class="ico-wrap">${iconSvg(it.icon)}</div>
        <div class="lbl">${it.label}</div>
      </div>
    `).join("");

    bar.querySelectorAll(".assistant-item").forEach(el=>{
      el.addEventListener("click", ()=>{
        const go = el.getAttribute("data-go");
        if(go) location.href = go;
      });
    });

    const path = location.pathname || "";
    bar.querySelectorAll(".assistant-item").forEach(el=>{
      const go = el.getAttribute("data-go") || "";
      el.classList.toggle("active", go && path.endsWith(go));
    });

    // sadece aktif olan label
    setBarLabelsVisibility();
  }

  // ----------------------------
  // ✅ Hamburger open/close (aynı davranış)
  // ----------------------------
  const hamb = $("hambBtn");
  const overlay = $("menuOverlay");
  if(hamb && overlay){
    hamb.addEventListener("click", ()=> overlay.classList.add("open"));
    overlay.addEventListener("click", (e)=> { if(e.target === overlay) overlay.classList.remove("open"); });
  }

  // ----------------------------
  // ✅ Hamburger menü modülleri mount
  // (Üst/alt bar tasarımına dokunmaz, sadece içerik doldurur)
  // ----------------------------
  function menuButtonHTML(label, href, emoji){
    return `
      <div class="menu-action" data-go="${href}">
        <div class="ico">${emoji}</div>
        <div><div>${label}</div></div>
      </div>
    `;
  }

  function hasAnySpecialDays(u){
    // senin kuralın: eş doğum günü / yıldönümü / nişan / çocuk doğum günü vb doluysa göster
    const keys = [
      "spouse_birthday",
      "wedding_anniversary",
      "engagement_anniversary",
      "child_birthdays",
      "child_birthday",
      "special_days"
    ];
    return keys.some(k => {
      const v = u?.[k];
      if(!v) return false;
      if(typeof v === "string") return !!v.trim();
      if(Array.isArray(v)) return v.length > 0;
      if(typeof v === "object") return Object.keys(v).length > 0;
      return false;
    });
  }

  function mountHamburgerModules(){
    const u = getUserLocal();

    const menuAsistan = $("menuAsistan");
    const menuAstro = $("menuAstro");
    const menuKurumsal = $("menuKurumsal");

    if(menuAsistan){
      let html = "";
      html += menuButtonHTML("Sohbet", "/pages/chat.html", "💬");
      html += menuButtonHTML("Alışveriş", "/pages/translate.html", "🛒");
      html += menuButtonHTML("Tercüman", "/pages/profil.html", "🌍");
      html += menuButtonHTML("Dedikodu Kazanı", "/pages/gossip.html", "🫖");
      html += menuButtonHTML("Diyet", "/pages/diyet.html", "🥗");
      html += menuButtonHTML("Sağlık", "/pages/health.html", "❤️");

      // Regl: sadece kadınsa
      const gender = String(u?.gender || u?.Gender || "").toLowerCase();
      const isWoman = gender.includes("kad") || gender.includes("woman") || gender === "f";
      if (isWoman) {
        html += menuButtonHTML("Regl Takip", "/pages/regl.html", "🩸");
      }

      // Özel günler: koşullu
      if (hasAnySpecialDays(u)) {
        html += menuButtonHTML("Özel Günler", "/pages/specialdays.html", "🎉");
      }

      // Takım: profilde varsa
      const team = String(u?.team || "").trim();
      if (team) {
        html += menuButtonHTML(team, "/pages/clup.html", "⚽");
      }

      menuAsistan.innerHTML = html;
    }

    if(menuAstro){
      let html = "";
      html += menuButtonHTML("Kahve Falı", "/pages/fal.html", "☕");
      html += menuButtonHTML("Tarot", "/pages/tarot.html", "🃏");
      html += menuButtonHTML("Rüya Tabiri", "/pages/dream.html", "👁️");
      html += menuButtonHTML("Günlük Burç", "/pages/astro.html", "♈");
      menuAstro.innerHTML = html;
    }

    if(menuKurumsal){
      let html = "";
      html += menuButtonHTML("Üyelik", "/pages/membership.html", "💎");
      html += menuButtonHTML("Hakkımızda", "/pages/hakkimizda.html", "ℹ️");
      html += menuButtonHTML("Sık Sorulan Sorular", "/pages/sss.html", "❓");
      html += menuButtonHTML("Gizlilik", "/pages/gizlilik.html", "🔒");
      html += menuButtonHTML("İletişim", "/pages/iletisim.html", "📩");
      menuKurumsal.innerHTML = html;
    }

    // Tıklamalar
    document.querySelectorAll(".menu-action[data-go]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const go = btn.getAttribute("data-go");
        if(go) location.href = go;
      });
    });
  }

  mountHamburgerModules();

  // ----------------------------
  // ✅ Profil kısayol metni (Google ad soyad)
  // ----------------------------
  try{
    const u = getUserLocal();
    const nm = $("profileShortcutName");
    if(nm){
      const name = u?.fullname || u?.name || u?.display_name || "—";
      nm.textContent = String(name);
    }
    const ico = $("profileShortcutIco");
    if(ico){
      const pic = u?.picture || u?.avatar || u?.avatar_url;
      if(pic) ico.innerHTML = `<img src="${pic}" alt="avatar" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    }
  }catch{}
});
