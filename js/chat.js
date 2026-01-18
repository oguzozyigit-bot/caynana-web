/* js/chat.js (v13.1 - ADRES DÜZELTİLDİ: /api/chat) */

import { BASE_DOMAIN, STORAGE_KEY } from './config.js';

// --- GÜVENLİK FİLTRESİ ---
const SAFETY_PATTERNS = {
    suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam|kendimi asacağım/i,
    substance: /uyuşturucu|bonzai|kokain|esrar|hap/i,
    explicit: /s[iı]k|yarak|a[nm]cık|orospu|fahişe/i
};

// 1. SOHBET İSTEĞİ (YAZI)
export async function fetchTextResponse(userMessage, mode = "chat") {
    // Güvenlik Kontrolü
    if (SAFETY_PATTERNS.suicide.test(userMessage)) 
        return { text: "Aman evladım ağzından yel alsın! Bir bardak su iç, derin nefes al.", error: true };
    if (SAFETY_PATTERNS.substance.test(userMessage)) 
        return { text: "Tövbe de! O zıkkımları ağzına alma, sütümü helal etmem bak!", error: true };
    if (SAFETY_PATTERNS.explicit.test(userMessage)) 
        return { text: "Terbiyesizleşme! Karşında anan yaşında kadın var. Ağzına biber sürerim!", error: true };

    const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const token = localStorage.getItem("google_token"); // Varsa token

    // Backend'e gidecek paket
    const payload = {
        message: userMessage,
        mode: mode,
        persona: "normal",
        user_meta: {
            hitap: user.hitap,
            region: user.raw_data?.region
        }
    };

    try {
        // --- İŞTE DÜZELTİLEN SATIR BURASI (/api EKLENDİ) ---
        const res = await fetch(`${BASE_DOMAIN}/api/chat`, { 
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Sunucu hatası: " + res.status);

        const data = await res.json();
        // Backend'den { assistant_text, ... } dönüyor
        return { text: data.assistant_text, data: data };

    } catch (e) {
        console.error("Chat Hatası:", e);
        return { text: "Evladım tansiyonum çıktı galiba, internetim çekmiyor. Birazdan gel.", error: true };
    }
}

// 2. SES İSTEĞİ (OPSİYONEL)
export async function fetchVoiceResponse(textToRead) {
    // Burası şimdilik kapalı kalsa da olur, önce yazı çalışsın.
    return true; 
}

// --- UI YARDIMCILARI ---
export function typeWriter(text, elementId = 'chat') {
    const chatDiv = document.getElementById(elementId);
    if(!chatDiv) return;
    
    const bubbleRow = document.createElement("div");
    bubbleRow.className = "bubble bot";
    chatDiv.appendChild(bubbleRow);

    let i = 0;
    const speed = 20;

    function type() {
        if (i < text.length) {
            bubbleRow.innerHTML += text.charAt(i);
            i++;
            chatDiv.scrollTop = chatDiv.scrollHeight;
            setTimeout(type, speed);
        }
    }
    type();
}

export function addUserBubble(text) {
    const chat = document.getElementById('chat');
    const d = document.createElement('div'); 
    d.className = "bubble user"; 
    d.innerText = text; 
    chat.appendChild(d); 
    chat.scrollTop = chat.scrollHeight; 
}
