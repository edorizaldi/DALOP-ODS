// Tab Workplan Keandalan (Bulanan): target dan realisasi action plan keandalan per UID, dari sheet Action Plan.
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('workplan')) return;
  const PROG = [
    { k: 'pdkb', s: 'PDKB', n: 'Optimalisasi Pelaksanaan PDKB', u: 'titik' },
    { k: 'tebang', s: 'Tebang', n: 'Program Tebang', u: 'kms' },
    { k: 'pangkas', s: 'Pangkas', n: 'Program Pangkas (ROW Management)', u: 'kms' },
    { k: 'proteksi', s: 'Proteksi', n: 'Optimalisasi dan Assesment Sistem Proteksi', u: 'penyulang' },
    { k: 'binatang', s: 'Penghalang Binatang', n: 'Pemasangan Penghalang Proteksi Binatang', u: 'titik' },
  ];
  const PK = Object.fromEntries(PROG.map((p) => [p.k, p]));
  const UNAME = { ACEH: 'Aceh', SUMUT: 'Sumatera Utara', SUMBAR: 'Sumatera Barat', RKR: 'Riau & Kepri', S2JB: 'S2JB', BABEL: 'Bangka Belitung', LAMPUNG: 'Lampung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra' };
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const REG = [
    { k: 'SUMKAL', n: 'Sumkal', c: 'var(--x-olive)' },
    { k: 'JAMALI', n: 'Jamali', c: 'var(--x-c4)' },
    { k: 'SULMAPANA', n: 'Sulmapana', c: 'var(--x-c3)' },
    { k: 'NASIONAL', n: 'Nasional (Dit Dist)', c: 'var(--color-fg-muted)', ring: true },
  ];
  const f0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const f1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const fp = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const num = (v, u) => (v == null ? '–' : (u === 'kms' ? f1 : f0).format(v));
  const pct = (r) => (r == null ? '–' : fp.format(r * 100) + '%');
  const cap = (x) => (x && x.target ? x.realisasi / x.target : null);
  const lvl = (r) => (r == null ? 'na' : r < 0.9 ? 'l0' : r < 1 ? 'l1' : r < 1.5 ? 'l2' : 'l3');
  const mk = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, a) => { const e = document.createElementNS(NS, tag); Object.entries(a || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  const uname = (u) => UNAME[u] || u;

  $('wp-f-prog').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) dash.setParams({ wp_prog: b.dataset.v || null }); });
  $('wp-f-unit').addEventListener('change', (e) => dash.setParams({ wp_unit: e.target.value || null }));
  $('wp-reset').addEventListener('click', () => dash.setParams({ wp_prog: null, wp_unit: null }));
  const toggle = (key, v) => { const cur = dash.params()[key] || ''; dash.setParams({ [key]: cur === v ? null : v }); };

  SSD.onData(() => {
    const D = SSD.data('workplan');
    if (D.status !== 'ok' || !D.data.length) return;
    const rows = D.data;
    const get = (wil, unit, prog) => rows.find((r) => r.wil === wil && r.unit === unit && r.program === prog);
    const units = UORD.filter((u) => rows.some((r) => r.wil === 'SUMKAL' && r.unit === u)).concat([...new Set(rows.filter((r) => r.wil === 'SUMKAL' && r.jenis === 'unit' && !UORD.includes(r.unit)).map((r) => r.unit))]);
    const P = dash.params();
    const prog = PK[P.wp_prog] ? P.wp_prog : '';
    const unit = units.includes(P.wp_unit) ? P.wp_unit : '';
    const info = (SSD.data('info_update').data || []).find((r) => r.tab === 'workplan');
    const per = info ? info.periode.replace(/^Realisasi\s*/i, '') : '';

    // filter
    const chip = (v, l) => { const b = mk('button', l, 'ss-chip'); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String(v === prog)); return b; };
    $('wp-f-prog').replaceChildren(chip('', 'Semua'), ...PROG.map((p) => chip(p.k, p.s)));
    const sel = $('wp-f-unit');
    sel.replaceChildren(new Option('Semua unit (Sumkal)', ''), ...units.map((u) => new Option(uname(u), u)));
    sel.value = unit;

    const scopeRow = (p) => (unit ? get('SUMKAL', unit, p) : get('SUMKAL', 'TOTAL', p));
    const scopeName = unit ? uname(unit) : 'Sumkal';

    // ringkasan
    const take = $('wp-take'); take.classList.remove('dash-skeleton'); take.replaceChildren();
    const B = (t) => mk('b', t); const T = (t) => document.createTextNode(t);
    const progs = prog ? [PK[prog]] : PROG;
    const below = [];
    (unit ? [unit] : units).forEach((u) => progs.forEach((p) => { const x = get('SUMKAL', u, p.k); const r = cap(x); if (r != null && r < 1) below.push({ u, p, x, r }); }));
    below.sort((a, b) => a.r - b.r);
    const caps = progs.map((p) => ({ p, r: cap(scopeRow(p.k)) })).filter((c) => c.r != null);
    const met = caps.filter((c) => c.r >= 1).length;
    if (!prog) {
      const hi = caps.slice().sort((a, b) => b.r - a.r)[0], lo = caps.slice().sort((a, b) => a.r - b.r)[0];
      take.append(T(`Realisasi ${per ? per + ', ' : ''}`), B(scopeName), T(' mencapai target di '), B(`${met} dari ${caps.length} program`), T('. Capaian tertinggi '), B(`${hi.p.s} ${pct(hi.r)}`), T(', terendah '), B(`${lo.p.s} ${pct(lo.r)}`), T('. '));
      if (unit) {
        if (below.length) take.append(T('Masih di bawah target: '), B(below.map((b) => `${b.p.s} ${pct(b.r)}`).join(', ')), T('.'));
      } else if (below.length) {
        const cnt = {}; below.forEach((b) => { cnt[b.u] = (cnt[b.u] || 0) + 1; });
        const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
        take.append(B(`${below.length} dari ${units.length * caps.length}`), T(' pasangan unit dan program masih di bawah target, terbanyak di '), B(`${uname(top[0])} (${top[1]} program)`), T('.'));
      } else take.append(T('Semua unit mencapai target di semua program.'));
    } else {
      const p = PK[prog], x = scopeRow(prog);
      take.append(T(`${p.n}, realisasi ${per ? per + ' ' : ''}`), B(scopeName), T(' '), B(`${num(x.realisasi, p.u)} ${p.u}`), T(` dari target ${num(x.target, p.u)} ${p.u} (`), B(pct(cap(x))), T('). '));
      if (unit) {
        const r = cap(x); const list = units.map((u) => cap(get('SUMKAL', u, prog))).filter((v) => v != null).sort((a, b) => b - a);
        take.append(T(`Peringkat ${list.indexOf(r) + 1} dari ${list.length} UID Sumkal`), T(r < 1 ? `, masih kurang ${num(x.target - x.realisasi, p.u)} ${p.u}.` : '.'));
      } else {
        const ok = units.filter((u) => (cap(get('SUMKAL', u, prog)) || 0) >= 1).length;
        take.append(B(`${ok} dari ${units.length} UID`), T(' sudah mencapai target'), T(below.length ? `; terendah ${uname(below[0].u)} ${pct(below[0].r)}.` : '.'));
      }
    }

    // perbandingan regional (dot plot)
    const reg = $('wp-reg'); reg.classList.remove('dash-skeleton'); reg.replaceChildren();
    const series = REG.map((g) => ({ ...g, v: PROG.map((p) => cap(get(g.k, 'TOTAL', p.k))) }));
    if (unit) series.unshift({ k: 'UNIT', n: uname(unit), c: 'var(--x-c5)', dia: true, v: PROG.map((p) => cap(get('SUMKAL', unit, p.k))) });
    $('wp-reg-legend').replaceChildren(...series.map((s) => { const sp = mk('span'); const i = mk('i', null, 'wp-dot' + (s.ring ? ' ring' : '') + (s.dia ? ' dia' : '')); i.style.setProperty('--c', s.c); sp.append(i, T(s.n)); return sp; }));
    const all = series.flatMap((s) => s.v).filter((v) => v != null);
    const xmax = Math.max(2, Math.ceil(Math.max(...all) * 2) / 2);
    const W = 520, L = 132, R = 16, rowH = 38, top = 8, H = top + rowH * PROG.length + 22;
    const x = (v) => L + (W - L - R) * (v / xmax);
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'wp-reg-svg', role: 'img', 'aria-label': 'Capaian program per regional' });
    for (let t = 0; t <= xmax + 1e-9; t += 0.5) {
      svg.append(sv('line', { x1: x(t), x2: x(t), y1: top, y2: H - 20, class: t === 1 ? 'wp-ref' : 'wp-grid' }));
      const tx = sv('text', { x: x(t), y: H - 6, class: 'wp-ax', 'text-anchor': 'middle' }); tx.textContent = f0.format(t * 100) + '%'; svg.append(tx);
    }
    PROG.forEach((p, i) => {
      const cy = top + rowH * i + rowH / 2;
      const g = sv('g', { class: 'wp-reg-row' + (prog === p.k ? ' on' : ''), tabindex: '0', role: 'button', 'aria-label': p.n });
      g.append(sv('rect', { x: 0, y: cy - rowH / 2 + 2, width: W, height: rowH - 4, rx: 8, class: 'wp-reg-bg' }));
      const lab = sv('text', { x: 8, y: cy + 4, class: 'wp-reg-lab' }); lab.textContent = p.s; g.append(lab);
      const vs = series.map((s) => s.v[i]).filter((v) => v != null);
      if (vs.length) g.append(sv('line', { x1: x(Math.min(...vs)), x2: x(Math.max(...vs)), y1: cy, y2: cy, class: 'wp-span' }));
      series.slice().reverse().forEach((s) => {
        const v = s.v[i]; if (v == null) return;
        const m = s.dia ? sv('rect', { x: x(v) - 5.5, y: cy - 5.5, width: 11, height: 11, transform: `rotate(45 ${x(v)} ${cy})`, fill: s.c, class: 'wp-mk' })
          : sv('circle', { cx: x(v), cy, r: s.k === 'SUMKAL' ? 7 : 5.5, fill: s.ring ? 'var(--x-card)' : s.c, stroke: s.ring ? s.c : 'var(--x-card)', 'stroke-width': s.ring ? 2 : 1.5, class: 'wp-mk' });
        const tt = sv('title'); tt.textContent = `${s.n} · ${p.s}: ${pct(v)}`; m.append(tt); g.append(m);
      });
      const main = series[0].v[i];
      if (main != null) { const vl = sv('text', { x: x(main), y: cy - 10, class: 'wp-reg-val', 'text-anchor': 'middle' }); vl.textContent = pct(main); g.append(vl); }
      g.addEventListener('click', () => toggle('wp_prog', p.k));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('wp_prog', p.k); } });
      svg.append(g);
    });
    reg.append(svg);

    // kartu program
    const rank = (p) => { const list = units.map((u) => ({ u, r: cap(get('SUMKAL', u, p)) })).filter((a) => a.r != null).sort((a, b) => b.r - a.r); return { i: list.findIndex((a) => a.u === unit) + 1, n: list.length, ok: list.filter((a) => a.r >= 1).length }; };
    $('wp-kpi').replaceChildren(...PROG.map((p) => {
      const xr = scopeRow(p.k), r = cap(xr);
      const b = mk('button', null, 'wp-tile ' + lvl(r)); b.type = 'button'; b.setAttribute('aria-pressed', String(prog === p.k));
      b.addEventListener('click', () => toggle('wp_prog', p.k));
      const h = mk('div', null, 'wp-tile-h'); h.append(mk('span', p.n, 'wp-tile-n'), mk('span', p.u, 'wp-tile-u')); b.append(h);
      const big = mk('div', null, 'wp-big'); big.append(mk('span', pct(r)), mk('small', r == null ? '' : r >= 1 ? 'tercapai' : 'di bawah target')); b.append(big);
      const bar = mk('div', null, 'wp-bar'); const fill = mk('span', null, 'wp-fill'); fill.style.width = Math.min(100, (r || 0) * 100) + '%'; bar.append(fill);
      if (r > 1) { const ov = mk('span', null, 'wp-over'); ov.style.width = Math.min(100, (r - 1) * 100) + '%'; bar.append(ov); }
      b.append(bar);
      b.append(mk('div', xr ? `${num(xr.realisasi, p.u)} dari target ${num(xr.target, p.u)}` : '–', 'wp-tile-v'));
      const rk = rank(p.k);
      b.append(mk('div', unit ? (rk.i ? `Peringkat ${rk.i} dari ${rk.n} UID Sumkal` : '') : `${rk.ok} dari ${rk.n} UID mencapai target`, 'wp-tile-s'));
      return b;
    }));

    // matriks unit x program
    const tbl = $('wp-mx'); tbl.replaceChildren();
    const thead = mk('thead'), hr = mk('tr'); hr.append(mk('th', 'Unit induk'));
    PROG.forEach((p) => { const th = mk('th', null, 'num wp-col' + (prog === p.k ? ' on' : '')); const bt = mk('button', null, 'wp-th-b'); bt.type = 'button'; bt.append(mk('span', p.s), mk('small', p.u)); bt.setAttribute('aria-pressed', String(prog === p.k)); bt.addEventListener('click', () => toggle('wp_prog', p.k)); th.append(bt); hr.append(th); });
    hr.append(mk('th', 'Program tercapai', 'num')); thead.append(hr); tbl.append(thead);
    const tb = mk('tbody');
    const line = (wil, u, label, cls, click) => {
      const tr = mk('tr', null, cls || ''); const td0 = mk('td', label, 'wp-u'); tr.append(td0);
      let ok = 0, n = 0;
      PROG.forEach((p) => {
        const xr = get(wil, u, p.k), r = cap(xr); if (r != null) { n++; if (r >= 1) ok++; }
        const td = mk('td', null, 'num wp-cell ' + lvl(r) + (prog === p.k ? ' on' : ''));
        td.append(mk('b', pct(r)), mk('small', xr ? `${num(xr.realisasi, p.u)} / ${num(xr.target, p.u)}` : ''));
        td.title = `${label} · ${p.n}: realisasi ${xr ? num(xr.realisasi, p.u) : '–'} dari target ${xr ? num(xr.target, p.u) : '–'} ${p.u}`;
        tr.append(td);
      });
      const tdn = mk('td', null, 'num wp-n'); const dots = mk('span', null, 'wp-pips'); for (let k = 0; k < n; k++) dots.append(mk('i', null, k < ok ? 'y' : '')); tdn.append(dots, mk('span', `${ok}/${n}`)); tr.append(tdn);
      if (click) { tr.classList.add('wp-click'); tr.tabIndex = 0; tr.addEventListener('click', click); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') click(); }); }
      return tr;
    };
    units.forEach((u) => tb.append(line('SUMKAL', u, uname(u), unit === u ? 'on' : '', () => toggle('wp_unit', u))));
    tb.append(line('SUMKAL', 'TOTAL', 'Total Sumkal', 'wp-tot'));
    const sep = mk('tr', null, 'wp-sep'); const sc = mk('td', 'Pembanding', ''); sc.colSpan = PROG.length + 2; sep.append(sc); tb.append(sep);
    REG.slice(1).forEach((g) => tb.append(line(g.k, 'TOTAL', g.n, 'wp-ref-row')));
    tbl.append(tb);

    // bar realisasi vs target per unit
    const bp = PK[prog] || PROG[0];
    $('wp-bar-h').textContent = `Realisasi dan target per unit · ${bp.s} (${bp.u})`;
    $('wp-bar-note').textContent = prog ? 'Diurutkan dari capaian tertinggi. Klik baris untuk memilih unit.' : `Menampilkan ${bp.s}; pilih program lain di filter atau kartu di atas.`;
    const list = units.map((u) => ({ u, x: get('SUMKAL', u, bp.k) })).filter((a) => a.x && a.x.target != null).sort((a, b) => cap(b.x) - cap(a.x));
    const vmax = Math.max(...list.map((a) => Math.max(a.x.target, a.x.realisasi)));
    $('wp-bar').replaceChildren(...list.map(({ u, x: xr }) => {
      const r = cap(xr); const row = mk('div', null, 'wp-brow ' + lvl(r) + (unit === u ? ' on' : '')); row.tabIndex = 0; row.setAttribute('role', 'button');
      row.addEventListener('click', () => toggle('wp_unit', u)); row.addEventListener('keydown', (e) => { if (e.key === 'Enter') toggle('wp_unit', u); });
      row.append(mk('span', uname(u), 'wp-bl'));
      const tr = mk('span', null, 'wp-btrack');
      const tg = mk('i', null, 'wp-bt'); tg.style.width = (xr.target / vmax) * 100 + '%';
      const rl = mk('i', null, 'wp-br'); rl.style.width = (xr.realisasi / vmax) * 100 + '%';
      const tk = mk('i', null, 'wp-btk'); tk.style.left = (xr.target / vmax) * 100 + '%';
      tr.append(tg, rl, tk); row.append(tr);
      const v = mk('span', null, 'wp-bv'); v.append(mk('b', pct(r)), mk('small', `${num(xr.realisasi, bp.u)} / ${num(xr.target, bp.u)}`)); row.append(v);
      row.title = `${uname(u)} · ${bp.n}: realisasi ${num(xr.realisasi, bp.u)} dari target ${num(xr.target, bp.u)} ${bp.u} (${pct(r)})`;
      return row;
    }));

    // perlu perhatian
    $('wp-gap-note').textContent = `Unit dan program dengan realisasi di bawah target${unit ? ' di ' + uname(unit) : ''}${prog ? ' untuk ' + PK[prog].s : ''}, diurutkan dari capaian terendah.`;
    const gap = $('wp-gap');
    if (!below.length) gap.replaceChildren(mk('li', 'Semua sudah mencapai target. ✓', 'wp-gap-ok'));
    else gap.replaceChildren(...below.map((b) => {
      const li = mk('li', null, b.r < 0.9 ? 'l0' : 'l1');
      const h = mk('div', null, 'wp-gap-h'); h.append(mk('b', uname(b.u)), mk('span', b.p.s, 'wp-gap-p'), mk('span', pct(b.r), 'wp-gap-r')); li.append(h);
      const bar = mk('div', null, 'wp-bar sm'); const f = mk('span', null, 'wp-fill'); f.style.width = b.r * 100 + '%'; bar.append(f); li.append(bar);
      li.append(mk('div', `Kurang ${num(b.x.target - b.x.realisasi, b.p.u)} ${b.p.u} · realisasi ${num(b.x.realisasi, b.p.u)} dari ${num(b.x.target, b.p.u)}`, 'wp-gap-s'));
      return li;
    }));
  });
})();
