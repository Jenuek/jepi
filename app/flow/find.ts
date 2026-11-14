// Adding places: the one 장소 찾기 sheet (어디 · 언제 · 넣을 곳 → the AI finds places, each 일정에 넣기 / 장소에만 / 안 함),
// blocks made by hand (직접 만들기, 내 카드), and the same place twice (caught while typing a name, offered to merge in the
// 장소 tab). (It used to be src/js/385-find.js, 040-manual-blocks.js and 388-dedup.js.)
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as check from '../data/check';
import * as storage from '../data/storage';
import * as OPS from '../data/ops';
import { state as RS } from '../data/recs';
import { state as DYs, dayStart } from '../data/days';
import { fmt, parse, durTxt } from '../logic/time';
import { norm, nameSim, samePlace } from '../logic/places';
import { ui } from '../ui/state';
import { setSt } from '../ui/status';
import * as FORMS from '../view/forms';
import { fresh as FRESH, askAI } from './chat';
import { morePlaces } from './destination';
import { shareCustom } from './recs';
import { showToast } from './share';
import * as R from './render';

const $ = (s: string) => document.querySelector(s) as any;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PK = places.state as any, PMx = places.PM as any, P = places.P as any[], AREAS = places.AREAS as any, CATS = places.CATS as any, DY = DYs as any;

let FIND: any={where:'near',area:'',when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null};
function findAreaOfDay(){const it=check.analyze(ui.day).items.find((i: any)=>!i.stay&&i.area);return it?it.area:''}
export function openFind(o?: any){
  FIND=Object.assign({where:'near',area:places.firstArea(),when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null},o||{});
  if(FIND.when==='gap'&&!FIND.gap){const g=check.gapsOf(ui.day)[0];if(g)FIND.gap=g;else FIND.when='any'}
  renderFind(); $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
  if(o&&o.autorun) runFind();
}
// Drawn by React: app/screens/FindSheet.tsx. renderFind = full redraw (boxes and status start fresh, like before);
// findRowsUpdate = only the results change (what was typed and the status line stay).
let findRev=0;
export function renderFind(){findRev++;findMount()}
function findRowsUpdate(){findMount()}
function findMount(){
  const F=FIND, gaps=check.gapsOf(ui.day), gv=(g: any)=>({v:`${g[0]}-${g[1]}`,label:`${fmt(g[0])}–${fmt(g[1])}`});
  mount('find',$('#sheet'),{dayNo:ui.day+1,date:String(DY.days[ui.day].date),city:String(PK.pack.city||''),where:F.where,area:F.area||'',
    areas:Object.entries(AREAS).map(([k,v]: any)=>({k,label:String(v[0])})),when:F.when,gaps:gaps.map(gv),gap:F.gap?gv(F.gap):null,into:F.into,q:F.q||'',busy:!!F.busy,mine:ui.jp==='P',
    rows:F.res.map((r: any)=>{const p=PMx[r.id];if(!p)return null;
      const meta=[p.area,CATS[p.cat]||'',p.hours&&!p.always?`${fmt(p.hours[0])}–${fmt(p.hours[1])}`:''].filter(Boolean).join(' · ');
      return {id:r.id,name:String(p.name),meta,note:p.note?String(p.note):'',c:r.c||'',txt:r.txt||''}}).filter(Boolean),rev:findRev});
}
function findFocus(){
  const F=FIND, parts=[];
  if(F.q) parts.push(F.q);
  if(F.where==='near'){const a=findAreaOfDay();if(a)parts.push(`near ${a} (where the traveler is on Day ${ui.day+1})`)}
  else if(F.where==='area'&&AREAS[F.area]) parts.push(`only in the ${AREAS[F.area][0]} area`);
  if(F.when==='gap'&&F.gap) parts.push(`to visit on ${DY.days[ui.day].iso||'Day '+(ui.day+1)} between ${fmt(F.gap[0])} and ${fmt(F.gap[1])}; must be open then and fit within that time`);
  return parts.join('; ');
}
export async function runFind(){
  if(FIND.busy) return;
  if(!ui.sample){FIND.res=[];renderFind();setSt('findSt','AI가 연결되어 있지 않아요. 더보기 → 설정에서 연결해 주세요.');return}
  // "fill this gap" with no extra wish keeps the original behaviour: AI picks from the places already on the list
  if(FIND.into==='sched'&&FIND.when==='gap'&&!FIND.q&&FIND.where==='near'&&P.some((p: any)=>!CUR.placed.some((b: any)=>b.id===p.id))){R.closeSheet();askAI();return}
  FIND.busy=true; FIND.res=[]; FIND.cursor=FIND.gap?FIND.gap[0]+15:null; renderFind();
  const ctl=new AbortController(); FIND.ctl=ctl;
  const n=await morePlaces(FIND.into==='sched'?5:8,'findSt',findFocus(),ctl.signal).catch(()=>0);
  FIND.busy=false; FIND.res=[...FRESH].map((id: any)=>({id}));
  if($('#findForm')){renderFind(); if(!n) setSt('findSt','새로 찾은 곳이 없어요. 찾는 말을 바꿔 보세요.'); else setSt('findSt',`${n}곳을 찾았어요. 장소 탭 "✨ 방금 찾은 곳"에도 모여 있어요.`)}
  R.renderTray();
}
function findDrop(id?: any){ // 안 함: the place was only just found, so take it off the list again
  const k=PK.pack.places.findIndex((x: any)=>x.id===id); if(k>=0){PK.pack.places.splice(k,1);places.savePack()}
  const i=P.findIndex((x: any)=>x.id===id); if(i>=0)P.splice(i,1); delete PMx[id]; FRESH.delete(id);
}
// 장소 찾기 sheet (FindSheet.tsx tells: a choice chip "key:value" with what is typed, a result "id:sched|list|skip",
// the 동네 / 빈 시간 lists, or 찾기); and "찾기" next to an empty time in the day summary (gap "start-end")
export function findAct(n?: any, v?: any, typed?: any){
  if(n==='chip'){const [k,x]=String(v).split(':');FIND[k]=x;FIND.q=typed!=null?typed||FIND.q:FIND.q;
    if(k==='when'&&x==='gap'&&!FIND.gap)FIND.gap=check.gapsOf(ui.day)[0]||null; renderFind();return}
  if(n==='gap'){const [a,b]=String(v).split('-').map(Number);openFind({when:'gap',gap:[a,b],into:'sched'});return}
  if(n==='area'){FIND.area=v;return}
  if(n==='gapsel'){FIND.gap=String(v).split('-').map(Number);return}
  if(n==='submit'){FIND.q=String(typed||'').trim();runFind();return}
  if(n==='r'){const [id,act]=String(v).split(':'), r=FIND.res.find((x: any)=>x.id===id), p=PMx[id]; if(!r||!p) return;
    if(act==='skip'){findDrop(id);r.c='skip';r.txt='넣지 않았어요'}
    else if(act==='list'){r.c='list';if(ui.jp==='P'){if(!trip.wish.has(id))trip.wish.toggle(id);r.txt='내 카드에 담았어요'}else r.txt='장소 목록에 넣었어요'}
    else if(FIND.when==='gap'&&FIND.gap){
      const st=Math.max(FIND.cursor||FIND.gap[0],FIND.gap[0]), rr=OPS.repair([{op:'add',day:ui.day,id,start:fmt(st),dur:p.dur}]);
      OPS.apply(rr.ops); trip.blocks.saved(); FIND.cursor=parse(rr.ops[0].start)+p.dur+20;
      r.c='sched'; r.txt=`${rr.ops[0].start}에 넣었어요${rr.warns.length?` · 확인할 것 ${rr.warns.length}`:''}`; R.renderAll();
    } else {ui.selected=id;r.c='pick';r.txt='일정표에서 넣을 시간을 탭하세요';R.closeSheet();ui.tab='timeline';R.renderAll();return}
    findRowsUpdate(); R.renderTray(); return}
}
let customLast: any=null;
export function openCustom(editId?: any, startAt?: any, opts?: any){
  const c=editId?CUR.custom.find((x: any)=>x.id===editId):{id:'',name:'',area:places.firstArea(),cat:'walk',dur:60,cost:0,memo:'',drop:false,tags:''}; if(!c) return;
  const st=startAt!=null?startAt:Math.max(dayStart(ui.day),600);
  // drawn by React: app/screens/CustomSheet.tsx (the same props again with dup while a new name is typed: 388-dedup.js)
  customLast={edit:editId||'',dayLabel:`Day ${ui.day+1} (${DY.days[ui.day].date})`,name:c.name||'',area:c.area,cat:c.cat,dur:c.dur,cost:c.cost??'',memo:c.memo||'',tags:c.tags||'',drop:!!c.drop,
    share:RS.status==='on'&&!PK.pack.manual?!!c.share:null,start:fmt(st),areas:FORMS.optsOf(AREAS),cats:Object.entries(CATS),durs:[15,30,45,60,90,120,150,180,240].map((m: any)=>[m,durTxt(m)]),
    currency:String(PK.pack.currency),dup:null,card:!!(opts&&opts.card),rev:R.nextSheetRev()};
  mount('custom',$('#sheet'),customLast);
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false; setTimeout(()=>{const x=$('#cfName');x&&x.focus()},0);
}
export function saveCustomForm(f?: any){
  const editId=f.dataset.edit;
  const c={id:editId||('c'+Date.now().toString(36)),name:$('#cfName').value.trim()||'직접 만든 블록',area:$('#cfArea').value,cat:$('#cfCat').value,dur:+$('#cfDur').value||60,cost:Math.max(0,+$('#cfCost').value||0),memo:$('#cfMemo').value.trim(),tags:$('#cfTags').value.trim(),drop:$('#cfDrop').checked,share:!!($('#cfShare')&&$('#cfShare').checked)};
  trip.customs.put(c); places.addCustom(c);
  const asCard=f.dataset.card==='1';
  if(asCard){if(!trip.wish.has(c.id))trip.wish.toggle(c.id);showToast('내 카드에 담았어요')}
  else if(!editId){const st=parse($('#cfStart').value);trip.blocks.add({id:c.id,day:ui.day,start:Math.max(dayStart(ui.day),Math.min(1410,st??600)),dur:c.dur})}
  {const prev=editId?(CUR.custom.find((x: any)=>x.id===c.id)||{}):{};if(RS.status==='on'&&(c.share||prev.share!==undefined))shareCustom(c,c.share)}
  R.closeSheet(); R.renderAll();
}

export const dupOf=(pl: any)=>P.find((p: any)=>!p.shared&&samePlace(p,pl))||null;

// --- already doubled: suggest merging at the top of the 장소 tab ---
export const dupNoKey=(a: any,b: any)=>[a,b].sort().join('~');
export function dupPairs(){
  const no=new Set<string>(storage.get<string[]>('gp.dupNo',[])||[]), mine=P.filter((p: any)=>!p.shared), out=[];
  for(let i=0;i<mine.length&&out.length<3;i++)for(let j=i+1;j<mine.length;j++){
    const a=mine[i],b=mine[j]; if(samePlace(a,b)&&!no.has(dupNoKey(a.id,b.id))){out.push([a,b]);break}}
  return out;
}
// the "같은 곳 같아요" cards at the top of 장소 (drawn by React: Tray.tsx)
export function dupInfo(){
  const who=(p: any)=>p.custom?'직접 추가':p.by?`${p.by} 추천`:p.ai||FRESH.has(p.id)?'AI가 찾음':'장소 목록';
  return dupPairs().map(([a,b]: any)=>({a:a.id,b:b.id,why:a.custom||b.custom?'이름이 비슷해요':'위치가 가깝고 이름이 비슷해요',aWho:who(a),aName:a.name,bWho:who(b),bName:b.name}));
}
export function mergePlaces(aId?: any, bId?: any){
  let a=PMx[aId], b=PMx[bId]; if(!a||!b) return;
  // keep the one already in the schedule, else the one that is not hand-made
  const inUse=(id: any)=>CUR.placed.some((x: any)=>x.id===id);
  if((inUse(b.id)&&!inUse(a.id))||(a.custom&&!b.custom)){const t=a;a=b;b=t}
  CUR.placed.forEach((x: any)=>{if(x.id===b.id)x.id=a.id});
  if(trip.wish.has(b.id)&&!trip.wish.has(a.id)) trip.wish.toggle(a.id); if(trip.wish.has(b.id)) trip.wish.toggle(b.id);
  if(b.note&&b.note!==a.note&&!/직접 만든 블록이에요/.test(b.note)) a.note=[a.note,b.note].filter(Boolean).join(' · ').slice(0,300);
  if(b.by&&!a.by) a.by=b.by;
  if(b.custom)trip.customs.remove(b.id);
  const k=PK.pack.places.findIndex((x: any)=>x.id===b.id); if(k>=0) PK.pack.places.splice(k,1);
  const ka=PK.pack.places.find((x: any)=>x.id===a.id); if(ka){ka.note=a.note;if(a.by)ka.by=a.by}
  places.savePack();
  const i=P.findIndex((x: any)=>x.id===b.id); if(i>=0) P.splice(i,1); delete PMx[b.id]; FRESH.delete(b.id);
  trip.blocks.saved(); R.renderAll(); showToast(`"${a.name}" 하나로 묶었어요`);
}

// --- while typing a new place's name: show places that are already there ---


/** what the old file did when it loaded (it calls this at the same moment, so the order stays) */
export function init(){
document.addEventListener('click',(e: any)=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.dupuse){ // typing a name in "직접 만들기" found a place that is already there → schedule that one instead
    const p=PMx[t.dataset.dupuse]; if(!p) return; const st=$('#cfStart')?parse($('#cfStart').value):null;
    trip.blocks.add({id:p.id,day:ui.day,start:Math.max(dayStart(ui.day),Math.min(1410,st??600)),dur:p.dur});R.closeSheet();R.renderAll();showToast(`이미 있는 "${p.name}"을(를) 일정에 넣었어요`);return}
});
document.addEventListener('input',(e: any)=>{
  if(e.target.id!=='cfName'||$('#customForm')?.dataset.edit) return;
  if(!customLast||!$('#customForm')) return;
  const q=e.target.value.trim();
  const hits=q.length<2?[]:P.filter((p: any)=>!p.drop&&(nameSim(p.name,q)>=.5||norm(p.name).includes(norm(q)))).slice(0,4);
  customLast=Object.assign({},customLast,{dup:hits.map((p: any)=>({id:String(p.id),name:String(p.name),sub:`${p.area||''}${p.shared?' · 여행자 추천':''}${CUR.placed.some((x: any)=>x.id===p.id)?' · 이미 일정에 있어요':''}`}))});
  mount('custom',$('#sheet'),customLast);   // same rev: what is typed stays
});
}
