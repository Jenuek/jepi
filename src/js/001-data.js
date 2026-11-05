// ---------- data layer (app/data, TypeScript) ----------
// Saving on this device, the server connection, key encryption and the demo sandbox live in app/data/.
// The old code reaches them through JD (= window.JEPI_DATA), which React sets up before this script runs.
const JD=window.JEPI_DATA;
// The trip's data (profile, blocks, ♥, plans …) is saved only through TRIP: app/data/trip.ts
const TRIP=JD.trip;
// the trip being worked on (profile, placed, custom, fmarks, wish, meals, done, kws) lives in app/data/trip.ts: CUR.placed …
const CUR=TRIP.cur;
// the plan list and which plan is open (app/data/trip.ts): PL.plans, PL.curPlan
const PL=TRIP.planList;
// the trip's days and the places they start from (app/data/days.ts): DY.days, DY.loc, DY.locArea, DY.locZone, DY.gmpBy, DY.homeMin
const DY=JD.days.state;
