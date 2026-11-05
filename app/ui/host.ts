// What a React screen may ask of the old code (src/js) while it still runs the app: redraw, close the sheet, show a
// short message, and which day is open. The old code connects with JEPI_UI.connectHost({...}) at start-up.
// (Step 5 of the move: screens handle their own buttons and call these, instead of the old code catching every click.)
export interface AppHost {
  /** redraw everything that shows the trip */
  renderAll(): void;
  closeSheet(): void;
  /** draw the open block sheet again (after something in it changed) */
  reopenSheet(): void;
  toast(msg: string): void;
  /** the day shown now (0 = Day 1) */
  day(): number;
  /** the automatic title of a day ("Day 1 · 도착") */
  autoTitle(d: number): string;
  /** the header's day title is being edited: hide / show the title and its ✎ button */
  titleEditing(on: boolean): void;
  /** 여행 노트: close it / make the share link (resolves with the message to show) */
  closeNotebook(): void;
  /** 여행 꾸미기: rename the open plan ('' or the same name = no change), and AI day titles for this trip */
  renamePlan(name: string): void;
  aiDayTitles(tripName: string): Promise<string[]>;
  /** 첫 화면: start a new trip / open the demo / after logging in, open what came with the account (or a pending invite) */
  welcomeNew(): void;
  welcomeDemo(): void;
  welcomeLoggedIn(): Promise<void>;
  /** what went wrong, in words the person can act on */
  errText(e: unknown, what: string): string;
  shareNotebook(): Promise<string>;
  /** 🎲 sheet: something was pressed (its name, its value, its other data-… values) */
  dice(name: string, value: string, more?: Record<string, string>): void;
  /** a place card / the 장소 tab: something was pressed (wish, vote, pick, cat, zone, dupmerge …) and its value */
  place(name: string, value: string): void;
  /** 내 계획: something was pressed (new, open, dup, del, rename, name, share, text, txt, json, code), a plan id, a typed name */
  plans(name: string, value?: string, value2?: string): void;
  /** 예약 도우미: something was pressed (paste, vibe, hotels, route, setarea, slot, radio, toMe) */
  helper(name: string, value?: string, value2?: string): void;
  /** AI chat: stop / apply / cancel / undo a message, or cp (one suggested place: "message:place:sched|list|skip") */
  chat(name: string, value?: string): void;
  /** the "알려 주세요" box: a button id, or off with its row */
  nudge(name: string, value?: string): void;
  /** P모드 판: sq, gap, roll, mood, card, next, yes, keep, close, ai, ahead (and a square / gap / mood) */
  pview(name: string, value?: string): void;
  /** 취향 키워드: toggle (returns: on now), del (its place), add (a word), reset */
  kw(name: string, value?: string): boolean | void;
  /** 일정표: day (its number), slot (minutes), blk (a block's uid), meal (간식비 change) */
  grid(name: string, value: string): void;
  /** a block's sheet: fill, dicefrom, totray, newcustom, editcustom, swap, mark, pairblock, home, mv, du, del (+ start / dur) */
  block(name: string, value?: string, more?: { start?: string; dur?: string }): void;
  /** 준비하기: ck (id, ticked), goto ("day~uid"), fix, season, reset */
  checks(name: string, value?: string, more?: boolean): void;
  /** ✨ 빈 시간 채우기 results: stop, close, acc (which one) */
  aibox(name: string, value?: string): void;
  /** 설정: theme, zoom, keyedit, keycancel, keysave (key name, typed key), keydel, keytest, models, backup, wipe, wipecancel */
  settings(name: string, value?: string, value2?: unknown): void;
  /** 처음 설정 / 이번 여행 / 취향 forms: what was pressed (pickjp, q, startmode, talk…, dest…, radio, addstay, …) */
  form(name: string, value?: string, more?: Record<string, unknown>): void;
  /** the day summary: chip (which list), uid (a warning's block) */
  sum(name: string, value: string): void;
  /** 친구와 함께: share, invite-edit, invite-view, send, copy, leave, kick (uid), stop, name (typed) */
  trip(action: string, uid?: string, typed?: string): void;
  /** 👍 가고 싶어요 on a place of the shared trip */
  want(placeId: string): void;
  /** 장소 찾기: chip ("key:value", typed), r ("id:act"), gap ("start-end"), area, gapsel, submit (typed) */
  find(name: string, value?: string, typed?: string | null): void;
  /** the plan menu: open (plan id), new, manage */
  planMenu(name: string, value?: string): void;
  /** 더보기 rows that are not a tab: nbOpen, lookOpen, moreAll */
  more(id: string): void;
  /** a card under the map was tapped (its stop) */
  mapCard(i: number): void;
  /** the 예약 도우미 frame: prev, next, close */
  helperFrame(name: string): void;
  /** the 처음 안내 bubble: next, skip */
  coach(name: string): void;
  /** the banner above the schedule while a place is picked: cancel */
  banner(name: string): void;
  /** the dock under the schedule: fold, ai (✨ 빈 시간), fix (경고 해결), helper, custom, send (the typed message) */
  dock(name: string, value?: string): void;
  /** the 장소 tab's top: group (묶어 보기), open (이 날 문 여는 곳만 changed), more (the typed "AI로 장소 더 찾기") */
  tray(name: string, value?: string): void;
  /** the map's top: day / all (which days), me (내 위치) */
  mapTop(name: string): void;
  /** the 처음 설정 frame: prev, next, skip, example (데모 둘러보기) */
  onbFrame(name: string): void;
  /** a bottom tab was pressed (timeline, tray, map, more) */
  tab(name: string): void;
  /** the folded header's ‹ › (-1 / 1) */
  miniDay(step: number): void;
  /** a backup file was chosen (처음 설정 · 내 계획 · 설정) */
  importFile(f: File | undefined): void;
}
let host: AppHost | null = null;
export function connectHost(h: AppHost): void { host = h }
export function app(): AppHost {
  if (!host) throw new Error('the old code has not connected yet');
  return host;
}
