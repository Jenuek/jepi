// ---------- events ----------
document.addEventListener('click',e=>{
  const t=e.target.closest('button,input,label'); if(!t) return;
  if(t.dataset.day!=null){day=+t.dataset.day;renderAll();return}
  if(t.dataset.tab){tab=t.dataset.tab;autoMsg='';if(tab==='me'){draft=clone(profile);meOpen=null;renderMe()}if(tab==='pref'){draft=clone(profile);renderTasteStyle()}if(tab==='plans'){snapshotCurrent();showText=false;renderPlans()}if(tab==='settings'){keyEdit=null;renderSettings()}if(tab==='more')renderMore();if(PANELS[tab])PANELS[tab].render();renderTabs();if(tab==='map')openMap();else mapState.on=false;window.scrollTo({top:0});return}
  if(t.id==='customBtn'){openCustom(null,null);return}
  if(t.dataset.newcustom!=null){openCustom(null,+t.dataset.newcustom);return}
  if(t.dataset.editcustom){openCustom(t.dataset.editcustom,null);return}
  if(t.id==='onbPrev'){if(onbStep>0){onbStep--;renderOnb()}return}
  if(t.id==='onbSkip'&&placeCtl){placeCtl.abort();return}
  if(t.id==='onbNext'||t.id==='onbSkip'){onbAdvance();return}
  if(t.dataset.pickjp&&draft){draft.jpPicked=true;setJP(t.dataset.pickjp);if(t.dataset.pickjp==='P'){draft.startMode='pq';draft.q={when:'',len:'',slot:'noon'}}renderOnb();return}
  if(t.dataset.q&&draft){const q=draft.q||(draft.q={});const v=t.dataset.qv;if(t.dataset.q==='party'){draft.party.type=v;if(v==='friends'&&draft.party.adults<2)draft.party.adults=3;if(v==='couple')draft.party.adults=2;if(v==='family'&&draft.party.adults<2)draft.party.adults=2}else q[t.dataset.q]=v;if(t.dataset.q==='when'&&v!=='pick')draft.dateSet=true;if(t.dataset.q==='when'&&v==='pick')draft.dateSet=false;rerenderForm();return}
  if(t.id==='quickStart'){quickStart();return}
  if(t.dataset.puid){openSheet(t.dataset.puid);return}
  if(t.dataset.proll){pRollDo(t.dataset.proll);return}
  if(t.dataset.pnext){pRollDo(t.dataset.pnext);return}
  if(t.dataset.pyes){pYes(t.dataset.pyes);return}
  if(t.dataset.pclose){delete pRoll[t.dataset.pclose];renderPView();return}
  if(t.dataset.pai){pAI(t.dataset.pai);return}
  if(t.dataset.startmode&&draft){draft.startMode=t.dataset.startmode;draft.kind=draft.startMode==='day'?'day':'trip';if(draft.kind==='day'){draft.nightsSet=true;draft.bookedFlight=true;draft.bookedStay=true;draft.flightSet=true;draft.staySet=true;draft.q={when:'',len:'0',slot:'noon'}}if(t.dataset.destmode!=null)draft.destMode=t.dataset.destmode;else if(t.dataset.startmode==='quick'&&!t.closest('.choose'))draft.destMode=draft.dest?'':'find';if(draft.startMode==='talk'&&!talk)talkReset();renderOnb();return}
  if(t.dataset.talkopt!=null&&talk){talkSend(talk.options[+t.dataset.talkopt]);return}
  if(t.id==='talkSend'){const v=(($('#talkInput')||{}).value||'').trim();if(v)talkSend(v);return}
  if(t.id==='talkFinish'){talkSend('__finish__');return}
  if(t.id==='talkRetry'){talkSend(null,{retry:true});return}
  if(t.id==='talkRedo'){talkReset();rerenderForm();return}
  if(t.id==='talkApply'&&talk&&talk.summary){const S=talk.summary;draft.startMode='quick';
    if(S.dest){draft.dest=S.dest;draft.destMode='';draft.fromTalk=true;renderOnb()}
    else{draft.destMode='find';draft.want=draft.purpose||'';draft.fromTalk=true;renderOnb()}
    return}
  if(t.dataset.destmode!=null&&draft){draft.destMode=t.dataset.destmode;rerenderForm();return}
  if(t.id==='destRecBtn'){if(!datesReady(draft)){needDates();return}recommendDest();return}
  if(t.id==='destMoreBtn'){recommendDest({more:true});return}
  if(t.id==='destAskBtn'){const v=(($('#destAsk')||{}).value||'').trim();if(v)recommendDest({ask:v});else setSt('st_ask','궁금한 여행지를 적어 주세요.');return}
  if((t.dataset.pickdest!=null&&destRecs||t.dataset.pickask!=null)&&draft){const dd=t.dataset.pickask!=null?destAsked[+t.dataset.pickask]:destRecs[+t.dataset.pickdest];if(!dd)return;draft.dest=dd.city;draft.destMode='';draft.bookedFlight=false;draft.bookedStay=false;draft.mode=dd.country&&dd.country!=='대한민국'&&dd.country!=='한국'?'flight':draft.mode;rerenderForm();
    setTimeout(()=>{const b=$('#onb').hidden?$('#genPack'):$('#onb #genPack');if(b&&sample)b.click()},0);return}
  if(t.id==='genPack'){
    const dest=String((draft&&draft.dest)||($('[data-pf="dest"]')||{}).value||'').trim();
    if(!dest){setSt('st_pack','여행지를 먼저 적어 주세요.');return}
    if(draft) draft.dest=dest;
    if(onbBusy){setSt('st_pack','이미 준비하는 중이에요. 잠시만 기다려 주세요.');return}
    setSt('st_pack','요청을 보내는 중이에요…');
    (async()=>{const inOnb=!$('#onb').hidden;if(await genPack(dest)){if(inOnb)renderOnb();else{commitProfile(draft);renderAll();renderMe();await morePlaces(24,'st_pack','');renderAll()}}})()
      .catch(err=>{onbBusy=false;setBusy(false);t.textContent='AI로 여행지 준비하기';setSt('st_pack','문제가 생겼어요: '+((err&&(err.message||err.code))||err)+' · 다시 눌러 주세요.')});
    return}
  if(t.id==='onbExample'){if(onbBusy)return;demoEnter();return}
  if(t.dataset.radio&&!t.closest('#helper')){if(t.dataset.radio.startsWith('style.'))styleOpen=true;let v=t.dataset.val;if(v==='true')v=true;else if(v==='false')v=false;if(draft){setPath(draft,t.dataset.radio,v);if(t.dataset.radio==='mode')draft.local=v==='car'?'car':'transit';if(t.dataset.radio==='party.type'){const q=draft.party;if(v==='couple')q.adults=2;if(v==='friends'&&q.adults<2)q.adults=3;if(v==='family'){if(q.adults<2)q.adults=2;if(!q.kids)q.kids=1;draft.pace='slow'}fixProfile(draft)}rerenderForm()}return}
  if(t.dataset.kwtoggle){const k=t.dataset.kwtoggle,i=kws.findIndex(x=>norm(x)===norm(k));if(i>=0)kws.splice(i,1);else kws.push(k);store.set('gp.kw',kws);t.setAttribute('aria-pressed',String(i<0));renderPref();return}
  if(t.dataset.addstay&&draft){const n=nightsOf(draft);draft.stays.push({name:'숙소 '+(draft.stays.length+1),area:firstArea(),checkin:'15:00',checkout:'11:00',from:Math.max(0,n-1),to:n});rerenderForm();return}
  if(t.dataset.delstay!=null&&draft){draft.stays.splice(+t.dataset.delstay,1);rerenderForm();return}
  if(t.dataset.addev&&draft){draft.events.push({name:'',day:0,start:'19:00',end:'21:00',area:firstArea()});rerenderForm();return}
  if(t.dataset.delev!=null&&draft){draft.events.splice(+t.dataset.delev,1);rerenderForm();return}
  if(t.dataset.aifill){aiFill(t.dataset.aifill);return}
  if(t.id==='aiKw'){aiKeywords();return}
  if(t.id==='meSave'){commitProfile(draft);draft=clone(profile);renderAll();renderMe();const m=$('#meMsg');if(m)m.textContent='저장했어요. 고정 블록을 다시 만들었어요.';return}
  if(t.id==='meOnb'){openOnb();return}
  if(t.id==='wipeBtn'){if(!wipeArm){wipeArm=true;renderSettings();return}wipeAll();return}
  if(t.id==='wipeCancel'){wipeArm=false;renderSettings();return}
  if(t.id==='chatStop'){chatCtl&&chatCtl.abort();return}
  if(t.dataset.chatapply!=null){applyChat(+t.dataset.chatapply);return}
  if(t.dataset.chatcancel!=null){const m=chat[+t.dataset.chatcancel];if(m){m.state='cancelled';renderChat()}return}
  if(t.dataset.chatundo!=null){undoChat(+t.dataset.chatundo);return}
  if(t.dataset.cat){cat=t.dataset.cat;renderTray();return}
  if(t.dataset.group){group=t.dataset.group;renderTray();return}
  if(t.dataset.kwdel!=null){kws.splice(+t.dataset.kwdel,1);saveKw();return}
  if(t.dataset.kwadd){if(!kws.some(k=>norm(k)===norm(t.dataset.kwadd)))kws.push(t.dataset.kwadd);saveKw();return}
  if(t.id==='kwReset'){kws=DEFAULT_KW.slice();saveKw();return}
  if(t.dataset.meal){meals[day]=Math.max(0,Math.min((PACK.snack||1000)*20,mealOf(day)+ +t.dataset.meal));store.set('gp.meal2',meals);renderBudget();return}
  if(t.dataset.fill){place(t.dataset.fill,+t.dataset.start);closeSheet();renderAll();return}
  if(t.dataset.totray){closeSheet();tab='tray';renderTabs();return}
  if(t.id==='seasonBtn'){genSeason('st_season');return}
  if(t.id==='nudgeFlightIn'){goMe('가는 길');return}
  if(t.id==='nudgeFlightNo'){profile.bookedFlight=false;store.set('gp.profile',profile);renderAll();openHelper(2);return}
  if(t.id==='nudgeStayIn'){if(profile.bookedStay===false){profile.bookedStay=true}goMe('숙소');return}
  if(t.id==='nudgeStayNo'){profile.bookedStay=false;store.set('gp.profile',profile);renderAll();openHelper(wish.length?1:0);return}
  if(t.id==='nudgeDate'){goMe('여행 기간');return}
  if(t.id==='nudgeTaste'){tab='pref';renderPref();renderTabs();return}
  if(t.dataset.nudgeoff){profile.nudgeOff=Object.assign({},profile.nudgeOff,{[t.dataset.nudgeoff]:true});store.set('gp.profile',profile);renderNudges();return}
  if(t.id==='planNew'){newPlan();return}
  if(t.dataset.planopen){openPlan(t.dataset.planopen);return}
  if(t.dataset.plandup){dupPlan(t.dataset.plandup);return}
  if(t.dataset.plandel){delPlan(t.dataset.plandel);return}
  if(t.dataset.planrename){const p=plans.find(x=>x.id===t.dataset.planrename);const row=t.closest('.plan');if(p&&row){row.querySelector('.pl-top').innerHTML=`<input class="pl-name" maxlength="40" value="${esc(p.name||'')}"><button class="small-btn primary" data-planname="${p.id}">저장</button>`;row.querySelector('.pl-name').focus()}return}
  if(t.dataset.planname){const v=(t.parentElement.querySelector('.pl-name')||{}).value||'';renamePlan(t.dataset.planname,v.trim());return}
  if(t.id==='planShare'){shareCode();return}
  if(t.id==='planText'){showText=!showText;renderPlans();if(showText)copyText(planText());return}
  if(t.id==='planTxt'){downloadText(`${planName()}.txt`,planText());return}
  if(t.id==='planJson'){snapshotCurrent();downloadText(`JEPI-${planName()}.json`,JSON.stringify({jepi:1,name:planName(),data:planData()}));return}
  if(t.id==='codeOpen'){openCode(($('#codeIn')||{}).value);return}
  if(t.dataset.jp){setJP(t.dataset.jp);renderAll();return}
  if(t.id==='diceFab'){openDiceTab(mealNow()==='snack'?'do':'eat',null);return}
  if(t.dataset.dicefrom!=null){dice.tab='do';doDefaults(true);openDice(+t.dataset.dicefrom);diceRoll(false);return}
  if(t.dataset.dicegap!=null){dice.gapI=+t.dataset.dicegap;dice.pick=null;dice.msg='';renderDice();return}
  if(t.dataset.dicemood){dice.mood=t.dataset.dicemood;dice.pick=null;dice.msg='';renderDice();return}
  if(t.dataset.dicewalk){dice.walk=+t.dataset.dicewalk;dice.pick=null;renderDice();return}
  if(t.id==='diceGo'){diceRoll(false);return}
  if(t.id==='diceAgain'){diceRoll(true);return}
  if(t.id==='diceFix'){diceFix(false);return}
  if(t.id==='diceForce'){diceFix(true);return}
  if(t.id==='diceAI'){diceAI();return}
  if(t.id==='coachNext'){showCoach(+$('#coach').dataset.i+1);return}
  if(t.id==='coachSkip'){showCoach(COACH.length);return}
  if(t.id==='coachAgain'){showCoach(0);return}
  if(t.id==='moreHelper'){openHelper(wish.length?1:0);return}
  if(t.id==='fixWarnBtn'||t.id==='fixWarnChip'){const ws=[];DAYS.forEach((_,d)=>analyze(d).items.forEach(it=>it.warns.forEach(w=>ws.push(`Day ${d+1} ${it.name}: ${w}`))));tab='timeline';renderTabs();sendChat('지금 일정의 경고를 모두 해결해 줘. 꼭 필요한 것만 바꾸고, 바꿀 수 없는 고정 일정은 그대로 둬.\n'+ws.slice(0,20).join('\n'));const c=$('#chat');if(c)c.scrollIntoView({block:'start'});return}
  if(t.id==='helperBtn'||t.id==='meHelper'){openHelper(0);return}
  if(t.id==='helperPrev'){if(hStep>0){hStep--;renderHelper();$('#helper').scrollTop=0}return}
  if(t.id==='helperNext'){if(hStep<H_STEPS.length-1){hStep++;renderHelper();$('#helper').scrollTop=0}else closeHelper();return}
  if(t.id==='helperClose'){closeHelper();return}
  if(t.id==='helperToMe'){closeHelper();tab='me';draft=clone(profile);renderMe();renderTabs();return}
  if(t.id==='wishPasteBtn'){resolveWishes(($('#wishPaste')||{}).value||'','st_wish');return}
  if(t.id==='vibeBtn'){askVibes();return}
  if(t.dataset.hotels){askHotels(t.dataset.hotels);return}
  if(t.id==='routeBtn'){askRoutes();return}
  if(t.dataset.wish){toggleWish(t.dataset.wish);if(!$('#helper').hidden)renderHelper();renderTray();return}
  if(t.dataset.setarea){const k=t.dataset.setarea;profile.stayPicked=k;profile.stays.forEach((st,i)=>{if(i===0||profile.bookedStay===false){st.area=k;if(profile.bookedStay===false)st.name=`숙소 (미정 · ${AREAS[k][0]})`}});store.set('gp.profile',profile);buildDays();renderHelper();return}
  if(t.dataset.slot){const [a,d]=t.dataset.slot.split(',').map(Number);setSlot(a,d);return}
  if(t.closest('#helper')&&t.dataset.radio){let v=t.dataset.val==='true';profile[t.dataset.radio]=v;store.set('gp.profile',profile);renderHelper();return}
  if(t.dataset.zoom){setZoom(+t.dataset.zoom);return}
  if(t.dataset.vote){toggleRec(t.dataset.vote);return}
  if(t.dataset.pick){selected=selected===t.dataset.pick?null:t.dataset.pick;
    if(selected&&!matchMedia('(min-width:900px)').matches){tab='timeline'}
    renderAll();return}
  if(t.classList.contains('slot')){
    if(!selected){openFill(+t.dataset.t);return}
    place(selected,+t.dataset.t); selected=null; renderAll(); return}
  if(t.classList.contains('blk')){openSheet(t.dataset.uid);return}
  if(t.id==='bannerCancel'){selected=null;renderAll();return}
  if(t.id==='resetBtn'){
    if(!resetArm){resetArm=true;renderChecks();return}
    resetArm=false;fmarks={};store.set('gp.fmarks',fmarks);placed=DEFAULT.map(b=>({uid:'u'+(uidN++),id:b.id,day:b.day,start:b.start,dur:PM[b.id].dur}));save();renderAll();return}
  if(t.id==='aiBtn'){openFind({when:'gap',into:'sched'});return}
  if(t.id==='aiStop'){aiState?.ctl?.abort();return}
  if(t.id==='aiClose'){aiState=null;renderAI();return}
  if(t.dataset.acc!=null&&aiState?.items){const x=aiState.items[+t.dataset.acc];if(x&&!x.added){place(x.id,x.start);x.added=true;renderAll()}return}
  if(t.dataset.goto!=null){day=+t.dataset.goto;tab='timeline';renderAll();openSheet(t.dataset.uid);return}
  const sh=t.closest('#sheet');
  if(sh){const uid=sh.dataset.uid, b=placed.find(x=>x.uid===uid);
    if(t.dataset.close){closeSheet();return}
    if(t.dataset.swap&&b){b.id=t.dataset.swap;b.start=+t.dataset.start;b.dur=+t.dataset.dur;save();renderAll();openSheet(uid);return}
    if(t.dataset.mark){toggleMark(uid,t.dataset.mark);renderAll();openSheet(uid);const m=$('#sheet .marks');if(m)m.open=true;return}
    if(t.dataset.pairblock){makePairBlock(uid,t.dataset.pairblock);return}
    if(t.dataset.home){profile.home.min=Math.max(10,Math.min(240,(+profile.home.min||60)+ +t.dataset.home));store.set('gp.profile',profile);buildDays();renderAll();openSheet('f0a');return}
    if(!b) return;
    if(t.dataset.mv){b.start=Math.max(dayStart(day),Math.min(1410,b.start+ +t.dataset.mv))}
    if(t.dataset.du){b.dur=Math.max(30,Math.min(720,b.dur+ +t.dataset.du))}
    if(t.dataset.del){placed=placed.filter(x=>x.uid!==uid);save();closeSheet();renderAll();return}
    // only the move/length buttons redraw the sheet; tapping an input (memo, etc.) must keep focus for the keyboard
    if(t.dataset.mv||t.dataset.du){save();renderAll();openSheet(uid)}return}
});
document.addEventListener('change',e=>{
  if(e.target.id==='openOnly'){renderTray();return}
  if(e.target.id==='dateUnknown'&&draft){draft.dateUnknown=e.target.checked;if(draft.dateUnknown){draft.startDate=isoPlus(30);draft.dateSet=true}else draft.dateSet=false;rerenderForm();return}
  if(e.target.classList&&e.target.classList.contains('importFile')){importBackup(e.target.files&&e.target.files[0],ok=>{if(ok){maybeCoach()}});return}
  if(e.target.id==='diceLunch'){dice.lunch=e.target.checked;dice.pick=null;dice.msg='';renderDice();return}
  if(e.target.id==='catSel'){cat=e.target.value||'all';renderTray();return}
  if(e.target.dataset.ck){done[e.target.dataset.ck]=e.target.checked;store.set('gp.done',done);renderChecks()}
});
$('#sheetBg').addEventListener('click',e=>{if(e.target.id==='sheetBg')closeSheet()});
document.addEventListener('submit',e=>{if(e.target.id!=='kwForm')return;e.preventDefault();
  const v=($('#kwInput').value||'').trim(); if(v&&!kws.some(k=>norm(k)===norm(v))){kws.push(v);saveKw()} else {$('#kwInput').value=''}});
document.addEventListener('submit',e=>{const f=e.target;
  if(f.id==='customForm'){e.preventDefault();saveCustomForm(f)}
  else if(f.id==='moreForm'){e.preventDefault();const v=$('#moreInput').value.trim();$('#moreInput').value='';openFind({where:'city',into:'list',q:v,autorun:true})}
  else if(f.id==='chatForm'){e.preventDefault();const v=$('#chatInput').value.trim();if(v){$('#chatInput').value='';sendChat(v)}}});
document.addEventListener('input',onPf);
document.addEventListener('keydown',e=>{if(e.target&&e.target.id==='talkInput'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();const v=e.target.value.trim();if(v)talkSend(v)}});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='chatInput'){const x=e.target;x.style.height='auto';x.style.height=Math.min(120,x.scrollHeight)+'px'}}); document.addEventListener('change',onPf);
document.addEventListener('keydown',e=>{if(e.target&&e.target.id==='chatInput'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();const f=$('#chatForm');f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}))}});
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&d.classList.contains('zone'))zoneOpen[d.dataset.zone]=d.open},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#sheetBg').hidden)closeSheet();else if(selected){selected=null;renderAll()}}});
// drag & drop (desktop)
let drag=null;
document.addEventListener('dragstart',e=>{
  const c=e.target.closest('.card'); const b=e.target.closest('.blk');
  if(c){drag={type:'new',id:c.dataset.id}} else if(b&&b.dataset.uid){drag={type:'move',uid:b.dataset.uid}} else return;
  try{e.dataTransfer.setData('text/plain','x');e.dataTransfer.effectAllowed='move'}catch(_){}
});
document.addEventListener('dragend',()=>{drag=null;document.querySelectorAll('.slot.drop').forEach(s=>s.classList.remove('drop'))});
const gridEl=$('#grid');
gridEl.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();
  document.querySelectorAll('.slot.drop').forEach(s=>s.classList.remove('drop'));
  const s=document.elementsFromPoint(e.clientX,e.clientY).find(el=>el.classList&&el.classList.contains('slot')); if(s) s.classList.add('drop')});
gridEl.addEventListener('drop',e=>{if(!drag)return;e.preventDefault();
  const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  const r=gridEl.getBoundingClientRect(); const m=dayStart(day)+Math.floor(((e.clientY-r.top)/H*60)/30)*30;
  if(drag.type==='new') place(drag.id,m); else {const b=placed.find(x=>x.uid===drag.uid); if(b){b.start=Math.max(dayStart(day),Math.min(1410,m));save()}}
  drag=null; selected=null; renderAll()});
matchMedia('(min-width:900px)').addEventListener?.('change',renderTabs);

