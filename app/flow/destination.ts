// Getting a destination ready and filling it: the AI prepares a city (genPack), finds more places (morePlaces), 처음 설정's
// 다음 (onbAdvance, preparing the city first), 여행지 찾기 (the finder and its AI suggestions) and 이야기하면서 정하기 (a
// short talk with the AI that ends in a direction). (It used to be src/js/060-destination-pack.js, 120-destination-finder.js
// and 140-direction-chat.js.) What the old code still does is passed in once with connect() (Legacy).
import * as trip from '../data/trip';
import * as places from '../data/places';
import * as asks from '../data/asks';
import { STYLE_ROWS, nightsOf, MAX_N, fixProfile } from '../data/days';
import { norm } from '../logic/places';
import { ui } from '../ui/state';
import { progStart, progStop, setSt, errText } from '../ui/status';
import * as FORMS from '../view/forms';
import { fs } from './forms';
import * as FF from './forms';

/** what the old code still does */
export interface Legacy {
  /** the places the AI just found (✨) */
  fresh(): Set<string>;
  /** forget the AI chat's undo (a new destination) */
  clearUndo(): void;
  autoSave(): void;
  /** key help, running outside Claude */
  standalone(): boolean; keyHelp(): Record<string, string>; inClaude(): boolean;
}
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const $ = (s: string) => document.querySelector(s) as any;
const CUR = trip.cur as any, PK = places.state as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));

export async function genPack(dest?: any, btn?: any){
  if(!ui.sample){setSt('st_pack','AI가 연결되어 있지 않아요. 더보기 → 설정에서 키를 넣어 주세요.');return false}
  if(fs.onbBusy) return false; fs.onbBusy=true; setBusy(true);
  const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),120000);
  progStart('st_pack',`${dest} 정보를 준비하는 중이에요 (보통 20~40초)`,[btn||'genPack','genPack'],'준비하는 중…');
  try{
    const pk=await asks.destination(ui.sample,dest,ctl.signal);   // app/data/asks.ts
    if(!pk){setSt('st_pack','여행지를 찾지 못했어요. 도시 이름을 조금 더 정확히 적어 주세요.');return false}
    CUR.custom=[]; trip.save('custom',CUR.custom); CUR.placed=[]; trip.blocks.saved(); L.clearUndo();
    places.loadPack(pk); places.savePack();
    if(fs.draft){fs.draft.dest=pk.city; fs.draft.stays.forEach((s: any)=>{s.area=places.firstArea();if(/시부야/.test(s.name))s.name='숙소'}); fs.draft.events.forEach((e: any)=>e.area=places.firstArea()); fs.draft.out.airport=fs.draft.back.airport=places.firstGw(); if(pk.intl) fs.draft.mode='flight'}
    if($('#onb').hidden&&fs.draft&&ui.tab==='me')L.autoSave();setSt('st_pack',`${pk.city} 준비 완료 · 동네 ${pk.areas.length}곳 · 공항·역 ${pk.gateways.length}곳`); return true;
  }catch(e: any){setSt('st_pack',e&&e.code==='cancelled'?'2분 안에 답을 받지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.':errText(e,'여행지를 준비하지 못했어요')+(e&&e.code?` (${e.code})`:''));return false}
  finally{clearTimeout(to);fs.onbBusy=false; setBusy(false)}
}
export async function morePlaces(n?: any, stId?: any, focus?: any, signal?: any){
  if(!ui.sample) return 0;
  progStart(stId,n>15?(CUR.kws.length?'고른 취향에 맞는 장소 후보를 찾는 중이에요 (보통 1~2분)':`${PK.pack.city}에서 가 볼 만한 곳을 골고루 찾는 중이에요 (보통 1~2분)`):'장소를 찾는 중이에요 (보통 30초~1분)',stId==='moreSt'?['moreBtn']:[],'찾는 중…');
  try{
    const ids=await asks.morePlaces(ui.sample,n,focus,signal), added=ids.length;   // app/data/asks.ts
    L.fresh().clear(); ids.forEach((id: any)=>L.fresh().add(id)); setSt(stId,added?`새 장소 ${added}곳을 찾았어요. 장소 탭 맨 위 "✨ 방금 찾은 곳"에 모아 뒀어요.`:'이미 있는 곳과 겹쳐서 새로 추가할 장소가 없었어요. 찾는 말을 바꿔 보세요 (예: 현지인 맛집, 조용한 카페).'); return added;
  }catch(e: any){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. 장소 블록 탭에서 언제든 다시 찾을 수 있어요.':errText(e,'장소를 찾지 못했어요'));return 0}
}
export function setBusy(b?: any){FF.onbFrame({nextOff:b,prevOff:b||fs.onbStep===0,skipOff:b,exampleOff:b});['genPack','meSave'].forEach((id: any)=>{const e=document.getElementById(id) as any;if(!e)return;const v=b,L=window.JEPI_UI.live(e);if(L)L.disabled(v);else e.disabled=v})}
export async function onbAdvance(){
  if(fs.onbBusy) return;
  if(fs.onbStep===0){
    if(fs.draft.kind==='day'){if(fs.draft.dateSet===false){setSt('st_dates','날짜를 골라 주세요.');return}}else if(!FF.datesReady(fs.draft)){FF.needDates();return}
    const dest=String(fs.draft.dest||'').trim();
    if(!dest){setSt('st_pack','여행지를 먼저 적어 주세요.');return}
    if(norm(dest)!==norm(PK.pack.city)){
      if(ui.sample){if(!(await genPack(dest,'onbNext')))return}
      else{CUR.custom=[];trip.save('custom',CUR.custom);CUR.placed=[];trip.blocks.saved();places.loadPack(places.manualPack(dest));places.savePack();fs.draft.stays.forEach((s: any)=>s.area=places.firstArea());fs.draft.events.forEach((e: any)=>e.area=places.firstArea());fs.draft.out.airport=fs.draft.back.airport=places.firstGw()}
    }
  }
  if(fs.onbStep<FF.ONB.length-1){fs.onbStep++;FF.renderOnb()} else await FF.finishOnb();
}
// 여행지 (drawn by React: TripForms.tsx Dest). Not decided yet → the finder (OnbFinder.tsx).
export const partDest=(p: any)=>p.destMode==='find'?partFinder(p):FORMS.dest(p,!!ui.sample);   // app/view/forms.ts

// drawn by React: app/screens/OnbFinder.tsx
export function partFinder(p?: any){
  return {f:'finder',ai:!!ui.sample,party:p.party.type,reach:p.reach,budget:p.budget,budgetMan:p.budgetMan||'',nights:nightsOf(p),
    chips:[...new Set([...places.GENERIC_KW,...CUR.kws])].map((k: any)=>({k,on:CUR.kws.some((x: any)=>norm(x)===norm(k))})),
    styleRows:STYLE_ROWS,style:clone(p.style||{}),styleOpen:fs.styleOpen,want:p.want||'',recs:fs.destRecs?clone(fs.destRecs):null,asked:clone(fs.destAsked)};
}
export async function recommendDest(mode?: any){
  if(!ui.sample||fs.destBusy) return; fs.destBusy=true; mode=mode||{};
  const prev=(fs.destRecs||[]).map((d: any)=>d.city);
  const want=(($('#destWant')||{}).value||'').trim(); fs.draft.want=want; if(want&&!fs.draft.purpose) fs.draft.purpose=want.slice(0,80);
  const stId=mode.ask?'st_ask':mode.more?'st_more':'st_dest';
  progStart(stId,mode.ask?`${mode.ask}이(가) 맞는지 살펴보는 중이에요 (보통 15~30초)`:'이 조건에 맞는 여행지를 고르는 중이에요 (보통 20~40초)',['destRecBtn','destMoreBtn','destAskBtn'],'고르는 중…');
  const q=fixProfile(fs.draft);
  try{
    const got=await asks.destinations(ui.sample,q,mode,prev,want);   // the question and tidying the answer: app/data/asks.ts
    if(mode.ask) fs.destAsked=[...got.slice(0,1),...fs.destAsked.filter((d: any)=>!got.some((g: any)=>g.city===d.city))].slice(0,3);
    else fs.destRecs=mode.more?[...(fs.destRecs||[]),...got.filter((g: any)=>!prev.includes(g.city))].slice(0,15):got;
    progStop(stId); trip.kws.save(CUR.kws); FF.rerenderForm();
    if(mode.ask){setSt('st_ask',got.length?'아래에 정리했어요.':'정보를 찾지 못했어요. 이름을 조금 더 정확히 적어 주세요.');const c=document.getElementById('asked-0');if(c)c.scrollIntoView({block:'nearest'})}
    else setSt(stId,(fs.destRecs||[]).length?(mode.more?'아래에 더 추가했어요.':'아래에서 마음에 드는 곳을 골라 주세요.'):'추천을 받지 못했어요. 조건을 바꿔 다시 해 보세요.');
  }catch(e: any){setSt(stId,errText(e,'추천을 받지 못했어요'))} finally{fs.destBusy=false}
}

const TALK_MAX=5;
const TALK_OPEN={q:'요즘 어떤 마음이 들어서 여행을 떠올리게 됐어요? 막연해도 괜찮아요.',o:['그냥 답답해서 벗어나고 싶어요','지쳐서 푹 쉬고 싶어요','새로운 자극이 필요해요','생각을 정리하고 싶어요']};
export function talkReset(){fs.talk={msgs:[{role:'a',text:TALK_OPEN.q}],options:TALK_OPEN.o.slice(),n:0,busy:false,summary:null}}
export function partJP(){return {f:'jp',keyBox:!!(L.standalone()&&!ui.sample),keyHelpHTML:L.keyHelp().anthropic,importBox:!L.inClaude()}}
// drawn by React: app/screens/OnbTalk.tsx
export function partTalk(p?: any){
  if(!fs.talk) talkReset();
  const t=fs.talk, S=t.summary, last=[...t.msgs].reverse().find((m: any)=>m.role==='a'), hist=[];
  const ok=t.msgs.filter((m: any)=>!m.err);for(let k=0;k<ok.length;k++){const m=ok[k];if(m.role==='u')hist.push([ok[k-1]?ok[k-1].text:'',m.text])}
  const d=p.direction||{};
  return {f:'talk',n:t.n,max:TALK_MAX,hist,last:last?last.text:'',busy:!!t.busy,options:t.options.slice(),failed:!!t.failed,
    done:S?{note:S.note||p.purpose||'',purpose:p.purpose??'',chips:[...new Set([...S.keywords,...CUR.kws])].map((k: any)=>({k,on:CUR.kws.some((x: any)=>norm(x)===norm(k))})),
      pace:p.pace,solo:p.party.type==='solo',social:p.social,avoid:d.avoid||'',applyLabel:S.dest?`${S.dest}(으)로 이어 가기`:'이 방향으로 여행지 찾으러 가기'}:null};
}
export async function talkSend(text?: any, opt?: any){
  opt=opt||{};
  if(!ui.sample||!fs.talk||fs.talk.busy) return;
  if(opt.retry){ if(fs.talk.failed&&fs.talk.msgs.length&&fs.talk.msgs[fs.talk.msgs.length-1].err) fs.talk.msgs.pop(); text=fs.talk.lastText; }
  if(!text) return;
  const finish=text==='__finish__';
  if(!opt.retry&&!finish){fs.talk.msgs.push({role:'u',text:String(text).slice(0,300)}); fs.talk.n++;}
  fs.talk.lastText=text; fs.talk.failed=null; fs.talk.options=[]; fs.talk.busy=true; FF.rerenderForm(); scrollTalk();
  const force=fs.talk.n>=TALK_MAX||finish;
  const dates=FF.datesReady(fs.draft)?(fs.draft.dateUnknown?`Dates: not fixed (roughly a month from now), ${nightsOf(fs.draft)} nights.`:`Dates: from ${fs.draft.startDate}, ${nightsOf(fs.draft)} nights.`):'Dates and trip length: not decided yet. Do not assume any; ask about timing and length in the practical question if the user has not said.';
  let r=null;
  try{ r=await asks.talkTurn(ui.sample,fs.draft,fs.talk.msgs,dates,force); }   // the question (and rescuing a broken answer): app/data/asks.ts
  catch(e: any){
    if(!r){
      fs.talk.busy=false; fs.talk.failed={code:e&&e.code};
      const msg=({not_granted:'AI 키가 맞지 않아서 이어 갈 수 없어요. "건너뛰고 직접 고를게요"를 눌러 주세요.',rate_limited:'지금 요청이 많아요. 1분쯤 뒤에 "다시 시도하기"를 눌러 주세요.',refused:'이 내용으로는 이어 가기 어려워요. 표현을 조금 바꿔서 다시 적어 주세요.',session_expired:'로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.'} as any)[e&&e.code]||'답을 정리하다가 끊겼어요. "다시 시도하기"를 눌러 주세요.';
      fs.talk.msgs.push({role:'a',text:msg,err:true}); FF.rerenderForm(); scrollTalk(); return;
    }
  }
  fs.talk.busy=false;
  fs.talk.msgs.push({role:'a',text:String((r&&r.reply)||'좋아요, 조금 더 들려주세요.').slice(0,400)});
  fs.talk.options=(Array.isArray(r&&r.options)?r.options:[]).map((x: any)=>String(x).slice(0,40)).slice(0,4);
  if(r&&r.done&&r.summary&&typeof r.summary==='object'){const S=r.summary;
    fs.talk.summary={purpose:String(S.purpose||'').slice(0,80),keywords:(Array.isArray(S.keywords)?S.keywords:[]).map((x: any)=>String(x).slice(0,16)).slice(0,6),note:String(S.note||'').slice(0,160),dest:String(S.dest||'').slice(0,30)};
    if(fs.talk.summary.purpose) fs.draft.purpose=fs.talk.summary.purpose;
    if(['slow','normal','full'].includes(S.pace)) fs.draft.pace=S.pace;
    if(['alone','some','social'].includes(S.social)) fs.draft.social=S.social;
    if(['solo','couple','friends','family'].includes(S.party)) fs.draft.party.type=S.party;
    if(['domestic','near','far'].includes(S.reach)) fs.draft.reach=S.reach;
    if(Number.isInteger(+S.nights)&&+S.nights>=1&&+S.nights<=MAX_N&&S.nights!==null){fs.draft.nights=+S.nights;fs.draft.nightsSet=true}
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(S.startDate||''))&&String(S.startDate)>=FF.isoPlus(0)){fs.draft.startDate=S.startDate;fs.draft.dateSet=true;fs.draft.dateUnknown=false}
    fs.draft.direction={purpose:fs.talk.summary.purpose,avoid:String(S.avoid||'').slice(0,80),note:fs.talk.summary.note};
    trip.keywords.addAll(fs.talk.summary.keywords);
  }
  FF.rerenderForm(); scrollTalk();
}
export function scrollTalk(){const c=document.querySelector('.talk2');if(c)c.scrollIntoView({block:'start'});const q=document.getElementById('talkInput');if(q&&!(fs.talk&&fs.talk.busy)&&matchMedia('(min-width:700px)').matches)q.focus({preventScroll:true})}

