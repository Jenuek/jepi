// Where the person is in the app, shared by every screen: the open day, tab and 장소 filters, the place picked to put in
// (selected), the AI check box, the connected AI (sample), J/P, and the 준비하기 reset arm. The old code reads and changes
// these as UI.day, UI.tab … (they used to be its own variables in src/js/320-state.js and 160-modes-roll.js).
export const ui = {
  /** the open day (0 = Day 1) */
  day: 0,
  /** the open tab: timeline, tray, check, pref, me, more, plans, settings, map, or a panel's name */
  tab: 'timeline',
  /** 장소 tab: the category filter, how cards are grouped, which 동네 groups are open */
  cat: 'all',
  group: 'zone',
  zoneOpen: {} as Record<string, boolean>,
  /** the place picked in 장소 to put into the 일정표 (the next tap on a time places it) */
  selected: null as string | null,
  /** the AI check box under the 일정표 (its day, status and suggestions) */
  aiState: null as any,
  /** the connected AI (null: no key) */
  sample: null as any,
  /** J (plan) or P (board game) */
  jp: 'J' as string,
  /** 준비하기 → 초기화 pressed once (asks once more) */
  resetArm: false,
};
