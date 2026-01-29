// FILE: /js/chat.js
// FINAL++ (AUTO SCROLL GARANTİ + ÇİFT MESAJ YOK + AUTOFOLLOW AKILLI)
// ✅ UI scroll: 3 frame forceBottom (mobil/PC kaçırmaz)
// ✅ kullanıcı yukarı çıktıysa zorlamaz, ama kullanıcı mesaj gönderince tekrar follow açılır
// ✅ double reply: buradan çıkmaz (main.js render tekrar basmıyor)

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

/* =========================================================
   ✅ AUTOFOLLOW CORE (kaçırmayan scroll)
   ========================================================= */
function _isNearBottom(el, slack = 380) { // ✅ büyük eşik: sabit bar/padding yüzünden kaçırmasın
  try { return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch { return true; }
}

// 3 frame bottom (mobil/pc kaçırmaz)
function _forceBottom(el){
  if(!el) return;
  let n = 0;
  const tick = () => {
    try { el.scrollTop = el.scrollHeight; } catch {}
    n++;
    if(n < 3) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ✅ UI: bot bubble (history basarken) */
export function addBotBubble(text, elId="chat"){
  const div = document.getElementById(elId);
  if(!div) return;

  const follow = _isNearBottom(div);
  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  bubble.textContent = String(text||"");
  div.appendChild(bubble);

  if(follow) _forceBottom(div);
}

/* ✅ UI: typewriter (canlı cevap) */
export function typeWriter(text, elId = "chat") {
  const div = document.getElementById(elId);
  if (!div) return;

  // follow: başlangıçta alttaysa true
  let follow = _isNearBottom(div);
  const onScroll = () => { follow = _isNearBottom(div); };
  div.addEventListener("scroll", onScroll, { passive:true });

  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  div.appendChild(bubble);

  const s = String(text || "");
  let i = 0;

  (function type() {
    if (i < s.length) {
      bubble.textContent += s.charAt(i++);
      if (follow) _forceBottom(div);
      setTimeout(type, 28);
    } else {
      div.removeEventListener("scroll", onScroll);
      if (follow) _forceBottom(div);
    }
  })();
}

/* ✅ UI: user bubble */
export function addUserBubble(text) {
  const div = document.getElementById("chat");
  if (!div) return;

  const follow = _isNearBottom(div);
  const bubble = document.createElement("div");
  bubble.className = "bubble user";
  bubble.textContent = String(text || "");
  div.appendChild(bubble);

  // user mesaj attıysa altta tut
  if(follow) _forceBottom(div);
  else _forceBottom(div); // ✅ kullanıcı mesaj attığında yine de alta çek (senin beklentin bu)
}

/* =========================================================
   ✅ KAYNANA "KONU AÇICI"
   ========================================================= */
function _pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

function buildProfileContextForKaynana(profile={}, memP={}) {
  const born =
    String(profile.dogumYeri || profile.birth_city || profile.birthPlace || memP.dogumYeri || memP.birth_city || memP.birthPlace || "").trim();

  const live =
    String(profile.city || profile.yasadigiSehir || profile.living_city || memP.city || memP.yasadigiSehir || memP.living_city || "").trim();

  const team =
    String(profile.team || memP.team || "").trim();

  const spouse =
    String(profile.spouse || memP.spouse || "").trim();

  const kidsRaw =
    String(profile.childNames || memP.childNames || "").trim();
  const kids =
    kidsRaw ? kidsRaw.split(/[,/]+/).map(x => x.trim()).filter(Boolean).slice(0, 6) : [];

  const kg =
    Number(profile.weight_kg || profile.weightKg || memP.weight_kg || memP.weightKg || 0) || 0;

  const cm =
    Number(profile.height_cm || profile.heightCm || memP.height_cm || memP.heightCm || 0) || 0;

  return { born, live, team, spouse, kids, kg, cm };
}

function kaynanaOpener(ctx, hitap="evladım") {
  const pool = [];
  if (ctx.born && ctx.live && ctx.born.toLowerCase() !== ctx.live.toLowerCase()) {
    pool.push(`Bak ${hitap}, sen ${ctx.born}lısın ama ${ctx.live}’de yaşıyorsun… hiç memleket özlemi yok mu?`);
  }
  if (ctx.live && !ctx.born) pool.push(`${hitap}, ${ctx.live} nasıl gidiyor? Oralar hâlâ aynı mı?`);
  if (ctx.spouse) pool.push(`${hitap}, eşin ${ctx.spouse} nasıl?`);
  if (ctx.kids.length) pool.push(`Torunlarım ${ctx.kids.join(", ")} nasıl ${hitap}?`);
  if (ctx.team) pool.push(`${hitap}, ${ctx.team} yine kalbini kırdı mı?`);
  if (ctx.kg) pool.push(`${hitap}, şu ${ctx.kg} kilo meselesini bir toparlasak mı?`);
  pool.push(`Ee ${hitap}, bugün moral nasıl?`);
  return _pick(pool);
}

function isConversationStuck(userMessage="") {
  const t = String(userMessage||"").trim().toLowerCase();
  if(!t) return true;
  const short = t.length <= 4 || ["evet","hayır","ok","tamam","tm","he","yok","var","olur"].includes(t);
  return short;
}

function getKaynanaState(userId) {
  const k = `caynana_kaynana_state:${String(userId||"").toLowerCase().trim()}`;
  try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; }
}
function setKaynanaState(userId, st) {
  const k = `caynana_kaynana_state:${String(userId||"").toLowerCase().trim()}`;
  localStorage.setItem(k, JSON.stringify(st || {}));
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
    return { text: "Aman evladım sakın. Eğer acil risk varsa 112’yi ara. İstersen anlat, buradayım.", error: true, code: "SAFETY" };
  }

  const profile0 = getProfile();
  const mem0 = (() => { try { return getMemoryProfile() || {}; } catch { return {}; } })();
  const knownName =
    String(profile0.hitap || "").trim() ||
    firstNameFromFullname(profile0.fullname || "") ||
    String(mem0.hitap || "").trim() ||
    firstNameFromFullname(mem0.fullname || mem0.name || "") ||
    "";

  if (/benim ad(ı|im)\s+neydi|ad(ı|im)\s+neydi|ismim\s+neydi/i.test(message)) {
    if (knownName) return { text: `Adın ${knownName} evladım. 🙂` };
    return { text: "Adını söylememiştin evladım. “Adım …” diye yaz da kaydedeyim 🙂" };
  }

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

  const st = getKaynanaState(userId);
  st.lastUserAt = Date.now();
  st.stuckCount = isConversationStuck(message) ? (Number(st.stuckCount || 0) + 1) : 0;
  setKaynanaState(userId, st);

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
    isProfileCompleted: !!profile.isProfileCompleted,
  };

  const mergedProfile = mergeProfiles(formProfile, memP);
  const ctx = buildProfileContextForKaynana(profile, memP);

  // user mesajı store (başlık oluşsun)
  try { ChatStore.add?.("user", message); } catch {}

  const historyForApi = (() => {
    try {
      if (typeof ChatStore.getLastForApi === "function") return ChatStore.getLastForApi(30);
    } catch {}
    return [];
  })();

  const serverChatId = (ChatStore.getCurrentServerId?.() || null);

  const hitapForKaynana = String(mergedProfile.hitap || displayName || "evladım").trim() || "evladım";

  const payload = {
    text: message,
    message: message,
    user_id: userId,
    chat_id: (serverChatId || readChatId(userId)),
    mode,
    profile: mergedProfile,
    user_meta: mergedProfile,
    system_hint: `Kullanıcıya "${hitapForKaynana}" diye hitap et.`,
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

    let out = pickAssistantText(data) || "Bir aksilik oldu evladım.";

    // tıkandıysa opener ekle
    const st2 = getKaynanaState(userId);
    if (Number(st2.stuckCount || 0) >= 2) {
      const opener = kaynanaOpener(ctx, hitapForKaynana);
      st2.stuckCount = 0;
      setKaynanaState(userId, st2);
      out = `${out}\n\n${opener}`;
    }

    // ✅ assistant store yaz (tek kayıt)
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
