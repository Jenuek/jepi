// ---------- AI ----------
async function askAI(){
  if(!sample) return;
  const D=DY.days[day], wd=D.wd, gaps=gapsOf(day);
  if(!gaps.length){aiState={day,status:'error',msg:'이 날은 90분 이상 빈 시간이 없어요. 블록을 조금 빼거나 옮겨 보세요.'};renderAI();return}
  const items=analyze(day).items.map(i=>`${fmt(i.start)}-${fmt(i.end)} ${i.name} @ ${i.locName}${i.carryAfter?' [after this the traveler carries a suitcase until a luggage-drop block]':''}${i.marks&&i.marks.length?' {'+i.marks.map(m=>'traveler '+MARK_EN[m]).join('; ')+'}':''}`).join('\n');
  const used=new Set(CUR.placed.map(b=>b.id));
  const cands=P.filter(p=>!closedOn(p,wd)&&!outOfSeason(p,D.iso)&&!used.has(p.id)&&p.dur<=Math.max(...gaps.map(g=>g[1]-g[0]))).map(p=>{
    const h=hoursFor(p,wd);return {id:p.id,name:p.name,tags:tagsOf(p.id),mustSee:mustOf(p.id)||undefined,best:p.best&&p.best!=='any'?p.best:undefined,season:p.season?`${p.season}${p.dates?` ${p.dates[0]||''}~${p.dates[1]||''}`:''}`:undefined,travelerRecs:recOf(p)||undefined,wished:isWish(p.id)||undefined,category:p.cat,luggageDrop:!!p.drop,area:p.area,minutes:p.dur,open:h?`${fmt(h[0])}-${fmt(h[1])}`:'always',note:p.note}});
  const freeMin=gaps.reduce((a,g)=>a+(g[1]-g[0]),0), per={slow:200,normal:140,full:100}[CUR.profile.pace]||140, maxPick=Math.max(1,Math.min(6,Math.ceil(freeMin/per)));
  const prompt=`You plan one day of a trip to ${PK.pack.city}. Pick up to ${maxPick} place blocks to fill the free time.

${profileSummary()}

Day: ${D.iso} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][wd]}).
Current schedule (fixed and placed):
${items}

Free gaps (90+ min): ${gaps.map(g=>fmt(g[0])+'-'+fmt(g[1])).join(', ')}${(()=>{const b=budgetParts();if(!b)return '';const dl=b.daily/(PLC.rate()||1),used=dayCost(day).yen,rem=dl-used;return `\nBudget today per person: ${yen(dl)}; already planned ${yen(used)}. ${rem>0?`Keep new picks within about ${yen(rem)} in total.`:'Already over budget today: prefer free or very cheap places.'}`})()}

Candidates (only choose from these ids; respect opening hours):
${JSON.stringify(cands)}

Luggage rule: while the traveler carries a suitcase (see the schedule notes), they cannot enter museums, shops, cafes with seating or live houses. In that time only pick a candidate with luggageDrop true (to leave the suitcase first) or category walk/trip. Never suggest a luggageDrop candidate when the traveler is not carrying a suitcase.
Places with mustSee are especially recommended, and travelerRecs is how many other travelers recommended a place, and wished means the traveler wants to go there; prefer them when they fit, wished ones most.
Rules: each pick must sit inside one free gap, leave travel time (about 15-35 min by local transport between areas) before it and after it, stay within opening hours, and not overlap other picks. Prefer places near the neighbouring blocks. ${CUR.profile.pace==='slow'?'Keep the day unhurried: fewer picks is fine.':CUR.profile.pace==='full'?'The traveler wants a full day: use the free time well, up to the limit.':'Keep a balanced pace with some breathing room.'}
Reply with only JSON: {"suggestions":[{"id":"nezu","start":"10:30","reason":"one short sentence in Korean explaining why it fits this traveler and this slot"}]}`;
  const ctl=new AbortController();
  aiState={day,status:'loading',ctl}; renderAI(); dock({aiOff:true});
  try{
    const res=await sample.json(prompt,{signal:ctl.signal,cache:false});
    const arr=Array.isArray(res?.suggestions)?res.suggestions:[];
    const out=arr.map(x=>({id:String(x.id||''),start:parse(x.start),reason:String(x.reason||'')})).filter(x=>PM[x.id]&&x.start!=null&&x.start>=DAY_START&&x.start<1380).slice(0,maxPick);
    let kept=[], dropped=0;
    for(const x of out){const ops=[...kept.map(k=>({op:'add',day,id:k.id,start:fmt(k.start),dur:PM[k.id].dur})),{op:'add',day,id:x.id,start:fmt(x.start),dur:PM[x.id].dur}];
      const r=repairOps(ops); if(!r.warns.length){kept=r.ops.map((o,j)=>Object.assign({},j<kept.length?kept[j]:x,{start:parse(o.start)}))} else dropped++}
    aiState={day,status:'done',items:kept,dropped};
  }catch(e){
    if(e&&e.code==='cancelled'){aiState=null}
    else if(e&&(e.code==='not_granted'||e.code==='sampling_disabled'||e.code==='not_declared'||e.code==='capability_disabled')){sample=null;aiState={day,status:'error',msg:'이 화면에서는 AI 추천을 쓸 수 없어요. 블록은 직접 넣을 수 있어요.'}}
    else if(e&&e.code==='rate_limited'){aiState={day,status:'error',msg:'요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 눌러 주세요.'}}
    else if(e&&e.code==='invalid_json'){aiState={day,status:'error',msg:'추천 형식을 읽지 못했어요. 한 번 더 눌러 주세요.'}}
    else {aiState={day,status:'error',msg:(e&&e.message&&e.code!=='upstream_error'||e&&e.code==='upstream_error'&&e.message?e.message+' · ':'연결이 잠시 끊겼어요. ')+'다시 눌러 주세요.'}}
  }finally{dock({aiOff:false}); renderAll()}
}

