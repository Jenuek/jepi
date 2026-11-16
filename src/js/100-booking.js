// ---------- booking helper: wish list → where to stay → flight times → search links ----------
CUR.wish=[];
// the 예약 도우미 (frame, steps, AI answers in it): app/flow/helper.ts — its state is HS (app/flow/helper.ts hs)
const HELP=window.JEPI_UI.flow.helper;
HELP.connect({maybeCoach:()=>maybeCoach(),renderMe:()=>renderMe()});
const needBooking=HELP.needBooking, helperAct=HELP.helperAct, helperFrameAct=HELP.helperFrameAct, openHelper=HELP.openHelper, genSeason=HELP.genSeason, seasonInfo=HELP.seasonInfo, drawHelperFrame=HELP.drawHelperFrame;
