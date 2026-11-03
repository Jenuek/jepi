// ================= 내 장소 (집·회사·…) — kept only on this device =================
let MYP=LS.get('jepi.myplaces',null);
if(!Array.isArray(MYP)) MYP=[{id:'home',name:'집',ll:null,addr:''},{id:'work',name:'회사',ll:null,addr:''}];
const saveMYP=()=>{LS.set('jepi.myplaces',MYP);LS.set('jepi.mypAt',Date.now());syncSoon()};
const mypOf=id=>MYP.find(x=>x.id===id);
let mypEdit=null, mypMsg='', mypHits=[];
function getPos(maxAge){return new Promise((res,rej)=>{if(!navigator.geolocation)return rej(new Error('이 기기에서는 위치를 쓸 수 없어요'));
  navigator.geolocation.getCurrentPosition(p=>res([+p.coords.latitude.toFixed(6),+p.coords.longitude.toFixed(6)]),e=>rej(new Error(e.code===1?'위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.':'지금 위치를 찾지 못했어요')),{enableHighAccuracy:true,timeout:10000,maximumAge:maxAge||60000})})}
async function kakaoGet(path,params){if(!KEYS.kakao)throw aiErr('nokey','카카오 키가 필요해요');
  let r;try{r=await fetch(`https://dapi.kakao.com${path}?${new URLSearchParams(params)}`,{headers:{Authorization:'KakaoAK '+KEYS.kakao}})}catch(_){throw aiErr('network','카카오에 연결하지 못했어요 (설정 → 카카오 지도 → 확인)')}
  if(r.status===401||r.status===403)throw aiErr('not_granted','카카오 키나 카카오맵 사용 설정을 확인해 주세요');
  if(!r.ok)throw aiErr('upstream_error','카카오 오류 (HTTP '+r.status+')'); return r.json()}
async function addrOf(ll){try{const j=await kakaoGet('/v2/local/geo/coord2address.json',{x:ll[1],y:ll[0]});const d=(j.documents||[])[0];return d?((d.road_address&&d.road_address.address_name)||(d.address&&d.address.address_name)||''):''}catch(_){return ''}}
// The section is drawn by React: app/screens/MyPlacesSection.tsx. Here: what it shows.
function mypView(){return {places:MYP.map(x=>({id:x.id,name:x.name,ll:x.ll||null,addr:x.addr||''})),editing:mypEdit,msg:mypMsg||'',
  hits:mypHits.map(h=>({name:h.name,addr:h.addr})),hasKakao:!!KEYS.kakao}}
document.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.mypedit){mypEdit=t.dataset.mypedit;mypMsg='';mypHits=[];renderSettings();return}
  if(t.id==='mypDone'){const n=$('#mypName'),x=mypOf(mypEdit);if(n&&x&&n.value.trim())x.name=n.value.trim().slice(0,12);saveMYP();mypEdit=null;renderSettings();return}
  if(t.id==='mypAdd'){const id='p'+Date.now().toString(36);MYP.push({id,name:'새 장소',ll:null,addr:''});saveMYP();mypEdit=id;mypMsg='';mypHits=[];renderSettings();return}
  if(t.dataset.mypclear){const id=t.dataset.mypclear;if(id==='home'||id==='work'){const x=mypOf(id);x.ll=null;x.addr=''}else MYP=MYP.filter(x=>x.id!==id);saveMYP();mypEdit=null;renderSettings();return}
  if(t.dataset.myphere){const x=mypOf(t.dataset.myphere);mypMsg='지금 위치를 찾는 중…';renderSettings();
    try{const ll=await getPos(0);x.ll=ll;x.addr=await addrOf(ll);saveMYP();mypMsg=`저장했어요${x.addr?' · '+x.addr:''}`}catch(err){mypMsg=err.message}renderSettings();return}
  if(t.dataset.mypsearch){const q=(($('#mypQ')||{}).value||'').trim();if(!q)return;mypMsg='찾는 중…';renderSettings();
    try{const a=await kakaoGet('/v2/local/search/address.json',{query:q,size:5});let hits=(a.documents||[]).map(d=>({name:d.address_name,addr:(d.road_address&&d.road_address.address_name)||d.address_name,ll:[+d.y,+d.x]}));
      if(!hits.length){const k=await kakaoGet('/v2/local/search/keyword.json',{query:q,size:5});hits=(k.documents||[]).map(d=>({name:d.place_name,addr:d.road_address_name||d.address_name,ll:[+d.y,+d.x]}))}
      mypHits=hits;mypMsg=hits.length?'맞는 곳을 눌러 주세요.':'찾지 못했어요. 다르게 적어 보세요.'}catch(err){mypMsg=err.message}renderSettings();return}
  if(t.dataset.myppick){const [id,i]=t.dataset.myppick.split(':'),x=mypOf(id),h=mypHits[+i];if(x&&h){x.ll=h.ll;x.addr=h.addr;saveMYP();mypHits=[];mypMsg='저장했어요 · '+h.addr}renderSettings();return}
});

