/* js/chat.js (v45.1 - BACKEND-DRIVEN + SAFER ERROR HANDLING) */

import { BASE_DOMAIN } from './config.js';

// --- GÜVENLİK FİLTRESİ (Sadece çok uç kelimeler) ---
const SAFETY_PATTERNS = {
  suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam|kendimi asacağım/i,
  substance: /uyuşturucu|bonzai|kokain|esrar/i,
  explicit: /s[iı]k|yarak|a[nm]cık|orospu|fahişe/i
};

export async function fetchBotResponse(userMessage, mode = "chat", persona = "default") {
  // Acil fren (frontend) — backend'e gitmeden döndür
  if (SAFETY_PATTERNS.suicide.test(userMessage)) {
    return { assistant_text: "Aman evladım ağzından yel alsın! Şimdi bir bardak su iç, bir nefes al. Gerekirse bir yakınına hemen yaz.", audio: null };
  }
  if (SAFETY_PATTERNS.substance.test(userMessage)) {
    return { assistant_text: "Tövbe de! O zıkkımları ağzına alma, sütümü helal etmem bak!", audio: null };
  }
  if (SAFETY_PATTERNS.explicit.test(userMessage)) {
    return { assistant_text: "Terbiyesizleşme! Karşında anan yaşında kadın var. Ağzına biber sürerim senin!", audio: null };
  }

  const token = localStorage.getItem("auth_token"); // Google id_token (varsa)
  const user = JSON.parse(localStorage.getItem("user_info") || "{}");
  const p = (user.profile || {});

  // Bölge tercihi (opsiyonel): trakya/ege/karadeniz/dogu
  const region = (p.region || user.region || localStorage.getItem("caynana_region") || null);

  const payload = {
    message: userMessage,
    mode: mode || "chat",
    persona: persona || "default",
    use_voice: false, // ✅ v1: backend audio üretmüyor, şimdilik kapalı
    user_meta: {
      hitap: user.hitap || "Evladım",
      gender: p.gender || null,
      maritalStatus: p.maritalStatus || null,
      region: region
    }
  };

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    // JSON parse (hata body’si de gelebilir)
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // Backend hata mesajı varsa göster
      const detail = (data && (data.detail || data.error || data.message)) ? ` (${data.detail || data.error || data.message})` : "";
      return {
        assistant_text: `Evladım bir şeyler aksadı${detail}. Bir daha dene, ben buradayım.`,
        audio: null
      };
    }

    // Beklenen: {assistant_text, audio, intent, yp, used_model}
    return data || { assistant_text: "Evladım… cevap gelmedi gibi. Bir daha dene.", audio: null };

  } catch (e) {
    return { assistant_text: "Evladım bağlantı gitti gibi… bir daha dene, ben buradayım.", audio: null };
  }
}

// --- UI Yardımcıları (Standart) ---
export function addBubble(text, role) {
  const c = document.getElementById('chatContainer');
  const div = document.createElement("div");
  div.className = `msg-row ${role}`;
  div.innerHTML = `<div class="msg-bubble ${role}">${text}</div>`;
  c.appendChild(div);
  c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
  return div; // ✅ isteyen silsin diye döndürdüm
}

export function typeWriter(text, callback) {
  const c = document.getElementById('chatContainer');
  const div = document.createElement("div"); div.className = "msg-row bot";
  const bubble = document.createElement("div"); bubble.className = "msg-bubble bot";
  div.appendChild(bubble); c.appendChild(div);

  let i = 0;
  function step() {
    if (i >= text.length) { if (callback) callback(); return; }
    bubble.textContent += text.charAt(i);
    i++;
    c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    setTimeout(step, 25);
  }
  step();
}
