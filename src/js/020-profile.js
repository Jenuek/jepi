// ---------- profile: trip facts entered by the viewer ----------
const PROFILE_EXAMPLE={dest:'도쿄',mode:'flight',local:'transit',startDate:'2026-11-07',nights:3,out:{airport:'hnd',dep:'08:15',arr:'10:20',flight:''},back:{airport:'hnd',dep:'19:30',arr:'22:05',flight:''},home:{area:'',min:60,fare:1550,byMin:120},stays:[{name:'시부야 숙소',area:'shibuya',checkin:'15:00',checkout:'11:00',from:0,to:3}],events:[],purpose:'',pace:'slow',social:'some',breakfast:false};
const clone=o=>JSON.parse(JSON.stringify(o));
const heads=()=>{const q=(CUR.profile&&CUR.profile.party)||{};return Math.max(1,(+q.adults||1)+(+q.kids||0))};
const PARTY_KO={solo:'혼자',couple:'연인·부부',friends:'친구',family:'가족'};
function partyEn(q){q=q||CUR.profile.party||{type:'solo'};
  if(q.type==='couple') return 'A couple traveling together: favour places with good atmosphere for two, scenic spots and night views; avoid solo-counter-only places.';
  if(q.type==='friends') return `A group of ${q.adults} friends: favour places that seat a group, shared food, activities and lively spots; avoid tiny counter-only bars.`;
  if(q.type==='family') return `A family: ${q.adults} adult(s)${q.kids?` and ${q.kids} child(ren)`:''}. ${q.kids?'Favour kid-friendly places, parks and hands-on spots, avoid bars and late nights, keep transfers short and leave rest breaks.':'Favour comfortable, easy-going places for all ages.'}`;
  return 'Traveling alone: include solo-friendly places (counter seats, single portions) and places where it is easy to be on one\'s own.'}
const tmin=JD.days.tmin;
const apName=k=>(AIRPORTS[k]||AIRPORTS[firstGw()]).name;
const MODE_WORD=JD.days.MODE_WORD;
const WDE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MAX_N=JD.days.MAX_N;
// dates, tidying 여행 정보 and making the days with their fixed blocks: app/data/days.ts (the days themselves: DY.days …)
const nightsOf=JD.days.nightsOf, dateOf=JD.days.dateOf, mdOf=JD.days.mdOf, arrEnd=JD.days.arrEnd, fixProfile=JD.days.fixProfile, buildDays=JD.days.buildDays;
function profileSummary(){
  const pace={slow:'Unhurried: one main thing per day, the rest relaxed.',normal:'Balanced pace.',full:'Wants a full schedule.'}[CUR.profile.pace]||'';
  const social=CUR.profile.party.type!=='solo'?'':({alone:'Prefers time alone.',some:'Mostly alone with a few chances to meet people.',social:'Wants many chances to meet people.'}[CUR.profile.social]||'');
  return `${CUR.profile.kind==='day'?`This is a one-day outing (not an overnight trip) from ${CUR.profile.meet.time} to ${CUR.profile.meet.end}, meeting around ${(AREAS[CUR.profile.meet.area]||[''])[0]}.\n`:''}Who: ${partyEn(CUR.profile.party)}\nTraveler: ${styleEn(CUR.profile)} ${pace} ${social} ${CUR.profile.breakfast?'Eats breakfast.':'Usually skips breakfast.'} ${BUDGET_EN[CUR.profile.budget]||''}${budgetEn()}${CUR.profile.purpose?` Trip purpose in their own words: "${CUR.profile.purpose}".`:''}${CUR.profile.direction&&CUR.profile.direction.avoid?` Wants to avoid: "${CUR.profile.direction.avoid}".`:''}${CUR.profile.direction&&CUR.profile.direction.note?` Direction of this trip: ${CUR.profile.direction.note}`:''}\nInterest keywords (prefer candidates whose tags match more of these): ${CUR.kws.join(', ')||'(none given)'}${seasonSummary()}`;
}

