(()=>{
  const APK_URL='/payphone/TelefonCall.apk?v=secure-20260818-2';
  function inject(){
    const install=document.getElementById('setInstall');
    if(!install||document.getElementById('setAndroidApk'))return;
    const wrap=document.createElement('p');
    const b=document.createElement('button');
    b.id='setAndroidApk';
    b.textContent='ANDROID UYGULAMASINI İNDİR';
    b.onclick=()=>{
      const a=document.createElement('a');
      a.href=APK_URL;
      a.download='TelefonCall.apk';
      a.rel='noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    wrap.appendChild(b);
    install.closest('p')?.insertAdjacentElement('afterend',wrap);
  }
  new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
  setTimeout(inject,100);
})();