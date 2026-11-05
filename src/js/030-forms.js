// ---------- forms shared by onboarding and the "내 정보" tab ----------
let draft=null, onbStep=0, onbRev=0;
const opt=(v,l,sel)=>`<option value="${esc(v)}"${String(v)===String(sel)?' selected':''}>${esc(l)}</option>`;
const areaOpts=sel=>Object.entries(AREAS).map(([k,v])=>opt(k,v[0],sel)).join('');
const apOpts=sel=>Object.keys(AIRPORTS).map(k=>opt(k,AIRPORTS[k].name,sel)).join('');
const inp=(path,val,type='text',extra='')=>`<input type="${type}" data-pf="${path}" value="${esc(val??'')}" ${extra}>`;
function setPath(o,path,v){const ks=path.split('.');for(let i=0;i<ks.length-1;i++)o=o[ks[i]];o[ks[ks.length-1]]=v}
// drawn by React: TripForms.tsx PasteBox. The last message stays across redraws (pasteMsg) until another row opens.
let pasteMsg={};
const pasteBox=(kind,hint)=>({kind,hint,ai:!!sample,msg:pasteMsg[kind]||''});
const pasteSay=(kind,t)=>{pasteMsg[kind]=t;setSt('st_'+kind,t)};
// 더보기 → 이번 여행 forms are drawn by React (app/screens/TripForms.tsx): these build what each form shows.
const optsOf=o=>Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?v[0]:v.name]);
function datesInfo(p){const ds=p.dateSet!==false, ns=p.nightsSet!==false;return {start:ds&&!p.dateUnknown?String(p.startDate??''):'',unknown:!!p.dateUnknown,nights:ns?p.nights:null,maxN:MAX_N}}
function partParty(p){const q=p.party;return {f:'party',type:q.type,adults:q.adults,kids:q.kids}}
function partTrip(p){return {f:'trip',bookedFlight:p.bookedFlight!==false,bookedStay:p.bookedStay!==false,dates:datesInfo(p)}}
function partFlight(p){return {f:'flight',mode:p.mode,word:MODE_WORD[p.mode],notBooked:p.bookedFlight===false,out:clone(p.out),back:clone(p.back),local:p.local,airports:optsOf(AIRPORTS),
  paste:pasteBox('flight','예약 메일이나 e티켓 내용을 붙여 넣으면 AI가 위 칸을 채워요.')}}
function partStay(p){const n=nightsOf(p);return {f:'stay',helper:p.bookedStay===false,stays:clone(p.stays),areas:optsOf(AREAS),nights:Array.from({length:n},(_,k)=>`${k+1}박째 (${mdOf(p,k)} 밤)`),
  paste:pasteBox('stay','숙소 예약 확인 내용을 붙여 넣으면 이름, 동네, 체크인·체크아웃을 채워요.')}}
function partHome(p){const h=p.home;return {f:'home',mode:p.mode,word:MODE_WORD[p.mode],area:h.area,min:h.min,fare:h.fare,byMin:h.byMin,byMinOpts:[60,90,120,150,180].map(m=>[m,'출발 '+durTxt(m)+' 전'])}}
function partEvents(p){const n=nightsOf(p);return {f:'events',events:clone(p.events),areas:optsOf(AREAS),days:Array.from({length:n+1},(_,k)=>`Day ${k+1} (${mdOf(p,k)})`)}}
const radioRow=(path,val,opts)=>`<div class="radio">${opts.map(([v,l])=>`<button type="button" data-radio="${path}" data-val="${v}" aria-pressed="${String(val)===String(v)}">${l}</button>`).join('')}</div>`;
function datesReady(p){return p.dateSet!==false&&p.nightsSet!==false}
function needDates(){setSt('st_dates','여행 날짜와 기간을 먼저 골라 주세요. 모르면 "날짜는 아직 몰라요"를 눌러 주세요.');const d=document.getElementById('datesSec');if(d)d.scrollIntoView({block:'center'})}
const isoPlus=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const heads2=q=>Math.max(1,(+q.adults||1)+(+q.kids||0));
const ONB=[
  {t:'어디로, 언제, 누구와 떠나나요?',s:'세 가지만 알려 주면 바로 일정표를 만들어요. 교통편, 숙소, 취향은 필요할 때 물어볼게요.',f:p=>!p.jpPicked?[partJP()]:!p.startMode?[{f:'chooser',ai:!!sample}]:p.startMode==='pq'?[partQuick(p,false)]:p.startMode==='talk'?[partTalk(p)]:p.startMode==='day'?[partQuick(p,true)]
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
function commitProfile(p){CUR.profile=fixProfile(clone(p));TRIP.save('profile',CUR.profile);TRIP.kws.save(CUR.kws);buildDays();CUR.placed=CUR.placed.filter(b=>b.day<DY.days.length);save();if(day>=DY.days.length)day=0}
async function finishOnb(){commitProfile(draft);day=0;
  if(sample&&!PK.pack.example&&!PK.pack.manual&&P.length<8){onbBusy=true;setBusy(true);placeCtl=new AbortController();
    onbFrame({nextLabel:'장소 찾는 중…',skipHidden:false,skipOff:false,skipLabel:'기다리지 않고 시작'});
    const st=$('#st_onb'); if(st) st.scrollIntoView({block:'nearest'});
    await morePlaces(24,'st_onb','',placeCtl.signal); if(placeCtl&&!placeCtl.signal.aborted) await genSeason('st_onb',placeCtl.signal); placeCtl=null; onbBusy=false; setBusy(false)}
  onbFrame({open:false});renderAll();if(tab==='me'){draft=clone(CUR.profile);renderMe()}
  if(needBooking()) openHelper(0); else maybeCoach()}
function renderMe(){renderMeRows()}
function rerenderForm(){
  const ob=$('#onb'), sd=$('#panel-side'), wy=window.scrollY, oy=ob.scrollTop, sy=sd.scrollTop;
  if(!ob.hidden) renderOnb(); else {if(tab==='me'||matchMedia('(min-width:900px)').matches) renderMe(); if(tab==='pref') renderTasteStyle();}
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
    setTimeout(()=>{if(sample)formAct('genPack')},0);return}
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
  if(!st) return; if(!text){pasteSay(kind,'붙여 넣은 내용이 없어요.');return} if(!sample) return;
  pasteMsg[kind]='';progStart('st_'+kind,'예약 내용을 읽는 중이에요 (보통 10~20초)',[],'');
  try{
    const r=await JD.asks.readBooking(sample,kind,text);   // app/data/asks.ts progStop('st_'+kind);
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

