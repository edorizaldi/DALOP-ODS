// Laporan harian: sheet "Detil Kode" -> gangguan kode J per penyulang bulan berjalan (dipakai tab Health Index Penyulang).
// No. Laporan unik (baris pertama yang muncul), KODE = J, P/S = P (permanen) atau S (sesaat).
// parse(rows) -> { baris, unik, ev, bulan }; forMonth(det, tgl) -> { tahun, bulan, dari, sampai, j, rows: [[UID, ULP, PENYULANG, permanen, sesaat], ...] }
// untuk bulan dari tanggal realisasi (bulan berjalan), kejadian s.d. tanggal itu.
(function () {
  const UNITS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const ALIAS = { KSKT: 'KALSELTENG', RIAU: 'RKR', RIAUKEPRI: 'RKR', BANGKABELITUNG: 'BABEL', KALSELTENG: 'KALSELTENG' };
  const str = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
  const uidKey = (s) => { const u = str(s).toUpperCase().replace(/^UI[DW]\s+/, '').replace(/[^A-Z0-9]/g, ''); return UNITS.includes(u) ? u : ALIAS[u] || null; };
  const isoDate = (v) => {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
    if (typeof v === 'number' && v > 20000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
    const s = str(v); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0];
    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };
  const ulpName = (s) => str(s).toUpperCase().replace(/^ULP\s+/, '');
  function parse(rows) {
    const hi = rows.findIndex((r) => r && r.some((c) => /^NO\.?\s*LAPORAN$/i.test(str(c))) && r.some((c) => /^KODE$/i.test(str(c))));
    if (hi < 0) throw new Error('sheet Detil Kode: judul kolom NO. LAPORAN / KODE tidak ditemukan');
    const H = rows[hi].map((c) => str(c).toUpperCase());
    const col = (re) => H.findIndex((h) => re.test(h));
    const cU = col(/^UID$/), cN = col(/^NO\.?\s*LAPORAN$/), cL = col(/^ULP$/), cP = col(/^PENYULANG$/), cS = col(/^P\s*\/\s*S$/), cK = col(/^KODE$/), cT = col(/^TANGGAL$/);
    const miss = [['UID', cU], ['NO. LAPORAN', cN], ['PENYULANG', cP], ['P/S', cS], ['KODE', cK]].filter(([, i]) => i < 0).map(([n]) => n);
    if (miss.length) throw new Error('sheet Detil Kode: kolom ' + miss.join(', ') + ' tidak ditemukan');
    const seen = new Set(); const ev = []; const bulan = new Map();
    let baris = 0;
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue; const no = str(r[cN]); if (!no) continue;
      baris++; if (seen.has(no)) continue; seen.add(no);
      if (str(r[cK]).toUpperCase() !== 'J') continue;
      const u = uidKey(r[cU]); if (!u) continue;
      const ps = str(r[cS]).toUpperCase(); if (ps !== 'P' && ps !== 'S') continue;
      const peny = str(r[cP]).toUpperCase(); if (!peny) continue;
      const d = cT >= 0 ? isoDate(r[cT]) : '';
      if (d) bulan.set(d.slice(0, 7), (bulan.get(d.slice(0, 7)) || 0) + 1);
      ev.push([u, cL >= 0 ? ulpName(r[cL]) : '', peny, ps === 'P', d]);
    }
    if (!ev.length) throw new Error('sheet Detil Kode: tidak ada kejadian kode J dengan penyulang');
    const per = [...bulan].sort((x, y) => (x[0] < y[0] ? -1 : 1));
    return { baris, unik: seen.size, ev, bulan: per };
  }
  // gangguan per penyulang untuk bulan berjalan = bulan dari tanggal realisasi tgl (YYYY-MM-DD), kejadian s.d. tgl
  function forMonth(det, tgl) {
    const ym = String(tgl || '').slice(0, 7); if (!ym) return null;
    const agg = new Map(); let j = 0, dari = '', sampai = '';
    det.ev.forEach(([u, ulp, peny, isP, d]) => {
      if (!d || d.slice(0, 7) !== ym || d > tgl) return;
      j++; if (!dari || d < dari) dari = d; if (!sampai || d > sampai) sampai = d;
      const k = u + '\u0001' + ulp + '\u0001' + peny; const o = agg.get(k) || [0, 0]; o[isP ? 0 : 1]++; agg.set(k, o);
    });
    if (!j) return null;
    const [tahun, bln] = ym.split('-').map(Number);
    return { tahun, bulan: bln, dari, sampai, baris: det.baris, unik: det.unik, j, rows: [...agg].map(([k, o]) => [...k.split('\u0001'), o[0], o[1]]) };
  }
  window.SSHarianDetil = { parse, forMonth };
})();
