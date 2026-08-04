const SERPER_SEARCH='https://google.serper.dev/search';
const SERPER_IMAGES='https://google.serper.dev/images';
const DIRECT_RETAILERS=[
  'trendyol.com','hepsiburada.com','amazon.com.tr','amazon.com','n11.com','pttavm.com','pazarama.com',
  'teknosa.com','mediamarkt.com.tr','koctas.com.tr','koçtaş.com.tr','vatanbilgisayar.com','avansas.com',
  'idefix.com','boyner.com.tr','morhipo.com','gratis.com','watsons.com.tr','carrefoursa.com','migros.com.tr',
  'beko.com.tr','arcelik.com.tr','bosch-home.com.tr','samsung.com','mi.com','apple.com','kumtel.com'
];
const BLOCKED_COMPARATORS=['cimri.com','akakce.com','akakçe.com','onual.com','epey.com','ucuzcu.com','fiyat.com','enuygun.com'];
function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
function cleanKey(){return String(process.env.SERPER_API_KEY||'').trim().replace(/^['"]|['"]$/g,'');}
function host(link=''){try{return new URL(link).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}}
function isUrl(v=''){try{return /^https?:$/.test(new URL(v).protocol)}catch{return false}}
function titleFromUrl(raw=''){try{const u=new URL(raw);let s=u.pathname.split('/').filter(Boolean).find(x=>/-p-\d+/.test(x))||u.pathname.split('/').filter(Boolean).pop()||'';return decodeURIComponent(s.replace(/-p-\d+.*/,'').replace(/[-_]+/g,' ')).replace(/\b\w/g,c=>c.toUpperCase()).trim()}catch{return raw}}
function classify(input,q){const t=`${input} ${q}`.toLowerCase();if(/trendyol|hepsiburada|amazon|n11|pttavm|pazarama|ürün|urun|fiyat|model/.test(t))return'product';if(/x\.com|twitter|instagram|tiktok|facebook|youtube/.test(t))return'social';if(/haber|gazete|son dakika|sözcü|hurriyet|milliyet|ntv|cnn|aa\.com/.test(t))return'news';return'general'}
function parsePrice(text=''){const n=text.replace(/\./g,'').replace(/,/g,'.');const m=n.match(/(?:₺\s*)?(\d{2,7}(?:\.\d{1,2})?)\s*(?:TL|₺)/i)||n.match(/(?:₺)\s*(\d{2,7}(?:\.\d{1,2})?)/i);return m?Number(m[1]):null}
function isBlocked(h){return BLOCKED_COMPARATORS.some(d=>h===d||h.endsWith('.'+d))}
function isDirectRetailer(h){return DIRECT_RETAILERS.some(d=>h===d||h.endsWith('.'+d))}
async function serper(url,body){const key=cleanKey();if(!key)throw new Error('SERPER_API_KEY eksik.');const r=await fetch(url,{method:'POST',headers:{'X-API-KEY':key,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)});const raw=await r.text();let p={};try{p=raw?JSON.parse(raw):{}}catch{}if(!r.ok)throw new Error(`Serper ${r.status}: ${p.message||p.error||raw.slice(0,180)}`);return p}
module.exports=async function(req,res){if(req.method!=='POST')return send(res,405,{error:'Yalnızca POST desteklenir.'});try{
 const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});const input=String(body.input||body.url||'').trim();if(!input)return send(res,400,{error:'Bir bağlantı veya arama metni girin.'});
 const query=isUrl(input)?titleFromUrl(input):input;const type=classify(input,query);
 const searches=type==='product'?[`${query} fiyat satın al`,`${query} yorum inceleme`,`${query} alternatif ürün`]:type==='news'?[query,`${query} resmi açıklama`,`${query} doğru mu`]:[query,`${query} yorum`,`${query} doğrulama`];
 const [pricePayload,reviewPayload,altPayload,imagePayload]=await Promise.all([
   serper(SERPER_SEARCH,{q:searches[0],gl:'tr',hl:'tr',num:20}),
   serper(SERPER_SEARCH,{q:searches[1],gl:'tr',hl:'tr',num:12}),
   serper(SERPER_SEARCH,{q:searches[2],gl:'tr',hl:'tr',num:12}),
   type==='product'?serper(SERPER_IMAGES,{q:query,gl:'tr',hl:'tr',num:10}):Promise.resolve({images:[]})
 ]);
 const normalize=(item)=>{const link=item.link||item.productLink||'';const h=host(link);const text=`${item.title||''} ${item.snippet||''} ${item.price||''}`;return{title:item.title||'',link,source:item.source||h,hostname:h,snippet:item.snippet||'',image:item.imageUrl||item.thumbnail||'',price:item.price||'',priceValue:parsePrice(`${item.price||''} ${text}`),rating:item.rating||null,ratingCount:item.ratingCount||item.reviews||null}};
 const rawPrice=[...(pricePayload.shopping||[]),...(pricePayload.organic||[])].map(normalize);
 const seen=new Set();const prices=rawPrice.filter(x=>{if(!x.link||seen.has(x.link)||isBlocked(x.hostname)||!isDirectRetailer(x.hostname)||!Number.isFinite(x.priceValue)||x.priceValue<=0)return false;seen.add(x.link);return true}).sort((a,b)=>a.priceValue-b.priceValue).slice(0,15);
 const reviews=[...(reviewPayload.organic||[])].map(normalize).filter(x=>x.link&&!isBlocked(x.hostname)).slice(0,10);
 const alternatives=[...(altPayload.shopping||[]),...(altPayload.organic||[])].map(normalize).filter(x=>x.link&&!isBlocked(x.hostname)&&isDirectRetailer(x.hostname)).filter((x,i,a)=>a.findIndex(y=>y.link===x.link)===i).slice(0,8);
 const images=(imagePayload.images||[]).map(x=>({image:x.imageUrl||x.thumbnailUrl||'',thumbnail:x.thumbnailUrl||x.imageUrl||'',title:x.title||query,source:x.source||host(x.link||''),link:x.link||''})).filter(x=>x.image).slice(0,8);
 const allSources=[...reviews,...alternatives].filter((x,i,a)=>x.link&&a.findIndex(y=>y.link===x.link)===i).slice(0,18);
 return send(res,200,{input,query,type,searchedQueries:searches,summary:{resultCount:prices.length+allSources.length,pricedCount:prices.length,lowestPrice:prices[0]||null,highestPrice:prices.length?prices[prices.length-1]:null,averagePrice:prices.length?Math.round(prices.reduce((s,x)=>s+x.priceValue,0)/prices.length):null},prices,reviews,alternatives,images,sources:allSources,analyzedAt:new Date().toISOString()});
 }catch(e){return send(res,500,{error:e.message||'Araştırma yapılamadı.'})}
};