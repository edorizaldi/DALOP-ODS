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

  function catalog(D, m) {
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
    return { groups, values, tables };
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
    const first = Math.round(cx * Math.min(0.4, 1.8 / (cols + 0.8))); const other = Math.floor((cx - first) / Math.max(1, cols - 1));
    const widths = [first, ...Array(cols - 1).fill(other)];
    const rh = Math.floor(cy / rows); const rowPt = rh / 12700;
    // ukuran huruf mengikuti tinggi baris dan lebar kolom (kata terpanjang tidak terpotong)
    let fit = rowPt * 0.5;
    widths.forEach((w, j) => { const words = [T.head[j], ...T.rows.map((r) => r[j])].join(' ').split(/\s+/); const L = Math.max(3, ...words.map((x) => x.length)); fit = Math.min(fit, (w / 12700 - 8) / (L * 0.52)); });
    const sz = Math.max(600, Math.min(1400, Math.floor(fit * 2) * 50));
    const ln = (tag) => `<a:${tag} w="6350"><a:solidFill><a:srgbClr val="C9D6EA"/></a:solidFill></a:${tag}>`;
    const cell = (txt, o) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="${o.al}"/><a:r><a:rPr lang="id-ID" sz="${sz}"${o.b ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${o.c}"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${esc(txt)}</a:t></a:r></a:p></a:txBody><a:tcPr marL="45720" marR="45720" marT="9144" marB="9144" anchor="ctr">${ln('lnL')}${ln('lnR')}${ln('lnT')}${ln('lnB')}<a:solidFill><a:srgbClr val="${o.f}"/></a:solidFill></a:tcPr></a:tc>`;
    const tr = (cells, o) => `<a:tr h="${rh}">${cells.map((t, j) => cell(t, { ...o(j), al: j ? 'ctr' : 'l' })).join('')}</a:tr>`;
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
