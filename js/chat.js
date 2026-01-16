/* js/chat.js (v19.0 - FAIL-SAFE) */
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com";
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";
let isBusy = false;
const ROLE_USER = "user"; const ROLE_BOT = "bot";

export function initChat() {
  console.log("Chat Modülü Aktif v19.0");
  const sendBtn = document.getElementById("sendBtn"); const input = document.getElementById("text");
  resetUI();
  if (sendBtn) {
    const newBtn = sendBtn.cloneNode(true); sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", () => { if (!isBusy) sendMessage(); });
  }
  if (input) { input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !isBusy) sendMessage(); }); }
}

function getToken() { return localStorage.getItem("auth_token") || ""; }
function resetUI() { isBusy = false; setCaynanaStatus("idle"); removeLoading(); const input = document.getElementById("text"); if(input){ input.disabled=false; input.style.opacity="1"; input.focus(); } }
function scrollChatToBottom() { const c = document.getElementById("chatContainer"); if (c) requestAnimationFrame(() => { c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }); }); }

function setCaynanaStatus(state) {
  const badge = document.getElementById("caynanaSpeaking"); const dot = document.querySelector("#notifBtn .notif-dot"); if (!badge) return;
  if (state === "typing") { badge.classList.add("is-typing"); badge.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Caynana yazıyor...`; if (dot) dot.classList.add("is-typing"); }
  else { badge.classList.remove("is-typing"); badge.innerHTML = `<i class="fa-solid fa-comment-dots"></i> Caynana dinliyor...`; if(dot && state==="replied") { dot.classList.remove("flash"); void dot.offsetWidth; dot.classList.add("flash"); } }
}

async function sendMessage() {
  if (isBusy) return;
  const input = document.getElementById("text"); const txt = (input?.value || "").trim(); if (!txt) return;
  const token = getToken(); if (!token) { triggerAuth("Giriş yap evladım."); return; }
  
  removeLoading();
  isBusy = true; if (input) { input.disabled = true; input.style.opacity = "0.5"; }
  addBubble(txt, ROLE_USER); if (input) input.value = "";
  setCaynanaStatus("typing"); addLoading("Caynana yazıyor...");

  const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 40000);

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ message: txt, mode: window.currentAppMode || "chat", persona: "normal" }), signal: controller.signal
    });
    clearTimeout(timeoutId); removeLoading();
    if (res.status === 401) { resetUI(); triggerAuth("Süren dolmuş."); return; }
    if (!res.ok) { addBubble("Sunucu hatası evladım.", ROLE_BOT); return; }
    const data = await res.json();
    typeWriterBubble((data?.assistant_text ?? "...").toString(), ROLE_BOT, () => {
      setCaynanaStatus("replied");
      if (Array.isArray(data?.data) && data.data.length > 0) setTimeout(() => renderProducts(data.data), 250);
    });
  } catch (err) {
    clearTimeout(timeoutId); removeLoading(); console.error(err);
    addBubble(err.name === 'AbortError' ? "Evladım internetin mi yavaş? Cevap gelmedi." : "Bağlantı koptu evladım.", ROLE_BOT);
  } finally {
    isBusy = false; if (input) { input.disabled = false; input.style.opacity = "1"; input.focus(); }
    setTimeout(() => { const b = document.getElementById("caynanaSpeaking"); if(b && b.innerHTML.includes("yazıyor")) setCaynanaStatus("idle"); }, 1000);
  }
}

function addBubble(text, role) {
  const container = document.getElementById("chatContainer"); if (!container) return;
  const wrap = document.createElement("div"); wrap.className = "msg-row " + role;
  const bubble = document.createElement("div"); bubble.className = "msg-bubble " + role;
  bubble.textContent = ""; const parts = String(text).split("\n");
  parts.forEach((part, idx) => { bubble.appendChild(document.createTextNode(part)); if (idx !== parts.length - 1) bubble.appendChild(document.createElement("br")); });
  wrap.appendChild(bubble); container.appendChild(wrap); scrollChatToBottom(); return bubble;
}

function typeWriterBubble(text, role, cb) {
  const container = document.getElementById("chatContainer"); if (!container) return;
  const wrap = document.createElement("div"); wrap.className = "msg-row " + role;
  const bubble = document.createElement("div"); bubble.className = "msg-bubble " + role;
  wrap.appendChild(bubble); container.appendChild(wrap);
  const s = String(text); let i = 0; const speed = 12;
  function step() {
    if (i >= s.length) { if (cb) cb(); return; }
    const ch = s.charAt(i);
    if (ch === "\n") bubble.appendChild(document.createElement("br")); else bubble.appendChild(document.createTextNode(ch));
    i++; scrollChatToBottom(); setTimeout(step, speed);
  } step();
}

function addLoading(text) {
  const container = document.getElementById("chatContainer"); if (!container) return;
  removeLoading();
  const wrap = document.createElement("div"); wrap.className = "msg-row bot loading-bubble-wrap"; wrap.id = "globalLoadingBubble";
  const bubble = document.createElement("div"); bubble.className = "msg-bubble bot";
  bubble.innerHTML = `${text} <i class="fa-solid fa-pen-nib fa-beat-fade" style="margin-left:5px; font-size:12px;"></i>`;
  wrap.appendChild(bubble); container.appendChild(wrap); scrollChatToBottom();
}

function removeLoading() {
  const elById = document.getElementById("globalLoadingBubble"); if (elById) elById.remove();
  document.querySelectorAll('.loading-bubble-wrap').forEach(el => el.remove());
}

function safeUrl(url) { try { const u = new URL(url, window.location.origin); return (u.protocol === "http:" || u.protocol === "https:") ? u.href : "#"; } catch { return "#"; } }

function renderProducts(products) {
  const container = document.getElementById("chatContainer"); if (!container) return;
  products.slice(0, 5).forEach((p, index) => {
    setTimeout(() => {
      const wrap = document.createElement("div"); wrap.className = "msg-row bot";
      const card = document.createElement("div"); card.className = "product-card";
      card.innerHTML = `<div class="pc-source">Trendyol</div><div class="pc-img-wrap"><img src="${p.image || PLACEHOLDER_IMG}" class="pc-img" onerror="this.src='${PLACEHOLDER_IMG}'"></div><div class="pc-content"><div class="pc-title">${p.title || "Ürün"}</div><div class="pc-info-row"><i class="fa-solid fa-circle-check"></i> ${p.reason || 'İncele'}</div><div class="pc-bottom-row"><div class="pc-price">${p.price || "Fiyat Gör"}</div><a href="${safeUrl(p.url)}" target="_blank" class="pc-btn-mini">Ürüne Git</a></div></div>`;
      wrap.appendChild(card); container.appendChild(wrap); scrollChatToBottom();
    }, index * 260);
  });
}

function triggerAuth(msg) { addBubble(msg, ROLE_BOT); const m = document.getElementById("authModal"); if (m) m.style.display = "flex"; }
