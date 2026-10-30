// ---------- 여행 노트 보기: the whole trip as one notebook (cover + a chapter per day) ----------
// Read-only. "PDF로 저장" uses the browser's print (print CSS in 17-look.css keeps only the notebook).
// "링크로 보내기" sends the usual share link with &note=1, so the receiver opens straight into the notebook.
function notebookHTML(){
  const L=lookOf(), name=(plans.find(x=>x.id===curPlan)||{}).name||planName();
  const D0=DAYS[0]||{}, Dn=DAYS[DAYS.length-1]||{};
  const photo=L.cover==='photo'&&L.photo;
  const cover=`<section class="nb-page nb-cover"${photo?` style="background-image:linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.55)),url('${L.photo}')"`:''}>
    ${photo?'':`<div class="nb-art" aria-hidden="true">${coverSVG(L.cover,260,156)}</div>`}
    <div class="nb-stamp" aria-hidden="true"><span>${esc((PACK.city||'TRIP').slice(0,8))}</span><b>${esc(String(D0.date||'').replace(/\s.*/,''))}</b><span>JEPI</span></div>
    <h1>${esc(name)}</h1><p>${esc([D0.date&&Dn.date?`${D0.date} — ${Dn.date}`:'',DAYS.length>1?`${DAYS.length-1}박 ${DAYS.length}일`:'하루',L.tagline].filter(Boolean).join(' · '))}</p></section>`;
  const days=DAYS.map((D,d)=>{
    const {items,trans}=analyze(d), list=items.filter(i=>!(i.stay&&i!==items[items.length-1]));
    const rows=list.map((it,k)=>{
      const prev=k?list[k-1]:null, t=prev?trans.find(x=>x.from>=prev.end-5&&x.from<=it.start):null, memo=blockMemoOf(it,d);
      return `${t?`<li class="mvrow"><span></span><span class="mv">↓ ${esc(t.mode)} ${t.min}분${t.fare?' · '+yen(t.fare):''}</span></li>`:''}<li><span class="t">${fmt(it.start)}</span><b>${esc(it.name)}</b><span class="m">${esc(memo)}</span></li>`}).join('');
    const dm=dayMemoOf(d);
    return `<section class="nb-page"><div class="nb-ch">CHAPTER ${d+1} · ${esc(D.date)} ${WD[D.wd]}</div><h2>${esc(dayTitleOf(d))}</h2>${dm?`<p class="nb-dmemo">“${esc(dm)}”</p>`:''}<ul class="nb-list">${rows||'<li><span></span><span class="mv">아직 일정이 없어요</span></li>'}</ul></section>`;
  }).join('');
  return `<div class="nb-bar"><button class="small-btn" type="button" id="nbPrint">PDF로 저장</button><button class="small-btn" type="button" id="nbShare">링크로 보내기</button><button class="small-btn" type="button" id="nbClose">닫기</button></div>${cover}${days}`;
}
function openNotebook(){
  let nb=$('#notebook'); if(!nb){nb=document.createElement('div');nb.id='notebook';nb.className='notebook';nb.setAttribute('role','dialog');nb.setAttribute('aria-label','여행 노트');document.body.appendChild(nb)}
  nb.innerHTML=notebookHTML(); nb.hidden=false; nb.scrollTop=0; document.body.style.overflow='hidden';
}
function closeNotebook(){const nb=$('#notebook');if(nb)nb.hidden=true;document.body.style.overflow=''}
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
  if(t.id==='nbOpen'){openNotebook();return}
  if(t.id==='lookOpen'){openLook();return}
  if(t.id==='nbClose'){closeNotebook();return}
  if(t.id==='nbPrint'){window.print();return}
  if(t.id==='nbShare'){await shareLink(true);showToast(planMsg||'링크를 만들었어요');return}
});
