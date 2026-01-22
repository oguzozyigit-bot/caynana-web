import { BASE_DOMAIN, STORAGE_KEY } from './config.js';

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

function safeJson(s, fallback={}){ try{ return JSON.parse(s||""); }catch{ return fallback; } }
function getUser(){ return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function getIdToken(){ return (localStorage.getItem("google_id_token") || "").trim(); }

export function openFalPanel() {
  const overlay = document.getElementById('falOverlay');
  if (!overlay) return;

  overlay.style.display = "flex";     // ✅ display fix
  overlay.classList.add('active');
  resetFal();
}

export function closeFalPanel() {
  const overlay = document.getElementById('falOverlay');
  if (!overlay) return;

  overlay.classList.remove('active');
  overlay.style.display = "none";
}

function resetFal() {
  photoCount = 0;
  photos = [];

  const s1 = document.getElementById('falStep1');
  const s2 = document.getElementById('falStep2');
  const r  = document.getElementById('falResult');

  if (s1) s1.style.display = 'flex';
  if (s2) s2.style.display = 'none';
  if (r)  r.style.display  = 'none';

  updateStatus("Fincanın içini çek bakayım evladım.");
}

function updateStatus(text) {
  const el = document.getElementById('falStatus');
  if (el) el.innerText = text;
}

export async function handleFalPhoto(fileInput) {
  if (photoCount >= 3) return;

  const file = fileInput?.files?.[0];
  if (!file) return;

  updateStatus("Resim yükleniyor, bekle...");

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const raw = String(e?.target?.result || "");
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
      if (!base64) {
        updateStatus("Resim okunamadı, tekrar dene.");
        if (fileInput) fileInput.value = "";
        return;
      }

      if (photoCount === 0) {
        updateStatus("Dur bakayım bu fincan mı...");

        try {
          const idToken = getIdToken();
          const checkRes = await fetch(`${BASE_DOMAIN}/api/fal/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, google_id_token: idToken || "" })
          });

          if (!checkRes.ok) {
            const errText = await checkRes.text();
            try {
              const errJson = JSON.parse(errText);
              alert("Hata: " + (errJson.detail || errJson.message || errText));
            } catch {
              alert("Sunucu Hatası: " + errText);
            }
            updateStatus("Hata oldu, tekrar dene.");
            if (fileInput) fileInput.value = "";
            return;
          }

          const checkData = await checkRes.json();
          if (!checkData.ok) {
            alert(checkData.reason || "Bilinmeyen hata.");
            updateStatus("Düzgün çek şunu!");
            if (fileInput) fileInput.value = "";
            return;
          }
        } catch (e) {
          console.error(e);
          alert("İnternet bağlantını kontrol et evladım.");
          updateStatus("Bağlantı hatası.");
          if (fileInput) fileInput.value = "";
          return;
        }
      }

      photos.push(base64);
      photoCount++;

      if (photoCount < 3) updateStatus(`Tamamdır. Şimdi ${photoCount + 1}. açıyı çek. (Tabak veya yan taraf)`);
      else startFalAnalysis();

      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error(err);
      updateStatus("Bir terslik oldu, tekrar dene.");
      if (fileInput) fileInput.value = "";
    }
  };

  reader.readAsDataURL(file);
}

async function startFalAnalysis() {
  const s1 = document.getElementById('falStep1');
  const s2 = document.getElementById('falStep2');
  if (s1) s1.style.display = 'none';
  if (s2) s2.style.display = 'flex';

  const statusEl = document.getElementById('loadingText');
  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    if (statusEl) statusEl.innerText = loadingMessages[msgIndex % loadingMessages.length];
    msgIndex++;
  }, 2000);

  const user = getUser();
  const userId = user?.id || "CYN-DEMO-USER";
  const email = user?.email || "";
  const idToken = getIdToken();

  try {
    const res = await fetch(`${BASE_DOMAIN}/api/fal/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, email, google_id_token: idToken || "", images: photos })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.detail || "Fal bakarken bir sorun çıktı.");
      closeFalPanel();
      return;
    }

    showResult(data);
  } catch (err) {
    alert("Bağlantı koptu evladım.");
    closeFalPanel();
  } finally {
    clearInterval(msgInterval);
  }
}

function showResult(data) {
  const s2 = document.getElementById('falStep2');
  const resDiv = document.getElementById('falResult');
  const txtDiv = document.getElementById('falText');

  if (s2) s2.style.display = 'none';
  if (resDiv) resDiv.style.display = 'flex';
  if (!txtDiv) return;

  if (!data?.ok && data?.limit_reached) {
    txtDiv.innerHTML = `<h3 style="color:#ff5252">Bugünlük Bitti!</h3><p>${String(data.text || "")}</p>`;
  } else if (!data?.ok) {
    txtDiv.innerText = data?.text || "Bir hata oldu.";
  } else {
    txtDiv.innerText = data?.text || "";
  }
}
