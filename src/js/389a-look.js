// ---------- how a trip looks: theme colour, cover, style, handwriting; folding hero header ----------
// the look, the header and its one-line bar, the 여행 꾸미기 sheet: app/flow/look.ts
const LOOKF=window.JEPI_UI.flow.look;
LOOKF.connect({setJP:m=>setJP(m),planMenu:o=>planMenu(o)});
const hero=LOOKF.hero, lookOf=LOOKF.lookOf, coverSVG=LOOKF.coverSVG, heroAct=LOOKF.heroAct, renderLook=LOOKF.renderLook, miniBar=LOOKF.miniBar,
  heroWatch=LOOKF.heroWatch, openLook=LOOKF.openLook, lookAiTitles=LOOKF.lookAiTitles, lookRenamePlan=LOOKF.lookRenamePlan;
