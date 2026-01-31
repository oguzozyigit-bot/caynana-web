// FILE: /js/menu_history_ui.js
// ✅ Chat’e ASLA dokunmaz
// ✅ Event listener yalnız 1 kere bağlanır
// ✅ History click: ChatStore.setCurrent(id) + chat.html’e gider
// ✅ Delete/Rename: UI anında güncellenir
// ✅ Profil: isim + resim garanti görünür
// ✅ FIX: Menü tekrarlarını bitirir -> menuAsistan/menuAstro/menuKurumsal her init'te sıfırlanır

import { ChatStore } from "./chat_store.js";

const $ = (id) => document.getElementById(id);

function esc(s=""){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function short15(s=""){
  const t = String(s).trim();
  if(!t) return "";
  return t.length > 15 ? t.slice(0,15) + "…" : t;
}

function confirmDelete(){
  return confirm("Sohbetiniz kalıcı olarak silenecek. Emin misin evladım?");
}

/* =========================================================
   PROFİL OKU + PROFİL KISAYOLUNU BOYA
   ========================================================= */
function getProfile(){
  try{
    return JSON.parse(localStorage.getItem("caynana_user_v1") || "{}");
  }catch{
    return {};
  }
}

function paintProfileShortcut(){
  const p = getProfile();

  const name =
    String(p.fullname || p.name || p.display_name || p.email || "—").trim() || "—";

  const pic =
    String(p.picture || p.avatar || p.avatar_url || "").trim();

  const nm = $("profileShortcutName");
  if(nm) nm.textContent = name;

  const ico = $("profileShortcutIco");
  if(ico){
    if(pic){
      ico.innerHTML = `<img src="${pic}" alt="avatar">`;
    }else{
      ico.textContent = "👤";
    }
  }
}

/* =========================================================
   MENÜ ITEM
   ========================================================= */
function addMenuItem(root, ico, label, href){
  if(!root) return;

  const div = document.createElement("div");
  div.className = "menu-action";
  div.setAttribute("data-href", href);
  div.innerHTML = `
    <div class="ico">${ico}</div>
    <div><div>${esc(label)}</div></div>
  `;

  div.addEventListener("click", ()=>{
    location.href = href;
  });

  root.appendChild(div);
}

/* =========================================================
   ÖZEL GÜNLER KOŞULU
   ========================================================= */
function hasAnySpecialDay(p){
  const keys = [
    "spouse_birth_date","spouseBirthday","spouse_birthday",
    "wedding_anniversary","weddingAnniversary","evlilik_yildonumu",
    "engagement_anniversary","engagementAnniversary","nisan_yildonumu",
    "child_birth_dates","childBirthDates","children_birthdays","childBirthdays",
    "special_days","specialDays"
  ];
  for(const k of keys){
    const v = p?.[k];
    if(Array.isArray(v) && v.length) return true;
    if(typeof v === "string" && v.trim()) return true;
    if(v && typeof v === "object" && Object.keys(v).length) return true;
  }
  return false;
}

/* =========================================================
   ✅ FIX: MENÜLERİ SIFIRLA + YENİDEN DOLDUR
   ========================================================= */
function renderMenusFresh(){
  const asistan = $("menuAsistan");
  const astro   = $("menuAstro");
  const kur     = $("menuKurumsal");

  // ✅ KRİTİK: eski statik/legacy satırları da dahil, komple temizle
  if(asistan) asistan.innerHTML = "";
  if(astro) astro.innerHTML = "";
  if(kur) kur.innerHTML = "";

  const p = getProfile();
  const gender = String(p.gender || p.cinsiyet || "").toLowerCase().trim();
  const team   = String(p.team || "").trim();
  const isFemale = ["kadın","kadin","female","woman","f"].includes(gender);

  /* ---- ASİSTAN ---- */
  if(asistan){
    addMenuItem(asistan, "💬", "Sohbet", "/pages/chat.html");
    addMenuItem(asistan, "🛍️", "Alışveriş", "/pages/alisveris.html");
    addMenuItem(asistan, "🌍", "Tercüman", "/pages/translate.html");
    addMenuItem(asistan, "🗣️", "Dedikodu Kazanı", "/pages/gossip.html");
    addMenuItem(asistan, "🥗", "Diyet", "/pages/diyet.html");
    addMenuItem(asistan, "❤️", "Sağlık", "/pages/health.html");

    if(isFemale){
      addMenuItem(asistan, "🩸", "Regl Takip", "/pages/regl.html");
    }

    if(hasAnySpecialDay(p)){
      addMenuItem(asistan, "🎉", "Özel Günler", "/pages/specialdays.html");
    }

    if(team){
      addMenuItem(asistan, "⚽", team, "/pages/clup.html");
    }
  }

  /* ---- ASTRO ---- */
  if(astro){
    addMenuItem(astro, "☕", "Kahve Falı", "/pages/fal.html");
    addMenuItem(astro, "🃏", "Tarot", "/pages/tarot.html");
    addMenuItem(astro, "👁️", "Rüya Tabiri", "/pages/dream.html");
    addMenuItem(astro, "♈", "Günlük Burç", "/pages/astro.html");
  }

  /* ---- KURUMSAL ---- */
  if(kur){
    addMenuItem(kur, "⭐", "Üyelik", "/pages/membership.html");
    addMenuItem(kur, "ℹ️", "Hakkımızda", "/pages/hakkimizda.html");
    addMenuItem(kur, "❓", "Sık Sorulan Sorular", "/pages/sss.html");
    addMenuItem(kur, "🔒", "Gizlilik", "/pages/gizlilik.html");
    addMenuItem(kur, "☎️", "İletişim", "/pages/iletisim.html");
  }
}

/* =========================================================
   GEÇMİŞ SOHBETLER
   ========================================================= */
function renderHistory(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list();
  listEl.innerHTML = "";

  items.forEach((c)=>{
    const row = document.createElement("div");
    row.className = "history-row";
    row.dataset.chatId = c.id;

    row.innerHTML = `
      <div class="history-title" title="${esc(c.title || "")}">${esc(short15(c.title) || "Sohbet")}</div>
      <div style="display:flex; gap:8px;">
        <div class="history-del" data-act="edit" title="Başlığı Düzenle">✏️</div>
        <div class="history-del" data-act="del" title="Sohbeti Sil">🗑️</div>
      </div>
    `;

    row.addEventListener("click",(e)=>{
      const act = e.target?.getAttribute?.("data-act");
      if(act) return;

      ChatStore.setCurrent(c.id);
      const overlay = $("menuOverlay");
      if(overlay) overlay.classList.remove("open");
      location.href = "/pages/chat.html";
    });

    row.querySelector('[data-act="edit"]').onclick = (e)=>{
      e.stopPropagation();
      const nt = prompt("Sohbet başlığını yaz:", c.title || "");
      if(nt){
        ChatStore.renameChat(c.id, nt);
        renderHistory();
      }
    };

    row.querySelector('[data-act="del"]').onclick = (e)=>{
      e.stopPropagation();
      if(!confirmDelete()) return;
      ChatStore.deleteChat(c.id);
      renderHistory();
    };

    listEl.appendChild(row);
  });
}

/* =========================================================
   INIT (tek listener)
   ========================================================= */
function getUIState(){
  if(!window.__CAYNANA_MENU_UI__) window.__CAYNANA_MENU_UI__ = { bound:false };
  return window.__CAYNANA_MENU_UI__;
}

export function initMenuHistoryUI(){
  try { ChatStore.init(); } catch {}

  paintProfileShortcut();

  // ✅ FIX: her init'te menüyü sıfırla ve yeniden çiz
  renderMenusFresh();

  renderHistory();

  const btn = $("newChatBtn");
  if(btn && !btn.dataset.__bound){
    btn.dataset.__bound = "1";
    btn.onclick = ()=>{
      ChatStore.newChat();
      const overlay = $("menuOverlay");
      if(overlay) overlay.classList.remove("open");
      location.href = "/pages/chat.html";
    };
  }

  const st = getUIState();
  if(!st.bound){
    st.bound = true;
    window.addEventListener("caynana:chats-updated", ()=>{
      try { ChatStore.init(); } catch {}
      paintProfileShortcut();
      renderHistory();
      // menüler de güncel kalsın (team/gender/specialdays değişebilir)
      renderMenusFresh();
    });
  }
}
