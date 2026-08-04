const SEARCH='https://google.serper.dev/search';
const IMAGES='https://google.serper.dev/images';

const BLOCKED=['cimri.com','akakce.com','onual.com','epey.com','enuygun.com','fiyat.com'];
const SHORT=['ty.gl','bit.ly','t.co','tinyurl.com','amzn.to','hb.biz','cutt.ly','rb.gy','is.gd'];
const RETAILERS=[
  'trendyol.com','hepsiburada.com','amazon.com.tr','amazon.com','n11.com','pttavm.com','pazarama.com',
  'teknosa.com','mediamarkt.com.tr','koctas.com.tr','vatanbilgisayar.com','idefix.com','boyner.com.tr',
  'carrefoursa.com','migros.com.tr','decathlon.com.tr','petlebi.com','petburada.com','mamaciteyze.com',
  'jollypet.com','petzzshop.com','petihtiyac.com','bisikletcim.com','bisan.com.tr','salcano.com',
  'volta.com.tr','rksmotor.com.tr','kronbisiklet.com.tr','ugurbisiklet.com','ebikestore.com.tr',
  'carrarobisiklet.com','corelli.com.tr','kubamotor.com','aperider.com.tr'
];

const CATEGORIES=[
  {
    name:'elektrikli bisiklet',
    pattern:/(elektrikli\s*bisiklet|e-?bike|ebike)/i,
    exclude:/(dönüşüm kiti|yedek batarya|akü|şarj cihazı|adaptör|lastik|sele|kask|aksesuar|yedek parça|telefon tutucu|kilit|çanta)/i,
    criteria:['Motor gücü','Menzil','Batarya','Teker ölçüsü','Taşıma kapasitesi'],
    discovery:[
      'elektrikli bisiklet satın al','elektrikli bisiklet modelleri fiyat','şehir tipi elektrikli bisiklet',
      'katlanır elektrikli bisiklet','uzun menzil elektrikli bisiklet','250 w elektrikli bisiklet',
      '500 w elektrikli bisiklet','fat bike elektrikli bisiklet','fiyat performans elektrikli bisiklet',
      'RKS elektrikli bisiklet','Volta elektrikli bisiklet','Bisan elektrikli bisiklet',
      'Salcano elektrikli bisiklet','Kron elektrikli bisiklet','Carraro elektrikli bisiklet',
      'Corelli elektrikli bisiklet','Kuba elektrikli bisiklet','Ape Ryder elektrikli bisiklet',
      'Himo elektrikli bisiklet','Engwe elektrikli bisiklet','Trendyol elektrikli bisiklet',
      'Hepsiburada elektrikli bisiklet','N11 elektrikli bisiklet','Pazarama elektrikli bisiklet'
    ]
  },
  {
    name:'kedi kumu',
    pattern:/(kedi\s*kumu|cat litter)/i,
    exclude:/(mama|tuvalet kabı|kürek|paspas|oyuncak|taşıma çantası|kedi evi|tırmalama)/i,
    criteria:['İçerik türü','Topaklanma','Koku kontrolü','Paket miktarı','Toz oranı'],
    discovery:[
      'kedi kumu satın al','topaklanan kedi kumu fiyat','bentonit kedi kumu fiyat','silika kedi kumu fiyat',
      'doğal kedi kumu fiyat','aktif karbonlu kedi kumu','parfümsüz kedi kumu','10 kg kedi kumu',
      '20 lt kedi kumu','en çok satan kedi kumu','Ever Clean kedi kumu','Proline kedi kumu',
      'Reflex kedi kumu','Catonite kedi kumu','Sanicat kedi kumu','Trendyol kedi kumu',
      'Hepsiburada kedi kumu','Amazon kedi kumu','Petlebi kedi kumu','N11 kedi kumu'
    ]
  },
  {
    name:'vantilatör',
    pattern:/(vantilatör|ayaklı fan|kule fan|masaüstü fan)/i,
    exclude:/(ısıtıcı|klima|ütü|mutfak|şarj standı|yedek parça)/i,
    criteria:['Motor gücü','Kademe','Pervane','Ses seviyesi','Kumanda'],
    discovery:['vantilatör satın al','ayaklı vantilatör fiyat','kule tipi vantilatör','sessiz vantilatör','uzaktan kumandalı vantilatör','Raks vantilatör','Arzum vantilatör','Fakir vantilatör','Philips vantilatör','Trendyol vantilatör','Hepsiburada vantilatör','N11 vantilatör']
  },
  {
    name:'telefon',
    pattern:/(cep telefonu|akıllı telefon|smartphone)/i,
    exclude:/(kılıf|ekran koruyucu|şarj cihazı|kulaklık|yedek parça)/i,
    criteria:['İşlemci','RAM','Depolama','Batarya','Kamera'],
    discovery:['cep telefonu satın al','fiyat performans telefon','kamerası iyi telefon','uzun pil ömürlü telefon','5g telefon fiyat','Samsung telefon','Xiaomi telefon','Apple iPhone','Honor telefon','Oppo telefon','Trendyol telefon','Hepsiburada telefon']
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
function norm(value=''){return String(value).toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]/g,'')}
function clean(query=''){
  return String(query).replace(/["'`()[\]{}+*~^]/g,' ')
    .replace(/\b(?:OR|AND|NOT)\b/gi,' ').replace(/\s+/g,' ').trim().slice(0,180);
}
function isBlocked(h=''){return BLOCKED.some(d=>h===d||h.endsWith('.'+d))}
function isRetailer(h=''){return RETAILERS.some(d=>h===d||h.endsWith('.'+d))}
function categoryOf(text=''){return CATEGORIES.find(c=>c.pattern.test(text))||null}
function parsePrice(text=''){
  const normalized=String(text).replace(/\./g,'').replace(/,/g,'.');
  const match=normalized.match(/(?:₺\s*)?(\d{2,9}(?:\.\d{1,2})?)\s*(?:TL|₺)/i)
    ||normalized.match(/₺\s*(\d{2,9}(?:\.\d{1,2})?)/i);
  return match?Number(match[1]):null;
}
async function serper(url,body,retry=true){
  const key=apiKey();
  if(!key)throw new Error('SERPER_API_KEY eksik.');
  const safe={...body,q:clean(body.q)};
  const response=await fetch(url,{
    method:'POST',
    headers:{'X-API-KEY':key,'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify(safe)
  });
  const raw=await response.text();
  let payload={};
  try{payload=raw?JSON.parse(raw):{}}catch{}
  if(!response.ok){
    const message=String(payload.message||payload.error||raw.slice(0,180));
    if(response.status===400&&retry){
      return serper(url,{...safe,q:safe.q.split(/\s+/).slice(0,7).join(' '),num:10},false);
    }
    throw new Error(`Serper ${response.status}: ${message}`);
  }
  return payload;
}
async function resolveShort(url){
  if(!isUrl(url)||!SHORT.includes(host(url)))return url;
  for(const method of ['HEAD','GET']){
    try{
      const response=await fetch(url,{
        method,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'},
        signal:AbortSignal.timeout(10000)
      });
      if(response.url&&response.url!==url)return response.url;
    }catch{}
  }
  return url;
}
function normalize(item,kind='organic',query=''){
  const link=item.link||item.productLink||'';
  const title=item.title||'';
  const snippet=item.snippet||'';
  return{
    title,link,hostname:host(link),source:item.source||host(link),snippet,
    image:item.imageUrl||item.thumbnailUrl||item.thumbnail||'',
    priceValue:parsePrice(`${item.price||''} ${title} ${snippet}`),
    rating:item.rating||null,ratingCount:item.ratingCount||item.reviews||null,
    kind,query
  };
}
function productPath(link=''){
  try{
    const path=new URL(link).pathname.toLocaleLowerCase('tr-TR');
    return /(?:-p-\d+|\/p\/|\/urun\/|\/product\/|\/dp\/|\/ip\/|\/pd\/)/.test(path)
      ||path.split('/').filter(Boolean).length>=3;
  }catch{return false}
}
function genericTitle(title=''){
  return /(?:ana sayfa|tüm ürünler|kategori|marka mağazası|sayfa\s*\d+|fiyatları ve modelleri|online satış|ürünlerimiz)/i.test(title);
}
function validCandidate(item,category){
  if(!item.title||!item.link||isBlocked(item.hostname))return false;
  const text=`${item.title} ${item.snippet}`;
  if(category?.exclude?.test(text))return false;
  if(genericTitle(item.title))return false;

  // Alışveriş sonuçları kategori sorgusundan geldiği için başlıkta kategori adı yazması şart değildir.
  // Örneğin “RKS RS3 Pro X” gerçek elektrikli bisiklettir ancak başlıkta kategori geçmeyebilir.
  if(item.kind==='shopping')return true;

  // Organik sonuçlarda doğrudan mağaza veya üretici ürünü olmalı.
  if(!isRetailer(item.hostname)||!productPath(item.link))return false;
  if(category?.pattern.test(text))return true;

  // Marka/model sorgusundan gelen doğrudan ürün sayfalarını da kabul et.
  const queryFits=category?.pattern.test(item.query||'');
  const productSignal=/\b[a-zçğıöşü]{1,18}[- ]?\d{2,6}[a-z0-9-]*\b/i.test(item.title)
    ||/\b\d{2,4}\s*(?:w|wh|v|ah|kg|lt|l|inç|inch)\b/i.test(text);
  return Boolean(queryFits&&productSignal);
}
function productKey(item){
  const lower=item.title.toLocaleLowerCase('tr-TR')
    .replace(/\b\d+[.,]?\d*\s*(?:tl|₺)\b/gi,' ')
    .replace(/\b(?:ücretsiz kargo|hızlı teslimat|indirimli|kampanya|peşin fiyatına)\b/gi,' ')
    .split(/[|–—]/)[0];
  const model=lower.match(/\b[a-zçğıöşü]{1,18}[- ]?\d{2,6}[a-z0-9-]*\b/i);
  if(model)return norm(model[0]);
  return norm(lower.split(/\s+/).slice(0,12).join(' '));
}
function extractFacts(text='',category=''){
  const get=(regex,suffix='')=>{const match=text.match(regex);return match?`${match[1]}${suffix}`:''};
  const facts={
    power:get(/\b(\d{2,4})\s*(?:w|watt)\b/i,' W'),
    range:get(/\b(\d{2,3})\s*km\b/i,' km'),
    battery:get(/\b(\d{2,4})\s*(?:wh|ah|v)\b/i),
    weight:get(/\b(\d+(?:[.,]\d+)?)\s*kg\b/i,' kg'),
    volume:get(/\b(\d+(?:[.,]\d+)?)\s*(?:lt|l|litre)\b/i,' L'),
    wheel:get(/\b(\d{2})\s*(?:inç|inch|jant)\b/i,' inç'),
    capacity:get(/\b(\d{2,3})\s*kg\s*(?:taşıma|kapasite)/i,' kg'),
    warranty:get(/\b(\d+)\s*yıl\s*(?:garanti|garantili)\b/i,' yıl')
  };
  if(category==='kedi kumu'){
    facts.type=/bentonit/i.test(text)?'Bentonit':/silika/i.test(text)?'Silika':/doğal|tofu|mısır/i.test(text)?'Doğal':'';
    facts.clumping=/topaklan/i.test(text)?'Topaklanan':'';
    facts.scent=/parfümsüz|kokusuz/i.test(text)?'Parfümsüz':/lavanta|pudra|sabun|aktif karbon/i.test(text)?'Kokulu':'';
  }
  if(category==='elektrikli bisiklet'){
    facts.foldable=/katlanır/i.test(text)?'Katlanır':'';
    facts.fat=/fat bike|kalın teker/i.test(text)?'Kalın teker':'';
  }
  return facts;
}
function metaFor(facts,category){
  if(category==='elektrikli bisiklet')return [facts.power,facts.range,facts.battery,facts.wheel,facts.capacity,facts.foldable,facts.fat].filter(Boolean);
  if(category==='kedi kumu')return [facts.weight,facts.volume,facts.type,facts.clumping,facts.scent].filter(Boolean);
  return [facts.power,facts.weight,facts.volume,facts.warranty].filter(Boolean);
}
function reasonFor(item,category,index){
  const facts=item.facts||extractFacts(`${item.title} ${item.snippet}`,category);
  const reasons=[];
  if(Number.isFinite(item.priceValue))reasons.push(`${Math.round(item.priceValue).toLocaleString('tr-TR')} TL fiyat`);
  if(item.rating)reasons.push(`${item.rating}/5 puan`);
  if(category==='elektrikli bisiklet'){
    if(facts.power)reasons.push(`${facts.power} motor`);
    if(facts.range)reasons.push(`${facts.range} menzil`);
    if(facts.battery)reasons.push('batarya bilgisi');
    if(facts.foldable)reasons.push('katlanır');
    if(facts.fat)reasons.push('kalın teker');
  }
  if(category==='kedi kumu'){
    if(facts.type)reasons.push(`${facts.type} içerik`);
    if(facts.clumping)reasons.push('topaklanan yapı');
    if(facts.weight||facts.volume)reasons.push(`${facts.weight||facts.volume} paket`);
    if(facts.scent)reasons.push(facts.scent.toLocaleLowerCase('tr-TR'));
  }
  if(!reasons.length)reasons.push(index<8?'kategoriyle güçlü eşleşme':'farklı kullanım ihtiyacına alternatif');
  return reasons.slice(0,4).join(' • ');
}
function tokenSet(text=''){
  return new Set(text.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü ]/g,' ').split(/\s+/).filter(x=>x.length>2));
}
async function imagePool(query,category){
  try{
    const payload=await serper(IMAGES,{q:`${query} ürün modelleri`,gl:'tr',hl:'tr',num:20});
    return (payload.images||[]).map(item=>({
      title:item.title||'',tokens:tokenSet(item.title||''),image:item.imageUrl||item.thumbnailUrl||'',source:item.source||''
    })).filter(item=>item.image&&(!category||category.pattern.test(`${item.title} ${item.source}`)));
  }catch{return[]}
}
function matchImage(item,pool){
  if(item.image)return item.image;
  const tokens=tokenSet(item.title);
  let best='',bestScore=0;
  for(const candidate of pool){
    let score=0;
    for(const token of tokens)if(candidate.tokens.has(token))score++;
    if(score>bestScore){bestScore=score;best=candidate.image}
  }
  return bestScore>=2?best:'';
}
async function categorySearch(input,category){
  const queries=(category?.discovery?.length?category.discovery:[
    `${input} satın al`,`${input} fiyat`,`${input} modelleri`,`${input} en iyi`,`${input} fiyat performans`
  ]).slice(0,24);

  const payloads=await Promise.all(queries.map(query=>
    serper(SEARCH,{q:query,gl:'tr',hl:'tr',num:20}).catch(()=>({}))
  ));
  const images=await imagePool(input,category);

  const candidates=[];
  payloads.forEach((payload,index)=>{
    const query=queries[index];
    candidates.push(
      ...(payload.shopping||[]).map(item=>normalize(item,'shopping',query)),
      ...(payload.organic||[]).map(item=>normalize(item,'organic',query))
    );
  });

  const seen=new Set();
  let products=candidates
    .filter(item=>validCandidate(item,category))
    .filter(item=>norm(item.title.split(/\s+/)[0])!=='sinbo')
    .filter(item=>{
      const key=productKey(item);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .map(item=>{
      const facts=extractFacts(`${item.title} ${item.snippet}`,category?.name||'');
      return{
        ...item,facts,meta:metaFor(facts,category?.name||''),image:matchImage(item,images)
      };
    })
    .sort((a,b)=>{
      const aPrice=Number.isFinite(a.priceValue)?1:0;
      const bPrice=Number.isFinite(b.priceValue)?1:0;
      const aImage=a.image?1:0;
      const bImage=b.image?1:0;
      const aRating=Number(a.rating)||0;
      const bRating=Number(b.rating)||0;
      return bPrice-aPrice||bImage-aImage||bRating-aRating;
    })
    .slice(0,60)
    .map((item,index)=>({...item,rank:index+1,why:reasonFor(item,category?.name||'',index)}));

  const reviews=(payloads.at(-1)?.organic||[])
    .map(item=>normalize(item,'organic',queries.at(-1)||input))
    .filter(item=>item.link&&!isBlocked(item.hostname)).slice(0,15);
  const prices=products.filter(item=>Number.isFinite(item.priceValue)).sort((a,b)=>a.priceValue-b.priceValue);
  const stores=new Set(products.map(item=>item.hostname||item.source).filter(Boolean));

  const advice={
    title:products.length>=30?'Geniş ürün havuzu hazırlandı':products.length>=12?'Karşılaştırılabilir seçenekler bulundu':'Sonuçlar hâlâ sınırlı',
    summary:`${products.length} farklı ürün adayı ve ${stores.size} satış kaynağı bulundu. Caynana marka, model, fiyat ve kullanım amacını birlikte karşılaştırdı.`,
    reasons:[
      `${products.length} farklı ürün seçeneği`,`${stores.size} farklı satış kaynağı`,
      ...(category?.criteria||[]).slice(0,3).map(value=>`${value} değerlendirmeye alındı`)
    ],
    cautions:['Fiyat, stok, satıcı puanı ve garanti bilgilerini mağazada son kez doğrula.']
  };

  return{
    mode:'category',input,query:input,
    identity:{brand:'',model:'',category:category?.name||input,title:input,canonical:input},
    type:'product',categoryCriteria:category?.criteria||[],technicalFacts:{},
    reviewSignals:{positive:[],negative:[]},advice,
    summary:{
      resultCount:products.length+reviews.length,pricedCount:prices.length,
      productCount:products.length,storeCount:stores.size,
      lowestPrice:prices[0]||null,highestPrice:prices.at(-1)||null,
      averagePrice:prices.length?Math.round(prices.reduce((sum,item)=>sum+item.priceValue,0)/prices.length):null
    },
    prices:prices.slice(0,40),reviews,alternatives:products,
    images:products.filter(item=>item.image).slice(0,12).map(item=>({
      image:item.image,thumbnail:item.image,title:item.title,source:item.source,link:item.link
    })),
    sources:[...reviews,...products].slice(0,40),analyzedAt:new Date().toISOString()
  };
}
function identityFromText(text){
  const match=text.match(/\b([A-ZÇĞİÖŞÜ]{1,10})[-\s]?(\d{2,6}[A-Z0-9-]*)\b/i);
  const model=match?`${match[1]}-${match[2]}`.toUpperCase():'';
  const category=categoryOf(text);
  const brand=model?text.trim().split(/\s+/)[0]:'';
  return{brand,model,category:category?.name||'',title:text.trim(),canonical:model?[brand,model,category?.name].filter(Boolean).join(' '):text.trim()};
}
function identityFromUrl(url){
  try{
    const parts=new URL(url).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const index=parts.findIndex(value=>/-p-\d+/i.test(value));
    const slug=(index>=0?parts[index]:parts.at(-1)||'').replace(/-p-\d+.*/i,'').replace(/[-_]+/g,' ');
    const brand=index>0?parts[index-1].replace(/[-_]+/g,' '):'';
    const identity=identityFromText(`${brand} ${slug}`);
    return{...identity,title:slug,brand:brand||identity.brand,canonical:[brand||identity.brand,identity.model,identity.category].filter(Boolean).join(' ')||slug};
  }catch{return identityFromText(url)}
}
async function exactSearch(original,resolved,identity){
  const category=categoryOf(identity.canonical);
  const [pricePayload,reviewPayload,alternativePayload,imagePayload]=await Promise.all([
    serper(SEARCH,{q:`${identity.canonical} fiyat satın al`,gl:'tr',hl:'tr',num:20}),
    serper(SEARCH,{q:`${identity.canonical} yorum inceleme şikayet`,gl:'tr',hl:'tr',num:15}),
    serper(SEARCH,{q:`${identity.category||identity.canonical} alternatif ürünler fiyat`,gl:'tr',hl:'tr',num:20}),
    serper(IMAGES,{q:identity.canonical,gl:'tr',hl:'tr',num:10})
  ]);
  const raw=[
    ...(pricePayload.shopping||[]).map(item=>normalize(item,'shopping',identity.canonical)),
    ...(pricePayload.organic||[]).map(item=>normalize(item,'organic',identity.canonical))
  ];
  const prices=raw.filter(item=>validCandidate(item,category)&&Number.isFinite(item.priceValue))
    .sort((a,b)=>a.priceValue-b.priceValue).slice(0,20);
  const reviews=(reviewPayload.organic||[]).map(item=>normalize(item,'organic',identity.canonical))
    .filter(item=>item.link&&!isBlocked(item.hostname)).slice(0,12);
  const alternatives=[
    ...(alternativePayload.shopping||[]).map(item=>normalize(item,'shopping',identity.category||identity.canonical)),
    ...(alternativePayload.organic||[]).map(item=>normalize(item,'organic',identity.category||identity.canonical))
  ].filter(item=>validCandidate(item,category)&&norm(item.title.split(/\s+/)[0])!=='sinbo')
    .slice(0,16).map((item,index)=>{
      const facts=extractFacts(`${item.title} ${item.snippet}`,category?.name||'');
      return{...item,rank:index+1,facts,meta:metaFor(facts,category?.name||''),why:reasonFor({...item,facts},category?.name||'',index)};
    });
  const images=(imagePayload.images||[]).map(item=>({
    image:item.imageUrl||item.thumbnailUrl||'',thumbnail:item.thumbnailUrl||item.imageUrl||'',
    title:item.title||identity.canonical,source:item.source||'',link:item.link||''
  })).filter(item=>item.image).slice(0,10);
  const policy=norm(identity.brand)==='sinbo'?{
    active:true,title:'Satın alma önerilmez',
    message:'Güncel tüketici şikâyetleri, servis erişimi ve garanti koşulları ayrıntılı doğrulanmadan bu marka için olumlu satın alma önerisi verilmez.'
  }:{active:false};
  return{
    mode:'exact',input:original,resolvedInput:resolved!==original?resolved:null,
    query:identity.canonical,identity,type:'product',brandPolicy:policy,
    technicalFacts:extractFacts([identity.title,...reviews.map(item=>`${item.title} ${item.snippet}`)].join(' '),category?.name||''),
    categoryCriteria:category?.criteria||[],reviewSignals:{positive:[],negative:[]},
    advice:{
      title:policy.active?policy.title:(prices.length>=3?'Karşılaştırılabilir':'Temkinli karşılaştır'),
      summary:policy.active?policy.message:(prices[0]?`${prices.length} doğrudan fiyat bulundu. En düşük görülen fiyat ${Math.round(prices[0].priceValue).toLocaleString('tr-TR')} TL.`:'Yeterli fiyat bulunamadı.'),
      reasons:[`${prices.length} fiyat kaynağı`,`${alternatives.length} alternatif`],
      cautions:['Satıcı, garanti ve teslimat koşullarını kontrol et.']
    },
    summary:{
      resultCount:prices.length+reviews.length,pricedCount:prices.length,
      productCount:alternatives.length,storeCount:new Set(prices.map(item=>item.hostname||item.source)).size,
      lowestPrice:prices[0]||null,highestPrice:prices.at(-1)||null,
      averagePrice:prices.length?Math.round(prices.reduce((sum,item)=>sum+item.priceValue,0)/prices.length):null
    },
    prices,reviews,alternatives,images,sources:[...reviews,...alternatives].slice(0,30),analyzedAt:new Date().toISOString()
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
      return send(res,200,hasModel
        ?await exactSearch(original,resolved,identityFromText(resolved))
        :await categorySearch(resolved,category));
    }
    return send(res,200,await exactSearch(original,resolved,identityFromUrl(resolved)));
  }catch(error){
    return send(res,500,{error:error.message||'Araştırma yapılamadı.'});
  }
};