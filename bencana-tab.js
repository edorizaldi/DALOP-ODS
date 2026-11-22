// Tab Disaster Dashboard (tanggap darurat).
// Kejadian + status penyulang dari laporan posko (bencana, bencana_status; unggah template_posko_bencana.xlsx di tab ini),
// aset terpapar dalam radius dari titik kejadian (gi_identitas, peny_profil, hx_feeder), riwayat padam bencana 2026
// (peny_bulanan jenis Bencana) dan gempa terkini BMKG (dibaca langsung dari data.bmkg.go.id bila browser mengizinkan).
(() => {
  const $ = (id) => document.getElementById(id);
  const ULABEL = { ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID Riau Kepri', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID Kalselteng', KALTIMRA: 'UID Kaltimra' };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const f1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const PRE = /^(MV\s*-?\s*CABLE|MVCABLE|CELL|FEEDER|PENYULANG|PNY|PYL|F)[\s_.\-]+/;
  const N = (s) => String(s || '').toUpperCase().trim().replace(PRE, '').replace(/[^A-Z0-9]/g, '');
  const NU = (s) => String(s || '').toUpperCase().replace(/^UP3\s+/, '').replace(/[^A-Z0-9]/g, '');
  const tc = (s) => String(s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const hv = (a, b, c, d) => { const r = (x) => x * Math.PI / 180; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
  const xy = (o) => o && o.lat !== '' && o.lat != null && isFinite(Number(o.lat)) && Number(o.lat) !== 0 && isFinite(Number(o.lon));
  // waktu laporan disimpan sebagai waktu dinding WIB "YYYY-MM-DDTHH:MM"
  const tms = (s) => (s ? new Date(s + ':00+07:00').getTime() : NaN);
  const nowMs = () => Date.now();
  const tfmt = (s) => { if (!s) return '—'; const [d, t] = s.split('T'); const [y, m, dd] = d.split('-').map(Number); return `${dd} ${BLN[m - 1]} ${t}`; };
  const jam = (h) => (h < 1 ? `${fmt(h * 60)} mnt` : `${f1.format(h)} jam`);
  const C = { padam: 'var(--color-bad)', pulih: 'var(--color-ok)', ter: 'var(--cds-chart-muted)', gi: '#2f6fb3', gempa: '#E07B00' };

  // hx_feeder (feeder per GI) besar: dimuat saat tab dibuka
  let hxLoading = false;
  const needHx = () => {
    if (!window.__D || 'hx_feeder' in window.__D || hxLoading) return;
    hxLoading = true; const s = document.createElement('script'); s.src = 'hx_feeder.js';
    s.onload = () => { hxLoading = false; if (window.__SSInvalidate) window.__SSInvalidate(); render(); };
    s.onerror = () => { hxLoading = false; window.__D.hx_feeder = []; render(); };
    document.head.appendChild(s);
  };

  const set = (o) => dash.setParams(o);
  $('b-f-kej').addEventListener('change', (e) => set({ b_kej: e.target.value || null, b_lat: null, b_lon: null, b_rad: null }));
  $('b-f-rad').addEventListener('change', (e) => set({ b_rad: e.target.value || null }));
  $('b-f-view').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ b_view: b.dataset.v || null }); });
  $('b-reset').addEventListener('click', () => set({ b_lat: null, b_lon: null, b_rad: null }));
  $('b-tfilter').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ b_f: b.dataset.v || null }); });
  let q = '';
  $('b-search').addEventListener('input', (e) => { q = e.target.value.trim().toUpperCase(); drawTable(); });

  // ---------- gempa BMKG ----------
  let quakes = null, quakeErr = '', quakeAt = 0;
  const parseQ = (g) => {
    let lat = NaN, lon = NaN;
    if (g.Coordinates) [lat, lon] = String(g.Coordinates).split(',').map(Number);
    else if (g.point && g.point.coordinates) [lon, lat] = String(g.point.coordinates).split(',').map(Number);
    if (!isFinite(lat) && g.Lintang) { lat = parseFloat(g.Lintang) * (/LS/i.test(g.Lintang) ? -1 : 1); lon = parseFloat(g.Bujur) * (/BB/i.test(g.Bujur) ? -1 : 1); }
    return { t: g.DateTime || `${g.Tanggal || ''} ${g.Jam || ''}`, tgl: `${g.Tanggal || ''} ${g.Jam || ''}`.trim(), m: Number(g.Magnitude), dalam: g.Kedalaman || '', wil: g.Wilayah || '', pot: g.Potensi || '', dir: g.Dirasakan || '', lat, lon };
  };
  async function loadQuakes() {
    quakeAt = Date.now();
    const get = async (f) => { const r = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/' + f, { cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
    try {
      const [a, b] = await Promise.allSettled([get('autogempa.json'), get('gempaterkini.json')]);
      const list = [];
      if (a.status === 'fulfilled' && a.value && a.value.Infogempa) list.push(parseQ(a.value.Infogempa.gempa));
      if (b.status === 'fulfilled' && b.value && b.value.Infogempa) [].concat(b.value.Infogempa.gempa || []).forEach((g) => list.push(parseQ(g)));
      if (!list.length) throw new Error((a.reason || b.reason || {}).message || 'tidak ada data');
      const seen = new Set(); quakes = list.filter((x) => isFinite(x.lat) && isFinite(x.lon) && !seen.has(x.t + x.lat) && seen.add(x.t + x.lat)).sort((x, y) => (x.t < y.t ? 1 : -1));
      quakeErr = '';
    } catch (e) { quakes = []; quakeErr = (e && e.message) || String(e); }
    render();
  }
  $('b-q-reload').addEventListener('click', () => { $('b-q-list').replaceChildren(mk('p', 'Memuat data gempa BMKG…', 'ss-note')); loadQuakes(); });

  // ---------- indeks aset ----------
  let cacheKey = null, A = null;
  function build(GI, PP, FD, PB) {
    const p3 = new Map(), pu = new Map();
    PP.forEach((p) => { const a = NU(p.up3) + '|' + N(p.penyulang), b = p.uid + '|' + N(p.penyulang); if (!p3.has(a)) p3.set(a, p); if (!pu.has(b)) pu.set(b, p); });
    const giByAset = new Map(GI.map((g) => [g.aset, g]));
    const feedByProf = new Map(), feedByGi = new Map();
    FD.forEach((f) => {
      const g = giByAset.get(f.gi); if (!g) return;
      const p = p3.get(NU(g.up3) + '|' + N(f.nama)) || pu.get(g.uid + '|' + N(f.nama)) || null;
      const o = { f, g, p }; if (p && !feedByProf.has(p)) feedByProf.set(p, o);
      const a = feedByGi.get(g.aset) || []; a.push(o); feedByGi.set(g.aset, a);
    });
    const ben = new Map(); PB.forEach((r) => { if (r.jenis_padam !== 'Bencana') return; const k = r.up3 + '\u0001' + r.penyulang; ben.set(k, (ben.get(k) || 0) + Number(r.kali)); });
    return { GI, PP, p3, pu, feedByProf, feedByGi, ben };
  }
  const profOf = (r) => A.p3.get(NU(r.up3) + '|' + N(r.penyulang)) || A.pu.get(r.uid + '|' + N(r.penyulang)) || null;

  // ---------- state ----------
  let rows = [], filt = 'semua', ctx = null;

  function drawTable() {
    const tb = $('b-tabel'); if (!ctx) return;
    const head = mk('thead'), hr = mk('tr');
    [['Penyulang', 'ss-l'], ['Status', 'ss-l'], ['Gardu induk', 'ss-l ss-hide-n'], ['UP3 · ULP', 'ss-l ss-hide-n'], ['Padam'], ['Nyala'], ['Lama padam'], ['Gardu', 'ss-hide-n'], ['Pelanggan', 'ss-hide-n'], ['Bencana 2026', 'ss-hide-n'], ['Keterangan', 'ss-l ss-hide-n']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
    head.append(hr);
    const body = mk('tbody');
    const list = rows.filter((r) => (filt === 'semua' || r.st === filt) && (!q || r.nama.includes(q) || String(r.gi).toUpperCase().includes(q) || String(r.up3).toUpperCase().includes(q) || String(r.ulp).toUpperCase().includes(q)));
    list.forEach((r) => {
      const tr = mk('tr');
      const n = mk('td', r.nama, 'ss-l'); if (r.rep && !r.prof) n.append(mk('span', 'tidak ada di database penyulang', 'ss-p-flag')); tr.append(n);
      const st = mk('td', null, 'ss-l'); const pl = mk('span', r.st === 'padam' ? 'Padam' : r.st === 'pulih' ? 'Pulih' : 'Terpapar, belum dilaporkan', 'gi-pill'); pl.style.setProperty('--gi-c', C[r.st]); st.append(pl); tr.append(st);
      tr.append(mk('td', r.gi || '—', 'ss-l ss-hide-n'), mk('td', [r.up3, r.ulp].filter(Boolean).join(' · ') || '—', 'ss-l ss-hide-n'),
        mk('td', r.rep ? tfmt(r.rep.padam) : '—'), mk('td', r.rep ? (r.rep.nyala ? tfmt(r.rep.nyala) : 'masih padam') : '—'),
        mk('td', r.rep ? jam(r.dur) : '—', r.st === 'padam' ? 'ss-hl b-bad' : 'ss-hl'),
        mk('td', r.rep && r.rep.gardu !== '' ? fmt(r.rep.gardu) : r.gardu != null ? `${fmt(r.gardu)}*` : '—', 'ss-hide-n'),
        mk('td', r.rep && r.rep.pelanggan !== '' ? fmt(r.rep.pelanggan) : '—', 'ss-hide-n'),
        mk('td', r.ben ? fmt(r.ben) + ' kali' : '—', 'ss-hide-n'), mk('td', (r.rep && r.rep.keterangan) || (r.why || ''), 'ss-l ss-hide-n gi-cat'));
      body.append(tr);
    });
    if (!list.length) { const tr = mk('tr'); const td = mk('td', ctx.center ? 'Tidak ada penyulang untuk pilihan ini.' : 'Pilih kejadian atau klik peta untuk menentukan titik bencana.', 'ss-note'); td.colSpan = 11; tr.append(td); body.append(tr); }
    tb.replaceChildren(head, body);
    $('b-tfilter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v || 'semua') === filt)));
    $('b-tabel-note').textContent = `${fmt(list.length)} penyulang. Padam/pulih dari laporan posko; "terpapar" = penyulang berkoordinat dalam radius atau disuplai GI dalam radius, belum ada di laporan. Kolom Gardu bertanda * = jumlah gardu di feeder menurut Hirarki Aset. "Bencana 2026" = kali padam jenis Bencana Jan–Okt 2026.`;
  }

  function render() {
    if (dash.params().tab !== 'bencana') return;
    const G = SSD.data('gi_identitas'), P = SSD.data('peny_profil'), B = SSD.data('peny_bulanan'), K = SSD.data('bencana'), S = SSD.data('bencana_status');
    const all = [G, P, B, K, S];
    if (all.some((d) => d.status === 'error')) { $('b-take').textContent = 'Failed to load'; return; }
    if (all.some((d) => d.status !== 'ok')) return;
    needHx();
    if (!('hx_feeder' in (window.__D || {}))) return;
    const F = SSD.data('hx_feeder'); if (F.status !== 'ok') return;
    const ck = [G.data, P.data, F.data, B.data];
    if (!cacheKey || ck.some((v, i) => v !== cacheKey[i])) { cacheKey = ck; A = build(G.data, P.data, F.data, B.data); }
    if (quakes === null && !quakeAt) loadQuakes();
    const prm = dash.params();
    filt = ['padam', 'pulih', 'ter'].includes(prm.b_f) ? prm.b_f : 'semua';
    const KJ = K.data || [];
    const kej = KJ.find((k) => k.nama === prm.b_kej) || KJ.find((k) => k.status !== 'Selesai') || KJ[0] || null;
    const custom = isFinite(Number(prm.b_lat)) && isFinite(Number(prm.b_lon)) && prm.b_lat != null && prm.b_lon != null;
    const center = custom ? { lat: Number(prm.b_lat), lon: Number(prm.b_lon) } : kej ? { lat: Number(kej.lat), lon: Number(kej.lon) } : null;
    const rad = Number(prm.b_rad) > 0 ? Number(prm.b_rad) : kej && !custom ? Number(kej.radius_km) || 25 : 25;

    // kontrol
    $('b-f-kej').replaceChildren(...(KJ.length ? KJ.map((k) => new Option(`${k.nama} · ${k.status}`, k.nama)) : [new Option('Belum ada kejadian di laporan posko', '')])); $('b-f-kej').value = kej ? kej.nama : ''; $('b-f-kej').disabled = !KJ.length;
    const radOpts = [5, 10, 15, 25, 50, 75, 100, 150]; if (!radOpts.includes(rad)) radOpts.push(rad); radOpts.sort((a, b) => a - b);
    $('b-f-rad').replaceChildren(...radOpts.map((r) => new Option(`${r} km`, String(r)))); $('b-f-rad').value = String(rad);
    const view = prm.b_view === 'sumkal' || !center ? 'sumkal' : 'area';
    $('b-f-view').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v || 'area') === view)));
    $('b-reset').hidden = !custom && !prm.b_rad;
    $('b-center').textContent = center ? `Titik ${custom ? 'pilihan peta' : 'kejadian'}: ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)} · radius ${rad} km. Klik peta untuk memindahkan titik.` : 'Klik peta untuk menentukan titik bencana, atau unggah laporan posko.';

    // aset terpapar
    const giIn = center ? A.GI.filter((g) => xy(g) && hv(center.lat, center.lon, +g.lat, +g.lon) <= rad) : [];
    const expo = new Map(); // profil/feeder → { nama, why, ... }
    const keyP = (p) => 'P|' + p.uid + '|' + N(p.penyulang);
    if (center) {
      A.PP.forEach((p) => { if (xy(p)) { const d = hv(center.lat, center.lon, +p.lat, +p.lon); if (d <= rad) expo.set(keyP(p), { prof: p, d, why: `${f1.format(d)} km dari titik` }); } });
      giIn.forEach((g) => (A.feedByGi.get(g.aset) || []).forEach((o) => { const k = o.p ? keyP(o.p) : 'F|' + o.f.kode; if (!expo.has(k)) expo.set(k, { prof: o.p, feed: o, why: `disuplai GI ${g.nama} (dalam radius)` }); }));
    }
    // laporan posko
    const rep = kej ? (S.data || []).filter((r) => r.kejadian === kej.nama) : [];
    const now = nowMs();
    rows = [];
    const used = new Set();
    rep.forEach((r) => {
      const p = profOf(r); const k = p ? keyP(p) : 'R|' + r.uid + '|' + N(r.penyulang); used.add(k);
      const fo = p ? A.feedByProf.get(p) : null;
      const dur = Math.max(0, ((r.nyala ? tms(r.nyala) : now) - tms(r.padam)) / 36e5);
      rows.push({ nama: r.penyulang, st: r.nyala ? 'pulih' : 'padam', rep: r, prof: p, gi: r.gi || (fo ? fo.g.nama : ''), up3: r.up3 || (p ? p.up3 : ''), ulp: r.ulp || (p ? p.ulp : ''), uid: r.uid || (p ? p.uid : ''), dur, gardu: fo ? Number(fo.f.gardu) || 0 : null, ben: p ? A.ben.get(p.up3 + '\u0001' + p.penyulang) || 0 : 0 });
    });
    expo.forEach((e, k) => {
      if (used.has(k)) { const r = rows.find((x) => x.prof && keyP(x.prof) === k); if (r) r.inRad = true; return; }
      const p = e.prof, fo = e.feed || (p ? A.feedByProf.get(p) : null);
      rows.push({ nama: p ? p.penyulang : String(fo.f.nama).replace(PRE, ''), st: 'ter', rep: null, prof: p, gi: fo ? fo.g.nama : '', up3: p ? p.up3 : fo.g.up3, ulp: p ? p.ulp : tc(fo.f.ulp).replace(/^Ulp /, ''), uid: p ? p.uid : fo.g.uid, dur: 0, gardu: fo ? Number(fo.f.gardu) || 0 : null, trafo: fo ? Number(fo.f.trafo) || 0 : 0, why: e.why, ben: p ? A.ben.get(p.up3 + '\u0001' + p.penyulang) || 0 : 0, inRad: true });
    });
    const ord = { padam: 0, pulih: 1, ter: 2 };
    rows.sort((a, b) => ord[a.st] - ord[b.st] || b.dur - a.dur || b.ben - a.ben || a.nama.localeCompare(b.nama));
    ctx = { center, rad, kej };
    const nPad = rows.filter((r) => r.st === 'padam'), nPul = rows.filter((r) => r.st === 'pulih'), nRep = nPad.length + nPul.length;
    const expoRows = rows.filter((r) => r.inRad);
    const sumGardu = expoRows.reduce((a, r) => a + (r.gardu || 0), 0);
    const sumTrafo = expoRows.reduce((a, r) => { const fo = r.prof ? A.feedByProf.get(r.prof) : null; return a + (r.trafo != null ? r.trafo : fo ? Number(fo.f.trafo) || 0 : 0); }, 0);
    const pelPad = nPad.reduce((a, r) => a + (Number(r.rep.pelanggan) || 0), 0);

    // ringkasan
    {
      const tk = $('b-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const Bb = (s, cls) => mk('b', s, cls);
      if (kej) {
        const sejak = (now - tms(kej.mulai)) / 36e5;
        tk.append(new RegExp(kej.jenis, 'i').test(kej.nama) ? kej.nama : `${kej.jenis} · ${kej.nama}`, kej.mulai ? `, mulai ${tfmt(kej.mulai)} WIB` : '', kej.status === 'Selesai' ? ' (selesai). ' : sejak > 0 ? ` (${sejak >= 48 ? f1.format(sejak / 24) + ' hari' : f1.format(sejak) + ' jam'} berjalan). ` : '. ');
        if (nRep) {
          tk.append('Laporan posko: ', Bb(`${fmt(nRep)} penyulang padam`), ', ', Bb(`${fmt(nPul.length)} sudah pulih (${f1.format(nPul.length / nRep * 100)}%)`, 'b-ok'), ', ', Bb(`${fmt(nPad.length)} masih padam`, nPad.length ? 'b-bad' : ''));
          if (nPad.length) tk.append(`, terlama ${nPad[0].nama} (${jam(nPad[0].dur)})`);
          tk.append('. ');
        } else tk.append('Belum ada status penyulang di laporan posko. ');
      } else tk.append('Belum ada kejadian bencana di laporan posko. Klik peta untuk memeriksa aset di sekitar titik tertentu, atau unggah laporan posko di bawah. ');
      if (center) tk.append(`Dalam radius ${rad} km: `, Bb(`${fmt(giIn.length)} GI`), ' dan ', Bb(`${fmt(expoRows.length)} penyulang`), ` terpapar (${fmt(sumGardu)} gardu).`);
    }

    // tile
    const done = (id, t) => { const e = $(id); e.textContent = t; e.classList.remove('dash-skeleton'); };
    done('b-t1', fmt(nPad.length)); $('b-t1-sub').textContent = nRep ? `${pelPad ? fmt(pelPad) + ' pelanggan · ' : ''}dari ${fmt(nRep)} penyulang dilaporkan` : 'belum ada laporan posko';
    done('b-t2', fmt(nPul.length)); $('b-t2-sub').textContent = nPul.length ? `${f1.format(nPul.length / nRep * 100)}% pulih · rata-rata ${jam(nPul.reduce((a, r) => a + r.dur, 0) / nPul.length)} padam` : nRep ? '0% pulih' : '—';
    done('b-t3', fmt(expoRows.length)); $('b-t3-sub').textContent = center ? `${fmt(giIn.length)} GI dalam radius ${rad} km` : 'tentukan titik bencana';
    done('b-t4', fmt(sumGardu)); $('b-t4-sub').textContent = center ? `${fmt(sumTrafo)} trafo di feeder terpapar` : '—';

    // peta
    if (window.SSMAP) {
      const pts = [];
      giIn.forEach((g) => pts.push({ lon: g.lon, lat: g.lat, r: 6, color: C.gi, label: g.nama, tip: [g.nama, [[null, 'UP3', g.up3 || '—'], [null, 'Jarak', f1.format(hv(center.lat, center.lon, +g.lat, +g.lon)) + ' km'], [null, 'Feeder', fmt((A.feedByGi.get(g.aset) || []).length)]]] }));
      rows.forEach((r) => { if (!xy(r.prof)) return; pts.push({ lon: r.prof.lon, lat: r.prof.lat, r: r.st === 'ter' ? 3.2 : 4.6, color: C[r.st], selected: false, label: r.st === 'padam' && r === nPad[0] ? r.nama : '',
        tip: ['Penyulang ' + r.nama, [[null, 'Status', r.st === 'padam' ? 'Padam' : r.st === 'pulih' ? 'Pulih' : 'Terpapar'], [null, 'Lama padam', r.rep ? jam(r.dur) : '—'], [null, 'GI', r.gi || '—']]] }); });
      (quakes || []).forEach((g) => { if (!(g.lon > 92 && g.lon < 122 && g.lat > -11 && g.lat < 9)) return; pts.push({ lon: g.lon, lat: g.lat, r: Math.max(4, g.m * 1.6), color: C.gempa, label: view === 'sumkal' ? `M${f1.format(g.m)}` : '', tip: [`Gempa M${f1.format(g.m)}`, [[null, 'Waktu', g.tgl], [null, 'Kedalaman', g.dalam], [null, 'Wilayah', g.wil]]], onClick: () => set({ b_lat: g.lat.toFixed(4), b_lon: g.lon.toFixed(4), b_rad: String(g.m >= 6 ? 75 : 50), b_view: null }) }); });
      if (center) pts.push({ lon: center.lon, lat: center.lat, r: 6, color: 'var(--color-bad)', pulse: true, label: kej && !custom ? kej.jenis : 'Titik bencana' });
      const km2deg = (km, lat) => [km / 111.32 / Math.cos(lat * Math.PI / 180), km / 110.57];
      let fit = null; if (center && view === 'area') { const [dx, dy] = km2deg(Math.max(rad * 1.5, 25), center.lat); fit = [[center.lon - dx, center.lat - dy], [center.lon + dx, center.lat + dy]]; }
      window.SSMAP($('b-map'), { label: 'Peta area bencana', fit, fill: () => 'color-mix(in srgb, var(--ss-acc) 12%, var(--color-panel))', circle: center ? { lon: center.lon, lat: center.lat, km: rad } : null,
        onMap: (lon, lat) => { if (lon > 92 && lon < 122 && lat > -11 && lat < 9) set({ b_lat: lat.toFixed(4), b_lon: lon.toFixed(4) }); }, points: pts });
      $('b-map-legend').replaceChildren(...[[C.padam, 'Penyulang padam'], [C.pulih, 'Pulih'], [C.ter, 'Terpapar, belum dilaporkan'], [C.gi, 'GI dalam radius'], [C.gempa, 'Gempa terkini BMKG']].map(([c, l]) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = c; i.style.borderRadius = '50%'; s.append(i, l); return s; }));
    }

    // pemulihan per UP3
    {
      const M = new Map();
      rows.forEach((r) => { const k = r.up3 || '(tanpa UP3)'; const o = M.get(k) || { uid: r.uid, ter: 0, pad: 0, pul: 0, pel: 0, max: 0 }; if (r.inRad) o.ter++; if (r.st === 'padam') { o.pad++; o.pel += Number(r.rep.pelanggan) || 0; o.max = Math.max(o.max, r.dur); } if (r.st === 'pulih') o.pul++; M.set(k, o); });
      const tb = $('b-up3'); const head = mk('thead'), hr = mk('tr');
      [['UP3', 'ss-l'], ['Terpapar'], ['Dilaporkan padam'], ['Masih padam'], ['Pulih'], ['% pulih'], ['Pelanggan padam', 'ss-hide-n'], ['Padam terlama']].forEach(([h, c]) => hr.append(mk('th', h, c || ''))); head.append(hr);
      const body = mk('tbody');
      [...M.entries()].sort((a, b) => b[1].pad - a[1].pad || b[1].ter - a[1].ter).forEach(([u, o]) => {
        const tr = mk('tr'); const rp = o.pad + o.pul;
        tr.append(mk('td', u + (o.uid ? ' · ' + (ULABEL[o.uid] || o.uid).replace('UID ', '') : ''), 'ss-l'), mk('td', fmt(o.ter)), mk('td', fmt(rp)), mk('td', fmt(o.pad), o.pad ? 'ss-hl b-bad' : ''), mk('td', fmt(o.pul)), mk('td', rp ? f1.format(o.pul / rp * 100) + '%' : '—'), mk('td', o.pel ? fmt(o.pel) : '—', 'ss-hide-n'), mk('td', o.pad ? jam(o.max) : '—'));
        body.append(tr);
      });
      if (!M.size) { const tr = mk('tr'); const td = mk('td', 'Belum ada data.', 'ss-note'); td.colSpan = 8; tr.append(td); body.append(tr); }
      tb.replaceChildren(head, body);
    }

    // timeline padam dan pulih
    {
      const ch = $('b-chart'); ch.classList.remove('dash-skeleton'); ch.replaceChildren();
      const ev = []; rep.forEach((r) => { ev.push([tms(r.padam), 1, 0]); if (r.nyala) ev.push([tms(r.nyala), 0, 1]); });
      if (!ev.length) ch.append(mk('div', 'Grafik muncul setelah laporan posko berisi waktu padam penyulang.', 'ss-note'));
      else {
        ev.sort((a, b) => a[0] - b[0]);
        const t0 = Math.min(ev[0][0], kej && kej.mulai ? tms(kej.mulai) : Infinity), t1 = Math.max(ev[ev.length - 1][0], kej && kej.status === 'Selesai' ? ev[ev.length - 1][0] : now);
        let p = 0, u = 0; const ser = [[t0, 0, 0]]; ev.forEach(([t, a, b]) => { p += a; u += b; ser.push([t, p, u]); }); ser.push([t1, p, u]);
        const W = Math.max(280, ch.clientWidth), H = 240, mg = { t: 14, r: 12, b: 26, l: 34 };
        const svg = d3.select(ch).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Jumlah penyulang padam dan pulih menurut waktu');
        const x = d3.scaleTime([new Date(t0), new Date(t1)], [mg.l, W - mg.r]), y = d3.scaleLinear([0, Math.max(1, p)], [H - mg.b, mg.t]).nice();
        svg.append('g').selectAll('line').data(y.ticks(4).filter(Number.isInteger)).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
        svg.append('g').selectAll('text').data(y.ticks(4).filter(Number.isInteger)).join('text').attr('x', mg.l - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
        const fx = (d) => { const z = new Date(d.getTime() + 7 * 36e5); return `${z.getUTCDate()} ${BLN[z.getUTCMonth()]} ${String(z.getUTCHours()).padStart(2, '0')}:00`; };
        svg.append('g').selectAll('text').data(x.ticks(Math.max(2, Math.floor(W / 140)))).join('text').attr('x', x).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fx);
        const area = d3.area().curve(d3.curveStepAfter).x((d) => x(new Date(d[0]))).y0((d) => y(d[2])).y1((d) => y(d[1]));
        svg.append('path').attr('d', area(ser)).attr('fill', C.padam).attr('fill-opacity', 0.14);
        [[1, C.padam], [2, C.pulih]].forEach(([i, c]) => svg.append('path').attr('d', d3.line().curve(d3.curveStepAfter).x((d) => x(new Date(d[0]))).y((d) => y(d[i]))(ser)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2.2));
        svg.append('text').attr('x', W - mg.r).attr('y', y(p) - 6).attr('text-anchor', 'end').attr('fill', C.padam).style('font-size', 'var(--cds-font-size-caption)').text(`${fmt(p)} padam`);
        svg.append('text').attr('x', W - mg.r).attr('y', Math.min(H - mg.b - 4, y(u) + 14)).attr('text-anchor', 'end').attr('fill', C.pulih).style('font-size', 'var(--cds-font-size-caption)').text(`${fmt(u)} pulih`);
      }
    }

    // gempa BMKG
    {
      const box = $('b-q-list'); box.replaceChildren();
      if (quakes === null) box.append(mk('p', 'Memuat data gempa BMKG…', 'ss-note'));
      else if (!quakes.length) box.append(mk('p', `Data gempa BMKG tidak dapat dibaca dari halaman ini (${quakeErr}). Lihat langsung di bmkg.go.id.`, 'ss-note'));
      else {
        const tb = mk('table', null, 'ss-table b-q-table'); const hd = mk('thead'); const hr = mk('tr');
        [['Waktu', 'ss-l'], ['M'], ['Kedalaman', 'ss-hide-n'], ['Wilayah', 'ss-l'], ['GI terdekat', 'ss-l ss-hide-n'], ['', '']].forEach(([h, c]) => hr.append(mk('th', h, c))); hd.append(hr);
        const bd = mk('tbody');
        quakes.slice(0, 12).forEach((g) => {
          const near = A.GI.filter(xy).map((x) => [x, hv(g.lat, g.lon, +x.lat, +x.lon)]).sort((a, b) => a[1] - b[1])[0];
          const tr = mk('tr'); if (g.m >= 5) tr.className = 'b-q-big';
          const b = mk('button', 'Jadikan titik', 'ss-chip'); b.type = 'button'; b.addEventListener('click', () => set({ b_lat: g.lat.toFixed(4), b_lon: g.lon.toFixed(4), b_rad: String(g.m >= 6 ? 75 : 50), b_view: null }));
          const bt = mk('td'); bt.append(b);
          tr.append(mk('td', g.tgl, 'ss-l'), mk('td', isFinite(g.m) ? f1.format(g.m) : '—', 'ss-hl'), mk('td', g.dalam, 'ss-hide-n'), mk('td', g.wil + (g.pot ? ` · ${g.pot}` : ''), 'ss-l'), mk('td', near ? `${near[0].nama} · ${fmt(near[1])} km` : '—', 'ss-l ss-hide-n'), bt);
          bd.append(tr);
        });
        tb.append(hd, bd); const w = mk('div', null, 'ss-tablewrap'); w.append(tb); box.append(w);
      }
      $('b-q-note').textContent = `Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika), gempa terkini M5+ dan gempa terbaru.${quakeAt ? ' Dibaca ' + new Date(quakeAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '.' : ''} "Jadikan titik" memindahkan titik bencana ke episentrum dengan radius 50 km (75 km untuk M6+).`;
    }
    drawTable();
  }
  SSD.onData(render);

  // ---------------- unggah laporan posko ----------------
  const msg = (t, cls) => { const m = $('b-up-msg'); m.textContent = t || ''; m.className = 'ss-up-msg' + (cls ? ' ' + cls : ''); };
  let pending = null;
  function review() {
    $('b-up-review').hidden = !pending; $('b-up-go').disabled = !pending; if (!pending) return;
    const o = pending.out; const cur = SSD.data('bencana').data || [], curS = SSD.data('bencana_status').data || [];
    const body = $('b-up-body'); body.replaceChildren(...o.kejadian.map((k) => {
      const st = o.status.filter((r) => r.kejadian === k.nama); const old = cur.find((c) => N(c.nama) === N(k.nama)); const oldS = curS.filter((r) => N(r.kejadian) === N(k.nama));
      const tr = mk('tr'); [k.nama + (old ? '' : ' (baru)'), k.jenis, `${k.lat}, ${k.lon} · ${k.radius_km} km`, tfmt(k.mulai), k.status, o.hasStatus ? `${fmt(st.length)} (${fmt(st.filter((r) => !r.nyala).length)} masih padam)` : 'tidak diubah', old ? `${fmt(oldS.length)} (${fmt(oldS.filter((r) => !r.nyala).length)} masih padam)` : '—'].forEach((v, i) => tr.append(mk('td', v, i >= 5 ? 'num' : ''))); return tr;
    }));
    $('b-up-sum').textContent = `${pending.name}: ${fmt(o.kejadian.length)} kejadian, ${fmt(o.status.length)} baris status penyulang.` + (o.warn.length ? ' Catatan: ' + o.warn.join('; ') + '.' : '') + ' Kejadian dengan nama sama akan diganti seluruhnya oleh isi file ini.';
  }
  async function handle(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { msg('Pilih file .xlsx (template laporan posko bencana).', 'bad'); return; }
    if (!window.APKT || !window.APKT.readSheets) { msg('Pembaca Excel belum termuat. Muat ulang halaman lalu coba lagi.', 'bad'); return; }
    pending = null; review(); msg('Membaca file…');
    try { const sh = await window.APKT.readSheets(file, () => {}); pending = { name: file.name, out: window.SSPosko.build(sh) }; msg(''); } catch (e) { msg('File tidak bisa dibaca: ' + ((e && e.message) || e), 'bad'); }
    review();
  }
  async function apply() {
    if (!pending) return;
    const { name, out } = pending; $('b-up-go').disabled = true;
    const m = window.SSPosko.merge(SSD.data('bencana').data || [], SSD.data('bencana_status').data || [], out);
    window.__D.bencana = m.kejadian; window.__D.bencana_status = m.status;
    if (SSD.set) SSD.set({ bencana: m.kejadian, bencana_status: m.status });
    const Ad = window.SSAdmin; let saved = false, why = '';
    if (Ad && Ad.isAdmin() && Ad.putMany) {
      try {
        await Ad.putMany([{ path: 'bencana.js', text: window.SSPosko.toJs('bencana', m.kejadian) }, { path: 'bencana_status.js', text: window.SSPosko.toJs('bencana_status', m.status) }],
          `Laporan posko bencana dari ${name} di dashboard`, (t) => msg(t + '…'));
        saved = true;
      } catch (e) { why = e && e.code === 'gh-403' ? 'token admin belum punya izin menulis ke repo ini' : e && e.code === 'gh-401' ? 'login admin sudah tidak berlaku; keluar lalu login lagi' : ((e && e.message) || String(e)); }
    }
    set({ b_kej: out.kejadian[0].nama, b_lat: null, b_lon: null, b_rad: null });
    msg(saved ? 'Laporan posko tersimpan ke repo dan langsung tampil di layar ini; pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).'
      : `Laporan posko tampil di layar ini, tetapi belum tersimpan untuk pembaca lain (${why || 'belum login admin'}). Untuk menyimpannya, klik "Login admin" (kanan bawah), lalu unggah ulang file yang sama.`, saved ? 'ok' : '');
    pending = null; review();
  }
  const drop = $('b-up-drop'), input = $('b-up-file');
  input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; handle(f); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handle(f); });
  $('b-up-go').addEventListener('click', apply);
  $('b-up-cancel').addEventListener('click', () => { pending = null; review(); msg(''); });
})();
