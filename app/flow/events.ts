// Moving between tabs (goTab), the clicks that work anywhere (data-tab buttons, 🎲, 닫기 in a sheet, Esc, the sheet's dark
// background, form typing), 🛠 경고 해결 (hands every warning to the AI chat), 더보기 rows that are not a tab, the "알려 주세요"
// box, and what is pressed on a place card / in the 장소 tab. (It used to be src/js/380-events.js.)
import * as trip from '../data/trip';
import * as check from '../data/check';
import * as storage from '../data/storage';
import { state as DYs } from '../data/days';
import { ui } from '../ui/state';
import { PANELS } from '../ui/extras';
import * as MAP from '../ui/map';
import * as drag from '../ui/drag';
import * as DICEV from '../view/dice';
import { fs, isoPlus, rerenderForm, onPf, renderMe } from './forms';
import { renderTasteStyle, renderMore } from './more';
import { snapshotCurrent, renderPlans } from './plans';
import { ps } from './plans';
import { ks, renderSettings } from './settings';
import { openDiceTab, renderPView, pPlaceNow, pAIRec } from './dice';
import { showCoach } from './guide';
import { openHelper, helperOpen, renderHelper } from './helper';
import { saveCustomForm, openCustom, openFind, mergePlaces, dupNoKey } from './find';
import { sendChat, goMe, renderNudges } from './chat';
import { openNotebook } from './phase';
import { openLook } from './look';
import { toggleRec } from './recs';
import * as RND from './render';

const $ = (s: string) => document.querySelector(s) as any;
const CUR = trip.cur as any, DY = DYs as any;
const clone = (o: any) => JSON.parse(JSON.stringify(o));

export function goTab(name?: any){ui.tab=name;fs.autoMsg='';if(ui.tab==='me'){fs.draft=clone(CUR.profile);fs.meOpen=null;renderMe()}if(ui.tab==='pref'){fs.draft=clone(CUR.profile);renderTasteStyle()}if(ui.tab==='plans'){snapshotCurrent();ps.showText=false;renderPlans()}if(ui.tab==='settings'){ks.edit=null;renderSettings()}if(ui.tab==='more')renderMore();if(PANELS[ui.tab])PANELS[ui.tab].render({opened:true});RND.renderTabs();if(ui.tab==='map')MAP.openMap();else MAP.state.on=false;window.scrollTo({top:0});}






// 🛠 AI에게 경고 해결 맡기기 (the check list's button and the 경고 chip above the 일정표)
export function fixWarns(){const ws: any[]=[];DY.days.forEach((_: any,d: any)=>check.analyze(d).items.forEach((it: any)=>it.warns.forEach((w: any)=>ws.push(`Day ${d+1} ${it.name}: ${w}`))));ui.tab='timeline';RND.renderTabs();sendChat('지금 일정의 경고를 모두 해결해 줘. 꼭 필요한 것만 바꾸고, 바꿀 수 없는 고정 일정은 그대로 둬.\n'+ws.slice(0,20).join('\n'));const c=$('#chat');if(c)c.scrollIntoView({block:'start'})}
// 더보기 rows that are not a tab (MoreMenu.tsx): 여행 노트, 여행 꾸미기, 전체 메뉴 보기
export function moreAct(id?: any){
  if(id==='nbOpen'){openNotebook();return}
  if(id==='lookOpen'){openLook();return}
  if(id==='moreAll'){fs.moreAll=!fs.moreAll;renderMore();return}
}
// What was pressed in the "더 정확한 일정을 위해 알려 주세요" box (ChatLog.tsx Nudges: a button id, or ✕ with its row)
export function nudgeAct(n?: any, v?: any){
  switch(n){
  case 'nudgeFlightIn': goMe('가는 길');return;
  case 'nudgeFlightNo': CUR.profile.bookedFlight=false;trip.save('profile',CUR.profile);RND.renderAll();openHelper(2);return;
  case 'nudgeStayIn': if(CUR.profile.bookedStay===false){CUR.profile.bookedStay=true}goMe('숙소');return;
  case 'nudgeStayNo': CUR.profile.bookedStay=false;trip.save('profile',CUR.profile);RND.renderAll();openHelper(CUR.wish.length?1:0);return;
  case 'nudgeDate': goMe('여행 기간');return;
  case 'nudgeTaste': ui.tab='pref';RND.renderPref();RND.renderTabs();return;
  case 'off': CUR.profile.nudgeOff=Object.assign({},CUR.profile.nudgeOff,{[v]:true});trip.save('profile',CUR.profile);renderNudges();return;
  }
}
// What was pressed on a place card or in the 장소 tab (Tray.tsx, also ♥ in the helper and 👍 in a block's sheet)
export function placeAct(n?: any, v?: any){
  switch(n){
  case 'wish': trip.wish.toggle(v);if(helperOpen())renderHelper();RND.renderTray();renderPView();return;
  case 'vote': toggleRec(v);return;
  case 'pick': ui.selected=ui.selected===v?null:v; if(ui.selected&&!matchMedia('(min-width:900px)').matches){ui.tab='timeline'} RND.renderAll();return;   // 넣기: then a time slot
  case 'ppick': pPlaceNow(v);return;
  case 'pairec': pAIRec();return;
  case 'pfind': openFind({where:'city',into:'list'});return;
  case 'pnewcard': openCustom(null,null,{card:true});return;
  case 'cat': ui.cat=v||'all';RND.renderTray();return;   // a filter chip or the 분류 list
  case 'zone': {const [z,open]=v.split('~');ui.zoneOpen[z]=open==='1';return}   // a 동네 group folded / unfolded
  case 'dupmerge': {const [a,b]=v.split('~');mergePlaces(a,b);return}
  case 'dupno': {const [a,b]=v.split('~');const no: string[]=storage.get<string[]>('gp.dupNo',[])||[];no.push(dupNoKey(a,b));storage.set('gp.dupNo',no.slice(-200));RND.renderTray();return}
  }
}

// drag & drop (desktop): app/ui/drag.ts marks the slot and works out the time; putting the card / block there: app/flow/schedule.ts dropped




/** what the old file did when it loaded (it calls this at the same moment, so the order stays) */
export function init(){
document.addEventListener('click',(e: any)=>{
  const t=e.target.closest('button,input,label'); if(!t) return;
  if(t.dataset.tab){if(!t.closest('.tabs'))goTab(t.dataset.tab);return}
  if(t.id==='diceFab'){openDiceTab(DICEV.mealNow()==='snack'?'do':'eat',null);return}
  if(t.id==='coachAgain'){showCoach(0);return}
  if(t.id==='moreHelper'){openHelper(CUR.wish.length?1:0);return}
  // 닫기 in any sheet (#sheet: block, 🎲, 장소 찾기, 직접 만들기)
  if(t.dataset.close&&t.closest('#sheet')){RND.closeSheet();return}
});
document.addEventListener('change',(e: any)=>{
  if(e.target.id==='dateUnknown'&&fs.draft){fs.draft.dateUnknown=e.target.checked;if(fs.draft.dateUnknown){fs.draft.startDate=isoPlus(30);fs.draft.dateSet=true}else fs.draft.dateSet=false;rerenderForm();return}
});
$('#sheetBg').addEventListener('click',(e: any)=>{if(e.target.id==='sheetBg')RND.closeSheet()});
document.addEventListener('submit',(e: any)=>{const f=e.target;
  if(f.id==='customForm'){e.preventDefault();saveCustomForm(f)}
});
document.addEventListener('input',onPf);
document.addEventListener('change',onPf);
document.addEventListener('keydown',(e: any)=>{if(e.key==='Escape'){if(!$('#sheetBg').hidden)RND.closeSheet();else if(ui.selected){ui.selected=null;RND.renderAll()}}});
drag.connectGrid($('#grid'));
matchMedia('(min-width:900px)').addEventListener?.('change',RND.renderTabs);
}
