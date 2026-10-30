// ---------- recommendations shared between travelers (artifact db) ----------
// recs/<viewer id> = {items:[entry]} — each viewer writes only their own document; counts are unique viewers per place key.
let rdb=null, myId=null, recDocs=[], myItems=[], recCount=new Map(), recWriting=Promise.resolve(), recState='off', recMsg='';
const SHARED_IDS=new Set();
const cityKey=()=>norm(PACK.city||'');
const placeKey=p=>cityKey()+'|'+norm(p.name);
function recHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
const recOf=p=>recCount.get(placeKey(p))||0;
const iRec=p=>myItems.some(e=>e.k===placeKey(p));
function entryOf(p){const h=p.always?null:p.hours;
  return {k:placeKey(p),city:cityKey(),name:p.name,local:p.local||'',cat:p.cat,area:p.area,lat:+p.ll[0]||0,lng:+p.ll[1]||0,dur:p.dur,
    open:h?`${fmt(h[0])}-${fmt(h[1])}`:null,closed:p.closed||[],cost:costOf(p.id)[0]||0,note:String(p.note||'').slice(0,160),tags:tagsOf(p.id).slice(0,6),made:!!p.custom,at:Date.now()}}
function keepShared(){
  let ch=false;
  placed.forEach(b=>{const p=PM[b.id];if(p&&p.shared&&!PACK.places.some(x=>x.id===p.id)){const c=Object.assign({},p);delete c.shared;c.fromUsers=true;PACK.places.push(c);ch=true}});
  if(ch) savePack();
}
function rebuildShared(){
  recCount=new Map(); const ck=cityKey()+'|';
  recDocs.forEach(d=>{const seen=new Set();(d.items||[]).forEach(e=>{if(!e||typeof e.k!=='string'||seen.has(e.k))return;seen.add(e.k);recCount.set(e.k,(recCount.get(e.k)||0)+1)})});
  // drop previous shared copies that are not in use
  const used=new Set(placed.map(b=>b.id));
  for(const id of [...SHARED_IDS]){if(used.has(id)||PACK.places.some(x=>x.id===id))continue;const i=P.findIndex(p=>p.id===id);if(i>=0)P.splice(i,1);delete PM[id];SHARED_IDS.delete(id)}
  const have=new Set(P.map(placeKey));
  const pick=new Map();
  recDocs.forEach(d=>(d.items||[]).forEach(e=>{if(e&&typeof e.k==='string'&&e.k.startsWith(ck)&&!have.has(e.k)&&!pick.has(e.k))pick.set(e.k,e)}));
  pick.forEach((e,k)=>{const id='s'+recHash(k);if(PM[id])return;
    const pl=cleanPlace({name:e.name,local:e.local,cat:e.cat,lat:e.lat,lng:e.lng,dur:e.dur,open:e.open,closed:e.closed,cost:e.cost,tags:e.tags,note:e.note||(e.made?'다른 여행자가 직접 올린 장소예요.':'다른 여행자가 추천한 장소예요.')});
    if(!pl)return; pl.id=id; pl.shared=true; pl.ai=false; pl.userMade=!!e.made; addPackPlace(pl); SHARED_IDS.add(id)});
}
function recStatusHTML(){
  if(recState==='on'){const n=[...recCount.keys()].filter(k=>k.startsWith(cityKey()+'|')).length;return `👍 여행자 추천 ${n}곳이 이 여행지에 모여 있어요.${recMsg?' '+esc(recMsg):''}`}
  if(recState==='readonly') return recPublic()?`👍 여행자 추천 ${[...recCount.keys()].filter(k=>k.startsWith(cityKey()+'|')).length}곳 · 로그인하면 나도 추천할 수 있어요.${recMsg&&!/로그인/.test(recMsg)?' '+esc(recMsg):''}`:'보기 권한이라 다른 여행자의 추천을 볼 수만 있어요.';
  return '';
}
// Standalone app: the same 👍 live in the server table jepi_recs (one row per person per place, public to read)
const recPublic=()=>!(window.claude&&window.claude.use);
async function recsFetch(){
  if(!SYNC.url||!SYNC.key) return;
  const c=cityKey(); if(!c) return;
  const tk=syncOn()?await sbToken().catch(()=>null):null;
  const r=await fetch(SYNC.url.replace(/\/$/,'')+'/rest/v1/jepi_recs?select=user_id,k,entry&city=eq.'+encodeURIComponent(c)+'&limit=5000',{headers:Object.assign({apikey:SYNC.key},tk?{Authorization:'Bearer '+tk}:{})});
  if(!r.ok) throw aiErr('network','추천을 불러오지 못했어요');
  const rows=await r.json(); const by=new Map();
  rows.forEach(x=>{if(!by.has(x.user_id))by.set(x.user_id,[]);by.get(x.user_id).push(Object.assign({},x.entry,{k:x.k}))});
  recDocs=[...by].map(([uid,items])=>({uid,items}));
  myId=syncOn()?SYNC.sess.user:null; myItems=myId?(by.get(myId)||[]).slice():[];
  recState=myId?'on':'readonly'; rebuildShared(); renderTray();
}
async function writeMine(items){
  if(recPublic()){
    if(!syncOn()){recState='readonly';renderTray();return false}
    const before=new Map(myItems.map(e=>[e.k,e])), after=new Map(items.map(e=>[e.k,e]));
    myItems=items; rebuildMine();
    try{
      const add=[...after].filter(([k])=>!before.has(k)).map(([k,e])=>({user_id:SYNC.sess.user,k,city:cityKey(),entry:e,at:Date.now()}));
      const del=[...before.keys()].filter(k=>!after.has(k));
      if(add.length) await sbTable('jepi_recs','POST','?on_conflict=user_id,k',add,'resolution=merge-duplicates,return=minimal');
      for(const k of del) await sbTable('jepi_recs','DELETE','?k=eq.'+encodeURIComponent(k)+'&user_id=eq.'+SYNC.sess.user,null,'return=minimal');
      recMsg='';return true
    }catch(e){recMsg='저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.';renderTray();return false}
  }
  if(!rdb||!myId) return false;
  myItems=items; rebuildMine();
  const job=recWriting.then(()=>rdb.doc('recs/'+myId).set({items:myItems.slice(-300)}));
  recWriting=job.catch(()=>{});
  try{await job;recMsg='';return true}
  catch(e){recMsg=e&&e.code==='invalid_argument'?'':e&&e.code==='quota_exceeded'?'저장 공간이 가득 찼어요.':'저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.';
    if(e&&e.code==='invalid_argument')recState='readonly'; renderTray(); return false}
}
function rebuildMine(){const i=recDocs.findIndex(d=>d.uid===myId);if(i>=0)recDocs[i]={uid:myId,items:myItems};else recDocs.push({uid:myId,items:myItems});rebuildShared()}
async function toggleRec(id){
  const p=PM[id]; if(!p) return;
  if(recState!=='on'){recMsg=recPublic()?'로그인하면 추천할 수 있어요 (더보기 → 설정).':'';renderTray();return}
  const k=placeKey(p), on=myItems.some(e=>e.k===k);
  const next=on?myItems.filter(e=>e.k!==k):[...myItems,entryOf(p)];
  renderAfter(()=>writeMine(next));
}
async function renderAfter(fn){const pr=fn();renderTray();if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid);await pr;renderTray()}
function shareCustom(c,on){
  if(recState!=='on') return;
  const p=PM[c.id]; if(!p) return; const k=placeKey(p);
  const rest=myItems.filter(e=>e.k!==k);
  writeMine(on?[...rest,entryOf(p)]:rest).then(renderTray);
}
async function initRecs(){
  try{
    if(recPublic()){if(!PACK.manual){await recsFetch()}return}
    const [d,u]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    if(!d||!u) return; const id=await u.id(); if(!id) return;
    rdb=d; myId=id; recState='on';
    const w=await u.can('data.write'); if(w===false) recState='readonly';
    cloudPull();
    rdb.collection('recs').onSnapshot(snap=>{
      recDocs=snap.docs.filter(x=>x.exists).map(x=>({uid:x.id,items:Array.isArray((x.data()||{}).items)?x.data().items:[]}));
      const mine=recDocs.find(x=>x.uid===myId); if(mine) myItems=mine.items.slice();
      rebuildShared(); renderTray();
    },()=>{recState='off';renderTray()});
  }catch(_){recState='off'}
}

// standalone: refresh everyone's 👍 along with the account sync (every minute while open)
SYNC_AFTER_PULL.push(()=>recPublic()&&!PACK.manual?recsFetch().catch(()=>{}):null);
// standalone: (re)load when the trip's city changes, or every few minutes while browsing the 장소 tab
let recCity=null, recAt=0;
function recsMaybe(){
  if(!recPublic()||PACK.manual||!cityKey()) return;
  if(cityKey()===recCity&&Date.now()-recAt<180000) return;
  recCity=cityKey(); recAt=Date.now(); recsFetch().catch(()=>{recCity=null});
}
