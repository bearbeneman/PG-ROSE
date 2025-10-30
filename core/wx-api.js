;(function initWxApi(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  async function fetchSiteWeather({ lat, lng, model }){
    const base = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=wind_speed_80m,wind_speed_10m,winddirection_10m&daily=weather_code&timezone=GMT`;
    const url = model && model !== 'default' ? `${base}&models=${encodeURIComponent(model)}` : base;
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if(!res.ok) throw new Error('weather http');
    const j = await res.json();
    const times = j?.hourly?.time||[];
    const spd80 = j?.hourly?.wind_speed_80m||[];
    const spd10 = j?.hourly?.wind_speed_10m||[];
    const dir = j?.hourly?.winddirection_10m || j?.hourly?.wind_direction_10m || [];
    const nowTs = Date.now();
    let best = 0; let bestDiff = Infinity;
    for(let i=0;i<times.length;i++){ const t = Date.parse(times[i]); const d = Math.abs(t - nowTs); if(d < bestDiff){ bestDiff = d; best = i; } }
    // bucket by YYYY-MM-DD (string) and keep ts as ISO string to match app expectations
    const buckets = new Map();
    for(let i=0;i<times.length;i++){
      const timeIso = times[i];
      const k = timeIso?.slice(0,10);
      const s80 = spd80[i]; const s10 = spd10[i]; const sp = (s80===null||s80===undefined)? s10 : s80;
      const di = dir[i];
      if(!k || sp==null || di==null) continue;
      if(!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push({ ts: timeIso, speedKph: Number(sp)||0, dirDeg: Number(di)||0 });
    }
    const byDay = {};
    for(const [k, arr] of buckets){
      if(!arr.length) continue;
      let sx=0, sy=0, sum=0;
      arr.forEach(w=>{ const rad=(w.dirDeg-90)*Math.PI/180; const wgt = Math.max(0.1, Number(w.speedKph)||0); sx += Math.cos(rad)*wgt; sy += Math.sin(rad)*wgt; sum += Number(w.speedKph)||0; });
      const avgRad = Math.atan2(sy,sx); const avgDeg = (avgRad*180/Math.PI + 90 + 360)%360; const avgSpd = sum/arr.length;
      byDay[k] = arr.map(x=>({ ts:x.ts, speedKph:x.speedKph, dirDeg:x.dirDeg }));
      byDay[k].avg = { speedKph: avgSpd, dirDeg: avgDeg };
    }
    const now = { ts: times[best]||null, speedKph: Number((spd80[best]==null? spd10[best] : spd80[best]))||0, dirDeg: Number(dir[best])||0 };
    return { now, byDay };
  }
  window.PG.wx = { fetchSiteWeather };
})();


