// js/chat.js (FINAL - Mode param, History normalize+limit, Login required, 1x retry)

import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";

// Frontend sadece en bariz durumda keser; asıl politika backend/LLM tarafında
const SAFETY_PATTERNS = {
  self_harm: /intihar|ölmek istiyorum|kendimi as(?:ıcam|acağım)|bileklerimi kes/i
};

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }

function hasLoginToken() {
  return !!(localStorage.getItem("google_id_token") || "").trim();
}

// History normalize: {role, content} standart
function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .map((h) => {
      if (!h || typeof h !== "object") return null;

      const roleRaw = (h.role || h.type || "").toString().toLowerCase();
      const role =
        roleRaw === "assistant" || roleRaw === "bot" ? "assistant" :
        roleRaw === "user" ? "user" :
        null;

      const content =
        (h.content ?? h.text ?? h.message ?? h.assistant_text ?? "").toString();

      if (!role || !content.trim()) return null;
      return { role, content: content.trim() };
    })
    .filter(Boolean);
}

function limitHistory(history, maxItems = 30) {
  const h = Array.isArray(history) ? history : [];
  if (h.length <= maxItems) return h;
  return h.slice(h.length - maxItems);
}

function pickAssistantText(data) {
  if (!data || typeof data !== "object") return "";
  const candidates = [
    data.assistant_text,
    data.text,
    data.assistant,
    data.reply,
    data.answer,
    data.output
  ];
  for (const c of candidates) {
    const s = (c ?? "").toString().trim();
    if (s) return s;
  }
  return "";
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Geriye dönük uyum:
// - fetchTextResponse(msg, history)
// - fetchTextResponse(msg, mode, history)
export async function fetchTextResponse(msg, modeOrHistory = "chat", maybeHistory = []) {
  const msgStr = String(msg || "").trim();
  if (!msgStr) return { text: "", error: true };

  // Signature fix
  let mode = "chat";
  let history = [];

  if (Array.isArray(modeOrHistory)) {
    // (msg, history)
    history = modeOrHistory;
  } else {
    // (msg, mode, history)
    mode = String(modeOrHistory || "chat").trim() || "chat";
    history = maybeHistory;
  }

  // Login zorunlu (guest yok)
  if (!hasLoginToken()) {
    return {
      text: "Önce giriş yapman lazım evladım. (Google ile giriş) 🙂",
      error: true,
      code: "AUTH_REQUIRED"
    };
  }

  // Self-harm guard
  if (SAFETY_PATTERNS.self_harm.test(msgStr)) {
    return {
      text: "Aman evladım sakın! Yalnız değilsin. Şu an güvende misin? Eğer acil risk varsa 112’yi ara. İstersen ne olduğunu anlat, birlikte toparlayalım.",
      error: true,
      code: "SAFETY_SELF_HARM"
    };
  }

  const user = getUser();
  const userId = (user?.id || "").trim() || "guest"; // pratik fallback; ama auth token var zaten

  const cleanHistory = limitHistory(normalizeHistory(history), 30);

  const payload = {
    text: msgStr,
    message: msgStr,
    user_id: userId,
    history: cleanHistory,
    mode: mode,
    // Backend yok sayarsa sorun değil; varsa “otomatik web arama” politikasını tetikleyebilir.
    web: "auto",
    enable_web_search: true
  };

  // 1 kez retry: network/5xx gibi durumlarda
  const attempt = async () => {
    const res = await apiPOST("/api/chat", payload);

    // 401/403 -> auth problemi
    if (res.status === 401 || res.status === 403) {
      return {
        text: "Giriş oturumun düşmüş gibi. Çıkış yapıp tekrar Google ile girer misin?",
        error: true,
        code: "AUTH_EXPIRED"
      };
    }

    if (!res.ok) {
      // 4xx ise retry etme; 5xx olabilir, retry edebiliriz
      const bodyText = await res.text().catch(() => "");
      const isServer = res.status >= 500 && res.status <= 599;
      const err = new Error(`API Error ${res.status} ${bodyText}`);
      err.isServer = isServer;
      err.status = res.status;
      throw err;
    }

    let data = {};
    try { data = await res.json(); } catch (e) {}

    const textOut = pickAssistantText(data) || "Bir şeyler oldu evladım. Bir daha dener misin?";
    return { text: textOut };
  };

  try {
    return await attempt();
  } catch (e) {
    // Retry only on server-ish errors / fetch fail
    const isServer = !!e?.isServer;
    const status = e?.status;

    // Network error: status yok olur çoğu zaman
    const shouldRetry = isServer || (status == null);

    if (shouldRetry) {
      await sleep(600);
      try {
        return await attempt();
      } catch (e2) {
        // fallthrough
      }
    }

    return {
      text: "Evladım bir aksilik var… İnternet gitti ya da sunucu cevap vermedi. Bir daha dener misin?",
      error: true,
      code: "NETWORK_OR_SERVER"
    };
  }
}

// --------------------
// UI HELPERS
// --------------------
export function typeWriter(text, elId = "chat") {
  const div = document.getElementById(elId);
  if (!div) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  div.appendChild(bubble);

  const s = String(text || "");
  let i = 0;

  function type() {
    if (i < s.length) {
      bubble.textContent += s.charAt(i);
      i++;
      div.scrollTop = div.scrollHeight;
      setTimeout(type, 15);
    }
  }
  type();
}

export function addUserBubble(text) {
  const div = document.getElementById("chat");
  if (!div) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble user";
  bubble.textContent = String(text || "");
  div.appendChild(bubble);
  div.scrollTop = div.scrollHeight;
}
