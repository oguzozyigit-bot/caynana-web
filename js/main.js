import { apiMe, getToken } from "./api.js";
import { openAuthModal, bindAuthUI } from "./auth.js";
import { renderDock, dockDragClickGuard } from "./dock.js";
import { sendMessage } from "./chat.js";
import { bindAudio } from "./audio.js";
import { resetFal } from "./fal.js";
import { openPage, bindPageModal } from "./ui_modals.js";

marked.setOptions({ mangle:false, headerIds:false });

const MODES = {
  chat:{ label:"Sohbet", icon:"fa-comments", color:"#FFB300", title:"Caynana ile<br>iki lafın belini kır.", desc:"Biraz dur bakalım, neler anlatacaksın?", img: asset("images/hero-chat.png"), ph:"Naber Caynana?", sugg:"Benim zamanımda her şey daha güzeldi ah ah…" },
  shopping:{ label:"Alışveriş", icon:"fa-bag-shopping", color:"#00C897", title:"Almadan önce<br>Caynana’ya sor.", desc:"Sonra “keşke” dememek için buradayım.", img: asset("images/hero-shopping.png"), ph:"Ne arıyorsun evladım?", sugg:"Her indirime atlayan sonunda pahalı öder." },
  fal:{ label:"Fal", icon:"fa-mug-hot", color:"#8B5CF6", title:"Fincanı kapat<br>tabakla gönder.", desc:"3 açı çek: üstten, yandan, diğer yandan.", img: asset("images/hero-fal.png"), ph:"", sugg:"Sadece fincan + tabak." },
  health:{ label:"Sağlık", icon:"fa-heart-pulse", color:"#EF4444", title:"Caynana Sağlık'la<br>turp gibi ol.", desc:"Neren ağrıyor söyle bakayım?", img: asset("images/hero-health.png"), ph:"Şikayetin ne?", sugg:"Çay üstüne sakın soğuk su içme!" },
  diet:{ label:"Diyet", icon:"fa-carrot", color:"#84CC16", title:"Sağlıklı beslen<br>zinde kal!", desc:"Açlıktan değil, keyiften yiyin.", img: asset("images/hero-diet.png"), ph:"Boy kilo kaç?", sugg:"Ekmek değil, yeşillik ye." },
  food:{ label:"Yemek", icon:"fa-utensils", color:"#F97316", title:"Bugün ne<br>pişirsem derdi biter.", desc:"Dolapta ne var söyle, tarif benden.", img: asset("images/hero-food.png"), ph:"Dolapta ne var?", sugg:"Malzemeyi ziyan etme, bereket kaçar." },
  law:{ label:"Hukuk", icon:"fa-scale-balanced", color:"#3B82F6", title:"Hukuk işleri<br>şakaya gelmez.", desc:"Ben avukat değilim ama çok dava gördüm.", img: asset("images/hero-law.png"), ph:"Derdini anlat.", sugg:"Sözleşmeye bakmadan imza atma!" },
  astro:{ label:"Burç", icon:"fa-star", color:"#D946EF", title:"Yıldızlar senin için<br>ne diyor?", desc:"Merkür retrosu falan… dikkat et.", img: asset("images/hero-astro.png"), ph:"Burcun ne?", sugg:"Yıldıznameye baktım, yolun açık." },
  translate:{ label:"Çeviri", icon:"fa-language", color:"#64748B", title:"Çeviri lazım mı?<br>Söyle çevireyim.", desc:"Metni yapıştır veya fotoğrafını çek.", img: asset("images/hero-translate.png"), ph:"Metni yaz.", sugg:"Bir lisan bir insan." },
  dream:{ label:"Rüya", icon:"fa-cloud-moon", color:"#6366F1", title:"Rüyalar alemine<br>hoş geldin.", desc:"Hayırdır inşallah…", img: asset("images/hero-dream.png"), ph:"Ne gördün?", sugg:"Rüyalar tersine çıkar derler ama…" }
};

const state = {
  sessionId: "sess_" + Math.random().toString(36).slice(2,10),
  currentMode: "chat",
  currentPersona: "normal",
  currentPlan: "free",
  pendingImage: null,
  currentAudio: null,
  isSending: false,
  falImages: []
};

const PLAN_PERSONAS = {
  free: ["normal"],
  plus: ["normal","sevecen","kizgin"],
  pro:  ["normal","sevecen","kizgin","huysuz","itirazci"]
};

const ui = {
  heroImage: document.getElementById("heroImage"),
  heroTitle: document.getElementById("heroTitle"),
  heroDesc: document.getElementById("heroDesc"),
  suggestionText: document.getElementById("suggestionText"),
  chat: document.getElementById("chatContainer"),
  heroContent: document.getElementById("heroContent"),
  text: document.getElementById("text"),
  sendBtn: document.getElementById("sendBtn"),
  fileInput: document.getElementById("fileInput"),
  photoModal: document.getElementById("photoModal"),
  photoPreview: document.getElementById("photoPreview"),
  photoOkBtn: document.getElementById("photoOkBtn"),
  photoCancelBtn: document.getElementById("photoCancelBtn"),
  photoTitle: document.getElementById("photoTitle"),
  falStepText: document.getElementById("falStepText"),
  falStepSub: document.getElementById("falStepSub"),
  drawer: document.getElementById("drawer"),
  drawerMask: document.getElementById("drawerMask"),
  personaModal: document.getElementById("personaModal"),
  personaClose: document.getElementById("personaClose")
};

function basePath(){
  const p = location.pathname;
  return p.endsWith("/") ? p : p.substring(0, p.lastIndexOf("/") + 1);
}
function asset(rel){ return basePath() + rel.replace(/^\/+/, ""); }

function scrollToBottom(force=false){
  const c = ui.chat;
  if(force){ requestAnimationFrame(()=>{ c.scrollTop = c.scrollHeight; }); return; }
  const nearBottom = (c.scrollHeight - c.scrollTop - c.clientHeight) < 260;
  if(!nearBottom) return;
  requestAnimationFrame(()=>{ c.scrollTop = c.scrollHeight; });
}
ui.scrollToBottom = scrollToBottom;

async function addBubble(role, text, isLoader=false, speech=null, imgData=null, id=null){
  const div = document.createElement("div");
  div.className = "msg " + role;
  if(id) div.id = id;

  let content = "";
  if(imgData){
    content += `<img class="chat-img" src="${imgData}" style="max-width:100%; border-radius:12px; margin-bottom:8px;"
      onclick="event.stopPropagation()" onpointerdown="event.stopPropagation()">`;
  }

  div.innerHTML = `<div class="bubble">${content}</div>`;
  const bubble = div.querySelector(".bubble");
  ui.chat.appendChild(div);

  ui.heroContent.style.display = "none";
  ui.chat.style.display = "block";
  scrollToBottom(true);

  if(role==="ai" && !isLoader){
    // typewriter
    bubble.innerHTML = "";
    bubble.classList.add("typing-cursor");
    let i=0;
    function type(){
      if(i < text.length){
        bubble.textContent += text.charAt(i++);
        scrollToBottom(true);
        setTimeout(type, 22);
      } else {
        bubble.classList.remove("typing-cursor");
        bubble.innerHTML = DOMPurify.sanitize(marked.parse(text));
        scrollToBottom(true);
        // audio btn
        const sp = (speech && speech.trim()) ? speech : (text||"").replace(/[*_`#>-]/g,"").slice(0,280);
        const btn = document.createElement("div");
        btn.className="audio-btn";
        btn.setAttribute("data-speech", sp);
        btn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Caynana Konuşuyor`;
        div.appendChild(btn);
      }
    }
    type();
  } else {
    bubble.innerHTML += (role==="user" ? (text||"") : (text||""));
  }
  return div;
}
ui.addBubble = addBubble;

function applyHero(modeKey){
  const m = MODES[modeKey] || MODES.chat;
  document.documentElement.style.setProperty("--primary", m.color);
  ui.heroImage.src = m.img;
  ui.heroTitle.innerHTML = m.title;
  ui.heroDesc.innerHTML = m.desc;
  ui.text.placeholder = m.ph || "Bir şey yaz...";
  ui.suggestionText.textContent = m.sugg || "";
  document.querySelector(".oz-l-dynamic").style.background = m.color;

  document.body.classList.toggle("fal-mode", modeKey === "fal");
}

function switchMode(k){
  if(k === state.currentMode) return;
  state.currentMode = k;
  applyHero(k);
  renderDock(MODES, ()=>state.currentMode, (mode)=>switchMode(mode));
  if(k === "fal") resetFal(state, ui);
}

function refreshPersonaLocks(){
  const allow = new Set(PLAN_PERSONAS[state.currentPlan] || ["normal"]);
  document.querySelectorAll("#personaModal .persona-opt").forEach(opt=>{
    const id = opt.getAttribute("data-persona");
    const icon = opt.querySelector("i");

    if(id === state.currentPersona){
      opt.classList.add("selected");
      opt.classList.remove("locked");
      icon.className="fa-solid fa-check";
      icon.style.display="block";
      return;
    }
    opt.classList.remove("selected");

    if(!allow.has(id)){
      opt.classList.add("locked");
      icon.className="fa-solid fa-lock";
      icon.style.display="block";
    } else {
      opt.classList.remove("locked");
      icon.style.display="none";
    }
  });
}

function planHtml(){
  return `
    <div style="font-weight:900;font-size:14px;color:#111;margin-bottom:10px;">Caynana Premium (Google Play)</div>

    <div style="display:flex; flex-direction:column; gap:10px;">
      ${planCard("FREE", "Ücretsiz", "Günde 2 fal • ~30 dk sohbet • Sadece Normal Kaynana", "#f5f5f5", "Normal")}
      ${planCard("PLUS", "79,99 TL / ay", "Günde 5 fal • ~120 dk sohbet • Sevecen + Kızgın", "#fff8e1", "Sevecen • Kızgın")}
      ${planCard("PRO", "119,99 TL / ay", "Sınırsız fal/sohbet • Huysuz + İtirazcı + Hepsi", "#111", "Huysuz • İtirazcı • Hepsi", true)}
    </div>

    <div style="margin-top:12px; padding:10px; border-radius:14px; background:#f7f7f7; font-size:12px; color:#444; font-weight:700;">
      Ödemeler uygulama içinden <b>Google Play</b> ile yapılır. Kart bilgisi bizde tutulmaz.
    </div>
  `;
}
function planCard(tag, price, desc, bg, mods, dark=false){
  const txt = dark ? "#fff" : "#111";
  const sub = dark ? "rgba(255,255,255,.85)" : "#555";
  const badgeBg = dark ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.07)";
  return `
    <div style="background:${bg}; color:${txt}; border-radius:16px; padding:12px; box-shadow:0 6px 18px rgba(0,0,0,.08);">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="font-weight:900; font-size:13px;">${tag}</div>
        <div style="font-weight:900; font-size:13px;">${price}</div>
      </div>
      <div style="margin-top:6px; font-weight:800; font-size:12px; color:${sub}; line-height:1.35;">${desc}</div>
      <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
        ${mods.split("•").map(m=>`<span style="padding:4px 8px; border-radius:999px; background:${badgeBg}; font-size:11px; font-weight:900;">${m.trim()}</span>`).join("")}
      </div>
    </div>
  `;
}

// Bind UI
bindPageModal();
bindAuthUI((plan)=>{
  state.currentPlan = (plan==="plus"||plan==="pro") ? plan : "free";
  state.currentPersona = "normal";
  refreshPersonaLocks();
});

document.getElementById("menuBtn").onclick = ()=>{ ui.drawerMask.style.display="block"; ui.drawer.classList.add("open"); };
ui.drawerMask.onclick = ()=>{ ui.drawerMask.style.display="none"; ui.drawer.classList.remove("open"); };

document.getElementById("accountBtn").onclick = ()=> openAuthModal();
document.getElementById("planBtn").onclick = ()=> openPage("Caynana Premium", planHtml());

document.getElementById("aboutBtn").onclick = ()=> openPage("Hakkımızda",
  `<p><b>Caynana</b>, “Yapay zekânın geleneksel aklı”. Sohbet, fal ve yorum içerikleri eğlence ve rehberlik amaçlıdır.</p>
   <p>Üyelik ile limitler genişler ve kaynana modları açılır.</p>`
);
document.getElementById("faqBtn").onclick = ()=> openPage("Sık Sorulan Sorular",
  `<p><b>1) Üyelik nasıl iptal edilir?</b><br>Google Play → Abonelikler.</p>
   <p><b>2) Ücretsiz kullanım var mı?</b><br>Var: Günlük limit bulunur.</p>
   <p><b>3) Alışveriş modülü ücretli mi?</b><br>Hayır, alışveriş sınırsızdır (Türkiye’de).</p>`
);
document.getElementById("contactBtn").onclick = ()=> openPage("İletişim", `<p>Destek: <b>support@caynana.ai</b></p>`);
document.getElementById("privacyBtn").onclick = ()=> openPage("Gizlilik",
  `<p>Minimum veri prensibiyle çalışırız. Kart bilgisi tutulmaz.</p>`
);

// Persona modal open/close + click
document.getElementById("personaBtn").onclick = ()=>{ refreshPersonaLocks(); ui.personaModal.classList.add("show"); };
ui.personaClose.onclick = ()=> ui.personaModal.classList.remove("show");
ui.personaModal.addEventListener("click",(e)=>{ if(e.target.id==="personaModal") ui.personaModal.classList.remove("show"); });

document.querySelectorAll("#personaModal .persona-opt").forEach(opt=>{
  opt.addEventListener("click", ()=>{
    const id = opt.getAttribute("data-persona");
    const allow = new Set(PLAN_PERSONAS[state.currentPlan] || ["normal"]);
    if(!allow.has(id)){
      ui.personaModal.classList.remove("show");
      openPage("Caynana Premium", planHtml());
      return;
    }
    state.currentPersona = id;
    refreshPersonaLocks();
    setTimeout(()=> ui.personaModal.classList.remove("show"), 120);
  });
});

// Camera/file
document.getElementById("camBtn").onclick = ()=>{ ui.fileInput.value=""; ui.fileInput.click(); };
document.getElementById("falCamBtn").onclick = ()=>{ ui.fileInput.value=""; ui.fileInput.click(); };

// Photo modal buttons
ui.photoCancelBtn.onclick = ()=>{ state.pendingImage=null; ui.photoModal.style.display="none"; ui.fileInput.value=""; };
ui.photoOkBtn.onclick = async ()=>{ ui.photoModal.style.display="none"; await sendMessage(state, ui); };

// file input -> preview (fal check backend’te yapılacak, burada direkt kabul)
ui.fileInput.addEventListener("change",(e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    state.pendingImage = r.result;
    ui.photoPreview.src = state.pendingImage;
    ui.photoTitle.textContent = (state.currentMode==="fal") ? "Fal fotoğrafı" : "Fotoğraf hazır";
    ui.photoModal.style.display = "flex";
  };
  r.readAsDataURL(f);
});

// Send
ui.sendBtn.onclick = ()=> sendMessage(state, ui);
ui.text.addEventListener("keypress",(e)=>{ if(e.key==="Enter") sendMessage(state, ui); });

// Audio
bindAudio(ui, state);

// Init
applyHero("chat");
renderDock(MODES, ()=>state.currentMode, (mode)=>switchMode(mode));
dockDragClickGuard();

(async ()=>{
  // plan çek
  const me = await apiMe();
  state.currentPlan = me?.plan || "free";
  refreshPersonaLocks();
})();
