/* js/chat.js
   Sohbet ve Mesajlaşma Mantığı
*/
import { BASE_DOMAIN } from './main.js';

export function initChat() {
    console.log("💬 Chat Modülü Başlatılıyor...");
    
    const sendBtn = document.getElementById('send-btn');
    const inputField = document.getElementById('chat-input');
    
    // Gönder butonu varsa olayı bağla
    if (sendBtn && inputField) {
        sendBtn.addEventListener('click', () => sendMessage());
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

async function sendMessage() {
    const inputField = document.getElementById('chat-input');
    const message = inputField.value.trim();
    if (!message) return;

    // 1. Kullanıcı mesajını ekrana yaz
    addMessageBubble(message, 'user');
    inputField.value = '';

    // 2. Yükleniyor animasyonu göster (opsiyonel)
    // showLoading();

    try {
        const token = localStorage.getItem("auth_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // 3. Backend'e gönder
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ 
                message: message,
                mode: "chat",
                persona: "normal"
            })
        });

        const data = await res.json();
        
        // 4. Cevabı ekrana yaz
        if (data.assistant_text) {
            addMessageBubble(data.assistant_text, 'assistant');
        } else {
            addMessageBubble("Bir hata oluştu evladım, tekrar dene.", 'assistant');
        }

    } catch (err) {
        console.error("Chat hatası:", err);
        addMessageBubble("Sunucuya ulaşamadım evladım.", 'assistant');
    }
}

function addMessageBubble(text, sender) {
    const chatContainer = document.getElementById('chat-container'); // HTML'deki ID'ye göre ayarla
    if (!chatContainer) return;

    const div = document.createElement('div');
    div.classList.add('message-bubble', sender); // CSS için 'user' veya 'assistant' class'ı
    div.innerText = text;
    
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
