;(function initState(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function readJSON(key, def){ try{ const v=localStorage.getItem(key); return v? JSON.parse(v) : def; }catch(_){ return def; } }
  function readSites(){ return readJSON('windrose-sites', []); }
  function readTitle(){ return localStorage.getItem('windrose-title') || ''; }
  function migrateModel(m){ if(m==='ukmo_uk_deterministic_2km') return 'ukmo_seamless'; return m; }
  function readSettings(){
    const out = {};
    const vLive = localStorage.getItem('windrose-live'); if(vLive!==null) out.liveWindOn = (vLive==='1');
    const d = localStorage.getItem('windrose-day'); if(d!==null) out.selectedDayOffset = Math.max(0, Math.min(6, Number(d)||0));
    const h = localStorage.getItem('windrose-hideoutside'); if(h!==null) out.hideSitesOutside = (h==='1');
    const u = localStorage.getItem('windrose-units'); if(u) out.units = (u==='kts'?'knots':u);
    const hr = localStorage.getItem('windrose-hour'); if(hr){ const parsed = hr==='auto'? NaN : Number(hr); out.selectedHour = Number.isFinite(parsed) ? parsed : null; }
    let m = localStorage.getItem('windrose-model'); if(!m) m='ukmo_seamless'; out.weatherModel = migrateModel(m);
    const lr = Number(localStorage.getItem('windrose-label-radius')); if(Number.isFinite(lr)) out.LABEL_RADIUS_FACTOR = lr;
    const ro = localStorage.getItem('windrose-ring-order'); if(ro==='long'||ro==='short') out.ringOrder = ro;
    const lno = localStorage.getItem('windrose-longnames-out'); if(lno!==null) out.longNamesOut = (lno==='1');
    const ex = localStorage.getItem('windrose-expand-isolated'); if(ex!==null) out.expandIsolatedSegments = (ex==='1');
    out.manualRingTargets = readJSON('windrose-manual-rings', {});
    const rm = localStorage.getItem('windrose-reorder-mode'); if(rm!==null) out.reorderMode = (rm==='1');
    return out;
  }
  function saveState(s){
    try{
      if(s.sites!==undefined) localStorage.setItem('windrose-sites', JSON.stringify(s.sites));
      if(s.windRoseTitleText!==undefined) localStorage.setItem('windrose-title', s.windRoseTitleText);
      if(s.liveWindOn!==undefined) localStorage.setItem('windrose-live', s.liveWindOn ? '1' : '0');
      if(s.selectedDayOffset!==undefined) localStorage.setItem('windrose-day', String(s.selectedDayOffset));
      if(s.hideSitesOutside!==undefined) localStorage.setItem('windrose-hideoutside', s.hideSitesOutside ? '1' : '0');
      if(s.units!==undefined) localStorage.setItem('windrose-units', s.units || 'kph');
      if(s.selectedHour!==undefined) localStorage.setItem('windrose-hour', s.selectedHour===null? 'auto' : String(s.selectedHour));
      if(s.weatherModel!==undefined) localStorage.setItem('windrose-model', s.weatherModel || 'default');
      if(s.LABEL_RADIUS_FACTOR!==undefined) localStorage.setItem('windrose-label-radius', String(s.LABEL_RADIUS_FACTOR));
      if(s.ringOrder!==undefined) localStorage.setItem('windrose-ring-order', s.ringOrder);
      if(s.longNamesOut!==undefined) localStorage.setItem('windrose-longnames-out', s.longNamesOut ? '1' : '0');
      if(s.expandIsolatedSegments!==undefined) localStorage.setItem('windrose-expand-isolated', s.expandIsolatedSegments ? '1' : '0');
      if(s.manualRingTargets!==undefined) localStorage.setItem('windrose-manual-rings', JSON.stringify(s.manualRingTargets||{}));
      if(s.reorderMode!==undefined) localStorage.setItem('windrose-reorder-mode', s.reorderMode ? '1' : '0');
    }catch(_){/* noop */}
  }
  window.PG.state = { readSites, readTitle, readSettings, saveState };
})();


