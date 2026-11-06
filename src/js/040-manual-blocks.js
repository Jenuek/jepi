// ---------- blocks the viewer makes by hand ----------
const addCustomToData=PLC.addCustom;   // app/data/places.ts
let customLast=null;
function openCustom(editId,startAt,opts){
  const c=editId?CUR.custom.find(x=>x.id===editId):{id:'',name:'',area:firstArea(),cat:'walk',dur:60,cost:0,memo:'',drop:false,tags:''}; if(!c) return;
  const st=startAt!=null?startAt:Math.max(dayStart(UI.day),600);
  // drawn by React: app/screens/CustomSheet.tsx (the same props again with dup while a new name is typed: 388-dedup.js)
  customLast={edit:editId||'',dayLabel:`Day ${UI.day+1} (${DY.days[UI.day].date})`,name:c.name||'',area:c.area,cat:c.cat,dur:c.dur,cost:c.cost??'',memo:c.memo||'',tags:c.tags||'',drop:!!c.drop,
    share:RS.status==='on'&&!PK.pack.manual?!!c.share:null,start:fmt(st),areas:optsOf(AREAS),cats:Object.entries(CATS),durs:[15,30,45,60,90,120,150,180,240].map(m=>[m,durTxt(m)]),
    currency:String(PK.pack.currency),dup:null,card:!!(opts&&opts.card),rev:++sheetRev};
  window.JEPI_UI.mount('custom',$('#sheet'),customLast);
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false; setTimeout(()=>{const x=$('#cfName');x&&x.focus()},0);
}
function saveCustomForm(f){
  const editId=f.dataset.edit;
  const c={id:editId||('c'+Date.now().toString(36)),name:$('#cfName').value.trim()||'직접 만든 블록',area:$('#cfArea').value,cat:$('#cfCat').value,dur:+$('#cfDur').value||60,cost:Math.max(0,+$('#cfCost').value||0),memo:$('#cfMemo').value.trim(),tags:$('#cfTags').value.trim(),drop:$('#cfDrop').checked,share:!!($('#cfShare')&&$('#cfShare').checked)};
  TRIP.customs.put(c); addCustomToData(c);
  const asCard=f.dataset.card==='1';
  if(asCard){if(!isWish(c.id))toggleWish(c.id);showToast('내 카드에 담았어요')}
  else if(!editId){const st=parse($('#cfStart').value);TRIP.blocks.add({id:c.id,day:UI.day,start:Math.max(dayStart(UI.day),Math.min(1410,st??600)),dur:c.dur})}
  {const prev=editId?(CUR.custom.find(x=>x.id===c.id)||{}):{};if(RS.status==='on'&&(c.share||prev.share!==undefined))shareCustom(c,c.share)}
  closeSheet(); renderAll();
}

