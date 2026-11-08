// 설정 → AI·지도 연결 (it used to be keyRow + part of renderSettings in src/js/230-settings.js).
// Keys never come in here: only a masked form (sk-ant-••••••abcd). The box for a new key starts empty,
// and what is typed goes to the old code only when 저장 is pressed (app().settings('keysave', name, key)).
// 보기/숨기기 is this row's own: the typed key stays as it is.
import { useRef, useState } from 'react';
import { app } from '../ui/host';

const go = (n: string, v?: string, v2?: unknown) => app().settings(n, v, v2);
export interface KeyRowInfo {
  k: string;
  name: string;
  sub: string;
  /** what a key looks like (placeholder) */
  ph: string;
  /** masked key, '' when none */
  masked: string;
  /** a check said the key does not work */
  bad: boolean;
  /** message after a check / save */
  msg: string;
  /** 키 받는 법: fixed help text from the app (trusted HTML with links) */
  helpHTML: string;
}

export interface AiKeysSectionProps {
  /** the GitHub app (keys go here), not inside Claude */
  standalone: boolean;
  keys: KeyRowInfo[];
  /** the key row whose box is open */
  editing: string | null;
  models: { heavy: string; light: string; gemini: string };
  hasGemini: boolean;
  /** route parts computed this time */
  routesOk: number;
  /** Google opening hours use this month; null without a Google key */
  hours: { use: number; cap: number; off: string; /** 이번 달 장소 검색(Google) 횟수 */ search: number } | null;
}

function KeyRow({ r, editing }: { r: KeyRowInfo; editing: boolean }) {
  const [show, setShow] = useState(false), box = useRef<HTMLInputElement>(null);
  const msg = r.msg ? <small className="kmsg">{r.msg}</small> : null;
  if (editing) return (
    <div className="krow open">
      <div className="kh"><b>{r.name}</b><small>{r.sub}</small></div>
      <div className="kin">
        <input id="keyIn" ref={box} autoFocus type={show ? 'text' : 'password'} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder={r.ph} defaultValue="" />
        <button className="small-btn" type="button" id="keyShow" onClick={() => { setShow(!show); box.current?.focus() }}>{show ? '숨기기' : '보기'}</button>
      </div>
      <div className="row"><button className="small-btn primary" type="button" data-keysave={r.k} onClick={() => go('keysave', r.k, box.current ? box.current.value : '')}>저장</button><button className="small-btn" type="button" id="keyCancel" onClick={() => go('keycancel')}>취소</button></div>
      <details className="khelp"><summary>키 받는 법</summary><div className="old-part" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: r.helpHTML }} /></details>
      {msg}
    </div>
  );
  return (
    <div className="krow">
      <div className="kh"><b>{r.name}</b><small>{r.masked ? <span className="mono">{r.masked}</span> : r.sub}</small>{msg}</div>
      {r.masked ? <>
        <span className={'mchip ' + (r.bad ? 'warn' : 'ok')}>{r.bad ? '확인 필요' : '연결됨'}</span>
        <button className="small-btn" type="button" data-keytest={r.k} onClick={() => go('keytest', r.k)}>확인</button>
        <button className="small-btn" type="button" data-keyedit={r.k} onClick={() => go('keyedit', r.k)}>바꾸기</button>
        <button className="small-btn danger" type="button" data-keydel={r.k} onClick={() => go('keydel', r.k)}>삭제</button>
      </> : <button className="small-btn primary" type="button" data-keyedit={r.k} onClick={() => go('keyedit', r.k)}>연결</button>}
    </div>
  );
}

export function AiKeysSection(p: AiKeysSectionProps) {
  if (!p.standalone) return <p className="hint">Claude 안에서는 AI가 자동으로 연결돼요. 지도 키는 깃허브 앱 버전에서 넣을 수 있어요.</p>;
  const m = p.models, heavy = useRef<HTMLInputElement>(null), light = useRef<HTMLInputElement>(null), gem = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="mgroup">{p.keys.map(r => <KeyRow key={r.k + (p.editing === r.k ? ':open' : '')} r={r} editing={p.editing === r.k} />)}</div>
      <p className="hint">{`무거운 작업(일정 짜기, 여행지 준비)은 Claude ${m.heavy}, 가벼운 작업(키워드, 예약 내용 읽기)은 ${p.hasGemini ? 'Gemini Flash' : 'Claude ' + m.light}가 맡아요. 경로는 해외는 Google로 계산하고(한 번 계산한 구간은 이 기기에 저장해 다시 부르지 않아요), 국내는 거리로 어림하고 길찾기는 카카오맵으로 열어요${p.routesOk ? ` (이번에 ${p.routesOk}구간 계산)` : ''}.`}</p>
      {p.hours && <p className="hint" id="placeUse">{`장소 검색: 이번 달 Google에서 ${p.hours.search}회 찾았어요 (이름·주소·위치만 받아요). 국내 여행은 카카오로 찾아요.`}</p>}
      {p.hours && <p className="hint">{`영업시간: 해외 장소는 Google에서 실제 영업시간을 확인해요 (이번 달 ${p.hours.use}/${p.hours.cap}곳, 월 1,000곳까지 무료). 국내 장소는 카카오가 영업시간을 주지 않아 AI 추정이에요.`}{p.hours.off && <>{' '}<b className="wtxt">{p.hours.off}</b></>}</p>}
      <details className="khelp">
        <summary>고급: 모델 이름</summary>
        <div className="fg">
          <label>무거운 작업<input id="mHeavy" ref={heavy} defaultValue={m.heavy} /></label>
          <label>가벼운 작업 (Claude)<input id="mLight" ref={light} defaultValue={m.light} /></label>
          <label>Gemini<input id="mGem" ref={gem} defaultValue={m.gemini} /></label>
        </div>
        <div className="row"><button className="small-btn" type="button" id="mSave" onClick={() => go('models', '', { heavy: heavy.current?.value, light: light.current?.value, gemini: gem.current?.value })}>모델 저장</button></div>
      </details>
    </>
  );
}
