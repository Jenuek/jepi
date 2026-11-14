// ---------- extra side panels ----------
// A feature adds a panel with: PANELS.name={render(){…}}  plus  <div id="side-name" hidden> in body.html.
// Opening it: any button with data-tab="name". It is shown under the 더보기 tab.
// Features that ride on the account sync: run after every push / pull (SYNC_AFTER_PUSH / SYNC_AFTER_PULL).
// Little extras drawn by features: on a timeline block, a place card, and the block sheet. The lists: app/ui/extras.ts
const XT=window.JEPI_UI.extras, PANELS=XT.PANELS, SYNC_AFTER_PUSH=XT.SYNC_AFTER_PUSH, SYNC_AFTER_PULL=XT.SYNC_AFTER_PULL,
  BLOCK_BADGES=XT.BLOCK_BADGES, CARD_EXTRAS=XT.CARD_EXTRAS, SHEET_EXTRAS=XT.SHEET_EXTRAS, extras=XT.extras;
