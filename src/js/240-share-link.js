// ---------- share link (no server): the plan travels inside the link ----------
// making and opening share links, and the short message at the bottom (showToast): app/flow/share.ts
const SHARE=window.JEPI_UI.flow.share;
SHARE.connect({openNotebook:()=>openNotebook()});
const shareLink=SHARE.shareLink, openShared=SHARE.openShared, showToast=SHARE.showToast;
