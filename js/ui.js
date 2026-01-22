const $ = (id) => document.getElementById(id);

export function initEyes() {
  let idleTimer;
  function setGaze(x, y) {
    ['eyeL','eyeR'].forEach(id => {
      const el = $(id);
      if(el) {
        el.style.setProperty('--gx', Math.min(Math.max(x*15,-15),15)+'px');
        el.style.setProperty('--gy', Math.min(Math.max(y*10,-10),10)+'px');
      }
    });
  }
  
  function resetIdle() {
    $('mobileFrame').classList.remove('sleeping');
    ['eyeL','eyeR'].forEach(id => {
        $(id).style.setProperty('--lidTop', '0%');
        $(id).style.setProperty('--lidBot', '0%');
        $(id).querySelector('.iris').style.opacity = "1";
    });
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
       if(!$('mobileFrame').classList.contains('tracking-active')){
           $('mobileFrame').classList.add('sleeping');
           ['eyeL','eyeR'].forEach(id => {
               $(id).style.setProperty('--lidTop', '60%');
               $(id).style.setProperty('--lidBot', '20%');
               $(id).querySelector('.iris').style.opacity = "0.6";
           });
       }
    }, 30000);
  }

  window.addEventListener('pointermove', (e) => {
    resetIdle();
    if($('mobileFrame').classList.contains('tracking-active')) return;
    const rect = $('mobileFrame').getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setGaze(x, y);
  });
  
  setInterval(() => {
     if(!$('mobileFrame').classList.contains('sleeping') && !$('mobileFrame').classList.contains('tracking-active')) {
        if(Math.random()>0.7) setGaze((Math.random()-0.5)*1.0, (Math.random()-0.5)*0.5);
     }
  }, 3000);
}

export function showPage(title, contentHTML) {
  const o = $('pageOverlay');
  if($('pageTitle')) $('pageTitle').innerText = title;
  if($('pageContent')) $('pageContent').innerHTML = contentHTML;
  if(o) { o.style.display = 'flex'; setTimeout(() => o.classList.add('active'), 10); }
}

export function closePage() {
  const o = $('pageOverlay');
  if(o) { o.classList.remove('active'); setTimeout(() => o.style.display = 'none', 300); }
}

export function escapeHtml(s) {
    return String(s||"").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
