;(function initCatalogUI(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  function initTypeahead(catalogEntries){
    const inp = document.getElementById('catalogSearch');
    const box = document.getElementById('catalogSuggestions');
    const select = document.getElementById('catalogSelect');
    if(!inp || !box || !select) return;
    if(inp.dataset.bound === '1') return;
    inp.dataset.bound = '1';
    let fuse = null;
    try{ if(typeof Fuse !== 'undefined' && Array.isArray(catalogEntries) && catalogEntries.length){ fuse = new Fuse(catalogEntries, { keys:['name'], includeScore:true, threshold:0.4, minMatchCharLength:2, distance:100 }); } }catch(_){ fuse=null; }
    let active=-1;
    function clear(){ box.innerHTML=''; box.classList.remove('open'); active=-1; }
    function choose(idx){ if(idx==null) return; select.value=String(idx); select.dispatchEvent(new Event('change',{bubbles:true})); inp.value=''; clear(); }
    function render(q){ const query=String(q||'').trim(); box.innerHTML=''; if(query.length<2){ clear(); return; } let results=[]; if(fuse){ try{ results=fuse.search(query,{limit:12}); }catch(_){ results=[]; } } else { const qlc=query.toLowerCase(); results=(catalogEntries||[]).filter(e=> e.name && e.name.toLowerCase().includes(qlc)).slice(0,12).map(item=>({ item })); } if(!results.length){ const empty=document.createElement('div'); empty.className='autocomplete-empty'; empty.textContent='No matches'; box.appendChild(empty); box.classList.add('open'); return; } results.forEach((r)=>{ const {idx,name}=r.item; const div=document.createElement('div'); div.className='autocomplete-suggestion'; div.textContent=name; div.dataset.idx=String(idx); div.addEventListener('mousedown',(e)=>{ e.preventDefault(); choose(idx); }); box.appendChild(div); }); box.classList.add('open'); active=-1; }
    inp.addEventListener('input', ()=> render(inp.value));
    inp.addEventListener('keydown', (e)=>{ const items=Array.from(box.querySelectorAll('.autocomplete-suggestion')); if(e.key==='Escape'){ clear(); return; } if(!items.length) return; if(e.key==='ArrowDown'){ e.preventDefault(); active=(active+1)%items.length; } else if(e.key==='ArrowUp'){ e.preventDefault(); active=(active-1+items.length)%items.length; } else if(e.key==='Enter'){ e.preventDefault(); if(active>=0&&active<items.length){ const idx=Number(items[active].dataset.idx); choose(idx); } else if(items.length===1){ const idx=Number(items[0].dataset.idx); choose(idx); } return; } items.forEach(el=> el.classList.remove('is-active')); if(active>=0&&active<items.length) items[active].classList.add('is-active'); });
    document.addEventListener('click', (e)=>{ if(!box.contains(e.target) && e.target !== inp) clear(); }, true);
  }
  window.PG.catalogUI = { initTypeahead };
})();


