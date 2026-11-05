// The traveler as the AI is told about them (who, style, pace, budget, purpose, keywords, this season), and the money
// helpers those sentences use. It used to be profileSummary / partyEn / styleEn / budgetParts … in src/js (020, 110, 120,
// 130). The English sentences are part of what the AI is asked: keep them as they are unless the questions change.
import * as trip from './trip';
import * as places from './places';
import { nightsOf, dateOf } from './days';
import { seasonOf } from './season';

// the trip's values as the sentences below read them (loosely shaped: old plans differ)
const CUR = trip.cur as any;
const PK = places.state as any;
const AREAS = places.AREAS;
const KRW_PER_JPY_ = () => places.rate();

export const yen = (n: number): string =>((PK.pack&&PK.pack.symbol)||'¥')+Math.round(n).toLocaleString('ko-KR');
export const won = (n: number): string =>'₩'+(Math.round(n/10)*10).toLocaleString('ko-KR');
export const heads = (): number =>{const q=(CUR.profile&&CUR.profile.party)||{};return Math.max(1,(+q.adults||1)+(+q.kids||0))};
export const PARTY_KO: any = {solo:'혼자',couple:'연인·부부',friends:'친구',family:'가족'};
export function partyEn(q?: any): any{q=q||CUR.profile.party||{type:'solo'};
  if(q.type==='couple') return 'A couple traveling together: favour places with good atmosphere for two, scenic spots and night views; avoid solo-counter-only places.';
  if(q.type==='friends') return `A group of ${q.adults} friends: favour places that seat a group, shared food, activities and lively spots; avoid tiny counter-only bars.`;
  if(q.type==='family') return `A family: ${q.adults} adult(s)${q.kids?` and ${q.kids} child(ren)`:''}. ${q.kids?'Favour kid-friendly places, parks and hands-on spots, avoid bars and late nights, keep transfers short and leave rest breaks.':'Favour comfortable, easy-going places for all ages.'}`;
  return 'Traveling alone: include solo-friendly places (counter seats, single portions) and places where it is easy to be on one\'s own.'}
export const BUDGET_EN: any = {low:'Tight budget.',mid:'Moderate budget.',high:'Comfortable budget, happy to spend for good experiences.'};
export const STY: any = {rhythm:{early:'Early riser: starts the day early and ends early.',late:'Late starter: begins around 10:00 and enjoys evenings and nights.'},
  walk:{lots:'Happy to walk a lot.',less:'Wants to walk as little as possible: prefer short transfers, direct transit or taxis.'},
  fame:{famous:'Prefers famous must-see landmarks.',hidden:'Prefers lesser-known places locals go to over tourist hotspots.'},
  crowd:{ok:'Crowds are fine.',avoid:'Avoids crowds: prefer quieter places and off-peak times.'},
  food:{familiar:'Prefers familiar, easy food.',adventurous:'Wants to try adventurous local food.'},
  comfort:{comfort:'Values comfort and easy logistics.',experience:'Fine with some hassle for special experiences.'},
  exp:{new:'Little travel experience: prefer easy-to-navigate areas and simple transit, and mention practical tips.',pro:'Experienced traveler: comfortable with complex transit and off-the-beaten-path places.'},
  lang:{low:'Not confident in English or the local language: prefer places with picture, Korean or English menus and ticket machines, avoid phone-only reservations.',mid:'Can manage basic English.',high:'Communicates well in English or the local language.'},
  gender:{female:'The traveler is a woman: consider practical safety such as well-lit, busy areas late at night and women-friendly lodging. Do not stereotype her interests.',male:''}};
export function styleEn(p?: any): any{const st=(p&&p.style)||{};return Object.entries(STY as Record<string, Record<string, string>>).map(([k,m])=>m[st[k]]||'').filter(Boolean).join(' ')}
export function budgetParts(pr?: any): any{pr=pr||CUR.profile;const t=(+pr.budgetMan||0)*10000;if(!t)return null;
  const trip=(+pr.tripMan>0?+pr.tripMan*10000:Math.round(t*0.6)), local=(+pr.localMan>0?+pr.localMan*10000:Math.max(0,t-trip));
  return {total:t,trip,local,daily:local/(nightsOf(pr)+1)}}
export function roomCap(): any{const b=budgetParts();if(!b)return null;const lodge=b.trip*(CUR.profile.mode==='flight'?0.5:0.7);return Math.round(lodge/nightsOf(CUR.profile)*heads()/1000)*1000}
export function budgetEn(): any{const b=budgetParts();if(!b)return '';const d=b.daily/(KRW_PER_JPY_()||1);
  return ` Money budget per person: about ${Math.round(b.total/10000)}만원 in total; local spending about ${yen(d)} (${won(b.daily)}) per day.`}
export function seasonSummary(): any{const s=seasonOf(); if(!s) return '';
  return `\nSeason on these dates: sunrise ~${s.sunrise||'?'}, sunset ~${s.sunset||'?'}. ${s.weather||''} ${(s.notes||[]).join(' ')}\nPlaces have a "best" time of day (morning/day/sunset/evening/night); schedule them in that window. Seasonal places only happen within their date range.`}
export function profileSummary(): any{
  const pace=({slow:'Unhurried: one main thing per day, the rest relaxed.',normal:'Balanced pace.',full:'Wants a full schedule.'} as Record<string, string>)[CUR.profile.pace]||'';
  const social=CUR.profile.party.type!=='solo'?'':(({alone:'Prefers time alone.',some:'Mostly alone with a few chances to meet people.',social:'Wants many chances to meet people.'} as Record<string, string>)[CUR.profile.social]||'');
  return `${CUR.profile.kind==='day'?`This is a one-day outing (not an overnight trip) from ${CUR.profile.meet.time} to ${CUR.profile.meet.end}, meeting around ${(AREAS[CUR.profile.meet.area]||[''])[0]}.\n`:''}Who: ${partyEn(CUR.profile.party)}\nTraveler: ${styleEn(CUR.profile)} ${pace} ${social} ${CUR.profile.breakfast?'Eats breakfast.':'Usually skips breakfast.'} ${BUDGET_EN[CUR.profile.budget]||''}${budgetEn()}${CUR.profile.purpose?` Trip purpose in their own words: "${CUR.profile.purpose}".`:''}${CUR.profile.direction&&CUR.profile.direction.avoid?` Wants to avoid: "${CUR.profile.direction.avoid}".`:''}${CUR.profile.direction&&CUR.profile.direction.note?` Direction of this trip: ${CUR.profile.direction.note}`:''}\nInterest keywords (prefer candidates whose tags match more of these): ${CUR.kws.join(', ')||'(none given)'}${seasonSummary()}`;
}
export const ymd = (i: number): string =>{const d=dateOf(CUR.profile,i);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:''};
export const guests = (): { a: number; k: number } =>({a:CUR.profile.party.adults||1,k:CUR.profile.party.kids||0});
