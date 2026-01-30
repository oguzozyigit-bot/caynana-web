// FILE: /js/chat_page.js
// FINAL (CHAT.html uyumlu + STT AUTO-SEND + SEESAW + HISTORY EDIT/DELETE RULES)

import { fetchTextResponse } from "./chat.js";
import { ChatStore } from "./chat_store.js";

const t = (localStorage.getItem("google_id_token") || "").trim();
if (!t) window.location.href = "/index.html";

const $ = (id) => document.getElementById(id);

const menuOverlay = $("menuOverlay");
const menuToggle = $("hambBtn");
const historyList = $("historyList");
const newChatBtn = $("newChatBtn");

const messages = $("chat");

const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");

const brandWrapper = $("brandWrapper");

let pendingFile = null;

// ------------------------
// Scroll
// ------------------------
let follow = true;
function isNearBottom(slack = 140) {
  try { return (messages.scrollHeight - messages.scrollTop - messages.clientHeight) < slack; }
  catch { return true; }
}
function scrollBottom(force = false) {
  if (!messages) return;
  requestAnimationFrame(() => {
    if (!messages) return;
    if (force || follow) messages.scrollTop = messages.scrollHeight;
  });
}
if (messages) {
  messages.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  messages.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
  messages.addEventListener("scroll", () => { follow = isNearBottom(); }, { passive: true });
}

// ------------------------
// Seesaw
// ------------------------
function setSeesaw(mode = "") {
  if (!brandWrapper) return;
  brandWrapper.classList.remove("usering", "botting", "thinking");
  if (mode) brandWrapper.classList.add(mode);
}
function clearSeesaw() {
  if (!brandWrapper) return;
  brandWrapper.classList.remove("usering", "botting", "thinking");
}

// ------------------------
// UI helpers
// ------------------------
function roleToClass(role){ return role === "user" ? "user" : "bot"; }

function bubble(role, text) {
  if (!messages) return null;
  const div = document.createElement("div");
  div.className = `bubble ${roleToClass(role)}`;
  div.textContent = text;

  if (messages.dataset.empty === "1") {
    messages.innerHTML = "";
    messages.dataset.empty = "0";
  }

  messages.appendChild(div);
  scrollBottom(false);
  return div;
}

function typingIndicator() {
  if (!messages) return null;
  const div = document.createElement("div");
  div.className = "bubble bot";
  div.innerHTML = `
    <span class="typing-indicator">
      <span></span><span></span><span></span>
    </span>
  `;
  messages.appendChild(div);
  scrollBottom(false);
  return div;
}

function setSendActive() {
  const hasText = !!(msgInput?.value || "").trim();
  const hasFile = !!pendingFile;
  sendBtn?.classList.toggle("active", hasText || hasFile);
}

function autoGrow() {
  if (!msgInput) return;
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 150) + "px";
}

// ------------------------
// History UI (kalem + çöp kutusu)
// ------------------------
let editingId = null;

function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = "";

  const items = ChatStore.list(); // son 10

  items.forEach((c) => {
    const row = document.createElement("div");
    row.className = "history-row" + (ChatStore.currentId === c.id ? " active" : "");
    row.title = c.title || "Sohbet";

    const isEditing = (editingId === c.id);

    row.innerHTML = `
      <div style="flex:1; min-width:0;">
        ${
          isEditing
          ? `<input class="history-edit" id="edit_${c.id}" value="${(c.title||"").replace(/"/g,'&quot;')}" 
               style="width:100%; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10);
                      color:#fff; border-radius:12px; padding:10px 10px; font-weight:900; outline:none;" />`
          : `<div class="history-title">${c.title || "Sohbet"}</div>`
        }
      </div>

      <button class="history-edit-btn" title="Başlığı Düzenle"
        style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;
               border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.04); cursor:pointer;">✏️</button>

      <button class="history-del" title="Sil"
        style="width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;
               border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.04); cursor:pointer;">🗑️</button>
    `;

    // row click: sohbet aç (editing değilse)
    row.addEventListener("click", () => {
      if (editingId === c.id) return;
      ChatStore.setCurrent(c.id);
      loadCurrentChat();
      renderHistory();
      menuOverlay?.classList.remove("open");
    });

    // ✏️ edit
    row.querySelector(".history-edit-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (editingId === c.id) {
        // zaten edit modunda -> iptal
        editingId = null;
        renderHistory();
        return;
      }
      editingId = c.id;
      renderHistory();

      // focus
      setTimeout(() => {
        const inp = document.getElementById(`edit_${c.id}`);
        inp?.focus();
        inp?.select?.();
      }, 30);
    });

    // input key events
    if (isEditing) {
      setTimeout(() => {
        const inp = document.getElementById(`edit_${c.id}`);
        if (!inp) return;

        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Escape") {
            editingId = null;
            renderHistory();
          }
          if (ev.key === "Enter") {
            ev.preventDefault();
            const v = String(inp.value || "").trim();
            if (v) {
              ChatStore.renameChat(c.id, v);
            }
            editingId = null;
            renderHistory();
          }
        });
      }, 0);
    }

    // 🗑️ delete with confirm
    row.querySelector(".history-del")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const ok = confirm("Sohbetiniz kalıcı olarak silinecek. Emin misin evladım?");
      if (!ok) return;
      ChatStore.deleteChat(c.id, true);
      loadCurrentChat();
      renderHistory();
    });

    historyList.appendChild(row);
  });
}

function loadCurrentChat() {
  if (!messages) return;

  messages.innerHTML = "";
  const h = ChatStore.history() || [];

  if (h.length === 0) {
    messages.innerHTML = `
      <div style="text-align:center; margin-top:20vh; color:#444;">
        <h3>Ne lazım evladım?</h3>
        <p style="font-size:13px; color:#666; margin-top:10px;">Sen sor, ben hallederim.</p>
      </div>
    `;
    messages.dataset.empty = "1";
    follow = true;
    scrollBottom(true);
    return;
  }

  messages.dataset.empty = "0";
  h.forEach((m) => bubble(m.role, m.content));
  follow = true;
  scrollBottom(true);
}

// ------------------------
// STT
// ------------------------
let __rec = null;
let __sttBusy = false;

function startSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Tarayıcı mikrofon yazıya çevirme desteklemiyor.");
    return;
  }
  if (__sttBusy) return;

  const rec = new SR();
  __rec = rec;
  __sttBusy = true;

  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = false;

  micBtn?.classList.add("listening");

  rec.onresult = (e) => {
    const t = e.results?.[0]?.[0]?.transcript || "";
    if (t) {
      msgInput.value = (msgInput.value ? msgInput.value + " " : "") + t;
      autoGrow();
      setSendActive();
    }
  };

  rec.onend = async () => {
    __sttBusy = false;
    micBtn?.classList.remove("listening");

    const txt = (msgInput?.value || "").trim();
    if (txt) await send(true);
  };

  rec.start();
}

// ------------------------
// Send
// ------------------------
async function send() {
  const text = (msgInput?.value || "").trim();
  if (!text && !pendingFile) return;

  setSeesaw("usering");

  const h0 = ChatStore.history() || [];
  if (h0.length === 0) messages.innerHTML = "";

  if (text) {
    bubble("user", text);
    ChatStore.add("user", text);
  }

  msgInput.value = "";
  autoGrow();
  setSendActive();

  setSeesaw("thinking");
  const loader = typingIndicator();

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const out = await fetchTextResponse(text || "Merhaba", "chat");
    reply = out?.text || reply;
  } catch {}

  try { loader?.remove(); } catch {}

  setSeesaw("botting");
  bubble("assistant", reply);

  // ✅ assistant store yok (chat.js delayed write var)
  renderHistory();
  scrollBottom(false);

  setTimeout(() => clearSeesaw(), 700);
}

// ------------------------
// Events
// ------------------------
menuToggle?.addEventListener("click", () => {
  menuOverlay?.classList.toggle("open");
});

menuOverlay?.addEventListener("click", (e) => {
  const sidebarEl = e.currentTarget?.querySelector?.(".menu-sidebar");
  if (!sidebarEl) return;
  if (sidebarEl.contains(e.target)) return;
  e.currentTarget.classList.remove("open");
});

newChatBtn?.addEventListener("click", () => {
  ChatStore.newChat();
  loadCurrentChat();
  renderHistory();
  menuOverlay?.classList.remove("open");
});

sendBtn?.addEventListener("click", () => send(false));

msgInput?.addEventListener("input", () => {
  autoGrow();
  setSendActive();
  setSeesaw("usering");
  clearTimeout(window.__typingIdle);
  window.__typingIdle = setTimeout(() => clearSeesaw(), 500);
});

msgInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send(false);
  }
});

micBtn?.addEventListener("click", startSTT);

// ------------------------
// Boot
// ------------------------
ChatStore.init();
loadCurrentChat();
renderHistory();
autoGrow();
setSendActive();
scrollBottom(true);
clearSeesaw();

// live update: chat_store emitUpdated event
window.addEventListener("caynana:chats-updated", () => {
  // sadece menü listesi güncellensin
  renderHistory();
});
