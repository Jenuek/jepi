// ================= DICE: 뭐 하지? / 뭐 먹지? =================
const EAT_MOODS=[['any','상관없음',[]],['full','든든하게',['국밥','백반','덮밥','돈까스']],['light','가볍게',['샐러드','샌드위치','김밥','죽']],['soup','국물',['국밥','찌개','칼국수','쌀국수','라멘']],['noodle','면',['국수','라멘','우동','냉면','파스타']],['meat','고기',['고기','삼겹살','갈비','스테이크']],['solo','혼밥 편한 곳',['라멘','덮밥','김밥','국밥','분식']],['new','안 가 본 곳',[]],['cafe','카페·디저트',[]]];
let eat=Object.assign({walk:10,mood:'any'},LS.get('jepi.eat',{}),{base:null,org:null,pick:null,rolls:0,list:null,key:'',msg:'',busy:false,ll:null,where:'',meal:null,src:''});
const saveEat=()=>LS.set('jepi.eat',{walk:eat.walk,mood:eat.mood});
const nowMin=()=>{const n=new Date();return n.getHours()*60+n.getMinutes()};
const mealNow=()=>{const m=nowMin();return m>=630&&m<930?'lunch':m>=990&&m<1290?'dinner':'snack'};
const MEAL_TXT={lunch:'점심',dinner:'저녁',snack:'간식·카페'};
const planUsable=()=>DAYS.length&&PACK&&PACK.city&&PACK.city!=='새 여행';
function eatDefaults(){
  const ti=todayIdx(); eat.base=ti>=0&&planUsable()?'plan':'near';
  if(eat.base==='plan') day=ti;
  const n=new Date(), wkLunch=n.getDay()>0&&n.getDay()<6&&nowMin()>=630&&nowMin()<900;
  eat.org=wkLunch&&mypOf('work')&&mypOf('work').ll?'work':'gps';
  eat.meal=mealNow()==='dinner'?'dinner':'lunch'; eat.pick=null; eat.rolls=0; eat.msg='';
}
function diceTabsHTML(){return `<div class="dice-tabs" role="tablist"><button type="button" role="tab" data-dicetab="do" aria-selected="${dice.tab!=='eat'}">🎲 뭐 하지?</button><button type="button" role="tab" data-dicetab="eat" aria-selected="${dice.tab==='eat'}">🍚 뭐 먹지?</button></div>`}
function renderDice(){
  if($('#sheet').dataset.uid!=='dice') return;
  if(dice.tab==='eat') return renderEat();
  if(!doS.base) doDefaults(false);
  if(doS.base!=='plan') return renderDoNear();
  dice.lunch=false; renderDiceDo();
  const d=$('#sheet .dice'); if(d) d.insertAdjacentHTML('afterbegin',diceTabsHTML()+doBasesHTML());
}
function eatRecent(){const t=isoOf(new Date()),from=isoShift(t,-5);return new Set(diceLog.filter(x=>x.d&&x.d>=from&&x.d<=t).map(x=>norm(x.n)))}
async function eatOrigin(){
  if(eat.org==='gps'){const ll=await getPos(120000);eat.where='지금 위치';return ll}
  const x=mypOf(eat.org); if(!x||!x.ll) throw aiErr('noplace',`${x?x.name:'이 장소'}를 아직 등록하지 않았어요. 더보기 → 설정 → 내 장소에서 등록해 주세요.`);
  eat.where=x.name; return x.ll;
}
async function eatFetch(ll){
  const R=Math.round(eat.walk*80), mood=EAT_MOODS.find(m=>m[0]===eat.mood)||EAT_MOODS[0];
  const key=`${ll[0].toFixed(3)},${ll[1].toFixed(3)}|${R}|${eat.mood}`; if(eat.list&&eat.key===key&&Date.now()-eat.at<1800e3) return eat.list;
  let out=[];
  if(KEYS.kakao&&inKR(ll)){
    const base={x:ll[1],y:ll[0],radius:R,sort:'distance',size:15};
    const docs=[];
    if(mood[0]==='cafe'){for(const page of [1,2]){const j=await kakaoGet('/v2/local/search/category.json',Object.assign({category_group_code:'CE7',page},base));docs.push(...(j.documents||[]));if(j.meta&&j.meta.is_end)break}}
    else if(mood[2].length){for(const q of mood[2].slice(0,4)){const j=await kakaoGet('/v2/local/search/keyword.json',Object.assign({query:q,category_group_code:'FD6'},base));docs.push(...(j.documents||[]))}}
    else{for(const page of [1,2,3]){const j=await kakaoGet('/v2/local/search/category.json',Object.assign({category_group_code:'FD6',page},base));docs.push(...(j.documents||[]));if(j.meta&&j.meta.is_end)break}}
    const seen=new Set();
    docs.forEach(d=>{if(seen.has(d.id))return;seen.add(d.id);const cat=String(d.category_name||'').split('>').map(s=>s.trim());
      out.push({name:d.place_name,cat:cat[cat.length-1]||'음식점',full:d.category_name||'',dist:+d.distance||0,addr:d.road_address_name||d.address_name||'',url:d.place_url||`https://map.kakao.com/link/search/${encodeURIComponent(d.place_name)}`,ll:[+d.y,+d.x]})});
    eat.src='카카오 지도';
  } else if(sample){
    const r=await sample.json(`List up to 14 real, currently operating ${eat.mood==='cafe'?'cafes or dessert places':'restaurants'} within about ${eat.walk} minutes walk of latitude ${ll[0]}, longitude ${ll[1]}${eat.mood!=='any'&&eat.mood!=='cafe'?` that fit this mood: ${mood[1]} (${mood[2].join(', ')})`:''}, good for ${MEAL_TXT[mealNow()]}. Only places you are confident exist there.
Reply with only JSON: {"places":[{"name":"name as shown locally","nameKo":"Korean reading if different","category":"short Korean food type","walkMin":5,"address":"short address","lat":0.0,"lng":0.0}]}`,{modelTier:'quick',cache:false});
    (Array.isArray(r&&r.places)?r.places:[]).forEach(p=>{if(!p||!p.name)return;const la=+p.lat,ln=+p.lng;const ok=isFinite(la)&&isFinite(ln)&&km(ll,[la,ln])<3;
      out.push({name:p.nameKo&&p.nameKo!==p.name?`${p.nameKo} (${p.name})`:p.name,cat:p.category||'음식점',full:p.category||'',dist:ok?km(ll,[la,ln])*1000:(+p.walkMin||eat.walk)*80,addr:p.address||'',url:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+(p.address||''))}`,ll:ok?[la,ln]:null,ai:true})});
    eat.src='AI 추천 · 가기 전에 지도에서 확인하세요';
  } else throw aiErr('nokey','주변 식당을 찾으려면 설정에서 카카오 지도 키나 AI를 연결해 주세요.');
  if(mealNow()!=='dinner'&&eat.mood!=='cafe') out=out.filter(x=>!/술집|호프|바\b|포차/.test(x.full));
  eat.list=out; eat.key=key; eat.at=Date.now(); return out;
}
async function eatRoll(again){
  if(eat.busy) return;
  if(eat.base==='plan'){
    dice.lunch=true; dice.meal=eat.meal; dice.walk=eat.walk; dice.mood='any';
    const gs=diceGaps(day), mw=eat.meal==='dinner'?[1050,1260]:[690,840];
    const gi=gs.findIndex(g=>g.e>mw[0]&&g.s<mw[1]); if(gi>=0) dice.gapI=gi;
    if(again&&dice.rolls>=3) return; diceRoll(!!again); return;
  }
  if(again&&eat.rolls>=3) return;
  eat.busy=true; eat.msg=''; if(!again){eat.rolls=0} renderEat();
  try{
    const ll=await eatOrigin(); eat.ll=ll;
    let list=await eatFetch(ll); const rec=eatRecent();
    let cs=list.filter(x=>!rec.has(norm(x.name))&&(!eat.pick||x.name!==eat.pick.name));
    if(eat.mood==='new'){const seen=new Set(diceLog.map(x=>norm(x.n)));cs=cs.filter(x=>!seen.has(norm(x.name)))}
    if(!cs.length){eat.pick=null;eat.msg=`걸어서 ${eat.walk}분 안에 ${eat.mood==='any'?'':'이 조건에 맞는 '}후보가 없어요. 거리를 늘리거나 기분을 바꿔 보세요.`}
    else{const R=eat.walk*80, w=x=>1+Math.max(0,1-x.dist/R); const tot=cs.reduce((a,x)=>a+w(x),0); let r=Math.random()*tot, pk=cs[cs.length-1]; for(const x of cs){r-=w(x);if(r<=0){pk=x;break}}
      eat.pick=pk; eat.rolls++; dice.rolling=!matchMedia('(prefers-reduced-motion:reduce)').matches; if(dice.rolling)setTimeout(()=>{dice.rolling=false;renderEat()},650)}
  }catch(err){eat.pick=null;eat.msg=err.message||'후보를 가져오지 못했어요.'}
  eat.busy=false; renderEat();
}
function renderEat(){
  if($('#sheet').dataset.uid!=='dice') return;
  const meal=eat.base==='plan'?eat.meal:mealNow(), mt=MEAL_TXT[meal]||'점심', D=DAYS[day]||{};
  const pills=(attr,cur,opts)=>`<div class="radio">${opts.map(([v,l])=>`<button type="button" data-${attr}="${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join('')}</div>`;
  const orgs=[['gps','지금 위치'],...MYP.filter(x=>x.ll).map(x=>[x.id,x.name])];
  const planChip=planUsable()?`<button type="button" class="eat-base" data-eatbase="plan" aria-pressed="${eat.base==='plan'}">🗓 ${esc(PACK.city)} Day ${day+1}<small>${esc(D.date||'')} ${MEAL_TXT[eat.meal]}</small></button>`:'';
  const nearLbl=eat.org==='gps'?'지금 위치':(mypOf(eat.org)||{}).name||'지금 위치';
  let stage='', acts='';
  if(eat.base==='plan'){
    const c=dice.pick;
    stage=dice.rolling?`<div class="die spin" aria-hidden="true">${FACES[Math.floor(Math.random()*6)]}</div>`:c?`<div class="dice-card" style="--cc:var(--c-${c.p.cat})"><b>${esc(c.p.name)}</b><span class="mono hint">${fmt(c.arr)}–${fmt(c.arr+c.dur)} · ${esc(c.p.area)}${c.tm?` · ${esc(c.mode)} ${c.tm}분`:''}</span><p>${esc(c.p.note||'')}</p></div>`:`<div class="die" aria-hidden="true">🍚</div>`;
    const left=Math.max(0,3-dice.rolls);
    acts=c&&!dice.rolling?`<button type="button" class="small-btn primary" id="diceFix">이걸로! 일정에 넣기</button>${dice.force?'<button type="button" class="small-btn" id="diceForce">그래도 넣기</button>':''}<button type="button" class="small-btn" data-eatroll="again"${left?'':' disabled'}>다시 굴리기 (${left})</button>`:dice.rolling?'':`<button type="button" class="dice-go" data-eatroll="go">🍚 ${MEAL_TXT[eat.meal]} 굴리기</button>`;
  } else {
    const c=eat.pick, left=Math.max(0,3-eat.rolls);
    stage=eat.busy?`<div class="die spin" aria-hidden="true">🍚</div><p class="hint">주변 식당을 찾는 중…</p>`:dice.rolling?`<div class="die spin" aria-hidden="true">${FACES[Math.floor(Math.random()*6)]}</div>`:c?`<div class="dice-card"><b>${esc(c.name)}</b><span class="mono hint">걸어서 약 ${Math.max(1,Math.round(c.dist/80))}분 · ${esc(c.cat)}</span>${c.addr?`<p>${esc(c.addr)}</p>`:''}<small class="hint">${esc(eat.where)} 기준 · ${esc(eat.src)}</small></div>`:`<div class="die" aria-hidden="true">🍚</div>`;
    acts=c&&!eat.busy&&!dice.rolling?(eat.chosen===c.name?`<span class="ai-status">맛있게 드세요! 🍚</span><a class="small-btn primary" href="${esc(c.url)}" target="_blank" rel="noopener">지도 열기</a>`:`<button type="button" class="small-btn primary" id="eatPick">이걸로!</button><a class="small-btn" href="${esc(c.url)}" target="_blank" rel="noopener">지도</a><button type="button" class="small-btn" data-eatroll="again"${left?'':' disabled'}>다시 굴리기 (${left})</button>`):(eat.busy||dice.rolling?'':`<button type="button" class="dice-go" data-eatroll="go">🍚 ${mt} 굴리기</button>`);
  }
  $('#sheet').innerHTML=`<div class="dice eat">${diceTabsHTML()}
    <div class="eat-bases"><button type="button" class="eat-base" data-eatbase="near" aria-pressed="${eat.base==='near'}">📍 ${esc(nearLbl)} 주변<small>걸어서 ${eat.walk}분</small></button>${planChip}</div>
    <details class="cond"${eat.cond?' open':''}><summary><span>${esc(eatCondTxt())}</span><span class="cond-e">조건 바꾸기</span></summary>
    ${eat.base==='near'?`<span class="hint">기준</span>${pills('eatorg',eat.org,orgs)}${MYP.some(x=>x.ll)?'':'<button type="button" class="linkbtn" id="eatSetPlaces">🏠 집·🏢 회사 등록해 두기</button>'}`
      :`<span class="hint">언제</span>${pills('eatmeal',eat.meal,[['lunch','점심'],['dinner','저녁']])}`}
    <span class="hint">걸어서</span>${pills('eatwalk',eat.walk,[[5,'5분'],[10,'10분'],[15,'15분'],[20,'20분']])}
    <span class="hint">기분</span>${pills('eatmood',eat.mood,EAT_MOODS.map(m=>[m[0],m[1]]))}</details>
    <div class="dice-stage">${stage}</div>
    ${eat.base==='near'&&eat.msg?`<p class="hint" style="color:var(--warn)">${esc(eat.msg)}</p>`:''}${eat.base==='plan'&&dice.msg?`<p class="hint" style="color:var(--warn)">${esc(dice.msg)}</p>`:''}
    <div class="row dice-acts">${acts}</div>
    ${eat.base==='plan'&&sample&&!PACK.manual?`<div class="row"><button type="button" class="small-btn" id="diceAI">🔎 AI가 새로 찾아서 굴리기</button><span class="ai-status" id="st_dice"></span></div>`:''}
    <p class="hint">최근 5일 동안 고른 곳은 빼고 굴려요.</p>
    <div class="row"><button type="button" class="small-btn" data-close="1">닫기</button></div></div>`;
}
function openDiceTab(tab,fromT){
  dice.tab=tab; if(tab==='eat'){eatDefaults(); eat.chosen=null} else doDefaults(fromT!=null);
  openDice(fromT); if(fromT==null) diceOpenAnim();
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!t.closest('#sheet .dice'))return;
  if(t.dataset.dicetab){if(t.dataset.dicetab==='eat'){dice.tab='eat';eatDefaults();eat.chosen=null}else{dice.tab='do';dice.pick=null;dice.rolls=0;dice.msg='';doDefaults(false)}renderDice();return}
  if(t.dataset.eatbase){eat.base=t.dataset.eatbase;eat.pick=null;eat.rolls=0;eat.msg='';dice.pick=null;dice.rolls=0;dice.msg='';if(eat.base==='plan'){const ti=todayIdx();if(ti>=0)day=ti}renderEat();return}
  if(t.dataset.eatorg){eat.org=t.dataset.eatorg;eat.pick=null;eat.rolls=0;eat.list=null;renderEat();return}
  if(t.dataset.eatmeal){eat.meal=t.dataset.eatmeal;dice.pick=null;dice.rolls=0;renderEat();return}
  if(t.dataset.eatwalk){eat.walk=+t.dataset.eatwalk;eat.pick=null;eat.rolls=0;saveEat();renderEat();return}
  if(t.dataset.eatmood){eat.mood=t.dataset.eatmood;eat.pick=null;eat.rolls=0;dice.pick=null;dice.rolls=0;saveEat();renderEat();return}
  if(t.dataset.eatroll){eatRoll(t.dataset.eatroll==='again');return}
  if(t.id==='eatPick'&&eat.pick){diceLog.push({n:eat.pick.name,d:isoOf(new Date())});diceLog=diceLog.slice(-60);store.set('gp.dice',diceLog);eat.chosen=eat.pick.name;renderEat();return}
});
// home-screen shortcut: ./?dice=eat
function diceFromUrl(){try{const q=new URLSearchParams(location.search).get('dice');if(q==='eat'||q==='do'){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>openDiceTab(q),300)}}catch(_){}}

// plan-based meal mood filter
function eatMoodOk(p){const m=EAT_MOODS.find(x=>x[0]===eat.mood);if(!m||!m[2].length)return true;const tx=p.name+' '+tagsOf(p.id).join(' ')+' '+(p.note||'');return m[2].some(k=>tx.includes(k))}
// trip departure from 집 (내 장소)
const KR_AIR={gmp:['김포공항 국제선',37.5583,126.7906],icn1:['인천공항 T1',37.4492,126.4510],icn2:['인천공항 T2',37.4602,126.4407]};
let homeMsg='';
// 오가는 길 → 출발지 (drawn by React: TripForms.tsx HomeBox)
function partHomeBox(p){if(p.mode==='car')return null;const h=mypOf('home');
  return {f:'homeBox',hasHome:!!(h&&h.ll),addr:(h&&h.addr)||'',using:!!p.home.ll,kakao:KEYS.kakao?Object.entries(KR_AIR).map(([k,a])=>[k,a[0]]):[],msg:homeMsg}}
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t||!draft)return;
  if(t.id==='homeUse'){const h=mypOf('home');if(!h||!h.ll)return;draft.home.ll=h.ll;draft.home.area='집';homeMsg='출발지를 집으로 바꿨어요.';autoSave();renderMeRows();return}
  if(t.dataset.homeair){const h=mypOf('home'),a=KR_AIR[t.dataset.homeair];if(!h||!h.ll)return;homeMsg='경로를 계산하는 중…';renderMeRows();
    try{const v=await fetchRoute({m:'transit',a:h.ll,b:[a[1],a[2]],pv:'kakao'});if(!v)throw new Error('경로를 찾지 못했어요');
      draft.home.ll=h.ll;draft.home.area='집';draft.home.min=Math.min(240,Math.max(10,Math.ceil(v.min/5)*5));homeMsg=`집 → ${a[0]}: ${v.label} 약 ${v.min}분${v.lines?` (${v.lines})`:''}으로 넣었어요.`;autoSave()}
    catch(err){homeMsg=(err&&err.message)||'계산하지 못했어요'}renderMeRows();return}
});
document.addEventListener('click',e=>{const t=e.target.closest('#eatSetPlaces');if(!t)return;closeSheet();tab='settings';mypEdit=null;renderSettings();renderTabs()});

