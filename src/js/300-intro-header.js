// ================= intro: sky, slogan, gentle motion =================
// the intro, the header's plan menu, the 🎲 button's motion and keeping it out of the P board's way: app/flow/header.ts
const HEAD=window.JEPI_UI.flow.header;
HEAD.init();   // the menu's tap-outside / Esc listeners and the scroll watchers start here, as before
const introRun=HEAD.introRun, planMenu=HEAD.planMenu, planMenuAct=HEAD.planMenuAct, diceOpenAnim=HEAD.diceOpenAnim, diceCloseAnim=HEAD.diceCloseAnim, fabDodge=HEAD.fabDodge;
