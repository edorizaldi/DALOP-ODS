// Tab Event Padam Penyulang, di bawah Matriks unit × bulan:
// 1) event padam permanen vs sesaat per unit (dataset gangguan_ps, kolom P/S), ikut filter Kode, Bidang dan Unit;
// 2) kondisi penyulang per bulan (kronis ≥6, sakit 2–5, sehat 1, sempurna 0 kali gangguan kode J distribusi, permanen + sesaat) dari peny_bulanan dan peny_profil.
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('gps-card')) return;
  const UNAME = { ACEH: 'Aceh', BABEL: 'Bangka Belitung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra', LAMPUNG: 'Lampung', RKR: 'Riau & Kepri', S2JB: 'S2JB', SUMBAR: 'Sumatera Barat', SUMUT: 'Sumatera Utara' };
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID');
  const fmt = (v) => nf.format(Math.round(v));
  const pc = (v) => new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  const tc = (s) => String(s).charAt(0) + String(s).slice(1).toLowerCase();
  const uname = (u) => UNAME[u] || u;
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const C_P = '#B3261E', C_S = '#E8A39C', C_SAKIT = '#E9A23B', C_KRONIS = '#B3261E';
  const toggleUnit = (u) => dash.setParams({ g_unit: dash.params().g_unit === u ? null : u });
  const clickRow = (tr, u) => { tr.classList.add('gx-click'); tr.tabIndex = 0; tr.addEventListener('click', () => toggleUnit(u)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') toggleUnit(u); }); };
  $('gps-bulan').addEventListener('change', (e) => dash.setParams({ gps_bulan: e.target.value ? Number(e.target.value) : null }));
  $('gsk-bulan').addEventListener('change', (e) => dash.setParams({ gsk_bulan: e.target.value ? Number(e.target.value) : null }));
  const ctx = { gps: '', gsk: '' };
  $('gps-dl').addEventListener('click', () => window.SSExport({ card: 'gps-card', btn: 'gps-dl', msg: 'gps-msg', preview: 'gps-pv', filename: `Permanen_Sesaat_per_Unit_${ctx.gps.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));
  $('gsk-dl').addEventListener('click', () => window.SSExport({ card: 'gsk-card', btn: 'gsk-dl', msg: 'gsk-msg', preview: 'gsk-pv', filename: `Kondisi_Penyulang_${ctx.gsk.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));

  // ---------- rekap permanen / sesaat per UID per bulan (kode J, Distribusi, semua jenis padam) ----------
  let gprRows = [];
  $('gpr-dl').addEventListener('click', () => window.SSExport({ card: 'gpr-card', btn: 'gpr-dl', msg: 'gpr-msg', preview: 'gpr-pv', filename: 'Rekap_Permanen_Sesaat_per_UID_2026.png' }));
  $('gpr-csv').addEventListener('click', () => {
    if (!gprRows.length) return;
    const csv = gprRows.map((r) => r.map((v) => (/[;"\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v)).join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'Rekap_Permanen_Sesaat_per_UID_2026.csv'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  function renderRekap() {
    const D = SSD.data('gangguan_ps'); if (D.status !== 'ok') return;
    const v = {}; const ms = new Set();
    D.data.forEach((r) => {
      if (r.KODE !== 'J' || r.BIDANG !== 'DISTRIBUSI' || (r.PS !== 'Permanen' && r.PS !== 'Sesaat')) return;
      const m = +r.BULAN_NO; if (!(m >= 1 && m <= 12)) return; ms.add(m);
      const k = r.UNIT + '|' + r.PS + '|' + m; v[k] = (v[k] || 0) + Number(r.JUMLAH);
    });
    const months = [...ms].sort((a, b) => a - b); const lastM = months[months.length - 1];
    const us = UORD.filter((u) => months.some((m) => v[u + '|Permanen|' + m] || v[u + '|Sesaat|' + m]));
    const g = (u, ps, m) => (u ? v[u + '|' + ps + '|' + m] || 0 : us.reduce((a, x) => a + (v[x + '|' + ps + '|' + m] || 0), 0));
    const cum = (u, ps) => months.reduce((a, m) => a + g(u, ps, m), 0);
    const th = mk('thead'), hr = mk('tr');
    [['UID', ''], ['', ''], ...months.map((m) => [BS[m - 1], 'num']), [`Kumulatif Jan–${BS[lastM - 1]}`, 'num gpr-cum']].forEach(([h, c]) => hr.append(mk('th', h, c))); th.append(hr);
    const tb = mk('tbody'); gprRows = [['UID', 'Jenis', ...months.map((m) => BLN[m - 1]), `Kumulatif Jan-${BLN[lastM - 1]}`]];
    const block = (u, name, cls) => {
      ['Permanen', 'Sesaat', 'Total'].forEach((ps, i) => {
        const tr = mk('tr', null, [cls, i === 0 ? 'gpr-first' : '', ps === 'Total' ? 'gpr-sum' : ''].filter(Boolean).join(' '));
        if (i === 0) { const td = mk('td', name, 'gpr-u'); td.rowSpan = 3; tr.append(td); }
        const val = (m) => (ps === 'Total' ? g(u, 'Permanen', m) + g(u, 'Sesaat', m) : g(u, ps, m));
        const sw = mk('td', null, 'gpr-l'); if (ps !== 'Total') { const i2 = mk('i', null, 'ss-sw'); i2.style.background = ps === 'Permanen' ? C_P : C_S; sw.append(i2); } sw.append(ps); tr.append(sw);
        months.forEach((m) => { const n = val(m); tr.append(mk('td', fmt(n), 'num' + (n ? '' : ' gx-zero'))); });
        const c = ps === 'Total' ? cum(u, 'Permanen') + cum(u, 'Sesaat') : cum(u, ps); tr.append(mk('td', fmt(c), 'num gpr-cum'));
        tb.append(tr); gprRows.push([name, ps, ...months.map(val), c]);
      });
    };
    us.forEach((u) => block(u, uname(u)));
    block(null, 'Total Sumkal', 'dp-ps-tot');
    $('gpr-table').replaceChildren(th, tb);
  }

  const filterText = (P) => [P.g_kode ? 'Kode ' + P.g_kode : 'semua kode', P.g_bidang ? 'Bidang ' + tc(P.g_bidang) : 'semua bidang'].join(' · ');

  // ---------- 1) permanen vs sesaat per unit ----------
  function renderPS(P) {
    const D = SSD.data('gangguan_ps'); if (D.status !== 'ok') return;
    const rows = D.data.map((r) => ({ k: r.KODE, b: r.BIDANG, u: r.UNIT, m: Number(r.BULAN_NO), s: r.PS, n: Number(r.JUMLAH) }));
    const months = [...new Set(rows.map((r) => r.m))].sort((a, b) => a - b);
    const bm = months.includes(Number(P.gps_bulan)) ? Number(P.gps_bulan) : null;
    const sb = $('gps-bulan');
    sb.replaceChildren(new Option(`Semua bulan (${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]} 2026)`, ''), ...months.map((m) => new Option(BLN[m - 1] + ' 2026', m)));
    sb.value = bm ? String(bm) : '';
    const per = bm ? BLN[bm - 1] + ' 2026' : `${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]} 2026`;
    const cur = rows.filter((r) => (!P.g_kode || r.k === P.g_kode) && (!P.g_bidang || r.b === P.g_bidang) && (!bm || r.m === bm));
    const units = [...UORD.filter((u) => rows.some((r) => r.u === u)), ...[...new Set(rows.map((r) => r.u))].filter((u) => !UORD.includes(u)).sort()];
    const agg = units.map((u) => { const o = { u, p: 0, s: 0 }; cur.forEach((r) => { if (r.u !== u) return; if (r.s === 'Permanen') o.p += r.n; else if (r.s === 'Sesaat') o.s += r.n; }); o.t = o.p + o.s; return o; }).sort((a, b) => b.t - a.t);
    const tot = agg.reduce((a, o) => ({ p: a.p + o.p, s: a.s + o.s, t: a.t + o.t }), { p: 0, s: 0, t: 0 });
    ctx.gps = `${filterText(P)}_${per}`;
    const hi = agg.filter((o) => o.t).sort((a, b) => b.p / b.t - a.p / a.t)[0];
    $('gps-sel').replaceChildren('Filter: ', mk('b', filterText(P)), ` · ${per}. Event padam (No. Laporan unik) menurut kolom P/S. Sumkal: `, mk('b', `${fmt(tot.p)} permanen (${tot.t ? pc(tot.p / tot.t) : '–'})`), ` dan ${fmt(tot.s)} sesaat` + (hi ? `; porsi permanen tertinggi di ${uname(hi.u)} ${pc(hi.p / hi.t)}.` : '.') + ' Klik baris untuk memilih unit.');
    const mx = Math.max(1, ...agg.map((o) => o.t));
    const th = mk('thead'), hr = mk('tr');
    [['Unit', ''], ['Permanen', 'num'], ['Sesaat', 'num'], ['Total', 'num'], ['% Permanen', 'num'], ['', 'dp-ps-barh']].forEach(([h, c]) => hr.append(mk('th', h, c)));
    th.append(hr);
    const tb = mk('tbody');
    const line = (name, o, cls, u) => {
      const tr = mk('tr', null, cls || '');
      tr.append(mk('td', name), mk('td', fmt(o.p), 'num'), mk('td', fmt(o.s), 'num'), mk('td', fmt(o.t), 'num'), mk('td', o.t ? pc(o.p / o.t) : '–', 'num'));
      const bc = mk('td', null, 'dp-ps-barc');
      if (u) { const bar = mk('div', null, 'dp-ps-bar'); bar.style.width = (o.t / mx * 100) + '%'; const a = mk('i', null, 'p'); a.style.width = (o.t ? o.p / o.t * 100 : 0) + '%'; const b = mk('i', null, 's'); b.style.width = (o.t ? o.s / o.t * 100 : 0) + '%'; bar.append(a, b); bar.title = `${name}: permanen ${fmt(o.p)}, sesaat ${fmt(o.s)}`; bc.append(bar); }
      tr.append(bc);
      if (u) clickRow(tr, u);
      return tr;
    };
    agg.forEach((o) => tb.append(line(uname(o.u), o, P.g_unit === o.u ? 'on' : '', o.u)));
    tb.append(line('Total Sumkal', tot, 'dp-ps-tot'));
    $('gps-table').replaceChildren(th, tb);
  }

  // ---------- 2) kondisi penyulang per bulan: kronis, sakit, sehat, sempurna ----------
  // Dihitung dari gangguan kode J bidang Distribusi (permanen + sesaat) per penyulang per bulan:
  // kronis ≥ 6 kali, sakit 2–5 kali, sehat 1 kali, sempurna 0 kali (penyulang aktif di database tanpa gangguan).
  const KAT = [
    { id: 'k', nm: 'Kronis', ket: '≥6 kali', c: C_KRONIS },
    { id: 's', nm: 'Sakit', ket: '2–5 kali', c: C_SAKIT },
    { id: 'h', nm: 'Sehat', ket: '1 kali', c: '#9CCB8A' },
    { id: 'p', nm: 'Sempurna', ket: '0 kali', c: '#2E7D4F' },
  ];
  const katOf = (n) => (n >= 6 ? 'k' : n >= 2 ? 's' : n === 1 ? 'h' : 'p');
  function renderSK(P) {
    const B = SSD.data('peny_bulanan'), PR = SSD.data('peny_profil');
    if (B.status !== 'ok' || PR.status !== 'ok') return;
    const ch = $('gsk-chart'); ch.classList.remove('dash-skeleton');
    const u3uid = new Map(); PR.data.forEach((r) => { if (r.uid && !u3uid.has(r.up3)) u3uid.set(r.up3, r.uid); });
    // populasi: penyulang di database (selain Inactive / Not Ready)
    const pop = new Map(); PR.data.forEach((r) => { if (r.di_database !== 'Ya' || /inactive|not ready/i.test(r.status || '')) return; const u = r.uid || u3uid.get(r.up3) || ''; if (UORD.includes(u)) pop.set(r.up3 + '\u0001' + r.penyulang, u); });
    // gangguan kode J, bidang Distribusi, permanen + sesaat per penyulang per bulan
    const cnt = new Map();
    B.data.forEach((r) => {
      if (r.kode !== 'J' || r.bidang !== 'DISTRIBUSI' || (r.ps !== 'Permanen' && r.ps !== 'Sesaat')) return;
      const k = r.up3 + '\u0001' + r.penyulang + '\u0001' + r.bulan; const o = cnt.get(k) || { p: 0, s: 0 }; o[r.ps === 'Permanen' ? 'p' : 's'] += Number(r.kali); cnt.set(k, o);
    });
    const list = [...cnt].map(([k, o]) => { const [up3, peny, m] = k.split('\u0001'); return { up3, peny, m: +m, p: o.p, s: o.s, n: o.p + o.s, u: u3uid.get(up3) || '' }; });
    const months = [...new Set(B.data.map((r) => +r.bulan))].sort((a, b) => a - b);
    // unit yang punya data penyulang pada bulan itu; tanpa data, penyulangnya tidak dihitung sempurna
    const ada = new Set(B.data.map((r) => +r.bulan + '|' + (u3uid.get(r.up3) || '')));
    const unit = P.g_unit || null;
    const inU = (u) => !unit || u === unit;
    const where = unit ? uname(unit) : 'Sumkal';
    // jumlah per kategori untuk bulan m (opsional dibatasi unit u)
    const agg = (m, u) => {
      const o = { k: 0, s: 0, h: 0, p: 0 }; const hit = new Set();
      list.forEach((x) => { if (x.m !== m || !UORD.includes(x.u) || (u && x.u !== u) || !x.n) return; o[katOf(x.n)]++; hit.add(x.up3 + '\u0001' + x.peny); });
      pop.forEach((pu, id) => { if ((!u || pu === u) && ada.has(m + '|' + pu) && !hit.has(id)) o.p++; });
      o.t = o.k + o.s + o.h + o.p; return o;
    };
    const ser = months.map((m) => ({ m, ...agg(m, unit) }));
    const bm = months.includes(Number(P.gsk_bulan)) ? Number(P.gsk_bulan) : months[months.length - 1];
    ctx.gsk = `${where}_${BLN[bm - 1]}_2026`;
    const last = ser.find((d) => d.m === bm) || { k: 0, s: 0, h: 0, p: 0, t: 0 };
    const peakK = ser.slice().sort((a, b) => b.k - a.k)[0];
    $('gsk-sel').replaceChildren('Unit dipilih: ', mk('b', where), ` · ${BLN[bm - 1]} 2026 dari ${fmt(last.t)} penyulang: `,
      mk('b', `${fmt(last.k)} kronis`), ', ', mk('b', `${fmt(last.s)} sakit`), ', ', mk('b', `${fmt(last.h)} sehat`), ', ', mk('b', `${fmt(last.p)} sempurna`),
      peakK && peakK.k ? `. Kronis terbanyak di ${BLN[peakK.m - 1]} (${fmt(peakK.k)} penyulang).` : '.');
    const kosong = months.map((m) => [m, UORD.filter((u) => inU(u) && !ada.has(m + '|' + u))]).filter(([, l]) => l.length);
    if (kosong.length) $('gsk-sel').append(' Belum ada data penyulang: ' + kosong.map(([m, l]) => `${BS[m - 1]} (${l.map(uname).join(', ')})`).join('; ') + '.');
    $('gsk-legend').replaceChildren(...KAT.map((k) => { const sp = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = k.c; sp.append(i, `${k.nm} (${k.ket})`); return sp; }));

    // grafik batang bertumpuk per bulan: kronis paling bawah, sempurna paling atas
    ch.replaceChildren();
    const W = Math.max(320, ch.clientWidth || 800), H = 280, mg = { t: 12, r: 8, b: 26, l: 44 };
    const svg = d3.select(ch).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `Kondisi penyulang per bulan (kronis, sakit, sehat, sempurna), ${where}`);
    const y = d3.scaleLinear([0, (d3.max(ser, (d) => d.t) || 1) * 1.04], [H - mg.b, mg.t]).nice();
    const x = d3.scaleBand(months, [mg.l, W - mg.r]).padding(0.28);
    y.ticks(5).forEach((t) => {
      svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', mg.l - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt(t));
    });
    const bw = Math.min(x.bandwidth(), 56), off = (x.bandwidth() - bw) / 2;
    ser.forEach((d) => {
      const g = svg.append('g').style('cursor', 'pointer').on('click', () => dash.setParams({ gsk_bulan: d.m }));
      let acc = 0;
      KAT.forEach((k) => {
        const v = d[k.id]; const y0 = y(acc), y1 = y(acc + v); acc += v;
        g.append('rect').attr('x', x(d.m) + off).attr('width', bw).attr('y', y1).attr('height', Math.max(0, y0 - y1)).attr('fill', k.c).attr('opacity', d.m === bm ? 1 : 0.72);
        if (y0 - y1 >= 13 && bw >= 26) g.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', (y0 + y1) / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').style('font-size', '10.5px').style('font-weight', 600).attr('fill', k.id === 's' || k.id === 'h' ? '#1d2a14' : '#fff').text(fmt(v));
      });
      g.append('title').text(`${BLN[d.m - 1]} 2026 · ` + KAT.map((k) => `${k.nm.toLowerCase()} ${fmt(d[k.id])}`).join(', ') + ` (total ${fmt(d.t)})`);
      svg.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', d.m === bm ? 'var(--color-fg)' : 'var(--color-fg-muted)').style('font-weight', d.m === bm ? 600 : 400).style('font-size', 'var(--cds-font-size-caption)').text(BS[d.m - 1]);
    });

    // per unit, bulan terpilih
    $('gsk-unit-h').textContent = `Per unit · ${BLN[bm - 1]} 2026`;
    const us = UORD.filter((u) => list.some((x) => x.u === u) || [...pop.values()].includes(u));
    const aggU = us.map((u) => ({ u, ...agg(bm, u) })).sort((a, b) => (b.k - a.k) || (b.s - a.s));
    const th = mk('thead'), hr = mk('tr'); [['Unit', ''], ...KAT.map((k) => [k.nm, 'num']), ['Total', 'num'], ['', '']].forEach(([h, c]) => hr.append(mk('th', h, c))); th.append(hr);
    const tb = mk('tbody');
    const uline = (name, o, cls, u) => {
      const tr = mk('tr', null, cls || ''); tr.append(mk('td', name));
      KAT.forEach((k) => tr.append(mk('td', fmt(o[k.id]), 'num' + (o[k.id] ? '' : ' gx-zero'))));
      tr.append(mk('td', fmt(o.t), 'num'));
      const bc = mk('td'); if (u && o.t) { const b = mk('div', null, 'gx-mini gx-mini4'); KAT.forEach((k) => { const i = mk('i'); i.style.background = k.c; i.style.width = (o[k.id] / o.t * 100) + '%'; b.append(i); }); bc.append(b); }
      tr.append(bc); if (u) clickRow(tr, u); return tr;
    };
    aggU.forEach((o) => tb.append(uline(uname(o.u), o, unit === o.u ? 'on' : '', o.u)));
    const tU = aggU.reduce((a, o) => { KAT.forEach((k) => { a[k.id] += o[k.id]; }); a.t += o.t; return a; }, { k: 0, s: 0, h: 0, p: 0, t: 0 });
    tb.append(uline('Total Sumkal', tU, 'dp-ps-tot'));
    $('gsk-unit').replaceChildren(th, tb);

    // daftar penyulang kronis dan sakit bulan terpilih
    const sb = $('gsk-bulan'); sb.replaceChildren(...months.map((m) => new Option(BLN[m - 1] + ' 2026', m))); sb.value = String(bm);
    const nKr = new Map(); list.forEach((x) => { if (x.n >= 6 && x.m <= bm) { const id = x.up3 + '|' + x.peny; nKr.set(id, (nKr.get(id) || 0) + 1); } });
    const rowsL = list.filter((x) => x.m === bm && x.n >= 2 && inU(x.u)).sort((a, b) => b.n - a.n || b.p - a.p);
    $('gsk-list-h').textContent = `Penyulang kronis dan sakit · ${where} (${fmt(rowsL.length)})`;
    const th2 = mk('thead'), hr2 = mk('tr'); [['Penyulang', ''], ['UP3', ''], ['P', 'num'], ['S', 'num'], ['Total', 'num'], ['Status', ''], ['Bln kronis', 'num']].forEach(([h, c]) => hr2.append(mk('th', h, c))); th2.append(hr2);
    const tb2 = mk('tbody');
    if (!rowsL.length) { const tr = mk('tr'); const td = mk('td', 'Tidak ada penyulang kronis atau sakit pada bulan ini.', 'gx-zero'); td.colSpan = 7; tr.append(td); tb2.append(tr); }
    rowsL.forEach((x) => {
      const kr = x.n >= 6; const tr = mk('tr'); const st = mk('td'); st.append(mk('span', kr ? 'Kronis' : 'Sakit', 'gx-pill ' + (kr ? 'k' : 's')));
      const u3 = mk('td'); u3.append(mk('span', x.up3)); if (!unit && x.u) u3.append(mk('small', uname(x.u), 'gx-sub'));
      const nb = nKr.get(x.up3 + '|' + x.peny) || 0; const nbc = mk('td', `${fmt(nb)} dari ${months.filter((m) => m <= bm).length}`, 'num'); nbc.title = `Jumlah bulan Jan–${BLN[bm - 1]} dengan ≥6 kali gangguan (permanen + sesaat)`;
      tr.append(mk('td', x.peny), u3, mk('td', fmt(x.p), 'num' + (x.p ? '' : ' gx-zero')), mk('td', fmt(x.s), 'num' + (x.s ? '' : ' gx-zero')), mk('td', fmt(x.n), 'num'), st, nbc);
      tb2.append(tr);
    });
    $('gsk-list').replaceChildren(th2, tb2);
    $('gsk-note').textContent = 'Dihitung dari gangguan kode J bidang Distribusi (permanen + sesaat) per penyulang per bulan; filter Kode dan Bidang di atas tidak berlaku di kartu ini. P = permanen, S = sesaat. Sempurna = penyulang di database (selain status Inactive / Not Ready) tanpa gangguan kode J distribusi pada bulan itu. Klik batang untuk memilih bulan; klik baris unit untuk memilih unit.';
  }

  SSD.onData(() => { const P = dash.params(); try { renderRekap(); } catch (e) { console.error(e); } try { renderPS(P); } catch (e) { console.error(e); } try { renderSK(P); } catch (e) { console.error(e); } });
})();
