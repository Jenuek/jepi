// ---------- map (Leaflet + CARTO light tiles, loaded only when opened) ----------
const mapState={on:false,map:null,layer:null,all:false,me:null,meMarker:null,watch:null,loading:null};
function loadLeaflet(){
  if(window.L) return Promise.resolve();
  if(mapState.loading) return mapState.loading;
  mapState.loading=new Promise((res,rej)=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(css);
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=()=>res();s.onerror=()=>{mapState.loading=null;rej(new Error('지도를 불러오지 못했어요'))};document.head.appendChild(s)});
  return mapState.loading;
}
const MODE_STYLE=m=>m==='도보'?{dashArray:'2 8',weight:4}:m==='차'?{weight:6}:{weight:5};
const DAY_COLORS=['#27306b','#c0397f','#1f7f86','#a8761b','#3f7a5a','#7a3f78','#b4542f'];
async function openMap(){
  const box=$('#mapBox'); if(!box) return;
  try{await loadLeaflet()}catch(e){$('#mapMsg').textContent='지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.';return}
  if(!mapState.map){
    mapState.map=L.map(box,{zoomControl:true,attributionControl:true});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 기여자'}).addTo(mapState.map);
    mapState.layer=L.layerGroup().addTo(mapState.map);
  }
  mapState.on=true;
  setTimeout(()=>{mapState.map.invalidateSize();drawMap(true)},60);
}
function mapLegs(d){
  const {items}=analyze(d); const list=items.filter(i=>!(i.stay&&i!==items[items.length-1]&&i!==items[0])&&i.ll&&(i.ll[0]||i.ll[1]));
  const stops=[]; list.forEach(i=>{const last=stops[stops.length-1];if(last&&km(last.ll,i.ll)<0.05&&last.stay===i.stay)return;stops.push(i)});
  const legs=[]; for(let k=1;k<stops.length;k++){const a=stops[k-1].ll,b=stops[k].ll; const t=travel(a,b); legs.push({a,b,t,from:stops[k-1],to:stops[k]})}
  return {stops,legs};
}
function drawMap(fit){
  if(!mapState.map||!mapState.on) return;
  const lg=mapState.layer; lg.clearLayers(); const bounds=[];
  const days=mapState.all?DAYS.map((_,i)=>i):[day];
  days.forEach(d=>{
    const col=mapState.all?DAY_COLORS[d%DAY_COLORS.length]:getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#27306b';
    const {stops,legs}=mapLegs(d);
    legs.forEach(L_=>{const t=L_.t; const pts=t&&t.poly?t.poly:[L_.a,L_.b];
      const st=t&&t.real?MODE_STYLE(t.mode):{dashArray:'6 8',weight:3,opacity:.7};
      L.polyline(pts,Object.assign({color:col,opacity:.85,lineCap:'round'},st)).addTo(lg)
        .bindPopup(`<b>${esc(L_.from.name)} → ${esc(L_.to.name)}</b><br>${t?`${t.real?'':'≈ '}${esc(t.mode)} ${t.min}분${t.lines?' · '+esc(t.lines):''}${t.tf?` · 환승 ${t.tf}회`:''}`:'가까워요'}<br><a href="${navLink(L_.a,L_.b,t?t.mode:'도보',L_.to.name)}" target="_blank" rel="noopener">안내 시작</a>`);
      pts.forEach(p=>bounds.push(p))});
    let n=0;
    stops.forEach(s=>{const num=s.kind==='place'?++n:0;
      const ic=L.divIcon({className:'jp-pin',html:`<span style="background:${s.kind==='place'?col:'#ffffff'};color:${s.kind==='place'?'#fff':col};border-color:${col}">${s.kind==='place'?num:s.stay?'⌂':'✈'}</span>`,iconSize:[28,28],iconAnchor:[14,14]});
      L.marker(s.ll,{icon:ic,title:s.name}).addTo(lg).bindPopup(`<b>${esc(s.name)}</b><br><span class="mono">${mapState.all?`Day ${d+1} · `:''}${fmt(s.start)}–${fmt(s.end)}</span>`);
      bounds.push(s.ll)});
  });
  if(mapState.me){bounds.length||bounds.push(mapState.me)}
  if(fit&&bounds.length){mapState.map.fitBounds(bounds,{padding:[36,36],maxZoom:16})}
  else if(fit){const c=cityLL&&cityLL();if(c)mapState.map.setView(c,12)}
  renderMapCards();
}
let mapCardsRev=0;
function renderMapCards(){
  const el=$('#mapCards'); if(!el) return;
  const {stops,legs}=mapLegs(day);
  const est=legs.some(x=>x.t&&x.t.est), noKey=legs.length&&!legs.some(x=>x.t&&x.t.real)&&!routeProvider(legs[0].a,legs[0].b);
  $('#mapMsg').textContent=mapState.all?'날짜별 색으로 전체 여행을 보여 줘요.':noKey?'점선은 직선 거리예요. 설정에서 지도 키를 연결하면 실제 경로가 그려져요.':est?'경로를 불러오는 중이에요…':'';
  // drawn by React: app/screens/Dice.tsx MapCards
  window.JEPI_UI.mount('mapCards',el,{rev:++mapCardsRev,stops:stops.map((s,i)=>{const t=i?legs[i-1].t:null,prev=i?stops[i-1]:null;
    return {leg:t?`${t.real?'':'≈ '}${t.mode} ${t.min}분${t.lines?` · ${t.lines}`:''}${t.tf?` · 환승 ${t.tf}`:''}`:'',name:String(s.name),time:`${fmt(s.start)}–${fmt(s.end)}`,nav:prev?navLink(prev.ll,s.ll,t?t.mode:'도보',s.name):''}})});}
function locateMe(){
  if(!navigator.geolocation){$('#mapMsg').textContent='이 기기에서는 위치를 쓸 수 없어요.';return}
  if(mapState.watch!=null){navigator.geolocation.clearWatch(mapState.watch);mapState.watch=null;if(mapState.meMarker){mapState.meMarker.remove();mapState.meMarker=null}mapState.me=null;$('#mapMe').setAttribute('aria-pressed','false');return}
  $('#mapMe').setAttribute('aria-pressed','true');
  mapState.watch=navigator.geolocation.watchPosition(p=>{mapState.me=[p.coords.latitude,p.coords.longitude];
    if(!mapState.meMarker)mapState.meMarker=L.circleMarker(mapState.me,{radius:8,color:'#fff',weight:3,fillColor:'#1a73e8',fillOpacity:1}).addTo(mapState.map);else mapState.meMarker.setLatLng(mapState.me);
    if(!locateMe.did){locateMe.did=true;mapState.map.setView(mapState.me,15)}},()=>{$('#mapMsg').textContent='위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요.';$('#mapMe').setAttribute('aria-pressed','false');mapState.watch=null},{enableHighAccuracy:true,maximumAge:15000});
}

