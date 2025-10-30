;(function initModel(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function modelNameFor(val){
    if(val==='ukmo_seamless') return 'UK Met Seamless';
    if(val==='default' || !val) return 'Open‑Meteo';
    return String(val);
  }
  function endpointTemplate(){
    return 'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=wind_speed_80m,wind_speed_10m,winddirection_10m&daily=weather_code&timezone=GMT';
  }
  function infoHTML(weatherModel){
    const isMac = navigator.platform && /Mac/i.test(navigator.platform);
    const modelLine = weatherModel && weatherModel !== 'default' ? `&models=${weatherModel}` : '(Open‑Meteo baseline)';
    const humanModel = modelNameFor(weatherModel);
    return `Source: ${humanModel}. Toggle model with <kbd>${isMac?'⌘':'Ctrl'}</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd>.<br>
Request: hourly wind at 80m (fallback to 10m if missing) and 10m direction, timezone GMT.<br>
Endpoint template:<br>
<code>${endpointTemplate()}</code><br>
Model: <code>${modelLine}</code><br><br>
Processing:<br>
• NOW: nearest hourly record to current time (GMT).<br>
• Per‑day: average that day's hourly wind vectors (speed‑weighted) for mean speed and direction.<br>
• Suitability: direction → 16‑sector index (22.5° each); test against GOOD/OK sets.<br>
• Wind‑only: hide sites failing the current day's suitability.<br>
• Units: toggle KPH↔MPH↔KTS via the switch (legend/tooltips update live).`;
  }
  function renderWxInfo(weatherModel){
    const infoEl = document.getElementById('wxInfo');
    if(!infoEl) return;
    infoEl.innerHTML = infoHTML(weatherModel);
  }
  // Toast
  let modelToastEl = null; let modelToastTimer = null;
  function showModelToast(message){
    if(!modelToastEl){ modelToastEl = document.createElement('div'); modelToastEl.id='modelToast'; modelToastEl.setAttribute('role','status'); modelToastEl.style.position='fixed'; modelToastEl.style.left='50%'; modelToastEl.style.top='18px'; modelToastEl.style.transform='translateX(-50%)'; modelToastEl.style.zIndex='9999'; modelToastEl.style.background='#0b1222cc'; modelToastEl.style.border='1px solid #1f2937'; modelToastEl.style.color='#e5e7eb'; modelToastEl.style.padding='8px 12px'; modelToastEl.style.borderRadius='10px'; modelToastEl.style.font='600 12px ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial'; modelToastEl.style.boxShadow='0 6px 24px rgba(0,0,0,.35)'; modelToastEl.style.opacity='0'; modelToastEl.style.transition='opacity .15s ease-in-out'; document.body.appendChild(modelToastEl); }
    modelToastEl.textContent = message; modelToastEl.style.opacity='1'; if(modelToastTimer) clearTimeout(modelToastTimer); modelToastTimer = setTimeout(()=>{ if(modelToastEl) modelToastEl.style.opacity='0'; }, 1400);
  }
  async function applyModelChange(newModel, ctx){
    const setModel = ctx && ctx.setModel; const sites = (ctx&&ctx.sites)||[]; const fetchSiteWeather = ctx&&ctx.fetchSiteWeather; const save = ctx&&ctx.save; const draw = ctx&&ctx.draw; const renderWxInfo = ctx&&ctx.renderWxInfo; const modelNameForFn = ctx&&ctx.modelNameFor||modelNameFor;
    const weatherModel = (newModel && newModel !== '' ? newModel : 'default');
    if(typeof setModel === 'function') setModel(weatherModel);
    const ms = document.getElementById('modelSelect'); if(ms){ ms.value = weatherModel; }
    const msm = document.getElementById('modelSelectMobile'); if(msm){ msm.value = weatherModel; }
    if(typeof save==='function') save(); if(typeof renderWxInfo==='function') renderWxInfo(); showModelToast('Model: ' + modelNameForFn(weatherModel));
    const tasks = [];
    for(const s of sites){ const lat=Number(s?.lat), lng=Number(s?.lng); if(Number.isFinite(lat)&&Number.isFinite(lng) && typeof fetchSiteWeather==='function'){ tasks.push(fetchSiteWeather(lat,lng).then(w=>{ if(w){ s.weather=w; } })); } }
    if(tasks.length){ await Promise.allSettled(tasks); if(typeof save==='function') save(); if(typeof draw==='function') draw(); }
  }
  window.PG.model = { modelNameFor, endpointTemplate, infoHTML, renderWxInfo, showModelToast, applyModelChange };
})();


