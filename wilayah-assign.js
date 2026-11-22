// Menempatkan trafo ke kecamatan (kode Kepmendagri 2025) untuk Disaster Dashboard.
// Urutan sumber lokasi per trafo/gardu:
//   xy   = koordinat trafo/gardu (LATITUDE/LONGITUDE di sheet TRAFO/GARDU) → kecamatan yang memuat titik itu
//   kec  = ALAMAT gardu sama dengan nama kecamatan
//   desa = ALAMAT gardu sama dengan nama desa/kelurahan → kecamatannya
//   peny = koordinat penyulang (database penyulang) → kecamatan
//   gi   = koordinat GI asal feeder → kecamatan
// Nama yang sama di beberapa tempat dipilih yang berada di provinsi UID feeder itu, lalu yang terdekat ke titik penyulang/GI.
// Keluaran trafo_wilayah: satu baris per (feeder, kecamatan, sumber): { f, k, t (jumlah trafo), v (kVA), s }.
(function (root) {
  const UIDPROV = { ACEH: ['11'], SUMUT: ['12'], SUMBAR: ['13'], RKR: ['14', '21'], S2JB: ['15', '16', '17'], BABEL: ['19'], LAMPUNG: ['18'], KALBAR: ['61'], KALSELTENG: ['62', '63'], KALTIMRA: ['64', '65'] };
  const PRE = /^(MV\s*-?\s*CABLE|MVCABLE|CELL|FEEDER|PENYULANG|PNY|PYL|F)[\s_.\-]+/;
  const NF = (s) => String(s || '').toUpperCase().trim().replace(PRE, '').replace(/[^A-Z0-9]/g, '');
  const NU = (s) => String(s || '').toUpperCase().replace(/^UP3\s+/, '').replace(/[^A-Z0-9]/g, '');
  const NW = (s) => String(s || '').toUpperCase().replace(/^(KEC\.?|KECAMATAN|KEL\.?|KELURAHAN|DESA|DS\.?|KAB\.?|KABUPATEN|KOTA|KOTAMADYA)\s+/, '').replace(/[^A-Z0-9]/g, '');
  const num = (v) => { const x = Number(String(v == null ? '' : v).replace(',', '.')); return v === '' || v == null || !isFinite(x) ? null : x; };
  const okXY = (lat, lon) => lat != null && lon != null && lat > -11 && lat < 8 && lon > 94 && lon < 120 && !(lat === 0 && lon === 0);
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  // indeks poligon kecamatan: kotak batas + grid 0,25° agar titik cepat dicari
  function polyIndex(kec) {
    const P = kec.map((k) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; k.g.forEach((poly) => poly[0].forEach(([x, y]) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; })); return { k, b: [x0, y0, x1, y1] }; });
    const G = new Map(), C = 0.25, key = (i, j) => i * 10000 + j;
    P.forEach((p) => { for (let i = Math.floor(p.b[0] / C); i <= Math.floor(p.b[2] / C); i++) for (let j = Math.floor(p.b[1] / C); j <= Math.floor(p.b[3] / C); j++) { const kk = key(i, j); (G.get(kk) || G.set(kk, []).get(kk)).push(p); } });
    const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const inPoly = (x, y, g) => g.some((poly) => inRing(x, y, poly[0]) && !poly.slice(1).some((h) => inRing(x, y, h)));
    return (lon, lat) => {
      const cand = G.get(key(Math.floor(lon / C), Math.floor(lat / C))) || [];
      for (const p of cand) if (lon >= p.b[0] && lon <= p.b[2] && lat >= p.b[1] && lat <= p.b[3] && inPoly(lon, lat, p.k.g)) return p.k.id;
      // di luar semua poligon (pesisir/pulau kecil yang disederhanakan): kecamatan dengan pusat terdekat dalam 5 km
      let best = null, bd = (5 / 111) ** 2; for (const p of cand) { if (!p.k.c) continue; const d = d2(p.k.c, [lon, lat]); if (d < bd) { bd = d; best = p.k.id; } }
      return best;
    };
  }

  function make(ctx) {
    const kecById = new Map(ctx.kec.map((k) => [k.id, k]));
    const pip = polyIndex(ctx.kec);
    const byName = new Map(); ctx.kec.forEach((k) => { const n = NW(k.n); (byName.get(n) || byName.set(n, []).get(n)).push(k.id); });
    const byDesa = new Map(); (ctx.desa || []).forEach((v) => { const n = NW(v.n); const a = byDesa.get(n) || byDesa.set(n, []).get(n); if (!a.includes(v.k)) a.push(v.k); });
    // titik acuan per feeder: penyulang berkoordinat, lalu GI
    const gi = new Map((ctx.gi || []).map((g) => [g.aset, g]));
    const p3 = new Map(), pu = new Map(); (ctx.pp || []).forEach((p) => { const a = NU(p.up3) + '|' + NF(p.penyulang), b = p.uid + '|' + NF(p.penyulang); if (!p3.has(a)) p3.set(a, p); if (!pu.has(b)) pu.set(b, p); });
    const fd = new Map();
    (ctx.feeders || []).forEach((f) => {
      const g = gi.get(f.gi); const uid = g ? g.uid : '';
      const p = g ? p3.get(NU(g.up3) + '|' + NF(f.nama)) || pu.get(uid + '|' + NF(f.nama)) : null;
      const pl = p ? num(p.lat) : null, pn = p ? num(p.lon) : null, gl = g ? num(g.lat) : null, gn = g ? num(g.lon) : null;
      const ref = okXY(pl, pn) ? { xy: [pn, pl], s: 'peny' } : okXY(gl, gn) ? { xy: [gn, gl], s: 'gi' } : null;
      fd.set(f.kode, { uid, prov: UIDPROV[uid] || [], ref, refK: ref ? pip(ref.xy[0], ref.xy[1]) : null });
    });
    const pick = (ids, F) => {
      if (!ids || !ids.length) return null;
      let c = F && F.prov.length ? ids.filter((id) => F.prov.includes(id.slice(0, 2))) : ids;
      if (!c.length) return null;
      if (c.length > 1 && F && F.ref) c = c.slice().sort((a, b) => d2(kecById.get(a).c || [0, 0], F.ref.xy) - d2(kecById.get(b).c || [0, 0], F.ref.xy));
      return c[0];
    };
    const byAlamat = (al, F) => {
      const parts = String(al || '').toUpperCase().split(/[,/;()]|\s-\s|\bKAB\b\.?|\bKABUPATEN\b|\bKOTA\b/).map((x) => x.trim()).filter(Boolean);
      for (const part of parts) {
        const n = NW(part); if (!n) continue;
        let k = pick(byName.get(n), F); if (k) return [k, 'kec'];
        k = pick(byDesa.get(n), F); if (k) return [k, 'desa'];
        const w = part.replace(/^(KEC\.?|KECAMATAN|DESA|KEL\.?|KELURAHAN)\s+/, '').split(/\s+/);
        for (let m = Math.min(3, w.length - 1); m >= 1; m--) { k = pick(byName.get(NW(w.slice(0, m).join(' '))), F); if (k) return [k, 'kec']; }
      }
      return null;
    };
    // items: { feeder, n, kva, alamat, lat, lon }
    return (items) => {
      const agg = new Map();
      items.forEach((it) => {
        const F = fd.get(it.feeder) || null;
        let k = null, s = '';
        const la = num(it.lat), lo = num(it.lon);
        if (okXY(la, lo)) { k = pip(lo, la); s = 'xy'; }
        if (!k) { const r = byAlamat(it.alamat, F); if (r) [k, s] = r; }
        if (!k && F && F.refK) { k = F.refK; s = F.ref.s; }
        const key = it.feeder + '|' + (k || '') + '|' + (k ? s : '');
        const o = agg.get(key) || { f: it.feeder, k: k || '', t: 0, v: 0, s: k ? s : '' };
        o.t += it.n || 0; o.v += num(it.kva) || 0; agg.set(key, o);
      });
      return [...agg.values()].filter((o) => o.t > 0).map((o) => ({ ...o, v: Math.round(o.v) }));
    };
  }
  const api = { make, UIDPROV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SSWilayah = api;
})(typeof window !== 'undefined' ? window : globalThis);
