// 더보기 → 설정 (the frame; it used to be renderSettings in src/js/230-settings.js).
// 화면, 동기화, 내 장소, AI·지도 연결 and 데이터. (Other features used to add sections as HTML through
// SETTINGS_EXTRA; none did any more, so that slot is gone. A new section is added here as a React part.)
// Buttons keep their id / data-* names and say what was pressed through app().settings.
import { SyncSection, type SyncSectionProps } from './SyncSection';
import { MyPlacesSection, type MyPlacesSectionProps } from './MyPlacesSection';
import { AiKeysSection, type AiKeysSectionProps } from './AiKeysSection';
import { ImportFile } from './ImportFile';
import { app } from '../ui/host';

const go = (n: string, v?: string) => app().settings(n, v);

export interface SettingsScreenProps {
  theme: 'light' | 'dark' | 'system' | string;
  /** px per hour on the schedule: 60 보통, 100 넓게 */
  zoom: number;
  sync: SyncSectionProps;
  myPlaces: MyPlacesSectionProps;
  ai: AiKeysSectionProps;
  /** 모두 초기화 was pressed once: asks again */
  wipeArm: boolean;
  host: string;
  /** changes on every render: the login part is drawn fresh (SyncSection) */
  rev: number;
}

const THEMES: [string, string][] = [['light', '밝게'], ['dark', '어둡게'], ['system', '기기 설정']];

export function SettingsScreen(p: SettingsScreenProps) {
  return (
    <>
      <section className="sset">
        <h3>화면</h3>
        <div className="mgroup pad">
          <div className="srow"><span>테마</span><div className="radio">
            {THEMES.map(([v, l]) => <button key={v} type="button" data-theme-set={v} aria-pressed={p.theme === v} onClick={() => go('theme', v)}>{l}</button>)}
          </div></div>
          <div className="srow"><span>시간 간격</span><div className="radio">
            <button type="button" data-zoom="60" aria-pressed={p.zoom !== 100} onClick={() => go('zoom', '60')}>보통</button>
            <button type="button" data-zoom="100" aria-pressed={p.zoom === 100} onClick={() => go('zoom', '100')}>넓게</button>
          </div></div>
        </div>
      </section>
      <section className="sset"><h3>기기 간 동기화</h3>{/* key: drawn fresh on every redraw like before — the old login code changes its button (잠시만요…)
          and expects the password boxes to be empty again afterwards */}<SyncSection key={p.rev} {...p.sync} /></section>
      <section className="sset"><h3>내 장소</h3><MyPlacesSection {...p.myPlaces} /></section>
      <section className="sset"><h3>AI·지도 연결 <small>· 로그인하면 비밀번호로 잠가서 기기끼리 맞춰요</small></h3><AiKeysSection {...p.ai} /></section>
      <section className="sset">
        <h3>데이터</h3>
        <div className="mgroup pad">
          <div className="row">
            <button className="small-btn" type="button" id="backupAll" onClick={() => go('backup')}>전체 백업 받기</button>
            <label className="small-btn filebtn">백업 불러오기<ImportFile /></label>
          </div>
          <p className="hint">로그인해 두면 계획은 서버에 자동으로 맞춰져요. 백업은 파일로 따로 보관하고 싶을 때 받아요.</p>
          <hr />
          <p className="hint">저장한 계획 전부, 취향, 일정 블록을 지우고 처음부터 시작해요. 되돌릴 수 없어요. 연결한 키는 남아요.</p>
          <div className="row">
            <button className="small-btn danger" type="button" id="wipeBtn" onClick={() => go('wipe')}>{p.wipeArm ? '한 번 더 누르면 모두 지워요' : '모두 초기화'}</button>
            {p.wipeArm && <button className="small-btn" type="button" id="wipeCancel" onClick={() => go('wipecancel')}>취소</button>}
          </div>
        </div>
      </section>
      <p className="hint" style={{ textAlign: 'center' }}>{'JEPI · ' + p.host}</p>
    </>
  );
}
