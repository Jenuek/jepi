// ---------- share link (no server): the plan travels inside the link ----------
async function packText(s){
  try{if(window.CompressionStream){const cs=new Blob([s]).stream().pipeThrough(new CompressionStream('deflate-raw'));const buf=new Uint8Array(await new Response(cs).arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));return 'z'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}}catch(_){}
  return 'j'+btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function unpackText(t){
  const kind=t[0], b64=t.slice(1).replace(/-/g,'+').replace(/_/g,'/'); const bin=atob(b64+'==='.slice((b64.length+3)%4));
  if(kind==='j') return decodeURIComponent(escape(bin));
  const u=Uint8Array.from(bin,c=>c.charCodeAt(0)); const ds=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(ds).text();
}
let lastLink='';
async function shareLink(asNote){
  snapshotCurrent(); const name=(plans.find(x=>x.id===curPlan)||{}).name||planName();
  const pd=planData(); if(pd.profile&&pd.profile.home){pd.profile.home=Object.assign({},pd.profile.home,{area:''});delete pd.profile.home.ll}
  if(pd.profile&&pd.profile.look&&pd.profile.look.photo){pd.profile.look=Object.assign({},pd.profile.look,{photo:'',cover:'city'})} // a photo would make the link too long
  const t=await packText(JSON.stringify({n:name,d:pd})); const url=location.origin+location.pathname+'#s='+t+(asNote?'&note=1':'');
  if(url.length>60000){planMsg='계획이 커서 링크로 보내기 어려워요. "백업 파일 받기"로 파일을 보내 주세요.';renderPlans();return}
  lastLink=url;
  try{if(navigator.share){await navigator.share({title:'JEPI · '+name,text:`[JEPI] ${name}`,url});planMsg='공유했어요.';renderPlans();return}}catch(e){if(e&&e.name==='AbortError'){renderPlans();return}}
  try{await navigator.clipboard.writeText(url);planMsg='링크를 복사했어요. 카톡에 붙여 넣으면 돼요.'}catch(_){planMsg='아래 링크를 길게 눌러 복사해 주세요.'}
  renderPlans();
}
async function openShared(){
  const m=/[#&]s=([A-Za-z0-9_-]+)/.exec(location.hash||''); if(!m) return;
  const asNote=/[#&]note=1/.test(location.hash||'');
  try{const v=JSON.parse(await unpackText(m[1])); if(!v||!v.d||!v.d.profile) throw 0;
    snapshotCurrent(); const nid='p'+Date.now().toString(36);
    store.set('gp.plan.'+nid,v.d); plans.unshift({id:nid,name:String(v.n||'공유받은 계획').slice(0,30)+' (공유받음)',custom_name:true,updated:Date.now()});
    curPlan=nid; savePlans(); $('#onb').hidden=true; applyPlanData(v.d); snapshotCurrent(); tab='timeline'; renderTabs();
    history.replaceState(null,'',location.pathname); showToast('공유받은 계획을 내 계획에 추가했어요.');if(asNote)setTimeout(()=>openNotebook(),400);
  }catch(_){history.replaceState(null,'',location.pathname);showToast('공유 링크가 잘렸거나 손상됐어요.')}
}
function showToast(m){const b=document.getElementById('toast');if(!b)return;b.textContent=m;b.hidden=false;clearTimeout(showToast.t);showToast.t=setTimeout(()=>{b.hidden=true},4000)}

