
// JEPI — every file in src/js is pasted into ONE function scope, in file-name order.
// A file may use what an earlier file defines. Top-level code runs at load time, so keep
// start-up actions in 390-boot.js (after every file has defined its variables).
(function(){
// ---------- data layer (app/data, TypeScript) ----------
// Saving on this device, the server connection, key encryption and the demo sandbox live in app/data/.
// The old code reaches them through JD (= window.JEPI_DATA), which React sets up before this script runs.
const JD=window.JEPI_DATA;
// The trip's data (profile, blocks, ♥, plans …) is saved only through TRIP: app/data/trip.ts
const TRIP=JD.trip;
// the trip being worked on (profile, placed, custom, fmarks, wish, meals, done, kws) lives in app/data/trip.ts: CUR.placed …
const CUR=TRIP.cur;
// the plan list and which plan is open (app/data/trip.ts): PL.plans, PL.curPlan
const PL=TRIP.planList;
// the trip's days and the places they start from (app/data/days.ts): DY.days, DY.loc, DY.locArea, DY.locZone, DY.gmpBy, DY.homeMin
const DY=JD.days.state;
// how the traveler is described to the AI, and money text (app/data/traveler.ts)
const TV=JD.traveler;

// where the person is in the app (app/ui/state.ts): UI.day, UI.tab, UI.cat, UI.group, UI.zoneOpen, UI.selected, UI.aiState, UI.sample, UI.jp, UI.resetArm
const UI=window.JEPI_UI.ui;
// ---------- demo sandbox ----------
// The sandbox itself (copy aside on entering, put back on leaving or on the next launch) is in app/data/demo.ts
// and has already run before this script. DEMO.on is true while the demo is open.
const DEMO=JD.demo.DEMO;
const DEMO_LIVE=JD.demo.DEMO_LIVE;
function demoRestore(){JD.demo.demoRestore()}
// ---------- extra side panels ----------
// A feature adds a panel with: PANELS.name={render(){…}}  plus  <div id="side-name" hidden> in body.html.
// Opening it: any button with data-tab="name". It is shown under the 더보기 tab.
const PANELS={};
// Features that ride on the account sync: run after every push / pull (310-sync.js)
const SYNC_AFTER_PUSH=[], SYNC_AFTER_PULL=[];
// Little extras drawn by features: on a timeline block, a place card, and the block sheet.
// Each function returns a piece (or a list of pieces, or nothing); React draws them: app/screens/Extras.tsx
//   {k:'badge',t,title} {k:'want',pid,on,n,who} {k:'tag',cls,t} {k:'wantRow',want,by} {k:'alert',on,hint} {k:'memo',key,value}
const BLOCK_BADGES=[], CARD_EXTRAS=[], SHEET_EXTRAS=[];
const extras=(list,...a)=>list.flatMap(f=>{try{const r=f(...a);return r?[].concat(r):[]}catch(_){return []}});
const WD=['일','월','화','수','목','금','토'];
DY.loc={};
// the destination's lists (app/data/places.ts — the same objects, filled again when a destination opens; tokyo.ts until then)
const PLC=JD.places, PK=PLC.state;
const AIRPORTS=PLC.AIRPORTS, AREAS=PLC.AREAS, CATS=PLC.CATS, P=PLC.P, PM=PLC.PM;
DY.locArea={};
DY.locZone={};
const dayStart=JD.days.dayStart;   // app/data/days.ts
DY.gmpBy=360; // when to be at the home airport, from the profile
const durTxt=JD.logic.time.durTxt;   // app/logic/time.ts
DY.days=[];
const costOf=PLC.costOf;
const DEFAULT_KW=[];
const tagsOf=PLC.tagsOf;
const norm=JD.logic.places.norm;   // app/logic/places.ts
const yen=TV.yen;   // app/data/traveler.ts
const DEFAULT=[];
// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE={dest:'도쿄',mode:'flight',local:'transit',startDate:'2026-11-07',nights:3,out:{airport:'hnd',dep:'08:15',arr:'10:20',flight:''},back:{airport:'hnd',dep:'19:30',arr:'22:05',flight:''},home:{area:'',min:60,fare:1550,byMin:120},stays:[{name:'시부야 숙소',area:'shibuya',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],purpose:'',pace:'slow',social:'some',breakfast:false};
const clone=o=>JSON.parse(JSON.stringify(o));
const apName=k=>(AIRPORTS[k]||AIRPORTS[firstGw()]).name;
const MAX_N=JD.days.MAX_N;
// dates, tidying 여행 정보 and making the days with their fixed blocks: app/data/days.ts (the days themselves: DY.days …)
const nightsOf=JD.days.nightsOf, fixProfile=JD.days.fixProfile, buildDays=JD.days.buildDays;

// ---------- forms shared by onboarding and the "내 정보" tab ----------
let draft=null, onbStep=0, onbRev=0;
const opt=(v,l,sel)=>`<option value="${esc(v)}"${String(v)===String(sel)?' selected':''}>${esc(l)}</option>`;
function setPath(o,path,v){const ks=path.split('.');for(let i=0;i<ks.length-1;i++)o=o[ks[i]];o[ks[ks.length-1]]=v}
// drawn by React: TripForms.tsx PasteBox. The last message stays across redraws (pasteMsg) until another row opens.
let pasteMsg={};
const pasteBox=(kind,hint)=>({kind,hint,ai:!!UI.sample,msg:pasteMsg[kind]||''});
const pasteSay=(kind,t)=>{pasteMsg[kind]=t;setSt('st_'+kind,t)};
// 더보기 → 이번 여행 forms are drawn by React (app/screens/TripForms.tsx): these build what each form shows.
// what each form part shows: app/view/forms.ts
const FORMS=window.JEPI_UI.view.forms;
const optsOf=FORMS.optsOf, datesInfo=FORMS.datesInfo, partParty=FORMS.party;
function datesReady(p){return p.dateSet!==false&&p.nightsSet!==false}
function needDates(){setSt('st_dates','여행 날짜와 기간을 먼저 골라 주세요. 모르면 "날짜는 아직 몰라요"를 눌러 주세요.');const d=document.getElementById('datesSec');if(d)d.scrollIntoView({block:'center'})}
const isoPlus=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const ONB=[
  {t:'어디로, 언제, 누구와 떠나나요?',s:'세 가지만 알려 주면 바로 일정표를 만들어요. 교통편, 숙소, 취향은 필요할 때 물어볼게요.',f:p=>!p.jpPicked?[partJP()]:!p.startMode?[{f:'chooser',ai:!!UI.sample}]:p.startMode==='pq'?[partQuick(p,false)]:p.startMode==='talk'?[partTalk(p)]:p.startMode==='day'?[partQuick(p,true)]
    :p.destMode==='find'?[...(p.fromTalk?[partBanner(p,'날짜·기간·예산을 확인하고 아래 "AI로 여행지 추천받기"를 눌러 주세요.')]:[]),{f:'dates',dates:datesInfo(p)},partDest(p)]
    :[...(p.fromTalk?[partBanner(p,'날짜와 동행을 확인하고 "AI로 여행지 준비하기"를 눌러 주세요.')]:[]),partDest(p),{f:'dates',dates:datesInfo(p)},partParty(p)]}
];
function openOnb(){draft=clone(CUR.profile);draft.startMode=undefined;draft.jpPicked=false;draft.q=null;draft.destMode='';draft.fromTalk=false;draft.dateSet=false;draft.nightsSet=false;draft.dateUnknown=false;talk=null;onbStep=0;$('#meBox').innerHTML='';onbFrame({open:true});renderOnb()}
// the frame (title, 이전/다음/건너뛰기) is drawn by React (app/screens/Frames.tsx) from onbView; onbFrame({…}) changes some of it and draws again
let onbView={open:false,step:'',title:'',sub:'',prevOff:false,prevHidden:false,nextLabel:'다음',nextOff:false,nextHidden:false,skipLabel:'건너뛰기',skipOff:false,skipHidden:false,exampleOff:false};
function onbFrame(p){onbView={...onbView,...p};window.JEPI_UI.mount('onbFrame',$('#onbMount'),onbView)}
// pressed in the frame
function onbFrameAct(n){
  if(n==='prev'){if(onbStep>0){onbStep--;renderOnb()}}
  else if(n==='skip'&&placeCtl)placeCtl.abort();
  else if(n==='next'||n==='skip')onbAdvance();
  else if(n==='example'){if(onbBusy)return;demoEnter()}
}
function renderOnb(){const st=ONB[onbStep];
  const md=draft&&draft.startMode;
  onbFrame({step:ONB.length>1?`${onbStep+1} / ${ONB.length}`:'',
    title:!draft.jpPicked?'어떤 여행자예요?':md==='pq'?'가볍게 시작해요':!md?'어떻게 시작할까요?':md==='talk'?'이번 여행, 어떤 여행이면 좋을까요?':md==='day'?'오늘 어디서 놀아요?':st.t,
    sub:!draft.jpPicked?'고르는 쪽에 맞춰 화면과 시작 방법이 달라져요.':md==='pq'?'네 가지만 누르면 바로 굴릴 수 있어요.':!md?'편한 방법을 골라 주세요. 언제든 바꿀 수 있어요.':md==='talk'?'정답은 없어요. 떠오르는 대로 답하면 방향을 정리해 드릴게요.':md==='day'?'동네와 시간만 정하면 하루 코스를 바로 짤 수 있어요.':st.s,
    prevOff:onbStep===0,prevHidden:ONB.length===1,nextLabel:onbStep===ONB.length-1?'일정표 만들기':'다음',skipHidden:onbStep===ONB.length-1,nextHidden:!draft.jpPicked||!md||['talk','pq','day'].includes(md)});
  window.JEPI_UI.mount('onb',$('#onbBody'),{parts:st.f(fixProfile(draft)),rev:++onbRev});$('#onb').scrollTop=0}
function commitProfile(p){CUR.profile=fixProfile(clone(p));TRIP.save('profile',CUR.profile);TRIP.kws.save(CUR.kws);buildDays();CUR.placed=CUR.placed.filter(b=>b.day<DY.days.length);save();if(UI.day>=DY.days.length)UI.day=0}
async function finishOnb(){commitProfile(draft);UI.day=0;
  if(UI.sample&&!PK.pack.example&&!PK.pack.manual&&P.length<8){onbBusy=true;setBusy(true);placeCtl=new AbortController();
    onbFrame({nextLabel:'장소 찾는 중…',skipHidden:false,skipOff:false,skipLabel:'기다리지 않고 시작'});
    const st=$('#st_onb'); if(st) st.scrollIntoView({block:'nearest'});
    await morePlaces(24,'st_onb','',placeCtl.signal); if(placeCtl&&!placeCtl.signal.aborted) await genSeason('st_onb',placeCtl.signal); placeCtl=null; onbBusy=false; setBusy(false)}
  onbFrame({open:false});renderAll();if(UI.tab==='me'){draft=clone(CUR.profile);renderMe()}
  if(needBooking()) openHelper(0); else maybeCoach()}
function renderMe(){renderMeRows()}
function rerenderForm(){
  const ob=$('#onb'), sd=$('#panel-side'), wy=window.scrollY, oy=ob.scrollTop, sy=sd.scrollTop;
  if(!ob.hidden) renderOnb(); else {if(UI.tab==='me'||matchMedia('(min-width:900px)').matches) renderMe(); if(UI.tab==='pref') renderTasteStyle();}
  ob.scrollTop=oy; sd.scrollTop=sy; window.scrollTo(0,wy);
}
// What was pressed in 처음 설정 / 이번 여행 / 취향 (OnbBody, OnbTalk, OnbFinder, TripForms, MeRows, TasteStyle tell:
// its name, its value and a few extras). The forms change `draft`; rerenderForm draws them again.
async function formAct(n,v,o){
  o=o||{};
  // 이번 여행 / 취향: these save themselves a moment later (autoSave does nothing while 처음 설정 is open)
  if(['radio','addstay','delstay','addev','delev'].includes(n)) setTimeout(autoSave,0);
  switch(n){
  // 처음 설정
  case 'onbkey': {const key=String(o.key||'').trim().replace(/\s+/g,'');if(!key)return;KEYS[v]=key;keysChanged();return}
  case 'pickjp': if(!draft)return;draft.jpPicked=true;setJP(v);if(v==='P'){draft.startMode='pq';draft.q={when:'',len:'',slot:'noon'}}renderOnb();return;
  case 'q': {if(!draft)return;const q=draft.q||(draft.q={}),k=o.q;if(k==='party'){draft.party.type=v;if(v==='friends'&&draft.party.adults<2)draft.party.adults=3;if(v==='couple')draft.party.adults=2;if(v==='family'&&draft.party.adults<2)draft.party.adults=2}else q[k]=v;if(k==='when'&&v!=='pick')draft.dateSet=true;if(k==='when'&&v==='pick')draft.dateSet=false;rerenderForm();return}
  case 'quickStart': quickStart();return;
  case 'startmode': if(!draft)return;draft.startMode=v;draft.kind=draft.startMode==='day'?'day':'trip';if(draft.kind==='day'){draft.nightsSet=true;draft.bookedFlight=true;draft.bookedStay=true;draft.flightSet=true;draft.staySet=true;draft.q={when:'',len:'0',slot:'noon'}}if(o.destmode!=null)draft.destMode=o.destmode;else if(v==='quick'&&!o.inChoose)draft.destMode=draft.dest?'':'find';if(draft.startMode==='talk'&&!talk)talkReset();renderOnb();return;
  // 이야기하면서 정하기
  case 'talkopt': if(talk)talkSend(talk.options[+v]);return;
  case 'talkSend': {const x=String(v||'').trim();if(x)talkSend(x);return}
  case 'talkFinish': talkSend('__finish__');return;
  case 'talkRetry': talkSend(null,{retry:true});return;
  case 'talkRedo': talkReset();rerenderForm();return;
  case 'talkApply': if(talk&&talk.summary){const S=talk.summary;draft.startMode='quick';
    if(S.dest){draft.dest=S.dest;draft.destMode='';draft.fromTalk=true;renderOnb()}
    else{draft.destMode='find';draft.want=draft.purpose||'';draft.fromTalk=true;renderOnb()}}
    return;
  // 여행지 찾기
  case 'destmode': if(!draft)return;draft.destMode=v;rerenderForm();return;
  case 'destRec': if(!datesReady(draft)){needDates();return}recommendDest();return;
  case 'destMore': recommendDest({more:true});return;
  case 'destAsk': {const x=String(v||'').trim();if(x)recommendDest({ask:x});else setSt('st_ask','궁금한 여행지를 적어 주세요.');return}
  case 'pickdest': case 'pickask': {if(!draft||(n==='pickdest'&&!destRecs))return;const dd=n==='pickask'?destAsked[+v]:destRecs[+v];if(!dd)return;draft.dest=dd.city;draft.destMode='';draft.bookedFlight=false;draft.bookedStay=false;draft.mode=dd.country&&dd.country!=='대한민국'&&dd.country!=='한국'?'flight':draft.mode;rerenderForm();
    setTimeout(()=>{if(UI.sample)formAct('genPack')},0);return}
  case 'genPack': {
    const dest=String((draft&&draft.dest)||($('[data-pf="dest"]')||{}).value||'').trim();
    if(!dest){setSt('st_pack','여행지를 먼저 적어 주세요.');return}
    if(draft) draft.dest=dest;
    if(onbBusy){setSt('st_pack','이미 준비하는 중이에요. 잠시만 기다려 주세요.');return}
    setSt('st_pack','요청을 보내는 중이에요…');
    const btn=()=>$('#onb').hidden?$('#genPack'):$('#onb #genPack');
    (async()=>{const inOnb=!$('#onb').hidden;if(await genPack(dest)){if(inOnb)renderOnb();else{commitProfile(draft);renderAll();renderMe();await morePlaces(24,'st_pack','');renderAll()}}})()
      .catch(err=>{onbBusy=false;setBusy(false);{const L=window.JEPI_UI.live(btn());if(L)L.label(null)}setSt('st_pack','문제가 생겼어요: '+((err&&(err.message||err.code))||err)+' · 다시 눌러 주세요.')});
    return}
  // 고르기 (Radio): style.* opens the style box
  case 'radio': {const path=v;if(path.startsWith('style.'))styleOpen=true;let x=o.val;if(x==='true')x=true;else if(x==='false')x=false;if(draft){setPath(draft,path,x);if(path==='mode')draft.local=x==='car'?'car':'transit';if(path==='party.type'){const q=draft.party;if(x==='couple')q.adults=2;if(x==='friends'&&q.adults<2)q.adults=3;if(x==='family'){if(q.adults<2)q.adults=2;if(!q.kids)q.kids=1;draft.pace='slow'}fixProfile(draft)}rerenderForm()}return}
  // 이번 여행
  case 'addstay': if(!draft)return;{const nn=nightsOf(draft);draft.stays.push({name:'숙소 '+(draft.stays.length+1),area:firstArea(),checkin:'15:00',checkout:'11:00',from:Math.max(0,nn-1),to:nn})}rerenderForm();return;
  case 'delstay': if(!draft)return;draft.stays.splice(+v,1);rerenderForm();return;
  case 'addev': if(!draft)return;draft.events.push({name:'',day:0,start:'19:00',end:'21:00',area:firstArea()});rerenderForm();return;
  case 'delev': if(!draft)return;draft.events.splice(+v,1);rerenderForm();return;
  case 'aifill': aiFill(v);return;
  case 'meSave': commitProfile(draft);draft=clone(CUR.profile);renderAll();renderMe();meSetMsg('저장했어요. 고정 블록을 다시 만들었어요.');return;
  case 'meOnb': openOnb();return;
  case 'meHelper': openHelper(0);return;
  case 'meopen': meOpen=meOpen===v?null:v;autoMsg='';pasteMsg={};renderMeRows();return;
  case 'homeUse': {if(!draft)return;const h=mypOf('home');if(!h||!h.ll)return;draft.home.ll=h.ll;draft.home.area='집';homeMsg='출발지를 집으로 바꿨어요.';autoSave();renderMeRows();return}
  case 'homeair': {if(!draft)return;const h=mypOf('home'),a=KR_AIR[v];if(!h||!h.ll)return;homeMsg='경로를 계산하는 중…';renderMeRows();
    try{const r=await fetchRoute({m:'transit',a:h.ll,b:[a[1],a[2]],pv:'kakao'});if(!r)throw new Error('경로를 찾지 못했어요');
      draft.home.ll=h.ll;draft.home.area='집';draft.home.min=Math.min(240,Math.max(10,Math.ceil(r.min/5)*5));homeMsg=`집 → ${a[0]}: ${r.label} 약 ${r.min}분${r.lines?` (${r.lines})`:''}으로 넣었어요.`;autoSave()}
    catch(err){homeMsg=(err&&err.message)||'계산하지 못했어요'}renderMeRows();return}
  }
}
function onPf(e){const el=e.target;if(el&&el.dataset&&el.dataset.pk&&e.type==='change'){const v=+el.value;if(v>0){PK.pack[el.dataset.pk]=v;savePack();renderBudget()}return}
  if(!el||!el.dataset||!el.dataset.pf||!draft) return;let v=el.value;if(el.dataset.type==='num') v=+v;setPath(draft,el.dataset.pf,v);
  if(el.dataset.pf==='startDate'&&el.value){draft.dateSet=true;draft.dateUnknown=false} if(el.dataset.pf==='nights') draft.nightsSet=true;
  if(/^(out|back)\./.test(el.dataset.pf)) draft.flightSet=true; if(/^stays\./.test(el.dataset.pf)) draft.staySet=true;
  if(e.type==='change'&&['nights','startDate','party.adults','party.kids'].includes(el.dataset.pf)) rerenderForm()
  if(['budgetMan','tripMan','localMan'].includes(el.dataset.pf))meSetBudgetHint(budgetHintTxt(draft))}
async function aiFill(kind){
  const ta=$('#paste_'+kind), st=$('#st_'+kind), text=(ta&&ta.value||'').trim();
  if(!st) return; if(!text){pasteSay(kind,'붙여 넣은 내용이 없어요.');return} if(!UI.sample) return;
  pasteMsg[kind]='';progStart('st_'+kind,'예약 내용을 읽는 중이에요 (보통 10~20초)',[],'');
  try{
    const r=await JD.asks.readBooking(UI.sample,kind,text);   // app/data/asks.ts progStop('st_'+kind);
    if(kind==='flight'){
      if(r.startDate&&!isNaN(new Date(r.startDate))) draft.startDate=r.startDate;
      if(r.startDate&&r.endDate){const n=Math.round((new Date(r.endDate)-new Date(r.startDate))/864e5);if(n>=1&&n<=MAX_N) draft.nights=n}
      if(['flight','train','bus'].includes(r.mode)) draft.mode=r.mode;
      ['out','back'].forEach(k=>{const o=r[k]||{};if(AIRPORTS[o.airport]) draft[k].airport=o.airport;if(parse(o.dep)!=null) draft[k].dep=o.dep;if(parse(o.arr)!=null) draft[k].arr=o.arr;if(o.flight) draft[k].flight=String(o.flight).slice(0,12)});
    }else{
      const base=new Date(draft.startDate+'T00:00:00');const idx=ds=>{if(!ds)return null;const v=Math.round((new Date(ds+'T00:00:00')-base)/864e5);return isNaN(v)?null:v};
      const ss=(Array.isArray(r.stays)?r.stays:[]).slice(0,4).map(s=>({name:String(s.name||'숙소').slice(0,30),area:AREAS[s.area]?s.area:firstArea(),checkin:parse(s.checkin)!=null?s.checkin:'15:00',checkout:parse(s.checkout)!=null?s.checkout:'11:00',from:idx(s.checkinDate)??0,to:idx(s.checkoutDate)??nightsOf(draft)}));
      if(ss.length) draft.stays=ss;
    }
    if(kind==='flight') draft.flightSet=true; else draft.staySet=true;
    pasteMsg[kind]='채웠어요. 틀린 칸이 있으면 직접 고쳐 주세요.'; rerenderForm(); setSt('st_'+kind,pasteMsg[kind]);
  }catch(e){pasteSay(kind,e&&e.code==='not_granted'?'AI 키가 맞지 않아서 채우지 못했어요. 직접 입력해 주세요.':'읽지 못했어요. 직접 입력하거나 다시 시도해 주세요.')}
}

// ---------- blocks the viewer makes by hand ----------
const addCustomToData=PLC.addCustom;   // app/data/places.ts
let customLast=null;
function openCustom(editId,startAt,opts){
  const c=editId?CUR.custom.find(x=>x.id===editId):{id:'',name:'',area:firstArea(),cat:'walk',dur:60,cost:0,memo:'',drop:false,tags:''}; if(!c) return;
  const st=startAt!=null?startAt:Math.max(dayStart(UI.day),600);
  // drawn by React: app/screens/CustomSheet.tsx (the same props again with dup while a new name is typed: 388-dedup.js)
  customLast={edit:editId||'',dayLabel:`Day ${UI.day+1} (${DY.days[UI.day].date})`,name:c.name||'',area:c.area,cat:c.cat,dur:c.dur,cost:c.cost??'',memo:c.memo||'',tags:c.tags||'',drop:!!c.drop,
    share:RS.status==='on'&&!PK.pack.manual?!!c.share:null,start:fmt(st),areas:optsOf(AREAS),cats:Object.entries(CATS),durs:[15,30,45,60,90,120,150,180,240].map(m=>[m,durTxt(m)]),
    currency:String(PK.pack.currency),dup:null,card:!!(opts&&opts.card),rev:RENDER.nextSheetRev()};
  window.JEPI_UI.mount('custom',$('#sheet'),customLast);
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false; setTimeout(()=>{const x=$('#cfName');x&&x.focus()},0);
}
function saveCustomForm(f){
  const editId=f.dataset.edit;
  const c={id:editId||('c'+Date.now().toString(36)),name:$('#cfName').value.trim()||'직접 만든 블록',area:$('#cfArea').value,cat:$('#cfCat').value,dur:+$('#cfDur').value||60,cost:Math.max(0,+$('#cfCost').value||0),memo:$('#cfMemo').value.trim(),tags:$('#cfTags').value.trim(),drop:$('#cfDrop').checked,share:!!($('#cfShare')&&$('#cfShare').checked)};
  TRIP.customs.put(c); addCustomToData(c);
  const asCard=f.dataset.card==='1';
  if(asCard){if(!isWish(c.id))toggleWish(c.id);showToast('내 카드에 담았어요')}
  else if(!editId){const st=parse($('#cfStart').value);TRIP.blocks.add({id:c.id,day:UI.day,start:Math.max(dayStart(UI.day),Math.min(1410,st??600)),dur:c.dur})}
  {const prev=editId?(CUR.custom.find(x=>x.id===c.id)||{}):{};if(RS.status==='on'&&(c.share||prev.share!==undefined))shareCustom(c,c.share)}
  closeSheet(); renderAll();
}

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
function goMe(h){UI.tab='me';draft=clone(CUR.profile);renderMe();renderTabs();setTimeout(()=>{const el=[...document.querySelectorAll('#meBox h3')].find(x=>x.textContent.includes(h));if(el)el.scrollIntoView({block:'start'})},0)}
function renderMeta(){if(CUR.profile.kind==='day'){dock({helperHidden:true});hero({meta:`${PK.pack.city} · ${(DY.days[0].iso||'').slice(5).replace('-','/')} 하루 코스 · ${CUR.profile.meet.time}–${CUR.profile.meet.end}`});return}if(CUR.profile.dateUnknown){const n=DY.days.length-1;dock({helperHidden:!needBooking()});hero({meta:`${PK.pack.city} · 날짜 미정 (대략 ${(DY.days[0].iso||'').slice(5).replace('-','/')}부터) · ${n}박 ${n+1}일`});return}dock({helperHidden:!needBooking()});const n=DY.days.length-1;hero({meta:`${PK.pack.city} · ${(DY.days[0].iso||'').replace(/-/g,'.')} – ${(DY.days[n].iso||'').slice(5).replace('-','.')} · ${n}박 ${n+1}일 · ${apName(CUR.profile.out.airport)}`})}


// ---------- destination pack: everything that depends on where the trip goes ----------
const GENERIC_KW=PLC.GENERIC_KW;   // app/data/places.ts
// The destination's places and the lists made from them (AREAS, PM …), loading one (loadPack) and checking what the AI
// sends (cleanPack / cleanPlace) live in app/data/places.ts; the open destination is PK.pack.
PK.pack=null;
const wipe=o=>{for(const k of Object.keys(o)) delete o[k]};
const firstArea=PLC.firstArea, firstGw=PLC.firstGw, nearestArea=PLC.nearestArea, addPackPlace=PLC.addPackPlace, loadPack=PLC.loadPack, savePack=PLC.savePack, packFrom=PLC.packFrom, manualPack=PLC.manualPack, cleanPack=PLC.cleanPack, cleanPlace=PLC.cleanPlace;
// after a destination is loaded: other travelers' 👍 places of that city (070-shared-recs.js)
PLC.connectPlaces(pk=>{if(RS.status!=='off'){SHARED_IDS.clear();rebuildShared()}});
let onbBusy=false, placeCtl=null;
const prog={};
// Status lines and buttons React drew are updated through a handle (app/ui/live.tsx), others the old way.
const liveEl=id=>{const e=document.getElementById(id);return e&&window.JEPI_UI.live(e)};
function progStart(stId,label,btnIds,btnLabel){progStop(stId);const t0=Date.now();const old={};[...new Set(btnIds||[])].forEach(id=>{const b=document.getElementById(id);if(!b)return;const L=window.JEPI_UI.live(b);if(L){old[id]=null;L.label(btnLabel)}else{old[id]=b.textContent;b.textContent=btnLabel}});
  const tick=()=>{const L=liveEl(stId),e=document.getElementById(stId),t=`${label} · ${Math.round((Date.now()-t0)/1000)}초 지났어요`;if(L){L.busy(true);L.text(t)}else if(e){e.classList.add('busy');e.textContent=t}};
  tick();const e=document.getElementById(stId);if(e&&e.scrollIntoView)e.scrollIntoView({block:'nearest'});prog[stId]={iv:setInterval(tick,1000),old}}
function progStop(stId){const p=prog[stId];if(!p)return;clearInterval(p.iv);const L=liveEl(stId),e=document.getElementById(stId);if(L)L.busy(false);else if(e)e.classList.remove('busy');
  Object.entries(p.old).forEach(([id,t])=>{const b=document.getElementById(id);if(!b)return;const BL=window.JEPI_UI.live(b);if(BL)BL.label(null);else if(t!=null)b.textContent=t});delete prog[stId]}
const setSt=(id,t)=>{progStop(id);const L=liveEl(id),e=document.getElementById(id);if(L)L.text(t);else if(e)e.textContent=t};
// what went wrong, in words the person can act on (the app already tried again a few times)
function errText(e,what){const c=e&&e.code;
  return c==='not_granted'?'AI 키가 맞지 않아서 할 수 없어요.':c==='rate_limited'?'요청이 많아 잠시 쉬어야 해요. 1분쯤 뒤에 다시 해 주세요.'
    :c==='timeout'?`${what}. AI가 너무 오래 걸렸어요. 다시 해 주세요.`:c==='busy'?`${what}. AI 서버가 지금 바빠요. 조금 뒤에 다시 해 주세요.`
    :c==='too_long'?`${what}. 답이 너무 길어 잘렸어요. 조건을 줄여 다시 해 주세요.`:c==='invalid_json'?`${what}. AI 답을 읽지 못했어요. 다시 해 주세요.`
    :`${what}. 다시 시도해 주세요.`}
async function genPack(dest,btn){
  if(!UI.sample){setSt('st_pack','AI가 연결되어 있지 않아요. 더보기 → 설정에서 키를 넣어 주세요.');return false}
  if(onbBusy) return false; onbBusy=true; setBusy(true);
  const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),120000);
  progStart('st_pack',`${dest} 정보를 준비하는 중이에요 (보통 20~40초)`,[btn||'genPack','genPack'],'준비하는 중…');
  try{
    const pk=await JD.asks.destination(UI.sample,dest,ctl.signal);   // app/data/asks.ts
    if(!pk){setSt('st_pack','여행지를 찾지 못했어요. 도시 이름을 조금 더 정확히 적어 주세요.');return false}
    CUR.custom=[]; TRIP.save('custom',CUR.custom); CUR.placed=[]; save(); undoSnap=null;
    loadPack(pk); savePack();
    if(draft){draft.dest=pk.city; draft.stays.forEach(s=>{s.area=firstArea();if(/시부야/.test(s.name))s.name='숙소'}); draft.events.forEach(e=>e.area=firstArea()); draft.out.airport=draft.back.airport=firstGw(); if(pk.intl) draft.mode='flight'}
    if($('#onb').hidden&&draft&&UI.tab==='me')autoSave();setSt('st_pack',`${pk.city} 준비 완료 · 동네 ${pk.areas.length}곳 · 공항·역 ${pk.gateways.length}곳`); return true;
  }catch(e){setSt('st_pack',e&&e.code==='cancelled'?'2분 안에 답을 받지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.':errText(e,'여행지를 준비하지 못했어요')+(e&&e.code?` (${e.code})`:''));return false}
  finally{clearTimeout(to);onbBusy=false; setBusy(false)}
}
async function morePlaces(n,stId,focus,signal){
  if(!UI.sample) return 0;
  progStart(stId,n>15?(CUR.kws.length?'고른 취향에 맞는 장소 후보를 찾는 중이에요 (보통 1~2분)':`${PK.pack.city}에서 가 볼 만한 곳을 골고루 찾는 중이에요 (보통 1~2분)`):'장소를 찾는 중이에요 (보통 30초~1분)',stId==='moreSt'?['moreBtn']:[],'찾는 중…');
  try{
    const ids=await JD.asks.morePlaces(UI.sample,n,focus,signal), added=ids.length;   // app/data/asks.ts
    FRESH.clear(); ids.forEach(id=>FRESH.add(id)); setSt(stId,added?`새 장소 ${added}곳을 찾았어요. 장소 탭 맨 위 "✨ 방금 찾은 곳"에 모아 뒀어요.`:'이미 있는 곳과 겹쳐서 새로 추가할 장소가 없었어요. 찾는 말을 바꿔 보세요 (예: 현지인 맛집, 조용한 카페).'); return added;
  }catch(e){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. 장소 블록 탭에서 언제든 다시 찾을 수 있어요.':errText(e,'장소를 찾지 못했어요'));return 0}
}
function setBusy(b){onbFrame({nextOff:b,prevOff:b||onbStep===0,skipOff:b,exampleOff:b});['genPack','meSave'].forEach(id=>{const e=document.getElementById(id);if(!e)return;const v=b,L=window.JEPI_UI.live(e);if(L)L.disabled(v);else e.disabled=v})}
async function onbAdvance(){
  if(onbBusy) return;
  if(onbStep===0){
    if(draft.kind==='day'){if(draft.dateSet===false){setSt('st_dates','날짜를 골라 주세요.');return}}else if(!datesReady(draft)){needDates();return}
    const dest=String(draft.dest||'').trim();
    if(!dest){setSt('st_pack','여행지를 먼저 적어 주세요.');return}
    if(norm(dest)!==norm(PK.pack.city)){
      if(UI.sample){if(!(await genPack(dest,'onbNext')))return}
      else{CUR.custom=[];TRIP.save('custom',CUR.custom);CUR.placed=[];save();loadPack(manualPack(dest));savePack();draft.stays.forEach(s=>s.area=firstArea());draft.events.forEach(e=>e.area=firstArea());draft.out.airport=draft.back.airport=firstGw()}
    }
  }
  if(onbStep<ONB.length-1){onbStep++;renderOnb()} else await finishOnb();
}
// 여행지 (drawn by React: TripForms.tsx Dest). Not decided yet → the finder (OnbFinder.tsx).
const partDest=p=>p.destMode==='find'?partFinder(p):FORMS.dest(p,!!UI.sample);   // app/view/forms.ts

// ---------- demo trip: a generic first-timer's Osaka, 3 nights / 4 days ----------
// Used only by "데모 둘러보기" (see 381-welcome-demo.js). No personal taste in here on purpose.
// hours: [open, close] in minutes from midnight · closed: weekdays (0 = Sunday) · cost: [yen per person, note]
// the demo trip's data: app/data/demo-osaka.ts
const demoOsaka=JD.demoOsaka.demoOsaka;
// ---------- 👍 여행자 추천 (app/data/recs.ts: loading, counting, saving on the server) ----------
// Here: how a place becomes a saved entry, and how other travelers' places join this trip's place list.
const REC=JD.recs, RS=REC.state;
const SHARED_IDS=new Set();
const cityKey=()=>REC.cityKey(PK.pack.city||'');
const placeKey=p=>REC.placeKey(PK.pack.city||'',p.name);
function recHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function entryOf(p){const h=p.always?null:p.hours;
  return {k:placeKey(p),city:cityKey(),name:p.name,local:p.local||'',cat:p.cat,area:p.area,lat:+p.ll[0]||0,lng:+p.ll[1]||0,dur:p.dur,
    open:h?`${fmt(h[0])}-${fmt(h[1])}`:null,closed:p.closed||[],cost:costOf(p.id)[0]||0,note:String(p.note||'').slice(0,160),tags:tagsOf(p.id).slice(0,6),made:!!p.custom,at:Date.now()}}
function keepShared(){
  let ch=false;
  CUR.placed.forEach(b=>{const p=PM[b.id];if(p&&p.shared&&!PK.pack.places.some(x=>x.id===p.id)){const c=Object.assign({},p);delete c.shared;c.fromUsers=true;PK.pack.places.push(c);ch=true}});
  if(ch) savePack();
}
// other travelers' places of this city join the place list (and drop out again when no longer recommended or used)
function rebuildShared(){
  const used=new Set(CUR.placed.map(b=>b.id));
  for(const id of [...SHARED_IDS]){if(used.has(id)||PK.pack.places.some(x=>x.id===id))continue;const i=P.findIndex(p=>p.id===id);if(i>=0)P.splice(i,1);delete PM[id];SHARED_IDS.delete(id)}
  REC.others(PK.pack.city||'',new Set(P.map(placeKey))).forEach((e,k)=>{const id='s'+recHash(k);if(PM[id])return;
    const pl=cleanPlace({name:e.name,local:e.local,cat:e.cat,lat:e.lat,lng:e.lng,dur:e.dur,open:e.open,closed:e.closed,cost:e.cost,tags:e.tags,note:e.note||(e.made?'다른 여행자가 직접 올린 장소예요.':'다른 여행자가 추천한 장소예요.')});
    if(!pl)return; pl.id=id; pl.shared=true; pl.ai=false; pl.userMade=!!e.made; addPackPlace(pl); SHARED_IDS.add(id)});
}
async function recsFetch(){ if(await REC.fetchCity(PK.pack.city||'')){rebuildShared();renderTray()} }
// 👍 on a card or in a block's sheet: counts change right away, then once more when the server has answered
async function toggleRec(id){
  const p=PM[id]; if(!p) return;
  if(RS.status!=='on'){REC.toggle(PK.pack.city||'',entryOf(p));renderTray();return}   // only says "로그인하면 …"
  const pr=REC.toggle(PK.pack.city||'',entryOf(p)); rebuildShared();
  renderTray(); if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid);
  await pr; renderTray();
}
// a place I made: shared with other travelers or not (its 공유 box)
function shareCustom(c,on){
  if(RS.status!=='on') return;
  const p=PM[c.id]; if(!p) return; const k=placeKey(p);
  const rest=RS.mine.filter(e=>e.k!==k), pr=REC.setMine(PK.pack.city||'',on?[...rest,entryOf(p)]:rest);
  rebuildShared(); pr.then(renderTray);
}
function initRecs(){ if(!PK.pack.manual) recsFetch().catch(()=>{}) }

// refresh everyone's 👍 along with the account sync (every minute while open)
SYNC_AFTER_PULL.push(()=>!PK.pack.manual?recsFetch().catch(()=>{}):null);
// (re)load when the trip's city changes, or every few minutes while browsing the 장소 tab
let recCity=null, recAt=0;
function recsMaybe(){
  if(PK.pack.manual||!cityKey()) return;
  if(cityKey()===recCity&&Date.now()-recAt<180000) return;
  recCity=cityKey(); recAt=Date.now(); recsFetch().catch(()=>{recCity=null});
}
// ---------- small to-dos attached to blocks (luggage, waiting lists, pick-ups, rentals, cash, tax refund) ----------
// marks, their pairs and warnings, and the sheet's 할 일 표시 box: app/data/marks.ts
const MK=JD.marks, MARKS=MK.MARKS, PAIRS=MK.PAIRS;
CUR.fmarks=null;
const toggleMark=(uid,m)=>TRIP.toggleMark(uid,m);   // app/data/trip.ts
function makePairBlock(uid,T){
  const it=dayItems(UI.day).find(x=>x.uid===uid); if(!it) return;
  // put the closing block before the next block that needs it (lodging, airport) or late in the day
  const d=UI.day; let start;
  const nx=dayItems(d).find(x=>x.start>it.end&&x.kind==='fixed'&&(x.uid==='f7'||/^ci|^co|^ev/.test(x.uid)));
  if(T==='wait') start=it.end+60;
  else if(nx) start=nx.start-PAIRS[T].dur-30;
  else start=Math.min(1350,Math.max(it.end+60,1230));
  start=Math.max(dayStart(d),Math.min(1410,Math.round(start/15)*15));
  const c={id:'c'+Date.now().toString(36),name:`${PAIRS[T].pair} · ${it.name.replace(/ \(.*\)$/,'')}`.slice(0,40),area:nearestArea(it.ll)||firstArea(),cat:T==='wait'?'food':'trip',dur:PAIRS[T].dur,cost:0,memo:`${it.name}에서 시작한 일을 마무리해요.`,tags:'',drop:false,ll:it.ll};
  TRIP.customs.put(c); addCustomToData(c);
  TRIP.blocks.add({id:c.id,day:d,start,dur:c.dur,mk:[T+'-']});
  UI.day=d; closeSheet(); renderAll();
}

// ---------- check AI changes before showing them: simulate, nudge times, report what is left ----------
// The changes themselves (apply, try out on a copy, nudge times) live in app/data/ops.ts; it asks here for the day's warnings.
const OPS=JD.ops;
OPS.connectOps({dayStart:d=>dayStart(d),days:()=>DY.days.length,items:d=>analyze(d).items,fresh:id=>FRESH.add(id)});
const applyOpsCore=OPS.apply, repairOps=OPS.repair;
// ---------- booking helper: wish list → where to stay → flight times → search links ----------
CUR.wish=[]; let hStep=0, hVibe=null, hBusy=false;
const isWish=id=>TRIP.wish.has(id), toggleWish=id=>TRIP.wish.toggle(id);   // app/data/trip.ts
const needBooking=()=>CUR.profile.kind!=='day'&&(CUR.profile.bookedFlight===false||CUR.profile.bookedStay===false);
// the helper's steps (areas to stay, time slots, links): app/view/helper.ts
const areaScores=()=>window.JEPI_UI.view.helper.areaScores();
async function resolveWishes(text,stId){
  if(!UI.sample||!text.trim()) return;
  progStart(stId,'목록의 장소를 찾는 중이에요 (보통 30초~1분)',['wishPasteBtn'],'찾는 중…');
  try{
    const {n,added}=await JD.asks.wishesFromList(UI.sample,text); progStop(stId); renderHelper(); renderTray(); setSt(stId,n?`${n}곳에 ♥를 붙였어요${added?` (새로 찾은 곳 ${added}곳)`:''}.`:'목록에서 장소를 찾지 못했어요.');
  }catch(e){setSt(stId,errText(e,'장소를 찾지 못했어요'))}
}
async function askVibes(){
  if(!UI.sample||hBusy) return; hBusy=true; const top=areaScores().slice(0,3);
  progStart('st_vibe','동네 분위기를 정리하는 중이에요 (보통 15~30초)',['vibeBtn'],'정리하는 중…');
  try{hVibe=await JD.asks.vibes(UI.sample,top); progStop('st_vibe');
  }catch(e){setSt('st_vibe',errText(e,'정리하지 못했어요'))} finally{hBusy=false;renderHelper()}
}
// What was pressed inside the 예약 도우미 (HelperBody.tsx tells: its name and value)
function helperAct(n,v,v2){
  switch(n){
  case 'paste': resolveWishes(v||'','st_wish');return;   // ① the pasted list of names
  case 'vibe': askVibes();return;
  case 'hotels': askHotels(v);return;
  case 'route': askRoutes();return;
  case 'setarea': {const k=v;CUR.profile.stayPicked=k;CUR.profile.stays.forEach((st,i)=>{if(i===0||CUR.profile.bookedStay===false){st.area=k;if(CUR.profile.bookedStay===false)st.name=`숙소 (미정 · ${AREAS[k][0]})`}});TRIP.save('profile',CUR.profile);buildDays();renderHelper();return}
  case 'slot': {const [a,d]=String(v).split(',').map(Number);setSlot(a,d);return}
  case 'radio': CUR.profile[v]=v2==='true';TRIP.save('profile',CUR.profile);renderHelper();return;   // ④ 예약 상태
  case 'toMe': closeHelper();UI.tab='me';draft=clone(CUR.profile);renderMe();renderTabs();return;
  }
}
// the frame (drawn by React: app/screens/Frames.tsx) shows what helperView says; the step itself goes into #helperBody
let helperView={open:false,step:'',title:'',prevOff:false,nextLabel:'다음'};
function drawHelperFrame(){window.JEPI_UI.mount('helperFrame',$('#helperMount'),helperView)}
function helperOpen(){return helperView.open}
function helperShow(on){helperView={...helperView,open:on};drawHelperFrame()}
// prev / next / close were pressed in the frame
function helperFrameAct(n){
  if(n==='prev'){if(hStep>0){hStep--;renderHelper();$('#helper').scrollTop=0}return}
  if(n==='next'){if(hStep<H_STEPS.length-1){hStep++;renderHelper();$('#helper').scrollTop=0}else closeHelper();return}
  if(n==='close')closeHelper()
}
function openHelper(step){hStep=step||0;slotPicked=null;$('#meBox').innerHTML='';helperShow(true);renderHelper()}
function closeHelper(){helperShow(false);renderAll();maybeCoach();if(UI.tab==='me'){draft=clone(CUR.profile);renderMe()}}
const H_STEPS=['가고 싶은 곳 고르기','숙소 동네 정하기','교통편 시간대 정하기','예약하고 일정에 넣기'];
function renderHelper(){
  if(!helperView.open) return;
  helperView={...helperView,step:`${hStep+1} / ${H_STEPS.length}`,title:H_STEPS[hStep],prevOff:hStep===0,nextLabel:hStep===H_STEPS.length-1?'일정표로 가기':'다음'}; drawHelperFrame();
  const el=$('#helperBody'); if(!el) return;
  // drawn by React: app/screens/HelperBody.tsx
  const st=window.JEPI_UI.view.helper.step(hStep,{vibe:hVibe,hotelRecs,routeInfo,slotPicked,ai:!!UI.sample});
  window.JEPI_UI.mount('helper',el,{step:st,ai:!!UI.sample,rev:++helperRev});
}
let helperRev=0, slotPicked=null;
function setSlot(a,d){
  const M=CUR.profile.mode, dur=PK.pack.intl?150:70;
  CUR.profile.out.arr=fmt(a); CUR.profile.out.dep=fmt(Math.max(0,a-dur)); CUR.profile.back.dep=fmt(d); CUR.profile.back.arr=fmt(Math.min(1439,d+dur));
  TRIP.save('profile',CUR.profile); buildDays(); slotPicked=`${a},${d}`; renderHelper();
}

// ---------- season & time-of-day: what is special on these dates, and when each place is best ----------
// season facts of this trip and what they mean for places: app/data/season.ts
const SN=JD.season, tripKey=SN.tripKey, seasonOf=SN.seasonOf;
async function genSeason(stId,signal){
  if(!UI.sample) return false;
  progStart(stId,'이 시기만의 특징과 행사를 찾는 중이에요 (보통 30초~1분)',['seasonBtn'],'찾는 중…');
  try{
    const n=await JD.asks.seasonInfo(UI.sample,signal);   // app/data/asks.ts
    progStop(stId); renderAll(); setSt(stId,`이 시기 정보를 받았어요${n?` · 시즌 장소 ${n}곳 추가`:''}.`); return true;
  }catch(e){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. "확인할 것" 탭에서 다시 받을 수 있어요.':errText(e,'시즌 정보를 받지 못했어요'));return false}
}
// 준비하기 → 이 시기 여행 팁 (drawn by React: Checks.tsx)
function seasonInfo(){
  const s=seasonOf(), stale=!!(PK.pack.season&&!s);
  return {got:s?{sun:`${s.sunrise?`🌅 일출 약 ${s.sunrise} · `:''}${s.sunset?`🌇 일몰 약 ${s.sunset}`:''}`,weather:s.weather||'',notes:(s.notes||[]).map((t,i)=>ckInfo('sn'+i+'_'+tripKey(),t))}:null,
    stale,canAsk:!!(UI.sample&&!PK.pack.manual)};
}

// ---------- destination finder: for travelers who have not picked a place yet ----------
let destRecs=null, destAsked=[], destBusy=false;
// drawn by React: app/screens/OnbFinder.tsx
function partFinder(p){
  return {f:'finder',ai:!!UI.sample,party:p.party.type,reach:p.reach,budget:p.budget,budgetMan:p.budgetMan||'',nights:nightsOf(p),
    chips:[...new Set([...GENERIC_KW,...CUR.kws])].map(k=>({k,on:CUR.kws.some(x=>norm(x)===norm(k))})),
    styleRows:STYLE_ROWS,style:clone(p.style||{}),styleOpen,want:p.want||'',recs:destRecs?clone(destRecs):null,asked:clone(destAsked)};
}
async function recommendDest(mode){
  if(!UI.sample||destBusy) return; destBusy=true; mode=mode||{};
  const prev=(destRecs||[]).map(d=>d.city);
  const want=(($('#destWant')||{}).value||'').trim(); draft.want=want; if(want&&!draft.purpose) draft.purpose=want.slice(0,80);
  const stId=mode.ask?'st_ask':mode.more?'st_more':'st_dest';
  progStart(stId,mode.ask?`${mode.ask}이(가) 맞는지 살펴보는 중이에요 (보통 15~30초)`:'이 조건에 맞는 여행지를 고르는 중이에요 (보통 20~40초)',['destRecBtn','destMoreBtn','destAskBtn'],'고르는 중…');
  const q=fixProfile(draft);
  try{
    const got=await JD.asks.destinations(UI.sample,q,mode,prev,want);   // the question and tidying the answer: app/data/asks.ts
    if(mode.ask) destAsked=[...got.slice(0,1),...destAsked.filter(d=>!got.some(g=>g.city===d.city))].slice(0,3);
    else destRecs=mode.more?[...(destRecs||[]),...got.filter(g=>!prev.includes(g.city))].slice(0,15):got;
    progStop(stId); TRIP.kws.save(CUR.kws); rerenderForm();
    if(mode.ask){setSt('st_ask',got.length?'아래에 정리했어요.':'정보를 찾지 못했어요. 이름을 조금 더 정확히 적어 주세요.');const c=document.getElementById('asked-0');if(c)c.scrollIntoView({block:'nearest'})}
    else setSt(stId,(destRecs||[]).length?(mode.more?'아래에 더 추가했어요.':'아래에서 마음에 드는 곳을 골라 주세요.'):'추천을 받지 못했어요. 조건을 바꿔 다시 해 보세요.');
  }catch(e){setSt(stId,errText(e,'추천을 받지 못했어요'))} finally{destBusy=false}
}

// ---------- optional travel style (every item defaults to "doesn't matter") ----------
const STYLE_ROWS=JD.days.STYLE_ROWS;   // app/data/days.ts
let styleOpen=false;

// ---------- optional money budget (per person, in 만원) ----------
const budgetParts=TV.budgetParts;   // app/data/traveler.ts
const roomCap=TV.roomCap;   // app/data/traveler.ts
// 이번 여행 → 예산 (drawn by React: TripForms.tsx Budget). The hint under it follows what is typed (meSetBudgetHint).
const budgetHintTxt=FORMS.budgetHint;   // app/view/forms.ts

// ---------- finding the trip's direction through a short conversation (only the summary is kept) ----------
const TALK_MAX=5;
const TALK_OPEN={q:'요즘 어떤 마음이 들어서 여행을 떠올리게 됐어요? 막연해도 괜찮아요.',o:['그냥 답답해서 벗어나고 싶어요','지쳐서 푹 쉬고 싶어요','새로운 자극이 필요해요','생각을 정리하고 싶어요']};
let talk=null;
function talkReset(){talk={msgs:[{role:'a',text:TALK_OPEN.q}],options:TALK_OPEN.o.slice(),n:0,busy:false,summary:null}}
// 처음 설정 parts drawn by React (app/screens/OnbBody.tsx)
const partBanner=FORMS.banner;   // app/view/forms.ts
function partJP(){return {f:'jp',keyBox:!!(STANDALONE&&!UI.sample),keyHelpHTML:KEY_HELP.anthropic,importBox:!inClaude()}}
// drawn by React: app/screens/OnbTalk.tsx
function partTalk(p){
  if(!talk) talkReset();
  const t=talk, S=t.summary, last=[...t.msgs].reverse().find(m=>m.role==='a'), hist=[];
  const ok=t.msgs.filter(m=>!m.err);for(let k=0;k<ok.length;k++){const m=ok[k];if(m.role==='u')hist.push([ok[k-1]?ok[k-1].text:'',m.text])}
  const d=p.direction||{};
  return {f:'talk',n:t.n,max:TALK_MAX,hist,last:last?last.text:'',busy:!!t.busy,options:t.options.slice(),failed:!!t.failed,
    done:S?{note:S.note||p.purpose||'',purpose:p.purpose??'',chips:[...new Set([...S.keywords,...CUR.kws])].map(k=>({k,on:CUR.kws.some(x=>norm(x)===norm(k))})),
      pace:p.pace,solo:p.party.type==='solo',social:p.social,avoid:d.avoid||'',applyLabel:S.dest?`${S.dest}(으)로 이어 가기`:'이 방향으로 여행지 찾으러 가기'}:null};
}
async function talkSend(text,opt){
  opt=opt||{};
  if(!UI.sample||!talk||talk.busy) return;
  if(opt.retry){ if(talk.failed&&talk.msgs.length&&talk.msgs[talk.msgs.length-1].err) talk.msgs.pop(); text=talk.lastText; }
  if(!text) return;
  const finish=text==='__finish__';
  if(!opt.retry&&!finish){talk.msgs.push({role:'u',text:String(text).slice(0,300)}); talk.n++;}
  talk.lastText=text; talk.failed=null; talk.options=[]; talk.busy=true; rerenderForm(); scrollTalk();
  const force=talk.n>=TALK_MAX||finish;
  const dates=datesReady(draft)?(draft.dateUnknown?`Dates: not fixed (roughly a month from now), ${nightsOf(draft)} nights.`:`Dates: from ${draft.startDate}, ${nightsOf(draft)} nights.`):'Dates and trip length: not decided yet. Do not assume any; ask about timing and length in the practical question if the user has not said.';
  let r=null;
  try{ r=await JD.asks.talkTurn(UI.sample,draft,talk.msgs,dates,force); }   // the question (and rescuing a broken answer): app/data/asks.ts
  catch(e){
    if(!r){
      talk.busy=false; talk.failed={code:e&&e.code};
      const msg={not_granted:'AI 키가 맞지 않아서 이어 갈 수 없어요. "건너뛰고 직접 고를게요"를 눌러 주세요.',rate_limited:'지금 요청이 많아요. 1분쯤 뒤에 "다시 시도하기"를 눌러 주세요.',refused:'이 내용으로는 이어 가기 어려워요. 표현을 조금 바꿔서 다시 적어 주세요.',session_expired:'로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.'}[e&&e.code]||'답을 정리하다가 끊겼어요. "다시 시도하기"를 눌러 주세요.';
      talk.msgs.push({role:'a',text:msg,err:true}); rerenderForm(); scrollTalk(); return;
    }
  }
  talk.busy=false;
  talk.msgs.push({role:'a',text:String((r&&r.reply)||'좋아요, 조금 더 들려주세요.').slice(0,400)});
  talk.options=(Array.isArray(r&&r.options)?r.options:[]).map(x=>String(x).slice(0,40)).slice(0,4);
  if(r&&r.done&&r.summary&&typeof r.summary==='object'){const S=r.summary;
    talk.summary={purpose:String(S.purpose||'').slice(0,80),keywords:(Array.isArray(S.keywords)?S.keywords:[]).map(x=>String(x).slice(0,16)).slice(0,6),note:String(S.note||'').slice(0,160),dest:String(S.dest||'').slice(0,30)};
    if(talk.summary.purpose) draft.purpose=talk.summary.purpose;
    if(['slow','normal','full'].includes(S.pace)) draft.pace=S.pace;
    if(['alone','some','social'].includes(S.social)) draft.social=S.social;
    if(['solo','couple','friends','family'].includes(S.party)) draft.party.type=S.party;
    if(['domestic','near','far'].includes(S.reach)) draft.reach=S.reach;
    if(Number.isInteger(+S.nights)&&+S.nights>=1&&+S.nights<=MAX_N&&S.nights!==null){draft.nights=+S.nights;draft.nightsSet=true}
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(S.startDate||''))&&String(S.startDate)>=isoPlus(0)){draft.startDate=S.startDate;draft.dateSet=true;draft.dateUnknown=false}
    draft.direction={purpose:talk.summary.purpose,avoid:String(S.avoid||'').slice(0,80),note:talk.summary.note};
    TRIP.keywords.addAll(talk.summary.keywords);
  }
  rerenderForm(); scrollTalk();
}
function scrollTalk(){const c=document.querySelector('.talk2');if(c)c.scrollIntoView({block:'start'});const q=document.getElementById('talkInput');if(q&&!(talk&&talk.busy)&&matchMedia('(min-width:700px)').matches)q.focus({preventScroll:true})}

// ---------- named lodging candidates and route advice (AI knowledge, verify prices via links) ----------
let hotelRecs={}, routeInfo=null, hrBusy=false;
async function askHotels(k){
  if(!UI.sample||hrBusy||!AREAS[k]) return; hrBusy=true; const area=AREAS[k][0], st='st_hotel_'+k;
  progStart(st,`${area} 숙소 후보를 고르는 중이에요 (보통 20~40초)`,['hotelBtn_'+k],'고르는 중…');
  const cap=roomCap();
  try{
    hotelRecs[k]=await JD.asks.hotels(UI.sample,k,cap);
    progStop(st); renderHelper(); setSt(st,hotelRecs[k].length?'가격과 빈방은 링크에서 꼭 확인하세요.':'후보를 찾지 못했어요.');
  }catch(e){setSt(st,errText(e,'숙소 후보를 받지 못했어요'))} finally{hrBusy=false}
}
// named stays for one area (drawn by React: HelperBody.tsx)
async function askRoutes(){
  if(!UI.sample||hrBusy) return; hrBusy=true;
  progStart('st_route','다니는 노선과 항공사를 정리하는 중이에요 (보통 20~40초)',['routeBtn'],'정리하는 중…');
  try{
    routeInfo=await JD.asks.routes(UI.sample);
    progStop('st_route'); renderHelper(); setSt('st_route','시간표와 가격은 아래 검색 링크에서 확인하세요.');
  }catch(e){setSt('st_route',errText(e,'노선 정보를 받지 못했어요'))} finally{hrBusy=false}
}
// ---------- J / P modes ----------
function setJP(m,quiet){UI.jp=m==='P'?'P':'J';dock({placeholder:UI.jp==='P'?'뭐 하고 싶어요? 말로 해도 돼요':'AI에게 말로 부탁하기'});document.body.classList.toggle('mode-p',UI.jp==='P');hero({jp:UI.jp});if(!quiet)store.set('gp.jp',UI.jp)}

// ---------- one-day course ----------
// 하루 코스: 여행지 + 언제·어디서 만나요 + 누구와 (drawn by React: TripForms.tsx)
function partsDay(p){const m=p.meet||{};
  return [partDest(p),{f:'day',date:p.dateSet!==false?String(p.startDate??''):'',time:m.time||'11:00',end:m.end||'20:00',area:m.area,areas:optsOf(AREAS)},partParty(p)]}

// ---------- DICE: roll for an empty slot ----------
// what the 🎲 sheet shows and where the dice can land: app/view/dice.ts (the rolls and choices stay here)
const DICEV=window.JEPI_UI.view.dice;
// the 🎲 sheet and the P모드 board (rolling, 이걸로, 코스): app/flow/dice.ts — the rolls and choices live there (DFLOW.st)
const DFLOW=window.JEPI_UI.flow.dice, dice=DFLOW.st.dice, eat=DFLOW.st.eat, doS=DFLOW.st.doS, pSt=DFLOW.st.pSt;
DFLOW.connect({morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),fresh:()=>FRESH,setSt:(id,t)=>setSt(id,t),toast:m=>showToast(m),renderSettings:()=>renderSettings(),
  diceOpenAnim:()=>diceOpenAnim(),saveCourse:()=>saveCourse(),keyBad:()=>keyBad,demoOn:()=>!!DEMO.on});
const openDiceTab=DFLOW.openDiceTab, diceFromUrl=DFLOW.diceFromUrl, diceAct=DFLOW.diceAct, renderPView=DFLOW.renderPView, pPlaceNow=DFLOW.pPlaceNow, pAIRec=DFLOW.pAIRec, pviewAct=DFLOW.pviewAct;
// ---------- quick start (P, and any one-day course): a few taps ----------
const nextSat=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return isoPlus(d.getDay()===6?0:add)};
// what P모드 and the 가볍게 시작 form show: app/view/pview.ts (the drawn card and the chosen die stay here)
const PVIEW=window.JEPI_UI.view.pview, SLOTS=PVIEW.SLOTS, partQuick=PVIEW.partQuick;
async function quickStart(){
  const q=draft.q||{}, dest=String(draft.dest||'').trim();
  if(!dest){setSt('st_pack','어디로 갈지 적어 주세요.');return}
  if(!q.when||(q.when==='pick'&&draft.dateSet===false)){setSt('st_pack','언제 갈지 골라 주세요.');return}
  if(q.len===''||q.len==null){setSt('st_pack','얼마나 갈지 골라 주세요.');return}
  if(q.when!=='pick'){draft.startDate=q.when==='today'?isoPlus(0):q.when==='tomorrow'?isoPlus(1):nextSat();}
  draft.dateSet=true; draft.dateUnknown=false; draft.nightsSet=true;
  if(q.len==='0'){const sl=SLOTS.find(s=>s[0]===q.slot)||SLOTS[1];let st=sl[2];
    if(q.when==='today'){const n=new Date(),now=n.getHours()*60+n.getMinutes();if(now+30>st)st=Math.min(1320,Math.ceil((now+30)/30)*30)}
    draft.kind='day'; draft.meet=Object.assign({},draft.meet||{},{time:fmt(st),end:fmt(Math.max(st+180,sl[3]))});}
  else{draft.kind='trip'; draft.nights=+q.len; draft.bookedFlight=true; draft.bookedStay=true; draft.flightSet=false; draft.staySet=false;}
  if(norm(dest)!==norm(PK.pack.city)){
    if(UI.sample){if(!(await genPack(dest,'quickStart')))return}
    else{CUR.custom=[];TRIP.save('custom',CUR.custom);CUR.placed=[];save();loadPack(manualPack(dest));savePack()}
  }
  draft.dest=PK.pack.city; if(draft.kind==='day'&&!AREAS[draft.meet.area]) draft.meet.area=firstArea();
  await finishOnb();
}
// ---------- P view: the day as a board game (drawn by React: app/screens/PView.tsx) ----------
// ---------- my plans: several saved plans, account sync, sharing ----------
const PLANS=JD.plans;   // a plan's name, contents and text: app/data/plans.ts
PL.plans=[]; PL.curPlan=''; let planTimer=null, planMsg='', delArm='';
const planName=PLANS.planName, planData=PLANS.planData, planMeta=PLANS.planMeta;   // app/data/plans.ts
function savePlans(){TRIP.plans.saveList(PL.plans,PL.curPlan);syncSoon()}
function snapshotCurrent(){
  if(!PL.curPlan) return; let p=PL.plans.find(x=>x.id===PL.curPlan);
  if(!p){p={id:PL.curPlan,name:''};PL.plans.unshift(p)}
  const m=planMeta(); Object.assign(p,{dates:m.dates,blocks:m.blocks,kind:m.kind,updated:Date.now()}); if(!p.custom_name) p.name=planName();
  TRIP.plans.put(PL.curPlan,planData()); savePlans();
}
function touchPlan(){clearTimeout(planTimer);planTimer=setTimeout(()=>{if($('#onb').hidden)snapshotCurrent()},1200)}
function applyPlanData(d){
  d=d||{}; loadPack(packFrom(d.pack)||blankPack());
  CUR.custom=Array.isArray(d.custom)?d.custom:[]; CUR.custom.forEach(addCustomToData);
  CUR.profile=d.profile&&typeof d.profile==='object'?d.profile:clone(PROFILE_EXAMPLE); fixProfile(CUR.profile);
  CUR.placed=(Array.isArray(d.placed)?d.placed:[]).filter(b=>PM[b.id]).map(b=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
  CUR.fmarks=d.fmarks&&typeof d.fmarks==='object'?d.fmarks:{}; CUR.wish=Array.isArray(d.wish)?d.wish:[]; CUR.meals=d.meals&&typeof d.meals==='object'?d.meals:{}; CUR.done=d.done&&typeof d.done==='object'?d.done:{};
  TRIP.save('profile',CUR.profile); savePack(); TRIP.save('custom',CUR.custom); TRIP.save('fmarks',CUR.fmarks); TRIP.save('wish',CUR.wish); TRIP.save('meals',CUR.meals); TRIP.save('done',CUR.done);
  chat=[]; undoSnap=null; UI.aiState=null; UI.selected=null; pSt.draw=null; hVibe=null; hotelRecs={}; routeInfo=null; destRecs=null; destAsked=[];
  buildDays(); UI.day=0; save(); renderAll();
}
function openPlan(id){
  if(id===PL.curPlan) return; snapshotCurrent();
  const d=TRIP.plans.get(id); if(!d){planMsg='이 계획을 불러오지 못했어요.';renderPlans();return}
  PL.curPlan=id; savePlans(); applyPlanData(d); if(CUR.profile.kind==='day'&&UI.jp!=='P') setJP('P'); UI.tab='timeline'; renderTabs(); planMsg='';
}
function newPlan(){
  const prevP=CUR.profile; snapshotCurrent(); PL.curPlan='p'+Date.now().toString(36); savePlans();
  CUR.custom=[];CUR.placed=[];CUR.fmarks={};CUR.wish=[];CUR.meals={};CUR.done={};
  loadPack(blankPack()); savePack();
  CUR.profile=clone(PROFILE_EXAMPLE); Object.assign(CUR.profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});
  carryTaste(prevP,CUR.profile); applyPlanData({profile:CUR.profile,pack:blankPack()}); UI.tab='timeline'; renderTabs(); openOnb();
}
function dupPlan(id){snapshotCurrent();const d=TRIP.plans.get(id),src=PL.plans.find(x=>x.id===id);if(!d||!src)return;
  const nid='p'+Date.now().toString(36);TRIP.plans.put(nid,d);const p=Object.assign({},src,{id:nid,name:src.name+' (복사본)',custom_name:true,updated:Date.now()});PL.plans.unshift(p);savePlans();planMsg='복사본을 만들었어요.';renderPlans()}
function delPlan(id){if(delArm!==id){delArm=id;renderPlans();return}delArm='';
  PL.plans=PL.plans.filter(x=>x.id!==id);TRIP.plans.del(id);
  if(id===PL.curPlan){if(PL.plans[0]){PL.curPlan='';openPlan(PL.plans[0].id)}else{PL.curPlan='';newPlan()}}savePlans();renderPlans()}
function renamePlan(id,name){const p=PL.plans.find(x=>x.id===id);if(!p||!name)return;p.name=name.slice(0,40);p.custom_name=true;p.updated=Date.now();savePlans();renderPlans();renderPlanBtn()}
// sharing
const shareCode=()=>shareLink();   // a share link (240-share-link.js)
const lastCode='';
function openCode(raw){
  const m=/[#&]s=([A-Za-z0-9_-]+)/.exec(String(raw||''));if(m){location.hash='s='+m[1];openShared();return}
  planMsg='친구에게 받은 공유 링크를 통째로 붙여 넣어 주세요.';renderPlans();
}
const planText=PLANS.planText;   // 카톡용 글: app/data/plans.ts
const inClaude=()=>!!(window.claude&&window.claude.use);
function downloadText(name,text){
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:name.endsWith('.json')?'application/json':'text/plain'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}catch(_){planMsg='파일을 받지 못했어요.';renderPlans()}
}
// restore a backup file (.json made by "백업 파일 받기")
function importBackup(file,after){
  if(!file) return; const rd=new FileReader();
  rd.onload=()=>{try{const v=JSON.parse(String(rd.result||''));if(v&&v.jepi===2){onbFrame({open:false});if(!importAll(v))throw 0;UI.tab='timeline';renderTabs();if(after)after(true);return}if(!v||!v.data||!v.data.profile)throw 0;
      snapshotCurrent(); const nid='p'+Date.now().toString(36); TRIP.plans.put(nid,v.data);
      PL.plans.unshift({id:nid,name:String(v.name||'불러온 계획').slice(0,40),custom_name:true,updated:Date.now()}); PL.curPlan=nid; savePlans();
      onbFrame({open:false}); applyPlanData(v.data); snapshotCurrent(); UI.tab='timeline'; renderTabs(); planMsg='백업을 불러왔어요.'; if(after) after(true);
    }catch(_){planMsg='JEPI 백업 파일이 아니거나 손상됐어요.';renderPlans();setSt('st_import','JEPI 백업 파일이 아니거나 손상됐어요.');if(after)after(false)}};
  rd.readAsText(file);
}
async function copyText(text){try{await navigator.clipboard.writeText(text);planMsg='복사했어요. 카톡에 붙여 넣으면 돼요.'}catch(_){planMsg='자동 복사가 막혀 있어요. 아래 글을 길게 눌러 복사해 주세요.'}renderPlans()}
let showText=false;
// The screen itself is drawn by React: app/screens/PlansScreen.tsx
let planRenaming=''; // the plan whose name box is open
// What was pressed in 내 계획 (PlansScreen.tsx tells: its name and value — a plan id, a typed name or code)
function plansAct(n,v,v2){
  switch(n){
  case 'new': newPlan();return;
  case 'open': openPlan(v);return;
  case 'dup': dupPlan(v);return;
  case 'del': delPlan(v);return;
  case 'rename': if(PL.plans.some(x=>x.id===v)){planRenaming=v;renderPlans()}return;   // its name box opens (with the cursor in it)
  case 'name': planRenaming='';renamePlan(v,String(v2||'').trim());renderPlans();return;
  case 'share': shareCode();return;
  case 'text': showText=!showText;renderPlans();if(showText)copyText(planText());return;
  case 'txt': downloadText(`${planName()}.txt`,planText());return;
  case 'json': snapshotCurrent();downloadText(`JEPI-${planName()}.json`,JSON.stringify({jepi:1,name:planName(),data:planData()}));return;
  case 'code': openCode(v);return;
  }
}
function renderPlans(){
  const box=$('#plansBox'); if(!box) return;
  window.JEPI_UI.mount('plans',box,{plans:PL.plans.map(p=>({id:p.id,name:p.name,kind:p.kind,dates:p.dates,blocks:p.blocks,updated:p.updated})),
    curPlan:PL.curPlan,delArm,planMsg,renaming:planRenaming,standalone:!!STANDALONE,lastLink:lastLink||'',lastCode:lastCode||'',shareText:showText?planText():null,
    savedInAccount:false});
}

// ================= JEPI standalone: AI keys, model router, routes, map, panels =================
const STANDALONE=!(window.claude&&window.claude.use);
const LS=JD.storage; // saved data on this device: app/data/storage.ts
JD.keys.load(); const KEYS=JD.keys.list;   // app/data/keys.ts (the same object, changed in place)
const KEY_DEF={
  anthropic:{name:'Claude',sub:'일정 짜기·대화·여행지 준비 (필수)',ph:'sk-ant-...',re:/^sk-ant-/},
  gemini:{name:'Gemini',sub:'가벼운 작업용 (선택 · 넣으면 비용이 줄어요)',ph:'AIza...',re:/^AIza/},
  gmaps:{name:'Google 지도',sub:'해외 경로 · 영업시간',ph:'AIza...',re:/^AIza/},
  kakao:{name:'카카오 지도',sub:'국내 장소·주소 검색 (REST API 키)',ph:'32자리 영문·숫자',re:/^[0-9a-f]{32}$/i}
};
const MODELS=Object.assign({heavy:'claude-sonnet-5-5',light:'claude-haiku-5-5',gemini:'gemini-3.6-flash'},LS.get('jepi.models',{})||{});
let keyMsg={}, keyBad={};
function saveKeys(quiet){JD.keys.save(quiet);if(!quiet&&typeof syncSoon==='function')syncSoon()}
const maskKey=k=>k?k.slice(0,6)+'••••••'+k.slice(-4):'';
function aiErr(code,msg,text){return JD.appError(code,msg,text)}
// The AI connection (calling Claude / Gemini, retries, switching to the other AI) lives in app/data/ai.ts.
let aiWho='AI';
JD.ai.connectAI({keys:()=>KEYS,models:()=>MODELS,bad:()=>keyBad,who:n=>{aiWho=n}});
const callClaude=JD.ai.callClaude, callGemini=JD.ai.callGemini, makeSample=JD.ai.makeSample;
async function testKey(k){
  keyMsg[k]='확인 중…'; renderSettings();
  try{
    if(k==='anthropic'){await callClaude('Reply with only this JSON: {"ok":true}',MODELS.light);}
    else if(k==='gemini'){await callGemini('Reply with only this JSON: {"ok":true}');}
    else if(k==='gmaps'){const v=await fetchRoute({m:'walk',a:[35.6812,139.7671],b:[35.6852,139.7528],pv:'google'});if(!v)throw aiErr('upstream_error','경로를 받지 못했어요');}
    else if(k==='kakao'){keyMsg[k]=await kakaoDiag();keyBad.kakao=!/^✓/.test(keyMsg[k]);renderSettings();return}
    keyMsg[k]='✓ 연결됐어요';
    if(k==='gmaps')keyBad.google=false; else keyBad[k]=false;
  }catch(e){if(k==='gmaps')keyBad.google=true;else keyBad[k]=true;
    keyMsg[k]=e.code==='not_granted'?'✕ 키가 맞지 않거나 이 API가 꺼져 있어요. 다시 확인해 주세요.':e.code==='network'?'✕ 응답을 받지 못했어요. 키 제한(웹사이트 주소)과 API 사용 설정을 확인해 주세요.':'✕ '+(e.message||'연결하지 못했어요')}
  renderSettings();
}

async function kakaoDiag(){
  // Kakao gives place search to outside apps, not walking / transit routes: check the search
  let r;
  try{r=await fetch('https://dapi.kakao.com/v2/local/search/keyword.json?query='+encodeURIComponent('서울역')+'&size=1',{headers:{Authorization:'KakaoAK '+KEYS.kakao}})}
  catch(_){return `✕ 카카오가 이 주소(${ORIGIN})의 요청을 막았어요. 카카오 디벨로퍼스 → 내 앱 → 플랫폼 → Web에 ${ORIGIN} 를 정확히(끝에 / 없이) 등록했는지 확인해 주세요. 바꾼 뒤 몇 분 지나 다시 "확인"을 눌러 주세요.`}
  let j={};try{j=await r.json()}catch(_){}
  const c=j.code!=null?` (code ${j.code})`:'';
  if(r.status===401)return `✕ 키가 맞지 않아요. JavaScript 키가 아니라 REST API 키를 넣어 주세요.${c}`;
  if(r.status===403)return `✕ 이 키로 장소 검색을 쓸 수 없어요. 내 앱 → 제품 설정에서 카카오맵을 ON으로 바꿔 주세요.${c}`;
  if(!r.ok)return `✕ 카카오 오류 (HTTP ${r.status})${c} ${j.msg||j.message||''}`.trim();
  return '✓ 장소·주소 검색 연결됨 · 국내 이동 시간은 거리로 어림하고, "안내 시작"은 카카오맵으로 열어요';
}
function keysChanged(){saveKeys();keyBad={};if(STANDALONE){UI.sample=makeSample()}renderAll();renderSettings();if(!$('#onb').hidden)renderOnb()}

const blankPack=PLC.blankPack;   // app/data/places.ts
// ---------- routes: Google Routes (abroad), cached on this device ----------
// Asking, the queue and the cache live in app/data/routes.ts; Korea checks and "안내 시작" links in app/logic/geo.ts.
// Here: the names the rest of the old code uses, and when to redraw after routes arrive.
const inKR=JD.logic.geo.inKorea, navLink=JD.logic.geo.navLink;
const routeProvider=(a,b)=>JD.routes.provider(a,b), fetchRoute=j=>JD.routes.fetchRoute(j), routeStats=JD.routes.stats;
JD.routes.connectRoutes({googleKey:()=>KEYS.gmaps||'',googleBad:()=>!!keyBad.gmaps,arrived:()=>routeDirty(),
  keyBroken(){keyBad.google=true;keyMsg.gmaps='✕ 키가 맞지 않거나 이 API가 켜져 있지 않아요'}});
let rdT=0;
function routeDirty(){clearTimeout(rdT);rdT=setTimeout(()=>{
  const ae=document.activeElement; if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){routeDirty();return}
  if(!$('#onb').hidden||!$('#sheetBg').hidden){routeDirty();return}
  renderAll(); if(mapState.on) drawMap();
},600)}
// ---------- map: app/ui/map.ts (Leaflet, loaded only when opened) ----------
const MAP=window.JEPI_UI.map, mapState=MAP.state, mapTop=MAP.mapTop, mapTopAct=MAP.mapTopAct, openMap=MAP.openMap, drawMap=MAP.drawMap, renderMapCards=MAP.renderMapCards;
// ---------- 더보기: trip summary, 준비하기 badge, P-mode short menu ----------
let moreAll=false, meOpen=null, autoT=0;
const tripSummary=()=>FORMS.tripSummary(DY.days);   // app/view/forms.ts
function prepLeft(){let n=0;document.querySelectorAll('#checks .check-group').forEach(g=>{const h=g.querySelector('h3');if(h&&/예약·준비/.test(h.textContent))n+=g.querySelectorAll('input[data-ck]:not(:checked)').length});return n}
function warnTotal(){let n=0;for(let d=0;d<DY.days.length;d++)n+=analyze(d).items.reduce((a,it)=>a+it.warns.length,0);return n}
// The menu itself is drawn by React: app/screens/MoreMenu.tsx. Here: the numbers it shows.
function renderMore(){
  const box=$('#moreBox'); if(!box) return;
  const s=tripSummary(), pr=CUR.profile, b=budgetParts&&budgetParts(pr);
  const tripChips=pr.kind==='day'?[]:[pr.bookedFlight===false?{text:'교통편 미정',tone:'warn'}:{text:'교통편 예약됨',tone:'ok'},pr.bookedStay===false?{text:'숙소 미정',tone:'warn'}:{text:'숙소 예약됨',tone:'ok'}];
  if(b) tripChips.push({text:`예산 1인 ${Math.round(b.total/10000)}만원`});
  const w=warnTotal(), sp=PL.plans.find(x=>x.id===PL.curPlan&&x.shared);
  window.JEPI_UI.mount('more',box,{city:s.city,line:s.line,tripChips,warnCount:w,prepLeft:prepLeft(),
    full:UI.jp!=='P'||moreAll,showToggle:UI.jp==='P',moreAll,plansCount:PL.plans.length,
    friendsChip:sp?'👥 '+(((TRIPS&&TRIPS.members[PL.curPlan])||[]).length||'공유 중'):null,
    notifyOn:!!(NOTIFY&&NOTIFY.on),aiOff:!!(STANDALONE&&!UI.sample)});
  tabs({warn:w?String(w):''});
}
// 이번 여행: one row per topic, opens only that part, saves on change
const meRows=p=>FORMS.meRows(p,{dest:partDest,day:partsDay,homeBox:partHomeBox,paste:pasteBox});   // app/view/forms.ts
// Drawn by React: app/screens/MeRows.tsx. meSetMsg changes only the message (the open form stays as it is).
let meRev=0, meLast=null;
function renderMeRows(){
  if(!draft) draft=clone(CUR.profile); fixProfile(draft);
  const rows=meRows(draft), op=rows.find(r=>r[0]===meOpen);
  meLast={rows:rows.map(([id,k,v])=>({id,label:k,valueHTML:v})),open:op?meOpen:null,body:op?op[3]():[],msg:autoMsg||'',dayCourse:CUR.profile.kind==='day',rev:++meRev};
  window.JEPI_UI.mount('me',$('#meBox'),meLast);
}
function meSetBudgetHint(h){if(!meLast||!$('#meBox'))return;meLast=Object.assign({},meLast,{body:meLast.body.map(x=>x.f==='budget'?Object.assign({},x,{hint:h}):x)});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
function meSetMsg(m){if(!meLast||!$('#meBox')){return}meLast=Object.assign({},meLast,{msg:m});window.JEPI_UI.mount('me',$('#meBox'),meLast)}
let autoMsg='';
function autoSave(){clearTimeout(autoT);autoT=setTimeout(()=>{if(!draft||!$('#onb').hidden)return;
  const prevDest=CUR.profile.dest;commitProfile(draft);if(prevDest!==CUR.profile.dest)draft.dest=CUR.profile.dest;
  autoMsg='✓ 자동 저장됨 · 일정표에 바로 반영돼요';renderAll();meSetMsg(autoMsg)},500)}
// taste: style rows + keywords + wishes (carried into new plans). The style rows are drawn by React: app/screens/TasteStyle.tsx
const TASTE_KEYS=['pace','social','breakfast','style'];
function carryTaste(from,to){TASTE_KEYS.forEach(k=>{if(from&&from[k]!==undefined)to[k]=clone(from[k])})}
let tasteRev=0;
function renderTasteStyle(){const el=$('#tasteStyle');if(!el)return;if(!draft)draft=clone(CUR.profile);fixProfile(draft);const p=draft;
  window.JEPI_UI.mount('tasteStyle',el,{purpose:p.purpose??'',pace:p.pace,solo:p.party.type==='solo',social:p.social,breakfast:p.breakfast,
    rows:STYLE_ROWS,style:clone(p.style||{}),open:styleOpen,msg:autoMsg||'',rev:++tasteRev})}

// ---------- settings ----------
let themePref=LS.get('jepi.theme','light');
function applyTheme(){const r=document.documentElement;if(themePref==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',themePref);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--paper').trim()||'#f2f4f1')}
const ORIGIN=String(location.origin||'').replace(/[<>"&']/g,'');
const KEY_HELP={
  anthropic:`<ol><li><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>에 로그인해요.</li><li>Billing에서 크레딧을 충전해요 (5달러면 개인 여행에 충분해요).</li><li>API Keys → Create Key → 만든 키를 복사해서 여기에 붙여 넣어요.</li></ol>`,
  gemini:`<ol><li><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>에서 Create API key를 눌러요.</li><li>만든 키를 붙여 넣어요. 무료 한도 안에서 가벼운 작업을 맡아요.</li></ol>`,
  gmaps:`<ol><li><a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener">Google Cloud 콘솔</a>에서 결제 계정을 연결해요 (무료 한도 안이면 청구되지 않아요).</li><li>API 및 서비스 → 라이브러리에서 <b>Routes API</b>와 <b>Places API (New)</b>를 사용 설정해요 (Places는 영업시간 확인용).</li><li>사용자 인증 정보 → API 키 만들기 → <b>애플리케이션 제한: 웹사이트</b>에 <code>${ORIGIN}/*</code>를 넣고, API 제한은 Routes API와 Places API (New) 두 개만 골라요.</li><li>할당량에서 하루 요청 수 상한(예: 500)을 걸어 두면 안전해요.</li></ol>`,
  kakao:`<ol><li><a href="https://developers.kakao.com/console/app" target="_blank" rel="noopener">카카오 디벨로퍼스</a>에서 애플리케이션을 추가해요.</li><li>플랫폼 → Web에 <code>${ORIGIN}</code>를 등록해요.</li><li>제품 설정에서 <b>카카오맵</b>을 활성화해요.</li><li>앱 키의 <b>REST API 키</b>를 복사해서 붙여 넣어요.</li></ol>`
};
let keyEdit=null;
const isBad=k=>!!keyBad[k==='gmaps'?'google':k];
// The frame is drawn by React: app/screens/SettingsScreen.tsx. The parts below are still old HTML.
let settingsRev=0;
// AI·지도 연결 is drawn by React: app/screens/AiKeysSection.tsx. Only the masked keys go there.
function settingsAI(){return {standalone:!!STANDALONE,editing:keyEdit,hasGemini:!!KEYS.gemini,routesOk:+routeStats.ok||0,
  models:{heavy:MODELS.heavy,light:MODELS.light,gemini:MODELS.gemini},
  hours:KEYS.gmaps?{use:+hoursUse(),cap:HOURS_CAP,off:JD.hours.state.off||''}:null,
  keys:Object.keys(KEY_DEF).map(k=>{const d=KEY_DEF[k];return {k,name:d.name,sub:d.sub,ph:d.ph,masked:KEYS[k]?maskKey(KEYS[k]):'',bad:isBad(k),msg:keyMsg[k]||'',helpHTML:KEY_HELP[k]}})}}
// What was pressed in 설정 (SettingsScreen.tsx / AiKeysSection.tsx tell: its name and value; a typed key comes as v2)
function settingsAct(n,v,v2){
  switch(n){
  case 'theme': themePref=v;LS.set('jepi.theme',themePref);applyTheme();renderSettings();if(mapState.on)drawMap();return;
  case 'zoom': setZoom(+v);if(UI.tab==='settings')renderSettings();return;
  case 'keyedit': keyEdit=v;keyMsg[keyEdit]='';renderSettings();return;   // its box opens, with the cursor in it
  case 'keycancel': keyEdit=null;renderSettings();return;
  case 'keysave': {const k=v,key=String(v2||'').trim().replace(/\s+/g,'');
    if(!key){keyMsg[k]='키를 붙여 넣어 주세요.';renderSettings();return}
    if(KEY_DEF[k].re&&!KEY_DEF[k].re.test(key)){keyMsg[k]=`${KEY_DEF[k].name} 키 형식이 아닌 것 같아요. 그래도 저장했으니 "확인"을 눌러 보세요.`}
    else keyMsg[k]='';
    KEYS[k]=key;keyEdit=null;keysChanged();testKey(k);return}
  case 'keydel': delete KEYS[v];keyMsg[v]='삭제했어요.';keysChanged();return;
  case 'keytest': testKey(v);return;
  case 'models': {const m=v2||{};MODELS.heavy=String(m.heavy||'').trim()||'claude-sonnet-5-5';MODELS.light=String(m.light||'').trim()||'claude-haiku-5-5';MODELS.gemini=String(m.gemini||'').trim()||'gemini-3.6-flash';LS.set('jepi.models',{heavy:MODELS.heavy,light:MODELS.light,gemini:MODELS.gemini});keysChanged();return}
  case 'backup': backupAll();return;
  case 'wipe': if(!wipeArm){wipeArm=true;renderSettings();return}wipeAll();return;
  case 'wipecancel': wipeArm=false;renderSettings();return;
  }
}
function renderSettings(){
  const el=$('#setBox'); if(!el) return;
  window.JEPI_UI.mount('settings',el,{theme:themePref,zoom:store.get('gp.zoom',60),sync:syncView(),myPlaces:mypView(),ai:settingsAI(),
    wipeArm:!!wipeArm,host:location.host||'로컬',rev:++settingsRev});
}
function backupAll(){
  snapshotCurrent();
  const all={jepi:2,at:new Date().toISOString(),cur:PL.curPlan,kw:CUR.kws,plans:PL.plans.map(p=>({meta:p,data:TRIP.plans.get(p.id)})).filter(x=>x.data)};
  const d=new Date(), nm=`JEPI-백업-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
  downloadText(nm,JSON.stringify(all));
}
function importAll(v){
  if(!v||v.jepi!==2||!Array.isArray(v.plans)) return false;
  snapshotCurrent(); let n=0;
  v.plans.forEach(x=>{if(!x||!x.meta||!x.data)return;const ex=PL.plans.find(p=>p.id===x.meta.id);TRIP.plans.put(x.meta.id,x.data);if(ex)Object.assign(ex,x.meta);else PL.plans.push(Object.assign({},x.meta));n++});
  if(Array.isArray(v.kw)&&v.kw.length){CUR.kws=[...new Set([...CUR.kws,...v.kw])];saveKw&&saveKw()}
  PL.plans.sort((a,b)=>(b.updated||0)-(a.updated||0)); savePlans();
  const target=PL.plans.find(p=>p.id===v.cur)||PL.plans[0]; if(target&&target.id!==PL.curPlan){PL.curPlan='';openPlan(target.id)}
  planMsg=`계획 ${n}개를 불러왔어요.`; renderPlans(); return true;
}

// ---------- share link (no server): the plan travels inside the link ----------
async function packText(s){
  try{if(window.CompressionStream){const cs=new Blob([s]).stream().pipeThrough(new CompressionStream('deflate-raw'));const buf=new Uint8Array(await new Response(cs).arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));return 'z'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}}catch(_){}
  return 'j'+btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function unpackText(t){
  const kind=t[0], b64=t.slice(1).replace(/-/g,'+').replace(/_/g,'/'); const bin=atob(b64+'==='.slice((b64.length+3)%4));
  if(kind==='j') return decodeURIComponent(escape(bin));
  const u=Uint8Array.from(bin,c=>c.charCodeAt(0)); const ds=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(ds).text();
}
let lastLink='';
async function shareLink(asNote){
  snapshotCurrent(); const name=(PL.plans.find(x=>x.id===PL.curPlan)||{}).name||planName();
  const pd=planData(); if(pd.profile&&pd.profile.home){pd.profile.home=Object.assign({},pd.profile.home,{area:''});delete pd.profile.home.ll}
  if(pd.profile&&pd.profile.look&&pd.profile.look.photo){pd.profile.look=Object.assign({},pd.profile.look,{photo:'',cover:'city'})} // a photo would make the link too long
  const t=await packText(JSON.stringify({n:name,d:pd})); const url=location.origin+location.pathname+'#s='+t+(asNote?'&note=1':'');
  if(url.length>60000){planMsg='계획이 커서 링크로 보내기 어려워요. "백업 파일 받기"로 파일을 보내 주세요.';renderPlans();return}
  lastLink=url;
  try{if(navigator.share){await navigator.share({title:'JEPI · '+name,text:`[JEPI] ${name}`,url});planMsg='공유했어요.';renderPlans();return}}catch(e){if(e&&e.name==='AbortError'){renderPlans();return}}
  try{await navigator.clipboard.writeText(url);planMsg='링크를 복사했어요. 카톡에 붙여 넣으면 돼요.'}catch(_){planMsg='아래 링크를 길게 눌러 복사해 주세요.'}
  renderPlans();
}
async function openShared(){
  const m=/[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash||''); if(!m) return;
  const asNote=/[#&]note=1/.test(location.hash||'');
  try{const v=JSON.parse(await unpackText(m[1])); if(!v||!v.d||!v.d.profile) throw 0;
    snapshotCurrent(); const nid='p'+Date.now().toString(36);
    TRIP.plans.put(nid,v.d); PL.plans.unshift({id:nid,name:String(v.n||'공유받은 계획').slice(0,30)+' (공유받음)',custom_name:true,updated:Date.now()});
    PL.curPlan=nid; savePlans(); onbFrame({open:false}); applyPlanData(v.d); snapshotCurrent(); UI.tab='timeline'; renderTabs();
    history.replaceState(null,'',location.pathname); showToast('공유받은 계획을 내 계획에 추가했어요.');if(asNote)setTimeout(()=>openNotebook(),400);
  }catch(_){history.replaceState(null,'',location.pathname);showToast('공유 링크가 잘렸거나 손상됐어요.')}
}
function showToast(m){const b=document.getElementById('toast');if(!b)return;b.textContent=m;b.hidden=false;clearTimeout(showToast.t);showToast.t=setTimeout(()=>{b.hidden=true},4000)}

// ---------- phase strip: before / during / after the trip ----------
const isoOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function todayIdx(){const t=isoOf(new Date());return DY.days.findIndex(D=>D.iso===t)}
// drawn by React: app/screens/Phase.tsx
function renderPhase(){
  const el=$('#phase'); if(!el) return;
  const pr=CUR.profile, t=isoOf(new Date()), D0=DY.days[0], Dn=DY.days[DY.days.length-1];
  const show=v=>{window.JEPI_UI.mount('phase',el,v);el.hidden=v.s==='none'};
  // AI 꺼짐 now lives on the 더보기 → 설정 row only (tidy day screen)
  if(!D0||!D0.iso||pr.dateUnknown){show({s:'none'});return}
  const ti=todayIdx();
  if(ti>=0){
    const now=new Date(), nm=now.getHours()*60+now.getMinutes();
    const items=analyze(ti).items.filter(i=>!i.stay||i.start>=nm);
    const cur=items.find(i=>i.start<=nm&&nm<i.end), nx=items.find(i=>i.start>nm);
    let next=null;
    if(nx){const from=cur||[...items].reverse().find(i=>i.end<=nm)||null; const tr=from&&from.ll&&nx.ll?travel(from.ll,nx.ll):null;
      next={time:fmt(nx.start),name:String(nx.name),travel:tr?`${tr.real?'':'≈'}${tr.mode} ${tr.min}분`:'',nav:from&&from.ll&&nx.ll?navLink(from.ll,nx.ll,tr?tr.mode:'도보',nx.name):''}}
    show({s:'now',cur:cur?{name:String(cur.name),end:fmt(cur.end)}:null,next,todayDay:UI.day!==ti?ti:null});
  } else if(D0.iso>t){
    const dd=Math.round((new Date(D0.iso+'T00:00:00')-new Date(t+'T00:00:00'))/864e5);
    show({s:'before',dd,warns:warnTotal(),prepLeft:prepLeft(),miss:[pr.kind!=='day'&&pr.bookedFlight===false?'교통편 미정':'',pr.kind!=='day'&&pr.bookedStay===false?'숙소 미정':''].filter(Boolean)});
  } else if(Dn&&Dn.iso<t) show({s:'after'});
  else show({s:'none'});
}
// open the plan whose dates include today, then today's day, scrolled to now
function planCovers(id,t){const d=TRIP.plans.get(id);const p=d&&d.profile;if(!p||!p.startDate||p.dateUnknown)return false;
  const s=new Date(p.startDate+'T00:00:00'),e=new Date(s);e.setDate(e.getDate()+(p.kind==='day'?0:(+p.nights||0)));const x=new Date(t+'T00:00:00');return x>=s&&x<=e}
function startupFocus(){
  const t=isoOf(new Date());
  if(!(DY.days[0]&&DY.days[0].iso&&todayIdx()>=0)){const p=PL.plans.find(p=>p.id!==PL.curPlan&&planCovers(p.id,t));if(p){openPlan(p.id)}}
  const ti=todayIdx(); if(ti>=0){UI.day=ti;renderAll();
    setTimeout(()=>{const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;const g=$('#grid');if(!g)return;
      const now=new Date(), nm=now.getHours()*60+now.getMinutes(); const y=g.getBoundingClientRect().top+window.scrollY+Math.max(0,(nm-dayStart(UI.day))/60*H-140);window.scrollTo({top:y})},80)}
}
function renderPlanBtn(){const p=PL.plans.find(x=>x.id===PL.curPlan);hero({planName:(p&&p.name)||planName()})}
const inside=sel=>{const a=document.activeElement;return !!(a&&a.closest&&a.closest(sel))};
function renderExt(){renderPhase();renderMore();renderPlanBtn();
  if(UI.tab==='me'&&$('#onb').hidden&&!inside('#meBox'))renderMeRows();
  if(UI.tab==='pref'&&!inside('#tasteStyle'))renderTasteStyle();
  if(UI.tab==='settings'&&!inside('#setBox'))renderSettings();
  if(mapState.on){if(mapState.lastDay!==UI.day){mapState.lastDay=UI.day;drawMap(true)}else renderMapCards()}}
// events for the new panels (registered before the main handler; returns early only for its own controls)
document.addEventListener('click',e=>{
  const t=e.target.closest('button,a,label,input'); if(!t) return;
  if(t.id==='wishGo'){UI.cat='wish';UI.tab='tray';renderTray();renderTabs();return}
});
// a card under the map (MapCards in Dice.tsx): the map moves to that stop
const mapCardAct=MAP.mapCardAct;   // app/ui/map.ts
// autosave for 이번 여행 / 취향 panels
document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('#meBox,#tasteStyle')&&!e.target.classList.contains('importFile'))autoSave()});
// onboarding: connect AI right on the first screen


setInterval(()=>{try{const el=document.getElementById('aiSec');if(!el)return;const L=window.JEPI_UI.live(el),put=t=>{if(L)L.text(t);else el.textContent=t};   // AiBox.tsx draws it
  if(!UI.aiState||UI.aiState.status!=='loading'){put('');return}
  if(!UI.aiState.t0)UI.aiState.t0=Date.now();put(`${aiWho} · ${Math.round((Date.now()-UI.aiState.t0)/1000)}초째`)}catch(_){}},1000);

// ---------- AI-found places, chat folding ----------
const FRESH=new Set();
let chatFolded=false;
function chatFoldSync(){
  const n=chat.filter(m=>m.role==='user').length;
  dock({foldHidden:!chat.length,folded:chatFolded&&chat.length>0,expanded:!chatFolded,foldText:chatFolded?`대화 펼치기 (${n})`:'대화 접기 ▾'})}
document.addEventListener('focusin',e=>{if(e.target&&e.target.id==='chatInput'&&chatFolded&&chatBusy){chatFolded=false;chatFoldSync()}});

// ---------- chat place suggestions: choose per place ----------
function cpSlot(o){const d=+o.day,st=parse(o.start);return Number.isInteger(d)&&d>=0&&d<DY.days.length&&st!=null?{d,st}:null}
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
  PK.pack.places.push(pl);addPackPlace(pl);FRESH.add(pl.id);savePack();o._id=pl.id;return pl.id}
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
    applyOpsCore(r.ops);save();o._c='sched';o._txt=`Day ${sl.d+1} ${r.ops[0].start}에 넣었어요${r.warns.length?` · 경고 ${r.warns.length}개`:''}`;UI.day=sl.d;renderAll();renderChat();return}
  UI.selected=id;o._c='pick';o._txt='일정표에서 넣을 시간을 탭하세요';UI.tab='timeline';chatFolded=true;renderAll();renderChat();
  const g=document.getElementById('grid');if(g)g.scrollIntoView({block:'start',behavior:'smooth'});
}

// ================= 내 장소 (집·회사·…) — on this device and the account, never in share links =================
// The list, saving, location and address search live in app/data/myplaces.ts and app/data/kakao.ts; the section in 설정
// handles its own buttons (app/screens/MyPlacesSection.tsx). Here: the names the rest of the old code uses.
JD.kakao.connectKakao(()=>KEYS.kakao||'');
JD.myplaces.connectMyPlaces({redraw:()=>renderSettings(),syncSoon:()=>syncSoon()});
const MYP=JD.myplaces.list;   // the same array (changed in place)
const mypOf=id=>JD.myplaces.of(id);
// what the section shows
function mypView(){const u=JD.myplaces.ui;return {places:MYP.map(x=>({id:x.id,name:x.name,ll:x.ll||null,addr:x.addr||''})),editing:u.edit,msg:u.msg||'',
  hits:u.hits.map(h=>({name:h.name,addr:h.addr})),hasKakao:!!KEYS.kakao}}
// ---------- 오가는 길 → 출발지 (집, 내 장소). The 🎲 sheet itself: app/flow/dice.ts ----------
// trip departure from 집 (내 장소)
const KR_AIR={gmp:['김포공항 국제선',37.5583,126.7906],icn1:['인천공항 T1',37.4492,126.4510],icn2:['인천공항 T2',37.4602,126.4407]};
let homeMsg='';
// 오가는 길 → 출발지 (drawn by React: TripForms.tsx HomeBox)
function partHomeBox(p){if(p.mode==='car')return null;const h=mypOf('home');
  return {f:'homeBox',hasHome:!!(h&&h.ll),addr:(h&&h.addr)||'',using:!!p.home.ll,kakao:KEYS.kakao?Object.entries(KR_AIR).map(([k,a])=>[k,a[0]]):[],msg:homeMsg}}
// ---------- 🎲 뭐 하지 → 📌 이 코스 저장: a new 하루 코스 plan (the rolling itself: app/flow/dice.ts) ----------
function catOfItem(x){if(x.type==='meal'||x.type==='cafe')return 'food';if(x.type==='night')return 'night';const f=x.full+' '+x.name;
  return /미술|갤러리|전시|박물관/.test(f)?'art':/서점|쇼핑|상가|백화점|시장/.test(f)?'shop':/공연|콘서트|라이브|영화/.test(f)?'music':'walk'}
function saveCourse(){
  const c=doS.course; if(!c||!c.length) return;
  const areaName=doS.base==='area'&&doS.area?doS.area.name:(doS.where==='지금 위치'?'내 주변':doS.where+' 주변'), ll=doS.origin, stamp=Date.now().toString(36);
  const places=c.map((x,i)=>({id:'g'+stamp+i,name:x.name,local:'',cat:catOfItem(x),area:areaName,ll:x.ll,dur:x.dur,always:true,closed:[],note:[x.cat,x.addr].filter(Boolean).join(' · '),verify:'영업시간',check:'',drop:false,cost:[0,''],tags:[],zone:'center',must:'',cash:false,best:'any',ai:true}));
  const pack=Object.assign(manualPack(areaName),{manual:false,intl:!inKR(ll),areas:[{key:'center',name:areaName,lat:ll[0],lng:ll[1],zone:'center'}],places});
  const last=c[c.length-1], today=isoOf(new Date());
  const prof=clone(PROFILE_EXAMPLE);
  Object.assign(prof,{kind:'day',dest:areaName,startDate:today,nights:1,meet:{time:fmt(Math.max(0,c[0].start-c[0].walk)),end:fmt(Math.min(1439,last.start+last.dur+15)),area:'center'},
    dateSet:true,nightsSet:true,dateUnknown:false,bookedFlight:true,bookedStay:true,flightSet:true,staySet:true,jpPicked:true,startMode:'day',purpose:'',
    party:{type:'solo',adults:1,kids:0},stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:1}],events:[]});
  carryTaste(CUR.profile,prof); if(CUR.profile&&CUR.profile.party) prof.party=clone(CUR.profile.party);
  const data={profile:prof,pack,placed:places.map((p,i)=>({id:p.id,day:0,start:c[i].start,dur:c[i].dur})),custom:[],fmarks:{},wish:[],meals:{},done:{}};
  snapshotCurrent(); const nid='p'+Date.now().toString(36);
  TRIP.plans.put(nid,data); PL.plans.unshift({id:nid,name:`${areaName} · ${+today.slice(5,7)}/${+today.slice(8,10)} ${fmt(c[0].start)} 코스`,custom_name:true,updated:Date.now(),kind:'day',dates:today.slice(5).replace('-','/'),blocks:places.length});
  PL.curPlan=nid; savePlans(); closeSheet(); applyPlanData(data); snapshotCurrent(); UI.day=0; UI.tab='timeline'; renderTabs(); renderAll();
  showToast('내 계획에 저장했어요 · 일정과 지도에서 볼 수 있어요');
}
// ================= intro: sky, slogan, gentle motion =================
function introRun(){const el=document.getElementById('intro');if(!el)return;
  const calm=matchMedia('(prefers-reduced-motion:reduce)').matches, hold=calm?1300:2300;
  const end=()=>{if(el.classList.contains('out'))return;el.classList.add('out');setTimeout(()=>el.remove(),700)};
  el.addEventListener('click',end); setTimeout(end,hold);}

// ---------- header plan switcher (drop-down) ----------
// drawn by React: app/screens/PlanMenu.tsx
let planMenuRev=0;
function planMenuInfo(){
  const list=PL.plans.slice().sort((a,b)=>(a.id===PL.curPlan?-1:b.id===PL.curPlan?1:(b.updated||0)-(a.updated||0)));
  return {rev:++planMenuRev,plans:list.map(p=>({id:String(p.id),cur:p.id===PL.curPlan,past:!!pmPast(p),color:String(pmLook(p).color),coverSVG:pmPast(p)?'':coverSVG(pmLook(p).cover,150,90),
    dday:pmDday(p),name:String(p.name||'이름 없는 계획'),sub:`${p.dates||''}${p.blocks?` · 블록 ${p.blocks}개`:''}`}))};
}
function planMenu(open){const m=document.getElementById('planMenu'),b=document.getElementById('planBtn');if(!m||!b)return;
  if(open){snapshotCurrent();window.JEPI_UI.mount('planMenu',m,planMenuInfo());m.style.top=Math.round(b.getBoundingClientRect().bottom+6)+'px';m.hidden=false;hero({planOpen:true});const f=m.querySelector('.pm-item.cur,.pm-item');if(f)f.focus({preventScroll:true})}
  else{m.hidden=true;hero({planOpen:false})}}
document.addEventListener('click',e=>{
  if(e.target.closest('#planBtn'))return;   // the button toggles the menu itself (heroAct)
  const m=document.getElementById('planMenu'); if(!m||m.hidden)return;
  if(!e.target.closest('#planMenu'))planMenu(false);   // a tap outside closes it
},true);
// an item in the plan menu (PlanMenu.tsx tells: open a plan, + 새 계획, 계획 관리·공유)
function planMenuAct(n,v){planMenu(false);
  if(n==='open'){if(v!==PL.curPlan){openPlan(v);showToast('계획을 바꿨어요')}return}
  if(n==='new'){newPlan();return}
  UI.tab='plans';snapshotCurrent();showText=false;renderPlans();renderTabs()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const m=document.getElementById('planMenu');if(m&&!m.hidden){planMenu(false);document.getElementById('planBtn').focus()}}});

// ---------- DICE motion: rolls while the page scrolls, opens out of the die ----------
const calmMotion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
(function(){let raf=0,stopT=0;const fab=()=>document.getElementById('diceFab');
  addEventListener('scroll',()=>{if(calmMotion())return;const f=fab();if(!f)return;f.classList.add('rolling');
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;const y=scrollY,c=f.querySelector('.cube');if(!c)return;
      c.style.transform=`rotateX(${(-22+y*0.8).toFixed(0)}deg) rotateY(${(32+y*0.55).toFixed(0)}deg) rotateZ(${(y*0.2).toFixed(0)}deg)`});
    clearTimeout(stopT);stopT=setTimeout(()=>f.classList.remove('rolling'),150)},{passive:true});
})();
function diceOpenAnim(){
  const f=document.getElementById('diceFab'),sh=document.getElementById('sheet'),bg=document.getElementById('sheetBg');
  if(!f||!sh||calmMotion()||!f.getClientRects().length)return;
  const a=f.getBoundingClientRect(),b=sh.getBoundingClientRect();
  sh.style.setProperty('--fx',Math.round(a.left+a.width/2-(b.left+b.width/2))+'px');sh.style.setProperty('--fy',Math.round(a.top+a.height/2-(b.top+b.height/2))+'px');
  sh.classList.remove('pop','unpop');bg.classList.remove('bg-out');void sh.offsetWidth;sh.classList.add('pop');bg.classList.add('bg-in');
  f.classList.remove('tap');void f.offsetWidth;f.classList.add('tap');
}
function diceCloseAnim(){
  const f=document.getElementById('diceFab'),sh=document.getElementById('sheet'),bg=document.getElementById('sheetBg');
  if(!sh||sh.dataset.uid!=='dice'||calmMotion()||!f||!f.getClientRects().length||bg.hidden||sh.classList.contains('unpop'))return false;
  const a=f.getBoundingClientRect(),b=sh.getBoundingClientRect();
  sh.style.setProperty('--fx',Math.round(a.left+a.width/2-(b.left+b.width/2))+'px');sh.style.setProperty('--fy',Math.round(a.top+a.height/2-(b.top+b.height/2))+'px');
  sh.classList.remove('pop');sh.classList.add('unpop');bg.classList.remove('bg-in');bg.classList.add('bg-out');
  setTimeout(()=>{bg.hidden=true;sh.classList.remove('unpop');bg.classList.remove('bg-out')},260);return true;
}


// postcard look for each trip in the menu: its own theme colour, cover and D-day
function pmProfile(p){return p.id===PL.curPlan?CUR.profile:((TRIP.plans.get(p.id)||{}).profile||{})}
function pmLook(p){return Object.assign({color:'#2448c9',cover:'city'},pmProfile(p).look||{})}
function pmPast(p){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown)return false;const e=new Date(pr.startDate+'T00:00:00');e.setDate(e.getDate()+(pr.kind==='day'?0:(+pr.nights||0)));return e<new Date(new Date().toDateString())}
function pmDday(p){const pr=pmProfile(p);if(!pr.startDate||pr.dateUnknown||pmPast(p))return '';const n=Math.round((new Date(pr.startDate+'T00:00:00')-new Date(new Date().toDateString()))/864e5);return n>0?'D-'+n:n===0?'D-DAY':'여행 중'}   // the D-day label (PlanMenu.tsx)

// ---------- the floating 🎲 is there on every tab; in P 모드 it steps aside while the board's own dice is on screen ----------
// (the board's roll button, the rolling die, 내 카드) — so two dice never compete; scrolled past or on another tab, it comes back.
function fabDodge(){
  // what is really visible: below the folded header bar, above the chat box and the tab bar at the bottom
  let top=0,bot=innerHeight;['#miniBar'].forEach(q=>{const e=document.querySelector(q);if(e&&document.body.classList.contains('mini')){const r=e.getBoundingClientRect();if(r.height)top=Math.max(top,r.bottom)}});
  ['#chat','.tabs'].forEach(q=>{const e=document.querySelector(q);if(e){const r=e.getBoundingClientRect();if(r.height&&r.top>innerHeight/2)bot=Math.min(bot,r.top)}});
  const on=[...document.querySelectorAll('#pview .proll,#pview .pspin,#pview .mcard')].some(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.bottom>top+24&&r.top<bot-24});
  document.body.classList.toggle('fab-dodge',on);
}
(function(){let raf=0;const later=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;fabDodge()})};
  addEventListener('scroll',later,{passive:true}); addEventListener('resize',later);
  const pv=document.getElementById('pview'); if(pv&&window.MutationObserver) new MutationObserver(later).observe(pv,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
})();
// ================= 기기 간 동기화 (Supabase, 본인 계정 데이터만) =================
const SYNC=JD.server.SYNC;
const saveSync=JD.server.saveSync;
// which part of the 동기화 section shows and the last error live in app/data/account.ts (ACC.state)
const ACC=JD.account;
const syncOn=JD.server.syncOn;
function keepSess(j){JD.server.keepSess(j)}
// any table (or rpc/<name>) in the project, as the logged-in person; rows are limited by RLS on the server
function sbTable(table,method,q,body,prefer){return JD.server.sbTable(table,method,q,body,prefer)}
// What to send and how to merge what comes back: app/data/sync.ts. Here: our values, and redrawing after.
const SYNC_STATUS=JD.sync.status; // .busy (sending or receiving), .keysLocked (server keys locked with another password)
function syncSoon(ms){JD.sync.syncSoon(ms)}
function syncNow(){return JD.sync.syncNow()}
JD.sync.connectSync({
  plans:()=>PL.plans, setPlans(p){PL.plans=p}, curPlan:()=>PL.curPlan,
  kws:()=>CUR.kws, setKws(k){CUR.kws=k},
  myPlaces:()=>MYP, setMyPlaces(m){JD.myplaces.setAll(m)},
  keys:()=>KEYS, setKeys(k){JD.keys.replace(k);saveKeys(true)},
  setErr(m){ACC.state.err=m},
  async afterPush(){
    if(UI.tab==='settings') renderSettings();
    for(const f of SYNC_AFTER_PUSH){try{await f()}catch(e){console.warn(e)}}
  },
  async afterPull({changed,curChanged,keysPulled}){
    if(curChanged){const ae=document.activeElement;const editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden;
      if(!editing){applyPlanData(curChanged);showToast('다른 기기에서 바꾼 내용을 받아왔어요')} }
    if(keysPulled){keyBad={};if(STANDALONE)UI.sample=makeSample();renderAll();showToast('AI·지도 키도 받아왔어요')}
    if(changed){renderPlans();renderExt()} if(UI.tab==='settings')renderSettings();
    for(const f of SYNC_AFTER_PULL){try{await f()}catch(e){console.warn(e)}}
  }
});
// The section is drawn by React: app/screens/SyncSection.tsx. Here: what it shows.
function syncView(){
  const st=ACC.state.step, mode=(!SYNC.url||!SYNC.key||st==='setup')?'setup':!syncOn()?(st==='reset'?'reset':st==='join'?'join':'login'):st==='newpw'?'newpw':'on';
  return {mode,url:SYNC.url||'',hasKey:!!SYNC.key,email:(mode==='on'&&SYNC.sess.email)||SYNC.email||'',err:ACC.state.err||'',busy:!!SYNC_STATUS.busy,
    lastAt:SYNC.at||0,vkMissing:!LS.get('jepi.vk',null),keysLocked:!!SYNC_STATUS.keysLocked};
}
// the section's buttons and forms work by themselves (app/data/account.ts); they ask the old code to redraw and to sync
ACC.connectAccount({redraw:()=>renderSettings(),toast:m=>showToast(m),syncNow:()=>syncNow()});

// a tapped login link comes back here: ?sb=<config>#access_token=…
async function syncBoot(){
  try{
    const q=new URLSearchParams(location.search), sb=q.get('sb');
    if(sb){try{const c=JSON.parse(atob(sb));if(c.u&&!SYNC.url)SYNC.url=c.u;if(c.k&&!SYNC.key)SYNC.key=c.k;if(c.e)SYNC.email=c.e;saveSync()}catch(_){}}
    const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
    if(h.get('error_description')){ACC.state.err=h.get('error_description').replace(/\+/g,' ');showToast('로그인 링크가 만료됐어요. 다시 받아 주세요.')}
    if(h.get('access_token')&&SYNC.url&&SYNC.key){
      const at=h.get('access_token');let user={};
      try{const r=await fetch(SYNC.url+'/auth/v1/user',{headers:{apikey:SYNC.key,Authorization:'Bearer '+at}});user=await r.json()}catch(_){}
      keepSess({access_token:at,refresh_token:h.get('refresh_token'),expires_in:+h.get('expires_in')||3600,user});SYNC.sent={};SYNC.lastPull=0;saveSync();ACC.state.step=h.get('type')==='recovery'?'newpw':'';if(ACC.state.step==='newpw'){UI.tab='settings';setTimeout(()=>{renderTabs();renderSettings()},300)}
      showToast('로그인했어요 · 동기화를 켰어요');
    }
    if(sb||h.get('access_token')||h.get('error_description')) history.replaceState(null,'',location.pathname);
  }catch(_){}
  setTimeout(syncNow,800);
}

// ---------- state ----------
const store=JD.storage; // same as LS (app/data/storage.ts)
loadPack(packFrom(store.get('gp.pack',null))||blankPack());
CUR.profile=TRIP.load('profile',null); const firstRun=!CUR.profile||typeof CUR.profile!=='object'; if(firstRun){CUR.profile=clone(PROFILE_EXAMPLE);Object.assign(CUR.profile,{dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)});CUR.profile.stays[0].name='숙소'}
CUR.custom=TRIP.load('custom',[]); if(!Array.isArray(CUR.custom)) CUR.custom=[]; CUR.custom.forEach(addCustomToData);
CUR.placed=TRIP.load('placed',null);
if(!Array.isArray(CUR.placed)) CUR.placed=DEFAULT.map(b=>({...b}));
CUR.placed=CUR.placed.filter(b=>PM[b.id]).map(b=>({uid:TRIP.uids.next(),id:b.id,day:b.day,start:b.start,dur:b.dur||PM[b.id].dur,mk:Array.isArray(b.mk)?b.mk.filter(m=>MARKS[m]):undefined}));
CUR.fmarks=TRIP.load('fmarks',{}); DFLOW.load(); CUR.wish=TRIP.load('wish',[]); if(!Array.isArray(CUR.wish)) CUR.wish=[]; if(!CUR.fmarks||typeof CUR.fmarks!=='object') CUR.fmarks={};
CUR.done=TRIP.load('done',{});
DY.homeMin=60;
CUR.kws=TRIP.kws.load(); if(!Array.isArray(CUR.kws)) CUR.kws=DEFAULT_KW.slice();
CUR.meals=TRIP.load('meals',{}); if(!CUR.meals||typeof CUR.meals!=='object') CUR.meals={};
// where the person is in the app (the open day, tab, picked place, the AI …): app/ui/state.ts, read as UI.day, UI.tab …
// changes to the trip happen in app/data/trip.ts (TRIP.blocks / wish / toggleMark …); not while an AI check tries them out on a copy,
// and blocks first keep the places other travelers shared that they use
TRIP.connectSaving(part=>{if(OPS.state.dry)return false;if(part==='placed')keepShared();return true});
const save=()=>TRIP.blocks.saved();   // saved without uids

// ---------- helpers ----------
const $=s=>document.querySelector(s);
// time text, distances and the day check live in app/logic (JD.logic)
const fmt=JD.logic.time.fmt, parse=JD.logic.time.parse;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// travel between places, opening hours and the day check: app/data/check.ts
const CK=JD.check, travel=CK.travel;

const dayItems=JD.days.dayItems;   // app/data/days.ts: fixed blocks + my blocks of a day
const analyze=CK.analyze, gapsOf=CK.gapsOf;

// ---------- render ----------
// Drawing the 일정표, the 장소 tab, 준비하기, the bottom tabs, the banner, the AI box, 취향 키워드 and the block sheet:
// app/flow/render.ts. What it still needs from the old code is connected here (each one looked up when it runs).
const RENDER=window.JEPI_UI.flow.render;
RENDER.connect({
  hero:p=>hero(p),
  badges:(it,d)=>extras(BLOCK_BADGES,it,d), cardExtras:p=>extras(CARD_EXTRAS,p), sheetExtras:(it,d)=>extras(SHEET_EXTRAS,it,d),
  renderPView:()=>renderPView(), recsMaybe:()=>recsMaybe(),
  openFind:o=>openFind(o), fresh:()=>FRESH, curShared:()=>curShared(), dupInfo:()=>dupInfo(), dock:p=>dock(p), seasonInfo:()=>seasonInfo(),
  fabDodge:()=>fabDodge(), panels:()=>Object.keys(PANELS), diceCloseAnim:()=>diceCloseAnim(),
  touchPlan:()=>touchPlan(), renderMeta:()=>renderMeta(), renderNudges:()=>renderNudges(), renderChat:()=>renderChat(), renderExt:()=>renderExt(), renderLook:()=>renderLook(),
});
const setZoom=RENDER.setZoom, renderBudget=RENDER.renderBudget, drawTrayTop=RENDER.drawTrayTop, trayAct=RENDER.trayAct, renderTray=RENDER.renderTray, ckInfo=RENDER.ckInfo, tabs=RENDER.tabs, renderTabs=RENDER.renderTabs, drawBanner=RENDER.drawBanner, renderAI=RENDER.renderAI, renderPref=RENDER.renderPref, saveKw=RENDER.saveKw, renderAll=RENDER.renderAll;
// ---------- actions ----------
// putting a place in the 일정표, and the block sheet: app/flow/render.ts
const place=RENDER.place, openSheet=RENDER.openSheet, closeSheet=RENDER.closeSheet;
// ---------- AI ----------
async function askAI(){
  if(!UI.sample) return;
  const gaps=gapsOf(UI.day);
  if(!gaps.length){UI.aiState={day:UI.day,status:'error',msg:'이 날은 90분 이상 빈 시간이 없어요. 블록을 조금 빼거나 옮겨 보세요.'};renderAI();return}
  const ctl=new AbortController();
  UI.aiState={day:UI.day,status:'loading',ctl}; renderAI(); dock({aiOff:true});
  try{
    const {items:kept,dropped}=await JD.asks.fillDay(UI.sample,UI.day,ctl.signal);   // the question and its checks: app/data/asks.ts
    UI.aiState={day:UI.day,status:'done',items:kept,dropped};
  }catch(e){
    if(e&&e.code==='cancelled'){UI.aiState=null}
    else if(e&&(e.code==='not_granted'||e.code==='sampling_disabled'||e.code==='not_declared'||e.code==='capability_disabled')){UI.sample=null;UI.aiState={day:UI.day,status:'error',msg:'이 화면에서는 AI 추천을 쓸 수 없어요. 블록은 직접 넣을 수 있어요.'}}
    else if(e&&e.code==='rate_limited'){UI.aiState={day:UI.day,status:'error',msg:'요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 눌러 주세요.'}}
    else if(e&&e.code==='invalid_json'){UI.aiState={day:UI.day,status:'error',msg:'추천 형식을 읽지 못했어요. 한 번 더 눌러 주세요.'}}
    else {UI.aiState={day:UI.day,status:'error',msg:(e&&e.message&&e.code!=='upstream_error'||e&&e.code==='upstream_error'&&e.message?e.message+' · ':'연결이 잠시 끊겼어요. ')+'다시 눌러 주세요.'}}
  }finally{dock({aiOff:false}); renderAll()}
}

// ---------- start over: wipe everything this browser keeps for the page ----------
let wipeArm=false;
function wipeAll(){
  ['profile','pack','placed3','custom','kw','meal2','done','fmarks','wish','coach','dice','jp'].forEach(k=>JD.storage.del('gp.'+k));
  PL.plans.forEach(p=>TRIP.plans.del(p.id)); PL.plans=[]; PL.curPlan='p'+Date.now().toString(36); savePlans();
  CUR.custom=[]; CUR.placed=[]; CUR.fmarks={}; CUR.wish=[]; CUR.kws=[]; CUR.meals={}; CUR.done={}; chat=[]; undoSnap=null; UI.aiState=null; UI.selected=null; hVibe=null; wipeArm=false;
  loadPack(blankPack()); savePack();
  CUR.profile=clone(PROFILE_EXAMPLE); Object.assign(CUR.profile,{stays:[{name:'숙소',area:'center',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],dest:'',pace:'normal',social:'some',breakfast:true,purpose:'',party:{type:'solo',adults:1,kids:0},flightSet:false,staySet:false,dateSet:false,nightsSet:false,dateUnknown:false,startDate:isoPlus(30)}); CUR.profile.stays[0].name='숙소';
  buildDays(); UI.day=0; UI.tab='timeline'; helperShow(false); closeSheet(); renderAll(); openOnb();
}
// ---------- first-use guide ----------
// first-use guide: four steps only; everything else is in 더보기 → 사용 안내 (387-help.js)
const COACH=[{sel:'#grid',t:'일정표예요. 빈 시간을 누르면 앞뒤 일정과 가까운 장소를 골라 넣을 수 있어요.'},
  {sel:'#grid .blk',t:'블록을 누르면 시간을 옮기거나, 대안을 보거나, 🔔 알림을 켤 수 있어요.'},
  {sel:'#diceFab',t:'고민될 땐 🎲. 빈 시간에 할 일이나 오늘 메뉴를 무작위로 골라 줘요.'},
  {sel:'#chatForm',t:'말로 부탁해도 돼요. 바꿀 내용을 먼저 보여 주고, 확인한 뒤에 적용해요. 자세한 사용법은 더보기 → 사용 안내에 있어요.'}];
// the bubble is drawn by React (app/screens/Frames.tsx) from coachView
let coachView={open:false,i:undefined,text:'',step:'',last:false};
function drawCoach(){window.JEPI_UI.mount('coach',$('#coachMount'),coachView)}
function coachAct(n){if(n==='next')showCoach(+coachView.i+1);else if(n==='skip')showCoach(COACH.length)}
function showCoach(i){
  document.querySelectorAll('.coach-hl').forEach(e=>e.classList.remove('coach-hl'));
  if(i>=COACH.length){coachView={...coachView,open:false};drawCoach();store.set('gp.coach',1);return}
  if(!matchMedia('(min-width:900px)').matches&&UI.tab!=='timeline'){UI.tab='timeline';renderTabs()}
  let el=document.querySelector(COACH[i].sel); if(COACH[i].sel==='#grid'&&UI.jp==='P') el=document.querySelector('#pview'); if(COACH[i].sel==='#grid .blk'&&UI.jp==='P') el=document.querySelector('#pview .sq'); if(!el||!el.offsetParent){showCoach(i+1);return}
  if(el){el.classList.add('coach-hl');el.scrollIntoView({block:i===0?'start':'center'})}
  coachView={open:true,i,text:COACH[i].t,step:`${i+1} / ${COACH.length}`,last:i===COACH.length-1}; drawCoach();
}
const maybeCoach=()=>{if(!store.get('gp.coach',0)&&$('#onb').hidden&&!helperOpen()) setTimeout(()=>showCoach(0),400)};
// ---------- events ----------
// open a tab (the bottom tabs, and any button with data-tab: 더보기 rows, back buttons …)
function goTab(name){UI.tab=name;autoMsg='';if(UI.tab==='me'){draft=clone(CUR.profile);meOpen=null;renderMe()}if(UI.tab==='pref'){draft=clone(CUR.profile);renderTasteStyle()}if(UI.tab==='plans'){snapshotCurrent();showText=false;renderPlans()}if(UI.tab==='settings'){keyEdit=null;renderSettings()}if(UI.tab==='more')renderMore();if(PANELS[UI.tab])PANELS[UI.tab].render({opened:true});renderTabs();if(UI.tab==='map')openMap();else mapState.on=false;window.scrollTo({top:0});}
document.addEventListener('click',e=>{
  const t=e.target.closest('button,input,label'); if(!t) return;
  if(t.dataset.tab){if(!t.closest('.tabs'))goTab(t.dataset.tab);return}
  if(t.id==='diceFab'){openDiceTab(DICEV.mealNow()==='snack'?'do':'eat',null);return}
  if(t.id==='coachAgain'){showCoach(0);return}
  if(t.id==='moreHelper'){openHelper(CUR.wish.length?1:0);return}
  // 닫기 in any sheet (#sheet: block, 🎲, 장소 찾기, 직접 만들기)
  if(t.dataset.close&&t.closest('#sheet')){closeSheet();return}
});
document.addEventListener('change',e=>{
  if(e.target.id==='dateUnknown'&&draft){draft.dateUnknown=e.target.checked;if(draft.dateUnknown){draft.startDate=isoPlus(30);draft.dateSet=true}else draft.dateSet=false;rerenderForm();return}
});
$('#sheetBg').addEventListener('click',e=>{if(e.target.id==='sheetBg')closeSheet()});
document.addEventListener('submit',e=>{const f=e.target;
  if(f.id==='customForm'){e.preventDefault();saveCustomForm(f)}
});
document.addEventListener('input',onPf);
document.addEventListener('change',onPf);
// presses on the 일정표 and around it (block sheet, empty time, Day buttons, 간식비, 준비하기, AI box, 취향 키워드, drag & drop):
// app/flow/schedule.ts. What it still needs from the old code is connected here.
const SCHED=window.JEPI_UI.flow.schedule;
SCHED.connect({hero:p=>hero(p),diceFrom:t=>DFLOW.diceFrom(t),openCustom:(id,st)=>openCustom(id,st),
  makePairBlock:(uid,k)=>makePairBlock(uid,k),genSeason:id=>genSeason(id),fixWarns:()=>fixWarns()});
const blockAct=SCHED.blockAct, checksAct=SCHED.checksAct, aiboxAct=SCHED.aiboxAct, gridAct=SCHED.gridAct, kwAct=SCHED.kwAct, dropped=SCHED.dropped;
// 🛠 AI에게 경고 해결 맡기기 (the check list's button and the 경고 chip above the 일정표)
function fixWarns(){const ws=[];DY.days.forEach((_,d)=>analyze(d).items.forEach(it=>it.warns.forEach(w=>ws.push(`Day ${d+1} ${it.name}: ${w}`))));UI.tab='timeline';renderTabs();sendChat('지금 일정의 경고를 모두 해결해 줘. 꼭 필요한 것만 바꾸고, 바꿀 수 없는 고정 일정은 그대로 둬.\n'+ws.slice(0,20).join('\n'));const c=$('#chat');if(c)c.scrollIntoView({block:'start'})}
// 더보기 rows that are not a tab (MoreMenu.tsx): 여행 노트, 여행 꾸미기, 전체 메뉴 보기
function moreAct(id){
  if(id==='nbOpen'){openNotebook();return}
  if(id==='lookOpen'){openLook();return}
  if(id==='moreAll'){moreAll=!moreAll;renderMore();return}
}
// What was pressed in the "더 정확한 일정을 위해 알려 주세요" box (ChatLog.tsx Nudges: a button id, or ✕ with its row)
function nudgeAct(n,v){
  switch(n){
  case 'nudgeFlightIn': goMe('가는 길');return;
  case 'nudgeFlightNo': CUR.profile.bookedFlight=false;TRIP.save('profile',CUR.profile);renderAll();openHelper(2);return;
  case 'nudgeStayIn': if(CUR.profile.bookedStay===false){CUR.profile.bookedStay=true}goMe('숙소');return;
  case 'nudgeStayNo': CUR.profile.bookedStay=false;TRIP.save('profile',CUR.profile);renderAll();openHelper(CUR.wish.length?1:0);return;
  case 'nudgeDate': goMe('여행 기간');return;
  case 'nudgeTaste': UI.tab='pref';renderPref();renderTabs();return;
  case 'off': CUR.profile.nudgeOff=Object.assign({},CUR.profile.nudgeOff,{[v]:true});TRIP.save('profile',CUR.profile);renderNudges();return;
  }
}
// What was pressed on a place card or in the 장소 tab (Tray.tsx, also ♥ in the helper and 👍 in a block's sheet)
function placeAct(n,v){
  switch(n){
  case 'wish': toggleWish(v);if(helperOpen())renderHelper();renderTray();renderPView();return;
  case 'vote': toggleRec(v);return;
  case 'pick': UI.selected=UI.selected===v?null:v; if(UI.selected&&!matchMedia('(min-width:900px)').matches){UI.tab='timeline'} renderAll();return;   // 넣기: then a time slot
  case 'ppick': pPlaceNow(v);return;
  case 'pairec': pAIRec();return;
  case 'pfind': openFind({where:'city',into:'list'});return;
  case 'pnewcard': openCustom(null,null,{card:true});return;
  case 'cat': UI.cat=v||'all';renderTray();return;   // a filter chip or the 분류 list
  case 'zone': {const [z,open]=v.split('~');UI.zoneOpen[z]=open==='1';return}   // a 동네 group folded / unfolded
  case 'dupmerge': {const [a,b]=v.split('~');mergePlaces(a,b);return}
  case 'dupno': {const [a,b]=v.split('~');const no=store.get('gp.dupNo',[])||[];no.push(dupNoKey(a,b));store.set('gp.dupNo',no.slice(-200));renderTray();return}
  }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#sheetBg').hidden)closeSheet();else if(UI.selected){UI.selected=null;renderAll()}}});
// drag & drop (desktop): app/ui/drag.ts marks the slot and works out the time; putting the card / block there: app/flow/schedule.ts dropped
window.JEPI_UI.drag.connectGrid($('#grid'));
matchMedia('(min-width:900px)').addEventListener?.('change',renderTabs);

// ---------- first screen: 새 여행 만들기 / 이미 계정이 있어요 / 데모 둘러보기 ----------
// The screen is React (app/screens/Welcome.tsx): it keeps its own view, logs in, and asks for these (host in 389-titles.js).
var welcomeView='pick';   // where it opens: 'pick' or 'join' (an invite link)
function openWelcome(){welcomeView='pick';renderWelcome();$('#welcome').hidden=false}
function closeWelcome(){$('#welcome').hidden=true}
let welcomeRev=0;
function renderWelcome(){
  const box=$('#welcomeBox'); if(!box) return;
  window.JEPI_UI.mount('welcome',box,{view:welcomeView==='join'?'join':'pick',email:String(SYNC.email||''),rev:++welcomeRev});
}
// after logging in on the first screen: a pending invite, else the newest plan that came with the account, else a new trip
async function welcomeLoggedIn(){
  if(LS.get('jepi.joinCode','')){closeWelcome();if(!(await joinPending())&&firstRun)openOnb();return}
  const mine=PL.plans.filter(p=>p.id!==PL.curPlan&&TRIP.plans.get(p.id)).sort((a,b)=>(b.updated||0)-(a.updated||0));
  closeWelcome();
  if(mine.length){PL.curPlan='';openPlan(mine[0].id);startupFocus();showToast(`로그인했어요 · 계획 ${mine.length}개를 가져왔어요`)}
  else{openOnb();showToast('로그인했어요 · 아직 저장된 여행이 없어서 새로 만들어요')}
}
// ---------- demo: enter / leave (the sandbox itself is in app/data/demo.ts) ----------
function demoEnter(){
  if(!JD.demo.demoSaveCopy()){showToast('저장 공간이 부족해서 데모를 열 수 없어요');return}
  JD.demo.demoClearTrips();
  const d=demoOsaka(), set=JD.storage.set;
  set('gp.pack',d.pack); TRIP.save('profile',d.profile); TRIP.save('placed',d.placed); TRIP.save('custom',[]); TRIP.kws.save([]); set('gp.jp','J');
  TRIP.plans.put('demo',{profile:d.profile,pack:d.pack,placed:d.placed});
  TRIP.plans.saveList([{id:'demo',name:d.name,custom_name:true,updated:Date.now(),kind:'trip',dates:'',blocks:d.placed.length}],'demo');
  try{sessionStorage.setItem(DEMO_LIVE,'1')}catch(_){}
  location.replace(location.pathname);
}
function demoExit(){demoRestore();location.replace(location.pathname)}
function renderDemoBar(){
  const bar=$('#demoBar'); if(!bar) return; bar.hidden=!DEMO.on; document.body.classList.toggle('demo-on',DEMO.on);
}
document.addEventListener('click',e=>{if(e.target.closest('#demoExit'))demoExit()});
// test hooks (local checks only)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__jepi={demoEnter,navLink,routeProvider,sync:()=>syncNow(),state:()=>({cur:PL.curPlan,plans:PL.plans.map(p=>({id:p.id,shared:p.shared,role:p.role}))}),demoLikeTrip(){const d=demoOsaka();d.pack.demo=false;applyPlanData({profile:d.profile,pack:d.pack,placed:d.placed});onbFrame({open:false});snapshotCurrent();renderAll()}};
// ---------- tidy day screen: one summary line; details open on tap ----------
// The route strip, today's cost, warnings, free gaps and "tell us more" nudges used to sit above the
// timeline all at once. Now one line of chips shows the numbers and each chip opens its part.
const sumAct=SCHED.sumAct;   // app/flow/schedule.ts
// ---------- 영업시간: real opening hours from Google Places (abroad), AI estimate in Korea ----------
// The lookups, the 30-day cache and the monthly cap live in app/data/hours.ts (rules: app/logic/hours.ts). Here: the trip side.
const HOURS_CAP=JD.hours.CAP, hoursUse=add=>JD.hours.used(add), hoursSweep=()=>JD.hours.sweep();
JD.hours.connectHours({placesOnSchedule:()=>[...new Set(CUR.placed.map(b=>b.id))].map(id=>PM[id]).filter(Boolean),googleKey:()=>KEYS.gmaps||'',keyBad:()=>isBad('gmaps'),
  demo:()=>!!DEMO.on,inKorea:ll=>inKR(ll),city:()=>PK.pack.city||'',changed(){savePack();TRIP.customs.saved();renderAll();touchPlan()}});
// ---------- 친구와 함께: shared trips, invite links, 가고 싶어요 ----------
// A shared trip keeps its plan in jepi_trips (one row, `rev` goes up by one on every save).
// Each device remembers the last server version it saw (`base`). When two people change the
// same trip, the three versions are merged per block / per place / per field, so a change to
// day 1 and a change to day 2 both survive; only the very same block edited twice keeps the later one.
// Server tables + rules: see supabase/schema.sql.
// The server side (push / pull / share / invite / join / leave / stop) and the merge rules live in app/data/trips.ts
// and app/data/merge.ts. Here: the screen side. TRIPS is the same object as JD.trips.state (base, members, marks)
// plus what the friends panel shows (invite, msg, busy, stopArm).
var TRIPS=Object.assign(JD.trips.state,{invite:null,msg:'',busy:false,stopArm:false});
const myName=()=>LS.get('jepi.myName','')||String((SYNC.sess&&SYNC.sess.email)||SYNC.email||'나').split('@')[0];
const planOf=id=>PL.plans.find(p=>p.id===id);
const curShared=()=>{const p=planOf(PL.curPlan);return p&&p.shared?p:null};
// a new version of the open plan: put it in, unless the person is typing or has a sheet open (then the next pull tries again)
function applyIfOpen(id,data,who){
  if(id!==PL.curPlan) return true;
  const ae=document.activeElement, editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden||UI.selected;
  if(editing) return false;
  const d0=UI.day; applyPlanData(data); UI.day=Math.min(d0,Math.max(0,DY.days.length-1)); renderAll();
  if(who&&who!==myName()) showToast(`${who}님이 일정을 바꿨어요`);
  return true;
}
JD.trips.connectTrips({plans:()=>PL.plans,curPlan:()=>PL.curPlan,savePlans:()=>savePlans(),applyIfOpen,myName,snapshotCurrent:()=>snapshotCurrent(),toast:m=>showToast(m),
  pulled(listChanged){if(listChanged){renderPlans();renderExt()} if(curShared()) renderAll(); if(UI.tab==='friends') PANELS.friends.render()}});
const tripPush=id=>JD.trips.push(id), tripsPull=()=>JD.trips.pull(), tripShare=()=>JD.trips.share(), tripInvite=role=>JD.trips.invite(role,location.origin+location.pathname);
const tripLeave=uid=>JD.trips.leave(uid), tripStop=()=>JD.trips.stop();
SYNC_AFTER_PUSH.push(async()=>{for(const p of PL.plans.filter(p=>p.shared)) await tripPush(p.id)});
SYNC_AFTER_PULL.push(tripsPull);
async function tripJoin(code){
  const id=await JD.trips.join(code); const p=planOf(id);
  if(p){PL.curPlan=PL.curPlan===id?'':PL.curPlan;openPlan(id);showToast('여행에 참여했어요')}
  return id;
}
// join link: ?join=CODE
function joinFromUrl(){
  const code=new URLSearchParams(location.search).get('join'); if(!code) return false;
  history.replaceState(null,'',location.pathname); LS.set('jepi.joinCode',code);
  if(syncOn()){joinPending();return true}
  welcomeView='join';renderWelcome();$('#welcome').hidden=false;return true;
}
async function joinPending(){
  const code=LS.get('jepi.joinCode',''); if(!code||!syncOn()) return false;
  LS.del('jepi.joinCode');
  try{await tripJoin(code);return true}catch(e){showToast(/expired|invite/i.test(e.message)?'초대 링크가 만료됐어요. 새 링크를 받아 주세요.':'참여하지 못했어요: '+e.message);return false}
}
// ----- 가고 싶어요 (the marks live in app/data/trips.ts) -----
const wantsOf=pid=>JD.trips.wantsOf(pid), iWant=pid=>JD.trips.iWant(pid);
const toggleWant=pid=>curShared()?JD.trips.toggleWant(pid,renderTray):Promise.resolve();
// 가고 싶어요 chip, card tag, sheet row, block badge (drawn by React: app/screens/Extras.tsx)
function wantChip(pid){
  const m=wantsOf(pid), on=iWant(pid), who=m.map(x=>x.user_id===SYNC.sess.user?'나':x.name).join(', ');
  return {k:'want',pid:String(pid),on:!!on,n:m.length,who};
}
CARD_EXTRAS.push(p=>curShared()?[wantChip(p.id),...(p.by?[{k:'tag',cls:'tag usr',t:`${p.by===myName()?'내가':p.by+'님'} 추천`}]:[])]:null);
SHEET_EXTRAS.push(it=>curShared()&&it.kind==='place'?{k:'wantRow',want:wantChip(it.id),by:it.p.by||''}:null);
BLOCK_BADGES.push(it=>{if(!curShared()||it.kind!=='place')return null;const n=wantsOf(it.id).length;return n?{k:'badge',t:`👍${n}`,title:`가고 싶어요 ${n}`}:null});
// 👍 가고 싶어요 on a shared trip's place (Extras.tsx)
async function wantAct(pid){try{await toggleWant(pid)}catch(err){showToast('저장하지 못했어요: '+err.message)}
  if(!$('#sheetBg').hidden&&$('#sheet').dataset.uid)openSheet($('#sheet').dataset.uid)}
// 친구와 함께 panel (FriendsPanel.tsx tells: what was pressed, and whose 내보내기 / the typed name)
async function tripAct(a,uid,typed){
  if(TRIPS.busy) return; if(a!=='stop') TRIPS.stopArm=false; TRIPS.busy=true; TRIPS.msg=''; PANELS.friends.render();
  try{
    if(a==='share'){await tripShare();TRIPS.invite={role:'edit',url:await tripInvite('edit')}}
    if(a==='invite-edit'||a==='invite-view'){const role=a.slice(7);TRIPS.invite={role,url:await tripInvite(role)}}
    if(a==='send'&&TRIPS.invite){const txt=`${planOf(PL.curPlan).name} 여행을 같이 짜요 · JEPI`;
      if(navigator.share){try{await navigator.share({title:'JEPI 여행 초대',text:txt,url:TRIPS.invite.url})}catch(_){}}
      else{try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='아래 링크를 길게 눌러 복사해 주세요'}}}
    if(a==='copy'&&TRIPS.invite){try{await navigator.clipboard.writeText(TRIPS.invite.url);TRIPS.msg='초대 링크를 복사했어요'}catch(_){TRIPS.msg='링크를 길게 눌러 복사해 주세요'}}
    if(a==='leave') await tripLeave();
    if(a==='kick') await tripLeave(uid);
    if(a==='stop'){if(!TRIPS.stopArm){TRIPS.stopArm=true;TRIPS.busy=false;PANELS.friends.render();return}TRIPS.stopArm=false;await tripStop()}
    if(a==='name'){const v=String(typed||'').trim().slice(0,20);LS.set('jepi.myName',v);
      if(curShared())await sbTable('jepi_trip_members','PATCH',`?trip_id=eq.${encodeURIComponent(PL.curPlan)}&user_id=eq.${SYNC.sess.user}`,{name:myName()},'return=minimal');TRIPS.msg='이름을 바꿨어요';await tripsPull()}
  }catch(err){TRIPS.msg='✕ '+err.message}
  TRIPS.busy=false; PANELS.friends.render(); renderMore();
}
// ----- panel -----
// The panel itself is drawn by React: app/screens/FriendsPanel.tsx
PANELS.friends={render(opts){
  const box=$('#friendsBox'); if(!box) return; const p=curShared();
  if(opts&&opts.opened) TRIPS.stopArm=false; // opening the panel again forgets a first press of 공유 끝내기
  const mode=DEMO.on?'demo':!syncOn()?'login':!p?'intro':'shared';
  window.JEPI_UI.mount('friends',box,{mode,planName:(planOf(PL.curPlan)||{}).name||'이 여행',busy:!!TRIPS.busy,msg:TRIPS.msg||'',myName:myName(),
    members:mode==='shared'?(TRIPS.members[PL.curPlan]||[]):[],me:syncOn()?SYNC.sess.user:'',role:p?p.role||'':'',invite:TRIPS.invite||null,stopArm:!!TRIPS.stopArm});
}};
// ---------- one place-finding screen, many doors ----------
// Every "find places" button opens this same sheet with its conditions already picked:
//   어디 (near today's plan / one area / whole city) · 언제 (a free gap / any time) · 넣을 곳 (schedule / list only)
// Results always come back with the same three choices as chat: 일정에 넣기 / 장소에만 / 안 함.
// Chat and 🎲 DICE keep their own way of asking; only how results are kept is shared.
let FIND={where:'near',area:'',when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null};
function findAreaOfDay(){const it=analyze(UI.day).items.find(i=>!i.stay&&i.area);return it?it.area:''}
function openFind(o){
  FIND=Object.assign({where:'near',area:firstArea(),when:'any',gap:null,into:'list',q:'',busy:false,res:[],ctl:null,cursor:null},o||{});
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
      return {id:r.id,name:String(p.name),meta,note:p.note?String(p.note):'',c:r.c||'',txt:r.txt||''}}).filter(Boolean),rev:findRev});
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
  if(n==='submit'){FIND.q=String(typed||'').trim();runFind();return}
  if(n==='r'){const [id,act]=String(v).split(':'), r=FIND.res.find(x=>x.id===id), p=PM[id]; if(!r||!p) return;
    if(act==='skip'){findDrop(id);r.c='skip';r.txt='넣지 않았어요'}
    else if(act==='list'){r.c='list';if(UI.jp==='P'){if(!isWish(id))toggleWish(id);r.txt='내 카드에 담았어요'}else r.txt='장소 목록에 넣었어요'}
    else if(FIND.when==='gap'&&FIND.gap){
      const st=Math.max(FIND.cursor||FIND.gap[0],FIND.gap[0]), rr=repairOps([{op:'add',day:UI.day,id,start:fmt(st),dur:p.dur}]);
      applyOpsCore(rr.ops); save(); FIND.cursor=parse(rr.ops[0].start)+p.dur+20;
      r.c='sched'; r.txt=`${rr.ops[0].start}에 넣었어요${rr.warns.length?` · 확인할 것 ${rr.warns.length}`:''}`; renderAll();
    } else {UI.selected=id;r.c='pick';r.txt='일정표에서 넣을 시간을 탭하세요';closeSheet();UI.tab='timeline';renderAll();return}
    findRowsUpdate(); renderTray(); return}
}
// ---------- 알림: push notifications while travelling ----------
// The server / device side and the settings live in app/data/alerts.ts, which reminders and time zones in
// app/logic/alerts.ts; the panel and the 🔔 row in a block's sheet handle their own buttons. Here: the trip side.
const AL=JD.alerts;
var NOTIFY=AL.settings;   // the same object (on, all, lead, depart, morning)
const pushSupported=AL.pushSupported, isIOS=AL.isIOS, standaloneApp=AL.standaloneApp;
// which blocks can ring: places and fixed things like check-in / flights, not the night at the hotel
const alertKey=(it,d)=>`${it.kind==='place'?it.id:it.uid}@${d}`;
const alertable=it=>!it.stay&&(it.kind==='place'||it.kind==='fixed');
const alertOn=(it,d)=>AL.isOn(alertKey(it,d));
const tripTZ=()=>JD.logic.alerts.tripTZ(PK.pack);
const alertsSoon=ms=>AL.soon(ms);
AL.connectAlerts({curPlan:()=>PL.curPlan,tz:tripTZ,demo:()=>!!DEMO.on,redraw:()=>{PANELS.notify.render();renderMore();renderAll()},
  days:()=>DY.days.map((D,d)=>({iso:D.iso||'',rows:D.iso?analyze(d).items.filter(alertable).map(it=>({key:alertKey(it,d),name:String(it.name),start:it.start,end:it.end,locName:it.locName||'',travelIn:it.travelIn||null})):[]}))});
BLOCK_BADGES.push((it,d)=>alertable(it)&&alertOn(it,d)&&NOTIFY.on?{k:'badge',t:'🔔',title:'알림 켜짐'}:null);
SHEET_EXTRAS.push((it,d)=>{if(!alertable(it)||DEMO.on)return null;const on=alertOn(it,d);
  return {k:'alert',key:alertKey(it,d),on:!!on,hint:!NOTIFY.on?'더보기 → 알림에서 이 기기 알림을 켜야 와요':on?(NOTIFY.depart&&it.travelIn?`출발 ${NOTIFY.lead}분 전에 알려 드려요`:`시작 ${NOTIFY.lead}분 전에 알려 드려요`):''}});
// The panel itself is drawn by React: app/screens/NotifyPanel.tsx
PANELS.notify={render(){
  const box=$('#notifyBox'); if(!box) return;
  const mode=DEMO.on?'demo':!pushSupported()?(isIOS()&&!standaloneApp()?'ios-home':'unsupported'):!syncOn()?'login':'ready';
  window.JEPI_UI.mount('notify',box,{mode,busy:AL.ui.busy,msg:AL.ui.msg||'',tz:String(tripTZ()),
    settings:{on:!!NOTIFY.on,all:!!NOTIFY.all,lead:+NOTIFY.lead||10,depart:!!NOTIFY.depart,morning:!!NOTIFY.morning}});
}};
// keep the server's list in step with the plan (cheap: only uploads when something changed)
setInterval(()=>{if(NOTIFY.on&&!document.hidden)alertsSoon(100)},30000);
// ---------- 사용 안내 (더보기 → 사용 안내) ----------
// The screen itself is drawn by React: app/screens/HelpPanel.tsx
PANELS.help={render(){
  const box=$('#helpBox'); if(!box) return;
  window.JEPI_UI.mount('help',box,{demoOn:!!DEMO.on,onCoach(){UI.tab='timeline';renderTabs();showCoach(0)},onDemo(){demoEnter()}});
}};
// ---------- same place twice: catch it when adding, offer to merge what is already doubled ----------
// "Same place" = within 100 m and a similar name (one contains the other, or most letter pairs match).
// Nothing is merged automatically: a branch of the same chain can sit next door.
// the rules live in app/logic/places.ts
const nameSim=JD.logic.places.nameSim, samePlace=JD.logic.places.samePlace;
const dupOf=pl=>P.find(p=>!p.shared&&samePlace(p,pl))||null;

// --- already doubled: suggest merging at the top of the 장소 tab ---
const dupNoKey=(a,b)=>[a,b].sort().join('~');
function dupPairs(){
  const no=new Set(store.get('gp.dupNo',[])||[]), mine=P.filter(p=>!p.shared), out=[];
  for(let i=0;i<mine.length&&out.length<3;i++)for(let j=i+1;j<mine.length;j++){
    const a=mine[i],b=mine[j]; if(samePlace(a,b)&&!no.has(dupNoKey(a.id,b.id))){out.push([a,b]);break}}
  return out;
}
// the "같은 곳 같아요" cards at the top of 장소 (drawn by React: Tray.tsx)
function dupInfo(){
  const who=p=>p.custom?'직접 추가':p.by?`${p.by} 추천`:p.ai||FRESH.has(p.id)?'AI가 찾음':'장소 목록';
  return dupPairs().map(([a,b])=>({a:a.id,b:b.id,why:a.custom||b.custom?'이름이 비슷해요':'위치가 가깝고 이름이 비슷해요',aWho:who(a),aName:a.name,bWho:who(b),bName:b.name}));
}
function mergePlaces(aId,bId){
  let a=PM[aId], b=PM[bId]; if(!a||!b) return;
  // keep the one already in the schedule, else the one that is not hand-made
  const inUse=id=>CUR.placed.some(x=>x.id===id);
  if((inUse(b.id)&&!inUse(a.id))||(a.custom&&!b.custom)){const t=a;a=b;b=t}
  CUR.placed.forEach(x=>{if(x.id===b.id)x.id=a.id});
  if(isWish(b.id)&&!isWish(a.id)) toggleWish(a.id); if(isWish(b.id)) toggleWish(b.id);
  if(b.note&&b.note!==a.note&&!/직접 만든 블록이에요/.test(b.note)) a.note=[a.note,b.note].filter(Boolean).join(' · ').slice(0,300);
  if(b.by&&!a.by) a.by=b.by;
  if(b.custom)TRIP.customs.remove(b.id);
  const k=PK.pack.places.findIndex(x=>x.id===b.id); if(k>=0) PK.pack.places.splice(k,1);
  const ka=PK.pack.places.find(x=>x.id===a.id); if(ka){ka.note=a.note;if(a.by)ka.by=a.by}
  savePack();
  const i=P.findIndex(x=>x.id===b.id); if(i>=0) P.splice(i,1); delete PM[b.id]; FRESH.delete(b.id);
  save(); renderAll(); showToast(`"${a.name}" 하나로 묶었어요`);
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.dupuse){ // typing a name in "직접 만들기" found a place that is already there → schedule that one instead
    const p=PM[t.dataset.dupuse]; if(!p) return; const st=$('#cfStart')?parse($('#cfStart').value):null;
    TRIP.blocks.add({id:p.id,day:UI.day,start:Math.max(dayStart(UI.day),Math.min(1410,st??600)),dur:p.dur});closeSheet();renderAll();showToast(`이미 있는 "${p.name}"을(를) 일정에 넣었어요`);return}
});
// --- while typing a new place's name: show places that are already there ---
document.addEventListener('input',e=>{
  if(e.target.id!=='cfName'||$('#customForm')?.dataset.edit) return;
  if(!customLast||!$('#customForm')) return;
  const q=e.target.value.trim();
  const hits=q.length<2?[]:P.filter(p=>!p.drop&&(nameSim(p.name,q)>=.5||norm(p.name).includes(norm(q)))).slice(0,4);
  customLast=Object.assign({},customLast,{dup:hits.map(p=>({id:String(p.id),name:String(p.name),sub:`${p.area||''}${p.shared?' · 여행자 추천':''}${CUR.placed.some(x=>x.id===p.id)?' · 이미 일정에 있어요':''}`}))});
  window.JEPI_UI.mount('custom',$('#sheet'),customLast);   // same rev: what is typed stays
});
// local test hooks (tools/checks.js)
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&window.__jepi) Object.assign(window.__jepi,{
  dupTest(){const a=P.find(p=>!p.custom&&!p.drop&&!CUR.placed.some(b=>b.id===p.id));const b=Object.assign({},a,{id:'dupx',name:a.name+' 본점'});PK.pack.places.push(b);addPackPlace(b);renderTray();return a.name},
  has:id=>!!PM[id], openCustom:()=>openCustom(), openFind:o=>openFind(o)});
// ---------- day titles the traveler can rename ----------
// profile.dayTitles[d] overrides the automatic "Day 1 · 도착" title (rules: app/logic/memo.ts). The ✎ form is React
// (app/screens/DayTitleForm.tsx, it saves itself); here: the header around it.
const dayTitleOf=SCHED.dayTitleOf, titleEditing=SCHED.titleEditing;   // app/flow/schedule.ts
// what React screens may ask of the old code (app/ui/host.ts)
window.JEPI_UI.connectHost({renderAll:()=>renderAll(),closeSheet:()=>closeSheet(),reopenSheet:()=>{const u=$('#sheet').dataset.uid;if(u&&u!=='dice'&&!$('#sheetBg').hidden)openSheet(u)},toast:m=>showToast(m),day:()=>UI.day,autoTitle:d=>String((DY.days[d]||{}).title||''),titleEditing,
  closeNotebook:()=>closeNotebook(),renamePlan:nm=>lookRenamePlan(nm),aiDayTitles:n=>lookAiTitles(n),errText:(e,w)=>errText(e,w),welcomeNew:()=>{closeWelcome();openOnb()},welcomeDemo:()=>demoEnter(),welcomeLoggedIn:()=>welcomeLoggedIn(),dice:(n,v,m)=>diceAct(n,v,m),place:(n,v)=>placeAct(n,v),plans:(n,v,v2)=>plansAct(n,v,v2),helper:(n,v,v2)=>helperAct(n,v,v2),helperFrame:n=>helperFrameAct(n),dock:(n,v)=>dockAct(n,v),tray:(n,v)=>trayAct(n,v),tab:n=>goTab(n),onbFrame:n=>onbFrameAct(n),hero:n=>heroAct(n),miniDay:s=>{const n=UI.day+s;if(n>=0&&n<DY.days.length){UI.day=n;renderAll()}},mapTop:n=>mapTopAct(n),coach:n=>coachAct(n),banner:()=>{UI.selected=null;renderAll()},chat:(n,v)=>chatAct(n,v),pview:(n,v)=>pviewAct(n,v),kw:(n,v)=>kwAct(n,v),grid:(n,v)=>gridAct(n,v),block:(n,v,o)=>blockAct(n,v,o),checks:(n,v,o)=>checksAct(n,v,o),aibox:(n,v)=>aiboxAct(n,v),settings:(n,v,v2)=>settingsAct(n,v,v2),form:(n,v,o)=>formAct(n,v,o),sum:(n,v)=>sumAct(n,v),trip:(a,u,t)=>tripAct(a,u,t),want:p=>wantAct(p),find:(n,v,t)=>findAct(n,v,t),planMenu:(n,v)=>planMenuAct(n,v),more:id=>moreAct(id),mapCard:i=>mapCardAct(i),dropped:(k,id,m)=>dropped(k,id,m),nudge:(n,v)=>nudgeAct(n,v),importFile:f=>importBackup(f,ok=>{if(ok){maybeCoach()}}),shareNotebook:async()=>{await shareLink(true);return planMsg||'링크를 만들었어요'}});
// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// profile.look = {color, cover:'city'|'sea'|'mountain'|'none'|'photo', photo:dataURL, tagline, style:'color'|'note', hand}
// Lives in the plan's profile, so it syncs across devices and to friends on a shared trip.
const LOOK_COLORS=[['#2448c9','코발트'],['#c23b22','노을'],['#0f7a5c','숲'],['#6b2fb3','보라'],['#0e7490','바다'],['#b45309','호박'],['#be185d','체리'],['#2b2a33','먹']];
const LOOK_HANDS=[['pen','나눔펜','"Nanum Pen Script"'],['gaegu','개구','"Gaegu"'],['melody','하이멜로디','"Hi Melody"']];
const LOOK_COVERS=[['city','도시'],['sea','바다'],['mountain','산'],['none','없음']];
const lookOf=()=>Object.assign({color:'#2448c9',pop:'#ffd23f',cover:'city',tagline:'',style:'color',hand:'pen',photo:''},(CUR.profile&&CUR.profile.look)||{});
function coverSVG(kind,w,h){
  const k=kind||'city';
  if(k==='sea') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="38" r="18" fill="var(--pop)"/><path d="M0 92 C40 84,80 100,200 86 V120 H0Z" fill="#fff" fill-opacity=".16"/><path d="M0 104 C50 96,110 114,200 100 V120 H0Z" fill="#000" fill-opacity=".18"/></svg>`;
  if(k==='mountain') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="160" cy="30" r="16" fill="var(--pop)"/><path d="M40 120 L100 50 L130 86 L150 66 L200 120Z" fill="#000" fill-opacity=".2"/><path d="M100 50 L112 64 L88 64Z" fill="#fff" fill-opacity=".7"/></svg>`;
  if(k==='none'||k==='photo') return '';
  return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="34" r="20" fill="var(--pop)" fill-opacity=".9"/><path d="M0 120 V84 H16 V64 H34 V90 H50 V52 H62 L68 44 L74 52 V92 H96 V70 H116 V96 H134 V60 H150 V88 H170 V74 H200 V120Z" fill="#000" fill-opacity=".18"/></svg>`;
}
// the header is drawn by React (app/screens/Hero.tsx) from heroView; hero({…}) changes some of it and draws again
let heroView={artHtml:'',artBg:'',artPhoto:false,jp:'J',planName:'',planOpen:false,meta:'',tag:'',day:'',title:'',sub:'',memo:'',editing:false,slot:false};
function hero(p){heroView={...heroView,...p};window.JEPI_UI.mount('hero',$('#heroMount'),heroView)}
// pressed in the header
function heroAct(n){
  if(n==='look')openLook();
  else if(n==='J'||n==='P'){setJP(n);renderAll()}
  else if(n==='plan')planMenu(document.getElementById('planMenu').hidden);
  else if(n==='title'){if(!$('#dayTitleIn'))titleEditing(true)}
}
function renderLook(){
  const L=lookOf(), R=document.documentElement.style, note=L.style==='note';
  R.setProperty('--theme',L.color); R.setProperty('--pop',L.pop);
  R.setProperty('--f-hand',(LOOK_HANDS.find(x=>x[0]===L.hand)||LOOK_HANDS[0])[2]+', cursive');
  document.body.classList.toggle('style-note',note);
  {const photo=L.cover==='photo'&&L.photo, p={
    artBg:photo?`linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.45)),url("${L.photo}")`:'',artPhoto:!!photo,
    artHtml:note?`<div class="stamp"><span>${esc((PK.pack.city||'TRIP').slice(0,8))}</span><b>${esc(((DY.days[0]||{}).date||'').replace(/\s.*/,''))}</b><span>${esc(String(new Date().getFullYear()))}</span></div>`:photo?'':coverSVG(L.cover,190,120),
    tag:L.tagline||''};
  if(DY.days[UI.day]){const D=DY.days[UI.day];p.day=note?`CHAPTER ${UI.day+1} · ${D.date} ${WD[D.wd]}`:`DAY ${String(UI.day+1).padStart(2,'0')} · ${D.date} ${WD[D.wd]}`}
  hero(p)}
  renderDayMemo(); miniUpdate();
}
// --- folding header: the hero scrolls away and a one-line bar takes its place ---
// (drawn by React: app/screens/Bars.tsx, from miniView; miniBar({…}) changes some of it and draws again)
let miniView={on:false,day:'',dayHidden:false,title:'',navHidden:false};
function miniBar(p){miniView={...miniView,...p};window.JEPI_UI.mount('mini',$('#miniMount'),miniView)}
function miniUpdate(){
  const D=DY.days[UI.day]; if(!D) return; const onDay=document.body.dataset.tab==='timeline'||!document.body.dataset.tab;
  miniBar({day:onDay?String(UI.day+1).padStart(2,'0'):'',dayHidden:!onDay,title:onDay?dayTitleOf(UI.day):($('#planName')?$('#planName').textContent:''),navHidden:!onDay||DY.days.length<2});
}
function heroWatch(){
  const hero=$('#hero'); if(!hero) return;
  let raf=0;
  const on=()=>{raf=0;const h=hero.offsetHeight||1, y=window.scrollY, t=Math.max(0,Math.min(1,y/Math.max(1,h-64)));
    hero.style.setProperty('--fold',t.toFixed(3));
    const mini=y>h-64; if(document.body.classList.contains('mini')!==mini){document.body.classList.toggle('mini',mini);miniBar({on:mini})}};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(on)},{passive:true}); on();
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
});
// --- 여행 꾸미기 sheet: drawn by React (app/screens/LookSheet.tsx), which keeps its own draft and saves itself ---
let lookRev=0;
function openLook(){
  const L=lookOf();
  window.JEPI_UI.mount('look',$('#sheet'),{name:(PL.plans.find(x=>x.id===PL.curPlan)||{}).name||planName(),tagline:L.tagline||'',style:L.style,color:L.color,cover:L.cover,hand:L.hand,photo:L.photo||'',pop:L.pop,
    colors:LOOK_COLORS,covers:LOOK_COVERS.map(([k,n])=>({k,name:n,svg:coverSVG(k,64,40)})),hands:LOOK_HANDS,
    days:DY.days.map((D,i)=>({title:((CUR.profile.dayTitles||[])[i])||'',placeholder:String(D.title)})),ai:!!UI.sample,rev:++lookRev});
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
}
// the question for AI로 지어 보기 (asked by the sheet through the host)
const lookAiTitles=tripName=>JD.asks.dayTitles(UI.sample,tripName);   // app/data/asks.ts
function lookRenamePlan(nm){const p=PL.plans.find(x=>x.id===PL.curPlan);if(p&&nm&&nm!==p.name){p.name=nm;p.custom_name=true;savePlans()}}
// ---------- handwritten memos: one line per block, one line per day ----------
// The rules live in app/logic/memo.ts; the memo box in a block's sheet saves itself (app/screens/Extras.tsx MemoBox).
const memoKey=SCHED.memoKey, blockMemoOf=SCHED.blockMemoOf, dayMemoOf=SCHED.dayMemoOf, renderDayMemo=SCHED.renderDayMemo;   // app/flow/schedule.ts
SHEET_EXTRAS.push(it=>it&&it.id?{k:'memo',key:memoKey(it,UI.day),value:blockMemoOf(it,UI.day)}:null);   // drawn by React: Extras.tsx
// ---------- 여행 노트 보기: the whole trip as one notebook (cover + a chapter per day) ----------
// Read-only. "PDF로 저장" uses the browser's print (print CSS in 17-look.css keeps only the notebook).
// "링크로 보내기" sends the usual share link with &note=1, so the receiver opens straight into the notebook.
// drawn by React: app/screens/Notebook.tsx
let notebookRev=0;
function notebookInfo(){
  const L=lookOf(), name=(PL.plans.find(x=>x.id===PL.curPlan)||{}).name||planName();
  const D0=DY.days[0]||{}, Dn=DY.days[DY.days.length-1]||{};
  const photo=L.cover==='photo'&&L.photo;
  const cover={photo:photo?String(L.photo):'',svg:photo?'':coverSVG(L.cover,260,156),city:String((PK.pack.city||'TRIP').slice(0,8)),date:String(D0.date||'').replace(/\s.*/,''),name:String(name),
    line:[D0.date&&Dn.date?`${D0.date} — ${Dn.date}`:'',DY.days.length>1?`${DY.days.length-1}박 ${DY.days.length}일`:'하루',L.tagline].filter(Boolean).join(' · ')};
  const days=DY.days.map((D,d)=>{
    const {items,trans}=analyze(d), list=items.filter(i=>!(i.stay&&i!==items[items.length-1]));
    const rows=list.map((it,k)=>{
      const prev=k?list[k-1]:null, t=prev?trans.find(x=>x.from>=prev.end-5&&x.from<=it.start):null;
      return {mv:t?`↓ ${t.mode} ${t.min}분${t.fare?' · '+yen(t.fare):''}`:'',time:fmt(it.start),name:String(it.name),memo:String(blockMemoOf(it,d)||'')}});
    return {ch:`CHAPTER ${d+1} · ${D.date} ${WD[D.wd]}`,title:String(dayTitleOf(d)),memo:String(dayMemoOf(d)||''),rows};
  });
  return {cover,days,rev:++notebookRev};
}
function openNotebook(){
  let nb=$('#notebook'); if(!nb){nb=document.createElement('div');nb.id='notebook';nb.className='notebook';nb.setAttribute('role','dialog');nb.setAttribute('aria-label','여행 노트');document.body.appendChild(nb)}
  window.JEPI_UI.mount('notebook',nb,notebookInfo()); nb.hidden=false; nb.scrollTop=0; document.body.style.overflow='hidden';
}
function closeNotebook(){const nb=$('#notebook');if(nb)nb.hidden=true;document.body.style.overflow=''}

// ---------- start-up: runs after every file above has defined its variables ----------
if(STANDALONE) UI.sample=makeSample();
hero({}); onbFrame({}); tabs({}); miniBar({}); dock({}); drawTrayTop(); mapTop({}); drawHelperFrame(); drawCoach(); drawBanner();   // the fixed frames (React)
PL.plans=TRIP.plans.list()||[]; if(!Array.isArray(PL.plans)) PL.plans=[]; PL.curPlan=TRIP.plans.current()||''; if(!PL.curPlan){PL.curPlan='p'+Date.now().toString(36);savePlans()}
setZoom(store.get('gp.zoom',60),true);
setJP(store.get('gp.jp',CUR.profile.kind==='day'?'P':'J'),true);
buildDays();
renderAll();
applyTheme(); introRun(); syncBoot();
if(/[#&]s=/.test(location.hash)) openShared(); else if(joinFromUrl()){} else if(firstRun&&!syncOn()&&!/access_token/.test(location.hash)) openWelcome(); else if(firstRun) openOnb(); else {startupFocus(); maybeCoach();}
renderDemoBar();
setTimeout(hoursSweep,4000); setInterval(hoursSweep,20000);
diceFromUrl();
// scroll to morning
setTimeout(()=>{const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  const g=$('#grid'); if(g) window.scrollTo({top:0})},0);
// AI availability
const showErr=m=>{const b=document.getElementById('errbar');if(!b)return;b.textContent='문제가 생겼어요: '+String(m).slice(0,160);b.hidden=false;clearTimeout(showErr.t);showErr.t=setTimeout(()=>{b.hidden=true},8000)};
window.addEventListener('error',e=>showErr(e.message||'알 수 없는 오류'));
window.addEventListener('unhandledrejection',e=>{const r=e.reason;if(r&&r.code==='cancelled')return;showErr((r&&(r.message||r.code))||r)});
initRecs(); heroWatch();
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
(async()=>{try{ if(window.claude&&window.claude.use){ const s=await window.claude.use('sample'); if(s){UI.sample=s; renderAI(); renderChat(); renderTray(); if(!$('#onb').hidden) renderOnb(); else if(UI.tab==='me') renderMe()} } }catch(_){} })();
// iOS Safari only shows :active (press feedback) once the page listens for touches
document.addEventListener('touchstart',()=>{},{passive:true});
})();
