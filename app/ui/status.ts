// Status lines and busy buttons: "…하는 중이에요 · 12초 지났어요" while something runs (progStart / progStop), a message
// (setSt), and what went wrong in words the person can act on (errText). Lines and buttons React drew are changed through
// their handle (app/ui/live.tsx), others directly. (It used to be in src/js/060-destination-pack.js.)
const prog: Record<string, any> = {};
export const liveEl=(id: any)=>{const e=document.getElementById(id);return e&&window.JEPI_UI.live(e)};
export function progStart(stId?: any, label?: any, btnIds?: any, btnLabel?: any){progStop(stId);const t0=Date.now();const old: Record<string, any> = {};[...new Set(btnIds||[])].forEach((id: any)=>{const b=document.getElementById(id);if(!b)return;const L=window.JEPI_UI.live(b);if(L){old[id]=null;L.label(btnLabel)}else{old[id]=b.textContent;b.textContent=btnLabel}});
  const tick=()=>{const L=liveEl(stId),e=document.getElementById(stId),t=`${label} · ${Math.round((Date.now()-t0)/1000)}초 지났어요`;if(L){L.busy(true);L.text(t)}else if(e){e.classList.add('busy');e.textContent=t}};
  tick();const e=document.getElementById(stId);if(e&&e.scrollIntoView)e.scrollIntoView({block:'nearest'});prog[stId]={iv:setInterval(tick,1000),old}}
export function progStop(stId?: any){const p=prog[stId];if(!p)return;clearInterval(p.iv);const L=liveEl(stId),e=document.getElementById(stId);if(L)L.busy(false);else if(e)e.classList.remove('busy');
  Object.entries(p.old).forEach(([id,t]: any)=>{const b=document.getElementById(id);if(!b)return;const BL=window.JEPI_UI.live(b);if(BL)BL.label(null);else if(t!=null)b.textContent=t});delete prog[stId]}
export const setSt=(id: any,t: any)=>{progStop(id);const L=liveEl(id),e=document.getElementById(id);if(L)L.text(t);else if(e)e.textContent=t};
// what went wrong, in words the person can act on (the app already tried again a few times)
export function errText(e?: any, what?: any){const c=e&&e.code;
  return c==='not_granted'?'AI 키가 맞지 않아서 할 수 없어요.':c==='rate_limited'?'요청이 많아 잠시 쉬어야 해요. 1분쯤 뒤에 다시 해 주세요.'
    :c==='timeout'?`${what}. AI가 너무 오래 걸렸어요. 다시 해 주세요.`:c==='busy'?`${what}. AI 서버가 지금 바빠요. 조금 뒤에 다시 해 주세요.`
    :c==='too_long'?`${what}. 답이 너무 길어 잘렸어요. 조건을 줄여 다시 해 주세요.`:c==='invalid_json'?`${what}. AI 답을 읽지 못했어요. 다시 해 주세요.`
    :`${what}. 다시 시도해 주세요.`}
