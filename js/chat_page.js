// js/chat_page.js (FINAL - Bu sayfa için özel controller)
// Gerekenler: /js/chat.js, /js/chat_store.js, /js/config.js (STORAGE_KEY)
// Login zorunlu: token yoksa index'e yolla
const t = (localStorage.getItem("google_id_token") || "").trim();
if (!t) {
  window.location.href = "/index.html";
}
import { fetchTextResponse } from "./chat.js";
import { ChatStore } from "./chat_store.js";

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
// UI helpers
// ------------------------
function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function clearWelcomeIfNeeded() {
  // İçeride message bubble varsa welcome'ı temizle
  const hasBubble = messages.querySelector(".bubble");
  if (hasBubble) return;

  // Eğer store boş değilse welcome'ı temizleyelim
  const h = ChatStore.history();
  if (h && h.length) {
    messages.innerHTML = "";
  }
}

function bubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role === "user" ? "user" : "bot"}`;
  div.textContent = text;
  messages.appendChild(div);
  scrollBottom();
  return div;
}

function typingIndicator() {
  const div = document.createElement("div");
  div.className = "bubble bot";
  div.innerHTML = `<span class="typing-indicator">
      <span></span><span></span><span></span>
    </span>`;
  messages.appendChild(div);
  scrollBottom();
  return div;
}

function setSendActive() {
  const hasText = !!(msgInput.value || "").trim();
  sendBtn.classList.toggle("active", hasText);
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
  // Store'dan yükle
  messages.innerHTML = "";
  const h = ChatStore.history() || [];

  // Welcome ekranını ancak tamamen boşsa göster
  if (h.length === 0) {
    // HTML'deki welcome kalıbını tekrar bas (aynı görünüm kalsın)
    messages.innerHTML = `
      <div style="text-align:center; margin-top:20vh; color:#444;">
        <i class="fa-solid fa-comments" style="font-size:48px; margin-bottom:20px; color:#333;"></i>
        <h3>Ne lazım evladım?</h3>
        <p style="font-size:13px; color:#666; margin-top:10px;">Sen sor, ben hallederim.</p>
      </div>
    `;
    return;
  }

  h.forEach((m) => bubble(m.role, m.content));
}

// ------------------------
// Send flow
// ------------------------
function storeHistoryAsRoleContent() {
  // chat.js normalizeHistory zaten {role,content} bekliyor; store bunu {role,content,at} tutuyor
  const h = ChatStore.history() || [];
  return h.map((x) => ({ role: x.role, content: x.content }));
}

async function send() {
  const text = (msgInput.value || "").trim();
  if (!text && !pendingFile) return;

  // Welcome temizle
  if ((ChatStore.history() || []).length === 0) {
    messages.innerHTML = "";
  }

  // Dosya varsa önce onu mesaj olarak ekle (meta)
  if (pendingFile) {
    const meta = `[DOSYA] ${pendingFile.name}`;
    bubble("user", `📎 ${pendingFile.name} eklendi`);
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

  // loading
  const loader = typingIndicator();

  let reply = "Evladım bir şeyler ters gitti.";
  try {
    const out = await fetchTextResponse(text || "Dosya eklendi", "chat", storeHistoryAsRoleContent());
    reply = out?.text || reply;
  } catch {}

  try { loader.remove(); } catch {}
  bubble("assistant", reply);
  ChatStore.add("assistant", reply);

  // başlık store içinde ilk user mesajında otomatik ayarlanıyor
  renderHistory();
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
// File attach
// ------------------------
function clearFile() {
  pendingFile = null;
  if (fileInput) fileInput.value = "";
  if (filePreview) filePreview.style.display = "none";
}
window.clearFile = clearFile;

attachBtn?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  pendingFile = f;
  if (fileName) fileName.textContent = f.name;
  if (filePreview) filePreview.style.display = "flex";
});

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
