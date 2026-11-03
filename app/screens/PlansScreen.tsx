// 더보기 → 내 계획: the saved plans, sharing the open plan, opening a backup or a shared plan
// (it used to be renderPlans in src/js/180-plans.js). Buttons keep their id / data-plan* names:
// the old code handles the clicks.
export interface PlanItem {
  id: string;
  name?: string;
  kind?: string;
  dates?: string;
  blocks?: number;
  updated?: number;
}

export interface PlansScreenProps {
  plans: PlanItem[];
  curPlan: string;
  /** the plan whose 삭제 was pressed once (asks again) */
  delArm: string;
  /** message after an action ('' = none) */
  planMsg: string;
  /** the GitHub app (links), not inside Claude (codes) */
  standalone: boolean;
  lastLink: string;
  lastCode: string;
  /** 카톡용 글, when it was asked for */
  shareText: string | null;
  /** plans are kept in the Claude account (inside Claude only) */
  savedInAccount: boolean;
}

const savedDay = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });

function PlanRow({ p, cur, armed }: { p: PlanItem; cur: boolean; armed: boolean }) {
  const info = (p.kind === 'day' ? '☀️ 하루 코스' : '✈️ 여행') + (p.dates ? ' · ' + p.dates : '') + ` · 블록 ${p.blocks || 0}개`
    + (p.updated ? ' · ' + savedDay(p.updated) + ' 저장' : '');
  return (
    <div className={'plan' + (cur ? ' cur' : '')}>
      <div className="pl-top"><b>{p.name || '이름 없는 계획'}</b>{cur && <span className="tag r">지금 보는 계획</span>}</div>
      <small>{info}</small>
      <div className="row">
        {!cur && <button className="small-btn primary" data-planopen={p.id}>열기</button>}
        <button className="small-btn" data-planrename={p.id}>이름 바꾸기</button>
        <button className="small-btn" data-plandup={p.id}>복제</button>
        <button className="small-btn danger" data-plandel={p.id}>{armed ? '한 번 더 누르면 삭제' : '삭제'}</button>
      </div>
    </div>
  );
}

export function PlansScreen(p: PlansScreenProps) {
  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}><button className="small-btn primary" id="planNew">+ 새 계획</button></div>
      {p.planMsg && <p className="ai-status" style={{ margin: '0 0 8px' }}>{p.planMsg}</p>}
      <div className="plan-list">
        {p.plans.length
          ? p.plans.map(x => <PlanRow key={x.id} p={x} cur={x.id === p.curPlan} armed={p.delArm === x.id} />)
          : <p className="hint">저장된 계획이 없어요.</p>}
      </div>
      <div className="fsec" style={{ marginTop: 14 }}>
        <h3>지금 계획 공유하기</h3>
        <div className="row">
          <button className="small-btn primary" id="planShare">{p.standalone ? '공유 링크 보내기' : '공유 코드 만들기'}</button>
          <button className="small-btn" id="planText">카톡용 글</button>
          <button className="small-btn" id="planTxt">글 파일 받기</button>
          <button className="small-btn" id="planJson">백업 파일 받기</button>
        </div>
        {p.standalone && p.lastLink && <>
          <textarea className="share-text" rows={3} readOnly value={p.lastLink} />
          <p className="hint">링크 안에 계획이 통째로 들어 있어요. 받은 사람이 열면 자기 계획으로 복사돼요.</p>
        </>}
        {p.lastCode && <>
          <p className="share-code">{p.lastCode}</p>
          <p className="hint">이 코드를 친구에게 알려 주세요. 친구는 "공유받은 계획 열기"에 넣으면 이 순간의 계획을 자기 계획으로 복사해 열 수 있어요. 친구도 이 페이지를 열 수 있어야 해요.</p>
        </>}
        {p.shareText != null && <textarea className="share-text" rows={10} readOnly value={p.shareText} />}
      </div>
      <div className="fsec">
        <h3>백업 파일 불러오기</h3>
        <p className="hint">"백업 파일 받기"로 저장한 .json 파일을 고르면 새 계획으로 열려요.</p>
        <input type="file" accept=".json,application/json" className="importFile" />
      </div>
      <div className="fsec">
        <h3>공유받은 계획 열기</h3>
        <div className="kw-add">
          {p.standalone
            ? <input id="codeIn" placeholder="받은 링크 붙여 넣기" autoComplete="off" />
            : <input id="codeIn" maxLength={10} placeholder="JP-7K2QX" autoComplete="off" />}
          <button className="small-btn primary" id="codeOpen">열기</button>
        </div>
      </div>
      <p className="hint">{p.savedInAccount
        ? '계획은 이 Claude 계정에 저장돼서 다른 기기에서 열어도 보여요.'
        : '계획은 이 기기에만 저장돼요. 다른 기기로 옮기려면 공유 링크나 더보기 → 설정 → 전체 백업을 쓰세요.'}</p>
    </>
  );
}
