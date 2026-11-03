// Status lines and buttons the old code updates while something runs ("준비하는 중… 12초 지났어요", a button that
// says "준비하는 중…" and is locked). The old code must not write into React screens, so its helpers
// (setSt / progStart / progStop / setBusy in src/js/060-destination-pack.js) ask here first:
//   window.JEPI_UI.live(element) → a handle when React drew that element, otherwise null (then they write the old way).
// The state lives in the drawn element: when the screen is redrawn fresh (a new rev), it starts over, like before.
import { flushSync } from 'react-dom';
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export interface LiveHandle {
  /** status line: its text */
  text(t: string): void;
  /** status line: the "busy" look */
  busy(b: boolean): void;
  /** button: a temporary label (null = its own label again) */
  label(l: string | null): void;
  /** button: locked or not */
  disabled(b: boolean): void;
  /** toggle chip: pressed or not */
  pressed(b: boolean): void;
}

const handles = new WeakMap<Element, LiveHandle>();
export function liveOf(el: Element | null): LiveHandle | null {
  return (el && handles.get(el)) || null;
}

const noop = () => {};
function useHandle(h: Partial<LiveHandle>) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    // apply right away, like the old direct writes (the old code may read the element back)
    const now = <T,>(f?: (v: T) => void) => f ? (v: T) => flushSync(() => f(v)) : noop;
    handles.set(el, { text: now(h.text), busy: now(h.busy), label: now(h.label), disabled: now(h.disabled), pressed: now(h.pressed) });
    return () => { handles.delete(el) };
  }, []);   // the setters below never change
  return ref;
}

type LineTag = 'p' | 'span';
/** A status line (class "ai-status"); `text` is what it shows when drawn. */
export function LiveLine({ id, tag = 'p', text = '', className = 'ai-status' }: { id: string; tag?: LineTag; text?: string; className?: string }) {
  const [t, setT] = useState(text), [b, setB] = useState(false);
  const ref = useHandle({ text: setT, busy: setB });
  const cls = b ? className + ' busy' : className;
  return tag === 'span'
    ? <span className={cls} id={id} ref={ref as RefObject<HTMLSpanElement>}>{t}</span>
    : <p className={cls} id={id} ref={ref as RefObject<HTMLParagraphElement>}>{t}</p>;
}

/** A button the old code may relabel or lock while something runs. */
export function LiveButton({ id, className, children, disabled = false }: { id: string; className: string; children: ReactNode; disabled?: boolean }) {
  const [l, setL] = useState<string | null>(null), [d, setD] = useState<boolean | null>(null);
  const ref = useHandle({ label: setL, disabled: setD });
  return <button className={className} type="button" id={id} disabled={d ?? disabled} ref={ref as RefObject<HTMLButtonElement>}>{l ?? children}</button>;
}

/** A taste keyword chip (data-kwtoggle): the old click handler flips it through the handle. */
export function LiveChip({ k, on }: { k: string; on: boolean }) {
  const [v, setV] = useState(on);
  const ref = useHandle({ pressed: setV });
  return <button type="button" data-kwtoggle={k} aria-pressed={v} ref={ref as RefObject<HTMLButtonElement>}>{k}</button>;
}
