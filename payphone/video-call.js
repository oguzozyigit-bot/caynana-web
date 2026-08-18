(()=>{
  const ownNumber=localStorage.getItem('phoneMuseumOwnNumber');
  if(!ownNumber)return;
  let peer=null,peerOpen=false,activeCall=null,localStream=null,remoteVideo=null,remoteAudio=null,localVideo=null,facing='user';
  const peerId=n=>'pmv-'+String(n||'').replace(/\D/g,'');
  const fmt=n=>{n=String(n||'').replace(/\D/g,'');return n.length===11?n.slice(0,4)+' '+n.slice(4,7)+' '+n.slice(7,9)+' '+n.slice(9,11):n};

  const style=document.createElement('style');
  style.textContent=`
  #videoCallLayer{position:fixed;inset:0;z-index:10020;background:#071117f2;display:none;align-items:center;justify-content:center;padding:12px;font-family:Arial,sans-serif}
  #videoCallLayer.on{display:flex}.videoCard{width:min(430px,96vw);background:#111d24;color:#fff;border-radius:24px;padding:14px;box-shadow:0 18px 50px #0009;text-align:center}
  .videoStage{position:relative;width:100%;aspect-ratio:3/4;max-height:68vh;background:#000;border-radius:18px;overflow:hidden;margin:10px 0}.videoStage video{width:100%;height:100%;object-fit:cover;background:#000}.videoLocal{position:absolute!important;right:10px!important;top:10px!important;width:30%!important;height:26%!important;border-radius:12px!important;border:2px solid #fff!important;z-index:2;object-fit:cover!important;transform:scaleX(-1)}
  .videoTitle{font-size:12px;font-weight:900;opacity:.75;letter-spacing:.6px}.videoNum{font:900 22px monospace;margin:5px 0}.videoBtns{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.videoBtns button,#videoDialBtn{border:0;border-radius:14px;padding:12px 14px;font-weight:900;color:#fff;background:#263847}.videoAccept{background:#198754!important}.videoReject,.videoHang{background:#bd3030!important}.videoCam{background:#365d78!important}.videoSound{background:#8a6d1f!important}#videoDialBtn{background:#365d78;margin-left:6px}#videoDialBtn.videoReady{background:#198754!important}
  `;
  document.head.appendChild(style);

  const layer=document.createElement('div');layer.id='videoCallLayer';
  layer.innerHTML='<div class="videoCard"><div id="videoState" class="videoTitle">GÖRÜNTÜLÜ ARAMA</div><div id="videoNum" class="videoNum"></div><div id="videoBody"></div><div id="videoBtns" class="videoBtns"></div></div>';
  document.body.appendChild(layer);
  const state=()=>document.getElementById('videoState'),num=()=>document.getElementById('videoNum'),body=()=>document.getElementById('videoBody'),btns=()=>document.getElementById('videoBtns');

  function setButtonReady(){const b=document.getElementById('videoDialBtn');if(!b)return;b.classList.toggle('videoReady',peerOpen);b.textContent=peerOpen?'📹 VİDEO ARA':'📹 VİDEO HATTI...';}
  function stopMedia(){if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}if(remoteVideo){remoteVideo.srcObject=null;remoteVideo=null}if(remoteAudio){remoteAudio.pause();remoteAudio.srcObject=null;remoteAudio.remove();remoteAudio=null}if(localVideo){localVideo.srcObject=null;localVideo=null}}
  function closeUI(){layer.classList.remove('on');body().innerHTML='';btns().innerHTML=''}
  function cleanup(close=true){if(close&&activeCall){try{activeCall.close()}catch(e){}}activeCall=null;stopMedia();closeUI()}
  function show(label,n,html='',buttons=''){layer.classList.add('on');state().textContent=label;num().textContent=fmt(n);body().innerHTML=html;btns().innerHTML=buttons}
  async function getMedia(face='user'){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('Kamera desteklenmiyor');return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:{facingMode:{ideal:face}}})}
  function waitPeer(ms=8000){return new Promise((resolve,reject)=>{if(peerOpen&&peer&&!peer.destroyed&&!peer.disconnected){resolve();return}const start=Date.now();const t=setInterval(()=>{if(peerOpen&&peer&&!peer.destroyed&&!peer.disconnected){clearInterval(t);resolve()}else if(Date.now()-start>ms){clearInterval(t);reject(new Error('Video hattı açılamadı'))}},120)})}
  async function ensureRemoteSound(){
    try{
      if(remoteVideo){remoteVideo.muted=false;remoteVideo.volume=1;await remoteVideo.play()}
    }catch(e){}
    try{
      if(remoteAudio){remoteAudio.muted=false;remoteAudio.volume=1;await remoteAudio.play()}
    }catch(e){}
  }
  function renderLive(remote,n){
    show('GÖRÜNTÜLÜ GÖRÜŞME',n,'<div class="videoStage"><video id="remoteV" autoplay playsinline></video><video id="localV" class="videoLocal" autoplay muted playsinline></video></div>','<button class="videoSound" id="videoSound">🔊 SESİ AÇ</button><button class="videoCam" id="switchCam">KAMERA ÇEVİR</button><button class="videoHang" id="videoHang">KAPAT</button>');
    remoteVideo=document.getElementById('remoteV');localVideo=document.getElementById('localV');
    remoteVideo.srcObject=remote;remoteVideo.muted=false;remoteVideo.volume=1;
    localVideo.srcObject=localStream;
    remoteAudio=document.createElement('audio');remoteAudio.autoplay=true;remoteAudio.playsInline=true;remoteAudio.muted=false;remoteAudio.volume=1;remoteAudio.srcObject=remote;document.body.appendChild(remoteAudio);
    ensureRemoteSound();localVideo.play().catch(()=>{});
    document.getElementById('videoSound').onclick=ensureRemoteSound;
    document.getElementById('videoHang').onclick=()=>cleanup(true);
    document.getElementById('switchCam').onclick=async()=>{try{facing=facing==='user'?'environment':'user';const ns=await getMedia(facing);const nt=ns.getVideoTracks()[0];const at=ns.getAudioTracks()[0];const senders=activeCall&&activeCall.peerConnection?activeCall.peerConnection.getSenders():[];const vs=senders.find(s=>s.track&&s.track.kind==='video');const as=senders.find(s=>s.track&&s.track.kind==='audio');if(vs&&nt)await vs.replaceTrack(nt);if(as&&at)await as.replaceTrack(at);const old=localStream;localStream=ns;if(localVideo)localVideo.srcObject=localStream;if(old)old.getTracks().forEach(t=>t.stop())}catch(e){}}
  }
  function bind(call,n){activeCall=call;call.on('stream',s=>renderLive(s,n));call.on('close',()=>cleanup(false));call.on('error',()=>{show('GÖRÜNTÜLÜ ÇAĞRI HATASI',n,'<p>Bağlantı kurulamadı.</p>','<button class="videoHang" id="videoHang">KAPAT</button>');document.getElementById('videoHang').onclick=()=>cleanup(false)})}
  async function outgoing(target){
    target=String(target||'').replace(/\D/g,'');
    if(target.length!==11||!target.startsWith('0601')){show('NUMARA HATALI',target,'<p>0601 ile başlayan 11 haneli numara gir.</p>','<button class="videoHang" id="videoHang">KAPAT</button>');document.getElementById('videoHang').onclick=()=>cleanup(false);return}
    if(target===ownNumber){show('KENDİ NUMARAN',target,'<p>Kendi numaranı görüntülü arayamazsın.</p>','<button class="videoHang" id="videoHang">KAPAT</button>');document.getElementById('videoHang').onclick=()=>cleanup(false);return}
    try{
      show('VİDEO HATTI BAĞLANIYOR',target,'<p>Görüntülü arama bağlantısı hazırlanıyor…</p>','<button class="videoHang" id="videoHang">İPTAL</button>');document.getElementById('videoHang').onclick=()=>cleanup(false);
      await waitPeer();
      show('KAMERA İZNİ',target,'<p>Kamera ve mikrofon izni gerekiyor.</p>','<button class="videoHang" id="videoHang">İPTAL</button>');document.getElementById('videoHang').onclick=()=>cleanup(false);
      localStream=await getMedia(facing);
      show('GÖRÜNTÜLÜ ARANIYOR',target,'<p>Karşı tarafın uygulaması açık olmalı.</p>','<button class="videoHang" id="videoHang">KAPAT</button>');document.getElementById('videoHang').onclick=()=>cleanup(true);
      const c=peer.call(peerId(target),localStream,{metadata:{from:ownNumber,video:true}});bind(c,target);
    }catch(e){show('VİDEO ARAMA BAŞLAMADI',target,'<p>'+(e&&e.message?e.message:'Bağlantı kurulamadı.')+'</p>','<button class="videoHang" id="videoHang">KAPAT</button>');document.getElementById('videoHang').onclick=()=>cleanup(false)}
  }
  function incoming(call){const remote=(call.metadata&&call.metadata.from)||String(call.peer||'').replace(/^pmv-/,'');show('GELEN GÖRÜNTÜLÜ ARAMA',remote,'<p>📹 Görüntülü arama</p>','<button class="videoAccept" id="videoAccept">CEVAPLA</button><button class="videoReject" id="videoReject">REDDET</button>');document.getElementById('videoReject').onclick=()=>{try{call.close()}catch(e){}cleanup(false)};document.getElementById('videoAccept').onclick=async()=>{try{show('BAĞLANIYOR',remote,'<p>Kamera ve mikrofon açılıyor…</p>','<button class="videoHang" id="videoHang">İPTAL</button>');document.getElementById('videoHang').onclick=()=>cleanup(true);localStream=await getMedia(facing);call.answer(localStream);bind(call,remote)}catch(e){try{call.close()}catch(_){}show('KAMERA AÇILAMADI',remote,'<p>Kamera veya mikrofon izni verilmedi.</p>','<button class="videoHang" id="videoHang">KAPAT</button>');document.getElementById('videoHang').onclick=()=>cleanup(false)}}}
  function init(){if(!window.Peer)return;peerOpen=false;peer=new Peer(peerId(ownNumber),{debug:1});peer.on('open',()=>{peerOpen=true;setButtonReady()});peer.on('disconnected',()=>{peerOpen=false;setButtonReady();try{peer.reconnect()}catch(e){}});peer.on('close',()=>{peerOpen=false;setButtonReady()});peer.on('call',incoming);peer.on('error',err=>{if(err&&err.type==='peer-unavailable'&&activeCall){const n=num().textContent;show('ULAŞILAMIYOR',n,'<p>Karşı tarafın yeni sürümü açık değil veya video hattı henüz hazır değil.</p>','<button class="videoHang" id="videoHang">KAPAT</button>');document.getElementById('videoHang').onclick=()=>cleanup(true)}})}
  function addVideoButton(){const call=document.getElementById('callBtn');if(!call||document.getElementById('videoDialBtn'))return;const b=document.createElement('button');b.id='videoDialBtn';b.textContent='📹 VİDEO HATTI...';b.onclick=e=>{e.preventDefault();e.stopPropagation();const n=document.getElementById('num');const target=n?n.textContent.replace(/\D/g,''):'';outgoing(target)};call.insertAdjacentElement('afterend',b);setButtonReady()}
  const obs=new MutationObserver(()=>addVideoButton());obs.observe(document.body,{childList:true,subtree:true});
  function load(){if(window.Peer){init();return}const t=setInterval(()=>{if(window.Peer){clearInterval(t);init()}},120);setTimeout(()=>{clearInterval(t);if(!peer)setButtonReady()},12000)}
  window.addEventListener('beforeunload',()=>{cleanup(true);if(peer&&!peer.destroyed)peer.destroy()});load();setTimeout(addVideoButton,400);
})();