// Tab Database > Database Penyulang & Gardu Induk (satu layout).
// Filter UID → UP3 → Gardu induk → Penyulang dari GI itu. Profil GI dan profil penyulang tampil berdampingan.
// Data: gi_identitas (identitas GI dari Database Aset Jaringan sheet GI), gi_tegangan (tegangan max harian 20 kV per trafo), hx_feeder (feeder per GI, dimuat saat dibutuhkan),
//       peny_profil (database penyulang), peny_bulanan (kali gangguan per bulan).
(() => {
  const $ = (id) => document.getElementById(id);
  const UIDS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const ULABEL = { ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID Riau Kepri', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID Kalselteng', KALTIMRA: 'UID Kaltimra' };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLNF = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const f1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const f2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const kv = (v) => (v == null || !isFinite(v) ? '—' : f2.format(v));
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const NONE = '__tanpa_gi__';
  // nama penyulang dibandingkan tanpa awalan MVCABLE/CELL/FEEDER… dan tanpa spasi/tanda baca
  const PRE = /^(MV\s*-?\s*CABLE|MVCABLE|CELL|FEEDER|PENYULANG|PNY|PYL|F)[\s_.\-]+/;
  const clean = (s) => String(s || '').toUpperCase().trim().replace(PRE, '').trim();
  const N = (s) => clean(s).replace(/[^A-Z0-9]/g, '');
  const NU = (s) => String(s || '').toUpperCase().replace(/^UP3\s+/, '').replace(/[^A-Z0-9]/g, '');
  const title = (s, pre) => String(s || '').replace(new RegExp('^' + pre + '\\s+', 'i'), '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const giName = (n) => (/^(GI|PLT|GH)/i.test(n || '') ? n : 'GI ' + n);
  // batas tegangan 20 kV: +5% = 21 kV, +10% = 22 kV, -10% = 18 kV
  const HI = 21, HI2 = 22, LO = 18;
  const KELAS = {
    s: { t: 'Di atas 22 kV', c: 'var(--color-bad)' },
    h: { t: '21–22 kV', c: 'var(--color-warn)' },
    n: { t: '18–21 kV', c: 'var(--color-ok)' },
    l: { t: 'Di bawah 18 kV', c: '#2f6fb3' },
    x: { t: 'Tanpa data tegangan', c: 'var(--cds-chart-muted)' },
  };
  const kelasOf = (mx, mn) => (mx == null && mn == null ? 'x' : mx > HI2 ? 's' : mn != null && mn < LO ? 'l' : mx > HI ? 'h' : 'n');
  const pill = (k) => { const s = mk('span', KELAS[k].t, 'gi-pill'); s.style.setProperty('--gi-c', KELAS[k].c); return s; };

  // hx_feeder besar: dimuat saat tab dibuka (versi web)
  const LAZY = !!window.__D; let hxLoading = false;
  const needHx = () => {
    if (!LAZY || 'hx_feeder' in window.__D || hxLoading) return;
    hxLoading = true; const s = document.createElement('script'); s.src = 'hx_feeder.js';
    s.onload = () => { hxLoading = false; if (window.__SSInvalidate) window.__SSInvalidate(); render(); };
    s.onerror = () => { hxLoading = false; window.__D.hx_feeder = []; render(); };
    document.head.appendChild(s);
  };

  const set = (o) => dash.setParams(o);
  $('d-f-uid').addEventListener('change', (e) => set({ d_uid: e.target.value || null, d_up3: null, d_gi: null, d_peny: null }));
  $('d-f-up3').addEventListener('change', (e) => set({ d_up3: e.target.value || null, d_gi: null, d_peny: null }));
  $('d-f-gi').addEventListener('change', (e) => set({ d_gi: e.target.value || null, d_peny: null }));
  $('d-f-peny').addEventListener('change', (e) => set({ d_peny: e.target.value || null }));
  $('d-f-jenis').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ d_jenis: b.dataset.v || null }); });
  let q = '', qg = '';
  $('d-search').addEventListener('input', (e) => { q = e.target.value.trim().toUpperCase(); drawPenyTable(); });
  $('d-gsearch').addEventListener('input', (e) => { qg = e.target.value.trim().toUpperCase(); drawGiTable(); });
  const onRow = (tb, attr, fn) => { const h = (e) => { const tr = e.target.closest(`tr[${attr}]`); if (tr && (e.type === 'click' || e.key === 'Enter' || e.key === ' ')) { if (e.type === 'keydown') e.preventDefault(); fn(tr); } }; tb.addEventListener('click', h); tb.addEventListener('keydown', h); };
  onRow($('d-ptabel'), 'data-peny', (tr) => set({ d_peny: tr.dataset.peny }));
  onRow($('d-gtabel'), 'data-gi', (tr) => set({ d_gi: tr.dataset.gi, d_peny: null }));

  const chartG = $('d-gchart'), chartP = $('d-pchart');
  const tip = mk('div', null, 'ss-tip'); tip.hidden = true;

  // ---------- indeks data ----------
  let cacheKey = null, X = null;
  function build(MS, TG, FD, PP, PB) {
    // tegangan per trafo
    const per = TG.length ? String(TG[0].periode || '') : ''; const [yy, mm] = per.split('-').map(Number);
    const nd = TG.length ? TG[0].v.length : 0;
    const tr = TG.map((t) => {
      const v = t.v.map((x) => (x == null || x === '' ? null : Number(x)));
      const vmin = (t.vmin || []).map((x) => (x == null || x === '' ? null : Number(x)));
      const ok = v.map((x, i) => [x, i]).filter(([x]) => x != null);
      const okN = vmin.map((x, i) => [x, i]).filter(([x]) => x != null);
      const mx = ok.length ? ok.reduce((a, b) => (b[0] > a[0] ? b : a)) : null;
      const mn = okN.length ? okN.reduce((a, b) => (b[0] < a[0] ? b : a)) : null;
      const kurang = (t.jamhari || []).filter((j) => j != null && j !== '' && Number(j) < 24).length;
      return { ...t, v, vmin, hasMin: okN.length > 0, mx: mx ? mx[0] : null, mxD: mx ? mx[1] + 1 : null, mn: mn ? mn[0] : null, mnD: mn ? mn[1] + 1 : null,
        avg: ok.length ? ok.reduce((a, b) => a + b[0], 0) / ok.length : null, avgN: okN.length ? okN.reduce((a, b) => a + b[0], 0) / okN.length : null,
        nHi: ok.filter(([x]) => x > HI).length, nLo: okN.filter(([x]) => x < LO).length, nOk: ok.length, nOkN: okN.length, kurang, kelas: kelasOf(mx ? mx[0] : null, mn ? mn[0] : null) };
    });
    const trByKode = new Map(); tr.forEach((t) => { if (!t.kode) return; const a = trByKode.get(t.kode) || []; a.push(t); trByKode.set(t.kode, a); });
    trByKode.forEach((a) => a.sort((x, y) => String(x.trafo).localeCompare(String(y.trafo), 'id', { numeric: true })));
    // gangguan per penyulang (up3|penyulang)
    const months = [...new Set(PB.map((r) => Number(r.bulan)))].sort((a, b) => a - b);
    const JO = ['Gangguan', 'Pemeliharaan', 'Bencana']; const jenisList = [...new Set(PB.map((r) => r.jenis_padam))].sort((x, y) => (JO.indexOf(x) + 1 || 9) - (JO.indexOf(y) + 1 || 9));
    const ev = new Map(); PB.forEach((r) => { const k = r.up3 + '\u0001' + r.penyulang; const a = ev.get(k) || []; a.push({ m: Number(r.bulan), j: r.jenis_padam, ps: r.ps, n: Number(r.kali) }); ev.set(k, a); });
    // profil penyulang: cari per UP3 lalu per UID
    const p3 = new Map(), pu = new Map();
    PP.forEach((p) => { const a = NU(p.up3) + '|' + N(p.penyulang), b = p.uid + '|' + N(p.penyulang); if (!p3.has(a)) p3.set(a, p); if (!pu.has(b)) pu.set(b, p); });
    // GI
    const gis = MS.map((g) => {
      const t = trByKode.get(g.kode) || []; const vals = t.filter((x) => x.mx != null), valsN = t.filter((x) => x.mn != null);
      const mx = vals.length ? Math.max(...vals.map((x) => x.mx)) : null, mn = valsN.length ? Math.min(...valsN.map((x) => x.mn)) : null;
      return { id: g.aset || g.kode, ...g, t, mx, mn, top: vals.find((x) => x.mx === mx) || null, low: valsN.find((x) => x.mn === mn) || null, kelas: kelasOf(mx, mn), hasXY: g.lat !== '' && g.lon !== '' && g.lat != null, feeders: [] };
    });
    const giById = new Map(gis.map((g) => [g.id, g]));
    const used = new Set();
    FD.forEach((f) => {
      const g = giById.get(f.gi); if (!g) return;
      const p = p3.get(NU(g.up3) + '|' + N(f.nama)) || pu.get(g.uid + '|' + N(f.nama)) || null;
      if (p) used.add(p);
      g.feeders.push({ id: f.kode || clean(f.nama), nama: clean(f.nama) || f.nama, ulp: title(f.ulp, 'ULP'), status: f.status || '', jaringan: f.jaringan || '', kode: f.kode || '', p, ek: p ? p.up3 + '\u0001' + p.penyulang : null, gi: g });
    });
    // penyulang database yang belum terpetakan ke GI: dikumpulkan per UP3 sebagai "Tanpa GI"
    const none = new Map();
    PP.forEach((p) => {
      if (used.has(p)) return;
      const k = NONE + '|' + p.up3; let g = none.get(k);
      if (!g) { g = { id: k, none: true, nama: 'Belum terpetakan ke GI', kode: '', aset: '', uid: p.uid, up3: p.up3, ulp: '', t: [], mx: null, mn: null, top: null, kelas: 'x', hasXY: false, feeders: [] }; none.set(k, g); }
      g.feeders.push({ id: 'P|' + p.penyulang, nama: p.penyulang, ulp: p.ulp || '', status: p.status || '', jaringan: '', kode: '', p, ek: p.up3 + '\u0001' + p.penyulang, gi: g });
    });
    return { yy, mm, nd, tr, gis, none: [...none.values()], months, jenisList, ev };
  }
  const series = (ek, jenis) => {
    const out = {}; X.months.forEach((m) => { out[m] = { Permanen: 0, Sesaat: 0, t: 0 }; });
    (ek ? X.ev.get(ek) || [] : []).forEach((r) => { if (jenis && r.j !== jenis) return; const o = out[r.m]; if (!o) return; o[r.ps] = (o[r.ps] || 0) + r.n; o.t += r.n; });
    return out;
  };

  function spark(v, vmin) {
    const W = 96, H = 22, lo = 17.5, hi = 23;
    const y = (x) => H - 2 - (Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo) * (H - 4);
    const xs = (i) => 2 + i * (W - 4) / Math.max(1, v.length - 1);
    const pts = v.map((x, i) => (x == null ? null : `${xs(i).toFixed(1)},${y(x).toFixed(1)}`));
    let d = ''; pts.forEach((p, i) => { if (!p) return; d += (i && pts[i - 1] ? 'L' : 'M') + p; });
    const ns = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(ns, 'svg'); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('class', 'gi-spark'); s.setAttribute('aria-hidden', 'true');
    [[HI, 'var(--color-warn)'], [LO, '#2f6fb3']].forEach(([v0, c]) => { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', 0); l.setAttribute('x2', W); l.setAttribute('y1', y(v0)); l.setAttribute('y2', y(v0)); l.setAttribute('stroke', c); l.setAttribute('stroke-dasharray', '2 2'); l.setAttribute('stroke-width', '.8'); s.append(l); });
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'var(--color-fg)'); p.setAttribute('stroke-width', '1.3'); s.append(p);
    if (vmin && vmin.some((x) => x != null)) {
      const pm = vmin.map((x, i) => (x == null ? null : `${xs(i).toFixed(1)},${y(x).toFixed(1)}`)); let dm = ''; pm.forEach((q, i) => { if (!q) return; dm += (i && pm[i - 1] ? 'L' : 'M') + q; });
      const p2 = document.createElementNS(ns, 'path'); p2.setAttribute('d', dm); p2.setAttribute('fill', 'none'); p2.setAttribute('stroke', 'var(--color-fg-muted)'); p2.setAttribute('stroke-width', '1'); p2.setAttribute('stroke-dasharray', '2 1.5'); s.append(p2);
    }
    return s;
  }

  // ---------- state per render ----------
  let giList = [], selG = null, feeders = [], selF = null, jenis = null, up3 = null;

  function drawPenyTable() {
    const tb = $('d-ptabel'); if (!X) return;
    const head = mk('thead'), hr = mk('tr');
    ['Penyulang', 'ULP', 'Status', ...X.months.map((m) => BLN[m - 1]), 'Total'].forEach((h, i) => { const th = mk('th', h); if (i === 1 || i === 2) th.className = 'ss-l ss-hide-n'; hr.append(th); });
    head.append(hr);
    const body = mk('tbody');
    const mx = Math.max(1, ...feeders.flatMap((f) => X.months.map((m) => f.s[m].t)));
    const list = feeders.filter((f) => !q || f.nama.toUpperCase().includes(q) || String(f.ulp).toUpperCase().includes(q));
    list.forEach((f) => {
      const tr = mk('tr', null, f === selF ? 'ss-p-on' : ''); tr.dataset.peny = f.id; tr.tabIndex = 0;
      const n = mk('td'); n.append(f.nama); if (!f.p) n.append(mk('span', 'belum ada di database penyulang', 'ss-p-flag'));
      tr.append(n, mk('td', f.ulp || '—', 'ss-l ss-hide-n'), mk('td', (f.p && f.p.status) || f.status || '—', 'ss-l ss-hide-n'),
        ...X.months.map((m) => { const v = f.s[m].t; const td = mk('td', v ? fmt(v) : '·', 'ss-p-c'); if (v) td.style.background = `color-mix(in srgb, ${SSC[0]} ${Math.round(v / mx * 50)}%, transparent)`; return td; }),
        mk('td', fmt(f.t), 'ss-hl'));
      body.append(tr);
    });
    tb.replaceChildren(head, body);
    $('d-ptabel-h').textContent = selG ? (selG.none ? `Penyulang UP3 ${selG.up3} yang belum terpetakan ke GI` : `Penyulang dari ${giName(selG.nama)}`) : 'Penyulang';
    $('d-ptabel-note').textContent = `${fmt(list.length)} dari ${fmt(feeders.length)} penyulang, diurutkan dari kali gangguan terbanyak${jenis ? ' (' + jenis.toLowerCase() + ')' : ''}. Klik baris untuk melihat profil dan chart bulanannya.`;
  }
  function drawGiTable() {
    const tb = $('d-gtabel'); if (!X) return;
    const head = mk('thead'), hr = mk('tr');
    [['Gardu induk', 'ss-l'], ['Penyulang', ''], ['Trafo', 'ss-l'], [`Tren ${BLN[(X.mm || 1) - 1]} (max · min)`, 'ss-hide-n'], ['Max (kV)'], ['Min (kV)'], ['Rata-rata max · min (kV)', 'ss-hide-n'], ['Hari > 21 kV'], ['Hari < 18 kV'], ['Kelas', 'ss-l'], ['Catatan data', 'ss-l ss-hide-n']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
    head.append(hr);
    const body = mk('tbody'); let n = 0;
    giList.filter((g) => !g.none && (!qg || g.nama.toUpperCase().includes(qg) || String(g.kode).toUpperCase().includes(qg))).forEach((g) => {
      (g.t.length ? g.t : [null]).forEach((t, i) => {
        n++;
        const tr = mk('tr', null, g === selG ? 'ss-p-on' : ''); tr.dataset.gi = g.id; tr.tabIndex = 0;
        const nm = mk('td', i ? '' : g.nama, 'ss-l'); if (!i && !g.hasXY) nm.append(mk('span', 'tanpa koordinat', 'ss-p-flag'));
        tr.append(nm, mk('td', i ? '' : fmt(g.feeders.length)), mk('td', t ? t.trafo || '—' : '—', 'ss-l'));
        const sp = mk('td', null, 'ss-hide-n'); if (t) sp.append(spark(t.v, t.vmin)); tr.append(sp);
        const mxTd = mk('td', t ? kv(t.mx) : '—', 'ss-hl'); if (t && t.mx > HI) mxTd.style.color = KELAS[t.mx > HI2 ? 's' : 'h'].c; tr.append(mxTd);
        const mnTd = mk('td', t ? kv(t.mn) : '—', 'ss-hl'); if (t && t.mn != null && t.mn < LO) mnTd.style.color = KELAS.l.c; tr.append(mnTd);
        tr.append(mk('td', t ? `${kv(t.avg)} · ${kv(t.avgN)}` : '—', 'ss-hide-n'), mk('td', t && t.nOk ? `${t.nHi} / ${t.nOk}` : '—'), mk('td', t && t.nOkN ? `${t.nLo} / ${t.nOkN}` : '—'));
        const kc = mk('td', null, 'ss-l'); kc.append(pill(t ? t.kelas : 'x')); tr.append(kc);
        const cat = []; if (t) { if (t.konstan) cat.push('nilai konstan sebulan'); if (Number(t.anomali)) cat.push(`${t.anomali} hari ada bacaan > 25 kV dibuang`); if (t.kurang) cat.push(`${t.kurang} hari data < 24 jam`); }
        tr.append(mk('td', cat.join(' · ') || (t ? '—' : 'belum ada di file monitoring tegangan'), 'ss-l ss-hide-n gi-cat'));
        body.append(tr);
      });
    });
    tb.replaceChildren(head, body);
    $('d-gtabel-note').textContent = `${fmt(giList.filter((g) => !g.none).length)} GI di UP3 ${up3} (${fmt(n)} baris trafo/incoming), diurutkan dari kali gangguan penyulangnya. Max/Min = tegangan tertinggi/terendah sebulan dari nilai harian; "Hari > 21 kV" dan "Hari < 18 kV" dihitung dari tegangan max dan min harian. Klik baris untuk memilih GI.`;
  }

  function render() {
    const M = SSD.data('gi_identitas'), T = SSD.data('gi_tegangan'), P = SSD.data('peny_profil'), B = SSD.data('peny_bulanan');
    const sts = [M, T, P, B];
    if (sts.some((d) => d.status === 'error')) { [chartG, chartP].forEach((c) => { c.classList.remove('dash-skeleton'); c.replaceChildren(mk('div', 'Failed to load', 'ss-fail')); }); return; }
    if (sts.some((d) => d.status !== 'ok')) return;
    needHx();
    const F = 'hx_feeder' in (window.__D || {}) ? SSD.data('hx_feeder') : { status: LAZY ? 'loading' : SSD.data('hx_feeder').status };
    if (F.status !== 'ok') return;
    const ck = [M.data, T.data, P.data, B.data, F.data];
    if (!cacheKey || ck.some((v, i) => v !== cacheKey[i])) { cacheKey = ck; X = build(M.data, T.data, F.data, P.data, B.data); }
    const prm = dash.params();
    jenis = X.jenisList.includes(prm.d_jenis) ? prm.d_jenis : null;
    const uid = UIDS.includes(prm.d_uid) ? prm.d_uid : null;
    const per = X.mm ? `${BLNF[X.mm - 1]} ${X.yy}` : '';
    const lastM = X.months[X.months.length - 1];

    // total gangguan per GI (untuk urutan dan default)
    const allG = [...X.gis, ...X.none].filter((g) => !uid || g.uid === uid);
    allG.forEach((g) => { g.tg = g.feeders.reduce((a, f) => { const s = series(f.ek, jenis); return a + X.months.reduce((b, m) => b + s[m].t, 0); }, 0); });
    const up3M = new Map(); allG.forEach((g) => { if (!g.up3) return; const o = up3M.get(g.up3) || { n: 0, t: 0 }; if (!g.none) o.n++; o.t += g.tg; up3M.set(g.up3, o); });
    const up3s = [...up3M.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    up3 = up3M.has(prm.d_up3) ? prm.d_up3 : (up3s.slice().sort((a, b) => b[1].t - a[1].t)[0] || [null])[0];
    giList = allG.filter((g) => g.up3 === up3).sort((a, b) => (a.none ? 1 : 0) - (b.none ? 1 : 0) || b.tg - a.tg || (b.mx ?? -1) - (a.mx ?? -1) || a.nama.localeCompare(b.nama));
    selG = giList.find((g) => g.id === prm.d_gi) || giList[0] || null;
    feeders = (selG ? selG.feeders : []).map((f) => { const s = series(f.ek, jenis); return { ...f, s, t: X.months.reduce((a, m) => a + s[m].t, 0) }; })
      .sort((a, b) => b.t - a.t || a.nama.localeCompare(b.nama));
    selF = feeders.find((f) => f.id === prm.d_peny) || feeders[0] || null;

    // kontrol
    const su = $('d-f-uid'); if (!su.options.length) su.replaceChildren(new Option('Semua UID', ''), ...UIDS.map((u) => new Option(ULABEL[u], u)));
    su.value = uid || '';
    $('d-f-up3').replaceChildren(...up3s.map(([u, o]) => new Option(`${u} · ${fmt(o.n)} GI`, u))); $('d-f-up3').value = up3 || '';
    $('d-f-gi').replaceChildren(...giList.map((g) => new Option(g.none ? `${g.nama} · ${fmt(g.feeders.length)} penyulang` : `${g.nama} · ${fmt(g.feeders.length)} penyulang · ${g.mx != null ? kv(g.mx) + ' kV' : 'tanpa data tegangan'}`, g.id))); $('d-f-gi').value = selG ? selG.id : '';
    $('d-f-peny').replaceChildren(...feeders.map((f) => new Option(`${f.nama} · ${fmt(f.t)} kali`, f.id))); $('d-f-peny').value = selF ? selF.id : ''; $('d-f-peny').disabled = !feeders.length;
    const btn = (v, l) => { const b = mk('button', l, 'ss-chip'); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String((jenis || '') === v)); return b; };
    $('d-f-jenis').replaceChildren(btn('', 'Semua'), ...X.jenisList.map((j) => btn(j, j)));

    // ringkasan
    {
      const tk = $('d-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const Bb = (s) => mk('b', s);
      const gU = giList.filter((g) => !g.none), Tt = feeders.reduce((a, f) => a + f.t, 0);
      tk.append(`UP3 ${up3} punya `, Bb(`${fmt(gU.length)} GI`), ` (${fmt(gU.filter((g) => g.t.length).length)} dengan data tegangan ${per}). `);
      if (selG && !selG.none) {
        tk.append(`${giName(selG.nama)} menyuplai `, Bb(`${fmt(feeders.length)} penyulang`), `; ${fmt(feeders.filter((f) => f.t > 0).length)} mengalami gangguan, total `, Bb(`${fmt(Tt)} kali`), ` s.d. ${BLN[lastM - 1]} 2026${jenis ? ' (' + jenis.toLowerCase() + ')' : ''}. `);
        if (selG.mx != null) tk.append('Tegangan max GI ', Bb(`${kv(selG.mx)} kV`), ` (${selG.top.trafo || selG.top.apd}, ${selG.top.mxD} ${BLNF[X.mm - 1]})`);
        if (selG.mn != null) tk.append(', min ', Bb(`${kv(selG.mn)} kV`), ` (${selG.low.trafo || selG.low.apd}, ${selG.low.mnD} ${BLNF[X.mm - 1]})`);
        if (selG.mx != null || selG.mn != null) tk.append('. ');
      } else if (selG) tk.append(Bb(`${fmt(feeders.length)} penyulang`), ` di UP3 ${up3} belum terpetakan ke GI di data hirarki aset, total `, Bb(`${fmt(Tt)} kali`), ' gangguan. ');
      if (selF && selF.t) { const pk = X.months.reduce((a, m) => (selF.s[m].t > selF.s[a].t ? m : a), X.months[0]); tk.append(`Penyulang ${selF.nama}: `, Bb(`${fmt(selF.t)} kali`), `, tertinggi ${BLNF[pk - 1]} (${fmt(selF.s[pk].t)}).`); }
    }

    // peta: GI (warna = tegangan max) + penyulang dari GI terpilih
    if (window.SSMAP) {
      const scope = allG.filter((g) => !g.none && g.hasXY);
      const pts = scope.map((g) => ({ lon: g.lon, lat: g.lat, r: g === selG ? 7.5 : g.up3 === up3 ? 5 : 3.4, color: KELAS[g.kelas].c, selected: g === selG, label: g === selG ? g.nama : '',
        tip: [g.nama, [[null, 'UP3', g.up3 || '—'], [null, 'Penyulang', fmt(g.feeders.length)], [null, 'Tegangan max', g.mx != null ? kv(g.mx) + ' kV' : 'tanpa data']]],
        onClick: () => set({ d_up3: g.up3, d_gi: g.id, d_peny: null }) }));
      const pf = feeders.filter((f) => f.p && f.p.lat !== '' && f.p.lat != null && isFinite(Number(f.p.lat)) && Number(f.p.lat) !== 0);
      const fmx = Math.max(1, ...pf.map((f) => f.t));
      pf.forEach((f) => pts.push({ lon: f.p.lon, lat: f.p.lat, r: 2.6 + 4 * Math.sqrt(f.t / fmx), color: SSC[2] || SSC[0], selected: f === selF, label: f === selF ? f.nama : '',
        tip: ['Penyulang ' + f.nama, [[null, 'Kali gangguan', fmt(f.t)], [null, 'ULP', f.ulp || '—']]], onClick: () => set({ d_peny: f.id }) }));
      window.SSMAP($('d-map'), { label: 'Peta gardu induk dan penyulang', focus: uid, fill: () => 'color-mix(in srgb, var(--ss-acc) 12%, var(--color-panel))', regionTip: (r, prov) => [ULABEL[r] || r, [[null, prov, ''], [null, 'Gardu induk', fmt(X.gis.filter((g) => g.uid === r).length)]]], onRegion: (r) => set({ d_uid: uid === r ? null : r, d_up3: null, d_gi: null, d_peny: null }), points: pts });
      const lg = $('d-map-legend'); lg.replaceChildren(...['s', 'h', 'n', 'l', 'x'].map((k) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = KELAS[k].c; i.style.borderRadius = '50%'; s.append(i, 'GI ' + KELAS[k].t.charAt(0).toLowerCase() + KELAS[k].t.slice(1)); return s; }),
        (() => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = SSC[2] || SSC[0]; i.style.borderRadius = '50%'; s.append(i, 'Penyulang GI terpilih'); return s; })());
      $('d-map-note').textContent = `Warna titik GI = tegangan max ${per}. Titik kecil = penyulang dari GI terpilih yang berkoordinat (ukuran = kali gangguan). Klik titik untuk memilih GI atau penyulang, klik wilayah untuk memilih UID.`;
    }

    // tile
    const done = (id, t) => { const e = $(id); e.textContent = t; e.classList.remove('dash-skeleton'); };
    const gU = giList.filter((g) => !g.none);
    $('d-t1-l').textContent = `Gardu induk di UP3 ${up3}`;
    done('d-t1', fmt(gU.length)); $('d-t1-sub').textContent = `${fmt(gU.filter((g) => g.hasXY).length)} berkoordinat · ${fmt(gU.filter((g) => g.t.length).length)} punya data tegangan`;
    done('d-t2', selG && selG.mx != null ? kv(selG.mx) : '—'); $('d-t2-name').textContent = selG && selG.mn != null ? `min ${kv(selG.mn)} kV` : '';
    $('d-t2-sub').textContent = selG && selG.top ? `${selG.none ? '' : selG.nama + ' · '}max ${selG.top.trafo || selG.top.apd} tgl ${selG.top.mxD}${selG.low ? `, min ${selG.low.trafo || selG.low.apd} tgl ${selG.low.mnD}` : ''}` : 'belum ada data tegangan';
    done('d-t3', fmt(feeders.length)); $('d-t3-sub').textContent = `${fmt(feeders.filter((f) => f.t > 0).length)} mengalami gangguan · ${fmt(feeders.filter((f) => f.p).length)} ada di database penyulang`;
    const Tt = feeders.reduce((a, f) => a + f.t, 0);
    done('d-t4', fmt(Tt)); $('d-t4-name').textContent = feeders[0] && feeders[0].t ? feeders[0].nama : ''; $('d-t4-sub').textContent = feeders[0] && feeders[0].t ? `terbanyak: ${fmt(feeders[0].t)} kali` : `${BLN[X.months[0] - 1]}–${BLN[lastM - 1]} 2026`;

    // profil GI
    {
      const dl = $('d-gprofil'); dl.replaceChildren();
      const row = (label, val, cls) => { const dd = mk('dd', val == null || val === '' ? '—' : String(val), cls); dl.append(mk('dt', label), dd); return dd; };
      if (selG && !selG.none) {
        const nm = row('Gardu induk', selG.nama, 'ss-p-name'); nm.append(' ', pill(selG.kelas));
        row('Kode jaringan · aset', `${selG.kode || '—'} · ${selG.aset || '—'}`);
        row('UP3 · UID', `${selG.up3 || '—'}${selG.uid ? ' · ' + (ULABEL[selG.uid] || selG.uid) : ''}`);
        row('ULP', selG.ulp); row('Alamat', selG.alamat);
        row('Koordinat', selG.hasXY ? `${selG.lat}, ${selG.lon}` : 'belum ada di Database Aset Jaringan');
        row('Status', selG.status); row('Penyulang', `${fmt(selG.feeders.length)} penyulang`);
        row('Trafo/incoming dipantau', selG.t.length ? selG.t.map((t) => t.trafo || t.apd).join(', ') : 'belum ada di file monitoring tegangan');
        if (selG.t.length) {
          const v = selG.t.filter((t) => t.avg != null);
          const vn = selG.t.filter((t) => t.avgN != null);
          row(`Tegangan max ${per}`, selG.mx != null ? `${kv(selG.mx)} kV · ${selG.top.trafo || selG.top.apd} tanggal ${selG.top.mxD}` : '—');
          row(`Tegangan min ${per}`, selG.mn != null ? `${kv(selG.mn)} kV · ${selG.low.trafo || selG.low.apd} tanggal ${selG.low.mnD}` : 'belum ada data');
          row('Rata-rata max · min harian', `${v.length ? kv(v.reduce((a, t) => a + t.avg, 0) / v.length) : '—'} · ${vn.length ? kv(vn.reduce((a, t) => a + t.avgN, 0) / vn.length) : '—'} kV`);
          row('Hari di atas 21 kV', selG.t.map((t) => `${t.trafo || t.apd}: ${t.nHi}`).join(' · '));
          row('Hari di bawah 18 kV', selG.t.map((t) => `${t.trafo || t.apd}: ${t.nLo}`).join(' · '));
        }
      } else if (selG) { row('Gardu induk', 'Belum terpetakan', 'ss-p-name'); row('Keterangan', `Penyulang di database penyulang UP3 ${selG.up3} yang namanya tidak ditemukan di data hirarki aset (feeder per GI). Umumnya penyulang sistem isolated/PLTD.`); }
    }
    // profil penyulang
    {
      const dl = $('d-pprofil'); dl.replaceChildren();
      const row = (label, val, cls) => { const dd = mk('dd', val == null || val === '' ? '—' : String(val), cls); dl.append(mk('dt', label), dd); return dd; };
      if (selF) {
        const p = selF.p;
        const nm = row('Penyulang', selF.nama, 'ss-p-name'); if (!p) nm.append(mk('span', 'belum ada di database penyulang', 'ss-p-flag')); else if (p.di_database !== 'Ya') nm.append(mk('span', 'hanya ada di data gangguan', 'ss-p-flag'));
        row('Gardu induk', selF.gi.none ? 'belum terpetakan' : selF.gi.nama);
        row('UP3 · UID', p ? `${p.up3}${p.uid ? ' · ' + (ULABEL[p.uid] || p.uid) : ''}` : `${selG.up3} · ${ULABEL[selG.uid] || selG.uid}`);
        row('ULP', (p && p.ulp) || selF.ulp);
        if (selF.kode || selF.jaringan) row('Kode aset · jaringan', `${selF.kode || '—'} · ${selF.jaringan || '—'}`);
        if (p && p.di_database === 'Ya') { row('Jenis · tipe', `${p.jenis || '—'} · ${p.tipe || '—'}`); row('Kepemilikan', p.kepemilikan); row('Status', p.status); row('Tahun buat', p.tahun_buat); row('Koordinat', p.lat !== '' && p.lat != null ? `${p.lat}, ${p.lon}` : ''); }
        else if (selF.status) row('Status', title(selF.status, ''));
        const s = selF.s; const perm = X.months.reduce((a, m) => a + s[m].Permanen, 0), ses = X.months.reduce((a, m) => a + s[m].Sesaat, 0);
        const pk = X.months.reduce((a, m) => (s[m].t > s[a].t ? m : a), X.months[0]);
        row('Total kali gangguan', `${fmt(selF.t)} kali (${fmt(perm)} permanen · ${fmt(ses)} sesaat)`);
        row('Rata-rata per bulan', `${f1.format(selF.t / X.months.length)} kali`);
        row('Bulan tertinggi', selF.t ? `${BLNF[pk - 1]} · ${fmt(s[pk].t)} kali` : '—');
        row('Peringkat di GI', selF.t ? `${feeders.indexOf(selF) + 1} dari ${fmt(feeders.length)} penyulang` : '—');
      } else dl.append(mk('dd', 'Belum ada penyulang untuk GI ini di data hirarki aset.', 'ss-note'));
    }

    drawPenyTable(); drawGiTable();

    // chart tegangan GI
    $('d-gchart-h').textContent = selG && !selG.none ? `Tegangan max & min harian · ${selG.nama}` : 'Tegangan max & min harian GI';
    $('d-gchart-note').textContent = `${per}. Garis tebal: tegangan max harian (fasa tertinggi); garis tipis putus-putus warna sama: tegangan min harian (fasa terendah). Bacaan > 25 kV dibuang. Garis batas: 21 kV (+5%) dan 18 kV (−10%) dari 20 kV.`;
    chartG.classList.remove('dash-skeleton'); chartG.replaceChildren();
    const lgd = $('d-glegend'); lgd.replaceChildren();
    const trs = selG ? selG.t.filter((t) => t.mx != null || t.mn != null) : [];
    if (!trs.length) chartG.append(mk('div', selG && !selG.none ? 'Belum ada data tegangan untuk GI ini.' : 'Pilih gardu induk.', 'ss-note'));
    else {
      trs.forEach((t, i) => { const s = mk('span'); const sw = mk('i', null, 'ss-sw'); sw.style.background = SSC[i % SSC.length]; s.append(sw, t.trafo || t.apd); lgd.append(s); });
      const W = Math.max(280, chartG.clientWidth), H = 280, mg = { t: 16, r: 10, b: 26, l: 40 };
      const svg = d3.select(chartG).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Tegangan max harian ' + selG.nama);
      const all = trs.flatMap((t) => [...t.v, ...t.vmin].filter((x) => x != null));
      const y = d3.scaleLinear([Math.min(LO - 0.5, d3.min(all) - 0.2), Math.max(HI + 0.5, d3.max(all) + 0.2)], [H - mg.b, mg.t]).nice();
      const x = d3.scaleLinear([1, X.nd], [mg.l, W - mg.r]);
      svg.append('g').selectAll('line').data(y.ticks(6)).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', (d) => y(d)).attr('y2', (d) => y(d)).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('g').selectAll('text').data(y.ticks(6)).join('text').attr('x', mg.l - 6).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').attr('fill', 'var(--color-fg-muted)').text((d) => f1.format(d));
      svg.append('g').selectAll('text').data(d3.range(1, X.nd + 1).filter((d) => d === 1 || d % 5 === 0)).join('text').attr('x', (d) => x(d)).attr('y', H - 8).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').attr('fill', 'var(--color-fg-muted)').text((d) => d);
      [[HI, 'var(--color-warn)', '21 kV'], [LO, '#2f6fb3', '18 kV']].forEach(([v, c, l]) => {
        svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', c).attr('stroke-dasharray', '5 4').attr('stroke-width', 1.4);
        svg.append('text').attr('x', W - mg.r).attr('y', y(v) - 4).attr('text-anchor', 'end').style('font-size', 'var(--cds-font-size-caption)').attr('fill', c).text(l);
      });
      trs.forEach((t, i) => {
        const c = SSC[i % SSC.length];
        svg.append('path').attr('d', d3.line().defined((d) => d != null).x((d, j) => x(j + 1)).y((d) => y(d))(t.v)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2);
        svg.append('g').selectAll('circle').data(t.v.map((v, j) => [v, j + 1]).filter(([v]) => v != null)).join('circle').attr('cx', (d) => x(d[1])).attr('cy', (d) => y(d[0])).attr('r', 2.4).attr('fill', c)
          .append('title').text((d) => `${t.trafo} · ${d[1]} ${BLNF[X.mm - 1]}: max ${kv(d[0])} kV · min ${kv(t.vmin[d[1] - 1])} kV`);
        if (t.hasMin) {
          svg.append('path').attr('d', d3.line().defined((d) => d != null).x((d, j) => x(j + 1)).y((d) => y(d))(t.vmin)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 1.4).attr('stroke-dasharray', '4 3');
          svg.append('g').selectAll('circle').data(t.vmin.map((v, j) => [v, j + 1]).filter(([v]) => v != null)).join('circle').attr('cx', (d) => x(d[1])).attr('cy', (d) => y(d[0])).attr('r', (d) => (d[0] < LO ? 3.6 : 1.8)).attr('fill', (d) => (d[0] < LO ? KELAS.l.c : 'var(--color-bg)')).attr('stroke', c).attr('stroke-width', 1)
            .append('title').text((d) => `${t.trafo} · ${d[1]} ${BLNF[X.mm - 1]}: min ${kv(d[0])} kV`);
        }
      });
    }

    // chart gangguan penyulang
    $('d-pchart-h').textContent = selF ? `Kali gangguan per bulan · ${selF.nama}` : 'Kali gangguan per bulan';
    $('d-pchart-note').textContent = `${jenis || 'Semua jenis padam'}, No. Laporan unik. Garis putus-putus: rata-rata per penyulang di GI ini.`;
    const C = [['Permanen', SSC[0]], ['Sesaat', SSC[1]]];
    $('d-plegend').replaceChildren(...C.map(([n, c]) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = c; s.append(i, n); return s; }),
      (() => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = 'transparent'; i.style.borderTop = '2px dashed var(--cds-chart-reference)'; i.style.height = '0'; s.append(i, 'Rata-rata GI'); return s; })());
    chartP.classList.remove('dash-skeleton'); chartP.replaceChildren();
    if (!selF) { chartP.append(mk('div', 'Pilih penyulang.', 'ss-note')); return; }
    const data = X.months.map((m) => ({ m, Permanen: selF.s[m].Permanen, Sesaat: selF.s[m].Sesaat, t: selF.s[m].t, avg: feeders.length ? feeders.reduce((a, f) => a + f.s[m].t, 0) / feeders.length : 0 }));
    const W = Math.max(280, chartP.clientWidth), H = 280, mg = { t: 22, r: 8, b: 26, l: 30 };
    const svg = d3.select(chartP).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Kali gangguan per bulan ' + selF.nama);
    const y = d3.scaleLinear([0, Math.max(1, d3.max(data, (d) => Math.max(d.t, d.avg))) * 1.12], [H - mg.b, mg.t]).nice();
    const yt = y.ticks(5).filter((v) => Number.isInteger(v));
    const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(fmt(yt[yt.length - 1] || 0));
    mg.l = Math.ceil(probe.node().getComputedTextLength()) + 12; probe.remove();
    const x = d3.scaleBand(X.months, [mg.l, W - mg.r]).padding(0.3);
    svg.append('g').selectAll('line').data(yt).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(yt).join('text').attr('x', mg.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
    svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
    svg.append('g').selectAll('text').data(X.months).join('text').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', H - 7).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((d) => BLN[d - 1]);
    const bw = Math.min(x.bandwidth(), 32), off = (x.bandwidth() - bw) / 2;
    const st = d3.stack().keys(C.map((c) => c[0]))(data);
    const gb = svg.append('g');
    st.forEach((layer, li) => gb.append('g').selectAll('rect').data(layer).join('rect').attr('x', (d) => x(d.data.m) + off).attr('width', bw).attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]))).attr('fill', C[li][1]).attr('rx', li === st.length - 1 ? 3 : 0).attr('data-m', (d) => d.data.m));
    svg.append('path').attr('d', d3.line().x((d) => x(d.m) + x.bandwidth() / 2).y((d) => y(d.avg))(data)).attr('fill', 'none').attr('stroke', 'var(--cds-chart-reference)').attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4');
    if (x.bandwidth() >= 22) svg.append('g').selectAll('text').data(data.filter((d) => d.t > 0)).join('text').attr('x', (d) => x(d.m) + x.bandwidth() / 2).attr('y', (d) => y(d.t) - 6).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg)').style('font-size', 'var(--cds-font-size-caption)').text((d) => fmt(d.t));
    chartP.append(tip);
    svg.append('g').selectAll('rect').data(data).join('rect').attr('x', (d) => x(d.m)).attr('width', x.bandwidth()).attr('y', mg.t).attr('height', H - mg.t - mg.b).attr('fill', 'transparent')
      .on('pointerenter pointermove', (ev, d) => {
        gb.selectAll('rect').attr('opacity', function () { return Number(this.dataset.m) === d.m ? 1 : 0.35; });
        tip.replaceChildren(mk('div', BLNF[d.m - 1] + ' 2026', 'ss-tip-h'));
        [[C[0][1], 'Permanen', fmt(d.Permanen)], [C[1][1], 'Sesaat', fmt(d.Sesaat)], [null, 'Total', fmt(d.t)], [null, 'Rata-rata GI', f1.format(d.avg)]].forEach(([c, n, v]) => {
          const r = mk('div', null, 'ss-row'); const a = mk('span'); if (c) { const i = mk('i', null, 'ss-sw'); i.style.background = c; a.append(i); } a.append(n); const b = mk('span', v); if (n === 'Total') b.style.fontWeight = 600; r.append(a, b); tip.append(r);
        });
        tip.hidden = false;
        const sc = chartP.clientWidth / W, cx = (x(d.m) + x.bandwidth() / 2) * sc, tw = tip.offsetWidth;
        tip.style.left = (cx + 14 + tw > chartP.clientWidth ? Math.max(0, cx - tw - 14) : cx + 14) + 'px';
        tip.style.top = Math.max(0, y(Math.max(d.t, d.avg)) * sc - 10) + 'px';
      })
      .on('pointerleave', () => { tip.hidden = true; gb.selectAll('rect').attr('opacity', 1); });
  }
  SSD.onData(() => { if (dash.params().tab === 'penyulang') render(); });
})();
