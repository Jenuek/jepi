// ---------- talk to Claude to change the schedule ----------
// the chat, the dock, the nudges, the header's trip line and ✨ 빈 시간 채우기: app/flow/chat.ts
const CHAT=window.JEPI_UI.flow.chat;
CHAT.connect({openFind:o=>openFind(o),fixWarns:()=>fixWarns(),openHelper:s=>openHelper(s),openCustom:(id,st)=>openCustom(id,st),addCustomToData:c=>addCustomToData(c),
  hero:p=>hero(p),renderMe:()=>renderMe(),needBooking:()=>needBooking(),dupOf:p=>dupOf(p),renderExt:()=>renderExt()});
const dock=CHAT.dock, dockAct=CHAT.dockAct, renderChat=CHAT.renderChat, renderNudges=CHAT.renderNudges, renderMeta=CHAT.renderMeta, chatAct=CHAT.chatAct;
