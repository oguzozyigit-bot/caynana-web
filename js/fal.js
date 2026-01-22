import { BASE_DOMAIN, STORAGE_KEY } from './config.js';

let photoCount = 0;
let photos = [];

export function openFalPanel() {
  const el = document.getElementById('falOverlay');
  if(el) { el.style.display = 'flex'; el.classList.add('active'); }
  photoCount = 0; photos = [];
  document.getElementById('falStatus').innerText = "Fincanın içini çek evladım.";
  document.getElementById('falStep1').style.display='flex';
  document.getElementById('falStep2').style.display='none';
  document.getElementById('falResult').style.display='none';
}

export function closeFalPanel() {
  const el = document.getElementById('falOverlay');
  if(el) { el.classList.remove('active'); el.style.display='none'; }
}

export async function handleFalPhoto(input) {
  if(photoCount >= 3) return;
  const file = input.files[0];
  if(!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
     const b64 = e.target.result.split(',')[1];
     photos.push(b64);
     photoCount++;
     
     if(photoCount < 3) {
        document.getElementById('falStatus').innerText = `${photoCount} tamam. Sıradakini çek.`;
     } else {
        startAnalysis();
     }
     input.value = "";
  };
  reader.readAsDataURL(file);
}

async function startAnalysis(){
  document.getElementById('falStep1').style.display='none';
  document.getElementById('falStep2').style.display='flex';
  
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY)|| "{}");
  try {
    const res = await fetch(`${BASE_DOMAIN}/api/fal/read`, {
        method:"POST", 
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ user_id: user.id, images: photos })
    });
    const data = await res.json();
    document.getElementById('falStep2').style.display='none';
    document.getElementById('falResult').style.display='block';
    document.getElementById('falText').innerText = data.text || "Göremedim evladım.";
  } catch(e) {
    alert("Fal bakarken gözlüğüm düştü (Hata).");
    closeFalPanel();
  }
}
