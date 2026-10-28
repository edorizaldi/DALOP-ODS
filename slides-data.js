// Data database yang bisa dipakai di desain slide unggahan (.pptx).
// Di desain, tulis kode seperti {{SAIDI_REAL_SUMKAL}} di kotak teks; saat paparan dibuat, kode diganti angka
// sesuai bulan cutoff. Kotak teks yang isinya hanya kode tabel ({{TABEL_...}}) diganti tabel PowerPoint
// dengan posisi dan ukuran yang sama. Butuh SSSlides (slides-core.js).
(function (root) {
  'use strict';
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const UIDS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const UNAME = { ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID RKR', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID KSKT', KALTIMRA: 'UID Kaltimra', SUMKAL: 'Sumkal' };
  const nf = (v, d) => (v == null || !isFinite(v) ? '–' : Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const TOK = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;

  function catalog(D, m, K) {
    const { data, data3, data5, data6 } = root.SSSlides.compute(D, m);
    const groups = []; const values = {}; const tables = {};
    const add = (g, key, label, value) => { values[key] = value; g.items.push({ key, label, value }); };
    const tbl = (g, key, label, head, rows, totalRow) => { tables[key] = { head, rows, totalRow: !!totalRow }; g.items.push({ key, label, value: `Tabel ${rows.length} baris × ${head.length} kolom`, table: true }); };

    const gU = { name: 'Umum', items: [] }; groups.push(gU);
    add(gU, 'BULAN', 'Bulan cutoff', BLN[m - 1]);
    add(gU, 'BULAN_SINGKAT', 'Bulan cutoff (singkat)', BLN[m - 1].slice(0, 3));
    add(gU, 'PERIODE', 'Periode data', m === 1 ? 'Januari 2026' : `Januari – ${BLN[m - 1]} 2026`);
    add(gU, 'TAHUN', 'Tahun', '2026');

    [['saidi', 'SAIDI', 'menit/pelanggan', 3 - 1, 2], ['saifi', 'SAIFI', 'kali/pelanggan', 2, 3]].forEach(([k, N, unit, kd, md]) => {
      const g = { name: `${N} (${unit})`, items: [] }; groups.push(g);
      ['SUMKAL', ...UIDS].forEach((u) => {
        const S = data.units[u][k]; const bl = (data3[k].bln[u] || [])[m - 1];
        const nm = UNAME[u];
        add(g, `${N}_REAL_${u}`, `${N} kumulatif s.d. ${BLN[m - 1]} – ${nm}`, nf(S.r, kd));
        add(g, `${N}_TARGET_${u}`, `Target ${N} s.d. ${BLN[m - 1]} – ${nm}`, nf(S.tm, kd));
        add(g, `${N}_TARGET2026_${u}`, `Target ${N} 2026 – ${nm}`, nf(S.t26, kd));
        add(g, `${N}_CAPAIAN_${u}`, `Pencapaian ${N} – ${nm}`, S.tm ? nf((2 - S.r / S.tm) * 100, 2) + '%' : '–');
        add(g, `${N}_BULANAN_${u}`, `${N} bulan ${BLN[m - 1]} – ${nm}`, nf(bl, md));
      });
      const rows = ['SUMKAL', ...UIDS].map((u) => { const S = data.units[u][k]; return [UNAME[u], nf(S.t26, kd), nf(S.tm, kd), nf(S.r, kd), S.tm ? nf((2 - S.r / S.tm) * 100, 2) + '%' : '–']; });
      rows.push(rows.shift());
      tbl(g, `TABEL_${N}_UID`, `Tabel ${N} per UID: target, realisasi s.d. ${BLN[m - 1]}, pencapaian`, ['Unit', 'Target 2026', `Target s.d. ${BLN[m - 1].slice(0, 3)}`, `Realisasi s.d. ${BLN[m - 1].slice(0, 3)}`, 'Pencapaian'], rows, true);
      const mh = [...Array(m)].map((_, i) => BLN[i].slice(0, 3));
      const rb = [...UIDS, 'SUMKAL'].map((u) => [UNAME[u], ...data3[k].bln[u].map((v) => nf(v, md))]);
      tbl(g, `TABEL_${N}_BULANAN`, `Tabel ${N} bulanan per UID (Jan–${BLN[m - 1].slice(0, 3)})`, ['Unit', ...mh], rb, true);
      const rk = [...UIDS, 'SUMKAL'].map((u) => [UNAME[u], ...data3[k].kum[u].map((v) => nf(v, kd))]);
      tbl(g, `TABEL_${N}_KUMULATIF`, `Tabel ${N} kumulatif per UID (Jan–${BLN[m - 1].slice(0, 3)})`, ['Unit', ...mh], rk, true);
    });

    const gG = { name: 'Gangguan penyulang (kode J)', items: [] }; groups.push(gG);
    const tot = { P: sum(data5.mon.P), S: sum(data5.mon.S), C: sum(data5.mon.C), K: sum(data5.mon.K) }; tot.T = tot.P + tot.S + tot.C;
    const L = { P: 'PERMANEN', S: 'SESAAT', C: 'CLEANSING', K: 'KOREKSI', T: 'TOTAL' };
    const LB = { P: 'Gangguan permanen', S: 'Gangguan sesaat', C: 'Data cleansing', K: 'Event koreksi', T: 'Total gangguan (P+S+C)' };
    Object.keys(L).forEach((x) => add(gG, `GGN_${L[x]}_SUMKAL`, `${LB[x]} s.d. ${BLN[m - 1]} – Sumkal`, nf(tot[x], 0)));
    add(gG, 'GGN_RATA2_SUMKAL', 'Rata-rata total gangguan per bulan – Sumkal', nf(tot.T / m, 0));
    UIDS.forEach((u) => { const o = data5.uid[u]; add(gG, `GGN_TOTAL_${u}`, `Total gangguan (P+S+C) – ${UNAME[u]}`, nf(o.P + o.S + o.C, 0)); });
    const rg = UIDS.map((u) => { const o = data5.uid[u]; return [UNAME[u], nf(o.P, 0), nf(o.S, 0), nf(o.C, 0), nf(o.K, 0), nf(o.P + o.S + o.C, 0)]; });
    rg.push(['Sumkal', nf(tot.P, 0), nf(tot.S, 0), nf(tot.C, 0), nf(tot.K, 0), nf(tot.T, 0)]);
    tbl(gG, 'TABEL_GANGGUAN_UID', `Tabel gangguan per UID s.d. ${BLN[m - 1]}`, ['Unit', 'Permanen', 'Sesaat', 'Cleansing', 'Koreksi', 'Total (P+S+C)'], rg, true);

    const gP = { name: 'Penyebab gangguan (Dupont)', items: [] }; groups.push(gP);
    const cs = Object.entries(data6.cause).map(([c, a]) => [c === '(kosong)' ? 'Tidak ada keterangan' : c, sum(a)]).sort((a, b) => b[1] - a[1]);
    const totD = sum(data6.mon);
    add(gP, 'PENYEBAB_TOTAL', `Total gangguan bidang distribusi s.d. ${BLN[m - 1]}`, nf(totD, 0));
    cs.slice(0, 5).forEach(([c, n], i) => { add(gP, `PENYEBAB_${i + 1}_NAMA`, `Penyebab terbesar ke-${i + 1}`, c); add(gP, `PENYEBAB_${i + 1}_JUMLAH`, `Jumlah penyebab ke-${i + 1}`, nf(n, 0)); });
    const inv = Object.values(data6.inv).reduce((a, x) => a + sum(x), 0);
    add(gP, 'PENYEBAB_INVESTIGASI', 'Gangguan "Dalam Investigasi"', nf(inv, 0));
    const top = cs.slice(0, 10); const rest = sum(cs.slice(10).map((x) => x[1]));
    const rp = top.map(([c, n]) => [c, nf(n, 0), nf(totD ? n / totD * 100 : 0, 1) + '%']);
    if (rest) rp.push(['Lainnya', nf(rest, 0), nf(rest / totD * 100, 1) + '%']);
    rp.push(['Total', nf(totD, 0), '100,0%']);
    tbl(gP, 'TABEL_PENYEBAB', `Tabel 10 penyebab gangguan terbesar s.d. ${BLN[m - 1]}`, ['Penyebab', 'Jumlah', 'Porsi'], rp, true);

    // ---------- koreksi cleansing (kode J dan P) ----------
    const gK = { name: 'Koreksi cleansing', items: [] }; groups.push(gK);
    const kc = { J: { C: z0(), K: z0() }, P: { C: z0(), K: z0() } }; const kcU = {}; const kcUp = {};
    function z0() { return Array(m).fill(0); }
    UIDS.forEach((u) => { kcU[u] = { JC: 0, JK: 0, PC: 0, PK: 0 }; });
    (D.kc_bulanan || []).forEach((r) => {
      const b = Number(r.BULAN_NO), n = Number(r.JUMLAH) || 0; if (!(b >= 1 && b <= m) || !kc[r.KODE]) return;
      const j = r.JENIS === 'Cleansing' ? 'C' : 'K'; kc[r.KODE][j][b - 1] += n;
      if (kcU[r.UID]) kcU[r.UID][r.KODE + j] += n;
      const key = r.UP3 + '|' + r.UID; (kcUp[key] = kcUp[key] || { up3: r.UP3, uid: r.UID, C: 0, K: 0 })[j] += n;
    });
    const KT = { JC: sum(kc.J.C), JK: sum(kc.J.K), PC: sum(kc.P.C), PK: sum(kc.P.K) };
    const KL = { JC: ['CLEANSING_J', 'Data cleansing kode J (gangguan)'], JK: ['KOREKSI_J', 'Event koreksi kode J (gangguan)'], PC: ['CLEANSING_P', 'Data cleansing kode P (pemeliharaan)'], PK: ['KOREKSI_P', 'Event koreksi kode P (pemeliharaan)'] };
    Object.keys(KL).forEach((x) => add(gK, `KC_${KL[x][0]}_SUMKAL`, `${KL[x][1]} s.d. ${BLN[m - 1]} – Sumkal`, nf(KT[x], 0)));
    add(gK, 'KC_TOTAL_SUMKAL', `Total cleansing + koreksi (J+P) s.d. ${BLN[m - 1]} – Sumkal`, nf(KT.JC + KT.JK + KT.PC + KT.PK, 0));
    add(gK, 'KC_CLEANSING_J_BULAN', `Data cleansing kode J bulan ${BLN[m - 1]} – Sumkal`, nf(kc.J.C[m - 1], 0));
    add(gK, 'KC_KOREKSI_J_BULAN', `Event koreksi kode J bulan ${BLN[m - 1]} – Sumkal`, nf(kc.J.K[m - 1], 0));
    UIDS.forEach((u) => { const o = kcU[u]; add(gK, `KC_TOTAL_${u}`, `Cleansing + koreksi (J+P) – ${UNAME[u]}`, nf(o.JC + o.JK + o.PC + o.PK, 0)); });
    const upTop = Object.values(kcUp).map((o) => ({ ...o, T: o.C + o.K })).sort((a, b) => b.T - a.T);
    upTop.slice(0, 3).forEach((o, i) => { add(gK, `KC_UP3_${i + 1}_NAMA`, `UP3 dengan cleansing + koreksi terbanyak ke-${i + 1}`, `UP3 ${o.up3} (${UNAME[o.uid] || o.uid})`); add(gK, `KC_UP3_${i + 1}_JUMLAH`, `Jumlah UP3 ke-${i + 1}`, nf(o.T, 0)); });
    const rkc = UIDS.map((u) => { const o = kcU[u]; return [UNAME[u], nf(o.JC, 0), nf(o.JK, 0), nf(o.PC, 0), nf(o.PK, 0), nf(o.JC + o.JK + o.PC + o.PK, 0)]; });
    rkc.push(['Sumkal', nf(KT.JC, 0), nf(KT.JK, 0), nf(KT.PC, 0), nf(KT.PK, 0), nf(KT.JC + KT.JK + KT.PC + KT.PK, 0)]);
    tbl(gK, 'TABEL_KC_UID', `Tabel koreksi cleansing per UID s.d. ${BLN[m - 1]}`, ['Unit', 'Cleansing J', 'Koreksi J', 'Cleansing P', 'Koreksi P', 'Total'], rkc, true);
    const rkb = [...Array(m)].map((_, i) => [BLN[i], nf(kc.J.C[i], 0), nf(kc.J.K[i], 0), nf(kc.P.C[i], 0), nf(kc.P.K[i], 0)]);
    rkb.push(['Total', nf(KT.JC, 0), nf(KT.JK, 0), nf(KT.PC, 0), nf(KT.PK, 0)]);
    tbl(gK, 'TABEL_KC_BULANAN', `Tabel koreksi cleansing Sumkal per bulan (Jan–${BLN[m - 1].slice(0, 3)})`, ['Bulan', 'Cleansing J', 'Koreksi J', 'Cleansing P', 'Koreksi P'], rkb, true);
    tbl(gK, 'TABEL_KC_UP3', `Tabel 10 UP3 dengan cleansing + koreksi terbanyak s.d. ${BLN[m - 1]}`, ['UP3', 'UID', 'Cleansing', 'Koreksi', 'Total'], upTop.slice(0, 10).map((o) => [o.up3, UNAME[o.uid] || o.uid, nf(o.C, 0), nf(o.K, 0), nf(o.T, 0)]));

    // ---------- kondisi sistem (data harian terakhir, tidak mengikuti bulan cutoff) ----------
    if (K && K.day && K.day.length) kondisi(K, groups, values, tables, add, tbl);
    return { groups, values, tables };
  }

  function kondisi(K, groups, values, tables, add, tbl) {
    const meta = K.meta || {}; const Y = meta.tahun, M = meta.bulan;
    const g = { name: 'Kondisi sistem (harian)', items: [] }; groups.push(g);
    const SC = ['NORMAL', 'SIAGA', 'DEFISIT'];
    const sid = (r) => (r.s + '_' + r.u + '_' + r.n).replace(/[^A-Za-z0-9_.~:@+-]/g, '_').slice(0, 180);
    const base = new Date(Y, M - 1, 0);
    const ov = {};
    (K.upd || []).forEach((v) => { if (!v || !v.key) return; const off = typeof v.tanggal === 'string' && /^\d{4}-\d\d-\d\d$/.test(v.tanggal) ? Math.round((new Date(v.tanggal + 'T00:00:00') - base) / 864e5) : v.off; if (typeof off === 'number') (ov[v.key] = ov[v.key] || {})[off] = v; });
    const at = (r, k) => { const o = (ov[sid(r)] || {})[k]; if (o) return { dmp: o.dmp, bp: o.bp, cad: o.cad, st: o.st }; const i = k - 1; if (r.dmp[i] == null) return null; return { dmp: r.dmp[i], bp: r.bp[i], cad: r.cad[i], st: SC[r.sc[i]] || '' }; };
    let last = 0;
    K.day.forEach((r) => { r.dmp.forEach((v, i) => { if (v != null && i + 1 > last) last = i + 1; }); Object.keys(ov[sid(r)] || {}).forEach((k) => { if (+k > last) last = +k; }); });
    if (!last) return;
    const tgl = `${last} ${BLN[M - 1]} ${Y}`;
    g.name = `Kondisi sistem (harian, data ${last} ${BLN[M - 1]} ${Y})`;
    const rows = K.day.map((r) => ({ r, v: at(r, last) })).filter((x) => x.v && x.r.n !== 'TOTAL SISTEM GRID');
    const grid = rows.filter((x) => x.r.s === 'GRID'), iso = rows.filter((x) => x.r.s !== 'GRID');
    const cnt = (a, s) => a.filter((x) => x.v.st === s).length;
    const mw = (v) => (v == null || v === '' ? '–' : nf(+v, 1));
    const nm = (x) => (x.r.s === 'GRID' ? `Grid ${x.r.n}` : x.r.n);
    add(g, 'KONDISI_TANGGAL', 'Tanggal data kondisi sistem terakhir', tgl);
    add(g, 'KONDISI_SISTEM_JUMLAH', `Jumlah sistem yang punya data (${tgl})`, nf(rows.length, 0));
    add(g, 'KONDISI_GRID_JUMLAH', 'Jumlah sistem grid', nf(grid.length, 0));
    add(g, 'KONDISI_ISOLATED_JUMLAH', 'Jumlah sistem isolated', nf(iso.length, 0));
    SC.forEach((s) => { add(g, `KONDISI_${s}`, `Sistem berstatus ${s.toLowerCase()} (grid + isolated)`, nf(cnt(rows, s), 0)); });
    SC.forEach((s) => { add(g, `KONDISI_GRID_${s}`, `Sistem grid berstatus ${s.toLowerCase()}`, nf(cnt(grid, s), 0)); add(g, `KONDISI_ISOLATED_${s}`, `Sistem isolated berstatus ${s.toLowerCase()}`, nf(cnt(iso, s), 0)); });
    const tot = K.day.find((r) => r.n === 'TOTAL SISTEM GRID'); const tv = tot && at(tot, last);
    if (tv) {
      add(g, 'KONDISI_GRID_DMP', 'Daya mampu pasok total grid Sumkal (MW)', mw(tv.dmp));
      add(g, 'KONDISI_GRID_BEBAN', 'Beban puncak total grid Sumkal (MW)', mw(tv.bp));
      add(g, 'KONDISI_GRID_CADANGAN', 'Cadangan total grid Sumkal (MW)', mw(tv.cad));
    }
    const list = (s) => { const a = rows.filter((x) => x.v.st === s).map(nm); return a.length ? a.join(', ') : 'Tidak ada'; };
    add(g, 'KONDISI_SIAGA_DAFTAR', 'Daftar sistem siaga', list('SIAGA'));
    add(g, 'KONDISI_DEFISIT_DAFTAR', 'Daftar sistem defisit', list('DEFISIT'));
    const row = (x) => [nm(x), x.r.u, mw(x.v.dmp), mw(x.v.bp), mw(x.v.cad), x.v.st || '–'];
    const rg = grid.map(row); if (tv) rg.push(['Total grid Sumkal', '', mw(tv.dmp), mw(tv.bp), mw(tv.cad), tv.st || '–']);
    tbl(g, 'TABEL_KONDISI_GRID', `Tabel kondisi sistem grid (${tgl})`, ['Sistem', 'Unit', 'DMP (MW)', 'Beban puncak (MW)', 'Cadangan (MW)', 'Status'], rg, !!tv);
    const sd = rows.filter((x) => x.v.st === 'SIAGA' || x.v.st === 'DEFISIT').sort((a, b) => (a.v.st === b.v.st ? 0 : a.v.st === 'DEFISIT' ? -1 : 1));
    tbl(g, 'TABEL_KONDISI_SIAGA_DEFISIT', `Tabel sistem siaga dan defisit (${tgl})`, ['Sistem', 'Unit', 'DMP (MW)', 'Beban puncak (MW)', 'Cadangan (MW)', 'Status'], sd.length ? sd.map(row) : [['Tidak ada sistem siaga atau defisit', '', '', '', '', '']]);
    const mon = K.mon || []; const lt = mon.reduce((a, x) => (x.t > a ? x.t : a), '');
    const ml = mon.filter((x) => x.t === lt);
    if (lt) {
      const [yy, mm, dd] = lt.split('-').map(Number);
      add(g, 'KONDISI_MONITORING_TANGGAL', 'Tanggal monitoring defisit terakhir', `${dd} ${BLN[mm - 1]} ${yy}`);
      add(g, 'KONDISI_MONITORING_JUMLAH', 'Jumlah sistem dalam monitoring defisit', nf(ml.length, 0));
      const fd = (iso) => { if (!/^\d{4}-\d\d-\d\d$/.test(iso || '')) return iso || '–'; const [a, b, c] = iso.split('-').map(Number); return `${c} ${BLN[b - 1].slice(0, 3)} ${a}`; };
      tbl(g, 'TABEL_MONITORING_DEFISIT', `Tabel monitoring defisit (${dd} ${BLN[mm - 1]} ${yy})`, ['Subsistem', 'UID', 'Penyebab', 'Estimasi normal'], ml.map((x) => [x.sub, x.uid, String(x.pen || '').replace(/\s+/g, ' ').trim(), fd(x.est)]));
    }
  }

  // ---------- isi kode di XML slide ----------
  const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const textOf = (x) => (x.match(/<a:t>[^<]*<\/a:t>/g) || []).map((t) => unesc(t.slice(5, -6))).join('');
  function scan(xml) {
    const out = new Set();
    (xml.match(/<a:p>[\s\S]*?<\/a:p>/g) || []).forEach((p) => { let mm; const t = textOf(p); TOK.lastIndex = 0; while ((mm = TOK.exec(t))) out.add(mm[1]); });
    return [...out];
  }
  function tableXml(id, name, off, ext, T) {
    const cols = T.head.length, rows = T.rows.length + 1;
    const cx = +ext.cx, cy = +ext.cy;
    // lebar kolom mengikuti panjang isi; ukuran huruf dicari yang terbesar agar semua baris muat di kotak
    const all = [T.head, ...T.rows];
    const lens = T.head.map((_, j) => all.map((r) => String(r[j] == null ? '' : r[j]).length));
    const longWord = T.head.map((_, j) => Math.max(3, ...all.map((r) => Math.max(0, ...String(r[j] == null ? '' : r[j]).split(/\s+/).map((w) => w.length)))));
    const wt = lens.map((l, j) => Math.max(longWord[j] + 1.5, Math.min(40, Math.max(...l) * 0.6)));
    const tw = wt.reduce((x, y) => x + y, 0);
    const widths = wt.map((w) => Math.floor(cx * w / tw));
    const longCol = lens.map((l) => l.slice(1).reduce((x, y) => x + y, 0) / Math.max(1, l.length - 1) > 18);
    const PAD = 10, CW = 0.62, LH = 1.22; // pt: padding kiri+kanan, lebar huruf rata-rata (× ukuran), tinggi baris teks
    const linesAt = (pt, lc = CW) => all.map((r) => Math.max(1, ...r.map((t, j) => {
      const colPt = widths[j] / 12700 - PAD; const words = String(t == null ? '' : t).split(/\s+/);
      if (words.some((w) => w.length * pt * CW > colPt)) return 99;
      let n = 1, cur = 0; words.forEach((w) => { const ww = (w.length + 1) * pt * lc; if (cur + ww > colPt && cur > 0) { n++; cur = ww; } else cur += ww; });
      return n;
    })));
    let pt = 14, lines = linesAt(pt);
    while (pt > 6 && lines.reduce((x, n) => x + n * pt * LH + 3, 0) > cy / 12700) { pt -= 0.5; lines = linesAt(pt); }
    const sz = Math.round(pt * 100);
    lines = linesAt(pt, 0.5); // perkiraan baris untuk membagi tinggi (huruf rata-rata lebih sempit dari batas aman)
    const used = lines.reduce((x, n) => x + n, 0); const rhs = lines.map((n) => Math.floor(cy * n / used));
    let ri = 0; const rh = () => rhs[ri++];
    const ln = (tag) => `<a:${tag} w="6350"><a:solidFill><a:srgbClr val="C9D6EA"/></a:solidFill></a:${tag}>`;
    const cell = (txt, o) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="${o.al}"/><a:r><a:rPr lang="id-ID" sz="${sz}"${o.b ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${o.c}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${esc(txt)}</a:t></a:r></a:p></a:txBody><a:tcPr marL="45720" marR="45720" marT="9144" marB="9144" anchor="ctr">${ln('lnL')}${ln('lnR')}${ln('lnT')}${ln('lnB')}<a:solidFill><a:srgbClr val="${o.f}"/></a:solidFill></a:tcPr></a:tc>`;
    const tr = (cells, o) => `<a:tr h="${rh()}">${cells.map((t, j) => cell(t, { ...o(j), al: j && !longCol[j] ? 'ctr' : 'l' })).join('')}</a:tr>`;
    const body = [tr(T.head, () => ({ b: 1, c: 'FFFFFF', f: '13254A' }))]
      .concat(T.rows.map((r, i) => { const last = T.totalRow && i === T.rows.length - 1; return tr(r, () => ({ b: last ? 1 : 0, c: '13254A', f: last ? 'DCE8F7' : i % 2 ? 'F3F7FC' : 'FFFFFF' })); }));
    return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${off.x}" y="${off.y}"/><a:ext cx="${cx}" cy="${cy}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${widths.map((w) => `<a:gridCol w="${w}"/>`).join('')}</a:tblGrid>${body.join('')}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
  }
  function fill(xml, cat) {
    // 1) kotak teks yang isinya hanya kode tabel → tabel
    xml = xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (sp) => {
      const t = textOf(sp).trim(); const mm = /^\{\{\s*(TABEL_[A-Z0-9_]+)\s*\}\}$/.exec(t);
      if (!mm || !cat.tables[mm[1]]) return sp;
      const off = /<a:off x="(-?\d+)" y="(-?\d+)"\s*\/>/.exec(sp), ext = /<a:ext cx="(\d+)" cy="(\d+)"\s*\/>/.exec(sp);
      if (!off || !ext) return sp;
      const id = (/<p:cNvPr id="(\d+)"/.exec(sp) || [0, 999])[1];
      return tableXml(id, 'Tabel ' + mm[1], { x: off[1], y: off[2] }, { cx: ext[1], cy: ext[2] }, cat.tables[mm[1]]);
    });
    // 2) kode angka/teks di paragraf
    return xml.replace(/<a:p>[\s\S]*?<\/a:p>/g, (p) => {
      if (textOf(p).indexOf('{{') < 0) return p;
      const rep = (t) => t.replace(TOK, (all, k) => (k in cat.values ? cat.values[k] : all));
      // kode utuh di satu run: ganti di tempat agar format tiap run tetap
      p = p.replace(/<a:t>([^<]*)<\/a:t>/g, (all, x) => `<a:t>${esc(rep(unesc(x)))}</a:t>`);
      // kode terpotong di beberapa run (sering terjadi saat diketik di PowerPoint): gabungkan teks paragraf
      const t = textOf(p); const nt = rep(t);
      if (nt === t) return p;
      let first = true;
      return p.replace(/<a:t>[^<]*<\/a:t>/g, () => { const r = first ? `<a:t>${esc(nt)}</a:t>` : '<a:t></a:t>'; first = false; return r; });
    });
  }

  const api = { catalog, scan, fill };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SSSlidesData = api;
})(typeof window !== 'undefined' ? window : globalThis);
