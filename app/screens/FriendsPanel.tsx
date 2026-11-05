// 더보기 → 친구와 함께 (it used to be PANELS.friends in src/js/384-trips.js).
// Buttons keep their data-trip / data-tab names; data-trip buttons tell the old code through app().trip (server, invites).
import { app } from '../ui/host';
export interface Member {
  user_id: string;
  name?: string;
  role: 'owner' | 'edit' | 'view' | string;
}

export interface FriendsPanelProps {
  /** demo: no inviting · login: not logged in · intro: not shared yet · shared: a shared trip */
  mode: 'demo' | 'login' | 'intro' | 'shared';
  planName: string;
  /** a server request is running */
  busy: boolean;
  /** message after an action ('' = none) */
  msg: string;
  /** the name friends see */
  myName: string;
  /** shared trip only */
  members: Member[];
  me: string;
  /** my role in this trip */
  role: string;
  invite: { role: string; url: string } | null;
  /** "공유 끝내기" was pressed once: asks again */
  stopArm: boolean;
}

const ROLE_TXT: Record<string, string> = { owner: '만든 사람', edit: '같이 고침', view: '보기만' };

const Msg = ({ msg }: { msg: string }) => (msg ? <p className="hint">{msg}</p> : null);

function NameRow({ myName }: { myName: string }) {
  return (
    <div className="mgroup pad">
      <label className="fg" style={{ display: 'block' }}>
        <span className="hint">친구에게 보일 내 이름</span>
        {/* key: a new saved name (from another device) refreshes the box; typing is kept otherwise */}
        <div className="kin"><input id="myNameIn" maxLength={20} defaultValue={myName} key={myName} /><button className="small-btn" data-trip="name" onClick={e => app().trip('name', '', (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.value || '')}>저장</button></div>
      </label>
    </div>
  );
}

export function FriendsPanel(p: FriendsPanelProps) {
  if (p.mode === 'demo') {
    return <div className="mgroup pad"><p className="hint" style={{ margin: 0 }}>데모에서는 친구 초대를 쓸 수 없어요.</p></div>;
  }
  if (p.mode === 'login') {
    return (
      <div className="mgroup pad">
        <p className="hint" style={{ marginTop: 0 }}>친구와 함께 쓰려면 먼저 로그인해 주세요. 친구도 JEPI에 가입하면 같은 일정을 같이 보고 고칠 수 있어요.</p>
        <div className="row"><button className="small-btn primary" data-tab="settings">로그인하러 가기</button></div>
      </div>
    );
  }
  if (p.mode === 'intro') {
    return (
      <>
        <div className="mgroup pad">
          <p style={{ marginTop: 0 }}><b>{p.planName}</b>을 친구와 함께 짜요.</p>
          <ul className="hint fr-list">
            <li>초대 링크를 받은 친구가 로그인하면 바로 참여해요.</li>
            <li>누가 어느 날을 고쳐도 서로의 변경이 합쳐져요.</li>
            <li>장소마다 👍 가고 싶어요를 눌러 의견을 모아요.</li>
            <li>AI·지도 키와 취향, 내 장소는 공유되지 않아요.</li>
          </ul>
          <div className="row"><button className="small-btn primary" data-trip="share" onClick={() => app().trip('share')} disabled={p.busy}>{p.busy ? '준비 중…' : '이 여행에 친구 초대하기'}</button></div>
          <Msg msg={p.msg} />
        </div>
        <NameRow myName={p.myName} />
      </>
    );
  }
  const owner = p.role === 'owner';
  const mem = p.members.slice().sort((a, b) => (a.role === 'owner' ? -1 : 0) - (b.role === 'owner' ? -1 : 0));
  return (
    <>
      <div className="mgroup">
        {mem.length ? mem.map(m => (
          <div className="mrow static" key={m.user_id}>
            <span className="mt"><b>{(m.name || '친구') + (m.user_id === p.me ? ' (나)' : '')}</b><small>{ROLE_TXT[m.role] || ''}</small></span>
            {owner && m.user_id !== p.me && <button className="small-btn" data-trip="kick" data-uid={m.user_id} onClick={() => app().trip('kick', m.user_id)}>내보내기</button>}
          </div>
        )) : <p className="hint pad">멤버를 불러오는 중…</p>}
      </div>
      {p.role !== 'view' ? (
        <div className="mgroup pad">
          <h3 className="taste-h">친구 초대</h3>
          <div className="row">
            <button className="small-btn primary" data-trip="invite-edit" onClick={() => app().trip('invite-edit')}>같이 고칠 친구 초대</button>
            <button className="small-btn" data-trip="invite-view" onClick={() => app().trip('invite-view')}>보기만 할 친구 초대</button>
          </div>
          {p.invite && <>
            <p className="hint">{(p.invite.role === 'edit' ? '같이 고칠 수 있는' : '보기만 하는') + ' 초대 링크예요 · 14일 동안 쓸 수 있어요'}</p>
            <input className="share-text" readOnly value={p.invite.url} />
            <div className="row"><button className="small-btn primary" data-trip="send" onClick={() => app().trip('send')}>보내기</button><button className="small-btn" data-trip="copy" onClick={() => app().trip('copy')}>복사</button></div>
          </>}
          <Msg msg={p.msg} />
        </div>
      ) : (
        <div className="mgroup pad"><p className="hint" style={{ margin: 0 }}>보기만 할 수 있는 여행이에요. 고친 내용은 친구들에게 가지 않아요.</p><Msg msg={p.msg} /></div>
      )}
      <NameRow myName={p.myName} />
      <div className="mgroup pad">
        <div className="row">
          {owner
            ? <button className="small-btn danger" data-trip="stop" onClick={() => app().trip('stop')}>{p.stopArm ? '한 번 더 누르면 공유를 끝내요' : '공유 끝내기'}</button>
            : <button className="small-btn danger" data-trip="leave" onClick={() => app().trip('leave')}>이 여행에서 나가기</button>}
        </div>
      </div>
    </>
  );
}
