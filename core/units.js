;(function initUnitsModule(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  const Units = {
    toMph(kph){ return kph / 1.60934; },
    toKts(kph){ return kph / 1.852; },
    toKphFromMph(mph){ return mph * 1.60934; },
    toKphFromKts(kts){ return kts * 1.852; },
    formatSpeed(kph, units){
      if(!Number.isFinite(kph)) return '';
      const u = (units||'kph').toLowerCase();
      if(u==='mph') return Math.round(kph/1.60934) + ' mph';
      if(u==='knots' || u==='kts') return Math.round(kph/1.852) + ' kts';
      return Math.round(kph) + ' km/h';
    }
  };
  window.PG.units = Units;
})();


