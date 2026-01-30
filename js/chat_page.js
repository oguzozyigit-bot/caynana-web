// FILE: /js/chat_page.js
// FINAL (SCROLL FIX + AUTO-FOLLOW)
// ✅ Scroll artık “kilitlenmez”
// ✅ WhatsApp mantığı: Kullanıcı alttaysa otomatik takip, yukarı çıktıysa bırak
// ✅ Dosya ekleme + mic + history aynı şekilde çalışır

import { fetchTextResponse } from "./chat.js";
import { ChatStore } from "./chat_store.js";

// Login zorunlu: token yoksa index'e yolla
const t = (localStorage.getItem("google_id_token") || "").trim();
if (!t) {
  window.location.href = "/index.html";
}

const $ = (id) => document.getElementById(id);

const sidebar = $("sidebar");
const menuToggle = $("menuToggle");
const historyList = $("historyList");
const newChatBtn = $("newChatBtn");

const messages = $("messagesContainer");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");

const fileInput = $("fileInput");
const attachBtn = $("attachBtn");

const filePreview = $("filePreview");
const fileName = $("fileName");

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

if (messages) {
  messages.addEventListener("scroll", () => {
    follow = isNearBottom();
  }, { passive: true });
}

function scrollBottom(force = false) {
  if (!messages) return;
  if (force || follow) {
    messages.scrollTop = messages.scrollHeight;
  }
}

// ------------------------
// UI helpers
// ------------------------
function bubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role === "user" ? "user" : "bot"}`;
  div.textContent = text;
  messages.appendChild(div);
  scrollBottom(false);
  return div;
}

function typingIndicator() {
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
  const hasText = !!(msgInput.value || "").trim();
  const hasFile = !!pendingFile;
  sendBtn.classList.toggle("active", hasText || hasFile);
}

function autoGrow() {
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 150) + "px";
}

// ------------------------
// Sidebar (last 10 chats)
// ------------------------
function renderHistory() {
  historyList.innerHTML = "";

  const items = ChatStore.list(); // son 10

  items.forEach((c) => {
    const row = document.createElement("div");
    row.className = "chat-item" + (ChatStore.currentId === c.id ? " active" : "");
    row.title = c.title || "Sohbet";

    row.innerHTML = `
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${c.title || "Sohbet"}</span>
      <button class="del-btn" title="Sil"><i class="fa-solid fa-trash"></i></button>
    `;

    row.addEventListener("click", () => {
      ChatStore.currentId = c.id;
      loadCurrentChat();
      renderHistory();
      sidebar.classList.remove("open");
    });

    row.querySelector(".del-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      ChatStore.deleteChat(c.id);
      loadCurrentChat();
      renderHistory();
    });

    historyList.appendChild(row);
  });
}

function loadCurrentChat() {
  messages.innerHTML = "";
  const h = ChatStore.history() || [];

  if (h.length === 0) {
    messages.innerHTML = `
      <div style="text-align:center; margin-top:20vh; color:#444;">
        <i class="fa-solid fa-comments" style="font-size:48px; margin-bottom:20px; color:#333;"></i>
        <h3>Ne lazım evladım?</h3>
        <p style="font-size:13px; color:#666; margin-top:10px;">Sen sor, ben hallederim.</p>
      </div>
    `;
    // boş sayfada da altta takip açık kalsın
    follow = true;
    return;
  }

  h.forEach((m) => bubble(m.role, m.content));
  // geçmiş yüklenince en alta git (force)
  follow = true;
  scrollBottom(true);
}

function storeHistoryAsRoleContent() {
  const h = ChatStore.history() || [];
  return h.map((x) => ({ role: x.role, content: x.content }));
}

// ------------------------
// File attach
// ------------------------
function clearFile() {
  pendingFile = null;
  if (fileInput) fileInput.value = "";
  if (filePreview) filePreview.style.display = "none";
  setSendActive();
}
window.clearFile = clearFile;

attachBtn?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  pendingFile = f;
  if (fileName) fileName.textContent = f.name;
  if (filePreview) filePreview.style.display = "flex";
  setSendActive();
});

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
  const text = (msgInput.value || "").trim();
  if (!text && !pendingFile) return;

  // Welcome temizle (ilk gerçek mesajda)
  const h0 = ChatStore.history() || [];
  if (h0.length === 0) messages.innerHTML = "";

  // Dosya varsa önce meta olarak ekle (şimdilik upload yok)
  if (pendingFile) {
    const meta = `[DOSYA] ${pendingFile.name}`;
    bubble("user", `📎 ${pendingFile.name}`);
    ChatStore.add("user", meta);
    pendingFile = null;
    if (filePreview) filePreview.style.display = "none";
  }

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
    const out = await fetchTextResponse(text || "Dosya eklendi", "chat", storeHistoryAsRoleContent());
    reply = out?.text || reply;
  } catch {}

  try { loader.remove(); } catch {}
  bubble("assistant", reply);
  ChatStore.add("assistant", reply);

  renderHistory();

  // ✅ Mesaj sonrası: eğer kullanıcı alttaysa takip, değilse bırak
  scrollBottom(false);
}

// ------------------------
// Events
// ------------------------
menuToggle?.addEventListener("click", () => sidebar.classList.toggle("open"));
newChatBtn?.addEventListener("click", () => {
  ChatStore.newChat();
  loadCurrentChat();
  renderHistory();
  sidebar.classList.remove("open");
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
