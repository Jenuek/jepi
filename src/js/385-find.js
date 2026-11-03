// ---------- one place-finding screen, many doors ----------
// Every "find places" button opens this same sheet with its conditions already picked:
//   어디 (near today's plan / one area / whole city) · 언제 (a free gap / any time) · 넣을 곳 (schedule / list only)
// Results always come back with the same three choices as chat: 일정에 넣기 / 장소에만 / 안 함.
// Chat and 🎲 DICE keep their own way of asking; only how results are kept is shared.
let FIND={where:'near',area:'',when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null};
function findAreaOfDay(){const it=analyze(day).items.find(i=>!i.stay&&i.area);return it?it.area:''}
function openFind(o){
  FIND=Object.assign({where:'near',area:firstArea(),when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null},o||{});
  if(FIND.when==='gap'&&!FIND.gap){const g=gapsOf(day)[0];if(g)FIND.gap=g;else FIND.when='any'}
  renderFind(); $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
  if(o&&o.autorun) runFind();
}
// Drawn by React: app/screens/FindSheet.tsx. renderFind = full redraw (boxes and status start fresh, like before);
// findRowsUpdate = only the results change (what was typed and the status line stay).
let findRev=0;
function renderFind(){findRev++;findMount()}
function findRowsUpdate(){findMount()}
function findMount(){
  const F=FIND, gaps=gapsOf(day), gv=g=>({v:`${g[0]}-${g[1]}`,label:`${fmt(g[0])}–${fmt(g[1])}`});
  window.JEPI_UI.mount('find',$('#sheet'),{dayNo:day+1,date:String(DAYS[day].date),city:String(PACK.city||''),where:F.where,area:F.area||'',
    areas:Object.entries(AREAS).map(([k,v])=>({k,label:String(v[0])})),when:F.when,gaps:gaps.map(gv),gap:F.gap?gv(F.gap):null,into:F.into,q:F.q||'',busy:!!F.busy,
    rows:F.res.map(r=>{const p=PM[r.id];if(!p)return null;
      const meta=[p.area,CATS[p.cat]||'',p.hours&&!p.always?`${fmt(p.hours[0])}–${fmt(p.hours[1])}`:''].filter(Boolean).join(' · ');
      return {id:r.id,name:String(p.name),meta,note:p.note?String(p.note):'',c:r.c||'',txt:r.txt||''}}).filter(Boolean),rev:findRev});
}
function findFocus(){
  const F=FIND, parts=[];
  if(F.q) parts.push(F.q);
  if(F.where==='near'){const a=findAreaOfDay();if(a)parts.push(`near ${a} (where the traveler is on Day ${day+1})`)}
  else if(F.where==='area'&&AREAS[F.area]) parts.push(`only in the ${AREAS[F.area][0]} area`);
  if(F.when==='gap'&&F.gap) parts.push(`to visit on ${DAYS[day].iso||'Day '+(day+1)} between ${fmt(F.gap[0])} and ${fmt(F.gap[1])}; must be open then and fit within that time`);
  return parts.join('; ');
}
async function runFind(){
  if(FIND.busy) return;
  if(!sample){FIND.res=[];renderFind();setSt('findSt','AI가 연결되어 있지 않아요. 더보기 → 설정에서 연결해 주세요.');return}
  // "fill this gap" with no extra wish keeps the original behaviour: AI picks from the places already on the list
  if(FIND.into==='sched'&&FIND.when==='gap'&&!FIND.q&&FIND.where==='near'&&P.some(p=>!placed.some(b=>b.id===p.id))){closeSheet();askAI();return}
  FIND.busy=true; FIND.res=[]; FIND.cursor=FIND.gap?FIND.gap[0]+15:null; renderFind();
  const ctl=new AbortController(); FIND.ctl=ctl;
  const n=await morePlaces(FIND.into==='sched'?5:8,'findSt',findFocus(),ctl.signal).catch(()=>0);
  FIND.busy=false; FIND.res=[...FRESH].map(id=>({id}));
  if($('#findForm')){renderFind(); if(!n) setSt('findSt','새로 찾은 곳이 없어요. 찾는 말을 바꿔 보세요.'); else setSt('findSt',`${n}곳을 찾았어요. 장소 탭 "✨ 방금 찾은 곳"에도 모여 있어요.`)}
  renderTray();
}
function findDrop(id){ // 안 함: the place was only just found, so take it off the list again
  const k=PACK.places.findIndex(x=>x.id===id); if(k>=0){PACK.places.splice(k,1);savePack()}
  const i=P.findIndex(x=>x.id===id); if(i>=0)P.splice(i,1); delete PM[id]; FRESH.delete(id);
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.find){const [k,v]=t.dataset.find.split(':');FIND[k]=v;FIND.q=($('#findQ')||{}).value||FIND.q;
    if(k==='when'&&v==='gap'&&!FIND.gap)FIND.gap=gapsOf(day)[0]||null; renderFind();return}
  if(t.dataset.findgap){const [a,b]=t.dataset.findgap.split('-').map(Number);openFind({when:'gap',gap:[a,b],into:'sched'});return}
  if(t.dataset.findr){const [id,act]=t.dataset.findr.split(':'), r=FIND.res.find(x=>x.id===id), p=PM[id]; if(!r||!p) return;
    if(act==='skip'){findDrop(id);r.c='skip';r.txt='넣지 않았어요'}
    else if(act==='list'){r.c='list';r.txt='장소 목록에 넣었어요'}
    else if(FIND.when==='gap'&&FIND.gap){
      const st=Math.max(FIND.cursor||FIND.gap[0],FIND.gap[0]), rr=repairOps([{op:'add',day,id,start:fmt(st),dur:p.dur}]);
      applyOpsCore(rr.ops); save(); FIND.cursor=parse(rr.ops[0].start)+p.dur+20;
      r.c='sched'; r.txt=`${rr.ops[0].start}에 넣었어요${rr.warns.length?` · 확인할 것 ${rr.warns.length}`:''}`; renderAll();
    } else {selected=id;r.c='pick';r.txt='일정표에서 넣을 시간을 탭하세요';closeSheet();tab='timeline';renderAll();return}
    findRowsUpdate(); renderTray(); return}
});
document.addEventListener('change',e=>{
  if(e.target.id==='findArea'){FIND.area=e.target.value}
  if(e.target.id==='findGap'){FIND.gap=e.target.value.split('-').map(Number)}
});
document.addEventListener('submit',e=>{if(e.target.id!=='findForm')return;e.preventDefault();FIND.q=$('#findQ').value.trim();runFind()});
