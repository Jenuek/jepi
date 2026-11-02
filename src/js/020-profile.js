// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE={dest:'도쿄',mode:'flight',local:'transit',startDate:'2026-11-07',nights:3,out:{airport:'hnd',dep:'08:15',arr:'10:20',flight:''},back:{airport:'hnd',dep:'19:30',arr:'22:05',flight:''},home:{area:'',min:60,fare:1550,byMin:120},stays:[{name:'시부야 숙소',area:'shibuya',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],purpose:'',pace:'slow',social:'some',breakfast:false};
const clone=o=>JSON.parse(JSON.stringify(o));
const heads=()=>{const q=(profile&&profile.party)||{};return Math.max(1,(+q.adults||1)+(+q.kids||0))};
const PARTY_KO={solo:'혼자',couple:'연인·부부',friends:'친구',family:'가족'};
function partyEn(q){q=q||profile.party||{type:'solo'};
  if(q.type==='couple') return 'A couple traveling together: favour places with good atmosphere for two, scenic spots and night views; avoid solo-counter-only places.';
  if(q.type==='friends') return `A group of ${q.adults} friends: favour places that seat a group, shared food, activities and lively spots; avoid tiny counter-only bars.`;
  if(q.type==='family') return `A family: ${q.adults} adult(s)${q.kids?` and ${q.kids} child(ren)`:''}. ${q.kids?'Favour kid-friendly places, parks and hands-on spots, avoid bars and late nights, keep transfers short and leave rest breaks.':'Favour comfortable, easy-going places for all ages.'}`;
  return 'Traveling alone: include solo-friendly places (counter seats, single portions) and places where it is easy to be on one\'s own.'}
const tmin=(s,d)=>{const v=parse(s);return v==null?d:v};
const apName=k=>(AIRPORTS[k]||AIRPORTS[firstGw()]).name;
const MODE_WORD={flight:'공항',train:'역',bus:'터미널',car:'도착 지점'};
const WDE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MAX_N=30;
function nightsOf(pr){return pr&&pr.kind==='day'?0:Math.max(1,Math.min(MAX_N,+pr.nights||1))}
function dateOf(pr,i){const d=new Date((pr.startDate||'2026-11-07')+'T00:00:00');if(isNaN(d))return null;d.setDate(d.getDate()+i);return d}
const mdOf=(pr,i)=>{const d=dateOf(pr,i);return d?`${d.getMonth()+1}/${d.getDate()}`:`Day ${i+1}`};
function arrEnd(){return profile.kind==='day'?tmin((profile.meet||{}).time,660)+15:tmin(profile.out.arr,620)+60}
function fixProfile(pr){
  pr.nights=nightsOf(pr);
  if(!['flight','train','bus','car'].includes(pr.mode)) pr.mode='flight'; if(!['transit','car'].includes(pr.local)) pr.local=pr.mode==='car'?'car':'transit'; if(pr.dest==null) pr.dest=PACK?PACK.city:'';
  pr.out=Object.assign({airport:firstGw(),dep:'08:00',arr:'10:30',flight:''},pr.out||{});
  pr.back=Object.assign({airport:firstGw(),dep:'19:00',arr:'21:30',flight:''},pr.back||{});
  if(!AIRPORTS[pr.out.airport]) pr.out.airport=firstGw(); if(!AIRPORTS[pr.back.airport]) pr.back.airport=firstGw();
  pr.home=Object.assign({area:'',min:60,fare:1550,byMin:120},pr.home||{});
  if(!Array.isArray(pr.stays)||!pr.stays.length) pr.stays=[{name:'숙소',area:firstArea(),checkin:'15:00',checkout:'11:00',from:0,to:pr.nights}];
  pr.stays.forEach(s=>{s.from=Math.max(0,Math.min(pr.nights-1,+s.from||0));s.to=Math.max(s.from+1,Math.min(pr.nights,+s.to||pr.nights));if(!AREAS[s.area])s.area=firstArea()});
  if(!Array.isArray(pr.events)) pr.events=[];
  pr.events.forEach(e=>{e.day=Math.max(0,Math.min(pr.nights,+e.day||0));if(!AREAS[e.area])e.area=firstArea()});
  {const v={};STYLE_ROWS.forEach(([k,,o])=>{const x=(pr.style||{})[k];if(o.some(([a])=>a===x))v[k]=x});pr.style=v}
  if(pr.direction&&typeof pr.direction!=='object') delete pr.direction; if(pr.direction) pr.direction={purpose:String(pr.direction.purpose||'').slice(0,80),avoid:String(pr.direction.avoid||'').slice(0,80),note:String(pr.direction.note||'').slice(0,160)};
  if(!['low','mid','high'].includes(pr.budget)) pr.budget='mid'; if(!['domestic','near','far'].includes(pr.reach)) pr.reach='near';
  if(pr.kind!=='day') pr.kind='trip'; pr.meet=Object.assign({time:'11:00',end:'20:00',area:''},pr.meet||{}); if(!AREAS[pr.meet.area]) pr.meet.area=firstArea();
  if(pr.dateSet===undefined) pr.dateSet=true; if(pr.nightsSet===undefined) pr.nightsSet=true;
  if(pr.flightSet===undefined) pr.flightSet=true; if(pr.staySet===undefined) pr.staySet=true;
  if(pr.bookedFlight!==false) pr.bookedFlight=true; if(pr.bookedStay!==false) pr.bookedStay=true;
  pr.party=Object.assign({type:'solo',adults:1,kids:0},pr.party||{});
  if(!['solo','couple','friends','family'].includes(pr.party.type)) pr.party.type='solo';
  pr.party.adults=Math.max(1,Math.min(20,Math.round(+pr.party.adults)||1)); pr.party.kids=Math.max(0,Math.min(10,Math.round(+pr.party.kids)||0));
  if(pr.party.type==='solo'){pr.party.adults=1;pr.party.kids=0} if(pr.party.type==='couple'){pr.party.adults=2;pr.party.kids=0} if(pr.party.type==='friends'){pr.party.adults=Math.max(2,pr.party.adults);pr.party.kids=0}
  if(!['slow','normal','full'].includes(pr.pace)) pr.pace='normal';
  if(!['alone','some','social'].includes(pr.social)) pr.social='some';
  pr.breakfast=pr.breakfast===true;
  return pr;
}
function buildDays(){
  if(profile.kind==='day'){const pr=fixProfile(profile),m=pr.meet,a=AREAS[m.area]||AREAS[firstArea()],dt=dateOf(pr,0),st=tmin(m.time,660),en=Math.max(st+60,tmin(m.end,1200));homeMin=0;
    LOC={meet:{name:`만나는 곳 (${a[0]})`,ll:[a[1],a[2]]}};LOC_AREA={meet:a[0]};LOC_ZONE={meet:AREA_ZONE[m.area]||'outer'};
    Object.entries(AIRPORTS).forEach(([k,g])=>{LOC[k]={name:g.name,ll:g.ll};LOC_AREA[k]=g.name;LOC_ZONE[k]='air'});
    DAYS=[{date:mdOf(pr,0),iso:dt?`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`:'',wd:dt?dt.getDay():0,title:`하루 코스 · ${PACK.city}`,startLoc:'meet',
      fixed:[{id:'m0',name:'만나기',start:st,end:st+15,loc:'meet',note:'여기서 하루를 시작해요.'},{id:'m1',name:'헤어지기',start:en,end:Math.min(1440,en+15),loc:'meet',note:'오늘 코스 끝!'}]}];
    return}
  const pr=fixProfile(profile), n=pr.nights, M=pr.mode, intl=!!PACK.intl, carry=M!=='car'; homeMin=+pr.home.min||60;
  LOC={home:{name:pr.home.area?`출발지 (${pr.home.area})`:'출발지',ll:Array.isArray(pr.home.ll)?pr.home.ll:[37.5665,126.9780]}}; LOC_AREA={home:'출발지'}; LOC_ZONE={home:'air'};
  Object.entries(AIRPORTS).forEach(([k,g])=>{LOC[k]={name:g.name,ll:g.ll};LOC_AREA[k]=g.name;LOC_ZONE[k]='air'});
  pr.stays.forEach((s,i)=>{const a=AREAS[s.area];LOC['stay'+i]={name:s.name||'숙소',ll:[a[1],a[2]]};LOC_AREA['stay'+i]=a[0];LOC_ZONE['stay'+i]=AREA_ZONE[s.area]});
  pr.events.forEach((e,i)=>{const a=AREAS[e.area];LOC['ev'+i]={name:e.name||'예약한 일정',ll:[a[1],a[2]]};LOC_AREA['ev'+i]=a[0];LOC_ZONE['ev'+i]=AREA_ZONE[e.area]});
  {const a0=AREAS[(pr.stays[0]||{}).area]||AREAS[firstArea()];LOC.arrive={name:`${PACK.city} 도착`,ll:[a0[1],a0[2]]};LOC_AREA.arrive=PACK.city;LOC_ZONE.arrive='air'}
  const stayOf=k=>pr.stays.findIndex(s=>k>=s.from&&k<s.to);
  const days=[];
  for(let d=0;d<=n;d++){
    const dt=dateOf(pr,d), fixed=[], names=[];
    if(d===0){
      const dep=tmin(pr.out.dep,480), arr=tmin(pr.out.arr,630), gw=apName(pr.out.airport), word=MODE_WORD[M];
      if(M==='car'){GMP_BY=dep;fixed.push({id:'f0c',name:`자동차로 ${PACK.city} 가기`,start:dep,end:Math.max(dep+30,arr),loc:'arrive',skipIn:true,krw:+pr.home.fare||0,note:`${fmt(dep)} 출발 → ${fmt(arr)} 도착 예정. 기름값·통행료는 "내 정보"에서 바꿀 수 있어요.`})}
      else{
        const lead=M==='flight'?(+pr.home.byMin||120):20; GMP_BY=Math.max(240,dep-lead);
        fixed.push({id:'f0a',name:`집 출발 → ${word}`,start:GMP_BY-homeMin,end:GMP_BY,loc:'home',krw:+pr.home.fare||0,note:`집에서 ${word}까지 걸리는 시간으로 출발 시간을 계산했어요. 아래 버튼으로 바꿀 수 있어요.`});
        if(M==='flight') fixed.push({id:'f0b',name:intl?'출국 수속':'탑승 수속',start:GMP_BY,end:Math.max(GMP_BY+15,dep-30),loc:'home',note:'항공사 온라인 체크인을 미리 해 두면 짐만 부치면 돼요.'});
        fixed.push({id:'f0c',name:`${pr.out.flight?pr.out.flight+' · ':''}${gw}행`,start:dep,end:Math.max(dep+30,arr),loc:pr.out.airport,skipIn:true,note:`${fmt(dep)} 출발 → ${fmt(arr)} ${gw} 도착`});
        const ad=M==='flight'?(intl?60:30):15;
        fixed.push({id:'f1',name:`${gw} 도착${M==='flight'&&intl?' · 입국':''}`,start:arr,end:arr+ad,loc:pr.out.airport,bagStart:true,note:M==='flight'&&intl?(PACK.arrivalNote||'입국 심사와 짐 찾기.'):'짐을 챙겨 나와요.'});
      }
    }
    const ps=d>0?stayOf(d-1):-1, cs=d<n?stayOf(d):-1;
    if(ps>=0&&ps!==cs){const s=pr.stays[ps],co=tmin(s.checkout,660);fixed.push({id:'co'+d,name:`${s.name||'숙소'} 체크아웃 (${fmt(co)}까지)`,start:co-30,end:co,loc:'stay'+ps,bagStart:carry,note:carry?'체크아웃 뒤에도 짐을 맡길 수 있는지 숙소에 물어보세요. 안 되면 역 짐 보관함을 쓰세요.':'짐은 차에 실어 두면 돼요.'})}
    if(cs>=0&&cs!==ps){const s=pr.stays[cs],ci=tmin(s.checkin,900);fixed.push({id:'ci'+d,name:`${s.name||'숙소'} 체크인 (${fmt(ci)}부터)`,start:ci,end:ci+30,loc:'stay'+cs,drop:true,note:'체크인 전에 짐을 먼저 맡길 수 있는지 숙소에 물어보세요.'});if(d>0)names.push('숙소 이동')}
    pr.events.forEach((e,i)=>{if(+e.day!==d)return;const st=tmin(e.start,1080),en=Math.max(st+30,tmin(e.end,st+120));fixed.push({id:'ev'+i,name:e.name||'예약한 일정',start:st,end:en,loc:'ev'+i,note:'미리 예약한 일정이에요.'});names.push(e.name||'예약한 일정')});
    if(cs>=0) fixed.push({id:'st'+d,name:`${pr.stays[cs].name||'숙소'} 숙박`,start:1380,end:1440,loc:'stay'+cs,note:''});
    if(d===n){
      const dep=tmin(pr.back.dep,1140), arr=tmin(pr.back.arr,1290), gw=apName(pr.back.airport);
      if(M==='car') fixed.push({id:'f8',name:'자동차로 집으로',start:dep,end:arr>dep?arr:1440,loc:'home',skipIn:true,krw:+pr.home.fare||0,note:`${fmt(dep)} 출발 → ${fmt(arr)} 도착 예정`});
      else{
        const lead=M==='flight'?(intl?180:90):20;
        fixed.push({id:'f7',name:M==='flight'?`${gw} ${intl?'출국':'탑승'} 수속`:`${gw} 도착 · 탑승 대기`,start:dep-lead,end:dep,loc:pr.back.airport,drop:true,note:M==='flight'?(intl?'출발 3시간 전 도착 기준이에요. 면세 환급은 짐을 부치기 전에 하세요.':'출발 1시간 30분 전 도착 기준이에요.'):'출발 20분 전 도착 기준이에요.'});
        fixed.push({id:'f8',name:`${pr.back.flight?pr.back.flight+' · ':''}${M==='flight'?'돌아가는 비행기':M==='train'?'돌아가는 기차':'돌아가는 버스'}`,start:dep,end:arr>dep?arr:1440,loc:'home',skipIn:true,note:`${fmt(dep)} 출발 → ${fmt(arr)} 도착`});
        if(arr>dep&&arr<1380) fixed.push({id:'f9',name:'도착 · 집으로',start:arr,end:Math.min(1440,arr+(M==='flight'?40:10)+homeMin),loc:'home',krw:+pr.home.fare||0,note:'도착해서 집까지 가는 시간이에요.'});
      }
    }
    days.push({date:mdOf(pr,d),iso:dt?`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`:'',wd:dt?dt.getDay():0,
      title:`Day ${d+1}${d===0?' · 도착':d===n?' · 돌아가는 날':''}${names.length?' · '+names.join(', '):''}`,
      startLoc:d===0?(M==='car'?'arrive':pr.out.airport):(ps>=0?'stay'+ps:(M==='car'?'arrive':pr.out.airport)),fixed});
  }
  DAYS=days;
}
function profileSummary(){
  const pace={slow:'Unhurried: one main thing per day, the rest relaxed.',normal:'Balanced pace.',full:'Wants a full schedule.'}[profile.pace]||'';
  const social=profile.party.type!=='solo'?'':({alone:'Prefers time alone.',some:'Mostly alone with a few chances to meet people.',social:'Wants many chances to meet people.'}[profile.social]||'');
  return `${profile.kind==='day'?`This is a one-day outing (not an overnight trip) from ${profile.meet.time} to ${profile.meet.end}, meeting around ${(AREAS[profile.meet.area]||[''])[0]}.\n`:''}Who: ${partyEn(profile.party)}\nTraveler: ${styleEn(profile)} ${pace} ${social} ${profile.breakfast?'Eats breakfast.':'Usually skips breakfast.'} ${BUDGET_EN[profile.budget]||''}${budgetEn()}${profile.purpose?` Trip purpose in their own words: "${profile.purpose}".`:''}${profile.direction&&profile.direction.avoid?` Wants to avoid: "${profile.direction.avoid}".`:''}${profile.direction&&profile.direction.note?` Direction of this trip: ${profile.direction.note}`:''}\nInterest keywords (prefer candidates whose tags match more of these): ${kws.join(', ')||'(none given)'}${seasonSummary()}`;
}

