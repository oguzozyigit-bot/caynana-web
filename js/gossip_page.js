// FILE: /js/gossip_page.js
// DESIGN-FIRST: ID invite + accept/reject + 2-person chat room (local demo)
// ✅ My Kaynana comments: only me see
// ✅ Other side would see their own Kaynana on their device (backend later)
// ✅ Tone by sp_score (0-100) -> praise/roast
// ✅ Inbox polling (localStorage demo)

import { initMenuHistoryUI } from "/js/menu_history_ui.js";
import { STORAGE_KEY } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2400);
}

function getMe(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  const id = String(u.user_id || u.id || u.email || "").trim();
  return id || "guest";
}
function getSP(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return clamp(parseInt(u.sp_score ?? 10,10)||10, 0, 100);
}
function syncTopUI(){
  try{
    const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
    const s = clamp(parseInt(u.sp_score ?? 10,10)||10, 0, 100);
    if($("ypFill")) $("ypFill").style.width = `${s}%`;
    if($("ypNum")) $("ypNum").textContent = `${s}/100`;
    if($("planChip")) $("planChip").textContent = String(u.plan || "FREE").toUpperCase();
  }catch{}
}

/* -------------------------------------------------
   Local demo “backend” keys
------------------------------------------------- */
function inboxKey(userId){ return `caynana_gossip_inbox:${userId}`; }
function roomKey(a,b){
  const x = [String(a), String(b)].sort();
  return `caynana_gossip_room:${x[0]}__${x[1]}`;
}
function sessionKey(){ return `caynana_gossip_session:${getMe()}`; }

function loadInbox(uid){
  return safeJson(localStorage.getItem(inboxKey(uid)), []);
}
function saveInbox(uid, items){
  localStorage.setItem(inboxKey(uid), JSON.stringify(items||[]));
}
function pushInbox(uid, item){
  const arr = loadInbox(uid);
  arr.unshift(item);
  saveInbox(uid, arr.slice(0,20));
}

function loadRoom(a,b){
  return safeJson(localStorage.getItem(roomKey(a,b)), { ok:false, a, b, accepted:false, messages:[] });
}
function saveRoom(a,b, obj){
  localStorage.setItem(roomKey(a,b), JSON.stringify(obj||{}));
}

function setSession(peerId){
  localStorage.setItem(sessionKey(), String(peerId||""));
}
function getSession(){
  return (localStorage.getItem(sessionKey()) || "").trim();
}

/* -------------------------------------------------
   Kaynana Interjection (tone by sp_score)
------------------------------------------------- */
function kaynanaTone(sp){
  if(sp < 20) return "sert";
  if(sp < 40) return "normal";
  if(sp < 70) return "samimi";
  return "evladim_modu";
}

function kaynanaComment(sp, userText){
  const t = kaynanaTone(sp);
  const s = String(userText||"").trim().toLowerCase();

  const poke = [
    "Evladım… bunu yazarken iki kez düşünseydin keşke.",
    "Bak bak… dedikodunun da bir adabı var.",
    "Sen yaz, ben araya gerçekleri serpiştireyim 🙂",
    "Hah! Tam da bunu bekliyordum…",
  ];
  const praise = [
    "Aferin evladım, sakin kalmışsın. Nadir görülür 🙂",
    "Bak bu sefer iyi toparladın, helal.",
    "Akıllı konuşuyorsun bugün… nazar değmesin.",
    "Kaynana gurur duydu. Çok da şımarmayalım ama 🙂",
  ];
  const spicy = [
    "Bunu yazdın ya… karşı tarafın kaşı kalkar, söyleyeyim.",
    "Heh! Tam ‘dedikodu kazanı’ kıvamı.",
    "Biraz daha yazarsan kazan taşacak evladım.",
    "Ağzından çıkanı kulağın duysun… ama devam 🙂",
  ];

  // basit tetikleyiciler
  let pool = spicy;
  if(s.includes("özür") || s.includes("pardon") || s.includes("haklısın")) pool = praise;
  if(s.includes("salak") || s.includes("aptal") || s.includes("küst") || s.includes("kızdım")) pool = poke;

  if(t === "sert") return "Evladım… senin dilin bazen çok uzuyor. Biraz toparlan.";
  if(t === "normal") return pool[Math.floor(Math.random()*pool.length)];
  if(t === "samimi") return praise[Math.floor(Math.random()*praise.length)];
  return "Canım evladım… ben senin iyiliğini isterim. Yaz ama ölçülü yaz 🙂";
}

/* -------------------------------------------------
   UI rendering
------------------------------------------------- */
function renderInbox(){
  const me = getMe();
  const inbox = loadInbox(me);
  $("inboxCount").textContent = String(inbox.length||0);

  const box = $("inbox");
  box.innerHTML = "";

  if(!inbox.length){
    box.classList.remove("show");
    return;
  }
  box.classList.add("show");

  inbox.forEach((it, idx)=>{
    const row = document.createElement("div");
    row.className = "req";
    row.innerHTML = `
      <div class="l">
        <div><b>İstek:</b> ${it.from}</div>
        <div style="margin-top:4px;color:rgba(255,255,255,.60);font-weight:900;font-size:11px;">“Dedikodu kazanına gelsene”</div>
      </div>
      <div class="r">
        <button class="btn" data-act="ok">Onayla</button>
        <button class="btn secondary" data-act="no">Reddet</button>
      </div>
    `;

    row.querySelector('[data-act="ok"]').addEventListener("click", ()=>{
      acceptInvite(it.from);
    });
    row.querySelector('[data-act="no"]').addEventListener("click", ()=>{
      rejectInvite(it.from);
    });

    box.appendChild(row);
  });
}

function renderChat(room){
  const chat = $("chat");
  chat.innerHTML = "";

  if(!room?.accepted){
    chat.innerHTML = `<div class="bubble other">Henüz sohbet yok evladım. ID ekle, istek gitsin, onay gelsin 🙂</div>`;
    return;
  }

  room.messages.forEach(m=>{
    const div = document.createElement("div");
    if(m.type === "kaynana"){
      div.className = "bubble kaynana";
      div.innerHTML = `<div class="tag">Kaynana (sadece sana)</div>${escapeHTML(m.text)}`;
    }else{
      div.className = `bubble ${m.from === getMe() ? "me" : "other"}`;
      div.textContent = m.text;
    }
    chat.appendChild(div);
  });

  chat.scrollTop = chat.scrollHeight;
}

function escapeHTML(s=""){
  return String(s).replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

/* -------------------------------------------------
   Invite flow (design)
------------------------------------------------- */
function normalizeId(x){
  return String(x||"").trim();
}

function sendInvite(peerId){
  const me = getMe();
  const peer = normalizeId(peerId);
  if(!peer || peer.length < 4) return toast("Evladım düzgün bir ID yaz.");
  if(peer === me) return toast("Kendinle dedikodu mu yapacaksın evladım? 🙂");

  // create room skeleton
  const r = loadRoom(me, peer);
  r.ok = true;
  r.a = me; r.b = peer;
  r.accepted = false;
  r.messages = r.messages || [];
  saveRoom(me, peer, r);

  // push inbox to peer
  pushInbox(peer, { type:"invite", from: me, at: Date.now() });

  // local session set
  setSession(peer);
  updateRoomHeader(peer, false);
  renderChat(r);

  toast("İstek gitti evladım. Karşı taraf onaylarsa kazan kaynar.");
}

function acceptInvite(fromId){
  const me = getMe();
  const peer = String(fromId);

  // mark room accepted
  const r = loadRoom(me, peer);
  r.ok = true;
  r.accepted = true;
  r.messages = r.messages || [];
  if(!r.messages.length){
    r.messages.push({ id: "sys1", from: me, type:"msg", text:"Tamam, dedikodu kazanı açıldı." , at: Date.now()});
  }
  saveRoom(me, peer, r);

  // remove from inbox
  const inbox = loadInbox(me).filter(x => x.from !== peer);
  saveInbox(me, inbox);

  // notify other (demo): push "accepted" into their inbox
  pushInbox(peer, { type:"accepted", from: me, at: Date.now() });

  setSession(peer);
  updateRoomHeader(peer, true);
  renderInbox();
  renderChat(r);

  toast("Onayladım evladım. Şimdi yaz bakalım.");
}

function rejectInvite(fromId){
  const me = getMe();
  const peer = String(fromId);
  const inbox = loadInbox(me).filter(x => x.from !== peer);
  saveInbox(me, inbox);
  renderInbox();
  toast("Reddettim. Kazanı soğuttun evladım 🙂");
}

function updateRoomHeader(peerId, accepted){
  const peer = normalizeId(peerId);
  const title = $("roomTitle");
  const meta = $("roomMeta");
  if(!peer){
    title.textContent = "Henüz eşleşme yok";
    meta.textContent = "ID ekleyip onay bekle";
    return;
  }
  title.textContent = `Dedikodu: ${peer}`;
  meta.textContent = accepted ? "Sohbet açık" : "Onay bekleniyor";
}

/* -------------------------------------------------
   Messaging
------------------------------------------------- */
function ensureRoom(){
  const peer = getSession();
  const me = getMe();
  if(!peer) return null;

  const r = loadRoom(me, peer);
  return { peer, room: r };
}

function pushMessage(roomObj, from, text){
  const msg = { id: "m_" + Date.now(), from, type:"msg", text: String(text||""), at: Date.now() };
  roomObj.messages.push(msg);
}

function pushKaynana(roomObj, text){
  const msg = { id: "k_" + Date.now(), from: "kaynana", type:"kaynana", text: String(text||""), at: Date.now() };
  roomObj.messages.push(msg);
}

async function sendMessage(){
  const txt = String($("msg").value||"").trim();
  if(!txt) return;

  const me = getMe();
  const s = ensureRoom();
  if(!s){ return toast("Evladım önce ID ekle, eşleş."); }

  const { peer, room } = s;
  if(!room.accepted){
    toast("Evladım daha onay gelmedi. Sabır 🙂");
    return;
  }

  $("msg").value = "";
  autoGrow();

  // add my message
  pushMessage(room, me, txt);

  // ✅ Kaynana araya laf sokar (sadece ben görürüm)
  const sp = getSP();
  if(Math.random() < 0.65){
    pushKaynana(room, kaynanaComment(sp, txt));
  }

  saveRoom(me, peer, room);
  renderChat(room);

  // demo other reply (tasarım için): kısa gecikmeyle “karşı taraf” mesajı
  await sleep(650);
  const fake = makeOtherReply(txt);
  pushMessage(room, peer, fake);

  // karşı tarafın kaynanası da ona yazacak (ben görmem) → burada eklemiyoruz.
  // gerçek sistemde server other-side response produce eder.

  saveRoom(me, peer, room);
  renderChat(room);
}

function makeOtherReply(userTxt){
  const s = String(userTxt||"").toLowerCase();
  const pool = [
    "Hee… anladım. Devam et.",
    "Yok ya, abartıyorsun bence.",
    "Tamam tamam, susma söyle 🙂",
    "Bunu böyle anlatınca komik oldu.",
    "Sen var ya… neyse 😄",
    "Hımm… buna bir bakmak lazım."
  ];
  if(s.includes("özür")) return "Tamam, uzatma. Ama not ettim.";
  if(s.includes("kızd")) return "Kızma ya, sakin ol biraz.";
  return pool[Math.floor(Math.random()*pool.length)];
}

function autoGrow(){
  const ta = $("msg");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

/* -------------------------------------------------
   Polling inbox + accepted signal (demo)
------------------------------------------------- */
function poll(){
  const me = getMe();
  const inbox = loadInbox(me);

  // accepted message from peer -> room accepted
  const acceptedFrom = inbox.find(x => x.type === "accepted");
  if(acceptedFrom){
    const peer = acceptedFrom.from;
    const r = loadRoom(me, peer);
    r.ok = true;
    r.accepted = true;
    r.messages = r.messages || [];
    saveRoom(me, peer, r);

    // remove accepted note
    saveInbox(me, inbox.filter(x => !(x.type==="accepted" && x.from===peer)));

    setSession(peer);
    updateRoomHeader(peer, true);
  }

  renderInbox();

  // refresh current room
  const peer = getSession();
  if(peer){
    const r = loadRoom(me, peer);
    updateRoomHeader(peer, !!r.accepted);
    renderChat(r);
  }
}

/* -------------------------------------------------
   Boot
------------------------------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  try{ initMenuHistoryUI(); }catch{}
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  syncTopUI();

  $("btnInvite")?.addEventListener("click", ()=> sendInvite($("peerId").value));
  $("btnRefresh")?.addEventListener("click", ()=> poll());

  $("send")?.addEventListener("click", sendMessage);
  $("msg")?.addEventListener("input", autoGrow);
  $("msg")?.addEventListener("keydown", (e)=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      sendMessage();
    }
  });

  // restore session
  const peer = getSession();
  if(peer){
    const r = loadRoom(getMe(), peer);
    updateRoomHeader(peer, !!r.accepted);
    renderChat(r);
  }else{
    updateRoomHeader("", false);
    renderChat({ accepted:false, messages:[] });
  }

  renderInbox();
  autoGrow();

  // poll every 2s (demo)
  setInterval(poll, 2000);
});
