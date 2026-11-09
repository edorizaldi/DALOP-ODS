// Tab Event Padam Penyulang, di bawah Matriks unit × bulan:
// 1) event padam permanen vs sesaat per unit (dataset gangguan_ps, kolom P/S), ikut filter Kode, Bidang dan Unit;
// 2) rekap permanen / sesaat per UID per bulan (kode J, Distribusi, semua jenis padam). Kondisi penyulang ada di penyulang-kondisi.js (tab Database Penyulang).
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
  const C_P = '#B3261E', C_S = '#E8A39C';
  const toggleUnit = (u) => dash.setParams({ g_unit: dash.params().g_unit === u ? null : u });
  const clickRow = (tr, u) => { tr.classList.add('gx-click'); tr.tabIndex = 0; tr.addEventListener('click', () => toggleUnit(u)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') toggleUnit(u); }); };
  $('gps-bulan').addEventListener('change', (e) => dash.setParams({ gps_bulan: e.target.value ? Number(e.target.value) : null }));
  const ctx = { gps: '' };
  $('gps-dl').addEventListener('click', () => window.SSExport({ card: 'gps-card', btn: 'gps-dl', msg: 'gps-msg', preview: 'gps-pv', filename: `Permanen_Sesaat_per_Unit_${ctx.gps.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));

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

  SSD.onData(() => { const P = dash.params(); try { renderRekap(); } catch (e) { console.error(e); } try { renderPS(P); } catch (e) { console.error(e); } });
})();
