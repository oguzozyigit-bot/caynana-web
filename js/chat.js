/* js/chat.js - SOHBET MOTORU */
import { BASE_DOMAIN } from './config.js';
import { getProductCardHTML } from './cards.js';

// Mesaj Balonu Ekle
export function addBubble(text, role, containerId = 'chatContainer') {
    const c = document.getElementById(containerId);
    if(!c) return;
    const div = document.createElement("div");
    div.className = `msg-row ${role}`;
    div.innerHTML = `<div class="msg-bubble ${role}">${text}</div>`;
    c.appendChild(div);
    c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
}

// Daktilo Efekti
export function typeWriter(text, callback) {
    const c = document.getElementById('chatContainer');
    const id = "bot_msg_" + Date.now();
    c.innerHTML += `<div class="msg-row bot"><div class="msg-bubble bot" id="${id}"></div></div>`;
    const el = document.getElementById(id);
    
    let i = 0;
    function step() {
        if (i >= text.length) { if(callback) callback(); return; }
        el.innerHTML += text.charAt(i);
        i++;
        c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
        setTimeout(step, 10);
    }
    step();
}

// API İsteği
export async function fetchBotResponse(message, mode, persona) {
    const token = localStorage.getItem("auth_token");
    const user = JSON.parse(localStorage.getItem("user_info") || "{}");
    
    const res = await fetch(`${BASE_DOMAIN}/api/chat`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
            message: message, 
            mode: mode, 
            persona: persona, 
            user_name: user.hitap 
        })
    });
    
    if(!res.ok) throw new Error("Sunucu Hatası");
    return await res.json();
}
