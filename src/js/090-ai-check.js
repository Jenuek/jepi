// ---------- check AI changes before showing them: simulate, nudge times, report what is left ----------
let DRY=false;
function applyOpsCore(ops){
  for(const o of ops){
    const st=parse(o.start);
    if(o.op==='add'&&PM[o.id]&&!placed.some(b=>b.id===o.id)) placed.push({uid:'u'+(uidN++),id:o.id,day:+o.day,start:Math.max(dayStart(+o.day),Math.min(1410,st)),dur:Math.max(15,+o.dur||PM[o.id].dur)});
    if(o.op==='add_custom'){const c={id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:String(o.name).slice(0,40),area:AREAS[o.area]?o.area:firstArea(),cat:CATS[o.category]?o.category:'walk',dur:Math.max(15,+o.dur||60),cost:Math.max(0,+o.cost||0),memo:'AI가 만든 블록이에요.',tags:'',drop:false};custom.push(c);addCustomToData(c);placed.push({uid:'u'+(uidN++),id:c.id,day:+o.day,start:Math.max(dayStart(+o.day),Math.min(1410,st)),dur:c.dur})}
    if(o.op==='move'){const b=placed.find(x=>x.uid===o.uid);if(b){if(o.day!=null)b.day=+o.day;if(st!=null)b.start=Math.max(dayStart(b.day),Math.min(1410,st));if(o.dur)b.dur=Math.max(15,+o.dur)}}
    if(o.op==='remove') placed=placed.filter(x=>x.uid!==o.uid);
    if(o.op==='add_place'&&!DRY){const pl=cleanPlace({name:o.name,local:o.local,area:o.area,cat:o.category,lat:o.lat,lng:o.lng,dur:o.dur,open:o.open,closed:o.closed,cost:o.cost,costNote:o.costNote,tags:o.tags,note:o.note});if(pl&&!P.some(p=>norm(p.name)===norm(pl.name))){PACK.places.push(pl);addPackPlace(pl);FRESH.add(pl.id);savePack()}}
    if(o.op==='mark'){const b=placed.find(x=>x.uid===o.uid);const cur=b?(b.mk||[]):(fmarks[o.uid]||[]);if(cur.includes(o.mark)!==(o.on!==false))toggleMark(o.uid,o.mark)}
  }
}
function warnSet(){const s=new Map();DAYS.forEach((_,d)=>analyze(d).items.forEach(it=>it.warns.forEach(w=>{const k=`${d}|${it.name}|${w.replace(/\d+/g,'#')}`;if(!s.has(k))s.set(k,`Day ${d+1} ${it.name}: ${w}`)})));return s}
function simulateOps(ops){
  const bk={placed,custom,fmarks,uidN,n:P.length};
  DRY=true; placed=clone(placed); custom=clone(custom); fmarks=clone(fmarks);
  try{applyOpsCore(ops); return warnSet()}
  finally{const extra=P.splice(bk.n);extra.forEach(p=>{delete PM[p.id]});placed=bk.placed;custom=bk.custom;fmarks=bk.fmarks;uidN=bk.uidN;DRY=false}
}
function repairOps(ops){
  const base=warnSet(); const fresh=m=>[...m.entries()].filter(([k])=>!base.has(k)).map(([,v])=>v);
  let cur=ops.map(o=>Object.assign({},o)); let w=fresh(simulateOps(cur));
  for(let i=0;i<cur.length&&w.length;i++){
    const o=cur[i]; if(!['add','add_custom','move'].includes(o.op)||parse(o.start)==null) continue;
    const dd=o.day!=null?+o.day:((placed.find(b=>b.uid===o.uid)||{}).day||0), s0=parse(o.start);
    let best=null,bestN=w.length;
    for(const dl of [15,30,45,60,75,90,120,150,-15,-30,-45,-60,-90]){const s=s0+dl;if(s<dayStart(dd)||s>1380)continue;
      const t=cur.map((x,j)=>j===i?Object.assign({},x,{start:fmt(s)}):x);const n=fresh(simulateOps(t)).length;
      if(n<bestN){bestN=n;best=t;if(!n)break}}
    if(best){cur=best;w=fresh(simulateOps(cur))}
  }
  return {ops:cur,warns:w};
}

