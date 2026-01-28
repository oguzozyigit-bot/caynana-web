// FILE: /js/chat.js
// FINAL+ (LOCAL NAME MEMORY + ALWAYS-BOTTOM CHAT)

import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";
import { ChatStore } from "./chat_store.js";
import { getMemoryProfile, setMemoryProfile } from "./memory_profile.js";

const SAFETY_PATTERNS = {
  self_harm: /intihar|ölmek istiyorum|kendimi as(?:ıcam|acağım)|bileklerimi kes/i
};

function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }
function getProfile() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function setProfile(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p || {})); }

function hasLoginToken() {
  const apiToken = (localStorage.getItem("caynana_api_token") || "").trim();
  const google = (localStorage.getItem("google_id_token") || "").trim();
  return !!(apiToken || google);
}

function firstNameFromFullname(full = "") {
  const s = String(full || "").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
}

// USER SCOPED CHAT_ID
function getChatKeyForUser(userId) {
  const u = String(userId || "").trim().toLowerCase();
  return u ? `caynana_chat_id:${u}` : "caynana_chat_id";
}
function readChatId(userId) {
  const key = getChatKeyForUser(userId);
  const v = (localStorage.getItem(key) || "").trim();
  if (!v || v === "null" || v === "undefined") return null;
  return v;
}
function writeChatId(userId, chatId) {
  const key = getChatKeyForUser(userId);
  if (chatId) localStorage.setItem(key, String(chatId));
}

// NAME CAPTURE
function extractNameFromText(text = "") {
  const s = String(text || "").trim();
  let m = s.match(/\b(adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü'’\-]{2,})(?:\b|$)/i);
  if (m && m[2]) return m[2];
  m = s.match(/\bben\s+([A-Za-zÇĞİÖŞÜçğıöşü'’\-]{2,})(?:\b|$)/i);
  if (m && m[1]) return m[1];
  return "";
}

function maybePersistNameFromUserMessage(userMessage) {
  const p = getProfile();
  const has = !!(String(p.hitap || "").trim() || String(p.fullname || "").trim());
  if (has) return;

  const name = extractNameFromText(userMessage);
  if (!name) return;

  p.fullname = name;
  const fn = firstNameFromFullname(name);
  if (!p.hitap) p.hitap = fn || name;
  setProfile(p);

  try {
    setMemoryProfile({ name, hitap: (p.hitap || fn || name), fullname: name });
  } catch {}
}

function cleanValue(v) {
  if (v === null || v === undefined) return null;
  const s = typeof v === "string" ? v.trim() : v;
  if (s === "") return null;
  return s;
}
function mergeProfiles(formProfile = {}, memProfile = {}) {
  const out = { ...(memProfile || {}) };
  for (const [k, v] of Object.entries(formProfile || {})) {
    const cv = cleanValue(v);
    if (cv !== null) out[k] = cv;
  }
  return out;
}

function pickAssistantText(data) {
  if (!data || typeof data !== "object") return "";
  const keys = ["assistant_text", "text", "assistant", "reply", "answer", "output"];
  for (const k of keys) {
    const v = String(data[k] || "").trim();
    if (v) return v;
  }
  return "";
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ✅ UI: bot bubble (history basarken kullanacağız) */
export function addBotBubble(text, elId="chat"){
  const div = document.getElementById(elId);
  if(!div) return;
  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  bubble.textContent = String(text||"");
  div.appendChild(bubble);
  div.scrollTop = div.scrollHeight;
}

/* ✅ UI: typewriter (canlı cevap) */
export function typeWriter(text, elId = "chat") {
  const div = document.getElementById(elId);
  if (!div) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  div.appendChild(bubble);

  const s = String(text || "");
  let i = 0;

  (function type() {
    if (i < s.length) {
      bubble.textContent += s.charAt(i++);
      div.scrollTop = div.scrollHeight;
      setTimeout(type, 28);
    }
  })();
}

/* ✅ UI: user bubble */
export function addUserBubble(text) {
  const div = document.getElementById("chat");
  if (!div) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble user";
  bubble.textContent = String(text || "");
  div.appendChild(bubble);

  div.scrollTop = div.scrollHeight;
}

export async function fetchTextResponse(msg, modeOrHistory = "chat", maybeHistory = []) {
  const message = String(msg || "").trim();
  if (!message) return { text: "", error: true };

  let mode = "chat";
  if (!Array.isArray(modeOrHistory)) {
    mode = String(modeOrHistory || "chat").trim() || "chat";
  }

  if (!hasLoginToken()) {
    return { text: "Önce giriş yapman lazım evladım. 🙂", error: true, code: "AUTH_REQUIRED" };
  }

  if (SAFETY_PATTERNS.self_harm.test(message)) {
    return { text: "Aman evladım sakın. Eğer acil risk varsa 112’yi ara. İstersen ne olduğunu anlat, buradayım.", error: true, code: "SAFETY" };
  }

  // ✅ isim hafızası: önce profile + memory_profile’dan oku
  const profile0 = getProfile();
  const mem0 = (() => { try { return getMemoryProfile() || {}; } catch { return {}; } })();
  const knownName =
    String(profile0.hitap || "").trim() ||
    firstNameFromFullname(profile0.fullname || "") ||
    String(mem0.hitap || "").trim() ||
    firstNameFromFullname(mem0.fullname || mem0.name || "") ||
    "";

  // ✅ “benim adım neydi” lokal cevap
  if (/benim ad(ı|im)\s+neydi|ad(ı|im)\s+neydi|ismim\s+neydi/i.test(message)) {
    if (knownName) return { text: `Adın ${knownName} evladım. 🙂` };
    return { text: "Adını söylememiştin evladım. “Adım …” diye yaz da kaydedeyim 🙂" };
  }

  // isim yakala (profil boşsa)
  maybePersistNameFromUserMessage(message);

  const profile = getProfile();
  const userId =
    String(profile?.email || "").trim() ||
    String(profile?.user_id || "").trim() ||
    String(profile?.id || "").trim() ||
    "";

  if (!userId) {
    return { text: "Profilde user_id yok. Çıkış yapıp tekrar giriş yapman lazım evladım.", error: true, code: "NO_USER_ID" };
  }

  const memP = (() => { try { return getMemoryProfile() || {}; } catch { return {}; } })();

  const displayName =
    String(profile.hitap || "").trim() ||
    firstNameFromFullname(profile.fullname || "") ||
    String(memP.hitap || "").trim() ||
    firstNameFromFullname(memP.fullname || memP.name || "") ||
    "";

  const formProfile = {
    hitap: profile.hitap || null,
    fullname: profile.fullname || null,
    display_name: displayName || null,
    botName: profile.botName || null,
    dob: profile.dob || null,
    gender: profile.gender || null,
    maritalStatus: profile.maritalStatus || null,
    spouse: profile.spouse || null,
    childCount: profile.childCount || null,
    childNames: profile.childNames || null,
    team: profile.team || null,
    city: profile.city || null,
    isProfileCompleted: !!profile.isProfileCompleted
  };

  const mergedProfile = mergeProfiles(formProfile, memP);

  // store user
  try { ChatStore.add?.("user", message); } catch {}

  const historyForApi = (() => {
    try {
      if (typeof ChatStore.getLastForApi === "function") return ChatStore.getLastForApi(30);
    } catch {}
    try {
      const raw = Array.isArray(modeOrHistory) ? modeOrHistory : (Array.isArray(maybeHistory) ? maybeHistory : []);
      return raw
        .map(h => ({ role: String(h?.role || "").toLowerCase(), content: String(h?.content ?? h?.text ?? h?.message ?? "").trim() }))
        .filter(x => (x.role === "user" || x.role === "assistant") && x.content)
        .slice(-30);
    } catch {
      return [];
    }
  })();

  const serverChatId = (ChatStore.getCurrentServerId?.() || null);

  const payload = {
    text: message,
    message: message,
    user_id: userId,
    chat_id: (serverChatId || readChatId(userId)),
    mode,
    profile: mergedProfile,
    user_meta: mergedProfile,
    system_hint: displayName ? `Kullanıcıya "${displayName}" diye hitap et.` : `Profil doluysa profili öncelikle kullan.`,
    web: "auto",
    enable_web_search: true,
    history: historyForApi
  };

  const attempt = async () => {
    const res = await apiPOST("/api/chat", payload);

    if (res.status === 401 || res.status === 403) {
      return { text: "Oturumun düşmüş gibi. Çıkış yapıp tekrar girer misin?", error: true, code: "AUTH_EXPIRED" };
    }
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      const err = new Error(`API Error ${res.status} ${bodyText}`);
      err.isServer = res.status >= 500 && res.status <= 599;
      err.status = res.status;
      throw err;
    }

    let data = {};
    try { data = await res.json(); } catch {}

    if (data.chat_id) {
      writeChatId(userId, data.chat_id);
      ChatStore.setServerId?.(data.chat_id);
    }

    const out = pickAssistantText(data) || "Bir aksilik oldu evladım.";

    try { ChatStore.add?.("assistant", out); } catch {}

    return { text: out };
  };

  try {
    return await attempt();
  } catch (e) {
    const shouldRetry = !!e?.isServer || (e?.status == null);
    if (shouldRetry) {
      await sleep(600);
      try { return await attempt(); } catch {}
    }
    return { text: "Bağlantı koptu gibi. Bir daha dener misin?", error: true, code: "NETWORK" };
  }
}
