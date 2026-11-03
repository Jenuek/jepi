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

// Every screen React owns, with the props the old code must pass.
export interface Screens {
  help: HelpPanelProps;
  more: MoreMenuProps;
  plans: PlansScreenProps;
  friends: FriendsPanelProps;
  notify: NotifyPanelProps;
  settings: SettingsScreenProps;
}

const SCREENS: { [K in keyof Screens]: ComponentType<Screens[K]> } = {
  help: HelpPanel,
  more: MoreMenu,
  plans: PlansScreen,
  friends: FriendsPanel,
  notify: NotifyPanel,
  settings: SettingsScreen,
};

export interface JepiUI {
  mount<K extends keyof Screens>(name: K, el: Element, props: Screens[K]): void;
}

declare global {
  interface Window { JEPI_UI: JepiUI }
}

const roots = new WeakMap<Element, Root>();

export function installBridge(): void {
  window.JEPI_UI = {
    mount(name, el, props) {
      let root = roots.get(el);
      if (!root) {
        el.textContent = '';
        root = createRoot(el);
        roots.set(el, root);
      }
      const Screen = SCREENS[name] as ComponentType<typeof props>;
      // draw right away, so the old code can rely on the screen being there when mount() returns
      const r = root;
      flushSync(() => r.render(createElement(Screen, props)));
    },
  };
}
