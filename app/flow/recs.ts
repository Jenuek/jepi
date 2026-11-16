// 👍 여행자 추천 on the trip's side: how a place becomes a saved entry, other travelers' places of this city joining the
// place list (and dropping out again), 👍 on a card or a sheet, sharing a place I made, and when to load again. Loading,
// counting and saving on the server: app/data/recs.ts. (It used to be src/js/070-shared-recs.js.)
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as REC from '../data/recs';
import { fmt } from '../logic/time';
import { SYNC_AFTER_PULL } from '../ui/extras';
import * as R from './render';

const $ = (s: string) => document.querySelector(s) as any;
const CUR = trip.cur as any, PK = places.state as any, PMx = places.PM as any, P = places.P as any[];
const RS = REC.state as any;

export const SHARED_IDS=new Set<string>();
export const cityKey=()=>REC.cityKey(PK.pack.city||'');
export const placeKey=(p: any)=>REC.placeKey(PK.pack.city||'',p.name);
export function recHash(s?: any){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
export function entryOf(p?: any){const h=p.always?null:p.hours;
  return {k:placeKey(p),city:cityKey(),name:p.name,local:p.local||'',cat:p.cat,area:p.area,lat:+p.ll[0]||0,lng:+p.ll[1]||0,dur:p.dur,
    open:h?`${fmt(h[0])}-${fmt(h[1])}`:null,closed:p.closed||[],cost:places.costOf(p.id)[0]||0,note:String(p.note||'').slice(0,160),tags:places.tagsOf(p.id).slice(0,6),made:!!p.custom,at:Date.now()}}
export function keepShared(){
  let ch=false;
  CUR.placed.forEach((b: any)=>{const p=PMx[b.id];if(p&&p.shared&&!PK.pack.places.some((x: any)=>x.id===p.id)){const c=Object.assign({},p);delete c.shared;c.fromUsers=true;PK.pack.places.push(c);ch=true}});
  if(ch) places.savePack();
}
// other travelers' places of this city join the place list (and drop out again when no longer recommended or used)
export function rebuildShared(){
  const used=new Set(CUR.placed.map((b: any)=>b.id));
  for(const id of [...SHARED_IDS]){if(used.has(id)||PK.pack.places.some((x: any)=>x.id===id))continue;const i=P.findIndex((p: any)=>p.id===id);if(i>=0)P.splice(i,1);delete PMx[id];SHARED_IDS.delete(id)}
  REC.others(PK.pack.city||'',new Set(P.map(placeKey))).forEach((e: any,k: any)=>{const id='s'+recHash(k);if(PMx[id])return;
    const pl=places.cleanPlace({name:e.name,local:e.local,cat:e.cat,lat:e.lat,lng:e.lng,dur:e.dur,open:e.open,closed:e.closed,cost:e.cost,tags:e.tags,note:e.note||(e.made?'다른 여행자가 직접 올린 장소예요.':'다른 여행자가 추천한 장소예요.')});
    if(!pl)return; pl.id=id; pl.shared=true; pl.ai=false; pl.userMade=!!e.made; places.addPackPlace(pl); SHARED_IDS.add(id)});
}
export async function recsFetch(){ if(await REC.fetchCity(PK.pack.city||'')){rebuildShared();R.renderTray()} }
// 👍 on a card or in a block's sheet: counts change right away, then once more when the server has answered
export async function toggleRec(id?: any){
  const p=PMx[id]; if(!p) return;
  if(RS.status!=='on'){REC.toggle(PK.pack.city||'',entryOf(p));R.renderTray();return}   // only says "로그인하면 …"
  const pr=REC.toggle(PK.pack.city||'',entryOf(p)); rebuildShared();
  R.renderTray(); if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)R.openSheet($('#sheet').dataset.uid);
  await pr; R.renderTray();
}
// a place I made: shared with other travelers or not (its 공유 box)
export function shareCustom(c?: any, on?: any){
  if(RS.status!=='on') return;
  const p=PMx[c.id]; if(!p) return; const k=placeKey(p);
  const rest=RS.mine.filter((e: any)=>e.k!==k), pr=REC.setMine(PK.pack.city||'',on?[...rest,entryOf(p)]:rest);
  rebuildShared(); pr.then(R.renderTray);
}
export function initRecs(){ if(!PK.pack.manual) recsFetch().catch(()=>{}) }

// refresh everyone's 👍 along with the account sync (every minute while open)

// (re)load when the trip's city changes, or every few minutes while browsing the 장소 tab
let recCity: string|null=null, recAt=0;
export function recsMaybe(){
  if(PK.pack.manual||!cityKey()) return;
  if(cityKey()===recCity&&Date.now()-recAt<180000) return;
  recCity=cityKey(); recAt=Date.now(); recsFetch().catch(()=>{recCity=null});
}

/** what the old file did when it loaded (it calls this at the same moment, so the order stays) */
export function init(){
SYNC_AFTER_PULL.push(()=>!PK.pack.manual?recsFetch().catch(()=>{}):null);
}
