;(function initHotkeys(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  if(window.PG.hotkeys && window.PG.hotkeys.bound) return;
  window.addEventListener('keydown', async (e)=>{
    try{
      const isMac = navigator.platform && /Mac/i.test(navigator.platform);
      const ctrlOrMeta = isMac ? e.metaKey : e.ctrlKey;
      if(ctrlOrMeta && e.shiftKey && (e.key==='M' || e.key==='m')){
        e.preventDefault();
        if(window.PG && window.PG.model && typeof window.PG.model.applyModelChange==='function'){
          const modelSelect = document.getElementById('modelSelect');
          const current = (modelSelect && modelSelect.value) || 'ukmo_seamless';
          const next = (current && current !== 'default') ? 'default' : 'ukmo_seamless';
          await window.PG.model.applyModelChange(next, {
            setModel: (m)=>{ try{ if(window.PG && typeof window.PG._setModel==='function') window.PG._setModel(m); if(modelSelect) modelSelect.value=m; const msm=document.getElementById('modelSelectMobile'); if(msm) msm.value=m; }catch(_){/* noop */} },
            sites: (window.PG && window.PG._sites) || [],
            fetchSiteWeather: (window.PG && window.PG._fetchSiteWeather) || null,
            save: (window.PG && window.PG._save) || null,
            draw: (window.PG && window.PG._draw) || null,
            renderWxInfo: (window.PG && window.PG.model && window.PG.model.renderWxInfo) || null,
            modelNameFor: (window.PG && window.PG.model && window.PG.model.modelNameFor) || null
          });
        }
      } else if(ctrlOrMeta && e.shiftKey && (e.key==='H' || e.key==='h')){
        e.preventDefault();
        try{ if(window.PG && typeof window.PG._toggleShowClosed==='function'){ window.PG._toggleShowClosed(); } }catch(_){/* noop */}
      }
    }catch(_){/* noop */}
  });
  window.PG.hotkeys = { bound: true };
})();


