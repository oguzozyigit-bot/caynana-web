import { apiPOST } from "./api.js";
import { STORAGE_KEY } from "./config.js";

const SAFETY_PATTERNS = {
  suicide: /intihar|ölmek istiyorum|bileklerimi|kendimi asıcam/i,
  explicit: /s[iı]k|yarak|a[nm]cık|orospu/i
};

export async function fetchTextResponse(msg, history=[]) {
  if (SAFETY_PATTERNS.suicide.test(msg)) return { text: "Aman evladım sakın! Bir su iç, derin nefes al.", error:true };
  if (SAFETY_PATTERNS.explicit.test(msg)) return { text: "Terbiyesizleşme! Ağzına biber sürerim.", error:true };

  const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  
  try {
    const res = await apiPOST("/api/chat", {
      text: msg,
      user_id: user.id || "guest",
      history: history
    });
    
    if(!res.ok) throw new Error("API Error");
    const data = await res.json();
    return { text: data.assistant_text || data.text || "Bir şeyler oldu." };
  } catch(e) {
    return { text: "Evladım tansiyonum çıktı, server cevap vermiyor.", error:true };
  }
}

export function typeWriter(text, elId='chat') {
  const div = document.getElementById(elId);
  const bubble = document.createElement('div');
  bubble.className = "bubble bot";
  div.appendChild(bubble);
  
  let i=0; 
  function type(){
    if(i<text.length){
      bubble.textContent += text.charAt(i);
      i++;
      div.scrollTop = div.scrollHeight;
      setTimeout(type, 20);
    }
  }
  type();
}

export function addUserBubble(text){
  const div = document.getElementById('chat');
  const bubble = document.createElement('div');
  bubble.className = "bubble user";
  bubble.textContent = text;
  div.appendChild(bubble);
  div.scrollTop = div.scrollHeight;
}
