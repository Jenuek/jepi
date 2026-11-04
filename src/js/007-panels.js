// ---------- extra side panels ----------
// A feature adds a panel with: PANELS.name={render(){…}}  plus  <div id="side-name" hidden> in body.html.
// Opening it: any button with data-tab="name". It is shown under the 더보기 tab.
const PANELS={};
// Features that ride on the account sync: run after every push / pull (310-sync.js)
const SYNC_AFTER_PUSH=[], SYNC_AFTER_PULL=[];
// Little extras drawn by features: on a timeline block, a place card, and the block sheet.
// Each function returns a piece (or a list of pieces, or nothing); React draws them: app/screens/Extras.tsx
//   {k:'badge',t,title} {k:'want',pid,on,n,who} {k:'tag',cls,t} {k:'wantRow',want,by} {k:'alert',on,hint} {k:'memo',key,value}
const BLOCK_BADGES=[], CARD_EXTRAS=[], SHEET_EXTRAS=[];
const extras=(list,...a)=>list.flatMap(f=>{try{const r=f(...a);return r?[].concat(r):[]}catch(_){return []}});
