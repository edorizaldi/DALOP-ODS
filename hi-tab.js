// Tab Health Index Penyulang (menu Database).
// Sumber: database Event Padam Penyulang saja: per penyulang (peny_bulanan) dan per UP3 (gangguan_up3, untuk UID tiap UP3).
// Kelas per penyulang per bulan dari gangguan kode J bidang Distribusi, jumlah permanen + sesaat (semua jenis padam):
//   kronis >= 6 kali, sakit 2-5 kali, sehat 1 kali, sempurna 0 kali (penyulang yang tercatat di database Event Padam Penyulang tanpa gangguan kode J distribusi bulan itu).
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('hi')) return;
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const UNAME = { ACEH: 'Aceh', SUMUT: 'Sumatera Utara', SUMBAR: 'Sumatera Barat', RKR: 'Riau & Kepri', S2JB: 'S2JB', BABEL: 'Bangka Belitung', LAMPUNG: 'Lampung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra' };
  const ULABEL = { ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID Riau Kepri', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID Kalselteng', KALTIMRA: 'UID Kaltimra' };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const pc = (v) => new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  const uname = (u) => UNAME[u] || u;
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const KAT = [
    { id: 'k', nm: 'Kronis', ket: '≥6 kali', c: '#B3261E', fg: '#fff' },
    { id: 's', nm: 'Sakit', ket: '2–5 kali', c: '#E9A23B', fg: '#2A1A00' },
    { id: 'h', nm: 'Sehat', ket: '1 kali', c: '#9CCB8A', fg: '#1d2a14' },
    { id: 'p', nm: 'Sempurna', ket: '0 kali', c: '#2E7D4F', fg: '#fff' },
  ];
  const KBY = Object.fromEntries(KAT.map((k) => [k.id, k]));
  const katOf = (n) => (n >= 6 ? 'k' : n >= 2 ? 's' : n === 1 ? 'h' : 'p');
  const zero = () => ({ k: 0, s: 0, h: 0, p: 0, t: 0 });

  // ---------- kontrol ----------
  $('hi-f-uid').addEventListener('change', (e) => dash.setParams({ hi_uid: e.target.value || null, hi_up3: null }));
  $('hi-f-up3').addEventListener('change', (e) => dash.setParams({ hi_up3: e.target.value || null }));
  $('hi-f-bulan').addEventListener('change', (e) => dash.setParams({ hi_bulan: e.target.value ? Number(e.target.value) : null }));
  $('hi-f-kat').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) dash.setParams({ hi_kat: b.dataset.v }); });
  let q = '';
  $('hi-search').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); renderList(); });
  const ctx = { name: '' };
  const exp = (id) => $(`hi-${id}-dl`).addEventListener('click', () => window.SSExport({ card: `hi-${id}-card`, btn: `hi-${id}-dl`, msg: `hi-${id}-msg`, preview: `hi-${id}-pv`, filename: `Health_Index_Penyulang_${id}_${ctx.name.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));
  exp('trend'); exp('unit');

  // ---------- indeks data (dibangun ulang hanya bila data berubah) ----------
  let IX = null, srcB = null, srcP = null;
  function build(B, GU) {
    // UP3 -> UID dari database Event Padam Penyulang per UP3 (gangguan_up3); "UID X (UP3 tidak dikenali)" -> X
    const nk = (x) => String(x || '').toUpperCase().replace(/[^A-Z]/g, '');
    const ALIAS = { BELITUNG: 'TANJUNGPANDANBELITUNG', PADANGSIDIMPUAN: 'PADANGSIDEMPUAN' };
    const gu = new Map(); GU.forEach((r) => { if (UORD.includes(r.UNIT)) gu.set(nk(r.UP3), r.UNIT); });
    const uidOf = (u3) => { const m = /^UID\s+(\S+)\s+\(UP3 tidak dikenali\)/i.exec(u3) || /UP3 tidak dikenali \((\S+)\)/i.exec(u3); if (m) return m[1].toUpperCase(); return gu.get(nk(u3)) || gu.get(ALIAS[nk(u3)]) || ''; };
    const u3uid = new Map(); B.forEach((r) => { if (!u3uid.has(r.up3)) u3uid.set(r.up3, uidOf(r.up3)); });
    // penyulang = semua penyulang yang tercatat di database Event Padam Penyulang (semua kode, bidang, jenis padam)
    const F = new Map(); // up3|penyulang -> { u, u3, peny, mo: { m: [p, s] } }
    B.forEach((r) => {
      const id = r.up3 + '\u0001' + r.penyulang; let f = F.get(id);
      if (!f) { f = { u: u3uid.get(r.up3) || '', u3: r.up3, peny: r.penyulang, mo: {} }; F.set(id, f); }
      if (r.kode !== 'J' || r.bidang !== 'DISTRIBUSI' || (r.ps !== 'Permanen' && r.ps !== 'Sesaat')) return;
      const m = +r.bulan; const o = f.mo[m] || (f.mo[m] = [0, 0]); o[r.ps === 'Permanen' ? 0 : 1] += Number(r.kali);
    });
    const feeders = [...F.values()].filter((f) => UORD.includes(f.u));
    const months = [...new Set(B.map((r) => +r.bulan))].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
    // unit yang punya data penyulang pada bulan itu; tanpa data, penyulangnya tidak diberi kelas
    const ada = new Set(B.map((r) => +r.bulan + '|' + (u3uid.get(r.up3) || '')));
    const up3ByU = {}; feeders.forEach((f) => { (up3ByU[f.u] || (up3ByU[f.u] = new Set())).add(f.u3); });
    return { feeders, months, ada, up3ByU };
  }
  // kelas penyulang f pada bulan m: 'k' | 's' | 'h' | 'p' | null (tidak dihitung)
  const kat = (f, m) => {
    if (!IX.ada.has(m + '|' + f.u)) return null;
    const o = f.mo[m]; const n = o ? o[0] + o[1] : 0;
    return katOf(n);
  };
  const count = (list, m) => { const o = zero(); list.forEach((f) => { const k = kat(f, m); if (k) { o[k]++; o.t++; } }); return o; };

  let S = null; // keadaan render terakhir untuk daftar penyulang
  function render() {
    const B = SSD.data('peny_bulanan'), GU = SSD.data('gangguan_up3');
    if (B.status !== 'ok' || GU.status !== 'ok') return;
    if (srcB !== B.data || srcP !== GU.data) { srcB = B.data; srcP = GU.data; IX = build(B.data, GU.data); }
    const P = dash.params();
    const { feeders, months } = IX;
    if (!months.length) return;
    let uid = UORD.includes(P.hi_uid) ? P.hi_uid : null;
    const allUp3 = [...new Set(feeders.filter((f) => !uid || f.u === uid).map((f) => f.u3))].sort();
    const up3 = allUp3.includes(P.hi_up3) ? P.hi_up3 : null;
    if (up3 && !uid) uid = (feeders.find((f) => f.u3 === up3) || {}).u || null;
    const bm = months.includes(Number(P.hi_bulan)) ? Number(P.hi_bulan) : months[months.length - 1];
    const prevM = months[months.indexOf(bm) - 1];
    const inScope = (f) => (!uid || f.u === uid) && (!up3 || f.u3 === up3);
    const scoped = feeders.filter(inScope);
    const where = up3 ? `UP3 ${up3}` : uid ? ULABEL[uid] : 'Sumkal';
    ctx.name = `${up3 || (uid ? uid : 'Sumkal')}_${BLN[bm - 1]}_2026`;

    // kontrol
    const su = $('hi-f-uid'); if (!su.options.length) su.replaceChildren(new Option('Semua UID', ''), ...UORD.map((u) => new Option(ULABEL[u], u)));
    su.value = uid || '';
    const up3List = [...new Set(feeders.filter((f) => !uid || f.u === uid).map((f) => f.u3))].sort();
    $('hi-f-up3').replaceChildren(new Option('Semua UP3', ''), ...up3List.map((u) => new Option(u, u))); $('hi-f-up3').value = up3 || '';
    $('hi-f-bulan').replaceChildren(...months.map((m) => new Option(BLN[m - 1] + ' 2026', m)).reverse()); $('hi-f-bulan').value = String(bm);

    const ser = months.map((m) => ({ m, ...count(scoped, m) }));
    const cur = ser.find((d) => d.m === bm), prv = prevM ? ser.find((d) => d.m === prevM) : null;

    // ringkasan
    {
      const tk = $('hi-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const Bb = (t) => mk('b', t);
      tk.append(`${BLN[bm - 1]} 2026, ${where}: dari `, Bb(`${fmt(cur.t)} penyulang`), ' terdapat ', Bb(`${fmt(cur.k)} kronis (${pc(cur.t ? cur.k / cur.t : 0)})`), ', ', Bb(`${fmt(cur.s)} sakit`), ', ', Bb(`${fmt(cur.h)} sehat`), ' dan ', Bb(`${fmt(cur.p)} sempurna`), '. ');
      if (prv) { const d = cur.k - prv.k; tk.append(`Kronis ${d > 0 ? 'naik' : d < 0 ? 'turun' : 'tetap'} `, Bb(d ? `${fmt(Math.abs(d))} penyulang` : ''), ` dibanding ${BLN[prevM - 1]}. `); }
      if (!up3) {
        const grp = uid ? [...(IX.up3ByU[uid] || [])].map((u3) => [u3, count(scoped.filter((f) => f.u3 === u3), bm)]) : UORD.map((u) => [u, count(scoped.filter((f) => f.u === u), bm)]);
        const top = grp.filter(([, o]) => o.t).sort((a, b) => b[1].k - a[1].k)[0];
        if (top && top[1].k) tk.append(`Kronis terbanyak di ${uid ? 'UP3 ' + top[0] : uname(top[0])} `, Bb(`${fmt(top[1].k)} penyulang`), '.');
      }
    }

    // kotak angka
    KAT.forEach((k) => {
      const el = $(`hi-t-${k.id}`); el.classList.remove('dash-skeleton'); el.textContent = fmt(cur[k.id]);
      const sub = $(`hi-t-${k.id}-sub`); sub.replaceChildren(`${pc(cur.t ? cur[k.id] / cur.t : 0)} dari ${fmt(cur.t)} penyulang`);
      if (prv) {
        const d = cur[k.id] - prv[k.id]; const bad = k.id === 'k' || k.id === 's' ? d > 0 : d < 0;
        sub.append(' · ', mk('span', `${d > 0 ? '▲ +' : d < 0 ? '▼ −' : ''}${fmt(Math.abs(d))} vs ${BS[prevM - 1]}`, 'hi-chg ' + (d === 0 ? 'flat' : bad ? 'ss-bad' : 'ss-ok')));
      }
    });

    // peta: titik UP3 = jumlah penyulang kronis, wilayah UID = porsi kronis
    if (window.SSMAP) {
      const KO = SSD.data('koordinat');
      const nk = (s) => String(s || '').toUpperCase().replace(/^UP3\s+/, '').replace(/[^A-Z]/g, '');
      const ALIAS = { PADANGSIDIMPUAN: 'PADANGSIDEMPUAN', BELITUNG: 'TANJUNGPANDANBELITUNG' };
      const kIdx = new Map(); if (KO.status === 'ok') KO.data.filter((k) => k.level === 'UP3').forEach((k) => { kIdx.set(nk(k.nama), k); kIdx.set(nk(k.unit), k); });
      const findK = (u) => kIdx.get(nk(u)) || kIdx.get(ALIAS[nk(u)]);
      const byU3 = new Map(); feeders.forEach((f) => { if (uid && f.u !== uid) return; const k = kat(f, bm); if (!k) return; const o = byU3.get(f.u3) || { u: f.u, ...zero() }; o[k]++; o.t++; byU3.set(f.u3, o); });
      const shown = [...byU3].filter(([u3]) => findK(u3));
      const mx = Math.max(1, ...shown.map(([, o]) => o.k));
      const topK = shown.slice().sort((a, b) => b[1].k - a[1].k)[0];
      const uidO = {}; feeders.forEach((f) => { const k = kat(f, bm); if (!k) return; const o = uidO[f.u] || (uidO[f.u] = zero()); o[k]++; o.t++; });
      const share = (r) => (uidO[r] && uidO[r].t ? uidO[r].k / uidO[r].t : 0); const smx = Math.max(0.01, ...UORD.map(share));
      const pts = shown.map(([u3, o]) => { const k = findK(u3); return { lon: k.lon, lat: k.lat, r: 3 + 9 * Math.sqrt(o.k / mx), color: '#B3261E', label: u3, selected: u3 === up3, pulse: !!topK && topK[0] === u3 && o.k > 0, pulseColor: 'var(--cds-chart-status-critical)', tip: ['UP3 ' + u3, [[null, 'Kronis', fmt(o.k)], [null, 'Sakit', fmt(o.s)], [null, 'Sehat', fmt(o.h)], [null, 'Sempurna', fmt(o.p)], [null, 'Porsi kronis', pc(o.t ? o.k / o.t : 0)]]], onClick: () => dash.setParams({ hi_uid: o.u, hi_up3: up3 === u3 ? null : u3 }) }; });
      window.SSMAP($('hi-map'), { label: 'Peta health index penyulang', focus: uid, fill: (r) => `color-mix(in srgb, #B3261E ${Math.round(4 + 34 * (share(r) / smx))}%, var(--color-panel))`, regionTip: (r, prov) => [ULABEL[r] || r, [[null, prov, ''], [null, 'Kronis', fmt((uidO[r] || {}).k || 0)], [null, 'Porsi kronis', pc(share(r))]]], onRegion: (r) => dash.setParams({ hi_uid: uid === r ? null : r, hi_up3: null }), points: pts });
      $('hi-map-note').textContent = `${BLN[bm - 1]} 2026. Ukuran titik: jumlah penyulang kronis per UP3; warna wilayah: porsi penyulang kronis per UID.` + (topK && topK[1].k ? ` Titik berdenyut: UP3 ${topK[0]} (${fmt(topK[1].k)} kronis).` : '') + ' Klik titik untuk memilih UP3, klik wilayah untuk memilih UID.';
    }

    // grafik bertumpuk per bulan
    {
      $('hi-trend-h').textContent = `Health index penyulang per bulan · ${where}`;
      $('hi-legend').replaceChildren(...KAT.map((k) => { const sp = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = k.c; sp.append(i, `${k.nm} (${k.ket})`); return sp; }));
      const kosong = months.map((m) => [m, UORD.filter((u) => (!uid || u === uid) && !IX.ada.has(m + '|' + u))]).filter(([, l]) => l.length);
      $('hi-trend-sel').textContent = 'Klik batang untuk memilih bulan.' + (kosong.length ? ' Belum ada data penyulang: ' + kosong.map(([m, l]) => `${BS[m - 1]} (${l.map(uname).join(', ')})`).join('; ') + '.' : '');
      const ch = $('hi-chart'); ch.classList.remove('dash-skeleton'); ch.replaceChildren();
      const W = Math.max(320, ch.clientWidth || 900), H = 300, mg = { t: 12, r: 8, b: 26, l: 44 };
      const svg = d3.select(ch).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `Health index penyulang per bulan, ${where}`);
      const y = d3.scaleLinear([0, (d3.max(ser, (d) => d.t) || 1) * 1.04], [H - mg.b, mg.t]).nice();
      const x = d3.scaleBand(months, [mg.l, W - mg.r]).padding(0.28);
      y.ticks(5).forEach((t) => {
        svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--cds-chart-grid)');
        svg.append('text').attr('x', mg.l - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt(t));
      });
      const bw = Math.min(x.bandwidth(), 60), off = (x.bandwidth() - bw) / 2;
      ser.forEach((d) => {
        const g = svg.append('g').style('cursor', 'pointer').on('click', () => dash.setParams({ hi_bulan: d.m }));
        let acc = 0;
        KAT.forEach((k) => {
          const v = d[k.id]; const y0 = y(acc), y1 = y(acc + v); acc += v;
          g.append('rect').attr('x', x(d.m) + off).attr('width', bw).attr('y', y1).attr('height', Math.max(0, y0 - y1)).attr('fill', k.c).attr('opacity', d.m === bm ? 1 : 0.72);
          if (y0 - y1 >= 13 && bw >= 26) g.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', (y0 + y1) / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').style('font-size', '10.5px').style('font-weight', 600).attr('fill', k.fg).text(fmt(v));
        });
        g.append('title').text(`${BLN[d.m - 1]} 2026 · ` + KAT.map((k) => `${k.nm.toLowerCase()} ${fmt(d[k.id])}`).join(', ') + ` (total ${fmt(d.t)})`);
        svg.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', d.m === bm ? 'var(--color-fg)' : 'var(--color-fg-muted)').style('font-weight', d.m === bm ? 600 : 400).style('font-size', 'var(--cds-font-size-caption)').text(BS[d.m - 1]);
      });
    }

    // tabel per UID (atau per UP3 di UID terpilih)
    {
      const byUp3 = !!uid;
      $('hi-unit-h').textContent = byUp3 ? `Health index per UP3 · ${ULABEL[uid]} · ${BLN[bm - 1]} 2026` : `Health index per UID · ${BLN[bm - 1]} 2026`;
      const keys = byUp3 ? [...(IX.up3ByU[uid] || [])].sort() : UORD;
      const rows = keys.map((k) => ({ key: k, ...count(feeders.filter((f) => (byUp3 ? f.u === uid && f.u3 === k : f.u === k)), bm) })).filter((o) => o.t).sort((a, b) => (b.k / b.t) - (a.k / a.t) || b.k - a.k);
      const th = mk('thead'), hr = mk('tr');
      [[byUp3 ? 'UP3' : 'UID', ''], ...KAT.map((k) => [k.nm, 'num']), ['Total', 'num'], ['% kronis', 'num'], ['Komposisi', '']].forEach(([h, c], i) => { const t = mk('th', h, c); if (i >= 1 && i <= 4) t.style.boxShadow = `inset 0 3px 0 ${KAT[i - 1].c}`; hr.append(t); });
      th.append(hr);
      const tb = mk('tbody');
      const line = (name, o, cls, onPick) => {
        const tr = mk('tr', null, cls || ''); tr.append(mk('td', name));
        KAT.forEach((k) => tr.append(mk('td', fmt(o[k.id]), 'num' + (o[k.id] ? '' : ' gx-zero'))));
        tr.append(mk('td', fmt(o.t), 'num'), mk('td', pc(o.t ? o.k / o.t : 0), 'num hi-pk'));
        const bc = mk('td'); if (o.t) { const b = mk('div', null, 'gx-mini gx-mini4 hi-bar'); KAT.forEach((k) => { const i = mk('i'); i.style.background = k.c; i.style.width = (o[k.id] / o.t * 100) + '%'; b.append(i); }); bc.append(b); }
        tr.append(bc);
        if (onPick) { tr.classList.add('gx-click'); tr.tabIndex = 0; tr.addEventListener('click', onPick); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') onPick(); }); }
        return tr;
      };
      rows.forEach((o) => tb.append(line(byUp3 ? o.key : ULABEL[o.key], o, (byUp3 ? up3 : uid) === o.key ? 'on' : '', () => dash.setParams(byUp3 ? { hi_up3: up3 === o.key ? null : o.key } : { hi_uid: o.key, hi_up3: null }))));
      const tot = rows.reduce((a, o) => { KAT.forEach((k) => { a[k.id] += o[k.id]; }); a.t += o.t; return a; }, zero());
      tb.append(line(byUp3 ? `Total ${ULABEL[uid]}` : 'Total Sumkal', tot, 'dp-ps-tot', byUp3 ? () => dash.setParams({ hi_uid: null, hi_up3: null }) : null));
      $('hi-unit').replaceChildren(th, tb);
      $('hi-unit-note').textContent = `Diurutkan dari porsi penyulang kronis terbesar. Klik baris untuk memilih ${byUp3 ? 'UP3' : 'UID'}${byUp3 ? '; klik baris total untuk kembali ke semua UID' : ''}.`;
    }

    S = { scoped, bm, where, uid, months, katSel: ['k', 's', 'h', 'p', 'ks'].includes(P.hi_kat) ? P.hi_kat : 'ks' };
    renderList();
    $('hi-note').textContent = 'Sumber: database Event Padam Penyulang saja (gangguan per penyulang dari APKT); tidak memakai Database Penyulang. Penyulang yang dihitung = semua penyulang yang pernah tercatat di database Event Padam Penyulang 2026. Kelas per penyulang per bulan dari gangguan kode J bidang Distribusi, jumlah permanen + sesaat, semua jenis padam: kronis ≥ 6 kali, sakit 2–5 kali, sehat 1 kali, sempurna tanpa gangguan kode J distribusi pada bulan itu. UP3 mengikuti nama UP3 di database Event Padam Penyulang (termasuk "UP3 tidak dikenali"). Unit yang belum punya data penyulang pada suatu bulan tidak diberi kelas di bulan itu.';
  }

  // daftar penyulang dengan riwayat kelas per bulan
  function renderList() {
    if (!S) return;
    const { scoped, bm, where, uid, months, katSel } = S;
    const opts = [['ks', 'Kronis + sakit'], ['k', 'Kronis'], ['s', 'Sakit'], ['h', 'Sehat'], ['p', 'Sempurna']];
    $('hi-f-kat').replaceChildren(...opts.map(([v, l]) => { const b = mk('button', l, 'ss-chip'); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String(v === katSel)); return b; }));
    const want = katSel === 'ks' ? ['k', 's'] : [katSel];
    let rows = scoped.map((f) => ({ f, k: kat(f, bm), o: f.mo[bm] || [0, 0] })).filter((r) => r.k && want.includes(r.k));
    if (q) rows = rows.filter((r) => r.f.peny.toLowerCase().includes(q) || r.f.u3.toLowerCase().includes(q));
    rows.sort((a, b) => (b.o[0] + b.o[1]) - (a.o[0] + a.o[1]) || b.o[0] - a.o[0] || a.f.peny.localeCompare(b.f.peny));
    const label = opts.find(([v]) => v === katSel)[1].toLowerCase();
    $('hi-list-h').textContent = `Penyulang ${label} · ${where} · ${BLN[bm - 1]} 2026 (${fmt(rows.length)})`;
    const upto = months.filter((m) => m <= bm);
    $('hi-list-note').textContent = `Riwayat: kelas penyulang per bulan Jan–${BS[bm - 1]} (angka = kali gangguan permanen + sesaat). Bln kronis = jumlah bulan berstatus kronis.`;
    const th = mk('thead'), hr = mk('tr');
    [['Penyulang', ''], ['UP3', 'hi-u3'], ['P', 'num'], ['S', 'num'], ['Total', 'num'], ['Kelas', ''], ...upto.map((m) => [BS[m - 1], 'hi-mh']), ['Bln kronis', 'num']].forEach(([h, c]) => hr.append(mk('th', h, c)));
    th.append(hr);
    const tb = mk('tbody'); const MAX = 500;
    if (!rows.length) { const tr = mk('tr'); const td = mk('td', 'Tidak ada penyulang pada pilihan ini.', 'gx-zero'); td.colSpan = 7 + upto.length; tr.append(td); tb.append(tr); }
    rows.slice(0, MAX).forEach(({ f, k, o }) => {
      const tr = mk('tr');
      const u3 = mk('td', null, 'hi-u3'); u3.append(mk('span', f.u3)); if (!uid) u3.append(mk('small', uname(f.u), 'gx-sub'));
      const kc = mk('td'); const pill = mk('span', KBY[k].nm, 'hi-pill'); pill.style.background = KBY[k].c; pill.style.color = KBY[k].fg; kc.append(pill);
      tr.append(mk('td', f.peny, 'hi-nm'), u3, mk('td', fmt(o[0]), 'num' + (o[0] ? '' : ' gx-zero')), mk('td', fmt(o[1]), 'num' + (o[1] ? '' : ' gx-zero')), mk('td', fmt(o[0] + o[1]), 'num'), kc);
      let nK = 0;
      upto.forEach((m) => {
        const km = kat(f, m); const mo = f.mo[m]; const n = mo ? mo[0] + mo[1] : 0; if (km === 'k') nK++;
        const td = mk('td', null, 'hi-mc'); const c = mk('span', km ? (n ? fmt(n) : '') : '–', 'hi-cell' + (km ? '' : ' na'));
        if (km) { c.style.background = KBY[km].c; c.style.color = KBY[km].fg; }
        c.title = `${BLN[m - 1]}: ${km ? KBY[km].nm.toLowerCase() + (mo ? ` (${fmt(mo[0])} permanen, ${fmt(mo[1])} sesaat)` : '') : 'belum ada data'}`;
        if (m === bm) td.classList.add('cur'); td.append(c); tr.append(td);
      });
      tr.append(mk('td', `${fmt(nK)} dari ${upto.length}`, 'num'));
      tb.append(tr);
    });
    if (rows.length > MAX) { const tr = mk('tr'); const td = mk('td', `Menampilkan ${fmt(MAX)} dari ${fmt(rows.length)} penyulang. Pilih UID/UP3 atau cari nama penyulang untuk mempersempit.`, 'gx-zero'); td.colSpan = 7 + upto.length; tr.append(td); tb.append(tr); }
    $('hi-list').replaceChildren(th, tb);
  }

  SSD.onData(() => { try { render(); } catch (e) { console.error(e); } });
})();
