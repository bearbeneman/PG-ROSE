;(function initSelfTests(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  const DIRS16 = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

  function el(tag, attrs){ const n=document.createElement(tag); if(attrs){ for(const k in attrs){ if(k==='text') n.textContent=attrs[k]; else n.setAttribute(k, attrs[k]); } } return n; }
  function ensurePanel(){ let p=document.getElementById('selftestPanel'); if(p) return p; p=el('div'); p.id='selftestPanel'; p.style.cssText='position:fixed; right:16px; bottom:16px; z-index:99999; background:#0b1222cc; color:#e5e7eb; border:1px solid #1f2937; border-radius:10px; padding:10px 12px; width:320px; max-height:60vh; overflow:auto; box-shadow:0 8px 30px rgba(0,0,0,.45); display:none;'; const h=el('div',{text:'Self‑tests'}); h.style.cssText='font:600 13px ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial; margin-bottom:6px;'; const list=el('div'); list.id='selftestList'; const row=el('div'); row.style.cssText='display:flex; gap:8px; margin-top:8px;'; const runBtn=el('button'); runBtn.textContent='Run tests'; runBtn.style.cssText='cursor:pointer; padding:6px 10px; border-radius:8px; border:1px solid #1f2937; background:#111827; color:#e5e7eb;'; runBtn.addEventListener('click', runAll);
    const closeBtn=el('button'); closeBtn.textContent='Close'; closeBtn.style.cssText='cursor:pointer; padding:6px 10px; border-radius:8px; border:1px solid #1f2937; background:#111827; color:#e5e7eb;'; closeBtn.addEventListener('click', ()=>{ p.style.display='none'; });
    row.appendChild(runBtn); row.appendChild(closeBtn); p.appendChild(h); p.appendChild(list); p.appendChild(row); document.body.appendChild(p); return p; }

  function report(results){ const p=ensurePanel(); const list=p.querySelector('#selftestList'); list.innerHTML=''; results.forEach(r=>{ const line=el('div'); line.style.cssText='display:flex; justify-content:space-between; align-items:center; padding:4px 0; font:12px ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial;'; const name=el('span',{text:r.name}); const status=el('span',{text:r.ok?'OK':'FAIL'}); status.style.cssText = 'font-weight:700; ' + (r.ok?'color:#22c55e':'color:#ef4444'); line.appendChild(name); line.appendChild(status); if(r.message){ const msg=el('div',{text:r.message}); msg.style.cssText='color:#9ca3af; font-size:11px; margin-left:4px;'; line.appendChild(msg); } list.appendChild(line); }); p.style.display='block'; }

  function safe(f){ try{ const v=f(); return { ok:true, message: typeof v==='string'? v : '' }; }catch(err){ return { ok:false, message: String(err&&err.message||err) }; } }

  function runAll(){ const results=[];
    // 1) Modules present
    results.push({ name:'PG.svg present', ...safe(()=>{ if(!window.PG||!window.PG.svg) throw new Error('missing'); })});
    results.push({ name:'PG.layout present', ...safe(()=>{ if(!window.PG||!window.PG.layout) throw new Error('missing'); })});
    results.push({ name:'PG.rose present', ...safe(()=>{ if(!window.PG||!window.PG.rose) throw new Error('missing'); })});
    results.push({ name:'PG.units present', ...safe(()=>{ if(!window.PG||!window.PG.units) throw new Error('missing'); })});

    // 2) Build arcs
    results.push({ name:'buildArcs returns arcs', ...safe(()=>{ const sites=[ { id:'A', name:'Alpha', color:'#22c55e', good:[0,1,2], ok:[3] }, { id:'B', name:'Bravo', color:'#0ea5e9', good:[8,9], ok:[] } ]; const built = window.PG.layout.buildArcs(sites); if(!built||!built.unionArcs||!built.unionArcs.length) throw new Error('no unionArcs'); })});

    // 3) Draw segments on offscreen SVG
    results.push({ name:'drawSegments draws', ...safe(()=>{ const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 860 860'); document.body.appendChild(svg); const sites=[ { id:'A', name:'Alpha', color:'#22c55e', good:[0,1,2], ok:[3] }, { id:'B', name:'Bravo', color:'#0ea5e9', good:[8,9], ok:[] } ]; const built=window.PG.layout.buildArcs(sites); window.PG.layout.assignRings(built.unionArcs, { ringOrder:'short', longNamesOut:false, manualRingTargets:{}, lastAssignedRingsRef:{} }); const layout=window.PG.layout.computeRadialLayout(1 + Math.max(...built.unionArcs.map(a=>a.ring||0)), window.PG.config); const before=svg.childNodes.length; window.PG.rose.drawSegments(svg, { cx: (window.PG.config&&window.PG.config.center&&window.PG.config.center.x)||430, cy:(window.PG.config&&window.PG.config.center&&window.PG.config.center.y)||430, DIRS:DIRS16, padDeg:0.8, layout, unionArcs:built.unionArcs, goodArcs:built.goodArcs, okOnlyArcs:built.okOnlyArcs, liveWindOn:false, hideSitesOutside:false, expandIsolatedSegments:false, reorderMode:false, manualRingTargets:{}, lastAssignedRings:{}, ringOrder:'short', longNamesOut:false, formatSpeed:(k)=> (window.PG.units? window.PG.units.formatSpeed(k,'kph') : String(k)), nameToSite: Object.fromEntries(sites.map(s=>[s.name,s])), windForSelection:(s)=>({dirDeg:45, speedKph:20}), labelRadius:(r0,r1)=> r0 + (r1-r0)*0.5, autoCenterLabels:true, LABEL_MAX_PX:(window.PG.config&&window.PG.config.labelMaxPx)||28, animateSiteIds:new Set(), selectedDayOffset:0, centerAverage:{ dirDeg: 60, speedKph: 15 }, showTip:()=>{}, hideTip:()=>{}, moveTip:()=>{}, darkerOf:(c)=>c, save:()=>{}, redraw:()=>{} }); const after=svg.childNodes.length; document.body.removeChild(svg); if(!(after>before)) throw new Error('no draw'); })});

    // 4) Tooltip exists
    results.push({ name:'tooltip module', ...safe(()=>{ if(!window.PG||!window.PG.tooltip) throw new Error('missing'); })});

    // 5) Model helpers present
    results.push({ name:'model.applyModelChange present', ...safe(()=>{ if(!window.PG||!window.PG.model||typeof window.PG.model.applyModelChange!=='function') throw new Error('missing'); })});

    // 6) Export helpers present
    results.push({ name:'export.saveRosePDF present', ...safe(()=>{ if(!window.PG||!window.PG.export||typeof window.PG.export.saveRosePDF!=='function') throw new Error('missing'); })});
    results.push({ name:'export.printRosePDF present', ...safe(()=>{ if(!window.PG||!window.PG.export||typeof window.PG.export.printRosePDF!=='function') throw new Error('missing'); })});

    report(results);
  }

  // UI: keyboard toggle Ctrl+Shift+D
  window.addEventListener('keydown', (e)=>{ try{ const isMac = navigator.platform && /Mac/i.test(navigator.platform); const ctrlOrMeta = isMac ? e.metaKey : e.ctrlKey; if(ctrlOrMeta && e.shiftKey && (e.key==='D' || e.key==='d')){ e.preventDefault(); const p=ensurePanel(); p.style.display = (p.style.display==='none'||!p.style.display) ? 'block' : 'none'; if(p.style.display==='block') runAll(); } }catch(_){/* noop */} });

  // Auto-open if ?debug=1
  try{ const ps=new URLSearchParams(location.search); if(ps.get('debug')==='1'){ const p=ensurePanel(); p.style.display='block'; setTimeout(runAll, 0); } }catch(_){/* noop */}

  window.PG.selftest = { run: runAll };
})();


