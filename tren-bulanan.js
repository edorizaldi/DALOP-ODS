// Line chart SAIDI dan SAIFI bulanan Sumkal per kelompok (Distribusi, Transmisi, Pembangkit, semua kelompok), bulan yang sudah selesai.
(() => {
  const $ = (id) => document.getElementById(id);
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const f2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const G = [['dist', 'Distribusi', '#3C8D2F', 2.2], ['trans', 'Transmisi', '#2563A6', 2.2], ['kit', 'Pembangkit', '#E07B00', 2.2], ['total', 'Semua kelompok', '#0F2A4A', 3.2]];
  let ctx = { year: '', last: '' };
  const MET = [
    { id: 'saidi', name: 'SAIDI', unit: 'menit/plg', val: (r, k) => Number(r['jam_' + k]) / Number(r.pelanggan) * 60, fmt: f2, axis: (v) => f0.format(v) },
    { id: 'saifi', name: 'SAIFI', unit: 'kali/plg', val: (r, k) => Number(r['padam_' + k]) / Number(r.pelanggan), fmt: f2, axis: (v) => f2.format(v) },
  ];
  function plot(chart, ser, months, year, M) {
    chart.classList.remove('dash-skeleton'); chart.replaceChildren();
    const W = Math.max(320, chart.clientWidth), H = 300, mg = { t: 22, r: 18, b: 28, l: 44 };
    const svg = d3.select(chart).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `${M.name} bulanan Sumkal per kelompok ${year}`);
    const y = d3.scaleLinear([0, (d3.max(ser, (d) => d.total) || 1) * 1.12], [H - mg.b, mg.t]).nice();
    const yt = y.ticks(5);
    const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(M.axis(yt[yt.length - 1])); mg.l = Math.ceil(probe.node().getComputedTextLength()) + 14; probe.remove();
    const x = d3.scalePoint(months, [mg.l + 18, W - mg.r - 18]);
    svg.append('g').selectAll('line').data(yt).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(yt).join('text').attr('x', mg.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(M.axis);
    svg.append('g').selectAll('text').data(months).join('text').attr('x', x).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((m) => BS[m - 1]);
    G.forEach(([k, , c, w]) => {
      svg.append('path').datum(ser).attr('fill', 'none').attr('stroke', c).attr('stroke-width', w).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('d', d3.line().x((d) => x(d.m)).y((d) => y(d[k])))
        .attr('stroke-dasharray', k === 'total' ? '9 6' : null).attr('stroke-linecap', k === 'total' ? 'butt' : 'round');
      svg.append('g').selectAll('circle').data(ser).join('circle').attr('cx', (d) => x(d.m)).attr('cy', (d) => y(d[k])).attr('r', k === 'total' ? 4 : 3).attr('fill', c).attr('stroke', '#fff').attr('stroke-width', 1.2);
    });
    svg.append('g').selectAll('text').data(ser).join('text').attr('x', (d) => x(d.m)).attr('y', (d) => y(d.total) - 9).attr('text-anchor', 'middle').style('font-size', '11px').style('font-weight', 600)
      .attr('fill', '#0F2A4A').attr('paint-order', 'stroke').attr('stroke', '#fff').attr('stroke-width', 3).attr('stroke-linejoin', 'round').text((d) => M.fmt.format(d.total));
    const tip = mk('div', null, 'ss-tip'); tip.hidden = true; chart.append(tip);
    const step = months.length > 1 ? x(months[1]) - x(months[0]) : W;
    const guide = svg.append('line').attr('y1', mg.t).attr('y2', H - mg.b).attr('stroke', 'var(--color-fg-muted)').attr('stroke-dasharray', '3 3').attr('opacity', 0);
    svg.append('g').selectAll('rect').data(ser).join('rect').attr('x', (d) => x(d.m) - step / 2).attr('width', step).attr('y', mg.t).attr('height', H - mg.t - mg.b).attr('fill', 'transparent')
      .on('pointerenter pointermove', (ev, d) => {
        guide.attr('x1', x(d.m)).attr('x2', x(d.m)).attr('opacity', 0.6);
        tip.replaceChildren(mk('div', `${M.name} · ${BLN[d.m - 1]} ${year}`, 'ss-tip-h'));
        G.slice().reverse().forEach(([k, n, c]) => { const r = mk('div', null, 'ss-row'); const a = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = c; a.append(i, n); r.append(a, mk('span', M.fmt.format(d[k]))); if (k === 'total') r.style.fontWeight = 600; tip.append(r); });
        tip.hidden = false;
        const sc = chart.clientWidth / W, px = x(d.m) * sc, tw = tip.offsetWidth;
        tip.style.left = (px + 14 + tw > chart.clientWidth ? Math.max(0, px - tw - 14) : px + 14) + 'px'; tip.style.top = Math.max(0, y(d.total) * sc - 20) + 'px';
      })
      .on('pointerleave', () => { tip.hidden = true; guide.attr('opacity', 0); });
  }
  const draw = () => {
    const B = SSD.data('bulanan');
    if (B.status !== 'ok') { if (B.status === 'error') MET.forEach((M) => $('tb-chart-' + M.id).replaceChildren(mk('div', 'Failed to load', 'ss-fail'))); return; }
    const year = Math.max(...B.data.map((r) => Number(r.tahun)));
    const now = new Date(); const running = now.getFullYear() === year ? now.getMonth() + 1 : 13;
    const rows = B.data.filter((r) => Number(r.tahun) === year && r.level === 'Sumkal' && Number(r.bulan) < running).sort((a, b) => a.bulan - b.bulan);
    if (!rows.length) return;
    const months = rows.map((r) => Number(r.bulan)); const last = months[months.length - 1];
    ctx = { year, last: BS[last - 1] };
    $('tb-legend').replaceChildren(...G.map(([, n, c, w]) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.cssText = w > 3 ? `height:0;width:20px;border-radius:0;background:none;border-top:3px dashed ${c}` : `height:3px;width:18px;border-radius:2px;background:${c}`; s.append(i, n); return s; }));
    const sers = {};
    MET.forEach((M) => { sers[M.id] = rows.map((r) => { const o = { m: Number(r.bulan) }; G.forEach(([k]) => { o[k] = M.val(r, k); }); return o; }); plot($('tb-chart-' + M.id), sers[M.id], months, year, M); });
  };
  SSD.onData(draw);
  $('tb-dl').addEventListener('click', async () => {
    const btn = $('tb-dl'), msg = (s) => { $('tb-dl-msg').textContent = s; };
    if (!window.htmlToImage) { msg('Pembuat gambar belum termuat. Muat ulang halaman.'); return; }
    btn.disabled = true; msg('Menyiapkan gambar…'); $('tb-preview').hidden = true;
    const card = $('tb-card'); let clone = null;
    try {
      clone = card.cloneNode(true); clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      clone.querySelector('.dp-dl').remove(); const pv = clone.querySelector('.h-preview'); if (pv) pv.remove(); clone.querySelectorAll('.ss-tip').forEach((t) => t.remove());
      clone.querySelectorAll('.ss-g-wrap').forEach((w) => { w.style.overflow = 'visible'; });
      Object.assign(clone.style, { position: 'fixed', left: '-100000px', top: '0', width: Math.max(card.offsetWidth, 960) + 'px', maxWidth: 'none' });
      card.parentNode.appendChild(clone);
      const blob = await window.htmlToImage.toBlob(clone, { pixelRatio: 2, skipFonts: true, backgroundColor: '#ffffff', width: clone.offsetWidth, height: clone.offsetHeight, style: { position: 'static', left: '0', top: '0', margin: '0' } });
      if (!blob) throw new Error('gambar kosong');
      const filename = `SAIDI_SAIFI_Bulanan_per_Kelompok_Sumkal_${ctx.year}_Jan-${ctx.last}.png`;
      let dlc = null; try { dlc = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dlc = null; }
      if (dlc) { try { const res = await dlc.save({ filename, data: blob }); msg(res && res.status === 'saved' ? 'Gambar diunduh.' : ''); } catch (e) { if (e && e.code === 'declined') msg(''); else throw e; } }
      else {
        const img = $('tb-preview-img'); if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
        const url = URL.createObjectURL(blob); img.src = url; img.dataset.url = url;
        $('tb-preview-note').textContent = `Unduhan langsung tidak tersedia di tampilan ini. Klik kanan gambar di bawah lalu pilih "Simpan gambar" (${filename}).`;
        $('tb-preview').hidden = false; msg('');
      }
    } catch (e) { msg('Gagal membuat gambar: ' + (e && e.message ? e.message : e)); }
    finally { if (clone) clone.remove(); btn.disabled = false; }
  });
})();
