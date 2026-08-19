(()=>{
  function openBrowser(){
    const s=document.getElementById('stage'); if(!s)return;
    s.classList.remove('hide');
    s.innerHTML=`<div class="panel" style="max-width:520px"><h2>TARAYICI</h2><div style="display:flex;gap:5px;flex-wrap:wrap"><button id="ibBack">←</button><button id="ibFwd">→</button><button id="ibReload">↻</button><input id="ibQ" placeholder="Web adresi veya arama" style="flex:1;min-width:160px;padding:10px"><button id="ibGo">GİT</button></div><iframe id="ibFrame" sandbox="" referrerpolicy="no-referrer" style="width:100%;height:58vh;border:1px solid #ccd8df;border-radius:10px;margin-top:8px;background:#fff"></iframe><p id="ibMsg" style="font-size:12px">Sayfalar bu alanın içinde açılır.</p><p><button id="ibClose">← UYGULAMALARA DÖN</button></p></div>`;
    const q=document.getElementById('ibQ'),f=document.getElementById('ibFrame'),msg=document.getElementById('ibMsg');
    let hist=[],pos=-1,current='';
    const norm=v=>{v=String(v||'').trim();if(!v)return'';if(!/^https?:\/\//i.test(v)){if(v.includes('.')&&!v.includes(' '))v='https://'+v;else v='https://html.duckduckgo.com/html/?q='+encodeURIComponent(v)}return v};
    const nav=(u,push=true)=>{u=norm(u);if(!u)return;current=u;q.value=u;f.src='/api/browser-proxy?url='+encodeURIComponent(u);msg.textContent='Sayfa yükleniyor…';if(push){hist=hist.slice(0,pos+1);hist.push(u);pos=hist.length-1}};
    f.onload=()=>msg.textContent='Sayfa uygulamanın içinde açıldı.';
    document.getElementById('ibGo').onclick=()=>nav(q.value);
    q.onkeydown=e=>{if(e.key==='Enter')nav(q.value)};
    document.getElementById('ibBack').onclick=()=>{if(pos>0){pos--;nav(hist[pos],false)}};
    document.getElementById('ibFwd').onclick=()=>{if(pos<hist.length-1){pos++;nav(hist[pos],false)}};
    document.getElementById('ibReload').onclick=()=>{if(current)f.src='/api/browser-proxy?url='+encodeURIComponent(current)};
    document.getElementById('ibClose').onclick=()=>{s.classList.add('hide');s.innerHTML='';setTimeout(()=>document.getElementById('openAppsBtn')?.click(),0)};
    nav('https://example.com');
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('.app'); if(!b)return;
    const t=b.textContent.trim().toLocaleLowerCase('tr-TR');
    if(!t.includes('tarayıcı'))return;
    e.preventDefault();e.stopImmediatePropagation();openBrowser();
  },true);
})();