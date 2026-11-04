// ---------- day titles the traveler can rename ----------
// profile.dayTitles[d] overrides the automatic "Day 1 · 도착" title (rules: app/logic/memo.ts). The ✎ form is React
// (app/screens/DayTitleForm.tsx, it saves itself); here: the header around it.
function dayTitleOf(d){return JD.logic.memo.dayTitle(profile,d,(DAYS[d]||{}).title||'')}
let dayTitleRev=0;
function dayTitleSlot(){let s=$('#dayTitleSlot');if(!s){s=document.createElement('span');s.id='dayTitleSlot';s.style.display='contents';$('#dayTitle').after(s)}return s}
function titleEditing(on){
  $('#dayTitle').hidden=on; $('#dayTitleEdit').hidden=on;
  window.JEPI_UI.mount('dayTitle',dayTitleSlot(),{open:on,day,title:JD.logic.memo.ownDayTitle(profile,day),auto:String(DAYS[day].title||''),memo:dayMemoOf(day),rev:++dayTitleRev});
}
document.addEventListener('click',e=>{const t=e.target.closest('#dayTitleEdit');if(t&&!$('#dayTitleIn'))titleEditing(true)});
// what React screens may ask of the old code (app/ui/host.ts)
window.JEPI_UI.connectHost({renderAll:()=>renderAll(),closeSheet:()=>closeSheet(),reopenSheet:()=>{const u=$('#sheet').dataset.uid;if(u&&u!=='dice'&&!$('#sheetBg').hidden)openSheet(u)},toast:m=>showToast(m),day:()=>day,autoTitle:d=>String((DAYS[d]||{}).title||''),titleEditing,
  closeNotebook:()=>closeNotebook(),renamePlan:nm=>lookRenamePlan(nm),aiDayTitles:n=>lookAiTitles(n),errText:(e,w)=>errText(e,w),welcomeNew:()=>{closeWelcome();openOnb()},welcomeDemo:()=>demoEnter(),welcomeLoggedIn:()=>welcomeLoggedIn(),shareNotebook:async()=>{await shareLink(true);return planMsg||'링크를 만들었어요'}});
