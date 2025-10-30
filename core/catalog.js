;(function initCatalog(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function buildEntries(data, nameFromRecord){
    if(!Array.isArray(data)) return [];
    const entries = data.map((rec,i)=> ({ idx:i, name: nameFromRecord ? nameFromRecord(rec,i) : String(rec?.name||rec?.title||`Site ${i+1}`) }));
    entries.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||''), undefined, { sensitivity: 'base' }));
    return entries;
  }
  function firstArrayOf(o, keys){ for(const k of keys){ if(Array.isArray(o?.[k])) return o[k]; } return null; }
  function normaliseRecord(rec, idx){
    const nameFrom = (r,i)=> String(r && (r.name||r.title||r.site) || `Site ${i+1}`);
    const name = (typeof window!=='undefined' && window.PG && window.PG.catalog && window.PG.catalog.nameFromRecord ? window.PG.catalog.nameFromRecord(rec, idx) : nameFrom(rec, idx));
    function mapIndices(arr){ try{ if(window.PG && window.PG.directions && window.PG.directions.mapIndices) return window.PG.directions.mapIndices(arr); }catch(_){/* noop */} return []; }
    // GOOD / OK candidates
    let goodSrc = firstArrayOf(rec, ['good','GOOD','Good','sectors','SECTORS','goodSectors','GOOD_SECTORS','good_dirs','goodDirs','GOOD_DIRS','goodIndices','good_indices']);
    if(!goodSrc && rec && typeof rec==='object' && rec.directions){ goodSrc = firstArrayOf(rec.directions, ['good','GOOD','Good']); }
    let okSrc = firstArrayOf(rec, ['ok','OK','Ok','okSectors','OK_SECTORS','ok_dirs','okDirs','OK_DIRS','okIndices','ok_indices']);
    if(!okSrc && rec && typeof rec==='object' && rec.directions){ okSrc = firstArrayOf(rec.directions, ['ok','OK','Ok']); }
    // tri-state array support: wind_dir
    function fromWindDirArray(arr){ if(!Array.isArray(arr)) return null; const good=[], ok=[]; arr.forEach((v,i)=>{ const n=Number(v); if(Number.isFinite(n)){ if(n>=2) good.push(i); else if(n>=1) ok.push(i); }}); return { good, ok }; }
    let tri = null; const triCand = rec?.wind_dir ?? rec?.windDir ?? rec?.windDirections ?? rec?.wind_direction ?? rec?.windDirection; if(Array.isArray(triCand)) tri = fromWindDirArray(triCand); if(!tri && rec?.wind && Array.isArray(rec.wind.wind_dir)) tri = fromWindDirArray(rec.wind.wind_dir);
    const good = goodSrc ? mapIndices(goodSrc) : (tri ? tri.good : []);
    const ok   = okSrc   ? mapIndices(okSrc)   : (tri ? tri.ok   : []);
    const colourFromString = (s)=>{ try{ if(window.PG && window.PG.colors && window.PG.colors.colourFromString) return window.PG.colors.colourFromString(s); }catch(_){/* noop */} return '#22c55e'; };
    const color = rec?.color || colourFromString(name);
    const SECTOR_DEG = (window.PG&&window.PG.layout&&window.PG.layout.SECTOR_DEG)||22.5; const angleOffsetDeg = tri ? (SECTOR_DEG/2) : 0;
    const lat = Number(rec?.lat ?? rec?.latitude); const lng = Number(rec?.lng ?? rec?.lon ?? rec?.longitude);
    return { id: (Math.random().toString(36).slice(2, 9)), name, good, ok, color, angleOffsetDeg, lat: Number.isFinite(lat)?lat:undefined, lng: Number.isFinite(lng)?lng:undefined };
  }
  window.PG.catalog = { buildEntries, normaliseRecord };
})();


