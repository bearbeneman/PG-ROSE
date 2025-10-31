;(function initMapUI(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function markerIcon(selected){
    const color = selected ? '#60a5fa' : '#38bdf8';
    const stroke = selected ? '#1e40af' : '#0c4a6e';
    if(typeof L!=='undefined' && L.divIcon){
      return L.divIcon({ className: 'site-pin', html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid ${stroke};box-shadow:0 0 0 2px #0003"></div>`, iconSize:[16,16], iconAnchor:[8,8] });
    }
    return null;
  }
  function applyMarkerVisual(marker, isSelected){
    try{
      const key = String(marker && marker.options && marker.options.siteIdx || '');
      const blocked = !!(window.PG && window.PG._blockedIndices && key!=='' && window.PG._blockedIndices.has(key));
      if(marker && typeof marker.setOpacity==='function') marker.setOpacity(blocked ? 1 : (isSelected?1:0.3));
      if(marker && typeof marker.setIcon==='function'){
        let icon = null;
        if(blocked && typeof L!=='undefined' && L.divIcon){
          // Distinct colour for sites already in wind rose
          icon = L.divIcon({ className: 'site-pin', html: `<div style="width:16px;height:16px;border-radius:50%;background:#f59e0b;border:2px solid #b45309;box-shadow:0 0 0 2px #0003"></div>`, iconSize:[16,16], iconAnchor:[8,8] });
        } else {
          icon = markerIcon(isSelected);
        }
        if(icon) marker.setIcon(icon);
      }
      if(marker && marker._icon){ marker._icon.style.filter = blocked ? 'none' : (isSelected ? 'brightness(1.2) drop-shadow(0 0 4px #3b82f6)' : 'grayscale(0.5)'); }
    }catch(_){/* noop */}
  }
  function updateMapSelectionUI(selectedCount){
    const addBtn = document.getElementById('addSelectedFromMapBtn');
    const clrBtn = document.getElementById('clearMapSelectionBtn');
    const hint = document.getElementById('mapHint');
    if(addBtn) addBtn.disabled = !selectedCount;
    if(clrBtn) clrBtn.disabled = !selectedCount;
    if(hint){ hint.textContent = selectedCount ? `${selectedCount} site${selectedCount!==1?'s':''} selected. Click Add selected to import.` : 'Click markers to select. Drag to pan, wheel to zoom.'; }
  }
  function updateRadiusHint(radiusCenter, radiusHintEl){
    if(!radiusHintEl) return;
    if(Array.isArray(radiusCenter) && radiusCenter.length===2){
      const [lat, lng] = radiusCenter;
      radiusHintEl.textContent = `Center: ${lat.toFixed(4)}, ${lng.toFixed(4)}. Drag the slider or edit the number to change the radius (1–100 km). Click anywhere on the map to move the center.`;
    } else {
      radiusHintEl.textContent = 'Click anywhere on the map to set the circle center, or use your location.';
    }
  }

  function filterMarkersByRadius({ markerLayer, radiusCenter, radiusKm, manualSelected, manualDeselected, selectedIds, applyVisual, updateSelectionUI, radiusHintEl }){
    if(!markerLayer || !radiusCenter || !Array.isArray(radiusCenter)) return;
    const radiusMeters = radiusKm * 1000;
    let withinRadius = 0;
    const centerLatLng = L.latLng(radiusCenter[0], radiusCenter[1]);
    markerLayer.eachLayer(layer => {
      if(layer instanceof L.Marker){
        const markerLatLng = layer.getLatLng();
        const distance = centerLatLng.distanceTo(markerLatLng);
        const isWithin = distance <= radiusMeters;
        const key = String(layer.options.siteIdx ?? '');
        if(key !== ''){
          const blocked = !!(window.PG && window.PG._blockedIndices && window.PG._blockedIndices.has(key));
          if(blocked){ selectedIds.delete(key); if(typeof applyVisual==='function') applyVisual(layer, false); return; }
          const manuallyOn = manualSelected.has(key);
          const manuallyOff = manualDeselected.has(key);
          if(!manuallyOff && (manuallyOn || isWithin)) selectedIds.add(key);
          else if(manuallyOff || (!manuallyOn && !isWithin)) selectedIds.delete(key);
          if(typeof applyVisual==='function') applyVisual(layer, selectedIds.has(key));
        }
        if(isWithin) withinRadius++;
      }
    });
    if(typeof updateSelectionUI==='function') updateSelectionUI(selectedIds.size);
    if(radiusHintEl && Array.isArray(radiusCenter)){
      const [lat,lng] = radiusCenter;
      radiusHintEl.textContent = `Center: ${lat.toFixed(4)}, ${lng.toFixed(4)}. ${withinRadius} sites within ${radiusKm}km radius.`;
    }
  }

  function drawRadiusCircle({ map, radiusCenter, radiusKm, markerLayer, manualSelected, manualDeselected, selectedIds, radiusHintEl }){
    if(!map || !radiusCenter){ alert('Please set a center point first by clicking on the map or using your location.'); return null; }
    if(!radiusKm || radiusKm<=0){ alert('Please enter a valid radius in kilometers.'); return null; }
    const circle = L.circle(L.latLng(radiusCenter[0], radiusCenter[1]), {
      radius: radiusKm * 1000,
      color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2
    }).addTo(map);
    filterMarkersByRadius({ markerLayer, radiusCenter, radiusKm, manualSelected, manualDeselected, selectedIds, applyVisual: applyMarkerVisual, updateSelectionUI: (n)=>updateMapSelectionUI(n), radiusHintEl });
    return circle;
  }

  function updateRadiusCircle({ radiusCircle, radiusKm, markerLayer, radiusCenter, manualSelected, manualDeselected, selectedIds, radiusHintEl }){
    if(!radiusCircle || !radiusCenter) return;
    if(!radiusKm || radiusKm<=0) return;
    radiusCircle.setRadius(radiusKm * 1000);
    filterMarkersByRadius({ markerLayer, radiusCenter, radiusKm, manualSelected, manualDeselected, selectedIds, applyVisual: applyMarkerVisual, updateSelectionUI: (n)=>updateMapSelectionUI(n), radiusHintEl });
  }

  function pointInRing(lat, lng, ring){
    let inside = false; const n = ring.length;
    for(let i=0, j=n-1; i<n; j=i++){
      const xi = ring[i].lng, yi = ring[i].lat; const xj = ring[j].lng, yj = ring[j].lat;
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }
  function isLatLngInsidePolygon(latlng, poly){
    if(!poly) return false; const ll = poly.getLatLngs(); if(!ll || !ll.length) return false; let rings = [];
    if(ll[0] && ll[0].lat !== undefined){ rings = [ll]; }
    else if(ll[0] && ll[0][0] && ll[0][0].lat !== undefined){ rings = ll; }
    else if(ll[0] && ll[0][0] && ll[0][0][0] && ll[0][0][0].lat !== undefined){ ll.forEach(polyRings => { rings.push(...polyRings); }); }
    if(!rings.length) return false; let inside = pointInRing(latlng.lat, latlng.lng, rings[0]);
    for(let r=1;r<rings.length;r++){ if(pointInRing(latlng.lat, latlng.lng, rings[r])) inside = false; }
    return inside;
  }
  function updatePolygonSelection({ polygon, markerLayer, manualSelected, manualDeselected, selectedIds, updateSelectionUI, polyHintEl }){
    if(!polygon || !markerLayer) return; let inside = 0;
    markerLayer.eachLayer(layer => {
      if(!(layer instanceof L.Marker)) return; const key = String(layer.options.siteIdx ?? ''); if(key==='') return; const latlng = layer.getLatLng(); const within = isLatLngInsidePolygon(latlng, polygon);
      const blocked = !!(window.PG && window.PG._blockedIndices && window.PG._blockedIndices.has(key)); if(blocked){ selectedIds.delete(key); applyMarkerVisual(layer, false); return; }
      const manuallyOn = manualSelected.has(key); const manuallyOff = manualDeselected.has(key);
      if(!manuallyOff && (manuallyOn || within)) selectedIds.add(key); else if(manuallyOff || (!manuallyOn && !within)) selectedIds.delete(key);
      applyMarkerVisual(layer, selectedIds.has(key)); if(selectedIds.has(key)) inside++;
    });
    if(typeof updateSelectionUI==='function') updateSelectionUI(selectedIds.size);
    if(polyHintEl) polyHintEl.textContent = `${inside} site${inside!==1?'s':''} selected by polygon. Drag vertices to refine.`;
  }
  function clearRadiusCircle({ map, radiusCircle, radiusCenterRef, manualDeselected, markerLayer, selectedIds, manualSelected, updateSelectionUI, radiusHintEl }){
    if(radiusCircle){ map.removeLayer(radiusCircle); }
    if(radiusCenterRef){ radiusCenterRef[0] = null; }
    manualDeselected.clear();
    if(markerLayer){ markerLayer.eachLayer(layer => { if(!(layer instanceof L.Marker)) return; const key=String(layer.options.siteIdx ?? ''); if(key==='') return; if(!manualSelected.has(key)) selectedIds.delete(key); applyMarkerVisual(layer, selectedIds.has(key)); }); }
    if(typeof updateSelectionUI==='function') updateSelectionUI(selectedIds.size);
    if(radiusHintEl) radiusHintEl.textContent = 'Click anywhere on the map to set the circle center, or use your location.';
  }

  window.PG.map = { markerIcon, applyMarkerVisual, updateMapSelectionUI, updateRadiusHint, drawRadiusCircle, updateRadiusCircle, filterMarkersByRadius, pointInRing, isLatLngInsidePolygon, updatePolygonSelection, clearRadiusCircle };
})();


