;(function initDirections(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  const DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  function clampDeg(a){ a%=360; if(a<0) a+=360; return a; }
  function degToIdx(deg){ const d=clampDeg(Number(deg)||0); return Math.round(d / (((window.PG&&window.PG.layout&&window.PG.layout.SECTOR_DEG)||22.5))) % DIRS.length; }
  function toIndex(val){ if(typeof val==='number'&&Number.isFinite(val)){ if(val>=0 && val<DIRS.length) return Math.floor(val); return degToIdx(val); } if(typeof val==='string'){ const raw=val.trim(); const u=raw.toUpperCase(); const num=Number(u.replace(/°/g,'')); if(!Number.isNaN(num)) return toIndex(num); const idx=DIRS.indexOf(u); if(idx!==-1) return idx; } return null; }
  function expandRange(a,b){ const ia=toIndex(a); const ib=toIndex(b); if(ia===null||ib===null) return []; const out=[]; let i=ia; for(;;){ out.push(i); if(i===ib) break; i=(i+1)%DIRS.length; } return out; }
  function parseDirectionSpec(spec){ if(Array.isArray(spec)) return spec.flatMap(parseDirectionSpec); if(typeof spec==='object'&&spec){ const from=spec.from??spec.start??spec.startDeg; const to=spec.to??spec.end??spec.endDeg; if(from!==undefined&&to!==undefined) return expandRange(from,to); const single=spec.dir??spec.direction??spec.degree; if(single!==undefined){ const ix=toIndex(single); return ix===null?[]:[ix]; } return []; } if(typeof spec==='string'){ const s=spec.trim(); if(s.includes('-')){ const [a,b]=s.split('-'); return expandRange(a,b); } const ix=toIndex(s); return ix===null?[]:[ix]; } const ix=toIndex(spec); return ix===null?[]:[ix]; }
  function mapIndices(arr){ if(!Array.isArray(arr)) return []; const all=parseDirectionSpec(arr); const seen=new Set(); const out=[]; for(const i of all){ if(i!==null && !seen.has(i)){ seen.add(i); out.push(i); } } return out; }
  window.PG.directions = { degToIdx, toIndex, expandRange, parseDirectionSpec, mapIndices };
})();


