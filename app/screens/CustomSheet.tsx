// 직접 블록 만들기 / 블록 정보 수정 (#sheet). It used to be openCustom in src/js/040-manual-blocks.js.
// The fields are read by the old code when the form is sent (ids cf…). While a new name is typed, the old code
// passes places that already exist (dup) and the sheet is drawn again with the same rev, so typed values stay.
import { Fragment } from 'react';

type Opt = [value: string | number, label: string];

export interface CustomSheetProps {
  edit: string;
  dayLabel: string;
  name: string; area: string; cat: string; dur: number; cost: number | string; memo: string; tags: string; drop: boolean;
  /** sharing with other travelers is possible: its box and whether it is on */
  share: null | boolean;
  start: string;
  areas: Opt[]; cats: Opt[]; durs: Opt[];
  currency: string;
  /** places that already exist with a similar name (null: not typed yet) */
  dup: null | { id: string; name: string; sub: string }[];
  rev: number;
}

const Sel = ({ id, val, opts }: { id: string; val: string | number; opts: Opt[] }) =>
  <select id={id} defaultValue={String(val)}>{opts.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}</select>;

export function CustomSheet(p: CustomSheetProps) {
  const edit = !!p.edit;
  return (
    <Fragment key={p.rev}>
      <h3>{edit ? '블록 정보 수정' : '직접 블록 만들기'}</h3>
      <div className="when">{edit ? '바꾼 내용은 이 블록이 들어간 모든 날에 반영돼요.' : `${p.dayLabel} 일정에 넣어요.`}</div>
      <form id="customForm" data-edit={p.edit} className="fsec" style={{ marginTop: 12 }}>
        <div className="fg">
          <label>이름<input id="cfName" required maxLength={40} defaultValue={p.name} placeholder="예: 친구가 추천한 카페" /></label>
          <label>동네<Sel id="cfArea" val={p.area} opts={p.areas} /></label>
          <label>종류<Sel id="cfCat" val={p.cat} opts={p.cats} /></label>
          {!edit && <label>시작<input id="cfStart" type="time" defaultValue={p.start} /></label>}
          <label>머무는 시간<Sel id="cfDur" val={p.dur} opts={p.durs} /></label>
          <label>{`1인 예상 비용 (${p.currency})`}<input id="cfCost" type="number" min="0" step="any" defaultValue={String(p.cost)} /></label>
        </div>
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
        <div className="row"><button className="small-btn primary" type="submit">{edit ? '저장' : '일정에 넣기'}</button><button className="small-btn" type="button" data-close="1">취소</button></div>
      </form>
      <p className="hint">위치는 고른 동네의 중심으로 잡아서 이동 시간을 계산해요. 영업시간은 확인하지 않으니 직접 챙겨 주세요.</p>
    </Fragment>
  );
}
