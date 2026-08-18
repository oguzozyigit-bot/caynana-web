(()=>{
const $=s=>document.querySelector(s);
function fixBlackBerri(){
  const y=($('#yearLabel')?.textContent||'').trim();
  document.querySelectorAll('.phoneCard').forEach(card=>{
    const label=card.querySelector('.label')?.textContent||'';
    const should=y.startsWith('2001') && /BlackBerri\s+Plus\s+01/i.test(label);
    if(should&&!card.classList.contains('bb2001fix'))card.classList.add('bb2001fix');
    if(!should&&card.classList.contains('bb2001fix'))card.classList.remove('bb2001fix');
  });
}
function fix2026Samsunq(){
  const y=($('#yearLabel')?.textContent||'').trim();
  if(!y.startsWith('2026'))return;
  const names=['Samsunq S26','Samsunq S26 Plus','Samsunq S26 Ultra','Samsunq Fold 26','Samsunq Flip 26'];
  document.querySelectorAll('.phoneCard').forEach((card,i)=>{const l=card.querySelector('.label');if(l&&names[i]&&l.textContent!==names[i])l.textContent=names[i]});
  document.querySelectorAll('#models button').forEach((b,i)=>{if(names[i]&&b.textContent!==names[i])b.textContent=names[i]});
  const active=[...document.querySelectorAll('#models button')].findIndex(b=>b.classList.contains('active'));
  const title=$('#modelName'),name=names[Math.max(0,active)];if(title&&name&&title.textContent!==name)title.textContent=name;
}
const css=document.createElement('style');
css.textContent=`
.phoneCard.bb2001fix .device{width:104px!important;height:126px!important;border-radius:14px!important;background:linear-gradient(145deg,#30373b,#15191c)!important;border:3px solid #0c0f11!important;box-shadow:inset 0 0 0 2px #4b555b,0 8px 14px #3455!important}
.phoneCard.bb2001fix .device .screen{left:13px!important;right:13px!important;top:11px!important;height:43px!important;border-radius:4px!important;background:linear-gradient(#b9c99d,#7f9470)!important;border:2px solid #0d1113!important}
.phoneCard.bb2001fix .device .keys{left:10px!important;right:10px!important;top:65px!important;grid-template-columns:repeat(5,1fr)!important;gap:3px!important}
.phoneCard.bb2001fix .device .keys i{height:9px!important;border-radius:2px!important;background:linear-gradient(#9aa4aa,#4f595f)!important;border:1px solid #30373b!important}
.phoneCard.bb2001fix .device:before{content:'';position:absolute;left:42px;top:57px;width:16px;height:8px;border-radius:10px;background:#727e84;border:1px solid #20272b}
.phoneCard.bb2001fix .device:after{content:''!important;left:47px!important;right:auto!important;bottom:7px!important;width:10px!important;height:3px!important;background:#59636a!important}
`;
document.head.appendChild(css);
const gameNames=['Pixel Snake','Pocket Racer','Brick Break','Maze Escape','Star Defender','Goal Shot','Memory Flip','Orb Catch','Tunnel Run','Mini Golf','Meteor Dodge','Color Match','Tank Patrol','Sky Jump','Circuit Dash','Treasure Grid','Wave Rider','Laser Gate','Block Drop','Micro Pinball','Space Miner','Street Sprint','Rocket Tap','Bug Hunter'];
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function currentKey(){return (($('#yearLabel')?.textContent||'')+'|'+($('#modelName')?.textContent||'')).trim()}
function uniqueGameName(){const k=currentKey(),h=hash(k);return gameNames[h%gameNames.length]+' '+String(h%97).padStart(2,'0')}
function enhanceGameButton(){
  const grid=$('#apps');if(!grid)return;
  const buttons=[...grid.querySelectorAll('.app')];
  const candidate=buttons.find(b=>{const t=b.textContent.toLowerCase();return !/(telefon|rehber|mesaj|hesap|saat|müzik|kamera|notlar|tarayıcı|ayar|galeri|sosyal)/.test(t)});
  if(candidate&&!candidate.dataset.uniqueGame){candidate.dataset.uniqueGame='1';candidate.innerHTML='<span>🎮</span>'+uniqueGameName();}
}
function openUniqueGame(){
  const stage=$('#stage');if(!stage)return;
  const key=currentKey(),h=hash(key),mode=h%8,speed=2+(h%5),target=18+(h%20);
  stage.classList.remove('hide');
  stage.innerHTML=`<button id="ugBack">← UYGULAMALARA DÖN</button><div class="panel"><h3>${uniqueGameName()}</h3><canvas id="ugCanvas" width="280" height="190" style="width:280px;max-width:100%;height:190px;background:#173242;border:5px solid #263847;border-radius:10px"></canvas><div class="dpad"><button class="up" data-d="u">▲</button><button class="left" data-d="l">◀</button><button class="down" data-d="d">▼</button><button class="right" data-d="r">▶</button></div><div id="ugScore">Skor: 0</div></div>`;
  $('#ugBack').onclick=()=>{clearInterval(window.__uniqueGameTimer);stage.classList.add('hide');stage.innerHTML='';setTimeout(()=>$('#openAppsBtn')?.click(),0)};
  let x=30,y=90,dx=1,dy=0,score=0,ox=220,oy=50,phase=0;
  stage.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const d=b.dataset.d;if(d==='u'){dx=0;dy=-1}if(d==='d'){dx=0;dy=1}if(d==='l'){dx=-1;dy=0}if(d==='r'){dx=1;dy=0}});
  clearInterval(window.__uniqueGameTimer);
  window.__uniqueGameTimer=setInterval(()=>{
    const c=$('#ugCanvas');if(!c)return;const g=c.getContext('2d');g.clearRect(0,0,280,190);g.fillStyle='#173242';g.fillRect(0,0,280,190);phase++;
    if(mode===0){x=(x+dx*speed+280)%280;y=(y+dy*speed+190)%190;ox=(ox+279)%280;if(Math.abs(x-ox)<14&&Math.abs(y-oy)<14){score+=10;ox=(ox+97)%260;oy=(oy+61)%170}}
    else if(mode===1){x=Math.max(0,Math.min(266,x+dx*speed));y=Math.max(0,Math.min(176,y+dy*speed));oy=(oy+speed+1)%190;if(Math.abs(x-ox)<16&&Math.abs(y-oy)<16){score=0;oy=0}}
    else if(mode===2){x=(x+dx*speed+280)%280;y=(y+dy*speed+190)%190;ox=140+Math.sin(phase/12)*90;oy=95+Math.cos(phase/15)*65;if(Math.abs(x-ox)<15&&Math.abs(y-oy)<15)score+=15}
    else if(mode===3){x=Math.max(0,Math.min(266,x+dx*speed));y=Math.max(0,Math.min(176,y+dy*speed));const gate=(phase*2)%150+20;if(x>125&&x<150&&(y<gate-20||y>gate+20)){x=20;y=90;score=0}}
    else if(mode===4){x=(x+dx*speed+280)%280;y=(y+dy*speed+190)%190;ox=(phase*3)%260+10;oy=40+((h>>3)%100);if(Math.abs(x-ox)<16&&Math.abs(y-oy)<16)score+=20}
    else if(mode===5){x=Math.max(0,Math.min(266,x+dx*speed));y=Math.max(0,Math.min(176,y+dy*speed));ox=30+((phase*5+h)%220);oy=20+((phase*3+h)%140);if(Math.abs(x-ox)<14&&Math.abs(y-oy)<14)score+=5}
    else if(mode===6){x=(x+dx*speed+280)%280;y=(y+dy*speed+190)%190;ox=140+Math.sin(phase/8)*110;oy=95;if(Math.abs(x-ox)<16&&Math.abs(y-oy)<16)score+=12}
    else{x=Math.max(0,Math.min(266,x+dx*speed));y=Math.max(0,Math.min(176,y+dy*speed));oy=(oy+speed)%190;ox=40+((phase*7+h)%200);if(Math.abs(x-ox)<15&&Math.abs(y-oy)<15){score+=8;oy=0}}
    g.fillStyle='#e3ad35';g.fillRect(x,y,14,14);g.fillStyle='#f4f7f8';g.beginPath();g.arc(ox,oy,8,0,Math.PI*2);g.fill();score++;$('#ugScore').textContent='Skor: '+score+' · Hedef: '+target;
  },90);
}
document.addEventListener('click',e=>{const b=e.target.closest?.('.app[data-unique-game]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openUniqueGame()},true);
let scheduled=false;
function runFixes(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;fixBlackBerri();fix2026Samsunq();enhanceGameButton()})}
new MutationObserver(runFixes).observe(document.body,{subtree:true,childList:true});
setTimeout(runFixes,200);
})();
