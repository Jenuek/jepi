// ---------- booking helper: wish list → where to stay → flight times → search links ----------
CUR.wish=[];
const toggleWish=id=>TRIP.wish.toggle(id);   // app/data/trip.ts
// the 예약 도우미 (frame, steps, AI answers in it): app/flow/helper.ts — its state is HS (app/flow/helper.ts hs)
const HELP=window.JEPI_UI.flow.helper;
HELP.connect({maybeCoach:()=>maybeCoach(),renderMe:()=>renderMe()});
const needBooking=HELP.needBooking, helperAct=HELP.helperAct, helperOpen=HELP.helperOpen, helperFrameAct=HELP.helperFrameAct, openHelper=HELP.openHelper,
  closeHelper=HELP.closeHelper, renderHelper=HELP.renderHelper, genSeason=HELP.genSeason, seasonInfo=HELP.seasonInfo, helperShow=HELP.helperShow, drawHelperFrame=HELP.drawHelperFrame;
