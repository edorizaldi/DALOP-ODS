// Tab Database > Database Gardu Induk (draft).
// Data: gi_master (Master GI: koordinat, UP3, ULP) dan gi_tegangan (tegangan max harian 20 kV per trafo/incoming GI).
// Layout mengikuti tab Database Penyulang: filter UID → UP3 → GI, peta, tile, profil + chart, tabel.
(() => {
  const $ = (id) => document.getElementById(id);
  const UIDS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const ULABEL = { ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID Riau Kepri', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID Kalselteng', KALTIMRA: 'UID Kaltimra' };
  const BLNF = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const f1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const f2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const kv = (v) => (v == null || !isFinite(v) ? '—' : f2.format(v));
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  // batas tegangan 20 kV: +5% = 21 kV, +10% = 22 kV, -10% = 18 kV
  const VN = 20, HI = 21, HI2 = 22, LO = 18;
  const KELAS = {
    s: { t: 'Di atas 22 kV', c: 'var(--color-bad)' },
    h: { t: '21–22 kV', c: 'var(--color-warn)' },
    n: { t: '18–21 kV', c: 'var(--color-ok)' },
    l: { t: 'Di bawah 18 kV', c: '#2f6fb3' },
    x: { t: 'Tanpa data tegangan', c: 'var(--cds-chart-muted)' },
  };
  const giName = (n) => (/^GI/i.test(n || '') ? n : 'GI ' + n);
  const kelasOf = (mx, mn) => (mx == null ? 'x' : mx > HI2 ? 's' : mx > HI ? 'h' : mn != null && mn < LO ? 'l' : 'n');

  ['gi-f-uid', 'gi-f-up3', 'gi-f-gi'].forEach((id) => {
    $(id).addEventListener('change', (e) => {
      const v = e.target.value || null;
      if (id === 'gi-f-uid') dash.setParams({ gi_uid: v, gi_up3: null, gi_kode: null });
      else if (id === 'gi-f-up3') dash.setParams({ gi_up3: v, gi_kode: null });
      else dash.setParams({ gi_kode: v });
    });
  });
  let q = '';
  $('gi-search').addEventListener('input', (e) => { q = e.target.value.trim().toUpperCase(); drawTable(); });
  const pick = (e) => { const tr = e.target.closest('tr[data-kode]'); if (tr && tr.dataset.kode) dash.setParams({ gi_kode: tr.dataset.kode }); };
  $('gi-tabel').addEventListener('click', pick);
  $('gi-tabel').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); } });

  const chart = $('gi-chart');
  let cache = null, IDX = null, list = [], sel = null, up3 = null, days = [];

  // ringkasan per trafo dan per GI
  function index(MS, TG) {
    const per = TG.length ? String(TG[0].periode || '') : '';
    const [yy, mm] = per.split('-').map(Number);
    const nd = TG.length ? TG[0].v.length : 0;
    days = Array.from({ length: nd }, (_, i) => i + 1);
    const tr = TG.map((t) => {
      const v = t.v.map((x) => (x == null || x === '' ? null : Number(x)));
      const ok = v.map((x, i) => [x, i]).filter(([x]) => x != null);
      const mx = ok.length ? ok.reduce((a, b) => (b[0] > a[0] ? b : a)) : null;
      const mn = ok.length ? ok.reduce((a, b) => (b[0] < a[0] ? b : a)) : null;
      const kurang = (t.jamhari || []).filter((j) => j != null && j !== '' && Number(j) < 24).length;
      return { ...t, v, mx: mx ? mx[0] : null, mxD: mx ? mx[1] + 1 : null, mn: mn ? mn[0] : null, avg: ok.length ? ok.reduce((a, b) => a + b[0], 0) / ok.length : null,
        nHi: ok.filter(([x]) => x > HI).length, nLo: ok.filter(([x]) => x < LO).length, nOk: ok.length, kurang, kelas: kelasOf(mx ? mx[0] : null, mn ? mn[0] : null) };
    });
    const byKode = new Map(); tr.forEach((t) => { if (!t.kode) return; const a = byKode.get(t.kode) || []; a.push(t); byKode.set(t.kode, a); });
    byKode.forEach((a) => a.sort((x, y) => String(x.trafo).localeCompare(String(y.trafo), 'id', { numeric: true })));
    const gis = MS.map((g) => {
      const t = byKode.get(g.kode) || [];
      const vals = t.filter((x) => x.mx != null);
      const mx = vals.length ? Math.max(...vals.map((x) => x.mx)) : null;
      const mn = vals.length ? Math.min(...vals.map((x) => x.mn)) : null;
      const top = vals.find((x) => x.mx === mx) || null;
      return { ...g, t, mx, mn, top, nHi: t.reduce((a, x) => a + x.nHi, 0), kelas: kelasOf(mx, mn), hasXY: g.lat !== '' && g.lon !== '' && g.lat != null };
    });
    const unmatched = tr.filter((t) => !t.kode || !MS.some((g) => g.kode === t.kode));
    return { yy, mm, gis, tr, unmatched, byKode };
  }

  function spark(v) {
    const W = 96, H = 22, lo = 17.5, hi = 23;
    const y = (x) => H - 2 - (Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo) * (H - 4);
    const xs = (i) => 2 + i * (W - 4) / Math.max(1, v.length - 1);
    const pts = v.map((x, i) => (x == null ? null : `${xs(i).toFixed(1)},${y(x).toFixed(1)}`));
    let d = ''; pts.forEach((p, i) => { if (!p) return; d += (i && pts[i - 1] ? 'L' : 'M') + p; });
    const ns = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('class', 'gi-spark'); s.setAttribute('aria-hidden', 'true');
    const ln = (yy, c) => { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', 0); l.setAttribute('x2', W); l.setAttribute('y1', yy); l.setAttribute('y2', yy); l.setAttribute('stroke', c); l.setAttribute('stroke-dasharray', '2 2'); l.setAttribute('stroke-width', '.8'); s.append(l); };
    ln(y(HI), 'var(--color-warn)'); ln(y(LO), '#2f6fb3');
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'var(--color-fg)'); p.setAttribute('stroke-width', '1.3'); s.append(p);
    return s;
  }
  const pill = (k) => { const s = mk('span', KELAS[k].t, 'gi-pill'); s.style.setProperty('--gi-c', KELAS[k].c); return s; };

  function drawTable() {
    const tb = $('gi-tabel');
    const head = mk('thead'), hr = mk('tr');
    [['Gardu induk', 'ss-l'], ['ULP', 'ss-l ss-hide-n'], ['Trafo', 'ss-l'], [`Tren ${BLN[(IDX.mm || 1) - 1]}`, 'ss-hide-n'], ['Max (kV)'], ['Rata-rata max (kV)', 'ss-hide-n'], ['Min max (kV)', 'ss-hide-n'], ['Hari > 21 kV'], ['Kelas', 'ss-l'], ['Catatan data', 'ss-l ss-hide-n']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
    head.append(hr);
    const body = mk('tbody'); let n = 0;
    list.filter((g) => !q || g.nama.toUpperCase().includes(q) || String(g.ulp).toUpperCase().includes(q) || String(g.kode).toUpperCase().includes(q)).forEach((g) => {
      const rows = g.t.length ? g.t : [null];
      rows.forEach((t, i) => {
        n++;
        const tr = mk('tr', null, g.kode === sel ? 'ss-p-on' : ''); tr.dataset.kode = g.kode; tr.tabIndex = 0;
        const nm = mk('td', i ? '' : g.nama, 'ss-l'); if (!i && !g.hasXY) nm.append(mk('span', 'tanpa koordinat', 'ss-p-flag'));
        tr.append(nm, mk('td', i ? '' : g.ulp || '—', 'ss-l ss-hide-n'), mk('td', t ? t.trafo || '—' : '—', 'ss-l'));
        const sp = mk('td', null, 'ss-hide-n'); if (t) sp.append(spark(t.v)); tr.append(sp);
        const mxTd = mk('td', t ? kv(t.mx) : '—', 'ss-hl'); if (t && t.mx != null) mxTd.style.color = KELAS[t.kelas].c; tr.append(mxTd);
        tr.append(mk('td', t ? kv(t.avg) : '—', 'ss-hide-n'), mk('td', t ? kv(t.mn) : '—', 'ss-hide-n'), mk('td', t ? (t.nOk ? `${t.nHi} / ${t.nOk}` : '—') : '—'));
        const kc = mk('td', null, 'ss-l'); kc.append(pill(t ? t.kelas : 'x')); tr.append(kc);
        const cat = []; if (t) { if (t.konstan) cat.push('nilai konstan sebulan'); if (Number(t.anomali)) cat.push(`${t.anomali} hari ada bacaan > 25 kV dibuang`); if (t.kurang) cat.push(`${t.kurang} hari data < 24 jam`); if (/dicek/i.test(t.cocok)) cat.push('pencocokan perlu dicek'); }
        tr.append(mk('td', cat.join(' · ') || (t ? '—' : 'belum ada di file monitoring tegangan'), 'ss-l ss-hide-n gi-cat'));
        body.append(tr);
      });
    });
    tb.replaceChildren(head, body);
    $('gi-tabel-note').textContent = `${fmt(list.length)} GI di UP3 ${up3} (${fmt(n)} baris trafo/incoming), diurutkan dari tegangan max tertinggi. "Hari > 21 kV" = jumlah hari tegangan max harian di atas 21 kV dari hari yang punya data. Klik baris untuk melihat profil dan chart hariannya.`;
  }

  SSD.onData(() => {
    const M = SSD.data('gi_master'), T = SSD.data('gi_tegangan');
    if (M.status !== 'ok' || T.status !== 'ok') {
      if (M.status === 'error' || T.status === 'error') { chart.classList.remove('dash-skeleton'); chart.replaceChildren(mk('div', 'Failed to load', 'ss-fail')); }
      return;
    }
    if (cache !== T.data) { cache = T.data; IDX = index(M.data, T.data); }
    const prm = dash.params();
    const uid = UIDS.includes(prm.gi_uid) ? prm.gi_uid : null;
    const per = IDX.mm ? `${BLNF[IDX.mm - 1]} ${IDX.yy}` : '';
    const scope = IDX.gis.filter((g) => !uid || g.uid === uid);

    // UP3: default = UP3 dengan GI terbanyak yang punya data tegangan
    const up3M = new Map(); scope.forEach((g) => { const o = up3M.get(g.up3) || { uid: g.uid, n: 0, d: 0 }; o.n++; if (g.t.length) o.d++; up3M.set(g.up3, o); });
    const up3s = [...up3M.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    up3 = up3M.has(prm.gi_up3) ? prm.gi_up3 : (up3s.slice().sort((a, b) => b[1].d - a[1].d || b[1].n - a[1].n)[0] || [null])[0];

    const su = $('gi-f-uid');
    if (!su.options.length) su.replaceChildren(new Option('Semua UID', ''), ...UIDS.map((u) => new Option(ULABEL[u], u)));
    su.value = uid || '';
    $('gi-f-up3').replaceChildren(...up3s.map(([u, o]) => new Option(`${u} · ${fmt(o.n)} GI`, u))); $('gi-f-up3').value = up3 || '';

    list = scope.filter((g) => g.up3 === up3).sort((a, b) => (b.mx ?? -1) - (a.mx ?? -1) || a.nama.localeCompare(b.nama));
    const selG = list.find((g) => g.kode === prm.gi_kode) || list[0];
    sel = selG ? selG.kode : null;
    $('gi-f-gi').replaceChildren(...list.map((g) => new Option(`${g.nama} · ${g.mx != null ? kv(g.mx) + ' kV' : 'tanpa data'}`, g.kode))); $('gi-f-gi').value = sel || '';

    // ringkasan
    {
      const tk = $('gi-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const Bb = (s) => mk('b', s);
      const sTr = IDX.tr.filter((t) => (!uid || t.uid === uid) && t.mx != null);
      const sHi = sTr.filter((t) => t.mx > HI).length, sS = sTr.filter((t) => t.mx > HI2).length;
      const sGi = scope.filter((g) => g.t.length).length;
      tk.append(`${uid ? ULABEL[uid] : 'Regional SUMKAL'} punya `, Bb(`${fmt(scope.length)} GI`), ' di Master GI, ', Bb(`${fmt(scope.filter((g) => g.hasXY).length)}`), ' di antaranya berkoordinat. ');
      tk.append(`Tegangan 20 kV ${per} tersedia untuk `, Bb(`${fmt(sGi)} GI (${fmt(sTr.length)} trafo/incoming)`), '; ', Bb(`${fmt(sHi)} trafo`), ' pernah di atas 21 kV (+5%)');
      if (sS) tk.append(', ', Bb(fmt(sS)), ' di antaranya di atas 22 kV');
      tk.append('. ');
      if (selG && selG.mx != null) tk.append(`${giName(selG.nama)}: max `, Bb(`${kv(selG.mx)} kV`), selG.top ? ` di ${selG.top.trafo || 'trafo'} tanggal ${selG.top.mxD} ${BLNF[IDX.mm - 1]}.` : '.');
      else if (selG) tk.append(`${giName(selG.nama)} belum ada di file monitoring tegangan.`);
    }

    // peta GI
    if (window.SSMAP) {
      const pts = scope.filter((g) => g.hasXY).map((g) => ({ lon: g.lon, lat: g.lat, r: g.kode === sel ? 7 : g.up3 === up3 ? 5 : 3.6, color: KELAS[g.kelas].c, selected: g.kode === sel,
        label: g.kode === sel || (uid && g.up3 === up3 && g.kelas === 's') ? g.nama : '',
        tip: [g.nama, [[null, 'UP3', g.up3 || '—'], [null, 'Tegangan max', g.mx != null ? kv(g.mx) + ' kV' : 'tanpa data'], [null, 'Trafo dipantau', fmt(g.t.length)]]],
        onClick: () => dash.setParams({ gi_uid: uid ? g.uid : null, gi_up3: g.up3, gi_kode: g.kode }) }));
      const cnt = {}; scope.forEach((g) => { cnt[g.uid] = (cnt[g.uid] || 0) + 1; });
      window.SSMAP($('gi-map'), { label: 'Peta gardu induk', focus: uid, fill: () => 'color-mix(in srgb, var(--ss-acc) 12%, var(--color-panel))', regionTip: (r, prov) => [ULABEL[r] || r, [[null, prov, ''], [null, 'Gardu induk', fmt(IDX.gis.filter((g) => g.uid === r).length)]]], onRegion: (r) => dash.setParams({ gi_uid: uid === r ? null : r, gi_up3: null, gi_kode: null }), points: pts });
      const lg = $('gi-map-legend'); lg.replaceChildren(...['s', 'h', 'n', 'l', 'x'].map((k) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = KELAS[k].c; i.style.borderRadius = '50%'; s.append(i, KELAS[k].t); return s; }));
      $('gi-map-note').textContent = `Titik: GI berkoordinat, warna = tegangan max ${per} (trafo tertinggi di GI itu). ${fmt(scope.length - scope.filter((g) => g.hasXY).length)} GI tanpa koordinat tidak tampil. Klik titik untuk memilih GI, klik wilayah untuk memilih UID.`;
    }

    // tile
    const done = (id, t) => { const e = $(id); e.textContent = t; e.classList.remove('dash-skeleton'); };
    const trU = list.flatMap((g) => g.t).filter((t) => t.mx != null);
    $('gi-t1-l').textContent = `GI di UP3 ${up3}`;
    done('gi-t1', fmt(list.length)); $('gi-t1-sub').textContent = `${fmt(list.filter((g) => g.hasXY).length)} berkoordinat · ${fmt(list.filter((g) => g.t.length).length)} punya data tegangan`;
    done('gi-t2', fmt(trU.length)); $('gi-t2-sub').textContent = `trafo/incoming dengan data ${per}`;
    const topT = trU.slice().sort((a, b) => b.mx - a.mx)[0];
    done('gi-t3', topT ? kv(topT.mx) : '—'); $('gi-t3-name').textContent = topT ? `${topT.gi} · ${topT.trafo}` : ''; $('gi-t3-sub').textContent = topT ? `tanggal ${topT.mxD} ${BLNF[IDX.mm - 1]}` : 'belum ada data tegangan';
    const nHi = trU.filter((t) => t.mx > HI).length;
    done('gi-t4', fmt(nHi)); $('gi-t4-sub').textContent = trU.length ? `${f1.format(nHi / trU.length * 100)}% trafo/incoming UP3` : '';

    // profil
    const dl = $('gi-profil'); dl.replaceChildren();
    if (selG) {
      const row = (label, val, cls) => { const dd = mk('dd', val == null || val === '' ? '—' : String(val), cls); dl.append(mk('dt', label), dd); return dd; };
      const nm = row('Gardu induk', selG.nama, 'ss-p-name'); nm.append(' '); nm.append(pill(selG.kelas));
      row('Kode jaringan · aset', `${selG.kode || '—'} · ${selG.aset || '—'}`);
      row('UP3 · UID', `${selG.up3 || '—'}${selG.uid ? ' · ' + (ULABEL[selG.uid] || selG.uid) : ''}`);
      row('ULP', selG.ulp); row('Alamat', selG.alamat);
      row('Koordinat', selG.hasXY ? `${selG.lat}, ${selG.lon}` : 'belum ada di Master GI');
      row('Status', selG.status); row('Dibuat · diperbarui', `${selG.dibuat || '—'} · ${selG.diubah || '—'}`);
      row('Trafo/incoming dipantau', selG.t.length ? selG.t.map((t) => t.trafo || t.apd).join(', ') : 'belum ada di file monitoring tegangan');
      if (selG.t.length) {
        const v = selG.t.filter((t) => t.avg != null);
        row(`Tegangan max ${per}`, selG.mx != null ? `${kv(selG.mx)} kV · ${selG.top.trafo} tanggal ${selG.top.mxD}` : '—');
        row('Rata-rata max harian', v.length ? `${kv(v.reduce((a, t) => a + t.avg, 0) / v.length)} kV` : '—');
        row('Hari di atas 21 kV', selG.t.map((t) => `${t.trafo}: ${t.nHi}`).join(' · '));
        const cat = selG.t.filter((t) => t.konstan || Number(t.anomali) || t.kurang).map((t) => `${t.trafo}: ${[t.konstan && 'konstan', Number(t.anomali) && `${t.anomali} hari anomali`, t.kurang && `${t.kurang} hari < 24 jam`].filter(Boolean).join(', ')}`);
        if (cat.length) row('Catatan data', cat.join(' · '));
      }
    }

    drawTable();

    // chart tegangan max harian per trafo
    $('gi-chart-h').textContent = selG ? `Tegangan max harian · ${selG.nama}` : 'Tegangan max harian';
    $('gi-chart-note').textContent = `${per}, nilai tertinggi fasa R-S/S-T/T-R per hari (bacaan > 25 kV dibuang). Garis putus-putus: 21 kV (+5%) dan 18 kV (−10%) dari 20 kV.`;
    chart.classList.remove('dash-skeleton'); chart.replaceChildren();
    const lgd = $('gi-legend'); lgd.replaceChildren();
    const trs = selG ? selG.t.filter((t) => t.mx != null) : [];
    if (!trs.length) { chart.append(mk('div', selG ? 'Belum ada data tegangan untuk GI ini.' : 'Pilih GI.', 'ss-note')); return; }
    trs.forEach((t, i) => { const s = mk('span'); const sw = mk('i', null, 'ss-sw'); sw.style.background = SSC[i % SSC.length]; s.append(sw, t.trafo || t.apd); lgd.append(s); });
    const W = Math.max(280, chart.clientWidth), H = 300, mg = { t: 16, r: 10, b: 26, l: 40 };
    const svg = d3.select(chart).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Tegangan max harian ' + selG.nama);
    const all = trs.flatMap((t) => t.v.filter((x) => x != null));
    const y = d3.scaleLinear([Math.min(LO - 0.5, d3.min(all) - 0.2), Math.max(HI + 0.5, d3.max(all) + 0.2)], [H - mg.b, mg.t]).nice();
    const x = d3.scaleLinear([1, days.length], [mg.l, W - mg.r]);
    svg.append('g').selectAll('line').data(y.ticks(6)).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d)).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(6)).join('text').attr('x', mg.l - 6).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').attr('fill', 'var(--color-fg-muted)').text((d) => f1.format(d));
    svg.append('g').selectAll('text').data(days.filter((d) => d === 1 || d % 5 === 0)).join('text').attr('x', (d) => x(d)).attr('y', H - 8).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').attr('fill', 'var(--color-fg-muted)').text((d) => d);
    [[HI, 'var(--color-warn)', '21 kV'], [LO, '#2f6fb3', '18 kV']].forEach(([v, c, l]) => {
      svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', c).attr('stroke-dasharray', '5 4').attr('stroke-width', 1.4);
      svg.append('text').attr('x', W - mg.r).attr('y', y(v) - 4).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').attr('fill', c).text(l);
    });
    trs.forEach((t, i) => {
      const c = SSC[i % SSC.length];
      const line = d3.line().defined((d) => d != null).x((d, j) => x(j + 1)).y((d) => y(d));
      svg.append('path').attr('d', line(t.v)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2);
      svg.append('g').selectAll('circle').data(t.v.map((v, j) => [v, j + 1]).filter(([v]) => v != null)).join('circle').attr('cx', (d) => x(d[1])).attr('cy', (d) => y(d[0])).attr('r', 2.6).attr('fill', c)
        .append('title').text((d) => `${t.trafo} · ${d[1]} ${BLNF[IDX.mm - 1]}: ${kv(d[0])} kV`);
    });
  });
})();
