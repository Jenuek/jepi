// ---------- actions ----------
function place(id,start,d=UI.day){
  const p=PM[id]; start=Math.max(dayStart(d),Math.min(1410,start));
  TRIP.blocks.add({id,day:d,start,dur:p.dur});
}
// A block's sheet, drawn by React: app/screens/BlockSheet.tsx. opt.marksOpen: keep the 할 일 표시 box open.
let sheetRev=0;
function openSheet(uid,opt){
  // its props: app/view/sheet.ts (what other features add: SHEET_EXTRAS)
  const v=window.JEPI_UI.view.sheet.blockSheet(UI.day,uid,!!(opt&&opt.marksOpen),it=>extras(SHEET_EXTRAS,it,UI.day)); if(!v) return;
  window.JEPI_UI.mount('block',$('#sheet'),{rev:++sheetRev,...v});
  $('#sheet').dataset.uid=uid; $('#sheetBg').hidden=false;
  setTimeout(()=>{const b=$('#sheet button');b&&b.focus()},0);
}
const closeSheet=()=>{if(diceCloseAnim())return;$('#sheetBg').hidden=true};
