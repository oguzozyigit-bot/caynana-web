// FILE: /js/menu_history_ui.js
// ✅ Chat’e ASLA dokunmaz
// ✅ Event listener yalnız 1 kere bağlanır
// ✅ History click: ChatStore.setCurrent(id) + chat.html’e gider
// ✅ Delete/Rename: UI anında güncellenir
// ✅ Kalem: satır içinde input açar, Enter kaydeder, Esc iptal
// ✅ Profil: isim + resim garanti görünür

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
   PROFİL OKU + PROFİL KISAYOLUNU BOYA (İSİM/RESİM)
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
   MENÜYE EKSİKSE EKLE
   ========================================================= */
function hasMenuItem(root, href){
  if(!root) return false;
  return Array.from(root.querySelectorAll(".menu-action"))
    .some(el => (el.getAttribute("data-href") || "") === href);
}

function addMenuItem(root, ico, label, href){
  if(!root || hasMenuItem(root, href)) return;

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
   FALLBACK + DİNAMİK MENÜLER
   ========================================================= */
function renderFallbackMenus(){
  const asistan = $("menuAsistan");
  const astro   = $("menuAstro");
  const kur     = $("menuKurumsal");

  const p = getProfile();
  const gender = String(p.gender || p.cinsiyet || "").toLowerCase().trim();
  const team   = String(p.team || "").trim();

  const isFemale = ["kadın","kadin","female","woman","f"].includes(gender);

  /* ---- ASİSTAN ---- */
  if(asistan){
    addMenuItem(asistan, "💬", "Sohbet", "/pages/chat.html");

    // ✅ KURAL: Alışveriş -> /pages/translate.html
    addMenuItem(asistan, "🛍️", "Alışveriş", "/pages/translate.html");

    // ✅ KURAL: Tercüman -> /pages/profil.html (sen böyle istedin)
    addMenuItem(asistan, "🌍", "Tercüman", "/pages/profil.html");

    addMenuItem(asistan, "🗣️", "Dedikodu Kazanı", "/pages/gossip.html");
    addMenuItem(asistan, "🥗", "Diyet", "/pages/diyet.html");
    addMenuItem(asistan, "❤️", "Sağlık", "/pages/health.html");

    if(isFemale){
      addMenuItem(asistan, "🩸", "Regl Takip", "/pages/regl.html");
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
   GEÇMİŞ SOHBETLER (inline edit)
   ========================================================= */
let editingId = null;

function renderHistory(){
  const listEl = $("historyList");
  if(!listEl) return;

  const items = ChatStore.list();
  listEl.innerHTML = "";

  items.forEach((c)=>{
    const row = document.createElement("div");
    row.className = "history-row";
    row.dataset.chatId = c.id;

    const isEditing = (editingId === c.id);

    row.innerHTML = `
      <div style="flex:1;min-width:0;">
        ${
          isEditing
            ? `<input class="history-edit" data-edit="${c.id}" value="${esc(c.title || "")}"
                 style="width:100%; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10);
                        color:#fff; border-radius:12px; padding:10px 10px; font-weight:900; outline:none;" />`
            : `<div class="history-title" title="${esc(c.title || "")}">${esc(short15(c.title) || "Sohbet")}</div>`
        }
      </div>

      <div style="display:flex; gap:8px; flex-shrink:0;">
        <div class="history-del" data-act="edit" title="Başlığı Düzenle">✏️</div>
        <div class="history-del" data-act="del" title="Sohbeti Sil">🗑️</div>
      </div>
    `;

    // sohbet aç
    row.addEventListener("click",(e)=>{
      const act = e.target?.getAttribute?.("data-act");
      const isInp = e.target?.getAttribute?.("data-edit");
      if(act || isInp) return;

      ChatStore.setCurrent(c.id);
      const overlay = $("menuOverlay");
      if(overlay) overlay.classList.remove("open");
      location.href = "/pages/chat.html";
    });

    // edit toggle
    row.querySelector('[data-act="edit"]')?.addEventListener("click", (e)=>{
      e.stopPropagation();
      editingId = (editingId === c.id) ? null : c.id;
      renderHistory();

      // focus
      setTimeout(()=>{
        const inp = listEl.querySelector(`input[data-edit="${c.id}"]`);
        inp?.focus?.();
        inp?.select?.();
      }, 20);
    });

    // delete (confirm + force)
    row.querySelector('[data-act="del"]')?.addEventListener("click",(e)=>{
      e.stopPropagation();
      if(!confirmDelete()) return;
      ChatStore.deleteChat(c.id, true); // ✅ force
      renderHistory();
    });

    listEl.appendChild(row);

    // input events (enter/esc)
    if(isEditing){
      setTimeout(()=>{
        const inp = listEl.querySelector(`input[data-edit="${c.id}"]`);
        if(!inp) return;

        inp.addEventListener("keydown", (ev)=>{
          if(ev.key === "Escape"){
            editingId = null;
            renderHistory();
          }
          if(ev.key === "Enter"){
            ev.preventDefault();
            const v = String(inp.value || "").trim();
            if(v) ChatStore.renameChat(c.id, v);
            editingId = null;
            renderHistory();
          }
        });
      }, 0);
    }
  });
}

/* =========================================================
   INIT (tek listener, tek bağlama)
   ========================================================= */
function getUIState(){
  if(!window.__CAYNANA_MENU_UI__) window.__CAYNANA_MENU_UI__ = { bound:false };
  return window.__CAYNANA_MENU_UI__;
}

export function initMenuHistoryUI(){
  try { ChatStore.init(); } catch {}

  paintProfileShortcut();
  renderFallbackMenus();
  renderHistory();

  // Yeni sohbet butonu
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

  // canlı güncelleme
  const st = getUIState();
  if(!st.bound){
    st.bound = true;
    window.addEventListener("caynana:chats-updated", ()=>{
      try { ChatStore.init(); } catch {}
      paintProfileShortcut();
      renderHistory();
    });
  }
}
