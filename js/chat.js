/* js/chat.js (v9913 - SMOOTH SHOPPING FLOW & FIXED LINKS) */
import { BASE_DOMAIN } from './main.js';

export function initChat() {
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('text');
    
    if (sendBtn) {
        const newBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newBtn, sendBtn);
        newBtn.addEventListener('click', sendMessage);
    }
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

async function sendMessage() {
    const input = document.getElementById('text');
    const txt = input.value.trim();
    if (!txt) return;

    addBubble(txt, 'user', false); 
    input.value = '';

    const currentMode = window.currentAppMode || "chat";

    try {
        const token = localStorage.getItem("auth_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        addBubble("...", 'bot', true, true); 

        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ message: txt, mode: currentMode, persona: "normal" })
        });

        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();

        const data = await res.json();

        if (res.ok) {
            const botText = data.assistant_text || "Hımm...";
            const hasProducts = data.data && Array.isArray(data.data) && data.data.length > 0;
            
            // Daktilo efekti ile yaz
            typeWriterBubble(botText, () => {
                // Metin bittiğinde çalışır
                if (hasProducts) {
                    // KRİTİK AYAR 1: Metin bittikten sonra biraz bekle (Nefes payı)
                    setTimeout(() => {
                        renderProducts(data.data);
                    }, 800); // 800ms bekleme
                }
            });

        } else {
            addBubble("Bir hata oldu evladım.", 'bot');
        }

    } catch (err) {
        const loadingBubble = document.getElementById('loadingBubble');
        if (loadingBubble) loadingBubble.remove();
        addBubble("İnternet gitti galiba.", 'bot');
    }
}

// --- STANDART BALON EKLEME ---
function addBubble(text, type, isLoading = false) {
    const container = document.getElementById('chatContainer');
    const row = document.createElement('div');
    row.className = `msg-row ${type}`;
    
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${type}`;
    if (isLoading) {
        bubble.id = 'loadingBubble';
        bubble.style.fontStyle = 'italic';
        bubble.style.opacity = '0.7';
    }
    
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTo(0, container.scrollHeight);
}

// --- DAKTİLO EFEKTİ ---
function typeWriterBubble(text, callback) {
    const container = document.getElementById('chatContainer');
    const row = document.createElement('div');
    row.className = 'msg-row bot';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble bot';
    bubble.innerHTML = ''; 
    row.appendChild(bubble);
    container.appendChild(row);

    let i = 0;
    const speed = 25; // Yazma hızı

    function type() {
        if (i < text.length) {
            const char = text.charAt(i);
            if (char === '\n') bubble.innerHTML += '<br>';
            else bubble.innerHTML += char;
            i++;
            container.scrollTo(0, container.scrollHeight);
            setTimeout(type, speed);
        } else {
            if (callback) callback();
        }
    }
    type();
}

// --- ÜRÜN KARTLARI (YENİ ANİMASYONLU & LİNKLİ) ---
function renderProducts(products) {
    const container = document.getElementById('chatContainer');
    
    products.forEach((p, index) => {
        // KRİTİK AYAR 2: Her kart arasında daha uzun bekle (Yavaş akış)
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // KRİTİK AYAR 3: Yeni süzülme animasyonunu uygula
            // 0.8s sürecek, yavaşça süzülecek
            card.style.animation = 'slideUpSlow 0.8s ease forwards';
            
            let starsHTML = '';
            for(let i=0; i<5; i++) starsHTML += '<i class="fa-solid fa-star"></i>';

            // Not: Buton yerine <a> etiketi kullanıyoruz (Daha güvenli link)
            card.innerHTML = `
                <div class="pc-img-wrap">
                    <img src="${p.image}" class="pc-img" onerror="this.src='https://via.placeholder.com/300?text=Görsel+Yok'">
                </div>
                <div class="pc-content">
                    <div class="pc-title">${p.title}</div>
                    <div class="caynana-stars">${starsHTML}</div>
                    <div style="font-weight:800; color:#00C897; font-size:16px;">${p.price}</div>
                    
                    <div class="pc-desc">
                        <strong>👵 Caynana Diyor ki:</strong><br>
                        ${p.reason}
                    </div>
                    
                    <a href="${p.url}" target="_blank" class="pc-btn">
                        Caynana Öneriyor — Ürüne Git
                    </a>
                </div>
            `;
            
            const row = document.createElement('div');
            row.className = 'msg-row bot';
            row.style.display = 'block'; 
            row.appendChild(card);
            
            container.appendChild(row);
            container.scrollTo(0, container.scrollHeight);
            
        }, index * 800); // Her kart arası 800ms fark
    });
}
