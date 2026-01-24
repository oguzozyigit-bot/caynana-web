// js/chat_store.js (FINAL - Multi chat, last 10, soft delete)

const INDEX_KEY = "caynana_chat_index";   // sohbet listesi
const CHAT_PREFIX = "caynana_chat_";      // tekil sohbetler

function uid(){
  return "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function now(){
  return new Date().toISOString();
}

function loadIndex(){
  try { return JSON.parse(localStorage.getItem(INDEX_KEY) || "[]"); }
  catch { return []; }
}

function saveIndex(list){
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

function loadChat(id){
  try { return JSON.parse(localStorage.getItem(CHAT_PREFIX + id) || "[]"); }
  catch { return []; }
}

function saveChat(id, history){
  localStorage.setItem(CHAT_PREFIX + id, JSON.stringify(history));
}

export const ChatStore = {
  // aktif sohbet
  currentId: null,

  // --- INIT ---
  init(){
    const index = loadIndex().filter(c => !c.deleted_at);

    if(index.length === 0){
      this.newChat();
      return;
    }

    this.currentId = index[0].id;
  },

  // --- SOHBET LİSTESİ ---
  list(){
    return loadIndex()
      .filter(c => !c.deleted_at)
      .sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0,10);
  },

  // --- YENİ SOHBET ---
  newChat(){
    const id = uid();
    const index = loadIndex();

    index.unshift({
      id,
      title: "Yeni sohbet",
      created_at: now(),
      updated_at: now(),
      deleted_at: null
    });

    saveIndex(index.slice(0,10));
    saveChat(id, []);
    this.currentId = id;
  },

  // --- SİL (SOFT DELETE) ---
  deleteChat(id){
    const index = loadIndex().map(c=>{
      if(c.id === id){
        return { ...c, deleted_at: now() };
      }
      return c;
    });
    saveIndex(index);

    if(this.currentId === id){
      this.init();
    }
  },

  // --- AKTİF SOHBET HISTORY ---
  history(){
    if(!this.currentId) this.init();
    return loadChat(this.currentId);
  },

  // --- MESAJ EKLE ---
  add(role, content){
    if(!this.currentId) this.init();

    const h = loadChat(this.currentId);
    h.push({ role, content, at: now() });
    saveChat(this.currentId, h);

    // index güncelle
    const index = loadIndex().map(c=>{
      if(c.id === this.currentId){
        return { ...c, updated_at: now() };
      }
      return c;
    });
    saveIndex(index);
  },

  // --- CHAT UI'YI DOLDUR ---
  load(chatEl){
    if(!this.currentId) this.init();
    chatEl.innerHTML = "";

    this.history().forEach(m=>{
      const div = document.createElement("div");
      div.className = `bubble ${m.role === "user" ? "user" : "bot"}`;
      div.textContent = m.content;
      chatEl.appendChild(div);
    });

    chatEl.scrollTop = chatEl.scrollHeight;
  },

  // --- TEMİZLE (AKTİF SOHBET) ---
  clearCurrent(){
    if(!this.currentId) return;
    saveChat(this.currentId, []);
  }
};
