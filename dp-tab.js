// Tab Dupont Gangguan: pohon kode J (No. Laporan unik) Bidang → Jenis padam → Fasilitas → Sub fasilitas → Equipment → Cause.
(() => {
  const $ = (id) => document.getElementById(id);
  const UNAME = { ACEH: 'Aceh', BABEL: 'Bangka Belitung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra', LAMPUNG: 'Lampung', RKR: 'Riau & Kepri', S2JB: 'S2JB', SUMBAR: 'Sumatera Barat', SUMUT: 'Sumatera Utara' };
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const LV = [
    { f: 'BIDANG', name: 'Bidang' }, { f: 'JENIS_PADAM', name: 'Jenis padam' }, { f: 'FASILITAS', name: 'Fasilitas' },
    { f: 'SUB_FASILITAS', name: 'Sub fasilitas' }, { f: 'EQUIPMENT', name: 'Equipment' }, { f: 'CAUSE', name: 'Cause' },
  ];
  const ICON = [
    '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
    '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17h.01"/>',
    '<path d="M12 3v18M7 21h10M8 7h8M6 11h12M9 3l-3 18M15 3l3 18"/>',
    '<path d="M3 7c4 0 4 4 9 4s5-4 9-4M3 17c4 0 4-4 9-4s5 4 9 4"/>',
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  ];

  // Gambar per cause (garis, 24×24) — dipilih dari kata kunci nama cause
  const CAUSE_ICON = [
    [/investigasi/i, '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/><path d="M8 10.5h5M10.5 8v5"/>'],
    [/benda asing/i, '<path d="M12 3 5 20h14z"/><path d="M8.2 13h7.6M6.8 16.5h10.4"/><path d="M3 20h18"/>'],
    [/pohon/i, '<path d="M12 21v-6"/><path d="M12 3c-3 0-5 2.3-5 4.8-1.7.6-2.8 2-2.8 3.8C4.2 14 6.2 16 8.6 16h6.8c2.4 0 4.4-2 4.4-4.4 0-1.8-1.1-3.2-2.8-3.8C17 5.3 15 3 12 3z"/>'],
    [/binatang/i, '<circle cx="6.5" cy="9" r="1.8"/><circle cx="10" cy="5.5" r="1.8"/><circle cx="14" cy="5.5" r="1.8"/><circle cx="17.5" cy="9" r="1.8"/><path d="M12 11c-3 0-5.5 3.5-5.5 6 0 1.8 1.4 2.5 2.8 2.5 1 0 1.7-.6 2.7-.6s1.7.6 2.7.6c1.4 0 2.8-.7 2.8-2.5 0-2.5-2.5-6-5.5-6z"/>'],
    [/layangan|kawat/i, '<path d="M12 2 19 9l-7 9-7-9z"/><path d="M5 9h14M12 2v16"/><path d="M12 18c-1 2 1 2.5 0 4"/>'],
    [/umbul|baliho|reklame|terpal|penjor/i, '<path d="M5 22V3"/><path d="M5 4h13l-3 4 3 4H5"/>'],
    [/petir|flashover|discharge/i, '<path d="M13 2 4 14h7l-1 8 10-13h-7z"/>'],
    [/lifetime|korosi|isolasi|bocor/i, '<path d="M6 2h12M6 22h12M7 2c0 5 5 6 5 10s-5 5-5 10M17 2c0 5-5 6-5 10s5 5 5 10"/>'],
    [/longsor|gempa/i, '<path d="M2 20h20L14 8l-3 4-2-2z"/><circle cx="17" cy="16" r="1.4"/><circle cx="13.5" cy="17.5" r="1"/>'],
    [/banjir/i, '<path d="M2 15c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M12 3s-4 4.5-4 7a4 4 0 0 0 8 0c0-2.5-4-7-4-7z"/>'],
    [/kebakaran/i, '<path d="M12 22c4 0 7-2.7 7-6.6 0-3.6-2.6-5.6-3.7-8.4-.8 1.7-1.8 2.6-3 3C12.3 7 11 4.2 8.6 2.5 8.8 6.6 5 8.6 5 13.6 5 18.9 8.2 22 12 22z"/>'],
    [/kendaraan/i, '<path d="M3 16v-4l2.5-5h13L21 12v4z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 12h14"/>'],
    [/vandal|pihak ketiga|konstruksi/i, '<path d="m14.5 6.5 3 3L8 19l-4 1 1-4z"/><path d="m16 5 2-2 3 3-2 2"/>'],
    [/kesalahan|koordinasi|proteksi|procedure|pemasangan|sambungan|overload|peralatan/i, '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22M4.9 4.9l2.5 2.5M16.6 16.6l2.5 2.5M4.9 19.1l2.5-2.5M16.6 7.4l2.5-2.5"/>'],
    [/tidak diketahui|^$/i, '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 3.8M12 17h.01"/>'],
  ];
  const causeIcon = (c) => (CAUSE_ICON.find(([re]) => re.test(c || '')) || [null, '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>'])[1];
  const svgIcon = (p) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = p; return s; };
  const ROOTICON = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
  const MAXN = 10;
  const nf = new Intl.NumberFormat('id-ID');
  const fmt = (v) => nf.format(Math.round(v));
  const pc = (v) => new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  const uname = (u) => UNAME[u] || u;
  const nice = (s, i) => (s === '' ? '(kosong)' : i <= 1 && /^[A-Z ]+$/.test(s) ? s.charAt(0) + s.slice(1).toLowerCase() : s);
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const done = (id, t) => { const el = $(id); el.textContent = t; el.classList.remove('dash-skeleton'); };

  let path = []; // nilai terpilih per level (diisi otomatis dengan nilai terbesar)
  let fkey = '';

  $('dp-f-unit').addEventListener('change', (e) => dash.setParams({ dp_unit: e.target.value || null, dp_up3: null }));
  $('dp-f-up3').addEventListener('change', (e) => dash.setParams({ dp_up3: e.target.value || null }));
  $('dp-f-bulan').addEventListener('change', (e) => dash.setParams({ dp_bulan: e.target.value ? Number(e.target.value) : null }));
  $('dp-reset').addEventListener('click', () => { path = []; dash.setParams({ dp_unit: null, dp_up3: null, dp_bulan: null }); });

  const tree = $('dp-tree');
  $('dp-hide-inv').addEventListener('change', () => render());
  let ctx = { where: 'Sumkal', per: '' };
  window.addEventListener('resize', () => { if (tree.offsetWidth) drawLinks(); });

  function drawLinks() {
    const svg = tree.querySelector('svg.dp-links'); if (!svg) return;
    const box = tree.querySelector('.dp-canvas').getBoundingClientRect();
    svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
    svg.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg';
    tree.querySelectorAll('.dp-col[data-lv]').forEach((col) => {
      const lv = Number(col.dataset.lv);
      const parent = lv === 0 ? tree.querySelector('.dp-root') : tree.querySelector(`.dp-col[data-lv="${lv - 1}"] .dp-node.on`);
      if (!parent) return;
      const pr = parent.getBoundingClientRect();
      const x0 = pr.right - box.left, y0 = pr.top + pr.height / 2 - box.top;
      const kids = [...col.querySelectorAll('.dp-node')];
      if (!kids.length) return;
      const xm = x0 + 10;
      kids.forEach((k) => {
        const kr = k.getBoundingClientRect(); const x1 = kr.left - box.left, y1 = kr.top + kr.height / 2 - box.top;
        const p = document.createElementNS(ns, 'path');
        p.setAttribute('d', `M${x0},${y0} H${xm} V${y1} H${x1}`);
        p.setAttribute('fill', 'none'); p.setAttribute('stroke', k.classList.contains('on') ? 'var(--x-olive)' : 'color-mix(in srgb, var(--color-fg) 22%, transparent)');
        p.setAttribute('stroke-width', k.classList.contains('on') ? 2 : 1.2);
        svg.append(p);
      });
    });
  }

  const render = () => {
    const D = SSD.data('gangguan_dupont');
    if (D.status !== 'ok') {
      if (D.status === 'error') { tree.replaceChildren(mk('div', 'Failed to load', 'ss-fail')); tree.classList.remove('dash-skeleton'); }
      return;
    }
    const all = D.data.map((r) => ({ u: r.UNIT, p: r.UP3, m: Number(r.BULAN_NO), v: LV.map((l) => r[l.f] == null ? '' : String(r[l.f])), s: r.PS ? String(r.PS) : '', n: Number(r.JUMLAH) }));
    const hasPS = all.some((r) => r.s);
    const P = dash.params();
    const units = UORD.filter((u) => all.some((r) => r.u === u));
    const sel = { u: units.includes(P.dp_unit) ? P.dp_unit : null, p: null, m: null };
    const up3s = [...new Set(all.filter((r) => !sel.u || r.u === sel.u).map((r) => r.p))].filter((x) => !/tidak dikenali/i.test(x)).sort((a, b) => a.localeCompare(b));
    if (P.dp_up3 && up3s.includes(P.dp_up3)) sel.p = P.dp_up3;
    const months = [...new Set(all.map((r) => r.m))].sort((a, b) => a - b);
    if (months.includes(Number(P.dp_bulan))) sel.m = Number(P.dp_bulan);

    // filter
    const su = $('dp-f-unit');
    if (su.options.length !== units.length + 1) su.replaceChildren(new Option('Semua unit (Sumkal)', ''), ...units.map((u) => new Option(uname(u), u)));
    su.value = sel.u || '';
    $('dp-f-up3').replaceChildren(new Option(sel.u ? 'Semua UP3 di ' + uname(sel.u) : 'Semua UP3', ''), ...up3s.map((p) => new Option(p, p)));
    $('dp-f-up3').value = sel.p || '';
    const sb = $('dp-f-bulan');
    sb.replaceChildren(new Option(`Semua bulan (${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]} 2026)`, ''), ...months.map((m) => new Option(BLN[m - 1] + ' 2026', m)));
    sb.value = sel.m ? String(sel.m) : '';

    const nk = [sel.u, sel.p, sel.m].join('|'); if (nk !== fkey) { fkey = nk; path = []; }
    const rows = all.filter((r) => (!sel.u || r.u === sel.u) && (!sel.p || r.p === sel.p) && (!sel.m || r.m === sel.m));
    const T = rows.reduce((a, r) => a + r.n, 0);
    const where = sel.p ? 'UP3 ' + sel.p : sel.u ? uname(sel.u) : 'Sumkal';
    const per = sel.m ? BLN[sel.m - 1] + ' 2026' : `${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]} 2026`;

    // susun level demi level mengikuti jalur terpilih
    const levels = []; let cur = rows;
    for (let i = 0; i < LV.length; i++) {
      const agg = new Map(), aP = new Map(), aS = new Map();
      cur.forEach((r) => { agg.set(r.v[i], (agg.get(r.v[i]) || 0) + r.n); if (r.s === 'Permanen') aP.set(r.v[i], (aP.get(r.v[i]) || 0) + r.n); else if (r.s === 'Sesaat') aS.set(r.v[i], (aS.get(r.v[i]) || 0) + r.n); });
      const items = [...agg].sort((a, b) => b[1] - a[1]);
      if (!items.length) break;
      let pick = path[i];
      if (pick == null || !agg.has(pick)) { pick = items[0][0]; path = path.slice(0, i); path[i] = pick; }
      levels.push({ items, pick, parentN: cur.reduce((a, r) => a + r.n, 0), aP, aS });
      cur = cur.filter((r) => r.v[i] === pick);
    }
    path = path.slice(0, levels.length);

    ctx = { where, per };
    // ringkasan
    {
      const tk = $('dp-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const B = (s) => mk('b', s);
      if (!T) tk.append(`Tidak ada gangguan kode J untuk ${where} pada ${per}.`);
      else {
        tk.append(`${per}, ${where} mencatat `, B(fmt(T) + ' gangguan kode J'), ' (No. Laporan unik). Jalur terbesar: ');
        let c2 = rows;
        for (let i = 0; i < LV.length; i++) { const a = new Map(); c2.forEach((r) => a.set(r.v[i], (a.get(r.v[i]) || 0) + r.n)); const t0 = [...a].sort((x, y) => y[1] - x[1])[0]; if (!t0) break; if (i) tk.append(' → '); tk.append(B(`${nice(t0[0], i)} ${pc(t0[1] / T)}`)); c2 = c2.filter((r) => r.v[i] === t0[0]); }
        tk.append('. Persentase dihitung terhadap total gangguan kode J.');
      }
    }
    // kotak angka
    done('dp-t1', fmt(T)); $('dp-t1-sub').textContent = `${where} · ${per}`;
    const top = (i) => { const a = new Map(); rows.forEach((r) => a.set(r.v[i], (a.get(r.v[i]) || 0) + r.n)); return [...a].sort((x, y) => y[1] - x[1])[0] || ['—', 0]; };
    const [b0, b0n] = top(0); done('dp-t2', T ? pc(b0n / T) : '—'); $('dp-t2-sub').textContent = `${nice(b0, 0)} · ${fmt(b0n)} gangguan`;
    const [f0, f0n] = top(4); done('dp-t3', T ? nice(f0, 4) : '—'); $('dp-t3-sub').textContent = T ? `${fmt(f0n)} gangguan · ${pc(f0n / T)}` : '';
    const ca = new Map(); rows.forEach((r) => { if (r.v[5] && r.v[5] !== 'Dalam Investigasi') ca.set(r.v[5], (ca.get(r.v[5]) || 0) + r.n); });
    const c0 = [...ca].sort((x, y) => y[1] - x[1])[0] || ['—', 0];
    done('dp-t4', T ? nice(c0[0], 5) : '—'); $('dp-t4-sub').textContent = T ? `${fmt(c0[1])} gangguan · ${pc(c0[1] / T)} (di luar Dalam Investigasi)` : '';


    // gambar highlight cause paling dominan untuk unit, UP3 dan bulan terpilih
    {
      const box = $('dp-hl'); box.classList.remove('dash-skeleton'); box.replaceChildren();
      const ca2 = new Map(); rows.forEach((r) => ca2.set(r.v[5], (ca2.get(r.v[5]) || 0) + r.n));
      const list = [...ca2].sort((x, y) => y[1] - x[1]);
      if (!T || !list.length) { box.append(mk('p', `Tidak ada gangguan kode J untuk ${where} pada ${per}.`, 'ss-note')); }
      else {
        const [c1, n1] = list[0];
        const art = mk('div', null, 'dp-hl-art');
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 120 120'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Cause dominan: ' + nice(c1, 5));
        s.innerHTML = `<circle cx="60" cy="60" r="56" class="dp-hl-ring"/><circle cx="60" cy="60" r="44" class="dp-hl-core"/><g transform="translate(30 30) scale(2.5)" class="dp-hl-ic">${causeIcon(c1)}</g>`;
        art.append(s);
        const main = mk('div', null, 'dp-hl-main');
        main.append(mk('span', `Cause paling dominan · ${where} · ${per}`, 'dp-hl-eyebrow'), mk('b', nice(c1, 5), 'dp-hl-name'));
        const st = mk('div', null, 'dp-hl-stat'); st.append(mk('b', fmt(n1)), ` gangguan kode J · `, mk('b', pc(n1 / T)), ' dari total');
        main.append(st);
        // tren cause ini sejak awal tahun (unit / UP3 terpilih, semua bulan)
        const trend = months.map((m) => all.filter((r) => r.m === m && r.v[5] === c1 && (!sel.u || r.u === sel.u) && (!sel.p || r.p === sel.p)).reduce((a, r) => a + r.n, 0));
        const mxV = Math.max(...trend), mxI = trend.indexOf(mxV);
        const f = trend[0], l = trend[trend.length - 1];
        const W2 = 260, H2 = 54, px = (i) => 6 + (W2 - 12) * (months.length > 1 ? i / (months.length - 1) : 0.5), py = (v) => 8 + (H2 - 20) * (1 - v / Math.max(1, mxV));
        const sp = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sp.setAttribute('viewBox', `0 0 ${W2} ${H2}`); sp.setAttribute('class', 'dp-hl-spark'); sp.setAttribute('role', 'img');
        sp.setAttribute('aria-label', `Tren ${nice(c1, 5)} per bulan`);
        const pts = trend.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
        sp.innerHTML = `<polyline points="${pts}" fill="none" stroke="#4F7F1F" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
          trend.map((v, i) => `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="${i === mxI ? 4.5 : 2.4}" fill="${i === mxI ? '#C2362B' : '#4F7F1F'}" stroke="#fff" stroke-width="1"/>`).join('') +
          months.map((m, i) => `<text x="${px(i).toFixed(1)}" y="${H2 - 1}" text-anchor="middle" font-size="9" fill="#667060">${BS[m - 1].charAt(0)}</text>`).join('');
        main.append(sp);
        const tr = mk('span', null, 'dp-hl-via');
        const chg = f ? (l - f) / f : null;
        tr.append(`Tren ${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]}: ${fmt(f)} → ${fmt(l)}`);
        if (chg != null) tr.append(' (', mk('b', (chg > 0 ? '+' : '') + pc(chg), chg > 0 ? 'ss-bad' : chg < 0 ? 'ss-ok' : ''), ')');
        tr.append('. Tertinggi di ', mk('b', `${BLN[months[mxI] - 1]} (${fmt(mxV)})`), '.');
        main.append(tr);
        box.append(art, main);
      }
    }

    // grafik penyebab (cause) paling dominan per bulan untuk unit / UP3 terpilih
    {
      const hideInv = $('dp-hide-inv').checked;
      const ch = $('dp-cause-chart'); ch.classList.remove('dash-skeleton'); ch.replaceChildren();
      const base = all.filter((r) => (!sel.u || r.u === sel.u) && (!sel.p || r.p === sel.p) && !(hideInv && /investigasi/i.test(r.v[5])));
      const tot = new Map(); base.forEach((r) => tot.set(r.v[5], (tot.get(r.v[5]) || 0) + r.n));
      const topC = [...tot].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
      // warna kategori yang jelas berbeda (biru, oranye, hijau, merah, ungu) + abu-abu untuk Lainnya
      const COL = ['#2563A6', '#E07B00', '#3C8D2F', '#C2362B', '#7B4FB0'], OTH = '#A3ACB6';
      const keys = [...topC, '__lain'];
      const ser = months.map((m) => { const o = { m, t: 0 }; keys.forEach((kk) => { o[kk] = 0; }); const byC = new Map();
        base.forEach((r) => { if (r.m !== m) return; const kk = topC.includes(r.v[5]) ? r.v[5] : '__lain'; o[kk] += r.n; o.t += r.n; byC.set(r.v[5], (byC.get(r.v[5]) || 0) + r.n); });
        const d = [...byC].sort((a, b) => b[1] - a[1])[0]; o.dom = d ? d[0] : null; o.domN = d ? d[1] : 0; return o; });
      $('dp-cause-sel').replaceChildren('Unit dipilih: ', mk('b', sel.p ? 'UP3 ' + sel.p : sel.u ? uname(sel.u) : 'Sumkal'), ` · ${BS[months[0] - 1]}–${BS[months[months.length - 1] - 1]} 2026 · lima cause terbanyak ditumpuk per bulan, gambar di atas batang = cause paling dominan bulan itu${hideInv ? ' (tanpa Dalam Investigasi)' : ''}`);
      $('dp-cause-legend').replaceChildren(...keys.map((kk, i) => { const s = mk('span'); const sw = mk('i', null, 'ss-sw'); sw.style.background = i < topC.length ? COL[i] : OTH; s.append(sw, kk === '__lain' ? 'Lainnya' : nice(kk, 5)); return s; }));
      if (!base.length) { ch.append(mk('p', 'Tidak ada data untuk pilihan ini.', 'ss-note')); }
      else {
        const W = Math.max(300, ch.clientWidth), H = 380, mg = { t: 50, r: 8, b: 28, l: 44 };
        const svg = d3.select(ch).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Penyebab gangguan kode J per bulan');
        const y = d3.scaleLinear([0, (d3.max(ser, (d) => d.t) || 1) * 1.05], [H - mg.b, mg.t]).nice();
        const yt = y.ticks(5);
        const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(fmt(yt[yt.length - 1])); mg.l = Math.ceil(probe.node().getComputedTextLength()) + 12; probe.remove();
        const x = d3.scaleBand(months, [mg.l, W - mg.r]).padding(0.32);
        svg.append('g').selectAll('line').data(yt).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
        svg.append('g').selectAll('text').data(yt).join('text').attr('x', mg.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
        svg.append('g').selectAll('text').data(months).join('text').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', (d) => (d === sel.m ? 'var(--color-fg)' : 'var(--color-fg-muted)')).style('font-weight', (d) => (d === sel.m ? 700 : 400)).style('font-size', 'var(--cds-font-size-caption)').text((d) => BS[d - 1]);
        const bw = Math.min(x.bandwidth(), 46), off = (x.bandwidth() - bw) / 2;
        const st = d3.stack().keys(keys)(ser);
        const gB = svg.append('g');
        st.forEach((layer, li) => gB.append('g').selectAll('rect').data(layer).join('rect').attr('x', (d) => x(d.data.m) + off).attr('width', bw).attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
          .attr('fill', li < topC.length ? COL[li] : OTH).attr('data-m', (d) => d.data.m).attr('opacity', (d) => (sel.m && d.data.m !== sel.m ? 0.45 : 1)));
        // gambar cause dominan + total di atas batang
        ser.forEach((d) => {
          if (!d.t) return;
          const cx = x(d.m) + x.bandwidth() / 2, top = y(d.t);
          const g = svg.append('g').attr('transform', `translate(${cx - 11},${top - 40})`);
          g.append('rect').attr('width', 22).attr('height', 22).attr('rx', 6).attr('fill', '#0F2A4A');
          g.append('g').attr('transform', 'translate(3 3) scale(.6667)').attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 2).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').html(causeIcon(d.dom));
          svg.append('text').attr('x', cx).attr('y', top - 6).attr('text-anchor', 'middle').style('font-size', '11px').attr('fill', 'var(--color-fg)').text(d.t >= 10000 ? new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(d.t) : fmt(d.t));
        });
        const tip = mk('div', null, 'ss-tip'); tip.hidden = true; ch.append(tip);
        svg.append('g').selectAll('rect').data(ser).join('rect').attr('x', (d) => x(d.m)).attr('width', x.bandwidth()).attr('y', mg.t - 44).attr('height', H - mg.t + 44 - mg.b).attr('fill', 'transparent')
          .on('pointerenter pointermove', (ev, d) => {
            gB.selectAll('rect').attr('opacity', function () { return Number(this.dataset.m) === d.m ? 1 : 0.35; });
            tip.replaceChildren(mk('div', BLN[d.m - 1] + ' 2026', 'ss-tip-h'));
            const dm = mk('div', null, 'ss-row'); dm.append(mk('span', 'Paling dominan: ' + (d.dom == null ? '—' : nice(d.dom, 5))), mk('span', `${fmt(d.domN)} · ${d.t ? pc(d.domN / d.t) : '–'}`)); dm.style.fontWeight = 600; tip.append(dm);
            keys.slice().reverse().forEach((kk) => { const i = keys.indexOf(kk); const r = mk('div', null, 'ss-row'); const a = mk('span'); const sw = mk('i', null, 'ss-sw'); sw.style.background = i < topC.length ? COL[i] : OTH; a.append(sw, kk === '__lain' ? 'Lainnya' : nice(kk, 5)); r.append(a, mk('span', fmt(d[kk]))); tip.append(r); });
            const tr = mk('div', null, 'ss-row'); tr.append(mk('span', 'Total'), mk('span', fmt(d.t))); tr.style.fontWeight = 600; tip.append(tr);
            tip.hidden = false;
            const sc = ch.clientWidth / W, px = (x(d.m) + x.bandwidth() / 2) * sc, tw = tip.offsetWidth;
            tip.style.left = (px + 14 + tw > ch.clientWidth ? Math.max(0, px - tw - 14) : px + 14) + 'px'; tip.style.top = Math.max(0, y(d.t) * sc - 30) + 'px';
          })
          .on('pointerleave', () => { tip.hidden = true; gB.selectAll('rect').attr('opacity', (dd) => (sel.m && dd.data.m !== sel.m ? 0.45 : 1)); });
      }
    }
    // pohon
    tree.classList.remove('dash-skeleton');
    const canvas = mk('div', null, 'dp-canvas');
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgEl.setAttribute('class', 'dp-links'); svgEl.setAttribute('aria-hidden', 'true');
    canvas.append(svgEl);
    const icon = (p) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = p; return s; };
    const rootCol = mk('div', null, 'dp-col dp-col-root');
    const root = mk('div', null, 'dp-node dp-root');
    const ri = mk('span', null, 'dp-ic'); ri.append(icon(ROOTICON));
    const rt = mk('div', null, 'dp-tx'); rt.append(mk('b', 'Gangguan kode J'), mk('span', `${fmt(T)} · 100%`));
    root.append(ri, rt); rootCol.append(root); canvas.append(rootCol);
    const heads = mk('div', null, 'dp-heads'); heads.append(mk('span', 'Total'));
    let offset = 0; // baris awal kolom = posisi node terpilih di kolom sebelumnya
    levels.forEach((l, i) => {
      heads.append(mk('span', LV[i].name));
      const col = mk('div', null, 'dp-col'); col.dataset.lv = i;
      col.style.setProperty('--dp-off', offset);
      let shown = l.items.slice(0, MAXN), rest = l.items.slice(MAXN);
      if (rest.length && !shown.some(([k]) => k === l.pick)) { const pi = l.items.find(([k]) => k === l.pick); shown = [...shown.slice(0, MAXN - 1), pi]; rest = l.items.filter(([k]) => !shown.some(([s]) => s === k)); }
      shown.forEach(([k, n]) => {
        const on = k === l.pick;
        const b = mk('button', null, 'dp-node' + (on ? ' on' : '')); b.type = 'button';
        b.setAttribute('aria-pressed', String(on));
        const nP = l.aP.get(k) || 0, nS = l.aS.get(k) || 0;
        b.title = `${LV[i].name}: ${nice(k, i)}\n${fmt(n)} gangguan kode J\n${pc(n / Math.max(1, T))} dari total kode J · ${pc(n / Math.max(1, l.parentN))} dari level sebelumnya` + (hasPS ? `\nPermanen ${fmt(nP)} · Sesaat ${fmt(nS)}` : '');
        const ic = mk('span', null, 'dp-ic'); ic.append(icon(i === 5 ? causeIcon(k) : ICON[i]));
        const tx = mk('div', null, 'dp-tx'); tx.append(mk('b', nice(k, i)), mk('span', `${fmt(n)} · ${pc(n / Math.max(1, T))}`));
        if (hasPS && i === 5) { const ps = mk('span', null, 'dp-ps'); const pp = (nP + nS) ? Math.round(nP / (nP + nS) * 100) : 0; ps.append(mk('i', 'P'), ` ${pp}%  `, mk('i', 'S', 'dp-ps-s'), ` ${(nP + nS) ? 100 - pp : 0}%`); ps.title = `Permanen ${fmt(nP)} · Sesaat ${fmt(nS)}`; tx.append(ps); }
        b.append(ic, tx);
        b.addEventListener('click', () => { path = path.slice(0, i); path[i] = k; redraw(); });
        col.append(b);
      });
      if (rest.length) col.append(mk('div', `+${rest.length} lainnya · ${fmt(rest.reduce((a, [, n]) => a + n, 0))}`, 'dp-more'));
      canvas.append(col);
      offset += Math.max(0, shown.findIndex(([k]) => k === l.pick));
    });
    const wrap = mk('div', null, 'dp-scroll'); wrap.style.setProperty('--dp-n', levels.length + 1); wrap.append(heads, canvas);
    tree.replaceChildren(wrap);
    $('dp-path').textContent = levels.length ? 'Jalur terpilih: ' + ['Gangguan kode J', ...levels.map((l) => nice(l.pick, levels.indexOf(l)))].join(' → ') + '. Klik kotak lain untuk membuka cabangnya.' : '';
    requestAnimationFrame(drawLinks);
    psTable(rows, levels, where, per, hasPS);
  };
  // Tabel event permanen dan sesaat per penyebab (cause), mengikuti filter dan Bidang + Jenis padam terpilih di pohon
  let psCtx = { name: '' };
  function psTable(rows, levels, where, per, hasPS) {
    const tb = $('dp-ps-table'), note = $('dp-ps-sel');
    $('dp-ps-card').style.display = hasPS ? '' : 'none';
    if (!hasPS) return;
    const bid = levels[0] ? levels[0].pick : null, jen = levels[1] ? levels[1].pick : null;
    const cur = rows.filter((r) => (bid == null || r.v[0] === bid) && (jen == null || r.v[1] === jen));
    const m = new Map();
    cur.forEach((r) => { const o = m.get(r.v[5]) || { p: 0, s: 0, t: 0 }; if (r.s === 'Permanen') o.p += r.n; else if (r.s === 'Sesaat') o.s += r.n; o.t += r.n; m.set(r.v[5], o); });
    const list = [...m].sort((a, b) => b[1].t - a[1].t);
    const tot = list.reduce((a, [, o]) => ({ p: a.p + o.p, s: a.s + o.s, t: a.t + o.t }), { p: 0, s: 0, t: 0 });
    const scope = [bid != null ? nice(bid, 0) : null, jen != null ? nice(jen, 1) : null].filter(Boolean).join(' · ');
    psCtx = { name: [where, scope, per].join('_') };
    note.textContent = `${where} · ${scope || 'semua bidang'} · ${per}. Gangguan kode J (No. Laporan unik) menurut kolom P/S. Bidang dan jenis padam mengikuti pilihan di Dupont chart; klik kotak lain di pohon untuk mengganti.`;
    const mx = Math.max(1, ...list.map(([, o]) => o.t));
    const th = mk('thead'), hr = mk('tr');
    ['Penyebab (cause)', 'Permanen', 'Sesaat', 'Total', '% Permanen', ''].forEach((h, i) => { const c = mk('th', h); if (i === 5) c.className = 'dp-ps-barh'; hr.append(c); });
    th.append(hr);
    const body = mk('tbody');
    const row = ([k, o], cls) => {
      const tr = mk('tr', null, cls || '');
      const c0 = mk('td'); if (!cls) { const ic = mk('span', null, 'dp-ps-ic'); ic.append(svgIcon(causeIcon(k))); c0.append(ic); } c0.append(cls ? k : nice(k, 5)); tr.append(c0);
      tr.append(mk('td', fmt(o.p), 'num'), mk('td', fmt(o.s), 'num'), mk('td', fmt(o.t), 'num'), mk('td', o.t ? pc(o.p / o.t) : '–', 'num'));
      const bc = mk('td', null, 'dp-ps-barc');
      if (!cls) { const bar = mk('div', null, 'dp-ps-bar'); bar.style.width = (o.t / mx * 100) + '%'; const bp = mk('i', null, 'p'); bp.style.width = (o.t ? o.p / o.t * 100 : 0) + '%'; const bs = mk('i', null, 's'); bs.style.width = (o.t ? o.s / o.t * 100 : 0) + '%'; bar.append(bp, bs); bar.title = `${nice(k, 5)}: permanen ${fmt(o.p)}, sesaat ${fmt(o.s)}`; bc.append(bar); }
      tr.append(bc); return tr;
    };
    list.forEach((e) => body.append(row(e)));
    body.append(row(['Total', tot], 'dp-ps-tot'));
    tb.replaceChildren(th, body);
  }
  $('dp-ps-dl').addEventListener('click', () => window.SSExport({ card: 'dp-ps-card', btn: 'dp-ps-dl', msg: 'dp-ps-msg', preview: 'dp-ps-pv', filename: `Permanen_Sesaat_per_Penyebab_${psCtx.name.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));
  const redraw = () => render();
  // unduh Dupont chart sebagai PNG
  $('dp-dl').addEventListener('click', async () => {
    const btn = $('dp-dl'), msg = (s) => { $('dp-dl-msg').textContent = s; };
    if (!window.htmlToImage) { msg('Pembuat gambar belum termuat. Muat ulang halaman.'); return; }
    btn.disabled = true; msg('Menyiapkan gambar…'); $('dp-preview').hidden = true;
    const card = $('dp-card'); let clone = null;
    try {
      const canvas = card.querySelector('.dp-canvas');
      const need = canvas ? canvas.scrollWidth + 34 : card.offsetWidth;
      clone = card.cloneNode(true);
      clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      clone.querySelector('.dp-dl').remove(); const pv = clone.querySelector('.h-preview'); if (pv) pv.remove();
      const ttl = clone.querySelector('.dp-head'); const c = document.createElement('div'); c.className = 'dp-ctx'; c.textContent = `${ctx.where} · ${ctx.per} · No. Laporan unik, persentase terhadap total gangguan kode J`; ttl.after(c);
      clone.querySelectorAll('.dp-scroll').forEach((s) => { s.style.overflow = 'visible'; });
      clone.querySelectorAll('.ss-note').forEach((n) => { n.textContent = n.textContent.replace(' Klik kotak lain untuk membuka cabangnya.', ''); });
      Object.assign(clone.style, { position: 'fixed', left: '-100000px', top: '0', width: Math.max(card.offsetWidth, need) + 'px', maxWidth: 'none' });
      card.parentNode.appendChild(clone);
      // gambar ulang garis penghubung di salinan
      const cv = clone.querySelector('.dp-canvas'), svg = cv.querySelector('svg.dp-links');
      const box = cv.getBoundingClientRect(); svg.setAttribute('width', box.width); svg.setAttribute('height', box.height); svg.replaceChildren();
      const ns = 'http://www.w3.org/2000/svg';
      cv.querySelectorAll('.dp-col[data-lv]').forEach((col) => {
        const lv = Number(col.dataset.lv);
        const parent = lv === 0 ? cv.querySelector('.dp-root') : cv.querySelector(`.dp-col[data-lv="${lv - 1}"] .dp-node.on`); if (!parent) return;
        const pr = parent.getBoundingClientRect(); const x0 = pr.right - box.left, y0 = pr.top + pr.height / 2 - box.top, xm = x0 + 10;
        col.querySelectorAll('.dp-node').forEach((kn) => { const kr = kn.getBoundingClientRect(); const p = document.createElementNS(ns, 'path'); p.setAttribute('d', `M${x0},${y0} H${xm} V${kr.top + kr.height / 2 - box.top} H${kr.left - box.left}`); p.setAttribute('fill', 'none'); p.setAttribute('stroke', kn.classList.contains('on') ? '#4F7F1F' : '#B8C2CC'); p.setAttribute('stroke-width', kn.classList.contains('on') ? 2 : 1.2); svg.append(p); });
      });
      const blob = await window.htmlToImage.toBlob(clone, { pixelRatio: 2, skipFonts: true, backgroundColor: '#ffffff', width: clone.offsetWidth, height: clone.offsetHeight, style: { position: 'static', left: '0', top: '0', margin: '0' } });
      if (!blob) throw new Error('gambar kosong');
      const slug = (s) => String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const filename = `Dupont_Gangguan_KodeJ_${slug(ctx.where)}_${slug(ctx.per)}.png`;
      let dlc = null; try { dlc = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dlc = null; }
      if (dlc) {
        try { const res = await dlc.save({ filename, data: blob }); msg(res && res.status === 'saved' ? 'Gambar diunduh.' : ''); }
        catch (e) { if (e && e.code === 'declined') msg(''); else throw e; }
      } else {
        const img = $('dp-preview-img'); if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
        const url = URL.createObjectURL(blob); img.src = url; img.dataset.url = url;
        $('dp-preview-note').textContent = `Unduhan langsung tidak tersedia di tampilan ini. Klik kanan gambar di bawah lalu pilih "Simpan gambar" (${filename}).`;
        $('dp-preview').hidden = false; msg('');
      }
    } catch (e) { msg('Gagal membuat gambar: ' + (e && e.message ? e.message : e)); }
    finally { if (clone) clone.remove(); btn.disabled = false; }
  });

  SSD.onData(render);
})();
