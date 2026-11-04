// ================= 뭐 하지? — anywhere, any area, one place or a whole course =================
const DO_MOODS=[['any','상관없음'],['quiet','조용히'],['move','움직이고 싶어'],['drink','한잔'],['rain','비 와요'],['hungry','배고파']];
const DO_Q={any:[{c:'AT4'},{c:'CT1'},{c:'CE7'}],quiet:[{q:'서점'},{q:'미술관'},{q:'갤러리'},{q:'공원'}],move:[{q:'공원'},{q:'산책로'},{q:'볼링장'},{q:'클라이밍'}],
  drink:[{q:'바',c:'FD6'},{q:'이자카야',c:'FD6'},{q:'와인바',c:'FD6'}],rain:[{q:'전시'},{q:'영화관'},{q:'서점'},{q:'보드게임카페'}],hungry:[{c:'FD6'}]};
const TYPE_Q={meal:[{c:'FD6'}],cafe:[{c:'CE7'}],night:[{q:'바',c:'FD6'},{q:'이자카야',c:'FD6'},{q:'와인바',c:'FD6'}]};
const TYPE_ICON={meal:'🍽',cafe:'☕',act:'🎯',night:'🍸'}, TYPE_DUR={meal:60,cafe:45,act:60,night:75};
let doS={base:null,org:'gps',area:null,when:'now',at:'18:00',clen:'short',mood:'any',pick:null,rolls:0,course:null,busy:false,msg:'',origin:null,where:'',src:'',hits:[],chosen:null,cond:false};
Object.assign(doS,LS.get('jepi.do',{}),{base:null,pick:null,course:null,busy:false,msg:'',hits:[],chosen:null,cond:false});
const saveDo=()=>LS.set('jepi.do',{mood:doS.mood,clen:doS.clen,area:doS.area,at:doS.at});
let RECENT_AREAS=LS.get('jepi.areas',[])||[];
const kCache=new Map(); let aiPoolCache=null;
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
async function kFetch(specs,ll,R){
  const key=JSON.stringify(specs)+ll.map(v=>v.toFixed(3)).join(',')+R; const hit=kCache.get(key); if(hit&&Date.now()-hit.at<1800e3) return hit.list;
  const base={x:ll[1],y:ll[0],radius:R,sort:'distance',size:15}, docs=[];
  for(const s of specs){
    if(s.q){const j=await kakaoGet('/v2/local/search/keyword.json',Object.assign({query:s.q},s.c?{category_group_code:s.c}:{},base));docs.push(...(j.documents||[]))}
    else for(const page of [1,2]){const j=await kakaoGet('/v2/local/search/category.json',Object.assign({category_group_code:s.c,page},base));docs.push(...(j.documents||[]));if(j.meta&&j.meta.is_end)break}
  }
  const seen=new Set(), list=[];
  docs.forEach(d=>{if(seen.has(d.id))return;seen.add(d.id);const cat=String(d.category_name||'').split('>').map(s=>s.trim());
    list.push({id:'k'+d.id,name:d.place_name,cat:cat[cat.length-1]||'',full:d.category_name||'',ll:[+d.y,+d.x],addr:d.road_address_name||d.address_name||'',url:d.place_url||`https://map.kakao.com/link/search/${encodeURIComponent(d.place_name)}`})});
  kCache.set(key,{at:Date.now(),list}); return list;
}
async function aiPool(ll,areaName){
  const k=(ll?ll.map(v=>v.toFixed(2)).join(','):areaName)+doS.mood; if(aiPoolCache&&aiPoolCache.k===k)return aiPoolCache.list;
  if(!sample) throw aiErr('nokey','주변 장소를 찾으려면 설정에서 카카오 지도 키나 AI를 연결해 주세요.');
  const mood=(DO_MOODS.find(m=>m[0]===doS.mood)||[])[1]||'';
  const r=await sample.json(`List 18 real, currently operating places ${ll?`within about 1.5 km of latitude ${ll[0]}, longitude ${ll[1]}`:''}${areaName?` in or around ${areaName}`:''} for a spontaneous outing. Mix: 5 restaurants (type "meal"), 4 cafes ("cafe"), 6 things to do such as parks, galleries, bookshops, shops or activities ("act"), 3 bars ("night").${doS.mood!=='any'?` Mood: ${mood}.`:''} Only places you are confident exist there, with accurate coordinates.
Reply with only JSON: {"places":[{"name":"name as shown locally","nameKo":"Korean reading if different","type":"meal|cafe|act|night","category":"short Korean","lat":0.0,"lng":0.0,"address":"short"}]}`,{modelTier:'quick',cache:false});
  const list=(Array.isArray(r&&r.places)?r.places:[]).filter(p=>p&&p.name&&isFinite(+p.lat)&&isFinite(+p.lng)).map((p,i)=>({id:'a'+i+norm(p.name),name:p.nameKo&&p.nameKo!==p.name?`${p.nameKo} (${p.name})`:p.name,cat:p.category||'',full:p.category||'',type:['meal','cafe','act','night'].includes(p.type)?p.type:'act',ll:[+p.lat,+p.lng],addr:p.address||'',url:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+(p.address||''))}`,ai:true}));
  aiPoolCache={k,list}; return list;
}
function timeOk(x,t,type){const f=x.full+' '+x.name;
  if(t>=1200&&/미술관|박물관|갤러리|전시|공원|산책/.test(f))return false;
  if(t<1020&&type!=='night'&&doS.mood!=='drink'&&/술집|호프|이자카야|포차|와인바|칵테일|\bBAR\b|바$/.test(f))return false;
  return true}
async function poolFor(type,ll,t){
  let list;
  if(KEYS.kakao&&!keyBad.kakao&&inKR(ll)){list=await kFetch(type==='act'?(DO_Q[doS.mood]||DO_Q.any):TYPE_Q[type],ll,1500);doS.src='카카오 지도'}
  else{list=(await aiPool(ll,doS.base==='area'&&doS.area?doS.area.name:'')).filter(x=>x.type===type||(type==='act'&&doS.mood==='hungry'&&x.type==='meal'));doS.src='AI 추천 · 가기 전에 지도에서 확인하세요'}
  return list.filter(x=>timeOk(x,t,type));
}
function pickNear(pool,from,maxM){
  const rec=eatRecent(); let cs=pool.filter(x=>!rec.has(norm(x.name))).map(x=>({x,d:km(from,x.ll)*1000}));
  let near=cs.filter(c=>c.d<=maxM); if(!near.length) near=cs.filter(c=>c.d<=maxM*1.8); if(!near.length) return null;
  const w=c=>1+Math.max(0,1-c.d/maxM); const tot=near.reduce((a,c)=>a+w(c),0); let r=Math.random()*tot;
  for(const c of near){r-=w(c);if(r<=0)return c.x} return near[near.length-1].x;
}
const walkMin=(a,b)=>Math.max(2,Math.round(km(a,b)*1000*1.3/80));
function courseTypes(t,items){
  const last=items[items.length-1];
  if(!items.some(x=>x.meal==='lunch')&&t>=660&&t<=790) return ['meal','lunch'];
  if(!items.some(x=>x.meal==='dinner')&&t>=1050&&t<=1170) return ['meal','dinner'];
  if(doS.mood==='hungry'&&!items.length) return ['meal',''];
  if(t>=1230) return items.some(x=>x.type==='night')?null:[doS.mood==='quiet'?'cafe':'night',''];
  if(last&&last.type==='act'&&!items.some(x=>x.type==='cafe')) return ['cafe',''];
  return ['act',''];
}
async function buildCourse(ll,t0,tEnd){
  const items=[]; let t=t0, prev=ll; const used=new Set();
  while(items.length<8&&(t+20<=tEnd||(items.length<3&&t<tEnd+60))){
    const ty=courseTypes(t,items); if(!ty) break;
    let [type,meal]=ty, pool=(await poolFor(type,ll,t)).filter(x=>!used.has(x.id)), c=pickNear(pool,prev,900);
    if(!c&&type==='act'){type='cafe';pool=(await poolFor('cafe',ll,t)).filter(x=>!used.has(x.id));c=pickNear(pool,prev,900)}
    if(!c){if(items.length)break; else throw aiErr('none','이 근처에서 갈 만한 곳을 찾지 못했어요. 동네나 기분을 바꿔 보세요.')}
    const walk=walkMin(prev,c.ll), start=Math.ceil((t+(items.length?walk:Math.min(walk,15)))/10)*10;
    items.push(Object.assign({},c,{type,meal,start,dur:TYPE_DUR[type],walk})); used.add(c.id); prev=c.ll; t=start+TYPE_DUR[type];
  }
  return items;
}
function reflowCourse(from){const c=doS.course;for(let j=Math.max(1,from);j<c.length;j++){c[j].walk=walkMin(c[j-1].ll,c[j].ll);c[j].start=Math.ceil((c[j-1].start+c[j-1].dur+c[j].walk)/10)*10}
  if(from===0&&c[0]){c[0].walk=walkMin(doS.origin,c[0].ll)}}
async function doGo(kind,again){
  if(doS.busy) return;
  if(kind==='one'&&again&&doS.rolls>=3) return;
  doS.busy=true; doS.msg=''; if(!again){doS.rolls=0;doS.chosen=null} if(kind==='course'){doS.pick=null}else{doS.course=null}
  renderDice();
  try{
    let ll=await doOrigin(); if(!ll){const pl=await aiPool(null,doS.area?doS.area.name:'');if(!pl.length)throw aiErr('none','이 동네를 찾지 못했어요. 다르게 적어 보세요.');ll=pl[0].ll}
    doS.origin=ll; const t0=doStart();
    if(kind==='one'){
      const type=doS.mood==='hungry'?'meal':'act';
      const pool=(await poolFor(type,ll,t0)).filter(x=>!doS.pick||x.id!==doS.pick.id), c=pickNear(pool,ll,1100);
      if(!c){doS.pick=null;doS.msg='이 근처에서 조건에 맞는 곳을 찾지 못했어요. 기분을 바꾸거나 코스로 짜 보세요.'}
      else{doS.pick=Object.assign({},c,{type,walk:walkMin(ll,c.ll)});doS.rolls++;dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches;if(dice.rolling)setTimeout(()=>{dice.rolling=false;renderDice()},650)}
    }else{
      const tEnd=doS.clen==='rest'?Math.min(1410,Math.max(t0+150,1380)):doS.clen==='half'?Math.min(1410,t0+300):Math.min(1410,t0+180);
      doS.course=await buildCourse(ll,t0,tEnd);
      if(!doS.course.length){doS.course=null;doS.msg='지금 시간에는 코스를 짜기 어려워요. 시간을 바꿔 보세요.'}
    }
  }catch(err){doS.msg=err.message||'장소를 가져오지 못했어요.';doS.course=null;doS.pick=null}
  doS.busy=false; renderDice();
}
async function doReroll(i){
  const c=doS.course; if(!c||!c[i]||doS.busy) return; doS.busy=true; renderDice();
  try{const it=c[i], used=new Set(c.map(x=>x.id)), from=i?c[i-1].ll:doS.origin;
    const pool=(await poolFor(it.type,doS.origin,it.start)).filter(x=>!used.has(x.id)), n=pickNear(pool,from,900);
    if(n){c[i]=Object.assign({},n,{type:it.type,meal:it.meal,start:it.start,dur:it.dur,walk:walkMin(from,n.ll)});reflowCourse(i+1)} else doS.msg='이 칸은 바꿀 다른 후보가 없어요.';
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
  store.set('gp.plan.'+nid,data); plans.unshift({id:nid,name:`${areaName} · ${+today.slice(5,7)}/${+today.slice(8,10)} ${fmt(c[0].start)} 코스`,custom_name:true,updated:Date.now(),kind:'day',dates:today.slice(5).replace('-','/'),blocks:places.length});
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
    picker:doS.base==='area'&&(!doS.area||doS.picking)?{hits:doS.hits.map(h=>({name:h.name,addr:h.addr})),recent:RECENT_AREAS.map(a=>a.name)}:null,
    cond:{open:!!doS.cond,txt:doCondTxt(),rows:[...(doS.base==='near'?[dHint('기준'),dPills('doorg',doS.org,orgs),...(MYP.some(x=>x.ll)?[]:[{r:'setPlaces'}])]:[]),
      dHint('언제'),{r:'when',later:doS.when==='later',at:doS.at||''},dHint('코스 길이'),dPills('doclen',doS.clen,[['short','2~3시간 · 3곳 안팎'],['half','반나절 · 4~5곳'],['rest','오늘 끝까지']]),
      dHint('기분'),dPills('domood',doS.mood,DO_MOODS.map(m=>[m[0],m[1]]))]},
    stage,msg:doS.msg||'',acts,foot:'최근 5일 동안 고른 곳은 빼고 굴려요. 영업시간은 지도에서 한 번 확인하세요.'});
}
function pushRecentArea(a){RECENT_AREAS=[a,...RECENT_AREAS.filter(x=>x.name!==a.name)].slice(0,6);LS.set('jepi.areas',RECENT_AREAS)}
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&d.classList.contains('cond')){if(dice.tab==='eat')eat.cond=d.open;else doS.cond=d.open}},true);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='doAt'){doS.at=e.target.value||'18:00';saveDo();renderDice()}});
document.addEventListener('keydown',e=>{if(e.target&&e.target.id==='doAreaQ'&&e.key==='Enter'&&!e.isComposing){e.preventDefault();const b=document.getElementById('doAreaFind');if(b)b.click()}});
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t||!t.closest('#sheet .dice'))return;
  if(t.dataset.dobase){doS.base=t.dataset.dobase;doS.pick=null;doS.course=null;doS.msg='';doS.picking=doS.base==='area'&&!doS.area;
    if(doS.base==='area'&&doS.area&&doS.prevBase==='area')doS.picking=true; doS.prevBase=doS.base; dice.pick=null;dice.rolls=0;renderDice();
    if(doS.picking)setTimeout(()=>{const i=$('#doAreaQ');if(i)i.focus()},50);return}
  if(t.id==='doAreaFind'){const q=(($('#doAreaQ')||{}).value||'').trim();if(!q)return;
    if(!KEYS.kakao){const a={name:q,ll:null};doS.area=a;doS.picking=false;doS.msg=sample?'':'동네를 찾으려면 설정에서 카카오 지도 키나 AI를 연결해 주세요.';renderDice();return}
    try{const j=await kakaoGet('/v2/local/search/keyword.json',{query:q,size:6});doS.hits=(j.documents||[]).map(d=>({name:d.place_name,addr:d.road_address_name||d.address_name||'',ll:[+d.y,+d.x]}));doS.msg=doS.hits.length?'':'찾지 못했어요. 역 이름으로 적어 보세요.'}catch(err){doS.msg=err.message}renderDice();return}
  if(t.dataset.doareapick!=null){const h=doS.hits[+t.dataset.doareapick];if(h){doS.area={name:h.name,ll:h.ll};pushRecentArea(doS.area);saveDo();doS.hits=[];doS.picking=false;doS.msg=''}renderDice();return}
  if(t.dataset.doarecent!=null){const a=RECENT_AREAS[+t.dataset.doarecent];if(a){doS.area=a;pushRecentArea(a);saveDo();doS.picking=false;doS.msg=''}renderDice();return}
  if(t.dataset.doorg){doS.org=t.dataset.doorg;doS.pick=null;doS.course=null;renderDice();return}
  if(t.dataset.dowhen){doS.when=t.dataset.dowhen;doS.course=null;doS.pick=null;renderDice();return}
  if(t.dataset.doclen){doS.clen=t.dataset.doclen;saveDo();if(doS.course)doGo('course');else renderDice();return}
  if(t.dataset.domood){doS.mood=t.dataset.domood;aiPoolCache=null;doS.pick=null;doS.course=null;saveDo();renderDice();return}
  if(t.dataset.dogo){doGo(t.dataset.dogo,!!t.dataset.again);return}
  if(t.dataset.doreroll!=null){doReroll(+t.dataset.doreroll);return}
  if(t.id==='doPick'&&doS.pick){diceLog.push({n:doS.pick.name,d:isoOf(new Date())});diceLog=diceLog.slice(-60);store.set('gp.dice',diceLog);doS.chosen=doS.pick.name;renderDice();return}
  if(t.id==='doSave'){saveCourse();return}
});

