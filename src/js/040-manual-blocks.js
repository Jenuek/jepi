// ---------- blocks the viewer makes by hand ----------
function addCustomToData(c){
  const a=AREAS[c.area]||AREAS[firstArea()], i=P.findIndex(x=>x.id===c.id);
  const p={id:c.id,name:c.name||'직접 만든 블록',cat:CATS[c.cat]?c.cat:'walk',area:a[0],ll:Array.isArray(c.ll)?c.ll:[a[1],a[2]],dur:Math.max(15,+c.dur||60),always:true,drop:!!c.drop,note:c.memo||'직접 만든 블록이에요.',custom:true};
  if(i>=0) P[i]=p; else P.push(p);
  PM[p.id]=p; COST[p.id]=[Math.max(0,+c.cost||0),+c.cost?'직접 입력한 금액':'']; TAGS[p.id]=String(c.tags||'').split(',').map(x=>x.trim()).filter(Boolean); ZONE_OF[p.id]=AREA_ZONE[c.area]||'outer';
}
let customLast=null;
function openCustom(editId,startAt,opts){
  const c=editId?custom.find(x=>x.id===editId):{id:'',name:'',area:firstArea(),cat:'walk',dur:60,cost:0,memo:'',drop:false,tags:''}; if(!c) return;
  const st=startAt!=null?startAt:Math.max(dayStart(day),600);
  // drawn by React: app/screens/CustomSheet.tsx (the same props again with dup while a new name is typed: 388-dedup.js)
  customLast={edit:editId||'',dayLabel:`Day ${day+1} (${DAYS[day].date})`,name:c.name||'',area:c.area,cat:c.cat,dur:c.dur,cost:c.cost??'',memo:c.memo||'',tags:c.tags||'',drop:!!c.drop,
    share:RS.status==='on'&&!PACK.manual?!!c.share:null,start:fmt(st),areas:optsOf(AREAS),cats:Object.entries(CATS),durs:[15,30,45,60,90,120,150,180,240].map(m=>[m,durTxt(m)]),
    currency:String(PACK.currency),dup:null,card:!!(opts&&opts.card),rev:++sheetRev};
  window.JEPI_UI.mount('custom',$('#sheet'),customLast);
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false; setTimeout(()=>{const x=$('#cfName');x&&x.focus()},0);
}
function saveCustomForm(f){
  const editId=f.dataset.edit;
  const c={id:editId||('c'+Date.now().toString(36)),name:$('#cfName').value.trim()||'직접 만든 블록',area:$('#cfArea').value,cat:$('#cfCat').value,dur:+$('#cfDur').value||60,cost:Math.max(0,+$('#cfCost').value||0),memo:$('#cfMemo').value.trim(),tags:$('#cfTags').value.trim(),drop:$('#cfDrop').checked,share:!!($('#cfShare')&&$('#cfShare').checked)};
  TRIP.customs.put(c); addCustomToData(c);
  const asCard=f.dataset.card==='1';
  if(asCard){if(!isWish(c.id))toggleWish(c.id);showToast('내 카드에 담았어요')}
  else if(!editId){const st=parse($('#cfStart').value);TRIP.blocks.add({id:c.id,day,start:Math.max(dayStart(day),Math.min(1410,st??600)),dur:c.dur})}
  {const prev=editId?(custom.find(x=>x.id===c.id)||{}):{};if(RS.status==='on'&&(c.share||prev.share!==undefined))shareCustom(c,c.share)}
  closeSheet(); renderAll();
}

