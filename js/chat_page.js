// FILE: /js/chat_page.js
// FINAL (CHAT.html uyumlu ID + SCROLL FIX + AUTO-FOLLOW)
// ✅ messages container: #chat
// ✅ Auto-follow: alttaysan takip, yukarı çıktıysan bırak
// ✅ DOM render sonrası scroll: requestAnimationFrame
// ✅ Wheel/touch parent'ta boğulmaz

import { fetchTextResponse } from "./chat.js";
import { ChatStore } from "./chat_store.js";

// Login zorunlu: token yoksa index'e yolla
const t = (localStorage.getItem("google_id_token") || "").trim();
if (!t) window.location.href = "/index.html";

const $ = (id) => document.getElementById(id);

const sidebar = $("menuOverlay");           // chat.html'de overlay
const menuToggle = $("hambBtn");            // chat.html'de hamburger
const historyList = $("historyList");
const newChatBtn = $("newChatBtn");

// ✅ CHAT container (scroll burada)
const messages = $("chat");

const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");

// chat.html'de attach akışı ayrı (plus sheet + fileCamera/filePhotos/fileFiles)
// Bu dosyada eski attach inputları yok; o yüzden güvenli şekilde yok sayıyoruz.
let pendingFile = null;

// ------------------------
// ✅ SCROLL FIX (AUTO-FOLLOW)
// ------------------------
let follow = true;

function isNearBottom(slack = 140) {
  try {
    return (messages.scrollHeight - messages.scrollTop - messages.clientHeight) < slack;
  } catch {
    return true;
  }
}

function scrollBottom(force = false) {
  if (!messages) return;
  requestAnimationFrame(() => {
    if (!messages) return;
    if (force || follow) messages.scrollTop = messages.scrollHeight;
  });
}

if (messages) {
  // parentların wheel/touch’u yutmasını engelle
  messages.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
  messages.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });

  // follow toggle
  messages.addEventListener("scroll", () => {
    follow = isNearBottom();
  }, { passive: true });
}

// ------------------------
// UI helpers
// ------------------------
function roleToClass(role){
  // ChatStore "assistant" kullanıyor → css bot
  return role === "user" ? "user" : "bot";
}

function bubble(role, text) {
  if (!messages) return null;

  const div = document.createElement("div");
  div.className = `bubble ${roleToClass(role)}`;
  div.textContent = text;

  // boş placeholder varsa temizle (chat.html CSS/empty ve/veya inline boş ekran)
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
// Sidebar (last 10 chats)
// ------------------------
function renderHistory() {
  if (!historyList) return;
  historyList.innerHTML = "";

  const items = ChatStore.list(); // son 10

  items.forEach((c) => {
    const row = document.createElement("div");
    row.className = "history-row" + (ChatStore.currentId === c.id ? " active" : "");
    row.title = c.title || "Sohbet";

    row.innerHTML = `
      <div class="history-title">${c.title || "Sohbet"}</div>
      <button class="history-del" title="Sil">🗑️</button>
    `;

    row.addEventListener("click", () => {
      ChatStore.currentId = c.id;
      loadCurrentChat();
      renderHistory();
      sidebar?.classList.remove("open");
    });

    row.querySelector(".history-del")?.addEventListener("click", (e) => {
      e.stopPropagation();
      ChatStore.deleteChat(c.id);
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
    // chat.html'de sen zaten boş ekran HTML basıyorsun; burada da basıp dataset işaretliyoruz
    messages.innerHTML = `
      <div style="text-align:center; margin-top:20vh; color:#444;">
        <i class="fa-solid fa-comments" style="font-size:48px; margin-bottom:20px; color:#333;"></i>
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

function storeHistoryAsRoleContent() {
  const h = ChatStore.history() || [];
  return h.map((x) => ({ role: x.role, content: x.content }));
}

// ------------------------
// Mic (STT)
// ------------------------
function startSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Tarayıcı mikrofon yazıya çevirme desteklemiyor.");
    return;
  }
  const rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = false;

  rec.onresult = (e) => {
    const t = e.results?.[0]?.[0]?.transcript || "";
    if (t) {
      msgInput.value = (msgInput.value ? msgInput.value + " " : "") + t;
      autoGrow();
      setSendActive();
    }
  };
  rec.start();
}

// ------------------------
// Send flow
// ------------------------
async function send() {
  const text = (msgInput?.value || "").trim();
  if (!text && !pendingFile) return;

  // Welcome temizle
  const h0 = ChatStore.history() || [];
  if (h0.length === 0) messages.innerHTML = "";

  if (text) {
    bubble("user", text);
    ChatStore.add("user", text);
  }

  msgInput.value = "";
  autoGrow();
  setSendActive();

  const loader = typingIndicator();

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const out = await fetchTextResponse(text || "Merhaba", "chat", storeHistoryAsRoleContent());
    reply = out?.text || reply;
  } catch {}

  try { loader?.remove(); } catch {}
  bubble("assistant", reply);
  ChatStore.add("assistant", reply);

  renderHistory();
  scrollBottom(false);
}

// ------------------------
// Events
// ------------------------
menuToggle?.addEventListener("click", () => {
  $("menuOverlay")?.classList.toggle("open");
});

// overlay tıklayınca kapat (sidebar dışına basınca)
$("menuOverlay")?.addEventListener("click", (e) => {
  const sidebarEl = e.currentTarget?.querySelector?.(".menu-sidebar");
  if (!sidebarEl) return;
  if (sidebarEl.contains(e.target)) return;
  e.currentTarget.classList.remove("open");
});

newChatBtn?.addEventListener("click", () => {
  ChatStore.newChat();
  loadCurrentChat();
  renderHistory();
  $("menuOverlay")?.classList.remove("open");
});

sendBtn?.addEventListener("click", send);

msgInput?.addEventListener("input", () => {
  autoGrow();
  setSendActive();
});

msgInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
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
