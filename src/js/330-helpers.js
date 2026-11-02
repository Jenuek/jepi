// ---------- helpers ----------
const $=s=>document.querySelector(s);
const fmt=m=>{m=Math.max(0,Math.min(1440,Math.round(m)));const h=Math.floor(m/60),mm=m%60;return String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0')};
const parse=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||'').trim());return m?(+m[1])*60+(+m[2]):null};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function km(a,b){const R=6371,r=x=>x*Math.PI/180;const dLa=r(b[0]-a[0]),dLo=r(b[1]-a[1]);
  const h=Math.sin(dLa/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function travelEst(a,b){ if(!a||!b) return null; const d=km(a,b); if(d<0.15) return null;
  const g=gwNear(a)||gwNear(b); const car=profile&&profile.local==='car', tm=(PACK&&PACK.transit)||'대중교통';
  if(g&&g.min&&d>5) return {mode:car?'차':tm,min:car?Math.ceil(g.min*0.8/5)*5:g.min};
  if(d<walkKm()) return {mode:'도보',min:Math.max(5,Math.ceil(d*1.3/4.8*60/5)*5)};
  if(car) return {mode:'차',min:Math.ceil((10+(d<20?d*2:20+d))/5)*5};
  return {mode:tm,min:Math.ceil((d<20?12+d*2.4:36+d*1.2)/5)*5}; }
function travel(a,b){const e=travelEst(a,b); if(!e) return e;
  const m=e.mode==='도보'?'walk':e.mode==='차'?'car':'transit'; const r=routeGet(m,a,b);
  if(!r) return Object.assign({},e,{est:routeProvider(a,b)?true:false,guess:true});
  return {mode:r.label||e.mode,min:r.min,real:true,lines:r.lines||'',tf:r.tf||0,fare:r.fare,cur:r.cur||'',poly:r.poly}}
const mapsLink=(a,b,mode)=>`https://www.google.com/maps/dir/?api=1&origin=${a[0]},${a[1]}&destination=${b[0]},${b[1]}&travelmode=${mode==='도보'?'walking':mode==='차'?'driving':'transit'}`;
const hoursFor=(p,wd)=>p.always?null:((p.hoursBy&&p.hoursBy[wd])||p.hours);
const closedOn=(p,wd)=>!!(p.closed&&p.closed.includes(wd));

function dayItems(d){
  const fx=DAYS[d].fixed.map(f=>({kind:'fixed',uid:f.id,name:f.name,start:f.id==='f0a'?GMP_BY-homeMin:f.start,end:f.id==='f9'?f.start+40+Math.max(15,homeMin-15):f.end,skipIn:!!f.skipIn,yen:0,krw:f.krw||0,bagStart:!!f.bagStart,drop:!!f.drop,ll:LOC[f.loc].ll,locName:LOC[f.loc].name,area:LOC_AREA[f.loc],zone:LOC_ZONE[f.loc],stay:f.name.includes('숙박'),note:f.note,cc:'var(--c-fixed)'}));
  const pl=placed.filter(b=>b.day===d).map(b=>{const p=PM[b.id];return {kind:'place',uid:b.uid,id:b.id,name:p.name,start:b.start,end:b.start+b.dur,ll:p.ll,locName:p.area,area:p.area,zone:ZONE_OF[p.id]||'outer',stay:false,drop:!!p.drop,yen:costOf(p.id)[0],costNote:costOf(p.id)[1],krw:0,note:p.note,cc:`var(--c-${p.cat})`,p}});
  return fx.concat(pl).sort((a,b)=>a.start-b.start||a.end-b.end);
}
function analyze(d){
  const items=dayItems(d), wd=DAYS[d].wd, trans=[];
  items.forEach(it=>{it.warns=[];it.tips=[]});
  // first item: from day's start location (skip on Day 1, arrival is fixed)
  let prev={end:items.length?Math.max(DAY_START,items[0].start-90):DAY_START,ll:LOC[DAYS[d].startLoc].ll,name:LOC[DAYS[d].startLoc].name,virtual:true};
  if(d===0) prev=null;
  let carrying=false; const MW=markWarnings().W;
  for(const it of items){
    it.marks=marksOf(it);
    // suitcase: picked up at arrival/checkout, dropped at a check-in, a storage block or the airport
    if(it.drop||hasMark(it,'bag+')||hasMark(it,'ship+')) carrying=false;
    it.carry=carrying;
    if(carrying&&it.kind==='place'&&!['walk','trip'].includes(it.p.cat)) it.warns.push('캐리어를 든 채로는 어려워요 · 먼저 짐 맡기기');
    if(it.bagStart||hasMark(it,'bag-')||hasMark(it,'ship-')) carrying=true;
    (MW.get(d+':'+it.uid)||[]).forEach(w=>it.warns.push(w));
    it.carryAfter=carrying;
    if(it.kind==='place'){
      const p=it.p;
      if(closedOn(p,wd)) it.warns.push(`${WD[wd]}요일 휴관`);
      if(outOfSeason(p,DAYS[d].iso)) it.warns.push(`행사 기간(${mdTxt(p.dates[0])||'?'}~${mdTxt(p.dates[1])||'?'})이 아니에요`);
      it.tips=bestTips(p,it.start,it.end);
      const h=hoursFor(p,wd);
      if(h&&(it.start<h[0]||it.end>h[1])) it.warns.push(`영업시간 ${fmt(h[0])}–${fmt(h[1])} 밖`);
    }
    if(prev&&!it.skipIn){
      const t=travel(prev.ll,it.ll);
      if(!prev.virtual && it.start<prev.end) it.warns.push(`'${prev.name}'과 시간이 겹쳐요`);
      if(t){
        const from=prev.virtual?it.start-t.min:prev.end;
        const gap=it.start-(prev.virtual?from:prev.end);
        const bad=!prev.virtual&&gap<t.min;
        if(bad) it.warns.push(`이동 ${t.min}분이 필요한데 ${Math.max(0,gap)}분뿐이에요`);
        if(!prev.virtual&&t.min>=45&&profile.party.kids>0&&it.kind==='place') it.warns.push(`아이와 ${t.min}분 이동은 길어요 · 가까운 곳으로 바꾸거나 쉬는 시간을 넣어 보세요`);
        const fare=t.real&&t.fare!=null&&t.cur&&t.cur===(PACK.currency||'')?t.fare:fareOf(prev.ll,it.ll,t.mode);
        trans.push({from,min:t.min,mode:t.mode,bad,fare,real:!!t.real,lines:t.lines||"",fromName:prev.name,toName:it.name,link:navLink(prev.ll,it.ll,t.mode,it.name)});
        it.travelIn={...t,fare,link:navLink(prev.ll,it.ll,t.mode,it.name),fromName:prev.name};
      }
    }
    prev={end:it.end,ll:it.ll,name:it.name};
  }
  return {items,trans};
}
function gapsOf(d){
  const items=dayItems(d).filter(i=>i.start<1380);
  const out=[]; let cur=d===0?arrEnd():480;
  for(const it of items){ if(it.start-cur>=90) out.push([cur,it.start]); cur=Math.max(cur,it.end); }
  if(1380-cur>=90) out.push([cur,1380]);
  return out;
}

