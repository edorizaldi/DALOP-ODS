// Peta jaringan Hirarki Aset: garis penyulang disusun dari titik gardu.
// - Titik awal penyulang = koordinat GI sumbernya (gi_identitas). Bila GI belum berkoordinat, mulai dari gardu yang paling dekat ke pusat titik-titik penyulang itu.
// - Garis = pohon jarak terdekat (minimum spanning tree, algoritma Prim): mulai dari GI, setiap langkah menyambung gardu yang paling dekat ke jaringan yang sudah tersambung.
// - Gardu yang jauh dari kumpulan titik penyulangnya (lebih dari 60 km dari titik tengah) dianggap koordinat keliru: tetap disimpan, tidak disambung.
// Keluaran per UID: hx_geo_<UID> = { v, uid, f: [[kode feeder, nama, kode GI, lonGI, latGI, panjang km, [lonE5, latE5, induk, ...], [kode gardu...], [nama...], [kVA...], [jumlah trafo...], ["SSOT trafo:kVA;..." per gardu]], ...] }
// induk = indeks gardu induk di daftar yang sama, -1 = GI, -2 = tidak disambung (koordinat keliru), -3 = tanpa koordinat.
(function (root) {
  const UID = { 'WILAYAH ACEH': 'ACEH', 'WILAYAH SUMATERA UTARA': 'SUMUT', 'WILAYAH SUMATERA BARAT': 'SUMBAR', 'WILAYAH SUMATERA SELATAN, JAMBI & BENGKULU (S2JB)': 'S2JB', 'WILAYAH BANGKA BELITUNG': 'BABEL', 'DISTRIBUSI LAMPUNG': 'LAMPUNG', 'WILAYAH RIAU DAN KEPULAUAN RIAU': 'RKR', 'WILAYAH KALIMANTAN BARAT': 'KALBAR', 'WILAYAH KALIMANTAN SELATAN DAN TENGAH': 'KALSELTENG', 'WILAYAH KALIMANTAN TIMUR': 'KALTIMRA' };
  const UIDS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const num = (v) => { if (v == null || v === '') return null; const x = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.')); return isFinite(x) ? x : null; };
  const okXY = (lat, lon) => lat != null && lon != null && lat > -11 && lat < 8 && lon > 94 && lon < 120 && !(lat === 0 && lon === 0);
  const KM = 111.32;
  const OUT_KM = 60;

  // Prim pada bidang datar lokal (km); P = [[x, y]...], r = titik akar [x, y] atau null
  function prim(P, r) {
    const n = P.length; const par = new Int32Array(n).fill(-2); const best = new Float64Array(n).fill(Infinity); const done = new Uint8Array(n);
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    if (!n) return { par, len: 0 };
    let len = 0;
    if (r) { for (let i = 0; i < n; i++) { best[i] = d2(P[i], r); par[i] = -1; } }
    else { done[0] = 1; par[0] = -1; for (let i = 1; i < n; i++) { best[i] = d2(P[i], P[0]); par[i] = 0; } }
    for (let step = r ? 0 : 1; step < n; step++) {
      let u = -1, bu = Infinity; for (let i = 0; i < n; i++) if (!done[i] && best[i] < bu) { bu = best[i]; u = i; }
      if (u < 0) break; done[u] = 1; len += Math.sqrt(bu);
      for (let i = 0; i < n; i++) if (!done[i]) { const d = d2(P[i], P[u]); if (d < best[i]) { best[i] = d; par[i] = u; } }
    }
    return { par, len };
  }

  // items: { f (kode feeder), k, n, v, t, lat, lon } per gardu tersambung; feeders: hx_feeder; gi: gi_identitas; hxgi: hx_gi
  function build(items, feeders, gi, hxgi) {
    const giXY = new Map((gi || []).map((g) => [g.aset, g]));
    const giUid = new Map((hxgi || []).map((g) => [g.kode, UID[g.wilayah] || '']));
    const byF = new Map(); items.forEach((it) => { const a = byF.get(it.f) || []; a.push(it); byF.set(it.f, a); });
    const out = {}; UIDS.forEach((u) => { out['hx_geo_' + u] = { v: 1, uid: u, f: [] }; });
    const st = { feeder: 0, feederGI: 0, gardu: 0, garduXY: 0, jauh: 0, km: 0 };
    (feeders || []).forEach((f) => {
      const list = byF.get(f.kode); if (!list || !list.length) return;
      const uid = giUid.get(f.gi) || ''; const box = out['hx_geo_' + uid]; if (!box) return;
      const g = giXY.get(f.gi); const gl = g ? num(g.lat) : null, gn = g ? num(g.lon) : null; const hasGi = okXY(gl, gn);
      const pts = list.map((it) => { const la = num(it.lat), lo = num(it.lon); return okXY(la, lo) ? [lo, la] : null; });
      const xy = pts.filter(Boolean);
      // titik tengah (median) untuk menyaring koordinat keliru
      const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
      const mlo = med(xy.map((p) => p[0])), mla = med(xy.map((p) => p[1]));
      const cos = Math.cos(((xy.length ? mla : gl || 0) * Math.PI) / 180);
      const toKm = (p) => [(p[0] - mlo) * KM * cos, (p[1] - mla) * KM];
      const idx = []; pts.forEach((p, i) => { if (!p) return; const q = toKm(p); if (Math.hypot(q[0], q[1]) <= OUT_KM) idx.push(i); });
      const P = idx.map((i) => toKm(pts[i]));
      const rootKm = hasGi ? toKm([gn, gl]) : null;
      // akar: GI bila berkoordinat; bila tidak, gardu terdekat ke titik tengah
      let order = idx, Pk = P;
      if (!hasGi && P.length) { let b = 0, bd = Infinity; P.forEach((q, i) => { const d = q[0] * q[0] + q[1] * q[1]; if (d < bd) { bd = d; b = i; } }); order = [idx[b], ...idx.filter((_, i) => i !== b)]; Pk = [P[b], ...P.filter((_, i) => i !== b)]; }
      const { par, len } = prim(Pk, rootKm);
      const parent = new Int32Array(list.length).fill(-3); pts.forEach((p, i) => { if (p) parent[i] = -2; });
      order.forEach((li, j) => { const pj = par[j]; parent[li] = pj < 0 ? (hasGi ? -1 : (j === 0 ? -1 : -2)) : order[pj]; });
      if (!hasGi && order.length) parent[order[0]] = -1; // tanpa GI: titik awal ditandai -1, tanpa garis ke GI
      const flat = []; list.forEach((it, i) => { const p = pts[i]; flat.push(p ? Math.round(p[0] * 1e5) : 0, p ? Math.round(p[1] * 1e5) : 0, parent[i]); });
      const km = Math.round(len * 10) / 10;
      box.f.push([f.kode, f.nama, f.gi, hasGi ? Math.round(gn * 1e5) / 1e5 : null, hasGi ? Math.round(gl * 1e5) / 1e5 : null, km, flat,
        list.map((it) => it.k), list.map((it) => String(it.n || '').slice(0, 28)), list.map((it) => { const v = num(it.v); return v == null ? 0 : Math.round(v); }), list.map((it) => it.t || 0), list.map((it) => it.s || '')]);
      st.feeder++; if (hasGi) st.feederGI++; st.gardu += list.length; st.garduXY += xy.length; st.jauh += xy.length - idx.length; st.km += km;
    });
    st.km = Math.round(st.km);
    return { files: out, stats: st };
  }
  const toJs = (id, v) => `window.__D=window.__D||{};window.__D[${JSON.stringify(id)}]=${JSON.stringify(v)};\n`;
  const api = { build, toJs, UID, UIDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SSHxGeo = api;
})(typeof window !== 'undefined' ? window : globalThis);
