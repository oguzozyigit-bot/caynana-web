// FILE: /js/chat.js
// ROLLBACK-STABLE (ŞÜKÜR ÖNCESİ) + ✅ OKUNABİLİR SCROLL FIX
// ✅ Assistant cevabı ChatStore’a HEMEN yazmaz (double render + scroll kayması olmaz)
// ✅ Scroll: 3 frame _forceBottom (DOM gecikmesini yutar)
// ✅ OKUNABİLİR SCROLL: Kullanıcı yukarı çıkarsa artık ZORLA aşağı çekmez (asıl sorun buydu)
// ✅ Name memory + kaynana opener + profile merge DURUYOR (eksiltme yok)

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

/* =========================
   SCROLL (ŞÜKÜR STABLE) + ✅ OKUNABİLİR
   ========================= */
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

// ✅ Kullanıcı altta mı? (okunabilir scroll için şart)
function _isNearBottom(el, slack = 220){
  try { return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch { return true; }
}

/* UI helpers */
export function addBotBubble(text, elId="chat"){
  const div = document.getElementById(elId);
  if(!div) return;

  const follow = _isNearBottom(div);

  const bubble = document.createElement("div");
  bubble.className = "bubble bot";
  bubble.textContent = String(text||"");
  div.appendChild(bubble);

  // ✅ sadece kullanıcı alttaysa alta çek
  if(follow) _forceBottom(div);
}

export function typeWriter(text, elId = "chat") {
  const div = document.getElementById(elId);
  if (!div) return;

  // ✅ başlangıçta alttaysa takip et, kullanıcı yukarı çıkarsa bırak
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
      if (follow) _forceBottom(div);   // ✅ sadece alttaysa
      setTimeout(type, 28);
    } else {
      div.removeEventListener("scroll", onScroll);
      if (follow) _forceBottom(div);   // ✅ sadece alttaysa
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

  // ✅ kullanıcı mesaj attıysa doğal olarak alta git (bu isteniyor)
  _forceBottom(div);
}

/* =========================
   Kaynana opener (duruyor)
   ========================= */
function _pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

function buildProfileContextForKaynana(profile={}, memP={}) {
  const born = String(profile.dogumYeri || memP.dogumYeri || "").trim();
  const live = String(profile.city || memP.city || "").trim();
  const team = String(profile.team || memP.team || "").trim();
  const spouse = String(profile.spouse || memP.spouse || "").trim();
  const kidsRaw = String(profile.childNames || memP.childNames || "").trim();
  const kids = kidsRaw ? kidsRaw.split(/[,/]+/).map(x=>x.trim()).filter(Boolean).slice(0,6) : [];
  const kg = Number(profile.weight_kg || memP.weight_kg || 0) || 0;
  const cm = Number(profile.height_cm || memP.height_cm || 0) || 0;
  return { born, live, team, spouse, kids, kg, cm };
}

function kaynanaOpener(ctx, hitap="evladım") {
  const pool = [];
  if (ctx.born && ctx.live && ctx.born.toLowerCase() !== ctx.live.toLowerCase()) pool.push(`Bak ${hitap}, sen ${ctx.born}lısın ama ${ctx.live}’de yaşıyorsun… hiç memleket özlemi yok mu?`);
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
  return (t.length <= 4 || ["evet","hayır","ok","tamam","tm","he","yok","var","olur"].includes(t));
}

function getKaynanaState(userId) {
  const k = `caynana_kaynana_state:${String(userId||"").toLowerCase().trim()}`;
  try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; }
}
function setKaynanaState(userId, st) {
  const k = `caynana_kaynana_state:${String(userId||"").toLowerCase().trim()}`;
  localStorage.setItem(k, JSON.stringify(st || {}));
}

/* ✅ KRİTİK: Assistant store yazımı GECİKMELİ */
function scheduleAssistantStoreWrite(outText){
  try{
    const s = String(outText || "");
    const delay = Math.max(600, Math.min(4500, s.length * 12));
    setTimeout(()=>{ try{ ChatStore.add?.("assistant", s); }catch{} }, delay);
  }catch{}
}

export async function fetchTextResponse(msg, modeOrHistory = "chat") {
  const message = String(msg || "").trim();
  if (!message) return { text: "", error: true };

  if (!hasLoginToken()) {
    return { text: "Önce giriş yapman lazım evladım. 🙂", error: true, code: "AUTH_REQUIRED" };
  }

  if (SAFETY_PATTERNS.self_harm.test(message)) {
    return { text: "Aman evladım sakın. Eğer acil risk varsa 112’yi ara. İstersen anlat, buradayım.", error: true, code: "SAFETY" };
  }

  // isim yakala
  maybePersistNameFromUserMessage(message);

  const profile = getProfile();
  const userId = String(profile?.email || profile?.user_id || profile?.id || "").trim();
  if (!userId) return { text: "Profilde user_id yok. Çıkış yapıp tekrar giriş yapman lazım evladım.", error: true };

  const memP = (()=>{ try{return getMemoryProfile()||{}}catch{return {}} })();
  const displayName = String(profile.hitap || firstNameFromFullname(profile.fullname||"") || memP.hitap || firstNameFromFullname(memP.fullname||memP.name||"") || "").trim();

  const mergedProfile = mergeProfiles({
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
    height_cm: profile.height_cm || null,
    weight_kg: profile.weight_kg || null
  }, memP);

  // stuck state
  const st = getKaynanaState(userId);
  st.stuckCount = isConversationStuck(message) ? (Number(st.stuckCount || 0) + 1) : 0;
  setKaynanaState(userId, st);

  // user store (başlık anında)
  try { ChatStore.add?.("user", message); } catch {}

  const ctx = buildProfileContextForKaynana(profile, memP);
  const serverChatId = (ChatStore.getCurrentServerId?.() || null);

  const payload = {
    text: message,
    message: message,
    user_id: userId,
    chat_id: (serverChatId || readChatId(userId)),
    mode: String(modeOrHistory || "chat"),
    profile: mergedProfile,
    user_meta: mergedProfile,
    web: "auto",
    enable_web_search: true,
    history: (ChatStore.getLastForApi?.(30) || [])
  };

  const attempt = async () => {
    const res = await apiPOST("/api/chat", payload);
    if (!res.ok) {
      const t = await res.text().catch(()=> "");
      throw new Error(`API Error ${res.status} ${t}`);
    }
    const data = await res.json().catch(()=> ({}));

    if (data.chat_id) {
      writeChatId(userId, data.chat_id);
      ChatStore.setServerId?.(data.chat_id);
    }

    let out = pickAssistantText(data) || "Bir aksilik oldu evladım.";

    // stuck opener
    const st2 = getKaynanaState(userId);
    if (Number(st2.stuckCount || 0) >= 2) {
      st2.stuckCount = 0;
      setKaynanaState(userId, st2);
      out = `${out}\n\n${kaynanaOpener(ctx, String(mergedProfile.hitap || "evladım"))}`;
    }

    // ✅ store yazımı gecikmeli
    scheduleAssistantStoreWrite(out);

    return { text: out };
  };

  try { return await attempt(); }
  catch(e){
    await sleep(500);
    try { return await attempt(); } catch {}
    return { text: "Bağlantı koptu gibi. Bir daha dener misin?", error: true, code: "NETWORK" };
  }
}
