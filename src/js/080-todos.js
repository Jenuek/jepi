// ---------- small to-dos attached to blocks (luggage, waiting lists, pick-ups, rentals, cash, tax refund) ----------
const MARKS={'bag+':['🧳','짐 맡기기'],'bag-':['🧳','짐 찾기'],'wait+':['🎫','웨이팅 등록'],'wait-':['🎫','웨이팅 입장'],
  'order+':['🛍','주문·맡기기'],'order-':['🛍','주문한 것 찾기'],'rent+':['🔁','빌리기'],'rent-':['🔁','반납하기'],
  'ship+':['📦','짐 보내기'],'ship-':['📦','짐 받기'],'cash':['💴','현금 준비'],'tax':['🧾','면세 환급']};
const MARK_EN={'bag+':'leaves luggage here','bag-':'picks luggage up here','wait+':'joins the waiting list here','wait-':'enters after waiting here',
  'order+':'orders or drops off an item here','order-':'collects the ordered item here','rent+':'rents something here','rent-':'returns the rental here',
  'ship+':'ships luggage ahead from here','ship-':'receives shipped luggage here','cash':'gets cash here','tax':'does the tax refund here'};
const PAIRS={bag:{same:true,need:'맡긴 짐을 찾는 일정이 없어요',orphan:'맡긴 짐이 없는데 찾기 표시가 있어요',pair:'짐 찾기',dur:15},
  wait:{same:true,sameDay:true,need:'웨이팅 뒤 입장하는 일정이 없어요',orphan:'웨이팅 등록 표시가 먼저 있어야 해요',pair:'웨이팅 입장',dur:60},
  order:{same:true,need:'주문한 것을 찾으러 가는 일정이 없어요',orphan:'주문·맡기기 표시가 먼저 있어야 해요',pair:'주문한 것 찾기',dur:15},
  rent:{same:false,need:'반납하는 일정이 없어요',orphan:'빌리기 표시가 먼저 있어야 해요',pair:'반납하기',dur:15},
  ship:{same:false,need:'보낸 짐을 받는 곳이 없어요',orphan:'짐 보내기 표시가 먼저 있어야 해요',pair:'짐 받기',dur:15}};
CUR.fmarks=null;
const marksOf=it=>it.kind==='place'?((CUR.placed.find(b=>b.uid===it.uid)||{}).mk||[]):((CUR.fmarks||{})[it.uid]||[]);
const hasMark=(it,m)=>(it.marks||[]).includes(m);
const implicitBagDrop=it=>it.kind==='place'&&!!it.drop;   // a locker/storage place counts as leaving the bag there
function markWarnings(){
  const W=new Map(), add=(d,uid,w)=>{const k=d+':'+uid;(W.get(k)||W.set(k,[]).get(k)).push(w)};
  const open={bag:[],wait:[],order:[],rent:[],ship:[]}; let cashOk=false; const shops=[]; let tax=false;
  DAYS.forEach((_,d)=>dayItems(d).forEach(it=>{
    const mk=it.marks=marksOf(it);
    if(mk.includes('cash')) cashOk=true;
    if(mk.includes('tax')) tax=true;
    if(it.kind==='place'&&it.p.cash&&!cashOk) add(d,it.uid,'현금만 받는 곳일 수 있어요 · 먼저 💴 현금 준비 표시를 붙여 두세요');
    if(it.kind==='place'&&it.p.cat==='shop') shops.push(it);
    if(open.bag.length&&it.kind==='fixed'&&(it.uid==='f7'||/^ci|^co/.test(it.uid))) add(d,it.uid,`${open.bag[0].name}에 맡긴 짐을 먼저 찾아야 해요`);
    for(const T of Object.keys(PAIRS)){
      const st=mk.includes(T+'+')||(T==='bag'&&implicitBagDrop(it)), en=mk.includes(T+'-');
      if(en){const o=open[T].shift();
        if(!o) add(d,it.uid,PAIRS[T].orphan);
        else{ if(PAIRS[T].same&&km(o.ll,it.ll)>0.4) add(d,it.uid,`${o.name}과 장소가 달라요 · 맡긴 곳으로 가야 해요`);
              if(PAIRS[T].sameDay&&o.d!==d) add(d,it.uid,'웨이팅은 등록한 날 입장해야 해요'); }}
      if(st) open[T].push({d,uid:it.uid,ll:it.ll,name:it.name});
    }
  }));
  for(const T of Object.keys(open)) open[T].forEach(o=>add(o.d,o.uid,PAIRS[T].need));
  return {W,needTax:!!(PACK.intl&&shops.length&&!tax)};
}
function openPairOf(it){ // which pair types start at this block and are still missing their end
  const {W}=markWarnings(); const ws=W.get(day+':'+it.uid)||[];
  return Object.keys(PAIRS).filter(T=>ws.includes(PAIRS[T].need)&&(hasMark(it,T+'+')||(T==='bag'&&implicitBagDrop(it))));
}
// 할 일 표시 box in a block's sheet (drawn by React: BlockSheet.tsx)
function marksInfo(it,forceOpen){
  const mk=it.marks||[]; const pend=openPairOf(it);
  const row=(a,b)=>({icon:MARKS[a][0],btns:[a,...(b?[b]:[])].map(m=>({m,label:MARKS[m][1],on:mk.includes(m)}))});
  const nb=P.filter(p=>p.drop&&km(p.ll,it.ll)<1.2).map(p=>({p,d:km(p.ll,it.ll)})).sort((a,b)=>a.d-b.d).slice(0,2);
  return {open:!!(mk.length||pend.length||forceOpen),summary:`할 일 표시${mk.length?` · ${mk.map(m=>MARKS[m][0]+' '+MARKS[m][1]).join(', ')}`:''}`,
    rows:[row('bag+','bag-'),row('wait+','wait-'),row('order+','order-'),row('rent+','rent-'),row('ship+','ship-'),row('cash','tax')],
    bagHint:nb.length?`근처 짐 보관: ${nb.map(x=>`${x.p.name} (${x.d<0.1?'바로 옆':Math.round(x.d*1000)+'m'})`).join(', ')}`:'',
    pairs:pend.map(T=>({T,label:`${MARKS[T+'-'][0]} ${PAIRS[T].pair} 블록 만들기`}))};
}
const toggleMark=(uid,m)=>TRIP.toggleMark(uid,m);   // app/data/trip.ts
function makePairBlock(uid,T){
  const it=dayItems(day).find(x=>x.uid===uid); if(!it) return;
  // put the closing block before the next block that needs it (lodging, airport) or late in the day
  const d=day; let start;
  const nx=dayItems(d).find(x=>x.start>it.end&&x.kind==='fixed'&&(x.uid==='f7'||/^ci|^co|^ev/.test(x.uid)));
  if(T==='wait') start=it.end+60;
  else if(nx) start=nx.start-PAIRS[T].dur-30;
  else start=Math.min(1350,Math.max(it.end+60,1230));
  start=Math.max(dayStart(d),Math.min(1410,Math.round(start/15)*15));
  const c={id:'c'+Date.now().toString(36),name:`${PAIRS[T].pair} · ${it.name.replace(/ \(.*\)$/,'')}`.slice(0,40),area:nearestArea(it.ll)||firstArea(),cat:T==='wait'?'food':'trip',dur:PAIRS[T].dur,cost:0,memo:`${it.name}에서 시작한 일을 마무리해요.`,tags:'',drop:false,ll:it.ll};
  TRIP.customs.put(c); addCustomToData(c);
  TRIP.blocks.add({id:c.id,day:d,start,dur:c.dur,mk:[T+'-']});
  day=d; closeSheet(); renderAll();
}

