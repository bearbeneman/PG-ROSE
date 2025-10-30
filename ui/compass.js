;(function initCompassModule(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function clampDeg(a){ a%=360; if(a<0) a+=360; return a; }
  function annularPath(cx, cy, r0, r1, a0, a1){
    a0 = clampDeg(a0); a1 = clampDeg(a1);
    const span = (a1 - a0 + 360) % 360;
    if((window.PG&&window.PG.svg&&window.PG.svg.annularSectorPath)){
      return window.PG.svg.annularSectorPath(cx, cy, r0, r1, a0, span);
    }
    const large = span > 180 ? 1 : 0;
    const t0 = (a0-90)*Math.PI/180, t1=(a1-90)*Math.PI/180;
    const x0 = cx + r0*Math.cos(t0), y0 = cy + r0*Math.sin(t0);
    const x1 = cx + r0*Math.cos(t1), y1 = cy + r0*Math.sin(t1);
    const X0 = cx + r1*Math.cos(t1), Y0 = cy + r1*Math.sin(t1);
    const X1 = cx + r1*Math.cos(t0), Y1 = cy + r1*Math.sin(t0);
    return `M ${x0} ${y0} A ${r0} ${r0} 0 ${large} 1 ${x1} ${y1} L ${X0} ${Y0} A ${r1} ${r1} 0 ${large} 0 ${X1} ${Y1} Z`;
  }
  function init(dirGrid, opts){
    if(!dirGrid) return;
    const DIRS = (opts&&opts.DIRS) || ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const SECTOR_DEG = (opts&&opts.SECTOR_DEG) || (window.PG&&window.PG.layout&&window.PG.layout.SECTOR_DEG) || 22.5;
    dirGrid.innerHTML='';
    const size = 500; const c=size/2; const innerR=34; const outerR=c-20;
    const svgCtrl = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svgCtrl.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svgCtrl.setAttribute('class','compass-svg');
    const back = document.createElementNS('http://www.w3.org/2000/svg','circle');
    back.setAttribute('cx', c); back.setAttribute('cy', c); back.setAttribute('r', String(outerR));
    back.setAttribute('fill', '#0b1222'); back.setAttribute('stroke', '#243043'); back.setAttribute('stroke-width','1');
    svgCtrl.appendChild(back);
    for(let i=0;i<DIRS.length;i++){
      const centerAng = i * SECTOR_DEG; const a0=centerAng - SECTOR_DEG/2; const a1=centerAng + SECTOR_DEG/2;
      const seg = document.createElementNS('http://www.w3.org/2000/svg','path');
      seg.setAttribute('d', annularPath(c,c, innerR, outerR, a0, a1));
      seg.setAttribute('class','dir-seg'); seg.dataset.idx = String(i); seg.dataset.state = '0';
      const mid=(a0+a1)/2; const t=(mid-90)*Math.PI/180; const bx = c + (innerR + (outerR-innerR)*0.55)*Math.cos(t); const by = c + (innerR + (outerR-innerR)*0.55)*Math.sin(t);
      const badge = document.createElementNS('http://www.w3.org/2000/svg','text'); badge.setAttribute('class','seg-badge'); badge.setAttribute('x', bx); badge.setAttribute('y', by); badge.setAttribute('fill', '#e5e7eb'); badge.setAttribute('font-size','12'); badge.setAttribute('text-anchor','middle'); badge.setAttribute('dominant-baseline','central'); badge.style.display='none';
      function paint(){ const s = Number(seg.dataset.state||'0'); if(s===0){ seg.setAttribute('fill','transparent'); seg.setAttribute('stroke','#334155'); seg.setAttribute('stroke-width','1.2'); seg.setAttribute('fill-opacity','0'); badge.style.display='none'; } if(s===1){ seg.setAttribute('fill','#0ea5e9'); seg.setAttribute('fill-opacity','.30'); seg.setAttribute('stroke','#0ea5e9'); seg.setAttribute('stroke-width','2'); badge.style.display='block'; badge.textContent='OK'; badge.setAttribute('font-weight','800'); } if(s===2){ seg.setAttribute('fill','#22c55e'); seg.setAttribute('fill-opacity','.35'); seg.setAttribute('stroke','#22c55e'); seg.setAttribute('stroke-width','2'); badge.style.display='block'; badge.textContent='GOOD'; badge.setAttribute('font-weight','900'); } }
      paint();
      seg.addEventListener('click', ()=>{ let s = Number(seg.dataset.state||'0'); s = (s+1)%3; seg.dataset.state=String(s); paint(); });
      svgCtrl.appendChild(seg); svgCtrl.appendChild(badge);
    }
    DIRS.forEach((txt,i)=>{ const ang=i*SECTOR_DEG; const t=(ang-90)*Math.PI/180; const x=c+(outerR+18)*Math.cos(t), y=c+(outerR+18)*Math.sin(t); const label=document.createElementNS('http://www.w3.org/2000/svg','text'); label.textContent=txt; label.setAttribute('x',x); label.setAttribute('y',y); label.setAttribute('fill','#cbd5e1'); const isCardinal=(i%4)===0; label.setAttribute('font-size', isCardinal?'16':'10'); label.setAttribute('font-weight', isCardinal?'800':'600'); label.setAttribute('text-anchor','middle'); label.setAttribute('dominant-baseline','central'); svgCtrl.appendChild(label); });
    dirGrid.appendChild(svgCtrl);
  }
  window.PG.compass = { init };
})();


