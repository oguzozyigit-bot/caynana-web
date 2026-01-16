/* js/chat.js (v10.2 - CIRCULAR DEPENDENCY FIX) */

// 1. KİLİTLENMEYİ ÇÖZEN HAMLE: import satırını kaldırdık.
// Adresi direkt buraya tanımlıyoruz.
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com"; 

const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Görsel+Yok";

export function initChat() {
  console.log("Chat Modülü Başlatıldı");
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");
  
  if (sendBtn) {
    // Eski listener'ları temizlemek için klonluyoruz
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", sendMessage);
  }
  
  if (input) {
    // Enter tuşu desteği (önceki listener'ı kaldırmaya gerek yok, üstüne yazar)
    input.onkeydown = (e) => { 
        if (e.key === "Enter") sendMessage(); 
    };
  }
}

function getToken() { return localStorage.getItem("auth_token") || ""; }

async function sendMessage() {
  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  const token = getToken();
  if (!token) { triggerAuth("Evladım önce bir giriş yap, kim olduğunu bileyim."); return; }

  // Kullanıcı mesajını ekle
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
      // Mesaj bittikten sonra ürün varsa göster
      if ((mode === "shopping" || products.length > 0) && products.length) {
        setTimeout(() => renderProducts(products), 500);
      }
    });

  } catch (err) {
    removeById(loadingId);
    console.error(err);
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

// KART YAPISI (Contain Image - Net Görüntü)
function renderProducts(products) {
  const container = document.getElementById("chatContainer");

  products.slice(0, 5).forEach((p, index) => {
    setTimeout(() => {
      const card = document.createElement("div");
      card.className = "product-card";

      let img = p.image;
      if (!img || img === "") img = PLACEHOLDER_IMG;
      
      const url = p.url || "#";
      const title = p.title || "Ürün";
      let price = p.price || "Fiyat Gör";
      const reason = p.reason || "İncelemeye değer.";

      card.innerHTML = `
        <div class="pc-img-wrap">
          <img src="${img}" class="pc-img" onerror="this.src='${PLACEHOLDER_IMG}'">
          <div class="pc-source-badge">Trendyol</div>
        </div>
        <div class="pc-content">
            <div class="pc-title">${escapeHtml(title)}</div>
            
            <div class="pc-reason-tag">
                <i class="fa-solid fa-comment-dots"></i> ${escapeHtml(reason)}
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:end;">
                <div class="pc-price">${escapeHtml(price)}</div>
                <a href="${url}" target="_blank" class="pc-btn-mini">
                    İncele <i class="fa-solid fa-chevron-right" style="font-size:9px;"></i>
                </a>
            </div>
        </div>
      `;

      const wrap = document.createElement("div");
      wrap.className = "msg-row bot";
      wrap.style.display = "block";
      wrap.appendChild(card);

      container.appendChild(wrap);
      container.scrollTo(0, container.scrollHeight);
    }, index * 400);
  });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
