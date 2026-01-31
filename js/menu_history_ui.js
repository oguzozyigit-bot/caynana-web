// FILE: /js/menu_history_ui.js
// ✅ Menüler her init'te sıfırlanır (tekrar yok)
// ✅ Hatırlatıcı menüde HER ZAMAN görünür (⏰)
// ✅ Chat’e dokunmaz

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

function getProfile(){
  try{ return JSON.parse(localStorage.getItem("caynana_user_v1") || "{}"); }
  catch{ return {}; }
}

function paintProfileShortcut(){
  const p = getProfile();
  const name = String(p.fullname || p.name || p.display_name || p.email || "—").trim() || "—";
  const pic  = String(p.picture || p.avatar || p.avatar_url || "").trim();

  const nm = $("profileShortcutName");
  if(nm) nm.textContent = name;

  const ico = $("profileShortcutIco");
  if(ico){
    if(pic) ico.innerHTML = `<img src="${pic}" alt="avatar">`;
    else ico.textContent = "👤";
  }
}

function addMenuItem(root, ico, label, href){
  if(!root) return;
  const div = document.createElement("div");
  div.className = "menu-action";
  div.setAttribute("data-href", href);
  div.innerHTML = `
    <div class="ico">${ico}</div>
    <div><div>${esc(label)}</div></div>
  `;
  div.addEventListener("click", ()=> location.href = href);
  root.appendChild(div);
}

function renderMenusFresh(){
  const asistan = $("menuAsistan");
  const astro   = $("menuAstro");
  const kur     = $("menuKurumsal");

  if(asistan) asistan.innerHTML = "";
  if(astro) astro.innerHTML = "";
  if(kur) kur.innerHTML = "";

  const p = getProfile();
  const gender = String(p.gender || p.cinsiyet || "").toLowerCase().trim();
  const team   = String(p.team || "").trim();
  const isFemale = ["kadın","kadin","female","woman","f"].includes(gender);

  if(asistan){
    addMenuItem(asistan, "💬", "Sohbet", "/pages/chat.html");
    addMenuItem(asistan, "🛍️", "Alışveriş", "/pages/alisveris.html");
    addMenuItem(asistan, "🌍", "Tercüman", "/pages/translate.html");
    addMenuItem(asistan, "🗣️", "Dedikodu Kazanı", "/pages/gossip.html");
    addMenuItem(asistan, "🥗", "Diyet", "/pages/diyet.html");
    addMenuItem(asistan, "❤️", "Sağlık", "/pages/health.html");

    // ✅ Hatırlatıcı her zaman görünür
    addMenuItem(asistan, "⏰", "Hatırlatıcı", "/pages/hatirlatici.html");

    if(isFemale){
      addMenuItem(asistan, "🩸", "Regl Takip", "/pages/regl.html");
    }

    if(team){
      addMenuItem(asistan, "⚽", team, "/pages/clup.html");
    }
  }

  if(astro){
    addMenuItem(astro, "☕", "Kahve Falı", "/pages/fal.html");
    addMenuItem(astro, "🃏", "Tarot", "/pages/tarot.html");
    addMenuItem(astro, "👁️", "Rüya Tabiri", "/pages/dream.html");
    addMenuItem(astro, "♈", "Günlük Burç", "/pages/astro.html");
  }

  if(kur){
    addMenuItem(kur, "⭐", "Üyelik", "/pages/membership.html");
    addMenuItem(kur, "ℹ️", "Hakkımızda", "/pages/hakkimizda.html");
    addMenuItem(kur, "❓", "Sık Sorulan Sorular", "/pages/sss.html");
    addMenuItem(kur, "🔒", "Gizlilik", "/pages/gizlilik.html");
    addMenuItem(kur, "☎️", "İletişim", "/pages/iletisim.html");
  }
}

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
      $("menuOverlay")?.classList.remove("open");
      location.href = "/pages/chat.html";
    });

    row.querySelector('[data-act="edit"]').onclick = (e)=>{
      e.stopPropagation();
      const nt = prompt("Sohbet başlığını yaz:", c.title || "");
      if(nt){ ChatStore.renameChat(c.id, nt); renderHistory(); }
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

function getUIState(){
  if(!window.__CAYNANA_MENU_UI__) window.__CAYNANA_MENU_UI__ = { bound:false };
  return window.__CAYNANA_MENU_UI__;
}

export function initMenuHistoryUI(){
  try { ChatStore.init(); } catch {}
  paintProfileShortcut();
  renderMenusFresh();
  renderHistory();

  const btn = $("newChatBtn");
  if(btn && !btn.dataset.__bound){
    btn.dataset.__bound = "1";
    btn.onclick = ()=>{
      ChatStore.newChat();
      $("menuOverlay")?.classList.remove("open");
      location.href = "/pages/chat.html";
    };
  }

  const st = getUIState();
  if(!st.bound){
    st.bound = true;
    window.addEventListener("caynana:chats-updated", ()=>{
      try{ ChatStore.init(); }catch{}
      paintProfileShortcut();
      renderHistory();
      renderMenusFresh();
    });
  }
}
