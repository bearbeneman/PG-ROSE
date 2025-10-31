;(function initLegend(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function renderLists(ctx){
    const { sites, selectedDayOffset, DIRS } = ctx;
    const dayKeyForOffset = ctx.dayKeyForOffset;
    const sectorBounds = ctx.sectorBounds;
    const contiguousRanges = ctx.contiguousRanges;
    const clampDeg = ctx.clampDeg || (a=>{ a%=360; if(a<0) a+=360; return a; });
    const formatSpeed = ctx.formatSpeed || (k=>String(k||''));
    const legendPillsHost = document.getElementById('legendPills');
    const legendEl = document.getElementById('legend');
    const legendMobileEl = document.getElementById('legendMobile');
    const siteList = document.getElementById('siteList');
    if(legendPillsHost){ legendPillsHost.innerHTML=''; } else if(legendEl){ legendEl.innerHTML=''; }
    if(legendMobileEl) legendMobileEl.innerHTML='';
    (sites||[]).forEach(s=>{
      const pill = document.createElement('div'); pill.className='pill';
      let speed = s.weather?.now?.speedKph;
      if(selectedDayOffset>0 && s.weather?.byDay){ const key=dayKeyForOffset(selectedDayOffset); const arr=s.weather.byDay[key]; if(Array.isArray(arr)&&arr.length){ speed = arr.reduce((a,b)=> a + (b.speedKph||0), 0) / arr.length; } }
      const txt = Number.isFinite(speed) ? `${s.name} · ${formatSpeed(speed)}` : s.name;
      pill.innerHTML = `<span class="swatch" style="background:${s.color}"></span><span>${txt}</span>`;
      (legendPillsHost || legendEl).appendChild(pill);
      if(legendMobileEl){ const pill2=document.createElement('div'); pill2.className='pill'; pill2.innerHTML=pill.innerHTML; legendMobileEl.appendChild(pill2); }
    });
    if(siteList){
      siteList.innerHTML='';
      if(!sites || !sites.length){
        // Inject minimal CSS for animated gradient once
        if(!document.getElementById('legendCtaStyle')){
          const st = document.createElement('style');
          st.id='legendCtaStyle';
          st.textContent = `@keyframes bgShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}} .placeholder-box{border:1px solid #334155;border-radius:12px;padding:10px;background:linear-gradient(120deg, rgba(239,68,68,.18), rgba(245,158,11,.18), rgba(34,197,94,.18), rgba(6,182,212,.18), rgba(59,130,246,.18), rgba(167,139,250,.18));background-size:300% 300%;animation:bgShift 16s ease-in-out infinite}`;
          document.head.appendChild(st);
        }
        const ph = document.createElement('div'); ph.className='item placeholder-box';
        ph.innerHTML = `<div style="display:flex; align-items:center; gap:10px"><span class="swatch" style="background:#64748b"></span><div><div style="font-weight:700">Add site to start...</div><div class="subtle">Use Search or select on the map</div></div></div>`;
        siteList.appendChild(ph);
      } else {
        const sorted=[...(sites||[])].sort((a,b)=> String(a.name||'').localeCompare(String(b.name||''), undefined, { sensitivity: 'base' }));
        sorted.forEach(s=>{ const el=document.createElement('div'); el.className='item'; function labelsFor(indices){ const ranges = contiguousRanges(indices||[]); if(!ranges.length) return '—'; return ranges.map(r=>{ const [sStart] = sectorBounds(r.startIdx); const [, eEnd] = sectorBounds(r.endIdx); const startAng = clampDeg(sStart + (s.angleOffsetDeg || 0)); const endAng = clampDeg(eEnd + (s.angleOffsetDeg || 0)); const si = Math.round(startAng / ((window.PG&&window.PG.layout&&window.PG.layout.SECTOR_DEG)||22.5)) % DIRS.length; const ei = Math.round(endAng / ((window.PG&&window.PG.layout&&window.PG.layout.SECTOR_DEG)||22.5)) % DIRS.length; return `${DIRS[si]} – ${DIRS[ei]}`; }).join(' · '); } const goodLbl=labelsFor(s.good||s.sectors||[]); const okLbl=labelsFor(s.ok||[]); el.innerHTML = `<div style="display:flex; align-items:center; gap:10px"><span class="swatch" style="background:${s.color}"></span><div><div style="font-weight:700">${s.name}</div><div class="subtle">GOOD: ${goodLbl}${(s.ok&&s.ok.length)?` · OK: ${okLbl}`:''}</div></div></div><div class="row" style="justify-content:flex-end"><button class="secondary" data-id="${s.id}" data-act="delete" aria-label="Delete">×</button></div>`; siteList.appendChild(el); });
      }
    }
  }
  window.PG.legend = { renderLists };
})();


