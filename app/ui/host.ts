// What a React screen may ask of the old code (src/js) while it still runs the app: redraw, close the sheet, show a
// short message, and which day is open. The old code connects with JEPI_UI.connectHost({...}) at start-up.
// (Step 5 of the move: screens handle their own buttons and call these, instead of the old code catching every click.)
export interface AppHost {
  /** redraw everything that shows the trip */
  renderAll(): void;
  closeSheet(): void;
  toast(msg: string): void;
  /** the day shown now (0 = Day 1) */
  day(): number;
  /** the automatic title of a day ("Day 1 · 도착") */
  autoTitle(d: number): string;
  /** the header's day title is being edited: hide / show the title and its ✎ button */
  titleEditing(on: boolean): void;
  /** 여행 노트: close it / make the share link (resolves with the message to show) */
  closeNotebook(): void;
  shareNotebook(): Promise<string>;
}
let host: AppHost | null = null;
export function connectHost(h: AppHost): void { host = h }
export function app(): AppHost {
  if (!host) throw new Error('the old code has not connected yet');
  return host;
}
