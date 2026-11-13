// ---------- settings ----------
// the theme (saved on this device); 설정 itself (theme, time spacing, keys, models, backup, 모두 초기화): app/flow/settings.ts
KS.theme=LS.get('jepi.theme','light');
SETF.connect({wipeAll:()=>wipeAll(),mypView:()=>mypView()});
const applyTheme=SETF.applyTheme, KEY_HELP=SETF.KEY_HELP, isBad=SETF.isBad, settingsAct=SETF.settingsAct, renderSettings=SETF.renderSettings, importAll=SETF.importAll;
