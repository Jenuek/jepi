// ---------- actions ----------
function place(id,start,d=day){
  const p=PM[id]; start=Math.max(dayStart(d),Math.min(1410,start));
  TRIP.blocks.add({id,day:d,start,dur:p.dur});
}
// A block's sheet, drawn by React: app/screens/BlockSheet.tsx. opt.marksOpen: keep the 할 일 표시 box open.
let sheetRev=0;
function openSheet(uid,opt){
  const {items}=analyze(day); const it=items.find(i=>i.uid===uid); if(!it) return;
  const isP=it.kind==='place';
  const ti=it.travelIn;
  const h=isP?hoursFor(it.p,DAYS[day].wd):null, B=t=>({t,tag:'b',cls:'mono'});
  window.JEPI_UI.mount('block',$('#sheet'),{rev:++sheetRev,
    name:String(it.name),when:`${DAYS[day].date} (${WD[DAYS[day].wd]}) ${fmt(it.start)}–${fmt(it.end)} · ${it.locName}`,note:it.note||'',
    mapLink:isP&&!it.p.custom?placeLink(it.p):'',
    vote:isP&&RS.status!=='off'?{id:String(it.id),on:!!iRec(it.p),n:recOf(it.p),locked:false}:null,
    hours:isP&&h?`영업 ${fmt(h[0])}–${fmt(h[1])}${it.p.closed?` · 휴관 ${it.p.closed.map(w=>WD[w]).join('·')}`:''}`:'',
    cost:isP?segs('예상 비용 ',B(yen(it.yen)),it.costNote?` · ${it.costNote}`:''):null,
    krw:it.krw?won(it.krw):'',check:isP&&it.p.check?String(it.p.check):'',tips:it.tips&&it.tips.length?`💡 ${it.tips.join(' · ')}`:'',
    season:isP&&it.p.season?segs('🗓 ',{t:String(it.p.season),tag:'b'},it.p.dates?` · ${mdTxt(it.p.dates[0])||'?'}~${mdTxt(it.p.dates[1])||'?'}`:'',
      ...(it.p.conf!=='high'?[' · ',{t:'올해 날짜 확인',tag:'a',href:`https://www.google.com/search?q=${encodeURIComponent((it.p.local||it.p.name)+' '+(DAYS[0].iso||'').slice(0,4))}`}]:[])):null,
    extras:extras(SHEET_EXTRAS,it,day),warns:it.warns.map(String),
    travel:ti?segs(`이동: ${ti.fromName}에서 ${ti.real?'':'약 '}${ti.mode} ${ti.min}분${ti.lines?` (${ti.lines}${ti.tf?` · 환승 ${ti.tf}회`:''})`:''}${ti.fare?` · ${yen(ti.fare)}`:''} · `,{t:'안내 시작',tag:'a',href:String(ti.link)}):null,
    marks:!it.stay&&!['f0a','f0b','f0c','f8','f9'].includes(it.uid)?marksInfo(it,opt&&opt.marksOpen):null,
    place:isP?{customId:it.p.custom?String(it.id):null,alts:altsInfo(it)}:null,
    home:!isP&&uid==='f0a'?{word:MODE_WORD[CUR.profile.mode],min:homeMin}:null});
  $('#sheet').dataset.uid=uid; $('#sheetBg').hidden=false;
  setTimeout(()=>{const b=$('#sheet button');b&&b.focus()},0);
}
const closeSheet=()=>{if(diceCloseAnim())return;$('#sheetBg').hidden=true};
function altsFor(it){
  const D=DAYS[day], wd=D.wd, {items}=analyze(day);
  const others=items.filter(i=>i.uid!==it.uid);
  const prev=others.filter(i=>i.start<it.start||(i.start===it.start&&i.kind==='fixed')).pop()||null;
  const next=others.find(i=>i.start>=it.start&&i!==prev&&!(i.start===it.start&&i.kind==='fixed'))||null;
  const pLl=prev?prev.ll:LOC[D.startLoc].ll, gS=prev?prev.end:dayStart(day), gE=next?next.start:1440;
  const carrying=prev?!!prev.carryAfter:false;
  const tm=(a,b)=>(travel(a,b)||{min:0}).min;
  const used=new Set(CUR.placed.map(b=>b.id));
  const origT=tm(pLl,it.ll)+(next?tm(it.ll,next.ll):0);
  const food=it.p.cat==='food'||(it.p.cat==='night'&&!['shelter','zen'].includes(it.id));
  const out=[];
  for(const p of P){
    if(used.has(p.id)||p.drop) continue;
    if(food?!(p.cat==='food'||(p.cat==='night'&&it.start>=1020)):(p.cat==='food'||p.cat==='trip'||(p.cat==='night'&&it.start<1020))) continue;
    if(carrying&&!['walk'].includes(p.cat)) continue;
    if(closedOn(p,wd)) continue;
    const h=hoursFor(p,wd), tin=tm(pLl,p.ll), tout=next?tm(p.ll,next.ll):0;
    let start=Math.ceil(Math.max(it.start,gS+tin)/5)*5; if(h&&start<h[0]) start=Math.ceil(h[0]/5)*5;
    let dur=Math.min(p.dur,gE-tout-start); if(h) dur=Math.min(dur,h[1]-start);
    if(dur<Math.min(30,p.dur)) continue;
    dur=Math.floor(dur/5)*5;
    const mk=matchKw(p.id);
    out.push({p,start,dur,tin,tout,mk,extra:tin+tout-origT,score:Math.min(mk.length,4)*10+(MUST[p.id]?15:0)-(tin+tout)*0.6});
  }
  out.sort((a,b)=>b.score-a.score);
  // nearby: swapping costs at most 10 extra minutes of travel -> show them all
  const near=out.filter(r=>r.extra<=10);
  const farAll=out.filter(r=>r.extra>10);
  const far=farAll.slice(0,3), rest=farAll.slice(3);
  if(rest.length){const r=rest[Math.floor(Math.random()*rest.length)];r.random=true;far.push(r)}
  // worth-the-detour places that do not fit the current window: show how much later the rest of the day gets
  const shown=new Set(out.map(r=>r.p.id)), must=[];
  if(!food) for(const p of P){
    if(!MUST[p.id]||used.has(p.id)||shown.has(p.id)||p.drop||p.dur>240) continue;
    if(carrying&&p.cat!=='walk') continue;
    if(closedOn(p,wd)) continue;
    const h=hoursFor(p,wd), tin=tm(pLl,p.ll), tout=next?tm(p.ll,next.ll):0;
    let start=Math.ceil(Math.max(it.start,gS+tin)/5)*5; if(h&&start<h[0]) start=Math.ceil(h[0]/5)*5;
    if(h&&start+30>h[1]) continue;
    const dur=h?Math.min(p.dur,h[1]-start):p.dur;
    const over=Math.max(0,start+dur+tout-gE); if(over>120) continue;
    must.push({p,start,dur,tin,tout,mk:matchKw(p.id),extra:tin+tout-origT,over,must:true});
  }
  must.sort((a,b)=>a.over-b.over);
  return {near,far,must};
}
// 같은 시간 대안 (drawn by React: BlockSheet.tsx)
function altsInfo(it){
  const {near,far,must}=altsFor(it);
  const mine=matchKw(it.id);
  const ex=r=>r.extra<=0?'이동 그대로':`이동 +${r.extra}분`;
  const row=r=>({id:String(r.p.id),cat:String(r.p.cat),name:String(r.p.name),random:!!r.random,star:!!(MUST[r.p.id]&&!r.must),kws:r.mk.map(String),mustNote:r.must?String(MUST[r.p.id]):'',
    line:segs(`${r.p.area} · ${fmt(r.start)}–${fmt(r.start+r.dur)} · ${costOf(r.p.id)[0]?yen(costOf(r.p.id)[0]):'무료'} · ${r.must?`앞에서 약 ${r.tin}분${r.over?' · ':''}`:ex(r)}`,
      ...(r.must&&r.over?[{t:`뒤 일정이 ${durTxt(r.over)} 밀려요`,tag:'b',color:'var(--warn)'}]:[])),act:{k:'swap',start:r.start,dur:r.dur}});
  return {mine:mine.length?mine.map(k=>'#'+k).join(' '):'겹치는 취향 키워드 없음',near:near.map(row),must:must.map(row),far:far.map(row)};
}

