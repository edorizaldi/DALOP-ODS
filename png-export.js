// Ekspor kotak (card) ke PNG: window.SSExport({card, btn, msg, preview, filename, caption})
window.SSExport = async (o) => {
  const $ = (id) => document.getElementById(id);
  const btn = $(o.btn), msg = (s) => { $(o.msg).textContent = s; }, pv = $(o.preview);
  if (!window.htmlToImage) { msg('Pembuat gambar belum termuat. Muat ulang halaman.'); return; }
  btn.disabled = true; msg('Menyiapkan gambar…'); pv.hidden = true;
  const card = $(o.card); let clone = null;
  try {
    const tbl = card.querySelector('table'); const need = (tbl ? tbl.scrollWidth : card.offsetWidth) + 34;
    clone = card.cloneNode(true); clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    clone.querySelectorAll('.dp-dl, .h-preview, .ss-tip').forEach((e) => e.remove());
    clone.querySelectorAll('.ss-g-wrap').forEach((w) => { w.style.overflow = 'visible'; });
    // kolom yang tidak ikut di gambar (dicocokkan dengan teks judul kolom)
    if (o.hideCols && o.hideCols.length) clone.querySelectorAll('table').forEach((tb) => {
      const hr = tb.querySelector('thead tr'); if (!hr) return;
      const idx = [...hr.children].map((c, i) => (o.hideCols.includes(c.textContent.trim()) ? i : -1)).filter((i) => i >= 0).sort((a, b) => b - a);
      tb.querySelectorAll('tr').forEach((tr) => idx.forEach((i) => { if (tr.children[i]) tr.children[i].remove(); }));
    });
    if (o.caption) { const c = document.createElement('p'); c.className = 'ss-note'; c.textContent = o.caption; const h = clone.querySelector('.dp-head') || clone.firstElementChild; h.after(c); }
    Object.assign(clone.style, { position: 'fixed', left: '-100000px', top: '0', width: Math.max(card.offsetWidth, need, o.minWidth || 0) + 'px', maxWidth: 'none' });
    card.parentNode.appendChild(clone);
    const blob = await window.htmlToImage.toBlob(clone, { pixelRatio: 2, skipFonts: true, backgroundColor: '#ffffff', width: clone.offsetWidth, height: clone.offsetHeight, style: { position: 'static', left: '0', top: '0', margin: '0' } });
    if (!blob) throw new Error('gambar kosong');
    let dlc = null; try { dlc = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dlc = null; }
    if (dlc) { try { const res = await dlc.save({ filename: o.filename, data: blob }); msg(res && res.status === 'saved' ? 'Gambar diunduh.' : ''); } catch (e) { if (e && e.code === 'declined') msg(''); else throw e; } }
    else {
      const img = pv.querySelector('img'); if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
      const url = URL.createObjectURL(blob); img.src = url; img.dataset.url = url;
      pv.querySelector('.ss-note').textContent = `Unduhan langsung tidak tersedia di tampilan ini. Klik kanan gambar di bawah lalu pilih "Simpan gambar" (${o.filename}).`;
      pv.hidden = false; msg('');
    }
  } catch (e) { msg('Gagal membuat gambar: ' + (e && e.message ? e.message : e)); }
  finally { if (clone) clone.remove(); btn.disabled = false; }
};
