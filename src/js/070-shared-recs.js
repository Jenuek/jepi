// ---------- 👍 여행자 추천 (app/data/recs.ts: loading, counting, saving on the server) ----------
// Here: how a place becomes a saved entry, and how other travelers' places join this trip's place list.
const REC=JD.recs, RS=REC.state;
// how a place becomes a saved entry, other travelers' places joining the list, 👍, sharing a place I made: app/flow/recs.ts
const RECF=window.JEPI_UI.flow.recs;
RECF.init();   // refresh everyone's 👍 along with the account sync (at this point, so it runs in the same order as before)
const SHARED_IDS=RECF.SHARED_IDS, keepShared=RECF.keepShared, rebuildShared=RECF.rebuildShared, toggleRec=RECF.toggleRec, shareCustom=RECF.shareCustom, initRecs=RECF.initRecs, recsMaybe=RECF.recsMaybe;
