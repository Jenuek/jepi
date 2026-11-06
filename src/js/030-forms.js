// ---------- forms shared by onboarding and the "내 정보" tab ----------
// What is typed, 처음 설정's steps, the buttons, saving and reading a pasted booking: app/flow/forms.ts. What it still
// needs from the old code is connected here (each one looked up when it runs).
const FORMS=window.JEPI_UI.view.forms, FFLOW=window.JEPI_UI.flow.forms;
const optsOf=FORMS.optsOf, partParty=FORMS.party;
FFLOW.connect({partJP:()=>partJP(),partTalk:p=>partTalk(p),partDest:p=>partDest(p),setSt:(id,t)=>setSt(id,t),progStart:(id,t,b,l)=>progStart(id,t,b,l),progStop:id=>progStop(id),
  setBusy:on=>setBusy(on),keysChanged:()=>keysChanged(),setJP:(m,q)=>setJP(m,q),quickStart:()=>quickStart(),talkSend:(t,o)=>talkSend(t,o),talkReset:()=>talkReset(),
  recommendDest:m=>recommendDest(m),genPack:(d,b)=>genPack(d,b),morePlaces:(n,id,f,sig)=>morePlaces(n,id,f,sig),genSeason:(id,sig)=>genSeason(id,sig),autoSave:()=>autoSave(),
  renderMeRows:()=>renderMeRows(),renderTasteStyle:()=>renderTasteStyle(),meSetMsg:m=>meSetMsg(m),meSetBudgetHint:h=>meSetBudgetHint(h),openHelper:s=>openHelper(s),
  needBooking:()=>needBooking(),maybeCoach:()=>maybeCoach(),onbAdvance:()=>onbAdvance(),demoEnter:()=>demoEnter(),krAir:()=>KR_AIR});
const pasteBox=FFLOW.pasteBox, datesReady=FFLOW.datesReady, needDates=FFLOW.needDates, isoPlus=FFLOW.isoPlus, ONB=FFLOW.ONB, openOnb=FFLOW.openOnb, onbFrame=FFLOW.onbFrame,
  onbFrameAct=FFLOW.onbFrameAct, renderOnb=FFLOW.renderOnb, commitProfile=FFLOW.commitProfile, finishOnb=FFLOW.finishOnb, renderMe=FFLOW.renderMe, rerenderForm=FFLOW.rerenderForm,
  formAct=FFLOW.formAct, onPf=FFLOW.onPf;
