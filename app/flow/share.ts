// Share links: the whole plan travels inside the link (packed small, no server) — making one (shareLink, without the home
// location or a cover photo) and opening one a friend sent (openShared, as a new plan). And the short message at the
// bottom of the screen (showToast). (It used to be src/js/240-share-link.js.)
import * as trip from '../data/trip';
import * as PLANS from '../data/plans';
import { ui } from '../ui/state';
import * as FF from './forms';
import * as R from './render';
import * as PLF from './plans';
import { ps } from './plans';

/** what the old code still does */
export interface Legacy { openNotebook(): void }
let L: Legacy;
export function connect(l: Legacy): void { L = l }

const PL = trip.planList as any;
const planName = PLANS.planName, planData = PLANS.planData;
let toastT: any = 0;
/** the last link made (shown under 내 계획) */
export const lastLinkOf = (): string => lastLink;

export async function packText(s?: any){
  try{if(window.CompressionStream){const cs=new Blob([s]).stream().pipeThrough(new CompressionStream('deflate-raw'));const buf=new Uint8Array(await new Response(cs).arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+8192) as any);return 'z'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}}catch(_: any){}
  return 'j'+btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function unpackText(t?: any){
  const kind=t[0], b64=t.slice(1).replace(/-/g,'+').replace(/_/g,'/'); const bin=atob(b64+'==='.slice((b64.length+3)%4));
  if(kind==='j') return decodeURIComponent(escape(bin));
  const u=Uint8Array.from(bin,(c: any)=>c.charCodeAt(0)); const ds=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(ds).text();
}
let lastLink: string='';
export async function shareLink(asNote?: any){
  PLF.snapshotCurrent(); const name=(PL.plans.find((x: any)=>x.id===PL.curPlan)||{}).name||planName();
  const pd: any=planData(); if(pd.profile&&pd.profile.home){pd.profile.home=Object.assign({},pd.profile.home,{area:''});delete pd.profile.home.ll}
  if(pd.profile&&pd.profile.look&&pd.profile.look.photo){pd.profile.look=Object.assign({},pd.profile.look,{photo:'',cover:'city'})} // a photo would make the link too long
  const t=await packText(JSON.stringify({n:name,d:pd})); const url=location.origin+location.pathname+'#s='+t+(asNote?'&note=1':'');
  if(url.length>60000){ps.msg='계획이 커서 링크로 보내기 어려워요. "백업 파일 받기"로 파일을 보내 주세요.';PLF.renderPlans();return}
  lastLink=url;
  try{if(navigator.share){await navigator.share({title:'JEPI · '+name,text:`[JEPI] ${name}`,url});ps.msg='공유했어요.';PLF.renderPlans();return}}catch(e: any){if(e&&e.name==='AbortError'){PLF.renderPlans();return}}
  try{await navigator.clipboard.writeText(url);ps.msg='링크를 복사했어요. 카톡에 붙여 넣으면 돼요.'}catch(_: any){ps.msg='아래 링크를 길게 눌러 복사해 주세요.'}
  PLF.renderPlans();
}
export async function openShared(){
  const m=/[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash||''); if(!m) return;
  const asNote=/[#&]note=1/.test(location.hash||'');
  try{const v=JSON.parse(await unpackText(m[1])); if(!v||!v.d||!v.d.profile) throw 0;
    PLF.snapshotCurrent(); const nid='p'+Date.now().toString(36);
    trip.plans.put(nid,v.d); PL.plans.unshift({id:nid,name:String(v.n||'공유받은 계획').slice(0,30)+' (공유받음)',custom_name:true,updated:Date.now()});
    PL.curPlan=nid; PLF.savePlans(); FF.onbFrame({open:false}); PLF.applyPlanData(v.d); PLF.snapshotCurrent(); ui.tab='timeline'; R.renderTabs();
    history.replaceState(null,'',location.pathname); showToast('공유받은 계획을 내 계획에 추가했어요.');if(asNote)setTimeout(()=>L.openNotebook(),400);
  }catch(_: any){history.replaceState(null,'',location.pathname);showToast('공유 링크가 잘렸거나 손상됐어요.')}
}
export function showToast(m?: any){const b=document.getElementById('toast');if(!b)return;b.textContent=m;b.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{b.hidden=true},4000)}

