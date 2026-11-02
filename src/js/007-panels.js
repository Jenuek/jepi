// ---------- extra side panels ----------
// A feature adds a panel with: PANELS.name={render(){…}}  plus  <div id="side-name" hidden> in body.html.
// Opening it: any button with data-tab="name". It is shown under the 더보기 tab.
const PANELS={};
// Extra settings sections: SETTINGS_EXTRA.push(()=>`<section class="sset">…</section>`)
const SETTINGS_EXTRA=[];
// Features that ride on the account sync: run after every push / pull (310-sync.js)
const SYNC_AFTER_PUSH=[], SYNC_AFTER_PULL=[];
// Little extras drawn by features: on a timeline block, a place card, and the block sheet
const BLOCK_BADGES=[], CARD_EXTRAS=[], SHEET_EXTRAS=[];
const extras=(list,...a)=>list.map(f=>{try{return f(...a)||''}catch(_){return ''}}).join('');
