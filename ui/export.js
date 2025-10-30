;(function initExport(){
  try{ window.PG = window.PG || {}; }catch(_){ return; }
  async function renderCanvasFromDom({ svg, legendEl }){
    if(!svg) throw new Error('svg missing');
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute'; tempContainer.style.left = '-9999px'; tempContainer.style.top = '-9999px';
    tempContainer.style.width = '860px'; tempContainer.style.height = '860px'; tempContainer.style.backgroundColor = '#0f172a'; tempContainer.style.padding = '20px'; tempContainer.style.boxSizing = 'border-box';
    const svgClone = svg.cloneNode(true);
    const legendClone = (legendEl ? legendEl.cloneNode(true) : document.createElement('div'));
    // Legend styling
    legendClone.style.position = 'absolute'; legendClone.style.left = '16px'; legendClone.style.top = '16px'; legendClone.style.display = 'flex'; legendClone.style.gap = '8px'; legendClone.style.flexWrap = 'wrap'; legendClone.style.maxWidth = '520px';
    const pills = legendClone.querySelectorAll('.pill'); pills.forEach(pill=>{ pill.style.display='flex'; pill.style.alignItems='center'; pill.style.gap='6px'; pill.style.padding='6px 8px'; pill.style.borderRadius='999px'; pill.style.background='#0b1222aa'; pill.style.border='1px solid #1f2937'; pill.style.fontSize='12px'; pill.style.color='#e5e7eb'; });
    const swatches = legendClone.querySelectorAll('.swatch'); swatches.forEach(s=>{ s.style.display='inline-block'; s.style.width='12px'; s.style.height='12px'; s.style.borderRadius='50%'; s.style.border='1px solid #0b1222'; s.style.boxShadow='inset 0 0 0 2px #0b122244'; });
    // Sanitize quality samples (avoid color-mix CSS)
    const samples = legendClone.querySelectorAll('.seg-sample'); samples.forEach(sample=>{ sample.style.background = 'none'; sample.style.backgroundImage='none'; if(sample.classList.contains('good')){ sample.style.backgroundColor='rgba(34, 197, 94, 0.40)'; sample.style.border='2px solid rgb(34, 197, 94)'; } else if(sample.classList.contains('ok')){ sample.style.backgroundImage='repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 6px, rgba(255,255,255,0) 6px 12px), linear-gradient(rgba(14,165,233,0.28), rgba(14,165,233,0.28))'; sample.style.border='2px solid rgb(14, 165, 233)'; } });
    tempContainer.appendChild(svgClone); tempContainer.appendChild(legendClone); document.body.appendChild(tempContainer);
    const canvas = await html2canvas(tempContainer, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      onclone: (doc)=>{ try{ doc.querySelectorAll('*').forEach(el=>{ const st=el.getAttribute('style')||''; if(/color-mix\(|color\(/i.test(st)) el.setAttribute('style', st.replace(/color-mix\([^)]*\)|color\([^)]*\)/gi,'rgba(0,0,0,0)')); }); }catch(_){/* noop */} }
    });
    document.body.removeChild(tempContainer);
    return canvas;
  }
  function createPDF(canvas){
    const { jsPDF } = window.jspdf || {}; if(!jsPDF) throw new Error('jsPDF missing');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); const margin = 20;
    const maxWidth = pdfWidth - (margin*2); const maxHeight = pdfHeight - (margin*2);
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const finalWidth = canvas.width * scale; const finalHeight = canvas.height * scale;
    const x = (pdfWidth - finalWidth) / 2; const y = (pdfHeight - finalHeight) / 2;
    const imgData = canvas.toDataURL('image/png'); pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    return pdf;
  }
  async function saveRosePDF({ svg, legendEl, titleText, siteCount }){
    const canvas = await renderCanvasFromDom({ svg, legendEl });
    const pdf = createPDF(canvas);
    const margin = 20;
    pdf.setFontSize(16); pdf.setTextColor(229,231,235); pdf.text((titleText||'PG Rose - Perfect Launch Window'), margin, 15);
    pdf.setFontSize(10); pdf.setTextColor(148,163,184); if(Number.isFinite(siteCount)) pdf.text(`${siteCount} site${siteCount!==1?'s':''}`, margin, 25);
    const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
    pdf.save(`pg-rose-${timestamp}.pdf`);
  }
  async function printRosePDF({ svg, legendEl, titleText, siteCount }){
    const canvas = await renderCanvasFromDom({ svg, legendEl });
    const pdf = createPDF(canvas);
    const margin = 20;
    pdf.setFontSize(16); pdf.setTextColor(229,231,235); pdf.text((titleText||'PG Rose - Perfect Launch Window'), margin, 15);
    pdf.setFontSize(10); pdf.setTextColor(148,163,184); if(Number.isFinite(siteCount)) pdf.text(`${siteCount} site${siteCount!==1?'s':''}`, margin, 25);
    try{ pdf.autoPrint && pdf.autoPrint({ variant: 'non-conform' }); }catch(_){/* noop */}
    const url = pdf.output('bloburl');
    const win = window.open(url, '_blank');
    if(!win){ pdf.output('dataurlnewwindow'); }
  }
  async function saveRosePNG({ svg, legendEl, filename='pg-rose.png' }){
    const canvas = await renderCanvasFromDom({ svg, legendEl });
    return new Promise((resolve, reject)=>{
      try{
        canvas.toBlob((blob)=>{
          if(!blob){ reject(new Error('png blob failed')); return; }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(()=> URL.revokeObjectURL(url), 1000);
          resolve(true);
        }, 'image/png', 1.0);
      }catch(err){ reject(err); }
    });
  }
  async function copyRosePNG({ svg, legendEl }){
    const canvas = await renderCanvasFromDom({ svg, legendEl });
    return new Promise((resolve, reject)=>{
      try{
        canvas.toBlob(async (blob)=>{
          if(!blob){ reject(new Error('png blob failed')); return; }
          try{
            if(navigator.clipboard && window.ClipboardItem){
              await navigator.clipboard.write([ new ClipboardItem({ 'image/png': blob }) ]);
              resolve(true);
            } else {
              // Fallback to download
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href=url; a.download='pg-rose.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url), 1000);
              resolve(false);
            }
          }catch(err){ reject(err); }
        }, 'image/png', 1.0);
      }catch(err){ reject(err); }
    });
  }
  window.PG.export = { saveRosePDF, printRosePDF, saveRosePNG, copyRosePNG };
})();


