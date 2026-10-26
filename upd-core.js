// Perhitungan ulang dataset bulanan dashboard dari file yang diunggah di tab Update Data Bulanan.
// Fungsi murni (tanpa DOM), juga dipakai untuk uji di Node.
const SSUP = (() => {
  const BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  const UID_ORDER = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const SUMATERA = UID_ORDER.slice(0, 7);
  const k = (s) => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const up = (s) => String(s == null ? '' : s).trim().toUpperCase();
  const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const ulpTitle = (s) => { const t = String(s || '').trim(); if (!t) return ''; const m = /^ULP\s*(.*)$/i.exec(t); return m ? ('ULP ' + words(m[1])).trim() : words(t); };

  // ---------------- CSV ----------------
  function toCSV(cols, rows) {
    const q = (v) => { if (v == null) return ''; const s = String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n') + '\n';
  }
  // Baris seperti yang dibaca dashboard dari file CSV: semua sel berupa teks.
  const asText = (cols, rows) => rows.map((r) => { const o = {}; cols.forEach((c) => { o[c] = r[c] == null ? '' : String(r[c]); }); return o; });

  // ---------------- SAIDI SAIFI: laporan UP3 per bulan ----------------
  const C = ['dist_ggn', 'dist_har', 'dist_bencana', 'dist', 'trans_ggn', 'trans_har', 'trans', 'kit_ggn', 'kit_har', 'kit', 'total'];
  const KS = ['padam_', 'jam_', 'ens_'];
  const NAMA = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const numID = (v) => {
    if (typeof v === 'number') return v;
    if (v == null) return NaN;
    let s = String(v).trim(); if (s === '' || s === '-') return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return Number(s);
  };
  // rows: sheet pertama sebagai array baris (APKT.readTable)
  function parseLaporan(rows) {
    const txt = (r, c) => (rows[r] && rows[r][c] != null ? String(rows[r][c]) : '');
    const warn = [];
    let up3 = '', uid = '', bulan = null, tahun = null, pelanggan = NaN;
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const a = txt(r, 0); let m;
      if ((m = /UNIT PELAKSANA PELAYANAN PELANGGAN\s*:\s*(?:UP3\s*)?(.+)/i.exec(a))) up3 = m[1].trim();
      if ((m = /UNIT INDUK\s*:\s*(?:WILAYAH|UID|UIW)?\s*(.+)/i.exec(a))) uid = m[1].trim();
      if ((m = /^\s*([A-Za-z]+)\s+(\d{4})\s*$/.exec(a)) && NAMA.includes(m[1].toLowerCase())) { bulan = NAMA.indexOf(m[1].toLowerCase()) + 1; tahun = +m[2]; }
      if (/Jumlah Pelanggan/i.test(a)) pelanggan = numID(rows[r][1]);
    }
    if (!up3) throw new Error('Nama UP3 tidak ditemukan (baris "UNIT PELAKSANA PELAYANAN PELANGGAN : …").');
    if (!bulan) throw new Error('Bulan laporan tidak ditemukan (baris seperti "Oktober 2026").');
    if (!(pelanggan > 0)) throw new Error('Jumlah pelanggan tidak terbaca.');
    const lab = rows.map((r) => (r && r[1] != null ? String(r[1]).replace(/\s+/g, ' ').trim().toUpperCase() : ''));
    const find = (label, from = 0, to = lab.length) => { for (let i = from; i < to; i++) if (lab[i] === label) return i; return -1; };
    const iDist = find('TOTAL KELOMPOK DISTRIBUSI'), iTrans = find('TOTAL KELOMPOK TRANSMISI'), iKit = find('TOTAL KELOMPOK PEMBANGKIT'), iTot = find('TOTAL KESELURUHAN');
    if ([iDist, iTrans, iKit, iTot].some((i) => i < 0)) throw new Error('Format tidak dikenali: baris TOTAL KELOMPOK Distribusi/Transmisi/Pembangkit atau TOTAL KESELURUHAN tidak lengkap.');
    const idx = {
      dist_ggn: find('TOTAL SUB KELOMPOK PADAM TIDAK TERENCANA', 0, iDist), dist_har: find('TOTAL SUB KELOMPOK PADAM TERENCANA', 0, iDist),
      dist_bencana: find('TOTAL SUB KELOMPOK BENCANA ALAM', 0, iDist), dist: iDist,
      trans_ggn: find('TOTAL SUB KELOMPOK KELOMPOK TIDAK TERENCANA (UNPLANNED)', iDist, iTrans), trans_har: find('TOTAL SUB KELOMPOK KELOMPOK TERENCANA (PLANNED)', iDist, iTrans), trans: iTrans,
      kit_ggn: find('TOTAL SUB KELOMPOK KELOMPOK TIDAK TERENCANA (UNPLANNED)', iTrans, iKit), kit_har: find('TOTAL SUB KELOMPOK KELOMPOK TERENCANA (PLANNED)', iTrans, iKit), kit: iKit,
      total: iTot,
    };
    const missing = Object.entries(idx).filter(([, i]) => i < 0).map(([x]) => x);
    if (missing.length) throw new Error('Baris subtotal tidak ditemukan: ' + missing.join(', '));
    const rec = { tahun, bulan, up3_file: up3, uid_file: uid, pelanggan };
    for (const c of C) {
      const r = rows[idx[c]] || [];
      rec['padam_' + c] = numID(r[2]); rec['jam_' + c] = numID(r[3]); rec['ens_' + c] = numID(r[8]);
      for (const p of KS) if (!isFinite(rec[p + c])) throw new Error(`Nilai ${p}${c} tidak berupa angka.`);
    }
    const near = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005);
    for (const p of KS) {
      if (!near(rec[p + 'dist_ggn'] + rec[p + 'dist_har'] + rec[p + 'dist_bencana'], rec[p + 'dist'])) warn.push(`Distribusi (${p.slice(0, -1)}) tidak sama dengan gangguan + pemeliharaan + bencana`);
      if (!near(rec[p + 'dist'] + rec[p + 'trans'] + rec[p + 'kit'], rec[p + 'total'])) warn.push(`Total (${p.slice(0, -1)}) tidak sama dengan Distribusi + Transmisi + Pembangkit`);
    }
    return { rec, warn };
  }
  // Nama UP3 di laporan yang berbeda dari nama unit dashboard.
  const ALIAS_UP3 = { MUAROBUNGO: 'Muara Bungo', MUARABUNGO: 'Muara Bungo', PADANGSIDIMPUAN: 'Padang Sidempuan', KOTABARU: 'Tanah Bumbu', BELITUNG: 'Tanjung Pandan / Belitung', TANJUNGPANDAN: 'Tanjung Pandan / Belitung', TANJUNGPANDANBELITUNG: 'Tanjung Pandan / Belitung', KALTARA: 'Kalimantan Utara', BUKITTINGGI: 'Bukittinggi', LUBUKPAKAM: 'Lubuk Pakam', TANJUNGPINANG: 'Tanjung Pinang', TANJUNGKARANG: 'Tanjung Karang', KUALAKAPUAS: 'Kuala Kapuas', PANGKALANBUN: 'Pangkalanbun', PALANGKARAYA: 'Palangkaraya', PEMATANGSIANTAR: 'Pematang Siantar', SUBULUSSALAM: 'Subulussalam' };
  function unitsFrom(bulanan) {
    const seen = new Map();
    bulanan.forEach((r) => { if (r.level === 'UP3' && !seen.has(r.unit)) seen.set(r.unit, { unit: r.unit, uid: r.uid }); });
    return [...seen.values()].sort((a, b) => UID_ORDER.indexOf(a.uid) - UID_ORDER.indexOf(b.uid));
  }
  function matchUnit(units, name) {
    const n = k(String(name).replace(/^UP3\s+/i, ''));
    if (ALIAS_UP3[n]) { const u = units.find((x) => x.unit === ALIAS_UP3[n]); if (u) return u; }
    return units.find((u) => k(u.unit) === n) || null;
  }
  // bulanan: baris dataset bulanan saat ini; recs: [{tahun, bulan, unit, pelanggan, padam_*, jam_*, ens_*}]
  function saidiMerge(bulanan, kumulatif, recs) {
    const units = unitsFrom(bulanan);
    const uidOf = new Map(units.map((u) => [u.unit, u.uid]));
    const years = [...new Set(recs.map((r) => r.tahun))];
    const key = (t, m, u) => `${t}|${m}|${u}`;
    const up3 = new Map();
    bulanan.forEach((r) => { if (r.level === 'UP3') up3.set(key(r.tahun, r.bulan, r.unit), r); });
    for (const r of recs) {
      const o = { tahun: r.tahun, unit: r.unit, uid: uidOf.get(r.unit), level: 'UP3', bulan: r.bulan, pelanggan: r.pelanggan };
      for (const c of C) for (const p of KS) o[p + c] = r[p + c];
      up3.set(key(r.tahun, r.bulan, r.unit), o);
    }
    const groups = {}; UID_ORDER.forEach((g) => { groups[g] = units.filter((u) => u.uid === g).map((u) => u.unit); });
    const aggDefs = [...UID_ORDER.map((g) => [g, g, 'UID', groups[g]]), ['SUMATERA', 'SUMATERA', 'Wilayah', SUMATERA.flatMap((g) => groups[g])], ['KALIMANTAN', 'KALIMANTAN', 'Wilayah', UID_ORDER.slice(7).flatMap((g) => groups[g])], ['SUMKAL', 'SUMKAL', 'Sumkal', units.map((u) => u.unit)]];
    // nama baris agregat mengikuti data yang sudah ada
    const aggName = {};
    bulanan.forEach((r) => { if (r.level !== 'UP3') aggName[r.uid + '|' + r.level] = { unit: r.unit, uid: r.uid }; });
    const outB = bulanan.filter((r) => !years.includes(r.tahun));
    const outK = kumulatif.filter((r) => !years.includes(r.tahun));
    const incomplete = [];
    for (const t of years) {
      const months = [...new Set([...up3.values()].filter((r) => r.tahun === t).map((r) => r.bulan))].sort((a, b) => a - b);
      const monthly = [];
      for (const m of months) {
        for (const u of units) { const r = up3.get(key(t, m, u.unit)); if (r) monthly.push(r); }
        for (const [code, , level, members] of aggDefs) {
          const rs = members.map((x) => up3.get(key(t, m, x)));
          if (rs.some((x) => !x)) { if (level === 'Sumkal') incomplete.push({ tahun: t, bulan: m, ada: rs.filter(Boolean).length, perlu: rs.length }); continue; }
          const nm = aggName[code + '|' + level] || { unit: code, uid: code };
          const o = { tahun: t, unit: nm.unit, uid: nm.uid, level, bulan: m, pelanggan: rs.reduce((a, r) => a + r.pelanggan, 0) };
          for (const c of C) for (const p of KS) o[p + c] = Math.round(rs.reduce((a, r) => a + r[p + c], 0) * 1e4) / 1e4;
          monthly.push(o);
        }
      }
      const byUnit = new Map();
      monthly.forEach((r) => { const id = r.level + '|' + r.unit; if (!byUnit.has(id)) byUnit.set(id, []); byUnit.get(id).push(r); });
      const cum = [];
      for (const lst of byUnit.values()) {
        lst.sort((a, b) => a.bulan - b.bulan);
        const acc = {};
        for (const r of lst) {
          for (const c of C) for (const p of KS) acc[p + c] = (acc[p + c] || 0) + r[p + c];
          const o = { tahun: t, unit: r.unit, uid: r.uid, level: r.level, bulan: r.bulan };
          for (const c of C) {
            o['saidi_' + c] = Math.round(acc['jam_' + c] / r.pelanggan * 60 * 1e4) / 1e4;
            o['saifi_' + c] = Math.round(acc['padam_' + c] / r.pelanggan * 1e5) / 1e5;
            o['ens_' + c] = acc['ens_' + c];
          }
          cum.push(o);
        }
      }
      outB.push(...monthly); outK.push(...cum);
    }
    const lv = { UP3: 0, UID: 1, Wilayah: 2, Sumkal: 3 };
    const sorter = (a, b) => a.tahun - b.tahun || a.bulan - b.bulan || lv[a.level] - lv[b.level] || UID_ORDER.indexOf(a.uid) - UID_ORDER.indexOf(b.uid);
    outB.sort(sorter); outK.sort(sorter);
    return { bulanan: outB, kumulatif: outK, incomplete };
  }

  // ---------------- Gangguan APKT + penyulang ----------------
  // ULP yang tidak ada di database penyulang (atau namanya berbeda), dipetakan ke UP3 dashboard.
  const ULP_MANUAL = {
    'ACEH|ULP MATANGGLPDUA': 'Lhokseumawe',
    'KALBAR|ULP KOTA': 'Pontianak', 'KALBAR|ULP SEIDURI': 'Singkawang', 'KALBAR|ULP SUKADANA (KALBAR)': 'Ketapang',
    'KALSELTENG|ULP AHMAD YANI': 'Banjarmasin', 'KALSELTENG|ULP MANGKURAT': 'Banjarmasin', 'KALSELTENG|ULP MARTAPURA (UIW KALSELTENG)': 'Banjarmasin',
    'KALSELTENG|ULP BARABAI': 'Barabai', 'KALSELTENG|ULP DAHA': 'Barabai', 'KALSELTENG|ULP KUALA KAPUAS': 'Kuala Kapuas',
    'KALSELTENG|ULP BATULICIN': 'Tanah Bumbu', 'KALSELTENG|ULP KOTABARU': 'Tanah Bumbu', 'KALSELTENG|ULP SATUI': 'Tanah Bumbu',
    'KALTIMRA|ULPSANGATTA': 'Bontang', 'KALTIMRA|ULP KOTA BANGUN': 'Samarinda', 'KALTIMRA|ULP MELAK': 'Samarinda', 'KALTIMRA|ULP SAMARINDA ILIR': 'Samarinda',
    'KALTIMRA|ULP SAMARINDA KOTA': 'Samarinda', 'KALTIMRA|ULP SAMARINDA SEBERANG': 'Samarinda', 'KALTIMRA|ULP SAMARINDA ULU': 'Samarinda', 'KALTIMRA|ULP TENGGARONG': 'Samarinda',
    'LAMPUNG|ULP SUKADANA (LAMPUNG)': 'Metro',
    'S2JB|ULP TEBING TINGGI': 'Lubuk Linggau', 'S2JB|ULP KERSIK TUO': 'Muara Bungo',
    'SUMBAR|ULP TUA PEJAT': 'Padang', 'SUMBAR|ULP SILUNGKANG': 'Solok', 'SUMBAR|ULP SINGKARAK': 'Solok',
    'SUMUT|ULP PANCURBATU': 'Bukit Barisan', 'SUMUT|ULP SIDIMPUAN KOTA': 'Padang Sidempuan', 'SUMUT|ULP PEMATANG RAYA': 'Pematang Siantar',
    'SUMUT|ULP KOTAPINANG': 'Rantau Prapat', 'SUMUT|ULP RANTAU KOTA': 'Rantau Prapat', 'SUMUT|ULP SIBORONG-BORONG': 'Sibolga',
  };
  const PROFIL_TO_UNIT = { BELITUNG: 'TANJUNGPANDANBELITUNG', PADANGSIDIMPUAN: 'PADANGSIDEMPUAN' };
  // P/S: P atau PERMANEN = Permanen, S atau SESAAT = Sesaat
  const psKey = (s) => { const v = up(s); return v === 'P' || v.startsWith('PERMANEN') ? 'Permanen' : v === 'S' || v.startsWith('SESAAT') ? 'Sesaat' : null; };
  const PRE = /^(MVCABLE|MV CABLE|MV-CABLE|CELL|FEEDER|PENYULANG|PNY|PYL|F\.?\d*)[\s_.]+/;
  const n1 = (s) => k(s);
  const n2 = (s) => { let t = String(s || '').toUpperCase().trim(); for (let i = 0; i < 4; i++) t = t.replace(PRE, ''); return k(t); };

  // Indeks dari profil penyulang (baris di_database = Ya).
  function penyIndex(profil) {
    const ya = profil.filter((r) => r.di_database === 'Ya');
    const disp = new Map(); const uidOfKey = new Map();
    ya.forEach((r) => { const kk = k(r.up3); if (!disp.has(kk)) disp.set(kk, r.up3); if (r.uid && !uidOfKey.has(kk)) uidOfKey.set(kk, r.uid); });
    // ULP -> UP3 (modus; bila seri, kunci terkecil)
    const cnt = new Map();
    ya.forEach((r) => { const u = up(r.ulp); if (!u) return; const m = cnt.get(u) || new Map(); m.set(k(r.up3), (m.get(k(r.up3)) || 0) + 1); cnt.set(u, m); });
    const ulpMode = new Map();
    for (const [u, m] of cnt) { let best = null, bn = -1; for (const [kk, n] of [...m].sort((a, b) => (a[0] < b[0] ? -1 : 1))) if (n > bn) { best = kk; bn = n; } ulpMode.set(u, best); }
    // ULP -> UP3 per UID (untuk gangguan per UP3)
    const cntU = new Map();
    ya.forEach((r) => { const u = up(r.ulp); if (!u || !r.uid) return; const id = r.uid + '|' + u; const m = cntU.get(id) || new Map(); m.set(k(r.up3), (m.get(k(r.up3)) || 0) + 1); cntU.set(id, m); });
    const ulpModeUid = new Map();
    for (const [id, m] of cntU) { let best = null, bn = -1; for (const [kk, n] of [...m].sort((a, b) => (a[0] < b[0] ? -1 : 1))) if (n > bn) { best = kk; bn = n; } ulpModeUid.set(id, best); }
    // nama unik dalam UID
    const uniq = (fn) => { const m = new Map(); ya.forEach((r) => { if (!r.uid) return; const id = r.uid + '|' + fn(r.penyulang); const s = m.get(id) || new Set(); s.add(k(r.up3)); m.set(id, s); }); const o = new Map(); for (const [id, s] of m) o.set(id, s.size === 1 ? [...s][0] : null); return o; };
    const u1 = uniq(n1), u2 = uniq(n2);
    const fid1 = new Map(), fid2 = new Map();
    ya.forEach((r) => { const kk = k(r.up3); const a = kk + '|' + n1(r.penyulang), b = kk + '|' + n2(r.penyulang); if (!fid1.has(a)) fid1.set(a, r.penyulang); if (!fid2.has(b)) fid2.set(b, r.penyulang); });
    const inDb = new Set(ya.map((r) => r.up3 + '|' + r.penyulang));
    return { disp, uidOfKey, ulpMode, ulpModeUid, u1, u2, fid1, fid2, inDb };
  }
  function feederOf(ix, unit, ulp, peny) {
    const a = n1(peny), b = n2(peny);
    let upk = ix.ulpMode.get(ulp) || null;
    if (!upk) upk = ix.u1.get(unit + '|' + a) || ix.u2.get(unit + '|' + b) || null;
    let f = upk ? ix.fid1.get(upk + '|' + a) || ix.fid2.get(upk + '|' + b) || null : null;
    if (!f) {
      const alt = ix.u1.get(unit + '|' + a) || ix.u2.get(unit + '|' + b) || null;
      const altF = alt ? ix.fid1.get(alt + '|' + a) || ix.fid2.get(alt + '|' + b) || null : null;
      if (altF) upk = alt;
      f = altF;
    }
    const up3 = upk ? ix.disp.get(upk) || words(upk) : `UID ${unit} (UP3 tidak dikenali)`;
    return { up3, penyulang: f || peny, matched: !!f, uid: (upk && ix.uidOfKey.get(upk)) || unit };
  }
  function up3Namer(ix, units) {
    const byUidKey = new Map(units.map((u) => [u.uid + '|' + k(u.unit), u.unit]));
    return (unit, ulp) => {
      const man = ULP_MANUAL[unit + '|' + ulp]; if (man) return man;
      const pk = ix.ulpModeUid.get(unit + '|' + ulp);
      if (pk) { const nm = byUidKey.get(unit + '|' + (PROFIL_TO_UNIT[pk] || pk)); if (nm) return nm; }
      return `UP3 tidak dikenali (${unit})`;
    };
  }
  // apkt: hasil APKT.read; months: bulan yang diganti; cur: {gangguan, gangguan_up3, peny_bulanan, peny_profil} (baris dataset saat ini, teks);
  // units: [{unit, uid}] UP3 dashboard.
  function gangguanMerge(cur, apkt, months, units) {
    const ms = new Set(months.map(Number));
    const g = cur.gangguan.filter((r) => !ms.has(+r.BULAN_NO));
    const gu = cur.gangguan_up3.filter((r) => !ms.has(+r.BULAN_NO));
    const pb = cur.peny_bulanan.filter((r) => !ms.has(+r.bulan));
    const gps = (cur.gangguan_ps || []).filter((r) => !ms.has(+r.BULAN_NO));
    const gdp = (cur.gangguan_dupont || []).filter((r) => !apkt.hasDupont || !ms.has(+r.BULAN_NO));
    const ix = penyIndex(cur.peny_profil);
    const namer = up3Namer(ix, units);
    const tidakNew = new Map(); // up3|penyulang -> {uid, ulpCount}
    for (const m of [...ms].sort((a, b) => a - b)) {
      const p = apkt.perMonth[m]; if (!p) continue;
      p.rows.forEach(([kode, bidang, jenis, unit, n]) => g.push({ KODE: kode, BIDANG: bidang, JENIS_PADAM: jenis, UNIT: unit, BULAN: BULAN[m - 1], BULAN_NO: m, JUMLAH: n }));
      const aggU = new Map(), aggP = new Map(), aggS = new Map();
      for (const [kode, bidang, jenis, unit, ulp, peny, ps, n] of p.detail) {
        const u3 = namer(unit, ulp);
        const ku = [kode, bidang, jenis, unit, u3].join('\u0001'); aggU.set(ku, (aggU.get(ku) || 0) + n);
        const psk = psKey(ps); if (psk) { const ks = [kode, bidang, unit, u3, psk].join('\u0001'); aggS.set(ks, (aggS.get(ks) || 0) + n); }
        if (!peny) continue;
        const f = feederOf(ix, unit, ulp, peny);
        const kp = [f.up3, f.penyulang, words(jenis), words(ps)].join('\u0001'); aggP.set(kp, (aggP.get(kp) || 0) + n);
        if (!f.matched) { const id = f.up3 + '|' + f.penyulang; const t = tidakNew.get(id) || { up3: f.up3, penyulang: f.penyulang, uid: f.uid, ulp: new Map() }; t.ulp.set(ulp, (t.ulp.get(ulp) || 0) + n); tidakNew.set(id, t); }
      }
      for (const [kk, n] of aggU) { const [kode, bidang, jenis, unit, u3] = kk.split('\u0001'); gu.push({ KODE: kode, BIDANG: bidang, JENIS_PADAM: jenis, UNIT: unit, UP3: u3, BULAN_NO: m, JUMLAH: n }); }
      if (apkt.hasDupont && p.dupont) { const aggD = new Map(); for (const [unit, ulp, bidang, jenis, fas, sub, eq, cause, n] of p.dupont) { const kd = [unit, namer(unit, ulp), bidang, jenis, fas, sub, eq, cause].join('\u0001'); aggD.set(kd, (aggD.get(kd) || 0) + n); }
        for (const [kk, n] of aggD) { const [unit, u3, bidang, jenis, fas, sub, eq, cause] = kk.split('\u0001'); gdp.push({ UNIT: unit, UP3: u3, BULAN_NO: m, BIDANG: bidang, JENIS_PADAM: jenis, FASILITAS: fas, SUB_FASILITAS: sub, EQUIPMENT: eq, CAUSE: cause, JUMLAH: n }); } }
      for (const [kk, n] of aggS) { const [kode, bidang, unit, u3, ps] = kk.split('\u0001'); gps.push({ KODE: kode, BIDANG: bidang, UNIT: unit, UP3: u3, BULAN_NO: m, PS: ps, JUMLAH: n }); }
      for (const [kk, n] of aggP) { const [u3, peny, jenis, ps] = kk.split('\u0001'); pb.push({ up3: u3, penyulang: peny, bulan: m, jenis_padam: jenis, ps, kali: n }); }
    }
    const sortG = (a, b) => (a.KODE + a.BIDANG + a.JENIS_PADAM + a.UNIT < b.KODE + b.BIDANG + b.JENIS_PADAM + b.UNIT ? -1 : a.KODE + a.BIDANG + a.JENIS_PADAM + a.UNIT > b.KODE + b.BIDANG + b.JENIS_PADAM + b.UNIT ? 1 : +a.BULAN_NO - +b.BULAN_NO);
    g.sort(sortG);
    gu.sort((a, b) => sortG(a, b) || (a.UP3 < b.UP3 ? -1 : a.UP3 > b.UP3 ? 1 : 0));
    pb.sort((a, b) => (a.up3 < b.up3 ? -1 : a.up3 > b.up3 ? 1 : a.penyulang < b.penyulang ? -1 : a.penyulang > b.penyulang ? 1 : +a.bulan - +b.bulan));
    const profil = rebuildTidak(cur.peny_profil, pb, ix, tidakNew);
    const gk = (r) => r.UNIT + '|' + r.UP3 + '|' + r.KODE + '|' + r.BIDANG + '|' + r.PS; gps.sort((a, b) => (gk(a) < gk(b) ? -1 : gk(a) > gk(b) ? 1 : +a.BULAN_NO - +b.BULAN_NO));
    const dk = (r) => [r.UNIT, r.UP3, r.BIDANG, r.JENIS_PADAM, r.FASILITAS, r.SUB_FASILITAS, r.EQUIPMENT, r.CAUSE].join('|'); gdp.sort((a, b) => (dk(a) < dk(b) ? -1 : dk(a) > dk(b) ? 1 : +a.BULAN_NO - +b.BULAN_NO));
    return { gangguan_dupont: gdp, gangguan: g, gangguan_up3: gu, gangguan_ps: gps, peny_bulanan: pb, peny_profil: profil };
  }
  // Baris di_database = Tidak: penyulang di data gangguan yang tidak ada di database.
  function rebuildTidak(profil, pb, ix, tidakNew) {
    const ya = profil.filter((r) => r.di_database === 'Ya');
    const old = new Map(profil.filter((r) => r.di_database !== 'Ya').map((r) => [r.up3 + '|' + r.penyulang, r]));
    const seen = new Set(); const tidak = [];
    pb.forEach((r) => {
      const id = r.up3 + '|' + r.penyulang; if (seen.has(id) || ix.inDb.has(id)) return; seen.add(id);
      if (old.has(id)) { tidak.push(old.get(id)); return; }
      const t = tidakNew && tidakNew.get(id);
      let ulp = ''; if (t) { let bn = -1; for (const [u, n] of t.ulp) if (n > bn) { ulp = u; bn = n; } }
      tidak.push({ up3: r.up3, uid: t ? t.uid : '', penyulang: r.penyulang, ulp: ulpTitle(ulp), jenis: '', tipe: '', kepemilikan: '', status: '', tahun_buat: '', lat: '', lon: '', di_database: 'Tidak' });
    });
    tidak.sort((a, b) => (a.up3 < b.up3 ? -1 : a.up3 > b.up3 ? 1 : a.penyulang < b.penyulang ? -1 : 1));
    return [...ya, ...tidak];
  }

  // ---------------- Database penyulang (Penyulang.xlsx) ----------------
  const UP3UID = { BALIKPAPAN: 'KALTIMRA', BANDAACEH: 'ACEH', BANGKA: 'BABEL', BANGKINANG: 'RKR', BANJARMASIN: 'KALSELTENG', BARABAI: 'KALSELTENG', BENGKULU: 'S2JB', BERAU: 'KALTIMRA', BINJAI: 'SUMUT', BONTANG: 'KALTIMRA', BUKITBARISAN: 'SUMUT', BUKITTINGGI: 'SUMBAR', DUMAI: 'RKR', JAMBI: 'S2JB', KALIMANTANUTARA: 'KALTIMRA', KETAPANG: 'KALBAR', KOTABUMI: 'LAMPUNG', KUALAKAPUAS: 'KALSELTENG', LAHAT: 'S2JB', LANGSA: 'ACEH', LHOKSEUMAWE: 'ACEH', LUBUKLINGGAU: 'S2JB', LUBUKPAKAM: 'SUMUT', MEDAN: 'SUMUT', MEDANUTARA: 'SUMUT', MEMPAWAH: 'KALBAR', METRO: 'LAMPUNG', MEULABOH: 'ACEH', MUARABUNGO: 'S2JB', NIAS: 'SUMUT', NUSANTARA: 'KALTIMRA', OGANILIR: 'S2JB', PADANG: 'SUMBAR', PADANGSIDIMPUAN: 'SUMUT', PALANGKARAYA: 'KALSELTENG', PALEMBANG: 'S2JB', PANGKALANBUN: 'KALSELTENG', PAYAKUMBUH: 'SUMBAR', PEKANBARU: 'RKR', PEMATANGSIANTAR: 'SUMUT', PONTIANAK: 'KALBAR', PRINGSEWU: 'LAMPUNG', RANTAUPRAPAT: 'SUMUT', RENGAT: 'RKR', SANGGAU: 'KALBAR', SIBOLGA: 'SUMUT', SIGLI: 'ACEH', SINGKAWANG: 'KALBAR', SOLOK: 'SUMBAR', SUBULUSSALAM: 'ACEH', TANJUNGKARANG: 'LAMPUNG', BELITUNG: 'BABEL', TANJUNGPINANG: 'RKR' };
  const KEEP_UP = new Set(['GI', 'KIT', 'VIP', 'PLN', '20KV']);
  const cap = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).map((w) => (KEEP_UP.has(w.toUpperCase()) ? (w.toUpperCase() === '20KV' ? '20kV' : w.toUpperCase()) : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');
  // rows: sheet pertama Penyulang.xlsx (baris judul + baris atribut per penyulang)
  function parsePenyulangDb(rows) {
    const hi = rows.findIndex((r) => r && r.some((v) => String(v || '').trim() === 'Nama Unit Parent') && r.some((v) => String(v || '').trim() === 'Description'));
    if (hi < 0) throw new Error('Kolom "Nama Unit Parent" dan "Description" tidak ditemukan. Pastikan sheet pertama adalah daftar penyulang.');
    const H = rows[hi].map((v) => String(v == null ? '' : v).trim());
    const col = (n) => H.indexOf(n);
    const need = ['Nama Unit Parent', 'Description', 'Nama Unit', 'Assetattrid', 'Alnvaluedesc', 'Status'];
    const miss = need.filter((n) => col(n) < 0); if (miss.length) throw new Error('Kolom tidak ditemukan: ' + miss.join(', '));
    const cTh = col('Tahunbuat') >= 0 ? col('Tahunbuat') : col('Th Buat');
    const cLat = col('Latitudey'), cLon = col('Longitudex');
    const S = (r, c) => (c < 0 || r[c] == null ? '' : String(r[c]).trim());
    const feeders = new Map();
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue;
      const parent = S(r, col('Nama Unit Parent')), desc = S(r, col('Description'));
      if (!parent || !desc) continue;
      const up3 = words(parent.replace(/^UP3\s+/i, ''));
      const id = up3 + '|' + desc;
      let f = feeders.get(id);
      if (!f) {
        const th = Number(S(r, cTh)); const la = Number(S(r, cLat)), lo = Number(S(r, cLon));
        f = { up3, uid: UP3UID[k(up3)] || '', penyulang: desc, ulp: ulpTitle(S(r, col('Nama Unit'))), jenis: '', tipe: '', kepemilikan: '', status: cap(S(r, col('Status'))), tahun_buat: th > 0 ? String(Math.round(th)) : '', lat: S(r, cLat) !== '' && isFinite(la) ? String(Math.round(la * 1e6) / 1e6) : '', lon: S(r, cLon) !== '' && isFinite(lo) ? String(Math.round(lo * 1e6) / 1e6) : '', di_database: 'Ya' };
        feeders.set(id, f);
      }
      const attr = S(r, col('Assetattrid')).toUpperCase(), val = S(r, col('Alnvaluedesc'));
      if (attr === 'JENIS_PENYULANG' && val) f.jenis = cap(val);
      if (attr === 'TYPE_PENYULANG' && val) f.tipe = cap(val);
      if (attr === 'STATUS_KEPEMILIKAN' && val) f.kepemilikan = val.toUpperCase();
    }
    if (!feeders.size) throw new Error('Tidak ada baris penyulang yang terbaca.');
    return [...feeders.values()];
  }
  // Ganti baris Ya di profil, cocokkan ulang penyulang di data gangguan yang belum cocok.
  function penyulangMerge(cur, yaRows) {
    const keep = cur.peny_profil.filter((r) => r.di_database !== 'Ya');
    const profil0 = [...yaRows, ...keep];
    const ix = penyIndex(profil0);
    const agg = new Map(); let rematched = 0;
    cur.peny_bulanan.forEach((r) => {
      let up3 = r.up3, peny = r.penyulang;
      if (!ix.inDb.has(up3 + '|' + peny)) {
        const upk = k(up3);
        const f = ix.fid1.get(upk + '|' + n1(peny)) || ix.fid2.get(upk + '|' + n2(peny));
        if (f) { peny = f; rematched += +r.kali; }
      }
      const id = [up3, peny, r.bulan, r.jenis_padam, r.ps].join('\u0001');
      agg.set(id, (agg.get(id) || 0) + Number(r.kali));
    });
    const pb = [...agg].map(([id, n]) => { const [up3, penyulang, bulan, jenis_padam, ps] = id.split('\u0001'); return { up3, penyulang, bulan: +bulan, jenis_padam, ps, kali: n }; });
    pb.sort((a, b) => (a.up3 < b.up3 ? -1 : a.up3 > b.up3 ? 1 : a.penyulang < b.penyulang ? -1 : a.penyulang > b.penyulang ? 1 : a.bulan - b.bulan));
    const profil = rebuildTidak(profil0, pb, ix, null);
    return { peny_profil: profil, peny_bulanan: pb, rematched };
  }

  // ---------------- Koreksi & cleansing (Master KC) ----------------
  const DIST_UID = [[/S2JB|SUMATERA SELATAN/, 'S2JB'], [/SUMATERA BARAT/, 'SUMBAR'], [/SUMATERA UTARA/, 'SUMUT'], [/RIAU/, 'RKR'], [/ACEH/, 'ACEH'], [/KALIMANTAN BARAT/, 'KALBAR'], [/LAMPUNG/, 'LAMPUNG'], [/KALIMANTAN TIMUR/, 'KALTIMRA'], [/KALIMANTAN SELATAN|KALSELTENG/, 'KALSELTENG'], [/BANGKA|BABEL/, 'BABEL']];
  // rows: sheet pertama Master KC; units: [{unit, uid}] UP3 dashboard.
  function kcParse(rows, units) {
    const hi = rows.findIndex((r) => r && r.some((v) => String(v || '').trim() === 'Jenis Transaksi') && r.some((v) => String(v || '').trim() === 'Area'));
    if (hi < 0) throw new Error('Baris judul kolom (Jenis Transaksi, Distribusi, Area, …) tidak ditemukan.');
    const H = rows[hi].map((v) => String(v == null ? '' : v).trim());
    const col = (n) => H.indexOf(n);
    const need = ['Jenis Transaksi', 'Distribusi', 'Area', 'Tanggal Approval 2', 'Tahun Bulan'];
    const miss = need.filter((n) => col(n) < 0); if (miss.length) throw new Error('Kolom tidak ditemukan: ' + miss.join(', '));
    const cK = col('KODE J'); const dup = 0;
    const S = (r, c) => (c < 0 || r[c] == null ? '' : String(r[c]).trim());
    const agg = new Map(); const unknown = new Map(); let total = 0, approved = 0, tahun = null;
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i]; if (!r || !S(r, col('Jenis Transaksi'))) continue;
      total++;
      if (!S(r, col('Tanggal Approval 2'))) continue;
      const jt = up(S(r, col('Jenis Transaksi')));
      const jenis = jt.startsWith('KOREKSI') ? 'Koreksi' : jt.startsWith('CLEANSING') ? 'Cleansing' : null;
      const tb = Number(S(r, col('Tahun Bulan'))); const m = tb % 100;
      if (!jenis || !(m >= 1 && m <= 12)) continue;
      tahun = tahun || Math.floor(tb / 100);
      const area = S(r, col('Area')); const u = matchUnit(units, area);
      const dist = up(S(r, col('Distribusi'))); const du = (DIST_UID.find(([re]) => re.test(dist)) || [])[1];
      if (!u) { unknown.set(area, (unknown.get(area) || 0) + 1); continue; }
      approved++;
      const kode = up(S(r, cK)) || '-';
      const id = [du || u.uid, u.unit, kode, jenis, m].join('\u0001'); agg.set(id, (agg.get(id) || 0) + 1);
    }
    if (!approved) throw new Error('Tidak ada event dengan Tanggal Approval 2 terisi.');
    const out = [...agg].map(([id, n]) => { const [UID, UP3, KODE, JENIS, BULAN_NO] = id.split('\u0001'); return { UID, UP3, KODE, JENIS, BULAN_NO: +BULAN_NO, JUMLAH: n }; });
    out.sort((a, b) => (a.UID + a.UP3 + a.KODE + a.JENIS < b.UID + b.UP3 + b.KODE + b.JENIS ? -1 : a.UID + a.UP3 + a.KODE + a.JENIS > b.UID + b.UP3 + b.KODE + b.JENIS ? 1 : a.BULAN_NO - b.BULAN_NO));
    return { rows: out, total, approved, dup, tahun, unknown: [...unknown] };
  }

  const COLS = {
    gangguan: ['KODE', 'BIDANG', 'JENIS_PADAM', 'UNIT', 'BULAN', 'BULAN_NO', 'JUMLAH'],
    gangguan_up3: ['KODE', 'BIDANG', 'JENIS_PADAM', 'UNIT', 'UP3', 'BULAN_NO', 'JUMLAH'],
    peny_bulanan: ['up3', 'penyulang', 'bulan', 'jenis_padam', 'ps', 'kali'],
    peny_profil: ['up3', 'uid', 'penyulang', 'ulp', 'jenis', 'tipe', 'kepemilikan', 'status', 'tahun_buat', 'lat', 'lon', 'di_database'],
    gangguan_ps: ['KODE', 'BIDANG', 'UNIT', 'UP3', 'BULAN_NO', 'PS', 'JUMLAH'],
    gangguan_dupont: ['UNIT', 'UP3', 'BULAN_NO', 'BIDANG', 'JENIS_PADAM', 'FASILITAS', 'SUB_FASILITAS', 'EQUIPMENT', 'CAUSE', 'JUMLAH'],
    kc_bulanan: ['UID', 'UP3', 'KODE', 'JENIS', 'BULAN_NO', 'JUMLAH'],
  };
  return { kcParse, parseLaporan, unitsFrom, matchUnit, saidiMerge, gangguanMerge, parsePenyulangDb, penyulangMerge, toCSV, asText, COLS, C, BULAN, k };
})();
if (typeof window !== 'undefined') window.SSUP = SSUP;
if (typeof module !== 'undefined') module.exports = { SSUP };
