// 설정 → 내 장소 (it used to be mypHTML in src/js/270-my-places.js). Kept only on this device.
// Buttons keep their data-myp* / id names: the old code finds the location and saves.
export interface MyPlace {
  id: string;
  name: string;
  /** [lat, lng] or null when not set */
  ll: [number, number] | null;
  addr: string;
}

export interface MyPlacesSectionProps {
  places: MyPlace[];
  /** the place being edited, or null */
  editing: string | null;
  msg: string;
  /** address search results (for the place being edited) */
  hits: { name: string; addr: string }[];
  /** Kakao key connected: address search is possible */
  hasKakao: boolean;
}

const fixed = (id: string) => id === 'home' || id === 'work';
const icon = (id: string) => (id === 'home' ? '🏠 ' : id === 'work' ? '🏢 ' : '📍 ');

function Pin({ x }: { x: MyPlace }) {
  return x.ll ? <small className="mono">{x.addr || `${x.ll[0].toFixed(4)}, ${x.ll[1].toFixed(4)}`}</small> : <small>아직 등록 안 함</small>;
}

function Editing({ x, p }: { x: MyPlace; p: MyPlacesSectionProps }) {
  return (
    <div className="krow open">
      <div className="kh"><b>{x.name}</b><Pin x={x} /></div>
      {!fixed(x.id) && <div className="kin"><input id="mypName" defaultValue={x.name} maxLength={12} placeholder="이름 (예: 본가, 헬스장)" /></div>}
      <div className="row"><button className="small-btn primary" type="button" data-myphere={x.id}>📍 지금 위치로 저장</button></div>
      {p.hasKakao ? <>
        <div className="kin"><input id="mypQ" placeholder="주소나 건물 이름 검색 (예: 판교역로 235)" autoComplete="off" /><button className="small-btn" type="button" data-mypsearch={x.id}>찾기</button></div>
        {p.hits.length > 0 && <div className="myp-hits">{p.hits.map((h, i) => (
          <button key={i} className="mrow" type="button" data-myppick={`${x.id}:${i}`}><span className="mt"><b>{h.name}</b><small>{h.addr}</small></span></button>
        ))}</div>}
      </> : <p className="hint">카카오 지도 키를 연결하면 주소로도 찾을 수 있어요.</p>}
      <div className="row">
        {x.ll && <button className="small-btn danger" type="button" data-mypclear={x.id}>{fixed(x.id) ? '위치 지우기' : '삭제'}</button>}
        <button className="small-btn" type="button" id="mypDone">닫기</button>
      </div>
      {p.msg && <small className="kmsg">{p.msg}</small>}
    </div>
  );
}

export function MyPlacesSection(p: MyPlacesSectionProps) {
  return (
    <>
      <div className="mgroup">
        {p.places.map(x => p.editing === x.id ? <Editing key={x.id} x={x} p={p} /> : (
          <div className="krow" key={x.id}>
            <div className="kh"><b>{icon(x.id) + x.name}</b><Pin x={x} /></div>
            <button className={'small-btn' + (x.ll ? '' : ' primary')} type="button" data-mypedit={x.id}>{x.ll ? '바꾸기' : '등록'}</button>
          </div>
        ))}
        <div className="krow"><button className="small-btn" type="button" id="mypAdd">+ 장소 추가</button></div>
      </div>
      <p className="hint">"뭐 먹지?"에서 주변 식당을 찾는 기준과 여행 출발지로 써요. 이 기기에만 저장되고 공유 링크에는 들어가지 않아요.</p>
    </>
  );
}
