// Tab Kecelakaan K3L (Bulanan): papan kecelakaan Master Data RSD SUMKAL 2021–2026 (dataset k3_kejadian).
// Menu, halaman dan gaya dibuat dari script ini; index.html hanya memuat script dan mendaftarkan 'k3' di TABS.
(() => {
  if (document.getElementById('k3')) return;
  const SRC = 'k3_kejadian';
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const f0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const f1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fInt = (v) => f0.format(v);
  const fPct = (v) => f1.format(v * 100) + '%';
  const fPct0 = (v) => f0.format(v * 100) + '%';
  const fDate = (s, yr) => { const d = new Date(s + 'T00:00:00Z'); return d.getUTCDate() + ' ' + BLN[d.getUTCMonth()] + (yr ? ' ' + d.getUTCFullYear() : ''); };

  // ---------- gaya (khusus halaman ini) ----------
  const st = document.createElement('style');
  st.textContent = `
#k3 .k3b{--bg:#1d1b47;--card:#282b5e;--cy:#58c8f5;--ye:#e8c35a;--gr:#4ade80;--rd:#ef5b5b;--tx:#fff;--mu:rgba(255,255,255,.72);--gl:rgba(255,255,255,.12);
  background:var(--bg);color:var(--tx);border-radius:18px;padding:clamp(10px,1.6vw,22px);font-family:inherit;}
#k3 .k3b *{box-sizing:border-box;}
#k3 .k3-board{display:grid;gap:clamp(8px,1vw,14px);grid-template-columns:repeat(6,minmax(0,1fr));grid-template-areas:"a a b b c c" "d e f f c c" "d e g g h h";}
#k3 .k3-t{background:var(--card);border-radius:10px;padding:clamp(12px,1.3vw,20px);min-width:0;position:relative;display:flex;flex-direction:column;}
#k3 .k3-a{grid-area:a;justify-content:center}#k3 .k3-bb{grid-area:b}#k3 .k3-c{grid-area:c}#k3 .k3-d{grid-area:d}#k3 .k3-e{grid-area:e}#k3 .k3-f{grid-area:f}#k3 .k3-g{grid-area:g}#k3 .k3-h{grid-area:h}
#k3 .k3b h2{font-size:1.15rem;font-weight:600;margin:0 0 .4rem;color:var(--tx);}
#k3 .k3-huge{font-size:clamp(3.2rem,6vw,5.4rem);font-weight:700;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
#k3 .k3-big{font-size:clamp(2.4rem,4vw,3.6rem);font-weight:700;line-height:1;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
#k3 .k3-mid{font-size:clamp(1.9rem,3vw,2.8rem);font-weight:700;line-height:1;font-variant-numeric:tabular-nums;}
#k3 .k3-unit{font-size:.45em;font-weight:600;margin-left:.08em;}
#k3 .k3-cap{font-size:clamp(1rem,1.5vw,1.35rem);margin-top:.35rem;}
#k3 .k3-sm{font-size:.9rem;color:var(--mu);margin-top:.3rem;}
#k3 .k3-delta{font-size:1.1rem;margin-top:.6rem;color:var(--mu);}
#k3 .k3-delta b,#k3 .k3-sm b{font-weight:700;font-variant-numeric:tabular-nums;}
#k3 .k3-good{color:var(--gr)!important;} #k3 .k3-bad{color:var(--rd)!important;}
#k3 .k3-pair{display:grid;grid-template-columns:1fr 1fr;gap:1rem;flex:1;align-items:center;}
#k3 .k3-stack{display:flex;flex-direction:column;justify-content:space-between;gap:1rem;flex:1;}
#k3 .k3-alert{border:1px solid rgba(239,91,91,.55);background:rgba(239,91,91,.12);border-radius:6px;padding:.8rem;position:relative;margin-top:auto;}
#k3 .k3-badge{position:absolute;right:-12px;bottom:-12px;width:34px;height:34px;border-radius:50%;background:var(--rd);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.25rem;box-shadow:0 0 0 3px var(--bg);}
#k3 .k3-leg{display:flex;gap:.9rem;justify-content:flex-end;font-size:.85rem;color:var(--mu);margin-bottom:.2rem;flex-wrap:wrap;}
#k3 .k3-dot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;margin-right:.3rem;vertical-align:middle;}
#k3 .k3-dcy{background:var(--cy);} #k3 .k3-dye{background:var(--ye);}
#k3 .k3-chart{position:relative;min-height:200px;flex:1;}
#k3 .k3-chart.hi{min-height:280px;}
#k3 .k3-chart svg{display:block;overflow:visible;}
#k3 .k3-list{display:flex;flex-direction:column;gap:.55rem;}
#k3 .k3-li .r{display:flex;justify-content:space-between;gap:.5rem;font-size:1rem;}
#k3 .k3-li .r span:last-child{font-variant-numeric:tabular-nums;}
#k3 .k3-li .bar{height:5px;background:var(--cy);border-radius:3px;margin-top:4px;}
#k3 .k3-tip{position:absolute;pointer-events:none;background:#12112e;border:1px solid rgba(255,255,255,.18);border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.4);padding:6px 9px;font-size:.8rem;white-space:nowrap;z-index:3;color:var(--tx);}
#k3 .k3-tip .tt{color:var(--mu);margin-bottom:2px;}
#k3 .k3-tip b{font-weight:600;font-variant-numeric:tabular-nums;}
#k3 .k3-tip .sw{display:inline-block;width:.5rem;height:.5rem;border-radius:50%;margin-right:.3rem;}
#k3 .k3-foot{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:clamp(10px,1.2vw,18px);flex-wrap:wrap;}
#k3 .k3-brand{display:flex;align-items:center;gap:.6rem;font-size:1.35rem;}
#k3 .k3-logo{width:26px;height:26px;border-radius:6px;background:var(--gr);display:inline-flex;align-items:center;justify-content:center;color:var(--bg);font-weight:800;font-size:.85rem;}
#k3 .k3-brand small{font-size:.85rem;color:var(--mu);}
#k3 .k3-stamp{font-size:clamp(1.1rem,2vw,1.6rem);font-variant-numeric:tabular-nums;}
#k3 .k3-stamp small{font-size:.8rem;color:var(--mu);margin-right:.4rem;}
#k3 .k3b h3{font-size:1.25rem;font-weight:600;margin:clamp(18px,2vw,28px) 0 .7rem;color:var(--tx);}
#k3 .k3-eval{display:grid;gap:clamp(8px,1vw,14px);grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));}
#k3 .k3-eval p{margin:0;color:var(--mu);line-height:1.5;}
#k3 .k3-eval p b{color:var(--tx);font-weight:700;font-variant-numeric:tabular-nums;}
#k3 .k3-eval h4{margin:0 0 .4rem;font-size:1rem;font-weight:600;color:var(--tx);}
#k3 .k3-two{display:grid;gap:clamp(8px,1vw,14px);grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));margin-top:clamp(8px,1vw,14px);}
#k3 ol.k3-rec{margin:0;padding-left:1.2rem;line-height:1.55;color:var(--mu);}
#k3 ol.k3-rec b{color:var(--tx);}
#k3 ol.k3-rec li{margin-bottom:.4rem;}
#k3 ul.k3-dq{margin:0;padding-left:1.2rem;color:var(--mu);font-size:.85rem;line-height:1.6;}
#k3 .k3-empty{color:var(--mu);font-size:.9rem;padding:1rem 0;}
@media (max-width:1000px){#k3 .k3-board{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"a a" "b b" "d e" "f f" "g g" "c c" "h h";}}
@media (max-width:560px){#k3 .k3-board{grid-template-columns:minmax(0,1fr);grid-template-areas:"a" "b" "d" "e" "f" "g" "c" "h";} #k3 .k3-pair{grid-template-columns:1fr;}}
`;
  document.head.appendChild(st);

  // ---------- menu: Bulanan → Kecelakaan K3L ----------
  const pop = $('mg-bulanan');
  if (pop) {
    const b = mk('button', 'ss-tab');
    b.type = 'button'; b.id = 'tab-k3'; b.dataset.tabTo = 'k3'; b.setAttribute('role', 'menuitem');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/></svg><span class="ss-tab-t"><b>Kecelakaan K3L</b><small>Papan kecelakaan Master Data RSD</small></span>';
    pop.appendChild(b);
  }

  // ---------- halaman ----------
  const sec = mk('section', 'ss-sec');
  sec.id = 'k3'; sec.dataset.tab = 'k3'; sec.hidden = true;
  sec.innerHTML = `
<div class="k3b" data-source="${SRC}">
  <div class="k3-board">
    <section class="k3-t k3-a"><div class="k3-huge" id="k3-md">—</div><div class="k3-cap">korban meninggal dunia tahun ini</div><div class="k3-delta"><b id="k3-md-d">—</b> v periode sama <span class="k3-ly">—</span></div></section>
    <section class="k3-t k3-bb"><h2>Kejadian tahun ini</h2><div class="k3-pair">
      <div><div class="k3-big" id="k3-n">—</div><div class="k3-cap">kejadian</div><div class="k3-delta"><b id="k3-n-d">—</b> v <span class="k3-ly">—</span></div></div>
      <div><div class="k3-big"><span id="k3-fq">—</span><span class="k3-unit">hari</span></div><div class="k3-cap">frekuensi</div><div class="k3-sm">rata-rata jarak antar kejadian</div></div></div></section>
    <section class="k3-t k3-c"><h2>Tren kejadian (1 Jan s.d. <span id="k3-batas">—</span>)</h2><div class="k3-leg"><span><i class="k3-dot k3-dcy"></i>Kejadian</span><span><i class="k3-dot k3-dye"></i>Meninggal dunia</span></div><div class="k3-chart hi" id="k3-c-tren"></div></section>
    <section class="k3-t k3-d"><h2>Korban</h2><div class="k3-stack">
      <div><div class="k3-big" id="k3-kb">—</div><div class="k3-cap">total korban</div></div>
      <div><div class="k3-mid" id="k3-lr">—</div><div class="k3-sm">luka ringan</div></div>
      <div class="k3-alert"><div class="k3-mid" id="k3-lb">—</div><div class="k3-cap">luka berat</div><span class="k3-badge" aria-hidden="true">!</span></div></div></section>
    <section class="k3-t k3-e"><h2>Jenis kecelakaan</h2><div class="k3-stack">
      <div><div class="k3-big" id="k3-um">—</div><div class="k3-cap">kecelakaan umum</div></div>
      <div><div class="k3-mid" id="k3-pk">—</div><div class="k3-sm">porsi kecelakaan kerja</div></div>
      <div class="k3-alert"><div class="k3-mid" id="k3-kj">—</div><div class="k3-sm">kecelakaan kerja · <b id="k3-kj-d">—</b> v <span class="k3-ly">—</span></div><span class="k3-badge" aria-hidden="true">!</span></div></div></section>
    <section class="k3-t k3-f"><h2>per bulan</h2><div class="k3-leg"><span><i class="k3-dot k3-dcy"></i>Tanpa korban meninggal</span><span><i class="k3-dot k3-dye"></i>Ada korban meninggal</span></div><div class="k3-chart" id="k3-c-bulan"></div></section>
    <section class="k3-t k3-g"><h2>Lokasi kejadian (unit induk)</h2><div class="k3-list" id="k3-l-unit"></div></section>
    <section class="k3-t k3-h"><h2>Fatalitas &amp; kecelakaan kerja</h2><div class="k3-leg"><span><i class="k3-dot k3-dcy"></i>% korban meninggal</span><span><i class="k3-dot k3-dye"></i>% kecelakaan kerja</span></div><div class="k3-chart" id="k3-c-porsi"></div></section>
  </div>
  <div class="k3-foot"><div class="k3-brand"><span class="k3-logo">K3</span>K3L SUMKAL <small>Monitoring kecelakaan · Master Data RSD <span id="k3-rng">—</span></small></div><div class="k3-stamp"><small>data s.d.</small><span id="k3-asof">—</span></div></div>

  <h3>Evaluasi <span id="k3-rng2">—</span></h3>
  <div class="k3-eval">
    <div class="k3-t"><h4>Tren jumlah kejadian</h4><p id="k3-e1">—</p></div>
    <div class="k3-t"><h4>Fatalitas</h4><p id="k3-e2">—</p></div>
    <div class="k3-t"><h4>Tersengat listrik penyebab utama</h4><p id="k3-e3">—</p></div>
    <div class="k3-t"><h4>Porsi kecelakaan kerja</h4><p id="k3-e4">—</p></div>
    <div class="k3-t"><h4>Konsentrasi wilayah</h4><p id="k3-e5">—</p></div>
    <div class="k3-t"><h4>Bulan paling rawan</h4><p id="k3-e6">—</p></div>
  </div>
  <div class="k3-two">
    <section class="k3-t"><h2>Penyebab kejadian <span id="k3-rng3">—</span></h2><div class="k3-list" id="k3-l-peny"></div></section>
    <section class="k3-t"><h2>Rekomendasi</h2><ol class="k3-rec">
      <li><b>Fokus pada jaringan TM:</b> inspeksi jarak aman (andongan, ROW) terhadap bangunan, baliho dan pohon, plus sosialisasi bahaya listrik ke tukang bangunan, pemasang tenda/baliho, pekebun dan vendor telekomunikasi.</li>
      <li><b>Prioritaskan unit dengan kejadian tertinggi</b> untuk patroli, rambu bahaya dan koordinasi dengan pemda.</li>
      <li><b>Perkuat K3 internal:</b> safety briefing, pengawasan pekerjaan ROW/penebangan dan keselamatan berkendara bagi yantek dan mitra.</li>
      <li><b>Turunkan fatalitas:</b> kesiapan P3K dan pelatihan pertolongan korban sengatan listrik.</li>
      <li><b>Kampanye awal tahun</b> menjelang bulan-bulan puncak kejadian.</li>
      <li><b>Rapikan pencatatan:</b> tanggal kejadian wajib, klasifikasi rinci (TM/TR/SR) dan nama unit dari dropdown.</li></ol></section>
  </div>
  <div class="k3-two"><section class="k3-t"><h2>Catatan data</h2><ul class="k3-dq">
    <li>Sumber: sheet Master Data RSD per tahun di file Monitoring K3L SUMKAL, digabung; satu baris = satu kejadian, tahun mengikuti sheet asal.</li>
    <li>"Tahun ini" = tahun data terakhir s.d. tanggal kejadian terakhirnya, dibanding periode yang sama tahun sebelumnya.</li>
    <li>Nama unit diseragamkan; isian korban "-"/kosong dihitung 0; kejadian tanpa tanggal kejadian memakai tanggal input.</li>
    <li>Frekuensi = jumlah hari sejak 1 Januari sampai kejadian terakhir dibagi jumlah kejadian.</li></ul></section></div>
</div>`;
  const anchor = $('workplan') || document.querySelector('#ss-shell .ss-sec:last-of-type');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
  else (document.querySelector('#ss-shell .ss-main') || document.body).appendChild(sec);

  // ---------- hitung ----------
  function hitung(raw) {
    const rows = raw.map((r) => ({ tahun: +r.tahun, tanggal: String(r.tanggal).slice(0, 10), bulan: +r.bulan, unit: r.unit_induk, up3: r.unit_pelaksana, jenis: r.jenis, peny: r.penyebab, lr: +r.luka_ringan, lb: +r.luka_berat, md: +r.meninggal, kb: +r.total_korban }));
    const th = d3.max(rows, (r) => r.tahun);
    const batas = rows.filter((r) => r.tahun === th).map((r) => r.tanggal).sort().pop();
    const md5 = batas.slice(5);
    const rek = (list) => { const o = { n: 0, umum: 0, kerja: 0, lr: 0, lb: 0, md: 0, kb: 0 }; for (const r of list) { o.n++; if (r.jenis === 'Kecelakaan Umum') o.umum++; else if (r.jenis === 'Kecelakaan Kerja') o.kerja++; o.lr += r.lr; o.lb += r.lb; o.md += r.md; o.kb += r.kb; } return o; };
    const ytdOf = (t) => rows.filter((r) => r.tahun === t && r.tanggal.slice(5) <= md5);
    const a = rek(ytdOf(th)), b = rek(ytdOf(th - 1));
    const hari = (Date.parse(batas) - Date.parse(th + '-01-01')) / 864e5 + 1;
    const years = [...new Set(rows.map((r) => r.tahun))].sort((x, y) => x - y);
    const tren = years.map((t) => { const o = rek(ytdOf(t)); return { tahun: t, kejadian: o.n, meninggal: o.md, korban: o.kb }; });
    const perTahun = years.map((t) => { const o = rek(rows.filter((r) => r.tahun === t)); return { tahun: t, ...o, pct_md: o.kb ? o.md / o.kb : 0, pct_kerja: o.n ? o.kerja / o.n : 0 }; });
    const ini = rows.filter((r) => r.tahun === th);
    const mAkhir = d3.max(ini, (r) => r.bulan);
    const bulan = d3.range(1, mAkhir + 1).map((m) => ({ bulan: m, tanpa: ini.filter((r) => r.bulan === m && r.md === 0).length, ada: ini.filter((r) => r.bulan === m && r.md > 0).length }));
    const cnt = (list, key) => [...d3.rollup(list, (v) => ({ n: v.length, md: d3.sum(v, (r) => r.md) }), (r) => r[key])].map(([k, v]) => ({ k, ...v })).sort((x, y) => y.n - x.n || y.md - x.md);
    const unitIni = cnt(ini, 'unit');
    const peny = cnt(rows, 'peny');
    const unitAll = cnt(rows, 'unit');
    const up3All = cnt(rows, 'up3');
    const blnAll = cnt(rows, 'bulan');
    const tot = rows.length;
    return { th, batas, a, b, hari, tren, perTahun, bulan, unitIni, peny, unitAll, up3All, blnAll, tot, years, umumAll: rows.filter((r) => r.jenis === 'Kecelakaan Umum').length };
  }

  // ---------- grafik ----------
  const css = (n) => getComputedStyle(sec.querySelector('.k3b')).getPropertyValue(n).trim();
  function tipFor(el) {
    const t = mk('div', 'k3-tip'); t.hidden = true; el.appendChild(t);
    return {
      show(ev, title, lines) {
        t.replaceChildren(mk('div', 'tt', title));
        for (const [c, l, v] of lines) { const d = mk('div'); if (c) { const s = mk('span', 'sw'); s.style.background = c; d.appendChild(s); } d.append(l + ': ', mk('b', null, v)); t.appendChild(d); }
        t.hidden = false;
        const r = el.getBoundingClientRect(); let x = ev.clientX - r.left + 12, y = ev.clientY - r.top + 12;
        if (x + t.offsetWidth > r.width) x = Math.max(0, ev.clientX - r.left - t.offsetWidth - 12);
        if (y + t.offsetHeight > r.height) y = Math.max(0, ev.clientY - r.top - t.offsetHeight - 12);
        t.style.left = x + 'px'; t.style.top = y + 'px';
      },
      hide() { t.hidden = true; },
    };
  }
  const measure = (svg, texts) => { const p = svg.append('text').style('font-size', '13px'); let m = 0; for (const s of texts) { p.text(s); m = Math.max(m, p.node().getComputedTextLength()); } p.remove(); return m; };
  function frame(el, minH) {
    el.replaceChildren();
    const W = Math.max(240, el.clientWidth), H = Math.max(minH, Math.min(el.clientHeight || minH, 420));
    return { W, H, svg: d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`) };
  }
  function gridY(svg, y, ticks, W, fmt) {
    svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', 0).attr('x2', W).attr('y1', y).attr('y2', y).style('stroke', 'var(--gl)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', 0).attr('y', (d) => y(d) - 5).style('font-size', '13px').style('fill', 'var(--mu)').text(fmt);
  }
  function lines(el, rows, o) {
    const { W, H, svg } = frame(el, 200);
    const y = d3.scaleLinear([0, o.yMax || d3.max(rows, (r) => d3.max(o.series, (s) => r[s.key])) || 1], [H - 26, 18]).nice();
    const ticks = y.ticks(5); gridY(svg, y, ticks, W, o.yFmt);
    const ml = measure(svg, ticks.map(o.yFmt)) + 14;
    const x = d3.scalePoint(rows.map((r) => r[o.x]), [ml + 14, W - 14]);
    svg.append('g').selectAll('text').data(rows).join('text').attr('x', (r) => x(r[o.x])).attr('y', H - 6).attr('text-anchor', 'middle').style('font-size', '13px').style('fill', 'var(--tx)').text(o.xLabel);
    for (const s of o.series) {
      svg.append('path').datum(rows).attr('d', d3.line().x((r) => x(r[o.x])).y((r) => y(r[s.key]))).style('fill', 'none').style('stroke', s.color).style('stroke-width', 2.5).style('stroke-linejoin', 'round').style('stroke-linecap', 'round');
      svg.append('g').selectAll('circle').data(rows).join('circle').attr('cx', (r) => x(r[o.x])).attr('cy', (r) => y(r[s.key])).attr('r', 3).style('fill', s.color);
    }
    const tip = tipFor(el); const step = rows.length > 1 ? x.step() : W;
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r[o.x]) - step / 2).attr('width', step).attr('height', H - 26).style('fill', 'transparent')
      .on('mousemove', (ev, r) => tip.show(ev, o.tipTitle(r), o.tipLines(r))).on('mouseleave', () => tip.hide());
  }
  function gbars(el, rows, o) {
    const { W, H, svg } = frame(el, 200);
    const y = d3.scaleLinear([0, d3.max(rows, (r) => d3.max(o.series, (s) => r[s.key])) || 1], [H - 26, 18]).nice();
    const ticks = y.ticks(3).filter(Number.isInteger); gridY(svg, y, ticks, W, fInt);
    const x = d3.scaleBand(rows.map((r) => r[o.x]), [measure(svg, ticks.map(fInt)) + 10, W]).padding(0.3);
    const x1 = d3.scaleBand(o.series.map((s) => s.key), [0, x.bandwidth()]).padding(0.08);
    const bw = Math.min(x1.bandwidth(), 22), off = (x1.bandwidth() - bw) / 2;
    const g = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', (r) => `translate(${x(r[o.x])},0)`);
    for (const s of o.series) g.append('rect').attr('x', x1(s.key) + off).attr('width', bw).attr('y', (r) => y(r[s.key])).attr('height', (r) => Math.max(0, y(0) - y(r[s.key]))).style('fill', s.color);
    const lw = measure(svg, rows.map(o.xLabel)) + 6, every = Math.max(1, Math.ceil(lw / x.step()));
    svg.append('g').selectAll('text').data(rows).join('text').attr('x', (r) => x(r[o.x]) + x.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').style('font-size', '13px').style('fill', 'var(--tx)').text((r, i) => (i % every ? '' : o.xLabel(r)));
    const tip = tipFor(el);
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r[o.x]) - (x.step() * x.paddingInner()) / 2).attr('width', x.step()).attr('height', H - 26).style('fill', 'transparent')
      .on('mousemove', (ev, r) => tip.show(ev, o.tipTitle(r), o.tipLines(r))).on('mouseleave', () => tip.hide());
  }
  function list(el, rows, color) {
    el.replaceChildren();
    const max = d3.max(rows, (r) => r.n) || 1;
    for (const r of rows) {
      const li = mk('div', 'k3-li'), row = mk('div', 'r');
      row.append(mk('span', null, r.k), mk('span', null, fInt(r.n)));
      const bar = mk('div', 'bar'); bar.style.width = (100 * r.n) / max + '%'; if (color) bar.style.background = color(r);
      li.append(row, bar); el.appendChild(li);
    }
  }
  const set = (id, text) => { const e = $(id); if (e) e.textContent = text; };
  const arrow = (id, v, goodDown) => {
    const e = $(id); if (!e) return;
    e.classList.remove('k3-good', 'k3-bad');
    if (v == null || !isFinite(v)) { e.textContent = '—'; return; }
    e.textContent = (v < 0 ? '▼ ' : '▲ ') + fPct(Math.abs(v));
    if (v !== 0) e.classList.add((v < 0) === goodDown ? 'k3-good' : 'k3-bad');
  };
  const para = (id, parts) => { const e = $(id); if (!e) return; e.replaceChildren(...parts.map((p) => (Array.isArray(p) ? mk('b', null, p[0]) : document.createTextNode(p)))); };
  const ch = (a, b) => (b ? a / b - 1 : null);

  // ---------- gambar ----------
  let lastW = 0;
  function render(force) {
    if (sec.hidden) return;
    const d = dash.data(SRC);
    if (!d || d.status !== 'ok' || !d.data || !d.data.length) {
      const box = sec.querySelector('.k3-board');
      if (d && d.status === 'error' && box && !sec.querySelector('.k3-empty')) box.before(mk('p', 'k3-empty', 'Data kecelakaan belum bisa dimuat.'));
      return;
    }
    const w = sec.clientWidth; if (!force && w === lastW && sec.dataset.drawn) return; lastW = w;
    const D = hitung(d.data), CY = css('--cy'), YE = css('--ye');
    const ly = String(D.th - 1);
    sec.querySelectorAll('.k3-ly').forEach((e) => { e.textContent = ly; });
    set('k3-md', fInt(D.a.md)); arrow('k3-md-d', ch(D.a.md, D.b.md), true);
    set('k3-n', fInt(D.a.n)); arrow('k3-n-d', ch(D.a.n, D.b.n), true);
    set('k3-fq', f1.format(D.hari / D.a.n));
    set('k3-batas', fDate(D.batas)); set('k3-asof', fDate(D.batas, true));
    set('k3-kb', fInt(D.a.kb)); set('k3-lr', fInt(D.a.lr)); set('k3-lb', fInt(D.a.lb));
    set('k3-um', fInt(D.a.umum)); set('k3-pk', fPct0(D.a.n ? D.a.kerja / D.a.n : 0)); set('k3-kj', fInt(D.a.kerja)); arrow('k3-kj-d', ch(D.a.kerja, D.b.kerja), true);
    const rng = D.years[0] + '–' + D.th; ['k3-rng', 'k3-rng2', 'k3-rng3'].forEach((i) => set(i, rng));

    lines($('k3-c-tren'), D.tren, { x: 'tahun', xLabel: (r) => String(r.tahun), yFmt: fInt,
      series: [{ key: 'kejadian', color: CY }, { key: 'meninggal', color: YE }],
      tipTitle: (r) => r.tahun + ' (1 Jan–' + fDate(D.batas) + ')',
      tipLines: (r) => [[CY, 'Kejadian', fInt(r.kejadian)], [YE, 'Meninggal', fInt(r.meninggal)], [null, 'Total korban', fInt(r.korban)]] });
    gbars($('k3-c-bulan'), D.bulan, { x: 'bulan', xLabel: (r) => BLN[r.bulan - 1],
      series: [{ key: 'tanpa', color: CY }, { key: 'ada', color: YE }],
      tipTitle: (r) => BULAN[r.bulan - 1] + ' ' + D.th,
      tipLines: (r) => [[CY, 'Tanpa korban meninggal', fInt(r.tanpa)], [YE, 'Ada korban meninggal', fInt(r.ada)]] });
    lines($('k3-c-porsi'), D.perTahun, { x: 'tahun', xLabel: (r) => r.tahun + (r.tahun === D.th ? '*' : ''), yMax: 1, yFmt: fPct0,
      series: [{ key: 'pct_md', color: CY }, { key: 'pct_kerja', color: YE }],
      tipTitle: (r) => String(r.tahun) + (r.tahun === D.th ? ' (s.d. ' + fDate(D.batas) + ')' : ''),
      tipLines: (r) => [[CY, '% korban meninggal', fPct(r.pct_md)], [YE, '% kecelakaan kerja', fPct(r.pct_kerja)]] });
    const top = D.unitIni.slice(0, 6), rest = D.unitIni.slice(6);
    list($('k3-l-unit'), rest.length ? [...top, { k: `Lainnya (${rest.length} unit)`, n: d3.sum(rest, (r) => r.n), md: d3.sum(rest, (r) => r.md) }] : top);
    list($('k3-l-peny'), D.peny, (r) => (String(r.k).startsWith('Tersengat') ? CY : YE));

    // evaluasi
    const pt = (t) => D.perTahun.find((r) => r.tahun === t);
    const y0 = D.perTahun[0], yF = D.perTahun.filter((r) => r.tahun < D.th).pop() || y0;
    const laju = yF.tahun > y0.tahun ? Math.pow(yF.n / y0.n, 1 / (yF.tahun - y0.tahun)) - 1 : 0;
    para('k3-e1', ['Dari ', [fInt(y0.n)], ` kejadian (${y0.tahun}) menjadi `, [fInt(yF.n)], ` (${yF.tahun}), rata-rata `, [(laju >= 0 ? '+' : '') + fPct(laju)], ' per tahun. Periode yang sama ' + D.th + ': ', [fInt(D.a.n)], ' kejadian, dibanding ', [fInt(D.b.n)], ' pada ' + ly + '.']);
    para('k3-e2', ['Porsi korban meninggal ', [fPct(y0.pct_md)], ` pada ${y0.tahun} dan `, [fPct(yF.pct_md)], ` pada ${yF.tahun}. Sekitar separuh korban meninggal dunia setiap tahun.`]);
    const ters = d3.sum(D.peny.filter((r) => String(r.k).startsWith('Tersengat')), (r) => r.n);
    const tm = (D.peny.find((r) => r.k === 'Tersengat TM') || { n: 0 }).n;
    para('k3-e3', ['Menyumbang ', [fPct(ters / D.tot)], ' kejadian, terutama jaringan TM (', [fPct(tm / D.tot)], '). Kecelakaan umum (masyarakat) mencakup ', [fPct(D.umumAll / D.tot)], ' kejadian.']);
    const pi = pt(D.th);
    para('k3-e4', ['Porsi kecelakaan kerja ', [fPct(y0.pct_kerja)], ` pada ${y0.tahun} dan `, [fPct(pi.pct_kerja)], ` pada ${D.th}; ${D.th} mencatat `, [fInt(pi.kerja)], ' kecelakaan kerja, dibanding ', [fInt(yF.kerja)], ` sepanjang ${yF.tahun}.`]);
    const t3 = D.unitAll.slice(0, 3);
    para('k3-e5', [[t3[0].k], ', ', [t3[1].k], ' dan ', [t3[2].k], ': ', [fPct(d3.sum(t3, (r) => r.n) / D.tot)], ' kejadian. Unit pelaksana tertinggi ', [D.up3All[0].k], ' (', [fInt(D.up3All[0].n)], ' kejadian).']);
    const pk = D.blnAll[0];
    para('k3-e6', ['Puncak kejadian pada bulan ', [BULAN[+pk.k - 1]], ' (', [fInt(pk.n)], ` kejadian, gabungan ${rng}).`]);
    sec.dataset.drawn = '1';
  }
  dash.onData(() => render(true));
  new MutationObserver(() => { if (!sec.hidden) requestAnimationFrame(() => render(true)); }).observe(sec, { attributes: true, attributeFilter: ['hidden'] });
  let rt = null; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => render(false), 150); });
  // halaman ini dibuat setelah menu pertama kali tampil: bila tab aktif k3 (mis. dari link #k3), tampilkan ulang
  if (dash.params().tab === 'k3') dash.setParams({ tab: 'k3' });
})();
