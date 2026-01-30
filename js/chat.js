// FILE: /js/chat.js
// STABLE + DUP SAFE + SP BALLOON POP

import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";
import { ChatStore } from "./chat_store.js";
import { getMemoryProfile, setMemoryProfile } from "./memory_profile.js";

const SAFETY_PATTERNS = { self_harm: /intihar|ölmek istiyorum|kendimi as(?:ıcam|acağım)|bileklerimi kes/i };

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
  return s ? s.split(/\s+/)[0] : "";
}

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

function extractNameFromText(text = "") {
  const s = String(text || "").trim();
  let m = s.match(/\b(adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü'’\-]{2,})(?:\b|$)/i);
  if (m && m[2]) return m[2];
  m = s.match(/\bben\s+([A-Za-zÇĞİÖŞÜçğıöşü'’\-]{2,})(?:\b|$)/i);
  if (m && m[1]) return m[1];
  return "";
}

// İzinli kayıt: sadece geçici hint
function maybePersistNameFromUserMessage(userMessage) {
  try {
    const p = getProfile();
    const has = !!(String(p.hitap || "").trim() || String(p.fullname || "").trim() || String(p.name || "").trim());
    if (has) return;

    const name = extractNameFromText(userMessage);
    if (!name) return;

    try {
      const fn = firstNameFromFullname(name);
      setMemoryProfile({ name, fullname: name, hitap: (fn || name) });
    } catch {}
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
  if (ctx.born && ctx.live && ctx.born.toLowerCase() !== ctx.live.toLowerCase())
    pool.push(`Bak ${hitap}, sen ${ctx.born}lısın ama ${ctx.live}’de yaşıyorsun… hiç memleket özlemi yok mu?`);
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

// DUP SAFE assistant store
let __lastAssistantWritten = "";
function scheduleAssistantStoreWrite(outText){
  try{
    const s = String(outText || "").trim();
    if(!s) return;
    if(__lastAssistantWritten === s) return;

    try{
      const last = (ChatStore.getLastForApi?.(1) || [])[0];
      if(last && String(last.role||"")==="assistant" && String(last.content||"").trim()===s){
        __lastAssistantWritten = s;
        return;
      }
    }catch{}

    const delay = Math.max(600, Math.min(4500, s.length * 12));
    setTimeout(()=> {
      try{
        if(__lastAssistantWritten === s) return;
        const last2 = (ChatStore.getLastForApi?.(1) || [])[0];
        if(last2 && String(last2.role||"")==="assistant" && String(last2.content||"").trim()===s){
          __lastAssistantWritten = s;
          return;
        }
        ChatStore.add?.("assistant", s);
        __lastAssistantWritten = s;
      }catch{}
    }, delay);
  }catch{}
}

// Samimiyet UI
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function setSamimiyetUI(score){
  const s = clamp(parseInt(score || 0, 10) || 0, 0, 100);
  const pct = clamp(Math.round((s / 100) * 100), 0, 100);
  const fill = document.getElementById("ypFill");
  const num  = document.getElementById("ypNum");
  if (fill) fill.style.width = pct + "%";
  if (num) num.textContent = `${s}/100`;
}

// ✅ BALON PATLAMA
function ensureBalloonStyle(){
  if (document.getElementById("__sp_balloon_style")) return;
  const st = document.createElement("style");
  st.id="__sp_balloon_style";
  st.textContent = `
    .sp-balloon{
      position: fixed;
      z-index: 99999;
      padding: 6px 10px;
      border-radius: 999px;
      font-weight: 950;
      font-size: 12px;
      letter-spacing: .2px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(20,20,20,.92);
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 40px rgba(0,0,0,.45);
      transform: translate(-50%, 0) scale(.9);
      opacity: 0;
      pointer-events: none;
      animation: spPop 900ms ease-out forwards;
    }
    .sp-balloon.pos{ border-color: rgba(190,242,100,.35); }
    .sp-balloon.neg{ border-color: rgba(255,82,82,.35); }
    @keyframes spPop{
      0%{ opacity:0; transform: translate(-50%, 10px) scale(.85); }
      20%{ opacity:1; transform: translate(-50%, 0) scale(1); }
      70%{ opacity:1; transform: translate(-50%, -14px) scale(1); }
      100%{ opacity:0; transform: translate(-50%, -22px) scale(.95); }
    }
  `;
  document.head.appendChild(st);
}

function showSPBalloon(delta){
  const d = parseInt(delta || 0, 10) || 0;
  if (!d) return;

  ensureBalloonStyle();

  // S.P chip’e yakın patlasın
  const chip = document.getElementById("ypNum") || document.querySelector(".yp-chip") || document.body;
  let x = window.innerWidth * 0.78;
  let y = 76;

  try{
    const r = chip.getBoundingClientRect();
    x = r.left + r.width * 0.65;
    y = r.top - 8;
  }catch{}

  const el = document.createElement("div");
  el.className = `sp-balloon ${d>0?"pos":"neg"}`;
  el.style.left = `${x}px`;
  el.style.top  = `${y}px`;
  el.textContent = `${d>0?"+":""}${d}`;
  document.body.appendChild(el);

  setTimeout(()=>{ try{ el.remove(); }catch{} }, 950);
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

  maybePersistNameFromUserMessage(message);

  const profile = getProfile();
  const userId = String(profile?.email || profile?.user_id || profile?.id || "").trim();
  if (!userId) return { text: "Profilde user_id yok. Çıkış yapıp tekrar giriş yapman lazım evladım.", error: true };

  const memP = (()=>{ try{return getMemoryProfile()||{}}catch{return {}} })();
  const displayName = String(
    profile.hitap ||
    firstNameFromFullname(profile.fullname||"") ||
    memP.hitap ||
    firstNameFromFullname(memP.fullname||memP.name||"") ||
    ""
  ).trim();

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
    weight_kg: profile.weight_kg || null,
    plan: profile.plan || null
  }, memP);

  const st = getKaynanaState(userId);
  st.stuckCount = isConversationStuck(message) ? (Number(st.stuckCount || 0) + 1) : 0;
  setKaynanaState(userId, st);

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

    if (data && typeof data === "object") {
  const spScore   = (data.sp_score ?? data.spScore ?? null);
  const spDelta   = (data.sp_delta ?? data.spDelta ?? 0);
  const spReasons = (data.sp_reasons || data.spReasons || {});

  // skor UI
  if (spScore !== null && spScore !== undefined) {
    setSamimiyetUI(spScore);
    try {
      const p2 = getProfile();
      p2.sp_score = parseInt(spScore, 10);
      setProfile(p2);
    } catch {}
  }

  // ✅ +5 (günün ilk mesaj bonusu) balonunu günde 1 kez göster
  if (spDelta) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const seenKey = `caynana_sp_firstmsg_seen:${String(userId).toLowerCase()}:${todayKey}`;

    const isFirstMsgBonus =
      (spDelta === 5) &&
      (spReasons.first_msg_bonus === 5 || spReasons.first_msg_bonus === +5 || spReasons.first_msg_bonus != null);

    if (spDelta === 5 && isFirstMsgBonus) {
      const seen = (localStorage.getItem(seenKey) || "") === "1";
      if (!seen) {
        showSPBalloon(spDelta);
        localStorage.setItem(seenKey, "1");
      }
    } else {
      // -5 ceza, -1 küfür, +1 yalakalık vb hepsi her sefer gösterilebilir
      showSPBalloon(spDelta);
    }
  }
}

    let out = pickAssistantText(data) || "Bir aksilik oldu evladım.";

    const st2 = getKaynanaState(userId);
    if (Number(st2.stuckCount || 0) >= 2) {
      st2.stuckCount = 0;
      setKaynanaState(userId, st2);
      out = `${out}\n\n${kaynanaOpener(ctx, String(mergedProfile.hitap || "evladım"))}`;
    }

    scheduleAssistantStoreWrite(out);
    return { text: out, raw: data };
  };

  try { return await attempt(); }
  catch(e){
    await sleep(500);
    try { return await attempt(); } catch {}
    return { text: "Bağlantı koptu gibi. Bir daha dener misin?", error: true, code: "NETWORK" };
  }
}
