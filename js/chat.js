/* js/chat.js (v18.2 - FINAL SIMPLE) */
/* - "Caynana yazıyor..." YOK
   - Loading balonu YOK
   - Mesajlar zeminsiz değil (CSS hallediyor)
   - Double bind riskine karşı input+buton clone
*/

const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

let isBusy = false;
const ROLE_USER = "user";
const ROLE_BOT = "bot";

export function initChat() {
  console.log("Chat Modülü Aktif v18.2 (FINAL SIMPLE)");

  // Üst rozet: sadece "Dinliyor"
  setCaynanaStatus();

  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");

  // ✅ Buton: clone (listener birikmesini bitirir)
  if (sendBtn && sendBtn.parentNode) {
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", () => { if (!isBusy) sendMessage(); });
  }

  // ✅ Input: clone (KRİTİK — Enter iki kere gitmesin)
  if (input && input.parentNode) {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    newInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !isBusy) sendMessage();
    });
  }
}

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

// ✅ "Yazıyor" yok — rozet hep dinliyor
function setCaynanaStatus() {
  const badge = document.getElementById("caynanaSpeaking");
  if (!badge) return;
  badge.classList.remove("is-typing");
  badge.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Caynana dinliyor...`;
}

function scrollChatToBottom() {
  const container = document.getElementById("chatContainer");
  if (container) {
    requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  }
}

async function sendMessage() {
  if (isBusy) return;

  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  const token = getToken();
  if (!token) { triggerAuth("Giriş yap evladım."); return; }

  isBusy = true;
  if (input) { input.disabled = true; input.style.opacity = "0.5"; }

  addBubble(txt, ROLE_USER);
  if (input) input.value = "";

  const mode = window.currentAppMode || "chat";

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ message: txt, mode, persona: "normal" }),
    });

    if (res.status === 401) { triggerAuth("Süren dolmuş."); return; }
    if (!res.ok) { addBubble("Sunucu hatası evladım.", ROLE_BOT); return; }

    const data = await res.json();
    const botText = (data?.assistant_text ?? "...").toString();
    const products = Array.isArray(data?.data) ? data.data : [];

    typeWriterBubble(botText, ROLE_BOT, () => {
      if (products.length > 0) setTimeout(() => renderProducts(products), 250);
    });

  } catch (err) {
    console.error(err);
    addBubble("Bağlantı koptu evladım.", ROLE_BOT);
  } finally {
    isBusy = false;
    const input2 = document.getElementById("text");
    if (input2) { input2.disabled = false; input2.style.opacity = "1"; input2.focus(); }
  }
}

function addBubble(text, role) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;

  // güvenli metin + satır sonları
  bubble.textContent = "";
  const parts = String(text).split("\n");
  parts.forEach((part, idx) => {
    bubble.appendChild(document.createTextNode(part));
    if (idx !== parts.length - 1) bubble.appendChild(document.createElement("br"));
  });

  wrap.appendChild(bubble);
  container.appendChild(wrap);
  scrollChatToBottom();
  return bubble;
}

function typeWriterBubble(text, role, cb) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;

  wrap.appendChild(bubble);
  container.appendChild(wrap);

  const s = String(text);
  let i = 0;
  const speed = 12;

  function step() {
    if (i >= s.length) { if (cb) cb(); return; }
    const ch = s.charAt(i);
    bubble.appendChild(ch === "\n" ? document.createElement("br") : document.createTextNode(ch));
    i++;
    scrollChatToBottom();
    setTimeout(step, speed);
  }
  step();
}

function safeUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    return (u.protocol === "http:" || u.protocol === "https:") ? u.href : "#";
  } catch { return "#"; }
}

function renderProducts(products) {
  const container = document.getElementById("chatContainer");
  if (!container) return;

  products.slice(0, 5).forEach((p, index) => {
    setTimeout(() => {
      const wrap = document.createElement("div");
      wrap.className = "msg-row bot";

      const card = document.createElement("div");
      card.className = "product-card";

      const source = document.createElement("div");
      source.className = "pc-source";
      source.textContent = "Trendyol";

      const imgWrap = document.createElement("div");
      imgWrap.className = "pc-img-wrap";

      const img = document.createElement("img");
      img.className = "pc-img";
      img.alt = "Ürün görseli";
      img.src = (p?.image || "").toString().trim() || PLACEHOLDER_IMG;
      img.onerror = () => { img.src = PLACEHOLDER_IMG; };
      imgWrap.appendChild(img);

      const content = document.createElement("div");
      content.className = "pc-content";

      const title = document.createElement("div");
      title.className = "pc-title";
      title.textContent = (p?.title || "Ürün").toString();

      // ✅ innerHTML yok (güvenli)
      const info = document.createElement("div");
      info.className = "pc-info-row";
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-circle-check";
      const reason = document.createElement("span");
      reason.textContent = (p?.reason || "İncele").toString();
      info.appendChild(icon);
      info.appendChild(document.createTextNode(" "));
      info.appendChild(reason);

      const bottom = document.createElement("div");
      bottom.className = "pc-bottom-row";

      const price = document.createElement("div");
      price.className = "pc-price";
      price.textContent = (p?.price || "Fiyat Gör").toString();

      const btn = document.createElement("a");
      btn.className = "pc-btn-mini";
      btn.href = safeUrl((p?.url || "#").toString());
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
      btn.textContent = "Ürüne Git";

      bottom.appendChild(price);
      bottom.appendChild(btn);

      content.appendChild(title);
      content.appendChild(info);
      content.appendChild(bottom);

      card.appendChild(source);
      card.appendChild(imgWrap);
      card.appendChild(content);

      wrap.appendChild(card);
      container.appendChild(wrap);
      scrollChatToBottom();
    }, index * 260);
  });
}

function triggerAuth(msg) {
  addBubble(msg, ROLE_BOT);
  const m = document.getElementById("authModal");
  if (m) m.style.display = "flex";
}
