// Infografis Laporan Harian: rekam harian bulan berjalan + gangguan kode J per UID (sheet Detil Kode).
// - parseDetil(rows): No. Laporan unik (yang pertama muncul), kode J, hitung Permanen (P/S = P) dan Sesaat (P/S = S) per UID,
//   penyulang kronis = penyulang dengan gangguan (P + S) lebih dari 6 kali; 3 teratas per UID dicatat.
// - makeDoc(doc): menambahkan rekam harian (history) ke dokumen harian/latest: satu entri per tanggal realisasi.
// - menggambar baris ke-4 infografis setiap kali infografis digambar (event ss-harian-render).
(function () {
  const UNITS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KSKT', 'KALTIMRA'];
  const ALIAS = { RIAU: 'RKR', KALSELTENG: 'KSKT', 'KALSEL TENG': 'KSKT', 'S2JB ': 'S2JB', BANGKABELITUNG: 'BABEL' };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const KRONIS_MIN = 7; // lebih dari 6 kali
  const SERI = ['saidi', 'saifi', 'ens', 'tot', 'kor', 'cls', 'saidiT', 'saifiT'];
  const str = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
  const uidKey = (s) => { const u = str(s).toUpperCase().replace(/^UI[DW]\s+/, '').replace(/[^A-Z0-9 ]/g, '').trim(); return UNITS.includes(u) ? u : ALIAS[u] || ALIAS[u.replace(/\s/g, '')] || (UNITS.includes(u.replace(/\s/g, '')) ? u.replace(/\s/g, '') : null); };
  const isoDate = (v) => {
    if (v == null || v === '') return '';
    if (typeof v === 'number' && v > 20000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
    const s = str(v); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0];
    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };

  function parseDetil(rows) {
    const hi = rows.findIndex((r) => r && r.some((c) => /^NO\.?\s*LAPORAN$/i.test(str(c))) && r.some((c) => /^KODE$/i.test(str(c))));
    if (hi < 0) throw new Error('sheet Detil Kode: judul kolom NO. LAPORAN / KODE tidak ditemukan');
    const H = rows[hi].map((c) => str(c).toUpperCase());
    const col = (re) => H.findIndex((h) => re.test(h));
    const cU = col(/^UID$/), cN = col(/^NO\.?\s*LAPORAN$/), cP = col(/^PENYULANG$/), cS = col(/^P\s*\/\s*S$/), cK = col(/^KODE$/), cT = col(/^TANGGAL$/);
    const miss = [['UID', cU], ['NO. LAPORAN', cN], ['PENYULANG', cP], ['P/S', cS], ['KODE', cK]].filter(([, i]) => i < 0).map(([n]) => n);
    if (miss.length) throw new Error('sheet Detil Kode: kolom ' + miss.join(', ') + ' tidak ditemukan');
    const seen = new Set(); const ev = [];
    let nRow = 0, dMin = '', dMax = '', noUid = 0;
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue; const no = str(r[cN]); if (!no) continue;
      nRow++; if (seen.has(no)) continue; seen.add(no); // No. Laporan unik: yang pertama muncul
      if (str(r[cK]).toUpperCase() !== 'J') continue;
      const u = uidKey(r[cU]); if (!u) { noUid++; continue; }
      const ps = str(r[cS]).toUpperCase(); if (ps !== 'P' && ps !== 'S') continue;
      const d = cT >= 0 ? isoDate(r[cT]) : ''; if (d) { if (!dMin || d < dMin) dMin = d; if (!dMax || d > dMax) dMax = d; }
      ev.push({ u, d, p: ps === 'P', n: str(r[cP]).toUpperCase() || '(tanpa nama penyulang)' });
    }
    return { baris: nRow, unik: seen.size, j: ev.length, dari: dMin, sampai: dMax, tanpaUid: noUid, ev };
  }

  // gangguan kode J per UID untuk tanggal laporan tgl (H-1):
  //  h = kejadian tanggal tgl; b = bulan ini s.d. tgl (sheet Detil Kode);
  //  c = kumulatif awal tahun s.d. tgl = bulan-bulan sebelumnya dari database Event Padam Penyulang
  //      (kode J, bidang Distribusi, No. Laporan unik) + bulan ini dari Detil Kode;
  //  kronis = penyulang dengan > 6 kali gangguan (P + S) bulan ini s.d. tgl, 3 teratas per UID.
  const DBU = { KALSELTENG: 'KSKT', RIAU: 'RKR' };
  function compute(det, tgl, gps) {
    const [y, mo] = tgl.split('-').map(Number); const m0 = tgl.slice(0, 7);
    const uid = {}; UNITS.forEach((u) => { uid[u] = { h: [0, 0], b: [0, 0], c: [0, 0], k: 0, top: [] }; });
    const peny = {}; UNITS.forEach((u) => { peny[u] = new Map(); });
    det.ev.forEach((e) => {
      if (!e.d || e.d.slice(0, 7) !== m0 || e.d > tgl) return;
      const o = uid[e.u], ix = e.p ? 0 : 1; o.b[ix]++; if (e.d === tgl) o.h[ix]++;
      const x = peny[e.u].get(e.n) || { n: 0, p: 0, s: 0 }; x.n++; if (e.p) x.p++; else x.s++; peny[e.u].set(e.n, x);
    });
    let dbBulan = [];
    if (Array.isArray(gps)) {
      gps.forEach((r) => {
        if (r.KODE !== 'J' || r.BIDANG !== 'DISTRIBUSI') return; const bm = +r.BULAN_NO; if (!(bm >= 1 && bm < mo)) return;
        const u = DBU[r.UNIT] || r.UNIT; if (!uid[u]) return; const n = +r.JUMLAH || 0;
        if (r.PS === 'Permanen') uid[u].c[0] += n; else if (r.PS === 'Sesaat') uid[u].c[1] += n;
        if (!dbBulan.includes(bm)) dbBulan.push(bm);
      });
    }
    dbBulan.sort((a, b) => a - b);
    const T = { h: [0, 0], b: [0, 0], c: [0, 0], k: 0 };
    UNITS.forEach((u) => {
      const o = uid[u]; o.c = [o.c[0] + o.b[0], o.c[1] + o.b[1]];
      const kr = [...peny[u]].filter(([, x]) => x.n >= KRONIS_MIN).sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]));
      o.k = kr.length; o.top = kr.slice(0, 3).map(([n, x]) => [n, x.n, x.p, x.s]);
      ['h', 'b', 'c'].forEach((k) => { T[k][0] += o[k][0]; T[k][1] += o[k][1]; }); T.k += o.k;
    });
    const miss = []; for (let b = 1; b < mo; b++) if (!dbBulan.includes(b)) miss.push(b);
    return { tgl, tahun: y, bulan: mo, dari: det.dari, sampai: det.sampai, dbBulan, dbKurang: miss, uid, SUMKAL: T };
  }

  // satu entri rekam harian dari dokumen harian/latest (nilai bulan realisasi untuk setiap unit)
  function entryOf(doc) {
    if (!doc || !doc.tanggal || !Array.isArray(doc.rows)) return null;
    const [y, mo] = doc.tanggal.split('-').map(Number); const k = 'b' + mo;
    const e = { tgl: doc.tanggal, tahun: y, bulan: mo };
    SERI.forEach((s) => { const o = {}; doc.rows.filter((r) => r.seri === s).forEach((r) => { o[r.unit] = r[k] == null || r[k] === '' ? null : +r[k]; }); e[s] = o; });
    if (doc.detil && doc.detil.SUMKAL && doc.detil.SUMKAL.h) e.detil = doc.detil;
    return e;
  }
  async function freshDoc() {
    try { const r = await fetch('harian_latest.js?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const t = await r.text(); return JSON.parse(t.slice(t.indexOf('=') + 1).trim().replace(/;\s*$/, '')); } } catch (e) { /* pakai yang ada */ }
    return window.SSHarianSaved || window.__HARIAN || null;
  }
  async function makeDoc(base) {
    const prev = await freshDoc();
    let hist = (prev && Array.isArray(prev.history)) ? prev.history.slice() : [];
    const pe = entryOf(prev); if (pe && !hist.some((h) => h.tgl === pe.tgl)) hist.push(pe); // rekam unggahan sebelumnya bila belum tercatat
    const ne = entryOf(base); if (ne) hist = hist.filter((h) => h.tgl !== ne.tgl).concat([ne]);
    hist.sort((a, b) => a.tgl.localeCompare(b.tgl));
    return { ...base, history: hist.slice(-400) };
  }

  // ---------------- tampilan ----------------
  const $ = (id) => document.getElementById(id);
  const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const f0 = nf(0), f2 = nf(2), f3 = nf(3);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NM = { ACEH: 'ACEH', SUMUT: 'SUMUT', SUMBAR: 'SUMBAR', RKR: 'RKR', S2JB: 'S2JB', BABEL: 'BABEL', LAMPUNG: 'LAMPUNG', KALBAR: 'KALBAR', KSKT: 'KSKT', KALTIMRA: 'KALTIMRA' };

  // grafik batang mini: satu batang per tanggal laporan, garis putus-putus = target bulan
  function mini(vals, tgt, opt) {
    const W = opt.w || 340, H = opt.h || 86, L = 4, R = 4, T = 16, B = 14;
    const mx = Math.max(tgt || 0, ...vals.map((v) => v[1])) * 1.12 || 1;
    const n = Math.max(vals.length, 7), bw = (W - L - R) / n, y = (v) => T + (H - T - B) * (1 - v / mx);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="h-rk-svg" role="img" aria-label="${esc(opt.label)}">`;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" class="g"/>`;
    const lab = vals.length <= 10 ? () => true : (i) => i === vals.length - 1 || (vals.length - 1 - i) % 2 === 0;
    vals.forEach(([d, v], i) => {
      const x0 = L + i * bw + bw * 0.16, w = bw * 0.68, over = tgt && v > tgt, last = i === vals.length - 1;
      s += `<rect x="${x0}" y="${y(v)}" width="${w}" height="${Math.max(0, y(0) - y(v))}" rx="1.5" style="fill:${over ? '#d42f2f' : opt.color};opacity:${last ? 1 : 0.55}"/>`;
      if (lab(i)) s += `<text x="${x0 + w / 2}" y="${y(v) - 3}" class="vl${last ? ' lst' : ''}" text-anchor="middle">${opt.fmt(v)}</text>`;
      s += `<text x="${x0 + w / 2}" y="${H - 3}" class="ax" text-anchor="middle">${d}</text>`;
    });
    if (tgt) s += `<line x1="${L}" x2="${W - R}" y1="${y(tgt)}" y2="${y(tgt)}" class="tg"/>`;
    return s + '</svg>';
  }

  // entri rekam harian untuk bulan m (0-based) tahun year, urut tanggal
  function entries(m, year) {
    const doc = window.SSHarianSaved || window.__HARIAN || {};
    let hist = (Array.isArray(doc.history) ? doc.history : []).slice();
    const cur = entryOf(doc); if (cur && !hist.some((h) => h.tgl === cur.tgl)) hist.push(cur);
    if (cur) hist = hist.map((h) => (h.tgl === cur.tgl ? cur : h));
    return hist.filter((h) => h.tahun === year && h.bulan === m + 1).sort((a, b) => a.tgl.localeCompare(b.tgl));
  }

  // event gangguan permanen / sesaat SUMKAL per bulan (Jan s.d. bulan m): kode J, bidang Distribusi dari database
  // Event Padam Penyulang; bulan m sendiri diambil dari sheet Detil Kode unggahan terakhir bila ada.
  function psSeries(m, year) {
    const D = window.SSD && SSD.data('gangguan_ps');
    const gps = (D && D.status === 'ok' && D.data) || (window.__D && window.__D.gangguan_ps) || [];
    const p = Array(m + 1).fill(null), s = Array(m + 1).fill(null);
    gps.forEach((r) => {
      if (r.KODE !== 'J' || r.BIDANG !== 'DISTRIBUSI') return; const i = +r.BULAN_NO - 1; if (!(i >= 0 && i <= m)) return;
      const n = +r.JUMLAH || 0; if (r.PS === 'Permanen') p[i] = (p[i] || 0) + n; else if (r.PS === 'Sesaat') s[i] = (s[i] || 0) + n;
      if (p[i] == null) p[i] = 0; if (s[i] == null) s[i] = 0;
    });
    const wd = entries(m, year).filter((e) => e.detil); let detilTgl = null;
    if (wd.length) { const d = wd[wd.length - 1].detil; p[m] = d.SUMKAL.b[0]; s[m] = d.SUMKAL.b[1]; detilTgl = d.tgl; }
    return { p, s, detilTgl };
  }

  function render(m, year) {
    const mo = m + 1;
    const ent = entries(m, year);
    const last = ent[ent.length - 1];
    const withDet = ent.filter((e) => e.detil); const det = withDet.length ? withDet[withDet.length - 1].detil : null;
    const B3 = `${BLN[m].slice(0, 3)} ${year}`;
    const day = (e) => +e.tgl.slice(8, 10);
    const S = (k) => ent.filter((e) => e[k] && e[k].SUMKAL != null).map((e) => [day(e), e[k].SUMKAL]);

    // 1) rekam harian di dalam kartu SAIDI / SAIFI (menggantikan bilah target vs realisasi) dan ENS
    const put = (card, k, tKey, color, fmt, unit) => {
      const box = document.querySelector(`#${card} .h-bars`); const v = S(k);
      if (!box || !v.length) return;
      const tg = last[tKey] && last[tKey].SUMKAL;
      box.className = 'h-bars h-rkb';
      box.innerHTML = `<div class="h-rkb-h"><b>Rekam harian ${esc(B3)}</b><span>${tg ? `<i class="tg"></i>Target ${fmt(tg)}` : ''}<i class="ov"></i>Di atas target</span></div>${mini(v, tg, { color, fmt, label: `Rekam harian ${k.toUpperCase()} (${unit})` })}`;
    };
    put('h-saidi', 'saidi', 'saidiT', '#2e9e4f', (v) => f2.format(v), 'menit/pelanggan');
    put('h-saifi', 'saifi', 'saifiT', '#2e9e4f', (v) => f3.format(v), 'kali/pelanggan');
    const ensBody = document.querySelector('#harian-root .h-ens .h-body');
    if (ensBody) {
      let el = ensBody.querySelector('.h-rkb'); const v = S('ens');
      if (v.length) {
        if (!el) { el = document.createElement('div'); el.className = 'h-bars h-rkb'; ensBody.appendChild(el); }
        el.innerHTML = `<div class="h-rkb-h"><b>Rekam harian ENS ${esc(B3)} (kWh)</b><span>angka bawah = tanggal laporan</span></div>${mini(v, null, { color: '#1e8a45', fmt: (x) => f0.format(x), label: 'Rekam harian ENS (kWh)', w: 560, h: 96 })}`;
      } else if (el) el.remove();
    }

    // 2) gangguan kode J per UID, di samping total event (baris 3)
    const card = $('h-kj-card'), row = $('h-r3');
    if (!card || !row) return;
    card.hidden = !det; row.classList.toggle('h-r3kj', !!det);
    if (!det) return;
    if (window.SSHarianTot) window.SSHarianTot.draw({ w: 600, h: 230 });
    const T = det.SUMKAL;
    const dd = (iso) => iso ? `${+iso.slice(8)} ${BLN[+iso.slice(5, 7) - 1].slice(0, 3)}` : '';
    const BLm = BLN[det.bulan - 1];
    const z = (v) => (v ? f0.format(v) : '<span class="z">0</span>');
    const hiH = Math.max(...UNITS.map((u) => det.uid[u].h[0] + det.uid[u].h[1]));
    const tr = UNITS.map((u) => { const d = det.uid[u], k1 = d.top[0];
      const kr = k1 ? `<td class="c nm">${esc(k1[0])}${d.k > 1 ? ` <small>+${d.k - 1}</small>` : ''}</td><td class="h-n">${z(k1[2])}</td><td class="h-n">${z(k1[3])}</td><td class="h-n kr">${f0.format(k1[1])}</td>`
        : '<td class="c nm z">–</td><td class="h-n z">–</td><td class="h-n z">–</td><td class="h-n z">–</td>';
      return `<tr${hiH && d.h[0] + d.h[1] === hiH ? ' class="h-hot"' : ''}><td>${NM[u]}</td><td class="h-n">${z(d.h[0])}</td><td class="h-n">${z(d.h[1])}</td><td class="h-n c">${z(d.b[0])}</td><td class="h-n">${z(d.b[1])}</td><td class="h-n c">${z(d.c[0])}</td><td class="h-n">${z(d.c[1])}</td>${kr}</tr>`; }).join('');
    const dbTxt = det.dbBulan.length ? `${BLN[det.dbBulan[0] - 1].slice(0, 3)}${det.dbBulan.length > 1 ? '–' + BLN[det.dbBulan[det.dbBulan.length - 1] - 1].slice(0, 3) : ''}` : '';
    const kurang = det.dbKurang.length ? ` <b class="warn">${det.dbKurang.map((b) => BLN[b - 1].slice(0, 3)).join(', ')} belum ada di database.</b>` : '';
    $('h-kj').innerHTML = `
      <div class="h-tbox"><table class="h-kj-t">
        <tr><th rowspan="2">UNIT</th><th colspan="2" class="g c">REALISASI H-1<br><small>${dd(det.tgl)}</small></th><th colspan="2" class="g c">BULAN BERJALAN<br><small>${esc(BLm)}</small></th><th colspan="2" class="g c">KUMULATIF<br><small>Jan–${esc(BLm.slice(0, 3))} ${det.tahun}</small></th><th colspan="4" class="g c">PENYULANG KRONIS NO. 1</th></tr>
        <tr class="sub"><th class="h-n c">P</th><th class="h-n">S</th><th class="h-n c">P</th><th class="h-n">S</th><th class="h-n c">P</th><th class="h-n">S</th><th class="c nm">Nama</th><th class="h-n">P</th><th class="h-n">S</th><th class="h-n">Total</th></tr>
        ${tr}
        <tr class="tot"><td>SUMKAL</td><td class="h-n">${f0.format(T.h[0])}</td><td class="h-n">${f0.format(T.h[1])}</td><td class="h-n c">${f0.format(T.b[0])}</td><td class="h-n">${f0.format(T.b[1])}</td><td class="h-n c">${f0.format(T.c[0])}</td><td class="h-n">${f0.format(T.c[1])}</td><td class="c nm" colspan="4">${f0.format(T.k)} penyulang kronis</td></tr>
      </table></div>
      <div class="h-note">P = permanen, S = sesaat; kode J, No. Laporan unik. Penyulang kronis no. 1 = penyulang dengan gangguan permanen + sesaat terbanyak (lebih dari 6 kali) di ${esc(BLm)} per UID; +n = jumlah penyulang kronis lain di UID itu. Kumulatif = ${dbTxt ? `database Event Padam Penyulang ${dbTxt} + ` : ''}Detil Kode ${esc(BLm.slice(0, 3))}.${kurang} Baris merah: gangguan H-1 tertinggi.</div>`;
  }
  // panel di samping grafik trend: penambahan harian per UID untuk permanen, sesaat, koreksi, cleansing
  function side(m, year, raw) {
    const el = $('h-kcSide'); if (!el) return;
    const ent = entries(m, year), last = ent[ent.length - 1], prev = ent[ent.length - 2];
    const wd = ent.filter((e) => e.detil), det = wd.length ? wd[wd.length - 1].detil : null;
    const dd = (iso) => `${+iso.slice(8)} ${BLN[+iso.slice(5, 7) - 1].slice(0, 3)}`;
    // permanen / sesaat bulan ini tanpa Detil Kode: dari database Event Padam Penyulang
    const db = {}; if (!det) {
      const D = window.SSD && SSD.data('gangguan_ps'); const gps = (D && D.status === 'ok' && D.data) || (window.__D && window.__D.gangguan_ps) || [];
      gps.forEach((r) => { if (r.KODE !== 'J' || r.BIDANG !== 'DISTRIBUSI' || +r.BULAN_NO !== m + 1) return; const u = DBU[r.UNIT] || r.UNIT; const o = db[u] || (db[u] = [0, 0]); if (r.PS === 'Permanen') o[0] += +r.JUMLAH || 0; else if (r.PS === 'Sesaat') o[1] += +r.JUMLAH || 0; });
    }
    const rv = (k, u) => { const o = raw && raw[k] && raw[k][u]; return o ? +o[m] || 0 : null; };
    const val = (k, u) => (last && last[k] && last[k][u] != null ? last[k][u] : rv(k, u));
    const inc = (k, u) => { if (!last || !last[k] || last[k][u] == null) return null; if (prev && prev[k] && prev[k][u] != null) return last[k][u] - prev[k][u]; return +last.tgl.slice(8) === 1 ? last[k][u] : null; };
    const rows = UNITS.concat('SUMKAL').map((u) => {
      const ps = u === 'SUMKAL' ? (det ? det.SUMKAL : null) : det ? det.uid[u] : null;
      const dbv = u === 'SUMKAL' ? Object.values(db).reduce((a, x) => [a[0] + x[0], a[1] + x[1]], [0, 0]) : db[u] || (Object.keys(db).length ? [0, 0] : null);
      return { u, p: [ps ? ps.b[0] : dbv ? dbv[0] : null, ps ? ps.h[0] : null], s: [ps ? ps.b[1] : dbv ? dbv[1] : null, ps ? ps.h[1] : null], k: [val('kor', u), inc('kor', u)], c: [val('cls', u), inc('cls', u)] };
    });
    const hi = {}; ['p', 's', 'k', 'c'].forEach((k) => { hi[k] = Math.max(0, ...rows.filter((r) => r.u !== 'SUMKAL').map((r) => r[k][1] || 0)); });
    const nv = (v) => (v == null ? '<span class="z">–</span>' : f0.format(v));
    const iv = (v, k, tot) => (v == null ? '<td class="h-n d"><span class="z">–</span></td>' : `<td class="h-n d${v > 0 ? ' up' : ''}${!tot && v > 0 && v === hi[k] ? ' top' : ''}">${v > 0 ? '+' + f0.format(v) : v < 0 ? '−' + f0.format(-v) : '0'}</td>`);
    const tr = rows.map((r) => { const t = r.u === 'SUMKAL';
      return `<tr${t ? ' class="tot"' : ''}><td>${NM[r.u] || r.u}</td>${['p', 's', 'k', 'c'].map((k) => `<td class="h-n c">${nv(r[k][0])}</td>${iv(r[k][1], k, t)}`).join('')}</tr>`; }).join('');
    const hP = det ? `+H-1<small>${dd(det.tgl)}</small>` : '+H-1<small>&nbsp;</small>';
    const hK = last ? `+harian<small>${dd(last.tgl)}</small>` : '+harian<small>&nbsp;</small>';
    const bl = BLN[m].slice(0, 3);
    el.innerHTML = `<div class="h-ttlbar">PENAMBAHAN HARIAN PER UID${last ? ' · LAPORAN ' + dd(last.tgl).toUpperCase() : ''}</div>
      <div class="h-tbox" style="border-radius:0 0 5px 5px"><table class="h-kd-t">
        <tr><th rowspan="2">UNIT</th><th colspan="2" class="g c">PERMANEN</th><th colspan="2" class="g c">SESAAT</th><th colspan="2" class="g c">KOREKSI</th><th colspan="2" class="g c">CLEANSING</th></tr>
        <tr class="sub"><th class="h-n c">${bl}</th><th class="h-n">${hP}</th><th class="h-n c">${bl}</th><th class="h-n">${hP}</th><th class="h-n c">${bl}</th><th class="h-n">${hK}</th><th class="h-n c">${bl}</th><th class="h-n">${hK}</th></tr>
        ${tr}
      </table></div>
      <div class="h-note">${esc(bl)} = jumlah bulan berjalan. Permanen/sesaat: kode J dari sheet Detil Kode, +H-1 = kejadian pada tanggal laporan${det ? '' : ' (belum ada Detil Kode bulan ini; angka bulan dari database Event Padam Penyulang)'}. Koreksi/cleansing: +harian = selisih dengan laporan ${prev ? dd(prev.tgl) : 'sebelumnya'}${prev && last && (Date.parse(last.tgl) - Date.parse(prev.tgl)) > 864e5 ? ' (lebih dari satu hari)' : ''}. Merah = bertambah; kotak merah = penambahan terbanyak.</div>`;
  }
  document.addEventListener('ss-harian-render', (e) => { try { render(e.detail.m, e.detail.year); } catch (x) { console.error(x); } try { side(e.detail.m, e.detail.year, e.detail.raw); } catch (x) { console.error(x); } });

  window.SSHarianRekam = { parseDetil, compute, makeDoc, entryOf, psSeries };
})();
