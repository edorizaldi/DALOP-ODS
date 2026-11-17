// Tab Update Data Bulanan, cluster Database: unggah file Sanding Tegangan GI (mis. Sanding_Tegangan_GI_SUMKAL.xlsx)
// untuk memperbarui gi_master (sheet Master GI) dan gi_tegangan (sheet Max Harian, Pencocokan, Max Harian (List)).
// File dibaca di browser (APKT.readSheets) lalu disimpan ke repo dalam satu commit bila admin sudah login.
(() => {
  const DIST = { 110: 'ACEH', 120: 'SUMUT', 131: 'SUMBAR', 140: 'S2JB', 161: 'BABEL', 171: 'LAMPUNG', 180: 'RKR', 210: 'KALBAR', 221: 'KALSELTENG', 230: 'KALTIMRA' };
  const UC = { 11: 'ACEH', 12: 'SUMUT', 13: 'SUMBAR', 14: 'S2JB', 16: 'BABEL', 17: 'LAMPUNG', 18: 'RKR', 21: 'KALBAR', 22: 'KALSELTENG', 23: 'KALTIMRA' };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const S = (v) => (v == null ? '' : String(v).trim());
  const norm = (x) => S(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const SMALL = new Set(['dan', 'di']);
  const title = (s, pre) => S(s).replace(new RegExp('^' + pre + '\\s+', 'i'), '').toLowerCase().split(/\s+/).filter(Boolean).map((w) => (SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const num = (v) => { if (v == null || v === '') return null; const x = typeof v === 'number' ? v : Number(S(v).replace(',', '.')); return isFinite(x) ? x : null; };
  const isoOf = (v) => {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)); return m ? m[0] : '';
  };
  const r2 = (x) => Math.round(x * 100) / 100;
  // baris judul: baris pertama yang memuat semua kolom wajib
  const headerAt = (rows, need) => rows.findIndex((r) => r && need.every((n) => r.some((c) => norm(c) === norm(n))));
  const colMap = (hr) => { const m = {}; hr.forEach((c, i) => { const k = norm(c); if (k && !(k in m)) m[k] = i; }); return (n) => m[norm(n)]; };
  const sheetOf = (sheets, name) => sheets.find((x) => norm(x.name) === norm(name));

  function build(sheets) {
    const warn = [];
    // ---- Master GI ----
    const MS = sheetOf(sheets, 'Master GI');
    if (!MS) throw new Error('sheet "Master GI" tidak ada di file ini');
    const mh = headerAt(MS.rows, ['KODE_JARINGAN', 'NAMA', 'LATITUDE', 'LONGITUDE']);
    if (mh < 0) throw new Error('sheet Master GI: kolom KODE_JARINGAN, NAMA, LATITUDE, LONGITUDE tidak ditemukan');
    const C = colMap(MS.rows[mh]); const g = (r, k) => (C(k) == null ? null : r[C(k)]);
    let bad = 0; const master = [];
    MS.rows.slice(mh + 1).forEach((r) => {
      if (!r || !S(g(r, 'NAMA'))) return;
      let lat = num(g(r, 'LATITUDE')), lon = num(g(r, 'LONGITUDE'));
      if (lat == null || lon == null || !(lat > -9 && lat < 8 && lon > 94 && lon < 120)) { if (lat != null || lon != null) bad++; lat = lon = null; }
      const sn = S(g(r, 'STATUS_NYALA')), sa = S(g(r, 'STATUS_ASSET'));
      const tc = (x) => x.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      master.push({ kode: S(g(r, 'KODE_JARINGAN')), aset: S(g(r, 'KODE_ASSET')), nama: S(g(r, 'NAMA')), alamat: S(g(r, 'ALAMAT')),
        lat: lat == null ? '' : Math.round(lat * 1e6) / 1e6, lon: lon == null ? '' : Math.round(lon * 1e6) / 1e6, uid: DIST[num(g(r, 'DIST'))] || '',
        up3: title(g(r, 'NAMA_UP3'), 'UP3'), ulp: title(g(r, 'NAMA_UNIT'), 'ULP'), status: [tc(sn), tc(sa)].filter(Boolean).join(' · '), dibuat: isoOf(g(r, 'CREATED_DATE')), diubah: isoOf(g(r, 'UPDATED_DATE')) });
    });
    if (!master.length) throw new Error('sheet Master GI tidak berisi GI');
    if (bad) warn.push(`${bad} koordinat GI di luar wilayah Sumkal tidak dipakai`);
    const noUid = master.filter((x) => !x.uid).length; if (noUid) warn.push(`${noUid} GI dengan kode DIST yang tidak dikenali`);

    // ---- Tegangan (opsional) ----
    let teg = null, periode = '';
    const MH = sheetOf(sheets, 'Max Harian');
    if (MH) {
      const th = headerAt(MH.rows, ['unit_code', 'KODE_JARINGAN', 'apd_code']);
      if (th < 1) throw new Error('sheet Max Harian: kolom unit_code, KODE_JARINGAN, apd_code tidak ditemukan');
      const H = colMap(MH.rows[th]); const dr = MH.rows[th - 1] || [];
      const dcols = []; dr.forEach((v, i) => { const n = num(v); if (n != null && n >= 20000101 && n <= 21001231) dcols.push([i, String(Math.round(n))]); });
      if (!dcols.length) throw new Error('sheet Max Harian: baris tanggal (yyyymmdd) di atas judul kolom tidak ditemukan');
      periode = `${dcols[0][1].slice(0, 4)}-${dcols[0][1].slice(4, 6)}`;
      if (dcols.some(([, d]) => d.slice(0, 6) !== dcols[0][1].slice(0, 6))) warn.push('kolom tanggal Max Harian mencakup lebih dari satu bulan; periode diambil dari tanggal pertama');
      // Pencocokan: catatan, jumlah data, anomali, konstan
      const pc = new Map(); const PS = sheetOf(sheets, 'Pencocokan');
      if (PS) {
        const ph = headerAt(PS.rows, ['apd_code']); const P = ph >= 0 ? colMap(PS.rows[ph]) : null;
        const fd = (pre) => { if (!P) return null; const k = PS.rows[ph].findIndex((c) => norm(c).startsWith(norm(pre))); return k < 0 ? null : k; };
        const ci = { apd: P && P('apd_code'), gi: fd('Nama/Kode GI'), cat: P && P('Catatan'), jam: fd('Jumlah Data'), an: fd('Hari dgn Anomali'), ko: fd('Nilai max konstan') };
        if (ph >= 0) PS.rows.slice(ph + 1).forEach((r) => { const a = S(r[ci.apd]); if (a) pc.set(a, { gi: ci.gi == null ? '' : S(r[ci.gi]), cat: ci.cat == null ? '' : S(r[ci.cat]), jam: ci.jam == null ? '' : num(r[ci.jam]) ?? '', an: ci.an == null ? 0 : num(r[ci.an]) || 0, ko: ci.ko != null && norm(r[ci.ko]) === 'YA' }); });
      } else warn.push('sheet Pencocokan tidak ada: catatan, jumlah data dan nilai konstan dikosongkan');
      // Min Harian (opsional): susunan sama dengan Max Harian, dicocokkan per apd_code dan tanggal
      const mnMap = new Map(); const MN = sheetOf(sheets, 'Min Harian');
      if (MN) {
        const nh = headerAt(MN.rows, ['unit_code', 'apd_code']);
        if (nh >= 1) {
          const NH = colMap(MN.rows[nh]); const ndr = MN.rows[nh - 1] || []; const ncol = new Map();
          ndr.forEach((v, i) => { const n = num(v); if (n != null && n >= 20000101 && n <= 21001231) ncol.set(String(Math.round(n)), i); });
          MN.rows.slice(nh + 1).forEach((r) => { const a = S(r[NH('apd_code')]); if (!a) return; mnMap.set(a, dcols.map(([, d]) => { const i = ncol.get(d); const x = i == null ? null : num(r[i]); return x == null ? null : r2(x); })); });
        } else warn.push('sheet Min Harian: kolom unit_code, apd_code tidak ditemukan; tegangan minimum dikosongkan');
      } else warn.push('sheet Min Harian tidak ada: tegangan minimum dikosongkan');
      // Max-Min Harian (List) / Max Harian (List): jam data per hari
      const jh = new Map(); const LS = sheetOf(sheets, 'Max-Min Harian (List)') || sheetOf(sheets, 'Max Harian (List)');
      if (LS) {
        const lh = headerAt(LS.rows, ['apd_code', 'date_periode']); const L = lh >= 0 ? colMap(LS.rows[lh]) : null;
        const jc = lh >= 0 ? LS.rows[lh].findIndex((c) => norm(c).startsWith('JUMLAHDATA')) : -1;
        if (L && jc >= 0) LS.rows.slice(lh + 1).forEach((r) => { const a = S(r[L('apd_code')]); const d = num(r[L('date_periode')]); if (!a || d == null) return; const m = jh.get(a) || new Map(); m.set(String(Math.round(d)), num(r[jc])); jh.set(a, m); });
      } else warn.push('sheet Max-Min Harian (List) tidak ada: jumlah jam data per hari dikosongkan');
      teg = [];
      MH.rows.slice(th + 1).forEach((r) => {
        const apd = S(r[H('apd_code')]); if (!apd) return;
        const p = pc.get(apd); const J = jh.get(apd);
        const v = dcols.map(([i]) => { const x = num(r[i]); return x == null ? null : r2(x); });
        teg.push({ uid: UC[num(r[H('unit_code')])] || '', kode: S(r[H('KODE_JARINGAN')]), gi: S(H('Nama GI (Master)') == null ? '' : r[H('Nama GI (Master)')]) || (p ? p.gi : ''), trafo: S(H('Nama Trafo') == null ? '' : r[H('Nama Trafo')]),
          apd, cocok: S(H('Status Pencocokan') == null ? '' : r[H('Status Pencocokan')]), catatan: p ? p.cat : '', jam: p ? p.jam : '', anomali: p ? p.an : 0, konstan: p && p.ko ? 'Ya' : '',
          jamhari: dcols.map(([, d]) => (J && J.has(d) ? J.get(d) : null)), v, vmin: mnMap.get(apd) || dcols.map(() => null), periode });
      });
      if (!teg.length) throw new Error('sheet Max Harian tidak berisi data trafo');
    } else warn.push('sheet Max Harian tidak ada: data tegangan di dashboard tidak diubah');
    const kodes = new Set(master.map((x) => x.kode));
    return { master, teg, periode, warn, stats: { gi: master.length, xy: master.filter((x) => x.lat !== '').length, tr: teg ? teg.length : 0, trMin: teg ? teg.filter((t) => t.vmin.some((x) => x != null)).length : 0, cocok: teg ? teg.filter((t) => t.kode && kodes.has(t.kode)).length : 0, giTeg: teg ? new Set(teg.filter((t) => kodes.has(t.kode)).map((t) => t.kode)).size : 0 } };
  }
  const toJs = (id, rows) => `window.__D=window.__D||{};window.__D[${JSON.stringify(id)}]=${JSON.stringify(rows)};\n`;
  const api = { build, toJs };
  if (typeof window !== 'undefined') window.SSGiBuild = api;
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof document === 'undefined') return;

  // ---------------- panel unggah ----------------
  const $ = (id) => document.getElementById(id);
  if (!$('up-gi')) return;
  const f0 = new Intl.NumberFormat('id-ID'); const fmt = (v) => (v === '' || v == null ? '–' : f0.format(Number(v)));
  const msg = (t, cls) => { const m = $('up-g2-msg'); m.textContent = t || ''; m.className = 'ss-up-msg' + (cls ? ' ' + cls : ''); };
  const perName = (p) => { const [y, m] = String(p || '').split('-').map(Number); return m ? `${BLN[m - 1]} ${y}` : '–'; };
  const cur = () => {
    const M = (window.__D && window.__D.gi_master) || [], T = (window.__D && window.__D.gi_tegangan) || []; const k = new Set(M.map((x) => x.kode));
    return { gi: M.length, xy: M.filter((x) => x.lat !== '' && x.lat != null).length, tr: T.length, trMin: T.filter((t) => (t.vmin || []).some((x) => x != null)).length, cocok: T.filter((t) => t.kode && k.has(t.kode)).length, giTeg: new Set(T.filter((t) => k.has(t.kode)).map((t) => t.kode)).size, periode: T.length ? T[0].periode : '' };
  };
  function fillCard() { const c = cur(); $('u-g2-isi').textContent = c.gi ? `${fmt(c.gi)} GI (${fmt(c.xy)} berkoordinat); tegangan ${perName(c.periode)} untuk ${fmt(c.tr)} trafo/incoming di ${fmt(c.giTeg)} GI` : '—'; }
  fillCard();

  let pending = null;
  function review() {
    $('up-g2-review').hidden = !pending; $('up-g2-go').disabled = !pending;
    if (!pending) return;
    const o = pending.out, s = o.stats, c = cur();
    const rows = [['GI di Master GI', s.gi, c.gi], ['GI berkoordinat', s.xy, c.xy], ['Trafo/incoming dengan data tegangan', o.teg ? s.tr : null, c.tr], ['Trafo dengan data tegangan minimum', o.teg ? s.trMin : null, c.trMin], ['Trafo cocok dengan Master GI', o.teg ? s.cocok : null, c.cocok], ['GI dengan data tegangan', o.teg ? s.giTeg : null, c.giTeg]];
    $('up-g2-body').replaceChildren(...rows.map(([l, a, b]) => { const tr = document.createElement('tr'); const d = a == null ? null : a - b; [l, a == null ? 'tidak diubah' : fmt(a), fmt(b), d == null ? '–' : (d > 0 ? '+' : '') + f0.format(d)].forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i) td.className = 'num'; tr.append(td); }); return tr; }));
    $('up-g2-sum').textContent = `${pending.name}: Master GI ${fmt(s.gi)} GI` + (o.teg ? `, tegangan ${perName(o.periode)} (sebelumnya ${perName(c.periode)})` : '') + '.' + (o.warn.length ? ' Catatan: ' + o.warn.join('; ') + '.' : '') + ' Periksa angkanya, lalu klik Update dashboard sekarang.';
  }
  async function handle(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { msg('Pilih file .xlsx.', 'bad'); return; }
    if (!window.APKT || !window.APKT.readSheets) { msg('Pembaca Excel belum termuat. Muat ulang halaman lalu coba lagi.', 'bad'); return; }
    pending = null; review(); msg('');
    const bar = $('up-g2-bar'), lab = $('up-g2-barlabel'); bar.hidden = false; bar.value = 0;
    try {
      const sheets = await window.APKT.readSheets(file, (label, frac) => { bar.value = Math.round(frac * 100); lab.textContent = `${label} · ${Math.round(frac * 100)}%`; });
      pending = { name: file.name, out: build(sheets) };
    } catch (e) { msg('File tidak bisa dibaca: ' + ((e && e.message) || e), 'bad'); }
    bar.hidden = true; lab.textContent = '';
    review();
  }
  async function apply() {
    if (!pending) return;
    const { name, out } = pending; $('up-g2-go').disabled = true;
    const at = new Date().toISOString();
    const periode = out.teg ? `Master GI dan tegangan ${perName(out.periode)}` : 'Master GI';
    const sumber = `${name} (sheet Master GI${out.teg ? ', Max Harian, Min Harian, Pencocokan, Max-Min Harian (List)' : ''})`;
    const info = ((window.SSD && SSD.data('info_update').data) || (window.__D && window.__D.info_update) || []).map((r) => ({ ...r }));
    const row = { tab: 'gi', diperbarui: at, periode, sumber: sumber + ' (diunggah di dashboard)' };
    const i = info.findIndex((r) => r.tab === 'gi'); if (i >= 0) info[i] = row; else info.push(row);
    const ov = { gi_master: out.master, info_update: info }; if (out.teg) ov.gi_tegangan = out.teg;
    Object.entries(ov).forEach(([k, v]) => { window.__D[k] = v; });
    if (window.SSD && SSD.set) SSD.set(ov);
    if (window.SSDbInfo && SSDbInfo.set) SSDbInfo.set('gi', at, periode, sumber);
    fillCard();
    const A = window.SSAdmin; let saved = false, why = '';
    if (A && A.isAdmin() && A.putMany) {
      const bar = $('up-g2-bar'), lab = $('up-g2-barlabel'); bar.hidden = false;
      try {
        const files = [{ path: 'gi_master.js', text: toJs('gi_master', out.master) }];
        if (out.teg) files.push({ path: 'gi_tegangan.js', text: toJs('gi_tegangan', out.teg) });
        files.push({ path: 'info_update.js', text: toJs('info_update', info) });
        await A.putMany(files, `Update database gardu induk dari ${name} di dashboard`, (t, f) => { bar.value = Math.round(f * 100); lab.textContent = t; msg(t + '…'); });
        saved = true;
      } catch (e) { why = e && e.code === 'gh-403' ? 'token admin belum punya izin menulis ke repo ini' : e && e.code === 'gh-401' ? 'login admin sudah tidak berlaku; keluar lalu login lagi' : ((e && e.message) || String(e)); }
      bar.hidden = true; lab.textContent = '';
    }
    msg(saved ? 'Database gardu induk sudah diperbarui dan disimpan ke repo dalam satu commit. Tab Database Penyulang & Gardu Induk di layar ini langsung memakai data baru; pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).'
      : `Tab Database Penyulang & Gardu Induk di layar ini sudah memakai data baru, tetapi belum tersimpan untuk pembaca lain (${why || 'belum login admin'}). Untuk menyimpannya, klik "Login admin" (kanan bawah), lalu unggah ulang file yang sama.`, saved ? 'ok' : '');
    pending = null; review();
  }
  const drop = $('up-g2-drop'), input = $('up-g2-file');
  input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; handle(f); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handle(f); });
  $('up-g2-go').addEventListener('click', apply);
  $('up-g2-cancel').addEventListener('click', () => { pending = null; review(); msg(''); });
})();
