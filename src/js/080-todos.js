// ---------- small to-dos attached to blocks (luggage, waiting lists, pick-ups, rentals, cash, tax refund) ----------
// marks, their pairs and warnings, and the sheet's 할 일 표시 box: app/data/marks.ts
const MK=JD.marks, MARKS=MK.MARKS;
CUR.fmarks=null;
const toggleMark=(uid,m)=>TRIP.toggleMark(uid,m);   // app/data/trip.ts
const makePairBlock=PIECES.makePairBlock;   // the block that closes a 할 일 표시: app/flow/pieces.ts
