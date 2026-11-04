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
// drawn by React: app/screens/LookSheet.tsx
let lookRev=0;
function renderLookSheet(){
  const L=lookDraft;
  window.JEPI_UI.mount('look',$('#sheet'),{name:L.name||'',tagline:L.tagline||'',style:L.style,color:L.color,cover:L.cover,hand:L.hand,photo:L.photo||'',
    colors:LOOK_COLORS,covers:LOOK_COVERS.map(([k,n])=>({k,name:n,svg:coverSVG(k,64,40)})),hands:LOOK_HANDS,
    days:DAYS.map((D,i)=>({title:L.titles[i]||'',placeholder:String(D.title)})),ai:!!sample,rev:++lookRev});
}
function lookCollect(){const L=lookDraft;if(!$('#lookForm'))return;L.name=$('#lkName').value;L.tagline=$('#lkTag').value;document.querySelectorAll('[data-lkday]').forEach(i=>L.titles[+i.dataset.lkday]=i.value)}
async function lookAiTitles(){
  setSt('lkSt','제목을 짓는 중이에요 (보통 10~20초)');
  const days=DAYS.map((D,i)=>`Day ${i+1}: `+analyze(i).items.filter(x=>!x.stay).map(x=>x.name).slice(0,8).join(', '));
  const prompt=`Write a short, evocative Korean title for each day of this trip to ${PACK.city}, like chapter titles of a travel journal (8-18 Korean characters, no emoji, no "Day N"). Trip title: "${lookDraft.name}".
${days.join('\n')}
Reply with only JSON: {"titles":["...", ...]} with exactly ${DAYS.length} items.`;
  try{const r=await sample.json(prompt,{cache:false});const a=Array.isArray(r&&r.titles)?r.titles:[];
    a.slice(0,DAYS.length).forEach((t,i)=>{lookDraft.titles[i]=String(t||'').slice(0,40)});renderLookSheet();setSt('lkSt','마음에 들지 않는 건 고쳐 쓰면 돼요.')}
  catch(e){setSt('lkSt',errText(e,'제목을 짓지 못했어요'))}
}
function lookPhoto(file){ // shrink to at most 720 px wide so it syncs quickly
  const img=new Image(), url=URL.createObjectURL(file);
  img.onload=()=>{const s=Math.min(1,720/img.width), c=document.createElement('canvas'); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
    lookCollect(); lookDraft.photo=c.toDataURL('image/jpeg',.72); lookDraft.cover='photo'; renderLookSheet()};
  img.onerror=()=>{URL.revokeObjectURL(url);setSt('lkSt','사진을 읽지 못했어요.')};
  img.src=url;
}
function saveLook(){
  lookCollect(); const L=lookDraft;
  profile.look={color:L.color,pop:L.pop,cover:L.cover,tagline:L.tagline.trim().slice(0,40),style:L.style,hand:L.hand,photo:L.cover==='photo'?L.photo:''};
  const t=L.titles.map(x=>String(x||'').trim().slice(0,40)); while(t.length&&!t[t.length-1])t.pop(); profile.dayTitles=t;
  TRIP.save('profile',profile);
  const p=plans.find(x=>x.id===curPlan), nm=L.name.trim().slice(0,30); if(p&&nm&&nm!==p.name){p.name=nm;p.custom_name=true;savePlans()}
  closeSheet(); renderAll(); showToast('여행을 꾸몄어요');
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!lookDraft||!$('#lookForm'))return;
  if(t.dataset.lk){lookCollect();const [k,v]=t.dataset.lk.split(':');lookDraft[k]=v;renderLookSheet();return}
  if(t.id==='lkAi'){lookCollect();lookAiTitles();return}
});
document.addEventListener('change',e=>{if(e.target.id==='lkPhoto'&&e.target.files&&e.target.files[0])lookPhoto(e.target.files[0])});
document.addEventListener('submit',e=>{if(e.target.id!=='lookForm')return;e.preventDefault();saveLook()});
