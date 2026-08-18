(()=>{
const clean=n=>String(n||'').replace(/\D/g,'');
const valid=n=>/^0500\d{7}$/.test(clean(n));
let bypass=false;
async function wake(kind){
  const target=clean(document.getElementById('num')?.textContent||'');
  const from=clean(localStorage.getItem('phoneMuseumOwnNumber')||'');
  if(!valid(target)||!valid(from)||target===from)return false;
  try{
    await fetch('https://ntfy.sh/caynana-call-'+target,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({type:'call',from,kind,time:Date.now()})
    });
    return true;
  }catch(_){return false}
}
function intercept(e,kind){
  if(bypass)return;
  const target=clean(document.getElementById('num')?.textContent||'');
  if(!valid(target))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const btn=e.currentTarget;
  const old=btn.textContent;
  btn.disabled=true;
  btn.textContent='UYANDIRILIYOR…';
  wake(kind).finally(()=>{
    setTimeout(()=>{
      btn.disabled=false;
      btn.textContent=old;
      bypass=true;
      btn.click();
      bypass=false;
    },5000);
  });
}
function bind(){
  const call=document.getElementById('callBtn');
  if(call&&!call.dataset.wakeBound){call.dataset.wakeBound='1';call.addEventListener('click',e=>intercept(e,'voice'),true)}
  const video=document.getElementById('videoDialBtn');
  if(video&&!video.dataset.wakeBound){video.dataset.wakeBound='1';video.addEventListener('click',e=>intercept(e,'video'),true)}
}
new MutationObserver(bind).observe(document.body,{subtree:true,childList:true});
setTimeout(bind,300);
})();
