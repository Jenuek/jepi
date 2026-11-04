// The input forms of 더보기 → 이번 여행 (they used to be fParty·fTrip·fFlight·fHome·homeBoxHTML·fStay·fEvents in src/js).
// The old code still reads them: field names (data-pf, data-radio, data-type) are the same, every input event goes to
// the old onPf, and the old code redraws the whole form (a new rev) after it changes the draft. So the fields are
// uncontrolled (defaultValue): they keep what the person types until the next redraw.
// Status lines (AI로 채우기, dates) and the 준비하기 button are LiveLine/LiveButton
// (app/ui/live.tsx): the old code updates them through a handle, not by writing into them.
import type { CSSProperties, ReactNode } from 'react';
import { LiveButton, LiveLine } from '../ui/live';
import { DestFinder, type FinderPart } from './OnbFinder';

export type Opt = [value: string | number | boolean, label: string];

/** 예약 내용 붙여 넣기 → AI로 채우기 (without AI: a hint instead) */
export interface Paste { kind: string; hint: string; ai: boolean; /** the last message (kept across redraws) */ msg: string }

export interface Time2 { dep: string; arr: string; airport: string; flight: string }

export type FormPart =
  | { f: 'party'; type: string; adults: number; kids: number }
  | { f: 'trip'; bookedFlight: boolean; bookedStay: boolean; dates: DatesInfo }
  | { f: 'flight'; mode: string; word: string; notBooked: boolean; out: Time2; back: Time2; local: string; airports: Opt[]; paste: Paste }
  | { f: 'homeBox'; hasHome: boolean; addr: string; using: boolean; kakao: Opt[]; msg: string }
  | { f: 'home'; mode: string; word: string; area: string; min: number | string; fare: number | string; byMin: number | string; byMinOpts: Opt[] }
  | { f: 'stay'; helper: boolean; stays: { name: string; area: string; checkin: string; checkout: string; from: number; to: number }[]; areas: Opt[]; nights: string[]; paste: Paste }
  | { f: 'budget'; man: number | string; trip: number | string; local: number | string; hint: string }
  | { f: 'dest'; dest: string; ai: boolean; ready: string; rate: { cur: string; val: number } | null }
  | { f: 'dates'; dates: DatesInfo }
  | FinderPart
  | { f: 'day'; date: string; time: string; end: string; area: string; areas: Opt[] }
  | { f: 'events'; events: { name: string; day: number; start: string; end: string; area: string }[]; areas: Opt[]; days: string[] };

export interface DatesInfo {
  /** what the date field shows ('' when not chosen yet or unknown) */
  start: string;
  unknown: boolean;
  /** the chosen number of nights, or null when not chosen yet */
  nights: number | null;
  maxN: number;
}

function PasteBox({ p }: { p: Paste }) {
  if (!p.ai) return <p className="hint">더보기 → 설정에서 AI를 연결하면 예약 내용을 붙여 넣어 자동으로 채울 수 있어요.</p>;
  return <>
    <label className="fg" style={{ display: 'block' }}><span className="hint">{`${p.hint} 예약번호·결제 정보는 지우고 넣어도 돼요.`}</span><textarea id={'paste_' + p.kind} rows={3} style={{ marginTop: 4 }} /></label>
    <div className="row"><button className="small-btn primary" type="button" data-aifill={p.kind}>AI로 채우기</button><LiveLine tag="span" id={'st_' + p.kind} text={p.msg} /></div>
  </>;
}

export function Radio({ path, val, opts }: { path: string; val: unknown; opts: Opt[] }) {
  return (
    <div className="radio">
      {opts.map(([v, l]) => <button key={String(v)} type="button" data-radio={path} data-val={String(v)} aria-pressed={String(val) === String(v)}>{l}</button>)}
    </div>
  );
}

const Options = ({ opts }: { opts: Opt[] }) => <>{opts.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}</>;
const Sel = ({ pf, val, opts, num }: { pf: string; val: string | number; opts: Opt[]; num?: boolean }) =>
  <select data-pf={pf} data-type={num ? 'num' : undefined} defaultValue={String(val)}><Options opts={opts} /></select>;
export const Inp = ({ pf, val, type = 'text', ...rest }: { pf: string; val: unknown; type?: string; maxLength?: number; placeholder?: string; min?: string; max?: string; step?: string; num?: boolean; style?: CSSProperties }) => {
  const { num, ...attrs } = rest;
  return <input type={type} data-pf={pf} data-type={num ? 'num' : undefined} defaultValue={val == null ? '' : String(val)} {...attrs} />;
};
const Fsec = ({ children, id, className }: { children: ReactNode; id?: string; className?: string }) =>
  <div className={className ? 'fsec ' + className : 'fsec'} id={id}>{children}</div>;

function Party({ type, adults, kids }: Extract<FormPart, { f: 'party' }>) {
  const fam = type === 'family';
  return (
    <Fsec>
      <h3>누구와 가나요?</h3>
      <Radio path="party.type" val={type} opts={[['solo', '혼자'], ['couple', '연인·부부'], ['friends', '친구'], ['family', '가족']]} />
      {(type === 'friends' || fam) && (
        <div className="fg">
          <label>{fam ? '어른 (명)' : '인원 (명)'}<input type="number" data-pf="party.adults" data-type="num" min="1" max="20" defaultValue={String(adults)} /></label>
          {fam && <label>아이 (명)<input type="number" data-pf="party.kids" data-type="num" min="0" max="10" defaultValue={String(kids)} /></label>}
        </div>
      )}
    </Fsec>
  );
}

function Dates({ start, unknown, nights, maxN }: DatesInfo) {
  const ns: Opt[] = Array.from({ length: maxN }, (_, i) => [i + 1, `${i + 1}박 ${i + 2}일`]);
  return (
    <>
      <div className="fg">
        <label>여행 시작일<input type="date" data-pf="startDate" defaultValue={start} disabled={unknown} /></label>
        <label>기간<select data-pf="nights" data-type="num" defaultValue={nights == null ? '' : String(nights)}>
          {nights == null && <option value="" disabled>선택해 주세요</option>}
          <Options opts={ns} />
        </select></label>
      </div>
      <label className="toggle" style={{ margin: '8px 0 0' }}><input type="checkbox" id="dateUnknown" defaultChecked={unknown} /> 날짜는 아직 몰라요 (대략 한 달 뒤로 생각할게요)</label>
      <LiveLine id="st_dates" />
    </>
  );
}

function Trip({ bookedFlight, bookedStay, dates }: Extract<FormPart, { f: 'trip' }>) {
  return (
    <>
      <Fsec>
        <h3>예약 상태</h3>
        <Radio path="bookedFlight" val={bookedFlight} opts={[[true, '교통편 예약함'], [false, '아직 안 했어요']]} />
        <Radio path="bookedStay" val={bookedStay} opts={[[true, '숙소 예약함'], [false, '아직 안 했어요']]} />
        <p className="hint">아직이면 설정을 마친 뒤 예약 도우미가 숙소 동네와 시간대를 추천해요.</p>
      </Fsec>
      <Fsec id="datesSec"><h3>여행 기간</h3><Dates {...dates} /></Fsec>
    </>
  );
}

function Flight(p: Extract<FormPart, { f: 'flight' }>) {
  const car = p.mode === 'car', w = p.word;
  return (
    <>
      {p.notBooked && <p className="hint" style={{ margin: '0 0 8px' }}>아직 예약 전이라면 교통수단만 고르고 시간은 그대로 두세요. 예약 도우미에서 시간대를 추천해요.</p>}
      <Fsec>
        <h3>가는 길, 오는 길</h3>
        <Radio path="mode" val={p.mode} opts={[['flight', '비행기'], ['train', '기차'], ['bus', '버스'], ['car', '자동차']]} />
        <div className="fg">
          <label>가는 날 출발<Inp pf="out.dep" val={p.out.dep} type="time" /></label>
          {!car && <label>{`도착 ${w}`}<Sel pf="out.airport" val={p.out.airport} opts={p.airports} /></label>}
          <label>도착<Inp pf="out.arr" val={p.out.arr} type="time" /></label>
          {!car && <label>편명 (선택)<Inp pf="out.flight" val={p.out.flight} maxLength={12} placeholder="예: KE 123" /></label>}
        </div>
        <div className="fg">
          {!car && <label>{`돌아오는 ${w}`}<Sel pf="back.airport" val={p.back.airport} opts={p.airports} /></label>}
          <label>오는 날 출발<Inp pf="back.dep" val={p.back.dep} type="time" /></label>
          <label>도착<Inp pf="back.arr" val={p.back.arr} type="time" /></label>
          {!car && <label>편명 (선택)<Inp pf="back.flight" val={p.back.flight} maxLength={12} /></label>}
        </div>
        <p className="hint">{`시각은 출발지와 도착지의 현지 시각 그대로 넣어요.${car ? '' : ` 목록에 원하는 ${w}이 없으면 가장 가까운 곳을 고르세요.`}`}</p>
        <span className="hint">여행지 안에서는</span>
        <Radio path="local" val={p.local} opts={[['transit', '대중교통·걷기'], ['car', '자동차']]} />
        {!car && <PasteBox p={p.paste} />}
      </Fsec>
    </>
  );
}

function HomeBox(p: Extract<FormPart, { f: 'homeBox' }>) {
  return (
    <Fsec className="home-box">
      <h3>출발지</h3>
      {p.hasHome
        ? <>
            <p className="hint">{`🏠 ${p.addr || '집'}${p.using ? ' · 출발지로 쓰는 중' : ''}`}</p>
            <div className="row">
              {!p.using && <button className="small-btn primary" type="button" id="homeUse">🏠 집에서 출발</button>}
              {p.kakao.map(([k, l]) => <button key={String(k)} className="small-btn" type="button" data-homeair={String(k)}>{`집→${l} 시간 계산`}</button>)}
            </div>
          </>
        : <p className="hint">더보기 → 설정 → 내 장소에서 집을 등록하면 출발지와 공항까지 시간을 자동으로 채울 수 있어요.</p>}
      {p.msg && <p className="ai-status">{p.msg}</p>}
    </Fsec>
  );
}

function Home(p: Extract<FormPart, { f: 'home' }>) {
  if (p.mode === 'car') return (
    <Fsec>
      <h3>자동차 비용</h3>
      <div className="fg"><label>편도 기름값·통행료 (1인 몫, 원)<Inp pf="home.fare" val={p.fare} type="number" min="0" step="1000" num /></label></div>
      <p className="hint">가는 날과 오는 날 비용에 더해져요.</p>
    </Fsec>
  );
  const w = p.word;
  return (
    <Fsec>
      <h3>{`집에서 ${w}까지`}</h3>
      <div className="fg">
        <label>출발 동네 (선택)<Inp pf="home.area" val={p.area} maxLength={20} placeholder="예: 마포구" /></label>
        <label>{`${w}까지 걸리는 시간 (분)`}<Inp pf="home.min" val={p.min} type="number" min="10" max="240" step="5" num /></label>
        <label>{`${w} 가는 교통비 (1인, 원)`}<Inp pf="home.fare" val={p.fare} type="number" min="0" step="50" num /></label>
        {p.mode === 'flight' && <label>공항 도착<Sel pf="home.byMin" val={p.byMin} opts={p.byMinOpts} num /></label>}
      </div>
      <p className="hint">집 주소는 받지 않아요. 동네 이름은 일정표에 표시만 돼요.</p>
    </Fsec>
  );
}

function Stay(p: Extract<FormPart, { f: 'stay' }>) {
  const first: Opt[] = p.nights.map((l, k) => [k, l]), last: Opt[] = p.nights.map((l, k) => [k + 1, l]);
  return (
    <>
      {p.helper && <div className="row"><button className="small-btn primary" type="button" id="meHelper2">예약 도우미로 동네·숙소 찾기</button></div>}
      <Fsec>
        <h3>숙소</h3>
        <p className="hint">숙소가 바뀌면 숙소를 추가해서 밤을 나눠 주세요. 위치는 가장 가까운 동네를 고르면 돼요.</p>
        {p.stays.map((s, i) => (
          <div className="frow" key={i}>
            <div className="fg">
              <label>이름<Inp pf={`stays.${i}.name`} val={s.name} maxLength={30} /></label>
              <label>동네<Sel pf={`stays.${i}.area`} val={s.area} opts={p.areas} /></label>
              <label>체크인<Inp pf={`stays.${i}.checkin`} val={s.checkin} type="time" /></label>
              <label>체크아웃<Inp pf={`stays.${i}.checkout`} val={s.checkout} type="time" /></label>
              <label>첫 밤<Sel pf={`stays.${i}.from`} val={s.from} opts={first} num /></label>
              <label>마지막 밤<Sel pf={`stays.${i}.to`} val={s.to} opts={last} num /></label>
            </div>
            {p.stays.length > 1 && <div className="row"><button className="small-btn danger" type="button" data-delstay={i}>이 숙소 빼기</button></div>}
          </div>
        ))}
        <div className="row"><button className="small-btn" type="button" data-addstay="1">+ 숙소 추가</button></div>
        <PasteBox p={p.paste} />
      </Fsec>
    </>
  );
}

function Events(p: Extract<FormPart, { f: 'events' }>) {
  const days: Opt[] = p.days.map((l, k) => [k, l]);
  return (
    <Fsec>
      <h3>미리 예약한 일정 (선택)</h3>
      <p className="hint">공연, 투어, 식당 예약처럼 시간이 정해진 일정은 움직이지 않는 블록이 돼요.</p>
      {p.events.map((e, i) => (
        <div className="frow" key={i}>
          <div className="fg">
            <label>이름<Inp pf={`events.${i}.name`} val={e.name} maxLength={30} placeholder="예: 콘서트" /></label>
            <label>날짜<Sel pf={`events.${i}.day`} val={e.day} opts={days} num /></label>
            <label>시작<Inp pf={`events.${i}.start`} val={e.start} type="time" /></label>
            <label>끝<Inp pf={`events.${i}.end`} val={e.end} type="time" /></label>
            <label>동네<Sel pf={`events.${i}.area`} val={e.area} opts={p.areas} /></label>
          </div>
          <div className="row"><button className="small-btn danger" type="button" data-delev={i}>빼기</button></div>
        </div>
      ))}
      <div className="row"><button className="small-btn" type="button" data-addev="1">+ 예약한 일정 추가</button></div>
    </Fsec>
  );
}

function Budget(p: Extract<FormPart, { f: 'budget' }>) {
  return (
    <Fsec>
      <h3>예산 (선택)</h3>
      <div className="fg">
        <label>1인 총예산 (만원)<Inp pf="budgetMan" val={p.man} type="number" min="0" step="10" num placeholder="비우면 계산 안 해요" /></label>
        <label>그중 교통·숙박 (만원)<Inp pf="tripMan" val={p.trip} type="number" min="0" step="5" num placeholder="자동 60%" /></label>
        <label>현지 경비 (만원)<Inp pf="localMan" val={p.local} type="number" min="0" step="5" num placeholder="나머지" /></label>
      </div>
      <p className="hint" id="budgetHint">{p.hint}</p>
    </Fsec>
  );
}

function Dest(p: Extract<FormPart, { f: 'dest' }>) {
  return (
    <Fsec>
      <h3>여행지</h3>
      <label className="fg" style={{ display: 'block' }}><span className="hint">도시나 지역 이름 (국내, 해외 모두 돼요)</span><Inp pf="dest" val={p.dest} maxLength={40} placeholder="예: 오사카, 제주, 파리, 방콕" style={{ marginTop: 4 }} /></label>
      <div className="row"><button className="small-btn" type="button" data-destmode="find">아직 못 정했어요 · 취향으로 추천받기</button></div>
      <div className="row">{p.ai && <LiveButton className="small-btn primary" id="genPack">AI로 여행지 준비하기</LiveButton>}<LiveLine tag="span" id="st_pack" text={p.ready} /></div>
      {p.ai
        ? <p className="hint">AI가 동네, 공항·역, 화폐, 교통비를 정리해요. 여행지를 바꾸면 넣어 둔 블록은 지워져요.</p>
        : <p className="hint">새 여행지 정보는 AI를 연결해야 준비할 수 있어요 (더보기 → 설정). 지금은 장소 없이 블록을 직접 만들어 쓰거나, "예시로 둘러보기"로 도쿄 예시를 볼 수 있어요.</p>}
      {p.rate && <>
        <div className="fg"><label>{`환율: 1 ${p.rate.cur}는 몇 원?`}<input type="number" step="any" min="0" data-pk="rate" defaultValue={String(p.rate.val)} /></label></div>
        <p className="hint">AI가 넣은 대략적인 값이에요. 바꾸면 비용 계산에 바로 반영돼요.</p>
      </>}
    </Fsec>
  );
}

function Day(p: Extract<FormPart, { f: 'day' }>) {
  return (
    <Fsec id="datesSec">
      <h3>언제, 어디서 만나요?</h3>
      <div className="fg">
        <label>날짜<input type="date" data-pf="startDate" defaultValue={p.date} /></label>
        <label>만나는 시간<Inp pf="meet.time" val={p.time} type="time" /></label>
        <label>헤어지는 시간<Inp pf="meet.end" val={p.end} type="time" /></label>
        <label>만나는 동네<Sel pf="meet.area" val={p.area} opts={p.areas} /></label>
      </div>
      <LiveLine id="st_dates" />
    </Fsec>
  );
}

/** One form part. */
export function FormPiece({ part }: { part: FormPart }) {
  switch (part.f) {
    case 'party': return <Party {...part} />;
    case 'trip': return <Trip {...part} />;
    case 'flight': return <Flight {...part} />;
    case 'homeBox': return <HomeBox {...part} />;
    case 'home': return <Home {...part} />;
    case 'stay': return <Stay {...part} />;
    case 'budget': return <Budget {...part} />;
    case 'events': return <Events {...part} />;
    case 'dest': return <Dest {...part} />;
    case 'finder': return <DestFinder {...part} />;
    case 'dates': return <Fsec id="datesSec"><h3>언제 가나요?</h3><Dates {...part.dates} /></Fsec>;
    case 'day': return <Day {...part} />;
  }
}
