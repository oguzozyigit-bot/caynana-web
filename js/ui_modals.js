export function show(el){ el.style.display = "flex"; }
export function hide(el){ el.style.display = "none"; }

export function bindPageModal(){
  const pageModal = document.getElementById("pageModal");
  const pageClose = document.getElementById("pageClose");
  pageClose.onclick = ()=> hide(pageModal);
  pageModal.addEventListener("click",(e)=>{ if(e.target.id==="pageModal") hide(pageModal); });
}

export function openPage(title, html){
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("pageBody").innerHTML = html;
  document.getElementById("pageModal").style.display = "block";
}
