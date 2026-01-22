const $ = (id) => document.getElementById(id);

// --- EYES ---
export function initEyes() {
  let idleTimer;
  function setGaze(x, y) {
    ['eyeL','eyeR'].forEach(id => {
      const el = $(id);
      if(el) {
        el.style.setProperty('--gx', Math.min(Math.max(x*20,-20),20)+'px');
        el.style.setProperty('--gy', Math.min(Math.max(y*15,-15),15)+'px');
      }
    });
  }
  
  function resetIdle() {
    $('mobileFrame').classList.remove('sleeping');
    ['eyeL','eyeR'].forEach(id => {
        $(id).style.setProperty('--lidTop', '0%');
        $(id).style.setProperty('--lidBot', '0%');
    });
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
       $('mobileFrame').classList.add('sleeping');
       ['eyeL','eyeR'].forEach(id => {
           $(id).style.setProperty('--lidTop', '60%');
           $(id).style.setProperty('--lidBot', '20%');
       });
    }, 30000);
  }

  window.addEventListener('pointermove', (e) => {
    resetIdle();
    if($('mobileFrame').classList.contains('tracking-active')){ return; } 
    const rect = $('mobileFrame').getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setGaze(x, y);
  });
  
  // Random Look
  setInterval(() => {
     if(!$('mobileFrame').classList.contains('sleeping')) {
        setGaze((Math.random()-0.5)*1.5, (Math.random()-0.5)*0.5);
     }
  }, 4000);
}

// --- OVERLAYS ---
export function showPage(title, contentHTML) {
  $('pageTitle').innerText = title;
  $('pageContent').innerHTML = contentHTML;
  $('pageOverlay').style.display = 'flex';
  $('pageOverlay').classList.add('active');
}

export function closePage() {
  $('pageOverlay').classList.remove('active');
  $('pageOverlay').style.display = 'none';
}

export function escapeHtml(s) {
    return String(s||"").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
