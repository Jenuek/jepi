// ---------- optional travel style (every item defaults to "doesn't matter") ----------
const STYLE_ROWS=[
  ['rhythm','하루 리듬',[['early','아침형'],['late','늦게 시작해서 밤까지']]],
  ['walk','걷기',[['lots','많이 걸어도 좋아요'],['less','덜 걷고 싶어요']]],
  ['fame','장소 성향',[['famous','유명한 곳 위주'],['hidden','현지인 숨은 곳']]],
  ['crowd','붐비는 곳',[['ok','괜찮아요'],['avoid','피하고 싶어요']]],
  ['food','음식',[['familiar','익숙한 맛'],['adventurous','현지 음식 도전']]],
  ['comfort','편안함',[['comfort','편한 게 최고'],['experience','고생해도 특별한 경험']]],
  ['exp','여행 경험',[['new','적은 편'],['pro','많은 편']]],
  ['lang','외국어',[['low','자신 없어요'],['mid','기본 영어'],['high','잘해요']]],
  ['gender','성별',[['female','여성'],['male','남성']]]];
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
function styleMoreHTML(p){const st=p.style||{};const n=Object.values(st).filter(v=>v&&v!=='any').length;
  return `<details class="marks"${n||styleOpen?' open':''}><summary>여행 스타일 더 알려 주기 (선택)${n?` · ${n}개 골랐어요`:''}</summary>
  <p class="hint">모두 "상관없음"이 기본이에요. 고른 것만 추천에 반영돼요. 하루 리듬과 걷기는 일정 계산에도 쓰여요.</p>
  ${STYLE_ROWS.map(([k,l,o])=>`<span class="hint">${l}</span>${radioRow('style.'+k,st[k]||'any',[...o,['any',k==='gender'?'밝히지 않음':'상관없음']])}`).join('')}</details>`}
const walkKm=()=>{const w=profile&&profile.style&&profile.style.walk;return w==='lots'?2:w==='less'?0.7:1.3};

// ---------- optional money budget (per person, in 만원) ----------
function budgetParts(pr){pr=pr||profile;const t=(+pr.budgetMan||0)*10000;if(!t)return null;
  const trip=(+pr.tripMan>0?+pr.tripMan*10000:Math.round(t*0.6)), local=(+pr.localMan>0?+pr.localMan*10000:Math.max(0,t-trip));
  return {total:t,trip,local,daily:local/(nightsOf(pr)+1)}}
function roomCap(){const b=budgetParts();if(!b)return null;const lodge=b.trip*(profile.mode==='flight'?0.5:0.7);return Math.round(lodge/nightsOf(profile)*heads()/1000)*1000}
function fBudget(p){
  return `<div class="fsec"><h3>예산 (선택)</h3><div class="fg"><label>1인 총예산 (만원)${inp('budgetMan',p.budgetMan||'','number','min="0" step="10" data-type="num" placeholder="비우면 계산 안 해요"')}</label>
  <label>그중 교통·숙박 (만원)${inp('tripMan',p.tripMan||'','number','min="0" step="5" data-type="num" placeholder="자동 60%"')}</label>
  <label>현지 경비 (만원)${inp('localMan',p.localMan||'','number','min="0" step="5" data-type="num" placeholder="나머지"')}</label></div>
  <p class="hint" id="budgetHint">${budgetHintTxt(p)}</p></div>`}
function budgetHintTxt(p){const b=budgetParts(p);return b?`교통·숙박 약 ${won(b.trip)} · 현지 경비 하루 약 ${won(b.daily)}로 계산해요.`:'총예산만 넣으면 교통·숙박 60%, 현지 경비 40%로 나눠요.'}
function budgetEn(){const b=budgetParts();if(!b)return '';const d=b.daily/(KRW_PER_JPY||1);
  return ` Money budget per person: about ${Math.round(b.total/10000)}만원 in total; local spending about ${yen(d)} (${won(b.daily)}) per day.`}

