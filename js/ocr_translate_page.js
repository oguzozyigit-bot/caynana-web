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

async function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = ()=> resolve(String(fr.result||""));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function callOcr(dataUrl){
  const base = apiBase();
  if(!base) throw new Error("BASE_DOMAIN missing");

  const r = await fetch(`${base}/api/ocr`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ image: dataUrl })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(txt || `OCR HTTP ${r.status}`);

  const data = JSON.parse(txt || "{}");
  return String(data.text || "").trim();
}

async function callTranslateToTR(text){
  const base = apiBase();

  // ✅ from_lang YOK → otomatik dil algılama
  const r = await fetch(`${base}/api/translate`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text, to_lang: "tr" })
  });

  const txt = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(txt || `Translate HTTP ${r.status}`);

  const data = JSON.parse(txt || "{}");
  return String(data.translated || "").trim() || text;
}

function setBusy(on){
  const btn = $("btnRun");
  if(!btn) return;
  btn.disabled = !!on;
  btn.textContent = on ? "Çeviriyorum..." : "Türkçeye Çevir";
}

async function run(){
  if(!currentFile){
    toast("Önce fotoğraf seç evladım.");
    return;
  }

  setBusy(true);
  $("translatedText").textContent = "Okuyorum...";

  try{
    const dataUrl = await fileToDataUrl(currentFile);

    // 1) OCR
    const raw = await callOcr(dataUrl);
    if(!raw){
      $("translatedText").textContent = "Metin bulamadım evladım. Daha net çek.";
      toast("Metin bulunamadı");
      setBusy(false);
      return;
    }

    // 2) Translate to Turkish (auto detect)
    $("translatedText").textContent = "Türkçeye çeviriyorum...";
    const tr = await callTranslateToTR(raw);

    $("translatedText").textContent = tr || "—";
    toast("Tamamdır.");

  }catch(e){
    console.warn(e);
    $("translatedText").textContent = "Çalışmadı evladım. Vision API açık mı? (Render log'a bak)";
    toast("OCR/Çeviri hata");
  }finally{
    setBusy(false);
  }
}

function onPick(file){
  if(!file) return;
  currentFile = file;
  showPreview(file);
  $("btnRun").disabled = false;
  $("translatedText").textContent = "Hazırım. ‘Türkçeye Çevir’e bas.";
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("btnCamera").addEventListener("click", ()=> $("fileCamera").click());
  $("btnGallery").addEventListener("click", ()=> $("fileGallery").click());

  $("fileCamera").addEventListener("change", (e)=> onPick(e.target.files?.[0]));
  $("fileGallery").addEventListener("change", (e)=> onPick(e.target.files?.[0]));

  $("btnRun").addEventListener("click", run);
});
