// ---------- handwritten memos: one line per block, one line per day ----------
// profile.memo = {b:{"<place id>@<day>": text}, d:[text per day]} — saved with the plan (syncs, shared trips too).
const memoStore=()=>{profile.memo=profile.memo&&typeof profile.memo==='object'?profile.memo:{};profile.memo.b=profile.memo.b||{};profile.memo.d=Array.isArray(profile.memo.d)?profile.memo.d:[];return profile.memo};
const memoKey=(it,d)=>it.id+'@'+d;
const blockMemoOf=(it,d)=>((profile.memo&&profile.memo.b)||{})[memoKey(it,d)]||'';
const dayMemoOf=d=>((profile.memo&&profile.memo.d)||[])[d]||'';
function setDayMemo(d,v){const m=memoStore();m.d[d]=String(v||'').trim().slice(0,60);while(m.d.length&&!m.d[m.d.length-1])m.d.pop()}
function renderDayMemo(){const e=$('#dayMemo');if(!e)return;const m=dayMemoOf(day);e.textContent=m?`“${m}”`:'';e.hidden=!m}
SHEET_EXTRAS.push(it=>it&&it.id?{k:'memo',key:memoKey(it,day),value:blockMemoOf(it,day)}:null);   // drawn by React: Extras.tsx
let bmDraft=null;
document.addEventListener('input',e=>{if(e.target.id==='bmIn'){const f=$('#bmForm');if(f)bmDraft={k:f.dataset.bm,v:e.target.value}}});
function saveBlockMemo(){const f=$('#bmForm');if(!f)return;
  // the sheet can redraw between typing and tapping 저장, so keep what was typed (bmDraft)
  const k=f.dataset.bm, v=String(bmDraft&&bmDraft.k===k?bmDraft.v:$('#bmIn').value).trim().slice(0,60), m=memoStore(); bmDraft=null;
  if(v) m.b[k]=v; else delete m.b[k];
  TRIP.save('profile',profile); closeSheet(); renderAll(); showToast(v?'메모를 남겼어요':'메모를 지웠어요');
}
document.addEventListener('click',e=>{if(e.target.closest('#bmSave'))saveBlockMemo()});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='bmIn'&&!e.isComposing){e.preventDefault();saveBlockMemo()}});
