;(function initColors(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function colourFromString(str){ let h=0; for(let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i))>>>0; } const hue = h % 360; return `hsl(${hue} 70% 55%)`; }
  function darkerOf(hsl){ const m=/hsl\((\d+)\s+([\d.]+)%\s+([\d.]+)%\)/i.exec(hsl); if(!m) return hsl; const h=m[1], s=m[2]; const l=43; return `hsl(${h} ${s}% ${l}%)`; }
  window.PG.colors = { colourFromString, darkerOf };
})();


