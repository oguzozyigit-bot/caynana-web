(()=>{
  const OWN_KEY='phoneMuseumOwnNumber';
  const HISTORY_KEY='phoneMuseumRecentCalls';
  const ownNumber=localStorage.getItem(OWN_KEY);
  if(!ownNumber) return;

  let peer=null, activeCall=null, incomingCall=null, localStream=null, remoteAudio=null;
  const peerId=n=>'pm-'+String(n).replace(/\D/g,'');
  const displayNum=n=>{n=String(n||'').replace(/\D/g,'');return n.length===11?n.slice(0,4)+' '+n.slice(4,7)+' '+n.slice(7,9)+' '+n.slice(9,11):n};
  const getHistory=()=>{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch(e){return[]}};
  function saveHistory(num){
    num=String(num||'').replace(/\D/g,'');
    if(num.length!==11||!num.startsWith('0601')) return;
    let h=getHistory();
    h.unshift({number:num,time:Date.now()});
    h=h.slice(0,30);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(h));
  }

  const style=document.createElement('style');
  style.textContent=`
  #voiceCallLayer{position:fixed;inset:0;z-index:9999;background:#10232eea;display:none;align-items:center;justify-content:center;padding:18px;font-family:Arial,sans-serif}
  #voiceCallLayer.on{display:flex}
  #voiceCallCard{width:min(390px,94vw);max-height:88vh;overflow:auto;background:#f7fbfd;border-radius:24px;padding:24px 18px;text-align:center;box-shadow:0 18px 50px #0008;color:#173242}
  #voiceCallIcon{width:92px;height:92px;border-radius:50%;margin:0 auto 14px;background:#dceaf0;display:flex;align-items:center;justify-content:center;font-size:48px}
  #voiceCallState{font-size:13px;font-weight:900;letter-spacing:.5px;opacity:.7;margin-bottom:6px}
  #voiceCallNumber{font:900 25px monospace;margin:5px 0 16px}
  #voiceCallActions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
  #voiceCallActions button{min-width:110px;border:0;border-radius:16px;padding:13px 15px;font-weight:900;color:white;background:#263847}
  #voiceAnswer{background:#198754!important} #voiceReject,#voiceHang{background:#bd3030!important}
  #voiceCallHint{font-size:12px;margin-top:14px;opacity:.7;line-height:1.35}
  #recentCallsBtn{margin:4px auto 7px;display:block;border:0;border-radius:10px;padding:7px 12px;font-weight:900;background:#263847;color:#fff;font-size:11px}
  .recentCallRow{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #d8e3e8;padding:10px 2px;text-align:left}
  .recentCallNum{font:900 17px monospace;color:#173242}.recentCallTime{font-size:11px;opacity:.65;margin-top:3px}.recentCallDial{border:0;border-radius:11px;padding:9px 11px;font-weight:900;background:#198754;color:#fff}
  `;
  document.head.appendChild(style);

  const layer=document.createElement('div');
  layer.id='voiceCallLayer';
  layer.innerHTML=`<div id="voiceCallCard"><div id="voiceCallIcon">☎</div><div id="voiceCallState">BAĞLANIYOR</div><div id="voiceCallNumber"></div><div id="voiceCallActions"></div><div id="voiceCallHint"></div></div>`;
  document.body.appendChild(layer);
  const state=()=>document.getElementById('voiceCallState');
  const number=()=>document.getElementById('voiceCallNumber');
  const actions=()=>document.getElementById('voiceCallActions');
  const hint=()=>document.getElementById('voiceCallHint');

  function installHistoryButton(){
    const own=document.getElementById('ownNumber');
    if(!own||document.getElementById('recentCallsBtn')) return;
    const b=document.createElement('button');
    b.id='recentCallsBtn';
    b.textContent='SON ARAMALAR';
    b.onclick=showHistory;
    own.insertAdjacentElement('afterend',b);
  }
  function showHistory(){
    const h=getHistory();
    layer.classList.add('on');
    state().textContent='SON ARAMALAR';
    number().textContent=h.length?h.length+' KAYIT':'KAYIT YOK';
    actions().innerHTML='<button id="voiceHang">KAPAT</button>';
    hint().innerHTML=h.length?h.map((r,i)=>`<div class="recentCallRow"><div><div class="recentCallNum">${displayNum(r.number)}</div><div class="recentCallTime">${new Date(r.time).toLocaleString('tr-TR')}</div></div><button class="recentCallDial" data-num="${r.number}">ARA</button></div>`).join(''):'Henüz aradığın bir 0601 numarası yok.';
    document.getElementById('voiceHang').onclick=()=>closeCallUI();
    hint().querySelectorAll('.recentCallDial').forEach(b=>b.onclick=()=>{
      const target=b.dataset.num;
      closeCallUI();
      const open=document.getElementById('openPhoneBtn');
      if(open) open.click();
      setTimeout(()=>{
        const num=document.getElementById('num');
        if(num){
          num.textContent=target;
          const callBtn=document.getElementById('callBtn');
          if(callBtn) callBtn.click();
        }
      },80);
    });
  }

  function stopLocal(){
    if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
  }
  function closeAudio(){if(remoteAudio){remoteAudio.pause();remoteAudio.srcObject=null;remoteAudio.remove();remoteAudio=null;}}
  function closeCallUI(){layer.classList.remove('on');}
  function cleanup(closeMedia=true){
    if(closeMedia&&activeCall){try{activeCall.close()}catch(e){}}
    activeCall=null;incomingCall=null;stopLocal();closeAudio();closeCallUI();
  }
  function showStatus(label,num,buttons='',msg=''){
    layer.classList.add('on');state().textContent=label;number().textContent=displayNum(num);actions().innerHTML=buttons;hint().textContent=msg;
  }
  function playRemote(stream){
    closeAudio();remoteAudio=document.createElement('audio');remoteAudio.autoplay=true;remoteAudio.playsInline=true;remoteAudio.srcObject=stream;document.body.appendChild(remoteAudio);
    remoteAudio.play().catch(()=>{});
  }
  function bindCall(call,remoteNum){
    activeCall=call;
    call.on('stream',stream=>{playRemote(stream);showStatus('GÖRÜŞMEDE',remoteNum,'<button id="voiceHang">KAPAT</button>','Ses bağlantısı aktif.');document.getElementById('voiceHang').onclick=()=>cleanup(true);});
    call.on('close',()=>cleanup(false));
    call.on('error',()=>{showStatus('ÇAĞRI HATASI',remoteNum,'<button id="voiceHang">KAPAT</button>','Bağlantı kurulamadı.');document.getElementById('voiceHang').onclick=()=>cleanup(false);});
  }
  async function getMic(){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error('Mikrofon desteklenmiyor');
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  }
  async function startOutgoing(target){
    target=String(target||'').replace(/\D/g,'');
    if(target.length!==11||!target.startsWith('0601')) return;
    saveHistory(target);
    if(target===ownNumber){showStatus('KENDİ NUMARAN',target,'<button id="voiceHang">KAPAT</button>','Kendi numaranı arayamazsın.');document.getElementById('voiceHang').onclick=()=>cleanup(false);return;}
    if(!peer||peer.disconnected||peer.destroyed){showStatus('HAT HAZIR DEĞİL',target,'<button id="voiceHang">KAPAT</button>','Bağlantı servisi henüz hazır değil.');document.getElementById('voiceHang').onclick=()=>cleanup(false);return;}
    try{
      showStatus('MİKROFON İZNİ',target,'<button id="voiceHang">İPTAL</button>','Sesli görüşme için mikrofon izni gerekiyor.');document.getElementById('voiceHang').onclick=()=>cleanup(false);
      localStream=await getMic();
      showStatus('ARANIYOR',target,'<button id="voiceHang">KAPAT</button>','Karşı tarafın uygulaması açık olmalı.');document.getElementById('voiceHang').onclick=()=>cleanup(true);
      const c=peer.call(peerId(target),localStream,{metadata:{from:ownNumber}});
      bindCall(c,target);
    }catch(e){showStatus('MİKROFON AÇILAMADI',target,'<button id="voiceHang">KAPAT</button>',e&&e.message?e.message:'Mikrofon izni verilmedi.');document.getElementById('voiceHang').onclick=()=>cleanup(false);}
  }
  function showIncoming(call){
    incomingCall=call;
    const remote=(call.metadata&&call.metadata.from)||String(call.peer||'').replace(/^pm-/,'');
    showStatus('GELEN ARAMA',remote,'<button id="voiceAnswer">CEVAPLA</button><button id="voiceReject">REDDET</button>','Cevapladığında mikrofon açılır.');
    document.getElementById('voiceReject').onclick=()=>{try{call.close()}catch(e){}cleanup(false)};
    document.getElementById('voiceAnswer').onclick=async()=>{
      try{
        showStatus('BAĞLANIYOR',remote,'<button id="voiceHang">İPTAL</button>','Mikrofon açılıyor…');document.getElementById('voiceHang').onclick=()=>cleanup(true);
        localStream=await getMic();
        call.answer(localStream);bindCall(call,remote);
      }catch(e){try{call.close()}catch(_){}showStatus('MİKROFON AÇILAMADI',remote,'<button id="voiceHang">KAPAT</button>','Mikrofon izni verilmedi.');document.getElementById('voiceHang').onclick=()=>cleanup(false);}
    };
  }
  function init(){
    if(!window.Peer) return;
    peer=new Peer(peerId(ownNumber),{debug:1});
    peer.on('open',()=>{const own=document.getElementById('ownNumber');if(own&&!own.textContent.includes('ÇEVRİMİÇİ')) own.textContent+=' · ÇEVRİMİÇİ';installHistoryButton();});
    peer.on('call',showIncoming);
    peer.on('error',err=>{
      if(err&&err.type==='peer-unavailable'&&activeCall){const remote=number().textContent;showStatus('ULAŞILAMIYOR',remote,'<button id="voiceHang">KAPAT</button>','Bu numara şu anda çevrimdışı olabilir.');document.getElementById('voiceHang').onclick=()=>cleanup(true);}
    });
  }
  function loadPeer(){
    if(window.Peer){init();return;}
    const s=document.createElement('script');s.src='https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js';s.onload=init;s.onerror=()=>{const own=document.getElementById('ownNumber');if(own)own.textContent+=' · SES BAĞLANTISI YÜKLENEMEDİ';installHistoryButton();};document.head.appendChild(s);
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest&&e.target.closest('#callBtn');
    if(!b) return;
    const num=document.getElementById('num');
    const target=num?num.textContent.replace(/\D/g,''):'';
    if(target.length===11&&target.startsWith('0601')) setTimeout(()=>startOutgoing(target),0);
  },true);

  setTimeout(installHistoryButton,300);
  window.addEventListener('beforeunload',()=>{cleanup(true);if(peer&&!peer.destroyed)peer.destroy();});
  loadPeer();
})();