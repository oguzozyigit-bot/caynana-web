import { BASE_DOMAIN, authHeaders, IS_ALTIN, pullPlanFromBackend } from "./main.js";

const NOTIFS_URL = `${BASE_DOMAIN}/api/notifications`;
const NOTIF_READ_URL = `${BASE_DOMAIN}/api/notifications/read`;
const INVITE_URL = `${BASE_DOMAIN}/api/dedikodu/invite`;
const ACCEPT_URL = `${BASE_DOMAIN}/api/dedikodu/accept`;
const REJECT_URL = `${BASE_DOMAIN}/api/dedikodu/reject`;

let inbox = [];

async function apiGET(url){
  const r = await fetch(url, { headers:{ ...authHeaders() } });
  const j = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(j.detail || "API error");
  return j;
}

async function apiPOST(url, body){
  const r = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify(body||{})
  });
  const j = await r.json().catch(()=> ({}));
  if(!r.ok) throw new Error(j.detail || "API error");
  return j;
}

function upsellHtml(){
  return `
    <div style="display:grid; gap:10px;">
      <div style="font-weight:1000;color:#111;">Dedikodu Odası kilitli</div>
      <div style="font-weight:900;color:#444;line-height:1.45;">
        Evladım burası <b>Altın (Pro)</b> üyelerin alanı. Altın olunca hem sen girersin hem arkadaşını çağırırsın.
      </div>
      <div style="padding:12px;border:2px solid var(--primary);border-radius:16px;background:#fff8e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-weight:1000;">Altın (Pro)</div>
          <div style="font-weight:1000;color:var(--primary);">119,99 TL</div>
        </div>
        <div style="margin-top:6px;font-weight:900;color:#444;">Dedikodu Odası + Sınırsız</div>
      </div>
    </div>
  `;
}

function panelHtml(){
  return `
    <div style="display:grid; gap:12px;">
      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Davet Et</div>
        <div style="margin-top:6px;color:#444;font-weight:900;">Arkadaşının <b>CN-XXXX</b> numarasıyla çağır.</div>
        <input id="ddInviteInput" style="margin-top:10px;width:100%;height:42px;border-radius:14px;border:1px solid #eee;padding:0 12px;font-weight:1000;" placeholder="CN-9F3A12BC">
        <button id="ddInviteBtn" style="margin-top:10px;width:100%;height:44px;border-radius:14px;border:none;background:var(--primary);color:#fff;font-weight:1000;cursor:pointer;">Davet Gönder</button>
        <div id="ddInviteStatus" style="margin-top:8px;font-size:12px;font-weight:900;color:#666;"></div>
      </div>

      <div style="padding:12px;border:1px solid #eee;border-radius:16px;">
        <div style="font-weight:1000;color:#111;">Gelen Davetler</div>
        <div id="ddInbox" style="margin-top:10px; display:grid; gap:10px;"></div>
      </div>
    </div>
  `;
}

function US(msg){
  return `<div style="font-weight:1000;color:#111;">Hata</div>
          <div style="margin-top:8px;color:#444;font-weight:900;">${window.App.escapeHtml(msg||"")}</div>`;
}

async function refreshInbox(){
  const j = await apiGET(NOTIFS_URL);
  const items = j.items || [];
  inbox = items
    .filter(x => x.payload && x.payload.kind === "dedikodu_invite" && !x.is_read)
    .map(x => ({
      id: x.id,
      title: x.title,
      body: x.body,
      invite_id: x.payload.invite_id
    }));
}

function renderInbox(){
  const el = document.getElementById("ddInbox");
  if(!el) return;
  el.innerHTML = "";

  if(!inbox.length){
    el.innerHTML = `<div style="font-size:12px;color:#666;font-weight:900;">Şimdilik davet yok.</div>`;
    return;
  }

  inbox.forEach((x)=>{
    const box = document.createElement("div");
    box.style.cssText = "padding:10px;border:1px solid #eee;border-radius:14px;background:#fff;";
    box.innerHTML = `
      <div style="font-weight:1000;color:#111;">${window.App.escapeHtml(x.title||"Davet")}</div>
      <div style="margin-top:6px;color:#444;font-weight:900;line-height:1.35;">${window.App.escapeHtml(x.body||"")}</div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <button data-act="reject" data-id="${x.id}" data-invite="${x.invite_id}" style="flex:1;height:36px;border-radius:12px;border:1px solid #eee;background:#fff;font-weight:1000;cursor:pointer;">Reddet</button>
        <button data-act="accept" data-id="${x.id}" data-invite="${x.invite_id}" style="flex:1;height:36px;border-radius:12px;border:none;background:#111;color:#fff;font-weight:1000;cursor:pointer;">Kabul</button>
      </div>
    `;
    el.appendChild(box);
  });

  el.querySelectorAll("button").forEach(btn=>{
    btn.onclick = async ()=>{
      const act = btn.dataset.act;
      const nid = Number(btn.dataset.id);
      const inviteId = Number(btn.dataset.invite);
      try{
        if(act==="accept") await apiPOST(ACCEPT_URL, { invite_id: inviteId });
        if(act==="reject") await apiPOST(REJECT_URL, { invite_id: inviteId });
        await apiPOST(NOTIF_READ_URL, { id: nid });
        await refreshInbox();
        renderInbox();
        window.App.showPage("Dedikodu Odası", `<div style="font-weight:1000;color:#111;">İşlem tamam ✅</div>`);
      }catch(e){
        window.App.showPage("Dedikodu Odası", US(e.message));
      }
    };
  });
}

function bindPanel(){
  const btn = document.getElementById("ddInviteBtn");
  const inp = document.getElementById("ddInviteInput");
  const out = document.getElementById("ddInviteStatus");

  if(btn){
    btn.onclick = async ()=>{
      const cn = (inp?.value||"").trim().toUpperCase();
      if(!cn){ if(out) out.textContent="CN yaz."; return; }
      if(out) out.textContent="Gönderiyorum…";
      try{
        const j = await apiPOST(INVITE_URL, { target_caynana_no: cn });
        if(out) out.textContent = j.message || "Davet gönderildi ✅";
      }catch(e){
        if(out) out.textContent = "Hata: " + (e.message||"");
      }
    };
  }
}

export async function openPanel(){
  await pullPlanFromBackend();

  if(!IS_ALTIN()){
    window.App.showPage("Dedikodu Odası (Altın)", upsellHtml());
    return;
  }

  window.App.showPage("Dedikodu Odası", panelHtml());
  setTimeout(async ()=>{
    try{
      await refreshInbox();
      renderInbox();
      bindPanel();
    }catch(e){
      window.App.showPage("Dedikodu Odası", US(e.message));
    }
  }, 50);
}
