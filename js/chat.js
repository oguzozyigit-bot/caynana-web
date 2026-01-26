// js/chat.js (FINAL - Profile-first memory + name capture + history limit + login required + CHAT_ID FIX + USER-SCOPED CHAT_ID)
// ✅ FIX: payload.history ChatStore'dan gidiyor
// ✅ FIX: user/assistant mesajları ChatStore'a ekleniyor
// ✅ FIX: Kalıcı hafıza (memory_profile) sohbet silinse bile unutmaz: önce profil formu, sonra memory_profile, sonra chat geçmişi

import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";
import { ChatStore } from "./chat_store.js";
import { getMemoryProfile, setMemoryProfile } from "./memory_profile.js";

/*
  KİLİT DAVRANIŞ:
  - Guest yok (google_id_token yoksa cevap yok)
  - Profil doluysa (hitap/fullname) öncelikle oradan hitap
  - Profil yoksa user "adım/ismim ..." diyorsa yakala, profile’a yaz
  - Kalıcı hafıza: memory_profile (sohbet silinse bile durur)
  - Backend’e son 30 mesaj gider
  - chat_id localStorage ile taşınır (SOHBET HAFIZASI)
  - chat_id kullanıcıya özel saklanır (caynana_chat_id:<user_id>)
*/

const SAFETY_PATTERNS = {
  self_harm: /intihar|ölmek istiyorum|kendimi as(?:ıcam|acağım)|bileklerimi kes/i
};

function safeJson(s, fb = {}) {
  try { return JSON.parse(s || ""); } catch { return fb; }
}
function getProfile() {
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}
function setProfile(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p || {}));
}

// ✅ login kontrolü: backend token varsa da geçerli say
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

// --------------------
// CHAT_ID (USER SCOPED)
// --------------------
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

// --------------------
// NAME CAPTURE + MEMORY PERSIST
// --------------------
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

  // ✅ kalıcı hafıza: sohbet silinse bile kalsın
  try {
    setMemoryProfile({
      name,
      hitap: (p.hitap || fn || name),
      fullname: name
    });
  } catch {}
}

// --------------------
// PROFILE MERGE (ÖNCELİK: formProfile > memory_profile > boş)
// --------------------
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

// --------------------
// RESPONSE PICKER
// --------------------
function pickAssistantText(data) {
  if (!data || typeof data !== "object") return "";
  const keys = ["assistant_text", "text", "assistant", "reply", "answer", "output"];
  for (const k of keys) {
    const v = String(data[k] || "").trim();
    if (v) return v;
  }
  return "";
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --------------------
// MAIN
// --------------------
export async function fetchTextResponse(msg, modeOrHistory = "chat", maybeHistory = []) {
  const message = String(msg || "").trim();
  if (!message) return { text: "", error: true };

  // mode paramını koru (UI eski çağrıları bozmasın)
  let mode = "chat";
  if (!Array.isArray(modeOrHistory)) {
    mode = String(modeOrHistory || "chat").trim() || "chat";
  }

  if (!hasLoginToken()) {
    return { text: "Önce giriş yapman lazım evladım. 🙂", error: true, code: "AUTH_REQUIRED" };
  }

  if (SAFETY_PATTERNS.self_harm.test(message)) {
    return {
      text: "Aman evladım sakın. Eğer acil risk varsa 112’yi ara. İstersen ne olduğunu anlat, buradayım.",
      error: true,
      code: "SAFETY"
    };
  }

  // Profil yoksa ad yakala (+ memory_profile'a yaz)
  maybePersistNameFromUserMessage(message);

  const profile = getProfile();

  // ✅ Guest fallback yok
  const userId =
    String(profile?.email || "").trim() ||
    String(profile?.user_id || "").trim() ||
    String(profile?.id || "").trim() ||
    "";

  if (!userId) {
    return {
      text: "Profilde user_id yok. Çıkış yapıp tekrar giriş yapman lazım evladım.",
      error: true,
      code: "NO_USER_ID"
    };
  }

  // displayName: önce form profil, yoksa memory_profile
  const memP = (() => { try { return getMemoryProfile() || {}; } catch { return {}; } })();

  const displayName =
    String(profile.hitap || "").trim() ||
    firstNameFromFullname(profile.fullname || "") ||
    String(memP.hitap || "").trim() ||
    firstNameFromFullname(memP.fullname || memP.name || "") ||
    "";

  // Form profilinden gelen alanlar (zorunlu değil)
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

  // ✅ mergedProfile: önce form dolu alanları, yoksa memory_profile
  const mergedProfile = mergeProfiles(formProfile, memP);

  // ✅ 1) USER mesajını store'a ekle
  try { ChatStore.add?.("user", message); } catch {}

  // ✅ 2) Backend'e gidecek history HER ZAMAN ChatStore'dan
  const historyForApi = (() => {
    try {
      if (typeof ChatStore.getLastForApi === "function") return ChatStore.getLastForApi(30);
    } catch {}
    // fallback: eski çağrılar
    try {
      const raw = Array.isArray(modeOrHistory) ? modeOrHistory : (Array.isArray(maybeHistory) ? maybeHistory : []);
      return raw
        .map(h => ({
          role: String(h?.role || "").toLowerCase(),
          content: String(h?.content ?? h?.text ?? h?.message ?? "").trim()
        }))
        .filter(x => (x.role === "user" || x.role === "assistant") && x.content)
        .slice(-30);
    } catch {
      return [];
    }
  })();

  // ✅ ChatStore server_id varsa onu kullan; yoksa user-scoped chat_id
  const serverChatId = (ChatStore.getCurrentServerId?.() || null);

  const payload = {
    text: message,
    message: message,
    user_id: userId,
    chat_id: (serverChatId || readChatId(userId)),
    mode,

    // ✅ önce profil formu, yoksa memory_profile, yoksa boş
    profile: mergedProfile,

    // ✅ backend db yoksa buradan raw doldurabilsin
    user_meta: mergedProfile,

    system_hint: displayName
      ? `Kullanıcıya "${displayName}" diye hitap et.`
      : `Profil doluysa profili öncelikle kullan.`,

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

    // ✅ chat_id’yi sakla + ChatStore server_id senkronu
    if (data.chat_id) {
      writeChatId(userId, data.chat_id);
      ChatStore.setServerId?.(data.chat_id);
    }

    const out = pickAssistantText(data) || "Bir aksilik oldu evladım.";

    // ✅ 3) ASSISTANT cevabını store'a ekle
    try { ChatStore.add?.("assistant", out); } catch {}

    // ✅ Backend'den profil/memory geri dönüyorsa memory_profile'a yaz (zorunlu değil)
    // (Şimdilik sadece hitap/name gibi güvenli alanları günceller)
    try {
      const mp = getMemoryProfile() || {};
      const nextPatch = {};
      const p = (payload.profile || {});
      if (p.hitap && !mp.hitap) nextPatch.hitap = p.hitap;
      if (p.fullname && !mp.fullname) nextPatch.fullname = p.fullname;
      if (p.city && !mp.city) nextPatch.city = p.city;
      if (p.botName && !mp.botName) nextPatch.botName = p.botName;
      if (Object.keys(nextPatch).length) setMemoryProfile(nextPatch);
    } catch {}

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

  (function type() {
    if (i < s.length) {
      bubble.textContent += s.charAt(i++);
      div.scrollTop = div.scrollHeight;
      setTimeout(type, 15);
    }
  })();
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
