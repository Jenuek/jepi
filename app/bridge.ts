// The bridge between the old code (src/js, one big script) and React screens.
// The old code calls:   window.JEPI_UI.mount('help', element, props)
// and React draws that screen inside the element. Calling it again with new props redraws it.
import { createElement, type ComponentType } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { HelpPanel, type HelpPanelProps } from './screens/HelpPanel';
import { MoreMenu, type MoreMenuProps } from './screens/MoreMenu';
import { PlansScreen, type PlansScreenProps } from './screens/PlansScreen';
import { FriendsPanel, type FriendsPanelProps } from './screens/FriendsPanel';
import { NotifyPanel, type NotifyPanelProps } from './screens/NotifyPanel';
import { SettingsScreen, type SettingsScreenProps } from './screens/SettingsScreen';
import { TasteKeywords, type TasteKeywordsProps } from './screens/TasteKeywords';
import { FindSheet, type FindSheetProps } from './screens/FindSheet';
import { MeRows, type MeRowsProps } from './screens/MeRows';
import { TasteStyle, type TasteStyleProps } from './screens/TasteStyle';
import { OnbBody, type OnbBodyProps } from './screens/OnbBody';
import { TrayCards, TrayFilters, type TrayCardsProps, type TrayFiltersProps } from './screens/Tray';
import { Checks, type ChecksProps } from './screens/Checks';
import { Dice, MapCards, type DiceProps, type MapCardsProps } from './screens/Dice';
import { DayButtons, DaySum, SumBody, Route, BudgetSum, Budget, type DaysProps, type DaySumProps, type SumBodyProps, type RouteProps, type BudgetSumProps, type BudgetProps } from './screens/DayTop';
import { DayGrid, type DayGridProps } from './screens/DayGrid';
import { BlockSheet, FillSheet, type BlockSheetProps, type FillSheetProps } from './screens/BlockSheet';
import { PView, type PViewProps } from './screens/PView';
import { CustomSheet, type CustomSheetProps } from './screens/CustomSheet';
import { LookSheet, type LookSheetProps } from './screens/LookSheet';
import { HelperBody, type HelperBodyProps } from './screens/HelperBody';
import { AiBox, type AiBoxProps } from './screens/AiBox';
import { ChatLog, Nudges, type ChatLogProps, type NudgesProps } from './screens/ChatLog';
import { Welcome, type WelcomeProps } from './screens/Welcome';
import { PlanMenu, type PlanMenuProps } from './screens/PlanMenu';
import { Phase, type PhaseProps } from './screens/Phase';
import { Notebook, type NotebookProps } from './screens/Notebook';
import { DayTitleForm, type DayTitleFormProps } from './screens/DayTitleForm';
import { Dock, type DockProps } from './screens/Dock';
import { TrayTop, MapTop, type TrayTopProps, type MapTopProps } from './screens/Tops';
import { Tabs, MiniBar, type TabsProps, type MiniBarProps } from './screens/Bars';
import { Hero, type HeroProps } from './screens/Hero';
import { HelperFrame, Coach, Banner, OnbFrame, type HelperFrameProps, type CoachProps, type BannerProps, type OnbFrameProps } from './screens/Frames';
import { connectHost, type AppHost } from './ui/host';
import * as map from './ui/map';
import * as drag from './ui/drag';
import * as dayView from './view/day';
import * as trayView from './view/tray';
import * as formsView from './view/forms';
import * as diceView from './view/dice';
import * as pviewView from './view/pview';
import * as sheetView from './view/sheet';
import * as helperView from './view/helper';
import { liveOf, type LiveHandle } from './ui/live';

// Every screen React owns, with the props the old code must pass.
export interface Screens {
  help: HelpPanelProps;
  more: MoreMenuProps;
  plans: PlansScreenProps;
  friends: FriendsPanelProps;
  notify: NotifyPanelProps;
  settings: SettingsScreenProps;
  keywords: TasteKeywordsProps;
  find: FindSheetProps;
  me: MeRowsProps;
  tasteStyle: TasteStyleProps;
  onb: OnbBodyProps;
  trayCards: TrayCardsProps;
  trayFilters: TrayFiltersProps;
  checks: ChecksProps;
  dice: DiceProps;
  mapCards: MapCardsProps;
  days: DaysProps;
  daySum: DaySumProps;
  sumBody: SumBodyProps;
  route: RouteProps;
  budgetSum: BudgetSumProps;
  budget: BudgetProps;
  grid: DayGridProps;
  block: BlockSheetProps;
  fill: FillSheetProps;
  pview: PViewProps;
  custom: CustomSheetProps;
  look: LookSheetProps;
  helper: HelperBodyProps;
  aiBox: AiBoxProps;
  chat: ChatLogProps;
  nudges: NudgesProps;
  welcome: WelcomeProps;
  planMenu: PlanMenuProps;
  phase: PhaseProps;
  notebook: NotebookProps;
  dayTitle: DayTitleFormProps;
  helperFrame: HelperFrameProps;
  coach: CoachProps;
  banner: BannerProps;
  dock: DockProps;
  trayTop: TrayTopProps;
  mapTop: MapTopProps;
  tabs: TabsProps;
  mini: MiniBarProps;
  onbFrame: OnbFrameProps;
  hero: HeroProps;
}

const SCREENS: { [K in keyof Screens]: ComponentType<Screens[K]> } = {
  help: HelpPanel,
  more: MoreMenu,
  plans: PlansScreen,
  friends: FriendsPanel,
  notify: NotifyPanel,
  settings: SettingsScreen,
  keywords: TasteKeywords,
  find: FindSheet,
  me: MeRows,
  tasteStyle: TasteStyle,
  onb: OnbBody,
  trayCards: TrayCards,
  trayFilters: TrayFilters,
  checks: Checks,
  dice: Dice,
  mapCards: MapCards,
  days: DayButtons,
  daySum: DaySum,
  sumBody: SumBody,
  route: Route,
  budgetSum: BudgetSum,
  budget: Budget,
  grid: DayGrid,
  block: BlockSheet,
  fill: FillSheet,
  pview: PView,
  custom: CustomSheet,
  look: LookSheet,
  helper: HelperBody,
  aiBox: AiBox,
  chat: ChatLog,
  nudges: Nudges,
  welcome: Welcome,
  planMenu: PlanMenu,
  phase: Phase,
  notebook: Notebook,
  dayTitle: DayTitleForm,
  helperFrame: HelperFrame,
  coach: Coach,
  banner: Banner,
  dock: Dock,
  trayTop: TrayTop,
  mapTop: MapTop,
  tabs: Tabs,
  mini: MiniBar,
  onbFrame: OnbFrame,
  hero: Hero,
};

export interface JepiUI {
  mount<K extends keyof Screens>(name: K, el: Element, props: Screens[K]): void;
  /** a status line / button React drew (app/ui/live.tsx), or null */
  live(el: Element | null): LiveHandle | null;
  /** the old code tells React screens how to redraw / close the sheet / show a message (app/ui/host.ts) */
  connectHost(h: AppHost): void;
  /** the 지도 tab (Leaflet): app/ui/map.ts */
  map: typeof map;
  /** drag & drop onto the 일정표: app/ui/drag.ts */
  drag: typeof drag;
  /** what each screen shows, worked out from the trip (app/view/*.ts) */
  view: { day: typeof dayView; tray: typeof trayView; sheet: typeof sheetView; helper: typeof helperView; forms: typeof formsView; dice: typeof diceView; pview: typeof pviewView };
}

declare global {
  interface Window { JEPI_UI: JepiUI }
}

// Each screen draws into its own invisible spot (display:contents) inside the old code's element.
// Some elements are shared with old screens (#sheet: the block sheet and 장소 찾기). When the old code
// overwrites the element, the spot is gone: the next mount() starts a fresh one.
const roots = new WeakMap<Element, { root: Root; host: HTMLElement; name: string }>();

export function installBridge(): void {
  window.JEPI_UI = {
    live: liveOf,
    connectHost,
    map,
    drag,
    view: { day: dayView, tray: trayView, sheet: sheetView, helper: helperView, forms: formsView, dice: diceView, pview: pviewView },
    mount(name, el, props) {
      let cur = roots.get(el);
      if (!cur || cur.host.parentNode !== el || cur.name !== name) {
        if (cur) cur.root.unmount();
        el.textContent = '';
        const host = document.createElement('div');
        host.className = 'jepi-root';
        host.style.display = 'contents';
        el.appendChild(host);
        cur = { root: createRoot(host), host, name };
        roots.set(el, cur);
      }
      const Screen = SCREENS[name] as ComponentType<typeof props>;
      // draw right away, so the old code can rely on the screen being there when mount() returns
      const r = cur.root;
      flushSync(() => r.render(createElement(Screen, props)));
    },
  };
}
