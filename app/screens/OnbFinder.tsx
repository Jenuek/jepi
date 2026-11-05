// 여행지만 못 정했어요 → 여행지 추천받기 (it used to be fDestFinder + destCard in src/js/120-destination-finder.js).
// The old code asks the AI, keeps the cards and redraws; the 추천받기 buttons and their status lines are Live (app/ui/live.tsx).
import { Radio, Inp, type Opt } from './TripForms';
import { StyleMore } from './TasteStyle';
import { LiveButton, LiveChip, LiveLine } from '../ui/live';
import { app } from '../ui/host';

export interface DestCard { city: string; country: string; why: string; fit: string; season: string; highlights: string[]; flight: string; budget: string; caution: string }

export interface FinderPart {
  f: 'finder';
  ai: boolean;
  party: string; reach: string; budget: string; budgetMan: number | string;
  nights: number;
  chips: { k: string; on: boolean }[];
  styleRows: [string, string, Opt[]][]; style: Record<string, string>; styleOpen: boolean;
  want: string;
  recs: DestCard[] | null;
  asked: DestCard[];
}

function Card({ d, label, pick, i, id }: { d: DestCard; label: string; pick: 'dest' | 'ask'; i: number; id?: string }) {
  const at = pick === 'dest' ? { 'data-pickdest': i } : { 'data-pickask': i };
  return (
    <div className="fsec area-card" id={id}>
      <h3>{`${label}${d.city}${d.country ? ' ' : ''}`}{d.country && <span className="hint">{`· ${d.country}`}</span>}</h3>
      <p>{d.why}</p>
      {d.fit && <p className="hint">{`🎯 ${d.fit}`}</p>}
      {d.season && <p className="hint">{`🗓 ${d.season}`}</p>}
      {d.highlights.length > 0 && <p className="hint">{d.highlights.join(' · ')}</p>}
      <p className="mono hint">{`${d.flight || ''}${d.budget ? ` · ${d.budget}` : ''}`}</p>
      {d.caution && <p className="hint">{`주의: ${d.caution}`}</p>}
      <div className="row"><button className="small-btn primary" type="button" {...at} onClick={() => app().form(pick === 'dest' ? 'pickdest' : 'pickask', String(i))}>이 여행지로 정하기</button></div>
    </div>
  );
}

export function DestFinder(p: FinderPart) {
  const n = p.nights;
  return (
    <>
      <div className="fsec">
        <h3>여행지 추천받기</h3>
        <p className="hint">조건과 취향을 고르면 AI가 이 날짜에 가기 좋은 여행지 5곳을 추천해요.</p>
        <span className="hint">누구와</span><Radio path="party.type" val={p.party} opts={[['solo', '혼자'], ['couple', '연인·부부'], ['friends', '친구'], ['family', '가족']]} />
        <span className="hint">어디까지</span><Radio path="reach" val={p.reach} opts={[['domestic', '국내'], ['near', '가까운 해외 (3시간 안쪽)'], ['far', '먼 곳도 좋아요']]} />
        {p.reach === 'far' && n <= 4 && <p className="hint" style={{ margin: '0 0 6px' }}>{`${n}박 ${n + 1}일이면 유럽·미주는 오가는 데만 하루씩 걸려요. 먼 곳 추천에는 적당한 기간도 같이 알려 줘요.`}</p>}
        <span className="hint">예산</span><Radio path="budget" val={p.budget} opts={[['low', '알뜰하게'], ['mid', '보통'], ['high', '여유 있게']]} />
        <div className="fg"><label>1인 총예산 (만원, 선택)<Inp pf="budgetMan" val={p.budgetMan} type="number" min="0" step="10" num placeholder="예: 100" /></label></div>
        <span className="hint">끌리는 것 (여러 개)</span><div className="chips">{p.chips.map(x => <LiveChip key={x.k} k={x.k} on={x.on} />)}</div>
        <StyleMore rows={p.styleRows} style={p.style} open={p.styleOpen} />
        <label className="fg" style={{ display: 'block' }}><span className="hint">원하는 여행을 자유롭게 (선택)</span><textarea id="destWant" rows={2} maxLength={300} style={{ marginTop: 4 }} placeholder="예: 혼자 사색하며 걷고 싶어요, 바다 보며 쉬기, 맛집 많은 도시" defaultValue={p.want} /></label>
        <div className="row">{p.ai && <LiveButton className="small-btn primary" id="destRecBtn" onClick={() => app().form('destRec')}>AI로 여행지 추천받기</LiveButton>}<button className="small-btn" type="button" data-destmode="" onClick={() => app().form('destmode', '')}>직접 입력할게요</button><LiveLine tag="span" id="st_dest" /></div>
        {!p.ai && <p className="hint">여행지 추천은 AI를 연결하면 쓸 수 있어요 (더보기 → 설정).</p>}
      </div>
      {p.recs && <>
        {p.recs.map((d, i) => <Card key={i} d={d} label={`${i + 1}. `} pick="dest" i={i} />)}
        <div className="row" style={{ marginBottom: 10 }}><LiveButton className="small-btn" id="destMoreBtn" onClick={() => app().form('destMore')}>다른 곳 더 보기</LiveButton><LiveLine tag="span" id="st_more" /></div>
      </>}
      {p.ai && <>
        <div className="fsec">
          <h3>궁금한 곳이 따로 있다면</h3>
          <div className="kw-add"><input id="destAsk" maxLength={40} placeholder="예: 아이슬란드" autoComplete="off" /><LiveButton className="small-btn primary" id="destAskBtn" onClick={e => app().form('destAsk', (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.value || '')}>나한테 맞는지 보기</LiveButton></div>
          <p className="hint">추천 목록과 별개로, 조건과 취향에 비춰 좋은 점과 아쉬운 점을 알려 줘요.</p>
          <LiveLine id="st_ask" />
        </div>
        {p.asked.map((d, i) => <Card key={'a' + i} d={d} label="🔍 물어본 곳 · " pick="ask" i={i} id={'asked-' + i} />)}
      </>}
    </>
  );
}
