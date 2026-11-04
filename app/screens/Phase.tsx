// 여행 단계 띠 (#phase, above the 일정표): 여행 전 D-day·남은 준비 / 여행 중 지금·다음 일정·안내 시작 / 여행 뒤 새 계획.
// It used to be renderPhase in src/js/250-phase-strip.js; the old code still shows/hides #phase.
export type PhaseProps =
  | { s: 'none' }
  | { s: 'now'; cur: null | { name: string; end: string }; next: null | { time: string; name: string; travel: string; nav: string }; todayDay: number | null }
  | { s: 'before'; dd: number; warns: number; prepLeft: number; miss: string[] }
  | { s: 'after' };

export function Phase(p: PhaseProps) {
  if (p.s === 'none') return null;
  if (p.s === 'after') return <div className="ph-after"><span>여행 어땠어요?</span><button className="ph-chip" data-tab="plans">새 계획 만들기</button></div>;
  if (p.s === 'before') {
    const done = !p.warns && !p.prepLeft && !p.miss.length;
    return <button className="ph-before" data-tab="check"><b className="mono">{`D-${p.dd}`}</b>{p.warns > 0 && <span className="warn">{`경고 ${p.warns}`}</span>}{p.prepLeft > 0 && <span>{`남은 준비 ${p.prepLeft}`}</span>}{p.miss.map((x, i) => <span key={i} className="warn">{x}</span>)}{done && <span>준비 끝!</span>}</button>;
  }
  return <>
    <div className="ph-now">
      {p.cur && <span><small>지금</small> <b>{p.cur.name}</b> <span className="mono">{`~${p.cur.end}`}</span></span>}
      {p.next ? <>
        <span><small>다음</small> <b className="mono">{p.next.time}</b> <b>{p.next.name}</b>{p.next.travel && <>{' '}<span className="mono">{p.next.travel}</span></>}</span>
        {p.next.nav && <a className="small-btn primary" href={p.next.nav} target="_blank" rel="noopener">안내 시작</a>}
      </> : <span>오늘 일정은 여기까지예요. 푹 쉬세요!</span>}
    </div>
    {p.todayDay != null && <button className="ph-chip" data-day={p.todayDay}>{`오늘(Day ${p.todayDay + 1}) 보기`}</button>}
  </>;
}
