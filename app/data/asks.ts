// What JEPI asks the AI (여행지 준비, 장소 더 찾기, the 예약 도우미, the season …), and how the answers are tidied into the trip. Each returns
// what the screen needs; the old code only shows "…하는 중" and draws the result. (It used to be resolveWishes / askVibes /
// askHotels / askRoutes / genSeason / genPack / morePlaces in src/js 100, 150, 110, 060.) The question texts are
// compared word for word with the deployed version (tools/compare/prompts.js).
import * as trip from './trip';
import * as places from './places';
import * as season from './season';
import * as days from './days';
import { nightsOf } from './days';
import { profileSummary, partyEn, heads, budgetParts, ymd } from './traveler';
import { parse } from '../logic/time';
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
