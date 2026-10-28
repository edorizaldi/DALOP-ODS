// Pembuat slide PowerPoint dari database dashboard Sumkal (6 slide, gaya infografis).
// Dipakai tab "Buat Slide PowerPoint": SSSlides.build(PptxGenJS, datasets, cutoff, assets) → objek presentasi pptxgenjs.
// datasets: { kumulatif, bulanan, target, gangguan_ps, kc_bulanan, gangguan_dupont } (baris seperti di dashboard).
(function (root) {
  'use strict';
  const HEX = { navy: '13254A', blue: '1E5BC6', ink: '1B3F8F', orange: 'F28C28', green: '2E8B57', yellow: 'FFC81E', red: 'C0392B', grid: 'D9E4F2', muted: '5B6B86' };
  // warna tema ditulis langsung (hex) agar tidak bergantung pada tema PowerPoint
  const C = { text1: '13254A', text2: '1B3F8F', background1: 'FFFFFF', background2: 'EAF3FC', accent1: '1E5BC6', accent2: 'F28C28', accent3: '2E8B57', accent4: 'FFC81E', accent5: 'C0392B', accent6: '5AA7EF' };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const UIDS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const nf = (v, d) => (v == null || !isFinite(v) ? '–' : Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const NAME = { ACEH: 'UID ACEH', SUMUT: 'UID SUMUT', SUMBAR: 'UID SUMBAR', RKR: 'UID RKR', S2JB: 'UID S2JB', BABEL: 'UID BABEL', LAMPUNG: 'UID LAMPUNG', KALBAR: 'UID KALBAR', KALSELTENG: 'UID KSKT', KALTIMRA: 'UID KALTIMRA' };
  const BOX = {
    ACEH: [2.3, 1.36], SUMUT: [0.3, 2.3], SUMBAR: [0.3, 3.32], RKR: [3.45, 2.36],
    S2JB: [0.75, 4.5], BABEL: [5.2, 3.86], LAMPUNG: [5.2, 4.8],
    KALBAR: [5.9, 1.8], KALTIMRA: [7.95, 2.02], KALSELTENG: [7.75, 4.3],
  };
  const BW = 1.82, BH = 0.86;
  const PINS = {"W": 1860, "H": 810, "pins": {"KALBAR": {"x": 1195.6, "y": 404.3}, "KALSELTENG": {"x": 1344.1, "y": 502.7}, "KALTIMRA": {"x": 1540.9, "y": 368.9}, "ACEH": {"x": 276.2, "y": 125.1}, "BABEL": {"x": 898.8, "y": 556.6}, "S2JB": {"x": 746.0, "y": 606.7}, "RKR": {"x": 593.4, "y": 366.0}, "LAMPUNG": {"x": 800.5, "y": 717.5}, "SUMBAR": {"x": 506.0, "y": 453.7}, "SUMUT": {"x": 415.1, "y": 256.7}}};
  const MAP = { x: 0.25, y: 1.45, w: 9.4 }; MAP.h = MAP.w * PINS.H / PINS.W;
  const pinAt = (u) => ({ x: MAP.x + PINS.pins[u].x * MAP.w / PINS.W, y: MAP.y + PINS.pins[u].y * MAP.h / PINS.H });
  const num = (v) => (v == null || v === '' ? 0 : Number(v));

  // ---------- data dari dataset dashboard ----------
  function months(D) {
    const k = (D.kumulatif || []).filter((r) => num(r.tahun) === 2026 && r.level === 'Sumkal').map((r) => num(r.bulan));
    const now = new Date(); const running = now.getFullYear() === 2026 ? now.getMonth() + 1 : 13;
    const lastS = Math.max(0, ...k.filter((m) => m < running));
    const lastG = Math.max(0, ...(D.gangguan_ps || []).map((r) => num(r.BULAN_NO)));
    const lastK = Math.max(0, ...(D.kc_bulanan || []).map((r) => num(r.BULAN_NO)));
    const lastD = Math.max(0, ...(D.gangguan_dupont || []).map((r) => num(r.BULAN_NO)));
    return { lastS, lastG, lastK, lastD, max: Math.min(lastS, lastG, lastK, lastD) };
  }
  function compute(D, m) {
    const U = [...UIDS, 'SUMKAL'];
    const lvl = (u) => (u === 'SUMKAL' ? 'Sumkal' : 'UID');
    const K = (u, b) => (D.kumulatif || []).find((r) => num(r.tahun) === 2026 && r.level === lvl(u) && String(r.uid).toUpperCase() === u && num(r.bulan) === b);
    const Bn = (u, b) => (D.bulanan || []).find((r) => num(r.tahun) === 2026 && r.level === lvl(u) && String(r.uid).toUpperCase() === u && num(r.bulan) === b);
    const Tg = (u, b) => (D.target || []).find((r) => String(r.unit).toUpperCase() === u && num(r.bulan) === b);
    const rng = [...Array(m)].map((_, i) => i + 1);
    const data = { last: m, units: {}, trend: {} };
    U.forEach((u) => {
      const k = K(u, m) || {}, t12 = Tg(u, 12) || {}, tm = Tg(u, m) || {};
      data.units[u] = {
        saidi: { t26: num(t12.target_saidi), tm: num(tm.target_saidi), r: num(k.saidi_dist) },
        saifi: { t26: num(t12.target_saifi), tm: num(tm.target_saifi), r: num(k.saifi_dist) },
      };
    });
    ['saidi', 'saifi'].forEach((mt) => { data.trend[mt] = { t: rng.map((b) => num((Tg('SUMKAL', b) || {})['target_' + mt])), r: rng.map((b) => num((K('SUMKAL', b) || {})[mt + '_dist'])) }; });
    const data3 = { last: m, saidi: { bln: {}, kum: {} }, saifi: { bln: {}, kum: {} } };
    U.forEach((u) => {
      data3.saidi.bln[u] = rng.map((b) => { const r = Bn(u, b) || {}; return num(r.pelanggan) ? num(r.jam_dist) / num(r.pelanggan) * 60 : 0; });
      data3.saifi.bln[u] = rng.map((b) => { const r = Bn(u, b) || {}; return num(r.pelanggan) ? num(r.padam_dist) / num(r.pelanggan) : 0; });
      data3.saidi.kum[u] = rng.map((b) => num((K(u, b) || {}).saidi_dist));
      data3.saifi.kum[u] = rng.map((b) => num((K(u, b) || {}).saifi_dist));
    });
    // gangguan kode J, bidang Distribusi (P/S) + koreksi/cleansing kode J
    const z = () => Array(m).fill(0);
    const mon = { P: z(), S: z(), C: z(), K: z() }; const uid = {}; UIDS.forEach((u) => { uid[u] = { P: 0, S: 0, C: 0, K: 0 }; });
    (D.gangguan_ps || []).forEach((r) => { const b = num(r.BULAN_NO); if (r.KODE !== 'J' || r.BIDANG !== 'DISTRIBUSI' || b > m || b < 1) return; const k = r.PS === 'Permanen' ? 'P' : r.PS === 'Sesaat' ? 'S' : null; if (!k) return; mon[k][b - 1] += num(r.JUMLAH); if (uid[r.UNIT]) uid[r.UNIT][k] += num(r.JUMLAH); });
    (D.kc_bulanan || []).forEach((r) => { const b = num(r.BULAN_NO); if (r.KODE !== 'J' || b > m || b < 1) return; const k = r.JENIS === 'Cleansing' ? 'C' : 'K'; mon[k][b - 1] += num(r.JUMLAH); if (uid[r.UID]) uid[r.UID][k] += num(r.JUMLAH); });
    const data5 = { last: m, mon, uid };
    // penyebab gangguan (Dupont), bidang Distribusi
    const cause = {}, inv = {}; const mon6 = z();
    (D.gangguan_dupont || []).forEach((r) => { const b = num(r.BULAN_NO); if (r.BIDANG !== 'DISTRIBUSI' || b > m || b < 1) return; const c = r.CAUSE || '(kosong)'; const n = num(r.JUMLAH);
      (cause[c] = cause[c] || z())[b - 1] += n; mon6[b - 1] += n; if (c === 'Dalam Investigasi') (inv[r.UNIT] = inv[r.UNIT] || z())[b - 1] += n; });
    const data6 = { last: m, cause, inv, mon: mon6 };
    return { data, data3, data5, data6 };
  }

  function build(PptxGenJS, D, m, A, plan) {
    const { data, data3, data5, data6 } = compute(D, m);
    const LAST = m;
    const icon = (name, color) => A.icons[name + '|' + color] || A.icons['FaCircle|FFFFFF'];
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE';
    pres.title = `Kinerja Keandalan Sumkal s.d. ${BLN[m - 1]} 2026`;
    pres.author = 'Divisi Operasi Distribusi Sumatera dan Kalimantan';
    pres.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial' };
    pres.defineSlideMaster({
      title: 'KINERJA_UID',
      background: { data: A.bg },
      objects: [
        { image: { data: A.danantara, x: 0.3, y: 0.22, w: 2.05, h: 0.51, altText: 'Danantara Indonesia' } },
        { image: { data: A.pln, x: 12.45, y: 0.12, w: 0.56, h: 0.82, altText: 'PLN' } },
      ],
    });
    const KM = [
      { key: 'saidi', name: 'SAIDI', unit: 'Menit/pelanggan', unitShort: 'menit/pelanggan', dec: 2 },
      { key: 'saifi', name: 'SAIFI', unit: 'Kali/pelanggan', unitShort: 'kali/pelanggan', dec: 2 },
    ];
    const kinerja = async (M) => {
        const s = pres.addSlide({ masterName: 'KINERJA_UID' });
        // judul
        s.addText(`KINERJA ${M.name} PER UID`, { x: 2.6, y: 0.12, w: 8.1, h: 0.55, fontSize: 30, bold: true, color: C.text1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Judul' });
        s.addText('SUMATERA – KALIMANTAN', { x: 2.6, y: 0.64, w: 8.1, h: 0.32, fontSize: 16, bold: true, color: C.text1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Subjudul' });
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.85, y: 1.0, w: 3.6, h: 0.36, rectRadius: 0.18, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: 'Periode latar' });
        s.addText(`Realisasi s.d. ${BLN[LAST - 1]} 2026`, { x: 4.85, y: 1.0, w: 3.6, h: 0.36, fontSize: 14, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Periode' });
        s.addText([{ text: 'Satuan: ', options: { color: C.text1 } }, { text: M.unit, options: { bold: true, color: C.text1 } }], { x: 8.6, y: 1.0, w: 2.6, h: 0.36, fontSize: 11, align: 'left', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Satuan' });

        // peta + label wilayah
        s.addImage({ data: A.map, x: MAP.x, y: MAP.y, w: MAP.w, h: MAP.h, altText: 'Peta unit induk distribusi Sumatera dan Kalimantan', objectName: 'Peta' });
        const pill = (t, x, y, w) => {
          s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.32, rectRadius: 0.16, fill: { color: C.accent4 }, line: { color: C.accent4 }, objectName: t + ' latar' });
          s.addText(t, { x, y, w, h: 0.32, fontSize: 12, bold: true, color: C.text1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: t });
        };
        pill('WILAYAH SUMATERA', 0.3, 1.38, 2.0);
        pill('WILAYAH KALIMANTAN', 7.45, 1.38, 2.2);

        // garis penunjuk dulu (di bawah kotak dan pin)
        for (const u of Object.keys(BOX)) {
          const p = pinAt(u); const [bx, by] = BOX[u];
          const cx = Math.min(Math.max(p.x, bx), bx + BW), cy = Math.min(Math.max(p.y, by), by + BH);
          const ex = cx === p.x && cy === p.y ? bx : cx, ey = cy;
          const x1 = Math.min(ex, p.x), y1 = Math.min(ey, p.y);
          s.addShape(pres.shapes.LINE, { x: x1, y: y1, w: Math.max(0.01, Math.abs(p.x - ex)), h: Math.max(0.01, Math.abs(p.y - ey)), flipH: (p.x - ex) * (p.y - ey) < 0, line: { color: C.accent5, width: 1.5 }, objectName: 'Penunjuk ' + NAME[u] });
        }
        // pin
        for (const u of Object.keys(BOX)) {
          const p = pinAt(u);
          s.addImage({ data: A.pin, x: p.x - 0.13, y: p.y - 0.35, w: 0.26, h: 0.35, altText: 'Penanda ' + NAME[u], objectName: 'Pin ' + NAME[u] });
        }
        // kotak keterangan per UID
        for (const u of Object.keys(BOX)) {
          const v = data.units[u][M.key]; const [bx, by] = BOX[u];
          const ok = v.r <= v.tm;
          const cellL = { fontSize: 9, color: C.text1, margin: [0, 0.05, 0, 0.07], valign: 'middle' };
          const cellR = { fontSize: 9, bold: true, color: C.text1, align: 'right', margin: [0, 0.07, 0, 0.05], valign: 'middle' };
          s.addTable([
            [{ text: NAME[u], options: { colspan: 2, bold: true, fontSize: 10, color: C.text2, fill: { color: 'DCEBFB' }, margin: [0, 0.07, 0, 0.07], valign: 'middle' } }],
            [{ text: "Target '26", options: cellL }, { text: nf(v.t26, M.dec), options: cellR }],
            [{ text: `Target s.d. ${BS[LAST - 1].charAt(0) + BS[LAST - 1].slice(1).toLowerCase()}`, options: cellL }, { text: nf(v.tm, M.dec), options: cellR }],
            [{ text: 'Realisasi', options: { ...cellL, bold: true } }, { text: nf(v.r, M.dec), options: { ...cellR, color: C.background1, fill: { color: ok ? HEX.green : HEX.red } } }],
          ], { x: bx, y: by, w: BW, colW: [1.12, 0.7], rowH: [0.23, 0.21, 0.21, 0.21], fill: { color: 'FFFFFF' }, border: { type: 'solid', color: 'B9CFEA', pt: 0.75 }, fontFace: 'Arial', objectName: 'Kotak ' + NAME[u] });
        }

        // rekap Sumkal (kanan)
        const S = data.units.SUMKAL[M.key];
        const cap = 2 - S.r / S.tm;
        const RX = 9.85, RW = 3.2;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX, y: 1.45, w: RW, h: 4.15, rectRadius: 0.12, fill: { color: 'FFFFFF' }, line: { color: 'C9DCF2', width: 1 }, shadow: { type: 'outer', color: '7A9CC6', opacity: 0.25, blur: 8, offset: 2, angle: 90 }, objectName: 'Rekap latar' });
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX, y: 1.45, w: RW, h: 0.55, rectRadius: 0.12, fill: { color: C.text1 }, line: { color: C.text1 }, objectName: 'Rekap judul latar' });
        s.addText(`REKAP KINERJA ${M.name} SUMKAL`, { x: RX, y: 1.45, w: RW, h: 0.55, fontSize: 14, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Rekap judul' });
        const cards = [
          { ic: icon('FaBullseye', 'FFFFFF'), col: HEX.ink, tint: 'EAF2FC', lab: 'TARGET 2026', val: nf(S.t26, M.dec), sub: M.unitShort },
          { ic: icon('FaCalendarCheck', 'FFFFFF'), col: HEX.ink, tint: 'EAF2FC', lab: `TARGET S.D. ${BS[LAST - 1]} 2026`, val: nf(S.tm, M.dec), sub: M.unitShort },
          { ic: icon('FaChartLine', 'FFFFFF'), col: cap >= 1 ? HEX.green : HEX.red, tint: cap >= 1 ? 'E6F4EC' : 'FBE9E7', lab: `REALISASI S.D. ${BS[LAST - 1]} 2026`, val: nf(S.r, M.dec), sub: `${M.unitShort} (${nf(cap * 100, 2)}%)` },
        ];
        cards.forEach((c, i) => {
          const y = 2.15 + i * 1.12;
          s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: RX + 0.15, y, w: RW - 0.3, h: 1.0, rectRadius: 0.1, fill: { color: c.tint }, line: { color: c.tint }, objectName: c.lab + ' latar' });
          s.addShape(pres.shapes.OVAL, { x: RX + 0.3, y: y + 0.2, w: 0.6, h: 0.6, fill: { color: c.col }, line: { color: c.col }, objectName: c.lab + ' ikon latar' });
          s.addImage({ data: c.ic, x: RX + 0.44, y: y + 0.34, w: 0.32, h: 0.32, altText: c.lab, objectName: c.lab + ' ikon' });
          s.addText(c.lab, { x: RX + 1.05, y: y + 0.08, w: RW - 1.3, h: 0.24, fontSize: 10, bold: true, color: c.col, margin: 0, valign: 'middle', isTextBox: true, objectName: c.lab });
          s.addText(c.val, { x: RX + 1.05, y: y + 0.3, w: RW - 1.3, h: 0.42, fontSize: 24, bold: true, color: C.text1, margin: 0, valign: 'middle', isTextBox: true, objectName: c.lab + ' nilai' });
          s.addText(c.sub, { x: RX + 1.05, y: y + 0.72, w: RW - 1.3, h: 0.22, fontSize: 10, color: HEX.muted, margin: 0, valign: 'middle', isTextBox: true, objectName: c.lab + ' satuan' });
        });

        // tren Sumkal
        const TY = 5.84;
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.25, y: TY, w: 12.83, h: 1.52, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { color: 'C9DCF2', width: 1 }, objectName: 'Tren latar' });
        s.addText([{ text: `TREN ${M.name} SUMKAL `, options: { bold: true, color: C.text1 } }, { text: `(${M.unit}, kumulatif)`, options: { color: HEX.muted } }], { x: 0.45, y: TY + 0.06, w: 6, h: 0.28, fontSize: 12, margin: 0, valign: 'middle', isTextBox: true, objectName: 'Tren judul' });
        const T = data.trend[M.key];
        const labels = BS.slice(0, LAST);
        const lab = (pos, col) => ({ showValue: true, dataLabelPosition: pos, dataLabelFontSize: 8, dataLabelFontFace: '+mn-lt', dataLabelFormatCode: '#,##0.00', dataLabelColor: col, lineSize: 2.25, lineDataSymbol: 'circle', lineDataSymbolSize: 7 });
        s.addChart([
          { type: pres.charts.LINE, data: [{ name: 'Target Sumkal', labels, values: T.t.map((v) => +v.toFixed(M.dec)) }], options: { chartColors: [HEX.orange], ...lab('t', 'B4600F') } },
          { type: pres.charts.LINE, data: [{ name: 'Realisasi Sumkal', labels, values: T.r.map((v) => +v.toFixed(M.dec)) }], options: { chartColors: [HEX.blue], ...lab('b', HEX.blue) } },
        ], {
          x: 0.35, y: TY + 0.28, w: 12.6, h: 1.22, valAxisMinVal: +(-Math.max(...T.t) * 0.14).toFixed(2), valAxisMaxVal: +(Math.max(...T.t) * 1.12).toFixed(2),
          catAxisLabelColor: HEX.muted, catAxisLabelFontSize: 9, catAxisLabelFontFace: '+mn-lt', catAxisLineShow: false,
          valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
          showLegend: true, legendPos: 'r', legendFontSize: 9, legendFontFace: '+mn-lt', legendColor: HEX.navy,
          objectName: 'Tren grafik',
        });
        s.addNotes(`Sumber: dashboard SAIDI SAIFI Sumkal 2026 (komponen Distribusi, nilai kumulatif Januari–${BLN[LAST - 1]} 2026). Target per UID dari Target-26 sheet target kewenangan 2026; target Sumkal dari Target_SUMKAL_2026.xlsx. Pencapaian = 2 − realisasi ÷ target s.d. ${BLN[LAST - 1]}. Warna hijau pada realisasi: di bawah atau sama dengan target s.d. ${BLN[LAST - 1]}; merah: melampaui target.`);
    };

    const ctx3 = { C, HEX, BLN, BS, nf, icon, targets: { saidi: data.units.SUMKAL.saidi, saifi: data.units.SUMKAL.saifi }, data3, data5, data6 };
    const CORE = {
      1: () => kinerja(KM[0]),
      2: () => kinerja(KM[1]),
      3: () => slide3(pres, ctx3, { key: 'saidi', name: 'SAIDI', unit: 'menit/pelanggan', unitS: 'menit/plg', raw: 'jam padam', md: 2, kd: 2 }),
      4: () => slide3(pres, ctx3, { key: 'saifi', name: 'SAIFI', unit: 'kali/pelanggan', unitS: 'kali/plg', raw: 'kali padam', md: 3, kd: 2 }),
      5: () => slide5(pres, ctx3),
      6: () => slide6(pres, ctx3),
    };
    // plan: urutan slide paparan. {k:'core', n:1..6} slide data; {k:'img', data, w, h} slide gambar;
    // {k:'pptx'} slide kosong sebagai tempat slide dari file PowerPoint (diisi oleh SSPptxMerge).
    const P = plan || [1, 2, 3, 4, 5, 6].map((n) => ({ k: 'core', n }));
    return (async () => {
      for (const it of P) {
        if (it.k === 'core' && CORE[it.n]) await CORE[it.n]();
        else if (it.k === 'img') {
          const s = pres.addSlide(); s.background = { color: 'FFFFFF' };
          const W = 13.333, H = 7.5, r = Math.min(W / (it.w || W), H / (it.h || H));
          const w = (it.w || W) * r, h = (it.h || H) * r;
          s.addImage({ data: it.data, x: (W - w) / 2, y: (H - h) / 2, w, h, altText: it.name || 'Slide gambar' });
        } else pres.addSlide();
      }
      return pres;
    })();
  }

  // ---------- slide SAIDI/SAIFI jaringan distribusi ----------
  // Slide SAIDI/SAIFI jaringan distribusi Sumatera–Kalimantan per UID, bulanan dan kumulatif (Jan s.d. bulan terakhir).
  
  async function slide3(pres, ctx, M) {
    const { C, HEX, BLN, BS, nf, icon } = ctx;
    const target = ctx.targets[M.key];
    const d0 = ctx.data3;
    const d = { last: d0.last, bln: d0[M.key].bln, kum: d0[M.key].kum };
    const LAST = d.last;
    const U = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
    const COL = { ACEH: 'E8414B', SUMUT: '2F80ED', SUMBAR: '27AE60', RKR: 'F2994A', S2JB: '9B51E0', BABEL: 'F2C94C', LAMPUNG: '56CCF2', KALBAR: 'EB5A9A', KALSELTENG: 'BB9BE8', KALTIMRA: '9AA3AE', SUMKAL: '13254A' };
    const NM = (u) => (u === 'KALSELTENG' ? 'KALSELTENG' : u);
    const MON = BS.slice(0, LAST);
    const f2 = (v) => nf(v, M.kd); // nilai kumulatif
    const fm = (v) => nf(v, M.md); // nilai bulanan
    const s = pres.addSlide({ masterName: 'KINERJA_UID' });
  
    // ---------- judul ----------
    s.addText(`${M.name} JARINGAN DISTRIBUSI SUMATERA – KALIMANTAN`, { x: 2.45, y: 0.1, w: 8.45, h: 0.42, fontSize: 19, bold: true, color: C.text1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Judul' });
    s.addText(`JANUARI – ${BLN[LAST - 1].toUpperCase()} 2026`, { x: 2.5, y: 0.5, w: 8.35, h: 0.32, fontSize: 18, bold: true, color: C.text1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Periode' });
    s.addText(`(Dalam ${M.unit})`, { x: 2.5, y: 0.8, w: 8.35, h: 0.22, fontSize: 11, color: C.accent1, align: 'center', valign: 'middle', margin: 0, isTextBox: true, objectName: 'Satuan' });
  
    // ---------- angka kunci ----------
    const S = d.bln.SUMKAL, sep = S[LAST - 1], prev = S[LAST - 2];
    const avg = S.reduce((a, b) => a + b, 0) / LAST;
    const cur = U.map((u) => [u, d.bln[u][LAST - 1]]).sort((a, b) => a[1] - b[1]);
    const lo = cur[0], hi = cur[cur.length - 1];
    const kum = d.kum.SUMKAL[LAST - 1];
    const KY = 1.1, KH = 1.42;
    const card = (x, w, tint, name) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: KY, w, h: KH, rectRadius: 0.1, fill: { color: tint }, line: { color: 'C9DCF2', width: 1 }, shadow: { type: 'outer', color: '7A9CC6', opacity: 0.2, blur: 6, offset: 1.5, angle: 90 }, objectName: name });
    const circ = async (x, y, col, Comp, name) => {
      s.addShape(pres.shapes.OVAL, { x, y, w: 0.46, h: 0.46, fill: { color: col }, line: { color: col }, objectName: name + ' ikon latar' });
      s.addImage({ data: await icon(Comp, 'FFFFFF'), x: x + 0.11, y: y + 0.11, w: 0.24, h: 0.24, altText: name, objectName: name + ' ikon' });
    };
    const T = (t, o, name) => s.addText(t, { margin: 0, isTextBox: true, objectName: name, ...o });
    const delta = (v, base, x, y, w, lab, name) => {
      const up = v > base; const col = up ? HEX.red : HEX.green;
      T([{ text: `${up ? '▲ +' : '▼ −'}${fm(Math.abs(v - base))}`, options: { bold: true, color: col } }, { text: ` ${lab}`, options: { color: HEX.muted } }], { x, y, w, h: 0.22, fontSize: 9, valign: 'middle' }, name);
    };
    const bigCard = async (x0, w0, col, Comp, title, val, deltaArgs, name) => {
      card(x0, w0, 'FFFFFF', name);
      await circ(x0 + 0.12, KY + 0.12, col, Comp, name);
      T(title, { x: x0 + 0.65, y: KY + 0.1, w: w0 - 0.72, h: 0.48, fontSize: 10, bold: true, color: C.text1, valign: 'middle' }, name + ' judul');
      T(val, { x: x0 + 0.12, y: KY + 0.62, w: w0 - 0.24, h: 0.4, fontSize: 24, bold: true, color: C.text1, valign: 'middle' }, name + ' nilai');
      T(M.unit, { x: x0 + 0.12, y: KY + 0.99, w: w0 - 0.24, h: 0.18, fontSize: 9, color: HEX.muted, valign: 'middle' }, name + ' satuan');
      delta(deltaArgs[0], deltaArgs[1], x0 + 0.12, KY + 1.17, w0 - 0.2, deltaArgs[2], name + ' perubahan');
    };
    let x = 0.25; const w1 = 2.0, w2 = 2.0;
    await bigCard(x, w1, HEX.navy, 'FaStopwatch', `${M.name} SUMKAL\n${BLN[LAST - 1].toUpperCase()} 2026`, fm(sep), [sep, prev, `dari ${BS[LAST - 2].charAt(0) + BS[LAST - 2].slice(1).toLowerCase()} (${fm(prev)})`], M.name + ' Sumkal bulan ini');
    x += w1 + 0.1;
    await bigCard(x, w2, HEX.blue, 'FaChartBar', `RATA-RATA ${M.name}\nJAN – ${BS[LAST - 1]} 2026`, fm(avg), [avg, S[0], `dari Jan (${fm(S[0])})`], 'Rata-rata ' + M.name + ' Sumkal');
    // 3 terendah, 4 tertinggi
    const extreme = async (x0, tint, col, Comp, lab, [u, v], name) => {
      card(x0, 1.85, tint, name);
      await circ(x0 + 0.12, KY + 0.12, col, Comp, name);
      T(`${lab}\n${NM(u)}`, { x: x0 + 0.65, y: KY + 0.08, w: 1.15, h: 0.46, fontSize: 10, bold: true, color: col, valign: 'middle' }, name + ' judul');
      T(`${BLN[LAST - 1]} 2026`, { x: x0 + 0.65, y: KY + 0.52, w: 1.15, h: 0.2, fontSize: 9, color: HEX.muted, valign: 'middle' }, name + ' bulan');
      T(fm(v), { x: x0 + 0.12, y: KY + 0.74, w: 1.61, h: 0.42, fontSize: 26, bold: true, color: col === HEX.green ? C.text1 : col, align: 'center', valign: 'middle' }, name + ' nilai');
      T(M.unit, { x: x0 + 0.12, y: KY + 1.14, w: 1.61, h: 0.2, fontSize: 9.5, color: HEX.muted, align: 'center', valign: 'middle' }, name + ' satuan');
    };
    x += w2 + 0.1; await extreme(x, 'EEF8F1', HEX.green, 'FaArrowDown', 'TERENDAH', lo, 'UID terendah');
    x += 1.85 + 0.1; await extreme(x, 'FDEDEB', HEX.red, 'FaArrowUp', 'TERTINGGI', hi, 'UID tertinggi');
    // 5 kumulatif
    x += 1.85 + 0.1; const w5 = 1.85;
    card(x, w5, 'FFFFFF', M.name + ' kumulatif Sumkal');
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: KY + 0.12, w: 0.46, h: 0.46, fill: { color: HEX.blue }, line: { color: HEX.blue }, objectName: M.name + ' kumulatif ikon latar' });
    T('Σ', { x: x + 0.12, y: KY + 0.12, w: 0.46, h: 0.46, fontSize: 18, bold: true, color: C.background1, align: 'center', valign: 'middle' }, M.name + ' kumulatif ikon');
    T(`KUMULATIF\nSUMKAL`, { x: x + 0.65, y: KY + 0.08, w: 1.15, h: 0.46, fontSize: 10, bold: true, color: C.text1, valign: 'middle' }, M.name + ' kumulatif judul');
    T(`s.d. ${BS[LAST - 1].charAt(0) + BS[LAST - 1].slice(1).toLowerCase()} 2026`, { x: x + 0.65, y: KY + 0.52, w: 1.15, h: 0.2, fontSize: 9, color: HEX.muted, valign: 'middle' }, M.name + ' kumulatif periode');
    T(f2(kum), { x: x + 0.12, y: KY + 0.74, w: 1.61, h: 0.42, fontSize: 26, bold: true, color: C.text1, align: 'center', valign: 'middle' }, M.name + ' kumulatif nilai');
    T(M.unit, { x: x + 0.12, y: KY + 1.14, w: 1.61, h: 0.2, fontSize: 9.5, color: HEX.muted, align: 'center', valign: 'middle' }, M.name + ' kumulatif satuan');
    // 6 informasi kunci
    x += w5 + 0.1; const w6 = 13.08 - x;
    card(x, w6, 'FFFFFF', 'Informasi kunci');
    await circ(x + 0.12, KY + 0.08, HEX.navy, 'FaClipboardList', 'Informasi kunci');
    T('INFORMASI KUNCI', { x: x + 0.65, y: KY + 0.08, w: w6 - 0.75, h: 0.46, fontSize: 11, bold: true, color: C.text1, valign: 'middle' }, 'Informasi kunci judul');
    const cap = 2 - kum / target.tm;
    const info = [
      `Rata-rata ${fm(avg)} ${M.unitS} per bulan`,
      `Terendah ${NM(lo[0])} ${fm(lo[1])}, tertinggi ${NM(hi[0])} ${fm(hi[1])}`,
      `Kumulatif ${f2(kum)} vs target ${f2(target.tm)} (${nf(cap * 100, 2)}%)`,
    ];
    T(info.map((t2, i) => ({ text: t2, options: { bullet: { code: '2714', indent: 11 }, breakLine: i < info.length - 1 } })), { x: x + 0.1, y: KY + 0.6, w: w6 - 0.18, h: 0.78, fontSize: 9, color: C.text1, valign: 'top', paraSpaceAfter: 2 }, 'Informasi kunci isi');
  
    // ---------- grafik ----------
    const GY = 2.62, GH = 2.32;
    const panel = (x0, w0, title, sub, name) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x0, y: GY, w: w0, h: GH, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { color: 'C9DCF2', width: 1 }, objectName: name + ' latar' });
      T([{ text: title, options: { bold: true, color: C.text1 } }, { text: '  ' + sub, options: { color: HEX.muted } }], { x: x0 + 0.15, y: GY + 0.06, w: w0 - 0.3, h: 0.26, fontSize: 11, valign: 'middle' }, name + ' judul');
    };
    const AX = { catAxisLabelColor: HEX.muted, valAxisLabelColor: HEX.muted, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', valGridLine: { color: 'E3EAF3', size: 0.5 }, catGridLine: { style: 'none' } };
    // tren per UID
    panel(0.25, 5.35, `TREN ${M.name} BULANAN PER UID`, `(Jan–${BS[LAST - 1].charAt(0) + BS[LAST - 1].slice(1).toLowerCase()} 2026, ${M.unit})`, 'Tren per UID');
    const series = [...U, 'SUMKAL'].map((u) => ({ name: NM(u), labels: MON, values: d.bln[u].map((v) => +v.toFixed(M.md)) }));
    s.addChart(pres.charts.LINE, series, {
      x: 0.3, y: GY + 0.32, w: 5.25, h: GH - 0.38, chartColors: [...U, 'SUMKAL'].map((u) => COL[u]), lineSize: 1.75, lineDataSymbol: 'circle', lineDataSymbolSize: 4,
      ...AX, showLegend: true, legendPos: 'r', legendFontSize: 7.5, legendFontFace: '+mn-lt', legendColor: HEX.navy, valAxisLabelFormatCode: M.md > 2 ? '0.0' : '0', objectName: 'Tren per UID grafik',
    });
    // bar per UID (bulan terakhir) dan kumulatif, Sumkal disisipkan sebagai batang pembanding
    const barPanel = (x0, title, sub, vals, name, fmtMax, dec) => {
      panel(x0, 3.6, title, sub, name);
      const list = [...U, 'SUMKAL'].map((u) => [u, vals[u]]).sort((a, b) => b[1] - a[1]);
      // urutan kategori dibalik agar nilai terbesar di atas
      const rev = list.slice().reverse();
      s.addChart(pres.charts.BAR, [{ name: title, labels: rev.map(([u]) => (u === 'SUMKAL' ? 'SUMKAL' : NM(u))), values: rev.map(([, v]) => +v.toFixed(dec)) }], {
        x: x0 + 0.05, y: GY + 0.32, w: 3.5, h: GH - 0.36, barDir: 'bar', barGapWidthPct: 45, chartColors: rev.map(([u]) => COL[u]),
        showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8, dataLabelFontFace: '+mn-lt', dataLabelColor: HEX.navy, dataLabelFormatCode: dec === 3 ? '#,##0.000' : '#,##0.00',
        ...AX, valAxisHidden: true, valGridLine: { style: 'none' }, valAxisMaxVal: fmtMax(list[0][1]), showLegend: false, objectName: name + ' grafik',
      });
    };
    const sepVals = Object.fromEntries([...U, 'SUMKAL'].map((u) => [u, d.bln[u][LAST - 1]]));
    const kumVals = Object.fromEntries([...U, 'SUMKAL'].map((u) => [u, d.kum[u][LAST - 1]]));
    barPanel(5.7, `${M.name} ${BS[LAST - 1]} 2026 PER UID`, `(${M.unitS})`, sepVals, M.name + ' bulan ini per UID', (m) => +(m * 1.22).toFixed(3), M.md);
    barPanel(9.4, `${M.name} KUMULATIF S.D. ${BS[LAST - 1]}`, `(${M.unitS})`, kumVals, M.name + ' kumulatif per UID', (m) => +(m * 1.22).toFixed(3), M.kd);
  
    // ---------- tabel ----------
    const TY = 5.04;
    const table = (x0, title, M2, name, fmt) => {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x0, y: TY, w: 6.37, h: 2.38, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: 'C9DCF2', width: 1 }, objectName: name + ' latar' });
      T([{ text: title, options: { bold: true, color: C.text1 } }, { text: `  (${M.unit})`, options: { color: HEX.muted } }], { x: x0 + 0.12, y: TY + 0.03, w: 6.1, h: 0.24, fontSize: 11, valign: 'middle' }, name + ' judul');
      const hc = { bold: true, color: 'FFFFFF', fill: { color: HEX.blue }, align: 'center', valign: 'middle', fontSize: 8, margin: 0 };
      const rows = [[{ text: 'UID', options: { ...hc, align: 'left', margin: [0, 0, 0, 0.06] } }, ...MON.map((m) => ({ text: m, options: hc }))]];
      U.forEach((u, i) => rows.push([{ text: NM(u), options: { fontSize: 8, color: HEX.navy, margin: [0, 0, 0, 0.06], valign: 'middle', fill: { color: i % 2 ? 'F3F7FC' : 'FFFFFF' } } }, ...M2[u].map((v) => ({ text: fmt(v), options: { fontSize: 8, color: HEX.navy, align: 'right', margin: [0, 0.06, 0, 0], valign: 'middle', fill: { color: i % 2 ? 'F3F7FC' : 'FFFFFF' } } }))]));
      rows.push([{ text: 'SUMKAL', options: { ...hc, fill: { color: HEX.navy }, align: 'left', margin: [0, 0, 0, 0.06] } }, ...M2.SUMKAL.map((v) => ({ text: fmt(v), options: { ...hc, fill: { color: HEX.navy }, align: 'right', margin: [0, 0.06, 0, 0] } }))]);
      s.addTable(rows, { x: x0 + 0.08, y: TY + 0.3, w: 6.21, colW: [0.93, ...MON.map(() => 5.28 / LAST)], rowH: 0.168, border: { type: 'solid', color: 'DCE6F2', pt: 0.5 }, fontFace: 'Arial', objectName: name });
    };
    table(0.25, `${M.name} BULANAN`, d.bln, `Tabel ${M.name} bulanan`, fm);
    table(6.71, `${M.name} KUMULATIF`, d.kum, `Tabel ${M.name} kumulatif`, f2);
  
    s.addNotes(`Sumber: database dashboard SAIDI SAIFI Sumkal 2026, komponen Distribusi. ${M.name} bulanan = ${M.raw} pelanggan bulan itu ÷ jumlah pelanggan bulan itu${M.key === 'saidi' ? ' × 60' : ''}. ${M.name} kumulatif = ${M.raw} pelanggan Januari s.d. bulan itu ÷ jumlah pelanggan bulan itu${M.key === 'saidi' ? ' × 60' : ''}, sehingga jumlah nilai bulanan tidak persis sama dengan nilai kumulatif. Rata-rata = rata-rata ${M.name} bulanan Januari–${BLN[LAST - 1]} 2026.`);
  }

  // ---------- slide jumlah kali gangguan ----------
  // Slide: jumlah kali gangguan penyulang distribusi (kode J) — permanen, sesaat, data cleansing dan event koreksi.
  
  async function slide5(pres, ctx) {
    const { C, HEX, BLN, BS, icon } = ctx;
    const d = ctx.data5;
    const LAST = d.last;
    const MON = BS.slice(0, LAST);
    const n0 = (v) => Math.round(v).toLocaleString('id-ID');
    const pc = (v) => v.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const K = { P: 'D93025', S: '1E73E8', C: '8E5BD6', K: 'EF7D22', T: '0F766E' };
    const TINT = { P: 'FDECEA', S: 'E8F1FD', C: 'F2ECFB', K: 'FDF0E4', T: 'E5F3F1' };
    const NAME = { P: 'GANGGUAN PERMANEN', S: 'GANGGUAN SESAAT', C: 'DATA CLEANSING', K: 'EVENT KOREKSI', T: 'TOTAL GANGGUAN (P+S+C)' };
    const tot = { P: sum(d.mon.P), S: sum(d.mon.S), C: sum(d.mon.C), K: sum(d.mon.K) };
    tot.T = tot.P + tot.S + tot.C;
    const monT = d.mon.P.map((_, i) => d.mon.P[i] + d.mon.S[i] + d.mon.C[i]);
    const s = pres.addSlide({ masterName: 'KINERJA_UID' });
    const T = (t, o, name) => s.addText(t, { margin: 0, isTextBox: true, objectName: name, ...o });
    const box = (x, y, w, h, name, fill = 'FFFFFF') => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: 'C9DCF2', width: 1 }, objectName: name });
    const head = (x, y, w, title, sub, name) => T([{ text: title, options: { bold: true, color: C.text1 } }, { text: sub ? '  ' + sub : '', options: { color: HEX.muted } }], { x, y, w, h: 0.26, fontSize: 11, valign: 'middle' }, name);
  
    // ---------- judul ----------
    T('JUMLAH KALI GANGGUAN PENYULANG', { x: 2.45, y: 0.08, w: 8.45, h: 0.38, fontSize: 21, bold: true, color: C.text1, align: 'center', valign: 'middle' }, 'Judul');
    T('DISTRIBUSI SUMATERA – KALIMANTAN', { x: 2.45, y: 0.44, w: 8.45, h: 0.32, fontSize: 17, bold: true, color: C.text1, align: 'center', valign: 'middle' }, 'Subjudul');
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.67, y: 0.8, w: 4.0, h: 0.3, rectRadius: 0.15, fill: { color: C.text1 }, line: { color: C.text1 }, objectName: 'Periode latar' });
    T(`Periode Januari – ${BLN[LAST - 1]} 2026 · Gangguan kode J`, { x: 4.67, y: 0.8, w: 4.0, h: 0.3, fontSize: 11, bold: true, color: C.background1, align: 'center', valign: 'middle' }, 'Periode');
  
    // ---------- kartu angka ----------
    const KY = 1.2, KH = 1.32, KW = 1.45;
    const ICN = { P: 'FaBolt', S: 'FaBolt', C: 'FaClipboardCheck', K: 'FaDatabase', T: 'FaBolt' };
    let x = 0.25;
    for (const k of ['P', 'S', 'C', 'K', 'T']) {
      box(x, KY, KW, KH, NAME[k] + ' kartu', TINT[k]);
      s.addShape(pres.shapes.OVAL, { x: x + 0.08, y: KY + 0.08, w: 0.38, h: 0.38, fill: { color: K[k] }, line: { color: K[k] }, objectName: NAME[k] + ' ikon latar' });
      s.addImage({ data: await icon(ICN[k], 'FFFFFF'), x: x + 0.17, y: KY + 0.17, w: 0.2, h: 0.2, altText: NAME[k], objectName: NAME[k] + ' ikon' });
      T(NAME[k], { x: x + 0.5, y: KY + 0.06, w: KW - 0.55, h: 0.42, fontSize: 8.5, bold: true, color: K[k], valign: 'middle' }, NAME[k] + ' judul');
      T([{ text: n0(tot[k]), options: { fontSize: 20, bold: true, color: k === 'T' ? C.text1 : K[k] } }, { text: ' kali', options: { fontSize: 9, color: HEX.muted } }], { x: x + 0.08, y: KY + 0.52, w: KW - 0.14, h: 0.38, align: 'center', valign: 'middle' }, NAME[k] + ' nilai');
      T([{ text: 'Rata-rata per bulan\n', options: { fontSize: 8, color: HEX.muted } }, { text: n0(tot[k] / LAST) + ' kali', options: { fontSize: 11, bold: true, color: k === 'T' ? C.text1 : K[k] } }], { x: x + 0.08, y: KY + 0.9, w: KW - 0.14, h: 0.38, align: 'center', valign: 'middle' }, NAME[k] + ' rata-rata');
      x += KW + 0.07;
    }
  
    // ---------- tren SUMKAL (batang bertumpuk + garis total) ----------
    const GY = 2.62, GH = 2.3, GW = 7.53;
    box(0.25, GY, GW, GH, 'Tren latar');
    head(0.4, GY + 0.05, GW - 0.3, 'TREN JUMLAH KALI GANGGUAN SUMKAL', `(Januari – ${BLN[LAST - 1]} 2026)`, 'Tren judul');
    const AX = { catAxisLabelColor: HEX.muted, valAxisLabelColor: HEX.muted, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', valGridLine: { color: 'E3EAF3', size: 0.5 }, catGridLine: { style: 'none' } };
    const maxT = Math.max(...monT);
    s.addChart([
      { type: pres.charts.BAR, data: [
        { name: 'Gangguan permanen', labels: MON, values: d.mon.P },
        { name: 'Gangguan sesaat', labels: MON, values: d.mon.S },
        { name: 'Data cleansing', labels: MON, values: d.mon.C },
      ], options: { barGrouping: 'stacked', barGapWidthPct: 45, chartColors: [K.P, K.S, K.C], showValue: true, dataLabelPosition: 'ctr', dataLabelColor: 'FFFFFF', dataLabelFontSize: 7.5, dataLabelFontFace: '+mn-lt', dataLabelFormatCode: '#,##0' } },
      { type: pres.charts.LINE, data: [{ name: 'Total gangguan (P+S+C)', labels: MON, values: monT }], options: { chartColors: [K.T], lineSize: 2, lineDataSymbol: 'circle', lineDataSymbolSize: 6, showValue: true, dataLabelPosition: 't', dataLabelColor: C.text1 === undefined ? HEX.navy : HEX.navy, dataLabelFontSize: 8, dataLabelFontFace: '+mn-lt', dataLabelFormatCode: '#,##0' } },
    ], {
      x: 0.3, y: GY + 0.3, w: GW - 0.1, h: GH - 0.34, ...AX, valAxisMaxVal: Math.ceil(maxT * 1.18 / 2000) * 2000, valAxisLabelFormatCode: '#,##0',
      showLegend: true, legendPos: 'b', legendFontSize: 8, legendFontFace: '+mn-lt', legendColor: HEX.navy, objectName: 'Tren grafik',
    });
  
    // ---------- komposisi ----------
    const BY = 5.0, BH = 1.66;
    box(0.25, BY, 3.7, BH, 'Komposisi latar');
    head(0.4, BY + 0.04, 3.4, 'KOMPOSISI GANGGUAN SUMKAL', '', 'Komposisi judul');
    s.addChart(pres.charts.DOUGHNUT, [{ name: 'Komposisi', labels: ['Permanen', 'Sesaat', 'Cleansing'], values: [tot.P, tot.S, tot.C] }], {
      x: 0.3, y: BY + 0.3, w: 1.55, h: 1.32, holeSize: 58, chartColors: [K.P, K.S, K.C], showLegend: false, showValue: false, showPercent: false, dataBorder: { pt: 1, color: 'FFFFFF' }, objectName: 'Komposisi grafik',
    });
    T([{ text: n0(tot.T), options: { fontSize: 11, bold: true, color: C.text1, breakLine: true } }, { text: 'kali', options: { fontSize: 8, color: HEX.muted } }], { x: 0.67, y: BY + 0.75, w: 0.8, h: 0.42, align: 'center', valign: 'middle' }, 'Komposisi total');
    [['P', 'Gangguan permanen'], ['S', 'Gangguan sesaat'], ['C', 'Data cleansing']].forEach(([k, l], i) => {
      const y = BY + 0.36 + i * 0.42;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1.95, y: y + 0.07, w: 0.14, h: 0.14, rectRadius: 0.03, fill: { color: K[k] }, line: { color: K[k] }, objectName: l + ' penanda' });
      T([{ text: l + '\n', options: { fontSize: 8.5, color: HEX.muted } }, { text: `${n0(tot[k])} kali `, options: { fontSize: 10, bold: true, color: K[k] } }, { text: `(${pc(tot[k] / tot.T * 100)})`, options: { fontSize: 9, color: HEX.muted } }], { x: 2.16, y, w: 1.75, h: 0.4, valign: 'middle' }, l + ' komposisi');
    });
  
    // ---------- tren koreksi ----------
    box(4.05, BY, 3.73, BH, 'Koreksi latar');
    head(4.2, BY + 0.04, 3.5, 'TREN EVENT KOREKSI SUMKAL', '', 'Koreksi judul');
    s.addChart(pres.charts.BAR, [{ name: 'Event koreksi', labels: MON, values: d.mon.K }], {
      x: 4.1, y: BY + 0.3, w: 3.63, h: BH - 0.34, barGapWidthPct: 40, chartColors: [K.K], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 7.5, dataLabelFontFace: '+mn-lt', dataLabelColor: HEX.navy, dataLabelFormatCode: '#,##0',
      ...AX, valAxisHidden: true, valGridLine: { style: 'none' }, valAxisMaxVal: Math.ceil(Math.max(...d.mon.K) * 1.25), showLegend: false, objectName: 'Koreksi grafik',
    });
  
    // ---------- rekap per UID ----------
    const U = Object.keys(d.uid).sort((a, b) => (d.uid[b].P + d.uid[b].S + d.uid[b].C) - (d.uid[a].P + d.uid[a].S + d.uid[a].C));
    const RX = 7.92, RW = 5.16, RY = 1.2;
    box(RX, RY, RW, 3.72, 'Rekap latar');
    head(RX + 0.12, RY + 0.04, RW - 0.2, 'REKAP JUMLAH KALI GANGGUAN PER UID', `(Jan – ${BS[LAST - 1].charAt(0) + BS[LAST - 1].slice(1).toLowerCase()} 2026)`, 'Rekap judul');
    const hdr = (t, col, cs) => ({ text: t, options: { colspan: cs, bold: true, color: 'FFFFFF', fill: { color: col }, align: 'center', valign: 'middle', fontSize: 7.5, margin: 0 } });
    const sub = (t, col) => ({ text: t, options: { bold: true, color: col, fill: { color: 'F3F6FA' }, align: 'center', valign: 'middle', fontSize: 7, margin: 0 } });
    const rows = [
      [{ text: 'UID', options: { rowspan: 2, bold: true, color: 'FFFFFF', fill: { color: HEX.navy }, align: 'center', valign: 'middle', fontSize: 8, margin: 0 } }, hdr('Permanen', K.P, 2), hdr('Sesaat', K.S, 2), hdr('Cleansing', K.C, 2), hdr('Koreksi', K.K, 2), hdr('Total (P+S+C)', K.T, 2)],
      ['P', 'S', 'C', 'K', 'T'].flatMap((k) => [sub('Total', K[k]), sub('Rata/bln', K[k])]),
    ];
    const val = (v, bold, col, fill) => ({ text: n0(v), options: { fontSize: 7.5, bold: !!bold, color: col || HEX.navy, align: 'right', valign: 'middle', margin: [0, 0.04, 0, 0], fill: { color: fill } } });
    U.forEach((u, i) => {
      const o = d.uid[u]; const t = o.P + o.S + o.C; const f = i % 2 ? 'F6F9FD' : 'FFFFFF';
      rows.push([{ text: u, options: { fontSize: 7.5, color: HEX.navy, valign: 'middle', margin: [0, 0, 0, 0.05], fill: { color: f } } },
        ...['P', 'S', 'C', 'K'].flatMap((k) => [val(o[k], false, null, f), val(o[k] / LAST, false, HEX.muted, f)]), val(t, true, null, f), val(t / LAST, false, HEX.muted, f)]);
    });
    const SF = 'FFF4CC';
    rows.push([{ text: 'SUMKAL', options: { fontSize: 7.5, bold: true, color: HEX.navy, valign: 'middle', margin: [0, 0, 0, 0.05], fill: { color: SF } } },
      ...['P', 'S', 'C', 'K', 'T'].flatMap((k) => [val(tot[k], true, null, SF), val(tot[k] / LAST, true, null, SF)])]);
    s.addTable(rows, { x: RX + 0.08, y: RY + 0.34, w: RW - 0.16, colW: [0.8, ...Array(10).fill((RW - 0.16 - 0.8) / 10)], rowH: [0.2, 0.17, ...Array(U.length + 1).fill(0.243)], border: { type: 'solid', color: 'DCE6F2', pt: 0.5 }, fontFace: 'Arial', objectName: 'Rekap tabel' });
  
    // ---------- ranking per UID ----------
    const KY2 = 5.0;
    box(RX, KY2, RW, BH, 'Ranking latar');
    head(RX + 0.12, KY2 + 0.04, RW - 0.2, 'RANKING TOTAL GANGGUAN PER UID', '(P+S+C)', 'Ranking judul');
    const rev = U.slice().reverse();
    s.addChart(pres.charts.BAR, [
      { name: 'Permanen', labels: rev.map((u) => `${u}  ${n0(d.uid[u].P + d.uid[u].S + d.uid[u].C)}`), values: rev.map((u) => d.uid[u].P) },
      { name: 'Sesaat', labels: rev.map((u) => `${u}  ${n0(d.uid[u].P + d.uid[u].S + d.uid[u].C)}`), values: rev.map((u) => d.uid[u].S) },
      { name: 'Cleansing', labels: rev.map((u) => `${u}  ${n0(d.uid[u].P + d.uid[u].S + d.uid[u].C)}`), values: rev.map((u) => d.uid[u].C) },
    ], {
      x: RX + 0.05, y: KY2 + 0.28, w: RW - 0.1, h: BH - 0.3, barDir: 'bar', barGrouping: 'stacked', barGapWidthPct: 35, chartColors: [K.P, K.S, K.C],
      ...AX, catAxisLabelFontSize: 7.5, catAxisLabelColor: HEX.navy, valAxisHidden: true, valGridLine: { style: 'none' }, showLegend: true, legendPos: 'r', legendFontSize: 7.5, legendFontFace: '+mn-lt', legendColor: HEX.navy, objectName: 'Ranking grafik',
    });
  
    // ---------- insight ----------
    const IY = 6.76;
    box(0.25, IY, 12.83, 0.62, 'Insight latar');
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.25, y: IY, w: 2.0, h: 0.62, rectRadius: 0.08, fill: { color: C.text1 }, line: { color: C.text1 }, objectName: 'Insight judul latar' });
    s.addImage({ data: await icon('FaLightbulb', 'FFC81E'), x: 0.38, y: IY + 0.17, w: 0.28, h: 0.28, altText: 'Insight', objectName: 'Insight ikon' });
    T('INSIGHT & REKOMENDASI', { x: 0.72, y: IY, w: 1.48, h: 0.62, fontSize: 10, bold: true, color: C.background1, valign: 'middle' }, 'Insight judul');
    const top = U[0], topO = d.uid[top], topT = topO.P + topO.S + topO.C;
    const win = LAST >= 6 ? 3 : 1; const cBefore = sum(d.mon.C.slice(0, win)) / win, cAfter = sum(d.mon.C.slice(LAST - win)) / win;
    const rngTxt = (a, b) => (a === b ? MONs5[a] : `${MONs5[a]}–${MONs5[b]}`); const MONs5 = BS.map((x) => x.charAt(0) + x.slice(1).toLowerCase());
    const ins = [
      `Total ${n0(tot.T)} kali (rata-rata ${n0(tot.T / LAST)}/bulan); sesaat mendominasi ${pc(tot.S / tot.T * 100)}.`,
      `${top} terbesar: ${n0(topT)} kali (${pc(topT / tot.T * 100)} Sumkal); permanen tertinggi ${top} ${n0(topO.P)} kali.`,
      `Cleansing ${cAfter <= cBefore ? 'turun' : 'naik'} dari ±${n0(cBefore)}/bln (${rngTxt(0, win - 1)}) ke ±${n0(cAfter)}/bln (${rngTxt(LAST - win, LAST - 1)}); koreksi ${n0(tot.K / LAST)}/bln.`,
    ];
    const IC = ['1E73E8', 'D93025', '0F766E'];
    ins.forEach((t, i) => {
      const x0 = 2.38 + i * 3.57;
      s.addShape(pres.shapes.OVAL, { x: x0, y: IY + 0.13, w: 0.36, h: 0.36, fill: { color: IC[i] }, line: { color: IC[i] }, objectName: `Insight ${i + 1} nomor latar` });
      T(String(i + 1), { x: x0, y: IY + 0.13, w: 0.36, h: 0.36, fontSize: 13, bold: true, color: C.background1, align: 'center', valign: 'middle' }, `Insight ${i + 1} nomor`);
      T(t, { x: x0 + 0.44, y: IY + 0.04, w: 3.05, h: 0.54, fontSize: 8.5, color: C.text1, valign: 'middle' }, `Insight ${i + 1}`);
    });
  
    s.addNotes(`Sumber: database dashboard Sumkal. Gangguan permanen dan sesaat: tab Event Padam Penyulang, kolom P/S, kode J, bidang Distribusi, No. Laporan unik. Data cleansing dan event koreksi: tab Koreksi Cleansing, kode J, event yang sudah disetujui (Tanggal Approval 2 terisi). Total gangguan = permanen + sesaat + cleansing. Rata-rata per bulan = total ÷ ${LAST} bulan (Januari–${BLN[LAST - 1]} 2026). Koreksi dan cleansing kode P (pemeliharaan) tidak dihitung: cleansing ${'78'} dan koreksi ${'3.042'} event.`);
  }

  // ---------- slide penyebab gangguan ----------
  // Slide: penyebab gangguan penyulang distribusi (kode J, data Dupont Gangguan).
  
  async function slide6(pres, ctx) {
    const { C, HEX, BLN, BS, icon } = ctx;
    const d = ctx.data6;
    const LAST = d.last;
    const MONs = BS.slice(0, LAST).map((m) => m.charAt(0) + m.slice(1).toLowerCase());
    const n0 = (v) => Math.round(v).toLocaleString('id-ID');
    const pc = (v) => v.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    const TOT = sum(d.mon);
    const causes = Object.entries(d.cause).map(([c, a]) => [c, a, sum(a)]).sort((a, b) => b[2] - a[2]);
    const label = (c) => (c === '(kosong)' ? 'Tidak ada keterangan' : c);
    const s = pres.addSlide({ masterName: 'KINERJA_UID' });
    const T = (t, o, name) => s.addText(t, { margin: 0, isTextBox: true, objectName: name, ...o });
    const box = (x, y, w, h, name, fill = 'FFFFFF') => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: 'C9DCF2', width: 1 }, objectName: name });
    const head = (x, y, w, title, sub, name, num) => {
      let x0 = x;
      if (num) {
        s.addShape(pres.shapes.OVAL, { x, y: y - 0.02, w: 0.3, h: 0.3, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: name + ' nomor latar' });
        T(String(num), { x, y: y - 0.02, w: 0.3, h: 0.3, fontSize: 11, bold: true, color: C.background1, align: 'center', valign: 'middle' }, name + ' nomor');
        x0 += 0.38;
      }
      T([{ text: title, options: { bold: true, color: C.text1 } }, { text: sub ? '  ' + sub : '', options: { color: HEX.muted } }], { x: x0, y, w: w - (x0 - x), h: 0.26, fontSize: 11, valign: 'middle' }, name);
    };
    const PER = `Januari – ${BLN[LAST - 1]} 2026`;
  
    // ---------- judul ----------
    T('PENYEBAB GANGGUAN PENYULANG DISTRIBUSI', { x: 2.45, y: 0.12, w: 8.45, h: 0.5, fontSize: 22, bold: true, color: C.text1, align: 'center', valign: 'middle' }, 'Judul');
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.67, y: 0.7, w: 4.0, h: 0.32, rectRadius: 0.16, fill: { color: C.text1 }, line: { color: C.text1 }, objectName: 'Periode latar' });
    T(`${PER.toUpperCase()} · KODE J`, { x: 4.67, y: 0.7, w: 4.0, h: 0.32, fontSize: 12, bold: true, color: C.background1, align: 'center', valign: 'middle' }, 'Periode');
  
    // ---------- total ----------
    const TY = 1.15, TH = 1.38;
    box(0.25, TY, 2.55, TH, 'Total latar');
    s.addShape(pres.shapes.OVAL, { x: 0.38, y: TY + 0.14, w: 0.5, h: 0.5, fill: { color: C.text1 }, line: { color: C.text1 }, objectName: 'Total ikon latar' });
    s.addImage({ data: await icon('FaExclamationTriangle', 'FFC81E'), x: 0.5, y: TY + 0.25, w: 0.26, h: 0.26, altText: 'Total kejadian', objectName: 'Total ikon' });
    T('TOTAL KEJADIAN\nGANGGUAN PENYULANG', { x: 0.98, y: TY + 0.1, w: 1.78, h: 0.56, fontSize: 10, bold: true, color: C.accent1, valign: 'middle' }, 'Total judul');
    T([{ text: n0(TOT), options: { fontSize: 28, bold: true, color: C.text1 } }, { text: ' kali', options: { fontSize: 11, color: HEX.muted } }], { x: 0.35, y: TY + 0.64, w: 2.35, h: 0.42, align: 'center', valign: 'middle' }, 'Total nilai');
    T(`${PER}\nrata-rata ${n0(TOT / LAST)} per bulan`, { x: 0.35, y: TY + 1.04, w: 2.35, h: 0.3, fontSize: 8.5, color: HEX.muted, align: 'center', valign: 'middle' }, 'Total periode');
  
    // ---------- tren ----------
    box(2.9, TY, 4.85, TH, 'Tren latar');
    head(3.03, TY + 0.04, 4.6, 'TREN TOTAL GANGGUAN PENYULANG', '', 'Tren judul');
    s.addChart(pres.charts.BAR, [{ name: 'Gangguan penyulang', labels: MONs, values: d.mon }], {
      x: 2.95, y: TY + 0.28, w: 4.75, h: TH - 0.3, barGapWidthPct: 35, chartColors: ['2F80ED'], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8, dataLabelFontFace: '+mn-lt', dataLabelColor: HEX.navy, dataLabelFormatCode: '#,##0',
      catAxisLabelColor: HEX.muted, catAxisLabelFontSize: 8, catAxisLabelFontFace: '+mn-lt', valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, valAxisMaxVal: Math.ceil(Math.max(...d.mon) * 1.22), showLegend: false, objectName: 'Tren grafik',
    });
  
    // ---------- komposisi ----------
    const CX = 7.85, CW = 3.25;
    box(CX, TY, CW, 2.1, 'Komposisi latar');
    head(CX + 0.12, TY + 0.04, CW - 0.2, 'KOMPOSISI PENYEBAB', '', 'Komposisi judul');
    const top4 = causes.slice(0, 4); const other = TOT - sum(top4.map((c) => c[2]));
    const comp = [...top4.map(([c, , n]) => [c, n]), ['Lainnya', other]];
    const CI = { 'Dalam Investigasi': ['FaSearch', '2F80ED'], Pohon: ['FaTree', '27AE60'], 'Benda Asing': ['FaExclamationTriangle', 'F2A93B'], Binatang: ['FaPaw', 'E8414B'], Lainnya: ['FaEllipsisH', '9AA3AE'] };
    const maxC = comp[0][1];
    for (const [i, [c, n]] of comp.entries()) {
      const y = TY + 0.36 + i * 0.34; const [Ic, col] = CI[c] || ['FaCircle', '9AA3AE'];
      s.addShape(pres.shapes.OVAL, { x: CX + 0.12, y, w: 0.28, h: 0.28, fill: { color: col }, line: { color: col }, objectName: c + ' ikon latar' });
      s.addImage({ data: await icon(Ic, 'FFFFFF'), x: CX + 0.185, y: y + 0.065, w: 0.15, h: 0.15, altText: c, objectName: c + ' ikon' });
      T(c, { x: CX + 0.46, y, w: 1.0, h: 0.28, fontSize: 8.5, color: C.text1, valign: 'middle' }, c + ' label');
      const bw = 0.95 * n / maxC;
      s.addShape(pres.shapes.RECTANGLE, { x: CX + 1.46, y: y + 0.05, w: Math.max(0.03, bw), h: 0.18, fill: { color: col }, line: { color: col }, objectName: c + ' batang' });
      T([{ text: n0(n), options: { bold: true, color: C.text1 } }, { text: ` (${pc(n / TOT * 100)})`, options: { color: HEX.muted } }], { x: CX + 1.46 + bw + 0.05, y, w: CW - 1.55 - bw, h: 0.28, fontSize: 8, valign: 'middle' }, c + ' nilai');
    }
  
    // ---------- evaluasi ----------
    const EX = CX + CW + 0.08, EW = 13.08 - EX;
    box(EX, TY, EW, 2.1, 'Evaluasi latar', 'EAF2FC');
    s.addImage({ data: await icon('FaLightbulb', 'F2A93B'), x: EX + 0.12, y: TY + 0.1, w: 0.26, h: 0.26, altText: 'Evaluasi', objectName: 'Evaluasi ikon' });
    T('EVALUASI', { x: EX + 0.45, y: TY + 0.08, w: EW - 0.5, h: 0.3, fontSize: 11, bold: true, color: C.text1, valign: 'middle' }, 'Evaluasi judul');
    const two = causes[0][2] + causes[1][2];
    T([{ text: 'Penyebab terbesar adalah ' }, { text: causes[0][0], options: { bold: true } }, { text: ' dan ' }, { text: causes[1][0], options: { bold: true } }, { text: `, bersama ${n0(two)} kejadian atau ` }, { text: pc(two / TOT * 100), options: { bold: true } }, { text: ' dari total gangguan. Kasus Dalam Investigasi terbanyak di ' }, { text: `${Object.entries(d.inv).sort((x, y) => sum(y[1]) - sum(x[1]))[0][0]} (${n0(Math.max(...Object.values(d.inv).map(sum)))})`, options: { bold: true } }, { text: ', jadi penuntasan investigasi perlu dipercepat.' }],
      { x: EX + 0.12, y: TY + 0.44, w: EW - 0.22, h: 1.58, fontSize: 10, color: C.text1, valign: 'top' }, 'Evaluasi isi');
  
    // ---------- rincian penyebab ----------
    const RY = 2.62, RW = 7.5;
    box(0.25, RY, RW, 4.78, 'Rincian latar');
    head(0.37, RY + 0.05, RW - 0.25, 'RINCIAN PENYEBAB GANGGUAN', `(${PER})`, 'Rincian judul', 1);
    const hc = (t, al) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: '1E5BC6' }, align: al || 'center', valign: 'middle', fontSize: 7.5, margin: al === 'left' ? [0, 0, 0, 0.05] : 0 } });
    const rows = [[hc('Penyebab gangguan', 'left'), ...MONs.map((m) => hc(m)), hc('Total'), hc('%')]];
    const cell = (t, o = {}) => ({ text: t, options: { fontSize: 7, color: HEX.navy, align: 'right', valign: 'middle', margin: [0, 0.04, 0, 0], ...o } });
    causes.forEach(([c, a, n], i) => {
      const f = i % 2 ? 'F6F9FD' : 'FFFFFF';
      rows.push([cell(label(c), { align: 'left', margin: [0, 0, 0, 0.05], fill: { color: f } }), ...a.map((v) => cell(v ? n0(v) : '–', { fill: { color: f } })), cell(n0(n), { bold: true, color: '1E5BC6', fill: { color: f } }), cell(pc(n / TOT * 100), { bold: true, fill: { color: f } })]);
    });
    const GF = 'FFF4CC';
    rows.push([cell('Total', { align: 'left', bold: true, margin: [0, 0, 0, 0.05], fill: { color: GF } }), ...d.mon.map((v) => cell(n0(v), { bold: true, fill: { color: GF } })), cell(n0(TOT), { bold: true, fill: { color: GF } }), cell('100,0%', { bold: true, fill: { color: GF } })]);
    const cw0 = 2.25, cwT = 0.62, cwP = 0.5; const cwM = (RW - 0.16 - cw0 - cwT - cwP) / LAST;
    s.addTable(rows, { x: 0.33, y: RY + 0.36, w: RW - 0.16, colW: [cw0, ...Array(LAST).fill(cwM), cwT, cwP], rowH: (4.36) / rows.length, border: { type: 'solid', color: 'E1E8F2', pt: 0.5 }, fontFace: 'Arial', objectName: 'Rincian tabel' });
  
    // ---------- dalam investigasi per UID ----------
    const IY = 3.35, IH = 2.5;
    box(CX, IY, 13.08 - CX, IH, 'Investigasi latar');
    head(CX + 0.12, IY + 0.05, 13.08 - CX - 0.2, 'DALAM INVESTIGASI PER UID', `(${PER})`, 'Investigasi judul', 2);
    const inv = Object.entries(d.inv).map(([u, a]) => [u, a, sum(a)]).sort((a, b) => b[2] - a[2]);
    const ir = [[hc('UID', 'left'), ...MONs.map((m) => hc(m)), hc('Total')]];
    inv.forEach(([u, a, n], i) => { const f = i % 2 ? 'F6F9FD' : 'FFFFFF'; ir.push([cell(u, { align: 'left', margin: [0, 0, 0, 0.05], fill: { color: f } }), ...a.map((v) => cell(v ? n0(v) : '–', { fill: { color: f } })), cell(n0(n), { bold: true, color: '1E5BC6', fill: { color: f } })]); });
    const invTot = d.cause['Dalam Investigasi'];
    ir.push([cell('Total', { align: 'left', bold: true, margin: [0, 0, 0, 0.05], fill: { color: GF } }), ...invTot.map((v) => cell(n0(v), { bold: true, fill: { color: GF } })), cell(n0(sum(invTot)), { bold: true, fill: { color: GF } })]);
    const IW = 13.08 - CX - 0.16; const iw0 = 0.95, iwT = 0.55; const iwM = (IW - iw0 - iwT) / LAST;
    s.addTable(ir, { x: CX + 0.08, y: IY + 0.37, w: IW, colW: [iw0, ...Array(LAST).fill(iwM), iwT], rowH: (IH - 0.45) / ir.length, border: { type: 'solid', color: 'E1E8F2', pt: 0.5 }, fontFace: 'Arial', objectName: 'Investigasi tabel' });
  
    // ---------- insight ----------
    const NY = 5.95, NH = 1.45;
    box(CX, NY, 13.08 - CX, NH, 'Insight latar');
    head(CX + 0.12, NY + 0.05, 13.08 - CX - 0.2, 'INSIGHT & REKOMENDASI', '', 'Insight judul', 3);
    const DI = sum(invTot); const i0 = inv[0], i1 = inv[1];
    const ins = [
      `Total ${n0(TOT)} kali, rata-rata ${n0(TOT / LAST)} per bulan; puncak ${MONs[d.mon.indexOf(Math.max(...d.mon))]} (${n0(Math.max(...d.mon))}).`,
      `${i0[0]} dan ${i1[0]} menyumbang ${pc((i0[2] + i1[2]) / DI * 100)} kasus Dalam Investigasi. ${i0[0]} turun dari ${n0(i0[1][0])} (Jan) ke ${n0(i0[1][LAST - 1])} (${MONs[LAST - 1]}).`,
      `Prioritaskan penuntasan investigasi, pemeliharaan ROW (pohon) dan pengamanan jaringan dari benda asing dan binatang.`,
    ];
    const IC = ['1E73E8', 'EF7D22', '0F766E'];
    const iw = (13.08 - CX - 0.3) / 3;
    ins.forEach((t, i) => {
      const x0 = CX + 0.12 + i * (iw + 0.03);
      s.addShape(pres.shapes.OVAL, { x: x0, y: NY + 0.4, w: 0.3, h: 0.3, fill: { color: IC[i] }, line: { color: IC[i] }, objectName: `Insight ${i + 1} nomor latar` });
      T(String(i + 1), { x: x0, y: NY + 0.4, w: 0.3, h: 0.3, fontSize: 11, bold: true, color: C.background1, align: 'center', valign: 'middle' }, `Insight ${i + 1} nomor`);
      T(t, { x: x0 + 0.35, y: NY + 0.36, w: iw - 0.38, h: 1.04, fontSize: 8, color: C.text1, valign: 'top' }, `Insight ${i + 1}`);
    });
  
    s.addNotes(`Sumber: database dashboard Sumkal, tab Dupont Gangguan: gangguan kode J, bidang Distribusi, No. Laporan unik, ${PER}. Kolom CAUSE kosong ditampilkan sebagai "Tidak ada keterangan". Dalam Investigasi per UID memakai kolom UNIT data APKT.`);
  }

  const api = { build, compute, months };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SSSlides = api;
})(typeof window !== 'undefined' ? window : globalThis);
