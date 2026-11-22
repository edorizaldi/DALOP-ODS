// Tab Disaster Dashboard (tanggap darurat).
// Alur: (1) titik + tipe bencana → radius terdampak menurut tipe; (2) laporan posko Excel: jam trip, jam nyala, status penyulang;
// (3) status penyulang menurun ke gardu dan trafo di hirarki penyulang itu (hx_feeder, trafo_wilayah);
// (4) trafo padam/nyala menentukan kondisi kecamatan, kab/kota dan provinsi lokasi trafo (wilayah_kec/kab/prov, kode Kepmendagri 2025).
// Data: bencana, bencana_status (laporan posko), gi_identitas, peny_profil, peny_bulanan, dimuat saat tab dibuka: hx_feeder, trafo_wilayah,
// wilayah_kec, wilayah_kab, wilayah_prov. Gempa terkini dibaca langsung dari data.bmkg.go.id.
(() => {
  const $ = (id) => document.getElementById(id);
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const f1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (a, b) => (b ? f1.format(a / b * 100) + '%' : '—');
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const PRE = /^(MV\s*-?\s*CABLE|MVCABLE|CELL|FEEDER|PENYULANG|PNY|PYL|F)[\s_.\-]+/;
  const clean = (s) => String(s || '').toUpperCase().trim().replace(PRE, '').trim();
  const N = (s) => clean(s).replace(/[^A-Z0-9]/g, '');
  const NU = (s) => String(s || '').toUpperCase().replace(/^UP3\s+/, '').replace(/[^A-Z0-9]/g, '');
  const NG = (s) => String(s || '').toUpperCase().replace(/^(GI|GARDU INDUK)\s+/, '').replace(/[^A-Z0-9]/g, '');
  const hv = (a, b, c, d) => { const r = (x) => x * Math.PI / 180; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
  const xy = (o) => o && o.lat !== '' && o.lat != null && isFinite(Number(o.lat)) && Number(o.lat) !== 0 && isFinite(Number(o.lon));
  const tms = (s) => (s ? new Date(s + ':00+07:00').getTime() : NaN); // waktu laporan = waktu dinding WIB
  const tfmt = (s) => { if (!s) return '—'; const [d, t] = s.split('T'); const [, m, dd] = d.split('-').map(Number); return `${dd} ${BLN[m - 1]} ${t}`; };
  const jam = (h) => (h < 1 ? `${fmt(h * 60)} mnt` : `${f1.format(h)} jam`);
  const nowWib = () => { const z = new Date(Date.now() + 7 * 36e5); return z.toISOString().slice(0, 16); };
  const C = { padam: 'var(--color-bad)', pulih: 'var(--color-ok)', ter: 'var(--cds-chart-muted)', gi: '#2f6fb3', gempa: '#E07B00' };
  const LV = { prov: 'Provinsi', kab: 'Kab/Kota', kec: 'Kecamatan' };
  const P = () => window.SSPosko;

  // ---------- muat data besar saat tab dibuka ----------
  const LAZY = ['hx_feeder', 'trafo_wilayah', 'wilayah_kec', 'wilayah_kab', 'wilayah_prov'];
  const loading = new Set();
  const need = () => {
    let ready = true;
    LAZY.forEach((id) => {
      if (window.__D && id in window.__D) return; ready = false; if (loading.has(id)) return; loading.add(id);
      const s = document.createElement('script'); s.src = id + '.js';
      s.onload = () => { loading.delete(id); if (window.__SSInvalidate) window.__SSInvalidate(); render(); };
      s.onerror = () => { loading.delete(id); window.__D[id] = []; render(); };
      document.head.appendChild(s);
    });
    return ready;
  };

  const set = (o) => dash.setParams(o);
  $('b-f-kej').addEventListener('change', (e) => set({ b_kej: e.target.value || null, b_lat: null, b_lon: null, b_rad: null }));
  $('b-f-rad').addEventListener('change', (e) => set({ b_rad: e.target.value || null }));
  $('b-f-view').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ b_view: b.dataset.v || null }); });
  $('b-reset').addEventListener('click', () => set({ b_lat: null, b_lon: null, b_rad: null }));
  $('b-tfilter').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ b_f: b.dataset.v || null }); });
  $('b-wlv').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ b_lv: b.dataset.v || null }); });
  $('b-layer').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ b_ly: b.dataset.v || null }); });
  $('b-ringkasan').querySelector('.b-nav').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-go]'); if (!b) return;
    e.currentTarget.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    const t = $(b.dataset.go); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // cari kecamatan / kab-kota → jadikan titik bencana
  $('b-loc').addEventListener('change', (e) => {
    const v = e.target.value.trim().toUpperCase(); if (!v || !A) return;
    const hit = LOC.find((x) => x.label.toUpperCase() === v) || LOC.find((x) => x.label.toUpperCase().startsWith(v)) || LOC.find((x) => x.label.toUpperCase().includes(v));
    if (!hit) return;
    kj.lat.value = hit.c[1].toFixed(4); kj.lon.value = hit.c[0].toFixed(4);
    set({ b_lat: hit.c[1].toFixed(4), b_lon: hit.c[0].toFixed(4), b_rad: String(Number(kj.rad.value) || 10), b_view: null });
    e.target.value = ''; e.target.blur();
  });
  let LOC = [];
  // lapisan Windy dan lapisan bawaan per tipe bencana
  const WXOV = [['rain', 'Hujan'], ['rainAccu', 'Akumulasi hujan'], ['thunder', 'Petir'], ['wind', 'Angin'], ['gust', 'Hembusan'], ['waves', 'Gelombang'], ['temp', 'Suhu'], ['clouds', 'Awan']];
  const WXDEF = { Banjir: 'rainAccu', Longsor: 'rainAccu', 'Angin kencang': 'gust', Tsunami: 'waves', Kebakaran: 'wind', 'Erupsi gunung api': 'wind', 'Gempa bumi': 'rain', Lainnya: 'rain' };
  $('b-wx-ov').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set({ b_wx: b.dataset.v }); });
  let q = '';
  $('b-search').addEventListener('input', (e) => { q = e.target.value.trim().toUpperCase(); drawTable(); });

  // ---------- input kejadian di dashboard ----------
  const kj = { nama: $('b-k-nama'), jenis: $('b-k-jenis'), lat: $('b-k-lat'), lon: $('b-k-lon'), rad: $('b-k-rad'), mulai: $('b-k-mulai'), status: $('b-k-status') };
  let radTouched = false;
  const fillJenis = () => { if (!kj.jenis.options.length && P()) kj.jenis.replaceChildren(...P().JENIS.map((j) => new Option(`${j} · ${P().RADIUS[j]} km`, j))); };
  kj.jenis.addEventListener('change', () => { if (!radTouched && P()) kj.rad.value = P().RADIUS[kj.jenis.value]; preview(); });
  kj.rad.addEventListener('input', () => { radTouched = true; preview(); });
  [kj.lat, kj.lon].forEach((el) => el.addEventListener('change', preview));
  function preview() { const la = Number(kj.lat.value), lo = Number(kj.lon.value); if (kj.lat.value && kj.lon.value && isFinite(la) && isFinite(lo)) set({ b_lat: la.toFixed(4), b_lon: lo.toFixed(4), b_rad: String(Number(kj.rad.value) || 10) }); }
  const kmsg = (t, cls) => { const m = $('b-k-msg'); m.textContent = t || ''; m.className = 'ss-up-msg' + (cls ? ' ' + cls : ''); };
  $('b-k-save').addEventListener('click', async () => {
    const nama = kj.nama.value.trim(), la = Number(kj.lat.value), lo = Number(kj.lon.value), rad = Number(kj.rad.value);
    if (!nama) { kmsg('Isi nama kejadian.', 'bad'); return; }
    if (!(la > -11 && la < 8 && lo > 94 && lo < 120)) { kmsg('Klik peta atau isi latitude/longitude di wilayah Sumkal.', 'bad'); return; }
    if (!(rad > 0)) { kmsg('Isi radius (km).', 'bad'); return; }
    const k = { nama, jenis: kj.jenis.value, lat: Math.round(la * 1e5) / 1e5, lon: Math.round(lo * 1e5) / 1e5, radius_km: rad, mulai: kj.mulai.value || nowWib(), status: kj.status.value, keterangan: 'dibuat di dashboard' };
    const m = P().merge(SSD.data('bencana').data || [], SSD.data('bencana_status').data || [], { kejadian: [k], status: [], hasStatus: false });
    window.__D.bencana = m.kejadian; if (SSD.set) SSD.set({ bencana: m.kejadian });
    const ok = await save([{ path: 'bencana.js', text: P().toJs('bencana', m.kejadian) }], `Kejadian bencana "${nama}" dari dashboard`, kmsg);
    set({ b_kej: nama, b_lat: null, b_lon: null, b_rad: null });
    kmsg(ok === true ? `Kejadian "${nama}" tersimpan. Unggah laporan posko untuk status penyulangnya.` : `Kejadian "${nama}" tampil di layar ini, tetapi belum tersimpan untuk pembaca lain (${ok}). Login admin lalu simpan ulang.`, ok === true ? 'ok' : '');
  });
  async function save(files, message, say) {
    const Ad = window.SSAdmin;
    if (!(Ad && Ad.isAdmin() && Ad.putMany)) return 'belum login admin';
    try { await Ad.putMany(files, message, (t) => say(t + '…')); return true; } catch (e) { return e && e.code === 'gh-403' ? 'token admin belum punya izin menulis ke repo ini' : e && e.code === 'gh-401' ? 'login admin sudah tidak berlaku; keluar lalu login lagi' : ((e && e.message) || String(e)); }
  }

  // ---------- gempa BMKG ----------
  let quakes = null, quakeErr = '', quakeAt = 0;
  const parseQ = (g) => {
    let lat = NaN, lon = NaN;
    if (g.Coordinates) [lat, lon] = String(g.Coordinates).split(',').map(Number);
    else if (g.point && g.point.coordinates) [lon, lat] = String(g.point.coordinates).split(',').map(Number);
    if (!isFinite(lat) && g.Lintang) { lat = parseFloat(g.Lintang) * (/LS/i.test(g.Lintang) ? -1 : 1); lon = parseFloat(g.Bujur) * (/BB/i.test(g.Bujur) ? -1 : 1); }
    return { t: g.DateTime || `${g.Tanggal || ''} ${g.Jam || ''}`, tgl: `${g.Tanggal || ''} ${g.Jam || ''}`.trim(), m: Number(g.Magnitude), dalam: g.Kedalaman || '', wil: g.Wilayah || '', pot: g.Potensi || '', lat, lon };
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
  const useQuake = (g) => { fillJenis(); kj.jenis.value = 'Gempa bumi'; radTouched = false; kj.rad.value = g.m >= 6 ? 75 : 50; kj.lat.value = g.lat.toFixed(4); kj.lon.value = g.lon.toFixed(4); if (!kj.nama.value) kj.nama.value = `Gempa M${f1.format(g.m)} ${g.wil.split(/\s+/).slice(-1)[0] || ''} ${g.tgl.split(' ').slice(0, 3).join(' ')}`.trim(); preview(); };

  // ---------- indeks ----------
  let cacheKey = null, A = null;
  function build(GI, PP, FD, PB, TW, KEC, KAB, PROV) {
    const p3 = new Map(), pu = new Map();
    PP.forEach((p) => { const a = NU(p.up3) + '|' + N(p.penyulang), b = p.uid + '|' + N(p.penyulang); if (!p3.has(a)) p3.set(a, p); if (!pu.has(b)) pu.set(b, p); });
    const giByAset = new Map(GI.map((g) => [g.aset, g]));
    const fdIdx = new Map(), feedByGi = new Map(), feedByProf = new Map(), fdByKode = new Map();
    FD.forEach((f) => {
      const g = giByAset.get(f.gi) || null; const o = { f, g, p: null };
      if (g) { o.p = p3.get(NU(g.up3) + '|' + N(f.nama)) || pu.get(g.uid + '|' + N(f.nama)) || null; const a = feedByGi.get(g.aset) || []; a.push(o); feedByGi.set(g.aset, a); }
      if (o.p && !feedByProf.has(o.p)) feedByProf.set(o.p, o);
      fdByKode.set(f.kode, o);
      [g ? NU(g.up3) + '|' + N(f.nama) : null, g ? g.uid + '|' + N(f.nama) : null, '*|' + N(f.nama)].forEach((k) => { if (!k) return; const a = fdIdx.get(k) || []; if (!a.includes(o)) a.push(o); fdIdx.set(k, a); });
    });
    const twByF = new Map(), kecTot = new Map();
    TW.forEach((r) => { const t = Number(r.t) || 0; const a = twByF.get(r.f) || []; a.push({ k: r.k, t, s: r.s }); twByF.set(r.f, a); if (r.k) kecTot.set(r.k, (kecTot.get(r.k) || 0) + t); });
    const ben = new Map(); PB.forEach((r) => { if (r.jenis_padam !== 'Bencana') return; const k = r.up3 + '\u0001' + r.penyulang; ben.set(k, (ben.get(k) || 0) + Number(r.kali)); });
    const W = { kec: new Map(KEC.map((x) => [x.id, x])), kab: new Map(KAB.map((x) => [x.id, x])), prov: new Map(PROV.map((x) => [x.id, x])) };
    return { GI, PP, p3, pu, fdIdx, feedByGi, feedByProf, fdByKode, twByF, kecTot, ben, W, srcXY: TW.filter((r) => r.s === 'xy').reduce((a, r) => a + (Number(r.t) || 0), 0), srcAll: TW.reduce((a, r) => a + (Number(r.t) || 0), 0) };
  }
  // feeder hirarki aset untuk satu baris laporan: cocokkan nama penyulang di UP3, lalu UID; pilih GI yang sama bila diisi
  const feedersOf = (r, prof) => {
    let c = A.fdIdx.get(NU(r.up3 || (prof && prof.up3)) + '|' + N(r.penyulang)) || A.fdIdx.get((r.uid || (prof && prof.uid)) + '|' + N(r.penyulang)) || [];
    if (!c.length && prof) { const o = A.feedByProf.get(prof); if (o) c = [o]; }
    if (c.length > 1 && r.gi) { const g = c.filter((o) => o.g && NG(o.g.nama) === NG(r.gi)); if (g.length) c = g; }
    if (c.length > 1) { const u = c.filter((o) => o.g && o.g.uid === (r.uid || (prof && prof.uid))); if (u.length) c = u; }
    return c;
  };
  const profOf = (r) => A.p3.get(NU(r.up3) + '|' + N(r.penyulang)) || A.pu.get(r.uid + '|' + N(r.penyulang)) || null;
  const wname = (lv, id) => { const x = A.W[lv].get(id); return x ? x.n : id; };

  // ---------- state ----------
  let rows = [], filt = 'semua', ctx = null, wl = 'kec', WIL = null;

  function drawTable() {
    const tb = $('b-tabel'); if (!ctx) return;
    const head = mk('thead'), hr = mk('tr');
    [['Penyulang', 'ss-l'], ['Status', 'ss-l'], ['Gardu induk', 'ss-l ss-hide-n'], ['UP3 · ULP', 'ss-l ss-hide-n'], ['Jam trip'], ['Jam nyala'], ['Lama padam'], ['Gardu'], ['Trafo'], ['Kecamatan lokasi trafo', 'ss-l ss-hide-n'], ['Bencana 2026', 'ss-hide-n'], ['Keterangan', 'ss-l ss-hide-n']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
    head.append(hr);
    const body = mk('tbody');
    const list = rows.filter((r) => (filt === 'semua' || r.st === filt) && (!q || r.nama.includes(q) || String(r.gi).toUpperCase().includes(q) || String(r.up3).toUpperCase().includes(q) || String(r.ulp).toUpperCase().includes(q) || r.kecN.toUpperCase().includes(q)));
    list.slice(0, 400).forEach((r) => {
      const tr = mk('tr');
      const n = mk('td', r.nama, 'ss-l'); if (r.rep && !r.feeds.length) n.append(mk('span', 'tidak ada di hirarki aset', 'ss-p-flag')); tr.append(n);
      const st = mk('td', null, 'ss-l'); const pl = mk('span', r.st === 'padam' ? 'Padam' : r.st === 'pulih' ? 'Nyala kembali' : 'Terpapar', 'gi-pill'); pl.style.setProperty('--gi-c', C[r.st]); st.append(pl); tr.append(st);
      tr.append(mk('td', r.gi || '—', 'ss-l ss-hide-n'), mk('td', [r.up3, r.ulp].filter(Boolean).join(' · ') || '—', 'ss-l ss-hide-n'),
        mk('td', r.rep ? tfmt(r.rep.padam) : '—'), mk('td', r.rep ? (r.rep.nyala ? tfmt(r.rep.nyala) : 'masih padam') : '—'),
        mk('td', r.rep ? jam(r.dur) : '—', r.st === 'padam' ? 'ss-hl b-bad' : 'ss-hl'),
        mk('td', r.feeds.length ? fmt(r.gardu) : '—'), mk('td', r.feeds.length ? fmt(r.trafo) : '—', r.st === 'padam' ? 'b-bad' : ''),
        mk('td', r.kecN || '—', 'ss-l ss-hide-n gi-cat'), mk('td', r.ben ? fmt(r.ben) + ' kali' : '—', 'ss-hide-n'), mk('td', (r.rep && r.rep.keterangan) || r.why || '', 'ss-l ss-hide-n gi-cat'));
      body.append(tr);
    });
    if (!list.length) { const tr = mk('tr'); const td = mk('td', ctx.center ? 'Tidak ada penyulang untuk pilihan ini.' : 'Pilih kejadian atau klik peta untuk menentukan titik bencana.', 'ss-note'); td.colSpan = 12; tr.append(td); body.append(tr); }
    tb.replaceChildren(head, body);
    $('b-tfilter').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v || 'semua') === filt)));
    $('b-tabel-note').textContent = `${fmt(list.length)} penyulang${list.length > 400 ? ' (400 pertama ditampilkan)' : ''}. Padam/nyala kembali dari laporan posko; gardu dan trafo = aset di hirarki penyulang itu (Hirarki Aset) yang ikut berstatus sama. "Terpapar" = penyulang dalam radius atau disuplai GI dalam radius, belum ada di laporan.`;
  }

  function drawWilayah() {
    const tb = $('b-wil'); if (!WIL) return;
    const head = mk('thead'), hr = mk('tr');
    [[LV[wl], 'ss-l'], [wl === 'kec' ? 'Kab/Kota' : wl === 'kab' ? 'Provinsi' : '', 'ss-l ss-hide-n'], ['Trafo di wilayah'], ['Trafo padam'], ['% padam'], ['Trafo nyala kembali'], ['Penyulang padam']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
    head.append(hr);
    const body = mk('tbody');
    const L = [...WIL[wl].entries()].filter(([, o]) => o.pad || o.pul).sort((a, b) => b[1].pad - a[1].pad || b[1].pul - a[1].pul);
    L.slice(0, 300).forEach(([id, o]) => {
      const tr = mk('tr'); const induk = wl === 'kec' ? wname('kab', id.slice(0, 4)) : wl === 'kab' ? wname('prov', id.slice(0, 2)) : '';
      tr.append(mk('td', wname(wl, id), 'ss-l'), mk('td', induk, 'ss-l ss-hide-n'), mk('td', fmt(o.tot)), mk('td', fmt(o.pad), o.pad ? 'ss-hl b-bad' : ''), mk('td', pct(o.pad, o.tot)), mk('td', fmt(o.pul), o.pul ? 'b-ok' : ''), mk('td', fmt(o.fp.size)));
      body.append(tr);
    });
    if (!L.length) { const tr = mk('tr'); const td = mk('td', 'Belum ada trafo padam atau nyala kembali dari laporan posko.', 'ss-note'); td.colSpan = 7; tr.append(td); body.append(tr); }
    tb.replaceChildren(head, body);
    $('b-wlv').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v || 'kec') === wl)));
  }

  function render() {
    if (dash.params().tab !== 'bencana') return;
    fillJenis();
    if (!kj.mulai.value) kj.mulai.value = nowWib();
    const base = ['gi_identitas', 'peny_profil', 'peny_bulanan', 'bencana', 'bencana_status'].map((id) => SSD.data(id));
    if (base.some((d) => d.status === 'error')) { $('b-take').textContent = 'Failed to load'; return; }
    if (base.some((d) => d.status !== 'ok')) return;
    if (!need()) { $('b-take').textContent = 'Memuat data hirarki aset dan peta wilayah…'; return; }
    const L = LAZY.map((id) => SSD.data(id)); if (L.some((d) => d.status !== 'ok')) return;
    const [G, Pp, B, K, S] = base;
    const ck = [G.data, Pp.data, B.data, ...L.map((d) => d.data)];
    if (!cacheKey || ck.some((v, i) => v !== cacheKey[i])) { cacheKey = ck; A = build(G.data, Pp.data, L[0].data, B.data, L[1].data, L[2].data, L[3].data, L[4].data); }
    if (!LOC.length && A) {
      LOC = [...A.W.kab.values()].filter((k) => k.c).map((k) => ({ label: k.n, c: k.c }))
        .concat([...A.W.kec.values()].filter((k) => k.c).map((k) => ({ label: `Kec. ${k.n}, ${wname('kab', k.id.slice(0, 4)).replace(/^Kabupaten /, 'Kab. ')}`, c: k.c })));
      $('b-loc-list').replaceChildren(...LOC.map((x) => new Option(x.label)));
    }
    if (quakes === null && !quakeAt) loadQuakes();
    const prm = dash.params();
    filt = ['padam', 'pulih', 'ter'].includes(prm.b_f) ? prm.b_f : 'semua';
    wl = LV[prm.b_lv] ? prm.b_lv : 'kec';
    const wx = prm.b_ly === 'cuaca';
    const layer = ['status', 'aset'].includes(prm.b_ly) ? prm.b_ly : 'panas';
    $('b-layer').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v || 'panas') === (wx ? 'cuaca' : layer))));
    const KJ = K.data || [];
    const kej = KJ.find((k) => k.nama === prm.b_kej) || KJ.find((k) => k.status !== 'Selesai') || KJ[0] || null;
    const custom = prm.b_lat != null && prm.b_lon != null && isFinite(Number(prm.b_lat)) && isFinite(Number(prm.b_lon));
    const center = custom ? { lat: Number(prm.b_lat), lon: Number(prm.b_lon) } : kej ? { lat: Number(kej.lat), lon: Number(kej.lon) } : null;
    const rad = Number(prm.b_rad) > 0 ? Number(prm.b_rad) : kej && !custom ? Number(kej.radius_km) || P().RADIUS[kej.jenis] || 10 : Number(kj.rad.value) || 10;

    // kontrol
    $('b-f-kej').replaceChildren(...(KJ.length ? KJ.map((k) => new Option(`${k.jenis} · ${k.nama}${k.status === 'Selesai' ? ' (selesai)' : ''}`, k.nama)) : [new Option('Belum ada kejadian', '')])); $('b-f-kej').value = kej ? kej.nama : ''; $('b-f-kej').disabled = !KJ.length;
    const radOpts = [3, 5, 10, 15, 20, 25, 50, 75, 100, 150]; if (!radOpts.includes(rad)) radOpts.push(rad); radOpts.sort((a, b) => a - b);
    $('b-f-rad').replaceChildren(...radOpts.map((r) => new Option(`Radius ${r} km`, String(r)))); $('b-f-rad').value = String(rad);
    const view = prm.b_view === 'sumkal' || !center ? 'sumkal' : 'area';
    $('b-f-view').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v || 'area') === view)));
    $('b-reset').hidden = !custom && !prm.b_rad;
    $('b-center').textContent = center ? `Titik ${custom ? 'pilihan peta' : 'kejadian'}: ${center.lat.toFixed(4)}, ${center.lon.toFixed(4)} · radius ${rad} km.` : 'Klik peta untuk menentukan titik bencana.';

    // aset terpapar dalam radius
    const giIn = center ? A.GI.filter((g) => xy(g) && hv(center.lat, center.lon, +g.lat, +g.lon) <= rad) : [];
    const expo = new Map();
    const keyF = (o) => 'F|' + o.f.kode;
    if (center) {
      A.PP.forEach((p) => { if (!xy(p)) return; const d = hv(center.lat, center.lon, +p.lat, +p.lon); if (d > rad) return; const o = A.feedByProf.get(p); expo.set(o ? keyF(o) : 'P|' + p.uid + '|' + N(p.penyulang), { prof: p, feed: o || null, why: `${f1.format(d)} km dari titik` }); });
      giIn.forEach((g) => (A.feedByGi.get(g.aset) || []).forEach((o) => { if (!expo.has(keyF(o))) expo.set(keyF(o), { prof: o.p, feed: o, why: `disuplai ${g.nama} (dalam radius)` }); }));
    }
    const kecIn = center ? [...A.W.kec.values()].filter((k) => k.c && hv(center.lat, center.lon, k.c[1], k.c[0]) <= rad) : [];

    // laporan posko → penyulang → gardu & trafo → wilayah
    const rep = kej ? (S.data || []).filter((r) => r.kejadian === kej.nama) : [];
    const now = Date.now();
    rows = []; const used = new Set();
    WIL = { kec: new Map(), kab: new Map(), prov: new Map() };
    const addW = (lv, id, tot, pad, pul, fk) => { const o = WIL[lv].get(id) || { tot: 0, pad: 0, pul: 0, fp: new Set() }; o.pad += pad; o.pul += pul; if (pad && fk) o.fp.add(fk); WIL[lv].set(id, o); };
    const mkRow = (feeds, extra) => {
      let gardu = 0, trafo = 0; const kc = new Map();
      feeds.forEach((o) => { gardu += Number(o.f.gardu) || 0; (A.twByF.get(o.f.kode) || []).forEach((x) => { trafo += x.t; if (x.k) kc.set(x.k, (kc.get(x.k) || 0) + x.t); }); });
      const kecN = [...kc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => wname('kec', k)).join(', ') + (kc.size > 3 ? ` +${kc.size - 3}` : '');
      return { feeds, gardu, trafo, kc, kecN, ...extra };
    };
    rep.forEach((r) => {
      const prof = profOf(r); const feeds = feedersOf(r, prof); feeds.forEach((o) => used.add(keyF(o))); if (!feeds.length && prof) used.add('P|' + prof.uid + '|' + N(prof.penyulang));
      const st = (r.status || (r.nyala ? 'Nyala' : 'Padam')) === 'Nyala' ? 'pulih' : 'padam';
      const dur = Math.max(0, ((st === 'pulih' && r.nyala ? tms(r.nyala) : now) - tms(r.padam)) / 36e5);
      const f0 = feeds[0];
      rows.push(mkRow(feeds, { nama: r.penyulang, st, rep: r, prof: prof || (f0 && f0.p), gi: r.gi || (f0 && f0.g ? f0.g.nama : ''), up3: r.up3 || (prof ? prof.up3 : f0 && f0.g ? f0.g.up3 : ''), ulp: r.ulp || (prof ? prof.ulp : ''), uid: r.uid || (prof ? prof.uid : ''), dur, ben: prof ? A.ben.get(prof.up3 + '\u0001' + prof.penyulang) || 0 : 0 }));
    });
    expo.forEach((e, k) => {
      if (used.has(k)) { rows.filter((x) => x.feeds.some((o) => keyF(o) === k)).forEach((x) => { x.inRad = true; }); return; }
      const p = e.prof, o = e.feed;
      rows.push(mkRow(o ? [o] : [], { nama: p ? p.penyulang : clean(o.f.nama), st: 'ter', rep: null, prof: p, gi: o && o.g ? o.g.nama : '', up3: p ? p.up3 : o && o.g ? o.g.up3 : '', ulp: p ? p.ulp : '', uid: p ? p.uid : o && o.g ? o.g.uid : '', dur: 0, why: e.why, ben: p ? A.ben.get(p.up3 + '\u0001' + p.penyulang) || 0 : 0, inRad: true }));
    });
    // wilayah: trafo padam/nyala kembali per kecamatan → kab/kota → provinsi; penyebut = semua trafo di wilayah itu
    rows.forEach((r, i) => { if (r.st === 'ter') return; r.kc.forEach((t, k) => { const pad = r.st === 'padam' ? t : 0, pul = r.st === 'pulih' ? t : 0; addW('kec', k, 0, pad, pul, i); addW('kab', k.slice(0, 4), 0, pad, pul, i); addW('prov', k.slice(0, 2), 0, pad, pul, i); }); });
    A.kecTot.forEach((t, k) => { [['kec', k], ['kab', k.slice(0, 4)], ['prov', k.slice(0, 2)]].forEach(([lv, id]) => { const o = WIL[lv].get(id); if (o) o.tot += t; }); });
    const ord = { padam: 0, pulih: 1, ter: 2 };
    rows.sort((a, b) => ord[a.st] - ord[b.st] || b.dur - a.dur || b.trafo - a.trafo || a.nama.localeCompare(b.nama));
    ctx = { center, rad, kej };
    const nPad = rows.filter((r) => r.st === 'padam'), nPul = rows.filter((r) => r.st === 'pulih'), nRep = nPad.length + nPul.length;
    const sum = (a, f) => a.reduce((s, r) => s + f(r), 0);
    const trPad = sum(nPad, (r) => r.trafo), gdPad = sum(nPad, (r) => r.gardu), trPul = sum(nPul, (r) => r.trafo);
    const kecPad = [...WIL.kec.values()].filter((o) => o.pad).length, kabPad = [...WIL.kab.values()].filter((o) => o.pad).length, provPad = [...WIL.prov.values()].filter((o) => o.pad).length;
    const expoRows = rows.filter((r) => r.inRad);

    // ringkasan
    {
      const tk = $('b-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const Bb = (s, cls) => mk('b', s, cls);
      if (kej) {
        const sejak = (now - tms(kej.mulai)) / 36e5;
        tk.append(new RegExp(kej.jenis, 'i').test(kej.nama) ? kej.nama : `${kej.jenis} · ${kej.nama}`, kej.mulai ? `, mulai ${tfmt(kej.mulai)} WIB` : '', kej.status === 'Selesai' ? ' (selesai). ' : sejak > 0 ? ` (${sejak >= 48 ? f1.format(sejak / 24) + ' hari' : f1.format(sejak) + ' jam'} berjalan). ` : '. ');
        if (nRep) {
          tk.append(Bb(`${fmt(nPad.length)} penyulang padam`, nPad.length ? 'b-bad' : ''), ` (${fmt(gdPad)} gardu, `, Bb(`${fmt(trPad)} trafo`, trPad ? 'b-bad' : ''), ')');
          if (kecPad) tk.append(' di ', Bb(`${fmt(kecPad)} kecamatan`), `, ${fmt(kabPad)} kab/kota`);
          tk.append('; ', Bb(`${fmt(nPul.length)} penyulang nyala kembali`, 'b-ok'), ` (${fmt(trPul)} trafo).`);
          if (nPad.length) tk.append(` Terlama ${nPad[0].nama} (${jam(nPad[0].dur)}).`);
          tk.append(' ');
        } else tk.append('Belum ada status penyulang di laporan posko. ');
      } else tk.append('Belum ada kejadian. Unggah laporan posko di atas, atau klik peta lalu isi titik dan tipe bencana di bawah peta. ');
      if (center) tk.append(`Dalam radius ${rad} km: ${fmt(giIn.length)} GI, ${fmt(expoRows.length)} penyulang dan ${fmt(kecIn.length)} kecamatan terpapar.`);
    }

    {
      const uids = [...new Set(rep.map((r) => r.uid).filter(Boolean))];
      $('b-src-info').textContent = kej ? (rep.length ? `Sumber data: laporan posko ${fmt(rep.length)} penyulang (${uids.join(', ') || 'UID tidak diisi'}). Unggah ulang daftar terbaru setiap ada perubahan.` : 'Sumber data: laporan posko, belum ada untuk kejadian ini. Unggah file Excel (satu sheet per UID).') : 'Sumber data: laporan posko (Excel, satu sheet per UID).';
    }
    // panel kiri dan kartu kaca
    const done = (id, t) => { const e = $(id); e.textContent = t; e.classList.remove('dash-skeleton'); };
    $('b-title').textContent = kej ? kej.nama : 'Sumatera & Kalimantan';
    $('b-eyebrow').textContent = kej ? `${kej.jenis} · mulai ${tfmt(kej.mulai)} WIB · ${kej.status}` : 'Disaster Dashboard · pilih titik bencana di peta';
    $('b-area').textContent = center ? `${fmt(Math.PI * rad * rad)} km² · ${rad} km` : 'Belum ada titik';
    done('b-r1', center ? fmt(giIn.length) : '—'); done('b-r2', center ? fmt(expoRows.length) : '—'); done('b-r3', center ? fmt(kecIn.length) : '—');
    done('b-t1', fmt(nPad.length)); $('b-t1-sub').textContent = nRep ? `dari ${fmt(nRep)} penyulang trip` : 'belum ada laporan posko';
    done('b-t2', fmt(trPad)); $('b-t2-sub').textContent = nRep ? `${fmt(gdPad)} gardu padam` : '—';
    done('b-t3', fmt(kecPad)); $('b-t3-sub').textContent = kecPad ? `${fmt(kabPad)} kab/kota · ${fmt(provPad)} provinsi` : 'belum ada trafo padam';
    done('b-t4', fmt(nPul.length)); $('b-t4-sub').textContent = nRep ? `penyulang · ${fmt(trPul)} trafo` : '—';
    {
      const affTot = [...WIL.kec.values()].filter((o) => o.pad).reduce((a2, o) => a2 + o.tot, 0);
      const sh = affTot ? trPad / affTot : 0;
      const d1 = $('b-g1-d'); d1.textContent = affTot ? `${pct(trPad, affTot)} trafo wilayah` : 'belum ada'; d1.className = 'b-delta ' + (trPad ? 'warn' : 'flat');
      $('b-g1').textContent = fmt(trPad);
      const cells = 36, on = Math.round(sh * cells); $('b-g1-w').replaceChildren(...Array.from({ length: cells }, (_, i) => mk('i', null, i < on ? 'on' : '')));
      const rp = nRep ? nPul.length / nRep : 0;
      const d2 = $('b-g2-d'); d2.textContent = nRep ? `${fmt(nPul.length)} dari ${fmt(nRep)} trip` : 'belum ada'; d2.className = 'b-delta ' + (nPul.length ? 'up' : 'flat');
      $('b-g2').textContent = nRep ? Math.round(rp * 100) + '%' : '—';
      const ga = $('b-g2-a'); ga.replaceChildren();
      { const W = 200, H = 74, r = 84, cx = W / 2, cy = H + 22; const sv = d3.select(ga).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMidYMax meet');
        const gid = 'b-gg'; const lg = sv.append('defs').append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 1);
        [['0%', '#ff4d3d'], ['55%', '#f7cf3c'], ['100%', '#7ee08f']].forEach(([o2, c2]) => lg.append('stop').attr('offset', o2).attr('stop-color', c2));
        const arc = d3.arc().innerRadius(r - 11).outerRadius(r).startAngle(-Math.PI / 2 * 0.92).cornerRadius(4);
        sv.append('path').attr('transform', `translate(${cx},${cy})`).attr('d', arc.endAngle(Math.PI / 2 * 0.92)()).attr('fill', 'rgba(255,255,255,.16)');
        if (rp > 0) sv.append('path').attr('transform', `translate(${cx},${cy})`).attr('d', arc.endAngle(-Math.PI / 2 * 0.92 + Math.PI * 0.92 * rp)()).attr('fill', `url(#${gid})`); }
      const top = nPad.slice(0, 3);
      const d3e = $('b-g3-d'); d3e.textContent = top.length ? top[0].nama : 'tidak ada'; d3e.className = 'b-delta flat';
      $('b-g3').textContent = top.length ? jam(top[0].dur) : '—';
      const mx = top.length ? top[0].dur : 1;
      $('b-g3-b').replaceChildren(...top.slice().reverse().map((r) => { const d = mk('div'); const e = mk('em'); e.style.height = Math.max(4, 22 * r.dur / mx) + 'px'; d.append(mk('span', r.nama), mk('i'), e); return d; }));
      const d4 = $('b-g4-d'); d4.textContent = kej ? kej.jenis : center ? 'titik pilihan' : 'belum ada titik'; d4.className = 'b-delta flat';
      $('b-g4').textContent = center ? `${rad} km` : '—';
      const rr = $('b-g4-r'); rr.replaceChildren();
      { const W = 200, H = 74; const sv = d3.select(rr).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'xMaxYMax meet');
        const cx = W - 40, cy = H - 4; [16, 32, 48, 64].forEach((r, i) => sv.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r).attr('fill', 'none').attr('stroke', 'rgba(255,255,255,' + (0.42 - i * 0.08) + ')').attr('stroke-dasharray', i === 3 ? '3 4' : null));
        const kinPad = kecIn.filter((k) => (WIL.kec.get(k.id) || {}).pad).length; const share = center && kecIn.length ? kinPad / kecIn.length : 0;
        sv.append('path').attr('transform', `translate(${cx},${cy})`).attr('d', d3.arc().innerRadius(0).outerRadius(64).startAngle(-Math.PI / 2).endAngle(-Math.PI / 2 + Math.PI / 2 * Math.max(0.12, share))()).attr('fill', 'rgba(255,122,107,.55)');
        sv.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 3.5).attr('fill', '#fff');
        sv.append('text').attr('x', W).attr('y', 10).attr('text-anchor', 'end').attr('fill', 'rgba(255,255,255,.7)').style('font-size', '11px').text(center ? `${fmt(kinPad)}/${fmt(kecIn.length)} kec. radius padam` : ''); }
    }

    // peta
    if (window.SSMAP) {
      const km2deg = (km, lat) => [km / 111.32 / Math.cos(lat * Math.PI / 180), km / 110.57];
      let fit = null, bb = null;
      if (center && view === 'area') { const [dx, dy] = km2deg(Math.max(rad * 1.6, 20), center.lat); fit = [[center.lon - dx, center.lat - dy], [center.lon + dx, center.lat + dy]]; bb = [center.lon - dx * 1.3, center.lat - dy * 1.3, center.lon + dx * 1.3, center.lat + dy * 1.3]; }
      const inBB = (k) => !bb || (k.c && k.c[0] > bb[0] - 0.3 && k.c[0] < bb[2] + 0.3 && k.c[1] > bb[1] - 0.3 && k.c[1] < bb[3] + 0.3);
      const areas = [];
      const kinSet = new Set(kecIn.map((k) => k.id));
      const HEAT = d3.interpolateRgbBasis(['#4fb3dd', '#8fd3c7', '#f2dc5d', '#f6a03a', '#ea4b2a', '#b81d18']);
      A.W.kec.forEach((k, id) => {
        const o = WIL.kec.get(id); const hit = o && (o.pad || o.pul);
        if (!hit && !(view === 'area' && inBB(k))) return; if (!inBB(k)) return;
        const share = o && o.tot ? o.pad / o.tot : 0;
        let fill, op;
        if (layer === 'panas') {
          const h = o && o.pad ? 0.55 + 0.45 * Math.min(1, share * 1.6) : o && o.pul ? 0.2 : kinSet.has(id) ? 0.42 : 0;
          fill = HEAT(h); op = 0.92;
        } else if (layer === 'status') {
          fill = o && o.pad ? C.padam : o && o.pul ? C.pulih : kinSet.has(id) ? 'var(--color-warn)' : 'var(--color-panel)';
          op = o && o.pad ? 0.25 + 0.6 * Math.min(1, share * 2) : o && o.pul ? 0.35 : kinSet.has(id) ? 0.12 : 0.05;
        } else { fill = kinSet.has(id) ? '#ffffff' : 'var(--color-panel)'; op = kinSet.has(id) ? 0.35 : 0.12; }
        areas.push({ g: k.g, fill, op, stroke: layer === 'panas' ? 'rgba(255,255,255,.55)' : 'color-mix(in srgb, var(--color-fg) 25%, transparent)', width: view === 'area' ? (layer === 'panas' ? 0.9 : 0.6) : 0.3,
          tip: [`Kec. ${k.n}`, [[null, 'Kab/Kota', wname('kab', id.slice(0, 4))], [null, 'Trafo di kecamatan', fmt(A.kecTot.get(id) || 0)], [null, 'Trafo padam', o ? `${fmt(o.pad)} (${pct(o.pad, o.tot)})` : '0'], [null, 'Nyala kembali', o ? fmt(o.pul) : '0'], [null, 'Dalam radius', kinSet.has(id) ? 'ya' : 'tidak']]] });
      });
      const pts = [];
      giIn.forEach((g) => pts.push({ lon: g.lon, lat: g.lat, r: 6, color: C.gi, label: g.nama, tip: [g.nama, [[null, 'UP3', g.up3 || '—'], [null, 'Jarak', f1.format(hv(center.lat, center.lon, +g.lat, +g.lon)) + ' km'], [null, 'Feeder', fmt((A.feedByGi.get(g.aset) || []).length)]]] }));
      rows.forEach((r) => { if (!xy(r.prof) || (layer === 'panas' && r.st === 'ter')) return; pts.push({ lon: r.prof.lon, lat: r.prof.lat, r: r.st === 'ter' ? 3 : 4.6, color: C[r.st], label: r.st === 'padam' && r === nPad[0] ? r.nama : '',
        tip: ['Penyulang ' + r.nama, [[null, 'Status', r.st === 'padam' ? 'Padam' : r.st === 'pulih' ? 'Nyala kembali' : 'Terpapar'], [null, 'Lama padam', r.rep ? jam(r.dur) : '—'], [null, 'Gardu · trafo', r.feeds.length ? `${fmt(r.gardu)} · ${fmt(r.trafo)}` : '—']]] }); });
      (quakes || []).forEach((g) => { if (!(g.lon > 92 && g.lon < 122 && g.lat > -11 && g.lat < 9)) return; pts.push({ lon: g.lon, lat: g.lat, r: Math.max(4, g.m * 1.6), color: C.gempa, label: view === 'sumkal' ? `M${f1.format(g.m)}` : '', tip: [`Gempa M${f1.format(g.m)}`, [[null, 'Waktu', g.tgl], [null, 'Kedalaman', g.dalam], [null, 'Wilayah', g.wil]]], onClick: () => useQuake(g) }); });
      if (center) pts.push({ lon: center.lon, lat: center.lat, r: 6, color: 'var(--color-bad)', pulse: true, label: kej && !custom ? kej.jenis : 'Titik bencana' });
      const head = document.querySelector('.ss-head'); $('b-ringkasan').style.setProperty('--b-off', ((head ? head.offsetHeight : 112) + 30) + 'px');
      const mb = $('b-map'), mw = mb.clientWidth || 800, wide = window.innerWidth > 760;
      const mh = wide && mb.clientHeight > 200 ? mb.clientHeight : Math.round(Math.max(360, Math.min(660, mw * 0.85)));
      const gr = mb.parentElement.querySelector('.b-glass-row'); const padB = wide && gr ? gr.offsetHeight + 8 : 0;
      window.SSMAP(mb, { label: 'Peta area bencana', fit, height: mh, padBottom: padB, fill: () => (layer === 'panas' ? '#7cc4e2' : 'color-mix(in srgb, var(--ss-acc) 10%, var(--color-panel))'), areas, circle: center ? { lon: center.lon, lat: center.lat, km: rad } : null,
        onMap: (lon, lat) => { if (!(lon > 92 && lon < 122 && lat > -11 && lat < 9)) return; kj.lat.value = lat.toFixed(4); kj.lon.value = lon.toFixed(4); set({ b_lat: lat.toFixed(4), b_lon: lon.toFixed(4), b_rad: String(Number(kj.rad.value) || rad) }); }, points: pts });
      const lgd = $('b-map-legend'); lgd.replaceChildren();
      const dot = (c, l) => { const sp = mk('span'); const i = mk('i'); i.style.background = c; sp.append(i, l); return sp; };
      if (layer === 'panas') {
        const sc = mk('div', null, 'b-scale'); sc.style.background = `linear-gradient(90deg, ${[0, .2, .42, .6, .8, 1].map((t) => HEAT(t)).join(',')})`;
        const lab = mk('div', null, 'b-scale-lab'); lab.append(mk('span', 'normal · nyala'), mk('span', 'radius'), mk('span', 'trafo padam ↑'));
        lgd.append(mk('b', 'Kondisi kecamatan'), sc, lab, dot(C.gi, 'GI dalam radius'));
      } else if (layer === 'status') lgd.append(dot(C.padam, 'Trafo padam'), dot(C.pulih, 'Trafo nyala kembali'), dot('var(--color-warn)', 'Dalam radius'), dot(C.gi, 'GI dalam radius'), dot(C.gempa, 'Gempa BMKG'));
      else lgd.append(dot(C.padam, 'Penyulang padam'), dot(C.pulih, 'Penyulang nyala kembali'), dot(C.ter, 'Penyulang terpapar'), dot(C.gi, 'GI dalam radius'));
      // peta mini: posisi titik di Sumkal
      window.SSMAP($('b-mini'), { label: 'Posisi titik bencana di Sumatera dan Kalimantan', height: 190, fill: () => 'rgba(150, 200, 120, .42)', circle: center ? { lon: center.lon, lat: center.lat, km: Math.max(rad, 60), color: '#ff7a3d' } : null,
        points: center ? [{ lon: center.lon, lat: center.lat, r: 4, color: '#ff4d3d', pulse: true }] : [], onRegion: () => set({ b_view: 'sumkal' }) });
      $('b-map-note').textContent = `Klik peta untuk memilih titik bencana; klik titik gempa untuk memakainya. Lokasi trafo per kecamatan: ${A.srcAll ? pct(A.srcXY, A.srcAll) : '0%'} dari koordinat trafo/gardu, sisanya dari alamat gardu atau lokasi penyulang/GI (akan memakai koordinat setelah Database Aset Jaringan diunggah ulang).`;
    }

    // cuaca Windy.com (embed resmi, tanpa kunci API) di titik bencana
    {
      const box = $('b-wx'); box.hidden = !wx;
      $('b-map').style.visibility = wx ? 'hidden' : ''; $('b-map-legend').hidden = wx; box.parentElement.classList.toggle('b-wxon', wx);
      if (wx) {
        const jenis = kej ? kej.jenis : kj.jenis.value;
        const def = WXDEF[jenis] || 'rain';
        const ov = WXOV.some(([k]) => k === prm.b_wx) ? prm.b_wx : def;
        $('b-wx-ov').replaceChildren(...WXOV.map(([k, l]) => { const b = mk('button', l); b.type = 'button'; b.dataset.v = k; b.setAttribute('aria-pressed', String(k === ov)); return b; }));
        const c = center || { lat: -2.5, lon: 108 };
        const zoom = !center ? 5 : rad <= 8 ? 10 : rad <= 20 ? 9 : rad <= 45 ? 8 : rad <= 90 ? 7 : 6;
        const q2 = new URLSearchParams({ lat: c.lat.toFixed(3), lon: c.lon.toFixed(3), detailLat: c.lat.toFixed(3), detailLon: c.lon.toFixed(3), zoom, level: 'surface', overlay: ov, product: 'ecmwf', menu: '', message: 'true', marker: center ? 'true' : '', calendar: 'now', pressure: '', type: 'map', location: 'coordinates', detail: center ? 'true' : '', metricWind: 'km/h', metricTemp: '°C', radarRange: '-1' });
        const src = 'https://embed.windy.com/embed2.html?' + q2.toString();
        const fr = $('b-wx-frame'); if (fr.dataset.src !== src) { fr.dataset.src = src; fr.src = src; }
      }
    }

    // pemulihan per UP3
    {
      const M = new Map();
      rows.forEach((r) => { const k = r.up3 || '(tanpa UP3)'; const o = M.get(k) || { ter: 0, pad: 0, pul: 0, tr: 0, max: 0 }; if (r.inRad) o.ter++; if (r.st === 'padam') { o.pad++; o.tr += r.trafo; o.max = Math.max(o.max, r.dur); } if (r.st === 'pulih') o.pul++; M.set(k, o); });
      const tb = $('b-up3'); const head = mk('thead'), hr = mk('tr');
      [['UP3', 'ss-l'], ['Terpapar'], ['Trip'], ['Masih padam'], ['Nyala kembali'], ['% nyala'], ['Trafo padam'], ['Padam terlama']].forEach(([h, c]) => hr.append(mk('th', h, c || ''))); head.append(hr);
      const body = mk('tbody');
      [...M.entries()].sort((a, b) => b[1].pad - a[1].pad || b[1].ter - a[1].ter).forEach(([u, o]) => {
        const tr = mk('tr'); const rp = o.pad + o.pul;
        tr.append(mk('td', u, 'ss-l'), mk('td', fmt(o.ter)), mk('td', fmt(rp)), mk('td', fmt(o.pad), o.pad ? 'ss-hl b-bad' : ''), mk('td', fmt(o.pul)), mk('td', pct(o.pul, rp)), mk('td', o.tr ? fmt(o.tr) : '—'), mk('td', o.pad ? jam(o.max) : '—'));
        body.append(tr);
      });
      if (!M.size) { const tr = mk('tr'); const td = mk('td', 'Belum ada data.', 'ss-note'); td.colSpan = 8; tr.append(td); body.append(tr); }
      tb.replaceChildren(head, body);
    }

    // timeline
    {
      const ch = $('b-chart'); ch.classList.remove('dash-skeleton'); ch.replaceChildren();
      const ev = []; rep.forEach((r) => { ev.push([tms(r.padam), 1, 0]); if ((r.status || (r.nyala ? 'Nyala' : 'Padam')) === 'Nyala' && r.nyala) ev.push([tms(r.nyala), 0, 1]); });
      if (!ev.length) ch.append(mk('div', 'Grafik muncul setelah laporan posko berisi jam trip penyulang.', 'ss-note'));
      else {
        ev.sort((a, b) => a[0] - b[0]);
        const t0 = Math.min(ev[0][0], kej && kej.mulai ? tms(kej.mulai) : Infinity), t1 = Math.max(ev[ev.length - 1][0], kej && kej.status === 'Selesai' ? ev[ev.length - 1][0] : now);
        let p = 0, u = 0; const ser = [[t0, 0, 0]]; ev.forEach(([t, a, b]) => { p += a; u += b; ser.push([t, p, u]); }); ser.push([t1, p, u]);
        const W = Math.max(280, ch.clientWidth), H = 240, mg = { t: 14, r: 12, b: 26, l: 34 };
        const svg = d3.select(ch).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Jumlah penyulang trip dan nyala kembali menurut waktu');
        const x = d3.scaleTime([new Date(t0), new Date(t1)], [mg.l, W - mg.r]), y = d3.scaleLinear([0, Math.max(1, p)], [H - mg.b, mg.t]).nice();
        const yt = y.ticks(4).filter(Number.isInteger);
        svg.append('g').selectAll('line').data(yt).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
        svg.append('g').selectAll('text').data(yt).join('text').attr('x', mg.l - 6).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
        const fx = (d) => { const z = new Date(d.getTime() + 7 * 36e5); return `${z.getUTCDate()} ${BLN[z.getUTCMonth()]} ${String(z.getUTCHours()).padStart(2, '0')}:00`; };
        svg.append('g').selectAll('text').data(x.ticks(Math.max(2, Math.floor(W / 140)))).join('text').attr('x', x).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fx);
        svg.append('path').attr('d', d3.area().curve(d3.curveStepAfter).x((d) => x(new Date(d[0]))).y0((d) => y(d[2])).y1((d) => y(d[1]))(ser)).attr('fill', C.padam).attr('fill-opacity', 0.14);
        [[1, C.padam], [2, C.pulih]].forEach(([i, c]) => svg.append('path').attr('d', d3.line().curve(d3.curveStepAfter).x((d) => x(new Date(d[0]))).y((d) => y(d[i]))(ser)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2.2));
        svg.append('text').attr('x', W - mg.r).attr('y', y(p) - 6).attr('text-anchor', 'end').attr('fill', C.padam).style('font-size', 'var(--cds-font-size-caption)').text(`${fmt(p)} trip`);
        svg.append('text').attr('x', W - mg.r).attr('y', Math.min(H - mg.b - 4, y(u) + 14)).attr('text-anchor', 'end').attr('fill', C.pulih).style('font-size', 'var(--cds-font-size-caption)').text(`${fmt(u)} nyala kembali`);
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
          const b = mk('button', 'Jadikan titik', 'ss-chip'); b.type = 'button'; b.addEventListener('click', () => useQuake(g));
          const bt = mk('td'); bt.append(b);
          tr.append(mk('td', g.tgl, 'ss-l'), mk('td', isFinite(g.m) ? f1.format(g.m) : '—', 'ss-hl'), mk('td', g.dalam, 'ss-hide-n'), mk('td', g.wil + (g.pot ? ` · ${g.pot}` : ''), 'ss-l'), mk('td', near ? `${near[0].nama} · ${fmt(near[1])} km` : '—', 'ss-l ss-hide-n'), bt);
          bd.append(tr);
        });
        tb.append(hd, bd); const w = mk('div', null, 'ss-tablewrap'); w.append(tb); box.append(w);
      }
      $('b-q-note').textContent = `Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika).${quakeAt ? ' Dibaca ' + new Date(quakeAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '.' : ''} "Jadikan titik" mengisi form kejadian dengan episentrum, tipe Gempa bumi dan radius 50 km (75 km untuk M6+).`;
    }
    drawTable(); drawWilayah();
  }
  SSD.onData(render);
  let rz = 0, lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (Math.abs(window.innerWidth - lastW) < 8 && Math.abs(window.innerHeight - lastH) < 40) return; lastW = window.innerWidth; lastH = window.innerHeight; render(); }, 200); });

  // ---------------- unggah laporan posko ----------------
  let msgT = 0;
  const msg = (t, cls) => { const m = $('b-up-msg'); m.textContent = t || ''; m.className = 'ss-up-msg b-upmsg' + (cls ? ' ' + cls : ''); clearTimeout(msgT); if (t && !/…$/.test(t) && cls !== 'bad') msgT = setTimeout(() => { m.textContent = ''; }, 15000); };
  $('b-up-msg').addEventListener('click', () => { $('b-up-msg').textContent = ''; });
  let pending = null;
  function review() {
    $('b-up-review').hidden = !pending; $('b-up-go').disabled = !pending; if (!pending) return;
    const o = pending.out; const cur = SSD.data('bencana').data || [], curS = SSD.data('bencana_status').data || [];
    const isP = (r) => (r.status || (r.nyala ? 'Nyala' : 'Padam')) === 'Padam';
    $('b-up-body').replaceChildren(...o.kejadian.map((k) => {
      const st = o.status.filter((r) => r.kejadian === k.nama); const old = cur.find((c) => N(c.nama) === N(k.nama)); const sc = new Set(o.scope); const oldS = curS.filter((r) => N(r.kejadian) === N(k.nama) && ([...sc].some((x) => x.split('|')[0] === String(k.nama).toUpperCase().replace(/[^A-Z0-9]/g, '') && (x.endsWith('|*') || x.endsWith('|' + r.uid)))));
      const tr = mk('tr'); [k.nama + (old ? '' : ' (baru)'), k.jenis, `${k.lat}, ${k.lon} · ${k.radius_km} km`, tfmt(k.mulai), k.status, o.hasStatus ? `${fmt(st.length)} (${fmt(st.filter(isP).length)} padam)` : 'tidak diubah', old ? `${fmt(oldS.length)} (${fmt(oldS.filter(isP).length)} padam)` : '—'].forEach((v, i) => tr.append(mk('td', v, i >= 5 ? 'num' : ''))); return tr;
    }));
    const perU = o.uids.map((u) => `${u} ${fmt(o.status.filter((r) => r.uid === u).length)}`).join(', ');
    $('b-up-sum').textContent = `${pending.name}: ${fmt(o.kejadian.length)} kejadian, ${fmt(o.status.length)} penyulang${perU ? ` (${perU})` : ''}.` + (o.warn.length ? ' Catatan: ' + o.warn.slice(0, 6).join('; ') + (o.warn.length > 6 ? ` (+${o.warn.length - 6} lagi)` : '') + '.' : '') + (o.hasStatus ? ` Status penyulang ${o.scope.some((x) => x.endsWith('|*')) ? 'semua UID' : 'UID ' + o.uids.join(', ')} di kejadian ini diganti oleh isi file; UID lain tidak berubah.` : '');
  }
  async function handle(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { msg('Pilih file .xlsx (template laporan posko bencana).', 'bad'); return; }
    if (!window.APKT || !window.APKT.readSheets) { msg('Pembaca Excel belum termuat. Muat ulang halaman lalu coba lagi.', 'bad'); return; }
    pending = null; review(); msg('Membaca file…');
    try {
      const sh = await window.APKT.readSheets(file, () => {});
      // file tanpa sheet Kejadian (atau sheet Kejadian kosong): pakai kejadian terpilih di dashboard
      const isK = (x) => /^kejadian$/i.test(String(x.name).trim());
      const kOk = sh.some((x) => isK(x) && x.rows.slice(1).some((r) => r && r.some((c) => String(c == null ? '' : c).trim())));
      if (!kOk) {
        for (let i = sh.length - 1; i >= 0; i--) if (isK(sh[i])) sh.splice(i, 1);
        const k = (SSD.data('bencana').data || []).find((x) => x.nama === dash.params().b_kej) || (SSD.data('bencana').data || [])[0];
        if (!k) throw new Error('file tidak punya sheet Kejadian dan belum ada kejadian di dashboard. Buat kejadian dulu.');
        sh.push({ name: 'Kejadian', rows: [['Nama kejadian', 'Jenis bencana', 'Latitude', 'Longitude', 'Radius (km)', 'Waktu mulai', 'Status', 'Keterangan'], [k.nama, k.jenis, k.lat, k.lon, k.radius_km, k.mulai.replace('T', ' '), k.status, k.keterangan || '']] });
      }
      pending = { name: file.name, out: P().build(sh) }; msg('');
    } catch (e) { msg('File tidak bisa dibaca: ' + ((e && e.message) || e), 'bad'); }
    review();
  }
  async function apply() {
    if (!pending) return;
    const { name, out } = pending; $('b-up-go').disabled = true;
    const m = P().merge(SSD.data('bencana').data || [], SSD.data('bencana_status').data || [], out);
    window.__D.bencana = m.kejadian; window.__D.bencana_status = m.status;
    if (SSD.set) SSD.set({ bencana: m.kejadian, bencana_status: m.status });
    const ok = await save([{ path: 'bencana.js', text: P().toJs('bencana', m.kejadian) }, { path: 'bencana_status.js', text: P().toJs('bencana_status', m.status) }], `Laporan posko bencana dari ${name} di dashboard`, msg);
    set({ b_kej: out.kejadian[0].nama, b_lat: null, b_lon: null, b_rad: null });
    msg(ok === true ? 'Laporan posko tersimpan ke repo dan langsung tampil di layar ini; pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).'
      : `Laporan posko tampil di layar ini, tetapi belum tersimpan untuk pembaca lain (${ok}). Untuk menyimpannya, klik "Login admin" (kanan bawah), lalu unggah ulang file yang sama.`, ok === true ? 'ok' : '');
    pending = null; review();
  }
  const drop = $('b-up-drop'), input = $('b-up-file');
  input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; handle(f); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  // seluruh panel atas menerima file yang ditarik ke sana
  const zone = $('b-ringkasan');
  ['dragenter', 'dragover'].forEach((t) => zone.addEventListener(t, (e) => { if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault(); zone.classList.add('b-over'); }));
  zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('b-over'); });
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('b-over'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handle(f); });
  $('b-up-go').addEventListener('click', apply);
  $('b-up-cancel').addEventListener('click', () => { pending = null; review(); msg(''); });
})();
