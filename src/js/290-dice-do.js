// ================= 뭐 하지? — anywhere, any area, one place or a whole course =================
const DO_MOODS=NB.DO_MOODS, TYPE_ICON=NB.TYPE_ICON;   // app/data/nearby.ts
let doS={base:null,org:'gps',area:null,when:'now',at:'18:00',clen:'short',mood:'any',pick:null,rolls:0,course:null,busy:false,msg:'',origin:null,where:'',src:'',hits:[],chosen:null,cond:false};
Object.assign(doS,LS.get('jepi.do',{}),{base:null,pick:null,course:null,busy:false,msg:'',hits:[],chosen:null,cond:false});
const saveDo=()=>LS.set('jepi.do',{mood:doS.mood,clen:doS.clen,area:doS.area,at:doS.at});
let RECENT_AREAS=LS.get('jepi.areas',[])||[];
function doDefaults(fromSlot){
  const t=isoOf(new Date()), last=DAYS.length?DAYS[DAYS.length-1].iso:'';
  doS.base=fromSlot||(planUsable()&&(!last||last>=t))?'plan':'near';
  doS.pick=null;doS.course=null;doS.rolls=0;doS.msg='';doS.chosen=null;doS.when='now';
}
function doStart(){return doS.when==='now'?Math.ceil((nowMin()+10)/10)*10:(parse(doS.at)??1080)}
async function doOrigin(){
  if(doS.base==='area'){if(!doS.area)throw aiErr('noarea','동네를 먼저 골라 주세요.');doS.where=doS.area.name;return doS.area.ll||null}
  if(doS.org==='gps'){const ll=await getPos(120000);doS.where='지금 위치';return ll}
  const x=mypOf(doS.org);if(!x||!x.ll)throw aiErr('noplace','이 장소를 아직 등록하지 않았어요.');doS.where=x.name;return x.ll;
}
const doLook=()=>({kakao:!!KEYS.kakao&&!keyBad.kakao,ai:sample,mood:doS.mood,areaName:doS.base==='area'&&doS.area?doS.area.name:''});
async function poolFor(type,ll,t){const r=await NB.poolFor(type,ll,t,doLook());doS.src=r.src;return r.list}
async function doGo(kind,again){
  if(doS.busy) return;
  if(kind==='one'&&again&&doS.rolls>=3) return;
  doS.busy=true; doS.msg=''; if(!again){doS.rolls=0;doS.chosen=null} if(kind==='course'){doS.pick=null}else{doS.course=null}
  renderDice();
  try{
    let ll=await doOrigin(); if(!ll){const pl=await NB.aiPool(null,doS.area?doS.area.name:'',doS.mood,sample);if(!pl.length)throw aiErr('none','이 동네를 찾지 못했어요. 다르게 적어 보세요.');ll=pl[0].ll}
    doS.origin=ll; const t0=doStart();
    if(kind==='one'){
      const type=doS.mood==='hungry'?'meal':'act';
      const pool=(await poolFor(type,ll,t0)).filter(x=>!doS.pick||x.id!==doS.pick.id), c=NB.pickNear(pool,ll,1100,eatRecent());
      if(!c){doS.pick=null;doS.msg='이 근처에서 조건에 맞는 곳을 찾지 못했어요. 기분을 바꾸거나 코스로 짜 보세요.'}
      else{doS.pick=Object.assign({},c,{type,walk:NB.walkMin(ll,c.ll)});doS.rolls++;dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches;if(dice.rolling)setTimeout(()=>{dice.rolling=false;renderDice()},650)}
    }else{
      const tEnd=doS.clen==='rest'?Math.min(1410,Math.max(t0+150,1380)):doS.clen==='half'?Math.min(1410,t0+300):Math.min(1410,t0+180);
      const r=await NB.buildCourse(ll,t0,tEnd,doLook(),eatRecent()); doS.course=r.items; if(r.src) doS.src=r.src;
      if(!doS.course.length){doS.course=null;doS.msg='지금 시간에는 코스를 짜기 어려워요. 시간을 바꿔 보세요.'}
    }
  }catch(err){doS.msg=err.message||'장소를 가져오지 못했어요.';doS.course=null;doS.pick=null}
  doS.busy=false; renderDice();
}
async function doReroll(i){
  const c=doS.course; if(!c||!c[i]||doS.busy) return; doS.busy=true; renderDice();
  try{const it=c[i], used=new Set(c.map(x=>x.id)), from=i?c[i-1].ll:doS.origin;
    const pool=(await poolFor(it.type,doS.origin,it.start)).filter(x=>!used.has(x.id)), n=NB.pickNear(pool,from,900,eatRecent());
    if(n){c[i]=Object.assign({},n,{type:it.type,meal:it.meal,start:it.start,dur:it.dur,walk:NB.walkMin(from,n.ll)});NB.reflow(c,doS.origin,i+1)} else doS.msg='이 칸은 바꿀 다른 후보가 없어요.';
  }catch(err){doS.msg=err.message}
  doS.busy=false; renderDice();
}
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
  carryTaste(profile,prof); if(profile&&profile.party) prof.party=clone(profile.party);
  const data={profile:prof,pack,placed:places.map((p,i)=>({id:p.id,day:0,start:c[i].start,dur:c[i].dur})),custom:[],fmarks:{},wish:[],meals:{},done:{}};
  snapshotCurrent(); const nid='p'+Date.now().toString(36);
  TRIP.plans.put(nid,data); plans.unshift({id:nid,name:`${areaName} · ${+today.slice(5,7)}/${+today.slice(8,10)} ${fmt(c[0].start)} 코스`,custom_name:true,updated:Date.now(),kind:'day',dates:today.slice(5).replace('-','/'),blocks:places.length});
  curPlan=nid; savePlans(); closeSheet(); applyPlanData(data); snapshotCurrent(); day=0; tab='timeline'; renderTabs(); renderAll();
  showToast('내 계획에 저장했어요 · 일정과 지도에서 볼 수 있어요');
}
function doCondTxt(){const mood=(DO_MOODS.find(m=>m[0]===doS.mood)||[])[1];return [doS.when==='now'?'지금':`이따 ${doS.at}`,doS.clen==='rest'?'코스: 오늘 끝까지':doS.clen==='half'?'코스: 반나절':'코스: 2~3시간',mood==='상관없음'?'':mood].filter(Boolean).join(' · ')}
function eatCondTxt(){const mood=(EAT_MOODS.find(m=>m[0]===eat.mood)||[])[1];return [eat.base==='plan'?MEAL_TXT[eat.meal]:'',`걸어서 ${eat.walk}분`,mood==='상관없음'?'':mood].filter(Boolean).join(' · ')}
function doBases(){const nearLbl=doS.org==='gps'?'지금 위치':(mypOf(doS.org)||{}).name||'지금 위치';
  return [{attr:'dobase',v:'near',on:doS.base==='near',label:'📍 내 주변',small:nearLbl},{attr:'dobase',v:'area',on:doS.base==='area',label:'🗺 동네',small:doS.area?doS.area.name:'골라 주세요'},
    ...(planUsable()?[{attr:'dobase',v:'plan',on:doS.base==='plan',label:`🗓 ${PACK.city}`,small:`Day ${day+1} 빈 시간`}]:[])]}
function renderDoNear(){
  const orgs=[['gps','지금 위치'],...MYP.filter(x=>x.ll).map(x=>[x.id,x.name])];
  const busy=doS.busy?{s:'die',spin:true,face:'🎲',hint:`${doS.base==='area'&&doS.area?doS.area.name:'주변'}에서 찾는 중…`}:null;
  let stage, acts;
  if(doS.course){
    const C=doS.course, cEnd=C.length?C[C.length-1].start+C[C.length-1].dur:0;
    stage=busy||{s:'course',head:`${fmt(C[0].start)}–${fmt(cEnd)} · ${C.length}곳 · 약 ${durTxt(cEnd-C[0].start)}`,src:doS.src||'',
      items:C.map((x,i)=>({t:fmt(x.start),title:`${TYPE_ICON[x.type]} ${x.name}`,sub:`${i?`앞에서 걸어서 ${x.walk}분`:`${doS.where}에서 걸어서 ${x.walk}분`} · ${x.cat}${x.meal?` · ${x.meal==='lunch'?'점심':'저녁'}`:''}`,url:String(x.url||''),name:x.name}))};
    acts=doS.busy?[]:[dBtn('small-btn primary','📌 이 코스 저장',{id:'doSave'}),dBtn('small-btn','다시 짜기',{data:{dogo:'course'}}),dBtn('small-btn','하나만 굴리기',{data:{dogo:'one'}})];
  }else if(doS.pick){
    const c=doS.pick,left=Math.max(0,3-doS.rolls);
    stage=busy||(dice.rolling?dSpin():{s:'placeCard',title:`${TYPE_ICON[c.type]} ${c.name}`,line:`걸어서 약 ${c.walk}분 · ${c.cat}`,addr:c.addr||'',foot:`${doS.where} 기준 · ${doS.src}`});
    acts=doS.busy||dice.rolling?[]:doS.chosen===c.name?[{a:'status',t:'즐거운 시간 보내세요! 🎲'},dLink('small-btn primary','지도 열기',c.url),dBtn('small-btn','여기서 코스로 짜기',{data:{dogo:'course'}})]
      :[dBtn('small-btn primary','이걸로!',{id:'doPick'}),dLink('small-btn','지도',c.url),dBtn('small-btn',`다시 (${left})`,{data:{dogo:'one',again:'1'},disabled:!left}),dBtn('small-btn','코스로 짜기',{data:{dogo:'course'}})];
  }else{
    stage=busy||{s:'die',face:'⚄'};
    acts=doS.busy?[]:[dBtn('dice-go','🎲 하나 굴리기',{data:{dogo:'one'}}),dBtn('dice-go alt','🗺 코스 짜기',{data:{dogo:'course'}})];
  }
  diceMount({tabs:dice.tab==='eat'?'eat':'do',
    bases:doBases(),
    picker:doS.base==='area'&&(!doS.area||doS.picking)?{focus:!!doS.focus,hits:doS.hits.map(h=>({name:h.name,addr:h.addr})),recent:RECENT_AREAS.map(a=>a.name)}:null,
    cond:{open:!!doS.cond,txt:doCondTxt(),rows:[...(doS.base==='near'?[dHint('기준'),dPills('doorg',doS.org,orgs),...(MYP.some(x=>x.ll)?[]:[{r:'setPlaces'}])]:[]),
      dHint('언제'),{r:'when',later:doS.when==='later',at:doS.at||''},dHint('코스 길이'),dPills('doclen',doS.clen,[['short','2~3시간 · 3곳 안팎'],['half','반나절 · 4~5곳'],['rest','오늘 끝까지']]),
      dHint('기분'),dPills('domood',doS.mood,DO_MOODS.map(m=>[m[0],m[1]]))]},
    stage,msg:doS.msg||'',acts,foot:'최근 5일 동안 고른 곳은 빼고 굴려요. 영업시간은 지도에서 한 번 확인하세요.'});
}
function pushRecentArea(a){RECENT_AREAS=[a,...RECENT_AREAS.filter(x=>x.name!==a.name)].slice(0,6);LS.set('jepi.areas',RECENT_AREAS)}
// What was pressed in the 🎲 sheet (app/screens/Dice.tsx tells: the button's name, its value, and its other data-…)
async function diceAct(n,v,more){
  more=more||{};
  switch(n){
  // both tabs
  case 'dicetab': if(v==='eat'){dice.tab='eat';eatDefaults();eat.chosen=null}else{dice.tab='do';dice.pick=null;dice.rolls=0;dice.msg='';doDefaults(false)}renderDice();return;
  case 'cond': if(dice.tab==='eat')eat.cond=!!v;else doS.cond=!!v;return;   // the 조건 box opened / closed
  case 'eatSetPlaces': closeSheet();tab='settings';JD.myplaces.ui.edit=null;renderSettings();renderTabs();return;
  // 일정 빈 시간에서 굴리기 (160-modes-roll.js)
  case 'dicegap': dice.gapI=+v;dice.pick=null;dice.msg='';renderDice();return;
  case 'dicemood': dice.mood=v;dice.pick=null;dice.msg='';renderDice();return;
  case 'dicewalk': dice.walk=+v;dice.pick=null;renderDice();return;
  case 'diceGo': diceRoll(false);return;
  case 'diceAgain': diceRoll(true);return;
  case 'diceFix': diceFix(false);return;
  case 'diceForce': diceFix(true);return;
  case 'diceAI': diceAI();return;
  // 뭐 먹지 (280-dice-eat.js)
  case 'eatbase': eat.base=v;eat.pick=null;eat.rolls=0;eat.msg='';dice.pick=null;dice.rolls=0;dice.msg='';if(eat.base==='plan'){const ti=todayIdx();if(ti>=0)day=ti}renderEat();return;
  case 'eatorg': eat.org=v;eat.pick=null;eat.rolls=0;NB.forgetEat();renderEat();return;
  case 'eatmeal': eat.meal=v;dice.pick=null;dice.rolls=0;renderEat();return;
  case 'eatwalk': eat.walk=+v;eat.pick=null;eat.rolls=0;saveEat();renderEat();return;
  case 'eatmood': eat.mood=v;eat.pick=null;eat.rolls=0;dice.pick=null;dice.rolls=0;saveEat();renderEat();return;
  case 'eatroll': eatRoll(v==='again');return;
  case 'eatPick': if(eat.pick){diceLog.push({n:eat.pick.name,d:isoOf(new Date())});diceLog=diceLog.slice(-60);store.set('gp.dice',diceLog);eat.chosen=eat.pick.name;renderEat()}return;
  // 뭐 하지 (here)
  case 'dobase': doS.base=v;doS.pick=null;doS.course=null;doS.msg='';doS.picking=doS.base==='area'&&!doS.area;
    if(doS.base==='area'&&doS.area&&doS.prevBase==='area')doS.picking=true; doS.prevBase=doS.base; dice.pick=null;dice.rolls=0;doS.focus=doS.picking;renderDice();doS.focus=false;return;
  case 'doAreaFind': {const q=String(v||'').trim();if(!q)return;
    if(!KEYS.kakao){const a={name:q,ll:null};doS.area=a;doS.picking=false;doS.msg=sample?'':'동네를 찾으려면 설정에서 카카오 지도 키나 AI를 연결해 주세요.';renderDice();return}
    try{const j=await kakaoGet('/v2/local/search/keyword.json',{query:q,size:6});doS.hits=(j.documents||[]).map(d=>({name:d.place_name,addr:d.road_address_name||d.address_name||'',ll:[+d.y,+d.x]}));doS.msg=doS.hits.length?'':'찾지 못했어요. 역 이름으로 적어 보세요.'}catch(err){doS.msg=err.message}renderDice();return}
  case 'doareapick': {const h=doS.hits[+v];if(h){doS.area={name:h.name,ll:h.ll};pushRecentArea(doS.area);saveDo();doS.hits=[];doS.picking=false;doS.msg=''}renderDice();return}
  case 'doarecent': {const a=RECENT_AREAS[+v];if(a){doS.area=a;pushRecentArea(a);saveDo();doS.picking=false;doS.msg=''}renderDice();return}
  case 'doorg': doS.org=v;doS.pick=null;doS.course=null;renderDice();return;
  case 'dowhen': doS.when=v;doS.course=null;doS.pick=null;renderDice();return;
  case 'doAt': doS.at=v||'18:00';saveDo();renderDice();return;
  case 'doclen': doS.clen=v;saveDo();if(doS.course)doGo('course');else renderDice();return;
  case 'domood': doS.mood=v;NB.forgetAi();doS.pick=null;doS.course=null;saveDo();renderDice();return;
  case 'dogo': doGo(v,!!more.again);return;
  case 'doreroll': doReroll(+v);return;
  case 'doPick': if(doS.pick){diceLog.push({n:doS.pick.name,d:isoOf(new Date())});diceLog=diceLog.slice(-60);store.set('gp.dice',diceLog);doS.chosen=doS.pick.name;renderDice()}return;
  case 'doSave': saveCourse();return;
  }
}

