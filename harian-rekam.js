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
    const seen = new Set(); const agg = {}; UNITS.forEach((u) => { agg[u] = { p: 0, s: 0, peny: new Map() }; });
    let nRow = 0, nJ = 0, dMin = '', dMax = '', noUid = 0;
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue; const no = str(r[cN]); if (!no) continue;
      nRow++; if (seen.has(no)) continue; seen.add(no); // No. Laporan unik: yang pertama muncul
      if (str(r[cK]).toUpperCase() !== 'J') continue;
      const u = uidKey(r[cU]); if (!u) { noUid++; continue; }
      const ps = str(r[cS]).toUpperCase(); if (ps !== 'P' && ps !== 'S') continue;
      nJ++; const a = agg[u]; if (ps === 'P') a.p++; else a.s++;
      const pn = str(r[cP]).toUpperCase() || '(tanpa nama penyulang)';
      const x = a.peny.get(pn) || { n: 0, p: 0, s: 0 }; x.n++; if (ps === 'P') x.p++; else x.s++; a.peny.set(pn, x);
      if (cT >= 0) { const d = isoDate(r[cT]); if (d) { if (!dMin || d < dMin) dMin = d; if (!dMax || d > dMax) dMax = d; } }
    }
    const uid = {}; const T = { p: 0, s: 0, k: 0 };
    UNITS.forEach((u) => {
      const a = agg[u]; const kr = [...a.peny].filter(([, x]) => x.n >= KRONIS_MIN).sort((x, y) => y[1].n - x[1].n || x[0].localeCompare(y[0]));
      uid[u] = { p: a.p, s: a.s, k: kr.length, top: kr.slice(0, 3).map(([n, x]) => [n, x.n, x.p, x.s]) };
      T.p += a.p; T.s += a.s; T.k += kr.length;
    });
    return { baris: nRow, unik: seen.size, j: nJ, dari: dMin, sampai: dMax, tanpaUid: noUid, uid, SUMKAL: T };
  }

  // satu entri rekam harian dari dokumen harian/latest (nilai bulan realisasi untuk setiap unit)
  function entryOf(doc) {
    if (!doc || !doc.tanggal || !Array.isArray(doc.rows)) return null;
    const [y, mo] = doc.tanggal.split('-').map(Number); const k = 'b' + mo;
    const e = { tgl: doc.tanggal, tahun: y, bulan: mo };
    SERI.forEach((s) => { const o = {}; doc.rows.filter((r) => r.seri === s).forEach((r) => { o[r.unit] = r[k] == null || r[k] === '' ? null : +r[k]; }); e[s] = o; });
    if (doc.detil) e.detil = { uid: doc.detil.uid, SUMKAL: doc.detil.SUMKAL, dari: doc.detil.dari, sampai: doc.detil.sampai };
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

  function trend(vals, tgt, opt) {
    // vals: [[tanggal, nilai]] satu batang per tanggal laporan; tgt: target bulan (garis putus-putus)
    const W = 430, H = 160, L = 36, R = 8, T = 18, B = 22;
    const mx = Math.max(tgt || 0, ...vals.map((v) => v[1])) * 1.18 || 1;
    const n = Math.max(vals.length, 6), bw = (W - L - R) / n, y = (v) => T + (H - T - B) * (1 - v / mx);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="h-rk-svg" role="img" aria-label="${esc(opt.label)}">`;
    [0, 0.5, 1].forEach((f) => { const v = (mx / 1.18) * f; s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${L - 4}" y="${y(v) + 3}" class="ax" text-anchor="end">${opt.fmtAx(v)}</text>`; });
    vals.forEach(([d, v], i) => {
      const x0 = L + i * bw + bw * 0.18, w = bw * 0.64, over = tgt && v > tgt, last = i === vals.length - 1;
      s += `<rect x="${x0}" y="${y(v)}" width="${w}" height="${Math.max(0, y(0) - y(v))}" rx="2" style="fill:${over ? '#d83a34' : opt.color};opacity:${last ? 1 : 0.72}"/>`;
      if (vals.length <= 12 || last || i % 2 === 0) s += `<text x="${x0 + w / 2}" y="${y(v) - 4}" class="vl" text-anchor="middle">${opt.fmt(v)}</text>`;
      s += `<text x="${x0 + w / 2}" y="${H - 7}" class="ax" text-anchor="middle">${d}</text>`;
    });
    if (tgt) s += `<line x1="${L}" x2="${W - R}" y1="${y(tgt)}" y2="${y(tgt)}" class="tg"/><text x="${W - R}" y="${y(tgt) - 4}" class="tgl" text-anchor="end">Target ${opt.fmt(tgt)}</text>`;
    return s + '</svg>';
  }

  function render(m, year) {
    const sec = $('h-r4'); if (!sec) return;
    const doc = window.SSHarianSaved || window.__HARIAN || {};
    const mo = m + 1;
    let hist = (Array.isArray(doc.history) ? doc.history : []).slice();
    const cur = entryOf(doc); if (cur && !hist.some((h) => h.tgl === cur.tgl)) hist.push(cur);
    if (cur) hist = hist.map((h) => (h.tgl === cur.tgl ? cur : h));
    const ent = hist.filter((h) => h.tahun === year && h.bulan === mo).sort((a, b) => a.tgl.localeCompare(b.tgl));
    const last = ent[ent.length - 1];
    const det = last && last.detil ? last.detil : null;
    sec.hidden = !ent.length;
    if (!ent.length) return;
    const B = `${BLN[m].toUpperCase()} ${year}`;
    $('h-rk-bln').textContent = B;
    const day = (e) => +e.tgl.slice(8, 10);
    const S = (k) => ent.filter((e) => e[k] && e[k].SUMKAL != null).map((e) => [day(e), e[k].SUMKAL]);
    const tS = last.saidiT && last.saidiT.SUMKAL, tF = last.saifiT && last.saifiT.SUMKAL;
    const cols = ent.map((e) => `<th>${day(e)}</th>`).join('');
    const row = (lab, k, fmt, unitK) => `<tr><td class="lb">${lab}</td>${ent.map((e) => { const v = unitK ? (e.detil ? e.detil.SUMKAL[unitK] : null) : e[k] && e[k].SUMKAL; return `<td>${v == null ? '–' : fmt(v)}</td>`; }).join('')}</tr>`;
    $('h-rekam').innerHTML = `
      <div class="h-rk-charts">
        <div><div class="h-rk-h">SAIDI SUMKAL per tanggal laporan <small>menit/pelanggan, kumulatif ${esc(BLN[m])}</small></div>${trend(S('saidi'), tS, { color: '#2fa45a', fill: 'rgba(47,164,90,.14)', fmt: (v) => f2.format(v), fmtAx: (v) => f0.format(v), label: 'Rekam harian SAIDI' })}</div>
        <div><div class="h-rk-h">SAIFI SUMKAL per tanggal laporan <small>kali/pelanggan, kumulatif ${esc(BLN[m])}</small></div>${trend(S('saifi'), tF, { color: '#0f8a9d', fill: 'rgba(37,180,196,.16)', fmt: (v) => f3.format(v), fmtAx: (v) => f2.format(v), label: 'Rekam harian SAIFI' })}</div>
      </div>
      <div class="h-rk-tbl"><table><thead><tr><th class="lb">Tanggal laporan</th>${cols}</tr></thead><tbody>
        ${row('SAIDI (menit/plg)', 'saidi', (v) => f2.format(v))}
        ${row('SAIFI (kali/plg)', 'saifi', (v) => f3.format(v))}
        ${row('ENS (kWh)', 'ens', (v) => f0.format(v))}
        ${row('Total event', 'tot', (v) => f0.format(v))}
        ${row('Kode J permanen', null, (v) => f0.format(v), 'p')}
        ${row('Kode J sesaat', null, (v) => f0.format(v), 's')}
      </tbody></table></div>
      <p class="h-rk-note">Satu kolom per unggahan laporan harian (tanggal realisasi). Batang merah: realisasi melebihi target bulan; angka di bawah batang = tanggal laporan. Bulan yang sudah lewat tetap diperbarui dari kolom bulannya di sheet Prognosa.</p>`;

    // gangguan kode J per UID
    const kj = $('h-kj'); $('h-kj-bln').textContent = B;
    if (!det) { kj.innerHTML = '<p class="h-rk-note">Belum ada data sheet Detil Kode untuk bulan ini. Unggah file laporan harian yang memuat sheet Detil Kode.</p>'; return; }
    const mx = Math.max(1, ...UNITS.map((u) => det.uid[u] ? det.uid[u].p + det.uid[u].s : 0));
    const per = det.dari && det.sampai ? `${+det.dari.slice(8)} ${BLN[+det.dari.slice(5, 7) - 1].slice(0, 3)} – ${+det.sampai.slice(8)} ${BLN[+det.sampai.slice(5, 7) - 1].slice(0, 3)} ${det.sampai.slice(0, 4)}` : '';
    const rows = UNITS.map((u) => {
      const d = det.uid[u] || { p: 0, s: 0, k: 0, top: [] }; const t = d.p + d.s;
      const chips = d.top.length ? d.top.map(([n, c]) => `<span class="h-kr">${esc(n)} <b>${f0.format(c)}</b></span>`).join('') + (d.k > d.top.length ? `<span class="h-kr-more">+${d.k - d.top.length} lainnya</span>` : '') : '<span class="h-kr-none">–</span>';
      return `<tr class="${d.k ? 'kr' : ''}"><td class="u">${NM[u]}</td><td class="n">${f0.format(d.p)}</td><td class="n">${f0.format(d.s)}</td><td class="n b">${f0.format(t)}</td>
        <td class="bar"><div class="h-kj-bar" style="width:${(t / mx * 100).toFixed(1)}%"><i class="p" style="width:${t ? d.p / t * 100 : 0}%"></i><i class="s" style="width:${t ? d.s / t * 100 : 0}%"></i></div></td>
        <td class="n">${d.k ? f0.format(d.k) : '–'}</td><td class="kr-l">${chips}</td></tr>`;
    }).join('');
    const T = det.SUMKAL;
    kj.innerHTML = `
      <div class="h-kj-tbl"><table>
        <thead><tr><th>UID</th><th class="n">Permanen</th><th class="n">Sesaat</th><th class="n">Total</th><th class="bar"><span class="h-kj-lg"><i class="p"></i>P <i class="s"></i>S</span></th><th class="n">Kronis</th><th>3 penyulang kronis teratas (kali)</th></tr></thead>
        <tbody>${rows}<tr class="tot"><td class="u">SUMKAL</td><td class="n">${f0.format(T.p)}</td><td class="n">${f0.format(T.s)}</td><td class="n b">${f0.format(T.p + T.s)}</td><td></td><td class="n">${f0.format(T.k)}</td><td></td></tr></tbody>
      </table></div>
      <p class="h-rk-note">Sheet Detil Kode${per ? ` (${per})` : ''}: No. Laporan unik (yang pertama muncul), kode J; Permanen = P/S bernilai P, Sesaat = S. Penyulang kronis: gangguan permanen + sesaat lebih dari 6 kali; baris merah = UID yang punya penyulang kronis.</p>`;
  }
  document.addEventListener('ss-harian-render', (e) => { try { render(e.detail.m, e.detail.year); } catch (x) { console.error(x); } });

  window.SSHarianRekam = { parseDetil, makeDoc, entryOf };
})();
