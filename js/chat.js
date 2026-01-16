/* js/chat.js (v4.1 - MERCEDES CARDS HTML) */
import { BASE_DOMAIN } from "./main.js";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23eeeeee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%23999999'%3EGörsel Yok%3C/text%3E%3C/svg%3E";

export function initChat() {
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");
  if (sendBtn) {
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", sendMessage);
  }
  if (input) {
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
  }
}

function getToken() { return localStorage.getItem("auth_token") || ""; }

async function sendMessage() {
  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  const token = getToken();
  if (!token) { triggerAuth("Evladım önce bir giriş yap, kim olduğunu bileyim."); return; }

  addBubble(txt, "user");
  input.value = "";

  const mode = window.currentAppMode || "chat";
  const loadingId = addLoading("Caynana yazıyor...");

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ message: txt, mode, persona: "normal" }),
    });

    removeById(loadingId);
    if (res.status === 401) { triggerAuth("Evladım süren dolmuş, tekrar giriş yapıver."); return; }
    if (!res.ok) { addBubble("Tansiyonum düştü evladım. (Sunucu Hatası)", "ai"); return; }

    const data = await res.json();
    const botText = data.assistant_text || "Hımm...";
    const products = Array.isArray(data.data) ? data.data : [];

    typeWriterBubble(botText, "ai", () => {
      if ((mode === "shopping" || products.length > 0) && products.length) {
        setTimeout(() => renderProducts(products), 500);
      }
    });

  } catch (err) {
    removeById(loadingId);
    addBubble("İnternet gitti galiba evladım.", "ai");
  }
}

function triggerAuth(msg) {
    addBubble(msg, "ai");
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.style.display = 'flex';
}

function addBubble(text, role = "ai") {
  const container = document.getElementById("chatContainer");
  const wrap = document.createElement("div");
  wrap.className = "msg-row " + (role === "user" ? "user" : "bot");
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + (role === "user" ? "user" : "bot");
  bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTo(0, container.scrollHeight);
}

function addLoading(text) {
  const container = document.getElementById("chatContainer");
  const id = "ldr_" + Date.now();
  const wrap = document.createElement("div");
  wrap.className = "msg-row bot";
  wrap.id = id;
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble bot";
  bubble.style.opacity = "0.7"; bubble.style.fontStyle = "italic";
  bubble.innerHTML = text;
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTo(0, container.scrollHeight);
  return id;
}

function removeById(id) { const el = document.getElementById(id); if (el) el.remove(); }

function typeWriterBubble(text, role, callback) {
  const container = document.getElementById("chatContainer");
  const wrap = document.createElement("div");
  wrap.className = "msg-row bot";
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble bot";
  bubble.innerHTML = "";
  wrap.appendChild(bubble);
  container.appendChild(wrap);

  let i = 0; const speed = 20;
  function tick() {
    if (i < text.length) {
      const ch = text.charAt(i++);
      if (ch === "\n") bubble.innerHTML += "<br>";
      else bubble.innerHTML += escapeHtml(ch);
      container.scrollTo(0, container.scrollHeight);
      setTimeout(tick, speed);
    } else { if (callback) callback(); }
  }
  tick();
}

// 🌟 MERCEDES KART YAPISI 🌟
function renderProducts(products) {
  const container = document.getElementById("chatContainer");

  products.slice(0, 6).forEach((p, index) => {
    setTimeout(() => {
      const card = document.createElement("div");
      card.className = "product-card";
      
      const img = p.image || PLACEHOLDER_IMG;
      const url = p.url || "#";
      const title = p.title || "Ürün";
      const price = p.price || ""; 
      const reason = p.reason || "Bunu beğendim.";

      // Fiyat Etiketi Varsa Göster
      const priceTag = price ? `<div class="pc-price-tag">${escapeHtml(price)}</div>` : "";

      card.innerHTML = `
        <div class="pc-img-wrap">
          <img src="${img}" class="pc-img" alt="ürün" onerror="this.src='${PLACEHOLDER_IMG}'">
          ${priceTag}
        </div>
        <div class="pc-content">
          <div class="pc-title">${escapeHtml(title)}</div>
          
          <div class="pc-desc">${escapeHtml(reason)}</div>
          
          <a href="${url}" target="_blank" class="pc-btn">
             Ürünü İncele <i class="fa-solid fa-arrow-right" style="margin-left:5px;"></i>
          </a>
        </div>
      `;

      const wrap = document.createElement("div");
      wrap.className = "msg-row bot";
      wrap.style.display = "block"; 
      wrap.appendChild(card);

      container.appendChild(wrap);
      container.scrollTo(0, container.scrollHeight);
    }, index * 600);
  });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
