// 직접 블록 만들기 / 블록 정보 수정 (#sheet). It used to be openCustom in src/js/040-manual-blocks.js.
// The fields are read by the old code when the form is sent (ids cf…). While a new name is typed, the old code
// passes places that already exist (dup) and the sheet is drawn again with the same rev, so typed values stay.
import { Fragment, useState } from 'react';
import * as gplaces from '../data/gplaces';
import * as places from '../data/places';

type Opt = [value: string | number, label: string];

export interface CustomSheetProps {
  edit: string;
  /** P모드 "직접 적어 담기": make a place for 내 카드 only (no time, not put into the day) */
  card?: boolean;
  dayLabel: string;
  name: string; area: string; cat: string; dur: number; cost: number | string; memo: string; tags: string; drop: boolean;
  /** sharing with other travelers is possible: its box and whether it is on */
  share: null | boolean;
  start: string;
  areas: Opt[]; cats: Opt[]; durs: Opt[];
  currency: string;
  /** 위치 찾기로 이미 고른 곳 (고치는 중일 때): 좌표·주소·장소 ID */
  loc: null | { ll: [number, number]; addr: string; gid: string };
  /** places that already exist with a similar name (null: not typed yet) */
  dup: null | { id: string; name: string; sub: string }[];
  rev: number;
}

/** 위치 찾기: 이름이나 주소로 찾아서 고르면 좌표·주소를 저장하고 동네는 가장 가까운 곳으로 (값은 안 보이는 칸 cfLat·cfLng·cfAddr·cfGid로 폼에 실려요) */
function LocFinder({ loc, onPick }: { loc: { ll: [number, number]; addr: string; gid: string } | null; onPick: (name: string, f: { ll: [number, number]; addr: string; gid: string }) => string }) {
  const prov = gplaces.provider();
  const [q, setQ] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [hits, setHits] = useState<gplaces.Found[]>([]), [got, setGot] = useState(loc);
  const go = async () => {
    if (!q.trim() || busy) return; setBusy(true); setMsg('찾는 중…'); setHits([]);
    try { const r = await gplaces.search(q, { center: places.cityLL(), radius: 30000 }); setHits(r); setMsg(r.length ? '맞는 곳을 눌러 주세요.' : '찾지 못했어요. 이름이나 주소를 다르게 적어 보세요.') }
    catch (e) { setMsg((e as Error).message || '찾지 못했어요') }
    setBusy(false);
  };
  const pick = (h: gplaces.Found) => { const f = { ll: h.ll, addr: h.addr, gid: h.gid }; setGot(f); setHits([]); setMsg(onPick(h.name, f)) };
  return (
    <div className="fg loc-find" id="cfLocBox" style={{ display: 'block', marginBottom: 8 }}>
      <span className="hint">위치 찾기 (선택)</span>
      {prov ? (
        <div className="row" style={{ marginTop: 4 }}>
          <input id="cfLoc" value={q} maxLength={60} placeholder="가게 이름이나 주소" autoComplete="off" onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); go() } }} />
          <button className="small-btn" type="button" id="cfLocGo" disabled={busy} onClick={go}>{busy ? '찾는 중…' : '찾기'}</button>
        </div>
      ) : <p className="hint" style={{ margin: '4px 0 0' }}>설정에서 Google 지도 키(해외)나 카카오 지도 키(국내)를 연결하면 이름이나 주소로 위치를 찾을 수 있어요.</p>}
      {msg && <p className="hint" id="cfLocMsg" style={{ margin: '4px 0 0' }}>{msg}</p>}
      {hits.length > 0 && <div id="cfLocHits">{hits.map((h, i) => <button key={i} type="button" className="dup-pick" data-locpick={i} onClick={() => pick(h)}><b>{h.name}</b><span className="hint">{h.addr}</span></button>)}</div>}
      {got && <p className="hint" id="cfLocSet" style={{ margin: '4px 0 0' }}>{'📍 ' + (got.addr || `${got.ll[0].toFixed(4)}, ${got.ll[1].toFixed(4)}`)}</p>}
      <input type="hidden" id="cfLat" value={got ? String(got.ll[0]) : ''} readOnly />
      <input type="hidden" id="cfLng" value={got ? String(got.ll[1]) : ''} readOnly />
      <input type="hidden" id="cfAddr" value={got ? got.addr : ''} readOnly />
      <input type="hidden" id="cfGid" value={got ? got.gid : ''} readOnly />
    </div>
  );
}

const Sel = ({ id, val, opts }: { id: string; val: string | number; opts: Opt[] }) =>
  <select id={id} defaultValue={String(val)}>{opts.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}</select>;

export function CustomSheet(p: CustomSheetProps) {
  return <CustomBody key={p.rev} {...p} />;
}

function CustomBody(p: CustomSheetProps) {
  const edit = !!p.edit;
  const [area, setArea] = useState(p.area), [located, setLocated] = useState(!!p.loc);
  // 고른 곳의 동네를 가장 가까운 곳으로, 이름 칸이 비어 있으면 찾은 이름으로. 알려 줄 글을 돌려줘요
  const picked = (found: string, f: { ll: [number, number] }): string => {
    const ak = places.nearestArea(f.ll); setLocated(true);
    const nm = document.getElementById('cfName') as HTMLInputElement | null; if (nm && !nm.value.trim()) nm.value = found;
    if (ak && places.AREAS[ak]) { setArea(ak); return `"${found}" 위치로 정했어요 · 동네는 ${places.AREAS[ak][0]}로 맞췄어요`; }
    return `"${found}" 위치로 정했어요`;
  };
  return (
    <Fragment>
      <h3>{edit ? '블록 정보 수정' : p.card ? '내 카드 직접 만들기' : '직접 블록 만들기'}</h3>
      <div className="when">{edit ? '바꾼 내용은 이 블록이 들어간 모든 날에 반영돼요.' : p.card ? '가고 싶은 곳 이름만 적어도 카드가 돼요. 시간은 그날 주사위로 정해요.' : `${p.dayLabel} 일정에 넣어요.`}</div>
      <form id="customForm" data-edit={p.edit} data-card={p.card ? '1' : undefined} className="fsec" style={{ marginTop: 12 }}>
        <div className="fg">
          <label>이름<input id="cfName" required maxLength={40} defaultValue={p.name} placeholder="예: 친구가 추천한 카페" /></label>
          <label>동네<select id="cfArea" value={area} onChange={e => setArea(e.target.value)}>{p.areas.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}</select></label>
          <label>종류<Sel id="cfCat" val={p.cat} opts={p.cats} /></label>
          {!edit && !p.card && <label>시작<input id="cfStart" type="time" defaultValue={p.start} /></label>}
          <label>머무는 시간<Sel id="cfDur" val={p.dur} opts={p.durs} /></label>
          <label>{`1인 예상 비용 (${p.currency})`}<input id="cfCost" type="number" min="0" step="any" defaultValue={String(p.cost)} /></label>
        </div>
        <LocFinder loc={p.loc} onPick={picked} />
        {p.dup && (
          <div id="cfDup" className="dup-suggest">
            {p.dup.length > 0 && <>
              <p className="hint" style={{ margin: '6px 0 4px' }}>이미 있는 장소예요. 같은 곳이면 이걸 쓰세요.</p>
              {p.dup.map(d => <button key={d.id} type="button" className="dup-pick" data-dupuse={d.id}><b>{d.name}</b><span className="hint">{d.sub}</span></button>)}
            </>}
          </div>
        )}
        <label className="fg" style={{ display: 'block' }}><span className="hint">메모</span><textarea id="cfMemo" rows={2} maxLength={200} style={{ marginTop: 4 }} defaultValue={p.memo} /></label>
        <label className="fg" style={{ display: 'block' }}><span className="hint">키워드 (쉼표로 구분, 선택)</span><input id="cfTags" maxLength={80} defaultValue={p.tags} style={{ marginTop: 4 }} /></label>
        <label className="toggle"><input type="checkbox" id="cfDrop" defaultChecked={p.drop} /> 짐을 맡기는 곳이에요 (짐 보관함, 숙소 등)</label>
        {p.share != null && <label className="toggle"><input type="checkbox" id="cfShare" defaultChecked={p.share} /> 다른 여행자에게도 이 장소 추천하기 (이름·동네·메모가 공유돼요)</label>}
        <div className="row"><button className="small-btn primary" type="submit">{edit ? '저장' : p.card ? '♥ 내 카드에 담기' : '일정에 넣기'}</button><button className="small-btn" type="button" data-close="1">취소</button></div>
      </form>
      <p className="hint">{located ? '찾은 위치로 이동 시간을 계산해요.' : '위치를 찾지 않으면 고른 동네의 중심으로 잡아서 이동 시간을 계산해요.'} 영업시간은 확인하지 않으니 직접 챙겨 주세요.</p>
    </Fragment>
  );
}
