const KEY="caynana_chat_history";

export const ChatStore = {
  history(){
    return JSON.parse(localStorage.getItem(KEY)||"[]");
  },
  add(role,content){
    const h=this.history();
    h.push({role,content});
    localStorage.setItem(KEY,JSON.stringify(h));
  },
  load(chatEl){
    this.history().forEach(m=>{
      const div=document.createElement("div");
      div.className=`bubble ${m.role==="user"?"user":"bot"}`;
      div.textContent=m.content;
      chatEl.appendChild(div);
    });
    chatEl.scrollTop=chatEl.scrollHeight;
  },
  clear(){
    localStorage.removeItem(KEY);
  }
};
