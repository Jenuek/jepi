// ---------- optional travel style (every item defaults to "doesn't matter") ----------
const STYLE_ROWS=JD.days.STYLE_ROWS;   // app/data/days.ts
const STY={rhythm:{early:'Early riser: starts the day early and ends early.',late:'Late starter: begins around 10:00 and enjoys evenings and nights.'},
  walk:{lots:'Happy to walk a lot.',less:'Wants to walk as little as possible: prefer short transfers, direct transit or taxis.'},
  fame:{famous:'Prefers famous must-see landmarks.',hidden:'Prefers lesser-known places locals go to over tourist hotspots.'},
  crowd:{ok:'Crowds are fine.',avoid:'Avoids crowds: prefer quieter places and off-peak times.'},
  food:{familiar:'Prefers familiar, easy food.',adventurous:'Wants to try adventurous local food.'},
  comfort:{comfort:'Values comfort and easy logistics.',experience:'Fine with some hassle for special experiences.'},
  exp:{new:'Little travel experience: prefer easy-to-navigate areas and simple transit, and mention practical tips.',pro:'Experienced traveler: comfortable with complex transit and off-the-beaten-path places.'},
  lang:{low:'Not confident in English or the local language: prefer places with picture, Korean or English menus and ticket machines, avoid phone-only reservations.',mid:'Can manage basic English.',high:'Communicates well in English or the local language.'},
  gender:{female:'The traveler is a woman: consider practical safety such as well-lit, busy areas late at night and women-friendly lodging. Do not stereotype her interests.',male:''}};
function styleEn(p){const st=(p&&p.style)||{};return Object.entries(STY).map(([k,m])=>m[st[k]]||'').filter(Boolean).join(' ')}
let styleOpen=false;
const walkKm=()=>JD.check.walkKm();   // app/data/check.ts

// ---------- optional money budget (per person, in 만원) ----------
function budgetParts(pr){pr=pr||CUR.profile;const t=(+pr.budgetMan||0)*10000;if(!t)return null;
  const trip=(+pr.tripMan>0?+pr.tripMan*10000:Math.round(t*0.6)), local=(+pr.localMan>0?+pr.localMan*10000:Math.max(0,t-trip));
  return {total:t,trip,local,daily:local/(nightsOf(pr)+1)}}
function roomCap(){const b=budgetParts();if(!b)return null;const lodge=b.trip*(CUR.profile.mode==='flight'?0.5:0.7);return Math.round(lodge/nightsOf(CUR.profile)*heads()/1000)*1000}
// 이번 여행 → 예산 (drawn by React: TripForms.tsx Budget). The hint under it follows what is typed (meSetBudgetHint).
function partBudget(p){return {f:'budget',man:p.budgetMan||'',trip:p.tripMan||'',local:p.localMan||'',hint:budgetHintTxt(p)}}
function budgetHintTxt(p){const b=budgetParts(p);return b?`교통·숙박 약 ${won(b.trip)} · 현지 경비 하루 약 ${won(b.daily)}로 계산해요.`:'총예산만 넣으면 교통·숙박 60%, 현지 경비 40%로 나눠요.'}
function budgetEn(){const b=budgetParts();if(!b)return '';const d=b.daily/(KRW_PER_JPY||1);
  return ` Money budget per person: about ${Math.round(b.total/10000)}만원 in total; local spending about ${yen(d)} (${won(b.daily)}) per day.`}

