;(function initCarousel(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function initCarouselViewport(viewportId, trackId){
    const viewport = document.getElementById(viewportId);
    const track = document.getElementById(trackId);
    if(!viewport || !track) return;
    const first = track.querySelector('button');
    if(!first) return;
    const gapPx = 6; // keep in sync with CSS gap
    const visible = 3;
    function computeWidth(){
      const r = first.getBoundingClientRect();
      const w = Math.ceil(r.width * visible + gapPx * (visible - 1));
      viewport.style.maxWidth = w + 'px';
    }
    computeWidth();
    function updateState(){
      const scrollable = track.scrollWidth > viewport.clientWidth + 1;
      viewport.classList.toggle('scrollable', scrollable);
      const atStart = viewport.scrollLeft <= 2;
      const atEnd = viewport.scrollLeft + viewport.clientWidth >= track.scrollWidth - 2;
      viewport.classList.toggle('at-start', atStart);
      viewport.classList.toggle('at-end', atEnd);
    }
    updateState();
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
  window.PG.carousel = { initCarouselViewport, centerInCarousel };
})();


