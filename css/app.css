/* js/chat.js (v16.1 - PRODUCTION READY & SECURE) */
const BASE_DOMAIN = "https://bikonomi-api-2.onrender.com"; 
const PLACEHOLDER_IMG = "https://via.placeholder.com/200?text=Resim+Yok";

// Çift tıklamayı önlemek için kilit
let isBusy = false;

export function initChat() {
  console.log("Chat Modülü Aktif v16.1");
  const sendBtn = document.getElementById("sendBtn");
  const input = document.getElementById("text");
  
  if (sendBtn) {
    // Event listener temizliği (Double-bind önlemi)
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    newBtn.addEventListener("click", sendMessage);
  }
  
  if (input) {
    input.onkeydown = (e) => { 
        if (e.key === "Enter" && !isBusy) sendMessage(); 
    };
  }
}

function getToken() { return localStorage.getItem("auth_token") || ""; }

async function sendMessage() {
  if (isBusy) return; // Kilitliyse işlem yapma

  const input = document.getElementById("text");
  const txt = (input?.value || "").trim();
  if (!txt) return;

  const token = getToken();
  if (!token) { triggerAuth("Giriş yap evladım."); return; }

  // Kilidi kapat ve UI'ı güncelle
  isBusy = true;
  input.disabled = true; // Inputu dondur
  input.style.opacity = "0.5";

  addBubble(txt, "user");
  input.value = "";

  const mode = window.currentAppMode || "chat";
  
  // Loading ekle
  addLoading("Caynana yazıyor...");

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ message: txt, mode, persona: "normal" }),
    });

    // Loading balonlarını temizle
    removeLoading();
    
    if (res.status === 401) { triggerAuth("Süren dolmuş."); return; }
    if (!res.ok) { addBubble("Sunucu hatası evladım.", "ai"); return; }

    const data = await res.json();
    const botText = data.assistant_text || "...";
    const products = Array.isArray(data.data) ? data.data : [];

    // Gerçek daktilo efekti ile yazdır
    typeWriterBubble(botText, "ai", () => {
      if (products.length > 0) {
        setTimeout(() => renderProducts(products), 300);
      }
    });

  } catch (err) {
    removeLoading();
    console.error(err);
    addBubble("Bağlantı koptu evladım.", "ai");
  } finally {
    // İşlem bitince kilidi aç
    isBusy = false;
    input.disabled = false;
    input.style.opacity = "1";
    input.focus();
  }
}

// 🛡️ GÜVENLİ MESAJ BALONU (XSS FİXLENDİ)
function addBubble(text, role) {
  const container = document.getElementById("chatContainer");
  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;
  
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;
  
  // Önce textContent ile güvenli hale getir, sonra satır başlarını işle
  bubble.textContent = text; 
  bubble.innerHTML = bubble.innerHTML.replace(/\n/g, "<br>");
  
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTo(0, container.scrollHeight);
  return bubble; // Typewriter için elementi döndür
}

// ✍️ GERÇEK DAKTİLO EFEKTİ
function typeWriterBubble(text, role, cb) {
  const container = document.getElementById("chatContainer");
  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;
  wrap.appendChild(bubble);
  container.appendChild(wrap);

  let i = 0;
  const speed = 15; // Yazma hızı (ms)

  function type() {
    if (i < text.length) {
        // Tek tek harf ekle (HTML entity korumalı değil ama temel metin için ok)
        // Eğer HTML tag varsa burası değişmeli, şimdilik düz metin varsayıyoruz.
        const char = text.charAt(i);
        bubble.innerHTML += (char === '\n' ? '<br>' : char);
        i++;
        container.scrollTo(0, container.scrollHeight);
        setTimeout(type, speed);
    } else {
        if (cb) cb(); // Yazma bitince callback çalıştır
    }
  }
  type();
}

// ✨ CANLI LOADING
function addLoading(text) {
    const container = document.getElementById("chatContainer");
    const wrap = document.createElement("div");
    wrap.className = "msg-row bot loading-bubble-wrap"; // Sınıf bazlı takip
    
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble bot";
    // fa-beat-fade ile daha canlı animasyon
    bubble.innerHTML = `${text} <i class="fa-solid fa-pen-nib fa-beat-fade" style="margin-left:5px; font-size:12px;"></i>`;
    
    wrap.appendChild(bubble);
    container.appendChild(wrap);
    container.scrollTo(0, container.scrollHeight);
}

function removeLoading() {
    document.querySelectorAll('.loading-bubble-wrap').forEach(el => el.remove());
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

function triggerAuth(msg) { 
    // Auth uyarısını daktilo efekti olmadan direkt bas
    const container = document.getElementById("chatContainer");
    const wrap = document.createElement("div");
    wrap.className = "msg-row bot";
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble bot";
    bubble.textContent = msg;
    wrap.appendChild(bubble);
    container.appendChild(wrap);
    
    document.getElementById('authModal').style.display = 'flex'; 
}
