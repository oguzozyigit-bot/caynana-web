import { BASE_DOMAIN } from './config.js';

let photoCount = 0;
let photos = [];
const loadingMessages = [
    "Vay vay vay...",
    "Neler görüyorum neler...",
    "Bir yol var ama ucu kapalı gibi...",
    "Bak sen şu işe, fincan kabarmış...",
    "Kısmetin taşmış evladım...",
    "Biraz bekle gözlüğümü sileyim..."
];

export function openFalPanel() {
    const overlay = document.getElementById('falOverlay');
    overlay.classList.add('active');
    resetFal();
}

export function closeFalPanel() {
    document.getElementById('falOverlay').classList.remove('active');
}

function resetFal() {
    photoCount = 0;
    photos = [];
    document.getElementById('falStep1').style.display = 'flex';
    document.getElementById('falStep2').style.display = 'none';
    document.getElementById('falResult').style.display = 'none';
    updateStatus("Fincanın içini çek bakayım evladım.");
}

function updateStatus(text) {
    const el = document.getElementById('falStatus');
    if(el) el.innerText = text;
}

// Fotoğraf Çekme İşlemi
export async function handleFalPhoto(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    updateStatus("Resim yükleniyor, bekle...");

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result.split(',')[1];
        
        // İlk resimde fincan kontrolü yap
        if (photoCount === 0) {
            updateStatus("Dur bakayım bu fincan mı...");
            try {
                // ADRES: /api/fal/check (Main.py içinde tanımlı artık)
                const checkRes = await fetch(`${BASE_DOMAIN}/api/fal/check`, {
                    method: "POST", headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({ image: base64 })
                });
                
                if (!checkRes.ok) {
                    const errText = await checkRes.text(); // Detaylı hatayı al
                    // JSON ise parse et
                    try {
                        const errJson = JSON.parse(errText);
                        alert("Hata: " + (errJson.detail || errJson.message || errText));
                    } catch {
                        alert("Sunucu Hatası: " + errText);
                    }
                    updateStatus("Hata oldu, tekrar dene.");
                    fileInput.value = ""; 
                    return;
                }

                const checkData = await checkRes.json();
                if (!checkData.ok) {
                    alert(checkData.reason || "Bilinmeyen hata."); 
                    updateStatus("Düzgün çek şunu!");
                    fileInput.value = "";
                    return;
                }
            } catch(e) { 
                console.error(e);
                alert("İnternet bağlantını kontrol et evladım.");
                updateStatus("Bağlantı hatası.");
                return;
            }
        }

        photos.push(base64);
        photoCount++;

        if (photoCount < 3) {
            updateStatus(`Tamamdır. Şimdi ${photoCount + 1}. açıyı çek. (Tabak veya yan taraf)`);
        } else {
            startFalAnalysis();
        }
        fileInput.value = ""; 
    };
    reader.readAsDataURL(file);
}

async function startFalAnalysis() {
    document.getElementById('falStep1').style.display = 'none';
    document.getElementById('falStep2').style.display = 'flex';
    
    const statusEl = document.getElementById('loadingText');
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
        if(statusEl) statusEl.innerText = loadingMessages[msgIndex % loadingMessages.length];
        msgIndex++;
    }, 2000);

    const user = JSON.parse(localStorage.getItem('caynana_user_v8') || "{}");
    // ID yoksa demo ID kullan
    const userId = user.id || "CYN-DEMO-USER";

    try {
        const res = await fetch(`${BASE_DOMAIN}/api/fal/read`, {
            method: "POST", headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ 
                user_id: userId, 
                images: photos 
            })
        });
        
        const data = await res.json();
        clearInterval(msgInterval);
        
        if(!res.ok) {
             alert(data.detail || "Fal bakarken bir sorun çıktı.");
             closeFalPanel();
             return;
        }
        
        showResult(data);

    } catch (err) {
        clearInterval(msgInterval);
        alert("Bağlantı koptu evladım.");
        closeFalPanel();
    }
}

function showResult(data) {
    document.getElementById('falStep2').style.display = 'none';
    const resDiv = document.getElementById('falResult');
    const txtDiv = document.getElementById('falText');
    
    resDiv.style.display = 'flex';
    
    if (!data.ok && data.limit_reached) {
        txtDiv.innerHTML = `<h3 style="color:#ff5252">Bugünlük Bitti!</h3><p>${data.text}</p>`;
    } else if (!data.ok) {
        txtDiv.innerText = data.text || "Bir hata oldu.";
    } else {
        txtDiv.innerText = data.text;
    }
}
