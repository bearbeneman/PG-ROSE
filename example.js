(function(){
  // ------------------------------
  // Compass configuration
  // ------------------------------
  const DIRS = [
    'N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'
  ];
  const SECTOR_DEG = 360 / DIRS.length; // 22.5
  const CATALOG_ANGLE_OFFSET = SECTOR_DEG / 2; // half-bin to align catalog bins

  // Helpers
  const clampDeg = d => (d % 360 + 360) % 360; // 0..360
  const toRad = deg => (deg - 90) * Math.PI / 180; // 0° at north, clockwise

  // Unique id
  const uid = () => Math.random().toString(36).slice(2, 9);

  // Colour from string (stable) and a darker variant for OK
  function colourFromString(str){
    let h=0; for(let i=0;i<str.length;i++){h = (h*31 + str.charCodeAt(i))>>>0}
    const hue = h % 360; return `hsl(${hue} 70% 55%)`;
  }
  function darkerOf(hsl){
    const m = /hsl\((\d+)\s+([\d.]+)%\s+([\d.]+)%\)/i.exec(hsl);
    if(!m) return hsl; const h=m[1], s=m[2];
    const l = 43; // slightly darker than 55
    return `hsl(${h} ${s}% ${l}%)`;
  }

  // Build UI for sectors (tri‑state OFF→OK→GOOD)
  const dirGrid = document.getElementById('dirGrid');
  function initCompass(){
    if(!dirGrid) return;
    dirGrid.innerHTML = '';
    // Size scales with container width (using viewBox only)
    const size = 500; const c = size/2; const innerR = 34; const outerR = c - 20;
    const svgCtrl = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svgCtrl.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svgCtrl.setAttribute('class','compass-svg');

    // Back circle
    const back = document.createElementNS('http://www.w3.org/2000/svg','circle');
    back.setAttribute('cx', c); back.setAttribute('cy', c); back.setAttribute('r', String(outerR));
    back.setAttribute('fill', '#0b1222'); back.setAttribute('stroke', '#243043'); back.setAttribute('stroke-width','1');
    svgCtrl.appendChild(back);

    // Build 16 clickable sectors
    for(let i=0; i<DIRS.length; i++){
      const centerAng = i * SECTOR_DEG;
      const a0 = centerAng - SECTOR_DEG/2;
      const a1 = centerAng + SECTOR_DEG/2;
      const d = ringArcPath(c, c, innerR, outerR, a0, a1);
      const seg = document.createElementNS('http://www.w3.org/2000/svg','path');
      seg.setAttribute('d', d);
      seg.setAttribute('class','dir-seg');
      seg.dataset.idx = String(i);
      seg.dataset.state = '0';
      // Per-segment status label (GOOD / OK)
      const badge = document.createElementNS('http://www.w3.org/2000/svg','text');
      badge.setAttribute('class','seg-badge');
      const midAng = (a0 + a1) / 2;
      const [bx, by] = (function(){ const t=(midAng-90)*Math.PI/180; return [c + (innerR + (outerR-innerR)*0.55)*Math.cos(t), c + (innerR + (outerR-innerR)*0.55)*Math.sin(t)]; })();
      badge.setAttribute('x', bx); badge.setAttribute('y', by);
      badge.setAttribute('fill', '#e5e7eb');
      badge.setAttribute('font-size','12');
      badge.setAttribute('text-anchor','middle'); badge.setAttribute('dominant-baseline','central');
      badge.style.display = 'none';

      function paint(){
        const s = Number(seg.dataset.state||'0');
        if(s===0){ seg.setAttribute('fill','transparent'); seg.setAttribute('stroke','#334155'); seg.setAttribute('stroke-width','1.2'); seg.setAttribute('fill-opacity','0'); badge.style.display='none'; }
        if(s===1){ seg.setAttribute('fill','#0ea5e9'); seg.setAttribute('fill-opacity','.30'); seg.setAttribute('stroke','#0ea5e9'); seg.setAttribute('stroke-width','2'); badge.style.display='block'; badge.textContent='OK'; badge.setAttribute('font-weight','800'); }
        if(s===2){ seg.setAttribute('fill','#22c55e'); seg.setAttribute('fill-opacity','.35'); seg.setAttribute('stroke','#22c55e'); seg.setAttribute('stroke-width','2'); badge.style.display='block'; badge.textContent='GOOD'; badge.setAttribute('font-weight','900'); }
      }
      paint();
      seg.addEventListener('click', ()=>{
        let s = Number(seg.dataset.state||'0');
        s = (s + 1) % 3;
        seg.dataset.state = String(s);
        paint();
      });
      svgCtrl.appendChild(seg);
      svgCtrl.appendChild(badge);
    }

    // All 16 compass labels
    DIRS.forEach((txt, i)=>{
      const ang = i * SECTOR_DEG;
      const [x,y] = (function(){ const t=(ang-90)*Math.PI/180; return [c + (outerR+18)*Math.cos(t), c + (outerR+18)*Math.sin(t)]; })();
      const t = document.createElementNS('http://www.w3.org/2000/svg','text');
      t.textContent = txt; t.setAttribute('x', x); t.setAttribute('y', y);
      t.setAttribute('fill','#cbd5e1');
      const isCardinal = (i%4)===0; // N,E,S,W
      t.setAttribute('font-size', isCardinal ? '16' : '10');
      if(isCardinal) t.setAttribute('font-weight','800'); else t.setAttribute('font-weight','600');
      t.setAttribute('text-anchor','middle'); t.setAttribute('dominant-baseline','central');
      svgCtrl.appendChild(t);
    });

    dirGrid.appendChild(svgCtrl);
  }
  initCompass();

  const q = sel => document.querySelector(sel);
  const siteName = q('#siteName');
  const addBtn = q('#addBtn');
  const clearBtn = q('#clearBtn');
  const exportBtn = null; // removed
  const importBtn = null; // removed
  const savePdfBtn = q('#savePdfBtn');
  const printBtn = q('#printBtn');
  const testBtn = q('#testBtn');
  const siteList = q('#siteList');
  const legendEl = q('#legend');
  const svg = q('#rose');
  const liveToggleOverlay = q('#liveToggleOverlay');
  const liveBtn = q('#liveWindBtn');
  const liveGroup = q('#liveGroup');
  const dayButtonsEl = q('#dayButtons');
  const hideOutsideToggle = q('#hideOutsideToggle');
  const unitSwitchDesktop = q('#unitSwitchDesktop');
  const modelSelect = q('#modelSelect');
  const catalogSelect = q('#catalogSelect');
  const addFromCatalogBtn = q('#addFromCatalogBtn');
  const catalogHint = q('#catalogHint');
  const siteMapEl = q('#siteMap');
  const addSelectedFromMapBtn = q('#addSelectedFromMapBtn');
  const clearMapSelectionBtn = q('#clearMapSelectionBtn');
  const mapHint = q('#mapHint');
  const windRoseTitle = q('#windRoseTitle');
  const showLiveWind = q('#showLiveWind');
  const radiusInput = q('#radiusInput');
  const radiusSlider = q('#radiusSlider');
  const drawRadiusBtn = q('#drawRadiusBtn');
  const clearRadiusBtn = q('#clearRadiusBtn');
  const radiusHint = q('#radiusHint');
  const startPolyBtn = q('#startPolyBtn');
  const clearPolyBtn = q('#clearPolyBtn');
  const polyHint = q('#polyHint');
  

  // Tooltip element (fixed so text is always horizontal)
  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  tooltip.className = 'tooltip';
  tooltip.setAttribute('role','status');
  tooltip.setAttribute('aria-live','polite');
  document.body.appendChild(tooltip);
  function showTip(text){ tooltip.textContent = text; tooltip.style.opacity = '1'; }
  function moveTip(evt){ if(!tooltip || tooltip.style.opacity==='0') return; tooltip.style.left = evt.clientX + 'px'; tooltip.style.top = evt.clientY + 'px'; }
  function hideTip(){ tooltip.style.opacity = '0'; }
  window.addEventListener('mousemove', moveTip, { passive: true });

  const showDegrees = q('#showDegrees') || {checked:true};

  // ------------------------------
  // Data model
  // ------------------------------
  let sites = load() || [];
  let windRoseTitleText = loadTitle() || '';
  let liveWindOn = true;
  let selectedDayOffset = 0; // 0=today, 1=tomorrow, ... up to 6
  let selectedHour = null;   // null = auto (closest now) or daily average if day offset > 0
  let hideSitesOutside = false;
  let units = 'kph';
  let weatherModel = 'ukmo_seamless';
  let titleOffsetDesktopPx = -16;
  let titleOffsetMobilePx = -16;
  // Animation: track sites just added to animate their segments once
  const animateSiteIds = new Set();
  // Label layout controls (declared early to avoid TDZ when loading from storage)
  let LABEL_MAX_PX = 28; // baked-in cap for site label font-size
  let LABEL_RADIUS_FACTOR = 0.45; // legacy factor (slider removed); not used when auto-center is on
  // Ring packing order: 'short' = shorter arcs inner (default), 'long' = longer arcs inner
  let ringOrder = 'short';
  // Option: if an arc has no higher ring overlapping above it, expand to full available height
  let expandIsolatedSegments = false;
  // Preference: push long site names outward in stacking
  let longNamesOut = false;
  // Auto-center label vertically within band regardless of font size
  let autoCenterLabels = true;
  // Manual ring targets for reordering (siteId -> desired ring index)
  let manualRingTargets = {};
  let lastAssignedRings = {};
  let reorderMode = false;

  function save(){ 
    localStorage.setItem('windrose-sites', JSON.stringify(sites)); 
    localStorage.setItem('windrose-title', windRoseTitleText);
    localStorage.setItem('windrose-live', liveWindOn ? '1' : '0');
    localStorage.setItem('windrose-day', String(selectedDayOffset));
    localStorage.setItem('windrose-hideoutside', hideSitesOutside ? '1' : '0');
    localStorage.setItem('windrose-units', units || 'kph');
    localStorage.setItem('windrose-hour', selectedHour===null? 'auto' : String(selectedHour));
    localStorage.setItem('windrose-model', weatherModel || 'default');
    localStorage.setItem('windrose-label-radius', String(LABEL_RADIUS_FACTOR));
    localStorage.setItem('windrose-ring-order', ringOrder);
    localStorage.setItem('windrose-longnames-out', longNamesOut ? '1' : '0');
    localStorage.setItem('windrose-expand-isolated', expandIsolatedSegments ? '1' : '0');
    try{ localStorage.setItem('windrose-manual-rings', JSON.stringify(manualRingTargets||{})); }catch(_){/* noop */}
    localStorage.setItem('windrose-reorder-mode', reorderMode ? '1' : '0');
    
  }
  function load(){ try{ return JSON.parse(localStorage.getItem('windrose-sites')||'[]') }catch(e){ return [] } }
  function loadTitle(){ return localStorage.getItem('windrose-title') || ''; }
  (function(){ const v = localStorage.getItem('windrose-live'); if(v!==null) liveWindOn = v==='1'; const d=localStorage.getItem('windrose-day'); if(d!==null) selectedDayOffset = Math.max(0, Math.min(6, Number(d)||0)); const h=localStorage.getItem('windrose-hideoutside'); if(h!==null) hideSitesOutside = h==='1'; const u=localStorage.getItem('windrose-units'); if(u){ units = (u==='mph'||u==='kph'||u==='knots'||u==='kts') ? (u==='kts'?'knots':u) : 'kph'; } const hr = localStorage.getItem('windrose-hour'); if(hr){ const parsed = hr==='auto'? NaN : Number(hr); selectedHour = Number.isFinite(parsed) ? parsed : null; } else { selectedHour = null; } let m=localStorage.getItem('windrose-model'); if(!m){ m='ukmo_seamless'; } if(m==='ukmo_uk_deterministic_2km'){ m='ukmo_seamless'; } weatherModel=m; const lr = Number(localStorage.getItem('windrose-label-radius')); if(Number.isFinite(lr) && lr>=0.2 && lr<=0.8) LABEL_RADIUS_FACTOR = lr; const ro = localStorage.getItem('windrose-ring-order'); if(ro==='long' || ro==='short'){ ringOrder = ro; } const lno = localStorage.getItem('windrose-longnames-out'); if(lno!==null) longNamesOut = (lno==='1'); const ex = localStorage.getItem('windrose-expand-isolated'); if(ex!==null) expandIsolatedSegments = (ex==='1'); try{ manualRingTargets = JSON.parse(localStorage.getItem('windrose-manual-rings')||'{}'); }catch(_){ manualRingTargets = {}; } const rm = localStorage.getItem('windrose-reorder-mode'); if(rm!==null) reorderMode = (rm==='1'); })();

  // ------------------------------
  // Sector utilities
  // ------------------------------
  function sectorBounds(idx){
    const center = idx * SECTOR_DEG;
    const start = clampDeg(center - SECTOR_DEG/2);
    const end   = clampDeg(center + SECTOR_DEG/2);
    return [start,end];
  }

  // Convert selected sector indices (0..15) into contiguous ranges on a circular array.
  function contiguousRanges(selected){
    if(!selected || !selected.length) return [];
    selected = [...new Set(selected)].sort((a,b)=>a-b);

    // First, break into linear runs
    const runs = [];
    const used = new Array(DIRS.length).fill(false);
    const inSel = i => selected.includes(i);
    const next = i => (i+1) % DIRS.length;

    for(const i of selected){
      if(used[i]) continue;
      let start=i, end=i; used[i]=true;
      while(inSel(next(end)) && !used[next(end)]){ end = next(end); used[end]=true; }
      runs.push({startIdx:start, endIdx:end});
    }

    // Always merge across North if ranges touch both sides
    if(runs.length>=2){
      runs.sort((a,b)=>a.startIdx-b.startIdx);
      const first = runs[0];
      const last  = runs[runs.length-1];
      if(first.startIdx===0 && last.endIdx===DIRS.length-1){
        runs.splice(0, runs.length, {startIdx:last.startIdx, endIdx:first.endIdx});
      }
    }

    return runs.map(r=>{
      const count = (r.endIdx - r.startIdx + DIRS.length) % DIRS.length + 1;
      return { ...r, spanDeg: count * SECTOR_DEG };
    });
  }

  // Turn ranges into arcs with absolute angles
  function rangesToArcs(site, ranges){
    const arcs = [];
    const offset = site.angleOffsetDeg || 0;
    ranges.forEach(r=>{
      const [sStart] = sectorBounds(r.startIdx);
      const [, eEnd]  = sectorBounds(r.endIdx);
      let start = clampDeg(sStart + offset);
      let end = clampDeg(eEnd + offset);
      let span = clampDeg(end - start);
      if(span === 0) span = 360;
      if(Math.abs(span - r.spanDeg) > 0.01) span = r.spanDeg;
      arcs.push({ id: uid(), siteId: site.id, site: site.name, color: site.color, startDeg: start, spanDeg: span });
    });
    return arcs;
  }


  // Overlap calculation helpers
  function intervals(arc){
    const s = clampDeg(arc.startDeg);
    const e = clampDeg(arc.startDeg + arc.spanDeg);
    if(e > s) return [[s,e]]; // simple
    return [[s,360],[0,e]];   // wrapped across 0
  }
  function overlaps(a,b){
    const ia = intervals(a), ib = intervals(b);
    for(const [as,ae] of ia){
      for(const [bs,be] of ib){
        const s = Math.max(as, bs);
        const e = Math.min(ae, be);
        if(e - s >= 0) return true; // treat touching at boundary as overlap for stacking purposes
      }
    }
    return false;
  }

  // Strict overlap helper used for expansion logic (touching edges are NOT overlap)
  function overlapsOpen(a,b){
    const ia = intervals(a), ib = intervals(b);
    for(const [as,ae] of ia){
      for(const [bs,be] of ib){
        const s = Math.max(as, bs);
        const e = Math.min(ae, be);
        if(e - s > 1e-4) return true; // strictly positive intersection only
      }
    }
    return false;
  }

  // Assign arcs to rings (order controlled by ringOrder and longNamesOut)
  function assignRings(allArcs){
    const score = (arc)=>{
      // Visual length approximation: count ALL characters including spaces
      const s = arc.site ? String(arc.site) : '';
      const visualLen = s.trim().length; // includes internal spaces as characters
      const labelBonus = longNamesOut ? Math.min(240, visualLen * 2.0) : 0; // strong, capped
      // Base: ascending by span (short inner). For 'long' inner, invert base term only.
      const base = (ringOrder === 'long' ? -1 : 1) * arc.spanDeg;
      return base + labelBonus;
    };
    // Apply manual targets first (smaller desired ring = earlier)
    const manualSort = (arc)=>{
      const t = manualRingTargets && manualRingTargets[arc.siteId];
      return (t===undefined || t===null) ? Number.POSITIVE_INFINITY : Number(t);
    };
    const arcs = [...allArcs].sort((a,b)=>{
      const ma = manualSort(a), mb = manualSort(b);
      if(ma!==mb) return ma - mb;
      return score(a) - score(b);
    });
    const rings = [];
    for(const arc of arcs){
      let placed = false;
      const desired = manualRingTargets && manualRingTargets[arc.siteId];
      if(desired!==undefined && desired!==null){
        const total = Math.max(rings.length, Number(desired)+1);
        let span = 0;
        outer: for(;;){
          const candidates = [];
          if(span===0){ candidates.push(Number(desired)); }
          else { candidates.push(Number(desired)+span, Number(desired)-span); }
          for(const r of candidates){
            if(r<0) continue;
            let clash = false;
            if(r < rings.length){ clash = rings[r].some(x=>overlapsOpen(x, arc)); }
            if(!clash){
              while(rings.length <= r) rings.push([]);
              rings[r].push(arc); arc.ring = r; placed = true; break outer;
            }
          }
          span++;
          if(span>total+2) break;
        }
      }
      if(!placed){
        for(let r=0;r<rings.length;r++){
          const clash = rings[r].some(x=>overlapsOpen(x, arc));
          if(!clash){ rings[r].push(arc); arc.ring=r; placed=true; break; }
        }
      }
      if(!placed){ rings.push([arc]); arc.ring = rings.length-1; }
      // Track last assigned ring per site
      const prev = lastAssignedRings[arc.siteId];
      lastAssignedRings[arc.siteId] = (prev===undefined)? arc.ring : Math.min(prev, arc.ring);
    }
    return arcs; // mutated with .ring
  }

  // ------------------------------
  // SVG drawing
  // ------------------------------
  const cx=430, cy=430; // centre
  const guideRadius = 330; // outer radius for drawings (ticks/title)
  const CORE_MARGIN = 70;  // inner dead zone to push segments outward

  // Dynamic band layout: one ring fills, stacked rings share space
  function computeRadialLayout(totalRings){
    const innerMin = CORE_MARGIN;     // hub / inner dead zone
    const outerMax = guideRadius - 8; // margin inside outer guide
    const gap = totalRings > 1 ? 6 : 0;
    const width = (outerMax - innerMin - gap * Math.max(0, totalRings-1)) / totalRings;
    return { inner: innerMin, outer: outerMax, gap, width };
  }

  function polarToXY(r, deg){
    const t = toRad(deg);
    return [ cx + r * Math.cos(t), cy + r * Math.sin(t) ];
  }

  // Build a donut segment path between radii r0..r1 for angles a0..a1 (degrees)
  function ringArcPath(CX, CY, r0, r1, a0, a1){
    a0 = clampDeg(a0); a1 = clampDeg(a1);
    if(a1 === a0) a1 = a0 + 0.01; // avoid zero-length
    const large = ((a1 - a0 + 360) % 360) > 180 ? 1 : 0;
    const [x0,y0] = (function(){ const t = (a0-90) * Math.PI/180; return [CX + r1 * Math.cos(t), CY + r1 * Math.sin(t)]; })();
    const [x1,y1] = (function(){ const t = (a1-90) * Math.PI/180; return [CX + r1 * Math.cos(t), CY + r1 * Math.sin(t)]; })();
    const [X0,Y0] = (function(){ const t = (a0-90) * Math.PI/180; return [CX + r0 * Math.cos(t), CY + r0 * Math.sin(t)]; })();
    const [X1,Y1] = (function(){ const t = (a1-90) * Math.PI/180; return [CX + r0 * Math.cos(t), CY + r0 * Math.sin(t)]; })();
    return `M ${x0} ${y0} A ${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L ${X1} ${Y1} A ${r0} ${r0} 0 ${large} 0 ${X0} ${Y0} Z`;
  }

  // Date helper to avoid DST issues when advancing days
  function dayKeyForOffset(offset){
    const base = new Date();
    base.setHours(12,0,0,0); // midday avoids DST midnight jumps
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    return d.toISOString().slice(0,10); // YYYY-MM-DD in UTC
  }

  function hourOf(timeStr){
    if(!timeStr || typeof timeStr !== 'string') return NaN;
    const hh = Number(timeStr.slice(11,13));
    return Number.isFinite(hh) ? hh : NaN;
  }

  // Compute a wind snapshot for the current selection (day + optional hour)
  function windForSelection(site){
    if(!site?.weather) return null;
    // Start with NOW
    let snap = site.weather.now;
    const byDay = site.weather.byDay || {};
    const key = dayKeyForOffset(selectedDayOffset);
    const arr = byDay[key];
    if(selectedHour!==null){
      if(Array.isArray(arr)){
        const match = arr.find(it=> hourOf(it.ts||it.time)===selectedHour );
        if(match) snap = { dirDeg: Number(match.dirDeg||0), speedKph: Number(match.speedKph||0) };
        else if(selectedDayOffset>0) return null; // no data for that hour on that day
      } else if(selectedDayOffset>0) return null;
    } else if(selectedDayOffset>0 && Array.isArray(arr) && arr.length){
      let sx=0, sy=0, sp=0; arr.forEach(v=>{ const r=(v.dirDeg-90)*Math.PI/180; const w=Math.max(0.1, v.speedKph||0); sx+=Math.cos(r)*w; sy+=Math.sin(r)*w; sp+=v.speedKph||0; });
      const ang = Math.atan2(sy, sx)*180/Math.PI + 90; snap = { dirDeg: clampDeg(ang), speedKph: sp/arr.length };
    }
    return snap;
  }

  function isInWindBySectors(site, dirDeg){
    // New simple logic: compare wind direction against the ranges shown in console/panel
    const windSectorIdx = Math.round(clampDeg(dirDeg)/SECTOR_DEG) % DIRS.length;
    const windDirection = DIRS[windSectorIdx];
    
    // Get the ranges as displayed in the console/panel
    const goodRanges = getDisplayRanges(site.good || site.sectors || [], site);
    const okRanges = getDisplayRanges(site.ok || [], site);
    const allRanges = [...goodRanges, ...okRanges];
    
    // Check if wind direction is within any range or matches any start/end direction
    for(const range of allRanges){
      if(isDirectionInRange(windDirection, range)){
        return true;
      }
    }
    
    return false;
  }
  
  // Helper function to get ranges in the same format as displayed in console/panel
  function getDisplayRanges(indices, site){
    const ranges = contiguousRanges(indices || []);
    return ranges.map(r=>{
      // Match the arc drawing logic precisely: from start of first sector to end of last sector
      const [sStart] = sectorBounds(r.startIdx);
      const [, eEnd] = sectorBounds(r.endIdx);
      const startAng = clampDeg(sStart + (site.angleOffsetDeg || 0));
      const endAng = clampDeg(eEnd + (site.angleOffsetDeg || 0));
      const si = Math.round(startAng / SECTOR_DEG) % DIRS.length;
      const ei = Math.round(endAng / SECTOR_DEG) % DIRS.length;
      return { start: DIRS[si], end: DIRS[ei] };
    });
  }
  
  // Helper function to check if a direction is within a range or matches start/end
  function isDirectionInRange(direction, range){
    const startIdx = DIRS.indexOf(range.start);
    const endIdx = DIRS.indexOf(range.end);
    const dirIdx = DIRS.indexOf(direction);
    
    if(startIdx === -1 || endIdx === -1 || dirIdx === -1) return false;
    
    // Check if direction matches start or end exactly
    if(dirIdx === startIdx || dirIdx === endIdx) return true;
    
    // Check if direction is within the range (handling wrap-around)
    if(startIdx <= endIdx){
      // Simple range (no wrap)
      return dirIdx >= startIdx && dirIdx <= endIdx;
    } else {
      // Wrapped range (e.g., NNW to N)
      return dirIdx >= startIdx || dirIdx <= endIdx;
    }
  }

  // Debug helper: print exactly how a wind decision was made for a site
  function debugWindDecision(site, dirDeg){
    // Use the same new logic as isInWindBySectors
    const windSectorIdx = Math.round(clampDeg(dirDeg)/SECTOR_DEG) % DIRS.length;
    const windDirection = DIRS[windSectorIdx];
    
    // Get the ranges as displayed in the console/panel
    const goodRanges = getDisplayRanges(site.good || site.sectors || [], site);
    const okRanges = getDisplayRanges(site.ok || [], site);
    const allRanges = [...goodRanges, ...okRanges];
    
    // Check if wind direction is within any range or matches any start/end direction
    let inside = false;
    let matchingRange = null;
    for(const range of allRanges){
      if(isDirectionInRange(windDirection, range)){
        inside = true;
        matchingRange = range;
        break;
      }
    }

    try{
      console.groupCollapsed(`%c[WindOnly] ${site.name}%c dir=${dirDeg.toFixed(1)}° → ${windDirection} → ${inside?'SHOW':'HIDE'}`, 'color:#60a5fa', 'color:inherit');
      console.debug('  current:', { deg: dirDeg, sectorIdx: windSectorIdx, direction: windDirection });
      console.debug('  GOOD ranges:', goodRanges.map(r => `${r.start} – ${r.end}`));
      console.debug('  OK ranges:', okRanges.map(r => `${r.start} – ${r.end}`));
      if(matchingRange) console.debug('  matching range:', `${matchingRange.start} – ${matchingRange.end}`);
      console.groupEnd();
    }catch(_){}
    return { inside, idx: windSectorIdx, label: windDirection };
  }

  // One-time sector summary per site for debugging
  const debugLoggedSites = new Set();
  function debugSiteSectors(site){
    try{
      const toRangeText = (indices)=>{
        const ranges = contiguousRanges(indices || []);
        return ranges.map(r=>{
          // Match the arc drawing logic precisely: from start of first sector to end of last sector
          const [sStart] = sectorBounds(r.startIdx);
          const [, eEnd] = sectorBounds(r.endIdx);
          const startAng = clampDeg(sStart + (site.angleOffsetDeg || 0));
          const endAng = clampDeg(eEnd + (site.angleOffsetDeg || 0));
          const si = Math.round(startAng / SECTOR_DEG) % DIRS.length;
          const ei = Math.round(endAng / SECTOR_DEG) % DIRS.length;
          return `${DIRS[si]} – ${DIRS[ei]}`; // en dash
        });
      };
      const goodText = toRangeText(site.good || site.sectors || []);
      const okText   = toRangeText(site.ok || []);
      const msg = `GOOD: ${goodText.length?goodText.join(' · '):'—'}${okText.length?` · OK: ${okText.join(' · ')}`:''}`;
      console.log(`[Suitability] ${site.name} — ${msg}`);
    }catch(_){/* noop */}
  }

  // Inclusive arc check with a small tolerance to treat boundary touches as inside
  let BOUNDARY_EPS_DEG = 1; // default tolerance tightened per request
  function angleInArcWithTolerance(dirDeg, arc, epsDeg = BOUNDARY_EPS_DEG){
    const A = clampDeg(dirDeg);
    const eps = Math.max(0, epsDeg);
    const ints = intervals(arc);
    for(const [s,e] of ints){
      // Treat boundary touches as inside (inclusive). Expand by eps each side.
      if(e > s){
        if(A >= s - eps && A <= e + eps) return true;
        // also consider exact equality with floating imprecision
        if(Math.abs(A - s) <= 1e-6 || Math.abs(A - e) <= 1e-6) return true;
      }else{ // wrapped interval
        const inFirst = (A >= s - eps) || Math.abs(A - s) <= 1e-6;
        const inSecond = (A <= e + eps) || Math.abs(A - e) <= 1e-6;
        if(inFirst || inSecond) return true;
      }
    }
    return false;
  }

  function annularSectorPath(r0, r1, a0, span){
    const a1 = clampDeg(a0 + span);
    const large = span > 180 ? 1 : 0;
    const [x0,y0] = polarToXY(r0, a0);
    const [x1,y1] = polarToXY(r0, a1);
    const [X0,Y0] = polarToXY(r1, a1);
    const [X1,Y1] = polarToXY(r1, a0);
    return [
      `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
      `A ${r0} ${r0} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `L ${X0.toFixed(2)} ${Y0.toFixed(2)}`,
      `A ${r1} ${r1} 0 ${large} 0 ${X1.toFixed(2)} ${Y1.toFixed(2)}`,
      'Z'
    ].join(' ');
  }

  function arcTextPathD(r, a0, span){
    return arcTextPathD2(r, a0, span, false);
  }

  function arcTextPathD2(r, a0, span, reverse){
    const a1 = a0 + Math.max(0, span);
    const large = (span % 360) > 180 ? 1 : 0;
    const [sx, sy] = polarToXY(r, clampDeg(a0));
    const [ex, ey] = polarToXY(r, clampDeg(a1));
    if(!reverse){
      return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
    }
    // reversed direction to keep text upright on lower arcs
    return `M ${ex.toFixed(2)} ${ey.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${sx.toFixed(2)} ${sy.toFixed(2)}`;
  }

  // Label radius helper (push labels outward for readability)
  function labelRadius(r0, r1){ return r0 + (r1 - r0) * LABEL_RADIUS_FACTOR; }

  function clearSVG(){ while(svg.firstChild) svg.removeChild(svg.firstChild); }

  function drawGuides(){
    // Outer circle
    const outer = document.createElementNS('http://www.w3.org/2000/svg','circle');
    outer.setAttribute('cx', cx); outer.setAttribute('cy', cy); outer.setAttribute('r', guideRadius);
    outer.setAttribute('fill','none'); outer.setAttribute('stroke','#334155'); outer.setAttribute('stroke-width','1.2');
    svg.appendChild(outer);

    // Reference rings
    const innerMin = CORE_MARGIN, outerMax = guideRadius - 8;
    for(let i=1;i<=3;i++){
      const r = innerMin + (outerMax - innerMin) * (i/4);
      const g = document.createElementNS('http://www.w3.org/2000/svg','circle');
      g.setAttribute('cx', cx); g.setAttribute('cy', cy); g.setAttribute('r', r);
      g.setAttribute('fill','none'); g.setAttribute('stroke','#243041'); g.setAttribute('stroke-dasharray','4 6');
      svg.appendChild(g);
    }

    // Central hub fill to visualise margin
    const hub = document.createElementNS('http://www.w3.org/2000/svg','circle');
    hub.setAttribute('cx', cx); hub.setAttribute('cy', cy); hub.setAttribute('r', CORE_MARGIN - 2);
    hub.setAttribute('fill', '#0b1222'); hub.setAttribute('stroke','none');
    svg.appendChild(hub);

    // Spokes and labels
    DIRS.forEach((d, i)=>{
      const ang = i * SECTOR_DEG;
      const [x0,y0] = polarToXY(10, ang);
      const [x1,y1] = polarToXY(guideRadius, ang);
      const spoke = document.createElementNS('http://www.w3.org/2000/svg','line');
      spoke.setAttribute('x1', x0); spoke.setAttribute('y1', y0); spoke.setAttribute('x2', x1); spoke.setAttribute('y2', y1);
      spoke.setAttribute('stroke', i%2===0 ? '#3b475d' : '#253144');
      spoke.setAttribute('stroke-width', i%2===0 ? 1.6 : 1);
      svg.appendChild(spoke);

      const [lx, ly] = polarToXY(guideRadius + 35, ang);
      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      label.textContent = d;
      label.setAttribute('x', lx); label.setAttribute('y', ly);
      label.setAttribute('fill', '#cbd5e1');
      label.setAttribute('font-size', '12');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline','central');
      // Make cardinal directions bold and larger
      if(['N','S','E','W'].includes(d)){
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('font-size', '16');
      }
      // Tooltip behaviour for direction labels
      label.addEventListener('mouseenter', ()=> showTip(d));
      label.addEventListener('mouseleave', hideTip);
      label.addEventListener('mousemove', moveTip);
      svg.appendChild(label);

      if(showDegrees && showDegrees.checked){
        const tickDeg = (ang+360)%360;
        const [tx, ty] = polarToXY(guideRadius + 15, ang);
        const t = document.createElementNS('http://www.w3.org/2000/svg','text');
        t.textContent = String(tickDeg).padStart(3,'0');
        t.setAttribute('x', tx); t.setAttribute('y', ty);
        t.setAttribute('fill', '#6b7280'); t.setAttribute('font-size','10');
        t.setAttribute('text-anchor','middle'); t.setAttribute('dominant-baseline','central');
        svg.appendChild(t);
      }
    });

    // Add title at bottom if provided
    if(windRoseTitleText.trim()){
      const title = document.createElementNS('http://www.w3.org/2000/svg','text');
      title.textContent = windRoseTitleText.trim().toUpperCase();
      const isMobile = (typeof window!=='undefined' && window.matchMedia) ? window.matchMedia('(max-width: 768px)').matches : false;
      const bottomMargin = (isMobile ? (24 + titleOffsetMobilePx) : (24 + titleOffsetDesktopPx));
      title.setAttribute('x', cx); title.setAttribute('y', String(cy * 2 - bottomMargin));
      title.setAttribute('fill', '#e2e8f0'); title.setAttribute('font-size','24');
      title.setAttribute('font-weight','800'); title.setAttribute('text-anchor','middle');
      // Tooltip on title
      title.addEventListener('mouseenter', ()=> showTip(windRoseTitleText.trim()));
      title.addEventListener('mouseleave', hideTip);
      title.addEventListener('mousemove', moveTip);
      svg.appendChild(title);
    }

  }

  // ------------------------------
  // Empty state renderer
  // ------------------------------
  function drawEmptyState(){
    const cx = 430, cy = 430; // matches viewBox centre (860/2)
    const baseRadius = 260;
    const colours = ['#4285F4','#EA4335','#FBBC05','#34A853','#A78BFA','#06B6D4'];

    // Container group for animation
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','empty-state');
    svg.appendChild(g);

    // Clip for the central text (peek from behind a wall)
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    const clip = document.createElementNS('http://www.w3.org/2000/svg','clipPath');
    const clipId = 'emptyTextClip';
    clip.setAttribute('id', clipId);
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    const clipW = 560, clipH = 34;
    rect.setAttribute('x', String(cx - clipW/2));
    rect.setAttribute('y', String(cy - clipH/2));
    rect.setAttribute('width', String(clipW));
    rect.setAttribute('height', String(clipH));
    clip.appendChild(rect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    // Coloured arcs around the circle
    const segCount = 12;
    for(let i=0;i<segCount;i++){
      const startAng = (360/segCount)*i;
      const endAng = startAng + (360/segCount) - 6; // small gap
      const path = ringArcPath(cx, cy, baseRadius-40, baseRadius, startAng, endAng);
      const p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', path);
      const col = colours[i % colours.length];
      p.setAttribute('fill', col + '33');
      p.setAttribute('stroke', col);
      p.setAttribute('stroke-width', '2');
      p.setAttribute('class','empty-arc');
      p.style.setProperty('--d', (i*0.09)+'s');
      g.appendChild(p);
    }

    // Centre text guidance (peek up from mask)
    const msg = document.createElementNS('http://www.w3.org/2000/svg','text');
    msg.setAttribute('x', cx); msg.setAttribute('y', cy);
    msg.setAttribute('class', 'empty-text');
    msg.setAttribute('font-size', '20');
    msg.setAttribute('font-weight', '800');
    msg.setAttribute('text-anchor', 'middle');
    msg.setAttribute('dominant-baseline', 'central');
    msg.setAttribute('clip-path', `url(#${clipId})`);
    msg.textContent = 'Add launch sites to build your perfect window';
    msg.style.setProperty('--td', (segCount*0.09)+'s');
    g.appendChild(msg);
  }
  function draw(){
    clearSVG();
    drawGuides();

    // Empty state
    if(!sites.length){
      drawEmptyState();
      renderLists();
      return;
    }

    // defs container for text paths
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    svg.appendChild(defs);

    // Build arcs from sites: compute UNION (for outer silhouette), GOOD, and OK-only per site
    let unionArcs = [], goodArcs = [], okOnlyArcs = [];
    for(const s of sites){
      if(!debugLoggedSites.has(s.id)){ debugSiteSectors(s); debugLoggedSites.add(s.id); }
      const goodSet = new Set(Array.isArray(s.good) ? s.good : (Array.isArray(s.sectors)? s.sectors : []));
      const okSet   = new Set(Array.isArray(s.ok) ? s.ok : []);
      const unionSet = new Set([...goodSet, ...okSet]);
      const okOnlySet = new Set([...okSet].filter(x => !goodSet.has(x)));

      const unionRanges = contiguousRanges([...unionSet]);
      const goodRanges  = contiguousRanges([...goodSet]);
      const okOnlyRanges= contiguousRanges([...okOnlySet]);

      unionArcs.push(...rangesToArcs({...s}, unionRanges).map(a=>({...a, layer:'union'})));
      goodArcs.push (...rangesToArcs({...s}, goodRanges ).map(a=>({...a, layer:'good'})));
      okOnlyArcs.push(...rangesToArcs({...s}, okOnlyRanges).map(a=>({...a, layer:'okonly'})));
    }

    if(!unionArcs.length){ renderLists(); return; }

    // Assign rings based on UNION silhouettes (shorter spans nearer centre)
    assignRings(unionArcs);

    // Sort union arcs for consistent drawing order
    unionArcs.sort((a,b)=> a.ring - b.ring || a.startDeg - b.startDeg);

    // Map site+overlap to ring for sub-layers
    function ringFor(arc){
      const host = unionArcs.find(u=> u.siteId===arc.siteId && overlaps(u, arc));
      return host ? host.ring : 0;
    }
    goodArcs.forEach(a=> a.ring = ringFor(a));
    okOnlyArcs.forEach(a=> a.ring = ringFor(a));

    // Dynamic band layout from union rings
    const totalRings = 1 + Math.max(...unionArcs.map(a=>a.ring));
    const layout = computeRadialLayout(totalRings);

    // Small visual angular padding so neighbouring segments don't touch (rendering only)
    const ARC_VISUAL_PAD_DEG = 0.8;

    // Helpers for reorder preview
    let previewPath = null; const removePreview = ()=>{ if(previewPath){ try{ svg.removeChild(previewPath); }catch(_){/* noop */} previewPath=null; } };
    function ringIsFree(testRing, arcSelf){
      return !unionArcs.some(v=> v!==arcSelf && v.ring===testRing && overlapsOpen(v, arcSelf));
    }
    function findFreeRing(desired, arcSelf){
      const totalRings = 1 + Math.max(...unionArcs.map(a=>a.ring));
      const clampRing = r=> Math.max(0, Math.min(totalRings, r)); // allow creating a new outer ring
      let span = 0;
      for(;;){
        const tries = [];
        if(span===0){ tries.push(clampRing(desired)); }
        else { tries.push(clampRing(desired+span), clampRing(desired-span)); }
        for(const r of tries){ if(ringIsFree(r, arcSelf)) return r; }
        span++;
        if(span>totalRings+2) break;
      }
      return null;
    }

    // Draw per UNION arc as ONE segment. Base = UNION (OK shade if any OK-only), overlay = GOOD (same height)
    for(const u of unionArcs){
      // If we hide outside-wind sites for selected day, skip unions that are out
      if(liveWindOn && hideSitesOutside){
        const s = sites.find(x=> x.name===u.site); if(!s) { continue; }
        const snap = windForSelection(s);
        if(!snap){ continue; }
        const dbg = debugWindDecision(s, snap.dirDeg);
        if(!dbg.inside) continue;
      }
      const r0 = layout.inner + u.ring * (layout.width + layout.gap);
      let r1 = r0 + layout.width;
      if(expandIsolatedSegments){
        const anyAbove = unionArcs.some(v=> v.ring > u.ring && overlapsOpen(v, u));
        if(!anyAbove){ r1 = layout.outer; }
      }

      // Determine if there is any OK-only portion for this union arc
      const hasOkOnly = okOnlyArcs.some(k=> k.siteId===u.siteId && overlaps(k,u));

      // 1) Base union silhouette (single continuous segment)
      const aStart = clampDeg(u.startDeg + ARC_VISUAL_PAD_DEG);
      const aSpan  = Math.max(0, u.spanDeg - ARC_VISUAL_PAD_DEG*2);
      const base = document.createElementNS('http://www.w3.org/2000/svg','path');
      base.setAttribute('d', annularSectorPath(r0, r1, aStart, aSpan));
      base.setAttribute('fill', hasOkOnly ? darkerOf(u.color) : u.color);
      base.setAttribute('fill-opacity','.28');
      base.setAttribute('stroke', hasOkOnly ? darkerOf(u.color) : u.color);
      base.setAttribute('stroke-width','2');
      base.setAttribute('stroke-linejoin','round');
      base.setAttribute('pointer-events', reorderMode ? 'auto' : 'none');
      if(reorderMode){
        base.style.cursor = 'ns-resize';
        let startY = 0; let previewRing = null;
        const onMove = (e2)=>{
          const dy = e2.clientY - startY;
          const step = Math.round(dy / 28);
          const desired = u.ring + step;
          const free = findFreeRing(desired, u);
          previewRing = free;
          if(free===null){ removePreview(); return; }
          const r0p = layout.inner + free * (layout.width + layout.gap);
          const r1p = r0p + layout.width;
          if(!previewPath){
            previewPath = document.createElementNS('http://www.w3.org/2000/svg','path');
            previewPath.setAttribute('fill','none');
            previewPath.setAttribute('stroke','#60a5fa');
            previewPath.setAttribute('stroke-width','3');
            previewPath.setAttribute('stroke-dasharray','6 6');
            svg.appendChild(previewPath);
          }
          previewPath.setAttribute('d', annularSectorPath(r0p, r1p, u.startDeg, u.spanDeg));
        };
        const onUp = (e2)=>{
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          try{ document.body.style.userSelect = ''; }catch(_){/* noop */}
          removePreview();
          if(previewRing!==null && previewRing!==u.ring){
            manualRingTargets[u.siteId] = previewRing;
            save(); draw();
          }
        };
        base.addEventListener('mousedown', (ev)=>{
          ev.preventDefault();
          try{ document.body.style.userSelect = 'none'; }catch(_){/* noop */}
          startY = ev.clientY;
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      }
      const doAnim = animateSiteIds.has(u.siteId);
      svg.appendChild(base);
      if(doAnim){
        try{ const L = base.getTotalLength(); base.style.strokeDasharray = L; base.style.strokeDashoffset = L; }catch(_){/* noop */}
        base.classList.add('seg-draw-in');
      }

      // 2) GOOD overlays (same height as base)
      const goods = goodArcs.filter(g=> g.siteId===u.siteId && overlaps(g,u));
      for(const g of goods){
        const pg = document.createElementNS('http://www.w3.org/2000/svg','path');
        const gs = clampDeg(g.startDeg + ARC_VISUAL_PAD_DEG);
        const gl = Math.max(0, g.spanDeg - ARC_VISUAL_PAD_DEG*2);
        pg.setAttribute('d', annularSectorPath(r0, r1, gs, gl));
        pg.setAttribute('fill', g.color);
        pg.setAttribute('fill-opacity','.35');
        pg.setAttribute('stroke', g.color);
        pg.setAttribute('stroke-width','2');
        pg.setAttribute('stroke-linejoin','round');
        if(reorderMode){
          pg.style.pointerEvents = 'none';
        } else {
          pg.addEventListener('mouseenter', ()=>{
            let label = `${g.site} · GOOD`;
            try{
              const siteObj = sites.find(s=> s.name===g.site);
              const w = siteObj ? windForSelection(siteObj) : null;
              if(w){ const idx = Math.round(clampDeg(w.dirDeg)/SECTOR_DEG) % DIRS.length; label += ` · ${formatSpeed(w.speedKph)} · ${DIRS[idx]} (${Math.round(w.dirDeg)}°)`; }
            }catch(_){/* noop */}
            showTip(label);
          });
          pg.addEventListener('mouseleave', hideTip);
          pg.addEventListener('mousemove', moveTip);
        }
        if(animateSiteIds.has(g.siteId)){ pg.classList.add('seg-fade-in'); }
        svg.appendChild(pg);
      }

      // 2b) OK-only overlays (invisible hit area for tooltip)
      const oks = okOnlyArcs.filter(k=> k.siteId===u.siteId && overlaps(k,u));
      for(const k of oks){
        const pk = document.createElementNS('http://www.w3.org/2000/svg','path');
        const ks = clampDeg(k.startDeg + ARC_VISUAL_PAD_DEG);
        const kl = Math.max(0, k.spanDeg - ARC_VISUAL_PAD_DEG*2);
        pk.setAttribute('d', annularSectorPath(r0, r1, ks, kl));
        pk.setAttribute('fill', '#000');
        pk.setAttribute('fill-opacity','0.001'); // invisible but hit-testable
        pk.setAttribute('stroke','none');
        if(reorderMode){
          pk.style.pointerEvents = 'none';
        } else {
          pk.addEventListener('mouseenter', ()=>{
            let label = `${k.site} · OK`;
            try{
              const siteObj = sites.find(s=> s.name===k.site);
              const w = siteObj ? windForSelection(siteObj) : null;
              if(w){ const idx = Math.round(clampDeg(w.dirDeg)/SECTOR_DEG) % DIRS.length; label += ` · ${formatSpeed(w.speedKph)} · ${DIRS[idx]} (${Math.round(w.dirDeg)}°)`; }
            }catch(_){/* noop */}
            showTip(label);
          });
          pk.addEventListener('mouseleave', hideTip);
          pk.addEventListener('mousemove', moveTip);
        }
        if(animateSiteIds.has(k.siteId)){ pk.classList.add('seg-fade-in'); }
        svg.appendChild(pk);
      }

      // 3) One curved label per union arc
      let rText = labelRadius(r0, r1);
      if(autoCenterLabels){ rText = r0 + (r1 - r0) * 0.5; }
      const pad = 0;
      const spanForText = Math.max(u.spanDeg - ARC_VISUAL_PAD_DEG*2, 0);
      if (spanForText > 4) {
        const textPathId = `tpath-${u.id}`;
        const text = document.createElementNS('http://www.w3.org/2000/svg','text');
        text.setAttribute('fill','#ffffff');
        text.setAttribute('font-weight','700');
        // We will compute the final radius after we know the font size
        let rForText = rText;
        const arcLen = (Math.PI/180) * spanForText * rForText;
        const est = arcLen / Math.max(u.site.length * 0.62, 4);
        // Constrain by band height to always fit inside the segment even when narrow
        const bandHeight = (function(){
          const r0b = layout.inner + u.ring * (layout.width + layout.gap);
          let r1b = r0b + layout.width;
          if(expandIsolatedSegments){ const anyAbove = unionArcs.some(v=> v.ring>u.ring && overlapsOpen(v,u)); if(!anyAbove){ r1b = layout.outer; } }
          return r1b - r0b;
        })();
        const maxByHeight = Math.max(8, (bandHeight - 4) * 0.78); // padding from edges
        const size = Math.max(8, Math.min(est, maxByHeight, LABEL_MAX_PX));
        text.setAttribute('font-size', size.toFixed(1));
        if(autoCenterLabels){
          // Shift baseline inward by a fraction of text size to center visually
          // (accounts for larger ascent than descent)
          const baselineFudge = size * 0.30;
          rForText = r0 + (r1 - r0) * 0.5 - baselineFudge;
        }
        // Build the path now with the adjusted radius
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('id', textPathId);
        path.setAttribute('d', arcTextPathD(rForText, aStart, spanForText));
        path.setAttribute('fill','none');
        svg.querySelector('defs').appendChild(path);
        text.style.pointerEvents = reorderMode ? 'none' : 'visiblePainted';
        text.addEventListener('mouseenter', ()=> showTip(u.site));
        text.addEventListener('mouseleave', hideTip);
        text.addEventListener('mousemove', moveTip);

        const tp = document.createElementNS('http://www.w3.org/2000/svg','textPath');
        tp.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href', `#${textPathId}`);
        tp.setAttribute('href', `#${textPathId}`);
        // Centering applied after append
        tp.setAttribute('startOffset','0');
        tp.setAttribute('text-anchor','start');
        tp.textContent = u.site;
        text.appendChild(tp);
        svg.appendChild(text);

        // After in-DOM, measure and center text precisely regardless of font size
        try{
          const pathNode = svg.querySelector(`#${textPathId}`);
          if(pathNode && pathNode.getTotalLength){
            const pathLen = pathNode.getTotalLength();
            const textLen = text.getComputedTextLength();
            const offset = Math.max(0, (pathLen - textLen) / 2);
            tp.setAttribute('startOffset', String(offset));
          }
        }catch(_){}
      }
    }

    // Live wind overlay: add an arrow inside EACH site segment (union arc)
    if(liveWindOn){
      const nameToSite = Object.fromEntries(sites.map(s=>[s.name, s]));

      function isAngleInArc(angle, arc){
        const A = clampDeg(angle);
        const ints = intervals(arc);
        for(const [s,e] of ints){ if(A>=s && A<=e) return true; }
        return false;
      }

      function drawArrow(x, y, angle, color, label){
        const len = 20;
        const rad = (angle-90) * Math.PI/180;
        const dx = Math.cos(rad), dy = Math.sin(rad);
        const sx = x - dx * (len*0.4); const sy = y - dy * (len*0.4);
        const ex = x + dx * (len*0.6); const ey = y + dy * (len*0.6);
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', sx); line.setAttribute('y1', sy); line.setAttribute('x2', ex); line.setAttribute('y2', ey);
        line.setAttribute('stroke', color); line.setAttribute('stroke-width','3.5'); line.setAttribute('stroke-linecap','round');
        line.addEventListener('mouseenter', ()=> { 
          showTip(label);
          try{
            const idx = Math.round(clampDeg(angle)/SECTOR_DEG) % DIRS.length;
            const dir = DIRS[idx];
            console.debug('[Arrow Hover]', { angle: angle, labelDir: dir, label });
          }catch(_){}
        });
        line.addEventListener('mouseleave', hideTip);
        line.addEventListener('mousemove', moveTip);
        svg.appendChild(line);
        // Arrow head
        const wing = 6; const a1 = (angle+155)*Math.PI/180; const a2 = (angle-155)*Math.PI/180;
        const hx = ex, hy = ey;
        const l1 = document.createElementNS('http://www.w3.org/2000/svg','line');
        l1.setAttribute('x1', hx); l1.setAttribute('y1', hy);
        l1.setAttribute('x2', hx + Math.cos(a1)*wing); l1.setAttribute('y2', hy + Math.sin(a1)*wing);
        l1.setAttribute('stroke', color); l1.setAttribute('stroke-width','3'); l1.setAttribute('stroke-linecap','round');
        l1.addEventListener('mouseenter', ()=>{ try{ const idx=Math.round(clampDeg(angle)/SECTOR_DEG)%DIRS.length; console.debug('[Arrow Hover]', { angle, labelDir: DIRS[idx], label }); }catch(_){} });
        const l2 = document.createElementNS('http://www.w3.org/2000/svg','line');
        l2.setAttribute('x1', hx); l2.setAttribute('y1', hy);
        l2.setAttribute('x2', hx + Math.cos(a2)*wing); l2.setAttribute('y2', hy + Math.sin(a2)*wing);
        l2.setAttribute('stroke', color); l2.setAttribute('stroke-width','3'); l2.setAttribute('stroke-linecap','round');
        l2.addEventListener('mouseenter', ()=>{ try{ const idx=Math.round(clampDeg(angle)/SECTOR_DEG)%DIRS.length; console.debug('[Arrow Hover]', { angle, labelDir: DIRS[idx], label }); }catch(_){} });
        svg.appendChild(l1); svg.appendChild(l2);
      }

      for(const u of unionArcs){
        const site = nameToSite[u.site]; if(!site) continue;
        const w = windForSelection(site); if(!w) continue;
        const ringR0 = layout.inner + u.ring * (layout.width + layout.gap);
        const rMid = ringR0 + layout.width * 0.62;
        const midAng = clampDeg(u.startDeg + u.spanDeg/2);
        const [cx1, cy1] = polarToXY(rMid, midAng);
        const sectorIdx = Math.round(clampDeg(w.dirDeg)/SECTOR_DEG) % DIRS.length;
        if(hideSitesOutside){
          const dbg = debugWindDecision(site, w.dirDeg);
          if(!dbg.inside) continue;
        }
        const color = site.color;
        const label = `${site.name} · ${selectedDayOffset>0?'Avg ':''}${formatSpeed(w.speedKph)} · ${DIRS[sectorIdx]}`;
        drawArrow(cx1, cy1, w.dirDeg, color, label);
      }

      // Aggregate: average wind across sites with data
      (function(){
        let use = sites.map(s=>s.weather?.now).filter(Boolean);
        const key = dayKeyForOffset(selectedDayOffset);
        if(selectedHour!==null){
          use = sites.map(s=>{
            const arr = s.weather?.byDay?.[key];
            if(Array.isArray(arr)){
              const m = arr.find(it=> hourOf(it.ts||it.time)===selectedHour );
              if(m) return { dirDeg:m.dirDeg, speedKph:m.speedKph };
            }
            return s.weather?.now || null;
          }).filter(Boolean);
        } else if(selectedDayOffset>0){
          use = sites.map(s=>{
            const arr = s.weather?.byDay?.[key];
            if(Array.isArray(arr) && arr.length){
              let sx=0, sy=0, sp=0; arr.forEach(v=>{ const r=(v.dirDeg-90)*Math.PI/180; const w=Math.max(0.1, v.speedKph||0); sx+=Math.cos(r)*w; sy+=Math.sin(r)*w; sp+=v.speedKph||0; });
              const ang = Math.atan2(sy, sx)*180/Math.PI + 90; return { dirDeg: clampDeg(ang), speedKph: sp/arr.length };
            }
            return s.weather?.now || null;
          }).filter(Boolean);
        }
        if(!use.length) return;
        let sx=0, sy=0, speedSum=0;
        for(const w of use){
          const rad = (w.dirDeg - 90) * Math.PI/180; // match toRad basis
          const weight = Math.max(0.1, Number(w.speedKph)||0);
          sx += Math.cos(rad) * weight;
          sy += Math.sin(rad) * weight;
          speedSum += Number(w.speedKph)||0;
        }
        if(sx===0 && sy===0) return;
        const avgRad = Math.atan2(sy, sx); // already in our basis
        const avgDeg = clampDeg(avgRad * 180/Math.PI + 90);
        const avgSpeed = speedSum / use.length;

        // Draw central average arrow
        const len = 46;
        const [cx0, cy0] = [cx, cy];
        const [ex, ey] = (function(){ const t=(avgDeg-90)*Math.PI/180; return [cx0 + Math.cos(t)*len, cy0 + Math.sin(t)*len]; })();
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', cx0); line.setAttribute('y1', cy0);
        line.setAttribute('x2', ex); line.setAttribute('y2', ey);
        line.setAttribute('stroke', '#ffffff'); line.setAttribute('stroke-width','4.5'); line.setAttribute('stroke-linecap','round');
        line.addEventListener('mouseenter', ()=> showTip(`Average · ${formatSpeed(avgSpeed)}`));
        line.addEventListener('mouseleave', hideTip);
        line.addEventListener('mousemove', moveTip);
        svg.appendChild(line);
        const wing=9; const a1=(avgDeg+155)*Math.PI/180; const a2=(avgDeg-155)*Math.PI/180;
        const l1=document.createElementNS('http://www.w3.org/2000/svg','line'); l1.setAttribute('x1', ex); l1.setAttribute('y1', ey); l1.setAttribute('x2', ex+Math.cos(a1)*wing); l1.setAttribute('y2', ey+Math.sin(a1)*wing); l1.setAttribute('stroke','#ffffff'); l1.setAttribute('stroke-width','4'); l1.setAttribute('stroke-linecap','round'); svg.appendChild(l1);
        const l2=document.createElementNS('http://www.w3.org/2000/svg','line'); l2.setAttribute('x1', ex); l2.setAttribute('y1', ey); l2.setAttribute('x2', ex+Math.cos(a2)*wing); l2.setAttribute('y2', ey+Math.sin(a2)*wing); l2.setAttribute('stroke','#ffffff'); l2.setAttribute('stroke-width','4'); l2.setAttribute('stroke-linecap','round'); svg.appendChild(l2);
        // Average speed label in the middle of the windrose
        try{
          const t = document.createElementNS('http://www.w3.org/2000/svg','text');
          t.setAttribute('x', cx);
          t.setAttribute('y', String(cy + 18));
          t.setAttribute('fill', '#cbd5e1');
          t.setAttribute('font-size', '16');
          t.setAttribute('font-weight', '800');
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('dominant-baseline', 'central');
          t.style.pointerEvents = 'none';
          t.textContent = `Avg ${formatSpeed(avgSpeed)}`;
          svg.appendChild(t);
        }catch(_){/* noop */}
      })();
    }

    renderLists();
    // Prevent re-animating on subsequent redraws (e.g., weather fetch completes)
    if(animateSiteIds.size){ setTimeout(()=>{ animateSiteIds.clear(); }, 1200); }
  }

  // ------------------------------
  // UI: list + legend
  // ------------------------------
  function formatSpeed(kph){
    if(!Number.isFinite(kph)) return '';
    if(units==='mph') return (kph/1.60934).toFixed(0) + ' mph';
    if(units==='knots') return (kph/1.852).toFixed(0) + ' kts';
    return kph.toFixed(0) + ' km/h';
  }

  function renderLists(){
    // Legend
    const legendPillsHost = document.getElementById('legendPills');
    if(legendPillsHost){ legendPillsHost.innerHTML=''; } else { legendEl.innerHTML=''; }
    const legendMobileEl = document.getElementById('legendMobile'); if(legendMobileEl) legendMobileEl.innerHTML='';
    sites.forEach(s=>{
      const pill = document.createElement('div');
      pill.className = 'pill';
      // choose speed for selected day
      let speed = s.weather?.now?.speedKph;
      if(selectedDayOffset>0 && s.weather?.byDay){
        const key = dayKeyForOffset(selectedDayOffset);
        const arr = s.weather.byDay[key];
        if(Array.isArray(arr) && arr.length){ speed = arr.reduce((a,b)=> a + (b.speedKph||0), 0) / arr.length; }
      }
      const txt = Number.isFinite(speed) ? `${s.name} · ${formatSpeed(speed)}` : s.name;
      pill.innerHTML = `<span class="swatch" style="background:${s.color}"></span><span>${txt}</span>`;
      (legendPillsHost || legendEl).appendChild(pill);
      if(legendMobileEl){
        const pill2 = document.createElement('div');
        pill2.className = 'pill';
        pill2.innerHTML = pill.innerHTML;
        legendMobileEl.appendChild(pill2);
      }
    });

    // Site list (alphabetical by name)
    siteList.innerHTML = '';
    const sortedSites = [...sites].sort((a,b)=> String(a.name||'').localeCompare(String(b.name||''), undefined, { sensitivity: 'base' }));
    sortedSites.forEach(s=>{
      const el = document.createElement('div');
      el.className = 'item';

      // Build human-friendly ranges that match the drawn arcs (respecting per-site angle offset)
      function labelsFor(indices){
        const ranges = contiguousRanges(indices||[]);
        if(!ranges.length) return '—';
        return ranges.map(r=>{
          // Match the arc drawing logic precisely: from start of first sector to end of last sector
          const [sStart] = sectorBounds(r.startIdx);
          const [, eEnd] = sectorBounds(r.endIdx);
          const startAng = clampDeg(sStart + (s.angleOffsetDeg || 0));
          const endAng = clampDeg(eEnd + (s.angleOffsetDeg || 0));
          const si = Math.round(startAng / SECTOR_DEG) % DIRS.length;
          const ei = Math.round(endAng / SECTOR_DEG) % DIRS.length;
          return `${DIRS[si]} – ${DIRS[ei]}`;
        }).join(' · ');
      }

      const goodLbl = labelsFor(s.good || s.sectors || []);
      const okLbl   = labelsFor(s.ok || []);

      el.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px">
          <span class="swatch" style="background:${s.color}"></span>
          <div>
            <div style="font-weight:700">${s.name}</div>
            <div class="subtle">GOOD: ${goodLbl}${(s.ok&&s.ok.length)?` · OK: ${okLbl}`:''}</div>
          </div>
        </div>
        <div class="row" style="justify-content:flex-end">
          <button class="secondary" data-id="${s.id}" data-act="delete">Delete</button>
        </div>
      `;
      siteList.appendChild(el);
    });
  }

  // ------------------------------
  // Catalog: load from data/sites.json and add via dropdown
  // ------------------------------
  let catalogData = [];
  let catalogEntries = []; // [{ idx, name }]
  let catalogFuse = null;
  let radiusCircle = null;
  let radiusCenter = null;
  let radiusKm = 10;
  // Manual overrides for selection state
  const manualSelected = new Set();
  const manualDeselected = new Set();
  // Polygon selection state
  let drawControl = null;
  let polygon = null;

  function nameFromRecord(s, idx){
    const n = s && (s.name || s.title || s.site);
    return String(n || `Site ${idx+1}`);
  }

  async function fetchSiteWeather(lat, lng){
    try{
      // Use fixed GMT and fetch both hourly and daily (for simple day selection)
      const base = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_80m,wind_speed_10m,winddirection_10m&daily=weather_code&timezone=GMT`;
      const url = weatherModel && weatherModel !== 'default' ? `${base}&models=${encodeURIComponent(weatherModel)}` : base;
      const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
      if(!res.ok) throw new Error('weather http');
      const j = await res.json();
      const times = j?.hourly?.time||[];
      const spd80 = j?.hourly?.wind_speed_80m||[];
      const spd10 = j?.hourly?.wind_speed_10m||[];
      const dir = j?.hourly?.winddirection_10m || j?.hourly?.wind_direction_10m || [];
      // pick closest hour to now
      const now = Date.now();
      let best = 0; let bestDiff = Infinity;
      for(let i=0;i<times.length;i++){
        const t = Date.parse(times[i]);
        const d = Math.abs(t - now);
        if(d < bestDiff){ bestDiff = d; best = i; }
      }
      // Simple per-day buckets (UTC/GMT days)
      const buckets = {};
      for(let i=0;i<times.length;i++){
        const t = times[i];
        const s = spd80[i]??spd10[i];
        const d = dir[i];
        if(t==null || s==null || d==null) continue; // skip missing data from shorter-range models
        const day = t.slice(0,10); // YYYY-MM-DD
        (buckets[day] ||= []).push({ ts: t, speedKph: Number(s||0), dirDeg: Number(d||0) });
      }
      return {
        now: (function(){
          const t = times[best]; const s = (spd80[best]??spd10[best]); const d = dir[best];
          if(t==null || s==null || d==null){
            // fallback to latest non-null record
            for(let i=times.length-1;i>=0;i--){ if(times[i]!=null && (spd80[i]??spd10[i])!=null && dir[i]!=null){ const ss=(spd80[i]??spd10[i]); return { ts: times[i], speedKph: Number(ss||0), dirDeg: Number(dir[i]||0) }; }
            }
            return { ts: null, speedKph: 0, dirDeg: 0 };
          }
          return { ts: t, speedKph: Number(s||0), dirDeg: Number(d||0) };
        })(),
        byDay: buckets
      };
    }catch(err){ console.warn('weather fetch failed', err); return null; }
  }

  // ------------------------------
  // Weather model helpers
  // ------------------------------
  function modelNameFor(val){
    if(val==='ukmo_seamless') return 'UK Met Seamless';
    if(val==='default' || !val) return 'Open‑Meteo';
    return String(val);
  }

  // Simple toast for visual feedback on model switches
  let modelToastEl = null; let modelToastTimer = null;
  function showModelToast(message){
    if(!modelToastEl){
      modelToastEl = document.createElement('div');
      modelToastEl.id = 'modelToast';
      modelToastEl.setAttribute('role','status');
      modelToastEl.style.position = 'fixed';
      modelToastEl.style.left = '50%';
      modelToastEl.style.top = '18px';
      modelToastEl.style.transform = 'translateX(-50%)';
      modelToastEl.style.zIndex = '9999';
      modelToastEl.style.background = '#0b1222cc';
      modelToastEl.style.border = '1px solid #1f2937';
      modelToastEl.style.color = '#e5e7eb';
      modelToastEl.style.padding = '8px 12px';
      modelToastEl.style.borderRadius = '10px';
      modelToastEl.style.font = '600 12px ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial';
      modelToastEl.style.boxShadow = '0 6px 24px rgba(0,0,0,.35)';
      modelToastEl.style.opacity = '0';
      modelToastEl.style.transition = 'opacity .15s ease-in-out';
      document.body.appendChild(modelToastEl);
    }
    modelToastEl.textContent = message;
    modelToastEl.style.opacity = '1';
    if(modelToastTimer) clearTimeout(modelToastTimer);
    modelToastTimer = setTimeout(()=>{ if(modelToastEl) modelToastEl.style.opacity = '0'; }, 1400);
  }

  async function applyModelChange(newModel){
    weatherModel = newModel && newModel !== '' ? newModel : 'default';
    // Sync hidden selects if present
    const ms = document.getElementById('modelSelect');
    if(ms){ ms.value = weatherModel; }
    const msm = document.getElementById('modelSelectMobile');
    if(msm){ msm.value = weatherModel; }
    save();
    renderWxInfo();
    showModelToast('Model: ' + modelNameFor(weatherModel));
    // Refetch all sites
    const tasks = [];
    for(const s of sites){
      const lat = Number(s?.lat); const lng = Number(s?.lng);
      if(Number.isFinite(lat) && Number.isFinite(lng)){
        tasks.push(fetchSiteWeather(lat, lng).then(w=>{ if(w){ s.weather = w; } }));
      }
    }
    if(tasks.length){ await Promise.allSettled(tasks); save(); draw(); }
  }

  // Convert degrees -> sector index (0..15)
  function degToIdx(deg){
    const d = clampDeg(Number(deg)||0);
    return Math.round(d / SECTOR_DEG) % DIRS.length;
  }

  // Convert a single token to index if possible
  function toIndex(val){
    if(typeof val === 'number' && Number.isFinite(val)){
      if(val >= 0 && val < DIRS.length) return Math.floor(val);
      return degToIdx(val); // treat as degrees if out of index range
    }
    if(typeof val === 'string'){
      const raw = val.trim();
      const u = raw.toUpperCase();
      // handle degree like "90" or "90°"
      const num = Number(u.replace(/°/g,''));
      if(!Number.isNaN(num)) return toIndex(num);
      const idx = DIRS.indexOf(u);
      if(idx !== -1) return idx;
    }
    return null;
  }

  function expandRange(a, b){
    const ia = toIndex(a);
    const ib = toIndex(b);
    if(ia===null || ib===null) return [];
    const out = [];
    let i = ia;
    for(;;){ out.push(i); if(i===ib) break; i = (i+1) % DIRS.length; }
    return out;
  }

  // Parse a direction spec (number/deg, code, range like E-SSW, or object {from,to})
  function parseDirectionSpec(spec){
    if(Array.isArray(spec)){
      return spec.flatMap(parseDirectionSpec);
    }
    if(typeof spec === 'object' && spec){
      const from = spec.from ?? spec.start ?? spec.startDeg;
      const to   = spec.to   ?? spec.end   ?? spec.endDeg;
      if(from!==undefined && to!==undefined) return expandRange(from, to);
      const single = spec.dir ?? spec.direction ?? spec.degree;
      if(single!==undefined){ const ix = toIndex(single); return ix===null?[]:[ix]; }
      return [];
    }
    if(typeof spec === 'string'){
      const s = spec.trim();
      if(s.includes('-')){ const [a,b] = s.split('-'); return expandRange(a, b); }
      const ix = toIndex(s);
      return ix===null?[]:[ix];
    }
    const ix = toIndex(spec);
    return ix===null?[]:[ix];
  }

  function mapIndices(arr){
    if(!Array.isArray(arr)) return [];
    const all = parseDirectionSpec(arr);
    // de-duplicate while preserving order
    const seen = new Set();
    const out = [];
    for(const i of all){ if(i!==null && !seen.has(i)){ seen.add(i); out.push(i); } }
    return out;
  }

  function firstArrayOf(o, keys){ for(const k of keys){ if(Array.isArray(o?.[k])) return o[k]; } return null; }

  function normaliseRecord(s, idx){
    const name = nameFromRecord(s, idx);
    // GOOD candidates (also accept generic 'sectors' as GOOD)
    let goodSrc = firstArrayOf(s, ['good','GOOD','Good','sectors','SECTORS','goodSectors','GOOD_SECTORS','good_dirs','goodDirs','GOOD_DIRS','goodIndices','good_indices']);
    if(!goodSrc && s && typeof s==='object' && s.directions){
      goodSrc = firstArrayOf(s.directions, ['good','GOOD','Good']);
    }
    // OK candidates
    let okSrc = firstArrayOf(s, ['ok','OK','Ok','okSectors','OK_SECTORS','ok_dirs','okDirs','OK_DIRS','okIndices','ok_indices']);
    if(!okSrc && s && typeof s==='object' && s.directions){
      okSrc = firstArrayOf(s.directions, ['ok','OK','Ok']);
    }

    // Tri-state array support: wind_dir with 0=OFF,1=OK,2=GOOD
    function fromWindDirArray(arr){
      if(!Array.isArray(arr)) return null;
      const good=[]; const ok=[];
      arr.forEach((v,i)=>{ const n = Number(v); if(Number.isFinite(n)){ if(n>=2) good.push(i); else if(n>=1) ok.push(i); }});
      return {good, ok};
    }

    let tri = null;
    const triCand = s?.wind_dir ?? s?.windDir ?? s?.windDirections ?? s?.wind_direction ?? s?.windDirection;
    if(Array.isArray(triCand)) tri = fromWindDirArray(triCand);
    if(!tri && s?.wind && Array.isArray(s.wind.wind_dir)) tri = fromWindDirArray(s.wind.wind_dir);

    const good = goodSrc ? mapIndices(goodSrc) : (tri ? tri.good : []);
    const ok   = okSrc   ? mapIndices(okSrc)   : (tri ? tri.ok   : []);

    const color = s?.color || colourFromString(name);
    const angleOffsetDeg = tri ? CATALOG_ANGLE_OFFSET : 0;
    const lat = Number(s?.lat ?? s?.latitude);
    const lng = Number(s?.lng ?? s?.lon ?? s?.longitude);
    return { id: uid(), name, good, ok, color, angleOffsetDeg, lat: Number.isFinite(lat)?lat:undefined, lng: Number.isFinite(lng)?lng:undefined };
  }

  function buildCatalogFuseIndex(){
    try{
      if(typeof Fuse === 'undefined'){ catalogFuse = null; return; }
      if(!Array.isArray(catalogEntries) || !catalogEntries.length){ catalogFuse = null; return; }
      const fuseOptions = { keys: ['name'], includeScore: true, threshold: 0.4, minMatchCharLength: 2, distance: 100 };
      catalogFuse = new Fuse(catalogEntries, fuseOptions);
    }catch(_){ catalogFuse = null; }
  }

  function fillCatalogSelect(){
    if(!catalogSelect) return;
    catalogSelect.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = catalogData.length ? 'Choose a site…' : 'No sites available';
    catalogSelect.appendChild(ph);
    const entries = catalogData.map((rec, i)=> ({ idx: i, name: nameFromRecord(rec, i) }));
    entries.sort((a,b)=> String(a.name||'').localeCompare(String(b.name||''), undefined, { sensitivity: 'base' }));
    catalogEntries = entries;
    buildCatalogFuseIndex();
    entries.forEach(({idx, name})=>{
      const opt = document.createElement('option');
      opt.value = String(idx); // preserve original index for selection handler
      opt.textContent = name;
      catalogSelect.appendChild(opt);
    });
  }

  function initCatalogTypeahead(){
    const inp = document.getElementById('catalogSearch');
    const box = document.getElementById('catalogSuggestions');
    if(!inp || !box || !catalogSelect) return;
    if(inp.dataset.bound === '1') return; // bind once
    inp.dataset.bound = '1';

    let active = -1;

    function clear(){ box.innerHTML = ''; box.classList.remove('open'); active = -1; }
    function choose(idx){ if(idx==null) return; catalogSelect.value = String(idx); catalogSelect.dispatchEvent(new Event('change', { bubbles:true })); inp.value=''; clear(); }

    function render(q){
      const query = String(q||'').trim();
      box.innerHTML = '';
      if(query.length < 2){ clear(); return; }
      let results = [];
      if(catalogFuse){
        try{ results = catalogFuse.search(query, { limit: 12 }); }
        catch(_){ results = []; }
      } else {
        const qlc = query.toLowerCase();
        results = catalogEntries.filter(e=> e.name && e.name.toLowerCase().includes(qlc)).slice(0,12).map(item=>({ item }));
      }
      if(!results.length){ const empty=document.createElement('div'); empty.className='autocomplete-empty'; empty.textContent='No matches'; box.appendChild(empty); box.classList.add('open'); return; }
      results.forEach((r,i)=>{
        const { idx, name } = r.item;
        const div = document.createElement('div');
        div.className = 'autocomplete-suggestion';
        div.textContent = name;
        div.dataset.idx = String(idx);
        div.addEventListener('mousedown', (e)=>{ e.preventDefault(); choose(idx); });
        box.appendChild(div);
      });
      box.classList.add('open');
      active = -1;
    }

    inp.addEventListener('input', ()=> render(inp.value));
    inp.addEventListener('keydown', (e)=>{
      const items = Array.from(box.querySelectorAll('.autocomplete-suggestion'));
      if(e.key === 'Escape'){ clear(); return; }
      if(!items.length) return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); active = (active + 1) % items.length; }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); active = (active - 1 + items.length) % items.length; }
      else if(e.key === 'Enter'){
        e.preventDefault();
        if(active >= 0 && active < items.length){ const idx = Number(items[active].dataset.idx); choose(idx); }
        else if(items.length === 1){ const idx = Number(items[0].dataset.idx); choose(idx); }
        return;
      } else { return; }
      items.forEach(el=> el.classList.remove('is-active'));
      if(active >= 0 && active < items.length) items[active].classList.add('is-active');
    });

    document.addEventListener('click', (e)=>{ if(!box.contains(e.target) && e.target !== inp) clear(); }, true);
  }

  async function loadCatalog(){
    try{
      if(location.protocol === 'file:'){
        if(catalogHint) catalogHint.textContent = 'Open via a local server to auto-load catalog, or use Import JSON.';
        if(catalogSelect){ catalogSelect.innerHTML = '<option value="">Unavailable on file://</option>'; }
        return;
      }
      const resp = await fetch('data/sites.json', { cache: 'no-store' });
      if(!resp.ok) throw new Error(String(resp.status));
      const data = await resp.json();
      if(!Array.isArray(data)) throw new Error('Expected an array');
      catalogData = data;
      fillCatalogSelect();
      initCatalogTypeahead();
      if(catalogHint) catalogHint.textContent = '';
      initMap();
    }catch(err){
      if(catalogHint) catalogHint.textContent = 'Could not load catalog. Check data/sites.json or use Import JSON.';
      if(catalogSelect){ catalogSelect.innerHTML = '<option value="">Load failed</option>'; }
    }
  }

  // ------------------------------
  // Map: display catalog sites and allow selection
  // ------------------------------
  let map, markerLayer;
  const selectedIds = new Set(); // catalog index numbers as string keys
  // Debug helper
  function log(){ try{ console.log('[PG Rose]', ...arguments);}catch(_){} }

  function updateMapSelectionUI(){
    if(addSelectedFromMapBtn){ addSelectedFromMapBtn.disabled = selectedIds.size === 0; }
    if(clearMapSelectionBtn){ clearMapSelectionBtn.disabled = selectedIds.size === 0; }
    if(mapHint){
      const n = selectedIds.size;
      mapHint.textContent = n ? `${n} site${n>1?'s':''} selected. Click Add selected to import.` : 'Click markers to select. Drag to pan, wheel to zoom.';
    }
  }

  function updateRadiusHint(){
    if(!radiusHint) return;
    if(radiusCenter){
      const [lat, lng] = radiusCenter;
      radiusHint.textContent = `Center: ${lat.toFixed(4)}, ${lng.toFixed(4)}. Drag the slider or edit the number to change the radius (1–100 km). Click anywhere on the map to move the center.`;
    } else {
      radiusHint.textContent = 'Click anywhere on the map to set the circle center, or use your location.';
    }
  }

  function drawRadiusCircle(){
    if(!map || !radiusCenter) {
      alert('Please set a center point first by clicking on the map or using your location.');
      return;
    }

    const radius = parseFloat(radiusInput?.value || radiusKm);
    if(!radius || radius <= 0) {
      alert('Please enter a valid radius in kilometers.');
      return;
    }

    radiusKm = radius;

    // Remove existing circle
    if(radiusCircle) {
      map.removeLayer(radiusCircle);
    }
    // Circle activation: previous manual deselections are no longer applicable
    manualDeselected.clear();

    // Create new circle using L.circle with proper LatLng object
    radiusCircle = L.circle(L.latLng(radiusCenter[0], radiusCenter[1]), {
      radius: radius * 1000, // Convert km to meters
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(map);

    // Filter and highlight markers within radius
    filterMarkersByRadius();
    updateRadiusHint();
    log('Drew radius circle', { center: radiusCenter, radius: radiusKm });
  }

  function updateRadiusCircle(){
    if(!map || !radiusCenter || !radiusCircle) return;
    
    const radius = parseFloat(radiusInput?.value || radiusKm);
    if(!radius || radius <= 0) return;

    radiusKm = radius;

    // Update existing circle radius
    radiusCircle.setRadius(radius * 1000);
    
    // Filter and highlight markers within radius
    filterMarkersByRadius();
    updateRadiusHint();
  }

  function clearRadiusCircle(){
    if(radiusCircle) {
      map.removeLayer(radiusCircle);
      radiusCircle = null;
    }
    radiusCenter = null;
    // When circle is removed, manual deselections done inside the circle are no longer needed
    manualDeselected.clear();
    updateRadiusHint();
    // Deselect any markers that were only selected by the circle (not manually selected)
    const before = new Set(selectedIds);
    markerLayer.eachLayer(layer => {
      if(!(layer instanceof L.Marker)) return;
      const key = String(layer.options.siteIdx ?? '');
      if(key==='') return;
      if(!manualSelected.has(key)) selectedIds.delete(key);
      applyMarkerVisual(layer, selectedIds.has(key));
    });
    updateMapSelectionUI();
    log('Cleared radius circle – deselected', { removed: [...before].filter(k=>!selectedIds.has(k)).length });
    log('Cleared radius circle');
  }

  // ------------------------------
  // Polygon utilities
  // ------------------------------
  function pointInRing(lat, lng, ring){
    // ray casting algorithm on lng (x) / lat (y)
    let inside = false;
    const n = ring.length;
    for(let i=0, j=n-1; i<n; j=i++){
      const xi = ring[i].lng, yi = ring[i].lat;
      const xj = ring[j].lng, yj = ring[j].lat;
      const intersect = ((yi > lat) !== (yj > lat)) &&
                        (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }

  function isLatLngInsidePolygon(latlng, poly){
    if(!poly) return false;
    const ll = poly.getLatLngs();
    if(!ll || !ll.length) return false;
    // normalise to one or more rings
    let rings = [];
    // Case 1: single ring [LatLng...]
    if(ll[0] && ll[0].lat !== undefined){ rings = [ll]; }
    // Case 2: polygon with rings [[LatLng...], [LatLng...]]
    else if(ll[0] && ll[0][0] && ll[0][0].lat !== undefined){ rings = ll; }
    // Case 3: multipolygon [[[LatLng...]], [[LatLng...]]]
    else if(ll[0] && ll[0][0] && ll[0][0][0] && ll[0][0][0].lat !== undefined){
      ll.forEach(polyRings => { rings.push(...polyRings); });
    }
    // For our use (drawn polygon), first ring is the outer boundary; holes are additional rings
    if(!rings.length) return false;
    let inside = pointInRing(latlng.lat, latlng.lng, rings[0]);
    for(let r=1; r<rings.length; r++){
      if(pointInRing(latlng.lat, latlng.lng, rings[r])) inside = false; // treat others as holes
    }
    return inside;
  }

  function isMarkerInsidePolygon(latlng){
    if(!polygon) return false;
    return isLatLngInsidePolygon(latlng, polygon);
  }

  function updatePolygonSelection(){
    if(!polygon || !markerLayer) return;
    let inside = 0;
    markerLayer.eachLayer(layer => {
      if(!(layer instanceof L.Marker)) return;
      const key = String(layer.options.siteIdx ?? '');
      if(key==='') return;
      const latlng = layer.getLatLng();
      const within = isLatLngInsidePolygon(latlng, polygon);

      const manuallyOn = manualSelected.has(key);
      const manuallyOff = manualDeselected.has(key);
      if(!manuallyOff && (manuallyOn || within)) selectedIds.add(key); else if(manuallyOff || (!manuallyOn && !within)) selectedIds.delete(key);
      applyMarkerVisual(layer, selectedIds.has(key));
      if(selectedIds.has(key)) inside++;
    });
    updateMapSelectionUI();
    if(polyHint) polyHint.textContent = `${inside} site${inside!==1?'s':''} selected by polygon. Drag vertices to refine.`;
  }

  function filterMarkersByRadius(){
    if(!map || !markerLayer || !radiusCenter) return;

    const radiusMeters = radiusKm * 1000;
    let withinRadius = 0;

    // Create a LatLng object for distance calculations
    const centerLatLng = L.latLng(radiusCenter[0], radiusCenter[1]);

    markerLayer.eachLayer(layer => {
      if(layer instanceof L.Marker) {
        const markerLatLng = layer.getLatLng();
        const distance = centerLatLng.distanceTo(markerLatLng);
        const isWithinRadius = distance <= radiusMeters;
        
        // auto-select/deselect based on radius unless user manually overrode
        const key = String(layer.options.siteIdx ?? '');
        if(key !== ''){
          const manuallyOn = manualSelected.has(key);
          const manuallyOff = manualDeselected.has(key);
          if(!manuallyOff && (manuallyOn || isWithinRadius)){
            selectedIds.add(key);
          } else if(manuallyOff || (!manuallyOn && !isWithinRadius)){
            selectedIds.delete(key);
          }
        }

        if(isWithinRadius) withinRadius++;

        // Two visual states only: selected vs unselected
        if(key !== ''){
          applyMarkerVisual(layer, selectedIds.has(key));
        }
      }
    });

    // Update hint with count
    if(radiusHint) {
      const [lat, lng] = radiusCenter;
      radiusHint.textContent = `Center: ${lat.toFixed(4)}, ${lng.toFixed(4)}. ${withinRadius} sites within ${radiusKm}km radius.`;
    }
    updateMapSelectionUI();
  }

  function hasLatLng(s){
    const lat = Number(s?.lat ?? s?.latitude ?? s?.Lat ?? s?.LAT);
    const lng = Number(s?.lng ?? s?.lon ?? s?.long ?? s?.longitude ?? s?.Lng ?? s?.LON);
    if(Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  }

  function markerIcon(selected){
    const color = selected ? '#60a5fa' : '#38bdf8';
    const stroke = selected ? '#1e40af' : '#0c4a6e';
    return L.divIcon({
      className: 'site-pin',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid ${stroke};box-shadow:0 0 0 2px #0003"></div>`,
      iconSize: [16,16], iconAnchor: [8,8]
    });
  }

  function applyMarkerVisual(marker, isSelected){
    marker.setIcon(markerIcon(isSelected));
    marker.setOpacity(isSelected ? 1 : 0.3);
    if(marker._icon){
      marker._icon.style.filter = isSelected ? 'brightness(1.2) drop-shadow(0 0 4px #3b82f6)' : 'grayscale(0.5)';
    }
  }

  function initMap(){
    if(!siteMapEl || typeof L==='undefined') return;
    if(map) return; // once
    map = L.map(siteMapEl, { attributionControl: false, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    
    // Leaflet.draw controls (polygon only)
    if(L && L.Control && L.Control.Draw){
      drawControl = new L.Control.Draw({
        draw: {
          polygon: { allowIntersection: false, showArea: false, shapeOptions: { color: '#22c55e', weight: 2, fillOpacity: 0.1, fillColor: '#22c55e' } },
          polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false
        },
        edit: { featureGroup: L.featureGroup(), edit: true, remove: false }
      });
      // We won't add the control UI; we control via buttons
      // But we still need an editable feature group
      map.addLayer(drawControl.options.edit.featureGroup);

      map.on(L.Draw.Event.CREATED, (e) => {
        if(polygon){ map.removeLayer(polygon); }
        polygon = e.layer;
        drawControl.options.edit.featureGroup.addLayer(polygon);
        polygon.editing && polygon.editing.enable && polygon.editing.enable();
        // Update selection continuously while editing vertices
        if(polygon && polygon.on){
          polygon.on('edit', updatePolygonSelection);
        }
        updatePolygonSelection();
        if(polyHint) polyHint.textContent = 'Drag vertices to edit. Click Clear polygon to remove.';
      });

      map.on(L.Draw.Event.EDITED, updatePolygonSelection);
      map.on('draw:editvertex', updatePolygonSelection);
    }

    // Add map click handler for radius center
    map.on('click', (e) => {
      log('Map clicked', e.latlng);
      radiusCenter = [e.latlng.lat, e.latlng.lng];
      updateRadiusHint();
      // If circle exists, update its position
      if(radiusCircle) {
        radiusCircle.setLatLng([e.latlng.lat, e.latlng.lng]);
        filterMarkersByRadius();
      }
    });
    
    renderMarkers();
    flyToUserLocation();
    log('Map initialised');
  }

  function flyToUserLocation(){
    if(!navigator.geolocation) {
      log('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userLocation = [latitude, longitude];

        // Add a marker for user location
        const userIcon = L.divIcon({
          className: 'user-location-pin',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#ff4444;border:3px solid #ffffff;box-shadow:0 0 0 2px #ff4444, 0 2px 4px rgba(0,0,0,0.3)"></div>`,
          iconSize: [20,20], iconAnchor: [10,10]
        });

        const userMarker = L.marker(userLocation, { icon: userIcon })
          .bindTooltip('Your location', { permanent: false, direction: 'top' })
          .addTo(map);

        // Set as radius center
        radiusCenter = userLocation;
        updateRadiusHint();
        // If circle exists, update its position
        if(radiusCircle) {
          radiusCircle.setLatLng(userLocation);
          filterMarkersByRadius();
        }

        // Fly to user location with appropriate zoom
        map.flyTo(userLocation, 10, {
          animate: true,
          duration: 1.5
        });

        log('Flew to user location', { lat: latitude, lng: longitude });
      },
      (error) => {
        log('Geolocation error:', error.message);
        // Fall back to fitting bounds of all markers if geolocation fails
        if(catalogData.length > 0) {
          const bounds = [];
          catalogData.forEach(rec => {
            const ll = hasLatLng(rec);
            if(ll) bounds.push([ll.lat, ll.lng]);
          });
          if(bounds.length) map.fitBounds(bounds, { padding: [20,20] });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }

  function renderMarkers(shouldFitBounds = true){
    if(!map || !markerLayer) return;
    markerLayer.clearLayers();
    const bounds = [];
    catalogData.forEach((rec, i)=>{
      const ll = hasLatLng(rec);
      if(!ll) return;
      const isSel = selectedIds.has(String(i));
      const m = L.marker([ll.lat, ll.lng], { icon: markerIcon(isSel), siteIdx: i });
      m.on('click', ()=>{
        const key = String(i);
        if(selectedIds.has(key)){
          selectedIds.delete(key);
          if(radiusCircle || polygon){ manualDeselected.add(key); } // record override if a region is active
          manualSelected.delete(key);
        } else {
          selectedIds.add(key);
          manualSelected.add(key);   // user explicitly turned it on
          manualDeselected.delete(key);
        }
        // re-render this marker icon consistently
        applyMarkerVisual(m, selectedIds.has(key));
        updateMapSelectionUI();
        log('Marker toggled', { index:i, name:nameFromRecord(rec,i), selected: selectedIds.has(key), selectedCount: selectedIds.size });
      });
      m.bindTooltip(nameFromRecord(rec, i), { permanent: false, direction: 'top' });
      m.addTo(markerLayer);
      applyMarkerVisual(m, isSel);
      bounds.push([ll.lat, ll.lng]);
    });
    if(shouldFitBounds && bounds.length){ map.fitBounds(bounds, { padding: [20,20] }); }
    updateMapSelectionUI();
    log('Markers rendered', { count: bounds.length });
  }

  if(clearMapSelectionBtn){
    clearMapSelectionBtn.addEventListener('click', ()=>{
      log('Clear selection clicked');
      selectedIds.clear();
      manualSelected.clear();
      manualDeselected.clear();
      renderMarkers();
      updateMapSelectionUI();
    });
  }

  if(addSelectedFromMapBtn){
    addSelectedFromMapBtn.addEventListener('click', ()=>{
      log('Add selected clicked', { selected: Array.from(selectedIds) });
      if(!selectedIds.size){ alert('Select one or more sites on the map first.'); return; }
      const added = [];
      for(const key of selectedIds){
        const idx = Number(key);
        const rec = catalogData[idx];
        if(!rec){ log('No catalog record for index', idx); continue; }
        const site = normaliseRecord(rec, idx);
        log('Attempt add', { idx, name: site.name, good: site.good.length, ok: site.ok.length });
        const exists = sites.some(s=> s.name.toLowerCase() === site.name.toLowerCase());
        if(!exists){
        sites.push(site); added.push(site.name); animateSiteIds.add(site.id);
          if(Number.isFinite(site.lat) && Number.isFinite(site.lng)){
            fetchSiteWeather(site.lat, site.lng).then(w=>{ if(w){ site.weather=w; save(); draw(); }});
          }
        }
      }
      if(added.length){ save(); draw(); }
      if(mapHint){ mapHint.textContent = added.length ? `Added: ${added.join(', ')}` : 'Nothing new to add (already present).'; }
      // keep selection
    });
  }

  // Event delegation fallback (ensures clicks are caught even if direct binding missed)
  document.addEventListener('click', (e)=>{
    const addBtnEl = e.target && e.target.closest && e.target.closest('#addSelectedFromMapBtn');
    if(addBtnEl){
      log('Delegated: Add selected clicked');
      if(!selectedIds.size){ alert('Select one or more sites on the map first.'); return; }
      const added = [];
      for(const key of selectedIds){
        const idx = Number(key);
        const rec = catalogData[idx];
        if(!rec){ log('No catalog record for index', idx); continue; }
        const site = normaliseRecord(rec, idx);
        const exists = sites.some(s=> s.name.toLowerCase() === site.name.toLowerCase());
        if(!exists){
        sites.push(site); added.push(site.name); animateSiteIds.add(site.id);
          if(Number.isFinite(site.lat) && Number.isFinite(site.lng)){
            fetchSiteWeather(site.lat, site.lng).then(w=>{ if(w){ site.weather=w; save(); draw(); }});
          }
        }
      }
      if(added.length){ save(); draw(); }
      if(mapHint){ mapHint.textContent = added.length ? `Added: ${added.join(', ')}` : 'Nothing new to add (already present).'; }
    }
    const clrBtnEl = e.target && e.target.closest && e.target.closest('#clearMapSelectionBtn');
    if(clrBtnEl){
      log('Delegated: Clear selection clicked');
      selectedIds.clear();
      renderMarkers();
      updateMapSelectionUI();
    }
  });

  // ------------------------------
  // Event handlers
  // ------------------------------
  addBtn.addEventListener('click', ()=>{
    const name = siteName.value.trim();
    if(!name){ alert('Please enter a site name.'); return; }

    // gather selected sectors from compass (tri‑state: 0=OFF,1=OK,2=GOOD)
    const segs = dirGrid.querySelectorAll('.dir-seg');
    const selectedGood = []; const selectedOk = [];
    segs.forEach(seg=>{ const s = Number(seg.dataset.state||'0'); const idx = Number(seg.dataset.idx); if(s===2) selectedGood.push(idx); else if(s===1) selectedOk.push(idx); });
    if(!selectedGood.length && !selectedOk.length){ alert('Select at least one wind sector as OK or GOOD.'); return; }

    const color = colourFromString(name);
    const site = { id: uid(), name, good: selectedGood, ok: selectedOk, color };
    sites.push(site); animateSiteIds.add(site.id);
    save();

    // reset inputs
    siteName.value = '';
    segs.forEach(seg=>{ seg.dataset.state='0'; seg.dispatchEvent(new Event('click')); seg.dataset.state='0'; });

    draw();
    // If a marker is selected on map, attach its lat/lng to site for weather (best-effort)
    // Otherwise weather will not be fetched for manual sites without coordinates
  });

  clearBtn.addEventListener('click', ()=>{
    if(!sites.length) return;
    if(confirm('Remove all sites?')){ sites = []; save(); draw(); }
  });

  siteList.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act="delete"]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    sites = sites.filter(s=>s.id!==id);
    save();
    draw();
  });

  // Auto-add from site list selection
  if(catalogSelect){
    catalogSelect.addEventListener('change', ()=>{
      const idxStr = catalogSelect.value; if(!idxStr) return;
      const idx = Number(idxStr);
      const rec = catalogData[idx];
      if(!rec){ return; }
      const site = normaliseRecord(rec, idx);
      const exists = sites.some(s=> s.name.toLowerCase() === site.name.toLowerCase());
      if(!exists){
        sites.push(site); animateSiteIds.add(site.id); save(); draw();
        if(Number.isFinite(site.lat) && Number.isFinite(site.lng)){
          fetchSiteWeather(site.lat, site.lng).then(w=>{ if(w){ site.weather=w; save(); draw(); }});
        }
      }
      // reset selection to placeholder
      catalogSelect.value = '';
    });
  }

  // export removed

  if(savePdfBtn){
    savePdfBtn.addEventListener('click', async ()=>{
      if(!sites.length){
        alert('Add some launch sites before saving to PDF.');
        return;
      }
      
      try{
        savePdfBtn.disabled = true;
        
        // Create a temporary container for the wind rose
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.width = '860px';
        tempContainer.style.height = '860px';
        tempContainer.style.backgroundColor = '#0f172a';
        tempContainer.style.padding = '20px';
        tempContainer.style.boxSizing = 'border-box';
        
        // Clone the SVG and legend
        const svgClone = svg.cloneNode(true);
        const legendClone = legendEl.cloneNode(true);
        
        // Style the legend for PDF
        legendClone.style.position = 'absolute';
        legendClone.style.left = '16px';
        legendClone.style.top = '16px';
        legendClone.style.display = 'flex';
        legendClone.style.gap = '8px';
        legendClone.style.flexWrap = 'wrap';
        legendClone.style.maxWidth = '520px';
        
        // Style legend pills
        const pills = legendClone.querySelectorAll('.pill');
        pills.forEach(pill => {
          pill.style.display = 'flex';
          pill.style.alignItems = 'center';
          pill.style.gap = '6px';
          pill.style.padding = '6px 8px';
          pill.style.borderRadius = '999px';
          pill.style.background = '#0b1222aa';
          pill.style.border = '1px solid #1f2937';
          pill.style.fontSize = '12px';
          pill.style.color = '#e5e7eb';
        });
        
        // Style swatches
        const swatches = legendClone.querySelectorAll('.swatch');
        swatches.forEach(swatch => {
          swatch.style.width = '12px';
          swatch.style.height = '12px';
          swatch.style.borderRadius = '50%';
          swatch.style.border = '1px solid #0b1222';
          swatch.style.boxShadow = 'inset 0 0 0 2px #0b122244';
        });

        // Sanitize quality legend samples to avoid CSS color-mix/color() unsupported by html2canvas
        const samples = legendClone.querySelectorAll('.seg-sample');
        samples.forEach(sample => {
          sample.style.background = 'none';
          sample.style.backgroundImage = 'none';
          if(sample.classList.contains('good')){
            sample.style.backgroundColor = 'rgba(34, 197, 94, 0.40)'; // #22c55e @ 0.4
            sample.style.border = '2px solid rgb(34, 197, 94)';
          } else if(sample.classList.contains('ok')){
            sample.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 6px, rgba(255,255,255,0) 6px 12px), linear-gradient(rgba(14,165,233,0.28), rgba(14,165,233,0.28))';
            sample.style.border = '2px solid rgb(14, 165, 233)';
          }
        });
        
        tempContainer.appendChild(svgClone);
        tempContainer.appendChild(legendClone);
        document.body.appendChild(tempContainer);
        
        // Convert to canvas
        const canvas = await html2canvas(tempContainer, {
          backgroundColor: '#0f172a',
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true,
          // Ensure unknown CSS color functions don't break rendering
          // by skipping invalid declarations
          onclone: (doc) => {
            // Fallback: strip any color-mix()/color() usages in cloned tree
            try{
              doc.querySelectorAll('*').forEach(el=>{
                const st = el.getAttribute('style')||'';
                if(/color-mix\(|color\(/i.test(st)) el.setAttribute('style', st.replace(/color-mix\([^)]*\)|color\([^)]*\)/gi,'rgba(0,0,0,0)'));
              });
            }catch(_){/* noop */}
          }
        });
        
        // Clean up
        document.body.removeChild(tempContainer);
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        
        // Calculate dimensions to fit A4 landscape
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pdfWidth - (margin * 2);
        const maxHeight = pdfHeight - (margin * 2);
        
        // Calculate scale to fit
        const scaleX = maxWidth / canvas.width;
        const scaleY = maxHeight / canvas.height;
        const scale = Math.min(scaleX, scaleY);
        
        const finalWidth = canvas.width * scale;
        const finalHeight = canvas.height * scale;
        
        // Center the image
        const x = (pdfWidth - finalWidth) / 2;
        const y = (pdfHeight - finalHeight) / 2;
        
        // Add the image
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
        
        // Add title
        pdf.setFontSize(16);
        pdf.setTextColor(229, 231, 235); // --ink color
        const pdfTitle = windRoseTitleText.trim() || 'PG Rose - Perfect Launch Window';
        pdf.text(pdfTitle, margin, 15);
        
        // Add site count
        pdf.setFontSize(10);
        pdf.setTextColor(148, 163, 184); // --muted color
        pdf.text(`${sites.length} site${sites.length !== 1 ? 's' : ''}`, margin, 25);
        
        // Save the PDF
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        pdf.save(`pg-rose-${timestamp}.pdf`);
        
        log('PDF saved successfully');
        
      } catch(error){
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
      } finally{
        savePdfBtn.disabled = false;
      }
    });
  }

  if(printBtn){
    printBtn.addEventListener('click', ()=>{
      try{ window.print(); }catch(err){ console.warn('print failed', err); }
    });
  }

  // import removed

  // Re-use the existing var; only attach the listener here
  showDegrees.addEventListener('change', draw);
  // Advanced toggles card: bind expand/collapse
  (function initAdvancedCard(){
    const btn = document.getElementById('advancedBtn');
    const grp = document.getElementById('advancedGroup');
    if(!btn || !grp) return;
    const sync = ()=>{ btn.setAttribute('aria-pressed', grp.classList.contains('open') ? 'true' : 'false'); };
    // default closed
    grp.classList.remove('open');
    sync();
    btn.addEventListener('click', ()=>{ grp.classList.toggle('open'); sync(); });
  })();
  // Ring order toggle
  (function initRingOrderToggle(){
    const el = document.getElementById('ringOrderLongFirst');
    if(!el) return;
    try{ el.checked = (ringOrder === 'long'); }catch(_){/* noop */}
    el.addEventListener('change', ()=>{ ringOrder = el.checked ? 'long' : 'short'; save(); draw(); });
  })();
  if(showLiveWind){ showLiveWind.checked = liveWindOn; showLiveWind.addEventListener('change', ()=>{ liveWindOn = !!showLiveWind.checked; save(); draw(); }); }
  if(liveToggleOverlay){ liveToggleOverlay.checked = liveWindOn; liveToggleOverlay.addEventListener('change', ()=>{ liveWindOn = !!liveToggleOverlay.checked; if(showLiveWind) showLiveWind.checked = liveWindOn; save(); draw(); }); }
  // New icon toggle with collapsible group
  if(liveBtn){
    const syncUI = ()=>{
      liveBtn.setAttribute('aria-pressed', liveWindOn ? 'true' : 'false');
      if(liveGroup){ liveGroup.classList.toggle('open', liveWindOn); }
    };
    syncUI();
    liveBtn.addEventListener('click', ()=>{
      liveWindOn = !liveWindOn; save(); draw(); syncUI();
      if(showLiveWind){ showLiveWind.checked = liveWindOn; }
      if(liveToggleOverlay){ liveToggleOverlay.checked = liveWindOn; }
    });
  }

  // Clone the live controls into the mobile card when present
  (function mountMobileLive(){
    const host = document.getElementById('mobileLiveMount');
    if(!host) return;
    // Ensure host anchors content to top-left so toggle doesn't re-center
    try{
      host.style.display = 'flex';
      host.style.flexDirection = 'column';
      host.style.alignItems = 'flex-start';
      host.style.justifyContent = 'flex-start';
    }catch(_){/* noop */}
    // Build an instance of the live controls content (icon + group) inside the card
    const wrap = document.createElement('div');
    wrap.className = 'live-controls';
    // Ensure the button stays at the top-left; content expands below it
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'flex-start';
    const btn = document.createElement('button');
    btn.id = 'liveWindBtnMobile';
    btn.className = 'icon-btn';
    btn.setAttribute('aria-label','Live wind');
    btn.setAttribute('aria-pressed', liveWindOn ? 'true' : 'false');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 3 1.35 3 3M19 6.5C19 4.57 17.43 3 15.5 3S12 4.57 12 6.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S16.33 8 15.5 8H2v2h13.5c1.93 0 3.5-1.57 3.5-3.5m-.5 4.5H2v2h16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5v2c1.93 0 3.5-1.57 3.5-3.5S20.43 11 18.5 11"></path></svg>';
    const grp = document.createElement('div');
    grp.id = 'liveGroupMobile';
    grp.className = 'live-group';
    // Expand below the button without shifting the button's position
    grp.style.marginTop = '8px';
    grp.style.width = '100%';
    if(liveWindOn) grp.classList.add('open');
    grp.innerHTML = `
      <div class="row-top">
        <div class="carousel" id="dayCarouselMobile"><div id="dayButtonsMobile" class="day-buttons"></div></div>
        <div class="carousel" id="hourCarouselMobile"><div id="hourButtonsMobile" class="hour-buttons compact"></div></div>
      </div>
      <div class="row-bottom">
        <label id="hideOutsideLabelMobile" class="toggle-stack"><input id="hideOutsideToggleCard" type="checkbox" /> <span>Flyable</span></label>
        <div class="unit-switch" id="unitSwitchMobile" title="Toggle units" data-mode="kph">
          <div class="track">
            <span class="label kph" role="button" tabindex="0">KPH</span>
            <span class="label mph" role="button" tabindex="0">MPH</span>
            <span class="label kts" role="button" tabindex="0">KTS</span>
            <div class="thumb"></div>
          </div>
        </div>
      </div>
      <div class="row" style="gap:8px; align-items:center; display:none">
        <label class="mono" for="modelSelectMobile">Model</label>
        <select id="modelSelectMobile" aria-label="Select weather model">
          <option value="default">Open‑Meteo</option>
          <option value="ukmo_seamless">UK Met Seamless</option>
        </select>
      </div>
    `;
    wrap.appendChild(btn); wrap.appendChild(grp); host.appendChild(wrap);

    const syncMobile = ()=>{
      btn.setAttribute('aria-pressed', liveWindOn ? 'true' : 'false');
      grp.classList.toggle('open', liveWindOn);
    };
    btn.addEventListener('click', ()=>{ liveWindOn = !liveWindOn; save(); draw(); syncMobile(); });
    // No separate hide toggle inside the mobile card; use the overlay toggle instead
    // Unit switch (mobile)
    (function(){
      const sw = document.getElementById('unitSwitchMobile');
      if(!sw) return;
      const setMode = (m)=>{ units = m; sw.dataset.mode = m; const other=document.getElementById('unitSwitchDesktop'); if(other) other.dataset.mode=m; save(); draw(); };
      sw.dataset.mode = units;
      sw.querySelector('.kph')?.addEventListener('click', ()=> setMode('kph'));
      sw.querySelector('.mph')?.addEventListener('click', ()=> setMode('mph'));
      sw.querySelector('.kts')?.addEventListener('click', ()=> setMode('knots'));
    })();
    // Wind-only toggle inside the card
    const hideCard = document.getElementById('hideOutsideToggleCard');
    if(hideCard){
      hideCard.checked = hideSitesOutside;
      hideCard.addEventListener('change', ()=>{
        hideSitesOutside = !!hideCard.checked;
        const overlayHide = document.getElementById('hideOutsideToggle'); if(overlayHide){ overlayHide.checked = hideSitesOutside; }
        const topHide = document.getElementById('hideOutsideTop'); if(topHide){ topHide.checked = hideSitesOutside; }
        save(); draw();
      });
    }
    // Mirror Show degrees from card → overlay element so draw() uses one source
    const showDegCard = document.getElementById('showDegreesCard');
    if(showDegCard){
      const overlayDeg = document.getElementById('showDegrees');
      if(overlayDeg){ showDegCard.checked = !!overlayDeg.checked; }
      showDegCard.addEventListener('change', ()=>{ const ov = document.getElementById('showDegrees'); if(ov){ ov.checked = !!showDegCard.checked; } draw(); });
    }
    // Ring order toggle (attach AFTER we create the card DOM)
    const ringToggle = document.getElementById('ringOrderLongFirst');
    if(ringToggle){
      try{ ringToggle.checked = (ringOrder === 'long'); }catch(_){/* noop */}
      ringToggle.addEventListener('change', ()=>{ ringOrder = ringToggle.checked ? 'long' : 'short'; save(); draw(); });
    }
    const longNamesToggle = document.getElementById('longNamesOutToggle');
    if(longNamesToggle){
      try{ longNamesToggle.checked = !!longNamesOut; }catch(_){/* noop */}
      longNamesToggle.addEventListener('change', ()=>{ longNamesOut = !!longNamesToggle.checked; save(); draw(); });
    }
    const expandIsolated = document.getElementById('expandIsolatedToggle');
    if(expandIsolated){
      try{ expandIsolated.checked = !!expandIsolatedSegments; }catch(_){/* noop */}
      expandIsolated.addEventListener('change', ()=>{ expandIsolatedSegments = !!expandIsolated.checked; save(); draw(); });
    }
    const reorderT = document.getElementById('reorderToggle');
    if(reorderT){
      try{ reorderT.checked = !!reorderMode; }catch(_){/* noop */}
      reorderT.addEventListener('change', ()=>{ reorderMode = !!reorderT.checked; save(); draw(); });
    }
    
    // Mobile model selector
    const modelMobile = document.getElementById('modelSelectMobile');
    if(modelMobile){
      modelMobile.value = weatherModel || 'default';
      modelMobile.addEventListener('change', async ()=>{
        await applyModelChange(modelMobile.value || 'default');
      });
    }

    // Render day/hour buttons into mobile hosts reusing the same builders
    (function initDayButtonsMobile(){
      const host = document.getElementById('dayButtonsMobile'); if(!host) return;
      host.innerHTML='';
      const labels = ['S','M','T','W','T','F','S'];
      const today = new Date(); today.setHours(12,0,0,0);
      for(let d=0; d<7; d++){
        const btn = document.createElement('button');
        const date = new Date(today.getTime() + d*86400000);
        const dow = labels[date.getDay()];
        const dom = String(date.getDate());
        btn.innerHTML = `<span class="dow">${dow}</span><span class="dom">${dom}</span>`;
        if(d === selectedDayOffset) btn.classList.add('active');
        btn.addEventListener('click', ()=>{ selectedDayOffset = d; save(); draw(); host.querySelectorAll('button').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); centerInCarousel('dayCarouselMobile', btn); });
        host.appendChild(btn);
      }
    initCarouselViewport('dayCarouselMobile', 'dayButtonsMobile');
    const actD = host.querySelector('button.active'); if(actD) centerInCarousel('dayCarouselMobile', actD);
    })();
    (function initHourButtonsMobile(){
      const host = document.getElementById('hourButtonsMobile'); if(!host) return;
      host.innerHTML='';
      const hours = [7,9,11,13,15,17];
      hours.forEach(h=>{
        const b = document.createElement('button'); b.textContent = String(h)+':00';
        if(selectedHour===h) b.classList.add('active');
        b.addEventListener('click', ()=>{ selectedHour=h; save(); draw(); host.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); centerInCarousel('hourCarouselMobile', b); });
        host.appendChild(b);
      });
    initCarouselViewport('hourCarouselMobile', 'hourButtonsMobile');
    const actHM = host.querySelector('button.active'); if(actHM) centerInCarousel('hourCarouselMobile', actHM);
    })();
  })();
  if(hideOutsideToggle){ hideOutsideToggle.checked = hideSitesOutside; hideOutsideToggle.addEventListener('change', ()=>{ hideSitesOutside = !!hideOutsideToggle.checked; save(); draw(); }); }
  // Mobile top Wind‑only toggle next to Show degrees
  (function(){
    const hideOutsideTop = document.getElementById('hideOutsideTop');
    if(!hideOutsideTop) return;
    hideOutsideTop.checked = hideSitesOutside;
    hideOutsideTop.addEventListener('change', ()=>{
      hideSitesOutside = !!hideOutsideTop.checked;
      const hDesktop = document.getElementById('hideOutsideToggle'); if(hDesktop) hDesktop.checked = hideSitesOutside;
      const hMobile = document.getElementById('hideOutsideToggleMobile'); if(hMobile) hMobile.checked = hideSitesOutside;
      save(); draw();
    });
  })();
  // Unit switch (desktop)
  (function(){
    const sw = unitSwitchDesktop;
    if(!sw) return;
    const setMode = (m)=>{ units = m; sw.dataset.mode = m; const other=document.getElementById('unitSwitchMobile'); if(other) other.dataset.mode=m; save(); draw(); };
    sw.dataset.mode = units;
    sw.querySelector('.kph')?.addEventListener('click', ()=> setMode('kph'));
    sw.querySelector('.mph')?.addEventListener('click', ()=> setMode('mph'));
    sw.querySelector('.kts')?.addEventListener('click', ()=> setMode('knots'));
  })();
  // Weather model selector (desktop)
  if(modelSelect){
    if(weatherModel==='ukmo_uk_deterministic_2km') weatherModel='ukmo_seamless';
    modelSelect.value = weatherModel || 'default';
    modelSelect.addEventListener('change', async ()=>{
      await applyModelChange(modelSelect.value || 'default');
    });
  }
  // Wire back tolerance UI if present
  (function(){
    const tolInput = document.getElementById('tolInput');
    if(!tolInput) return;
    tolInput.value = String(BOUNDARY_EPS_DEG);
    tolInput.addEventListener('input', ()=>{
      const v = Number(tolInput.value);
      if(Number.isFinite(v) && v>=0 && v<=10){ BOUNDARY_EPS_DEG = v; save(); draw(); }
    });
  })();
  // sliders removed (baked in)

  // Label radius controls
  (function initLabelRadiusControls(){
    const s = document.getElementById('labelRadiusSlider');
    const n = document.getElementById('labelRadiusInput');
    const clamp = (v)=> Math.max(0.2, Math.min(0.8, v));
    if(s){ s.value = String(LABEL_RADIUS_FACTOR); }
    if(n){ n.value = String(LABEL_RADIUS_FACTOR); }
    if(s){
      s.addEventListener('input', ()=>{
        const v = clamp(Number(s.value)||0.45);
        LABEL_RADIUS_FACTOR = v;
        if(n) n.value = String(v);
        save(); draw();
      });
    }
    if(n){
      n.addEventListener('input', ()=>{
        let v = Number(n.value);
        if(!Number.isFinite(v)) v = LABEL_RADIUS_FACTOR;
        v = clamp(v);
        LABEL_RADIUS_FACTOR = v;
        if(s) s.value = String(v);
        save(); draw();
      });
    }
  })();

  // ------------------------------
  // Title offset controls (desktop/mobile)
  // ------------------------------
  

  // Day buttons (Mon..Sun starting today, disabling past days)
  (function initDayButtons(){
    if(!dayButtonsEl) return;
    const labels = ['S','M','T','W','T','F','S'];
    dayButtonsEl.innerHTML = '';
    const today = new Date(); today.setHours(12,0,0,0);
    for(let d=0; d<7; d++){
      const btn = document.createElement('button');
      const date = new Date(today.getTime() + d*86400000);
      const dow = labels[date.getDay()];
      const dom = String(date.getDate());
      btn.innerHTML = `<span class="dow">${dow}</span><span class="dom">${dom}</span>`;
      if(d === selectedDayOffset) btn.classList.add('active');
      if(d<0){ btn.disabled = true; }
      btn.addEventListener('click', ()=>{
        selectedDayOffset = d; save(); draw();
        dayButtonsEl.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        centerInCarousel('dayCarousel', btn);
      });
      dayButtonsEl.appendChild(btn);
    }
    initCarouselViewport('dayCarousel', 'dayButtons');
    const active = dayButtonsEl.querySelector('button.active'); if(active) centerInCarousel('dayCarousel', active);
  })();

  // Hour buttons 7AM..6PM in 2h steps
  (function initHourButtons(){
    const host = document.getElementById('hourButtons'); if(!host) return;
    host.innerHTML='';
    const hours = [7,9,11,13,15,17];
    hours.forEach(h=>{
      const b = document.createElement('button'); b.textContent = String(h) + ':00';
      if(selectedHour===h) b.classList.add('active');
      b.addEventListener('click', ()=>{ selectedHour = h; save(); draw(); host.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); centerInCarousel('hourCarousel', b); });
      host.appendChild(b);
    });
    initCarouselViewport('hourCarousel', 'hourButtons');
    const actH = host.querySelector('button.active'); if(actH) centerInCarousel('hourCarousel', actH);
  })();

  // Populate verbose weather info (render on demand)
  function renderWxInfo(){
    const infoEl = document.getElementById('wxInfo');
    if(!infoEl) return;
    const modelLine = weatherModel && weatherModel !== 'default' ? `&models=${weatherModel}` : '(Open‑Meteo baseline)';
    const humanModel = (weatherModel==='ukmo_seamless') ? 'UK Met Seamless' : 'Open‑Meteo';
    infoEl.innerHTML = `
Source: ${humanModel}. Toggle model with <kbd>${/Mac/i.test(navigator.platform||'')?'⌘':'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>.<br>
Request: hourly wind at 80m (fallback to 10m if missing) and 10m direction, timezone GMT.<br>
Endpoint template:<br>
<code>https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=wind_speed_80m,wind_speed_10m,winddirection_10m&daily=weather_code&timezone=GMT</code><br>
Model: <code>${modelLine}</code><br><br>
Processing:<br>
• NOW: nearest hourly record to current time (GMT).<br>
• Per‑day: average that day's hourly wind vectors (speed‑weighted) for mean speed and direction.<br>
• Suitability: direction → 16‑sector index (22.5° each); test against GOOD/OK sets.<br>
• Wind‑only: hide sites failing the current day's suitability.<br>
• Units: toggle KPH↔MPH via the switch (legend/tooltips update live).
`;
  }
  renderWxInfo();

  // ------------------------------
  // Carousel helpers (drag-scroll, show 3 items)
  // ------------------------------
  function initCarouselViewport(viewportId, trackId){
    const viewport = document.getElementById(viewportId);
    const track = document.getElementById(trackId);
    if(!viewport || !track) return;
    const first = track.querySelector('button');
    if(!first) return;
    const rect = first.getBoundingClientRect();
    const gapPx = 6; // keep in sync with CSS gap
    const visible = 3;
    function computeWidth(){
      const r = first.getBoundingClientRect();
      const w = Math.ceil(r.width * visible + gapPx * (visible - 1));
      viewport.style.maxWidth = w + 'px';
    }
    computeWidth();
    // state toggles for fades
    function updateState(){
      const scrollable = track.scrollWidth > viewport.clientWidth + 1;
      viewport.classList.toggle('scrollable', scrollable);
      const atStart = viewport.scrollLeft <= 2;
      const atEnd = viewport.scrollLeft + viewport.clientWidth >= track.scrollWidth - 2;
      viewport.classList.toggle('at-start', atStart);
      viewport.classList.toggle('at-end', atEnd);
    }
    updateState();
    // drag-to-scroll behavior
    let isDown = false; let startX = 0; let startLeft = 0;
    const getX = (e)=> (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
    const onDown = (e)=>{ isDown=true; startX=getX(e); startLeft=viewport.scrollLeft; viewport.classList.add('drag'); };
    const onMove = (e)=>{ if(!isDown) return; viewport.scrollLeft = startLeft - (getX(e) - startX); };
    const onUp = ()=>{ isDown=false; viewport.classList.remove('drag'); };
    viewport.addEventListener('mousedown', onDown);
    viewport.addEventListener('mousemove', onMove);
    viewport.addEventListener('mouseup', onUp);
    viewport.addEventListener('mouseleave', onUp);
    viewport.addEventListener('touchstart', onDown, { passive: true });
    viewport.addEventListener('touchmove', onMove, { passive: true });
    viewport.addEventListener('touchend', onUp);
    viewport.addEventListener('scroll', updateState, { passive: true });
    window.addEventListener('resize', ()=>{ computeWidth(); updateState(); }, { passive: true });
  }

  function centerInCarousel(viewportId, el){
    const vp = document.getElementById(viewportId);
    if(!vp || !el) return;
    const target = Math.max(0, el.offsetLeft - (vp.clientWidth - el.offsetWidth)/2);
    try{ vp.scrollTo({ left: target, behavior: 'smooth' }); }catch(_){ vp.scrollLeft = target; }
  }

  // ------------------------------
  // Keyboard shortcut: Ctrl+Shift+M to toggle model with toast
  // ------------------------------
  window.addEventListener('keydown', async (e)=>{
    try{
      const isMac = navigator.platform && /Mac/i.test(navigator.platform);
      const ctrlOrMeta = isMac ? e.metaKey : e.ctrlKey;
      if(ctrlOrMeta && e.shiftKey && (e.key==='M' || e.key==='m')){
        e.preventDefault();
        const next = (weatherModel && weatherModel !== 'default') ? 'default' : 'ukmo_seamless';
        await applyModelChange(next);
      }
    }catch(_){/* noop */}
  });

  // Title input handler
  if(windRoseTitle){
    windRoseTitle.value = windRoseTitleText;
    windRoseTitle.addEventListener('input', ()=>{
      windRoseTitleText = windRoseTitle.value;
      save();
      draw();
    });
  }

  // Initialize radius hint
  updateRadiusHint();

  // ------------------------------
  // Self‑tests (debug aid)
  // ------------------------------
  function assert(name, cond){ if(!cond) throw new Error('Test failed: ' + name); console.log('✔', name); }
  function runSelfTests(){
    console.group('PG Rose – self‑tests');
    // 1) Sector bounds size
    const [s0,e0] = (function(){ const [s,e]=sectorBounds(0); return [s,e];})();
    assert('sector width 22.5°', Math.abs(((e0 - s0 + 360)%360) - 22.5) < 1e-9);

    // 2) Contiguous ranges without wrap
    let ranges = contiguousRanges([8,9,10]);
    assert('ranges len=1 (no wrap)', ranges.length===1);
    assert('span 67.5°', Math.abs(ranges[0].spanDeg - 67.5) < 1e-9);

    // 3) Contiguous ranges with wrap across N (always on)
    ranges = contiguousRanges([12,13,14,15,0]);
    assert('wrap merged to 1 range', ranges.length===1);
    assert('wrap span 112.5°', Math.abs(ranges[0].spanDeg - 112.5) < 1e-9);

    // 4) Ring assignment prefers shorter inside when overlapping
    const siteA = {id:'A', name:'A', color:'#f0f', good:[12,13,14,15], ok:[0]};
    const siteB = {id:'B', name:'B', color:'#0ff', good:[0,1,2], ok:[]};
    const arcs = [
      ...rangesToArcs(siteA, contiguousRanges(siteA.good)).map(a=>({...a, quality:'good'})),
      ...rangesToArcs(siteB, contiguousRanges(siteB.good)).map(a=>({...a, quality:'good'}))
    ];
    assignRings(arcs);
    const ringA = arcs.find(a=>a.site==='A').ring;
    const ringB = arcs.find(a=>a.site==='B').ring;
    assert('shorter span nearer centre', ringB < ringA);

    // 5) Disjoint arcs share inner ring (no overlap)
    const sC = {id:'C', name:'C', color:'#ccc', good:[2], ok:[]}; // NE
    const sD = {id:'D', name:'D', color:'#ddd', good:[10], ok:[]}; // SW
    const arcs2 = [
      ...rangesToArcs(sC, contiguousRanges(sC.good)).map(a=>({...a, quality:'good'})),
      ...rangesToArcs(sD, contiguousRanges(sD.good)).map(a=>({...a, quality:'good'}))
    ];
    assignRings(arcs2);
    const rC = arcs2.find(a=>a.site==='C').ring;
    const rD = arcs2.find(a=>a.site==='D').ring;
    assert('disjoint arcs same ring 0', rC===0 && rD===0);

    // 6) Label radius helper is fixed 40%
    (function(){
      const r0=100, r1=200; const expected = 100 + 0.4*(200-100);
      assert('labelRadius is 40% across band', Math.abs(labelRadius(r0,r1) - expected) < 1e-9);
    })();

    // 7) Radial layout: single ring fills available space
    (function(){
      const L = computeRadialLayout(1);
      assert('single ring no gap', L.gap===0);
      assert('single ring full width', Math.abs((L.outer - L.inner) - L.width) < 1e-9);
    })();

    // 8) Radial layout with stacking: width contracts with gaps
    (function(){
      const L2 = computeRadialLayout(3);
      assert('stacking has gap', L2.gap>0);
      const total = L2.width*3 + L2.gap*2 + L2.inner;
      assert('bands fit within outer', total <= L2.outer + 1e-9);
    })();

    // 9) Tooltip exists and is hidden by default
    (function(){
      const el = document.getElementById('tooltip');
      assert('tooltip element present', !!el);
      assert('tooltip hidden initially', getComputedStyle(el).opacity === '0');
    })();

    // 10) Tooltip appears when hovering a label (if present)
    (function(){
      const labels = Array.from(svg.querySelectorAll('text'));
      const label = labels.find(n=>n.textContent && n.textContent.trim().length>0);
      if(label){
        label.dispatchEvent(new Event('mouseenter'));
        const vis = getComputedStyle(document.getElementById('tooltip')).opacity;
        assert('tooltip shows on label hover', vis === '1');
        label.dispatchEvent(new Event('mouseleave'));
      }
    })();

    // 11) OK vs GOOD rendering: OK uses darker colour and inset band
    (function(){
      const base = 'hsl(120 70% 55%)';
      const dark = darkerOf(base);
      assert('darkerOf lowers lightness', dark !== base);
      const L = computeRadialLayout(2);
      const r0 = L.inner; const r1_ok = r0 + L.width*0.62; const r1_good = r0 + L.width;
      assert('OK inset thinner than GOOD', r1_ok < r1_good);
    })();

    console.log('All tests passed.');
    console.groupEnd();
  }

  // self-tests button removed

  // Radius circle event listeners
  if(drawRadiusBtn){
    drawRadiusBtn.addEventListener('click', drawRadiusCircle);
  }

  if(clearRadiusBtn){
    clearRadiusBtn.addEventListener('click', clearRadiusCircle);
  }

  if(radiusInput){
    radiusInput.value = radiusKm;
    radiusInput.addEventListener('input', ()=>{
      radiusKm = parseFloat(radiusInput.value) || 50;
      if(radiusSlider) radiusSlider.value = radiusKm;
      if(radiusCircle) updateRadiusCircle();
    });
  }

  if(radiusSlider){
    radiusSlider.value = radiusKm;
    radiusSlider.addEventListener('input', ()=>{
      radiusKm = parseFloat(radiusSlider.value);
      if(radiusInput) radiusInput.value = radiusKm;
      if(radiusCircle) updateRadiusCircle();
    });
  }

  // Polygon event listeners
  if(startPolyBtn && typeof L!=='undefined' && L.Draw){
    startPolyBtn.addEventListener('click', ()=>{
      if(!map) return;
      if(polygon){ drawControl && drawControl.options.edit.featureGroup.removeLayer(polygon); map.removeLayer(polygon); polygon=null; }
      manualDeselected.clear();
      const drawer = new L.Draw.Polygon(map, { shapeOptions: { color:'#22c55e', weight:2, fillOpacity:.1, fillColor:'#22c55e' } });
      drawer.enable();
      if(polyHint) polyHint.textContent = 'Click to add points. Click the first point to finish.';
    });
  }

  if(clearPolyBtn){
    clearPolyBtn.addEventListener('click', ()=>{
      if(polygon){ drawControl && drawControl.options.edit.featureGroup.removeLayer(polygon); map.removeLayer(polygon); polygon=null; }
      // Deselect any markers that were only selected by the polygon (not manually selected)
      markerLayer.eachLayer(layer => {
        if(!(layer instanceof L.Marker)) return;
        const key = String(layer.options.siteIdx ?? '');
        if(key==='') return;
        if(!manualSelected.has(key)) selectedIds.delete(key);
        applyMarkerVisual(layer, selectedIds.has(key));
      });
      updateMapSelectionUI();
      if(polyHint) polyHint.textContent = 'Polygon cleared. Click Start polygon to draw a new one.';
    });
  }

  draw();
  loadCatalog();
})();
