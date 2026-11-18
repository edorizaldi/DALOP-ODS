// Tab Update Data Bulanan, cluster Database: kartu "Database Tegangan". Unggah file sanding tegangan GI
// (mis. Sanding_Tegangan_GI_SUMKAL.xlsx) untuk memperbarui gi_tegangan (sheet Max Harian, Min Harian, Pencocokan,
// Max-Min Harian (List)). Identitas GI (gi_identitas) tidak dari file ini, tetapi dari Database Aset Jaringan sheet GI.
// File dibaca di browser (APKT.readSheets) lalu disimpan ke repo dalam satu commit bila admin sudah login.
(() => {
  const UC = { 11: 'ACEH', 12: 'SUMUT', 13: 'SUMBAR', 14: 'S2JB', 16: 'BABEL', 17: 'LAMPUNG', 18: 'RKR', 21: 'KALBAR', 22: 'KALSELTENG', 23: 'KALTIMRA' };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const S = (v) => (v == null ? '' : String(v).trim());
  const norm = (x) => S(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const num = (v) => { if (v == null || v === '') return null; const x = typeof v === 'number' ? v : Number(S(v).replace(',', '.')); return isFinite(x) ? x : null; };
  const r2 = (x) => Math.round(x * 100) / 100;
  // baris judul: baris pertama yang memuat semua kolom wajib
  const headerAt = (rows, need) => rows.findIndex((r) => r && need.every((n) => r.some((c) => norm(c) === norm(n))));
  const colMap = (hr) => { const m = {}; hr.forEach((c, i) => { const k = norm(c); if (k && !(k in m)) m[k] = i; }); return (n) => m[norm(n)]; };
  const sheetOf = (sheets, name) => sheets.find((x) => norm(x.name) === norm(name));

  // ident = identitas GI saat ini (gi_identitas), dipakai untuk menghitung trafo yang cocok
  function build(sheets, ident) {
    const warn = [];
    // ---- Tegangan ----
    let teg = null, periode = '';
    const MH = sheetOf(sheets, 'Max Harian');
    if (!MH) throw new Error('sheet "Max Harian" tidak ada di file ini');
    {
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
        teg.push({ uid: UC[num(r[H('unit_code')])] || '', kode: S(r[H('KODE_JARINGAN')]), gi: S(H('Nama GI (Master)') != null ? r[H('Nama GI (Master)')] : H('Nama GI') != null ? r[H('Nama GI')] : '') || (p ? p.gi : ''), trafo: S(H('Nama Trafo') == null ? '' : r[H('Nama Trafo')]),
          apd, cocok: S(H('Status Pencocokan') == null ? '' : r[H('Status Pencocokan')]), catatan: p ? p.cat : '', jam: p ? p.jam : '', anomali: p ? p.an : 0, konstan: p && p.ko ? 'Ya' : '',
          jamhari: dcols.map(([, d]) => (J && J.has(d) ? J.get(d) : null)), v, vmin: mnMap.get(apd) || dcols.map(() => null), periode });
      });
      if (!teg.length) throw new Error('sheet Max Harian tidak berisi data trafo');
    }
    const kodes = new Set((ident || []).map((x) => x.kode).filter(Boolean));
    return { teg, periode, warn, stats: { tr: teg.length, trMin: teg.filter((t) => t.vmin.some((x) => x != null)).length, cocok: teg.filter((t) => t.kode && kodes.has(t.kode)).length, giTeg: new Set(teg.filter((t) => kodes.has(t.kode)).map((t) => t.kode)).size } };
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
    const M = (window.__D && window.__D.gi_identitas) || [], T = (window.__D && window.__D.gi_tegangan) || []; const k = new Set(M.map((x) => x.kode).filter(Boolean));
    return { tr: T.length, trMin: T.filter((t) => (t.vmin || []).some((x) => x != null)).length, cocok: T.filter((t) => t.kode && k.has(t.kode)).length, giTeg: new Set(T.filter((t) => k.has(t.kode)).map((t) => t.kode)).size, periode: T.length ? T[0].periode : '' };
  };
  function fillCard() { const c = cur(); $('u-g2-isi').textContent = c.tr ? `Tegangan max dan min harian ${perName(c.periode)} untuk ${fmt(c.tr)} trafo/incoming; ${fmt(c.cocok)} cocok dengan ${fmt(c.giTeg)} GI di Database Aset Jaringan` : '—'; }
  fillCard();

  let pending = null;
  function review() {
    $('up-g2-review').hidden = !pending; $('up-g2-go').disabled = !pending;
    if (!pending) return;
    const o = pending.out, s = o.stats, c = cur();
    const rows = [['Trafo/incoming dengan data tegangan', s.tr, c.tr], ['Trafo dengan data tegangan minimum', s.trMin, c.trMin], ['Trafo cocok dengan GI di Database Aset Jaringan', s.cocok, c.cocok], ['GI dengan data tegangan', s.giTeg, c.giTeg]];
    $('up-g2-body').replaceChildren(...rows.map(([l, a, b]) => { const tr = document.createElement('tr'); const d = a == null ? null : a - b; [l, a == null ? 'tidak diubah' : fmt(a), fmt(b), d == null ? '–' : (d > 0 ? '+' : '') + f0.format(d)].forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i) td.className = 'num'; tr.append(td); }); return tr; }));
    $('up-g2-sum').textContent = `${pending.name}: tegangan ${perName(o.periode)} (sebelumnya ${perName(c.periode)}).` + (s.tr - s.cocok ? ` ${fmt(s.tr - s.cocok)} trafo/incoming tidak cocok dengan GI di Database Aset Jaringan dan tidak tampil di tabel.` : '') + (o.warn.length ? ' Catatan: ' + o.warn.join('; ') + '.' : '') + ' Periksa angkanya, lalu klik Update dashboard sekarang.';
  }
  async function handle(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { msg('Pilih file .xlsx.', 'bad'); return; }
    if (!window.APKT || !window.APKT.readSheets) { msg('Pembaca Excel belum termuat. Muat ulang halaman lalu coba lagi.', 'bad'); return; }
    pending = null; review(); msg('');
    const bar = $('up-g2-bar'), lab = $('up-g2-barlabel'); bar.hidden = false; bar.value = 0;
    try {
      const sheets = await window.APKT.readSheets(file, (label, frac) => { bar.value = Math.round(frac * 100); lab.textContent = `${label} · ${Math.round(frac * 100)}%`; });
      pending = { name: file.name, out: build(sheets, (window.__D && window.__D.gi_identitas) || []) };
    } catch (e) { msg('File tidak bisa dibaca: ' + ((e && e.message) || e), 'bad'); }
    bar.hidden = true; lab.textContent = '';
    review();
  }
  async function apply() {
    if (!pending) return;
    const { name, out } = pending; $('up-g2-go').disabled = true;
    const at = new Date().toISOString();
    const periode = `tegangan ${perName(out.periode)}`;
    const sumber = `${name} (sheet Max Harian, Min Harian, Pencocokan, Max-Min Harian (List))`;
    const info = ((window.SSD && SSD.data('info_update').data) || (window.__D && window.__D.info_update) || []).map((r) => ({ ...r }));
    const row = { tab: 'gi', diperbarui: at, periode, sumber: sumber + ' (diunggah di dashboard)' };
    const i = info.findIndex((r) => r.tab === 'gi'); if (i >= 0) info[i] = row; else info.push(row);
    const ov = { gi_tegangan: out.teg, info_update: info };
    Object.entries(ov).forEach(([k, v]) => { window.__D[k] = v; });
    if (window.SSD && SSD.set) SSD.set(ov);
    if (window.SSDbInfo && SSDbInfo.set) SSDbInfo.set('gi', at, periode, sumber);
    fillCard();
    const A = window.SSAdmin; let saved = false, why = '';
    if (A && A.isAdmin() && A.putMany) {
      const bar = $('up-g2-bar'), lab = $('up-g2-barlabel'); bar.hidden = false;
      try {
        const files = [{ path: 'gi_tegangan.js', text: toJs('gi_tegangan', out.teg) }];
        files.push({ path: 'info_update.js', text: toJs('info_update', info) });
        await A.putMany(files, `Update database tegangan dari ${name} di dashboard`, (t, f) => { bar.value = Math.round(f * 100); lab.textContent = t; msg(t + '…'); });
        saved = true;
      } catch (e) { why = e && e.code === 'gh-403' ? 'token admin belum punya izin menulis ke repo ini' : e && e.code === 'gh-401' ? 'login admin sudah tidak berlaku; keluar lalu login lagi' : ((e && e.message) || String(e)); }
      bar.hidden = true; lab.textContent = '';
    }
    msg(saved ? 'Database tegangan sudah diperbarui dan disimpan ke repo dalam satu commit. Tab Database Penyulang & Gardu Induk di layar ini langsung memakai data baru; pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).'
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
