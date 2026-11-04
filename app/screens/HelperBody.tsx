// 예약 도우미 (#helperBody): ① 가고 싶은 곳 ♥ ② 숙소 동네 ③ 교통편 시간대 ④ 예약하고 일정에 넣기.
// It used to be renderHelper / hotelRecHTML / routeHTML (100-booking.js, 150-lodging.js). The frame (#helper: 제목, 이전/다음) is
// still body.html. The old code works out every number and redraws fresh (rev); AI buttons and their status lines are Live.
import { Fragment } from 'react';
import { LiveButton, LiveLine } from '../ui/live';
import { Radio } from './TripForms';

type Link = [name: string, url: string];
const Links = ({ l }: { l: Link[] }) => l.length ? <div className="links">{l.map(([n, u], i) => <a key={i} className="small-btn" href={u} target="_blank" rel="noopener">{`${n} ↗`}</a>)}</div> : null;

export interface Hotel { name: string; type: string; why: string; price: string; links: Link[] }
export interface AreaCard { k: string; name: string; sel: boolean; line: string; vibe: null | { vibe: string; good: string }; cap: string; links: Link[]; hotelLabel: string; hotels: Hotel[] | null }
export interface Slot { title: string; line: string; notes: string; key: string; picked: boolean }
export interface RouteInfo { routes: { title: string; type: string; duration: string; carriers: string; note: string }[]; tips: string[] }

export type HelperStep =
  | { s: 0; count: number; list: { id: string; on: boolean; name: string; sub: string; note: string }[] }
  | { s: 1; intro: string; cards: AreaCard[] }
  | { s: 2; intro: string; car: boolean; slots: Slot[]; routeLabel: string | null; route: RouteInfo | null; links: Link[] }
  | { s: 3; bookedFlight: boolean; bookedStay: boolean };

export interface HelperBodyProps { step: HelperStep; ai: boolean; rev: number }

function Hotels({ hs }: { hs: Hotel[] }) {
  return <div className="h-list">{hs.map((h, i) => (
    <div key={i} className="h-item"><b>{h.name}</b>{h.type && <>{' '}<span className="tag">{h.type}</span></>}<p>{h.why}</p><p className="hint">{h.price}</p><Links l={h.links} /></div>
  ))}</div>;
}

function Step({ st, ai }: { st: HelperStep; ai: boolean }) {
  if (st.s === 0) return <>
    <p className="onb-sub">끌리는 곳에 ♥만 누르세요. 고른 곳을 기준으로 숙소 동네를 추천해요. 3곳 이상 고르면 정확해져요. <b>{`지금 ♥ ${st.count}곳`}</b></p>
    {ai && <div className="fsec"><h3>미리 찾아 둔 곳이 있다면</h3><textarea id="wishPaste" rows={3} placeholder="가고 싶은 곳 이름을 줄마다 하나씩 붙여 넣으세요 (지도 저장 목록, 메모 등)" />
      <div className="row"><LiveButton className="small-btn primary" id="wishPasteBtn">목록에서 ♥ 붙이기</LiveButton><LiveLine tag="span" id="st_wish" /></div></div>}
    <div className="wish-list">{st.list.length ? st.list.map(p => (
      <button key={p.id} type="button" className="wish-item" data-wish={p.id} aria-pressed={p.on}><span className="hrt">{p.on ? '♥' : '♡'}</span><span><b>{p.name}</b><small>{p.sub}</small><small>{p.note}</small></span></button>
    )) : <p className="hint">아직 장소 후보가 없어요. 위 칸에 붙여 넣거나 장소 블록 탭에서 AI로 찾아 주세요.</p>}</div>
  </>;
  if (st.s === 1) return <>
    <p className="onb-sub">{st.intro}</p>
    {st.cards.map((a, i) => (
      <div key={a.k} className={a.sel ? 'fsec area-card sel' : 'fsec area-card'}>
        <h3>{`${i + 1}. ${a.name}${a.sel ? ' · 선택함' : ''}`}</h3>
        <p className="mono hint">{a.line}</p>
        {a.vibe && <><p>{a.vibe.vibe}</p><p className="hint">{a.vibe.good}</p></>}
        <div className="row"><button className={a.sel ? 'small-btn' : 'small-btn primary'} type="button" data-setarea={a.k}>{a.sel ? '선택한 동네예요' : '이 동네로 정하기'}</button></div>
        {a.cap && <p className="hint">{a.cap}</p>}
        <Links l={a.links} />
        {ai && <div className="row" style={{ marginTop: 8 }}><LiveButton className="small-btn" id={'hotelBtn_' + a.k} data={{ hotels: a.k }}>{a.hotelLabel}</LiveButton><LiveLine tag="span" id={'st_hotel_' + a.k} /></div>}
        {a.hotels && <Hotels hs={a.hotels} />}
      </div>
    ))}
    {ai && <div className="row"><LiveButton className="small-btn" id="vibeBtn">AI에게 동네 분위기 물어보기</LiveButton><LiveLine tag="span" id="st_vibe" /></div>}
    <p className="hint">링크를 누르면 날짜·인원·동네가 채워진 검색 결과가 새 창으로 열려요. 사이트에 따라 일부 조건은 다시 골라야 할 수 있어요.</p>
  </>;
  if (st.s === 2) return <>
    <p className="onb-sub">{st.intro}</p>
    {!st.car && st.slots.map(s => (
      <div key={s.key} className="fsec"><h3>{s.title}</h3><p className="mono hint">{s.line}</p>{s.notes && <p className="hint">{s.notes}</p>}
        <div className="row"><button className={s.picked ? 'small-btn primary' : 'small-btn'} type="button" data-slot={s.key}>{s.picked ? '이 시간대로 가정했어요' : '이 시간대로 가정하기'}</button></div></div>
    ))}
    <p className="hint">보통 인기 시간대가 더 비싸요. 가격 차이와 자유 시간을 같이 보고 고르세요.</p>
    {st.routeLabel && <div className="row"><LiveButton className="small-btn primary" id="routeBtn">{st.routeLabel}</LiveButton><LiveLine tag="span" id="st_route" /></div>}
    {st.route && <div className="fsec"><h3>이렇게 갈 수 있어요</h3>
      {st.route.routes.map((x, i) => <div key={i} className="h-item"><b>{x.title}</b>{' '}<span className="tag">{x.type}</span>{x.duration && <>{' '}<span className="tag mono">{x.duration}</span></>}<p>{x.carriers}</p>{x.note && <p className="hint">{x.note}</p>}</div>)}
      {st.route.tips.length > 0 && <ul className="tips-list">{st.route.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      <p className="hint">AI가 아는 일반적인 운항 정보예요. 실제 시간표와 가격은 바뀔 수 있어요.</p></div>}
    <Links l={st.links} />
  </>;
  return <>
    <p className="onb-sub">예약을 마쳤다면 확인 메일이나 e티켓 내용을 붙여 넣어 주세요. 정확한 시간과 숙소가 일정표에 들어가요.</p>
    <div className="fsec"><h3>예약 상태</h3><Radio path="bookedFlight" val={st.bookedFlight} opts={[[true, '교통편 예약함'], [false, '아직']]} /><Radio path="bookedStay" val={st.bookedStay} opts={[[true, '숙소 예약함'], [false, '아직']]} /></div>
    <div className="row"><button className="small-btn primary" type="button" id="helperToMe">"내 정보"에서 예약 내용 붙여 넣기</button></div>
  </>;
}

export function HelperBody({ step, ai, rev }: HelperBodyProps) {
  return <Fragment key={rev}><Step st={step} ai={ai} /></Fragment>;
}
