import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";

const SAFETY_PATTERNS = {
  suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam/i,
  explicit: /s[iı]k|yarak|a[nm]cık|orospu/i
};

export async function fetchTextResponse(msg, history=[]) {
  if (SAFETY_PATTERNS.suicide.test(msg)) return { text: "Aman evladım sakın! Bir su iç, derin nefes al.", error:true };
  if (SAFETY_PATTERNS.explicit.test(msg)) return { text: "Terbiyesizleşme! Karşında anan yaşında kadın var.", error:true };

  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  
  try {
    const res = await apiPOST("/api/chat", {
      text: msg,
      message: msg,
      user_id: user.id || "guest",
      history: history,
      mode: window.currentAppMode || "chat"
    });
    
    if(!res.ok) throw new Error("API Error");
    const data = await res.json();
    return { text: data.assistant_text || data.text || "Bir şeyler oldu evladım." };
  } catch(e) {
    return { text: "Evladım internetin mi koptu? Cevap veremiyorum.", error:true };
  }
}

export function typeWriter(text, elId='chat') {
  const div = document.getElementById(elId);
  if(!div) return;
  const bubble = document.createElement('div');
  bubble.className = "bubble bot";
  div.appendChild(bubble);
  
  let i=0; 
  function type(){
    if(i<text.length){
      bubble.textContent += text.charAt(i);
      i++;
      div.scrollTop = div.scrollHeight;
      setTimeout(type, 15);
    }
  }
  type();
}

export function addUserBubble(text){
  const div = document.getElementById('chat');
  if(!div) return;
  const bubble = document.createElement('div');
  bubble.className = "bubble user";
  bubble.textContent = text;
  div.appendChild(bubble);
  div.scrollTop = div.scrollHeight;
}
