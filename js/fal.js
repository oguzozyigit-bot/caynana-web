import { apiPOST } from './api.js';
import { STORAGE_KEY } from './config.js';

let photoCount = 0;
let photos = [];
const loadingMessages = [
    "Vay vay vay...",
    "Neler görüyorum neler...",
    "Kısmetin taşmış evladım...",
    "Biraz bekle gözlüğümü sileyim..."
];

export function openFalPanel() {
    const overlay = document.getElementById('falOverlay');
    if (overlay) {
        overlay.style.display = "flex";
        setTimeout(() => overlay.classList.add('active'), 10);
    }
    resetFal();
}

export function closeFalPanel() {
    const overlay = document.getElementById('falOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = "none", 300);
    }
}

function resetFal() {
    photoCount = 0;
    photos = [];
    document.getElementById('falStep1').style.display = 'flex';
    document.getElementById('falStep2').style.display = 'none';
    document.getElementById('falResult').style.display = 'none';
    document.getElementById('falStatus').innerText = "Fincanın içini çek bakayım evladım.";
}

export async function handleFalPhoto(input) {
    if (photoCount >= 3) return;
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        
        if(photoCount === 0) {
             document.getElementById('falStatus').innerText = "Fincan mı diye bakıyorum...";
             try {
                 const check = await apiPOST("/api/fal/check", { image: base64 });
                 const j = await check.json();
                 if(!j.ok) {
                     alert("Bu fincan değil gibi evladım. Düzgün çek.");
                     input.value = "";
                     return;
                 }
             } catch(e) { console.log(e); }
        }

        photos.push(base64);
        photoCount++;

        if (photoCount < 3) {
            document.getElementById('falStatus').innerText = `${photoCount} tamam. Şimdi diğer açıyı çek.`;
        } else {
            startAnalysis();
        }
        input.value = "";
    };
    reader.readAsDataURL(file);
}

async function startAnalysis() {
    document.getElementById('falStep1').style.display = 'none';
    document.getElementById('falStep2').style.display = 'flex';

    const statusEl = document.getElementById('loadingText');
    let msgIndex = 0;
    const interval = setInterval(() => {
        if(statusEl) statusEl.innerText = loadingMessages[msgIndex % loadingMessages.length];
        msgIndex++;
    }, 2000);

    const user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    try {
        const res = await apiPOST("/api/fal/read", {
            user_id: user.id || "guest",
            images: photos
        });
        
        const data = await res.json();
        clearInterval(interval);

        if (!res.ok) throw new Error(data.detail || "Hata");

        document.getElementById('falStep2').style.display = 'none';
        document.getElementById('falResult').style.display = 'block';
        document.getElementById('falText').innerHTML = (data.text || "").replace(/\n/g, "<br>");

    } catch (e) {
        clearInterval(interval);
        alert("Fal bakarken nazar değdi evladım.");
        closeFalPanel();
    }
}
