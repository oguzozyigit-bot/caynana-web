(()=>{
  const APK_URL='/payphone/telefon-call.apk';
  function inject(){
    const install=document.getElementById('setInstall');
    if(!install||document.getElementById('setAndroidApk'))return;
    const wrap=document.createElement('p');
    const b=document.createElement('button');
    b.id='setAndroidApk';
    b.textContent='ANDROID UYGULAMASINI İNDİR';
    b.onclick=async()=>{
      try{
        const r=await fetch(APK_URL,{method:'HEAD',cache:'no-store'});
        if(r.ok){location.href=APK_URL;return;}
      }catch(_){ }
      alert('Android APK henüz sunucuya yüklenmedi. APK hazır olduğunda bu düğmeden direkt indirilecek.');
    };
    wrap.appendChild(b);
    install.closest('p')?.insertAdjacentElement('afterend',wrap);
  }
  new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
  setTimeout(inject,100);
})();