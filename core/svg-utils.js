;(function initSvgUtils(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function clampDeg(a){ a%=360; if(a<0) a+=360; return a; }
  function toRad(d){ return (d-90) * Math.PI/180; }
  function polarToXY(cx, cy, r, deg){ const t = toRad(deg); return [ cx + r * Math.cos(t), cy + r * Math.sin(t) ]; }
  function annularSectorPath(cx, cy, r0, r1, a0, span){
    const a1 = clampDeg(a0 + span);
    const large = span > 180 ? 1 : 0;
    const [x0,y0] = polarToXY(cx, cy, r0, a0);
    const [x1,y1] = polarToXY(cx, cy, r0, a1);
    const [X0,Y0] = polarToXY(cx, cy, r1, a1);
    const [X1,Y1] = polarToXY(cx, cy, r1, a0);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r0} ${r0} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${X0.toFixed(2)} ${Y0.toFixed(2)} A ${r1} ${r1} 0 ${large} 0 ${X1.toFixed(2)} ${Y1.toFixed(2)} Z`;
  }
  function arcTextPathD(cx, cy, r, a0, span, reverse){
    const a1 = a0 + Math.max(0, span);
    const large = (span % 360) > 180 ? 1 : 0;
    const [sx, sy] = polarToXY(cx, cy, r, clampDeg(a0));
    const [ex, ey] = polarToXY(cx, cy, r, clampDeg(a1));
    if(!reverse){ return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`; }
    return `M ${ex.toFixed(2)} ${ey.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${sx.toFixed(2)} ${sy.toFixed(2)}`;
  }
  window.PG.svg = { polarToXY, annularSectorPath, arcTextPathD };
})();


