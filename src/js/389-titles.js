// ---------- day titles the traveler can rename ----------
// profile.dayTitles[d] overrides the automatic "Day 1 · 도착" title. Empty = back to automatic.
// Stored in the plan's profile, so it syncs to other devices and to friends on a shared trip.
function dayTitleOf(d){const t=((profile&&profile.dayTitles)||[])[d];return t&&String(t).trim()?String(t):(DAYS[d]||{}).title||''}
function editDayTitle(){
  const h=$('#dayTitle'); if(!h||$('#dayTitleIn')) return;
  const cur=((profile.dayTitles||[])[day])||'';
  h.hidden=true; $('#dayTitleEdit').hidden=true;
  const f=document.createElement('form'); f.id='dayTitleForm'; f.className='dt-form';
  f.innerHTML=`<input id="dayTitleIn" maxlength="40" value="${esc(cur)}" placeholder="${esc(DAYS[day].title)}" aria-label="Day ${day+1} 제목"><button class="small-btn primary" type="submit">저장</button><button class="small-btn" type="button" id="dayTitleCancel">취소</button>`;
  h.after(f); const i=$('#dayTitleIn'); i.focus(); i.select();
}
function closeDayTitle(save){
  const f=$('#dayTitleForm'); if(!f) return;
  if(save){const v=$('#dayTitleIn').value.trim().slice(0,40); const a=(profile.dayTitles||[]).slice(); a[day]=v; while(a.length&&!a[a.length-1])a.pop();
    profile.dayTitles=a; store.set('gp.profile',profile)}
  f.remove(); $('#dayTitle').hidden=false; $('#dayTitleEdit').hidden=false; renderAll();
  if(save) showToast($('#dayTitle').textContent?'제목을 바꿨어요':'자동 제목으로 돌아갔어요');
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.id==='dayTitleEdit'){editDayTitle();return}
  if(t.id==='dayTitleCancel'){closeDayTitle(false);return}
});
document.addEventListener('submit',e=>{if(e.target.id!=='dayTitleForm')return;e.preventDefault();closeDayTitle(true)});
