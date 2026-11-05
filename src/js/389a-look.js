// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// profile.look = {color, cover:'city'|'sea'|'mountain'|'none'|'photo', photo:dataURL, tagline, style:'color'|'note', hand}
// Lives in the plan's profile, so it syncs across devices and to friends on a shared trip.
const LOOK_COLORS=[['#2448c9','코발트'],['#c23b22','노을'],['#0f7a5c','숲'],['#6b2fb3','보라'],['#0e7490','바다'],['#b45309','호박'],['#be185d','체리'],['#2b2a33','먹']];
const LOOK_HANDS=[['pen','나눔펜','"Nanum Pen Script"'],['gaegu','개구','"Gaegu"'],['melody','하이멜로디','"Hi Melody"']];
const LOOK_COVERS=[['city','도시'],['sea','바다'],['mountain','산'],['none','없음']];
const lookOf=()=>Object.assign({color:'#2448c9',pop:'#ffd23f',cover:'city',tagline:'',style:'color',hand:'pen',photo:''},(CUR.profile&&CUR.profile.look)||{});
function coverSVG(kind,w,h){
  const k=kind||'city';
  if(k==='sea') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="38" r="18" fill="var(--pop)"/><path d="M0 92 C40 84,80 100,200 86 V120 H0Z" fill="#fff" fill-opacity=".16"/><path d="M0 104 C50 96,110 114,200 100 V120 H0Z" fill="#000" fill-opacity=".18"/></svg>`;
  if(k==='mountain') return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="160" cy="30" r="16" fill="var(--pop)"/><path d="M40 120 L100 50 L130 86 L150 66 L200 120Z" fill="#000" fill-opacity=".2"/><path d="M100 50 L112 64 L88 64Z" fill="#fff" fill-opacity=".7"/></svg>`;
  if(k==='none'||k==='photo') return '';
  return `<svg viewBox="0 0 200 120" width="${w}" height="${h}" preserveAspectRatio="xMaxYMax meet"><circle cx="150" cy="34" r="20" fill="var(--pop)" fill-opacity=".9"/><path d="M0 120 V84 H16 V64 H34 V90 H50 V52 H62 L68 44 L74 52 V92 H96 V70 H116 V96 H134 V60 H150 V88 H170 V74 H200 V120Z" fill="#000" fill-opacity=".18"/></svg>`;
}
// the header is drawn by React (app/screens/Hero.tsx) from heroView; hero({…}) changes some of it and draws again
let heroView={artHtml:'',artBg:'',artPhoto:false,jp:'J',planName:'',planOpen:false,meta:'',tag:'',day:'',title:'',sub:'',memo:'',editing:false,slot:false};
function hero(p){heroView={...heroView,...p};window.JEPI_UI.mount('hero',$('#heroMount'),heroView)}
// pressed in the header
function heroAct(n){
  if(n==='look')openLook();
  else if(n==='J'||n==='P'){setJP(n);renderAll()}
  else if(n==='plan')planMenu(document.getElementById('planMenu').hidden);
  else if(n==='title'){if(!$('#dayTitleIn'))titleEditing(true)}
}
function renderLook(){
  const L=lookOf(), R=document.documentElement.style, note=L.style==='note';
  R.setProperty('--theme',L.color); R.setProperty('--pop',L.pop);
  R.setProperty('--f-hand',(LOOK_HANDS.find(x=>x[0]===L.hand)||LOOK_HANDS[0])[2]+', cursive');
  document.body.classList.toggle('style-note',note);
  {const photo=L.cover==='photo'&&L.photo, p={
    artBg:photo?`linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.45)),url("${L.photo}")`:'',artPhoto:!!photo,
    artHtml:note?`<div class="stamp"><span>${esc((PK.pack.city||'TRIP').slice(0,8))}</span><b>${esc(((DAYS[0]||{}).date||'').replace(/\s.*/,''))}</b><span>${esc(String(new Date().getFullYear()))}</span></div>`:photo?'':coverSVG(L.cover,190,120),
    tag:L.tagline||''};
  if(DAYS[day]){const D=DAYS[day];p.day=note?`CHAPTER ${day+1} · ${D.date} ${WD[D.wd]}`:`DAY ${String(day+1).padStart(2,'0')} · ${D.date} ${WD[D.wd]}`}
  hero(p)}
  renderDayMemo(); miniUpdate();
}
// --- folding header: the hero scrolls away and a one-line bar takes its place ---
// (drawn by React: app/screens/Bars.tsx, from miniView; miniBar({…}) changes some of it and draws again)
let miniView={on:false,day:'',dayHidden:false,title:'',navHidden:false};
function miniBar(p){miniView={...miniView,...p};window.JEPI_UI.mount('mini',$('#miniMount'),miniView)}
function miniUpdate(){
  const D=DAYS[day]; if(!D) return; const onDay=document.body.dataset.tab==='timeline'||!document.body.dataset.tab;
  miniBar({day:onDay?String(day+1).padStart(2,'0'):'',dayHidden:!onDay,title:onDay?dayTitleOf(day):($('#planName')?$('#planName').textContent:''),navHidden:!onDay||DAYS.length<2});
}
function heroWatch(){
  const hero=$('#hero'); if(!hero) return;
  let raf=0;
  const on=()=>{raf=0;const h=hero.offsetHeight||1, y=window.scrollY, t=Math.max(0,Math.min(1,y/Math.max(1,h-64)));
    hero.style.setProperty('--fold',t.toFixed(3));
    const mini=y>h-64; if(document.body.classList.contains('mini')!==mini){document.body.classList.toggle('mini',mini);miniBar({on:mini})}};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(on)},{passive:true}); on();
}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
});
// --- 여행 꾸미기 sheet: drawn by React (app/screens/LookSheet.tsx), which keeps its own draft and saves itself ---
let lookRev=0;
function openLook(){
  const L=lookOf();
  window.JEPI_UI.mount('look',$('#sheet'),{name:(PL.plans.find(x=>x.id===PL.curPlan)||{}).name||planName(),tagline:L.tagline||'',style:L.style,color:L.color,cover:L.cover,hand:L.hand,photo:L.photo||'',pop:L.pop,
    colors:LOOK_COLORS,covers:LOOK_COVERS.map(([k,n])=>({k,name:n,svg:coverSVG(k,64,40)})),hands:LOOK_HANDS,
    days:DAYS.map((D,i)=>({title:((CUR.profile.dayTitles||[])[i])||'',placeholder:String(D.title)})),ai:!!sample,rev:++lookRev});
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false;
}
// the question for AI로 지어 보기 (asked by the sheet through the host)
async function lookAiTitles(tripName){
  const days=DAYS.map((D,i)=>`Day ${i+1}: `+analyze(i).items.filter(x=>!x.stay).map(x=>x.name).slice(0,8).join(', '));
  const prompt=`Write a short, evocative Korean title for each day of this trip to ${PK.pack.city}, like chapter titles of a travel journal (8-18 Korean characters, no emoji, no "Day N"). Trip title: "${tripName}".
${days.join('\n')}
Reply with only JSON: {"titles":["...", ...]} with exactly ${DAYS.length} items.`;
  const r=await sample.json(prompt,{cache:false}); return Array.isArray(r&&r.titles)?r.titles.slice(0,DAYS.length):[];
}
function lookRenamePlan(nm){const p=PL.plans.find(x=>x.id===PL.curPlan);if(p&&nm&&nm!==p.name){p.name=nm;p.custom_name=true;savePlans()}}
