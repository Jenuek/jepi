// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// profile.look = {color, cover:'city'|'sea'|'mountain'|'none'|'photo', photo:dataURL, tagline, style:'color'|'note', hand}
// Lives in the plan's profile, so it syncs across devices and to friends on a shared trip.
const LOOK_COLORS=[['#2448c9','코발트'],['#c23b22','노을'],['#0f7a5c','숲'],['#6b2fb3','보라'],['#0e7490','바다'],['#b45309','호박'],['#be185d','체리'],['#2b2a33','먹']];
const LOOK_HANDS=[['pen','나눔펜','"Nanum Pen Script"'],['gaegu','개구','"Gaegu"'],['melody','하이멜로디','"Hi Melody"']];
const LOOK_COVERS=[['city','도시'],['sea','바다'],['mountain','산'],['none','없음']];
const lookOf=()=>Object.assign({color:'#2448c9',pop:'#ffd23f',cover:'city',tagline:'',style:'color',hand:'pen',photo:''},(profile&&profile.look)||{});
function coverSVG(kind,w,h){
  const k=kind||'city';
  if(k==='sea') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="38" r="18" fill="var(--pop)"/><path d="M0 92 C40 84,80 100,200 86 V120 H0Z" fill="#fff" fill-opacity=".16"/><path d="M0 104 C50 96,110 114,200 100 V120 H0Z" fill="#000" fill-opacity=".18"/></svg>`;
  if(k==='mountain') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="160" cy="30" r="16" fill="var(--pop)"/><path d="M40 120 L100 50 L130 86 L150 66 L200 120Z" fill="#000" fill-opacity=".2"/><path d="M100 50 L112 64 L88 64Z" fill="#fff" fill-opacity=".7"/></svg>`;
  if(k==='none'||k==='photo') return '';
  return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="34" r="20" fill="var(--pop)" fill-opacity=".9"/><path d="M0 120 V84 H16 V64 H34 V90 H50 V52 H62 L68 44 L74 52 V92 H96 V70 H116 V96 H134 V60 H150 V88 H170 V74 H200 V120Z" fill="#000" fill-opacity=".18"/></svg>`;
}
function renderLook(){
  const L=lookOf(), R=document.documentElement.style, note=L.style==='note';
  R.setProperty('--theme',L.color); R.setProperty('--pop',L.pop);
  R.setProperty('--f-hand',(LOOK_HANDS.find(x=>x[0]===L.hand)||LOOK_HANDS[0])[2]+', cursive');
  document.body.classList.toggle('style-note',note);
  const art=$('#heroArt'); if(art){
    const photo=L.cover==='photo'&&L.photo;
    art.style.backgroundImage=photo?`linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.45)),url("${L.photo}")`:'';
    art.classList.toggle('photo',!!photo);
    art.innerHTML=note?`<div class="stamp"><span>${esc((PACK.city||'TRIP').slice(0,8))}</span><b>${esc(((DAYS[0]||{}).date||'').replace(/\s.*/,''))}</b><span>${esc(String(new Date().getFullYear()))}</span></div>`:photo?'':coverSVG(L.cover,190,120);
  }
  const tag=$('#heroTag'); if(tag){tag.textContent=L.tagline||'';tag.hidden=!L.tagline}
  const hd=$('#heroDay'); if(hd&&DAYS[day]){const D=DAYS[day];hd.textContent=note?`CHAPTER ${day+1} · ${D.date} ${WD[D.wd]}`:`DAY ${String(day+1).padStart(2,'0')} · ${D.date} ${WD[D.wd]}`}
  renderDayMemo(); miniUpdate();
}
// --- folding header: the hero scrolls away and a one-line bar takes its place ---
function miniUpdate(){
  const D=DAYS[day]; if(!D) return; const onDay=document.body.dataset.tab==='timeline'||!document.body.dataset.tab;
  $('#mbDay').textContent=onDay?String(day+1).padStart(2,'0'):'';
  $('#mbDay').hidden=!onDay;
  $('#mbTitle').textContent=onDay?dayTitleOf(day):($('#planName')?$('#planName').textContent:'');
  document.querySelectorAll('[data-mbday]').forEach(b=>b.hidden=!onDay||DAYS.length<2);
}
function heroWatch(){
  const hero=$('#hero'); if(!hero) return;
  let raf=0;
  const on=()=>{raf=0;const h=hero.offsetHeight||1, y=window.scrollY, t=Math.max(0,Math.min(1,y/Math.max(1,h-64)));
    hero.style.setProperty('--fold',t.toFixed(3));
    const mini=y>h-64; if(document.body.classList.contains('mini')!==mini){document.body.classList.toggle('mini',mini);$('#miniBar').setAttribute('aria-hidden',String(!mini));document.querySelectorAll('.mb-nav').forEach(b=>b.tabIndex=mini?0:-1)}};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(on)},{passive:true}); on();
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.mbday){const n=day+ +t.dataset.mbday;if(n>=0&&n<DAYS.length){day=n;renderAll()}return}
  if(t.id==='lookBtn'){openLook();return}
});
// --- 여행 꾸미기 sheet ---
let lookDraft=null;
function openLook(){
  lookDraft=Object.assign(lookOf(),{titles:DAYS.map((_,i)=>((profile.dayTitles||[])[i])||''),name:(plans.find(x=>x.id===curPlan)||{}).name||planName()});
  renderLookSheet(); $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
}
function renderLookSheet(){
  const L=lookDraft, sw=(k,v,cur,inner,lbl,extra)=>`<button type="button" class="lk-opt ${k}" data-lk="${k}:${v}" aria-pressed="${cur===v}" aria-label="${esc(lbl)}"${extra||''}>${inner}</button>`;
  $('#sheet').innerHTML=`<h3>여행 꾸미기</h3>
  <form id="lookForm" class="look-form">
    <label class="lk-f"><span class="hint">여행 제목</span><input id="lkName" maxlength="30" value="${esc(L.name)}" class="lk-title"></label>
    <label class="lk-f"><span class="hint">한 줄 소개</span><input id="lkTag" maxlength="40" value="${esc(L.tagline)}" placeholder="예) 3박 4일 · 미나미 중심 · 둘이서"></label>
    <div class="lk-f"><span class="hint">스타일</span><div class="lk-row">${sw('style','color',L.style,'<b>컬러 블록</b><small>깔끔하게, 여행 색으로</small>','컬러 블록',' style="flex:1"')}${sw('style','note',L.style,'<b>여행 수첩</b><small>종이·도장·손글씨</small>','여행 수첩',' style="flex:1"')}</div></div>
    <div class="lk-f"><span class="hint">테마 색</span><div class="lk-row">${LOOK_COLORS.map(([c,n])=>sw('color',c,L.color,'',n,` style="--sw:${c}"`)).join('')}</div></div>
    <div class="lk-f"><span class="hint">커버</span><div class="lk-row">${LOOK_COVERS.map(([c,n])=>sw('cover',c,L.cover,`<span class="lk-cv" style="--theme:${L.color}">${coverSVG(c,64,40)}</span><small>${n}</small>`,n)).join('')}
      <label class="lk-opt cover lk-photo" aria-pressed="${L.cover==='photo'}"><span class="lk-cv"${L.photo?` style="background-image:url('${L.photo}')"`:''}></span><small>내 사진</small><input type="file" accept="image/*" id="lkPhoto" hidden></label></div></div>
    <div class="lk-f"><span class="hint">손글씨 메모 글꼴</span><div class="lk-row">${LOOK_HANDS.map(([k,n,f])=>sw('hand',k,L.hand,`<span style="font-family:${f},cursive;font-size:20px">참치!</span><small>${n}</small>`,n)).join('')}</div></div>
    <div class="lk-f"><div class="lk-h"><span class="hint">날짜별 제목</span>${sample?'<button type="button" class="small-btn" id="lkAi">AI로 지어 보기</button>':''}</div>
      ${DAYS.map((D,i)=>`<label class="lk-day"><span class="mono">Day ${i+1}</span><input data-lkday="${i}" maxlength="40" value="${esc(L.titles[i]||'')}" placeholder="${esc(D.title)}"></label>`).join('')}
      <p class="hint" id="lkSt">비워 두면 일정에 맞춰 자동으로 지어요.</p></div>
    <div class="row"><button class="small-btn primary" type="submit">저장</button><button class="small-btn" type="button" data-close="1">취소</button></div>
  </form>`;
}
function lookCollect(){const L=lookDraft;if(!$('#lookForm'))return;L.name=$('#lkName').value;L.tagline=$('#lkTag').value;document.querySelectorAll('[data-lkday]').forEach(i=>L.titles[+i.dataset.lkday]=i.value)}
async function lookAiTitles(){
  const st=$('#lkSt'); st.textContent='제목을 짓는 중이에요 (보통 10~20초)';
  const days=DAYS.map((D,i)=>`Day ${i+1}: `+analyze(i).items.filter(x=>!x.stay).map(x=>x.name).slice(0,8).join(', '));
  const prompt=`Write a short, evocative Korean title for each day of this trip to ${PACK.city}, like chapter titles of a travel journal (8-18 Korean characters, no emoji, no "Day N"). Trip title: "${lookDraft.name}".
${days.join('\n')}
Reply with only JSON: {"titles":["...", ...]} with exactly ${DAYS.length} items.`;
  try{const r=await sample.json(prompt,{cache:false});const a=Array.isArray(r&&r.titles)?r.titles:[];
    a.slice(0,DAYS.length).forEach((t,i)=>{lookDraft.titles[i]=String(t||'').slice(0,40)});renderLookSheet();$('#lkSt').textContent='마음에 들지 않는 건 고쳐 쓰면 돼요.'}
  catch(e){st.textContent=errText(e,'제목을 짓지 못했어요')}
}
function lookPhoto(file){ // shrink to at most 720 px wide so it syncs quickly
  const img=new Image(), url=URL.createObjectURL(file);
  img.onload=()=>{const s=Math.min(1,720/img.width), c=document.createElement('canvas'); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
    lookCollect(); lookDraft.photo=c.toDataURL('image/jpeg',.72); lookDraft.cover='photo'; renderLookSheet()};
  img.onerror=()=>{URL.revokeObjectURL(url);$('#lkSt').textContent='사진을 읽지 못했어요.'};
  img.src=url;
}
function saveLook(){
  lookCollect(); const L=lookDraft;
  profile.look={color:L.color,pop:L.pop,cover:L.cover,tagline:L.tagline.trim().slice(0,40),style:L.style,hand:L.hand,photo:L.cover==='photo'?L.photo:''};
  const t=L.titles.map(x=>String(x||'').trim().slice(0,40)); while(t.length&&!t[t.length-1])t.pop(); profile.dayTitles=t;
  store.set('gp.profile',profile);
  const p=plans.find(x=>x.id===curPlan), nm=L.name.trim().slice(0,30); if(p&&nm&&nm!==p.name){p.name=nm;p.custom_name=true;savePlans()}
  closeSheet(); renderAll(); showToast('여행을 꾸몄어요');
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!lookDraft||!$('#lookForm'))return;
  if(t.dataset.lk){lookCollect();const [k,v]=t.dataset.lk.split(':');lookDraft[k]=v;renderLookSheet();return}
  if(t.id==='lkAi'){lookCollect();lookAiTitles();return}
});
document.addEventListener('change',e=>{if(e.target.id==='lkPhoto'&&e.target.files&&e.target.files[0])lookPhoto(e.target.files[0])});
document.addEventListener('submit',e=>{if(e.target.id!=='lookForm')return;e.preventDefault();saveLook()});
