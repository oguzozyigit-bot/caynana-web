// FILE: /js/clup_page.js
// Reads team from profile/meta and shows plan-based frequency.
// Motor later.

import { STORAGE_KEY } from "/js/config.js";
import { initMenuHistoryUI } from "/js/menu_history_ui.js";

const $ = (id)=>document.getElementById(id);

function safeJson(s, fb={}){ try{return JSON.parse(s||"");}catch{return fb;} }
function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__tto);
  window.__tto = setTimeout(()=> t.classList.remove("show"), 2500);
}

function getUser(){
  const u = safeJson(localStorage.getItem(STORAGE_KEY), {});
  return u && Object.keys(u).length ? u : safeJson(localStorage.getItem("caynana_user_v1"), {});
}

function norm(v){ return String(v||"").trim(); }

function getTeam(profile){
  // toleranslı: user.team, user.meta.team, PROFILE_KEY vs yok -> en azından user.team
  const t1 = norm(profile.team);
  const t2 = norm(profile.takim);
  const t3 = norm(profile.favorite_team);
  return t1 || t2 || t3;
}

function getPlan(profile){
  return norm(profile.plan || "free").toLowerCase();
}

function applyTopBars(profile){
  const sp = clamp(parseInt(profile?.sp_score ?? 10, 10) || 10, 0, 100);
  if($("ypNum")) $("ypNum").textContent = `${sp}/100`;
  if($("ypFill")) $("ypFill").style.width = `${sp}%`;

  const plan = (profile.plan ? String(profile.plan) : "FREE").toUpperCase();
  if($("planChip")) $("planChip").textContent = plan || "FREE";
}

function freqByPlan(plan){
  // Senin kuralın:
  // FREE -> haftada 1 bildirim
  // PLUS/PRO -> sınırsız
  if(plan === "plus" || plan === "pro") return { pill:"Sınırsız", text:"PLUS/PRO: Sınırsız bildirim." };
  return { pill:"Haftada 1", text:"FREE: Haftada 1 özet bildirimi." };
}

document.addEventListener("DOMContentLoaded", ()=>{
  const token = (localStorage.getItem("google_id_token") || "").trim();
  if(!token){ location.href="/index.html"; return; }

  try{ initMenuHistoryUI(); }catch{}

  // hamburger
  $("hambBtn")?.addEventListener("click", ()=> $("menuOverlay")?.classList.add("open"));
  $("menuOverlay")?.addEventListener("click", (e)=>{
    const sidebar = e.currentTarget?.querySelector?.(".menu-sidebar");
    if(sidebar && sidebar.contains(e.target)) return;
    e.currentTarget.classList.remove("open");
  });

  const u = getUser();
  applyTopBars(u);

  const plan = getPlan(u);
  const planLabel = plan.toUpperCase() === "FREE" ? "FREE" : plan.toUpperCase();
  if($("planPill")) $("planPill").textContent = `Plan: ${planLabel || "FREE"}`;

  const freq = freqByPlan(plan);
  if($("freqPill")){
    $("freqPill").textContent = `Bildirim: ${freq.pill}`;
    $("freqPill").classList.toggle("green", plan === "plus" || plan === "pro");
  }
  if($("freqText")) $("freqText").textContent = freq.text;

  const team = getTeam(u);

  if(!team){
    $("noTeamBox").style.display = "block";
    $("teamBox").style.display = "none";
    $("teamTitle").textContent = "Takım";
    $("teamSub").textContent = "Profilinde takım yoksa burası açılmaz.";
  }else{
    $("noTeamBox").style.display = "none";
    $("teamBox").style.display = "block";
    $("teamName").textContent = team;
    $("teamTitle").textContent = team;
    $("teamSub").textContent = "Kaynana maç zamanı dürter 🙂";
  }

  $("goProfile")?.addEventListener("click", ()=> location.href="/pages/profil.html");
  $("btnChangeTeam")?.addEventListener("click", ()=> location.href="/pages/profil.html");

  $("btnTestNotif")?.addEventListener("click", ()=>{
    if(!team) return toast("Önce takım yaz evladım 🙂");
    if(plan === "free"){
      toast(`⚽ ${team}: Haftalık özet (demo). Motor gelince gerçek bildirim.`);
    }else{
      toast(`⚽ ${team}: Sınırsız bildirim (demo). Motor gelince gerçek bildirim.`);
    }
  });
});
