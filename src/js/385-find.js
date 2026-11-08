// ---------- one place-finding screen, many doors ----------
// Every "find places" button opens this same sheet with its conditions already picked:
//   어디 (near today's plan / one area / whole city) · 언제 (a free gap / any time) · 넣을 곳 (schedule / list only)
// Results always come back with the same three choices as chat: 일정에 넣기 / 장소에만 / 안 함.
// Chat and 🎲 DICE keep their own way of asking; only how results are kept is shared.
let FIND={where:'near',area:'',when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null,hits:[],sbusy:false};
function findAreaOfDay(){const it=analyze(UI.day).items.find(i=>!i.stay&&i.area);return it?it.area:''}
function openFind(o){
  FIND=Object.assign({where:'near',area:firstArea(),when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null,hits:[],sbusy:false},o||{});
  if(FIND.when==='gap'&&!FIND.gap){const g=gapsOf(UI.day)[0];if(g)FIND.gap=g;else FIND.when='any'}
  renderFind(); $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
  if(o&&o.autorun) runFind();
}
// Drawn by React: app/screens/FindSheet.tsx. renderFind = full redraw (boxes and status start fresh, like before);
// findRowsUpdate = only the results change (what was typed and the status line stay).
let findRev=0;
function renderFind(){findRev++;findMount()}
function findRowsUpdate(){findMount()}
function findMount(){
  const F=FIND, gaps=gapsOf(UI.day), gv=g=>({v:`${g[0]}-${g[1]}`,label:`${fmt(g[0])}–${fmt(g[1])}`});
  window.JEPI_UI.mount('find',$('#sheet'),{dayNo:UI.day+1,date:String(DY.days[UI.day].date),city:String(PK.pack.city||''),where:F.where,area:F.area||'',
    areas:Object.entries(AREAS).map(([k,v])=>({k,label:String(v[0])})),when:F.when,gaps:gaps.map(gv),gap:F.gap?gv(F.gap):null,into:F.into,q:F.q||'',busy:!!F.busy,mine:UI.jp==='P',
    rows:F.res.map(r=>{const p=PM[r.id];if(!p)return null;
      const meta=[p.area,CATS[p.cat]||'',p.hours&&!p.always?`${fmt(p.hours[0])}–${fmt(p.hours[1])}`:''].filter(Boolean).join(' · ');
      return {id:r.id,name:String(p.name),meta,note:p.note?String(p.note):'',c:r.c||'',txt:r.txt||''}}).filter(Boolean),
    // 장소 검색(Google/카카오)이 되면 결과를 AI보다 먼저 보여 줘요. 키가 없으면 null → 예전처럼 AI로만
    search:JD.gplaces.provider()?{provider:JD.gplaces.provider(),busy:!!F.sbusy,rows:F.hits.map((h,i)=>({id:String(i),name:String(h.name),meta:String(h.addr||''),
      note:!h.c&&JD.gplaces.existing(h)?'이미 장소 목록에 있는 곳이에요':'',c:h.c||'',txt:h.txt||''}))}:null,rev:findRev});
}
function findFocus(){
  const F=FIND, parts=[];
  if(F.q) parts.push(F.q);
  if(F.where==='near'){const a=findAreaOfDay();if(a)parts.push(`near ${a} (where the traveler is on Day ${UI.day+1})`)}
  else if(F.where==='area'&&AREAS[F.area]) parts.push(`only in the ${AREAS[F.area][0]} area`);
  if(F.when==='gap'&&F.gap) parts.push(`to visit on ${DY.days[UI.day].iso||'Day '+(UI.day+1)} between ${fmt(F.gap[0])} and ${fmt(F.gap[1])}; must be open then and fit within that time`);
  return parts.join('; ');
}
async function runFind(){
  if(FIND.busy) return;
  if(!UI.sample){FIND.res=[];renderFind();setSt('findSt','AI가 연결되어 있지 않아요. 더보기 → 설정에서 연결해 주세요.');return}
  // "fill this gap" with no extra wish keeps the original behaviour: AI picks from the places already on the list
  if(FIND.into==='sched'&&FIND.when==='gap'&&!FIND.q&&FIND.where==='near'&&P.some(p=>!CUR.placed.some(b=>b.id===p.id))){closeSheet();askAI();return}
  FIND.busy=true; FIND.res=[]; FIND.cursor=FIND.gap?FIND.gap[0]+15:null; renderFind();
  const ctl=new AbortController(); FIND.ctl=ctl;
  const n=await morePlaces(FIND.into==='sched'?5:8,'findSt',findFocus(),ctl.signal).catch(()=>0);
  FIND.busy=false; FIND.res=[...FRESH].map(id=>({id}));
  if($('#findForm')){renderFind(); if(!n) setSt('findSt','새로 찾은 곳이 없어요. 찾는 말을 바꿔 보세요.'); else setSt('findSt',`${n}곳을 찾았어요. 장소 탭 "✨ 방금 찾은 곳"에도 모여 있어요.`)}
  renderTray();
}
// 장소 검색: 이름·주소로 먼저 찾아서 결과를 보여 줘요 (AI는 그 아래 버튼으로)
function findCenter(){const F=FIND, a=F.where==='area'&&AREAS[F.area]; return a?{center:[a[1],a[2]],radius:5000}:{center:PLC.cityLL(),radius:30000}}
async function runSearch(){
  if(FIND.sbusy||FIND.busy) return;
  if(!FIND.q){renderFind();setSt('findSt','찾을 장소 이름이나 주소를 적어 주세요.');return}
  FIND.sbusy=true; FIND.hits=[]; renderFind(); setSt('findSt','찾는 중…');
  let hits=[],err='';
  try{hits=await JD.gplaces.search(FIND.q,findCenter())}catch(e){err=errText(e,'장소를 찾지 못했어요')}
  FIND.sbusy=false; FIND.hits=hits.map(h=>Object.assign({c:'',txt:''},h));
  if(!$('#findForm')) return;
  renderFind(); setSt('findSt',err||(hits.length?`${hits.length}곳을 찾았어요. 고르면 장소 목록에 들어가요.`:'찾지 못했어요. 이름이나 주소를 다르게 적어 보세요.'));
}
function findDrop(id){ // 안 함: the place was only just found, so take it off the list again
  const k=PK.pack.places.findIndex(x=>x.id===id); if(k>=0){PK.pack.places.splice(k,1);savePack()}
  const i=P.findIndex(x=>x.id===id); if(i>=0)P.splice(i,1); delete PM[id]; FRESH.delete(id);
}
// 장소 찾기 sheet (FindSheet.tsx tells: a choice chip "key:value" with what is typed, a result "id:sched|list|skip",
// the 동네 / 빈 시간 lists, or 찾기); and "찾기" next to an empty time in the day summary (gap "start-end")
function findAct(n,v,typed){
  if(n==='chip'){const [k,x]=String(v).split(':');FIND[k]=x;FIND.q=typed!=null?typed||FIND.q:FIND.q;
    if(k==='when'&&x==='gap'&&!FIND.gap)FIND.gap=gapsOf(UI.day)[0]||null; renderFind();return}
  if(n==='gap'){const [a,b]=String(v).split('-').map(Number);openFind({when:'gap',gap:[a,b],into:'sched'});return}
  if(n==='area'){FIND.area=v;return}
  if(n==='gapsel'){FIND.gap=String(v).split('-').map(Number);return}
  if(n==='submit'){FIND.q=String(typed||'').trim(); if(JD.gplaces.provider()) runSearch(); else runFind(); return}
  if(n==='ai'){FIND.q=String(typed||'').trim();runFind();return}
  if(n==='sr'){const [k,act]=String(v).split(':'), h=FIND.hits[+k]; if(!h||h.c) return;
    if(act==='skip'){h.c='skip';h.txt='넣지 않았어요';findRowsUpdate();return}
    const had=JD.gplaces.existing(h), pl=JD.gplaces.addFound(h); if(!pl) return;   // 고른 곳만 장소 목록에 만들어요
    h.id=pl.id; findPlace(h,pl.id,act,had?'이미 있던 곳을 ':''); return}
  if(n==='r'){const [id,act]=String(v).split(':'), r=FIND.res.find(x=>x.id===id); if(!r||!PM[id]) return;
    if(act==='skip'){findDrop(id);r.c='skip';r.txt='넣지 않았어요';findRowsUpdate();renderTray();return}
    findPlace(r,id,act,''); return}
}
// 고른 곳을 장소 목록에만 / 일정에 넣기 (AI 결과와 장소 검색 결과가 같이 써요). r: 줄(c·txt를 채워요)
function findPlace(r,id,act,pre){
  const p=PM[id];
  if(act==='list'){r.c='list';if(UI.jp==='P'){if(!isWish(id))toggleWish(id);r.txt=pre+'내 카드에 담았어요'}else r.txt=pre+'장소 목록에 넣었어요'}
  else if(FIND.when==='gap'&&FIND.gap){
    const st=Math.max(FIND.cursor||FIND.gap[0],FIND.gap[0]), rr=repairOps([{op:'add',day:UI.day,id,start:fmt(st),dur:p.dur}]);
    applyOpsCore(rr.ops); save(); FIND.cursor=parse(rr.ops[0].start)+p.dur+20;
    r.c='sched'; r.txt=`${pre}${rr.ops[0].start}에 넣었어요${rr.warns.length?` · 확인할 것 ${rr.warns.length}`:''}`; renderAll();
  } else {UI.selected=id;r.c='pick';r.txt='일정표에서 넣을 시간을 탭하세요';closeSheet();UI.tab='timeline';renderAll();return}
  findRowsUpdate(); renderTray();
}
