// ---------- events ----------
document.addEventListener('click',e=>{
  const t=e.target.closest('button,input,label'); if(!t) return;
  if(t.dataset.day!=null){day=+t.dataset.day;renderAll();return}
  if(t.dataset.tab){tab=t.dataset.tab;autoMsg='';if(tab==='me'){draft=clone(profile);meOpen=null;renderMe()}if(tab==='pref'){draft=clone(profile);renderTasteStyle()}if(tab==='plans'){snapshotCurrent();showText=false;renderPlans()}if(tab==='settings'){keyEdit=null;renderSettings()}if(tab==='more')renderMore();if(PANELS[tab])PANELS[tab].render({opened:true});renderTabs();if(tab==='map')openMap();else mapState.on=false;window.scrollTo({top:0});return}
  if(t.id==='customBtn'){openCustom(null,null);return}
  if(t.dataset.newcustom!=null){openCustom(null,+t.dataset.newcustom);return}
  if(t.dataset.editcustom){openCustom(t.dataset.editcustom,null);return}
  if(t.id==='onbPrev'){if(onbStep>0){onbStep--;renderOnb()}return}
  if(t.id==='onbSkip'&&placeCtl){placeCtl.abort();return}
  if(t.id==='onbNext'||t.id==='onbSkip'){onbAdvance();return}
  if(t.dataset.pickjp&&draft){draft.jpPicked=true;setJP(t.dataset.pickjp);if(t.dataset.pickjp==='P'){draft.startMode='pq';draft.q={when:'',len:'',slot:'noon'}}renderOnb();return}
  if(t.dataset.q&&draft){const q=draft.q||(draft.q={});const v=t.dataset.qv;if(t.dataset.q==='party'){draft.party.type=v;if(v==='friends'&&draft.party.adults<2)draft.party.adults=3;if(v==='couple')draft.party.adults=2;if(v==='family'&&draft.party.adults<2)draft.party.adults=2}else q[t.dataset.q]=v;if(t.dataset.q==='when'&&v!=='pick')draft.dateSet=true;if(t.dataset.q==='when'&&v==='pick')draft.dateSet=false;rerenderForm();return}
  if(t.id==='quickStart'){quickStart();return}
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
      .catch(err=>{onbBusy=false;setBusy(false);{const L=window.JEPI_UI.live(t);if(L)L.label(null);else t.textContent='AI로 여행지 준비하기'}setSt('st_pack','문제가 생겼어요: '+((err&&(err.message||err.code))||err)+' · 다시 눌러 주세요.')});
    return}
  if(t.id==='onbExample'){if(onbBusy)return;demoEnter();return}
  if(t.dataset.radio){if(t.dataset.radio.startsWith('style.'))styleOpen=true;let v=t.dataset.val;if(v==='true')v=true;else if(v==='false')v=false;if(draft){setPath(draft,t.dataset.radio,v);if(t.dataset.radio==='mode')draft.local=v==='car'?'car':'transit';if(t.dataset.radio==='party.type'){const q=draft.party;if(v==='couple')q.adults=2;if(v==='friends'&&q.adults<2)q.adults=3;if(v==='family'){if(q.adults<2)q.adults=2;if(!q.kids)q.kids=1;draft.pace='slow'}fixProfile(draft)}rerenderForm()}return}
  if(t.dataset.kwtoggle){const k=t.dataset.kwtoggle,i=kws.findIndex(x=>norm(x)===norm(k));if(i>=0)kws.splice(i,1);else kws.push(k);TRIP.kws.save(kws);{const L=window.JEPI_UI.live(t);if(L)L.pressed(i<0);else t.setAttribute('aria-pressed',String(i<0))}renderPref();return}
  if(t.dataset.addstay&&draft){const n=nightsOf(draft);draft.stays.push({name:'숙소 '+(draft.stays.length+1),area:firstArea(),checkin:'15:00',checkout:'11:00',from:Math.max(0,n-1),to:n});rerenderForm();return}
  if(t.dataset.delstay!=null&&draft){draft.stays.splice(+t.dataset.delstay,1);rerenderForm();return}
  if(t.dataset.addev&&draft){draft.events.push({name:'',day:0,start:'19:00',end:'21:00',area:firstArea()});rerenderForm();return}
  if(t.dataset.delev!=null&&draft){draft.events.splice(+t.dataset.delev,1);rerenderForm();return}
  if(t.dataset.aifill){aiFill(t.dataset.aifill);return}
  if(t.id==='meSave'){commitProfile(draft);draft=clone(profile);renderAll();renderMe();meSetMsg('저장했어요. 고정 블록을 다시 만들었어요.');return}
  if(t.id==='meOnb'){openOnb();return}
  if(t.id==='wipeBtn'){if(!wipeArm){wipeArm=true;renderSettings();return}wipeAll();return}
  if(t.id==='wipeCancel'){wipeArm=false;renderSettings();return}
  if(t.dataset.group){group=t.dataset.group;renderTray();return}
  if(t.dataset.kwdel!=null){kws.splice(+t.dataset.kwdel,1);saveKw();return}
  if(t.dataset.kwadd){if(!kws.some(k=>norm(k)===norm(t.dataset.kwadd)))kws.push(t.dataset.kwadd);saveKw();return}
  if(t.id==='kwReset'){kws=DEFAULT_KW.slice();saveKw();return}
  if(t.dataset.meal){meals[day]=Math.max(0,Math.min((PACK.snack||1000)*20,mealOf(day)+ +t.dataset.meal));TRIP.save('meals',meals);renderBudget();return}
  if(t.dataset.fill){place(t.dataset.fill,+t.dataset.start);closeSheet();renderAll();return}
  if(t.dataset.totray){closeSheet();tab='tray';renderTabs();return}
  if(t.id==='seasonBtn'){genSeason('st_season');return}
  if(t.dataset.jp){setJP(t.dataset.jp);renderAll();return}
  if(t.id==='diceFab'){openDiceTab(mealNow()==='snack'?'do':'eat',null);return}
  if(t.dataset.dicefrom!=null){dice.tab='do';doDefaults(true);openDice(+t.dataset.dicefrom);diceRoll(false);return}
  if(t.id==='coachNext'){showCoach(+$('#coach').dataset.i+1);return}
  if(t.id==='coachSkip'){showCoach(COACH.length);return}
  if(t.id==='coachAgain'){showCoach(0);return}
  if(t.id==='moreHelper'){openHelper(wish.length?1:0);return}
  if(t.id==='fixWarnBtn'||t.id==='fixWarnChip'){const ws=[];DAYS.forEach((_,d)=>analyze(d).items.forEach(it=>it.warns.forEach(w=>ws.push(`Day ${d+1} ${it.name}: ${w}`))));tab='timeline';renderTabs();sendChat('지금 일정의 경고를 모두 해결해 줘. 꼭 필요한 것만 바꾸고, 바꿀 수 없는 고정 일정은 그대로 둬.\n'+ws.slice(0,20).join('\n'));const c=$('#chat');if(c)c.scrollIntoView({block:'start'});return}
  if(t.id==='helperBtn'||t.id==='meHelper'){openHelper(0);return}
  if(t.id==='helperPrev'){if(hStep>0){hStep--;renderHelper();$('#helper').scrollTop=0}return}
  if(t.id==='helperNext'){if(hStep<H_STEPS.length-1){hStep++;renderHelper();$('#helper').scrollTop=0}else closeHelper();return}
  if(t.id==='helperClose'){closeHelper();return}
  if(t.dataset.zoom){setZoom(+t.dataset.zoom);if(tab==='settings')renderSettings();return}
  if(t.classList.contains('slot')){
    if(!selected){openFill(+t.dataset.t);return}
    place(selected,+t.dataset.t); selected=null; renderAll(); return}
  if(t.classList.contains('blk')){openSheet(t.dataset.uid);return}
  if(t.id==='bannerCancel'){selected=null;renderAll();return}
  if(t.id==='resetBtn'){
    if(!resetArm){resetArm=true;renderChecks();return}
    resetArm=false;fmarks={};TRIP.save('fmarks',fmarks);placed=DEFAULT.map(b=>({uid:'u'+(uidN++),id:b.id,day:b.day,start:b.start,dur:PM[b.id].dur}));save();renderAll();return}
  if(t.id==='aiBtn'){openFind({when:'gap',into:'sched'});return}
  if(t.id==='aiStop'){aiState?.ctl?.abort();return}
  if(t.id==='aiClose'){aiState=null;renderAI();return}
  if(t.dataset.acc!=null&&aiState?.items){const x=aiState.items[+t.dataset.acc];if(x&&!x.added){place(x.id,x.start);x.added=true;renderAll()}return}
  if(t.dataset.goto!=null){day=+t.dataset.goto;tab='timeline';renderAll();openSheet(t.dataset.uid);return}
  const sh=t.closest('#sheet');
  if(sh){const uid=sh.dataset.uid, b=placed.find(x=>x.uid===uid);
    if(t.dataset.close){closeSheet();return}
    if(t.dataset.swap&&b){b.id=t.dataset.swap;b.start=+t.dataset.start;b.dur=+t.dataset.dur;save();renderAll();openSheet(uid);return}
    if(t.dataset.mark){toggleMark(uid,t.dataset.mark);renderAll();openSheet(uid,{marksOpen:true});return}
    if(t.dataset.pairblock){makePairBlock(uid,t.dataset.pairblock);return}
    if(t.dataset.home){profile.home.min=Math.max(10,Math.min(240,(+profile.home.min||60)+ +t.dataset.home));TRIP.save('profile',profile);buildDays();renderAll();openSheet('f0a');return}
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
  if(e.target.dataset.ck){done[e.target.dataset.ck]=e.target.checked;TRIP.save('done',done);renderChecks()}
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
// What was pressed on the P모드 판 (PView.tsx tells: its name and value)
function pviewAct(n,v){
  switch(n){
  case 'sq': openSheet(v);return;              // a square with a block on it
  case 'gap': pRollDo(v);return;               // an empty square: roll to fill it
  case 'roll': pRollDo(v,true);return;
  case 'mood': pMood(v);return;
  case 'card': pMood('mine');return;           // one of 내 카드
  case 'next': if(pSt.draw)pRollDo(pSt.draw.gi);return;
  case 'yes': pYes();return;
  case 'keep': pKeep();return;
  case 'close': pClose();return;
  case 'ai': pAI();return;
  case 'ahead': pAhead();return;
  }
}
// What was pressed in the "더 정확한 일정을 위해 알려 주세요" box (ChatLog.tsx Nudges: a button id, or ✕ with its row)
function nudgeAct(n,v){
  switch(n){
  case 'nudgeFlightIn': goMe('가는 길');return;
  case 'nudgeFlightNo': profile.bookedFlight=false;TRIP.save('profile',profile);renderAll();openHelper(2);return;
  case 'nudgeStayIn': if(profile.bookedStay===false){profile.bookedStay=true}goMe('숙소');return;
  case 'nudgeStayNo': profile.bookedStay=false;TRIP.save('profile',profile);renderAll();openHelper(wish.length?1:0);return;
  case 'nudgeDate': goMe('여행 기간');return;
  case 'nudgeTaste': tab='pref';renderPref();renderTabs();return;
  case 'off': profile.nudgeOff=Object.assign({},profile.nudgeOff,{[v]:true});TRIP.save('profile',profile);renderNudges();return;
  }
}
// What was pressed on a place card or in the 장소 tab (Tray.tsx, also ♥ in the helper and 👍 in a block's sheet)
function placeAct(n,v){
  switch(n){
  case 'wish': toggleWish(v);if(!$('#helper').hidden)renderHelper();renderTray();renderPView();return;
  case 'vote': toggleRec(v);return;
  case 'pick': selected=selected===v?null:v; if(selected&&!matchMedia('(min-width:900px)').matches){tab='timeline'} renderAll();return;   // 넣기: then a time slot
  case 'ppick': pPlaceNow(v);return;
  case 'pairec': pAIRec();return;
  case 'pfind': openFind({where:'city',into:'list'});return;
  case 'pnewcard': openCustom(null,null,{card:true});return;
  case 'cat': cat=v||'all';renderTray();return;   // a filter chip or the 분류 list
  case 'zone': {const [z,open]=v.split('~');zoneOpen[z]=open==='1';return}   // a 동네 group folded / unfolded
  case 'dupmerge': {const [a,b]=v.split('~');mergePlaces(a,b);return}
  case 'dupno': {const [a,b]=v.split('~');const no=store.get('gp.dupNo',[])||[];no.push(dupNoKey(a,b));store.set('gp.dupNo',no.slice(-200));renderTray();return}
  }
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#sheetBg').hidden)closeSheet();else if(selected){selected=null;renderAll()}}});
// drag & drop (desktop)
let drag=null;
document.addEventListener('dragstart',e=>{
  const c=e.target.closest('.card'); const b=e.target.closest('.blk');
  if(c){drag={type:'new',id:c.dataset.id}} else if(b&&b.dataset.uid){drag={type:'move',uid:b.dataset.uid}} else return;
  try{e.dataTransfer.setData('text/plain','x');e.dataTransfer.effectAllowed='move'}catch(_){}
});
// the slot under a dragged card (React draws the slots: marked through a handle)
const dropMark=(el,on)=>{const L=window.JEPI_UI.live(el);if(L)L.cls('drop',on);else el.classList.toggle('drop',on)};
document.addEventListener('dragend',()=>{drag=null;document.querySelectorAll('.slot.drop').forEach(s=>dropMark(s,false))});
const gridEl=$('#grid');
gridEl.addEventListener('dragover',e=>{if(!drag)return;e.preventDefault();
  const s=document.elementsFromPoint(e.clientX,e.clientY).find(el=>el.classList&&el.classList.contains('slot'));
  document.querySelectorAll('.slot.drop').forEach(x=>{if(x!==s)dropMark(x,false)}); if(s&&!s.classList.contains('drop')) dropMark(s,true)});
gridEl.addEventListener('drop',e=>{if(!drag)return;e.preventDefault();
  const H=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour'))||60;
  const r=gridEl.getBoundingClientRect(); const m=dayStart(day)+Math.floor(((e.clientY-r.top)/H*60)/30)*30;
  if(drag.type==='new') place(drag.id,m); else {const b=placed.find(x=>x.uid===drag.uid); if(b){b.start=Math.max(dayStart(day),Math.min(1410,m));save()}}
  drag=null; selected=null; renderAll()});
matchMedia('(min-width:900px)').addEventListener?.('change',renderTabs);

