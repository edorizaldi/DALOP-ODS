// Tab Update Data Bulanan, cluster Data Bulanan: unggah workpaper (sheet Action Plan) untuk tab Workplan Keandalan.
// File dibaca di browser (APKT.readSheets), lalu workplan.js dan info_update.js disimpan ke repo dalam satu commit bila admin sudah login.
(function (root) {
  const PROG = [
    { k: 'pdkb', re: /PDKB/i, s: 'PDKB', u: 'titik' },
    { k: 'tebang', re: /TEBANG/i, s: 'Tebang', u: 'kms' },
    { k: 'pangkas', re: /PANGKAS|ROW/i, s: 'Pangkas', u: 'kms' },
    { k: 'proteksi', re: /PROTEKSI/i, s: 'Proteksi', u: 'penyulang' },
    { k: 'binatang', re: /BINATANG/i, s: 'Penghalang Binatang', u: 'titik' },
  ];
  const CODE = { 'UID ACEH': 'ACEH', 'UID SUMUT': 'SUMUT', 'UID SUMBAR': 'SUMBAR', 'UID RIAU': 'RKR', 'UID RKR': 'RKR', 'UID S2JB': 'S2JB', 'UIW BABEL': 'BABEL', 'UID BABEL': 'BABEL', 'UID LAMPUNG': 'LAMPUNG', 'UID KALBAR': 'KALBAR', 'UID KALSELTENG': 'KALSELTENG', 'UID KSKT': 'KALSELTENG', 'UID KALTIMRA': 'KALTIMRA' };
  const TOT = { SUMKAL: 'SUMKAL', JAMALI: 'JAMALI', SULMAPANA: 'SULMAPANA', 'DIT DIST': 'NASIONAL', NASIONAL: 'NASIONAL' };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const str = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
  const num = (v) => { if (v == null || v === '' || v === '-') return null; const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : null; };

  // sheets: [{name, rows}] → { rows (format dataset workplan), bulan, tahun, sheet }
  function parse(sheets) {
    const norm = (x) => String(x).toUpperCase().replace(/[^A-Z]/g, '');
    const sh = sheets.find((x) => norm(x.name) === 'ACTIONPLAN') || sheets.find((x) => (x.rows || []).some((r) => r && r.some((c) => /ACTION PLAN/i.test(str(c)))));
    if (!sh) throw new Error('sheet "Action Plan" tidak ada di file ini');
    const R = sh.rows.map((r) => r || []);
    // baris judul kolom: berisi "Target" minimal 5 kali
    const hi = R.findIndex((r) => r.filter((c) => /^target$/i.test(str(c))).length >= 5);
    if (hi < 1) throw new Error('baris judul Target / Realisasi / % tidak ditemukan di sheet ' + sh.name);
    const tcols = R[hi].map((c, i) => (/^target$/i.test(str(c)) ? i : -1)).filter((i) => i >= 0);
    const col = {};
    tcols.forEach((c) => {
      let lab = '';
      for (let g = hi - 1; g >= 0 && !lab; g--) lab = str(R[g][c]);
      const p = PROG.find((x) => x.re.test(lab) && col[x.k] == null);
      if (p) col[p.k] = c;
    });
    const miss = PROG.filter((p) => col[p.k] == null).map((p) => p.s);
    if (miss.length) throw new Error('kolom program tidak ditemukan: ' + miss.join(', '));
    // kolom nama unit: kolom paling kiri sebelum Target pertama yang berisi "SUMKAL"
    let nc = -1;
    for (let c = 0; c < tcols[0] && nc < 0; c++) if (R.some((r) => /^SUMKAL$/i.test(str(r[c])))) nc = c;
    if (nc < 0) throw new Error('baris SUMKAL tidak ditemukan');
    // periode dari judul, misalnya "Realisasi Action Plan s.d September - 2026"
    let bulan = '', tahun = '';
    R.slice(0, hi + 1).some((r) => r.some((c) => { const m = /s\.?\s*d\.?\s*([A-Za-z]+)\D{0,6}(\d{4})/i.exec(str(c)); if (m) { const b = BLN.find((x) => x.toLowerCase().startsWith(m[1].toLowerCase().slice(0, 3))); if (b) { bulan = b; tahun = m[2]; return true; } } return false; }));
    const out = []; let buf = [];
    for (let i = hi + 1; i < R.length; i++) {
      const nama = str(R[i][nc]).toUpperCase(); if (!nama) continue;
      const vals = PROG.map((p) => ({ program: p.k, target: num(R[i][col[p.k]]), realisasi: num(R[i][col[p.k] + 1]) }));
      if (vals.every((v) => v.target == null && v.realisasi == null)) continue;
      const w = TOT[nama];
      if (w) {
        if (w !== 'NASIONAL') { buf.forEach((x) => { x.wil = w; }); out.push(...buf); buf = []; }
        vals.forEach((v) => out.push({ wil: w, unit: 'TOTAL', nama: str(R[i][nc]), jenis: 'total', ...v }));
      } else {
        const unit = CODE[nama] || nama.replace(/^UI[DW]\s+/, '').replace(/\s+/g, '_');
        vals.forEach((v) => buf.push({ wil: null, unit, nama: str(R[i][nc]), jenis: 'unit', ...v }));
      }
    }
    if (!out.some((r) => r.wil === 'SUMKAL' && r.jenis === 'unit')) throw new Error('unit Sumkal tidak terbaca (pastikan ada baris subtotal SUMKAL di bawah unit-unitnya)');
    return { rows: out, bulan, tahun, sheet: sh.name };
  }
  const toJs = (rows) => 'window.__D=window.__D||{};window.__D["workplan"]=' + JSON.stringify(rows) + ';\n';
  const api = { parse, toJs, PROG };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.SSWpUpload = api;

  // ---------- panel ----------
  const $ = (id) => document.getElementById(id);
  if (!$('up-workplan')) return;
  const f1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const fp = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const pct = (x) => (x && x.target ? fp.format((x.realisasi / x.target) * 100) + '%' : '–');
  const msg = (t, cls) => { const m = $('up-w-msg'); m.textContent = t || ''; m.className = 'ss-up-msg' + (cls ? ' ' + cls : ''); };
  const cur = () => (window.SSD && SSD.data('workplan').data) || (window.__D && window.__D.workplan) || [];
  const tot = (rows, p) => rows.find((r) => r.wil === 'SUMKAL' && r.unit === 'TOTAL' && r.program === p);

  function fillCard() {
    const info = ((window.SSD && SSD.data('info_update').data) || []).find((r) => r.tab === 'workplan');
    $('u-w-per').textContent = info ? info.periode : '—';
    const rows = cur(); if (!rows.length) return;
    const n = new Set(rows.filter((r) => r.wil === 'SUMKAL' && r.jenis === 'unit').map((r) => r.unit)).size;
    const ok = PROG.filter((p) => { const x = tot(rows, p.k); return x && x.target && x.realisasi >= x.target; }).length;
    $('u-w-isi').textContent = `5 program, ${n} UID Sumkal; ${ok} dari 5 program Sumkal mencapai target`;
  }
  if (window.SSD) SSD.onData(fillCard); fillCard();

  let pending = null;
  function review() {
    $('up-w-review').hidden = !pending; $('up-w-go').disabled = !pending;
    if (!pending) return;
    const C = cur();
    $('up-w-body').replaceChildren(...PROG.map((p) => {
      const x = tot(pending.rows, p.k), c = tot(C, p.k); const tr = document.createElement('tr');
      [`${p.s} (${p.u})`, x ? f1.format(x.target) : '–', x ? f1.format(x.realisasi) : '–', pct(x), pct(c)].forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i) td.className = 'num'; tr.append(td); });
      return tr;
    }));
    const n = new Set(pending.rows.filter((r) => r.wil === 'SUMKAL' && r.jenis === 'unit').map((r) => r.unit)).size;
    const regs = [...new Set(pending.rows.filter((r) => r.jenis === 'total').map((r) => r.nama))];
    $('up-w-sum').textContent = `${pending.name}, sheet ${pending.sheet}: realisasi s.d. ${pending.bulan || '(bulan tidak terbaca)'} ${pending.tahun}, ${n} UID Sumkal, baris total ${regs.join(', ')}. Periksa angka Sumkal di bawah, lalu klik Update dashboard sekarang.`;
  }

  async function handle(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { msg('Pilih file .xlsx.', 'bad'); return; }
    if (!window.APKT || !window.APKT.readSheets) { msg('Pembaca Excel belum termuat. Muat ulang halaman lalu coba lagi.', 'bad'); return; }
    pending = null; review(); msg('Membaca file…');
    try {
      const sheets = await window.APKT.readSheets(file, () => {});
      const r = parse(sheets);
      if (!r.bulan) throw new Error('periode (s.d. bulan dan tahun) tidak terbaca dari judul sheet');
      pending = { name: file.name, ...r }; msg('');
    } catch (e) { msg('File tidak bisa dibaca: ' + ((e && e.message) || e), 'bad'); }
    review();
  }

  async function apply() {
    if (!pending) return;
    const { name, rows, bulan, tahun, sheet } = pending; $('up-w-go').disabled = true;
    const at = new Date().toISOString();
    const periode = `Realisasi s.d. ${bulan} ${tahun}`, sumber = `${name} (sheet ${sheet})`;
    const info = ((window.SSD && SSD.data('info_update').data) || (window.__D && window.__D.info_update) || []).map((r) => ({ ...r }));
    const row = { tab: 'workplan', diperbarui: at, periode, sumber: sumber + ' (diunggah di dashboard)' };
    const i = info.findIndex((r) => r.tab === 'workplan'); if (i >= 0) info[i] = row; else info.push(row);
    window.__D.workplan = rows; window.__D.info_update = info;
    if (window.SSD && SSD.set) SSD.set({ workplan: rows, info_update: info });
    if (window.SSDbInfo && SSDbInfo.set) SSDbInfo.set('workplan', at, periode, sumber);
    const A = window.SSAdmin; let saved = false, why = '';
    if (A && A.isAdmin() && A.putMany) {
      try {
        await A.putMany([{ path: 'workplan.js', text: toJs(rows) }, { path: 'info_update.js', text: 'window.__D=window.__D||{};window.__D["info_update"]=' + JSON.stringify(info) + ';\n' }],
          `Update Workplan Keandalan (Action Plan s.d. ${bulan} ${tahun}) dari ${name} di dashboard`, (t) => msg(t + '…'));
        saved = true;
      } catch (e) { why = e && e.code === 'gh-403' ? 'token admin belum punya izin menulis ke repo ini' : e && e.code === 'gh-401' ? 'login admin sudah tidak berlaku; keluar lalu login lagi' : ((e && e.message) || String(e)); }
    }
    msg(saved ? `Workplan Keandalan sudah diperbarui (s.d. ${bulan} ${tahun}) dan disimpan ke repo. Tab Workplan Keandalan dan slide Realisasi Action Plan di Desain Paparan langsung memakai data baru; pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).`
      : `Tab Workplan Keandalan di layar ini sudah memakai data baru, tetapi belum tersimpan untuk pembaca lain (${why || 'belum login admin'}). Untuk menyimpannya, klik "Login admin" (kanan bawah), lalu unggah ulang file yang sama.`, saved ? 'ok' : '');
    pending = null; review(); fillCard();
  }

  const drop = $('up-w-drop'), input = $('up-w-file');
  input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; handle(f); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handle(f); });
  $('up-w-go').addEventListener('click', apply);
  $('up-w-cancel').addEventListener('click', () => { pending = null; review(); msg(''); });
})(typeof window !== 'undefined' ? window : globalThis);
