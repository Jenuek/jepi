// ---------- AI-found places, chat folding ----------
const FRESH=new Set();
let chatFolded=false;
function chatFoldSync(){
  const n=chat.filter(m=>m.role==='user').length;
  dock({foldHidden:!chat.length,folded:chatFolded&&chat.length>0,expanded:!chatFolded,foldText:chatFolded?`대화 펼치기 (${n})`:'대화 접기 ▾'})}
document.addEventListener('focusin',e=>{if(e.target&&e.target.id==='chatInput'&&chatFolded&&chatBusy){chatFolded=false;chatFoldSync()}});

// ---------- chat place suggestions: choose per place ----------
function cpSlot(o){const d=+o.day,st=parse(o.start);return Number.isInteger(d)&&d>=0&&d<DAYS.length&&st!=null?{d,st}:null}
// place suggestions in a chat message (drawn by React: ChatLog.tsx)
function placeRows(m){
  return (m.ops||[]).map((o,k)=>{if(o.op!=='add_place')return null;const sl=cpSlot(o);
    const meta=[AREAS[o.area]?AREAS[o.area][0]:'',CATS[o.category]||'',o.open?String(o.open):''].filter(Boolean).join(' · ');
    const done=o._c==='sched'||o._c==='list'||o._c==='skip'||o._c==='pick';
    return {k,name:String(o.name),meta,note:o.note?String(o.note):'',off:o._c==='skip',done:done?String(o._txt||''):null,schedLabel:sl?`일정에 넣기 · Day ${sl.d+1} ${fmt(sl.st)}`:'일정에 넣기 · 시간 고르기'}}).filter(Boolean);
}
function cpEnsure(o){if(o._id&&PM[o._id])return o._id;
  const pl=cleanPlace({name:o.name,local:o.local,area:o.area,cat:o.category,lat:o.lat,lng:o.lng,dur:o.dur,open:o.open,closed:o.closed,cost:o.cost,costNote:o.costNote,tags:o.tags,note:o.note});
  if(!pl)return null; const ex=P.find(p=>norm(p.name)===norm(pl.name))||dupOf(pl); if(ex){o._id=ex.id;o._dup=ex.name;return ex.id}
  PACK.places.push(pl);addPackPlace(pl);FRESH.add(pl.id);savePack();o._id=pl.id;return pl.id}
// What was pressed in a chat message (ChatLog.tsx tells: its name and value)
function chatAct(n,v){
  if(n==='stop'){chatCtl&&chatCtl.abort();return}
  if(n==='apply'){applyChat(+v);return}
  if(n==='cancel'){const m=chat[+v];if(m){m.state='cancelled';renderChat()}return}
  if(n==='undo'){undoChat(+v);return}
  if(n==='cp') cpAct(v);
}
// one suggested place: "message:place:sched|list|skip"
function cpAct(v){
  const [i,k,act]=String(v).split(':'), m=chat[+i], o=m&&m.ops&&m.ops[+k]; if(!o)return;
  if(act==='skip'){o._c='skip';o._txt='넣지 않았어요';renderChat();return}
  const id=cpEnsure(o); if(!id){o._c='skip';o._txt='장소 정보를 읽지 못했어요';renderChat();return}
  if(act==='list'){o._c='list';o._txt=o._dup?`이미 있는 "${o._dup}"와 같은 곳이라 새로 만들지 않았어요`:'장소 목록에 넣었어요 · 장소 탭 맨 위';renderChat();renderTray();renderExt();return}
  const sl=cpSlot(o);
  if(sl&&!CUR.placed.some(b=>b.id===id)){const r=repairOps([{op:'add',day:sl.d,id,start:fmt(sl.st),dur:PM[id].dur}]);
    applyOpsCore(r.ops);save();o._c='sched';o._txt=`Day ${sl.d+1} ${r.ops[0].start}에 넣었어요${r.warns.length?` · 경고 ${r.warns.length}개`:''}`;day=sl.d;renderAll();renderChat();return}
  selected=id;o._c='pick';o._txt='일정표에서 넣을 시간을 탭하세요';tab='timeline';chatFolded=true;renderAll();renderChat();
  const g=document.getElementById('grid');if(g)g.scrollIntoView({block:'start',behavior:'smooth'});
}

