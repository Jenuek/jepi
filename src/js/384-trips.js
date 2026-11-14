// ---------- 친구와 함께: shared trips, invite links, 가고 싶어요 ----------
// A shared trip keeps its plan in jepi_trips (one row, `rev` goes up by one on every save).
// Each device remembers the last server version it saw (`base`). When two people change the
// same trip, the three versions are merged per block / per place / per field, so a change to
// day 1 and a change to day 2 both survive; only the very same block edited twice keeps the later one.
// Server tables + rules: see supabase/schema.sql.
// The server side (push / pull / share / invite / join / leave / stop) and the merge rules live in app/data/trips.ts
// and app/data/merge.ts. Here: the screen side. TRIPS is the same object as JD.trips.state (base, members, marks)
// plus what the friends panel shows (invite, msg, busy, stopArm).
// the screen side (invites, joining, 가고 싶어요, the panel, a friend's new version): app/flow/friends.ts
const FRND=window.JEPI_UI.flow.friends;
FRND.connect({renderExt:()=>renderExt(),renderMore:()=>renderMore()});
FRND.init();   // joins the sync work, the card / sheet / block extras and the panels here, in the same order as before
var TRIPS=FRND.TRIPS;
const curShared=FRND.curShared, joinFromUrl=FRND.joinFromUrl, joinPending=FRND.joinPending, wantAct=FRND.wantAct, tripAct=FRND.tripAct;
