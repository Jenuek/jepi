// 날씨: 날짜 버튼 아래의 아이콘·기온(WxChip), 고른 날의 날씨 줄과 펼친 내용(WxBar #wxBar), 준비하기의 날씨 칸(WxChecks).
// 값은 app/data/weather.ts가 들고 있고, 이 화면들이 스스로 읽어요(바뀌면 알려 줘요). 예전 코드는 날짜(iso)만 넘겨요.
import { useEffect, useReducer, useState, type ReactElement } from 'react';
import * as weather from '../data/weather';
import type { Wx } from '../data/weather';

/** 날씨가 바뀔 때 다시 그려요 */
function useWx(iso: string): Wx | null {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => weather.on(bump), []);
  return iso ? weather.get(iso) : null;
}

/** 날짜 버튼 안의 한 줄: ☀️ 16°/9° (평년은 흐리게) */
export function WxChip({ iso }: { iso: string }) {
  const w = useWx(iso);
  if (!w) return null;
  const rainy = weather.needsUmbrella(w);
  return <em className={`wx-chip${w.kind === 'normal' ? ' normal' : ''}${rainy ? ' rainy' : ''}`}><i aria-hidden="true">{w.icon}</i>{weather.degTxt(w)}</em>;
}

const KIND_TXT: Record<string, string> = { forecast: '예보', past: '그날 날씨', normal: '평년' };

export function WxBar({ iso }: { iso: string }) {
  const w = useWx(iso);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [iso]);   // 다른 날을 열면 늘 간단하게 시작해요
  if (!w) return null;
  const rainy = weather.needsUmbrella(w);
  const rainTxt = w.kind === 'normal' ? (rainy ? `비 온 해 ${w.rainyYears}/${w.years}` : '') : (w.rain != null && w.rain >= 60 ? `비 ${w.rain}%` : '');
  return (
    <div className={`wx-bar${open ? ' open' : ''}`}>
      <button type="button" className="wx-head" id="wxToggle" aria-expanded={open} aria-controls="wxDetail" onClick={() => setOpen(o => !o)}>
        <span className="wx-ic" aria-hidden="true">{w.icon}</span>
        <span className="wx-main"><b className="mono">{w.hi}° / {w.lo}°</b>{rainTxt && <span className="wx-rain">{rainTxt}</span>}{w.kind === 'normal' && <span className="wx-tag">평년</span>}</span>
        <span className="wx-more">{open ? '접기' : '자세히'}</span>
        <span className="wx-ar" aria-hidden="true">▾</span>
      </button>
      {open && <div className="wx-detail" id="wxDetail">
        <p className="wx-sum"><b>{w.text}</b></p>
        {w.hours && w.hours.length > 0 && <div className="wx-hours">{w.hours.map(h => <span key={h[0]}>{h[0]}<i aria-hidden="true">{h[1]}</i>{h[2]}°</span>)}</div>}
        <p className="wx-meta">
          {w.kind === 'forecast' && <>비 올 확률 <b>{w.rain ?? 0}%</b>{w.feel != null && <> · 체감 <b>{w.feel}°</b></>}</>}
          {w.kind === 'past' && <>이미 지난 날의 실제 날씨예요.</>}
          {w.kind === 'normal' && <>아직 예보가 나오지 않았어요. 지난 {w.years}년 같은 날의 평균이에요{w.rainyYears ? ` (그중 ${w.rainyYears}년은 비가 왔어요)` : ''}. 여행 16일 전부터 실제 예보로 바뀌어요.</>}
        </p>
        <p className="wx-src">{KIND_TXT[w.kind]} · Open-Meteo</p>
      </div>}
    </div>
  );
}

/** 준비하기의 날씨 칸: 여행 날짜의 날씨 요약과 날씨에 맞춘 준비물 (체크는 다른 준비물과 같은 길로 저장) */
export interface WxCheckRow { id: string; t: string; sub?: string; on: boolean }
export function WxChecks({ isos, done, Row }: { isos: string[]; done: Record<string, boolean>; Row: (p: { r: WxCheckRow }) => ReactElement }) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => weather.on(bump), []);
  const ws = isos.map(i => weather.get(i)).filter((x): x is Wx => !!x);
  if (!ws.length) return null;
  const hi = Math.max(...ws.map(w => w.hi)), lo = Math.min(...ws.map(w => w.lo));
  const wet = ws.filter(weather.needsUmbrella), cold = lo <= 10, hot = hi >= 28, big = hi - lo >= 10;
  const normal = ws.every(w => w.kind === 'normal');
  const rows: WxCheckRow[] = [];
  const add = (id: string, t: string, sub?: string) => rows.push({ id, t, sub, on: !!done[id] });
  if (wet.length) add('wx_umbrella', '접이식 우산', `${wet.map(w => `${+w.iso.slice(5, 7)}/${+w.iso.slice(8, 10)}`).join(', ')}에 비 소식이 있어요`);
  if (cold) add('wx_coat', '따뜻한 겉옷', `아침저녁은 ${lo}°까지 내려가요`);
  else if (big) add('wx_layer', '얇은 겉옷 (아침저녁용)', `하루 안에 ${lo}°~${hi}°로 차이가 커요`);
  if (hot) add('wx_sun', '선크림·모자·물', `낮에 ${hi}°까지 올라가요`);
  if (wet.length) add('wx_shoes', '방수되는 신발 또는 신발 커버');
  return <div className="check-group" id="wxChecks">
    <h3>날씨</h3>
    <p className="now-hint" style={{ margin: '0 0 6px' }}>{normal ? '아직 예보 전이라 지난 3년 평균이에요. ' : ''}낮 {hi}° · 아침저녁 {lo}°{wet.length ? ` · 비 오는 날 ${wet.length}일` : ' · 비 소식은 없어요'}</p>
    {rows.map(r => <Row key={r.id} r={r} />)}
  </div>;
}
