export function renderDock(MODES, currentMode, onSwitch){
  const dock = document.getElementById("dock");
  dock.innerHTML = "";
  Object.keys(MODES).forEach(k=>{
    const m = MODES[k];
    const item = document.createElement("div");
    item.className = "dock-item" + (k===currentMode() ? " active" : "");
    item.setAttribute("data-mode", k);
    item.innerHTML = `
      <div class="icon-box"><i class="fa-solid ${m.icon}"></i></div>
      <div class="dock-label">${m.label}</div>
    `;
    item.onclick = ()=> onSwitch(k);
    dock.appendChild(item);
  });
}

export function dockDragClickGuard(){
  const dock = document.getElementById("dock");
  let downX=0, downY=0, moved=false;
  dock.addEventListener("pointerdown",(e)=>{ downX=e.clientX; downY=e.clientY; moved=false; },{passive:true});
  dock.addEventListener("pointermove",(e)=>{ if(Math.abs(e.clientX-downX)>10||Math.abs(e.clientY-downY)>10) moved=true; },{passive:true});
  dock.addEventListener("click",(e)=>{ if(moved){ e.preventDefault(); e.stopPropagation(); } }, true);
}
