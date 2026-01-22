import { apiPOST, apiGET } from "./api.js";
import { showPage, escapeHtml } from "./ui.js";

async function renderInbox() {
    try {
        const res = await apiGET("/api/notifications");
        const items = (res.items || []).filter(x => x.payload?.kind === "dedikodu_invite");
        if (!items.length) return "<div style='color:#777; font-size:12px;'>Henüz davet yok.</div>";
        return items.map(x => `
            <div style="background:#222; border:1px solid #444; padding:10px; margin-bottom:8px; border-radius:8px;">
                <div style="font-weight:bold; color:#fff;">${escapeHtml(x.title)}</div>
                <div style="font-size:12px; color:#ccc;">${escapeHtml(x.body)}</div>
            </div>
        `).join("");
    } catch (e) { return "<div style='color:red;'>Hata oluştu.</div>"; }
}

export async function openDedikoduPanel() {
    const inboxHtml = await renderInbox();
    const html = `
        <div style="padding:10px;">
            <h3 style="color:#fff; margin-bottom:10px;">Dedikodu Odası</h3>
            <p style="color:#aaa; font-size:12px; margin-bottom:15px;">Arkadaşını 'CN-Kodu' ile davet et.</p>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <input id="inviteInp" placeholder="CN-12345" style="flex:1; padding:10px; border-radius:8px; border:1px solid #444; background:#111; color:#fff;">
                <button id="sendInviteBtn" style="padding:0 20px; background:var(--pistachio); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">Davet Et</button>
            </div>
            <h4 style="color:#ddd; border-bottom:1px solid #333; padding-bottom:5px; margin-bottom:10px;">Gelen Davetler</h4>
            <div id="ddInbox">${inboxHtml}</div>
        </div>
    `;
    showPage("Dedikodu", html);
    setTimeout(() => {
        const btn = document.getElementById('sendInviteBtn');
        if (btn) btn.onclick = async () => {
            const val = document.getElementById('inviteInp').value.trim();
            if (!val) return alert("Kodu yaz evladım.");
            try {
                await apiPOST("/api/dedikodu/invite", { target_caynana_no: val });
                alert("Davet yollandı!");
            } catch (e) { alert("Hata: " + e.message); }
        };
    }, 100);
}
