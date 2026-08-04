const SERPER_SEARCH='https://google.serper.dev/search';
const SERPER_IMAGES='https://google.serper.dev/images';

const RETAILERS=[
  'trendyol.com','hepsiburada.com','amazon.com.tr','amazon.com','n11.com','pttavm.com','pazarama.com',
  'teknosa.com','mediamarkt.com.tr','koctas.com.tr','vatanbilgisayar.com','idefix.com','boyner.com.tr',
  'carrefoursa.com','migros.com.tr','petlebi.com','petburada.com','mamaciteyze.com','jollypet.com',
  'petzzshop.com','petihtiyac.com','bisikletcim.com','decathlon.com.tr','bisan.com.tr','salcano.com',
  'volta.com.tr','rksmotor.com.tr','kronbisiklet.com.tr','ugurbisiklet.com','ebikestore.com.tr'
];
const SHORT=['ty.gl','bit.ly','t.co','tinyurl.com','amzn.to','hb.biz','cutt.ly','rb.gy','is.gd'];
const BLOCKED=['cimri.com','akakce.com','onual.com','epey.com','enuygun.com'];

const CATEGORIES=[
  {
    name:'kedi kumu',
    pattern:/(?:kedi\s*kumu|cat litter)/i,
    variants:[
      'topaklanan kedi kumu','bentonit kedi kumu','silika kedi kumu','doğal kedi kumu',
      'aktif karbonlu kedi kumu','parfümsüz kedi kumu','ince taneli kedi kumu','kalın taneli kedi kumu'
    ],
    criteria:['Topaklanma','Koku kontrolü','Toz oranı','Paket ağırlığı','İçerik türü'],
    exclude:/(?:mama|tuvalet kabı|kürek|paspas|oyuncak|taşıma çantası)/i
  },
  {
    name:'elektrikli bisiklet',
    pattern:/(?:elektrikli\s*bisiklet|e-?bike|ebike)/i,
    variants:[
      'şehir tipi elektrikli bisiklet','katlanır elektrikli bisiklet','uzun menzil elektrikli bisiklet',
      'yüksek taşıma kapasiteli elektrikli bisiklet','250 w elektrikli bisiklet','500 w elektrikli bisiklet',
      'kalın teker elektrikli bisiklet','fiyat performans elektrikli bisiklet'
    ],
    criteria:['Motor gücü','Menzil','Batarya','Teker ölçüsü','Taşıma kapasitesi'],
    exclude:/(?:dönüşüm kiti|batarya|şarj cihazı|lastik|sele|kask|aksesuar|yedek parça)/i
  },
  {
    name:'vantilatör',
    pattern:/(?:vantilatör|ayaklı fan|kule fan|masaüstü fan)/i,
    variants:['ayaklı vantilatör','kule tipi vantilatör','sessiz vantilatör','uzaktan kumandalı vantilatör'],
    criteria:['Motor gücü','Kademe','Pervane','Ses seviyesi','Kumanda'],
    exclude:/(?:ısıtıcı|klima|şarj|ütü|mutfak)/i
  },
  {
    name:'telefon',
    pattern:/(?:cep telefonu|akıllı telefon|smartphone)/i,
    variants:['fiyat performans telefon','kamerası iyi telefon','uzun pil ömürlü telefon','5g telefon'],
    criteria:['İşlemci','RAM','Depolama','Batarya','Kamera'],
    exclude:/(?:kılıf|ekran koruyucu|şarj cihazı|kulaklık)/i
  },
  {
    name:'süpürge',
    pattern:/(?:süpürge|vacuum)/i,
    variants:['dikey süpürge','robot süpürge','toz torbasız süpürge','ıslak kuru süpürge'],
    criteria:['Emiş gücü','Filtre','Hazne','Çalışma süresi','Servis'],
    exclude:/(?:yedek parça|filtre|başlık|torba)/i
  },
  {
    name:'kahve makinesi',
    pattern:/(?:kahve makinesi|espresso makinesi)/i,
    variants:['türk kahvesi makinesi','espresso makinesi','tam otomatik kahve makinesi','filtre kahve makinesi'],
    criteria:['Basınç','Hazne','İçecek çeşidi','Temizlik','Garanti'],
    exclude:/(?:kahve çekirdeği|kapsül|filtre kağıdı|yedek parça)/i
  },
  {
    name:'airfryer',
    pattern:/(?:airfryer|air fryer|yağsız fritöz)/i,
    variants:['airfryer','çift hazneli airfryer','büyük hacimli airfryer','cam hazneli airfryer'],
    criteria:['Hacim','Güç','Program','Temizlik','Garanti'],
    exclude:/(?:kağıt|aksesuar|ızgara teli|yedek parça)/i
  }
];

function send(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(body));
}
function apiKey(){return String(process.env.SERPER_API_KEY||'').trim().replace(/^["']|["']$/g,'')}
function host(url=''){try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}}
function isUrl(value=''){try{return /^https?:$/.test(new URL(value).protocol)}catch{return false}}
function clean(query=''){
  return String(query).replace(/["'`()[\]{}+*~^]/g,' ')
    .replace(/\b(?:OR|AND|NOT)\b/gi,' ').replace(/\s+/g,' ').trim().slice(0,180);
}
function norm(value=''){return String(value).toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]/g,'')}
function isBlocked(h){return BLOCKED.some(d=>h===d||h.endsWith('.'+d))}
function isRetailer(h){return RETAILERS.some(d=>h===d||h.endsWith('.'+d))}
function parsePrice(text=''){
  const normalized=text.replace(/\./g,'').replace(/,/g,'.');
  const match=normalized.match(/(?:₺\s*)?(\d{2,9}(?:\.\d{1,2})?)\s*(?:TL|₺)/i)
    ||normalized.match(/₺\s*(\d{2,9}(?:\.\d{1,2})?)/i);
  return match?Number(match[1]):null;
}
async function serper(url,body){
  const key=apiKey();
  if(!key)throw new Error('SERPER_API_KEY eksik.');
  const response=await fetch(url,{
    method:'POST',
    headers:{'X-API-KEY':key,'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({...body,q:clean(body.q)})
  });
  const raw=await response.text();
  let payload={};
  try{payload=raw?JSON.parse(raw):{}}catch{}
  if(!response.ok)throw new Error(`Serper ${response.status}: ${payload.message||payload.error||raw.slice(0,160)}`);
  return payload;
}
async function resolveShort(url){
  if(!isUrl(url)||!SHORT.includes(host(url)))return url;
  const headers={'User-Agent':'Mozilla/5.0 (compatible; CaynanaBot/1.0)','Accept':'text/html'};
  for(const method of ['HEAD','GET']){
    try{
      const response=await fetch(url,{method,redirect:'follow',headers,signal:AbortSignal.timeout(10000)});
      if(response.url&&response.url!==url)return response.url;
    }catch{}
  }
  return url;
}
function normalize(item){
  const link=item.link||item.productLink||'';
  const title=item.title||'';
  const snippet=item.snippet||'';
  return{
    title,link,hostname:host(link),source:item.source||host(link),snippet,
    image:item.imageUrl||item.thumbnailUrl||item.thumbnail||'',
    priceValue:parsePrice(`${item.price||''} ${title} ${snippet}`),
    rating:item.rating||null,ratingCount:item.ratingCount||item.reviews||null
  };
}
function categoryOf(text){return CATEGORIES.find(c=>c.pattern.test(text))||null}
function productPath(link=''){
  try{
    const path=new URL(link).pathname.toLocaleLowerCase('tr-TR');
    return /(?:-p-\d+|\/p\/|\/urun\/|\/product\/|\/dp\/|\/ip\/|\/pd\/)/.test(path)
      ||path.split('/').filter(Boolean).length>=3;
  }catch{return false}
}
function isProduct(item,category){
  if(!item.link||isBlocked(item.hostname)||!isRetailer(item.hostname)||!productPath(item.link))return false;
  const text=`${item.title} ${item.snippet}`;
  if(category&&!category.pattern.test(text))return false;
  if(category?.exclude?.test(text))return false;
  if(/(?:ana sayfa|tüm ürünler|fiyatları ve modelleri|kategori|marka mağazası|sayfa \d+)/i.test(item.title))return false;
  return true;
}
function productKey(item){
  return norm(item.title
    .replace(/\b\d+[.,]?\d*\s*(?:tl|₺)\b/gi,'')
    .replace(/\b(?:ücretsiz kargo|hızlı teslimat|indirimli)\b/gi,'')
    .split(/[|–—]/)[0].slice(0,100));
}
function extractFacts(text='',categoryName=''){
  const get=(regex,suffix='')=>{const m=text.match(regex);return m?`${m[1]}${suffix}`:''};
  const common={
    power:get(/\b(\d{2,4})\s*(?:w|watt)\b/i,' W'),
    range:get(/\b(\d{2,3})\s*km\b/i,' km'),
    battery:get(/\b(\d{2,4})\s*(?:wh|ah|v)\b/i),
    weight:get(/\b(\d+(?:[.,]\d+)?)\s*kg\b/i,' kg'),
    volume:get(/\b(\d+(?:[.,]\d+)?)\s*(?:lt|l|litre)\b/i,' L'),
    wheel:get(/\b(\d{2})\s*(?:inç|inch|jant)\b/i,' inç'),
    capacity:get(/\b(\d{2,3})\s*kg\s*(?:taşıma|kapasite)/i,' kg'),
    warranty:get(/\b(\d+)\s*yıl\s*(?:garanti|garantili)\b/i,' yıl'),
    rating:(text.match(/([1-5](?:[.,]\d)?)\s*(?:\/5|puan|yıldız)/i)||[])[1]||''
  };
  if(categoryName==='kedi kumu'){
    common.type=/bentonit/i.test(text)?'Bentonit':/silika/i.test(text)?'Silika':/doğal|tofu|mısır/i.test(text)?'Doğal':'';
    common.clumping=/topaklan/i.test(text)?'Topaklanan':'';
    common.scent=/parfümsüz|kokusuz/i.test(text)?'Parfümsüz':/lavanta|bebek pudrası|sabun|aktif karbon/i.test(text)?'Kokulu':'';
  }
  if(categoryName==='elektrikli bisiklet'){
    common.foldable=/katlanır/i.test(text)?'Katlanır':'';
    common.fatTire=/fat bike|kalın teker/i.test(text)?'Kalın teker':'';
  }
  return common;
}
function metaFor(facts,categoryName){
  if(categoryName==='elektrikli bisiklet')return [facts.power,facts.range,facts.battery,facts.wheel,facts.capacity,facts.foldable].filter(Boolean);
  if(categoryName==='kedi kumu')return [facts.weight,facts.volume,facts.type,facts.clumping,facts.scent].filter(Boolean);
  return [facts.power,facts.volume,facts.weight,facts.warranty].filter(Boolean);
}
function whyFor(item,category,index){
  const facts=extractFacts(`${item.title} ${item.snippet}`,category?.name||'');
  const reasons=[];
  if(item.priceValue)reasons.push(`${Math.round(item.priceValue).toLocaleString('tr-TR')} TL fiyat sinyali`);
  if(item.rating)reasons.push(`${item.rating}/5 puan`);
  if(category?.name==='elektrikli bisiklet'){
    if(facts.range)reasons.push(`${facts.range} menzil`);
    if(facts.power)reasons.push(`${facts.power} motor`);
    if(facts.battery)reasons.push('batarya bilgisi mevcut');
    if(facts.foldable)reasons.push('katlanır kullanım');
  }else if(category?.name==='kedi kumu'){
    if(facts.clumping)reasons.push('topaklanan yapı');
    if(facts.type)reasons.push(`${facts.type} içerik`);
    if(facts.weight||facts.volume)reasons.push(`${facts.weight||facts.volume} paket`);
    if(facts.scent)reasons.push(facts.scent.toLocaleLowerCase('tr-TR'));
  }
  if(!reasons.length)reasons.push(index<5?'kategoriyle güçlü eşleşme':'farklı ihtiyaca alternatif');
  return reasons.slice(0,4).join(' • ');
}
async function findImage(item,category){
  if(item.image)return item.image;
  try{
    const payload=await serper(SERPER_IMAGES,{q:`${item.title} ${category?.name||''}`,gl:'tr',hl:'tr',num:4});
    const found=(payload.images||[]).find(x=>!category||category.pattern.test(`${x.title||''} ${x.source||''}`))
      ||(payload.images||[])[0];
    return found?.imageUrl||found?.thumbnailUrl||'';
  }catch{return''}
}
async function enrichProducts(products,category){
  const imageLimit=12;
  return Promise.all(products.map(async(item,index)=>{
    const facts=extractFacts(`${item.title} ${item.snippet}`,category?.name||'');
    return{
      ...item,
      image:index<imageLimit?await findImage(item,category):item.image||'',
      facts,
      meta:metaFor(facts,category?.name||''),
      why:whyFor(item,category,index),
      rank:index+1
    };
  }));
}
function identityFromText(text){
  const modelMatch=text.match(/\b([A-ZÇĞİÖŞÜ]{1,10})[-\s]?(\d{2,6}[A-Z0-9-]*)\b/i);
  const model=modelMatch?`${modelMatch[1]}-${modelMatch[2]}`.toUpperCase():'';
  const category=categoryOf(text);
  const brand=model?text.trim().split(/\s+/)[0]:'';
  return{brand,model,category:category?.name||'',title:text.trim(),canonical:model?[brand,model,category?.name].filter(Boolean).join(' '):text.trim()};
}
function identityFromUrl(url){
  try{
    const parts=new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const index=parts.findIndex(x=>/-p-\d+/i.test(x));
    const slug=(index>=0?parts[index]:parts.at(-1)||'').replace(/-p-\d+.*/i,'').replace(/[-_]+/g,' ');
    const brand=index>0?parts[index-1].replace(/[-_]+/g,' '):'';
    const modelMatch=slug.match(/\b([A-ZÇĞİÖŞÜ]{1,10})[-\s]?(\d{2,6}[A-Z0-9-]*)\b/i);
    const model=modelMatch?`${modelMatch[1]}-${modelMatch[2]}`.toUpperCase():'';
    const category=categoryOf(slug);
    return{brand,model,category:category?.name||'',title:slug,canonical:[brand,model,category?.name].filter(Boolean).join(' ')||slug};
  }catch{return{brand:'',model:'',category:'',title:url,canonical:url}}
}
async function categorySearch(input,category){
  const variants=category?.variants||[
    `${input} en iyi`,`${input} fiyat performans`,`${input} ucuz`,
    `${input} kaliteli`,`${input} kullanıcı yorumları`,`${input} kampanya`
  ];
  const queries=[
    `${input} satın al fiyat`,
    ...variants.map(v=>`${v} satın al fiyat`),
    `${input} yorum inceleme`,
    `${input} kullanıcı deneyimi`
  ].slice(0,10);

  const payloads=await Promise.all(queries.map(q=>
    serper(SERPER_SEARCH,{q,gl:'tr',hl:'tr',num:20}).catch(()=>({}))
  ));

  let candidates=[];
  for(const payload of payloads){
    candidates.push(...(payload.shopping||[]).map(normalize));
    candidates.push(...(payload.organic||[]).map(normalize));
  }

  const seen=new Set();
  let products=candidates
    .filter(item=>isProduct(item,category))
    .filter(item=>norm(item.title.split(/\s+/)[0])!=='sinbo')
    .filter(item=>{
      const key=productKey(item);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .sort((a,b)=>{
      const aPrice=Number.isFinite(a.priceValue)?1:0;
      const bPrice=Number.isFinite(b.priceValue)?1:0;
      const aRating=Number(a.rating)||0;
      const bRating=Number(b.rating)||0;
      return bPrice-aPrice||bRating-aRating;
    })
    .slice(0,30);

  products=await enrichProducts(products,category);

  const reviewPayload=payloads.at(-2)||{};
  const reviews=(reviewPayload.organic||[]).map(normalize)
    .filter(item=>item.link&&!isBlocked(item.hostname)).slice(0,15);
  const prices=products.filter(item=>Number.isFinite(item.priceValue)).sort((a,b)=>a.priceValue-b.priceValue);
  const retailerCount=new Set(products.map(item=>item.hostname).filter(Boolean)).size;
  const foundCount=products.length;

  const advice={
    title:foundCount>=20?'Geniş seçenek havuzu hazırlandı':foundCount>=8?'Karşılaştırılabilir seçenekler bulundu':'Seçenekler hâlâ sınırlı',
    summary:`${foundCount} farklı ürün ve ${retailerCount} doğrudan satış sitesi bulundu. Caynana tek ürünü öne itmek yerine fiyat, özellik ve kullanım amacına göre seçenekleri sıraladı.`,
    reasons:[
      `${foundCount} farklı ürün adayı listelendi`,
      `${retailerCount} farklı satış sitesi tarandı`,
      category?.name==='elektrikli bisiklet'
        ?'Motor, menzil, batarya, teker ve taşıma kapasitesi sinyalleri ayrıştırıldı'
        :category?.name==='kedi kumu'
          ?'İçerik, topaklanma, koku kontrolü ve paket boyutu sinyalleri ayrıştırıldı'
          :'Kategoriye uygun teknik ve fiyat sinyalleri karşılaştırıldı'
    ],
    cautions:['Satıcı puanı, garanti, teslimat ve iade koşullarını ürün sayfasında son kez kontrol et.']
  };

  return{
    mode:'category',
    input,query:input,
    identity:{brand:'',model:'',category:category?.name||input,title:input,canonical:input},
    categoryProfile:{name:category?.name||input,criteria:category?.criteria||['Fiyat','Kalite','Yorum','Teslimat','Garanti']},
    type:'product',
    technicalFacts:{},
    reviewSignals:{positive:[],negative:[]},
    advice,
    summary:{
      resultCount:foundCount+reviews.length,
      productCount:foundCount,
      retailerCount,
      pricedCount:prices.length,
      lowestPrice:prices[0]||null,
      highestPrice:prices.at(-1)||null,
      averagePrice:prices.length?Math.round(prices.reduce((sum,item)=>sum+item.priceValue,0)/prices.length):null
    },
    prices:prices.slice(0,30),
    reviews,
    alternatives:products,
    images:products.filter(item=>item.image).map(item=>({image:item.image,thumbnail:item.image,title:item.title,source:item.source,link:item.link})).slice(0,10),
    sources:[...reviews,...products].slice(0,30),
    analyzedAt:new Date().toISOString()
  };
}
async function exactSearch(original,resolved,identity){
  const base=identity.canonical;
  const category=categoryOf(base);
  const [pricePayload,reviewPayload,alternativePayload,imagePayload]=await Promise.all([
    serper(SERPER_SEARCH,{q:`${base} fiyat satın al`,gl:'tr',hl:'tr',num:20}),
    serper(SERPER_SEARCH,{q:`${base} yorum inceleme şikayet`,gl:'tr',hl:'tr',num:15}),
    serper(SERPER_SEARCH,{q:`${identity.category||base} alternatif modeller fiyat`,gl:'tr',hl:'tr',num:20}),
    serper(SERPER_IMAGES,{q:base,gl:'tr',hl:'tr',num:10})
  ]);
  const prices=[...(pricePayload.shopping||[]),...(pricePayload.organic||[])]
    .map(normalize).filter(item=>isProduct(item,category)&&Number.isFinite(item.priceValue))
    .sort((a,b)=>a.priceValue-b.priceValue).slice(0,18);
  const reviews=(reviewPayload.organic||[]).map(normalize)
    .filter(item=>item.link&&!isBlocked(item.hostname)).slice(0,12);
  let alternatives=[...(alternativePayload.shopping||[]),...(alternativePayload.organic||[])]
    .map(normalize).filter(item=>isProduct(item,category)&&norm(item.title.split(/\s+/)[0])!=='sinbo').slice(0,12);
  alternatives=await enrichProducts(alternatives,category);
  const images=(imagePayload.images||[]).map(item=>({
    image:item.imageUrl||item.thumbnailUrl||'',thumbnail:item.thumbnailUrl||item.imageUrl||'',
    title:item.title||base,source:item.source||'',link:item.link||''
  })).filter(item=>item.image).slice(0,10);
  const policy=norm(identity.brand)==='sinbo'
    ?{active:true,title:'Satın alma önerilmez',message:'Güncel tüketici şikâyetleri, servis ve garanti koşulları ayrıntılı doğrulanmadan bu marka için olumlu satın alma önerisi verilmez.'}
    :{active:false};
  const technicalFacts=extractFacts([identity.title,...reviews.map(x=>`${x.title} ${x.snippet}`)].join(' '),category?.name||'');
  return{
    mode:'exact',input:original,resolvedInput:resolved!==original?resolved:null,query:base,identity,type:'product',
    categoryProfile:{name:category?.name||identity.category||'',criteria:category?.criteria||[]},
    brandPolicy:policy,technicalFacts,reviewSignals:{positive:[],negative:[]},
    advice:{
      title:policy.active?policy.title:(prices.length>=3?'Karşılaştırılabilir':'Temkinli karşılaştır'),
      summary:policy.active?policy.message:(prices[0]?`${prices.length} doğrudan mağaza fiyatı bulundu. En düşük görülen fiyat ${Math.round(prices[0].priceValue).toLocaleString('tr-TR')} TL.`:'Yeterli doğrudan mağaza fiyatı bulunamadı.'),
      reasons:[`${prices.length} fiyat kaynağı`,`${alternatives.length} alternatif ürün`],
      cautions:['Satıcı, garanti ve teslimat koşullarını kontrol et.']
    },
    summary:{
      resultCount:prices.length+reviews.length,productCount:alternatives.length,
      retailerCount:new Set(prices.map(x=>x.hostname)).size,pricedCount:prices.length,
      lowestPrice:prices[0]||null,highestPrice:prices.at(-1)||null,
      averagePrice:prices.length?Math.round(prices.reduce((sum,item)=>sum+item.priceValue,0)/prices.length):null
    },
    prices,reviews,alternatives,images,sources:[...reviews,...alternatives].slice(0,25),analyzedAt:new Date().toISOString()
  };
}
module.exports=async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Yalnızca POST desteklenir.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):(req.body||{});
    const original=String(body.input||body.url||'').trim();
    if(!original)return send(res,400,{error:'Bir bağlantı veya ürün adı girin.'});
    const resolved=await resolveShort(original);
    if(isUrl(original)&&SHORT.includes(host(original))&&resolved===original){
      return send(res,422,{error:'Kısa bağlantının hedefi açılamadı.'});
    }
    if(!isUrl(resolved)){
      const category=categoryOf(resolved);
      const hasModel=/\b[A-ZÇĞİÖŞÜ]{1,10}[-\s]?\d{2,6}/i.test(resolved);
      if(!hasModel)return send(res,200,await categorySearch(resolved,category));
      return send(res,200,await exactSearch(original,resolved,identityFromText(resolved)));
    }
    return send(res,200,await exactSearch(original,resolved,identityFromUrl(resolved)));
  }catch(error){
    return send(res,500,{error:error.message||'Araştırma yapılamadı.'});
  }
};