// What JEPI asks the AI (여행지 준비, 장소 더 찾기, the 예약 도우미, the season …), and how the answers are tidied into the trip. Each returns
// what the screen needs; the old code only shows "…하는 중" and draws the result. (It used to be resolveWishes / askVibes /
// askHotels / askRoutes / genSeason / genPack / morePlaces in src/js 100, 150, 110, 060.) The question texts are
// compared word for word with the deployed version (tools/compare/prompts.js).
import * as trip from './trip';
import * as places from './places';
import * as season from './season';
import * as check from './check';
import * as recs from './recs';
import * as ops from './ops';
import { MARK_EN } from './marks';
import * as days from './days';
import { nightsOf } from './days';
import * as traveler from './traveler';
import { profileSummary, partyEn, heads, budgetParts, ymd, yen } from './traveler';
import { fmt, parse } from '../logic/time';
import { norm, samePlace } from '../logic/places';
import type { Asker } from './ai';

// loosely shaped trip values, as the question texts read them
const CUR = trip.cur as any;
const PK = places.state as any;
const AREAS = places.AREAS, AIRPORTS = places.AIRPORTS;
const areaKeys = () => Object.entries(AREAS).map(([k, v]) => `${k}=${v[0]}`).join(', ');
const cut = (x: unknown, n: number) => String(x || '').slice(0, n);
const list = (x: any): any[] => Array.isArray(x) ? x : [];

/** ① a pasted list of place names → ♥ on each place found (new ones join the destination) */
export async function wishesFromList(ai: Asker, text: string): Promise<{ n: number; added: number }> {
  const areaList = areaKeys();
  const r = await ai.json(`The traveler pasted places they want to visit in ${PK.pack.city}. Identify each real place in the list (skip lines you cannot identify, and skip anything outside ${PK.pack.city}).
List:
${text.slice(0,4000)}
Area keys: ${areaList}
Reply with only JSON: {"places":[{"name":"Korean name","local":"name in local language","area":"area key","cat":"food|music|art|walk|shop|night|trip","lat":0.0000,"lng":0.0000,"dur":minutes,"open":"HH:MM-HH:MM or null","closed":[0-6],"cost":typical spend in ${PK.pack.currency},"tags":["short Korean"],"note":"one Korean sentence","cash":false}]}`, { cache: false });
  let n = 0, added = 0; const got: string[] = [];
  list(r && r.places).slice(0, 40).forEach(x => {
    const ex = places.P.find(p => norm(p.name) === norm(x && x.name || ''));
    if (ex) { got.push(ex.id); n++; return }
    const pl = places.cleanPlace(x); if (pl) { PK.pack.places.push(pl); places.addPackPlace(pl); got.push(pl.id); n++; added++ }
  });
  trip.wish.add(got); places.savePack();
  return { n, added };
}

/** ② what the best areas to stay are like (area key → vibe) */
export async function vibes(ai: Asker, top: { k: string; name: string }[]): Promise<Record<string, any>> {
  const r = await ai.json(`Describe these neighbourhoods of ${PK.pack.city} as places to stay, for this traveler.
${partyEn(CUR.profile.party)} Pace: ${CUR.profile.pace}. Interests: ${CUR.kws.join(', ')||'(none)'}.
Areas: ${top.map(a=>`${a.k}=${a.name}`).join(', ')}
Reply with only JSON: {"areas":[{"key":"area key","vibe":"one Korean sentence on atmosphere and lodging price level","good":"short Korean: who it suits","caution":"short Korean caution or empty"}]}`, { cache: false });
  const out: Record<string, any> = {}; list(r && r.areas).forEach(a => { if (AREAS[a.key]) out[a.key] = a });
  return out;
}

export interface Stay { name: string; local: string; type: string; why: string; price: string; caution: string }
/** ② named places to stay in one area (cap: room budget per night in won, or null) */
export async function hotels(ai: Asker, k: string, cap: number | null): Promise<Stay[]> {
  const area = AREAS[k][0];
  const r = await ai.json(`Suggest 3 to 5 places to stay in or right next to ${area}, ${PK.pack.city}${PK.pack.country?', '+PK.pack.country:''} for this trip.
${profileSummary()}
Guests: ${heads()} (${partyEn(CUR.profile.party)}). Nights: ${nightsOf(CUR.profile)}.${cap?` Room budget: about KRW ${cap} per night or less.`:''}
Prefer long-established, well-known places that are very likely still operating. Do not invent places; if unsure, give fewer. Mix types when it suits them (hotel, ryokan or local inn, guesthouse, serviced apartment).
Reply with only JSON: {"stays":[{"name":"Korean name","local":"name in local language or English for search","type":"Korean type label","why":"one Korean sentence: why it fits this traveler","price":"Korean rough nightly price band from past years, e.g. 1박 10~15만원 (예년 기준)","caution":"short Korean caution or empty"}]}`, { cache: false });
  return list(r && r.stays).filter(x => x && x.name).slice(0, 5).map(x => ({ name: cut(x.name, 40), local: cut(x.local, 60), type: cut(x.type, 16), why: cut(x.why, 140), price: cut(x.price, 40), caution: cut(x.caution, 80) }));
}

/** ③ the usual ways there (routes, carriers) and tips; key: which city and way they are for */
export async function routes(ai: Asker): Promise<{ key: string; routes: any[]; tips: string[] }> {
  const gw: any = AIRPORTS[CUR.profile.out.airport] || {}, M = CUR.profile.mode;
  const r = await ai.json(`A traveler from Seoul, South Korea is going to ${PK.pack.city}${PK.pack.country?', '+PK.pack.country:''} by ${M==='flight'?'plane':M==='train'?'train':'bus'}${gw.name?` (arriving at ${gw.name}${gw.iata?' '+gw.iata:''})`:''}. ${heads()} people, ${nightsOf(CUR.profile)} nights.${budgetParts()?` Transport and lodging budget about KRW ${budgetParts().trip} per person.`:''}
Describe the usual ways to get there: departure airport or station in Seoul (Incheon/Gimpo or Seoul/Yongsan/Express Bus Terminal), direct or connecting, which carriers usually operate (full-service vs low-cost), typical travel time. Do not invent flight numbers or exact times; describe what generally operates and note that schedules change.
Reply with only JSON: {"routes":[{"from":"Korean","to":"Korean","type":"직항|경유|기차|버스","carriers":["Korean names"],"lcc":true,"duration":"Korean e.g. 약 2시간","note":"short Korean"}],"tips":["2-4 short Korean tips for choosing and booking, e.g. baggage on low-cost carriers, best booking timing"]}`, { cache: false });
  return { key: PK.pack.city + '|' + M, routes: list(r && r.routes).slice(0, 5).map(x => ({ from: cut(x.from, 20), to: cut(x.to, 20), type: cut(x.type, 8), carriers: list(x.carriers).map(c => String(c).slice(0, 16)).slice(0, 6), lcc: !!x.lcc, duration: cut(x.duration, 20), note: cut(x.note, 100) })), tips: list(r && r.tips).map(t => String(t).slice(0, 120)).slice(0, 4) };
}

/** 이 시기 정보: sunrise / sunset, weather, notes and seasonal places for the trip's dates (kept with the destination);
 *  earlier seasonal places that are not in use are dropped. Returns how many seasonal places were added. */
export async function seasonInfo(ai: Asker, signal?: AbortSignal): Promise<number> {
  const s0 = ymd(0), s1 = ymd(nightsOf(CUR.profile)), areaList = areaKeys();
  const r = await ai.json(`A trip to ${PK.pack.city}${PK.pack.country?', '+PK.pack.country:''} from ${s0} to ${s1}.
${profileSummary()}
What is special about these exact dates? Consider seasonal nature (blossoms, foliage, snow), illuminations, festivals, fireworks, markets, seasonal food, public holidays and closures, rainy season or heat, crowds.
Area keys: ${areaList}
Reply with only JSON:
{"sunrise":"HH:MM","sunset":"HH:MM" (typical local times for these dates),
"weather":"one Korean sentence: typical weather and what to wear",
"notes":["2-5 short Korean notes on seasonal conditions for these dates: holidays, closures, crowds, rain, heat"],
"places":[up to 8 things that genuinely happen or peak during these dates, {"name":"Korean name","local":"local-language name","area":"area key","cat":"food|music|art|walk|shop|night|trip","lat":0.0000,"lng":0.0000,"dur":minutes,"open":"HH:MM-HH:MM or null","closed":[0-6],"cost":typical spend in ${PK.pack.currency},"tags":["short Korean"],"note":"one Korean sentence","season":"short Korean label such as 단풍 절정, 크리스마스 마켓","from":"YYYY-MM-DD or null","to":"YYYY-MM-DD or null","best":"morning|day|sunset|evening|night|any","confidence":"high|medium|low"}]}
For recurring annual events give their usual dates and use confidence medium or low when this year's dates are not certain. Do not invent events.`, { cache: false, signal });
  const keep = new Set([...CUR.placed.map((b: any) => b.id), ...CUR.wish]);
  PK.pack.places = PK.pack.places.filter((p: any) => !p.season || keep.has(p.id));
  const { P, PM, MUST } = places;
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; if (p.season && !keep.has(p.id)) { P.splice(i, 1); delete PM[p.id]; delete MUST[p.id] } }
  let n = 0; const iso = (x: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(x || '')) ? x : null;
  list(r && r.places).slice(0, 10).forEach(x => {
    const pl: any = places.cleanPlace(x); if (!pl || P.some(p => norm(p.name) === norm(pl.name))) return;
    pl.season = String(x.season || '시즌').slice(0, 20); pl.dates = [iso(x.from), iso(x.to)]; if (!pl.dates[0] && !pl.dates[1]) delete pl.dates;
    pl.conf = ['high', 'medium', 'low'].includes(x.confidence) ? x.confidence : 'medium'; pl.verify = pl.conf === 'high' ? '영업시간' : '올해 날짜';
    pl.tags = [...new Set(['시즌', ...pl.tags])].slice(0, 6); PK.pack.places.push(pl); places.addPackPlace(pl); n++;
  });
  PK.pack.season = { key: season.tripKey(), sunrise: parse(r && r.sunrise) != null ? r.sunrise : '', sunset: parse(r && r.sunset) != null ? r.sunset : '', weather: String((r && r.weather) || '').slice(0, 160), notes: list(r && r.notes).map(x => String(x).slice(0, 120)).slice(0, 6), n };
  places.savePack();
  return n;
}


/** 여행지 준비: the destination's areas, money, gateways and checklist for what the traveler typed (null: not a place) */
export async function destination(ai: Asker, dest: string, signal?: AbortSignal): Promise<places.Pack | null> {
  const prompt=`You prepare destination data for a trip-planning app used by Korean travelers. Destination typed by the user: "${dest.slice(0,60)}". Travelers start from South Korea (Seoul area).
Reply with only JSON:
{"ok":true (false if this is not a real travel destination),
"city":"destination name in Korean","country":"country in Korean","intl":true if outside South Korea,
"currency":"ISO code","symbol":"₩, ¥, $, €, ฿ ...","rate":Korean won per 1 unit of the local currency (approximate, recent),
"transit":"Korean word for the main local public transport (지하철, 전철, 버스, 트램...)",
"fare":{"base":typical single public transport ride in local currency,"perKm":extra per km beyond 4 km,"max":fare cap or 0},
"snack":typical daily budget for snacks and drinks per person in local currency,"step":a round adjustment step for that budget,
"areas":[8-14 neighbourhoods or districts travellers actually use, {"key":"short ascii","name":"Korean name","lat":0.0000,"lng":0.0000,"zone":"zone key"}],
"zones":{"zone key":"Korean label"} (3-7 zones that group nearby areas),
"gateways":[1-4 arrival points: main airports and main rail or bus stations, {"key":"ascii","name":"Korean name","kind":"air|rail|bus","iata":"3-letter IATA code for airports, else empty","lat":0.0000,"lng":0.0000,"min":typical minutes to the centre by public transport,"fare":typical one-way fare to the centre in local currency}],
"checks":[4-7 short Korean pre-trip checklist items specific to this destination: entry rules or apps, payment, plugs, tax refund, local customs],
"arrivalNote":"one short Korean sentence about arrival procedures, or empty"}
Coordinates must be accurate WGS84 to 4 decimals.`;
  const r = await ai.json(prompt, { cache: false, signal });
  return places.cleanPack(r, dest);
}

/** 장소 더 찾기: n more places for this traveler (focus: what they asked for); new ones join the destination.
 *  Returns the ids added (places already there, by name or as the same place, are skipped). */
export async function morePlaces(ai: Asker, n: number, focus: string, signal?: AbortSignal): Promise<string[]> {
  const { P } = places, DY = days.state;
  const areaList = areaKeys();
  const prompt=`Suggest ${n} real, currently operating places in ${PK.pack.city}${PK.pack.country?', '+PK.pack.country:''} for this traveler.
${profileSummary()}
Trip dates: ${(DY.days[0]||{}).iso||''} to ${(DY.days[DY.days.length-1]||{}).iso||''}.
${focus?`The traveler asks specifically for: "${String(focus).slice(0,120)}". All suggestions should fit this.`:`Spread them across these categories: food (meals and cafes that suit who is traveling), music, art, walk, shop, night, and include 2 luggage-storage options near the main station or centre (category "trip", drop true). ${CUR.kws.length?'Favour places matching the interest keywords.':'No interests were given: pick well-loved, varied places most visitors enjoy, so the traveler can discover what they like.'} Consider the trip dates: include seasonal highlights (blossoms, foliage, illuminations, festivals, seasonal food) only when they genuinely happen then.`}
Who is traveling matters most for the choice of places.
Area keys: ${areaList}
Do not repeat these: ${P.map(p=>p.name).slice(0,150).join(', ')||'(none)'}
Reply with only JSON: {"places":[{"name":"Korean name","local":"name in local language for map search","area":"area key","cat":"food|music|art|walk|shop|night|trip","lat":0.0000,"lng":0.0000,"dur":typical minutes,"open":"HH:MM-HH:MM or null if always open (24:00 for midnight)","closed":[weekday numbers, 0=Sunday],"cost":typical spend per person in ${PK.pack.currency},"costNote":"short Korean","tags":["2-5 short Korean keywords; reuse the traveler's keywords when they apply"],"note":"one Korean sentence: what it is and why go","must":"short Korean reason if it is a highlight for this traveler, else empty","drop":false,"cash":true only if the place mostly accepts cash only,"best":"morning|day|sunset|evening|night|any: when this place is best visited","check":"short Korean note if a booking or ticket is needed, else empty"}]}`;
  const r = await ai.json(prompt, { cache: false, signal }); const added: string[] = [];
  list(r && r.places).slice(0, n + 5).forEach(x => {
    const pl = places.cleanPlace(x);
    if (pl && !P.some(p => norm(p.name) === norm(pl.name) || (p.local && pl.local && norm(p.local) === norm(pl.local))) && !P.find(p => !p.shared && samePlace(p, pl))) { PK.pack.places.push(pl); places.addPackPlace(pl); added.push(pl.id) }
  });
  places.savePack();
  return added;
}


// ---- the day's 빈 시간 채우기, reading a booking, day titles (it used to be askAI / aiFill / lookAiTitles in src/js 360, 030, 389a) ----
// names as the question texts use them
const DY = days.state, P: any[] = places.P, PM: Record<string, any> = places.PM, DAY_START = 7 * 60;
const { gapsOf, analyze, closedOn, hoursFor, dayCost } = check;
const { outOfSeason } = season;
const { tagsOf, mustOf } = places;
const recOf = (p: any) => recs.countOf(recs.placeKey(PK.pack.city || '', p.name));
const isWish = (id: string) => trip.wish.has(id);
const PLC = { rate: places.rate };
const repairOps = ops.repair;

/** 빈 시간 채우기: up to a few places for the free time of day `day` that bring no new warnings (dropped: how many did) */
export async function fillDay(ai: Asker, day: number, signal?: AbortSignal): Promise<{ items: any[]; dropped: number }> {
  const D=DY.days[day], wd=D.wd, gaps=gapsOf(day);
  const items=analyze(day).items.map(i=>`${fmt(i.start)}-${fmt(i.end)} ${i.name} @ ${i.locName}${i.carryAfter?' [after this the traveler carries a suitcase until a luggage-drop block]':''}${i.marks&&i.marks.length?' {'+i.marks.map((m: string)=>'traveler '+MARK_EN[m]).join('; ')+'}':''}`).join('\n');
  const used=new Set(CUR.placed.map((b: any)=>b.id));
  const cands=P.filter(p=>!closedOn(p,wd)&&!outOfSeason(p,D.iso)&&!used.has(p.id)&&p.dur<=Math.max(...gaps.map(g=>g[1]-g[0]))).map(p=>{
    const h=hoursFor(p,wd);return {id:p.id,name:p.name,tags:tagsOf(p.id),mustSee:mustOf(p.id)||undefined,best:p.best&&p.best!=='any'?p.best:undefined,season:p.season?`${p.season}${p.dates?` ${p.dates[0]||''}~${p.dates[1]||''}`:''}`:undefined,travelerRecs:recOf(p)||undefined,wished:isWish(p.id)||undefined,category:p.cat,luggageDrop:!!p.drop,area:p.area,minutes:p.dur,open:h?`${fmt(h[0])}-${fmt(h[1])}`:'always',note:p.note}});
  const freeMin=gaps.reduce((a,g)=>a+(g[1]-g[0]),0), per=({slow:200,normal:140,full:100} as Record<string, number>)[CUR.profile.pace]||140, maxPick=Math.max(1,Math.min(6,Math.ceil(freeMin/per)));
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
  const res=await ai.json(prompt,{signal,cache:false});
    const arr=Array.isArray(res?.suggestions)?res.suggestions:[];
    const out=arr.map((x: any)=>({id:String(x.id||''),start:parse(x.start),reason:String(x.reason||'')})).filter((x: any)=>PM[x.id]&&x.start!=null&&x.start>=DAY_START&&x.start<1380).slice(0,maxPick);
    let kept: any[]=[], dropped=0;
    for(const x of out){const ops=[...kept.map(k=>({op:'add',day,id:k.id,start:fmt(k.start),dur:PM[k.id].dur})),{op:'add',day,id:x.id,start:fmt(x.start),dur:PM[x.id].dur}];
      const r=repairOps(ops); if(!r.warns.length){kept=r.ops.map((o,j)=>Object.assign({},j<kept.length?kept[j]:x,{start:parse(o.start)}))} else dropped++}
  return { items: kept, dropped };
}

/** 예약 내용 읽기: what a pasted booking (flight / train / bus, or stays) says, as the AI read it */
export async function readBooking(ai: Asker, kind: 'flight' | 'stay' | string, text: string): Promise<any> {
  const areaList=Object.entries(AREAS).map(([k,v])=>`${k}=${v[0]}`).join(', ');
  const prompt=kind==='flight'
   ?`Extract the round trip (flight, train or bus) between the traveler's home and ${PK.pack.city} from this booking text. Copy times exactly as printed (local time, 24h HH:MM). For airport/station pick the closest key from: ${Object.entries(AIRPORTS).map(([k,g])=>k+'='+g.name).join(', ')}.\nReply with only JSON: {"startDate":"YYYY-MM-DD or null","endDate":"YYYY-MM-DD or null","mode":"flight|train|bus|null","out":{"airport":"key|null","dep":"HH:MM|null","arr":"HH:MM|null","flight":"string|null"},"back":{"airport":"key|null","dep":"HH:MM|null","arr":"HH:MM|null","flight":"string|null"}}\nText:\n${text.slice(0,6000)}`
   :`Extract hotel stays in ${PK.pack.city} from this booking text. For area choose the closest key from: ${areaList}.\nReply with only JSON: {"stays":[{"name":"short hotel name","area":"key","checkin":"HH:MM|null","checkout":"HH:MM|null","checkinDate":"YYYY-MM-DD|null","checkoutDate":"YYYY-MM-DD|null"}]}\nText:\n${text.slice(0,6000)}`;
  return ai.json(prompt, { modelTier: 'quick', cache: false });
}

/** 여행 꾸미기 → AI로 지어 보기: a short title for each day */
export async function dayTitles(ai: Asker, tripName: string): Promise<string[]> {
  const days=DY.days.map((_D,i)=>`Day ${i+1}: `+analyze(i).items.filter(x=>!x.stay).map(x=>x.name).slice(0,8).join(', '));
  const prompt=`Write a short, evocative Korean title for each day of this trip to ${PK.pack.city}, like chapter titles of a travel journal (8-18 Korean characters, no emoji, no "Day N"). Trip title: "${tripName}".
${days.join('\n')}
Reply with only JSON: {"titles":["...", ...]} with exactly ${DY.days.length} items.`;
  const r = await ai.json(prompt, { cache: false }); return Array.isArray(r && r.titles) ? r.titles.slice(0, DY.days.length) : [];
}


// ---- 여행지 추천 and 이야기하며 정하기 (it used to be recommendDest / talkSend in src/js 120, 140) ----
export const REACH_EN: Record<string, string> = {domestic:'Domestic only: places inside South Korea.',near:'Short trip abroad: about 3 hours or less by plane from Seoul (Japan, Taiwan, Hong Kong, eastern China and similar).',far:'Anywhere in the world is fine, including long-haul.'};
const { styleEn, BUDGET_EN } = traveler;
/** 여행지 추천: 5 places for this traveler (mode.more: more, not these `prev`; mode.ask: is this one place right for them?) */
export async function destinations(ai: Asker, q: any, mode: { ask?: string; more?: boolean }, prev: string[], want: string): Promise<any[]> {
  const r = await ai.json(`${mode.ask?`A traveler starting from Seoul, South Korea is considering "${String(mode.ask).slice(0,60)}". Evaluate only that destination for them (return exactly 1 item, honest about downsides).`:'Recommend 5 travel destinations for a traveler starting from Seoul, South Korea.'}${mode.more&&prev.length?` Do not repeat these: ${prev.join(', ')}.`:''}
Dates: ${q.dateUnknown?`not fixed yet, roughly from ${q.startDate} (about a month from now)`:`from ${q.startDate}`} for ${nightsOf(q)} nights.
Who: ${partyEn(q.party)} ${styleEn(q)}
${BUDGET_EN[q.budget]} ${REACH_EN[q.reach]}${+q.budgetMan>0?`\nMoney budget: about ${q.budgetMan}만원 (KRW ${q.budgetMan*10000}) per person in total, covering transport, lodging and local spending. Only recommend places where this is realistic for the trip length, and give the estimate in budget.`:''}
Interests: ${CUR.kws.join(', ')||'(none given)'}${want?`\nWhat they want, in their own words: "${want.slice(0,300)}"`:''}
Judge the season by what this traveler wants: off-season, cold or dark months can be ideal for quiet, solitude, contemplation, aurora or empty landscapes, while festivals and mild weather suit others. Avoid only conditions that would clearly spoil their wishes (typhoons, monsoon floods, closures). Give a varied set (different countries or regions where the reach allows).${q.reach==='far'?' The traveler explicitly asked for far-away places: at least 3 of the 5 must be outside East and Southeast Asia (for example Europe, Oceania, the Americas, the Middle East, Central Asia or Africa). If the trip is short for such a place, still include it and say so in caution, suggesting how many nights would suit it.':' If the trip is short for the travel time, say so in caution.'}
Reply with only JSON: {"destinations":[{"city":"Korean name of the city or region","country":"Korean country name","why":"one Korean sentence linking it to their interests and companions","season":"one Korean sentence about these dates there","highlights":["3 short Korean highlights"],"flight":"Korean travel time from Seoul, e.g. 비행 약 2시간 or KTX 약 2시간 30분","budget":"Korean rough per-person cost of transport and lodging for this trip length, in 만원","caution":"short Korean caution or empty","fit":"one Korean sentence on how well it matches this traveler"}]}`, { cache: false });
    const got=(Array.isArray(r&&r.destinations)?r.destinations:[]).filter((d: any)=>d&&d.city).slice(0,5).map((d: any)=>({fit:String(d.fit||'').slice(0,160),asked:!!mode.ask,city:String(d.city).slice(0,30),country:String(d.country||'').slice(0,20),why:String(d.why||'').slice(0,200),season:String(d.season||'').slice(0,200),
      highlights:(Array.isArray(d.highlights)?d.highlights:[]).map((x: any)=>String(x).slice(0,40)).slice(0,4),flight:String(d.flight||'').slice(0,40),budget:String(d.budget||'').slice(0,40),caution:String(d.caution||'').slice(0,100)}));
  return got;
}
/** 이야기하며 정하기: one turn of the conversation (msgs so far; dates: what is known about the dates; force: this is the last
 *  turn). A broken answer that still has the reply is rescued; null when there is nothing to show. */
export async function talkTurn(ai: Asker, draft: any, msgs: { role: string; text: string; err?: boolean }[], dates: string, force: boolean): Promise<any> {
  const conv = msgs.filter(m => !m.err).map(m => (m.role === 'u' ? 'User: ' : 'AI: ') + m.text).join('\n');
  const prompt=`You are a warm travel companion helping a Korean user who feels vague about traveling find the direction of their trip through a short conversation. Write natural, gentle Korean (해요체): at most two short sentences of acknowledgement, then one question.
Rules: one question at a time. Move through: why travel now and how they feel → what they hope to feel or gain → alone time or meeting people, quiet or lively → what to avoid → practical limits (when, how long, budget, domestic or abroad) only if still unknown. Do not counsel like a therapist; acknowledge briefly and keep moving toward the trip. If they mention a specific destination, remember it. If they express serious distress or thoughts of self-harm, respond with care and gently suggest talking to someone they trust or a professional line (in Korea, 109), and do not push the trip.
Known so far: ${partyEn(draft.party)} ${dates}
Conversation:
${conv}
${force?'This is the final turn: write a short warm closing as reply and fill summary (done true).':'Finish (done true with a summary) only once you have enough, usually after 3-5 answers.'}
Output exactly one JSON object and nothing else, in one of these two shapes.
While still asking: {"reply":"Korean text","options":["3-4 short Korean answers the user might tap"],"done":false,"summary":null}
When finishing: {"reply":"Korean text","options":[],"done":true,"summary":{"purpose":"one Korean line in the user's own voice","keywords":["3-5 short Korean keywords"],"pace":"slow","social":"alone","party":"solo","reach":"far","avoid":"short Korean or empty","dest":"a destination they named, or empty","nights":null,"startDate":null,"note":"one warm Korean sentence describing this trip's direction"}}
In the summary, pace is slow|normal|full, social is alone|some|social, party is solo|couple|friends|family|unknown, reach is domestic|near|far|unknown, nights is a number only if the user said a trip length (else null), startDate is YYYY-MM-DD only if the user gave a specific date (else null).`;
  try { return await ai.json(prompt, { cache: false }) }
  catch (e: any) {
    if (e && e.code === 'invalid_json' && e.text) { const m = /"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(e.text); if (m) { try { return { reply: JSON.parse('"' + m[1] + '"'), options: [] } } catch (_) { /* not readable */ } } }
    throw e;
  }
}
