// Paparan "Realisasi Action Plan Peningkatan Keandalan Jaringan Distribusi" (tab Workplan Keandalan).
// SSWpPaparan.render(rows, opts) → elemen 1920×1080 bergaya template paparan; diekspor ke PNG / PPTX oleh workplan-tab.js.
(() => {
  const PROG = [
    { k: 'pdkb', t: 'PDKB', h: 'PDKB', c1: '#0D47A1', c2: '#1E88E5' },
    { k: 'tebang', t: 'Program Tebang Tuntas', h: 'Tebang Tuntas', c1: '#1B5E20', c2: '#43A047' },
    { k: 'pangkas', t: 'Program Pangkas', sub: 'ROW Management', h: 'Program Pangkas', hs: 'ROW Management', c1: '#0B4F9C', c2: '#2D8BE0' },
    { k: 'proteksi', t: 'Optimalisasi & Assesment Sistem Proteksi', h: 'Optimasi Proteksi', c1: '#7A6A06', c2: '#B39C1A' },
    { k: 'binatang', t: 'Pemasangan Penghalang Proteksi Binatang', h: 'Penghalang Binatang', c1: '#00707A', c2: '#13A3AE' },
  ];
  const UNIT = { pdkb: 'titik', tebang: 'kms', pangkas: 'kms', proteksi: 'penyulang', binatang: 'titik' };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const f0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const f1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const fp = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v, k) => (v == null ? '-' : (UNIT[k] === 'kms' ? f1 : f0).format(v));
  const n0 = (v) => (v == null ? '-' : f0.format(v));
  const pct = (x) => (x && x.target ? fp.format((x.realisasi / x.target) * 100) + '%' : '-');
  const rat = (x) => (x && x.target ? x.realisasi / x.target : null);
  const lvl = (r) => (r == null ? 'na' : r >= 1 ? 'g' : r >= 0.9 ? 'y' : 'r');
  const ORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];

  const CSS = `
.wpx{width:1920px;height:1080px;position:relative;overflow:hidden;font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;color:#0B2A6B;background:linear-gradient(180deg,#E3F3FD 0%,#F4FAFE 22%,#DDF0FB 100%);box-sizing:border-box}
.wpx *{box-sizing:border-box}
.wpx-hd{position:absolute;left:0;top:0;width:1920px;height:196px;background:linear-gradient(180deg,#FFFFFF 0%,#E6F5FD 45%,#CBEAF8 100%);overflow:hidden}
.wpx-sky{position:absolute;bottom:8px;height:160px;width:auto}
.wpx-skyL{left:330px}.wpx-skyR{right:200px}
.wpx-glow{position:absolute;left:470px;top:-20px;width:980px;height:236px;background:radial-gradient(closest-side,rgba(255,255,255,.97) 62%,rgba(255,255,255,0) 100%)}
.wpx-ground{position:absolute;left:0;right:0;bottom:0;height:10px;background:linear-gradient(90deg,#7CC243,#A5D65A,#7CC243)}
.wpx-logo{position:absolute;top:44px;height:78px;width:auto}
.wpx-logoL{left:44px}.wpx-logoR{right:44px;height:100px;top:38px}
.wpx-tt{position:absolute;left:510px;width:900px;top:22px;text-align:center;line-height:1.02;color:#0A2A82;font-weight:900}
.wpx-t1{font-size:56px;letter-spacing:-.5px;font-family:Impact,"Arial Narrow Bold","Arial Narrow",Arial,sans-serif;font-weight:400}
.wpx-t2{font-size:29px;margin-top:8px;white-space:nowrap;font-family:"Arial Narrow",Arial,sans-serif;font-weight:900;letter-spacing:.2px}
.wpx-t3{font-size:29px;margin-top:6px;font-family:"Arial Narrow",Arial,sans-serif;font-weight:900}
.wpx-cards{position:absolute;left:30px;right:30px;top:212px;height:276px;display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
.wpx-card{border-radius:16px;background:#FFFFFF;border:2px solid #9FD4F2;box-shadow:0 4px 10px rgba(10,60,120,.18);overflow:hidden;display:flex;flex-direction:column}
.wpx-ch{height:92px;display:flex;align-items:center;gap:12px;padding:0 12px 0 14px;color:#fff;border-radius:14px 14px 0 0}
.wpx-no{width:48px;height:48px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;flex:none;border:3px solid rgba(255,255,255,.6)}
.wpx-cht{font-size:20px;font-weight:700;line-height:1.12;text-shadow:0 1px 2px rgba(0,0,0,.25)}
.wpx-cht small{display:block;font-size:17px;font-weight:400;margin-top:2px}
.wpx-cb{flex:1;display:flex;align-items:center;padding:6px 10px 8px 8px;gap:4px;background:linear-gradient(180deg,#FFFFFF,#F2FAFE)}
.wpx-ill{width:100px;height:160px;object-fit:contain;flex:none;mix-blend-mode:multiply}
.wpx-tv{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.wpx-lb{font-size:14px;color:#0A2A82;letter-spacing:-.2px;white-space:nowrap}
.wpx-v{font-size:28px;font-weight:900;color:#0A2A82;line-height:1.05;letter-spacing:-.5px;white-space:nowrap}.wpx-v small{font-size:14px;font-weight:400;margin-left:4px;letter-spacing:0}.wpx-v+.wpx-lb{margin-top:10px}
.wpx-u{font-size:18px;color:#0A2A82;margin-bottom:8px}
.wpx-ring{width:98px;height:98px;flex:none;position:relative}
.wpx-ring svg{width:98px;height:98px;display:block}
.wpx-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:#0A2A82;letter-spacing:-.5px}
.wpx-tb{position:absolute;left:30px;right:30px;top:506px;bottom:18px;border-radius:16px;background:#fff;border:2px solid #7CC6EE;box-shadow:0 4px 12px rgba(10,60,120,.2);overflow:hidden;display:flex;flex-direction:column}
.wpx-tbh{height:58px;flex:none;background:linear-gradient(90deg,#082567 0%,#0D3A8C 60%,#1590C9 100%);color:#fff;display:flex;align-items:center;gap:16px;padding:0 22px;font-size:29px;font-weight:900;letter-spacing:.2px}
.wpx-tbh svg{width:38px;height:38px;flex:none}
.wpx-t{width:100%;flex:1;border-collapse:collapse;table-layout:fixed;font-size:20px;color:#0B2246}
.wpx-t th,.wpx-t td{border:1px solid #CFE0EE;text-align:center;padding:0 6px;white-space:nowrap;overflow:hidden}
.wpx-t thead th{color:#0A2A82;background:#EAF5FC;font-weight:700}
.wpx-t .wpx-g th{color:#fff;font-size:20px;line-height:1.1;font-weight:700;height:58px}
.wpx-t .wpx-g th small{display:block;font-size:17px;font-weight:400;margin-top:2px}
.wpx-t .wpx-s th{height:30px;font-size:18px}
.wpx-t .wpx-g th.wpx-no-h,.wpx-t .wpx-g th.wpx-un-h{color:#0A2A82;background:#EAF5FC;font-size:21px}

.wpx-t tbody td{height:34px}
.wpx-t tbody tr:nth-child(even) td{background:#F6FAFE}
.wpx-t td.wpx-un{text-align:left;padding-left:16px;font-weight:600}
.wpx-t td.g{background:#BDEFA8 !important}
.wpx-t td.y{background:#FFE45C !important}
.wpx-t td.r{background:#F2554C !important;color:#fff}
.wpx-t tr.hl td{background:#CFEAFB !important;font-weight:800;border-top:2px solid #1565C0;border-bottom:2px solid #1565C0}
.wpx-t tr.hl td.wpx-nob,.wpx-t tr.hl td.wpx-un{background:#0D3A8C !important;color:#fff}
.wpx-t tr.hl td.g{background:#8EE1A0 !important}.wpx-t tr.hl td.y{background:#FFD83A !important}.wpx-t tr.hl td.r{background:#E53935 !important}
.wpx-t tr.tot td{background:#0A2A6E !important;color:#fff;font-weight:900;font-size:19px;height:40px}
.wpx-t tr.tot td.g{background:#8EE1A0 !important;color:#0B2246}.wpx-t tr.tot td.y{background:#FFE45C !important;color:#0B2246}.wpx-t tr.tot td.r{background:#E53935 !important;color:#fff}
.wpx-ft{position:absolute;left:34px;bottom:0;height:18px;font-size:12px;color:#4A6A8A;line-height:18px}`;

  const ICON = {
    pdkb: '<path d="M3 20h18M6 17v-4M10 17V9M14 17v-6M18 17V5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    tebang: '<path d="M3 20h18M7 20c-2-4 0-9 4-10M11 20V8m0 0c1-3 4-4 6-3-1 3-3 4-6 3zM15 20l3-7 2 1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
    pangkas: '<path d="M3 20h18M6 17v-4M10 17V9M14 17v-6M18 17V5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    proteksi: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" stroke="#fff" stroke-width="2" fill="none"/><circle cx="12" cy="11" r="2.5" fill="#fff"/>',
    binatang: '<path d="M12 3v18M7 7h10M8 11h8M9 15l3 2 3-2" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  };

  function ensureCss() {
    if (document.getElementById('wpx-css')) return;
    const st = document.createElement('style'); st.id = 'wpx-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ring = (r) => {
    const R = 46, C = 2 * Math.PI * R, f = Math.max(0, Math.min(1, r || 0));
    const col = r == null ? '#B0BEC5' : r >= 1 ? '#22A447' : r >= 0.9 ? '#E9B800' : '#E53935';
    return `<svg viewBox="0 0 116 116"><circle cx="58" cy="58" r="${R}" fill="#fff" stroke="#E3EEF5" stroke-width="13"/><circle cx="58" cy="58" r="${R}" fill="none" stroke="${col}" stroke-width="13" stroke-linecap="round" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 58 58)"/></svg>`;
  };

  // rows: data workplan; o: { bulan: 'September', tahun: '2026', unit: kode unit disorot (opsional), assets }
  function render(rows, o) {
    ensureCss();
    const A = o.assets || {};
    const logo = (k) => { const v = (window.SS_SLIDE_ASSETS || {})[k]; return v ? (v.startsWith('data:') ? v : 'data:' + v) : ''; };
    const get = (u, p) => rows.find((r) => r.wil === 'SUMKAL' && r.unit === u && r.program === p);
    const units = ORD.filter((u) => rows.some((r) => r.wil === 'SUMKAL' && r.unit === u))
      .concat([...new Set(rows.filter((r) => r.wil === 'SUMKAL' && r.jenis === 'unit' && !ORD.includes(r.unit)).map((r) => r.unit))]);
    const B = String(o.bulan || '').toUpperCase(), Y = o.tahun || '';
    const el = document.createElement('div'); el.className = 'wpx';
    const cards = PROG.map((p, i) => {
      const x = get('TOTAL', p.k), u = cap(UNIT[p.k]);
      return `<div class="wpx-card"><div class="wpx-ch" style="background:linear-gradient(90deg,${p.c1},${p.c2})"><div class="wpx-no" style="color:${p.c1}">${i + 1}</div><div class="wpx-cht">${esc(p.t)}${p.sub ? ` <small>(${esc(p.sub)}) (${UNIT[p.k]})</small>` : ` <small>(${u})</small>`}</div></div>
        <div class="wpx-cb"><img class="wpx-ill" src="${A['i' + (i + 1)] || ''}" alt=""><div class="wpx-tv"><span class="wpx-lb">Target SUMKAL</span><span class="wpx-v">${n0(x && x.target)}<small>${UNIT[p.k]}</small></span><span class="wpx-lb">Realisasi SUMKAL</span><span class="wpx-v">${n0(x && x.realisasi)}<small>${UNIT[p.k]}</small></span></div>
        <div class="wpx-ring">${ring(rat(x))}<b>${pct(x)}</b></div></div></div>`;
    }).join('');
    const grp = PROG.map((p) => `<th colspan="3" style="background:linear-gradient(90deg,${p.c1},${p.c2})"><span style="display:inline-flex;align-items:center;gap:12px"><svg viewBox="0 0 24 24" width="34" height="34">${ICON[p.k]}</svg><span>${esc(p.h)}<small>${p.hs ? `(${esc(p.hs)}) ` : ''}(${cap(UNIT[p.k])})</small></span></span></th>`).join('');
    const sub = PROG.map(() => '<th>Target</th><th>Realisasi</th><th>%</th>').join('');
    const line = (u, i, cls) => {
      const any = get(u, PROG[0].k) || {};
      const nm = u === 'TOTAL' ? 'SUMKAL' : any.nama || u;
      return `<tr class="${cls || ''}"><td class="wpx-nob">${i || ''}</td><td class="wpx-un">${esc(nm)}</td>` + PROG.map((p) => { const x = get(u, p.k); return `<td>${num(x && x.target, p.k)}</td><td>${num(x && x.realisasi, p.k)}</td><td class="${lvl(rat(x))}">${pct(x)}</td>`; }).join('') + '</tr>';
    };
    el.innerHTML = `
      <div class="wpx-hd"><img class="wpx-sky wpx-skyL" src="${A.skyL || ''}" alt=""><img class="wpx-sky wpx-skyR" src="${A.skyR || ''}" alt=""><div class="wpx-glow"></div><div class="wpx-ground"></div>
        <img class="wpx-logo wpx-logoL" src="${logo('danantara')}" alt=""><img class="wpx-logo wpx-logoR" src="${logo('pln')}" alt="">
        <div class="wpx-tt"><div class="wpx-t1">REALISASI ACTION PLAN</div><div class="wpx-t2">PENINGKATAN KEANDALAN JARINGAN DISTRIBUSI</div><div class="wpx-t3">JANUARI – ${esc(B)} ${esc(Y)}</div></div></div>
      <div class="wpx-cards">${cards}</div>
      <div class="wpx-tb"><div class="wpx-tbh"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3M19 6l1.5-1.5"/></svg>REALISASI ACTION PLAN PER UNIT INDUK s.d ${esc(B)} ${esc(Y)}</div>
        <table class="wpx-t"><colgroup><col style="width:56px"><col style="width:208px"></colgroup><thead><tr class="wpx-g"><th rowspan="2" class="wpx-no-h">No</th><th rowspan="2" class="wpx-un-h">Unit Induk</th>${grp}</tr><tr class="wpx-s">${sub}</tr></thead>
        <tbody>${units.map((u, i) => line(u, i + 1, o.unit === u ? 'hl' : '')).join('')}${line('TOTAL', '', 'tot')}</tbody></table></div>
      <div class="wpx-ft">Sumber: ${esc(o.sumber || 'Workpaper Action Plan')} · % = realisasi ÷ target · hijau ≥ 100%, kuning 90–99,99%, merah &lt; 90%</div>`;
    return el;
  }

  window.SSWpPaparan = { render };
})();
