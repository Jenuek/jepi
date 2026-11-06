// ================= 기기 간 동기화 (Supabase, 본인 계정 데이터만) =================
const SYNC=JD.server.SYNC;
const saveSync=JD.server.saveSync;
// which part of the 동기화 section shows and the last error live in app/data/account.ts (ACC.state)
const ACC=JD.account;
const syncOn=JD.server.syncOn;
function keepSess(j){JD.server.keepSess(j)}
// any table (or rpc/<name>) in the project, as the logged-in person; rows are limited by RLS on the server
function sbTable(table,method,q,body,prefer){return JD.server.sbTable(table,method,q,body,prefer)}
// What to send and how to merge what comes back: app/data/sync.ts. Here: our values, and redrawing after.
const SYNC_STATUS=JD.sync.status; // .busy (sending or receiving), .keysLocked (server keys locked with another password)
function syncSoon(ms){JD.sync.syncSoon(ms)}
function syncNow(){return JD.sync.syncNow()}
JD.sync.connectSync({
  plans:()=>PL.plans, setPlans(p){PL.plans=p}, curPlan:()=>PL.curPlan,
  kws:()=>CUR.kws, setKws(k){CUR.kws=k},
  myPlaces:()=>MYP, setMyPlaces(m){JD.myplaces.setAll(m)},
  keys:()=>KEYS, setKeys(k){JD.keys.replace(k);saveKeys(true)},
  setErr(m){ACC.state.err=m},
  async afterPush(){
    if(UI.tab==='settings') renderSettings();
    for(const f of SYNC_AFTER_PUSH){try{await f()}catch(e){console.warn(e)}}
  },
  async afterPull({changed,curChanged,keysPulled}){
    if(curChanged){const ae=document.activeElement;const editing=(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))||!$('#sheetBg').hidden||!$('#onb').hidden;
      if(!editing){applyPlanData(curChanged);showToast('다른 기기에서 바꾼 내용을 받아왔어요')} }
    if(keysPulled){keyBad={};if(STANDALONE)UI.sample=makeSample();renderAll();showToast('AI·지도 키도 받아왔어요')}
    if(changed){renderPlans();renderExt()} if(UI.tab==='settings')renderSettings();
    for(const f of SYNC_AFTER_PULL){try{await f()}catch(e){console.warn(e)}}
  }
});
// The section is drawn by React: app/screens/SyncSection.tsx. Here: what it shows.
function syncView(){
  const st=ACC.state.step, mode=(!SYNC.url||!SYNC.key||st==='setup')?'setup':!syncOn()?(st==='reset'?'reset':st==='join'?'join':'login'):st==='newpw'?'newpw':'on';
  return {mode,url:SYNC.url||'',hasKey:!!SYNC.key,email:(mode==='on'&&SYNC.sess.email)||SYNC.email||'',err:ACC.state.err||'',busy:!!SYNC_STATUS.busy,
    lastAt:SYNC.at||0,vkMissing:!LS.get('jepi.vk',null),keysLocked:!!SYNC_STATUS.keysLocked};
}
// the section's buttons and forms work by themselves (app/data/account.ts); they ask the old code to redraw and to sync
ACC.connectAccount({redraw:()=>renderSettings(),toast:m=>showToast(m),syncNow:()=>syncNow()});

// a tapped login link comes back here: ?sb=<config>#access_token=…
async function syncBoot(){
  try{
    const q=new URLSearchParams(location.search), sb=q.get('sb');
    if(sb){try{const c=JSON.parse(atob(sb));if(c.u&&!SYNC.url)SYNC.url=c.u;if(c.k&&!SYNC.key)SYNC.key=c.k;if(c.e)SYNC.email=c.e;saveSync()}catch(_){}}
    const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
    if(h.get('error_description')){ACC.state.err=h.get('error_description').replace(/\+/g,' ');showToast('로그인 링크가 만료됐어요. 다시 받아 주세요.')}
    if(h.get('access_token')&&SYNC.url&&SYNC.key){
      const at=h.get('access_token');let user={};
      try{const r=await fetch(SYNC.url+'/auth/v1/user',{headers:{apikey:SYNC.key,Authorization:'Bearer '+at}});user=await r.json()}catch(_){}
      keepSess({access_token:at,refresh_token:h.get('refresh_token'),expires_in:+h.get('expires_in')||3600,user});SYNC.sent={};SYNC.lastPull=0;saveSync();ACC.state.step=h.get('type')==='recovery'?'newpw':'';if(ACC.state.step==='newpw'){UI.tab='settings';setTimeout(()=>{renderTabs();renderSettings()},300)}
      showToast('로그인했어요 · 동기화를 켰어요');
    }
    if(sb||h.get('access_token')||h.get('error_description')) history.replaceState(null,'',location.pathname);
  }catch(_){}
  setTimeout(syncNow,800);
}

