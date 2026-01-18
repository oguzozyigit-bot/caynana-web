/* js/chat.js (v12.0 - HIBRIT GÜÇ: GEMINI TEXT + OPENAI VOICE) */

import { BASE_DOMAIN, STORAGE_KEY } from './config.js';

// --- GÜVENLİK FİLTRESİ (Frontend Tarafı - İlk Bariyer) ---
const SAFETY_PATTERNS = {
    suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam|kendimi asacağım/i,
    substance: /uyuşturucu|bonzai|kokain|esrar|hap/i,
    explicit: /s[iı]k|yarak|a[nm]cık|orospu|fahişe/i
};

// 1. SOHBET (YAZI) İSTEĞİ - (UCUZ & HIZLI - GEMINI)
export async function fetchTextResponse(userMessage, mode = "chat") {
    // 1. Güvenlik Kontrolü
    if (SAFETY_PATTERNS.suicide.test(userMessage)) 
        return { text: "Aman evladım ağzından yel alsın! Bir bardak su iç, derin nefes al.", error: true };
    if (SAFETY_PATTERNS.substance.test(userMessage)) 
        return { text: "Tövbe de! O zıkkımları ağzına alma, sütümü helal etmem bak!", error: true };
    if (SAFETY_PATTERNS.explicit.test(userMessage)) 
        return { text: "Terbiyesizleşme! Karşında anan yaşında kadın var. Ağzına biber sürerim!", error: true };

    const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    
    // Backend'e gidecek veri
    const payload = {
        message: userMessage,
        mode: mode,
        persona: "normal", // İstersen 'sert', 'komik' yapabilirsin
        history: [] // İleride geçmişi de atarız
    };

    try {
        // Backend: /chat (Gemini)
        const res = await fetch(`${BASE_DOMAIN}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Sunucu hatası");

        const data = await res.json();
        return { text: data.assistant_text, data: data.search_results };

    } catch (e) {
        console.error("Chat Hatası:", e);
        return { text: "Evladım tansiyonum çıktı galiba, internetim çekmiyor. Birazdan gel.", error: true };
    }
}

// 2. SES İSTEĞİ - (PAHALI AMA KALİTELİ - OPENAI)
// Bu fonksiyonu sadece metin geldikten sonra çağıracağız.
export async function fetchVoiceResponse(textToRead) {
    try {
        console.log("🔊 Ses üretiliyor...");
        // Backend: /speech (Gemini Özetler -> OpenAI Okur)
        const res = await fetch(`${BASE_DOMAIN}/speech`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text_to_comment: textToRead,
                persona: "normal"
            })
        });

        if (!res.ok) throw new Error("Ses üretilemedi");

        const data = await res.json();
        // Base64 sesi çal
        playAudio(data.audio_data);
        return true;

    } catch (e) {
        console.error("Ses Hatası:", e);
        return false;
    }
}

// --- YARDIMCI: SES ÇALAR ---
function playAudio(base64Audio) {
    try {
        const audio = new Audio("data:audio/mp3;base64," + base64Audio);
        audio.volume = 1.0;
        audio.play().catch(e => console.error("Otomatik oynatma engellendi:", e));
        
        // Konuşurken logoyu hareket ettirmek için event atabiliriz
        // (index.html'deki botTalkAnim fonksiyonunu tetikleriz)
        if(window.botTalkAnim) window.botTalkAnim();
        
    } catch (e) {
        console.error("Audio Play Error:", e);
    }
}

// --- UI: DAKTİLO EFEKTİ ---
export function typeWriter(text, elementId = 'chat') {
    const chatDiv = document.getElementById(elementId);
    
    // Baloncuk Oluştur
    const bubbleRow = document.createElement("div");
    bubbleRow.className = "bubble bot";
    chatDiv.appendChild(bubbleRow);

    let i = 0;
    const speed = 20; // Yazma hızı

    function type() {
        if (i < text.length) {
            bubbleRow.innerHTML += text.charAt(i);
            i++;
            chatDiv.scrollTop = chatDiv.scrollHeight; // Aşağı kaydır
            setTimeout(type, speed);
        }
    }
    type();
}

// --- UI: MESAJ EKLEME (Kullanıcı için) ---
export function addUserBubble(text) {
    const chat = document.getElementById('chat');
    const d = document.createElement('div'); 
    d.className = "bubble user"; 
    d.innerText = text; 
    chat.appendChild(d); 
    chat.scrollTop = chat.scrollHeight; 
}
