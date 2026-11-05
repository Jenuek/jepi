// ---------- season & time-of-day: what is special on these dates, and when each place is best ----------
// season facts of this trip and what they mean for places: app/data/season.ts
const SN=JD.season, BEST_KO=SN.BEST_KO, tripKey=SN.tripKey, seasonOf=SN.seasonOf, sunsetMin=SN.sunsetMin, outOfSeason=SN.outOfSeason, mdTxt=SN.mdTxt, bestTips=SN.bestTips;
const seasonSummary=TV.seasonSummary;   // app/data/traveler.ts
async function genSeason(stId,signal){
  if(!sample) return false;
  progStart(stId,'이 시기만의 특징과 행사를 찾는 중이에요 (보통 30초~1분)',['seasonBtn'],'찾는 중…');
  const s0=ymd(0), s1=ymd(nightsOf(CUR.profile)), areaList=Object.entries(AREAS).map(([k,v])=>`${k}=${v[0]}`).join(', ');
  try{
    const r=await sample.json(`A trip to ${PK.pack.city}${PK.pack.country?', '+PK.pack.country:''} from ${s0} to ${s1}.
${profileSummary()}
What is special about these exact dates? Consider seasonal nature (blossoms, foliage, snow), illuminations, festivals, fireworks, markets, seasonal food, public holidays and closures, rainy season or heat, crowds.
Area keys: ${areaList}
Reply with only JSON:
{"sunrise":"HH:MM","sunset":"HH:MM" (typical local times for these dates),
"weather":"one Korean sentence: typical weather and what to wear",
"notes":["2-5 short Korean notes on seasonal conditions for these dates: holidays, closures, crowds, rain, heat"],
"places":[up to 8 things that genuinely happen or peak during these dates, {"name":"Korean name","local":"local-language name","area":"area key","cat":"food|music|art|walk|shop|night|trip","lat":0.0000,"lng":0.0000,"dur":minutes,"open":"HH:MM-HH:MM or null","closed":[0-6],"cost":typical spend in ${PK.pack.currency},"tags":["short Korean"],"note":"one Korean sentence","season":"short Korean label such as 단풍 절정, 크리스마스 마켓","from":"YYYY-MM-DD or null","to":"YYYY-MM-DD or null","best":"morning|day|sunset|evening|night|any","confidence":"high|medium|low"}]}
For recurring annual events give their usual dates and use confidence medium or low when this year's dates are not certain. Do not invent events.`,{cache:false,signal});
    // drop earlier seasonal places that are not in use
    const keep=new Set([...CUR.placed.map(b=>b.id),...CUR.wish]);
    PK.pack.places=PK.pack.places.filter(p=>!p.season||keep.has(p.id));
    for(let i=P.length-1;i>=0;i--){const p=P[i];if(p.season&&!keep.has(p.id)){P.splice(i,1);delete PM[p.id];delete MUST[p.id]}}
    let n=0; const iso=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?x:null;
    (Array.isArray(r&&r.places)?r.places:[]).slice(0,10).forEach(x=>{const pl=cleanPlace(x);if(!pl||P.some(p=>norm(p.name)===norm(pl.name)))return;
      pl.season=String(x.season||'시즌').slice(0,20); pl.dates=[iso(x.from),iso(x.to)]; if(!pl.dates[0]&&!pl.dates[1]) delete pl.dates;
      pl.conf=['high','medium','low'].includes(x.confidence)?x.confidence:'medium'; pl.verify=pl.conf==='high'?'영업시간':'올해 날짜';
      pl.tags=[...new Set(['시즌',...pl.tags])].slice(0,6); PK.pack.places.push(pl); addPackPlace(pl); n++});
    PK.pack.season={key:tripKey(),sunrise:parse(r&&r.sunrise)!=null?r.sunrise:'',sunset:parse(r&&r.sunset)!=null?r.sunset:'',weather:String((r&&r.weather)||'').slice(0,160),notes:(Array.isArray(r&&r.notes)?r.notes:[]).map(x=>String(x).slice(0,120)).slice(0,6),n};
    savePack(); progStop(stId); renderAll(); setSt(stId,`이 시기 정보를 받았어요${n?` · 시즌 장소 ${n}곳 추가`:''}.`); return true;
  }catch(e){setSt(stId,e&&e.code==='cancelled'?'멈췄어요. "확인할 것" 탭에서 다시 받을 수 있어요.':errText(e,'시즌 정보를 받지 못했어요'));return false}
}
// 준비하기 → 이 시기 여행 팁 (drawn by React: Checks.tsx)
function seasonInfo(){
  const s=seasonOf(), stale=!!(PK.pack.season&&!s);
  return {got:s?{sun:`${s.sunrise?`🌅 일출 약 ${s.sunrise} · `:''}${s.sunset?`🌇 일몰 약 ${s.sunset}`:''}`,weather:s.weather||'',notes:(s.notes||[]).map((t,i)=>ckInfo('sn'+i+'_'+tripKey(),t))}:null,
    stale,canAsk:!!(sample&&!PK.pack.manual)};
}

