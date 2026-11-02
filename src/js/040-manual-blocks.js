// ---------- blocks the viewer makes by hand ----------
function addCustomToData(c){
  const a=AREAS[c.area]||AREAS[firstArea()], i=P.findIndex(x=>x.id===c.id);
  const p={id:c.id,name:c.name||'직접 만든 블록',cat:CATS[c.cat]?c.cat:'walk',area:a[0],ll:Array.isArray(c.ll)?c.ll:[a[1],a[2]],dur:Math.max(15,+c.dur||60),always:true,drop:!!c.drop,note:c.memo||'직접 만든 블록이에요.',custom:true};
  if(i>=0) P[i]=p; else P.push(p);
  PM[p.id]=p; COST[p.id]=[Math.max(0,+c.cost||0),+c.cost?'직접 입력한 금액':'']; TAGS[p.id]=String(c.tags||'').split(',').map(x=>x.trim()).filter(Boolean); ZONE_OF[p.id]=AREA_ZONE[c.area]||'outer';
}
function openCustom(editId,startAt){
  const c=editId?custom.find(x=>x.id===editId):{id:'',name:'',area:firstArea(),cat:'walk',dur:60,cost:0,memo:'',drop:false,tags:''}; if(!c) return;
  const st=startAt!=null?startAt:Math.max(dayStart(day),600);
  $('#sheet').innerHTML=`<h3>${editId?'블록 정보 수정':'직접 블록 만들기'}</h3><div class="when">${editId?'바꾼 내용은 이 블록이 들어간 모든 날에 반영돼요.':`Day ${day+1} (${DAYS[day].date}) 일정에 넣어요.`}</div>
  <form id="customForm" data-edit="${esc(editId||'')}" class="fsec" style="margin-top:12px">
    <div class="fg"><label>이름<input id="cfName" required maxlength="40" value="${esc(c.name)}" placeholder="예: 친구가 추천한 카페"></label>
    <label>동네<select id="cfArea">${areaOpts(c.area)}</select></label>
    <label>종류<select id="cfCat">${Object.entries(CATS).map(([k,v])=>opt(k,v,c.cat)).join('')}</select></label>
    ${editId?'':`<label>시작<input id="cfStart" type="time" value="${fmt(st)}"></label>`}
    <label>머무는 시간<select id="cfDur">${[15,30,45,60,90,120,150,180,240].map(m=>opt(m,durTxt(m),c.dur)).join('')}</select></label>
    <label>1인 예상 비용 (${esc(PACK.currency)})<input id="cfCost" type="number" min="0" step="any" value="${esc(c.cost)}"></label></div>
    <label class="fg" style="display:block"><span class="hint">메모</span><textarea id="cfMemo" rows="2" maxlength="200" style="margin-top:4px">${esc(c.memo)}</textarea></label>
    <label class="fg" style="display:block"><span class="hint">키워드 (쉼표로 구분, 선택)</span><input id="cfTags" maxlength="80" value="${esc(c.tags)}" style="margin-top:4px"></label>
    <label class="toggle"><input type="checkbox" id="cfDrop" ${c.drop?'checked':''}> 짐을 맡기는 곳이에요 (짐 보관함, 숙소 등)</label>
    ${recState==='on'&&!PACK.manual?`<label class="toggle"><input type="checkbox" id="cfShare" ${c.share?'checked':''}> 다른 여행자에게도 이 장소 추천하기 (이름·동네·메모가 공유돼요)</label>`:''}
    <div class="row"><button class="small-btn primary" type="submit">${editId?'저장':'일정에 넣기'}</button><button class="small-btn" type="button" data-close="1">취소</button></div>
  </form><p class="hint">위치는 고른 동네의 중심으로 잡아서 이동 시간을 계산해요. 영업시간은 확인하지 않으니 직접 챙겨 주세요.</p>`;
  $('#sheet').dataset.uid=''; $('#sheetBg').hidden=false; setTimeout(()=>{const x=$('#cfName');x&&x.focus()},0);
}
function saveCustomForm(f){
  const editId=f.dataset.edit;
  const c={id:editId||('c'+Date.now().toString(36)),name:$('#cfName').value.trim()||'직접 만든 블록',area:$('#cfArea').value,cat:$('#cfCat').value,dur:+$('#cfDur').value||60,cost:Math.max(0,+$('#cfCost').value||0),memo:$('#cfMemo').value.trim(),tags:$('#cfTags').value.trim(),drop:$('#cfDrop').checked,share:!!($('#cfShare')&&$('#cfShare').checked)};
  const i=custom.findIndex(x=>x.id===c.id); if(i>=0) custom[i]=c; else custom.push(c); store.set('gp.custom',custom); addCustomToData(c);
  if(!editId){const st=parse($('#cfStart').value);placed.push({uid:'u'+(uidN++),id:c.id,day,start:Math.max(dayStart(day),Math.min(1410,st??600)),dur:c.dur});save()}
  {const prev=editId?(custom.find(x=>x.id===c.id)||{}):{};if(recState==='on'&&(c.share||prev.share!==undefined))shareCustom(c,c.share)}
  closeSheet(); renderAll();
}

