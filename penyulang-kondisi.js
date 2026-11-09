// Tab Database Penyulang: kondisi penyulang per bulan (kronis, sakit, sehat, sempurna)
// dari gangguan kode J bidang Distribusi (permanen + sesaat) per penyulang (peny_bulanan) dan populasi penyulang (peny_profil).
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('gsk-card')) return;
  const UNAME = { ACEH: 'Aceh', BABEL: 'Bangka Belitung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra', LAMPUNG: 'Lampung', RKR: 'Riau & Kepri', S2JB: 'S2JB', SUMBAR: 'Sumatera Barat', SUMUT: 'Sumatera Utara' };
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID');
  const fmt = (v) => nf.format(Math.round(v));
  const uname = (u) => UNAME[u] || u;
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const C_SAKIT = '#E9A23B', C_KRONIS = '#B3261E';
  // klik baris unit: pilih / lepas UID di filter tab Database Penyulang
  const toggleUnit = (u, isUp3) => dash.setParams(isUp3 ? { p_up3: u, p_peny: null } : { p_uid: dash.params().p_uid === u ? null : u, p_up3: null, p_peny: null });
  const clickRow = (tr, u, isUp3) => { tr.classList.add('gx-click'); tr.tabIndex = 0; tr.addEventListener('click', () => toggleUnit(u, isUp3)); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') toggleUnit(u, isUp3); }); };
  $('gsk-bulan').addEventListener('change', (e) => dash.setParams({ gsk_bulan: e.target.value ? Number(e.target.value) : null }));
  const ctx = { gsk: '' };
  $('gsk-dl').addEventListener('click', () => window.SSExport({ card: 'gsk-card', btn: 'gsk-dl', msg: 'gsk-msg', preview: 'gsk-pv', filename: `Kondisi_Penyulang_${ctx.gsk.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));

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
    const pop = new Map(); PR.data.forEach((r) => { if (r.di_database !== 'Ya' || /inactive|not ready/i.test(r.status || '')) return; const u = r.uid || u3uid.get(r.up3) || ''; if (UORD.includes(u)) pop.set(r.up3 + '\u0001' + r.penyulang, { u, u3: r.up3 }); });
    // filter tab Database Penyulang: UID, UP3 (yang tampil di pilihan UP3) dan jenis padam
    const jenis = P.p_jenis || null;
    const up3Sel = ($('p-f-up3') && $('p-f-up3').value) || P.p_up3 || null;
    const unit = UORD.includes(P.p_uid) ? P.p_uid : null;
    const uidSel = unit || (up3Sel && u3uid.get(up3Sel)) || null;
    const where = up3Sel ? `UP3 ${up3Sel}${uidSel ? ' (' + uname(uidSel) + ')' : ''}` : unit ? uname(unit) : 'Sumkal';
    const jTxt = jenis ? `jenis padam ${jenis}` : 'semua jenis padam';
    // gangguan kode J, bidang Distribusi, permanen + sesaat per penyulang per bulan
    const cnt = new Map();
    B.data.forEach((r) => {
      if (r.kode !== 'J' || r.bidang !== 'DISTRIBUSI' || (r.ps !== 'Permanen' && r.ps !== 'Sesaat')) return;
      if (jenis && r.jenis_padam !== jenis) return;
      const k = r.up3 + '\u0001' + r.penyulang + '\u0001' + r.bulan; const o = cnt.get(k) || { p: 0, s: 0 }; o[r.ps === 'Permanen' ? 'p' : 's'] += Number(r.kali); cnt.set(k, o);
    });
    const list = [...cnt].map(([k, o]) => { const [up3, peny, m] = k.split('\u0001'); return { up3, peny, m: +m, p: o.p, s: o.s, n: o.p + o.s, u: u3uid.get(up3) || '' }; });
    const months = [...new Set(B.data.map((r) => +r.bulan))].sort((a, b) => a - b);
    // unit yang punya data penyulang pada bulan itu; tanpa data, penyulangnya tidak dihitung sempurna
    const ada = new Set(B.data.map((r) => +r.bulan + '|' + (u3uid.get(r.up3) || '')));
    const inU = (u) => !uidSel || u === uidSel;
    const inS = (x) => (up3Sel ? x.up3 === up3Sel : inU(x.u));
    // jumlah per kategori untuk bulan m, dibatasi f = { u: UID, u3: UP3 } (opsional)
    const agg = (m, f) => {
      const o = { k: 0, s: 0, h: 0, p: 0 }; const hit = new Set();
      list.forEach((x) => { if (x.m !== m || !UORD.includes(x.u) || (f.u && x.u !== f.u) || (f.u3 && x.up3 !== f.u3) || !x.n) return; o[katOf(x.n)]++; hit.add(x.up3 + '\u0001' + x.peny); });
      pop.forEach((pp, id) => { if ((!f.u || pp.u === f.u) && (!f.u3 || pp.u3 === f.u3) && ada.has(m + '|' + pp.u) && !hit.has(id)) o.p++; });
      o.t = o.k + o.s + o.h + o.p; return o;
    };
    const F = { u: uidSel, u3: up3Sel };
    // jenis padam Pemeliharaan / Bencana: kondisi penyulang hanya dihitung dari gangguan, jadi kosong
    if (jenis && jenis !== 'Gangguan') {
      ch.replaceChildren(mk('div', `Tidak ada data untuk ${jTxt}. Kondisi penyulang dihitung dari jenis padam Gangguan (atau Semua).`, 'gx-zero gsk-empty'));
      $('gsk-sel').replaceChildren('Pilihan: ', mk('b', where), ` · ${jTxt}: tidak ada data.`); $('gsk-legend').replaceChildren();
      $('gsk-unit-h').textContent = 'Per UP3'; $('gsk-unit').replaceChildren(); $('gsk-list-h').textContent = 'Penyulang kronis dan sakit'; $('gsk-list').replaceChildren(); $('gsk-bulan').replaceChildren(); $('gsk-bulan').hidden = true;
      $('gsk-note').textContent = 'Kartu ini mengikuti filter UID, UP3 dan jenis padam di atas. Pilih jenis padam Semua atau Gangguan untuk melihat kondisi penyulang.';
      ctx.gsk = where; return;
    }
    const ser = months.map((m) => ({ m, ...agg(m, F) }));
    const bm = months.includes(Number(P.gsk_bulan)) ? Number(P.gsk_bulan) : months[months.length - 1];
    ctx.gsk = `${where}_${BLN[bm - 1]}_2026`;
    const last = ser.find((d) => d.m === bm) || { k: 0, s: 0, h: 0, p: 0, t: 0 };
    const peakK = ser.slice().sort((a, b) => b.k - a.k)[0];
    $('gsk-sel').replaceChildren('Pilihan: ', mk('b', where), ` · ${jTxt} · ${BLN[bm - 1]} 2026 dari ${fmt(last.t)} penyulang: `,
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

    // per UP3 di UID terpilih (atau per UID bila belum ada UID), bulan terpilih
    const byUp3 = !!uidSel;
    $('gsk-unit-h').textContent = byUp3 ? `Per UP3 · ${uname(uidSel)} · ${BLN[bm - 1]} 2026` : `Per unit · ${BLN[bm - 1]} 2026`;
    const keys = byUp3 ? [...new Set([...[...pop.values()].filter((pp) => pp.u === uidSel).map((pp) => pp.u3), ...list.filter((x) => x.u === uidSel).map((x) => x.up3)])].sort()
      : UORD.filter((u) => list.some((x) => x.u === u) || [...pop.values()].some((pp) => pp.u === u));
    const aggU = keys.map((u) => ({ u, ...agg(bm, byUp3 ? { u: uidSel, u3: u } : { u }) })).sort((a, b) => (b.k - a.k) || (b.s - a.s));
    const th = mk('thead'), hr = mk('tr'); [[byUp3 ? 'UP3' : 'Unit', ''], ...KAT.map((k) => [k.nm, 'num']), ['Total', 'num'], ['', '']].forEach(([h, c]) => hr.append(mk('th', h, c))); th.append(hr);
    const tb = mk('tbody');
    const uline = (name, o, cls, u) => {
      const tr = mk('tr', null, cls || ''); tr.append(mk('td', name));
      KAT.forEach((k) => tr.append(mk('td', fmt(o[k.id]), 'num' + (o[k.id] ? '' : ' gx-zero'))));
      tr.append(mk('td', fmt(o.t), 'num'));
      const bc = mk('td'); if (u && o.t) { const b = mk('div', null, 'gx-mini gx-mini4'); KAT.forEach((k) => { const i = mk('i'); i.style.background = k.c; i.style.width = (o[k.id] / o.t * 100) + '%'; b.append(i); }); bc.append(b); }
      tr.append(bc); if (u) clickRow(tr, u, byUp3); return tr;
    };
    aggU.forEach((o) => tb.append(uline(byUp3 ? o.u : uname(o.u), o, (byUp3 ? up3Sel : unit) === o.u ? 'on' : '', o.u)));
    const tU = aggU.reduce((a, o) => { KAT.forEach((k) => { a[k.id] += o[k.id]; }); a.t += o.t; return a; }, { k: 0, s: 0, h: 0, p: 0, t: 0 });
    tb.append(uline(byUp3 ? `Total ${uname(uidSel)}` : 'Total Sumkal', tU, 'dp-ps-tot'));
    $('gsk-unit').replaceChildren(th, tb);

    // daftar penyulang kronis dan sakit bulan terpilih
    const sb = $('gsk-bulan'); sb.hidden = false; sb.replaceChildren(...months.map((m) => new Option(BLN[m - 1] + ' 2026', m))); sb.value = String(bm);
    const nKr = new Map(); list.forEach((x) => { if (x.n >= 6 && x.m <= bm) { const id = x.up3 + '|' + x.peny; nKr.set(id, (nKr.get(id) || 0) + 1); } });
    const rowsL = list.filter((x) => x.m === bm && x.n >= 2 && UORD.includes(x.u) && inS(x)).sort((a, b) => b.n - a.n || b.p - a.p);
    $('gsk-list-h').textContent = `Penyulang kronis dan sakit · ${where} (${fmt(rowsL.length)})`;
    const th2 = mk('thead'), hr2 = mk('tr'); [['Penyulang', ''], ['UP3', ''], ['P', 'num'], ['S', 'num'], ['Total', 'num'], ['Status', ''], ['Bln kronis', 'num']].forEach(([h, c]) => hr2.append(mk('th', h, c))); th2.append(hr2);
    const tb2 = mk('tbody');
    if (!rowsL.length) { const tr = mk('tr'); const td = mk('td', 'Tidak ada penyulang kronis atau sakit pada bulan ini.', 'gx-zero'); td.colSpan = 7; tr.append(td); tb2.append(tr); }
    rowsL.forEach((x) => {
      const kr = x.n >= 6; const tr = mk('tr'); const st = mk('td'); st.append(mk('span', kr ? 'Kronis' : 'Sakit', 'gx-pill ' + (kr ? 'k' : 's')));
      const u3 = mk('td'); u3.append(mk('span', x.up3)); if (!uidSel && x.u) u3.append(mk('small', uname(x.u), 'gx-sub'));
      const nb = nKr.get(x.up3 + '|' + x.peny) || 0; const nbc = mk('td', `${fmt(nb)} dari ${months.filter((m) => m <= bm).length}`, 'num'); nbc.title = `Jumlah bulan Jan–${BLN[bm - 1]} dengan ≥6 kali gangguan (permanen + sesaat)`;
      tr.append(mk('td', x.peny), u3, mk('td', fmt(x.p), 'num' + (x.p ? '' : ' gx-zero')), mk('td', fmt(x.s), 'num' + (x.s ? '' : ' gx-zero')), mk('td', fmt(x.n), 'num'), st, nbc);
      tb2.append(tr);
    });
    $('gsk-list').replaceChildren(th2, tb2);
    $('gsk-note').textContent = 'Dihitung dari gangguan kode J bidang Distribusi (permanen + sesaat) per penyulang per bulan; mengikuti filter UID, UP3 dan jenis padam di atas (grafik dan daftar penyulang untuk UP3 terpilih, tabel per UP3 untuk UID-nya). P = permanen, S = sesaat. Sempurna = penyulang di database (selain status Inactive / Not Ready) tanpa gangguan kode J distribusi pada bulan itu. Klik batang untuk memilih bulan; klik baris UP3 untuk memilih UP3.';
  }

  SSD.onData(() => { try { renderSK(dash.params()); } catch (e) { console.error(e); } });
})();
