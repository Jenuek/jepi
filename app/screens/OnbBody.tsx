// 처음 설정 (#onbBody): the body of the first-setup sheet (it used to be renderOnb's innerHTML in src/js/030-forms.js).
// The sheet around it (#onb: title, 다음/건너뛰기 buttons) is still old fixed HTML in body.html.
// The body is a list of parts: shared forms (TripForms.tsx), the parts only this sheet has (below, OnbTalk, OnbFinder).
// Drawn fresh on every redraw (rev), like before: the old code changes the draft, then redraws.
import { Fragment } from 'react';
import { FormPiece, type FormPart, type Opt } from './TripForms';
import { LiveButton, LiveChip, LiveLine } from '../ui/live';
import { Talk, type TalkPart } from './OnbTalk';
import { ImportFile } from './ImportFile';
import { app } from '../ui/host';

export type OnbPart =
  | FormPart
  | { f: 'jp'; keyBox: boolean; keyHelpHTML: string; importBox: boolean }
  | { f: 'chooser'; ai: boolean }
  | TalkPart
  | { f: 'banner'; purpose: string; next: string }
  | { f: 'quick'; dest: string; dayOnly: boolean; when: string; date: string; len: string; slot: string; slots: Opt[]; kws: { k: string; on: boolean }[]; party: string };

export interface OnbBodyProps {
  parts: OnbPart[];
  rev: number;
}

const Chips = ({ name, val, opts }: { name: string; val: string; opts: Opt[] }) => (
  <div className="radio">{opts.map(([v, l]) => <button key={String(v)} type="button" data-q={name} data-qv={String(v)} aria-pressed={String(val) === String(v)} onClick={() => app().form('q', String(v), { q: name })}>{l}</button>)}</div>
);

function JP(p: Extract<OnbPart, { f: 'jp' }>) {
  return (
    <>
      {p.keyBox && (
        <div className="fsec">
          <h3>AI 연결하기 (처음 한 번)</h3>
          <p className="hint">AI가 여행지 준비, 장소 추천, 일정 짜기를 해요. 키는 이 기기에만 저장돼요. 지금 건너뛰고 나중에 더보기 → 설정에서 넣어도 돼요.</p>
          <div className="kin"><input id="onbKey_anthropic" type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="Claude API 키 (sk-ant-...)" /><button className="small-btn primary" type="button" data-onbkey="anthropic" onClick={e => app().form('onbkey', 'anthropic', { key: (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.value || '' })}>연결</button></div>
          <details className="khelp"><summary>키 받는 법</summary><div className="old-part" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: p.keyHelpHTML }} /></details>
        </div>
      )}
      {p.importBox && (
        <div className="fsec import-box">
          <h3>Claude에서 만든 계획이 있나요?</h3>
          <p className="hint">Claude에서 "내 계획 → 백업 파일 받기"로 저장한 파일을 불러오면 그대로 이어서 쓸 수 있어요.</p>
          <ImportFile />
          <LiveLine id="st_import" />
        </div>
      )}
      <div className="choose jpc">
        <button type="button" className="choose-btn jbtn" data-pickjp="J" onClick={() => app().form('pickjp', 'J')}><span className="big">J</span><b>계획파예요</b><small>미리 짜 두면 마음이 편해요. 시간·동선·예산까지 꼼꼼하게.</small></button>
        <button type="button" className="choose-btn pbtn" data-pickjp="P" onClick={() => app().form('pickjp', 'P')}><span className="big">P</span><b>즉흥파예요</b><small>일단 가 보고 정해요. 어디·언제·누구랑만 고르면 끝.</small></button>
      </div>
      <p className="hint" style={{ textAlign: 'center' }}>언제든 위의 J ⇄ P 스위치로 바꿀 수 있어요.</p>
    </>
  );
}

function Chooser({ ai }: { ai: boolean }) {
  return (
    <div className="choose">
      <button type="button" className="choose-btn" data-startmode="quick" onClick={e => app().form('startmode', 'quick', { inChoose: !!e.currentTarget.closest('.choose') })}><b>가고 싶은 곳이 있어요</b><small>여행지·날짜·동행만 정하고 바로 시작해요</small></button>
      <button type="button" className="choose-btn" data-startmode="talk" disabled={!ai} onClick={e => app().form('startmode', 'talk', { inChoose: !!e.currentTarget.closest('.choose') })}><b>아직 막연해요 · 이야기하면서 정할래요</b><small>{ai ? '질문 몇 개로 이번 여행의 방향을 함께 찾아요' : 'AI를 연결하면 쓸 수 있어요'}</small></button>
      <button type="button" className="choose-btn" data-startmode="quick" data-destmode="find" onClick={() => app().form('startmode', 'quick', { destmode: 'find' })}><b>여행지만 못 정했어요</b><small>취향과 조건으로 여행지를 추천받아요</small></button>
      <button type="button" className="choose-btn" data-startmode="day" onClick={e => app().form('startmode', 'day', { inChoose: !!e.currentTarget.closest('.choose') })}><b>☀️ 하루 코스 짜기</b><small>친구랑 혹은 혼자, 하루 놀 동네 코스를 가볍게 짜요</small></button>
    </div>
  );
}

function Quick(p: Extract<OnbPart, { f: 'quick' }>) {
  return (
    <div className="fsec quick-start">
      <label className="q-field"><span>어디로?</span><input type="text" data-pf="dest" defaultValue={p.dest} maxLength={40} placeholder="예: 성수동, 부산, 오사카" /></label>
      <div className="q-field"><span>언제?</span><Chips name="when" val={p.when} opts={[['today', '오늘'], ['tomorrow', '내일'], ['weekend', '이번 주말'], ['pick', '날짜 고르기']]} />
        {p.when === 'pick' && <input type="date" data-pf="startDate" defaultValue={p.date} style={{ marginTop: 6 }} />}</div>
      {!p.dayOnly && <div className="q-field"><span>얼마나?</span><Chips name="len" val={p.len} opts={[['0', '하루'], ['1', '1박 2일'], ['2', '2박 3일'], ['3', '3박 4일'], ['5', '더 길게']]} /></div>}
      {p.len === '0' && <div className="q-field"><span>몇 시쯤?</span><Chips name="slot" val={p.slot} opts={p.slots} /></div>}
      <div className="q-field"><span>끌리는 것 <small className="hint">(선택, 안 골라도 돼요)</small></span>
        <div className="chips">{p.kws.map(x => <LiveChip key={x.k} k={x.k} on={x.on} />)}</div></div>
      <div className="q-field"><span>누구랑?</span><Chips name="party" val={p.party} opts={[['solo', '혼자'], ['friends', '친구'], ['couple', '연인'], ['family', '가족']]} /></div>
      <div className="row"><LiveButton className="dice-go" id="quickStart" onClick={() => app().form('quickStart')}>{p.len === '0' ? '하루 코스 시작하기' : '🎲 시작하기'}</LiveButton><LiveLine tag="span" id="st_pack" /></div>
      <p className="hint">나머지는 필요할 때 물어볼게요.</p>
    </div>
  );
}

function Piece({ part }: { part: OnbPart }) {
  switch (part.f) {
    case 'jp': return <JP {...part} />;
    case 'chooser': return <Chooser ai={part.ai} />;
    case 'banner': return <div className="t-banner"><span>{`🧭 ${part.purpose || '이번 여행의 방향'}`}</span><small>{part.next}</small></div>;
    case 'quick': return <Quick {...part} />;
    case 'talk': return <Talk {...part} />;
    default: return <FormPiece part={part} />;
  }
}

export function OnbBody({ parts, rev }: OnbBodyProps) {
  return (
    <Fragment key={rev}>
      {parts.map((x, i) => <Piece key={i} part={x} />)}
      <LiveLine id="st_onb" />
    </Fragment>
  );
}
