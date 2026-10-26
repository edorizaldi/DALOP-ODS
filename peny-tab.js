
(() => {
  const $ = (id) => document.getElementById(id);
  const UIDS = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const ULABEL = { ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID Riau Kepri', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID Kalselteng', KALTIMRA: 'UID Kaltimra' };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLNF = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const f1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const enc = (s) => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D').replace(/,/g, '%2C');
  const key = (u, p) => u + '\u0001' + p;
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };

  ['p-f-uid', 'p-f-up3', 'p-f-peny'].forEach((id) => {
    const p = { 'p-f-uid': 'p_uid', 'p-f-up3': 'p_up3', 'p-f-peny': 'p_peny' }[id];
    $(id).addEventListener('change', (e) => {
      const v = e.target.value || null;
      if (p === 'p_uid') dash.setParams({ p_uid: v, p_up3: null, p_peny: null });
      else if (p === 'p_up3') dash.setParams({ p_up3: v, p_peny: null });
      else dash.setParams({ p_peny: v });
    });
  });
  $('p-f-jenis').addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) dash.setParams({ p_jenis: b.dataset.v || null }); });
  let q = '';
  $('p-search').addEventListener('input', (e) => { q = e.target.value.trim().toUpperCase(); drawTable(); });
  $('p-tabel').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-key]'); if (tr) dash.setParams({ p_peny: tr.dataset.key }); });
  $('p-tabel').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const tr = e.target.closest('tr[data-key]'); if (tr) { e.preventDefault(); dash.setParams({ p_peny: tr.dataset.key }); } } });

  const chart = $('p-chart');
  const tip = mk('div', null, 'ss-tip'); tip.hidden = true;

  let cacheB = null, IDX = null;
  function index(prof, rows) {
    const months = [...new Set(rows.map((r) => Number(r.bulan)))].sort((a, b) => a - b);
    const JO = ['Gangguan', 'Pemeliharaan', 'Bencana']; const jenisList = [...new Set(rows.map((r) => r.jenis_padam))].sort((x, y) => (JO.indexOf(x) + 1 || 9) - (JO.indexOf(y) + 1 || 9));
    const byKey = new Map(); // key -> {jenis -> {m -> {Permanen, Sesaat}}}
    rows.forEach((r) => {
      const k = key(r.up3, r.penyulang);
      let o = byKey.get(k); if (!o) { o = []; byKey.set(k, o); }
      o.push({ m: Number(r.bulan), j: r.jenis_padam, ps: r.ps, n: Number(r.kali) });
    });
    const profByKey = new Map(prof.map((p) => [key(p.up3, p.penyulang), p]));
    return { months, jenisList, byKey, profByKey };
  }
  // per-feeder monthly series {m:{Permanen,Sesaat,t}} for chosen jenis
  function series(k, jenis) {
    const out = {}; IDX.months.forEach((m) => { out[m] = { Permanen: 0, Sesaat: 0, t: 0 }; });
    (IDX.byKey.get(k) || []).forEach((r) => { if (jenis && r.j !== jenis) return; const o = out[r.m]; if (!o) return; o[r.ps] = (o[r.ps] || 0) + r.n; o.t += r.n; });
    return out;
  }
  let feeders = [], sel = null, jenis = null, up3 = null;

  function drawTable() {
    const tb = $('p-tabel');
    const head = mk('thead'), hr = mk('tr');
    ['Penyulang', 'ULP', 'Jenis', ...IDX.months.map((m) => BLN[m - 1]), 'Total'].forEach((h, i) => { const th = mk('th', h); if (i === 1 || i === 2) th.className = 'ss-l ss-hide-n'; hr.append(th); });
    head.append(hr);
    const body = mk('tbody');
    const mx = Math.max(1, ...feeders.flatMap((f) => IDX.months.map((m) => f.s[m].t)));
    const list = feeders.filter((f) => !q || f.p.penyulang.toUpperCase().includes(q) || String(f.p.ulp || '').toUpperCase().includes(q));
    list.forEach((f) => {
      const tr = mk('tr', null, f.k === sel ? 'ss-p-on' : '');
      tr.dataset.key = f.p.penyulang; tr.tabIndex = 0;
      const n = mk('td'); n.append(f.p.penyulang); if (f.p.di_database !== 'Ya') n.append(mk('span', 'tidak di database', 'ss-p-flag'));
      tr.append(n, mk('td', f.p.ulp || '—', 'ss-l ss-hide-n'), mk('td', f.p.jenis || '—', 'ss-l ss-hide-n'),
        ...IDX.months.map((m) => { const v = f.s[m].t; const td = mk('td', v ? fmt(v) : '·', 'ss-p-c'); if (v) td.style.background = `color-mix(in srgb, ${SSC[0]} ${Math.round(v / mx * 50)}%, transparent)`; return td; }),
        mk('td', fmt(f.t), 'ss-hl'));
      body.append(tr);
    });
    tb.replaceChildren(head, body);
    $('p-tabel-note').textContent = `${fmt(list.length)} dari ${fmt(feeders.length)} penyulang di UP3 ${up3}, diurutkan dari kali gangguan terbanyak${jenis ? ' (' + jenis.toLowerCase() + ')' : ''}. Klik baris untuk melihat profil dan chart bulanannya.`;
  }

  SSD.onData(() => {
    const P = SSD.data('peny_profil'), B = SSD.data('peny_bulanan');
    if (P.status !== 'ok' || B.status !== 'ok') {
      chart.replaceChildren();
      if (P.status === 'error' || B.status === 'error') { chart.classList.remove('dash-skeleton'); chart.append(mk('div', 'Failed to load', 'ss-fail')); }
      return;
    }
    if (cacheB !== B.data) { cacheB = B.data; IDX = index(P.data, B.data); }
    const prm = dash.params();
    jenis = IDX.jenisList.includes(prm.p_jenis) ? prm.p_jenis : null;
    const uid = UIDS.includes(prm.p_uid) ? prm.p_uid : null;

    // totals per UP3 for chosen jenis
    const up3Tot = new Map();
    P.data.forEach((p) => { if (!up3Tot.has(p.up3)) up3Tot.set(p.up3, { uid: p.uid, t: 0 }); });
    B.data.forEach((r) => { if (jenis && r.jenis_padam !== jenis) return; const o = up3Tot.get(r.up3); if (o) o.t += Number(r.kali); });
    const up3s = [...up3Tot.entries()].filter(([, o]) => !uid || o.uid === uid).sort((a, b) => a[0].localeCompare(b[0]));
    up3 = up3s.some(([u]) => u === prm.p_up3) ? prm.p_up3 : (up3s.slice().sort((a, b) => b[1].t - a[1].t)[0] || [null])[0];

    // controls
    const su = $('p-f-uid');
    if (!su.options.length) su.replaceChildren(new Option('Semua UID', ''), ...UIDS.map((u) => new Option(ULABEL[u], u)));
    su.value = uid || '';
    $('p-f-up3').replaceChildren(...up3s.map(([u, o]) => new Option(`${u} · ${fmt(o.t)} kali`, u)));
    $('p-f-up3').value = up3 || '';
    const btn = (v, l) => { const b = mk('button', l, 'ss-chip'); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String((jenis || '') === v)); return b; };
    $('p-f-jenis').replaceChildren(btn('', 'Semua'), ...IDX.jenisList.map((j) => btn(j, j)));

    // feeders in UP3
    feeders = P.data.filter((p) => p.up3 === up3).map((p) => { const k = key(p.up3, p.penyulang); const s = series(k, jenis); return { k, p, s, t: IDX.months.reduce((a, m) => a + s[m].t, 0) }; })
      .sort((a, b) => b.t - a.t || a.p.penyulang.localeCompare(b.p.penyulang));
    const selF = feeders.find((f) => f.p.penyulang === prm.p_peny) || feeders[0];
    sel = selF ? selF.k : null;
    $('p-f-peny').replaceChildren(...feeders.map((f) => new Option(`${f.p.penyulang} · ${fmt(f.t)} kali`, f.p.penyulang)));
    $('p-f-peny').value = selF ? selF.p.penyulang : '';

    // summary (seperti ringkasan di tab SAIDI SAIFI ENS)
    {
      const tk = $('p-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const Bb = (s) => { const b = document.createElement('b'); b.textContent = s; return b; };
      const Tt = feeders.reduce((a, f) => a + f.t, 0);
      const wG = feeders.filter((f) => f.t > 0).length;
      const per = `S.d. ${BLN[IDX.months[IDX.months.length - 1] - 1]} 2026`;
      tk.append(`${per}, di UP3 ${up3} `, Bb(`${fmt(wG)} dari ${fmt(feeders.length)} penyulang`), ' mengalami gangguan, total ', Bb(`${fmt(Tt)} kali`), jenis ? ` (${jenis.toLowerCase()}). ` : ' (semua jenis padam). ');
      if (Tt && feeders[0]) {
        const top10 = feeders.slice(0, 10).reduce((a, f) => a + f.t, 0);
        tk.append('Penyulang terbanyak ', Bb(`${feeders[0].p.penyulang} (${fmt(feeders[0].t)} kali)`), '; 10 penyulang teratas menyumbang ', Bb(f1.format(top10 / Tt * 100) + '%'), ' gangguan UP3. ');
      }
      if (selF && selF !== feeders[0] && selF.t) {
        const pk = IDX.months.reduce((a, m) => (selF.s[m].t > selF.s[a].t ? m : a), IDX.months[0]);
        tk.append(`Penyulang ${selF.p.penyulang}: `, Bb(`${fmt(selF.t)} kali`), `, peringkat ${feeders.indexOf(selF) + 1}, tertinggi ${BLNF[pk - 1]} (${fmt(selF.s[pk].t)}).`);
      } else if (selF && selF === feeders[0] && selF.t) {
        const pk = IDX.months.reduce((a, m) => (selF.s[m].t > selF.s[a].t ? m : a), IDX.months[0]);
        tk.append(`Puncaknya di ${BLNF[pk - 1]} `, Bb(`${fmt(selF.s[pk].t)} kali`), '.');
      }
    }

    // peta interaktif
    if (window.SSMAP) {
      const KO = SSD.data('koordinat');
      const nk = (s) => String(s || '').toUpperCase().replace(/^UP3\s+/, '').replace(/[^A-Z]/g, '');
      const ALIAS = { PADANGSIDIMPUAN: 'PADANGSIDEMPUAN', BELITUNG: 'TANJUNGPANDANBELITUNG' };
      const kIdx = new Map(); if (KO.status === 'ok') KO.data.filter((k) => k.level === 'UP3').forEach((k) => { kIdx.set(nk(k.nama), k); kIdx.set(nk(k.unit), k); });
      const findK = (u) => kIdx.get(nk(u)) || kIdx.get(ALIAS[nk(u)]);
      const shown = [...up3Tot.entries()].filter(([u, o]) => (!uid || o.uid === uid) && findK(u));
      const mx = Math.max(1, ...shown.map(([, o]) => o.t));
      const topE = shown.slice().sort((a, b) => b[1].t - a[1].t)[0];
      const uidT = {}; up3Tot.forEach((o) => { if (o.uid) uidT[o.uid] = (uidT[o.uid] || 0) + o.t; }); const umx = Math.max(1, ...Object.values(uidT));
      const pts = shown.map(([u, o]) => { const k = findK(u); return { lon: k.lon, lat: k.lat, r: 3.5 + 8 * Math.sqrt(o.t / mx), color: SSC[0], label: u, selected: u === up3, pulse: !!topE && topE[0] === u && o.t > 0, pulseColor: 'var(--cds-chart-status-critical)', tip: ['UP3 ' + u, [[null, 'Kali gangguan penyulang', fmt(o.t)], [null, 'UID', ULABEL[o.uid] || o.uid || '—']]], onClick: () => dash.setParams({ p_up3: u, p_peny: null }) }; });
      window.SSMAP($('p-map'), { label: 'Peta UP3', focus: uid, fill: (r) => `color-mix(in srgb, ${SSC[0]} ${Math.round(6 + 30 * ((uidT[r] || 0) / umx))}%, var(--color-panel))`, regionTip: (r, prov) => [ULABEL[r] || r, [[null, prov, ''], [null, 'Kali gangguan penyulang', fmt(uidT[r] || 0)]]], onRegion: (r) => dash.setParams({ p_uid: uid === r ? null : r, p_up3: null, p_peny: null }), points: pts });
      $('p-map-note').textContent = topE && topE[1].t ? `Ukuran titik: kali gangguan penyulang per UP3${jenis ? ' (' + jenis.toLowerCase() + ')' : ''}. Titik berdenyut: capaian tertinggi${uid ? ' di ' + (ULABEL[uid] || uid) : ''}${jenis ? ' untuk ' + jenis.toLowerCase() : ''}, UP3 ${topE[0]} (${fmt(topE[1].t)} kali). Klik titik untuk memilih UP3, klik wilayah untuk memilih UID.` : '';
    }

    // tiles
    const inDb = feeders.filter((f) => f.p.di_database === 'Ya').length;
    const withG = feeders.filter((f) => f.t > 0);
    const T = feeders.reduce((a, f) => a + f.t, 0);
    const done = (id, t) => { const e = $(id); e.textContent = t; e.classList.remove('dash-skeleton'); };
    $('p-t1-l').textContent = `Penyulang di UP3 ${up3}`;
    done('p-t1', fmt(feeders.length)); $('p-t1-sub').textContent = `${fmt(inDb)} di database penyulang` + (feeders.length - inDb ? ` · ${fmt(feeders.length - inDb)} hanya ada di data gangguan` : '');
    done('p-t2', fmt(withG.length)); $('p-t2-sub').textContent = feeders.length ? `${f1.format(withG.length / feeders.length * 100)}% dari penyulang UP3` : '';
    done('p-t3', fmt(T)); $('p-t3-sub').textContent = `${BLN[IDX.months[0] - 1]}–${BLN[IDX.months[IDX.months.length - 1] - 1]} 2026` + (jenis ? ' · ' + jenis.toLowerCase() : ' · semua jenis padam');
    const top = feeders[0];
    done('p-t4', top ? fmt(top.t) : '—'); $('p-t4-name').textContent = top ? top.p.penyulang : ''; $('p-t4-sub').textContent = top ? (top.p.ulp || '') : '';

    // profile
    const dl = $('p-profil'); dl.replaceChildren();
    if (selF) {
      const p = selF.p, w = `up3=${enc(p.up3)}&penyulang=${enc(p.penyulang)}`;
      const row = (label, val, field, cls) => {
        const dd = mk('dd', val == null || val === '' ? '—' : String(val), cls);
        if (field) { dd.setAttribute('data-source', 'peny_profil'); dd.setAttribute('data-field', field); dd.setAttribute('data-where', w); }
        dl.append(mk('dt', label), dd); return dd;
      };
      const nm = row('Penyulang', p.penyulang, 'penyulang', 'ss-p-name');
      if (p.di_database !== 'Ya') { nm.append(mk('span', 'tidak ada di database penyulang', 'ss-p-flag')); }
      row('UP3 · UID', `${p.up3}${p.uid ? ' · ' + (ULABEL[p.uid] || p.uid) : ''}`);
      row('ULP', p.ulp, 'ulp');
      if (p.di_database === 'Ya') {
        row('Jenis', p.jenis, 'jenis'); row('Tipe', p.tipe, 'tipe'); row('Kepemilikan', p.kepemilikan, 'kepemilikan');
        row('Status', p.status, 'status'); row('Tahun buat', p.tahun_buat, 'tahun_buat');
        row('Koordinat', p.lat !== '' && p.lat != null ? `${p.lat}, ${p.lon}` : '');
      }
      const s = selF.s; const perm = IDX.months.reduce((a, m) => a + s[m].Permanen, 0), ses = IDX.months.reduce((a, m) => a + s[m].Sesaat, 0);
      const pk = IDX.months.reduce((a, m) => (s[m].t > s[a].t ? m : a), IDX.months[0]);
      row('Total kali gangguan', `${fmt(selF.t)} kali (${fmt(perm)} permanen · ${fmt(ses)} sesaat)`);
      row('Rata-rata per bulan', `${f1.format(selF.t / IDX.months.length)} kali`);
      row('Bulan tertinggi', selF.t ? `${BLNF[pk - 1]} · ${fmt(s[pk].t)} kali` : '—');
      const rank = feeders.indexOf(selF) + 1;
      row('Peringkat di UP3', selF.t ? `${rank} dari ${fmt(feeders.length)} penyulang` : '—');
    }

    // chart
    $('p-chart-h').textContent = selF ? `Kali gangguan per bulan · ${selF.p.penyulang}` : 'Kali gangguan per bulan';
    $('p-chart-note').textContent = `${jenis ? jenis : 'Semua jenis padam'}, No. Laporan unik. Garis putus-putus: rata-rata per penyulang di UP3 ${up3}.`;
    const C = [['Permanen', SSC[0]], ['Sesaat', SSC[1]]];
    const lg = $('p-legend'); lg.replaceChildren(...C.map(([n, c]) => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = c; s.append(i, n); return s; }),
      (() => { const s = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = 'transparent'; i.style.borderTop = '2px dashed var(--cds-chart-reference)'; i.style.height = '0'; s.append(i, 'Rata-rata UP3'); return s; })());
    chart.classList.remove('dash-skeleton'); chart.replaceChildren();
    if (selF) {
      const data = IDX.months.map((m) => ({ m, Permanen: selF.s[m].Permanen, Sesaat: selF.s[m].Sesaat, t: selF.s[m].t, avg: feeders.length ? feeders.reduce((a, f) => a + f.s[m].t, 0) / feeders.length : 0 }));
      const W = Math.max(280, chart.clientWidth), H = 300, mg = { t: 22, r: 8, b: 26, l: 30 };
      const svg = d3.select(chart).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Kali gangguan per bulan ' + selF.p.penyulang);
      const y = d3.scaleLinear([0, Math.max(1, d3.max(data, (d) => Math.max(d.t, d.avg))) * 1.12], [H - mg.b, mg.t]).nice();
      const yt = y.ticks(5).filter((v) => Number.isInteger(v));
      const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(fmt(yt[yt.length - 1] || 0));
      mg.l = Math.ceil(probe.node().getComputedTextLength()) + 12; probe.remove();
      const x = d3.scaleBand(IDX.months, [mg.l, W - mg.r]).padding(0.3);
      svg.append('g').selectAll('line').data(yt).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('g').selectAll('text').data(yt).join('text').attr('x', mg.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
      svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
      svg.append('g').selectAll('text').data(IDX.months).join('text').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', H - 7).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((d) => BLN[d - 1]);
      const bw = Math.min(x.bandwidth(), 32), off = (x.bandwidth() - bw) / 2;
      const st = d3.stack().keys(C.map((c) => c[0]))(data);
      const gb = svg.append('g');
      st.forEach((layer, li) => gb.append('g').selectAll('rect').data(layer).join('rect').attr('x', (d) => x(d.data.m) + off).attr('width', bw).attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1]))).attr('fill', C[li][1]).attr('rx', li === st.length - 1 ? 3 : 0).attr('data-m', (d) => d.data.m));
      svg.append('path').attr('d', d3.line().x((d) => x(d.m) + x.bandwidth() / 2).y((d) => y(d.avg))(data)).attr('fill', 'none').attr('stroke', 'var(--cds-chart-reference)').attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4');
      if (x.bandwidth() >= 22) svg.append('g').selectAll('text').data(data.filter((d) => d.t > 0)).join('text').attr('x', (d) => x(d.m) + x.bandwidth() / 2).attr('y', (d) => y(d.t) - 6).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg)').style('font-size', 'var(--cds-font-size-caption)').text((d) => fmt(d.t));
      chart.append(tip);
      svg.append('g').selectAll('rect').data(data).join('rect').attr('x', (d) => x(d.m)).attr('width', x.bandwidth()).attr('y', mg.t).attr('height', H - mg.t - mg.b).attr('fill', 'transparent')
        .on('pointerenter pointermove', (ev, d) => {
          gb.selectAll('rect').attr('opacity', function () { return Number(this.dataset.m) === d.m ? 1 : 0.35; });
          tip.replaceChildren(mk('div', BLNF[d.m - 1] + ' 2026', 'ss-tip-h'));
          [[C[0][1], 'Permanen', fmt(d.Permanen)], [C[1][1], 'Sesaat', fmt(d.Sesaat)], [null, 'Total', fmt(d.t)], [null, 'Rata-rata UP3', f1.format(d.avg)]].forEach(([c, n, v]) => {
            const r = mk('div', null, 'ss-row'); const a = mk('span'); if (c) { const i = mk('i', null, 'ss-sw'); i.style.background = c; a.append(i); } a.append(n); const b = mk('span', v); if (n === 'Total') b.style.fontWeight = 600; r.append(a, b); tip.append(r);
          });
          tip.hidden = false;
          const sc = chart.clientWidth / W, cx = (x(d.m) + x.bandwidth() / 2) * sc, tw = tip.offsetWidth;
          tip.style.left = (cx + 14 + tw > chart.clientWidth ? Math.max(0, cx - tw - 14) : cx + 14) + 'px';
          tip.style.top = Math.max(0, y(Math.max(d.t, d.avg)) * sc - 10) + 'px';
        })
        .on('pointerleave', () => { tip.hidden = true; gb.selectAll('rect').attr('opacity', 1); });
    }
    drawTable();
  });
})();
