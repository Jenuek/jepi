// 더보기 tab: this trip's card and the menu (it used to be renderMore in src/js/220-more-menu.js).
// The buttons keep their data-tab / id names: the old code opens the screens from those.
import type { ReactNode } from 'react';

export type ChipTone = 'ok' | 'warn' | 'acc' | '';

export interface Chip {
  text: string;
  tone?: ChipTone;
}

export interface MoreMenuProps {
  /** 이번 여행 card */
  city: string;
  line: string;
  /** 교통편·숙소·예산 chips on the card */
  tripChips: Chip[];
  /** warnings in the schedule, and booking tasks left (준비하기) */
  warnCount: number;
  prepLeft: number;
  /** false in P mode until "전체 메뉴 보기": the short menu */
  full: boolean;
  /** P mode: show the 전체 메뉴 / 간단히 toggle */
  showToggle: boolean;
  moreAll: boolean;
  plansCount: number;
  /** "👥 2" when this trip is shared with friends */
  friendsChip: string | null;
  notifyOn: boolean;
  /** standalone app with no AI connected */
  aiOff: boolean;
}

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);

const ChipView = ({ text, tone }: Chip) => <span className={'mchip ' + (tone || '')}>{text}</span>;

function Row({ tab, id, title, sub, children }: { tab?: string; id?: string; title: string; sub: string; children?: ReactNode }) {
  return (
    <button className="mrow" type={tab ? undefined : 'button'} data-tab={tab} id={id}>
      <span className="mt"><b>{title}</b><small>{sub}</small></span>
      {children ?? <Arrow />}
    </button>
  );
}

export function MoreMenu(p: MoreMenuProps) {
  const noTodo = !p.warnCount && !p.prepLeft;
  return (
    <>
      <button className="trip-card" data-tab="me">
        <span className="tc-top"><span className="tc-k">이번 여행</span><span className="tc-more">자세히<Arrow /></span></span>
        <b className="tc-city">{p.city}</b>
        <span className="tc-line mono">{p.line}</span>
        {p.tripChips.length > 0 && <span className="tc-chips">{p.tripChips.map((c, i) => <ChipView key={i} {...c} />)}</span>}
      </button>
      <div className="mgroup">
        <Row id="nbOpen" title="📖 여행 노트로 보기" sub="날짜별 제목 · 손글씨 메모 · PDF 저장 · 링크로 보내기" />
        <Row id="lookOpen" title="🎨 여행 꾸미기" sub="제목 · 테마 색 · 커버 · 스타일 · 날짜별 제목" />
        <Row tab="check" title="준비하기" sub="일정 경고 · 남은 예약 · 이 시기 팁">
          {p.warnCount > 0 && <ChipView text={'경고 ' + p.warnCount} tone="warn" />}
          {p.prepLeft > 0 && <ChipView text={'남은 준비 ' + p.prepLeft} tone="acc" />}
          {noTodo && <Arrow />}
        </Row>
        {p.full && <>
          <Row tab="pref" title="나의 여행 취향" sub="여행 스타일 · 취향 키워드 · ♥ 장소 — 모든 계획에 공통" />
          <Row tab="plans" title="내 계획" sub={`${p.plansCount}개 저장됨 · 새 계획 · 공유`} />
        </>}
      </div>
      <div className="mgroup">
        <Row tab="friends" title="친구와 함께" sub="초대 링크 · 같이 고치기 · 👍 가고 싶어요">
          {p.friendsChip ? <ChipView text={p.friendsChip} tone="ok" /> : <Arrow />}
        </Row>
        <Row tab="notify" title="알림" sub="출발 시간 · 아침 일정 · 알림 받을 기기">
          {p.notifyOn ? <ChipView text="켜짐" tone="ok" /> : <Arrow />}
        </Row>
        <Row tab="help" title="사용 안내" sub="처음 쓰는 기능을 짧게 설명해요" />
      </div>
      {p.full && (
        <div className="mgroup">
          <Row tab="settings" title="설정" sub="화면 · AI·지도 연결 · 백업 · 초기화">
            {p.aiOff && <ChipView text="AI 꺼짐" tone="warn" />}
            <Arrow />
          </Row>
        </div>
      )}
      {p.showToggle && <button className="linkbtn" id="moreAll">{p.moreAll ? '간단히 보기' : '전체 메뉴 보기'}</button>}
    </>
  );
}
