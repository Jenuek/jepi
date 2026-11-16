// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// the look, the header and its one-line bar, the 여행 꾸미기 sheet: app/flow/look.ts
const LOOKF=window.JEPI_UI.flow.look;
LOOKF.connect({setJP:m=>setJP(m),planMenu:o=>planMenu(o)});
const hero=LOOKF.hero, heroAct=LOOKF.heroAct, renderLook=LOOKF.renderLook, miniBar=LOOKF.miniBar, heroWatch=LOOKF.heroWatch, lookAiTitles=LOOKF.lookAiTitles, lookRenamePlan=LOOKF.lookRenamePlan;
