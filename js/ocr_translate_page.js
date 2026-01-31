// FILE: /js/ocr_translate_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2200);
}

function apiBase(){ return String(BASE_DOMAIN || "").replace(/\/+$/,""); }

let currentFile = null;

function showPreview(file){
  const img = $("previewImg");
  const box = $("preview");
  if(!img || !box) return;

  const url = URL.createObjectURL(file);
  img.src = url;
  box.style.display = "block";
}

async function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = ()=> resolve(String(fr.result||""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function callOcr(base64DataUrl){
  const base = apiBase();
  if(!base) throw new Error("BASE_DOMAIN missing");

  const r = await fetch(`${base}/api/ocr`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ image: base64DataUrl })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(txt || `OCR HTTP ${r.status}`);

  const data = JSON.parse(txt || "{}");
  return String(data.text || "").trim();
}

async function callTranslate(text, toLang){
  const base = apiBase();
  const r = await fetch(`${base}/api/translate`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text, to_lang: toLang })
  });
  const data = await r.json().catch(()=> ({}));
  return String(data.translated || "").trim() || text;
}

async function run(){
  if(!currentFile){
    toast("Önce fotoğraf seç evladım.");
    return;
  }

  $("rawText").textContent = "Okuyorum…";
  $("translatedText").textContent = "—";

  try{
    const dataUrl = await fileToBase64(currentFile);

    // OCR
    const raw = await callOcr(dataUrl);
    $("rawText").textContent = raw || "Metin bulunamadı.";

    // Translate
    const toLang = $("toLang").value || "en";
    if(raw){
      $("translatedText").textContent = "Çeviriyorum…";
      const tr = await callTranslate(raw, toLang);
      $("translatedText").textContent = tr || "—";
    }else{
      $("translatedText").textContent = "—";
    }

    toast("Tamamdır.");
  }catch(e){
    console.warn(e);
    toast("OCR çalışmadı. Vision API açık mı? (Render loga bak)");
    $("rawText").textContent = "—";
    $("translatedText").textContent = "—";
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("btnCamera").addEventListener("click", ()=> $("fileCamera").click());
  $("btnGallery").addEventListener("click", ()=> $("fileGallery").click());

  $("fileCamera").addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    currentFile = f;
    showPreview(f);
  });

  $("fileGallery").addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    currentFile = f;
    showPreview(f);
  });

  $("btnRun").addEventListener("click", run);
});
