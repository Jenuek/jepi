// ---------- destination pack: everything that depends on where the trip goes ----------
// The destination's places and the lists made from them (AREAS, PM …), loading one (loadPack) and checking what the AI
// sends (cleanPack / cleanPlace) live in app/data/places.ts; the open destination is PK.pack.
PK.pack=null;
const wipe=o=>{for(const k of Object.keys(o)) delete o[k]};
const firstArea=PLC.firstArea, nearestArea=PLC.nearestArea, addPackPlace=PLC.addPackPlace, loadPack=PLC.loadPack, savePack=PLC.savePack, packFrom=PLC.packFrom, manualPack=PLC.manualPack, cleanPack=PLC.cleanPack, cleanPlace=PLC.cleanPlace;
// after a destination is loaded: other travelers' 👍 places of that city (070-shared-recs.js)
PLC.connectPlaces(pk=>{if(RS.status!=='off'){SHARED_IDS.clear();rebuildShared()}});
// status lines ("…하는 중이에요 · 12초 지났어요"), messages and error words: app/ui/status.ts
const STATUS=window.JEPI_UI.status, progStart=STATUS.progStart, progStop=STATUS.progStop, setSt=STATUS.setSt, errText=STATUS.errText;
// getting a destination ready, more places, 처음 설정's 다음, 여행지 찾기, 이야기하면서 정하기: app/flow/destination.ts
const DEST=window.JEPI_UI.flow.destination;
DEST.connect({fresh:()=>FRESH,clearUndo:()=>{CS.undoSnap=null},autoSave:()=>autoSave(),standalone:()=>!!STANDALONE,keyHelp:()=>KEY_HELP,inClaude:()=>inClaude()});
const genPack=DEST.genPack, morePlaces=DEST.morePlaces, setBusy=DEST.setBusy, onbAdvance=DEST.onbAdvance, partDest=DEST.partDest, recommendDest=DEST.recommendDest, talkReset=DEST.talkReset, partJP=DEST.partJP, partTalk=DEST.partTalk, talkSend=DEST.talkSend;
