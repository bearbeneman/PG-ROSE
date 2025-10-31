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

  // Colour helpers (delegate to module if present)
  function colourFromString(str){ return window.PG.colors.colourFromString(str); }
  function darkerOf(hsl){ return window.PG.colors.darkerOf(hsl); }

  // Build UI for sectors (tri‑state OFF→OK→GOOD)
  const dirGrid = document.getElementById('dirGrid');
  function initCompass(){ try{ if(window.PG && window.PG.compass && window.PG.compass.init){ return window.PG.compass.init(dirGrid, { DIRS, SECTOR_DEG }); } }catch(_){/* noop */} }
  initCompass();

  const q = sel => document.querySelector(sel);
  const siteName = q('#siteName');
  const addBtn = q('#addBtn');
  const clearBtn = q('#clearBtn');
  const exportBtn = null; // removed
  const importBtn = null; // removed
  const savePdfBtn = q('#savePdfBtn');
  const copyPngBtn = q('#copyPngBtn');
  const printBtn = q('#printBtn');
  const shareBtn = q('#shareBtn');
  const embedBtn = q('#embedBtn');
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


  // Tooltip helpers (delegate to module if present)
  function showTip(text){ return window.PG.tooltip.show(text); }
  function moveTip(evt){ return window.PG.tooltip.move(evt); }
  function hideTip(){ return window.PG.tooltip.hide(); }

  const showDegrees = q('#showDegrees') || {checked:true};

  // ------------------------------
  // Data model
  // ------------------------------
  let sites = load() || [];
  let windRoseTitleText = loadTitle() || '';
  let liveWindOn = false;
  let selectedDayOffset = 0; // 0=today, 1=tomorrow, ... up to 6
  let selectedHour = null;   // null = auto (closest now) or daily average if day offset > 0
  let hideSitesOutside = false;
  let showClosedOnMap = false; // hide closed sites on map by default
  let units = 'kph';
  let weatherModel = 'ukmo_seamless';
  let titleOffsetDesktopPx = -16;
  let titleOffsetMobilePx = -16;
  // Animation: track sites just added to animate their segments once
  const animateSiteIds = new Set();
  // Label layout controls (declared early to avoid TDZ when loading from storage)
  let LABEL_MAX_PX = (window.PG&&window.PG.config&&window.PG.config.labelMaxPx)||28; // cap for site label size
  let LABEL_RADIUS_FACTOR = (window.PG&&window.PG.config&&window.PG.config.labelRadiusFactor)||0.45; // factor for non-auto center mode
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
  // Segment visual controls (do not affect wind logic)
  let GAP_PX = 4.6;          // pixel gap between segments at any radius (baked-in)
  let GAP_DEG = 0;         // additional angular trim per side (deg)
  let GLOBAL_ROTATE_DEG = 0.25; // rotate all segments visually (deg) (baked-in)

  function save(){ return window.PG.state.saveState({ sites, windRoseTitleText, liveWindOn, selectedDayOffset, hideSitesOutside, units, selectedHour, weatherModel, LABEL_RADIUS_FACTOR, ringOrder, longNamesOut, expandIsolatedSegments, manualRingTargets, reorderMode }); }
  function load(){ return window.PG.state.readSites(); }
  function loadTitle(){ return window.PG.state.readTitle(); }
  (function(){ const s = window.PG.state.readSettings(); if(s&&typeof s==='object'){ if('liveWindOn' in s) liveWindOn=s.liveWindOn; if('selectedDayOffset' in s) selectedDayOffset=s.selectedDayOffset; if('hideSitesOutside' in s) hideSitesOutside=s.hideSitesOutside; if('units' in s) units=s.units; if('selectedHour' in s) selectedHour=s.selectedHour; if('weatherModel' in s) weatherModel=s.weatherModel; if('LABEL_RADIUS_FACTOR' in s) LABEL_RADIUS_FACTOR=s.LABEL_RADIUS_FACTOR; if('ringOrder' in s) ringOrder=s.ringOrder; if('longNamesOut' in s) longNamesOut=s.longNamesOut; if('expandIsolatedSegments' in s) expandIsolatedSegments=s.expandIsolatedSegments; if('manualRingTargets' in s) manualRingTargets=s.manualRingTargets||{}; if('reorderMode' in s) reorderMode=s.reorderMode; } })();

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
    try{ if(window.PG && window.PG.layout && window.PG.layout.contiguousRanges){ return window.PG.layout.contiguousRanges(selected); } }catch(_){/* noop */}
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
  function overlaps(a,b){ if(window.PG && window.PG.layout && window.PG.layout.overlaps){ return window.PG.layout.overlaps(a,b); }
    const ia = intervals(a), ib = intervals(b);
    for(const [as,ae] of ia){ for(const [bs,be] of ib){ const s=Math.max(as,bs), e=Math.min(ae,be); if(e - s >= 0) return true; } }
    return false; }

  // Strict overlap helper used for expansion logic (touching edges are NOT overlap)
  function overlapsOpen(a,b){ if(window.PG && window.PG.layout && window.PG.layout.overlapsOpen){ return window.PG.layout.overlapsOpen(a,b); }
    const ia = intervals(a), ib = intervals(b);
    for(const [as,ae] of ia){ for(const [bs,be] of ib){ const s=Math.max(as,bs), e=Math.min(ae,be); if(e - s > 1e-4) return true; } }
    return false; }

  // Assign arcs to rings (order controlled by ringOrder and longNamesOut)
  function assignRings(allArcs){
    return window.PG.layout.assignRings(allArcs, { ringOrder, longNamesOut, manualRingTargets, lastAssignedRingsRef: lastAssignedRings });
  }

  // ------------------------------
  // SVG drawing
  // ------------------------------
  const cx = (window.PG&&window.PG.config&&window.PG.config.center&&window.PG.config.center.x)||430;
  const cy = (window.PG&&window.PG.config&&window.PG.config.center&&window.PG.config.center.y)||430;
  const guideRadius = (window.PG&&window.PG.config&&window.PG.config.guideRadius)||330;
  const CORE_MARGIN = (window.PG&&window.PG.config&&window.PG.config.coreMargin)||70;

  // Dynamic band layout: one ring fills, stacked rings share space
  function computeRadialLayout(totalRings){
    try{ if(window.PG && window.PG.layout && window.PG.layout.computeRadialLayout){ return window.PG.layout.computeRadialLayout(totalRings, window.PG.config); } }catch(_){/* noop */}
    const innerMin = CORE_MARGIN; const outerMax = guideRadius - 8; const gap = totalRings > 1 ? 6 : 0; const width = (outerMax - innerMin - gap * Math.max(0, totalRings-1)) / totalRings; return { inner: innerMin, outer: outerMax, gap, width };
  }

  function polarToXY(r, deg){
    if(window.PG && window.PG.svg && window.PG.svg.polarToXY){ return window.PG.svg.polarToXY(cx, cy, r, deg); }
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

  // Date helpers from module
  function dayKeyForOffset(offset){ return window.PG.time.dayKeyForOffset(offset); }
  function hourOf(timeStr){ return window.PG.time.hourOf(timeStr); }

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
    try{ if(window.PG && window.PG.svg && window.PG.svg.annularSectorPath){ return window.PG.svg.annularSectorPath(cx, cy, r0, r1, a0, span); } }catch(_){/* noop */}
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
    try{ if(window.PG && window.PG.svg && window.PG.svg.arcTextPathD){ return window.PG.svg.arcTextPathD(cx, cy, r, a0, span, false); } }catch(_){/* noop */}
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

  // drawGuides moved to ui/rose.js

  // Empty state renderer moved to ui/rose.js
  function draw(){
    clearSVG();
    window.PG.rose.drawGuides(svg, {
      cx, cy,
      guideRadius,
      coreMargin: CORE_MARGIN,
      DIRS,
      showDegrees,
      titleText: windRoseTitleText,
      titleOffsetDesktopPx,
      titleOffsetMobilePx,
      showTip, hideTip, moveTip,
      onEditTitle: ({ rect, isMobile })=>{
        try{
          const input = document.createElement('input');
          input.type = 'text';
          input.value = (windRoseTitleText||'');
          input.placeholder = (isMobile ? 'Enter title' : 'Enter title').toUpperCase();
          input.setAttribute('aria-label','Wind rose title');
          const vw = Math.min(window.innerWidth, document.documentElement.clientWidth||window.innerWidth);
          const maxW = Math.min(480, Math.floor(vw*0.9));
          const pad = 10;
          input.style.position = 'fixed';
          input.style.zIndex = '9999';
          input.style.boxSizing = 'border-box';
          input.style.padding = '8px 12px';
          input.style.borderRadius = '10px';
          input.style.border = '1px solid #1f2937';
          input.style.background = '#0b1222';
          input.style.color = '#e5e7eb';
          input.style.font = '700 20px ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial';
          input.style.boxShadow = '0 8px 30px rgba(0,0,0,.45)';
          input.style.textAlign = 'center';
          input.style.textTransform = 'uppercase';
          input.style.letterSpacing = '0.06em';
          input.style.width = Math.max(240, Math.min(maxW, Math.floor(rect.width)+80)) + 'px';
          const iw = parseInt(input.style.width, 10);
          let left = Math.max(8, Math.min((vw - iw - 8), Math.floor(rect.left + rect.width/2 - iw/2)));
          let top = Math.max(8, Math.floor(rect.top - (rect.height/2) - 6));
          input.style.left = left + 'px';
          input.style.top = top + 'px';
          document.body.appendChild(input);
          const commit = ()=>{ const v = (input.value||'').trim(); windRoseTitleText = v; save(); draw(); try{ document.body.removeChild(input); }catch(_){/* noop */} };
          const cancel = ()=>{ try{ document.body.removeChild(input); }catch(_){/* noop */} };
          input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); commit(); } else if(e.key==='Escape'){ e.preventDefault(); cancel(); }});
          input.addEventListener('blur', commit);
          setTimeout(()=>{ try{ input.focus(); input.select(); }catch(_){/* noop */} }, 0);
        }catch(_){/* noop */}
      }
    });

    // Empty state
    if(!sites.length){
      window.PG.rose.drawEmptyState(svg);
      renderLists();
      return;
    }

    // defs container for text paths
    const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
    svg.appendChild(defs);

    // Build arcs from sites: compute UNION (for outer silhouette), GOOD, and OK-only per site
    const built = window.PG.layout.buildArcs(sites);
    let unionArcs = (built && built.unionArcs) || [];
    let goodArcs  = (built && built.goodArcs)  || [];
    let okOnlyArcs= (built && built.okOnlyArcs)|| [];

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

    // If modular renderer is available, delegate and return
    if(window.PG && window.PG.rose && typeof window.PG.rose.drawSegments === 'function'){
      const nameToSite = Object.fromEntries(sites.map(s=>[s.name, s]));
      const centerAverage = liveWindOn ? (function(){
        let use = sites.map(s=>s.weather?.now).filter(Boolean);
        const key = dayKeyForOffset(selectedDayOffset);
        if(selectedHour!==null){
          use = sites.map(s=>{ const arr = s.weather?.byDay?.[key]; if(Array.isArray(arr)){ const m = arr.find(it=> hourOf(it.ts||it.time)===selectedHour ); if(m) return { dirDeg:m.dirDeg, speedKph:m.speedKph }; } return s.weather?.now || null; }).filter(Boolean);
        } else if(selectedDayOffset>0){
          use = sites.map(s=>{ const arr = s.weather?.byDay?.[key]; if(Array.isArray(arr) && arr.length){ let sx=0, sy=0, sum=0; arr.forEach(w=>{ const rad=(w.dirDeg-90)*Math.PI/180; const wgt=Math.max(0.1, Number(w.speedKph)||0); sx+=Math.cos(rad)*wgt; sy+=Math.sin(rad)*wgt; sum += Number(w.speedKph)||0; }); const avgRad = Math.atan2(sy, sx); const avgDeg = clampDeg(avgRad*180/Math.PI + 90); return { dirDeg: avgDeg, speedKph: sum/arr.length }; } return s.weather?.now || null; }).filter(Boolean);
        }
        if(!use.length) return null;
        let sx=0, sy=0, speedSum=0; for(const w of use){ const rad=(w.dirDeg - 90) * Math.PI/180; const weight=Math.max(0.1, Number(w.speedKph)||0); sx += Math.cos(rad) * weight; sy += Math.sin(rad) * weight; speedSum += Number(w.speedKph)||0; }
        if(sx===0 && sy===0) return null; const avgRad = Math.atan2(sy, sx); const avgDeg = clampDeg(avgRad * 180/Math.PI + 90); return { dirDeg: avgDeg, speedKph: speedSum / use.length };
      })() : null;
      window.PG.rose.drawSegments(svg, {
        cx, cy,
        DIRS,
        padDeg: GAP_DEG,
        padPx: GAP_PX,
        globalRotateDeg: GLOBAL_ROTATE_DEG,
        layout,
        unionArcs, goodArcs, okOnlyArcs,
        liveWindOn, hideSitesOutside, expandIsolatedSegments,
        reorderMode, manualRingTargets, lastAssignedRings,
        ringOrder, longNamesOut,
        formatSpeed, nameToSite, windForSelection, debugWindDecision,
        labelRadius, autoCenterLabels, LABEL_MAX_PX,
        animateSiteIds,
        selectedDayOffset,
        centerAverage,
        showTip, hideTip, moveTip,
        darkerOf,
        save: ()=>save(),
        redraw: ()=>draw()
      });
      renderLists();
      if(animateSiteIds.size){ setTimeout(()=>{ animateSiteIds.clear(); }, 1200); }
      return;
    }

    // Fallback renderer removed; rely on PG.rose.drawSegments only
    renderLists();
    if(animateSiteIds.size){ setTimeout(()=>{ animateSiteIds.clear(); }, 1200); }
  }

  // ------------------------------
  // UI: list + legend
  // ------------------------------
  function formatSpeed(kph){ return window.PG.units.formatSpeed(kph, units); }

  function renderLists(){ return window.PG.legend.renderLists({ sites, selectedDayOffset, DIRS, dayKeyForOffset, sectorBounds, contiguousRanges, clampDeg, formatSpeed }); }

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
    return await window.PG.wx.fetchSiteWeather({ lat, lng, model: weatherModel });
  }

  // ------------------------------
  // Weather model helpers
  // ------------------------------
  function modelNameFor(val){ return window.PG.model.modelNameFor(val); }

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
    return await window.PG.model.applyModelChange(newModel, {
      setModel: (m)=>{ weatherModel = m; },
      sites,
      fetchSiteWeather,
      save,
      draw,
      renderWxInfo,
      modelNameFor
    });
  }

  // ------------------------------
  // Shareable state (URL hash)
  // ------------------------------
  function base64Encode(str){ try{ return btoa(unescape(encodeURIComponent(str))); }catch(_){ return btoa(str); } }
  function base64Decode(str){ try{ return decodeURIComponent(escape(atob(str))); }catch(_){ return atob(str); } }
  function buildSharePayload(){ return { t: windRoseTitleText||'', names: (sites||[]).map(s=> s.name) }; }
  function buildShareUrl(){
    const base = location.origin + location.pathname + location.search;
    const titleParam = 'title=' + encodeURIComponent(windRoseTitleText||'');
    const list = (sites||[]).map(s=> s.name).join(',');
    const sitesParam = 'sites=' + encodeURIComponent(list);
    return base + '#' + titleParam + '&' + sitesParam;
  }
  function buildEmbedUrl(){
    const path = location.pathname.replace(/[^/]*$/, 'embed.html');
    const base = location.origin + path + location.search;
    const titleParam = 'title=' + encodeURIComponent(windRoseTitleText||'');
    const list = (sites||[]).map(s=> s.name).join(',');
    const sitesParam = 'sites=' + encodeURIComponent(list);
    return base + '#' + titleParam + '&' + sitesParam;
  }
  function parseHash(){
    const h = (location.hash||'').replace(/^#/, '');
    const params = new URLSearchParams(h);
    return params.get('s') || null; // legacy support only
  }
  let pendingShareNames = null;
  function importSitesByNames(names){
    if(!Array.isArray(names) || !names.length) return false;
    const toAdd = [];
    names.forEach(n=>{
      const name = String(n||'').trim(); if(!name) return;
      const exists = sites.some(s=> s.name.toLowerCase()===name.toLowerCase());
      if(exists) return;
      let recIdx = -1; let rec = null;
      for(let i=0;i<catalogData.length;i++){ const r=catalogData[i]; const nm=nameFromRecord(r,i); if(String(nm).toLowerCase()===name.toLowerCase()){ rec=r; recIdx=i; break; } }
      if(rec){ const site = normaliseRecord(rec, recIdx); toAdd.push(site); }
      else { toAdd.push({ id: uid(), name, color: colourFromString(name), good: [], ok: [] }); }
    });
    if(!toAdd.length) return false;
    toAdd.forEach(site=>{ sites.push(site); animateSiteIds.add(site.id); });
    save(); draw();
    rebuildBlockedIndexSet();
    renderMarkers(false);
    try{ toAdd.forEach(site=>{ const lat=Number(site?.lat), lng=Number(site?.lng); if(Number.isFinite(lat)&&Number.isFinite(lng)){ fetchSiteWeather(lat,lng).then(w=>{ if(w){ site.weather=w; save(); draw(); } }); } }); }catch(_){/* noop */}
    return true;
  }

  function applyShareFromHash(){
    const token = parseHash();
    try{
      const h = (location.hash||'').replace(/^#/, '');
      const params = new URLSearchParams(h);
      const titleParam = params.get('title');
      if(titleParam!==null) windRoseTitleText = decodeURIComponent(titleParam);

      const namesParam = params.get('sites');
      let imported = false;
      if(namesParam){
        const names = decodeURIComponent(namesParam).split(',').map(x=>x.trim()).filter(Boolean);
        if(catalogData && catalogData.length){ imported = importSitesByNames(names); }
        else { pendingShareNames = names; imported = true; }
      }
      if(token){
        const json = base64Decode(token);
        const data = JSON.parse(json);
        if(data && Array.isArray(data.sites)){
          // legacy: replace sites from payload
          sites = data.sites.map(s=>({ id: uid(), name: s.name, color: s.color||colourFromString(s.name), good: s.good||[], ok: s.ok||[], angleOffsetDeg: s.angleOffsetDeg||0, lat: s.lat, lng: s.lng }));
          save(); imported = true;
          try{ (sites||[]).forEach(s=>{ const lat=Number(s?.lat), lng=Number(s?.lng); if(Number.isFinite(lat)&&Number.isFinite(lng)){ fetchSiteWeather(lat,lng).then(w=>{ if(w){ s.weather=w; save(); draw(); } }); } }); }catch(_){/* noop */}
        }
        if(!titleParam && typeof data.t==='string') windRoseTitleText = data.t;
      }
      if(titleParam!==null) save();
      return imported || titleParam!==null;
    }catch(err){ console.warn('Bad share hash', err); return false; }
  }

  // Directions helpers -> delegate to module
  function mapIndices(arr){ try{ if(window.PG && window.PG.directions && window.PG.directions.mapIndices){ return window.PG.directions.mapIndices(arr); } }catch(_){/* noop */} return []; }

  

  function normaliseRecord(s, idx){ try{ if(window.PG && window.PG.catalog && window.PG.catalog.normaliseRecord){ return window.PG.catalog.normaliseRecord(s, idx); } }catch(_){/* noop */}
    const name = nameFromRecord(s, idx); const color = colourFromString(name); return { id: uid(), name, good:[], ok:[], color, angleOffsetDeg:0 };
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
    let entries = catalogData.map((rec, i)=> ({ idx: i, name: nameFromRecord(rec, i) }));
    try{ if(window.PG && window.PG.catalog && window.PG.catalog.buildEntries){ entries = window.PG.catalog.buildEntries(catalogData, nameFromRecord); } }catch(_){/* noop */}
    catalogEntries = entries;
    buildCatalogFuseIndex();
    entries.forEach(({idx, name})=>{
      const opt = document.createElement('option');
      opt.value = String(idx); // preserve original index for selection handler
      opt.textContent = name;
      catalogSelect.appendChild(opt);
    });
  }

  function initCatalogTypeahead(){ try{ if(window.PG && window.PG.catalogUI && window.PG.catalogUI.initTypeahead){ return window.PG.catalogUI.initTypeahead(catalogEntries); } }catch(_){/* noop */} }

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
      rebuildBlockedIndexSet();
      fillCatalogSelect();
      initCatalogTypeahead();
      if(catalogHint) catalogHint.textContent = '';
      initMap();
      if(pendingShareNames && pendingShareNames.length){
        importSitesByNames(pendingShareNames);
        pendingShareNames = null;
      }
    }catch(err){
      if(catalogHint) catalogHint.textContent = 'Could not load catalog. Check data/sites.json or use Import JSON.';
      if(catalogSelect){ catalogSelect.innerHTML = '<option value="">Load failed</option>'; }
    }
  }

  // ------------------------------
  // Map: display catalog sites and allow selection
  // ------------------------------
  let map, markerLayer;
  // Catalog indices that are already present in the wind rose (blocked from selection)
  let blockedIndices = new Set();
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

  function updateRadiusHint(){ window.PG.map.updateRadiusHint(radiusCenter, radiusHint); }

  function drawRadiusCircle(){
    const radius = parseFloat(radiusInput?.value || radiusKm);
    radiusKm = radius;
    if(radiusCircle && map){ try{ map.removeLayer(radiusCircle); }catch(_){/* noop */} }
    manualDeselected.clear();
    radiusCircle = window.PG.map.drawRadiusCircle({ map, radiusCenter, radiusKm, markerLayer, manualSelected, manualDeselected, selectedIds, radiusHintEl: radiusHint });
    log('Drew radius circle', { center: radiusCenter, radius: radiusKm });
  }

  function updateRadiusCircle(){ const radius = parseFloat(radiusInput?.value || radiusKm); radiusKm = radius; window.PG.map.updateRadiusCircle({ radiusCircle, radiusKm, markerLayer, radiusCenter, manualSelected, manualDeselected, selectedIds, radiusHintEl: radiusHint }); }

  function clearRadiusCircle(){ window.PG.map.clearRadiusCircle({ map, radiusCircle, radiusCenterRef: radiusCenter ? radiusCenter : null, manualDeselected, markerLayer, selectedIds, manualSelected, updateSelectionUI: (n)=>updateMapSelectionUI(), radiusHintEl: radiusHint }); radiusCircle = null; radiusCenter = null; log('Cleared radius circle'); }

  // ------------------------------
  // Polygon utilities
  // ------------------------------
  function updatePolygonSelection(){ window.PG.map.updatePolygonSelection({ polygon, markerLayer, manualSelected, manualDeselected, selectedIds, updateSelectionUI: (n)=>updateMapSelectionUI(), polyHintEl: polyHint }); }

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
          // Block markers that are already in the wind rose
          if(blockedIndices && blockedIndices.has(key)){
            selectedIds.delete(key);
            applyMarkerVisual(layer, false);
            return; // skip blocked marker
          }
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

  function isClosedRecord(rec){
    try{
      const v = rec && rec.closed;
      if(v===true) return true;
      if(v===false) return false;
      const s = String(v||'').toLowerCase();
      return s==='true' || s==='yes' || s==='closed';
    }catch(_){ return false; }
  }

  function rebuildBlockedIndexSet(){
    try{
      const names = new Set((sites||[]).map(s=> String(s.name||'').toLowerCase()).filter(Boolean));
      const next = new Set();
      for(let i=0;i<catalogData.length;i++){
        const rec = catalogData[i];
        const nm = nameFromRecord(rec, i);
        if(names.has(String(nm||'').toLowerCase())) next.add(String(i));
      }
      blockedIndices = next;
      try{ window.PG = window.PG || {}; window.PG._blockedIndices = blockedIndices; }catch(_){/* noop */}
    }catch(_){ blockedIndices = new Set(); }
  }

  function toggleShowClosedOnMap(){
    showClosedOnMap = !showClosedOnMap;
    renderMarkers(false);
    if(mapHint){ mapHint.textContent = showClosedOnMap ? 'Closed sites are visible. Click markers to select.' : 'Closed sites are hidden. Press Ctrl+Shift+H to show them.'; }
  }

  function markerIcon(selected){ try{ if(window.PG && window.PG.map && window.PG.map.markerIcon){ return window.PG.map.markerIcon(selected); } }catch(_){/* noop */}
    const color = selected ? '#60a5fa' : '#38bdf8';
    const stroke = selected ? '#1e40af' : '#0c4a6e';
    return L.divIcon({ className: 'site-pin', html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid ${stroke};box-shadow:0 0 0 2px #0003"></div>`, iconSize: [16,16], iconAnchor: [8,8] });
  }

  function applyMarkerVisual(marker, isSelected){ try{ if(window.PG && window.PG.map && window.PG.map.applyMarkerVisual){ return window.PG.map.applyMarkerVisual(marker, isSelected); } }catch(_){/* noop */}
    marker.setIcon(markerIcon(isSelected)); marker.setOpacity(isSelected ? 1 : 0.3); if(marker._icon){ marker._icon.style.filter = isSelected ? 'brightness(1.2) drop-shadow(0 0 4px #3b82f6)' : 'grayscale(0.5)'; }
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
      if(!showClosedOnMap && isClosedRecord(rec)) return; // hide closed sites by default
      const isSel = selectedIds.has(String(i));
      const m = L.marker([ll.lat, ll.lng], { icon: markerIcon(isSel), siteIdx: i });
      m.on('click', ()=>{
        const key = String(i);
        if(blockedIndices && blockedIndices.has(key)) return; // not selectable while in wind rose
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
      rebuildBlockedIndexSet();
      renderMarkers(false);
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
    rebuildBlockedIndexSet();
    renderMarkers(false);
    // If a marker is selected on map, attach its lat/lng to site for weather (best-effort)
    // Otherwise weather will not be fetched for manual sites without coordinates
  });

  clearBtn.addEventListener('click', ()=>{
    if(!sites.length) return;
    if(confirm('Remove all sites?')){ sites = []; save(); draw(); rebuildBlockedIndexSet(); renderMarkers(false); }
  });

  siteList.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-act="delete"]');
    if(!btn) return;
    const id = btn.getAttribute('data-id');
    // If this site corresponds to a catalog entry, deselect its marker on the map
    try{
      const removed = (sites||[]).find(s=> s.id===id);
      const removedName = removed && removed.name ? String(removed.name).toLowerCase() : null;
      if(removedName){
        for(let i=0;i<catalogData.length;i++){
          const nm = String(nameFromRecord(catalogData[i], i)||'').toLowerCase();
          if(nm === removedName){
            const key = String(i);
            selectedIds.delete(key);
            manualSelected.delete(key);
            manualDeselected.delete(key);
            break;
          }
        }
      }
    }catch(_){/* noop */}
    sites = sites.filter(s=>s.id!==id);
    save();
    draw();
    rebuildBlockedIndexSet();
    renderMarkers(false);
    updateMapSelectionUI();
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
        sites.push(site); animateSiteIds.add(site.id); save(); draw(); rebuildBlockedIndexSet(); renderMarkers(false);
        if(Number.isFinite(site.lat) && Number.isFinite(site.lng)){
          fetchSiteWeather(site.lat, site.lng).then(w=>{ if(w){ site.weather=w; save(); draw(); }});
        }
      }
      // reset selection to placeholder
      catalogSelect.value = '';
    });
  }

  // export removed

  if(savePdfBtn){ savePdfBtn.addEventListener('click', async ()=>{ if(!sites.length){ alert('Add some launch sites before saving to PDF.'); return; } try{ savePdfBtn.disabled = true; if(window.PG && window.PG.export && typeof window.PG.export.saveRosePDF==='function'){ await window.PG.export.saveRosePDF({ svg, legendEl, titleText: windRoseTitleText, siteCount: sites.length }); } }catch(err){ console.error('PDF generation failed:', err); alert('Failed to generate PDF. Please try again.'); } finally{ savePdfBtn.disabled = false; } }); }

  if(printBtn){ printBtn.addEventListener('click', async ()=>{ try{ await window.PG.export.printRosePDF({ svg, legendEl, titleText: windRoseTitleText, siteCount: sites.length }); }catch(err){ console.warn('print failed', err); } }); }

  if(copyPngBtn){ copyPngBtn.addEventListener('click', async ()=>{ if(!sites.length){ alert('Add some launch sites before exporting.'); return; } try{ copyPngBtn.disabled = true; await window.PG.export.copyRosePNG({ svg, legendEl }); }catch(err){ console.error('PNG export failed:', err); alert('Failed to export PNG. Please try again.'); } finally{ copyPngBtn.disabled = false; } }); }
  if(embedBtn){ embedBtn.addEventListener('click', async ()=>{
    try{
      const url = buildEmbedUrl();
      const snippet = `<iframe src="${url}" width="640" height="640" style="border:0; max-width:100%; background:transparent" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
      if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(snippet); showModelToast('Embed code copied'); }
      else { prompt('Copy embed code:', snippet); }
    }catch(err){ console.warn('embed copy failed', err); }
  }); }

  // import removed

  if(shareBtn){ shareBtn.addEventListener('click', async ()=>{
    try{
      const url = buildShareUrl();
      if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(url); showModelToast('Share link copied'); }
      else { prompt('Copy link:', url); }
    }catch(err){ console.warn('share copy failed', err); }
  }); }

  // Apply shared state from URL, if any
  (function(){ if(applyShareFromHash()){ try{ draw(); renderWxInfo(); }catch(_){/* noop */} } })();
  window.addEventListener('hashchange', ()=>{ if(applyShareFromHash()){ draw(); renderWxInfo(); } });

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
        <label id="hideOutsideLabelMobile" class="toggle-stack"><input id="hideOutsideToggleCard" type="checkbox" /> <span>Direction</span></label>
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
    try{ if(window.PG && window.PG.unitsUI && window.PG.unitsUI.initMobile){ window.PG.unitsUI.initMobile({ getUnits: ()=>units, setUnits: (m)=>{ units=m; save(); draw(); } }); } }catch(_){/* noop */}
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
  try{ if(window.PG && window.PG.unitsUI && window.PG.unitsUI.initDesktop){ window.PG.unitsUI.initDesktop({ getUnits: ()=>units, setUnits: (m)=>{ units=m; save(); draw(); } }); } }catch(_){/* noop */}
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
  // Advanced buttons (toggle states, themes, shuffle colours)
  // ------------------------------
  (function initAdvancedButtons(){
    const reorderBtn = document.getElementById('reorderBtn');
    const expandBtn = document.getElementById('expandBtn');
    const longNamesBtn = document.getElementById('longNamesOutBtn');
    const longSegBtn = document.getElementById('longSegInnerBtn');
    const showDegBtn = document.getElementById('showDegreesBtn');
    const shuffleBtn = document.getElementById('shuffleColorsBtn');
    const themeBtn = document.getElementById('themeCycleBtn');
    const openThemeBtn = document.getElementById('openThemeBtn');
    const themePanel = document.getElementById('themePanel');
    const themeCloseBtn = document.getElementById('themeCloseBtn');
    const themeGrid = document.getElementById('themeGrid');
    const gradStopsEl = document.getElementById('gradStops');
    const gradPreview = document.getElementById('gradPreview');
    const addGradStopBtn = document.getElementById('addGradStopBtn');
    const applyGradBtn = document.getElementById('applyGradientBtn');
    const gradBlock = document.getElementById('gradBlock');
    function setPressed(el, on){ if(el){ el.setAttribute('aria-pressed', on ? 'true' : 'false'); try{ el.classList.toggle('active', !!on); el.style.background=''; el.style.boxShadow=''; }catch(_){/* noop */} } }
    function sync(){ setPressed(reorderBtn, !!reorderMode); setPressed(expandBtn, !!expandIsolatedSegments); setPressed(longNamesBtn, !!longNamesOut); setPressed(longSegBtn, ringOrder==='long'); const ov=document.getElementById('showDegrees'); setPressed(showDegBtn, !!(ov && ov.checked)); }
    if(reorderBtn){ reorderBtn.addEventListener('click', ()=>{ reorderMode=!reorderMode; save(); draw(); sync(); }); }
    if(expandBtn){ expandBtn.addEventListener('click', ()=>{ expandIsolatedSegments=!expandIsolatedSegments; save(); draw(); sync(); }); }
    if(longNamesBtn){ longNamesBtn.addEventListener('click', ()=>{ longNamesOut=!longNamesOut; save(); draw(); sync(); }); }
    if(longSegBtn){ longSegBtn.addEventListener('click', ()=>{ ringOrder = (ringOrder==='long') ? 'short' : 'long'; save(); draw(); sync(); }); }
    if(showDegBtn){ showDegBtn.addEventListener('click', ()=>{ const ov=document.getElementById('showDegrees'); if(ov){ ov.checked = !ov.checked; } draw(); sync(); }); }
    function hsl(h){ return `hsl(${h} 70% 55%)`; }
    function shuffleColours(){ const base = Math.random()*360; const phi = 137.508; (sites||[]).forEach((s,i)=>{ s.color = hsl((base + i*phi)%360); }); save(); draw(); }
    let themeIdx = 0; const themes = [
      { name:'Ocean', hues:[200, 210, 190, 220, 180, 205] },
      { name:'Sunset', hues:[15, 340, 10, 30, 5, 25] },
      { name:'Forest', hues:[120, 140, 100, 160, 110, 130] },
      { name:'Metro', hues:[260, 280, 300, 240, 320, 290] },
      { name:'Pastel', hues:[330, 20, 50, 140, 200, 260] },
      { name:'Warm', hues:[10, 25, 40, 8, 18, 35] },
      { name:'Cool', hues:[185, 205, 225, 245, 265, 285] },
      { name:'Mono Blue', hues:[205, 205, 205, 205, 205, 205] }
    ];
    function applyThemeByIndex(idx){ const t = themes[idx % themes.length]; (sites||[]).forEach((s,i)=>{ s.color = hsl(t.hues[i % t.hues.length]); }); if(gradBlock){ gradBlock.style.display='none'; } save(); draw(); }
    function applyTheme(){ applyThemeByIndex(themeIdx); themeIdx++; }
    function renderThemeGrid(){ if(!themeGrid) return; themeGrid.innerHTML=''; themes.forEach((t, i)=>{ const btn=document.createElement('button'); btn.className='secondary'; btn.textContent=t.name; btn.style.padding='6px 10px'; btn.style.borderRadius='8px'; const stops=t.hues.map((h,j)=>`hsl(${h} 70% 55%) ${(j/(t.hues.length-1))*100}%`).join(','); btn.style.background=`linear-gradient(90deg, ${stops})`; btn.style.color='#e5e7eb'; btn.style.border='1px solid #1f2937'; btn.style.textAlign='left'; btn.style.width='100%'; btn.addEventListener('click', ()=>{ applyThemeByIndex(i); }); themeGrid.appendChild(btn); }); const custom=document.createElement('button'); custom.className='secondary'; custom.textContent='Custom…'; custom.style.padding='6px 10px'; custom.style.borderRadius='8px'; custom.style.width='100%'; custom.addEventListener('click', ()=>{ if(gradBlock){ gradBlock.style.display='block'; try{ gradBlock.scrollIntoView({ behavior:'smooth', block:'start' }); }catch(_){/* noop */} } }); themeGrid.appendChild(custom); }
    function hexToRgb(hex){ const s=String(hex||'').replace('#',''); if(s.length===3){ const r=parseInt(s[0]+s[0],16), g=parseInt(s[1]+s[1],16), b=parseInt(s[2]+s[2],16); return {r,g,b}; } const r=parseInt(s.slice(0,2),16), g=parseInt(s.slice(2,4),16), b=parseInt(s.slice(4,6),16); return {r,g,b}; }
    function rgbToHsl(r,g,b){ r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s=0,l=(max+min)/2; if(max!==min){ const d=max-min; s=l>0.5? d/(2-max-min) : d/(max+min); switch(max){ case r: h=(g-b)/d + (g<b?6:0); break; case g: h=(b-r)/d + 2; break; case b: h=(r-g)/d + 4; break; } h*=60; } s*=100; l*=100; return { h, s, l }; }
    function lerp(a,b,t){ return a + (b-a)*t; }
    function lerpHue(a,b,t){ let d=((b-a+540)%360)-180; return (a + d*t + 360)%360; }
    function hslToCss(hsl){ return `hsl(${Math.round(hsl.h)} ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%)`; }
    function cssToHsl(css){ try{ if(!css) return {h:200,s:70,l:55}; if(css.startsWith('#')){ const {r,g,b}=hexToRgb(css); return rgbToHsl(r,g,b); } const m=/hsl\(([^\)]+)\)/i.exec(css); if(m){ const parts=m[1].trim().split(/\s+/); const h=parseFloat(parts[0]); const s=parseFloat(parts[1]); const l=parseFloat(parts[2]); return {h,s,l}; } return {h:200,s:70,l:55}; }catch(_){ return {h:200,s:70,l:55}; } }
    function updateGradPreview(stops){ if(!gradPreview) return; const stopsCss = stops.map(s=> `${s.color} ${s.pos}%`).join(', '); gradPreview.style.background = `linear-gradient(90deg, ${stopsCss})`; }
    function renderGradHandles(stops){ if(!gradPreview) return; // remove existing handles
      Array.from(gradPreview.querySelectorAll('.grad-handle')).forEach(n=> n.remove());
      const rect = gradPreview.getBoundingClientRect();
      const makeHandle = (stop)=>{
        const h = document.createElement('div'); h.className='grad-handle'; h.setAttribute('role','slider'); h.setAttribute('aria-valuemin','0'); h.setAttribute('aria-valuemax','100'); h.setAttribute('aria-valuenow', String(Math.round(stop.pos)));
        h.style.position='absolute'; h.style.left = `calc(${stop.pos}% - 6px)`; h.style.top='-4px'; h.style.width='12px'; h.style.height='22px'; h.style.border='1px solid #334155'; h.style.borderRadius='3px'; h.style.background= stop.color || '#22c55e'; h.style.boxShadow='0 1px 3px rgba(0,0,0,.4)'; h.style.cursor='ew-resize';
        const onMove = (e)=>{ const r = gradPreview.getBoundingClientRect(); const x = (e.touches? e.touches[0].clientX : e.clientX) - r.left; const pct = Math.max(0, Math.min(100, (x / Math.max(1,r.width))*100)); stop.pos = Math.round(pct); h.style.left = `calc(${stop.pos}% - 6px)`; h.setAttribute('aria-valuenow', String(Math.round(stop.pos))); renderGradStops(gradientStops); renderGradHandles(gradientStops); updateGradPreview(gradientStops); };
        const up = ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', up); };
        h.addEventListener('mousedown', (e)=>{ e.preventDefault(); window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', up); });
        h.addEventListener('touchstart', (e)=>{ e.preventDefault(); window.addEventListener('touchmove', onMove, { passive:false }); window.addEventListener('touchend', up); }, { passive:false });
        gradPreview.appendChild(h);
      };
      const sorted=[...stops].sort((a,b)=> a.pos-b.pos); sorted.forEach(makeHandle);
    }
    function renderGradStops(stops){ if(!gradStopsEl) return; gradStopsEl.innerHTML=''; const sorted=[...stops].sort((a,b)=> a.pos-b.pos); sorted.forEach((stop, idx)=>{ const row=document.createElement('div'); row.className='row'; row.style.gap='8px'; row.style.alignItems='center'; const color=document.createElement('input'); color.type='color'; color.value = (stop.color || '#22c55e'); const pos=document.createElement('input'); pos.type='number'; pos.min='0'; pos.max='100'; pos.step='1'; pos.value=String(Math.round(stop.pos)); pos.style.width='70px'; const rm=document.createElement('button'); rm.className='secondary'; rm.textContent='Remove'; rm.addEventListener('click', ()=>{ const i=stops.indexOf(stop); if(i> -1 && stops.length>2){ stops.splice(i,1); renderGradStops(stops); updateGradPreview(stops); renderGradHandles(stops); } }); color.addEventListener('input', ()=>{ stop.color = color.value; updateGradPreview(stops); renderGradHandles(stops); }); pos.addEventListener('input', ()=>{ let v=Number(pos.value); if(!Number.isFinite(v)) v=0; v=Math.max(0, Math.min(100, v)); stop.pos=v; renderGradStops(stops); updateGradPreview(stops); renderGradHandles(stops); }); row.appendChild(color); const lab=document.createElement('span'); lab.className='mono'; lab.textContent='at %'; row.appendChild(pos); row.appendChild(lab); row.appendChild(rm); gradStopsEl.appendChild(row); }); }
    const gradientStops = [ { color:'#22c55e', pos:0 }, { color:'#0ea5e9', pos:100 } ];
    function addStop(){ const sorted=[...gradientStops].sort((a,b)=> a.pos-b.pos); let bestGap=-1, ai=0, bi=1; for(let i=0;i<sorted.length-1;i++){ const g=sorted[i+1].pos - sorted[i].pos; if(g>bestGap){ bestGap=g; ai=i; bi=i+1; } } const a=sorted[ai], b=sorted[bi]; const mid = Math.round((a.pos + b.pos)/2); const h1=cssToHsl(a.color), h2=cssToHsl(b.color); const t = (mid - a.pos)/Math.max(1,(b.pos - a.pos)); const h={ h: lerpHue(h1.h,h2.h,t), s: lerp(h1.s,h2.s,t), l: lerp(h1.l,h2.l,t) }; gradientStops.push({ color: hslToCss(h), pos: mid }); renderGradStops(gradientStops); updateGradPreview(gradientStops); }
    function applyGradient(){ if(!sites||!sites.length) return; const stops=[...gradientStops].sort((a,b)=> a.pos-b.pos); const n=sites.length; for(let i=0;i<n;i++){ const t=i/(Math.max(1,n-1))*100; let j=0; while(j<stops.length-1 && t>stops[j+1].pos) j++; const a=stops[Math.max(0,j)], b=stops[Math.min(stops.length-1, j+1)]; const span=Math.max(1, b.pos - a.pos); const tt = Math.max(0, Math.min(1, (t - a.pos)/span)); const h1=cssToHsl(a.color), h2=cssToHsl(b.color); const h={ h: lerpHue(h1.h,h2.h,tt), s: lerp(h1.s,h2.s,tt), l: lerp(h1.l,h2.l,tt) }; sites[i].color = hslToCss(h); }
      save(); draw(); }
    if(shuffleBtn){ shuffleBtn.addEventListener('click', shuffleColours); }
    if(themeBtn){ themeBtn.addEventListener('click', ()=>{ applyTheme(); }); }
    renderThemeGrid();
    if(addGradStopBtn){ addGradStopBtn.addEventListener('click', addStop); }
    if(applyGradBtn){ applyGradBtn.addEventListener('click', applyGradient); }
    renderGradStops(gradientStops); updateGradPreview(gradientStops); renderGradHandles(gradientStops);
    function openTheme(){ if(themePanel){ themePanel.style.display='block'; setTimeout(()=>{ try{ themePanel.focus(); }catch(_){/* noop */} },0); } }
    function closeTheme(){ if(themePanel){ themePanel.style.display='none'; } }
    if(openThemeBtn){ openThemeBtn.addEventListener('click', (e)=>{ e.preventDefault(); openTheme(); }); }
    if(themeCloseBtn){ themeCloseBtn.addEventListener('click', closeTheme); }
    if(themePanel){ themePanel.addEventListener('click', (e)=>{ if(e.target===themePanel) closeTheme(); }); }
    window.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeTheme(); } });
    sync();
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
    try{ if(window.PG && window.PG.model && window.PG.model.renderWxInfo){ return window.PG.model.renderWxInfo(weatherModel); } }catch(_){/* noop */}
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
    return window.PG.carousel.initCarouselViewport(viewportId, trackId);
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
    return window.PG.carousel.centerInCarousel(viewportId, el);
    const vp = document.getElementById(viewportId);
    if(!vp || !el) return;
    const target = Math.max(0, el.offsetLeft - (vp.clientWidth - el.offsetWidth)/2);
    try{ vp.scrollTo({ left: target, behavior: 'smooth' }); }catch(_){ vp.scrollLeft = target; }
  }

  // Keyboard shortcut is handled by ui/hotkeys.js when present
  if(!(window.PG && window.PG.hotkeys && window.PG.hotkeys.bound)){
    window.addEventListener('keydown', async (e)=>{
      try{
        const isMac = navigator.platform && /Mac/i.test(navigator.platform);
        const ctrlOrMeta = isMac ? e.metaKey : e.ctrlKey;
        if(ctrlOrMeta && e.shiftKey && (e.key==='M' || e.key==='m')){
          e.preventDefault();
          const next = (weatherModel && weatherModel !== 'default') ? 'default' : 'ukmo_seamless';
          await applyModelChange(next);
        } else if(ctrlOrMeta && e.shiftKey && (e.key==='H' || e.key==='h')){
          e.preventDefault();
          toggleShowClosedOnMap();
        }
      }catch(_){/* noop */}
    });
  }

  // Title input handler
  if(windRoseTitle){
    // Hide legacy sidebar title input; title is now edited inline on the SVG
    const row = windRoseTitle.closest('.row'); if(row) row.style.display = 'none';
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
  try{ window.PG = window.PG || {}; window.PG._save = save; window.PG._draw = draw; window.PG._fetchSiteWeather = fetchSiteWeather; window.PG._sites = sites; window.PG._setModel = (m)=>{ weatherModel = m; }; window.PG._toggleShowClosed = ()=>toggleShowClosedOnMap(); window.PG._blockedIndices = blockedIndices; }catch(_){/* noop */}
})();
