// The lists features hook into: a side panel (PANELS.name = { render() }), work after every account sync push / pull,
// and the little extras drawn on a timeline block, a place card and a block sheet (each function returns a piece, a
// list of pieces, or nothing; React draws them: app/screens/Extras.tsx). (They used to be src/js/007-panels.js.)
//   {k:'badge',t,title} {k:'want',pid,on,n,who} {k:'tag',cls,t} {k:'wantRow',want,by} {k:'alert',on,hint} {k:'memo',key,value}
export const PANELS: Record<string, { render(opts?: any): void }> = {};
export const SYNC_AFTER_PUSH: Array<() => any> = [], SYNC_AFTER_PULL: Array<() => any> = [];
export const BLOCK_BADGES: Array<(...a: any[]) => any> = [], CARD_EXTRAS: Array<(...a: any[]) => any> = [], SHEET_EXTRAS: Array<(...a: any[]) => any> = [];
/** every piece the features add (one that fails is left out) */
export const extras = (list: Array<(...a: any[]) => any>, ...a: any[]): any[] => list.flatMap(f => { try { const r = f(...a); return r ? [].concat(r) : [] } catch (_) { return [] } });
