// Tab Kali Gangguan Penyulang: tren jumlah laporan per bulan menurut Jenis Padam (batang bertumpuk).
(() => {
  const $ = (id) => document.getElementById(id);
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const UNAME = { ACEH: 'Aceh', BABEL: 'Bangka Belitung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra', LAMPUNG: 'Lampung', RKR: 'Riau & Kepri', S2JB: 'S2JB', SUMBAR: 'Sumatera Barat', SUMUT: 'Sumatera Utara' };
  const JP = [['GANGGUAN', 'Gangguan', '#C2362B'], ['PEMELIHARAAN', 'Pemeliharaan', '#2563A6'], ['BENCANA', 'Bencana', '#E07B00']];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const cmp = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
  const pc = (v) => new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  const tc = (s) => String(s).charAt(0) + String(s).slice(1).toLowerCase();
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const chart = $('gj-chart');
  let ctx = { scope: '', per: '' };
  const draw = () => {
    const G = SSD.data('gangguan');
    if (G.status !== 'ok') { if (G.status === 'error') chart.replaceChildren(mk('div', 'Failed to load', 'ss-fail')); return; }
    const P = dash.params();
    const sel = { k: P.g_kode || null, b: P.g_bidang || null, u: P.g_unit || null, j: P.g_jenis || null };
    const rows = G.data.filter((r) => (!sel.k || r.KODE === sel.k) && (!sel.b || r.BIDANG === sel.b) && (!sel.u || r.UNIT === sel.u));
    const months = [...new Set(G.data.map((r) => Number(r.BULAN_NO)))].sort((a, b) => a - b);
    const ser = months.map((m) => { const o = { m, t: 0 }; JP.forEach(([k]) => { o[k] = 0; }); return o; });
    const ix = new Map(ser.map((d) => [d.m, d]));
    rows.forEach((r) => { const d = ix.get(Number(r.BULAN_NO)); if (d && r.JENIS_PADAM in d) { d[r.JENIS_PADAM] += Number(r.JUMLAH); d.t += Number(r.JUMLAH); } });
    const scope = [sel.k && 'Kode ' + sel.k, sel.b && tc(sel.b), sel.u ? UNAME[sel.u] || sel.u : 'Sumkal'].filter(Boolean).join(' · ');
    const per = `${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]} 2026`;
    ctx = { scope, per };
    const T = ser.reduce((a, d) => a + d.t, 0);
    const tot = JP.map(([k, n]) => [n, ser.reduce((a, d) => a + d[k], 0)]);
    $('gj-note').textContent = `Jumlah No. Laporan unik per bulan menurut jenis padam · ${scope} · ${per}. ` + (T ? 'Total: ' + tot.map(([n, v]) => `${n} ${fmt(v)} (${pc(v / T)})`).join(', ') + '.' : '') + (sel.j ? ` Jenis ${tc(sel.j)} disorot sesuai filter.` : '');
    $('gj-legend').replaceChildren(...JP.map(([, n, c]) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = c; s.append(i, n); return s; }));
    chart.classList.remove('dash-skeleton'); chart.replaceChildren();
    const W = Math.max(320, chart.clientWidth), H = 360, mg = { t: 24, r: 8, b: 28, l: 44 };
    const svg = d3.select(chart).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Tren kali gangguan per bulan menurut jenis padam');
    const y = d3.scaleLinear([0, (d3.max(ser, (d) => d.t) || 1) * 1.1], [H - mg.b, mg.t]).nice();
    const yt = y.ticks(5);
    const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(fmt(yt[yt.length - 1])); mg.l = Math.ceil(probe.node().getComputedTextLength()) + 12; probe.remove();
    const x = d3.scaleBand(months, [mg.l, W - mg.r]).padding(0.3);
    svg.append('g').selectAll('line').data(yt).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(yt).join('text').attr('x', mg.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
    svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
    svg.append('g').selectAll('text').data(months).join('text').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((d) => BS[d - 1]);
    const bw = Math.min(x.bandwidth(), 46), off = (x.bandwidth() - bw) / 2;
    const st = d3.stack().keys(JP.map((j) => j[0]))(ser);
    const gB = svg.append('g');
    st.forEach((layer, li) => {
      const [k, , c] = JP[li]; const fade = sel.j && sel.j !== k;
      gB.append('g').selectAll('rect').data(layer).join('rect').attr('x', (d) => x(d.data.m) + off).attr('width', bw).attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
        .attr('fill', c).attr('opacity', fade ? 0.25 : 1).attr('data-m', (d) => d.data.m).attr('rx', li === st.length - 1 ? 3 : 0);
      svg.append('g').selectAll('text').data(layer.filter((d) => y(d[0]) - y(d[1]) >= 14)).join('text').attr('x', (d) => x(d.data.m) + x.bandwidth() / 2).attr('y', (d) => (y(d[0]) + y(d[1])) / 2 + 3.5)
        .attr('text-anchor', 'middle').attr('fill', '#fff').attr('opacity', fade ? 0.5 : 1).style('font-size', '10px').style('font-weight', 600).style('pointer-events', 'none').text((d) => (bw < 40 && d[1] - d[0] >= 10000 ? cmp.format(d[1] - d[0]) : fmt(d[1] - d[0])));
    });
    svg.append('g').selectAll('text').data(ser).join('text').attr('x', (d) => x(d.m) + x.bandwidth() / 2).attr('y', (d) => y(d.t) - 6).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg)').style('font-size', '11px').style('font-weight', 600)
      .text((d) => (bw < 40 && d.t >= 10000 ? cmp.format(d.t) : fmt(d.t)));
    const tip = mk('div', null, 'ss-tip'); tip.hidden = true; chart.append(tip);
    svg.append('g').selectAll('rect').data(ser).join('rect').attr('x', (d) => x(d.m)).attr('width', x.bandwidth()).attr('y', mg.t).attr('height', H - mg.t - mg.b).attr('fill', 'transparent')
      .on('pointerenter pointermove', (ev, d) => {
        tip.replaceChildren(mk('div', `${BLN[d.m - 1]} 2026`, 'ss-tip-h'));
        [...JP.map(([k, n, c]) => [c, n, d[k]]).reverse(), [null, 'Total', d.t]].forEach(([c, n, v]) => { const r = mk('div', null, 'ss-row'); const a = mk('span'); if (c) { const i = mk('i', null, 'ss-sw'); i.style.background = c; a.append(i); } a.append(n); const b = mk('span', `${fmt(v)}${c && d.t ? ' · ' + pc(v / d.t) : ''}`); if (!c) b.style.fontWeight = 600; r.append(a, b); tip.append(r); });
        tip.hidden = false;
        const sc = chart.clientWidth / W, px = (x(d.m) + x.bandwidth() / 2) * sc, tw = tip.offsetWidth;
        tip.style.left = (px + 14 + tw > chart.clientWidth ? Math.max(0, px - tw - 14) : px + 14) + 'px'; tip.style.top = Math.max(0, y(d.t) * sc - 10) + 'px';
      })
      .on('pointerleave', () => { tip.hidden = true; });
  };
  SSD.onData(draw);
  $('gj-dl').addEventListener('click', () => window.SSExport({ card: 'gj-card', btn: 'gj-dl', msg: 'gj-msg', preview: 'gj-pv', minWidth: 960, filename: `Tren_Gangguan_per_Jenis_Padam_${ctx.scope.replace(/[^A-Za-z0-9]+/g, '_')}_${ctx.per.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));
})();
