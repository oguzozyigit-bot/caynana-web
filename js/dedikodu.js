import { apiPOST, apiGET } from "./api.js";
import { showPage, escapeHtml } from "./ui.js";
import { STORAGE_KEY } from "./config.js";

// --- RASTGELE ID OLUŞTURUCU (Sıralı Olmayan) ---
function getMyCaynanaID() {
    let user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // Eğer kullanıcının zaten bir kodu varsa onu döndür
    if (user.caynana_no) return user.caynana_no;

    // Yoksa yeni, rastgele ve havalı bir kod üret (Örn: CN-X9K2P)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Okunması zor harfleri (I, O, 1, 0) çıkardım
    let result = "CN-";
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Kaydet ve döndür
    user.caynana_no = result;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return result;
}

// --- LAF SOKMA VERİTABANI (Simülasyon) ---
const MY_BOT_DEFENSE = [
    "Ayy evladım sen ne dersen doğrusunu dersin, ben arkandayım!",
    "Duydunuz mu? Benim yavrum noktayı koydu!",
    "Suskunluğumuz asaletimizdendir, yoksa verirdik cevabını!",
    "Bunlarla muhatap olma kuzum, seviyene inme."
];

const ENEMY_BOT_ATTACK = [
    "Hop hop! Ağzından çıkanı kulağın duysun!",
    "Ayol sen önce kendine bak, eleştirene bak hele!",
    "Bizim gelin/damat da çok konuşuyor maşallah, icraat sıfır!",
    "Terbiyesizliğin lüzumu yok, benim evladıma laf edemezsin!"
];

export async function openDedikoduPanel() {
    const myID = getMyCaynanaID();

    const html = `
        <div style="height:100%; display:flex; flex-direction:column; background:#0e0e0e;">
            
            <div style="padding:15px; border-bottom:1px solid #333; background:#161616; text-align:center;">
                <h3 style="color:#fff; margin:0 0 5px 0;">🔥 Dedikodu Kazanı</h3>
                <div style="font-size:11px; color:#888;">Bu numarayla arkadaşını davet et:</div>
                
                <div style="margin-top:8px; display:inline-flex; align-items:center; gap:10px; background:#000; padding:8px 15px; border-radius:8px; border:1px solid var(--pistachio);">
                    <span style="font-family:monospace; font-size:18px; color:var(--pistachio); font-weight:bold; letter-spacing:1px;">${myID}</span>
                    <button id="copyIdBtn" style="background:none; border:none; cursor:pointer; font-size:14px;">📋</button>
                </div>
            </div>

            <div id="inviteArea" style="padding:15px; background:#111; border-bottom:1px solid #333;">
                <div style="font-size:12px; color:#aaa; margin-bottom:5px;">Arkadaşının Numarası (CN-...):</div>
                <div style="display:flex; gap:10px;">
                    <input id="friendIdInp" type="text" placeholder="CN-XXXXX" 
                           style="flex:1; background:#222; border:1px solid #444; color:#fff; padding:10px; border-radius:8px; outline:none; text-transform:uppercase;">
                    <button id="connectBtn" style="background:#fff; color:#000; border:none; padding:0 15px; border-radius:8px; font-weight:bold; cursor:pointer;">BAĞLAN</button>
                </div>
                <div id="connectionStatus" style="font-size:10px; color:var(--gold); margin-top:5px; height:12px;"></div>
            </div>

            <div id="ddChatArea" style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:12px;">
                <div style="text-align:center; color:#444; font-size:11px; margin-top:10px;">
                    Henüz kimse yok. Arkadaşın gelince kıyamet kopacak.
                </div>
            </div>

            <div style="padding:10px; background:#161616; border-top:1px solid #333; display:flex; gap:10px;">
                <input id="ddInput" type="text" placeholder="Gıybeti başlat..." disabled
                       style="flex:1; background:#222; border:none; padding:12px; color:#fff; border-radius:20px; outline:none;">
                <button id="ddSendBtn" disabled style="width:40px; height:40px; border-radius:50%; background:#333; border:none; font-weight:bold; cursor:not-allowed; transition:0.3s;">
                    ➤
                </button>
            </div>
        </div>
    `;

    showPage("Dedikodu Odası", html);

    setTimeout(() => {
        // ID Kopyalama
        const copyBtn = document.getElementById('copyIdBtn');
        if(copyBtn) {
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(myID);
                alert("Numaran kopyalandı! Arkadaşına gönder: " + myID);
            };
        }

        // Bağlanma Simülasyonu
        const connectBtn = document.getElementById('connectBtn');
        const status = document.getElementById('connectionStatus');
        const inp = document.getElementById('ddInput');
        const sendBtn = document.getElementById('ddSendBtn');
        const friendInp = document.getElementById('friendIdInp');

        if(connectBtn) {
            connectBtn.onclick = () => {
                const fId = friendInp.value.trim().toUpperCase();
                if(!fId.startsWith("CN-") || fId.length < 5) {
                    status.innerText = "Hatalı numara evladım.";
                    return;
                }
                if(fId === myID) {
                    status.innerText = "Kendinle dedikodu yapamazsın deli misin?";
                    return;
                }

                status.innerText = "Aranıyor...";
                connectBtn.disabled = true;
                
                // 1.5 saniye sonra bağlanmış gibi yap
                setTimeout(() => {
                    status.innerText = "BAĞLANDI! ✅";
                    status.style.color = "#bef264";
                    document.getElementById('inviteArea').style.display = 'none';
                    
                    inp.disabled = false;
                    sendBtn.disabled = false;
                    sendBtn.style.background = "var(--pistachio)";
                    sendBtn.style.cursor = "pointer";
                    
                    addDedikoduBubble("Hatice Hanım (Karşı Taraf) odaya girdi.", "system");
                    addDedikoduBubble("Sultan Hanım (Senin Bot) tetikte bekliyor.", "system");
                }, 1500);
            };
        }

        // Mesaj Gönderme
        const send = () => {
            const txt = inp.value.trim();
            if(!txt) return;

            addDedikoduBubble(txt, 'me');
            inp.value = "";

            // KAOS MODU BAŞLIYOR (SİMÜLASYON)
            
            // 1. Rastgelelik: Senin botun seni desteklesin mi? (%60 ihtimal)
            if(Math.random() > 0.4) {
                setTimeout(() => {
                    const msg = MY_BOT_DEFENSE[Math.floor(Math.random() * MY_BOT_DEFENSE.length)];
                    addDedikoduBubble(msg, 'my-bot');
                }, 1000 + Math.random() * 1000);
            }

            // 2. Karşı taraf cevap versin (Simüle edilmiş arkadaş cevabı)
            setTimeout(() => {
                const fakeFriendReplies = ["Ne diyorsun sen be?", "Hiç öyle olmadı bi kere!", "Aman ne haliniz varsa görün.", "Doğru valla."];
                const reply = fakeFriendReplies[Math.floor(Math.random() * fakeFriendReplies.length)];
                addDedikoduBubble(reply, 'friend');

                // 3. Karşı bot sana saldırsın!
                setTimeout(() => {
                    const attack = ENEMY_BOT_ATTACK[Math.floor(Math.random() * ENEMY_BOT_ATTACK.length)];
                    addDedikoduBubble(attack, 'enemy-bot');
                }, 1000);

            }, 2500);
        };

        if(sendBtn) sendBtn.onclick = send;
        if(inp) inp.onkeydown = (e) => { if(e.key === 'Enter') send(); };

    }, 100);
}

function addDedikoduBubble(text, type) {
    const chat = document.getElementById('ddChatArea');
    if(!chat) return;

    const div = document.createElement('div');
    div.style.padding = "8px 12px";
    div.style.borderRadius = "12px";
    div.style.fontSize = "13px";
    div.style.maxWidth = "85%";
    div.style.marginBottom = "8px";
    div.style.lineHeight = "1.4";
    div.style.position = "relative";
    div.style.wordWrap = "break-word";

    if (type === 'me') {
        div.style.alignSelf = "flex-end";
        div.style.background = "#2e7d32";
        div.style.color = "#fff";
        div.style.borderBottomRightRadius = "2px";
        div.innerText = text;
    } 
    else if (type === 'friend') {
        div.style.alignSelf = "flex-start";
        div.style.background = "#333";
        div.style.color = "#ddd";
        div.style.borderBottomLeftRadius = "2px";
        div.innerText = text;
    }
    else if (type === 'my-bot') {
        div.style.alignSelf = "flex-end";
        div.style.background = "linear-gradient(45deg, #FFB300, #FFCA28)";
        div.style.color = "#000";
        div.style.fontWeight = "600";
        div.style.marginRight = "20px";
        div.style.border = "2px solid #fff";
        div.innerHTML = `<span style="font-size:9px; display:block; text-transform:uppercase; font-weight:800; opacity:0.6;">Senin Caynana:</span>${text}`;
    }
    else if (type === 'enemy-bot') {
        div.style.alignSelf = "flex-start";
        div.style.background = "linear-gradient(45deg, #b71c1c, #d32f2f)";
        div.style.color = "#fff";
        div.style.fontWeight = "500";
        div.style.marginLeft = "20px";
        div.style.border = "1px solid #ff8a80";
        div.innerHTML = `<span style="font-size:9px; display:block; text-transform:uppercase; font-weight:800; opacity:0.8;">Karşı Caynana:</span>${text}`;
    }
    else if (type === 'system') {
        div.style.alignSelf = "center";
        div.style.background = "transparent";
        div.style.color = "#666";
        div.style.fontSize = "10px";
        div.style.padding = "2px";
        div.style.textAlign = "center";
        div.innerText = text;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}
