// The AI chat under the 일정표 (asking for changes, applying / undoing them, the places it suggests), the dock around it,
// the "알려 주세요" nudges, the trip line in the header, and ✨ 빈 시간 채우기. (It used to be src/js/050-chat.js,
// 260-chat-places.js and 360-ai.js.) The old code reads and changes the chat's state as CS.chat, CS.busy …
// What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as asks from '../data/asks';
import * as OPS from '../data/ops';
import * as check from '../data/check';
import { state as DYs } from '../data/days';
import { fmt, parse } from '../logic/time';
import { norm } from '../logic/places';
import { ui } from '../ui/state';
import { fs } from './forms';
import * as R from './render';
export const cs = {
  /** the messages: {role:'user'|'a'|'busy', text, ops, warns, state …} */
  chat: [] as any[],
  busy: false,
  /** what 되돌리기 puts back (the message it belongs to, the blocks, hand-made places and 할 일 표시 before) */
  undoSnap: null as any,
  /** stops the question being asked */
  ctl: null as AbortController | null,
  /** the chat is folded down to one line */
  folded: false,
};
/** the places the AI just found (✨ 방금 찾은 곳) */
export const fresh = new Set<string>();

/** what the old code still does */
export interface Legacy {
  openFind(o: any): void; fixWarns(): void; openHelper(step: number): void; openCustom(id: string | null, start: number | null): void;
  /** a hand-made place back in the lists (after 되돌리기) */
  addCustomToData(c: any): void;
  hero(p: any): void; renderMe(): void; needBooking(): boolean;
  /** the same place already in the list, or null */
  dupOf(p: any): any; renderExt(): void;
}
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const CUR = trip.cur as any, PK = places.state as any, D_ = DYs as any, PMx = places.PM as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const apName = (k: string) => ((places.AIRPORTS as any)[k] || (places.AIRPORTS as any)[places.firstGw()]).name;

let chatRev=0;
// the dock under the schedule is drawn by React (app/screens/Dock.tsx) from dockView; dock({…}) changes some of it and draws again
let dockView: any={folded:false,foldHidden:true,foldText:'',expanded:undefined,aiHidden:true,aiOff:false,fixHidden:true,fixText:'',helperHidden:true,note:'',inputOff:false,sendOff:false,placeholder:'AI에게 말로 부탁하기'};
export function dock(p?: any){dockView={...dockView,...p};mount('dock',$('#chatMount'),dockView)}
// a button / the message was sent in the dock
export function dockAct(n?: any, v?: any){
  if(n==='fold'){cs.folded=!cs.folded;chatFoldSync()}
  else if(n==='ai')L.openFind({when:'gap',into:'sched'});
  else if(n==='fix')L.fixWarns();
  else if(n==='helper')L.openHelper(0);
  else if(n==='custom')L.openCustom(null,null);
  else if(n==='send'){cs.folded=false;if(v)sendChat(v)}
}
export function renderChat(){setTimeout(chatFoldSync,0);
  dock({note:ui.sample?'':'AI 기능은 더보기 → 설정에서 키를 연결하면 쓸 수 있어요',inputOff:!ui.sample||cs.busy,sendOff:!ui.sample||cs.busy});
  const start=Math.max(0,cs.chat.length-8);
  // drawn by React: app/screens/ChatLog.tsx
  mount('chat',$('#chatLog'),{rev:++chatRev,msgs:cs.chat.slice(start).map((m: any,k: any)=>{const i=start+k;
    if(m.role==='user') return {r:'u',text:String(m.text)};
    if(m.role==='busy') return {r:'busy',note:m.note?String(m.note):'일정을 살펴보고 있어요. 보통 10~40초 걸려요.'};
    const allOps=m.ops||[], ops=allOps.filter((o: any)=>o.op!=='add_place');
    return {r:'a',i,text:String(m.text),places:allOps.some((o: any)=>o.op==='add_place')?placeRows(m):null,ops:ops.map((o: any)=>asks.opText(o)),
      check:ops.length&&m.checked&&m.state==='pending'?{warns:(m.warns||[]).map(String)}:null,state:String(m.state||''),undo:!!(cs.undoSnap&&cs.undoSnap.i===i)}})});
  const lg=$('#chatLog'); lg.scrollTop=lg.scrollHeight;
}
export async function sendChat(text?: any){
  if(!ui.sample||cs.busy||!text) return;
  cs.chat.push({role:'user',text}); cs.chat.push({role:'busy'}); cs.busy=true; renderChat();
  cs.ctl=new AbortController();
  try{
    // the question, checking the changes and asking once more when they bring warnings: app/data/asks.ts
    const ans=await asks.chatAnswer(ui.sample,text,cs.chat.filter((m: any)=>m.role==='user'||m.role==='a').slice(-7,-1),
      ()=>{cs.chat[cs.chat.length-1].note='바꿀 내용을 검사했더니 경고가 생겨서 다시 고치는 중이에요.';renderChat()},cs.ctl.signal);
    const r={reply:ans.reply}, ops=ans.ops, chk={warns:ans.warns};
    cs.chat.pop(); cs.chat.push({role:'a',text:String((r&&r.reply)||(ops.length?'이렇게 바꿔 볼게요.':'바꿀 내용을 찾지 못했어요.')).slice(0,600),ops,warns:chk.warns,checked:ops.length>0,state:ops.length?'pending':'none'});
  }catch(e: any){
    cs.chat.pop();
    const msg=e&&e.code==='cancelled'?'멈췄어요.':e&&e.code==='not_granted'?'AI 키가 맞지 않아서 답하지 못했어요.':e&&e.code==='rate_limited'?'요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 보내 주세요.':'답을 받지 못했어요. 다시 보내 주세요.';
    cs.chat.push({role:'a',text:msg,ops:[],state:'none'});
  }finally{cs.busy=false;renderChat()}
}
export function applyChat(i?: any){const m=cs.chat[i]; if(!m||m.state!=='pending') return;
  cs.undoSnap={i,placed:clone(CUR.placed),custom:clone(CUR.custom),fmarks:clone(CUR.fmarks)};
  OPS.apply(m.ops.filter((o: any)=>o.op!=='add_place')); trip.save('fmarks',CUR.fmarks);
  trip.save('custom',CUR.custom); m.state='applied'; trip.blocks.saved(); R.renderAll();
}
export function undoChat(i?: any){if(!cs.undoSnap||cs.undoSnap.i!==i) return; CUR.placed=cs.undoSnap.placed; CUR.custom=cs.undoSnap.custom; CUR.fmarks=cs.undoSnap.fmarks||CUR.fmarks; trip.save('fmarks',CUR.fmarks); CUR.custom.forEach(L.addCustomToData); trip.save('custom',CUR.custom); cs.undoSnap=null; cs.chat[i].state='cancelled'; cs.chat[i].text+=' (되돌렸어요)'; trip.blocks.saved(); R.renderAll()}
export function renderNudges(){
  const off=CUR.profile.nudgeOff||{}, C: any[]=[];
  if(CUR.profile.kind!=='day'&&!CUR.profile.flightSet&&CUR.profile.bookedFlight!==false&&!off.flight) C.push(['flight','✈️','교통편 시간을 알려 주세요','첫날 출발과 마지막 날 귀국 시간이 정확해져요.',[['nudgeFlightIn','시간 넣기',1],['nudgeFlightNo','아직 예약 전이에요']]]);
  if(CUR.profile.kind!=='day'&&!CUR.profile.staySet&&CUR.profile.bookedStay!==false&&!off.stay) C.push(['stay','🏨','숙소를 알려 주세요','체크인·체크아웃과 짐 들고 다니는 시간이 계산돼요.',[['nudgeStayIn','숙소 넣기',1],['nudgeStayNo','아직 예약 전이에요']]]);
  if(CUR.profile.dateUnknown&&!off.date) C.push(['date','📅','여행 날짜를 알려 주세요','지금은 대략 한 달 뒤로 계산하고 있어요.',[['nudgeDate','날짜 넣기',1]]]);
  if(!CUR.kws.length&&!off.taste) C.push(['taste','💡','취향을 알려 주세요','고른 키워드에 맞는 장소부터 추천해요.',[['nudgeTaste','취향 고르기',1]]]);
  // drawn by React: app/screens/ChatLog.tsx Nudges
  mount('nudges',$('#nudges'),{dir:CUR.profile.direction&&(CUR.profile.purpose||CUR.profile.direction.purpose)?String(CUR.profile.purpose||CUR.profile.direction.purpose):'',
    rows:C.map(([k,ic,t,d,bs])=>({k,ic,title:d,aria:`${t} 나중에`,label:t.replace(' 알려 주세요','').replace('을','').replace('를',''),
      btns:bs.map(([id,l,pr]: any)=>({id,primary:!!pr,label:pr?l.replace(/ .*/,'')==='시간'?'넣기':l.split(' ')[0]==='숙소'?'넣기':'고르기':'예약 전'}))}))});
}
export function goMe(h?: any){ui.tab='me';fs.draft=clone(CUR.profile);L.renderMe();R.renderTabs();setTimeout(()=>{const el=[...document.querySelectorAll('#meBox h3')].find((x: any)=>x.textContent.includes(h));if(el)el.scrollIntoView({block:'start'})},0)}
export function renderMeta(){if(CUR.profile.kind==='day'){dock({helperHidden:true});L.hero({meta:`${PK.pack.city} · ${(D_.days[0].iso||'').slice(5).replace('-','/')} 하루 코스 · ${CUR.profile.meet.time}–${CUR.profile.meet.end}`});return}if(CUR.profile.dateUnknown){const n=D_.days.length-1;dock({helperHidden:!L.needBooking()});L.hero({meta:`${PK.pack.city} · 날짜 미정 (대략 ${(D_.days[0].iso||'').slice(5).replace('-','/')}부터) · ${n}박 ${n+1}일`});return}dock({helperHidden:!L.needBooking()});const n=D_.days.length-1;L.hero({meta:`${PK.pack.city} · ${(D_.days[0].iso||'').replace(/-/g,'.')} – ${(D_.days[n].iso||'').slice(5).replace('-','.')} · ${n}박 ${n+1}일 · ${apName(CUR.profile.out.airport)}`})}


export function chatFoldSync(){
  const n=cs.chat.filter((m: any)=>m.role==='user').length;
  dock({foldHidden:!cs.chat.length,folded:cs.folded&&cs.chat.length>0,expanded:!cs.folded,foldText:cs.folded?`대화 펼치기 (${n})`:'대화 접기 ▾'})}
document.addEventListener('focusin',(e: any)=>{if(e.target&&e.target.id==='chatInput'&&cs.folded&&cs.busy){cs.folded=false;chatFoldSync()}});

// ---------- chat place suggestions: choose per place ----------
function cpSlot(o?: any){const d=+o.day,st=parse(o.start);return Number.isInteger(d)&&d>=0&&d<D_.days.length&&st!=null?{d,st}:null}
// place suggestions in a chat message (drawn by React: ChatLog.tsx)
export function placeRows(m?: any){
  return (m.ops||[]).map((o: any,k: any)=>{if(o.op!=='add_place')return null;const sl=cpSlot(o);
    const meta=[places.AREAS[o.area]?places.AREAS[o.area][0]:'',places.CATS[o.category]||'',o.open?String(o.open):''].filter(Boolean).join(' · ');
    const done=o._c==='sched'||o._c==='list'||o._c==='skip'||o._c==='pick';
    return {k,name:String(o.name),meta,note:o.note?String(o.note):'',off:o._c==='skip',done:done?String(o._txt||''):null,schedLabel:sl?`일정에 넣기 · Day ${sl.d+1} ${fmt(sl.st)}`:'일정에 넣기 · 시간 고르기'}}).filter(Boolean);
}
function cpEnsure(o?: any){if(o._id&&PMx[o._id])return o._id;
  const pl=places.cleanPlace({name:o.name,local:o.local,area:o.area,cat:o.category,lat:o.lat,lng:o.lng,dur:o.dur,open:o.open,closed:o.closed,cost:o.cost,costNote:o.costNote,tags:o.tags,note:o.note});
  if(!pl)return null; const ex=places.P.find((p: any)=>norm(p.name)===norm(pl.name))||L.dupOf(pl); if(ex){o._id=ex.id;o._dup=ex.name;return ex.id}
  PK.pack.places.push(pl);places.addPackPlace(pl);fresh.add(pl.id);places.savePack();o._id=pl.id;return pl.id}
// What was pressed in a chat message (ChatLog.tsx tells: its name and value)
export function chatAct(n?: any, v?: any){
  if(n==='stop'){cs.ctl&&cs.ctl.abort();return}
  if(n==='apply'){applyChat(+v);return}
  if(n==='cancel'){const m=cs.chat[+v];if(m){m.state='cancelled';renderChat()}return}
  if(n==='undo'){undoChat(+v);return}
  if(n==='cp') cpAct(v);
}
// one suggested place: "message:place:sched|list|skip"
function cpAct(v?: any){
  const [i,k,act]=String(v).split(':'), m=cs.chat[+i], o=m&&m.ops&&m.ops[+k]; if(!o)return;
  if(act==='skip'){o._c='skip';o._txt='넣지 않았어요';renderChat();return}
  const id=cpEnsure(o); if(!id){o._c='skip';o._txt='장소 정보를 읽지 못했어요';renderChat();return}
  if(act==='list'){o._c='list';o._txt=o._dup?`이미 있는 "${o._dup}"와 같은 곳이라 새로 만들지 않았어요`:'장소 목록에 넣었어요 · 장소 탭 맨 위';renderChat();R.renderTray();L.renderExt();return}
  const sl=cpSlot(o);
  if(sl&&!CUR.placed.some((b: any)=>b.id===id)){const r=OPS.repair([{op:'add',day:sl.d,id,start:fmt(sl.st),dur:PMx[id].dur}]);
    OPS.apply(r.ops);trip.blocks.saved();o._c='sched';o._txt=`Day ${sl.d+1} ${r.ops[0].start}에 넣었어요${r.warns.length?` · 경고 ${r.warns.length}개`:''}`;ui.day=sl.d;R.renderAll();renderChat();return}
  ui.selected=id;o._c='pick';o._txt='일정표에서 넣을 시간을 탭하세요';ui.tab='timeline';cs.folded=true;R.renderAll();renderChat();
  const g=document.getElementById('grid');if(g)g.scrollIntoView({block:'start',behavior:'smooth'});
}

export async function askAI(){
  if(!ui.sample) return;
  const gaps=check.gapsOf(ui.day);
  if(!gaps.length){ui.aiState={day:ui.day,status:'error',msg:'이 날은 90분 이상 빈 시간이 없어요. 블록을 조금 빼거나 옮겨 보세요.'};R.renderAI();return}
  const ctl=new AbortController();
  ui.aiState={day:ui.day,status:'loading',ctl}; R.renderAI(); dock({aiOff:true});
  try{
    const {items:kept,dropped}=await asks.fillDay(ui.sample,ui.day,ctl.signal);   // the question and its checks: app/data/asks.ts
    ui.aiState={day:ui.day,status:'done',items:kept,dropped};
  }catch(e: any){
    if(e&&e.code==='cancelled'){ui.aiState=null}
    else if(e&&(e.code==='not_granted'||e.code==='sampling_disabled'||e.code==='not_declared'||e.code==='capability_disabled')){ui.sample=null;ui.aiState={day:ui.day,status:'error',msg:'이 화면에서는 AI 추천을 쓸 수 없어요. 블록은 직접 넣을 수 있어요.'}}
    else if(e&&e.code==='rate_limited'){ui.aiState={day:ui.day,status:'error',msg:'요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 눌러 주세요.'}}
    else if(e&&e.code==='invalid_json'){ui.aiState={day:ui.day,status:'error',msg:'추천 형식을 읽지 못했어요. 한 번 더 눌러 주세요.'}}
    else {ui.aiState={day:ui.day,status:'error',msg:(e&&e.message&&e.code!=='upstream_error'||e&&e.code==='upstream_error'&&e.message?e.message+' · ':'연결이 잠시 끊겼어요. ')+'다시 눌러 주세요.'}}
  }finally{dock({aiOff:false}); R.renderAll()}
}

