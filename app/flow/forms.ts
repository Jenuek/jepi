// 처음 설정 · 이번 여행 · 취향 forms: what is being typed (draft, a copy of the trip's profile until it is saved), the
// open step, the paste boxes' messages, the AI talk, the destination finder's answers, which 이번 여행 row is open and
// the messages under the forms. The old code reads and changes these as FS.draft, FS.talk … (they used to be its own
// variables in src/js/030, 060, 120, 130, 140, 220 and 280). Also what happens in the forms: typing (onPf), the buttons
// (formAct), 처음 설정's steps (renderOnb, finishOnb), saving (commitProfile), and reading a pasted booking (aiFill).
// (They used to be src/js/030-forms.js.) What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as keys from '../data/keys';
import * as myplaces from '../data/myplaces';
import * as routes from '../data/routes';
import * as asks from '../data/asks';
import { state as DYs, nightsOf, MAX_N, fixProfile, buildDays } from '../data/days';
import { parse } from '../logic/time';
import { ui } from '../ui/state';
import * as FORMS from '../view/forms';
import * as PVIEW from '../view/pview';
import * as R from './render';
export const fs = {
  /** the profile being edited (null: no form open) */
  draft: null as any,
  /** 처음 설정: the open step */
  onbStep: 0,
  /** the paste boxes' last message, by kind (flight / stay) */
  pasteMsg: {} as Record<string, string>,
  /** 처음 설정 is busy (preparing the destination, finding places) and its stop button */
  onbBusy: false,
  placeCtl: null as AbortController | null,
  /** 여행지 찾기: the AI's suggestions, the places asked about, busy */
  destRecs: null as any[] | null,
  destAsked: [] as any[],
  destBusy: false,
  /** 취향: the style rows are open */
  styleOpen: false,
  /** 이야기하면서 정하기: the conversation (null: not started) */
  talk: null as any,
  /** 더보기: every row shown; 이번 여행: the open row, and the auto-save message */
  moreAll: false,
  meOpen: null as string | null,
  autoMsg: '',
  /** 오가는 길 → 출발지: the message under it */
  homeMsg: '',
};

/** what the old code still does */
export interface Legacy {
  partJP(): any; partTalk(p: any): any; partDest(p: any): any;
  setSt(id: string, t: string): void; progStart(id: string, t: string, btns: string[], label: string): void; progStop(id: string): void; setBusy(on: boolean): void;
  keysChanged(): void; setJP(m: string, quiet?: boolean): void; quickStart(): void;
  talkSend(text: any, opt?: any): void; talkReset(): void; recommendDest(mode?: any): void;
  genPack(dest: string, btnId?: string): Promise<boolean>; morePlaces(n: number, id: string, focus: string, signal?: AbortSignal): Promise<number>; genSeason(id: string, signal?: AbortSignal): Promise<any>;
  autoSave(): void; renderMeRows(): void; renderTasteStyle(): void; meSetMsg(m: string): void; meSetBudgetHint(h: string): void;
  openHelper(step: number): void; needBooking(): boolean; maybeCoach(): void; onbAdvance(): void; demoEnter(): void;
  /** 오가는 길 → 출발지: the airports near Seoul (key → [name, lat, lng]) */
  krAir(): Record<string, [string, number, number]>;
}
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
let onbRev = 0;
const mount = (name: string, el: Element, props: any) => (window.JEPI_UI.mount as any)(name, el, props);
const CUR = trip.cur as any, PK = places.state as any, D_ = DYs as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));
const mypOf = (id: string): any => myplaces.of(id);

export function setPath(o?: any, path?: any, v?: any){const ks=path.split('.');for(let i=0;i<ks.length-1;i++)o=o[ks[i]];o[ks[ks.length-1]]=v}
// drawn by React: TripForms.tsx PasteBox. The last message stays across redraws (pasteMsg) until another row opens.
export const pasteBox=(kind: any,hint: any)=>({kind,hint,ai:!!ui.sample,msg:fs.pasteMsg[kind]||''});
export const pasteSay=(kind: any,t: any)=>{fs.pasteMsg[kind]=t;L.setSt('st_'+kind,t)};
export function datesReady(p?: any){return p.dateSet!==false&&p.nightsSet!==false}
export function needDates(){L.setSt('st_dates','여행 날짜와 기간을 먼저 골라 주세요. 모르면 "날짜는 아직 몰라요"를 눌러 주세요.');const d=document.getElementById('datesSec');if(d)d.scrollIntoView({block:'center'})}
export const isoPlus=(n: any)=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const ONB=[
  {t:'어디로, 언제, 누구와 떠나나요?',s:'세 가지만 알려 주면 바로 일정표를 만들어요. 교통편, 숙소, 취향은 필요할 때 물어볼게요.',f:(p: any)=>!p.jpPicked?[L.partJP()]:!p.startMode?[{f:'chooser',ai:!!ui.sample}]:p.startMode==='pq'?[PVIEW.partQuick(p,false)]:p.startMode==='talk'?[L.partTalk(p)]:p.startMode==='day'?[PVIEW.partQuick(p,true)]
    :p.destMode==='find'?[...(p.fromTalk?[FORMS.banner(p,'날짜·기간·예산을 확인하고 아래 "AI로 여행지 추천받기"를 눌러 주세요.')]:[]),{f:'dates',dates:FORMS.datesInfo(p)},L.partDest(p)]
    :[...(p.fromTalk?[FORMS.banner(p,'날짜와 동행을 확인하고 "AI로 여행지 준비하기"를 눌러 주세요.')]:[]),L.partDest(p),{f:'dates',dates:FORMS.datesInfo(p)},FORMS.party(p)]}
];
export function openOnb(){fs.draft=clone(CUR.profile);fs.draft.startMode=undefined;fs.draft.jpPicked=false;fs.draft.q=null;fs.draft.destMode='';fs.draft.fromTalk=false;fs.draft.dateSet=false;fs.draft.nightsSet=false;fs.draft.dateUnknown=false;fs.talk=null;fs.onbStep=0;$('#meBox').innerHTML='';onbFrame({open:true});renderOnb()}
// the frame (title, 이전/다음/건너뛰기) is drawn by React (app/screens/Frames.tsx) from onbView; onbFrame({…}) changes some of it and draws again
let onbView: any={open:false,step:'',title:'',sub:'',prevOff:false,prevHidden:false,nextLabel:'다음',nextOff:false,nextHidden:false,skipLabel:'건너뛰기',skipOff:false,skipHidden:false,exampleOff:false};
export function onbFrame(p?: any){onbView={...onbView,...p};mount('onbFrame',$('#onbMount'),onbView)}
// pressed in the frame
export function onbFrameAct(n?: any){
  if(n==='prev'){if(fs.onbStep>0){fs.onbStep--;renderOnb()}}
  else if(n==='skip'&&fs.placeCtl)fs.placeCtl.abort();
  else if(n==='next'||n==='skip')L.onbAdvance();
  else if(n==='example'){if(fs.onbBusy)return;L.demoEnter()}
}
export function renderOnb(){const st=ONB[fs.onbStep];
  const md=fs.draft&&fs.draft.startMode;
  onbFrame({step:ONB.length>1?`${fs.onbStep+1} / ${ONB.length}`:'',
    title:!fs.draft.jpPicked?'어떤 여행자예요?':md==='pq'?'가볍게 시작해요':!md?'어떻게 시작할까요?':md==='talk'?'이번 여행, 어떤 여행이면 좋을까요?':md==='day'?'오늘 어디서 놀아요?':st.t,
    sub:!fs.draft.jpPicked?'고르는 쪽에 맞춰 화면과 시작 방법이 달라져요.':md==='pq'?'네 가지만 누르면 바로 굴릴 수 있어요.':!md?'편한 방법을 골라 주세요. 언제든 바꿀 수 있어요.':md==='talk'?'정답은 없어요. 떠오르는 대로 답하면 방향을 정리해 드릴게요.':md==='day'?'동네와 시간만 정하면 하루 코스를 바로 짤 수 있어요.':st.s,
    prevOff:fs.onbStep===0,prevHidden:ONB.length===1,nextLabel:fs.onbStep===ONB.length-1?'일정표 만들기':'다음',skipHidden:fs.onbStep===ONB.length-1,nextHidden:!fs.draft.jpPicked||!md||['talk','pq','day'].includes(md)});
  mount('onb',$('#onbBody'),{parts:st.f(fixProfile(fs.draft)),rev:++onbRev});$('#onb').scrollTop=0}
export function commitProfile(p?: any){CUR.profile=fixProfile(clone(p));trip.save('profile',CUR.profile);trip.kws.save(CUR.kws);buildDays();CUR.placed=CUR.placed.filter((b: any)=>b.day<D_.days.length);trip.blocks.saved();if(ui.day>=D_.days.length)ui.day=0}
export async function finishOnb(){commitProfile(fs.draft);ui.day=0;
  if(ui.sample&&!PK.pack.example&&!PK.pack.manual&&places.P.length<8){fs.onbBusy=true;L.setBusy(true);fs.placeCtl=new AbortController();
    onbFrame({nextLabel:'장소 찾는 중…',skipHidden:false,skipOff:false,skipLabel:'기다리지 않고 시작'});
    const st=$('#st_onb'); if(st) st.scrollIntoView({block:'nearest'});
    await L.morePlaces(24,'st_onb','',fs.placeCtl.signal); if(fs.placeCtl&&!fs.placeCtl.signal.aborted) await L.genSeason('st_onb',fs.placeCtl.signal); fs.placeCtl=null; fs.onbBusy=false; L.setBusy(false)}
  onbFrame({open:false});R.renderAll();if(ui.tab==='me'){fs.draft=clone(CUR.profile);renderMe()}
  if(L.needBooking()) L.openHelper(0); else L.maybeCoach()}
export function renderMe(){L.renderMeRows()}
export function rerenderForm(){
  const ob=$('#onb'), sd=$('#panel-side'), wy=window.scrollY, oy=ob.scrollTop, sy=sd.scrollTop;
  if(!ob.hidden) renderOnb(); else {if(ui.tab==='me'||matchMedia('(min-width:900px)').matches) renderMe(); if(ui.tab==='pref') L.renderTasteStyle();}
  ob.scrollTop=oy; sd.scrollTop=sy; window.scrollTo(0,wy);
}
// What was pressed in 처음 설정 / 이번 여행 / 취향 (OnbBody, OnbTalk, OnbFinder, TripForms, MeRows, TasteStyle tell:
// its name, its value and a few extras). The forms change `draft`; rerenderForm draws them again.
export async function formAct(n?: any, v?: any, o?: any){
  o=o||{};
  // 이번 여행 / 취향: these save themselves a moment later (autoSave does nothing while 처음 설정 is open)
  if(['radio','addstay','delstay','addev','delev'].includes(n)) setTimeout(L.autoSave,0);
  switch(n){
  // 처음 설정
  case 'onbkey': {const key=String(o.key||'').trim().replace(/\s+/g,'');if(!key)return;keys.list[v]=key;L.keysChanged();return}
  case 'pickjp': if(!fs.draft)return;fs.draft.jpPicked=true;L.setJP(v);if(v==='P'){fs.draft.startMode='pq';fs.draft.q={when:'',len:'',slot:'noon'}}renderOnb();return;
  case 'q': {if(!fs.draft)return;const q=fs.draft.q||(fs.draft.q={}),k=o.q;if(k==='party'){fs.draft.party.type=v;if(v==='friends'&&fs.draft.party.adults<2)fs.draft.party.adults=3;if(v==='couple')fs.draft.party.adults=2;if(v==='family'&&fs.draft.party.adults<2)fs.draft.party.adults=2}else q[k]=v;if(k==='when'&&v!=='pick')fs.draft.dateSet=true;if(k==='when'&&v==='pick')fs.draft.dateSet=false;rerenderForm();return}
  case 'quickStart': L.quickStart();return;
  case 'startmode': if(!fs.draft)return;fs.draft.startMode=v;fs.draft.kind=fs.draft.startMode==='day'?'day':'trip';if(fs.draft.kind==='day'){fs.draft.nightsSet=true;fs.draft.bookedFlight=true;fs.draft.bookedStay=true;fs.draft.flightSet=true;fs.draft.staySet=true;fs.draft.q={when:'',len:'0',slot:'noon'}}if(o.destmode!=null)fs.draft.destMode=o.destmode;else if(v==='quick'&&!o.inChoose)fs.draft.destMode=fs.draft.dest?'':'find';if(fs.draft.startMode==='talk'&&!fs.talk)L.talkReset();renderOnb();return;
  // 이야기하면서 정하기
  case 'talkopt': if(fs.talk)L.talkSend(fs.talk.options[+v]);return;
  case 'talkSend': {const x=String(v||'').trim();if(x)L.talkSend(x);return}
  case 'talkFinish': L.talkSend('__finish__');return;
  case 'talkRetry': L.talkSend(null,{retry:true});return;
  case 'talkRedo': L.talkReset();rerenderForm();return;
  case 'talkApply': if(fs.talk&&fs.talk.summary){const S=fs.talk.summary;fs.draft.startMode='quick';
    if(S.dest){fs.draft.dest=S.dest;fs.draft.destMode='';fs.draft.fromTalk=true;renderOnb()}
    else{fs.draft.destMode='find';fs.draft.want=fs.draft.purpose||'';fs.draft.fromTalk=true;renderOnb()}}
    return;
  // 여행지 찾기
  case 'destmode': if(!fs.draft)return;fs.draft.destMode=v;rerenderForm();return;
  case 'destRec': if(!datesReady(fs.draft)){needDates();return}L.recommendDest();return;
  case 'destMore': L.recommendDest({more:true});return;
  case 'destAsk': {const x=String(v||'').trim();if(x)L.recommendDest({ask:x});else L.setSt('st_ask','궁금한 여행지를 적어 주세요.');return}
  case 'pickdest': case 'pickask': {if(!fs.draft||(n==='pickdest'&&!fs.destRecs))return;const dd=n==='pickask'?fs.destAsked[+v]:(fs.destRecs as any)[+v];if(!dd)return;fs.draft.dest=dd.city;fs.draft.destMode='';fs.draft.bookedFlight=false;fs.draft.bookedStay=false;fs.draft.mode=dd.country&&dd.country!=='대한민국'&&dd.country!=='한국'?'flight':fs.draft.mode;rerenderForm();
    setTimeout(()=>{if(ui.sample)formAct('genPack')},0);return}
  case 'genPack': {
    const dest=String((fs.draft&&fs.draft.dest)||($('[data-pf="dest"]')||{}).value||'').trim();
    if(!dest){L.setSt('st_pack','여행지를 먼저 적어 주세요.');return}
    if(fs.draft) fs.draft.dest=dest;
    if(fs.onbBusy){L.setSt('st_pack','이미 준비하는 중이에요. 잠시만 기다려 주세요.');return}
    L.setSt('st_pack','요청을 보내는 중이에요…');
    const btn=()=>$('#onb').hidden?$('#genPack'):$('#onb #genPack');
    (async()=>{const inOnb=!$('#onb').hidden;if(await L.genPack(dest)){if(inOnb)renderOnb();else{commitProfile(fs.draft);R.renderAll();renderMe();await L.morePlaces(24,'st_pack','');R.renderAll()}}})()
      .catch((err: any)=>{fs.onbBusy=false;L.setBusy(false);{const LV=window.JEPI_UI.live(btn());if(LV)LV.label(null)}L.setSt('st_pack','문제가 생겼어요: '+((err&&(err.message||err.code))||err)+' · 다시 눌러 주세요.')});
    return}
  // 고르기 (Radio): style.* opens the style box
  case 'radio': {const path=v;if(path.startsWith('style.'))fs.styleOpen=true;let x=o.val;if(x==='true')x=true;else if(x==='false')x=false;if(fs.draft){setPath(fs.draft,path,x);if(path==='mode')fs.draft.local=x==='car'?'car':'transit';if(path==='party.type'){const q=fs.draft.party;if(x==='couple')q.adults=2;if(x==='friends'&&q.adults<2)q.adults=3;if(x==='family'){if(q.adults<2)q.adults=2;if(!q.kids)q.kids=1;fs.draft.pace='slow'}fixProfile(fs.draft)}rerenderForm()}return}
  // 이번 여행
  case 'addstay': if(!fs.draft)return;{const nn=nightsOf(fs.draft);fs.draft.stays.push({name:'숙소 '+(fs.draft.stays.length+1),area:places.firstArea(),checkin:'15:00',checkout:'11:00',from:Math.max(0,nn-1),to:nn})}rerenderForm();return;
  case 'delstay': if(!fs.draft)return;fs.draft.stays.splice(+v,1);rerenderForm();return;
  case 'addev': if(!fs.draft)return;fs.draft.events.push({name:'',day:0,start:'19:00',end:'21:00',area:places.firstArea()});rerenderForm();return;
  case 'delev': if(!fs.draft)return;fs.draft.events.splice(+v,1);rerenderForm();return;
  case 'aifill': aiFill(v);return;
  case 'meSave': commitProfile(fs.draft);fs.draft=clone(CUR.profile);R.renderAll();renderMe();L.meSetMsg('저장했어요. 고정 블록을 다시 만들었어요.');return;
  case 'meOnb': openOnb();return;
  case 'meHelper': L.openHelper(0);return;
  case 'meopen': fs.meOpen=fs.meOpen===v?null:v;fs.autoMsg='';fs.pasteMsg={};L.renderMeRows();return;
  case 'homeUse': {if(!fs.draft)return;const h=mypOf('home');if(!h||!h.ll)return;fs.draft.home.ll=h.ll;fs.draft.home.area='집';fs.homeMsg='출발지를 집으로 바꿨어요.';L.autoSave();L.renderMeRows();return}
  case 'homeair': {if(!fs.draft)return;const h=mypOf('home'),a=L.krAir()[v];if(!h||!h.ll)return;fs.homeMsg='경로를 계산하는 중…';L.renderMeRows();
    try{const r=await routes.fetchRoute({m:'transit',a:h.ll,b:[a[1],a[2]],pv:'kakao'});if(!r)throw new Error('경로를 찾지 못했어요');
      fs.draft.home.ll=h.ll;fs.draft.home.area='집';fs.draft.home.min=Math.min(240,Math.max(10,Math.ceil(r.min/5)*5));fs.homeMsg=`집 → ${a[0]}: ${r.label} 약 ${r.min}분${r.lines?` (${r.lines})`:''}으로 넣었어요.`;L.autoSave()}
    catch(err: any){fs.homeMsg=(err&&err.message)||'계산하지 못했어요'}L.renderMeRows();return}
  }
}
export function onPf(e?: any){const el=e.target;if(el&&el.dataset&&el.dataset.pk&&e.type==='change'){const v=+el.value;if(v>0){PK.pack[el.dataset.pk]=v;places.savePack();R.renderBudget()}return}
  if(!el||!el.dataset||!el.dataset.pf||!fs.draft) return;let v=el.value;if(el.dataset.type==='num') v=+v;setPath(fs.draft,el.dataset.pf,v);
  if(el.dataset.pf==='startDate'&&el.value){fs.draft.dateSet=true;fs.draft.dateUnknown=false} if(el.dataset.pf==='nights') fs.draft.nightsSet=true;
  if(/^(out|back)\./.test(el.dataset.pf)) fs.draft.flightSet=true; if(/^stays\./.test(el.dataset.pf)) fs.draft.staySet=true;
  if(e.type==='change'&&['nights','startDate','party.adults','party.kids'].includes(el.dataset.pf)) rerenderForm()
  if(['budgetMan','tripMan','localMan'].includes(el.dataset.pf))L.meSetBudgetHint(FORMS.budgetHint(fs.draft))}
export async function aiFill(kind?: any){
  const ta=$('#paste_'+kind), st=$('#st_'+kind), text=(ta&&ta.value||'').trim();
  if(!st) return; if(!text){pasteSay(kind,'붙여 넣은 내용이 없어요.');return} if(!ui.sample) return;
  fs.pasteMsg[kind]='';L.progStart('st_'+kind,'예약 내용을 읽는 중이에요 (보통 10~20초)',[],'');
  try{
    const r=await asks.readBooking(ui.sample,kind,text);   // app/data/asks.ts progStop('st_'+kind);
    if(kind==='flight'){
      if(r.startDate&&!isNaN(+new Date(r.startDate))) fs.draft.startDate=r.startDate;
      if(r.startDate&&r.endDate){const n=Math.round((+new Date(r.endDate)-+new Date(r.startDate))/864e5);if(n>=1&&n<=MAX_N) fs.draft.nights=n}
      if(['flight','train','bus'].includes(r.mode)) fs.draft.mode=r.mode;
      ['out','back'].forEach((k: any)=>{const o=r[k]||{};if(places.AIRPORTS[o.airport]) fs.draft[k].airport=o.airport;if(parse(o.dep)!=null) fs.draft[k].dep=o.dep;if(parse(o.arr)!=null) fs.draft[k].arr=o.arr;if(o.flight) fs.draft[k].flight=String(o.flight).slice(0,12)});
    }else{
      const base=new Date(fs.draft.startDate+'T00:00:00');const idx=(ds: any)=>{if(!ds)return null;const v=Math.round((+new Date(ds+'T00:00:00')-+base)/864e5);return isNaN(v)?null:v};
      const ss=(Array.isArray(r.stays)?r.stays:[]).slice(0,4).map((s: any)=>({name:String(s.name||'숙소').slice(0,30),area:places.AREAS[s.area]?s.area:places.firstArea(),checkin:parse(s.checkin)!=null?s.checkin:'15:00',checkout:parse(s.checkout)!=null?s.checkout:'11:00',from:idx(s.checkinDate)??0,to:idx(s.checkoutDate)??nightsOf(fs.draft)}));
      if(ss.length) fs.draft.stays=ss;
    }
    if(kind==='flight') fs.draft.flightSet=true; else fs.draft.staySet=true;
    fs.pasteMsg[kind]='채웠어요. 틀린 칸이 있으면 직접 고쳐 주세요.'; rerenderForm(); L.setSt('st_'+kind,fs.pasteMsg[kind]);
  }catch(e: any){pasteSay(kind,e&&e.code==='not_granted'?'AI 키가 맞지 않아서 채우지 못했어요. 직접 입력해 주세요.':'읽지 못했어요. 직접 입력하거나 다시 시도해 주세요.')}
}

