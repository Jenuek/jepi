// ---------- 👍 여행자 추천 (app/data/recs.ts: loading, counting, saving on the server) ----------
// Here: how a place becomes a saved entry, and how other travelers' places join this trip's place list.
const REC=JD.recs, RS=REC.state;
const SHARED_IDS=new Set();
const cityKey=()=>REC.cityKey(PACK.city||'');
const placeKey=p=>REC.placeKey(PACK.city||'',p.name);
function recHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
const recOf=p=>REC.countOf(placeKey(p));
const iRec=p=>REC.isMine(placeKey(p));
function entryOf(p){const h=p.always?null:p.hours;
  return {k:placeKey(p),city:cityKey(),name:p.name,local:p.local||'',cat:p.cat,area:p.area,lat:+p.ll[0]||0,lng:+p.ll[1]||0,dur:p.dur,
    open:h?`${fmt(h[0])}-${fmt(h[1])}`:null,closed:p.closed||[],cost:costOf(p.id)[0]||0,note:String(p.note||'').slice(0,160),tags:tagsOf(p.id).slice(0,6),made:!!p.custom,at:Date.now()}}
function keepShared(){
  let ch=false;
  placed.forEach(b=>{const p=PM[b.id];if(p&&p.shared&&!PACK.places.some(x=>x.id===p.id)){const c=Object.assign({},p);delete c.shared;c.fromUsers=true;PACK.places.push(c);ch=true}});
  if(ch) savePack();
}
// other travelers' places of this city join the place list (and drop out again when no longer recommended or used)
function rebuildShared(){
  const used=new Set(placed.map(b=>b.id));
  for(const id of [...SHARED_IDS]){if(used.has(id)||PACK.places.some(x=>x.id===id))continue;const i=P.findIndex(p=>p.id===id);if(i>=0)P.splice(i,1);delete PM[id];SHARED_IDS.delete(id)}
  REC.others(PACK.city||'',new Set(P.map(placeKey))).forEach((e,k)=>{const id='s'+recHash(k);if(PM[id])return;
    const pl=cleanPlace({name:e.name,local:e.local,cat:e.cat,lat:e.lat,lng:e.lng,dur:e.dur,open:e.open,closed:e.closed,cost:e.cost,tags:e.tags,note:e.note||(e.made?'다른 여행자가 직접 올린 장소예요.':'다른 여행자가 추천한 장소예요.')});
    if(!pl)return; pl.id=id; pl.shared=true; pl.ai=false; pl.userMade=!!e.made; addPackPlace(pl); SHARED_IDS.add(id)});
}
async function recsFetch(){ if(await REC.fetchCity(PACK.city||'')){rebuildShared();renderTray()} }
// 👍 on a card or in a block's sheet: counts change right away, then once more when the server has answered
async function toggleRec(id){
  const p=PM[id]; if(!p) return;
  if(RS.status!=='on'){REC.toggle(PACK.city||'',entryOf(p));renderTray();return}   // only says "로그인하면 …"
  const pr=REC.toggle(PACK.city||'',entryOf(p)); rebuildShared();
  renderTray(); if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid);
  await pr; renderTray();
}
// a place I made: shared with other travelers or not (its 공유 box)
function shareCustom(c,on){
  if(RS.status!=='on') return;
  const p=PM[c.id]; if(!p) return; const k=placeKey(p);
  const rest=RS.mine.filter(e=>e.k!==k), pr=REC.setMine(PACK.city||'',on?[...rest,entryOf(p)]:rest);
  rebuildShared(); pr.then(renderTray);
}
function initRecs(){ if(!PACK.manual) recsFetch().catch(()=>{}) }

// refresh everyone's 👍 along with the account sync (every minute while open)
SYNC_AFTER_PULL.push(()=>!PACK.manual?recsFetch().catch(()=>{}):null);
// (re)load when the trip's city changes, or every few minutes while browsing the 장소 tab
let recCity=null, recAt=0;
function recsMaybe(){
  if(PACK.manual||!cityKey()) return;
  if(cityKey()===recCity&&Date.now()-recAt<180000) return;
  recCity=cityKey(); recAt=Date.now(); recsFetch().catch(()=>{recCity=null});
}
