;(function initTooltips(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  let tooltip = document.getElementById('tooltip');
  if(!tooltip){
    tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.className = 'tooltip';
    tooltip.setAttribute('role','status');
    tooltip.setAttribute('aria-live','polite');
    document.body.appendChild(tooltip);
  }
  function show(text){ if(!tooltip) return; tooltip.textContent = text; tooltip.style.opacity = '1'; }
  function move(evt){ if(!tooltip || tooltip.style.opacity==='0') return; tooltip.style.left = evt.clientX + 'px'; tooltip.style.top = evt.clientY + 'px'; }
  function hide(){ if(!tooltip) return; tooltip.style.opacity = '0'; }
  window.PG.tooltip = { show, move, hide };
  window.addEventListener('mousemove', move, { passive: true });
})();


