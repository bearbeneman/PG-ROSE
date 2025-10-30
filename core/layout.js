;(function initLayout(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  const SECTOR_DEG = 22.5;
  function clampDeg(a){ a%=360; if(a<0) a+=360; return a; }
  function sectorBounds(idx){ const center = idx * SECTOR_DEG; return [ clampDeg(center - SECTOR_DEG/2), clampDeg(center + SECTOR_DEG/2) ]; }
  function contiguousRanges(selected){
    if(!selected || !selected.length) return [];
    selected = [...new Set(selected)].sort((a,b)=>a-b);
    const runs=[]; const used=new Array(16).fill(false); const next=i=>(i+1)%16; const inSel=i=>selected.includes(i);
    for(const i of selected){ if(used[i]) continue; let s=i,e=i; used[i]=true; while(inSel(next(e)) && !used[next(e)]){ e=next(e); used[e]=true; } runs.push({startIdx:s, endIdx:e}); }
    // merge across North if needed
    if(runs.length>=2){ runs.sort((a,b)=>a.startIdx-b.startIdx); const first=runs[0], last=runs[runs.length-1]; if(first.startIdx===0 && last.endIdx===15){ runs.splice(0, runs.length, {startIdx:last.startIdx, endIdx:first.endIdx}); } }
    return runs.map(r=>{ const count=(r.endIdx - r.startIdx + 16)%16 + 1; return { ...r, spanDeg: count * SECTOR_DEG }; });
  }
  function intervals(arc){
    const s = clampDeg(arc.startDeg);
    const e = clampDeg(arc.startDeg + arc.spanDeg);
    if(e > s) return [[s,e]];
    return [[s,360],[0,e]];
  }
  function overlaps(a,b){
    const ia = intervals(a), ib = intervals(b);
    for(const [as,ae] of ia){ for(const [bs,be] of ib){ const s=Math.max(as,bs), e=Math.min(ae,be); if(e - s >= 0) return true; } }
    return false;
  }
  function overlapsOpen(a,b){
    const ia = intervals(a), ib = intervals(b);
    for(const [as,ae] of ia){ for(const [bs,be] of ib){ const s=Math.max(as,bs), e=Math.min(ae,be); if(e - s > 1e-4) return true; } }
    return false;
  }
  function assignRings(allArcs, opts){
    const { ringOrder='short', longNamesOut=false, manualRingTargets={}, lastAssignedRingsRef } = opts||{};
    const score = (arc)=>{
      const s = arc.site ? String(arc.site) : '';
      const visualLen = s.trim().length;
      const labelBonus = longNamesOut ? Math.min(240, visualLen * 2.0) : 0;
      const base = (ringOrder === 'long' ? -1 : 1) * arc.spanDeg;
      return base + labelBonus;
    };
    const manualSort = (arc)=>{ const t = manualRingTargets && manualRingTargets[arc.siteId]; return (t===undefined || t===null) ? Number.POSITIVE_INFINITY : Number(t); };
    const arcs = [...allArcs].sort((a,b)=>{ const ma=manualSort(a), mb=manualSort(b); if(ma!==mb) return ma - mb; return score(a) - score(b); });
    const rings = [];
    for(const arc of arcs){
      let placed=false; const desired = manualRingTargets && manualRingTargets[arc.siteId];
      if(desired!==undefined && desired!==null){
        const total = Math.max(rings.length, Number(desired)+1);
        let span=0; outer: for(;;){
          const candidates = span===0? [Number(desired)] : [Number(desired)+span, Number(desired)-span];
          for(const r of candidates){ if(r<0) continue; let clash=false; if(r<rings.length){ clash = rings[r].some(x=>overlapsOpen(x, arc)); }
            if(!clash){ while(rings.length<=r) rings.push([]); rings[r].push(arc); arc.ring=r; placed=true; break outer; }
          }
          span++; if(span>total+2) break;
        }
      }
      if(!placed){ for(let r=0;r<rings.length;r++){ const clash = rings[r].some(x=>overlapsOpen(x, arc)); if(!clash){ rings[r].push(arc); arc.ring=r; placed=true; break; } } }
      if(!placed){ rings.push([arc]); arc.ring = rings.length-1; }
      if(lastAssignedRingsRef){ const prev = lastAssignedRingsRef[arc.siteId]; lastAssignedRingsRef[arc.siteId] = (prev===undefined)? arc.ring : Math.min(prev, arc.ring); }
    }
    return arcs;
  }
  function computeRadialLayout(totalRings, cfg){
    const core = cfg && Number.isFinite(cfg.coreMargin) ? cfg.coreMargin : 70;
    const guide = cfg && Number.isFinite(cfg.guideRadius) ? cfg.guideRadius : 330;
    const innerMin = core;
    const outerMax = guide - 8;
    const gap = totalRings > 1 ? 6 : 0;
    const width = (outerMax - innerMin - gap * Math.max(0, totalRings-1)) / totalRings;
    return { inner: innerMin, outer: outerMax, gap, width };
  }
  function rangesToArcs(site, ranges){
    const arcs = [];
    const offset = site && Number.isFinite(site.angleOffsetDeg) ? site.angleOffsetDeg : 0;
    let localIdx = 0;
    for(const r of (ranges||[])){
      const [sStart] = sectorBounds(r.startIdx);
      const [, eEnd]  = sectorBounds(r.endIdx);
      let start = clampDeg(sStart + offset);
      let end = clampDeg(eEnd + offset);
      let span = clampDeg(end - start);
      if(span === 0) span = 360;
      if(Math.abs(span - r.spanDeg) > 0.01) span = r.spanDeg;
      arcs.push({ id: String(site.id||site.name||'site') + '-' + (localIdx++), siteId: site.id, site: site.name, color: site.color, startDeg: start, spanDeg: span });
    }
    return arcs;
  }

  function buildArcs(sites){
    const unionArcs = [], goodArcs = [], okOnlyArcs = [];
    for(const s of (sites||[])){
      const goodSet = new Set(Array.isArray(s.good) ? s.good : (Array.isArray(s.sectors)? s.sectors : []));
      const okSet   = new Set(Array.isArray(s.ok) ? s.ok : []);
      const unionSet = new Set([...goodSet, ...okSet]);
      const okOnlySet = new Set([...okSet].filter(x => !goodSet.has(x)));
      const unionRanges = contiguousRanges([...unionSet]);
      const goodRanges  = contiguousRanges([...goodSet]);
      const okOnlyRanges= contiguousRanges([...okOnlySet]);
      unionArcs.push(...rangesToArcs(s, unionRanges).map(a=>({...a, layer:'union'})));
      goodArcs .push(...rangesToArcs(s, goodRanges ).map(a=>({...a, layer:'good'})));
      okOnlyArcs.push(...rangesToArcs(s, okOnlyRanges).map(a=>({...a, layer:'okonly'})));
    }
    return { unionArcs, goodArcs, okOnlyArcs };
  }

  window.PG.layout = { SECTOR_DEG, clampDeg, sectorBounds, contiguousRanges, intervals, overlaps, overlapsOpen, assignRings, computeRadialLayout, rangesToArcs, buildArcs };
})();


