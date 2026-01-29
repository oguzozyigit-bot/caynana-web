// FILE: /js/menu_history_ui.js
// FINAL+++ (LIVE UPDATE + SHOPPING + REGL (KADIN) + TEAM BUTTON + NAV FIX)
// ✅ Alışveriş butonu eklendi
// ✅ Cinsiyet "Kadin/Kadın/female" ise Regl Takip eklendi
// ✅ Profilde team varsa butonda takım adıyla gösterildi (pages/clup.html)
// ✅ Yeni sohbet / başlık oluşunca MENÜ anında güncellenir (caynana:chats-updated dinleniyor)
// ✅ Eski sohbet tıklayınca chat.html açılır ve doğru sohbet yüklenir (current chat persist)
// ✅ Silince listeden anında gider
import { ChatStore } from "./chat_store.js";

const $ = (id) => document.getElementById(id);

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function short15(s = "") {
  const t = String(s).trim();
  if (!t) return "";
  return t.length > 15 ? t.slice(0, 15) + "…" : t;
}

function confirmDelete() {
  return confirm("Sohbetiniz kalıcı olarak silenecek. Eminmisin evladım?");
}

function getUserProfile() {
  try { return JSON.parse(localStorage.getItem("caynana_user_v1") || "{}"); }
  catch { return {}; }
}

function isFemaleGender(g) {
  const s = String(g || "").toLowerCase().trim();
  return ["kadin", "kadın", "female", "woman", "f"].includes(s);
}

function safeHref(path) {
  // burada dosya var mı yok mu kontrol etmiyoruz; sadece normalize ediyoruz
  const p = String(path || "").trim();
  if (!p) return "/";
  return p.startsWith("/") ? p : ("/" + p);
}

function goChatWith(chatId) {
  try {
    if (chatId) ChatStore.setCurrent(chatId); // current chat persist
  } catch {}
  // her zaman chat sayfasına git
  location.href = "/pages/chat.html";
}

function renderFallbackMenus() {
  const asistan = $("menuAsistan");
  const astro = $("menuAstro");
  const kur = $("menuKurumsal");
  const p = getUserProfile();

  const team = String(p.team || "").trim();
  const gender = p.gender || p.cinsiyet;

  // ASİSTAN
  if (asistan && asistan.children.length === 0) {
    let extra = "";

    // ✅ Alışveriş (sende yoktu)
    extra += `
      <div class="menu-action" onclick="location.href='${safeHref("/pages/alisveris.html")}'">
        <div class="ico">🛍️</div><div><div>Alışveriş</div></div>
      </div>
    `;

    // ✅ Regl (sadece kadın)
    if (isFemaleGender(gender)) {
      extra += `
        <div class="menu-action" onclick="location.href='${safeHref("/pages/regl.html")}'">
          <div class="ico">🩸</div><div><div>Regl Takip</div></div>
        </div>
      `;
    }

    // ✅ Takım (profilde varsa butonda takım adı)
    if (team) {
      extra += `
        <div class="menu-action" onclick="location.href='${safeHref("/pages/clup.html")}'">
          <div class="ico">⚽</div><div><div>${esc(team)}</div></div>
        </div>
      `;
    }

    asistan.innerHTML = `
      <div class="menu-action" onclick="location.href='${safeHref("/pages/chat.html")}'"><div class="ico">💬</div><div><div>Sohbet</div></div></div>
      ${extra}
      <div class="menu-action" onclick="location.href='${safeHref("/pages/diyet.html")}'"><div class="ico">🥗</div><div><div>Diyet</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/health.html")}'"><div class="ico">❤️</div><div><div>Sağlık</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/translate.html")}'"><div class="ico">🌍</div><div><div>Tercüman</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/gossip.html")}'"><div class="ico">🗣️</div><div><div>Dedikodu Kazanı</div></div></div>
    `;
  }

  // ASTRO
  if (astro && astro.children.length === 0) {
    astro.innerHTML = `
      <div class="menu-action" onclick="location.href='${safeHref("/pages/fal.html")}'"><div class="ico">☕</div><div><div>Kahve Falı</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/tarot.html")}'"><div class="ico">🃏</div><div><div>Tarot</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/dream.html")}'"><div class="ico">👁️</div><div><div>Rüya Tabiri</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/astro.html")}'"><div class="ico">♈</div><div><div>Günlük Burç</div></div></div>
    `;
  }

  // KURUMSAL
  if (kur && kur.children.length === 0) {
    kur.innerHTML = `
      <div class="menu-action" onclick="location.href='${safeHref("/pages/membership.html")}'"><div class="ico">⭐</div><div><div>Üyelik</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/hakkimizda.html")}'"><div class="ico">ℹ️</div><div><div>Hakkımızda</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/sss.html")}'"><div class="ico">❓</div><div><div>Sık Sorulan Sorular</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/gizlilik.html")}'"><div class="ico">🔒</div><div><div>Gizlilik</div></div></div>
      <div class="menu-action" onclick="location.href='${safeHref("/pages/iletisim.html")}'"><div class="ico">☎️</div><div><div>İletişim</div></div></div>
    `;
  }
}

function renderHistory() {
  const listEl = $("historyList");
  if (!listEl) return;

  const items = ChatStore.list(); // son 10

  listEl.innerHTML = "";
  if (!items.length) return;

  items.forEach((c) => {
    const isActive = ChatStore.currentId === c.id;

    const title = short15(c.title || "");
    const row = document.createElement("div");
    row.className = "history-row";
    row.dataset.chatId = c.id;

    row.innerHTML = `
      <div class="history-title" title="${esc(c.title || "")}">${esc(title || "Sohbet")}</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <div class="history-del" data-act="edit" title="Başlığı Düzenle">✏️</div>
        <div class="history-del" data-act="del" title="Sohbeti Sil">🗑️</div>
      </div>
    `;

    if (isActive) row.style.borderColor = "rgba(190,242,100,.45)";

    // ✅ tıkla: sohbeti seç + chat sayfasına git
    row.addEventListener("click", (e) => {
      const act = e.target?.getAttribute?.("data-act");
      if (act) return;
      goChatWith(c.id);
    });

    // edit
    row.querySelector('[data-act="edit"]').addEventListener("click", (e) => {
      e.stopPropagation();
      const curTitle = c.title || "";
      const newTitle = prompt("Sohbet başlığını yaz (Enter ile kaydet):", curTitle);
      if (newTitle === null) return;
      const cleaned = String(newTitle).trim();
      if (!cleaned) return;
      ChatStore.renameChat?.(c.id, cleaned);
      renderHistory();
    });

    // delete
    row.querySelector('[data-act="del"]').addEventListener("click", (e) => {
      e.stopPropagation();
      if (!confirmDelete()) return;
      ChatStore.deleteChat(c.id);
      renderHistory();

      // ✅ chat sayfasındaysak, silinen sohbet ekrandan gitsin diye yönlendir
      if (location.pathname.endsWith("/pages/chat.html")) {
        goChatWith(ChatStore.currentId);
      }
    });

    listEl.appendChild(row);
  });
}

export function initMenuHistoryUI() {
  // store init
  try { ChatStore.init(); } catch {}

  // fallback menüler (boşsa doldur)
  renderFallbackMenus();
  renderHistory();

  // ✅ live update: yeni mesaj başlığı oluşunca / silince anında güncelle
  window.removeEventListener("caynana:chats-updated", renderHistory);
  window.addEventListener("caynana:chats-updated", () => {
    try { ChatStore.init(); } catch {}
    renderHistory();
  });

  // Yeni sohbet butonu
  const newBtn = $("newChatBtn");
  if (newBtn) {
    newBtn.onclick = () => {
      ChatStore.newChat();
      renderHistory();
      // ✅ direkt chat’e git ve yeni sohbet başlat
      goChatWith(ChatStore.currentId);
    };
  }
}
