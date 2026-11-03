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
};

export interface JepiUI {
  mount<K extends keyof Screens>(name: K, el: Element, props: Screens[K]): void;
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
