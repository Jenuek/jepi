// ---------- phase strip: before / during / after the trip ----------
const isoOf=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function todayIdx(){const t=isoOf(new Date());return DAYS.findIndex(D=>D.iso===t)}
function renderPhase(){
  const el=$('#phase'); if(!el) return;
  const pr=profile, t=isoOf(new Date()), D0=DAYS[0], Dn=DAYS[DAYS.length-1]; const parts=[];
  // AI 꺼짐 now lives on the 더보기 → 설정 row only (tidy day screen)
  if(!D0||!D0.iso||pr.dateUnknown){el.innerHTML=parts.join('');el.hidden=!parts.length;return}
  const ti=todayIdx();
  if(ti>=0){
    const now=new Date(), nm=now.getHours()*60+now.getMinutes();
    const items=analyze(ti).items.filter(i=>!i.stay||i.start>=nm);
    const cur=items.find(i=>i.start<=nm&&nm<i.end), nx=items.find(i=>i.start>nm);
    let h=`<div class="ph-now">`;
    h+=cur?`<span><small>지금</small> <b>${esc(cur.name)}</b> <span class="mono">~${fmt(cur.end)}</span></span>`:'';
    if(nx){const from=cur||[...items].reverse().find(i=>i.end<=nm)||null; const tr=from&&from.ll&&nx.ll?travel(from.ll,nx.ll):null;
      h+=`<span><small>다음</small> <b class="mono">${fmt(nx.start)}</b> <b>${esc(nx.name)}</b>${tr?` <span class="mono">${tr.real?'':'≈'}${esc(tr.mode)} ${tr.min}분</span>`:''}</span>`;
      if(from&&from.ll&&nx.ll) h+=`<a class="small-btn primary" href="${navLink(from.ll,nx.ll,tr?tr.mode:'도보',nx.name)}" target="_blank" rel="noopener">안내 시작</a>`;
    } else h+=`<span>오늘 일정은 여기까지예요. 푹 쉬세요!</span>`;
    h+=`</div>${day!==ti?`<button class="ph-chip" data-day="${ti}">오늘(Day ${ti+1}) 보기</button>`:''}`;
    parts.unshift(h);
  } else if(D0.iso>t){
    const dd=Math.round((new Date(D0.iso+'T00:00:00')-new Date(t+'T00:00:00'))/864e5);
    const w=warnTotal(), pl=prepLeft(), miss=[pr.kind!=='day'&&pr.bookedFlight===false?'교통편 미정':'',pr.kind!=='day'&&pr.bookedStay===false?'숙소 미정':''].filter(Boolean);
    parts.unshift(`<button class="ph-before" data-tab="check"><b class="mono">D-${dd}</b>${w?`<span class="warn">경고 ${w}</span>`:''}${pl?`<span>남은 준비 ${pl}</span>`:''}${miss.map(x=>`<span class="warn">${x}</span>`).join('')}${!w&&!pl&&!miss.length?'<span>준비 끝!</span>':''}</button>`);
  } else if(Dn&&Dn.iso<t){
    parts.unshift(`<div class="ph-after"><span>여행 어땠어요?</span><button class="ph-chip" data-tab="plans">새 계획 만들기</button></div>`);
  }
  el.innerHTML=parts.join(''); el.hidden=!parts.length;
}
// open the plan whose dates include today, then today's day, scrolled to now
function planCovers(id,t){const d=store.get('gp.plan.'+id,null);const p=d&&d.profile;if(!p||!p.startDate||p.dateUnknown)return false;
  const s=new Date(p.startDate+'T00:00:00'),e=new Date(s);e.setDate(e.getDate()+(p.kind==='day'?0:(+p.nights||0)));const x=new Date(t+'T00:00:00');return x>=s&&x<=e}
function startupFocus(){
  const t=isoOf(new Date());
  if(!(DAYS[0]&&DAYS[0].iso&&todayIdx()>=0)){const p=plans.find(p=>p.id!==curPlan&&planCovers(p.id,t));if(p){openPlan(p.id)}}
  const ti=todayIdx(); if(ti>=0){day=ti;renderAll();
    setTimeout(()=>{const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;const g=$('#grid');if(!g)return;
      const now=new Date(), nm=now.getHours()*60+now.getMinutes(); const y=g.getBoundingClientRect().top+window.scrollY+Math.max(0,(nm-dayStart(day))/60*H-140);window.scrollTo({top:y})},80)}
}
function renderPlanBtn(){const b=$('#planBtn');if(!b)return;const p=plans.find(x=>x.id===curPlan);$('#planName').textContent=(p&&p.name)||planName()}
const inside=sel=>{const a=document.activeElement;return !!(a&&a.closest&&a.closest(sel))};
function renderExt(){document.body.classList.toggle('no-fab',!['timeline','tray'].includes(tab));renderPhase();renderMore();renderPlanBtn();
  if(tab==='me'&&$('#onb').hidden&&!inside('#meBox'))renderMeRows();
  if(tab==='pref'&&!inside('#tasteStyle'))renderTasteStyle();
  if(tab==='settings'&&!inside('#setBox'))renderSettings();
  if(mapState.on){if(mapState.lastDay!==day){mapState.lastDay=day;drawMap(true)}else renderMapCards()}}
// events for the new panels (registered before the main handler; returns early only for its own controls)
document.addEventListener('click',e=>{
  const t=e.target.closest('button,a,label,input'); if(!t) return;
  if(t.dataset.meopen){meOpen=meOpen===t.dataset.meopen?null:t.dataset.meopen;autoMsg='';renderMeRows();return}
  if(t.id==='meHelper2'){openHelper(0);return}
  if(t.id==='moreAll'){moreAll=!moreAll;renderMore();return}
  if(t.id==='wishGo'){cat='wish';tab='tray';renderTray();renderTabs();return}
  if(t.dataset.themeSet){themePref=t.dataset.themeSet;LS.set('jepi.theme',themePref);applyTheme();renderSettings();if(mapState.on)drawMap();return}
  if(t.dataset.keyedit){keyEdit=t.dataset.keyedit;keyShow=false;keyMsg[keyEdit]='';renderSettings();setTimeout(()=>{const i=$('#keyIn');if(i)i.focus()},30);return}
  if(t.id==='keyCancel'){keyEdit=null;renderSettings();return}
  if(t.id==='keyShow'){const i=$('#keyIn'),v=i?i.value:'';keyShow=!keyShow;renderSettings();const j=$('#keyIn');if(j){j.value=v;j.focus()}return}
  if(t.dataset.keysave){const k=t.dataset.keysave,v=(($('#keyIn')||{}).value||'').trim().replace(/\s+/g,'');
    if(!v){keyMsg[k]='키를 붙여 넣어 주세요.';renderSettings();return}
    if(KEY_DEF[k].re&&!KEY_DEF[k].re.test(v)){keyMsg[k]=`${KEY_DEF[k].name} 키 형식이 아닌 것 같아요. 그래도 저장했으니 "확인"을 눌러 보세요.`}
    else keyMsg[k]='';
    KEYS[k]=v;keyEdit=null;keysChanged();testKey(k);return}
  if(t.dataset.keydel){delete KEYS[t.dataset.keydel];keyMsg[t.dataset.keydel]='삭제했어요.';keysChanged();return}
  if(t.dataset.keytest){testKey(t.dataset.keytest);return}
  if(t.id==='mSave'){MODELS.heavy=($('#mHeavy').value||'').trim()||'claude-sonnet-5-5';MODELS.light=($('#mLight').value||'').trim()||'claude-haiku-5-5';MODELS.gemini=($('#mGem').value||'').trim()||'gemini-3.6-flash';LS.set('jepi.models',{heavy:MODELS.heavy,light:MODELS.light,gemini:MODELS.gemini});keysChanged();return}
  if(t.id==='backupAll'){backupAll();return}
  if(t.dataset.mapday!=null){mapState.all=t.dataset.mapday==='all';document.querySelectorAll('[data-mapday]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.mapday==='all')===mapState.all)));drawMap(true);return}
  if(t.id==='mapMe'){locateMe();return}
  if(t.dataset.onbkey){const k=t.dataset.onbkey,i=document.getElementById('onbKey_'+k),v=(i&&i.value||'').trim().replace(/\s+/g,'');if(!v)return;KEYS[k]=v;keysChanged();return}
});
document.addEventListener('click',e=>{const c=e.target.closest('.mcard');if(!c||e.target.closest('a'))return;const {stops}=mapLegs(day);const s=stops[+c.dataset.mapi];if(s&&mapState.map){mapState.map.setView(s.ll,16)}});
// autosave for 이번 여행 / 취향 panels
document.addEventListener('change',e=>{if(e.target.closest&&e.target.closest('#meBox,#tasteStyle')&&!e.target.classList.contains('importFile'))autoSave()});
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!t.closest('#meBox,#tasteStyle'))return;
  if(t.dataset.radio!=null||t.dataset.addstay!=null||t.dataset.delstay!=null||t.dataset.addev!=null||t.dataset.delev!=null||t.dataset.styletoggle!=null)setTimeout(autoSave,0)});
// onboarding: connect AI right on the first screen
function onbKeyBox(){if(!STANDALONE||sample)return '';
  return `<div class="fsec"><h3>AI 연결하기 (처음 한 번)</h3><p class="hint">AI가 여행지 준비, 장소 추천, 일정 짜기를 해요. 키는 이 기기에만 저장돼요. 지금 건너뛰고 나중에 더보기 → 설정에서 넣어도 돼요.</p>
  <div class="kin"><input id="onbKey_anthropic" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Claude API 키 (sk-ant-...)"><button class="small-btn primary" type="button" data-onbkey="anthropic">연결</button></div>
  <details class="khelp"><summary>키 받는 법</summary>${KEY_HELP.anthropic}</details></div>`}

setInterval(()=>{try{const el=document.getElementById('aiSec');if(!el)return;if(!aiState||aiState.status!=='loading'){el.textContent='';return}
  if(!aiState.t0)aiState.t0=Date.now();el.textContent=`${aiWho} · ${Math.round((Date.now()-aiState.t0)/1000)}초째`}catch(_){}},1000);

