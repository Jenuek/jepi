// ---------- forms shared by onboarding and the "내 정보" tab ----------
let draft=null, onbStep=0, onbRev=0;
const opt=(v,l,sel)=>`<option value="${esc(v)}"${String(v)===String(sel)?' selected':''}>${esc(l)}</option>`;
const areaOpts=sel=>Object.entries(AREAS).map(([k,v])=>opt(k,v[0],sel)).join('');
const apOpts=sel=>Object.keys(AIRPORTS).map(k=>opt(k,AIRPORTS[k].name,sel)).join('');
const inp=(path,val,type='text',extra='')=>`<input type="${type}" data-pf="${path}" value="${esc(val??'')}" ${extra}>`;
function setPath(o,path,v){const ks=path.split('.');for(let i=0;i<ks.length-1;i++)o=o[ks[i]];o[ks[ks.length-1]]=v}
function pasteBox(kind,hint){
  if(!sample) return `<p class="hint">더보기 → 설정에서 AI를 연결하면 예약 내용을 붙여 넣어 자동으로 채울 수 있어요.</p>`;
  return `<label class="fg" style="display:block"><span class="hint">${hint} 예약번호·결제 정보는 지우고 넣어도 돼요.</span><textarea id="paste_${kind}" rows="3" style="margin-top:4px"></textarea></label><div class="row"><button class="small-btn primary" type="button" data-aifill="${kind}">AI로 채우기</button><span class="ai-status" id="st_${kind}"></span></div>`;
}
// 더보기 → 이번 여행 forms are drawn by React (app/screens/TripForms.tsx): these build what each form shows.
const optsOf=o=>Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?v[0]:v.name]);
function datesInfo(p){const ds=p.dateSet!==false, ns=p.nightsSet!==false;return {start:ds&&!p.dateUnknown?String(p.startDate??''):'',unknown:!!p.dateUnknown,nights:ns?p.nights:null,maxN:MAX_N}}
function partParty(p){const q=p.party;return {f:'party',type:q.type,adults:q.adults,kids:q.kids}}
function partTrip(p){return {f:'trip',bookedFlight:p.bookedFlight!==false,bookedStay:p.bookedStay!==false,dates:datesInfo(p)}}
function partFlight(p){return {f:'flight',mode:p.mode,word:MODE_WORD[p.mode],notBooked:p.bookedFlight===false,out:clone(p.out),back:clone(p.back),local:p.local,airports:optsOf(AIRPORTS),
  pasteHTML:pasteBox('flight','예약 메일이나 e티켓 내용을 붙여 넣으면 AI가 위 칸을 채워요.')}}
function partStay(p){const n=nightsOf(p);return {f:'stay',helper:p.bookedStay===false,stays:clone(p.stays),areas:optsOf(AREAS),nights:Array.from({length:n},(_,k)=>`${k+1}박째 (${mdOf(p,k)} 밤)`),
  pasteHTML:pasteBox('stay','숙소 예약 확인 내용을 붙여 넣으면 이름, 동네, 체크인·체크아웃을 채워요.')}}
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
function openOnb(){draft=clone(profile);draft.startMode=undefined;draft.jpPicked=false;draft.q=null;draft.destMode='';draft.fromTalk=false;draft.dateSet=false;draft.nightsSet=false;draft.dateUnknown=false;talk=null;onbStep=0;$('#meBox').innerHTML='';$('#onb').hidden=false;renderOnb()}
function renderOnb(){const st=ONB[onbStep];$('#onbStep').textContent=ONB.length>1?`${onbStep+1} / ${ONB.length}`:'';
  const md=draft&&draft.startMode;$('#onbTitle').textContent=!draft.jpPicked?'어떤 여행자예요?':md==='pq'?'가볍게 시작해요':!md?'어떻게 시작할까요?':md==='talk'?'이번 여행, 어떤 여행이면 좋을까요?':md==='day'?'오늘 어디서 놀아요?':st.t;$('#onbSub').textContent=!draft.jpPicked?'고르는 쪽에 맞춰 화면과 시작 방법이 달라져요.':md==='pq'?'네 가지만 누르면 바로 굴릴 수 있어요.':!md?'편한 방법을 골라 주세요. 언제든 바꿀 수 있어요.':md==='talk'?'정답은 없어요. 떠오르는 대로 답하면 방향을 정리해 드릴게요.':md==='day'?'동네와 시간만 정하면 하루 코스를 바로 짤 수 있어요.':st.s;
  window.JEPI_UI.mount('onb',$('#onbBody'),{parts:st.f(fixProfile(draft)),rev:++onbRev});$('#onbPrev').disabled=onbStep===0;$('#onbPrev').hidden=ONB.length===1;$('#onbNext').textContent=onbStep===ONB.length-1?'일정표 만들기':'다음';$('#onbSkip').hidden=onbStep===ONB.length-1;$('#onbNext').hidden=!draft.jpPicked||!md||['talk','pq','day'].includes(md);$('#onb').scrollTop=0}
function commitProfile(p){profile=fixProfile(clone(p));store.set('gp.profile',profile);store.set('gp.kw',kws);buildDays();placed=placed.filter(b=>b.day<DAYS.length);save();if(day>=DAYS.length)day=0}
async function finishOnb(){commitProfile(draft);day=0;
  if(sample&&!PACK.example&&!PACK.manual&&P.length<8){onbBusy=true;setBusy(true);placeCtl=new AbortController();
    const nx=$('#onbNext'),sk=$('#onbSkip'); nx.textContent='장소 찾는 중…'; sk.hidden=false; sk.disabled=false; sk.textContent='기다리지 않고 시작';
    const st=$('#st_onb'); if(st) st.scrollIntoView({block:'nearest'});
    await morePlaces(24,'st_onb','',placeCtl.signal); if(placeCtl&&!placeCtl.signal.aborted) await genSeason('st_onb',placeCtl.signal); placeCtl=null; onbBusy=false; setBusy(false)}
  $('#onb').hidden=true;renderAll();if(tab==='me'){draft=clone(profile);renderMe()}
  if(needBooking()) openHelper(0); else maybeCoach()}
function renderMe(){renderMeRows()}
function rerenderForm(){
  const ob=$('#onb'), sd=$('#panel-side'), wy=window.scrollY, oy=ob.scrollTop, sy=sd.scrollTop;
  if(!ob.hidden) renderOnb(); else {if(tab==='me'||matchMedia('(min-width:900px)').matches) renderMe(); if(tab==='pref') renderTasteStyle();}
  ob.scrollTop=oy; sd.scrollTop=sy; window.scrollTo(0,wy);
}
function onPf(e){const el=e.target;if(el&&el.dataset&&el.dataset.pk&&e.type==='change'){const v=+el.value;if(v>0){PACK[el.dataset.pk]=v;KRW_PER_JPY=v;savePack();renderBudget()}return}
  if(!el||!el.dataset||!el.dataset.pf||!draft) return;let v=el.value;if(el.dataset.type==='num') v=+v;setPath(draft,el.dataset.pf,v);
  if(el.dataset.pf==='startDate'&&el.value){draft.dateSet=true;draft.dateUnknown=false} if(el.dataset.pf==='nights') draft.nightsSet=true;
  if(/^(out|back)\./.test(el.dataset.pf)) draft.flightSet=true; if(/^stays\./.test(el.dataset.pf)) draft.staySet=true;
  if(e.type==='change'&&['nights','startDate','party.adults','party.kids'].includes(el.dataset.pf)) rerenderForm()
  if(['budgetMan','tripMan','localMan'].includes(el.dataset.pf))meSetBudgetHint(budgetHintTxt(draft))}
async function aiFill(kind){
  const ta=$('#paste_'+kind), st=$('#st_'+kind), text=(ta&&ta.value||'').trim();
  if(!st) return; if(!text){st.textContent='붙여 넣은 내용이 없어요.';return} if(!sample) return;
  progStart('st_'+kind,'예약 내용을 읽는 중이에요 (보통 10~20초)',[],'');
  const areaList=Object.entries(AREAS).map(([k,v])=>`${k}=${v[0]}`).join(', ');
  const prompt=kind==='flight'
   ?`Extract the round trip (flight, train or bus) between the traveler's home and ${PACK.city} from this booking text. Copy times exactly as printed (local time, 24h HH:MM). For airport/station pick the closest key from: ${Object.entries(AIRPORTS).map(([k,g])=>k+'='+g.name).join(', ')}.\nReply with only JSON: {"startDate":"YYYY-MM-DD or null","endDate":"YYYY-MM-DD or null","mode":"flight|train|bus|null","out":{"airport":"key|null","dep":"HH:MM|null","arr":"HH:MM|null","flight":"string|null"},"back":{"airport":"key|null","dep":"HH:MM|null","arr":"HH:MM|null","flight":"string|null"}}\nText:\n${text.slice(0,6000)}`
   :`Extract hotel stays in ${PACK.city} from this booking text. For area choose the closest key from: ${areaList}.\nReply with only JSON: {"stays":[{"name":"short hotel name","area":"key","checkin":"HH:MM|null","checkout":"HH:MM|null","checkinDate":"YYYY-MM-DD|null","checkoutDate":"YYYY-MM-DD|null"}]}\nText:\n${text.slice(0,6000)}`;
  try{
    const r=await sample.json(prompt,{modelTier:'quick',cache:false}); progStop('st_'+kind);
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
    rerenderForm(); const s2=$('#st_'+kind); if(s2) s2.textContent='채웠어요. 틀린 칸이 있으면 직접 고쳐 주세요.';
  }catch(e){progStop('st_'+kind);const s2=$('#st_'+kind);if(s2) s2.textContent=e&&e.code==='not_granted'?'AI 키가 맞지 않아서 채우지 못했어요. 직접 입력해 주세요.':'읽지 못했어요. 직접 입력하거나 다시 시도해 주세요.'}
}
async function aiKeywords(){
  const tx=($('#tasteText')&&$('#tasteText').value||'').trim(), st=$('#st_kw'); if(!st) return;
  if(!tx){st.textContent='좋아하는 것을 먼저 적어 주세요.';return} progStart('st_kw','키워드를 고르는 중이에요 (보통 10초 안팎)',['aiKw'],'찾는 중…');
  const all=[...new Set([...Object.values(TAGS).flat(),...GENERIC_KW])];
  try{
    const r=await sample.json(`A traveler going to ${PACK.city} describes what they like: "${tx.slice(0,800)}".\nChoose the matching interest keywords from this list: ${all.join(', ')}. You may add up to 3 new short Korean keywords if something important is missing.\nReply with only JSON: {"keywords":["..."]}`,{modelTier:'quick'});
    progStop('st_kw');
    const ks=(Array.isArray(r.keywords)?r.keywords:[]).map(String).filter(Boolean).slice(0,15);
    ks.forEach(k=>{if(!kws.some(x=>norm(x)===norm(k)))kws.push(k)}); store.set('gp.kw',kws); rerenderForm();
    const s2=$('#st_kw'); if(s2) s2.textContent=`키워드 ${ks.length}개를 골랐어요.`;
  }catch(e){progStop('st_kw');const s2=$('#st_kw'); if(s2) s2.textContent='찾지 못했어요. 직접 골라 주세요.'}
}

