// ---------- demo sandbox (runs before anything reads storage) ----------
// Entering the demo copies this browser's saved data aside, fills storage with the Osaka demo
// and reloads. Leaving (or opening the app again later) puts the copy back exactly as it was,
// so the demo never leaves a plan, a keyword or a sync change behind.
const DEMO_BACKUP='jepi.demoBackup', DEMO_LIVE='jepi.demoLive';
const DEMO_KEEP=k=>k==='jepi.routes'||k.startsWith('jepi.hours'); // caches: shared, never part of the copy
const DEMO={on:false};
function demoRestore(){
  const raw=localStorage.getItem(DEMO_BACKUP); if(raw==null) return;
  let snap={}; try{snap=JSON.parse(raw)||{}}catch(_){}
  Object.keys(localStorage).forEach(k=>{if(!(k in snap)&&!DEMO_KEEP(k)) localStorage.removeItem(k)});
  Object.entries(snap).forEach(([k,v])=>{try{localStorage.setItem(k,v)}catch(_){}});
  localStorage.removeItem(DEMO_BACKUP);
  try{sessionStorage.removeItem(DEMO_LIVE)}catch(_){}
}
try{
  if(localStorage.getItem(DEMO_BACKUP)!=null){
    // same tab reloading during the demo → stay in it; a new launch → back to the real data
    if(sessionStorage.getItem(DEMO_LIVE)) DEMO.on=true; else demoRestore();
  }
}catch(_){}
