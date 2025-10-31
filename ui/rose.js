;(function initRose(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function drawGuides(svg, ctx){
    const cfg = window.PG.config||{};
    const cx = ctx.cx ?? (cfg.center?cfg.center.x:430);
    const cy = ctx.cy ?? (cfg.center?cfg.center.y:430);
    const guideRadius = ctx.guideRadius ?? cfg.guideRadius ?? 330;
    const CORE_MARGIN = ctx.coreMargin ?? cfg.coreMargin ?? 70;
    const SECTOR_DEG = (window.PG.layout && window.PG.layout.SECTOR_DEG) || 22.5;
    const clampDeg = (window.PG.layout && window.PG.layout.clampDeg) || (a=>{ a%=360; if(a<0) a+=360; return a; });
    const polar = (r,deg)=> (window.PG.svg && window.PG.svg.polarToXY) ? window.PG.svg.polarToXY(cx,cy,r,deg) : (function(){ const t=(deg-90)*Math.PI/180; return [cx + r*Math.cos(t), cy + r*Math.sin(t)]; })();
    const DIRS = ctx.DIRS || ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

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

    // Central hub
    const hub = document.createElementNS('http://www.w3.org/2000/svg','circle');
    hub.setAttribute('cx', cx); hub.setAttribute('cy', cy); hub.setAttribute('r', CORE_MARGIN - 2);
    hub.setAttribute('fill', '#0b1222'); hub.setAttribute('stroke','none');
    svg.appendChild(hub);

    // Spokes and labels
    DIRS.forEach((d,i)=>{
      const ang = i * SECTOR_DEG;
      const p0 = polar(10, ang); const p1 = polar(guideRadius, ang);
      const spoke = document.createElementNS('http://www.w3.org/2000/svg','line');
      spoke.setAttribute('x1', p0[0]); spoke.setAttribute('y1', p0[1]);
      spoke.setAttribute('x2', p1[0]); spoke.setAttribute('y2', p1[1]);
      spoke.setAttribute('stroke', i%2===0 ? '#3b475d' : '#253144');
      spoke.setAttribute('stroke-width', i%2===0 ? 1.6 : 1);
      svg.appendChild(spoke);

      const pl = polar(guideRadius + 35, ang);
      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      label.textContent = d; label.setAttribute('x', pl[0]); label.setAttribute('y', pl[1]);
      label.setAttribute('fill', '#cbd5e1'); label.setAttribute('font-size', '12'); label.setAttribute('text-anchor','middle'); label.setAttribute('dominant-baseline','central');
      if(['N','S','E','W'].includes(d)){ label.setAttribute('font-weight','bold'); label.setAttribute('font-size','16'); }
      if(ctx.showTip && ctx.hideTip && ctx.moveTip){
        label.addEventListener('mouseenter', ()=> ctx.showTip(d));
        label.addEventListener('mouseleave', ctx.hideTip);
        label.addEventListener('mousemove', ctx.moveTip);
      }
      svg.appendChild(label);

      if(ctx.showDegrees && ctx.showDegrees.checked){
        const tickDeg = (ang+360)%360;
        const pt = polar(guideRadius + 15, ang);
        const t = document.createElementNS('http://www.w3.org/2000/svg','text');
        t.textContent = String(tickDeg).padStart(3,'0');
        t.setAttribute('x', pt[0]); t.setAttribute('y', pt[1]);
        t.setAttribute('fill', '#6b7280'); t.setAttribute('font-size','10'); t.setAttribute('text-anchor','middle'); t.setAttribute('dominant-baseline','central');
        svg.appendChild(t);
      }
    });

           {
             const raw = (ctx.titleText||'').trim();
             const g = document.createElementNS('http://www.w3.org/2000/svg','g');
             g.setAttribute('class','svg-title');
             const title = document.createElementNS('http://www.w3.org/2000/svg','text');
             const isMobile = (typeof window!=='undefined' && window.matchMedia) ? window.matchMedia('(max-width: 768px)').matches : false;
             const bottomMargin = isMobile ? (24 + (ctx.titleOffsetMobilePx??-16)) : (24 + (ctx.titleOffsetDesktopPx??-16));
             const posY = (cy*2 - bottomMargin);
             title.setAttribute('x', cx); title.setAttribute('y', String(posY));
             title.setAttribute('text-anchor','middle');
             title.setAttribute('dominant-baseline','text-after-edge');
             title.style.cursor = 'text';
             title.setAttribute('role','button');
             title.setAttribute('aria-label','Edit wind rose title');
             if(raw){
               title.textContent = raw.toUpperCase();
               title.setAttribute('fill', '#e2e8f0');
               title.setAttribute('font-size','24');
               title.setAttribute('font-weight','800');
             } else {
               title.textContent = isMobile ? 'Tap to set title' : 'Click to set title';
               title.setAttribute('fill', '#94a3b8');
               title.setAttribute('font-size','18');
               title.setAttribute('font-weight','700');
               title.setAttribute('opacity','0.9');
             }
             if(ctx.onEditTitle){
               const startEdit = (ev)=>{
                 try{
                   const r = title.getBoundingClientRect();
                   ctx.onEditTitle({ rect: r, isMobile, current: raw });
                 }catch(_){/* noop */}
                 ev.stopPropagation();
                 ev.preventDefault && ev.preventDefault();
               };
               title.setAttribute('tabindex','0');
               title.addEventListener('click', startEdit);
               title.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ startEdit(e); }});
               title.addEventListener('touchstart', startEdit, { passive: false });
             }
             if(ctx.showTip && ctx.hideTip && ctx.moveTip && raw){
               title.addEventListener('mouseenter', ()=> ctx.showTip(raw));
               title.addEventListener('mouseleave', ctx.hideTip);
               title.addEventListener('mousemove', ctx.moveTip);
             }
             g.appendChild(title);

             // Subtle edit hint (pencil) that fades in on hover/focus
             const hint = document.createElementNS('http://www.w3.org/2000/svg','text');
             hint.textContent = '✎';
             hint.setAttribute('fill', '#94a3b8');
             hint.setAttribute('font-size','14');
             hint.setAttribute('font-weight','700');
             hint.setAttribute('opacity','0');
             hint.setAttribute('aria-hidden','true');
             hint.setAttribute('dominant-baseline','text-before-edge');
             // position after measuring title length
             setTimeout(()=>{
               try{
                 const len = title.getComputedTextLength ? title.getComputedTextLength() : 0;
                 const pad = 18;
                 const hx = Math.max(8, cx - Math.max(0, len/2 + pad));
                 const fs = Number(title.getAttribute('font-size')) || (raw ? 24 : 18);
                 const topY = posY - fs;
                 hint.setAttribute('x', String(hx));
                 hint.setAttribute('y', String(topY));
               }catch(_){/* noop */}
             }, 0);
             g.appendChild(hint);
            // First-load hints: pencil fades in; empty title pulses. Show once.
            try{
              const seen = (function(){ try{ return localStorage.getItem('windrose-hints')==='1'; }catch(_){ return true; } })();
              if(!seen){
                if(!raw){ title.classList.add('empty-title-pulse'); }
                hint.classList.add('pencil-hint-intro');
                try{ localStorage.setItem('windrose-hints', '1'); }catch(_){/* noop */}
              }
            }catch(_){/* noop */}
             g.addEventListener('mouseenter', ()=>{ hint.setAttribute('opacity','0.7'); });
             g.addEventListener('mouseleave', ()=>{ hint.setAttribute('opacity','0'); });
             svg.appendChild(g);
           }
  }
  window.PG.rose = { drawGuides };
  
  function drawSegments(svg, ctx){
    const cfg = window.PG.config||{};
    const cx = ctx.cx ?? (cfg.center?cfg.center.x:430);
    const cy = ctx.cy ?? (cfg.center?cfg.center.y:430);
    const padDeg = ctx.padDeg ?? 0.8; // legacy; kept for API compatibility
    const gapPx = Math.max(0, ctx.padPx ?? 4); // desired constant gap between segments in pixels (narrower default)
    const gapBias = Number.isFinite(ctx.padBias) ? ctx.padBias : 1.0; // keep gap centered around spokes
    const DIRS = ctx.DIRS;
    const polar = (r,deg)=> (window.PG.svg && window.PG.svg.polarToXY) ? window.PG.svg.polarToXY(cx,cy,r,deg) : (function(){ const t=(deg-90)*Math.PI/180; return [cx + r*Math.cos(t), cy + r*Math.sin(t)]; })();
    const annular = (r0,r1,a0,span)=> (window.PG.svg && window.PG.svg.annularSectorPath) ? window.PG.svg.annularSectorPath(cx,cy,r0,r1,a0,span) : '';
    // Build an annular sector where inner/outer edges are trimmed so the visible gap is constant in pixels
    const annularSkew = (r0, r1, a0, span)=>{
      const toDeg = 180/Math.PI;
      const padInner = (r0>0 && gapPx>0) ? (gapPx*0.5 / r0) * toDeg * gapBias : 0;
      const padOuter = (r1>0 && gapPx>0) ? (gapPx*0.5 / r1) * toDeg : 0;
      const a0o = clampDeg(a0 + padOuter);
      const a1o = clampDeg(a0 + Math.max(0, span - padOuter*2));
      const a0i = clampDeg(a0 + (span<=0?0:padInner));
      const a1i = clampDeg(a0 + Math.max(0, span - padInner*2));
      const largeOuter = ((a1o - a0o + 360) % 360) > 180 ? 1 : 0;
      const largeInner = ((a1i - a0i + 360) % 360) > 180 ? 1 : 0;
      const os = polar(r1, a0o); const oe = polar(r1, a1o);
      const ie = polar(r0, a1i); const is = polar(r0, a0i);
      return [
        `M ${os[0]} ${os[1]}`,
        `A ${r1} ${r1} 0 ${largeOuter} 1 ${oe[0]} ${oe[1]}`,
        `L ${ie[0]} ${ie[1]}`,
        `A ${r0} ${r0} 0 ${largeInner} 0 ${is[0]} ${is[1]}`,
        'Z'
      ].join(' ');
    };
    const arcText = (r,a0,span,rev)=> (window.PG.svg && window.PG.svg.arcTextPathD) ? window.PG.svg.arcTextPathD(cx,cy,r,a0,span,!!rev) : '';
    const rot = Number.isFinite(ctx.globalRotateDeg) ? ctx.globalRotateDeg : 0;
    const clampDeg = (window.PG.layout && window.PG.layout.clampDeg) || (a=>{ a%=360; if(a<0) a+=360; return a; });
    const overlaps = (a,b)=> (window.PG.layout && window.PG.layout.overlaps) ? window.PG.layout.overlaps(a,b) : false;
    const overlapsOpen = (a,b)=> (window.PG.layout && window.PG.layout.overlapsOpen) ? window.PG.layout.overlapsOpen(a,b) : false;
    const assignRings = (arcs)=> (window.PG.layout && window.PG.layout.assignRings) ? window.PG.layout.assignRings(arcs, { ringOrder: ctx.ringOrder, longNamesOut: ctx.longNamesOut, manualRingTargets: ctx.manualRingTargets, lastAssignedRingsRef: ctx.lastAssignedRings }) : arcs;

    let { unionArcs=[], goodArcs=[], okOnlyArcs=[] } = ctx;

    if(!unionArcs.length) return;

    assignRings(unionArcs);
    unionArcs.sort((a,b)=> a.ring - b.ring || a.startDeg - b.startDeg);
    const ringFor = (arc)=>{ const host = unionArcs.find(u=> u.siteId===arc.siteId && overlaps(u, arc)); return host ? host.ring : 0; };
    goodArcs.forEach(a=> a.ring = ringFor(a));
    okOnlyArcs.forEach(a=> a.ring = ringFor(a));

    const layout = ctx.layout;

    // Helpers for DnD preview
    let previewPath = null; const removePreview = ()=>{ if(previewPath){ try{ svg.removeChild(previewPath); }catch(_){/* noop */} previewPath=null; } };
    const ringIsFree = (testRing, arcSelf)=> !unionArcs.some(v=> v!==arcSelf && v.ring===testRing && overlapsOpen(v, arcSelf));
    const findFreeRing = (desired, arcSelf)=>{ const totalRings = 1 + Math.max(...unionArcs.map(a=>a.ring)); const clampRing = r=> Math.max(0, Math.min(totalRings, r)); let span=0; for(;;){ const tries = span===0? [clampRing(desired)] : [clampRing(desired+span), clampRing(desired-span)]; for(const r of tries){ if(ringIsFree(r, arcSelf)) return r; } span++; if(span>totalRings+2) break; } return null; };

    for(const u of unionArcs){
      if(ctx.liveWindOn && ctx.hideSitesOutside){ const s = ctx.nameToSite[u.site]; if(!s) continue; const snap = ctx.windForSelection(s); if(!snap) continue; const dbg = ctx.debugWindDecision ? ctx.debugWindDecision(s, snap.dirDeg) : {inside:true}; if(!dbg.inside) continue; }
      const r0 = layout.inner + u.ring * (layout.width + layout.gap);
      let r1 = r0 + layout.width;
      if(ctx.expandIsolatedSegments){ const anyAbove = unionArcs.some(v=> v.ring > u.ring && overlapsOpen(v, u)); if(!anyAbove){ r1 = layout.outer; } }
      const hasOkOnly = okOnlyArcs.some(k=> k.siteId===u.siteId && overlaps(k,u));
      const aStart = clampDeg(u.startDeg + rot + (gapPx>0 ? (gapPx*0.5 / Math.max(1, (r0 + r1)/2)) * (180/Math.PI) : padDeg));
      const aSpan  = Math.max(0, u.spanDeg - (gapPx>0 ? (gapPx / Math.max(1, (r0 + r1)/2)) * (180/Math.PI) : padDeg*2));
      const base = document.createElementNS('http://www.w3.org/2000/svg','path');
      base.setAttribute('d', gapPx>0 ? annularSkew(r0, r1, clampDeg(u.startDeg + rot), u.spanDeg) : annular(r0, r1, aStart, aSpan));
      base.setAttribute('fill', hasOkOnly ? (ctx.darkerOf? ctx.darkerOf(u.color) : u.color) : u.color);
      base.setAttribute('fill-opacity','.28');
      base.setAttribute('stroke', hasOkOnly ? (ctx.darkerOf? ctx.darkerOf(u.color) : u.color) : u.color);
      base.setAttribute('stroke-width','2');
      base.setAttribute('stroke-linejoin','miter');
      base.setAttribute('stroke-miterlimit','2.5');
      base.setAttribute('stroke-linecap','butt');
      base.setAttribute('pointer-events', ctx.reorderMode ? 'auto' : 'none');
      if(ctx.reorderMode){
        base.style.cursor = 'ns-resize';
        let startY = 0; let previewRing = null;
        const onMove = (e2)=>{ const dy = e2.clientY - startY; const step = Math.round(dy / 28); const desired = u.ring + step; const free = findFreeRing(desired, u); previewRing = free; if(free===null){ removePreview(); return; } const r0p = layout.inner + free * (layout.width + layout.gap); const r1p = r0p + layout.width; if(!previewPath){ previewPath = document.createElementNS('http://www.w3.org/2000/svg','path'); previewPath.setAttribute('fill','none'); previewPath.setAttribute('stroke','#60a5fa'); previewPath.setAttribute('stroke-width','3'); previewPath.setAttribute('stroke-dasharray','6 6'); svg.appendChild(previewPath); } previewPath.setAttribute('d', annular(r0p, r1p, clampDeg(u.startDeg + rot), u.spanDeg)); };
        const onUp = (e2)=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); try{ document.body.style.userSelect = ''; }catch(_){/* noop */} removePreview(); if(previewRing!==null && previewRing!==u.ring){ ctx.manualRingTargets[u.siteId] = previewRing; if(ctx.save) ctx.save(); if(ctx.redraw) ctx.redraw(); } };
        base.addEventListener('mousedown', (ev)=>{ ev.preventDefault(); try{ document.body.style.userSelect = 'none'; }catch(_){/* noop */} startY = ev.clientY; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); });
      }
      if(ctx.animateSiteIds && ctx.animateSiteIds.has(u.siteId)){ try{ const L=base.getTotalLength(); base.style.strokeDasharray=L; base.style.strokeDashoffset=L; }catch(_){/* noop */} base.classList.add('seg-draw-in'); }
      svg.appendChild(base);

      // GOOD overlays
      const goods = ctx.goodArcs.filter(g=> g.siteId===u.siteId && overlaps(g,u));
      for(const g of goods){ const gs = clampDeg(g.startDeg + rot + (gapPx>0 ? 0 : padDeg)); const gl = Math.max(0, g.spanDeg - (gapPx>0 ? 0 : padDeg*2)); const pg = document.createElementNS('http://www.w3.org/2000/svg','path'); pg.setAttribute('d', gapPx>0 ? annularSkew(r0, r1, clampDeg(g.startDeg + rot), g.spanDeg) : annular(r0, r1, gs, gl)); pg.setAttribute('fill', g.color); pg.setAttribute('fill-opacity','.35'); pg.setAttribute('stroke', g.color); pg.setAttribute('stroke-width','2'); pg.setAttribute('stroke-linejoin','miter'); pg.setAttribute('stroke-miterlimit','2.5'); pg.setAttribute('stroke-linecap','butt'); if(ctx.reorderMode){ pg.style.pointerEvents = 'none'; } else if(ctx.showTip){ pg.addEventListener('mouseenter', ()=>{ let label=`${g.site} · GOOD`; try{ const siteObj=ctx.nameToSite[g.site]; const w = siteObj ? ctx.windForSelection(siteObj) : null; if(w){ const idx=Math.round(clampDeg(w.dirDeg)/((window.PG.layout&&window.PG.layout.SECTOR_DEG)||22.5)) % DIRS.length; label += ` · ${ctx.formatSpeed(w.speedKph)} · ${DIRS[idx]} (${Math.round(w.dirDeg)}°)`; } }catch(_){/* noop */} ctx.showTip(label); }); pg.addEventListener('mouseleave', ctx.hideTip); pg.addEventListener('mousemove', ctx.moveTip); } if(ctx.animateSiteIds && ctx.animateSiteIds.has(g.siteId)) pg.classList.add('seg-fade-in'); svg.appendChild(pg); }

      // OK-only overlays (invisible hit area for tooltip)
      const oks = ctx.okOnlyArcs.filter(k=> k.siteId===u.siteId && overlaps(k,u));
      for(const k of oks){ const ks = clampDeg(k.startDeg + rot + (gapPx>0 ? 0 : padDeg)); const kl = Math.max(0, k.spanDeg - (gapPx>0 ? 0 : padDeg*2)); const pk = document.createElementNS('http://www.w3.org/2000/svg','path'); pk.setAttribute('d', gapPx>0 ? annularSkew(r0, r1, clampDeg(k.startDeg + rot), k.spanDeg) : annular(r0, r1, ks, kl)); pk.setAttribute('fill', '#000'); pk.setAttribute('fill-opacity','0.001'); pk.setAttribute('stroke','none'); if(ctx.reorderMode){ pk.style.pointerEvents = 'none'; } else if(ctx.showTip){ pk.addEventListener('mouseenter', ()=>{ let label=`${k.site} · OK`; try{ const siteObj=ctx.nameToSite[k.site]; const w = siteObj ? ctx.windForSelection(siteObj) : null; if(w){ const idx=Math.round(clampDeg(w.dirDeg)/((window.PG.layout&&window.PG.layout.SECTOR_DEG)||22.5)) % DIRS.length; label += ` · ${ctx.formatSpeed(w.speedKph)} · ${DIRS[idx]} (${Math.round(w.dirDeg)}°)`; } }catch(_){/* noop */} ctx.showTip(label); }); pk.addEventListener('mouseleave', ctx.hideTip); pk.addEventListener('mousemove', ctx.moveTip); } if(ctx.animateSiteIds && ctx.animateSiteIds.has(k.siteId)) pk.classList.add('seg-fade-in'); svg.appendChild(pk); }

      // Curved label per union arc
      let rText = ctx.labelRadius(r0, r1);
      if(ctx.autoCenterLabels){ rText = r0 + (r1 - r0) * 0.5; }
      const padForTextDeg = (gapPx>0 && rText>0) ? (gapPx / rText) * (180/Math.PI) * 0.5 : padDeg;
      const spanForText = Math.max(u.spanDeg - padForTextDeg*2, 0);
      if(spanForText > 4){ const textPathId = `tpath-${u.id}`; const text = document.createElementNS('http://www.w3.org/2000/svg','text'); text.setAttribute('fill','#ffffff'); text.setAttribute('font-weight','700'); let rForText = rText; const arcLen = (Math.PI/180) * spanForText * rForText; const est = arcLen / Math.max(u.site.length * 0.62, 4); const bandHeight = (function(){ const r0b = layout.inner + u.ring * (layout.width + layout.gap); let r1b = r0b + layout.width; if(ctx.expandIsolatedSegments){ const anyAbove = unionArcs.some(v=> v.ring>u.ring && overlapsOpen(v,u)); if(!anyAbove){ r1b = layout.outer; } } return r1b - r0b; })(); const maxByHeight = Math.max(8, (bandHeight - 4) * 0.78); const size = Math.max(8, Math.min(est, maxByHeight, ctx.LABEL_MAX_PX||28)); text.setAttribute('font-size', size.toFixed(1)); text.style.pointerEvents = ctx.reorderMode ? 'none' : 'visiblePainted'; if(ctx.autoCenterLabels){ const baselineFudge = size * 0.30; rForText = r0 + (r1 - r0) * 0.5 - baselineFudge; } const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('id', textPathId); path.setAttribute('d', arcText(rForText, clampDeg(u.startDeg + rot + padForTextDeg), spanForText)); path.setAttribute('fill','none'); (svg.querySelector('defs')||svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg','defs'))).appendChild(path); const tp = document.createElementNS('http://www.w3.org/2000/svg','textPath'); tp.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href', `#${textPathId}`); tp.setAttribute('href', `#${textPathId}`); tp.textContent = u.site; text.appendChild(tp); svg.appendChild(text); try{ const pathNode = svg.querySelector(`#${textPathId}`); if(pathNode && pathNode.getTotalLength){ const pathLen = pathNode.getTotalLength(); const textLen = text.getComputedTextLength(); const offset = Math.max(0, (pathLen - textLen)/2); tp.setAttribute('startOffset', String(offset)); } }catch(_){/* noop */} }
    }

    // Per-site arrows (only when live wind is on)
    if(ctx.liveWindOn){
      const drawArrow = (x, y, angle, color, label)=>{ const len=20; const rad=(angle-90)*Math.PI/180; const dx=Math.cos(rad), dy=Math.sin(rad); const sx=x - dx*(len*0.4), sy=y - dy*(len*0.4); const ex=x + dx*(len*0.6), ey=y + dy*(len*0.6); const line=document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('x1', sx); line.setAttribute('y1', sy); line.setAttribute('x2', ex); line.setAttribute('y2', ey); line.setAttribute('stroke', color); line.setAttribute('stroke-width','3.5'); line.setAttribute('stroke-linecap','round'); if(ctx.showTip){ line.addEventListener('mouseenter', ()=> ctx.showTip(label)); line.addEventListener('mouseleave', ctx.hideTip); line.addEventListener('mousemove', ctx.moveTip); } svg.appendChild(line); const wing=6, a1=(angle+155)*Math.PI/180, a2=(angle-155)*Math.PI/180; const l1=document.createElementNS('http://www.w3.org/2000/svg','line'); l1.setAttribute('x1', ex); l1.setAttribute('y1', ey); l1.setAttribute('x2', ex+Math.cos(a1)*wing); l1.setAttribute('y2', ey+Math.sin(a1)*wing); l1.setAttribute('stroke', color); l1.setAttribute('stroke-width','3'); l1.setAttribute('stroke-linecap','round'); const l2=document.createElementNS('http://www.w3.org/2000/svg','line'); l2.setAttribute('x1', ex); l2.setAttribute('y1', ey); l2.setAttribute('x2', ex+Math.cos(a2)*wing); l2.setAttribute('y2', ey+Math.sin(a2)*wing); l2.setAttribute('stroke', color); l2.setAttribute('stroke-width','3'); l2.setAttribute('stroke-linecap','round'); svg.appendChild(l1); svg.appendChild(l2); };

      for(const u of unionArcs){ const site = ctx.nameToSite[u.site]; if(!site) continue; const w = ctx.windForSelection(site); if(!w) continue; const ringR0 = layout.inner + u.ring * (layout.width + layout.gap); const rMid = ringR0 + layout.width * 0.62; const midAng = clampDeg(u.startDeg + u.spanDeg/2); const p = polar(rMid, midAng); if(ctx.hideSitesOutside){ const dbg = ctx.debugWindDecision ? ctx.debugWindDecision(site, w.dirDeg) : {inside:true}; if(!dbg.inside) continue; } const color = site.color; const sectorIdx = Math.round(clampDeg(w.dirDeg)/((window.PG.layout&&window.PG.layout.SECTOR_DEG)||22.5)) % DIRS.length; const label = `${site.name} · ${ctx.selectedDayOffset>0?'Avg ':''}${ctx.formatSpeed(w.speedKph)} · ${DIRS[sectorIdx]}`; drawArrow(p[0], p[1], w.dirDeg, color, label); }
    }

    // Central average arrow
    if(ctx.centerAverage){ const avgDeg = ctx.centerAverage.dirDeg; const avgSpeed = ctx.centerAverage.speedKph; const len=46; const exy=(function(){ const t=(avgDeg-90)*Math.PI/180; return [cx + Math.cos(t)*len, cy + Math.sin(t)*len]; })(); const line=document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('x1', cx); line.setAttribute('y1', cy); line.setAttribute('x2', exy[0]); line.setAttribute('y2', exy[1]); line.setAttribute('stroke', '#ffffff'); line.setAttribute('stroke-width','4.5'); line.setAttribute('stroke-linecap','round'); if(ctx.showTip){ line.addEventListener('mouseenter', ()=> ctx.showTip(`Average · ${ctx.formatSpeed(avgSpeed)}`)); line.addEventListener('mouseleave', ctx.hideTip); line.addEventListener('mousemove', ctx.moveTip); } svg.appendChild(line); const wing=9, a1=(avgDeg+155)*Math.PI/180, a2=(avgDeg-155)*Math.PI/180; const l1=document.createElementNS('http://www.w3.org/2000/svg','line'); l1.setAttribute('x1', exy[0]); l1.setAttribute('y1', exy[1]); l1.setAttribute('x2', exy[0]+Math.cos(a1)*wing); l1.setAttribute('y2', exy[1]+Math.sin(a1)*wing); l1.setAttribute('stroke','#ffffff'); l1.setAttribute('stroke-width','4'); l1.setAttribute('stroke-linecap','round'); svg.appendChild(l1); const l2=document.createElementNS('http://www.w3.org/2000/svg','line'); l2.setAttribute('x1', exy[0]); l2.setAttribute('y1', exy[1]); l2.setAttribute('x2', exy[0]+Math.cos(a2)*wing); l2.setAttribute('y2', exy[1]+Math.sin(a2)*wing); l2.setAttribute('stroke','#ffffff'); l2.setAttribute('stroke-width','4'); l2.setAttribute('stroke-linecap','round'); svg.appendChild(l2); try{ const t=document.createElementNS('http://www.w3.org/2000/svg','text'); t.setAttribute('x', cx); t.setAttribute('y', String(cy + 18)); t.setAttribute('fill', '#cbd5e1'); t.setAttribute('font-size', '16'); t.setAttribute('font-weight', '800'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central'); t.style.pointerEvents = 'none'; t.textContent = `Avg ${ctx.formatSpeed(avgSpeed)}`; svg.appendChild(t); }catch(_){/* noop */} }
  }
  window.PG.rose.drawSegments = drawSegments;

  function drawEmptyState(svg){
    const cfg = window.PG.config||{};
    const cx = (cfg.center&&cfg.center.x)||430;
    const cy = (cfg.center&&cfg.center.y)||430;
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
      const span = (360/segCount) - 6; // small gap
      const d = (window.PG.svg && window.PG.svg.annularSectorPath) ? window.PG.svg.annularSectorPath(cx,cy,baseRadius-40,baseRadius,startAng,span) : '';
      const p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', d);
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
    msg.textContent = 'Add sites to build your perfect window';
    msg.style.setProperty('--td', (segCount*0.09)+'s');
    g.appendChild(msg);
  }
  window.PG.rose.drawEmptyState = drawEmptyState;
})();


