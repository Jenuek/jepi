// ---------- talk to Claude to change the schedule ----------
let chat=[], chatBusy=false, undoSnap=null, chatCtl=null;
const opText=JD.asks.opText;   // one proposed change in words: app/data/asks.ts
let chatRev=0;
// the dock under the schedule is drawn by React (app/screens/Dock.tsx) from dockView; dock({…}) changes some of it and draws again
let dockView={folded:false,foldHidden:true,foldText:'',expanded:undefined,aiHidden:true,aiOff:false,fixHidden:true,fixText:'',helperHidden:true,note:'',inputOff:false,sendOff:false,placeholder:'AI에게 말로 부탁하기'};
function dock(p){dockView={...dockView,...p};window.JEPI_UI.mount('dock',$('#chatMount'),dockView)}
// a button / the message was sent in the dock
function dockAct(n,v){
  if(n==='fold'){chatFolded=!chatFolded;chatFoldSync()}
  else if(n==='ai')openFind({when:'gap',into:'sched'});
  else if(n==='fix')fixWarns();
  else if(n==='helper')openHelper(0);
  else if(n==='custom')openCustom(null,null);
  else if(n==='send'){chatFolded=false;if(v)sendChat(v)}
}
function renderChat(){setTimeout(chatFoldSync,0);
  dock({note:UI.sample?'':'AI 기능은 더보기 → 설정에서 키를 연결하면 쓸 수 있어요',inputOff:!UI.sample||chatBusy,sendOff:!UI.sample||chatBusy});
  const start=Math.max(0,chat.length-8);
  // drawn by React: app/screens/ChatLog.tsx
  window.JEPI_UI.mount('chat',$('#chatLog'),{rev:++chatRev,msgs:chat.slice(start).map((m,k)=>{const i=start+k;
    if(m.role==='user') return {r:'u',text:String(m.text)};
    if(m.role==='busy') return {r:'busy',note:m.note?String(m.note):'일정을 살펴보고 있어요. 보통 10~40초 걸려요.'};
    const allOps=m.ops||[], ops=allOps.filter(o=>o.op!=='add_place');
    return {r:'a',i,text:String(m.text),places:allOps.some(o=>o.op==='add_place')?placeRows(m):null,ops:ops.map(o=>opText(o)),
      check:ops.length&&m.checked&&m.state==='pending'?{warns:(m.warns||[]).map(String)}:null,state:String(m.state||''),undo:!!(undoSnap&&undoSnap.i===i)}})});
  const lg=$('#chatLog'); lg.scrollTop=lg.scrollHeight;
}
async function sendChat(text){
  if(!UI.sample||chatBusy||!text) return;
  chat.push({role:'user',text}); chat.push({role:'busy'}); chatBusy=true; renderChat();
  chatCtl=new AbortController();
  try{
    // the question, checking the changes and asking once more when they bring warnings: app/data/asks.ts
    const ans=await JD.asks.chatAnswer(UI.sample,text,chat.filter(m=>m.role==='user'||m.role==='a').slice(-7,-1),
      ()=>{chat[chat.length-1].note='바꿀 내용을 검사했더니 경고가 생겨서 다시 고치는 중이에요.';renderChat()},chatCtl.signal);
    const r={reply:ans.reply}, ops=ans.ops, chk={warns:ans.warns};
    chat.pop(); chat.push({role:'a',text:String((r&&r.reply)||(ops.length?'이렇게 바꿔 볼게요.':'바꿀 내용을 찾지 못했어요.')).slice(0,600),ops,warns:chk.warns,checked:ops.length>0,state:ops.length?'pending':'none'});
  }catch(e){
    chat.pop();
    const msg=e&&e.code==='cancelled'?'멈췄어요.':e&&e.code==='not_granted'?'AI 키가 맞지 않아서 답하지 못했어요.':e&&e.code==='rate_limited'?'요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 보내 주세요.':'답을 받지 못했어요. 다시 보내 주세요.';
    chat.push({role:'a',text:msg,ops:[],state:'none'});
  }finally{chatBusy=false;renderChat()}
}
function applyChat(i){const m=chat[i]; if(!m||m.state!=='pending') return;
  undoSnap={i,placed:clone(CUR.placed),custom:clone(CUR.custom),fmarks:clone(CUR.fmarks)};
  applyOpsCore(m.ops.filter(o=>o.op!=='add_place')); TRIP.save('fmarks',CUR.fmarks);
  TRIP.save('custom',CUR.custom); m.state='applied'; save(); renderAll();
}
function undoChat(i){if(!undoSnap||undoSnap.i!==i) return; CUR.placed=undoSnap.placed; CUR.custom=undoSnap.custom; CUR.fmarks=undoSnap.fmarks||CUR.fmarks; TRIP.save('fmarks',CUR.fmarks); CUR.custom.forEach(addCustomToData); TRIP.save('custom',CUR.custom); undoSnap=null; chat[i].state='cancelled'; chat[i].text+=' (되돌렸어요)'; save(); renderAll()}
function renderNudges(){
  const off=CUR.profile.nudgeOff||{}, C=[];
  if(CUR.profile.kind!=='day'&&!CUR.profile.flightSet&&CUR.profile.bookedFlight!==false&&!off.flight) C.push(['flight','✈️','교통편 시간을 알려 주세요','첫날 출발과 마지막 날 귀국 시간이 정확해져요.',[['nudgeFlightIn','시간 넣기',1],['nudgeFlightNo','아직 예약 전이에요']]]);
  if(CUR.profile.kind!=='day'&&!CUR.profile.staySet&&CUR.profile.bookedStay!==false&&!off.stay) C.push(['stay','🏨','숙소를 알려 주세요','체크인·체크아웃과 짐 들고 다니는 시간이 계산돼요.',[['nudgeStayIn','숙소 넣기',1],['nudgeStayNo','아직 예약 전이에요']]]);
  if(CUR.profile.dateUnknown&&!off.date) C.push(['date','📅','여행 날짜를 알려 주세요','지금은 대략 한 달 뒤로 계산하고 있어요.',[['nudgeDate','날짜 넣기',1]]]);
  if(!CUR.kws.length&&!off.taste) C.push(['taste','💡','취향을 알려 주세요','고른 키워드에 맞는 장소부터 추천해요.',[['nudgeTaste','취향 고르기',1]]]);
  // drawn by React: app/screens/ChatLog.tsx Nudges
  window.JEPI_UI.mount('nudges',$('#nudges'),{dir:CUR.profile.direction&&(CUR.profile.purpose||CUR.profile.direction.purpose)?String(CUR.profile.purpose||CUR.profile.direction.purpose):'',
    rows:C.map(([k,ic,t,d,bs])=>({k,ic,title:d,aria:`${t} 나중에`,label:t.replace(' 알려 주세요','').replace('을','').replace('를',''),
      btns:bs.map(([id,l,pr])=>({id,primary:!!pr,label:pr?l.replace(/ .*/,'')==='시간'?'넣기':l.split(' ')[0]==='숙소'?'넣기':'고르기':'예약 전'}))}))});
}
function goMe(h){UI.tab='me';FS.draft=clone(CUR.profile);renderMe();renderTabs();setTimeout(()=>{const el=[...document.querySelectorAll('#meBox h3')].find(x=>x.textContent.includes(h));if(el)el.scrollIntoView({block:'start'})},0)}
function renderMeta(){if(CUR.profile.kind==='day'){dock({helperHidden:true});hero({meta:`${PK.pack.city} · ${(DY.days[0].iso||'').slice(5).replace('-','/')} 하루 코스 · ${CUR.profile.meet.time}–${CUR.profile.meet.end}`});return}if(CUR.profile.dateUnknown){const n=DY.days.length-1;dock({helperHidden:!needBooking()});hero({meta:`${PK.pack.city} · 날짜 미정 (대략 ${(DY.days[0].iso||'').slice(5).replace('-','/')}부터) · ${n}박 ${n+1}일`});return}dock({helperHidden:!needBooking()});const n=DY.days.length-1;hero({meta:`${PK.pack.city} · ${(DY.days[0].iso||'').replace(/-/g,'.')} – ${(DY.days[n].iso||'').slice(5).replace('-','.')} · ${n}박 ${n+1}일 · ${apName(CUR.profile.out.airport)}`})}


