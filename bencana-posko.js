// Disaster Dashboard: pembaca file Excel laporan posko bencana (template_posko_bencana.xlsx).
// Sheet "Kejadian"         : Nama kejadian, Jenis bencana, Latitude, Longitude, Radius (km), Waktu mulai, Status, Keterangan
// Sheet "Status Penyulang" : Nama kejadian, UID, UP3, ULP, Gardu Induk, Penyulang, Waktu padam, Waktu nyala,
//                            Gardu terdampak, Pelanggan padam, Keterangan
// Waktu disimpan sebagai waktu lokal (WIB) "YYYY-MM-DDTHH:MM". Unggahan mengganti kejadian dengan nama yang sama
// beserta seluruh status penyulangnya (laporan posko terbaru = kondisi terbaru).
(function (root) {
  const S = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
  const norm = (x) => S(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const num = (v) => { if (v == null || v === '') return null; const x = typeof v === 'number' ? v : Number(S(v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : null; };
  const UIDS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const UALIAS = { SUMATERAUTARA: 'SUMUT', SUMATERABARAT: 'SUMBAR', RIAU: 'RKR', RIAUKEPRI: 'RKR', RIAUDANKEPULAUANRIAU: 'RKR', BANGKABELITUNG: 'BABEL', KALIMANTANBARAT: 'KALBAR', KSKT: 'KALSELTENG', KALIMANTANSELATANDANTENGAH: 'KALSELTENG', KALIMANTANTIMUR: 'KALTIMRA', KALTIM: 'KALTIMRA' };
  const uidOf = (v) => { const u = norm(S(v).replace(/^UI[DW]\s+/i, '')); return UIDS.includes(u) ? u : UALIAS[u] || ''; };
  const p2 = (n) => String(n).padStart(2, '0');
  // tanggal/jam Excel → "YYYY-MM-DDTHH:MM" (waktu dinding, tanpa zona)
  function waktu(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5 / 6e4) * 6e4); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; }
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}T${p2(v.getHours())}:${p2(v.getMinutes())}`;
    const s = S(v);
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})[:.](\d{2}))?/.exec(s);
    if (m) return `${m[1]}-${p2(m[2])}-${p2(m[3])}T${p2(m[4] || 0)}:${p2(m[5] || 0)}`;
    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ ,]+(\d{1,2})[:.](\d{2}))?/.exec(s);
    if (m) return `${m[3]}-${p2(m[2])}-${p2(m[1])}T${p2(m[4] || 0)}:${p2(m[5] || 0)}`;
    return null; // tidak terbaca
  }
  const headerAt = (rows, need) => rows.findIndex((r) => r && need.every((n) => r.some((c) => norm(c) === norm(n))));
  const sheetOf = (sheets, name) => sheets.find((x) => norm(x.name) === norm(name));
  function table(sh, need, label) {
    const hi = headerAt(sh.rows, need);
    if (hi < 0) throw new Error(`sheet ${label}: kolom ${need.join(', ')} tidak ditemukan`);
    const H = sh.rows[hi].map((c) => norm(String(c || '').replace(/\(.*\)/, '')));
    const ix = (k) => H.indexOf(norm(k));
    return sh.rows.slice(hi + 1).map((r, i) => ({ n: hi + i + 2, g: (k) => { const j = ix(k); return j < 0 || !r ? '' : r[j]; } })).filter((o) => o.g && Object.values(need).some((k) => S(o.g(k))));
  }

  function build(sheets) {
    const warn = [];
    const KS = sheetOf(sheets, 'Kejadian'), SS = sheetOf(sheets, 'Status Penyulang');
    if (!KS) throw new Error('sheet "Kejadian" tidak ada. Gunakan template laporan posko bencana.');
    const kej = [];
    table(KS, ['Nama kejadian', 'Latitude', 'Longitude'], 'Kejadian').forEach(({ n, g }) => {
      const nama = S(g('Nama kejadian')); if (!nama) return;
      const lat = num(g('Latitude')), lon = num(g('Longitude'));
      if (lat == null || lon == null || !(lat > -11 && lat < 8 && lon > 94 && lon < 120)) throw new Error(`sheet Kejadian baris ${n}: Latitude/Longitude "${S(g('Latitude'))}, ${S(g('Longitude'))}" tidak valid untuk wilayah Sumkal`);
      const mulai = waktu(g('Waktu mulai')); if (mulai === null) throw new Error(`sheet Kejadian baris ${n}: Waktu mulai "${S(g('Waktu mulai'))}" tidak terbaca (pakai format 2026-11-22 13:00)`);
      let rad = num(g('Radius')); if (rad == null || rad <= 0) { rad = 25; warn.push(`radius kejadian "${nama}" kosong, dipakai 25 km`); }
      const st = norm(g('Status')) === 'SELESAI' ? 'Selesai' : 'Berlangsung';
      kej.push({ nama, jenis: S(g('Jenis bencana')) || 'Lainnya', lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5, radius_km: rad, mulai: mulai || '', status: st, keterangan: S(g('Keterangan')) });
    });
    if (!kej.length) throw new Error('sheet Kejadian belum berisi kejadian');
    const dupe = kej.map((k) => norm(k.nama)).filter((k, i, a) => a.indexOf(k) !== i); if (dupe.length) throw new Error('nama kejadian ganda di sheet Kejadian: ' + [...new Set(dupe)].join(', '));
    const byNama = new Map(kej.map((k) => [norm(k.nama), k]));
    const status = [];
    if (SS) {
      table(SS, ['Penyulang', 'Waktu padam'], 'Status Penyulang').forEach(({ n, g }) => {
        const peny = S(g('Penyulang')); if (!peny) return;
        let k = byNama.get(norm(g('Nama kejadian')));
        if (!k && !S(g('Nama kejadian')) && kej.length === 1) k = kej[0];
        if (!k) throw new Error(`sheet Status Penyulang baris ${n}: nama kejadian "${S(g('Nama kejadian'))}" tidak ada di sheet Kejadian`);
        const padam = waktu(g('Waktu padam')), nyala = waktu(g('Waktu nyala'));
        if (!padam) throw new Error(`sheet Status Penyulang baris ${n} (${peny}): Waktu padam ${padam === null ? 'tidak terbaca' : 'kosong'}`);
        if (nyala === null) throw new Error(`sheet Status Penyulang baris ${n} (${peny}): Waktu nyala tidak terbaca`);
        if (nyala && nyala < padam) throw new Error(`sheet Status Penyulang baris ${n} (${peny}): Waktu nyala lebih awal dari waktu padam`);
        const uid = uidOf(g('UID')); if (S(g('UID')) && !uid) warn.push(`baris ${n}: UID "${S(g('UID'))}" tidak dikenali`);
        status.push({ kejadian: k.nama, uid, up3: S(g('UP3')).replace(/^UP3\s+/i, ''), ulp: S(g('ULP')).replace(/^ULP\s+/i, ''), gi: S(g('Gardu Induk')), penyulang: peny.toUpperCase(),
          padam, nyala: nyala || '', gardu: num(g('Gardu terdampak')) ?? '', pelanggan: num(g('Pelanggan padam')) ?? '', keterangan: S(g('Keterangan')) });
      });
    } else warn.push('sheet Status Penyulang tidak ada: hanya data kejadian yang diperbarui');
    // penyulang ganda dalam satu kejadian: baris terakhir dipakai
    const seen = new Map(); status.forEach((r, i) => seen.set(norm(r.kejadian) + '|' + r.uid + '|' + norm(r.penyulang) + '|' + r.padam, i));
    const st2 = status.filter((r, i) => seen.get(norm(r.kejadian) + '|' + r.uid + '|' + norm(r.penyulang) + '|' + r.padam) === i);
    if (st2.length < status.length) warn.push(`${status.length - st2.length} baris penyulang ganda (kejadian, penyulang dan waktu padam sama); baris terakhir dipakai`);
    return { kejadian: kej, status: st2, warn, hasStatus: !!SS };
  }
  // gabungkan dengan data saat ini: kejadian bernama sama diganti beserta status penyulangnya
  function merge(curK, curS, out) {
    const names = new Set(out.kejadian.map((k) => norm(k.nama)));
    const K = [...(curK || []).filter((k) => !names.has(norm(k.nama))), ...out.kejadian].sort((a, b) => (a.mulai < b.mulai ? 1 : -1));
    const keep = (curS || []).filter((r) => !names.has(norm(r.kejadian)) || !out.hasStatus);
    return { kejadian: K, status: [...keep, ...(out.hasStatus ? out.status : [])] };
  }
  const toJs = (id, rows) => `window.__D=window.__D||{};window.__D[${JSON.stringify(id)}]=${JSON.stringify(rows)};\n`;
  const api = { build, merge, toJs, waktu, uidOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SSPosko = api;
})(typeof window !== 'undefined' ? window : globalThis);
