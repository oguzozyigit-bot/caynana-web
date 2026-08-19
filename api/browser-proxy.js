const dns = require('dns').promises;
const net = require('net');

function isPrivateIp(ip){
  if(!net.isIP(ip)) return false;
  if(ip.includes(':')) return ip==='::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:');
  const p=ip.split('.').map(Number);
  return p[0]===10 || p[0]===127 || (p[0]===169&&p[1]===254) || (p[0]===172&&p[1]>=16&&p[1]<=31) || (p[0]===192&&p[1]===168) || p[0]===0;
}
async function safeUrl(raw){
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol)) throw new Error('Yalnız HTTP/HTTPS desteklenir');
  if(!u.hostname || u.username || u.password) throw new Error('Geçersiz adres');
  const r=await dns.lookup(u.hostname,{all:true});
  if(!r.length || r.some(x=>isPrivateIp(x.address))) throw new Error('Bu adres açılamaz');
  return u;
}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function abs(v,base){try{return new URL(v,base).href}catch{return '#'}}
function cleanHtml(html,base){
  html=String(html||'').slice(0,2_500_000);
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
           .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,'')
           .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi,'')
           .replace(/<embed\b[^>]*>/gi,'')
           .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi,'')
           .replace(/\son\w+\s*=\s*(["']).*?\1/gi,'');
  html=html.replace(/\b(href)\s*=\s*(["'])(.*?)\2/gi,(_,a,q,v)=>{
    const u=abs(v,base); return `${a}=${q}/api/browser-proxy?url=${encodeURIComponent(u)}${q}`;
  });
  html=html.replace(/\b(src)\s*=\s*(["'])(.*?)\2/gi,(_,a,q,v)=>`${a}=${q}${esc(abs(v,base))}${q}`);
  const css=`<style>html,body{max-width:100%;overflow-x:hidden;background:#fff;color:#172b36;font-family:Arial,sans-serif}img,video{max-width:100%;height:auto}a{color:#145c9e;word-break:break-word}*{box-sizing:border-box}</style>`;
  if(/<head\b/i.test(html)) html=html.replace(/<head\b[^>]*>/i,m=>m+css); else html=css+html;
  return html;
}
module.exports=async function handler(req,res){
  try{
    const raw=Array.isArray(req.query?.url)?req.query.url[0]:req.query?.url;
    if(!raw) return res.status(400).send('<p>Adres girilmedi.</p>');
    const u=await safeUrl(raw);
    const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),8000);
    const r=await fetch(u.href,{redirect:'follow',signal:ctrl.signal,headers:{'user-agent':'Mozilla/5.0 TelefonCall/1.0','accept':'text/html,application/xhtml+xml'}}); clearTimeout(t);
    const ct=r.headers.get('content-type')||'';
    if(!ct.includes('text/html')&&!ct.includes('application/xhtml+xml')) return res.status(415).send('<p>Bu içerik uygulama içi görüntüleyicide gösterilemiyor.</p>');
    const finalUrl=await safeUrl(r.url);
    const text=await r.text();
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline' https: http:; font-src https: http: data:; media-src https: http:; base-uri 'none'; form-action 'none'");
    res.status(200).send(cleanHtml(text,finalUrl.href));
  }catch(e){
    res.status(502).setHeader('Content-Type','text/html; charset=utf-8');
    res.end(`<div style="font-family:Arial;padding:20px"><h3>Sayfa açılamadı</h3><p>${esc(e.message||'Bağlantı hatası')}</p></div>`);
  }
};