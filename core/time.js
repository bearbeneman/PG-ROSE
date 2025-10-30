;(function initTime(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function dayKeyForOffset(offset){
    const base = new Date();
    base.setHours(12,0,0,0);
    const d = new Date(base);
    d.setDate(base.getDate() + (Number(offset)||0));
    return d.toISOString().slice(0,10);
  }
  function hourOf(timeStr){
    if(!timeStr || typeof timeStr !== 'string') return NaN;
    const hh = Number(timeStr.slice(11,13));
    return Number.isFinite(hh) ? hh : NaN;
  }
  window.PG.time = { dayKeyForOffset, hourOf };
})();


