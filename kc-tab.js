(() => {
  const $ = (id) => document.getElementById(id);
  const UNAME = { ACEH: 'Aceh', BABEL: 'Bangka Belitung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra', LAMPUNG: 'Lampung', RKR: 'Riau & Kepri', S2JB: 'S2JB', SUMBAR: 'Sumatera Barat', SUMUT: 'Sumatera Utara' };
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const J = [['Koreksi', 'Koreksi', 0], ['Cleansing', 'Cleansing', 3]];
  const nf = new Intl.NumberFormat('id-ID');
  const fmt = (v) => nf.format(Math.round(v));
  const pc = (v) => new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  const sgn = (v) => (v > 0 ? '+' : '') + pc(v);
  const uname = (u) => UNAME[u] || u;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const done = (id, t) => { const el = $(id); el.textContent = t; el.classList.remove('dash-skeleton'); };

  $('kc-f-kode').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) dash.setParams({ kc_kode: b.dataset.v || null }); });
  $('kc-f-unit').addEventListener('change', (e) => dash.setParams({ kc_unit: e.target.value || null, kc_up3: null }));
  $('kc-f-up3').addEventListener('change', (e) => dash.setParams({ kc_up3: e.target.value || null }));
  $('kc-reset').addEventListener('click', () => dash.setParams({ kc_kode: null, kc_unit: null, kc_up3: null }));

  const chart = $('kc-chart');
  const tip = mk('div', null, 'ss-tip'); tip.hidden = true;

  SSD.onData(() => {
    const D = SSD.data('kc_bulanan');
    if (D.status !== 'ok') {
      chart.replaceChildren();
      if (D.status === 'error') { chart.classList.remove('dash-skeleton'); chart.append(mk('div', 'Failed to load', 'ss-fail')); }
      ['kc-t1', 'kc-t2', 'kc-t3', 'kc-t4'].forEach((id) => { $(id).textContent = '—'; });
      $('kc-rincian').replaceChildren(); $('kc-unit').replaceChildren();
      return;
    }
    const rows = D.data.map((r) => ({ u: r.UID, p: r.UP3, k: r.KODE, j: r.JENIS, m: Number(r.BULAN_NO), n: Number(r.JUMLAH) }));
    const P = dash.params();
    const units = UORD.filter((u) => rows.some((r) => r.u === u));
    const sel = { k: P.kc_kode || null, u: units.includes(P.kc_unit) ? P.kc_unit : null, p: null };
    const up3s = [...new Set(rows.filter((r) => !sel.u || r.u === sel.u).map((r) => r.p))].sort((a, b) => a.localeCompare(b));
    if (P.kc_up3 && up3s.includes(P.kc_up3)) sel.p = P.kc_up3;
    const passK = (r) => !sel.k || r.k === sel.k;
    const pass = (r) => passK(r) && (!sel.u || r.u === sel.u) && (!sel.p || r.p === sel.p);

    // filter
    const kodes = [...new Set(rows.map((r) => r.k))].sort();
    const chip = (v, l, cur) => { const b = mk('button', l, 'ss-chip'); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String(v === cur)); return b; };
    $('kc-f-kode').replaceChildren(chip('', 'Semua', sel.k || ''), ...kodes.map((k) => chip(k, k, sel.k || '')));
    const su = $('kc-f-unit');
    if (su.options.length !== units.length + 1) su.replaceChildren(new Option('Semua unit (Sumkal)', ''), ...units.map((u) => new Option(uname(u), u)));
    su.value = sel.u || '';
    const sp = $('kc-f-up3');
    sp.replaceChildren(new Option(sel.u ? 'Semua UP3 di ' + uname(sel.u) : 'Semua UP3', ''), ...up3s.map((p) => new Option(p, p)));
    sp.value = sel.p || '';

    const months = [...new Set(rows.map((r) => r.m))].sort((a, b) => a - b);
    const ser = months.map((m) => ({ m, Koreksi: 0, Cleansing: 0 }));
    const idx = new Map(ser.map((d) => [d.m, d]));
    rows.forEach((r) => { if (pass(r)) idx.get(r.m)[r.j] += r.n; });
    ser.forEach((d) => { d.t = d.Koreksi + d.Cleansing; });
    const TK = sum(ser.map((d) => d.Koreksi)), TC = sum(ser.map((d) => d.Cleansing)), T = TK + TC;
    const last = ser[ser.length - 1], prev = ser[ser.length - 2];
    const where = sel.p ? 'UP3 ' + sel.p : sel.u ? uname(sel.u) : 'Sumkal';
    const scope = [sel.k && 'Kode ' + sel.k, where].filter(Boolean).join(' · ');
    const per = `${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]} 2026`;

    // peta: titik UP3, yang berdenyut = UP3 dengan event terbanyak untuk filter yang dipilih
    if (window.SSMAP) {
      const KO = SSD.data('koordinat');
      if (KO.status === 'ok') {
        const u3 = {}, uT = {};
        rows.forEach((r) => { if (!passK(r)) return; uT[r.u] = (uT[r.u] || 0) + r.n; if (!sel.u || r.u === sel.u) u3[r.p] = (u3[r.p] || 0) + r.n; });
        const kU = new Map(KO.data.filter((k) => k.level === 'UP3').map((k) => [k.unit, k]));
        const shown = Object.entries(u3).filter(([u]) => kU.has(u));
        const mx = Math.max(1, ...shown.map(([, v]) => v)), umx = Math.max(1, ...Object.values(uT));
        const top = shown.slice().sort((a, b) => b[1] - a[1])[0];
        const pts = shown.map(([u, v]) => { const k = kU.get(u); return { lon: k.lon, lat: k.lat, r: 3 + 8 * Math.sqrt(v / mx), color: SSC[0], label: u, selected: sel.p === u, pulse: !!top && top[0] === u && v > 0, pulseColor: 'var(--cds-chart-status-critical)', tip: ['UP3 ' + u, [[null, 'Event koreksi + cleansing', fmt(v)]]], onClick: () => dash.setParams({ kc_up3: sel.p === u ? null : u, kc_unit: k.uid || sel.u }) }; });
        window.SSMAP($('kc-map'), { label: 'Peta event koreksi dan cleansing per UP3', focus: sel.u, selected: sel.u, fill: (u) => `color-mix(in srgb, ${SSC[0]} ${Math.round(8 + 36 * ((uT[u] || 0) / umx))}%, var(--color-panel))`, regionTip: (u, prov) => [uname(u), [[null, prov, ''], [null, 'Event koreksi + cleansing', fmt(uT[u] || 0)]]], onRegion: (u) => dash.setParams({ kc_unit: sel.u === u ? null : u, kc_up3: null }), points: pts });
        $('kc-map-note').textContent = top && top[1] ? `Ukuran titik: jumlah event per UP3. Titik berdenyut: capaian tertinggi untuk filter yang dipilih, UP3 ${top[0]} dengan ${fmt(top[1])} event${sel.u ? ' di ' + uname(sel.u) : ''}. Klik wilayah untuk memilih unit, klik titik untuk memilih UP3.` : '';
      } else if (KO.status === 'error') $('kc-map').replaceChildren();
    }

    // event gangguan distribusi permanen / sesaat per bulan (filter kode, unit, UP3)
    const GPm = SSD.data('gangguan_ps'); const okPS = GPm.status === 'ok';
    const kset = new Set(sel.k ? [sel.k] : kodes); const ps = {};
    if (okPS) GPm.data.forEach((r) => {
      if (r.BIDANG !== 'DISTRIBUSI' || !kset.has(r.KODE) || (sel.u && r.UNIT !== sel.u) || (sel.p && r.UP3 !== sel.p)) return;
      const m = Number(r.BULAN_NO); const o = ps[m] || (ps[m] = { Permanen: 0, Sesaat: 0 }); o[r.PS] += Number(r.JUMLAH);
    });
    ser.forEach((d) => { d.Permanen = (ps[d.m] || {}).Permanen || 0; d.Sesaat = (ps[d.m] || {}).Sesaat || 0; });

    // ringkasan: poin utama = total event permanen (distribusi) dan perbandingannya dengan unit lain
    {
      const tk = $('kc-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const B = (s, cls) => { const b = mk('b', s); if (cls) b.className = cls; return b; };
      const upTo = `S.d. ${BS[months[months.length - 1] - 1]} 2026`;
      const kt = sel.k ? 'kode ' + sel.k : 'kode ' + kodes.join(' dan ');
      if (!okPS) tk.append(`${upTo}, data event permanen belum tersedia.`);
      else {
        const pU = {}, pP = {}, upOf = {};
        GPm.data.forEach((r) => {
          if (r.BIDANG !== 'DISTRIBUSI' || r.PS !== 'Permanen' || !kset.has(r.KODE) || !months.includes(Number(r.BULAN_NO))) return;
          const n = Number(r.JUMLAH); pU[r.UNIT] = (pU[r.UNIT] || 0) + n; pP[r.UP3] = (pP[r.UP3] || 0) + n; upOf[r.UP3] = r.UNIT;
        });
        const TP = sum(ser.map((d) => d.Permanen));
        const rank = (obj, key) => { const l = Object.entries(obj).sort((a, b) => b[1] - a[1]); return { l, i: l.findIndex(([x]) => x === key) + 1 }; };
        tk.append(`${upTo}, total event gangguan `, B('permanen'), ` distribusi (${kt}) ${where === 'Sumkal' ? 'Sumkal' : 'di ' + where} `, B(fmt(TP) + ' event'), '. ');
        if (!sel.u) {
          const { l } = rank(pU); const avg = TP / Math.max(1, l.length);
          if (l.length) {
            tk.append('Tertinggi ', B(`${uname(l[0][0])} ${fmt(l[0][1])}`), ` (${pc(l[0][1] / TP)} dari Sumkal)`);
            if (l[1]) tk.append(', disusul ', B(`${uname(l[1][0])} ${fmt(l[1][1])}`));
            if (l[2]) tk.append(' dan ', B(`${uname(l[2][0])} ${fmt(l[2][1])}`));
            const lo = l[l.length - 1]; tk.append('; terendah ', B(`${uname(lo[0])} ${fmt(lo[1])}`), '. ');
          }
        } else if (!sel.p) {
          const { l, i } = rank(pU, sel.u); const v = pU[sel.u] || 0; const avg = sum(Object.values(pU)) / Math.max(1, l.length);
          tk.append(`${uname(sel.u)} berada di `, B(`peringkat ${i} dari ${l.length} UID`), ` (${pc(v / Math.max(1, sum(Object.values(pU))))} dari Sumkal). `);
          if (i > 1) tk.append('Di bawah ', B(`${uname(l[i - 2][0])} ${fmt(l[i - 2][1])}`)); if (i < l.length) tk.append(i > 1 ? ', di atas ' : 'Di atas ', B(`${uname(l[i][0])} ${fmt(l[i][1])}`)); tk.append('. ');
          const sub = Object.entries(pP).filter(([p]) => upOf[p] === sel.u).sort((a, b) => b[1] - a[1]);
          if (sub.length) tk.append('UP3 tertinggi ', B(`${sub[0][0]} ${fmt(sub[0][1])}`), '. ');
        } else {
          const peers = Object.fromEntries(Object.entries(pP).filter(([p]) => upOf[p] === (sel.u || upOf[sel.p])));
          const { l, i } = rank(peers, sel.p); const v = peers[sel.p] || 0; const avg = sum(Object.values(peers)) / Math.max(1, l.length);
          const allUP3 = rank(pP, sel.p);
          tk.append(`UP3 ${sel.p} berada di `, B(`peringkat ${i} dari ${l.length} UP3`), ` di ${uname(sel.u || upOf[sel.p])} dan peringkat ${allUP3.i} dari ${allUP3.l.length} UP3 Sumkal. `);
        }
        if (prev) { const a2 = last.Permanen, b2 = prev.Permanen; if (b2) { const d = (a2 - b2) / b2; tk.append(`${BLN[last.m - 1]} `, B(fmt(a2)), ', ', B(sgn(d), d > 0 ? 'ss-bad' : 'ss-ok'), ` dibanding ${BLN[prev.m - 1]}. `); } }
      }
    }

    // kotak angka: permanen, sesaat, cleansing, koreksi — jumlah event dan perbandingan bulan terakhir vs sebelumnya
    [['kc-t1', 'Permanen', okPS], ['kc-t2', 'Sesaat', okPS], ['kc-t3', 'Cleansing', true], ['kc-t4', 'Koreksi', true]].forEach(([id, f, ok]) => {
      const sub = $(id + '-sub'); sub.replaceChildren();
      if (!ok) { done(id, '—'); return; }
      done(id, fmt(sum(ser.map((d) => d[f]))));
      if (prev) {
        const a = last[f], b = prev[f];
        const chg = mk('span', b ? sgn((a - b) / b) : a ? 'baru' : '0%', 'ss-kc-chg ' + (a > b ? 'ss-bad' : a < b ? 'ss-ok' : 'flat'));
        sub.append(chg, `${BS[last.m - 1]} ${fmt(a)} vs ${BS[prev.m - 1]} ${fmt(b)}`);
      } else sub.append(per);
    });

    // judul, legenda
    const BARS = [['Permanen', 'Permanen', 4], ['Sesaat', 'Sesaat', 6], ['Cleansing', 'Cleansing', 3]];
    const LINE = SSC[0];
    const sl = $('kc-sel'); sl.replaceChildren('Unit dipilih: ', mk('b', scope), ` · batang: event gangguan distribusi permanen dan sesaat, serta cleansing · garis: koreksi`);
    $('kc-legend').replaceChildren(...BARS.map(([, n, ci]) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = SSC[ci]; s.append(i, n); return s; }),
      (() => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.cssText = `height:3px;width:16px;border-radius:2px;background:${LINE}`; s.append(i, 'Koreksi (garis)'); return s; })());

    // grafik: batang berdampingan (permanen, sesaat, cleansing) + garis koreksi, per bulan
    chart.classList.remove('dash-skeleton'); chart.replaceChildren();
    const W = Math.max(300, chart.clientWidth), H = 360, m = { t: 26, r: 8, b: 28, l: 40 };
    const svg = d3.select(chart).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Event permanen, sesaat dan cleansing (batang) serta koreksi (garis) per bulan, ' + scope);
    const ymax = d3.max(ser, (d) => Math.max(d.Permanen, d.Sesaat, d.Cleansing, d.Koreksi)) || 1;
    const y = d3.scaleLinear([0, ymax * 1.12], [H - m.b, m.t]).nice();
    const yt = y.ticks(5);
    const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(fmt(yt[yt.length - 1]));
    m.l = Math.ceil(probe.node().getComputedTextLength()) + 12; probe.remove();
    const x = d3.scaleBand(months, [m.l, W - m.r]).padding(0.2);
    const x1 = d3.scaleBand(BARS.map((b) => b[0]), [0, x.bandwidth()]).padding(0.08);
    svg.append('g').selectAll('line').data(yt).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(yt).join('text').attr('x', m.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
    svg.append('g').selectAll('text').data(months).join('text').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((d) => BS[d - 1]);
    const bw = Math.min(x1.bandwidth(), 24), off = (x1.bandwidth() - bw) / 2;
    const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
    const lab = (v) => (v >= 10000 ? compact.format(v) : fmt(v));
    const gBars = svg.append('g');
    BARS.forEach(([key, , ci]) => {
      gBars.append('g').selectAll('rect').data(ser).join('rect').attr('x', (d) => x(d.m) + x1(key) + off).attr('width', bw)
        .attr('y', (d) => y(d[key])).attr('height', (d) => Math.max(0, y(0) - y(d[key]))).attr('rx', 3).attr('fill', SSC[ci]).attr('data-m', (d) => d.m);
      if (bw >= 20) svg.append('g').selectAll('text').data(ser.filter((d) => d[key] > 0)).join('text').attr('x', (d) => x(d.m) + x1(key) + x1.bandwidth() / 2).attr('y', (d) => y(d[key]) - 5)
        .attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', '10px').text((d) => lab(d[key]));
    });
    // garis koreksi
    const cx = (d) => x(d.m) + x.bandwidth() / 2;
    svg.append('path').datum(ser).attr('fill', 'none').attr('stroke', LINE).attr('stroke-width', 2.5).attr('stroke-linejoin', 'round').attr('d', d3.line().x(cx).y((d) => y(d.Koreksi)));
    svg.append('g').selectAll('circle').data(ser).join('circle').attr('cx', cx).attr('cy', (d) => y(d.Koreksi)).attr('r', 4).attr('fill', LINE).attr('stroke', 'var(--color-panel)').attr('stroke-width', 1.5);
    const kl = svg.append('g').selectAll('text').data(ser).join('text').attr('x', cx).attr('y', (d) => y(d.Koreksi) - 9).attr('text-anchor', 'middle').style('font-size', '11px').style('font-weight', 600)
      .attr('fill', 'var(--color-fg)').attr('paint-order', 'stroke').attr('stroke', 'var(--color-panel)').attr('stroke-width', 3).attr('stroke-linejoin', 'round').text((d) => lab(d.Koreksi));
    if (x.bandwidth() < 40) kl.remove();
    chart.append(tip);
    svg.append('g').selectAll('rect').data(ser).join('rect').attr('x', (d) => x(d.m)).attr('width', x.bandwidth()).attr('y', m.t).attr('height', H - m.t - m.b).attr('fill', 'transparent')
      .on('pointerenter pointermove', (ev, d) => {
        gBars.selectAll('rect').attr('opacity', function () { return Number(this.dataset.m) === d.m ? 1 : 0.35; });
        tip.replaceChildren(mk('div', BLN[d.m - 1] + ' 2026', 'ss-tip-h'));
        [...BARS.map(([k, n, ci]) => [SSC[ci], n, d[k]]), [LINE, 'Koreksi', d.Koreksi], [null, 'Permanen + sesaat + cleansing', d.Permanen + d.Sesaat + d.Cleansing]].forEach(([c, n, v]) => {
          const r = mk('div', null, 'ss-row'); const a = mk('span'); if (c) { const i = mk('i', null, 'ss-sw'); i.style.background = c; a.append(i); } a.append(n);
          const b = mk('span', fmt(v)); if (!c) b.style.fontWeight = 600; r.append(a, b); tip.append(r);
        });
        tip.hidden = false;
        const sc = chart.clientWidth / W, px = cx(d) * sc, tw = tip.offsetWidth;
        tip.style.left = Math.min(Math.max(0, px + 14), chart.clientWidth - tw) + 'px';
        if (px + 14 + tw > chart.clientWidth) tip.style.left = Math.max(0, px - tw - 14) + 'px';
        tip.style.top = Math.max(0, y(Math.max(d.Permanen, d.Sesaat, d.Cleansing, d.Koreksi)) * sc - 10) + 'px';
      })
      .on('pointerleave', () => { tip.hidden = true; gBars.selectAll('rect').attr('opacity', 1); });

    // rincian bulanan (+ event gangguan distribusi permanen / sesaat per bulan)
    {
      const pv = (m, f) => (okPS ? fmt((ps[m] || {})[f] || 0) : '—');
      const psc = (m, c) => (okPS ? fmt(((ps[m] || {}).Permanen || 0) + ((ps[m] || {}).Sesaat || 0) + c) : '—');
      const th = mk('thead'), hr1 = mk('tr'), hr = mk('tr');
      const g1 = mk('th', ''); const g2 = mk('th', 'Koreksi & cleansing (disetujui)', 'ss-kc-grp'); g2.colSpan = 3; const g3 = mk('th', 'Event gangguan distribusi', 'ss-kc-grp'); g3.colSpan = 2; const g4 = mk('th', '', 'ss-kc-grp');
      hr1.append(g1, g2, g3, g4);
      ['Bulan', 'Koreksi', 'Cleansing', 'Porsi cleansing', 'Permanen', 'Sesaat', 'Permanen + sesaat + cleansing'].forEach((h, i) => { const c = mk('th', h); if (i === 1 || i === 2) c.style.boxShadow = `inset 0 3px 0 ${SSC[J[i - 1][2]]}`; if (i === 4 || i === 6) c.className = 'ss-kc-sep'; hr.append(c); });
      th.append(hr1, hr);
      const tb = mk('tbody');
      ser.forEach((d) => {
        const tr = mk('tr'); tr.append(mk('td', BLN[d.m - 1]), mk('td', fmt(d.Koreksi)), mk('td', fmt(d.Cleansing)), mk('td', d.t ? pc(d.Cleansing / d.t) : '–'), mk('td', pv(d.m, 'Permanen'), 'ss-kc-sep'), mk('td', pv(d.m, 'Sesaat')), mk('td', psc(d.m, d.Cleansing), 'ss-kc-sep ss-kc-sum')); tb.append(tr);
      });
      const totN = (f) => sum(months.map((m) => (ps[m] || {})[f] || 0)); const tot = (f) => (okPS ? fmt(totN(f)) : '—');
      const tf = mk('tfoot'), fr = mk('tr');
      fr.append(mk('td', 'Total'), mk('td', fmt(TK)), mk('td', fmt(TC)), mk('td', T ? pc(TC / T) : '–'), mk('td', tot('Permanen'), 'ss-kc-sep'), mk('td', tot('Sesaat')), mk('td', okPS ? fmt(totN('Permanen') + totN('Sesaat') + TC) : '—', 'ss-kc-sep ss-kc-sum')); tf.append(fr);
      $('kc-rincian').replaceChildren(th, tb, tf);
    }

    // per unit: semua unit -> per UID; UID dipilih -> per UP3
    {
      const by = new Map();
      rows.forEach((r) => { if (!passK(r) || (sel.u && r.u !== sel.u)) return; const key = sel.u ? r.p : r.u; const o = by.get(key) || { key, Koreksi: 0, Cleansing: 0 }; o[r.j] += r.n; by.set(key, o); });
      // event gangguan permanen / sesaat (kolom P/S di data Event Padam Penyulang), kode dan bulan yang sama
      const GP = SSD.data('gangguan_ps'); const hasPS = GP.status === 'ok';
      const kodeSet = new Set(sel.k ? [sel.k] : kodes); const mSet = new Set(months);
      if (hasPS) GP.data.forEach((r) => {
        if (r.BIDANG !== 'DISTRIBUSI' || !kodeSet.has(r.KODE) || !mSet.has(Number(r.BULAN_NO)) || (sel.u && r.UNIT !== sel.u)) return;
        const key = sel.u ? r.UP3 : r.UNIT; const o = by.get(key) || { key, Koreksi: 0, Cleansing: 0 };
        o[r.PS] = (o[r.PS] || 0) + Number(r.JUMLAH); by.set(key, o);
      });
      const list = [...by.values()].filter((o) => o.Koreksi + o.Cleansing > 0 || !String(o.key).startsWith('UP3 tidak')).map((o) => ({ ...o, Permanen: o.Permanen || 0, Sesaat: o.Sesaat || 0, t: o.Koreksi + o.Cleansing })).sort((a, b) => b.t - a.t);
      $('kc-unit-h').textContent = sel.u ? 'Per UP3 di ' + uname(sel.u) : 'Per unit induk';
      $('kc-unit-note').textContent = `${sel.k ? 'Kode ' + sel.k : 'Kode ' + kodes.join(' dan ')}, ${per}. Event permanen dan sesaat diambil dari kolom P/S data Event Padam Penyulang, hanya bidang Distribusi, dengan kode dan bulan yang sama; No. Laporan yang sama dihitung satu kali. Klik baris untuk memilih ${sel.u ? 'UP3' : 'unit'}.`;
      const th = mk('thead'), hr1 = mk('tr'), hr = mk('tr');
      const g1 = mk('th', ''); g1.rowSpan = 1; const g2 = mk('th', 'Koreksi & cleansing (disetujui)', 'ss-kc-grp'); g2.colSpan = 2; const g3 = mk('th', 'Event gangguan distribusi', 'ss-kc-grp'); g3.colSpan = 2; const g4 = mk('th', '', 'ss-kc-grp');
      hr1.append(g1, g2, g3, g4);
      [sel.u ? 'UP3' : 'Unit', 'Koreksi', 'Cleansing', 'Permanen', 'Sesaat', 'Permanen + sesaat + cleansing'].forEach((h, i) => { const c = mk('th', h); if (i === 3 || i === 5) c.className = 'ss-kc-sep'; hr.append(c); }); th.append(hr1, hr);
      const tb = mk('tbody');
      list.forEach((o) => {
        const on = sel.u ? sel.p === o.key : false;
        const tr = mk('tr', null, on ? 'ss-g-on' : ''); tr.style.cursor = 'pointer'; tr.tabIndex = 0;
        const act = () => (sel.u ? dash.setParams({ kc_up3: sel.p === o.key ? null : o.key }) : dash.setParams({ kc_unit: o.key, kc_up3: null }));
        tr.addEventListener('click', act); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
        tr.append(mk('td', sel.u ? o.key : uname(o.key)), mk('td', fmt(o.Koreksi)), mk('td', fmt(o.Cleansing)), mk('td', hasPS ? fmt(o.Permanen) : '—', 'ss-kc-sep'), mk('td', hasPS ? fmt(o.Sesaat) : '—'), mk('td', hasPS ? fmt(o.Permanen + o.Sesaat + o.Cleansing) : '—', 'ss-kc-sep ss-kc-sum')); tb.append(tr);
      });
      const tf = mk('tfoot'), fr = mk('tr'); const S2 = (f) => fmt(sum(list.map((o) => o[f])));
      fr.append(mk('td', 'Total'), mk('td', S2('Koreksi')), mk('td', S2('Cleansing')), mk('td', hasPS ? S2('Permanen') : '—', 'ss-kc-sep'), mk('td', hasPS ? S2('Sesaat') : '—'), mk('td', hasPS ? fmt(sum(list.map((o) => o.Permanen + o.Sesaat + o.Cleansing))) : '—', 'ss-kc-sep ss-kc-sum')); tf.append(fr);
      $('kc-unit').replaceChildren(th, tb, tf);
    }
  });
})();
