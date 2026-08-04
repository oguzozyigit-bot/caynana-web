const SERPER_SEARCH = 'https://google.serper.dev/search';
const SERPER_IMAGES = 'https://google.serper.dev/images';

const DIRECT_RETAILERS = [
  'trendyol.com','hepsiburada.com','amazon.com.tr','amazon.com','n11.com','pttavm.com','pazarama.com',
  'teknosa.com','mediamarkt.com.tr','koctas.com.tr','vatanbilgisayar.com','idefix.com','boyner.com.tr',
  'carrefoursa.com','migros.com.tr','beko.com.tr','arcelik.com.tr','bosch-home.com.tr','samsung.com',
  'mi.com','apple.com','kumtel.com','raks.com.tr','arzum.com.tr','fakir.com.tr','philips.com.tr'
];
const BLOCKED_COMPARATORS = ['cimri.com','akakce.com','akakçe.com','onual.com','epey.com','ucuzcu.com','fiyat.com','enuygun.com'];
const BLOCKED_ALT_BRANDS = ['sinbo'];
const CATEGORY_WORDS = [
  'vantilatör','telefon','televizyon','laptop','bilgisayar','tablet','kulaklık','süpürge','kahve makinesi',
  'klima','buzdolabı','çamaşır makinesi','bulaşık makinesi','fırın','airfryer','matkap','ayakkabı','çanta','saat'
];
const CATEGORY_BRANDS = {
  'vantilatör':['Raks','Arzum','Fakir','Philips','Xiaomi','Rowenta'],
  'telefon':['Samsung','Xiaomi','Apple','Honor','Oppo','Realme'],
  'televizyon':['Samsung','LG','Philips','TCL','Vestel','Sony'],
  'laptop':['Lenovo','Asus','HP','Acer','Dell','Monster'],
  'bilgisayar':['Lenovo','Asus','HP','Acer','Dell','Monster'],
  'tablet':['Samsung','Apple','Xiaomi','Lenovo','Huawei'],
  'kulaklık':['JBL','Sony','Samsung','Apple','Anker','Xiaomi'],
  'süpürge':['Philips','Arzum','Fakir','Bosch','Dyson','Rowenta'],
  'kahve makinesi':['Arzum','Philips','Fakir','Karaca','Delonghi','Bosch'],
  'airfryer':['Philips','Tefal','Xiaomi','Karaca','Arzum','Fakir']
};

function send(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
function cleanKey(){return String(process.env.SERPER_API_KEY||'').trim().replace(/^["']|["']$/g,'');}
function host(link=''){try{return new URL(link).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}}
function isUrl(value=''){try{return /^https?:$/.test(new URL(value).protocol)}catch{return false}}
function titleCase(value=''){return value.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g,m=>m.toLocaleUpperCase('tr-TR'))}
function normalizeModel(value=''){return value.toUpperCase().replace(/\s+/g,'-').replace(/-+/g,'-')}
function normalizeBrand(value=''){return String(value||'').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]/g,'')}
function isSinbo(value=''){return normalizeBrand(value)==='sinbo'}

function productIdentity(input){
  if(!isUrl(input)){
    const cleaned=input.replace(/\s+/g,' ').trim();
    const modelMatch=cleaned.match(/\b([A-ZÇĞİÖŞÜ]{1,8})[-\s]?([0-9]{2,6}[A-Z0-9-]*)\b/i);
    const model=modelMatch?normalizeModel(`${modelMatch[1]}-${modelMatch[2]}`):'';
    const category=CATEGORY_WORDS.find(w=>cleaned.toLocaleLowerCase('tr-TR').includes(w))||'';
    const brand=cleaned.split(/\s+/)[0]||'';
    const canonical=[titleCase(brand),model,category].filter(Boolean).join(' ').trim()||cleaned;
    return{brand:titleCase(brand),model,category,title:cleaned,canonical};
  }
  try{
    const url=new URL(input);const parts=url.pathname.split('/').filter(Boolean).map(p=>decodeURIComponent(p));
    const productIndex=parts.findIndex(p=>/-p-\d+/i.test(p));
    const slug=productIndex>=0?parts[productIndex]:(parts[parts.length-1]||'');
    const brandSlug=productIndex>0?parts[productIndex-1]:(parts[0]||'');
    const cleanSlug=slug.replace(/-p-\d+.*/i,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
    const brand=titleCase(brandSlug.replace(/[-_]+/g,' '));
    const modelMatch=cleanSlug.match(/\b([A-ZÇĞİÖŞÜ]{1,8})[-\s]?([0-9]{2,6}[A-Z0-9-]*)\b/i);
    const model=modelMatch?normalizeModel(`${modelMatch[1]}-${modelMatch[2]}`):'';
    const lower=cleanSlug.toLocaleLowerCase('tr-TR');
    const category=CATEGORY_WORDS.find(w=>lower.includes(w))||'';
    const title=titleCase(cleanSlug);const canonical=[brand,model,category].filter(Boolean).join(' ').trim()||title;
    return{brand,model,category,title,canonical};
  }catch{return{brand:'',model:'',category:'',title:input,canonical:input}}
}

function classify(input,identity){const t=`${input} ${identity.canonical}`.toLocaleLowerCase('tr-TR');if(/trendyol|hepsiburada|amazon|n11|pttavm|pazarama|ürün|urun|fiyat|model/.test(t))return'product';if(/x\.com|twitter|instagram|tiktok|facebook|youtube/.test(t))return'social';if(/haber|gazete|son dakika|sözcü|hurriyet|milliyet|ntv|cnn|aa\.com/.test(t))return'news';return'general'}
function parsePrice(text=''){const n=text.replace(/\./g,'').replace(/,/g,'.');const m=n.match(/(?:₺\s*)?(\d{2,8}(?:\.\d{1,2})?)\s*(?:TL|₺)/i)||n.match(/₺\s*(\d{2,8}(?:\.\d{1,2})?)/i);return m?Number(m[1]):null}
function isBlocked(h){return BLOCKED_COMPARATORS.some(d=>h===d||h.endsWith(`.${d}`))}
function isDirectRetailer(h){return DIRECT_RETAILERS.some(d=>h===d||h.endsWith(`.${d}`))}
function tokenSet(v=''){return new Set(v.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü-]+/g,' ').split(/\s+/).filter(x=>x.length>1))}
function productMatchScore(item,identity){const hay=`${item.title||''} ${item.snippet||''}`.toLocaleLowerCase('tr-TR');let score=0;if(identity.brand&&hay.includes(identity.brand.toLocaleLowerCase('tr-TR')))score+=4;if(identity.model){const variants=[identity.model,identity.model.replace(/-/g,' '),identity.model.replace(/-/g,'')].map(x=>x.toLocaleLowerCase('tr-TR'));if(variants.some(v=>hay.replace(/\s+/g,' ').includes(v)))score+=8}if(identity.category&&hay.includes(identity.category.toLocaleLowerCase('tr-TR')))score+=2;const wanted=tokenSet(identity.canonical),found=tokenSet(hay);for(const token of wanted)if(found.has(token))score+=.5;return score}
function sanitizeFreeQuery(q=''){return String(q).replace(/["'`()[\]{}]/g,' ').replace(/\b(?:OR|AND|NOT)\b/gi,' ').replace(/(?:site|inurl|intitle|filetype):\S+/gi,' ').replace(/[+*~^]/g,' ').replace(/\s+/g,' ').trim().slice(0,180)}
async function serper(url,body,allowRetry=true){const key=cleanKey();if(!key)throw new Error('SERPER_API_KEY eksik.');const safeBody={...body,q:sanitizeFreeQuery(body.q)};const response=await fetch(url,{method:'POST',headers:{'X-API-KEY':key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(safeBody)});const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{}}catch{}if(!response.ok){const message=String(payload.message||payload.error||raw.slice(0,180));if(response.status===400&&allowRetry&&/query pattern not allowed/i.test(message)){const simpler=safeBody.q.split(/\s+/).filter(Boolean).slice(0,8).join(' ');return serper(url,{...safeBody,q:simpler,num:Math.min(Number(safeBody.num)||10,10)},false)}throw new Error(`Serper ${response.status}: ${message}`)}return payload}
function normalize(item){const link=item.link||item.productLink||'';const hostname=host(link);const text=`${item.title||''} ${item.snippet||''} ${item.price||''}`;return{title:item.title||'',link,source:item.source||hostname,hostname,snippet:item.snippet||'',image:item.imageUrl||item.thumbnailUrl||item.thumbnail||'',price:item.price||'',priceValue:parsePrice(`${item.price||''} ${text}`),rating:item.rating||null,ratingCount:item.ratingCount||item.reviews||null}}
function guessBrand(title=''){return normalizeBrand(String(title).split(/\s+/)[0]||'')}
async function enrichAlternativeImages(alternatives){return Promise.all(alternatives.slice(0,8).map(async item=>{if(item.image)return item;try{const q=sanitizeFreeQuery(item.title).split(/\s+/).slice(0,7).join(' ');const p=await serper(SERPER_IMAGES,{q,gl:'tr',hl:'tr',num:3});const first=(p.images||[]).find(x=>x.imageUrl||x.thumbnailUrl);return{...item,image:first?(first.imageUrl||first.thumbnailUrl):''}}catch{return item}}))}
async function fallbackAlternatives(identity,currentBrand){
  const brands=(CATEGORY_BRANDS[identity.category]||['Raks','Arzum','Fakir','Philips','Xiaomi','Bosch'])
    .filter(b=>normalizeBrand(b)!==currentBrand&&!BLOCKED_ALT_BRANDS.includes(normalizeBrand(b))).slice(0,6);
  const payloads=await Promise.all(brands.map(b=>serper(SERPER_SEARCH,{q:`${b} ${identity.category||'ürün'} satın al`,gl:'tr',hl:'tr',num:6}).catch(()=>({}))));
  const seen=new Set();const out=[];
  for(let i=0;i<payloads.length;i++){
    const items=[...(payloads[i].shopping||[]),...(payloads[i].organic||[])].map(normalize)
      .filter(x=>x.link&&!isBlocked(x.hostname)&&isDirectRetailer(x.hostname));
    const pick=items.find(x=>{const b=guessBrand(x.title);return b&&b!==currentBrand&&!BLOCKED_ALT_BRANDS.includes(b)&&!seen.has(b)});
    if(pick){seen.add(guessBrand(pick.title));out.push(pick)}
  }
  return enrichAlternativeImages(out.slice(0,6));
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Yalnızca POST desteklenir.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});const input=String(body.input||body.url||'').trim();if(!input)return send(res,400,{error:'Bir bağlantı veya arama metni girin.'});
    const identity=productIdentity(input);const type=classify(input,identity);const query=type==='product'?identity.canonical:(isUrl(input)?identity.title:input);
    const productBase=[identity.brand,identity.model,identity.category].filter(Boolean).join(' ').trim();
    const altBase=identity.category||'ürün';
    const searches=type==='product'?[`${productBase} fiyat satın al`,`${productBase} yorum inceleme şikayet`,`${altBase} en iyi modeller alternatif`].map(sanitizeFreeQuery):type==='news'?[query,`${query} resmi açıklama`,`${query} doğru mu`].map(sanitizeFreeQuery):[query,`${query} yorum`,`${query} doğrulama`].map(sanitizeFreeQuery);
    const [pricePayload,reviewPayload,alternativePayload,imagePayload]=await Promise.all([
      serper(SERPER_SEARCH,{q:searches[0],gl:'tr',hl:'tr',num:20}),
      serper(SERPER_SEARCH,{q:searches[1],gl:'tr',hl:'tr',num:12}),
      serper(SERPER_SEARCH,{q:searches[2],gl:'tr',hl:'tr',num:18}),
      type==='product'?serper(SERPER_IMAGES,{q:sanitizeFreeQuery(productBase),gl:'tr',hl:'tr',num:10}):Promise.resolve({images:[]})
    ]);
    const rawPrice=[...(pricePayload.shopping||[]),...(pricePayload.organic||[])].map(normalize).map(item=>({...item,matchScore:productMatchScore(item,identity)}));
    const seenPrices=new Set();
    const prices=rawPrice.filter(item=>{if(!item.link||seenPrices.has(item.link)||isBlocked(item.hostname)||!isDirectRetailer(item.hostname))return false;if(!Number.isFinite(item.priceValue)||item.priceValue<=0)return false;if(identity.model&&item.matchScore<8)return false;if(!identity.model&&item.matchScore<4)return false;seenPrices.add(item.link);return true}).sort((a,b)=>a.priceValue-b.priceValue).slice(0,18);
    const reviews=[...(reviewPayload.organic||[])].map(normalize).map(item=>({...item,matchScore:productMatchScore(item,identity)})).filter(item=>item.link&&!isBlocked(item.hostname)&&(!identity.model||item.matchScore>=6)).filter((item,i,a)=>a.findIndex(o=>o.link===item.link)===i).slice(0,12);
    const currentBrand=normalizeBrand(identity.brand);const seenAltBrands=new Set();
    let alternatives=[...(alternativePayload.shopping||[]),...(alternativePayload.organic||[])].map(normalize)
      .filter(item=>item.link&&!isBlocked(item.hostname)&&isDirectRetailer(item.hostname))
      .filter(item=>{const brand=guessBrand(item.title);if(!brand||brand===currentBrand||BLOCKED_ALT_BRANDS.includes(brand)||seenAltBrands.has(brand))return false;seenAltBrands.add(brand);return true})
      .filter((item,i,a)=>a.findIndex(o=>o.link===item.link)===i).slice(0,8);
    alternatives=await enrichAlternativeImages(alternatives);
    if(alternatives.length<4&&type==='product'){
      const fallback=await fallbackAlternatives(identity,currentBrand);
      for(const item of fallback){const b=guessBrand(item.title);if(!b||seenAltBrands.has(b)||BLOCKED_ALT_BRANDS.includes(b))continue;seenAltBrands.add(b);alternatives.push(item)}
      alternatives=alternatives.slice(0,8);
    }
    const images=(imagePayload.images||[]).map(item=>({image:item.imageUrl||item.thumbnailUrl||'',thumbnail:item.thumbnailUrl||item.imageUrl||'',title:item.title||query,source:item.source||host(item.link||''),link:item.link||''})).filter(item=>item.image).slice(0,10);
    const sources=[...reviews,...alternatives].filter((item,i,a)=>item.link&&a.findIndex(o=>o.link===item.link)===i).slice(0,20);
    const sinboPolicy=isSinbo(identity.brand)?{active:true,level:'high',title:'Satın alma önerilmez',message:'Caynana marka politikası gereği Sinbo ürünlerinde güçlü bir risk uyarısı gösterir. Güncel tüketici şikâyetleri, servis erişimi ve garanti koşulları ayrıntılı incelenmeden satın alma önerisi verilmez.'}:{active:false};
    return send(res,200,{input,query,identity,type,searchedQueries:searches,brandPolicy:sinboPolicy,summary:{resultCount:prices.length+sources.length,pricedCount:prices.length,lowestPrice:prices[0]||null,highestPrice:prices.length?prices[prices.length-1]:null,averagePrice:prices.length?Math.round(prices.reduce((s,x)=>s+x.priceValue,0)/prices.length):null},prices,reviews,alternatives,images,sources,analyzedAt:new Date().toISOString()});
  }catch(error){return send(res,500,{error:error.message||'Araştırma yapılamadı.'})}
};