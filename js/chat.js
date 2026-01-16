/* js/chat.js (v16.0 - NO STUCK LOADING) */
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com"; 
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

export function initChat() {
  console.log("Chat Modülü Aktif");
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");
  
  if (sendBtn) {
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", sendMessage);
  }
  if (input) {
    input.onkeydown = (e) => { if (e.key === "Enter") sendMessage(); };
  }
}

function getToken() { return localStorage.getItem("auth_token") || ""; }

async function sendMessage() {
  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  const token = getToken();
  if (!token) { triggerAuth("Giriş yap evladım."); return; }

  addBubble(txt, "user");
  input.value = "";

  const mode = window.currentAppMode || "chat";
  
  // Yükleniyor balonunu ekle
  addLoading("Caynana yazıyor...");

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ message: txt, mode, persona: "normal" }),
    });

    // 🌟 KESİN ÇÖZÜM: TÜM YÜKLENİYOR BALONLARINI SİL
    removeLoading();
    
    if (res.status === 401) { triggerAuth("Süren dolmuş."); return; }
    if (!res.ok) { addBubble("Sunucu hatası evladım.", "ai"); return; }

    const data = await res.json();
    const botText = data.assistant_text || "...";
    const products = Array.isArray(data.data) ? data.data : [];

    typeWriterBubble(botText, "ai", () => {
      if (products.length > 0) {
        setTimeout(() => renderProducts(products), 300);
      }
    });

  } catch (err) {
    removeLoading(); // Hata olsa bile sil
    console.error(err);
    addBubble("Bağlantı koptu evladım.", "ai");
  }
}

// 🌟 YENİ LOADING FONKSİYONLARI 🌟
function addLoading(text) {
    const container = document.getElementById("chatContainer");
    const wrap = document.createElement("div");
    
    // ÖZEL SINIF EKLENDİ: 'loading-bubble-wrap'
    wrap.className = "msg-row bot loading-bubble-wrap"; 
    
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble bot";
    bubble.innerHTML = text + ' <i class="fa-solid fa-pen-nib fa-fade"></i>';
    
    wrap.appendChild(bubble);
    container.appendChild(wrap);
    container.scrollTo(0, container.scrollHeight);
}

function removeLoading() {
    // ID yerine sınıf ile bulup siliyoruz. Daha güvenli.
    const loaders = document.querySelectorAll('.loading-bubble-wrap');
    loaders.forEach(el => el.remove());
}

function renderProducts(products) {
  const container = document.getElementById("chatContainer");
  products.slice(0, 5).forEach((p, index) => {
    setTimeout(() => {
      const card = document.createElement("div");
      card.className = "product-card";
      
      const img = p.image || PLACEHOLDER_IMG;
      const title = p.title || "Ürün";
      const price = p.price || "Fiyat Gör";
      const url = p.url || "#";
      const reason = p.reason || "İncele";
      
      card.innerHTML = `
        <div class="pc-source">Trendyol</div>
        <div class="pc-img-wrap">
          <img src="${img}" class="pc-img" onerror="this.src='${PLACEHOLDER_IMG}'">
        </div>
        <div class="pc-content">
            <div class="pc-title">${title}</div>
            <div class="pc-info-row">
                <i class="fa-solid fa-circle-check"></i> <span>${reason}</span>
            </div>
            <div class="pc-bottom-row">
                <div class="pc-price">${price}</div>
                <a href="${url}" target="_blank" class="pc-btn-mini">Ürüne Git</a>
            </div>
        </div>
      `;
      
      const wrap = document.createElement("div");
      wrap.className = "msg-row bot";
      wrap.appendChild(card);
      container.appendChild(wrap);
      container.scrollTo(0, container.scrollHeight);
    }, index * 300);
  });
}

function triggerAuth(msg) { addBubble(msg, "ai"); document.getElementById('authModal').style.display = 'flex'; }
function addBubble(text, role) {
  const container = document.getElementById("chatContainer");
  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;
  bubble.innerHTML = text.replace(/\n/g, "<br>");
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTo(0, container.scrollHeight);
}
function typeWriterBubble(text, role, cb) { addBubble(text, role); if(cb) cb(); }
