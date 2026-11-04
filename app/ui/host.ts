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
}
let host: AppHost | null = null;
export function connectHost(h: AppHost): void { host = h }
export function app(): AppHost {
  if (!host) throw new Error('the old code has not connected yet');
  return host;
}
