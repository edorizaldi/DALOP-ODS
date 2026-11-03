// Tab Event Padam Penyulang, di bawah Matriks unit × bulan:
// 1) event padam permanen vs sesaat per unit (dataset gangguan_ps, kolom P/S), ikut filter Kode, Bidang dan Unit;
// 2) jumlah penyulang sakit (4–9 kali gangguan permanen sebulan) vs kronis (≥10 kali) dari dataset peny_bulanan.
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
  $('gsk-dl').addEventListener('click', () => window.SSExport({ card: 'gsk-card', btn: 'gsk-dl', msg: 'gsk-msg', preview: 'gsk-pv', filename: `Penyulang_Sakit_Kronis_${ctx.gsk.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));

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

  // ---------- 2) penyulang sakit vs kronis ----------
  function renderSK(P) {
    const B = SSD.data('peny_bulanan'), PR = SSD.data('peny_profil');
    if (B.status !== 'ok' || PR.status !== 'ok') return;
    const ch = $('gsk-chart'); ch.classList.remove('dash-skeleton');
    const u3uid = new Map(); PR.data.forEach((r) => { if (r.uid && !u3uid.has(r.up3)) u3uid.set(r.up3, r.uid); });
    const hasKode = B.data.some((r) => r.kode), hasBid = B.data.some((r) => r.bidang);
    // gangguan permanen per penyulang per bulan
    const cnt = new Map();
    B.data.forEach((r) => {
      if (r.jenis_padam !== 'Gangguan' || r.ps !== 'Permanen') return;
      if (P.g_kode && r.kode && r.kode !== P.g_kode) return;
      if (P.g_bidang && r.bidang && r.bidang !== P.g_bidang) return;
      const k = r.up3 + '\u0001' + r.penyulang + '\u0001' + r.bulan; cnt.set(k, (cnt.get(k) || 0) + Number(r.kali));
    });
    const list = [...cnt].map(([k, n]) => { const [up3, peny, m] = k.split('\u0001'); return { up3, peny, m: +m, n, u: u3uid.get(up3) || '' }; });
    const months = [...new Set(B.data.map((r) => +r.bulan))].sort((a, b) => a - b);
    const unit = P.g_unit || null;
    const scope = (x) => !unit || x.u === unit;
    const where = unit ? uname(unit) : 'Sumkal';
    const ser = months.map((m) => { const o = { m, s: 0, k: 0 }; list.forEach((x) => { if (x.m !== m || !scope(x)) return; if (x.n >= 10) o.k++; else if (x.n >= 4) o.s++; }); return o; });
    const bm = months.includes(Number(P.gsk_bulan)) ? Number(P.gsk_bulan) : months[months.length - 1];
    ctx.gsk = `${where}_${BLN[bm - 1]}_2026`;
    const last = ser.find((d) => d.m === bm) || { s: 0, k: 0 };
    const peakK = ser.slice().sort((a, b) => b.k - a.k)[0];
    $('gsk-sel').replaceChildren('Unit dipilih: ', mk('b', where), ` · ${BLN[bm - 1]} 2026: `, mk('b', `${fmt(last.s)} penyulang sakit`), ' dan ', mk('b', `${fmt(last.k)} penyulang kronis`), peakK && peakK.k ? `. Kronis terbanyak di ${BLN[peakK.m - 1]} (${fmt(peakK.k)} penyulang).` : '.');

    // grafik batang bertumpuk per bulan
    ch.replaceChildren();
    const W = Math.max(320, ch.clientWidth || 800), H = 260, mg = { t: 22, r: 8, b: 26, l: 40 };
    const svg = d3.select(ch).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `Penyulang sakit dan kronis per bulan, ${where}`);
    const y = d3.scaleLinear([0, (d3.max(ser, (d) => d.s + d.k) || 1) * 1.1], [H - mg.b, mg.t]).nice();
    const x = d3.scaleBand(months, [mg.l, W - mg.r]).padding(0.34);
    y.ticks(4).forEach((t) => {
      svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('text').attr('x', mg.l - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt(t));
    });
    const bw = Math.min(x.bandwidth(), 46), off = (x.bandwidth() - bw) / 2;
    ser.forEach((d) => {
      const g = svg.append('g').style('cursor', 'pointer').on('click', () => dash.setParams({ gsk_bulan: d.m }));
      g.append('rect').attr('x', x(d.m) + off).attr('width', bw).attr('y', y(d.s)).attr('height', Math.max(0, y(0) - y(d.s))).attr('fill', C_SAKIT).attr('opacity', d.m === bm ? 1 : 0.75);
      g.append('rect').attr('x', x(d.m) + off).attr('width', bw).attr('y', y(d.s + d.k)).attr('height', Math.max(0, y(d.s) - y(d.s + d.k))).attr('fill', C_KRONIS).attr('opacity', d.m === bm ? 1 : 0.75);
      g.append('title').text(`${BLN[d.m - 1]} 2026 · sakit ${fmt(d.s)}, kronis ${fmt(d.k)}`);
      if (d.s + d.k) svg.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', y(d.s + d.k) - 6).attr('text-anchor', 'middle').style('font-size', 'var(--cds-font-size-caption)').style('font-weight', 600).attr('fill', 'var(--color-fg)').text(`${fmt(d.s)} · ${fmt(d.k)}`);
      svg.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', d.m === bm ? 'var(--color-fg)' : 'var(--color-fg-muted)').style('font-weight', d.m === bm ? 600 : 400).style('font-size', 'var(--cds-font-size-caption)').text(BS[d.m - 1]);
    });

    // per unit, bulan terpilih
    $('gsk-unit-h').textContent = `Per unit · ${BLN[bm - 1]} 2026`;
    const us = [...UORD.filter((u) => list.some((x) => x.u === u))];
    const aggU = us.map((u) => { const o = { u, s: 0, k: 0 }; list.forEach((x) => { if (x.u !== u || x.m !== bm) return; if (x.n >= 10) o.k++; else if (x.n >= 4) o.s++; }); return o; }).sort((a, b) => (b.k - a.k) || (b.s - a.s));
    const mxU = Math.max(1, ...aggU.map((o) => o.s + o.k));
    const th = mk('thead'), hr = mk('tr'); [['Unit', ''], ['Sakit', 'num'], ['Kronis', 'num'], ['Total', 'num'], ['', '']].forEach(([h, c]) => hr.append(mk('th', h, c))); th.append(hr);
    const tb = mk('tbody');
    const uline = (name, o, cls, u) => {
      const tr = mk('tr', null, cls || ''); tr.append(mk('td', name), mk('td', fmt(o.s), 'num' + (o.s ? '' : ' gx-zero')), mk('td', fmt(o.k), 'num' + (o.k ? '' : ' gx-zero')), mk('td', fmt(o.s + o.k), 'num'));
      const bc = mk('td'); if (u) { const b = mk('div', null, 'gx-mini'); b.style.width = ((o.s + o.k) / mxU * 100) + '%'; const a = mk('i', null, 's'); a.style.width = (o.s + o.k ? o.s / (o.s + o.k) * 100 : 0) + '%'; const c = mk('i', null, 'k'); c.style.width = (o.s + o.k ? o.k / (o.s + o.k) * 100 : 0) + '%'; b.append(a, c); bc.append(b); }
      tr.append(bc); if (u) clickRow(tr, u); return tr;
    };
    aggU.forEach((o) => tb.append(uline(uname(o.u), o, unit === o.u ? 'on' : '', o.u)));
    const tU = aggU.reduce((a, o) => ({ s: a.s + o.s, k: a.k + o.k }), { s: 0, k: 0 });
    tb.append(uline('Total Sumkal', tU, 'dp-ps-tot'));
    $('gsk-unit').replaceChildren(th, tb);

    // daftar penyulang bulan terpilih
    const sb = $('gsk-bulan'); sb.replaceChildren(...months.map((m) => new Option(BLN[m - 1] + ' 2026', m))); sb.value = String(bm);
    const nBad = new Map(); list.forEach((x) => { if (x.n >= 4 && x.m <= bm) { const id = x.up3 + '|' + x.peny; nBad.set(id, (nBad.get(id) || 0) + 1); } });
    const rowsL = list.filter((x) => x.m === bm && x.n >= 4 && scope(x)).sort((a, b) => b.n - a.n);
    $('gsk-list-h').textContent = `Penyulang kronis dan sakit · ${where} (${fmt(rowsL.length)})`;
    const th2 = mk('thead'), hr2 = mk('tr'); [['Penyulang', ''], ['UP3', ''], ['Kali', 'num'], ['Status', ''], ['Bln ≥4 kali', 'num']].forEach(([h, c]) => hr2.append(mk('th', h, c))); th2.append(hr2);
    const tb2 = mk('tbody');
    if (!rowsL.length) { const tr = mk('tr'); const td = mk('td', 'Tidak ada penyulang sakit atau kronis pada bulan ini.', 'gx-zero'); td.colSpan = 5; tr.append(td); tb2.append(tr); }
    rowsL.forEach((x) => {
      const tr = mk('tr'); const st = mk('td'); st.append(mk('span', x.n >= 10 ? 'Kronis' : 'Sakit', 'gx-pill ' + (x.n >= 10 ? 'k' : 's')));
      const u3 = mk('td'); u3.append(mk('span', x.up3)); if (!unit && x.u) u3.append(mk('small', uname(x.u), 'gx-sub'));
      const nb = nBad.get(x.up3 + '|' + x.peny) || 0; const nbc = mk('td', `${fmt(nb)} dari ${months.filter((m) => m <= bm).length}`, 'num'); nbc.title = `Jumlah bulan Jan–${BLN[bm - 1]} dengan ≥4 kali gangguan permanen`;
      tr.append(mk('td', x.peny), u3, mk('td', fmt(x.n), 'num'), st, nbc);
      tb2.append(tr);
    });
    $('gsk-list').replaceChildren(th2, tb2);
    $('gsk-note').textContent = (hasKode && hasBid ? `Filter ${filterText(P)} ikut berlaku.` : `Data penyulang saat ini belum memuat kolom kode dan bidang, jadi filter Kode dan Bidang di atas belum berlaku di kartu ini (semua kode dan bidang dihitung, termasuk gangguan dari sisi transmisi dan pembangkit). Mulai unggahan file APKT berikutnya, kode dan bidang ikut tersimpan sehingga filter berlaku.`) + ' Klik batang untuk memilih bulan; klik baris unit untuk memilih unit.';
  }

  SSD.onData(() => { const P = dash.params(); try { renderPS(P); } catch (e) { console.error(e); } try { renderSK(P); } catch (e) { console.error(e); } });
})();
