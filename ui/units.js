;(function initUnitsUI(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function bindSwitch(sw, getUnits, setUnits){ if(!sw) return; const setMode=(m)=>{ setUnits && setUnits(m); sw.dataset.mode = getUnits? getUnits(): m; const otherId = (sw.id==='unitSwitchDesktop'?'unitSwitchMobile':'unitSwitchDesktop'); const other=document.getElementById(otherId); if(other) other.dataset.mode = sw.dataset.mode; }; sw.dataset.mode = getUnits? getUnits() : 'kph'; sw.querySelector('.kph')?.addEventListener('click', ()=> setMode('kph')); sw.querySelector('.mph')?.addEventListener('click', ()=> setMode('mph')); sw.querySelector('.kts')?.addEventListener('click', ()=> setMode('knots')); }
  function initDesktop(ctx){ const sw=document.getElementById('unitSwitchDesktop'); bindSwitch(sw, ctx&&ctx.getUnits, ctx&&ctx.setUnits); }
  function initMobile(ctx){ const sw=document.getElementById('unitSwitchMobile'); bindSwitch(sw, ctx&&ctx.getUnits, ctx&&ctx.setUnits); }
  window.PG.unitsUI = { initDesktop, initMobile };
})();


