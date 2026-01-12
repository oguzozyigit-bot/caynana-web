export function renderCards(list){
  const chat = document.getElementById("chatContainer");
  const wrap = document.createElement("div");
  wrap.className = "cards";

  (list||[]).forEach((p, idx)=>{
    const badge = (idx===0) ? {k:"gold",t:"ALTIN"} : (idx===1) ? {k:"silver",t:"GÜMÜŞ"} : null;
    const bHtml = badge ? `<div class="card-badge ${badge.k}">${badge.t}</div>` : "";
    const score = p.caynana_score || 70;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${bHtml}
      <img class="pimg" src="${p.image}"
           onpointerdown="event.stopPropagation()"
           onclick="event.stopPropagation();event.preventDefault();"
           onerror="this.onerror=null;this.src='https://via.placeholder.com/300?text=Urun';">
      <div class="card-body">
        <div class="title"></div>
        <div class="price"></div>
        <div class="score-wrap">
          <span>Caynana Puanı</span><span class="score-pill">${score}</span>
        </div>
        <a class="btnLink" href="${p.url}" target="_blank" onclick="event.stopPropagation();">İNCELE</a>
      </div>
    `;
    div.querySelector(".title").textContent = (p.title || "");
    div.querySelector(".price").textContent = (p.price || "");
    wrap.appendChild(div);
  });

  chat.appendChild(wrap);
}
