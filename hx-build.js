// Penyusun dataset Hirarki Aset dari ALL_DATA_ASET_JARINGAN.xlsx (sheet GI, FEEDER, ZONA, SECTION, SEGMENT, LATERAL, GARDU, TRAFO).
// Dipakai di tab Update Data Bulanan (unggah database aset). Masukan: { NAMA_SHEET: rows } (baris pertama = judul kolom).
// Keluaran: { files: { hx_gi: [...], ..., gi_identitas: [...] }, stats } — isi tiap file sama bentuknya dengan hx_*.js yang dimuat tab Hirarki Aset.
// gi_identitas = identitas GI dari sheet GI (kode jaringan, koordinat, UID, UP3, ULP, status) untuk tab Database Penyulang & Gardu Induk.
(function (root) {
  'use strict';
  const NET = ['GI', 'FEEDER', 'ZONA', 'SECTION', 'SEGMENT', 'LATERAL'];
  const TAG = { GI: 'GI', FEEDER: 'FD', ZONA: 'ZO', SECTION: 'SE', SEGMENT: 'SG', LATERAL: 'LT' };
  const GRP = {
    'WILAYAH SUMATERA UTARA': 'gardu_1', 'WILAYAH ACEH': 'gardu_1',
    'WILAYAH SUMATERA SELATAN, JAMBI & BENGKULU (S2JB)': 'gardu_2', 'DISTRIBUSI LAMPUNG': 'gardu_2', 'WILAYAH BANGKA BELITUNG': 'gardu_2',
    'WILAYAH KALIMANTAN BARAT': 'gardu_3', 'WILAYAH KALIMANTAN SELATAN DAN TENGAH': 'gardu_3', 'WILAYAH KALIMANTAN TIMUR': 'gardu_3',
    'WILAYAH RIAU DAN KEPULAUAN RIAU': 'gardu_3', 'WILAYAH SUMATERA BARAT': 'gardu_3',
  };
  const S = (v) => (v == null ? '' : String(v).replace(/\s+$/, '').replace(/^\s+/, ''));
  const NORM = (x) => S(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isEmpty = (p) => !p || p === '0' || p === '-';
  const num = (v) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return v === '' || v == null || !isFinite(n) ? null : n; };
  // nama untuk mencocokkan trafo ke gardu: tanpa awalan TRAFO/nomor/GDDIST/GD/GARDU dan tanpa spasi atau tanda baca
  // (juga pola "TRAFO_01_GDDIST_SYA204-00" yang dipakai di beberapa UID)
  const nm = (x) => { let v = S(x).toUpperCase().replace(/^(TRAFO|TRF)[\s_]*/, '').replace(/^\d+[\s_]+/, ''); let prev; do { prev = v; v = v.replace(/^(GDDIST|GD\s*DIST|GARDU|GD)[\s._\-]*/, ''); } while (v !== prev); return v.replace(/[^A-Z0-9]/g, ''); };

  function table(rows, need, sheet) {
    if (!rows || !rows.length) throw new Error(`Sheet ${sheet} kosong atau tidak ada.`);
    const H = rows[0].map((h) => NORM(h));
    const ix = {}; need.forEach((k) => { ix[k] = H.indexOf(NORM(k)); });
    const miss = need.filter((k) => ix[k] < 0 && !/^(NAMA|NO_TIANG|SSOTNUMBER|KODE_JARINGAN|ALAMAT|NAMA_UNIT|NAMA_DIST|NAMA_UP3|STATUS_NYALA|KVA|NAMA_ULP|NO_TIANG_TRAFO|NAMA_UID|LATITUDE|LONGITUDE)$/.test(k));
    if (miss.length) throw new Error(`Sheet ${sheet}: kolom ${miss.join(', ')} tidak ditemukan.`);
    return { rows: rows.slice(1).filter((r) => r && r.some((v) => v !== '' && v != null)), get: (r, k) => (ix[k] >= 0 ? S(r[ix[k]]) : '') };
  }

  function build(sheets, onStep) {
    const step = (t) => { if (onStep) onStep(t); };
    const sheet = (n) => { const k = Object.keys(sheets).find((x) => NORM(x) === NORM(n)); return k ? sheets[k] : null; };
    // ---------- aset jaringan GI .. LATERAL ----------
    step('Membaca GI sampai Lateral');
    const A = []; let off = 0; const byCode = new Map(), bySsot = new Map();
    NET.forEach((lv, li) => {
      const t = table(sheet(lv), ['KODE_ASSET', 'PARENT_ASSET', 'SSOTNUMBER', 'NO_TIANG', 'NAMA', 'ALAMAT', 'STATUS_NYALA', 'KODE_JARINGAN', 'NAMA_DIST', 'NAMA_UP3', 'NAMA_UNIT'], lv);
      t.rows.forEach((r, i) => {
        const a = { id: String(off + i), lv, li, row: i + 2, kode: t.get(r, 'KODE_ASSET'), parent: t.get(r, 'PARENT_ASSET'), ssot: t.get(r, 'SSOTNUMBER'),
          nama: lv === 'GI' || lv === 'FEEDER' ? t.get(r, 'NAMA') || t.get(r, 'NO_TIANG') : t.get(r, 'NO_TIANG') || t.get(r, 'NAMA'), alamat: t.get(r, 'ALAMAT'), status: t.get(r, 'STATUS_NYALA'),
          jaringan: t.get(r, 'KODE_JARINGAN'), wilayah: t.get(r, 'NAMA_DIST'), up3: t.get(r, 'NAMA_UP3'), ulp: t.get(r, 'NAMA_UNIT') };
        if (!a.kode) return;
        A.push(a);
        if (!byCode.has(a.kode)) byCode.set(a.kode, a); else a.dup = true;
        if (a.ssot && !bySsot.has(a.ssot)) bySsot.set(a.ssot, a);
      });
      off += t.rows.length;
    });
    const listByCode = new Map(); A.forEach((a) => { const l = listByCode.get(a.kode); if (l) l.push(a); else listByCode.set(a.kode, [a]); });
    listByCode.forEach((l) => { if (l.length > 1) l.forEach((a) => { a.dup = true; }); });
    const codeOf = (p) => (listByCode.has(p) ? p : bySsot.has(p) ? bySsot.get(p).kode : null);
    // kode yang muncul lebih dari sekali (kode_asset ganda): tersambung bila salah satu barisnya tersambung
    const res = new Map(), cres = new Map(), visiting = new Set();
    function rowRes(a) {
      if (res.has(a)) return res.get(a);
      let out;
      if (a.lv === 'GI') out = { ok: true, gi: a };
      else if (isEmpty(a.parent)) out = { ok: false, root: a, why: 'parent kosong' };
      else if (a.parent === a.kode) out = { ok: false, root: a, why: 'siklus' };
      else {
        const pc = codeOf(a.parent);
        if (!pc) out = { ok: false, root: a, why: 'parent tidak ditemukan', p: a.parent };
        else if (visiting.has(pc)) out = { ok: false, root: a, why: 'siklus' };
        else { const r = codeRes(pc); out = r.ok ? { ok: true, gi: r.gi } : { ok: false, root: r.root, why: r.why, p: r.p }; }
      }
      res.set(a, out); return out;
    }
    function codeRes(code) {
      if (cres.has(code)) return cres.get(code);
      visiting.add(code);
      const rows = listByCode.get(code); let first = null, best = null;
      for (const a of rows) { const r = rowRes(a); if (!first) first = r; if (r.ok) { best = r; break; } }
      visiting.delete(code);
      const out = best || first; cres.set(code, out); return out;
    }
    const rep = (code) => { const l = listByCode.get(code); return l.find((a) => rowRes(a).ok) || l[0]; };
    const find = (p) => { const c = codeOf(p); return c ? rep(c) : null; };
    const resolve = rowRes;
    A.forEach(resolve);
    // leluhur per level dan induk level atas
    const anc = new Map();
    function ancestors(a) {
      if (anc.has(a)) return anc.get(a);
      const o = { gi: '', feeder: '', zona: '', section: '', segment: '', induk: '' };
      let cur = find(a.parent); const seen = new Set([a]);
      while (cur && !seen.has(cur)) {
        seen.add(cur);
        const k = { GI: 'gi', FEEDER: 'feeder', ZONA: 'zona', SECTION: 'section', SEGMENT: 'segment' }[cur.lv];
        if (k && !o[k]) o[k] = cur.kode;
        if (!o.induk && cur.li !== a.li) o.induk = cur.kode;
        if (cur.lv === 'GI') break;
        cur = find(cur.parent);
      }
      anc.set(a, o); return o;
    }
    const AN = []; // anomali
    const okA = A.filter((a) => res.get(a).ok);
    A.forEach((a) => {
      const r = res.get(a);
      if (!r.ok) {
        let st, cat;
        if (r.root === a) {
          st = 'PUTUS: ' + r.why;
          cat = r.why === 'parent tidak ditemukan' ? `parent ${r.p} tidak ada di data` : r.why === 'siklus' ? `siklus di ${a.kode}` : (a.dup ? 'kode_asset ganda' : '');
        } else {
          st = 'PUTUS: rantai parent tidak sampai GI';
          cat = `putus di ${r.root.kode}: ${r.why === 'parent tidak ditemukan' ? `parent ${r.p} tidak ada di data` : r.why}`;
        }
        AN.push({ id: a.id, level: a.lv, kode: a.kode, nama: a.nama, parent: a.parent, status_hirarki: st, catatan: cat, wilayah: a.wilayah, up3: a.up3, baris: String(a.row) });
        return;
      }
      const notes = [];
      if (a.dup) notes.push('kode_asset ganda');
      const pa = find(a.parent); if (pa && pa.li > a.li) notes.push(`induk ${pa.kode} (${pa.lv}) levelnya lebih rendah dari ${a.lv}`);
      if (notes.length) AN.push({ id: a.id, level: a.lv, kode: a.kode, nama: a.nama, parent: a.parent, status_hirarki: 'OK', catatan: notes.join('; '), wilayah: a.wilayah, up3: a.up3, baris: String(a.row) });
    });
    // ---------- gardu ----------
    step('Membaca gardu');
    const tg = table(sheet('GARDU'), ['SSOTNUMBER', 'KODE_ASSET', 'PARENT_ASSET', 'NAMA_GARDU', 'ALAMAT', 'KVA', 'NAMA_UID', 'NAMA_UP3', 'NAMA_ULP', 'LATITUDE', 'LONGITUDE'], 'GARDU');
    const GD = []; const gdByCode = new Map(), gdBySsot = new Map(), gdByName = new Map();
    tg.rows.forEach((r, i) => {
      const g = { row: i + 2, kode: tg.get(r, 'KODE_ASSET'), ssot: tg.get(r, 'SSOTNUMBER'), parent: tg.get(r, 'PARENT_ASSET'), nama: tg.get(r, 'NAMA_GARDU'), alamat: tg.get(r, 'ALAMAT'),
        kva: tg.get(r, 'KVA'), wilayah: tg.get(r, 'NAMA_UID'), up3: tg.get(r, 'NAMA_UP3'), ulp: tg.get(r, 'NAMA_ULP'), lat: tg.get(r, 'LATITUDE'), lon: tg.get(r, 'LONGITUDE'), trafo: [], trafoXY: [], kvaT: 0, kvaTn: 0 };
      if (!g.kode) return;
      GD.push(g);
      if (!gdByCode.has(g.kode)) gdByCode.set(g.kode, g);
      if (g.ssot && !gdBySsot.has(g.ssot)) gdBySsot.set(g.ssot, g);
      const k = g.ulp + '|' + nm(g.nama); if (nm(g.nama)) { if (!gdByName.has(k)) gdByName.set(k, g); else gdByName.set(k, null); }
      const p = isEmpty(g.parent) ? null : find(g.parent);
      g.pa = p; g.ok = !!(p && res.get(p).ok);
    });
    // ---------- trafo ----------
    step('Mencocokkan trafo ke gardu');
    const tt = table(sheet('TRAFO'), ['SSOTNUMBER', 'KODE_TRAFO', 'KODE_GARDU', 'NO_TIANG_TRAFO', 'KVA', 'NAMA_UID', 'NAMA_UP3', 'NAMA_ULP', 'LATITUDE', 'LONGITUDE'], 'TRAFO');
    const met = { KODE_GARDU: 0, 'NAMA (cadangan)': 0, 'TIDAK COCOK': 0 }; const TR = [];
    tt.rows.forEach((r, i) => {
      const t = { row: i + 2, ssot: tt.get(r, 'SSOTNUMBER'), kode: tt.get(r, 'KODE_TRAFO'), kg: tt.get(r, 'KODE_GARDU'), nama: tt.get(r, 'NO_TIANG_TRAFO'), kva: tt.get(r, 'KVA'), wilayah: tt.get(r, 'NAMA_UID'), up3: tt.get(r, 'NAMA_UP3'), ulp: tt.get(r, 'NAMA_ULP'), lat: tt.get(r, 'LATITUDE'), lon: tt.get(r, 'LONGITUDE') };
      if (!t.kode && !t.kg) return;
      let g = gdByCode.get(t.kg) || gdBySsot.get(t.kg) || null; let m = 'KODE_GARDU';
      if (!g) { g = gdByName.get(t.ulp + '|' + nm(t.nama)) || null; m = 'NAMA (cadangan)'; }
      if (!g) m = 'TIDAK COCOK';
      met[m]++; t.g = g; TR.push(t);
      if (g) { g.trafo.push(t.kode); g.trafoXY.push(t); const k = num(t.kva); if (k != null) { g.kvaT += k; g.kvaTn++; } }
    });
    // ---------- keluaran per level ----------
    step('Menyusun dataset');
    const giOf = (a) => res.get(a).gi;
    const cnt = (o, k, n) => { o[k] = (o[k] || 0) + (n == null ? 1 : n); };
    const perGi = {}, perFd = {};
    const seenCode = new Set();
    okA.forEach((a) => { if (a.lv === 'GI' || a.lv === 'FEEDER') return; const key = a.lv + '|' + a.kode; if (seenCode.has(key)) return; seenCode.add(key); const o = ancestors(a); cnt(perGi[o.gi] = perGi[o.gi] || {}, a.lv.toLowerCase()); if (o.feeder) cnt(perFd[o.feeder] = perFd[o.feeder] || {}, a.lv.toLowerCase()); });
    const fdSeen = new Set();
    okA.filter((a) => a.lv === 'FEEDER').forEach((a) => { if (fdSeen.has(a.kode)) return; fdSeen.add(a.kode); cnt(perGi[giOf(a).kode] = perGi[giOf(a).kode] || {}, 'feeder'); });
    const feederOf = (a) => (a.lv === 'FEEDER' ? a.kode : ancestors(a).feeder);
    GD.forEach((g) => { if (!g.ok) return; const gi = giOf(g.pa); const fd = feederOf(g.pa); g.gi = gi; g.feeder = fd || '';
      cnt(perGi[gi.kode] = perGi[gi.kode] || {}, 'gardu'); cnt(perGi[gi.kode], 'trafo', g.trafo.length);
      if (fd) { cnt(perFd[fd] = perFd[fd] || {}, 'gardu'); cnt(perFd[fd], 'trafo', g.trafo.length); } });
    const C = (o, k) => String((o && o[k]) || 0);
    const files = {};
    files.hx_gi = okA.filter((a) => a.lv === 'GI' && !a.dup).map((a) => ({ kode: a.kode, nama: a.nama, wilayah: a.wilayah, up3: a.up3,
      feeder: C(perGi[a.kode], 'feeder'), zona: C(perGi[a.kode], 'zona'), section: C(perGi[a.kode], 'section'), segment: C(perGi[a.kode], 'segment'), lateral: C(perGi[a.kode], 'lateral'), gardu: C(perGi[a.kode], 'gardu'), trafo: C(perGi[a.kode], 'trafo') }));
    files.hx_feeder = okA.filter((a) => a.lv === 'FEEDER' && !a.dup).map((a) => ({ id: a.id, kode: a.kode, nama: a.nama, gi: giOf(a).kode, status: a.status, ulp: a.ulp, jaringan: a.jaringan,
      zona: C(perFd[a.kode], 'zona'), section: C(perFd[a.kode], 'section'), segment: C(perFd[a.kode], 'segment'), lateral: C(perFd[a.kode], 'lateral'), gardu: C(perFd[a.kode], 'gardu'), trafo: C(perFd[a.kode], 'trafo') }));
    const lvRow = (a) => { const o = ancestors(a); const r = { id: a.id, kode: a.kode, nama: a.nama, parent: a.parent, induk_atas: o.induk, feeder: o.feeder };
      if (a.li >= 3) r.zona = o.zona; if (a.li >= 4) r.section = o.section; if (a.li >= 5) r.segment = o.segment; r.status = a.status; r.alamat = a.alamat; return r; };
    ['ZONA', 'SECTION', 'SEGMENT', 'LATERAL'].forEach((lv) => { files['hx_' + lv.toLowerCase()] = okA.filter((a) => a.lv === lv).map(lvRow); });
    ['gardu_1', 'gardu_2', 'gardu_3'].forEach((k) => { files['hx_' + k] = []; });
    GD.forEach((g) => {
      if (!g.ok) return; const grp = GRP[g.gi.wilayah] || 'gardu_3';
      const kg = num(g.kva); let kva = g.kva, kt = '';
      if (kg == null && g.kvaTn) kva = String(g.kvaT); else if (kg != null && g.kvaTn && g.kvaT !== kg) kt = String(g.kvaT);
      files['hx_' + grp].push({ id: String(g.row), kode: g.kode, nama: g.nama, parent: g.pa.kode, posisi: TAG[g.pa.lv], feeder: g.feeder, trafo: g.trafo.join('; '), kva, kva_trafo: kt, alamat: g.alamat.slice(0, 40) });
    });
    // anomali gardu dan trafo
    GD.forEach((g) => {
      if (g.ok) return;
      let st, cat = '';
      if (isEmpty(g.parent)) st = 'PUTUS: parent kosong';
      else if (!g.pa) { st = 'PUTUS: parent tidak ditemukan'; cat = `parent ${g.parent} tidak ada di data`; }
      else { const r = res.get(g.pa); st = 'PUTUS: rantai parent tidak sampai GI'; cat = `putus di ${r.root.kode}: ${r.why === 'parent tidak ditemukan' ? `parent ${r.p} tidak ada di data` : r.why}`; }
      AN.push({ id: 'G' + g.row, level: 'GARDU', kode: g.kode, nama: g.nama, parent: g.parent, status_hirarki: st, catatan: cat, wilayah: g.wilayah, up3: g.up3, baris: String(g.row) });
    });
    let trOk = 0;
    TR.forEach((t) => {
      if (t.g && t.g.ok) { trOk++; return; }
      let st, cat;
      if (!t.g) { st = 'PUTUS: gardu tidak ditemukan'; cat = 'kode gardu & nama tidak cocok di sheet GARDU'; }
      else { st = 'PUTUS: rantai parent tidak sampai GI'; const g = t.g;
        if (isEmpty(g.parent)) cat = `gardu ada; putus di ${g.kode}: parent kosong`;
        else if (!g.pa) cat = `gardu ada; putus di ${g.kode}: parent ${g.parent} tidak ada di data`;
        else { const r = res.get(g.pa); cat = `gardu ada; putus di ${r.root.kode}: ${r.why === 'parent tidak ditemukan' ? `parent ${r.p} tidak ada di data` : r.why}`; } }
      AN.push({ id: 'T' + t.row, level: 'TRAFO', kode: t.kode, nama: t.nama, parent: t.kg, status_hirarki: st, catatan: cat, wilayah: t.wilayah, up3: t.up3, baris: String(t.row) });
    });
    files.hx_anomali = AN;
    // ringkasan seluruh data
    const uniqCount = (arr) => new Set(arr.map((a) => a.kode)).size;
    files.hx_ringkasan = NET.map((lv) => {
      const all = A.filter((a) => a.lv === lv), ok = all.filter((a) => res.get(a).ok);
      const okU = ok.length, put = all.length - ok.length;
      const sel = all.filter((a) => { const p = find(a.parent); return p && p.lv === a.lv && p !== a; }).length;
      const pad = all.filter((a) => a.status === 'PADAM').length;
      return { level: lv, total: String(okU + put), terhubung: String(okU), putus: String(put), parent_selevel: String(sel), padam: String(pad) };
    }).concat([
      { level: 'GARDU', total: String(GD.length), terhubung: String(GD.filter((g) => g.ok).length), putus: String(GD.filter((g) => !g.ok).length), parent_selevel: '', padam: '' },
      { level: 'TRAFO', total: String(TR.length), terhubung: String(trOk), putus: String(TR.length - trOk), parent_selevel: '', padam: '' },
    ]);
    files.hx_trafo_metode = Object.entries(met).sort((a, b) => b[1] - a[1]).map(([metode, n]) => ({ metode, jumlah: String(n) }));
    // ringkasan per UID/UP3 (untuk pilihan Unit di Ringkasan seluruh data)
    const U = {}; const cell = (w, u, lv) => { const k = w + '|' + u; const o = U[k] = U[k] || {}; return o[lv] = o[lv] || { t: 0, p: 0, s: 0, d: 0, sb: {} }; };
    files.hx_gi.forEach((g) => { cell(g.wilayah, g.up3, 'GI').t++; ['feeder', 'zona', 'section', 'segment', 'lateral', 'gardu', 'trafo'].forEach((k) => { cell(g.wilayah, g.up3, k.toUpperCase()).t += +g[k] || 0; }); });
    okA.forEach((a) => { if (a.lv === 'GI') return; const gi = giOf(a); const c = cell(gi.wilayah, gi.up3, a.lv); if (a.status === 'PADAM') c.d++; const p = find(a.parent); if (p && p.lv === a.lv && p !== a) c.s++; });
    AN.forEach((r) => { if (!/^PUTUS/.test(r.status_hirarki)) return; const c = cell(r.wilayah, r.up3, r.level); c.p++; const s = r.status_hirarki.replace(/^PUTUS:\s*/, ''); c.sb[s] = (c.sb[s] || 0) + 1; });
    files.hx_ringkasan_unit = [];
    Object.entries(U).forEach(([k, o]) => { const [w, u] = k.split('|'); ['GI', 'FEEDER', 'ZONA', 'SECTION', 'SEGMENT', 'LATERAL', 'GARDU', 'TRAFO'].forEach((lv) => { const c = o[lv]; if (!c) return;
      const r = { w, u, level: lv, terhubung: c.t, putus: c.p, selevel: c.s, padam: c.d }; if (Object.keys(c.sb).length) r.sebab = c.sb; files.hx_ringkasan_unit.push(r); }); });
    files.gi_identitas = giIdentitas(sheet('GI'));
    const stats = { gi: files.hx_gi.length, giXY: files.gi_identitas.filter((g) => g.lat !== '').length, feeder: files.hx_feeder.length, gardu: GD.length, garduOk: GD.filter((g) => g.ok).length, trafo: TR.length, trafoOk: trOk, anomali: AN.length, metode: met };
    // lokasi trafo untuk Disaster Dashboard (trafo_wilayah disusun di upd-aset.js dengan wilayah-assign.js):
    // koordinat trafo, bila kosong koordinat gardu; ALAMAT gardu sebagai cadangan
    const lokasi = [];
    GD.forEach((g) => { if (!g.ok || !g.feeder) return; g.trafoXY.forEach((t) => { const tl = num(t.lat), tn = num(t.lon); lokasi.push({ feeder: g.feeder, n: 1, kva: t.kva, alamat: g.alamat, lat: tl != null && tn != null ? tl : g.lat, lon: tl != null && tn != null ? tn : g.lon }); }); });
    stats.lokasiXY = lokasi.filter((x) => num(x.lat) != null && num(x.lon) != null).length; stats.lokasi = lokasi.length;
    // titik gardu untuk peta jaringan (hx-geo.js menyusun garis penyulang dari titik-titik ini)
    const geo = [];
    GD.forEach((g) => { if (!g.ok || !g.feeder) return; geo.push({ f: g.feeder, k: g.kode, n: g.nama, v: g.kva, t: g.trafo.length, s: g.trafoXY.map((t) => [t.ssot || t.kode, t.kva || ''].join(':')).join(';'), a: g.alamat, lat: g.lat, lon: g.lon }); });
    return { files, stats, lokasi, geo };
  }

  // identitas GI dari sheet GI: semua kolom selain KODE_ASSET dan NAMA opsional
  const DIST = { 110: 'ACEH', 120: 'SUMUT', 131: 'SUMBAR', 140: 'S2JB', 161: 'BABEL', 171: 'LAMPUNG', 180: 'RKR', 210: 'KALBAR', 221: 'KALSELTENG', 230: 'KALTIMRA' };
  const WIL = { 'WILAYAH ACEH': 'ACEH', 'WILAYAH SUMATERA UTARA': 'SUMUT', 'WILAYAH SUMATERA BARAT': 'SUMBAR', 'WILAYAH SUMATERA SELATAN, JAMBI & BENGKULU (S2JB)': 'S2JB', 'WILAYAH BANGKA BELITUNG': 'BABEL', 'DISTRIBUSI LAMPUNG': 'LAMPUNG', 'WILAYAH RIAU DAN KEPULAUAN RIAU': 'RKR', 'WILAYAH KALIMANTAN BARAT': 'KALBAR', 'WILAYAH KALIMANTAN SELATAN DAN TENGAH': 'KALSELTENG', 'WILAYAH KALIMANTAN TIMUR': 'KALTIMRA' };
  const titleOf = (s, pre) => S(s).replace(new RegExp('^' + pre + '\\s+', 'i'), '').toLowerCase().split(/\s+/).filter(Boolean).map((w) => (w === 'dan' || w === 'di' ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const isoOf = (v) => { if (v == null || v === '') return ''; if (typeof v === 'number' && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10); if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10); const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(S(v)); return m ? m[0] : ''; };
  function giIdentitas(rows) {
    if (!rows || !rows.length) return [];
    const H = rows[0].map((h) => NORM(h)); const ix = (k) => H.indexOf(NORM(k)); const g = (r, k) => (ix(k) >= 0 ? r[ix(k)] : '');
    const tc = (x) => S(x).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    return rows.slice(1).filter((r) => r && S(g(r, 'KODE_ASSET')) && S(g(r, 'NAMA'))).map((r) => {
      let lat = num(g(r, 'LATITUDE')), lon = num(g(r, 'LONGITUDE'));
      if (lat == null || lon == null || !(lat > -9 && lat < 8 && lon > 94 && lon < 120)) lat = lon = null;
      return { kode: S(g(r, 'KODE_JARINGAN')), aset: S(g(r, 'KODE_ASSET')), nama: S(g(r, 'NAMA')), alamat: S(g(r, 'ALAMAT')),
        lat: lat == null ? '' : Math.round(lat * 1e6) / 1e6, lon: lon == null ? '' : Math.round(lon * 1e6) / 1e6,
        uid: DIST[num(g(r, 'DIST'))] || WIL[S(g(r, 'NAMA_DIST')).toUpperCase()] || '', up3: titleOf(g(r, 'NAMA_UP3'), 'UP3'), ulp: titleOf(g(r, 'NAMA_UNIT'), 'ULP'),
        status: [tc(g(r, 'STATUS_NYALA')), tc(g(r, 'STATUS_ASSET'))].filter(Boolean).join(' · '), dibuat: isoOf(g(r, 'CREATED_DATE')), diubah: isoOf(g(r, 'UPDATED_DATE')) };
    });
  }

  // tulis satu dataset sebagai file .js seperti hx_*.js di repo (kolom + baris, agar ringkas)
  function toJs(id, rows) {
    const cols = []; rows.forEach((r) => Object.keys(r).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
    if (id === 'hx_ringkasan_unit') return 'window.__D=window.__D||{};window.__D[' + JSON.stringify(id) + ']=' + JSON.stringify(rows) + ';\n';
    return 'window.__D=window.__D||{};window.__D[' + JSON.stringify(id) + ']=(function(c,r){return r.map(function(a){var o={};for(var i=0;i<c.length;i++)o[c[i]]=a[i];return o;});})(' + JSON.stringify(cols).replace(/,/g, ', ') + ',' + JSON.stringify(rows.map((r) => cols.map((c) => (r[c] == null ? '' : r[c])))) + ');\n';
  }

  const api = { build, toJs, giIdentitas };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SSHxBuild = api;
})(typeof window !== 'undefined' ? window : globalThis);
