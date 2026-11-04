// 일정표 본체 (#grid): 시간 줄과 빈칸, 이동 칩, 블록, 같은 권역 띠, 일몰 선. It used to be renderTimeline's HTML (340-render.js).
// The old code works out every position (px) and text; this draws them and is redrawn fresh (rev) like before.
// Taps tell the old code through app().grid; drag & drop is still read by the old code (the slot under a dragged card
// is marked through LiveSlot).
// What other features add to a block (BLOCK_BADGES: 🔔, 👍) is drawn by Extras.tsx.
import { Fragment, type CSSProperties } from 'react';
import { LiveSlot } from '../ui/live';
import { app } from '../ui/host';
import { Extras, type Extra } from './Extras';

export interface GridBlock {
  uid: string; cls: string; top: number; h: number; cc: string; full: string; drag: boolean;
  time: string; bang: boolean; badges: Extra[]; marks: string; name: string; memo: string; loc: string | null;
}

export interface DayGridProps {
  hours: number[];
  trans: { top: number; h: number; bad: boolean; text: string }[];
  blocks: GridBlock[];
  bands: { top: number; h: number; title: string; label: string | null }[];
  sunset: null | { top: number; text: string };
  rev: number;
}

function Block({ b }: { b: GridBlock }) {
  return (
    <button className={b.cls} style={{ top: `${b.top}px`, height: `${b.h}px`, '--cc': b.cc } as CSSProperties} data-uid={b.uid} onClick={() => app().grid('blk', b.uid)} title={b.full} aria-label={b.full} draggable={b.drag ? 'true' : undefined}>
      <span className="bt">{b.time}</span>
      <span className="bn">{b.bang && <span className="bang" aria-hidden="true">!</span>}<Extras xs={b.badges} />{b.marks && <span className="mks">{b.marks}</span>}{b.marks ? ' ' + b.name : b.name}</span>
      {b.memo && <span className="bmemo hand">{b.memo}</span>}
      {b.loc != null && <span className="ba">{b.loc}</span>}
    </button>
  );
}

export function DayGrid(p: DayGridProps) {
  return (
    <Fragment key={p.rev}>
      {p.hours.map(h => (
        <div className="hour" key={'h' + h}>
          <span className="lbl">{`${String(h).padStart(2, '0')}:00`}</span>
          <LiveSlot t={h * 60} half={false} top={0} label={`${h}시 00분에 넣기`} />
          <LiveSlot t={h * 60 + 30} half top="calc(var(--hour)/2)" label={`${h}시 30분에 넣기`} />
        </div>
      ))}
      {p.trans.map((t, i) => <div key={'t' + i} className={t.bad ? 'trn bad' : 'trn'} style={{ top: `${t.top}px`, height: `${t.h}px` }}><span className="chip mono">{t.text}</span></div>)}
      {p.blocks.map(b => <Block key={b.uid} b={b} />)}
      {p.bands.map((z, i) => <div key={'z' + i} className="zband" style={{ top: `${z.top}px`, height: `${z.h}px` }} title={z.title}>{z.label && <span>{z.label}</span>}</div>)}
      {p.sunset && <div className="sunline" style={{ top: `${p.sunset.top}px` }}><span>{p.sunset.text}</span></div>}
    </Fragment>
  );
}
