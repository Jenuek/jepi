// ---------- quick start (P, and any one-day course): a few taps ----------
const nextSat=()=>{const d=new Date();const add=(6-d.getDay()+7)%7||7;return isoPlus(d.getDay()===6?0:add)};
// what P모드 and the 가볍게 시작 form show: app/view/pview.ts (the drawn card and the chosen die stay here)
const PVIEW=window.JEPI_UI.view.pview, SLOTS=PVIEW.SLOTS;
async function quickStart(){
  const q=FS.draft.q||{}, dest=String(FS.draft.dest||'').trim();
  if(!dest){setSt('st_pack','어디로 갈지 적어 주세요.');return}
  if(!q.when||(q.when==='pick'&&FS.draft.dateSet===false)){setSt('st_pack','언제 갈지 골라 주세요.');return}
  if(q.len===''||q.len==null){setSt('st_pack','얼마나 갈지 골라 주세요.');return}
  if(q.when!=='pick'){FS.draft.startDate=q.when==='today'?isoPlus(0):q.when==='tomorrow'?isoPlus(1):nextSat();}
  FS.draft.dateSet=true; FS.draft.dateUnknown=false; FS.draft.nightsSet=true;
  if(q.len==='0'){const sl=SLOTS.find(s=>s[0]===q.slot)||SLOTS[1];let st=sl[2];
    if(q.when==='today'){const n=new Date(),now=n.getHours()*60+n.getMinutes();if(now+30>st)st=Math.min(1320,Math.ceil((now+30)/30)*30)}
    FS.draft.kind='day'; FS.draft.meet=Object.assign({},FS.draft.meet||{},{time:fmt(st),end:fmt(Math.max(st+180,sl[3]))});}
  else{FS.draft.kind='trip'; FS.draft.nights=+q.len; FS.draft.bookedFlight=true; FS.draft.bookedStay=true; FS.draft.flightSet=false; FS.draft.staySet=false;}
  if(norm(dest)!==norm(PK.pack.city)){
    if(UI.sample){if(!(await genPack(dest,'quickStart')))return}
    else{CUR.custom=[];TRIP.save('custom',CUR.custom);CUR.placed=[];save();loadPack(manualPack(dest));savePack()}
  }
  FS.draft.dest=PK.pack.city; if(FS.draft.kind==='day'&&!AREAS[FS.draft.meet.area]) FS.draft.meet.area=firstArea();
  await finishOnb();
}
// ---------- P view: the day as a board game (drawn by React: app/screens/PView.tsx) ----------
