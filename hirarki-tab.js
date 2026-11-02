// Tab Hirarki Aset: GI → Feeder → Zona → Section → Segment → Lateral → Gardu/Trafo.
// Data besar dimuat hanya saat tab ini dibuka (isi halaman ada di <template> dan baru dipasang saat pertama dibuka).
(() => {
  const $ = (id) => document.getElementById(id);
  const sec = $('hirarki');
  if (!sec) return;
  const GRP = {
    'WILAYAH SUMATERA UTARA': 'gardu_1', 'WILAYAH ACEH': 'gardu_1',
    'WILAYAH SUMATERA SELATAN, JAMBI & BENGKULU (S2JB)': 'gardu_2', 'DISTRIBUSI LAMPUNG': 'gardu_2', 'WILAYAH BANGKA BELITUNG': 'gardu_2',
    'WILAYAH KALIMANTAN BARAT': 'gardu_3', 'WILAYAH KALIMANTAN SELATAN DAN TENGAH': 'gardu_3', 'WILAYAH KALIMANTAN TIMUR': 'gardu_3',
    'WILAYAH RIAU DAN KEPULAUAN RIAU': 'gardu_3', 'WILAYAH SUMATERA BARAT': 'gardu_3',
  };
  const COLS = {
    zona: ['kode', 'nama', 'parent', 'induk_atas', 'status', 'alamat'],
    section: ['kode', 'nama', 'parent', 'induk_atas', 'zona', 'status', 'alamat'],
    segment: ['kode', 'nama', 'parent', 'induk_atas', 'section', 'zona', 'status', 'alamat'],
    lateral: ['kode', 'nama', 'parent', 'induk_atas', 'segment', 'section', 'zona', 'status', 'alamat'],
    gardu: ['kode', 'nama', 'posisi', 'parent', 'trafo', 'kva', 'alamat'],
  };
  const LV = [['hx_zona', 'ZO', 'hx-c2'], ['hx_section', 'SE', 'hx-c3'], ['hx_segment', 'SG', 'hx-c4'], ['hx_lateral', 'LT', 'hx-c5']];
  const MAXAN = 500;
  const nf = new Intl.NumberFormat('id-ID');
  const fmt = (v) => { if (v === '' || v == null) return ''; const n = Number(v); return Number.isFinite(n) ? nf.format(n) : String(v); };
  const enc = (s) => String(s ?? '').replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D').replace(/,/g, '%2C');
  const uniq = (a) => Array.from(new Set(a.filter(Boolean))).sort();
  // Pilihan awal (bila pembaca belum pernah memilih): unit Sumkal, GI Pematangsiantar, feeder CAKALANG.
  const DEF = { hx_wilayah: null, hx_up3: null, hx_gi: 'GI121120009', hx_feeder: 'FD121010011' };
  const P = () => { const p = dash.params(); const o = {}; Object.keys(DEF).forEach((k) => { o[k] = k in p ? p[k] : DEF[k]; }); return o; };
  // Versi web (GitHub Pages): dataset hirarki besar, jadi file hx_*.js baru dimuat saat dibutuhkan.
  // Versi artifact: dash.data memuat dataset sendiri.
  const LAZY = !!window.__D, loading = new Set();
  const need = (id) => {
    if (!LAZY || id in window.__D || loading.has(id)) return;
    loading.add(id);
    const s = document.createElement('script'); s.src = id + '.js';
    s.onload = () => { loading.delete(id); render(); };
    s.onerror = () => { loading.delete(id); window.__D[id] = []; render(); };
    document.head.appendChild(s);
  };
  const rowsOf = (id) => { need(id); if (LAZY && !(id in window.__D)) return null; const d = SSD.data(id); return d.status === 'ok' ? d.data : null; };
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  let mounted = false, tab = 'pohon', q = '', anLv = '', anQ = '';
  const panelKey = () => (tab === 'pohon' || tab === 'gardu' ? `${tab}-${curGrp()}` : tab);
  let shownKey = null;

  function curGrp() { const r = (rowsOf('hx_gi') || []).find((x) => x.kode === P().hx_gi); return r ? GRP[r.wilayah] || null : null; }

  function mount() {
    if (mounted) return;
    mounted = true;
    $('hx-mount').append($('hx-tpl').content.cloneNode(true));
    const pick = (id, fn) => $(id).addEventListener('change', (e) => fn(e.target.value || null));
    pick('hx-f-wil', (v) => dash.setParams({ hx_wilayah: v, hx_up3: null, hx_gi: null, hx_feeder: null }));
    pick('hx-f-up3', (v) => dash.setParams({ hx_up3: v, hx_gi: null, hx_feeder: null }));
    pick('hx-f-gi', (v) => dash.setParams({ hx_gi: v, hx_feeder: null }));
    pick('hx-f-fd', (v) => dash.setParams({ hx_feeder: v }));
    $('hx-feeders').addEventListener('click', (e) => {
      const tr = e.target.closest('tbody tr[data-key]'); if (!tr) return;
      const r = (rowsOf('hx_feeder') || []).find((x) => String(x.id) === tr.dataset.key);
      if (r) { dash.setParams({ hx_feeder: r.kode }); requestAnimationFrame(() => $('hx-fd-card').scrollIntoView({ behavior: 'smooth', block: 'start' })); }
    });
    sec.querySelectorAll('[data-hx-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.hxTab; render(); }));
    $('hx-q').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
    $('hx-an-lv').addEventListener('change', (e) => { anLv = e.target.value; render(); });
    $('hx-an-q').addEventListener('input', (e) => { anQ = e.target.value.trim().toLowerCase(); render(); });
  }

  const fill = (sel, label, opts, value) => {
    sel.replaceChildren(new Option(label, ''), ...opts.map(([v, t]) => new Option(t, v)));
    sel.value = value ?? '';
  };
  const drawRows = (tbody, rows, cols, numCols, selKey, keyOf) => {
    const frag = document.createDocumentFragment();
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = keyOf ? keyOf(r) : r.id;
      if (selKey && r.kode === selKey) tr.className = 'hx-on';
      cols.forEach((c) => {
        const v = r[c] ?? '';
        const td = mk('td', numCols && numCols.has(c) ? fmt(v) : String(v));
        if (c === 'status' && String(v).trim() === 'PADAM') td.className = 'ss-bad';
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    });
    tbody.replaceChildren(frag);
  };
  const match = (r, s) => !s || Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(s));
  const one = (el, src, row, field, numeric) => {
    el.setAttribute('data-where', 'kode=' + enc(row ? row.kode : ''));
    el.textContent = row ? (numeric ? fmt(row[field]) : (row[field] || '—')) : '—';
  };

  function drawTree(el, gk) {
    const fdk = P().hx_feeder;
    const sets = [...LV, [gk, 'GD', 'hx-c6']].map(([id]) => rowsOf(id));
    if (!fdk || sets.some((x) => !x)) { el.replaceChildren(mk('p', 'Memuat data…', 'ss-note')); return; }
    const nodes = [];
    [...LV, [gk, 'GD', 'hx-c6']].forEach(([, tag, c], i) => sets[i].forEach((r) => { if (r.feeder === fdk) nodes.push({ r, tag, c, kids: [] }); }));
    const by = new Map(); nodes.forEach((n) => { if (!by.has(n.r.kode)) by.set(n.r.kode, n); });
    const roots = [];
    nodes.forEach((n) => { const p = by.get(n.r.parent) || by.get(n.r.induk_atas); if (p && p !== n) p.kids.push(n); else roots.push(n); });
    const seen = new Set();
    const hit = (n) => { if (seen.has(n)) return false; seen.add(n); const k = n.kids.map(hit).some(Boolean); n.show = !q || match(n.r, q) || k; return n.show; };
    roots.forEach(hit);
    const label = (n) => {
      const s = mk('span'); const b = mk('i', n.tag, 'hx-lv ' + n.c);
      const nm = mk('span', n.r.nama || '(tanpa nama)'); if (String(n.r.status).trim() === 'PADAM') nm.className = 'ss-bad';
      s.append(b, nm, mk('span', n.r.kode, 'hx-kode'));
      if (n.tag === 'GD') s.append(mk('span', n.r.trafo ? `· trafo ${n.r.trafo}${n.r.kva ? ' (' + fmt(n.r.kva) + ' kVA)' : ''}` : '· tanpa trafo terhubung', 'hx-kode'));
      return s;
    };
    const build = (list, depth, guard) => {
      const ul = mk('ul');
      list.filter((n) => n.show && !guard.has(n)).forEach((n) => {
        const g2 = new Set(guard); g2.add(n);
        const li = mk('li');
        if (n.kids.some((k) => k.show)) {
          const det = mk('details'); det.open = depth < 1 || !!q;
          const sm = mk('summary'); sm.append(label(n)); det.append(sm, build(n.kids, depth + 1, g2)); li.append(det);
        } else li.append(label(n));
        ul.append(li);
      });
      return ul;
    };
    el.replaceChildren(roots.length ? build(roots, 0, new Set()) : mk('p', 'Tidak ada aset di bawah feeder ini.', 'ss-note'));
  }

  // ---------- ringkasan seluruh data: pilih level di sepanjang jaringan ----------
  const SV = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const LEVELS = [
    { k: 'GI', t: 'Gardu Induk', s: 'GI', u: 'gardu induk', ic: SV('<path d="M12 2 6.5 22M12 2l5.5 20M8.6 14h6.8M9.8 9h4.4M4 6h16M4 6v2.5M20 6v2.5M8 22h8"/>') },
    { k: 'FEEDER', t: 'Feeder', s: 'Feeder', u: 'feeder', ic: SV('<path d="M12 3v18M6.5 6.5h11M8 10h8M9 21h6"/><circle cx="6.5" cy="6.5" r=".9"/><circle cx="17.5" cy="6.5" r=".9"/>') },
    { k: 'ZONA', t: 'Zona', s: 'Zona', u: 'zona', ic: SV('<path d="M2 12h5.5M16.5 12H22"/><rect x="7.5" y="8" width="9" height="8" rx="2"/><path d="M10 12h4"/>') },
    { k: 'SECTION', t: 'Section', s: 'Section', u: 'section', ic: SV('<path d="M2 12h7M15 12h7M9 12l5.5-5"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/>') },
    { k: 'SEGMENT', t: 'Segment', s: 'Segment', u: 'segment', ic: SV('<path d="M2 12h20M8 7.5v9M16 7.5v9"/>') },
    { k: 'LATERAL', t: 'Lateral', s: 'Lateral', u: 'lateral', ic: SV('<path d="M2 15h20M9 15l6-8h7"/>') },
    { k: 'GARDU', t: 'Gardu', s: 'Gardu', u: 'gardu distribusi', ic: SV('<path d="M3.5 9.5 12 4l8.5 5.5"/><rect x="5.5" y="9.5" width="13" height="10.5" rx="1"/><path d="M12.6 11.5 10.5 15h3l-2.1 3.5"/>') },
    { k: 'TRAFO', t: 'Trafo', s: 'Trafo', u: 'trafo', ic: SV('<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/><path d="M2 12h2M20 12h2"/>') },
  ];
  const PROB = {
    putus: { t: 'Rantai putus', f: 'putus', d: 'Rantai parent_asset aset ini tidak sampai ke GI: parent kosong, parent tidak ditemukan di data, rantainya berhenti sebelum GI, atau berputar (siklus). Aset seperti ini tidak muncul di pohon hirarki.' },
    selevel: { t: 'Parent selevel', f: 'parent_selevel', d: 'Parent aset ini adalah aset di level yang sama, misalnya Segment yang berinduk ke Segment lain. Aset tetap dihitung tersambung bila rantainya sampai GI, tetapi susunan hirarkinya perlu dicek di data aset.' },
    padam: { t: 'Padam', f: 'padam', d: 'Aset yang berstatus PADAM di data aset jaringan.' },
  };
  const ICP = {
    putus: SV('<path d="M9 7 7.5 5.5a3.5 3.5 0 0 0-5 5L4 12M15 17l1.5 1.5a3.5 3.5 0 0 0 5-5L20 12M8 16l-2 2M16 8l2-2M10 4V2M14 22v-2"/>'),
    selevel: SV('<rect x="3" y="4" width="7" height="6" rx="1"/><rect x="14" y="4" width="7" height="6" rx="1"/><path d="M10 7h4M6.5 10v5h11v-5"/><rect x="9" y="15" width="6" height="5" rx="1"/>'),
    padam: SV('<path d="M13 2 4 14h7l-1 8 4.5-5.8M17 12l3-4h-6M3 3l18 18"/>'),
  };
  // nama unit sama dengan halaman lain (UID …); nilai filter tetap nama wilayah di data aset
  const UIDL = { 'WILAYAH ACEH': 'UID Aceh', 'WILAYAH SUMATERA UTARA': 'UID Sumut', 'WILAYAH SUMATERA BARAT': 'UID Sumbar', 'WILAYAH RIAU DAN KEPULAUAN RIAU': 'UID Riau Kepri',
    'WILAYAH SUMATERA SELATAN, JAMBI & BENGKULU (S2JB)': 'UID S2JB', 'WILAYAH BANGKA BELITUNG': 'UID Babel', 'DISTRIBUSI LAMPUNG': 'UID Lampung', 'WILAYAH KALIMANTAN BARAT': 'UID Kalbar',
    'WILAYAH KALIMANTAN SELATAN DAN TENGAH': 'UID Kalselteng', 'WILAYAH KALIMANTAN TIMUR': 'UID Kaltimra' };
  const UORD = Object.keys(UIDL);
  const wShort = (w) => UIDL[w] || String(w || '');
  const u3Short = (u) => String(u || '').replace(/^UP3\s+/i, 'UP3 ').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, c) => a + c.toUpperCase()).replace(/^Up3/, 'UP3');
  const pctTxt = (a, b) => (b ? (a / b * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '–');
  let sumLv = 'FEEDER';
  // angka ringkasan untuk unit terpilih: Sumkal = hx_ringkasan (resmi); UID/UP3 = jumlah dari hx_ringkasan_unit
  function unitData() {
    const p = P(), RG = rowsOf('hx_ringkasan'), RU = rowsOf('hx_ringkasan_unit');
    const all = !p.hx_wilayah && !p.hx_up3;
    const rows = (RU || []).filter((r) => (!p.hx_wilayah || r.w === p.hx_wilayah) && (!p.hx_up3 || r.u === p.hx_up3));
    const by = all ? 'w' : p.hx_up3 ? null : 'u';
    const lv = {};
    LEVELS.forEach((L) => {
      const rs = rows.filter((r) => r.level === L.k); const sum = (f) => rs.reduce((x, r) => x + (+r[f] || 0), 0);
      const sb = {}; rs.forEach((r) => Object.entries(r.sebab || {}).forEach(([k, n]) => { sb[k] = (sb[k] || 0) + n; }));
      const grp = (f) => { if (!by) return null; const o = {}; rs.forEach((r) => { if (+r[f]) o[r[by]] = (o[r[by]] || 0) + (+r[f]); }); return o; };
      const na = L.k === 'GARDU' || L.k === 'TRAFO';
      let o = { total: sum('terhubung') + sum('putus'), terhubung: sum('terhubung'), putus: sum('putus'), parent_selevel: na ? '' : sum('selevel'), padam: na ? '' : sum('padam') };
      if (all && RG) { const g = RG.find((r) => r.level === L.k); if (g) o = { total: +g.total, terhubung: +g.terhubung, putus: +g.putus, parent_selevel: g.parent_selevel === '' ? '' : +g.parent_selevel, padam: g.padam === '' ? '' : +g.padam, rowsSelevel: sum('selevel'), rowsPadam: sum('padam') }; }
      o.sebab = sb; o.grp = { putus: grp('putus'), selevel: grp('selevel'), padam: grp('padam') };
      lv[L.k] = o;
    });
    const name = p.hx_up3 ? u3Short(p.hx_up3) + (p.hx_wilayah ? ' · ' + wShort(p.hx_wilayah) : '') : p.hx_wilayah ? wShort(p.hx_wilayah) : 'Sumkal';
    return { ok: !!(RU && RG), all, by, lv, name };
  }
  function renderSum() {
    const U = unitData(); const net = $('hx-net');
    const row = (k) => (U.ok ? U.lv[k] : null);
    $('hx-sum-unit').textContent = U.name;
    if (!net.childElementCount) {
      net.replaceChildren(...LEVELS.map((L, i) => {
        const b = mk('button', null, 'hx-node' + (i === 0 ? ' hx-gi' : '')); b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.lv = L.k;
        b.innerHTML = `<span class="hx-ic">${L.ic}</span><span class="hx-nm"></span><span class="hx-pc"></span>`;
        b.querySelector('.hx-nm').textContent = L.s; return b;
      }));
      net.addEventListener('click', (e) => { const b = e.target.closest('.hx-node'); if (!b) return; sumLv = b.dataset.lv; renderSum(); });
      net.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return; e.preventDefault();
        const i = LEVELS.findIndex((L) => L.k === sumLv); const n = e.key === 'Home' ? 0 : e.key === 'End' ? LEVELS.length - 1 : (i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : LEVELS.length - 1)) % LEVELS.length;
        sumLv = LEVELS[n].k; renderSum(); net.querySelector(`[data-lv="${sumLv}"]`).focus();
      });
      $('hx-probs').addEventListener('click', (e) => { const b = e.target.closest('[data-prob]'); if (b) openProb(b.dataset.prob); });
      $('hx-dlg').addEventListener('click', (e) => { if (e.target === $('hx-dlg') || e.target.closest('[data-close]')) $('hx-dlg').close(); const go = e.target.closest('[data-go-an]'); if (go) goAnomali(go.dataset.goAn); });
    }
    net.querySelectorAll('.hx-node').forEach((b) => {
      const r = row(b.dataset.lv); const on = b.dataset.lv === sumLv;
      b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
      b.querySelector('.hx-pc').textContent = r ? pctTxt(+r.terhubung, +r.total) : '—';
    });
    const L = LEVELS.find((x) => x.k === sumLv), r = row(sumLv);
    if (!r) { $('hx-p-total').textContent = '—'; return; }
    const tot = +r.total, on = +r.terhubung, p = tot ? on / tot * 100 : 0;
    $('hx-p-total').textContent = fmt(tot); $('hx-p-lbl').textContent = `${L.u} di data aset`;
    $('hx-p-pct').textContent = pctTxt(on, tot);
    const bar = $('hx-p-bar'); bar.style.width = p.toFixed(2) + '%'; bar.style.setProperty('--p', Math.max(1, p).toFixed(2));
    $('hx-p-mark').style.left = p.toFixed(2) + '%';
    $('hx-p-barl').textContent = `${fmt(on)} tersambung`;
    $('hx-p-bar-wrap').setAttribute('aria-label', `${fmt(on)} dari ${fmt(tot)} ${L.u} tersambung ke GI (${pctTxt(on, tot)})`);
    $('hx-probs').replaceChildren(...Object.entries(PROB).map(([k, P]) => {
      const v = r[P.f]; const na = v === '' || v == null; const n = na ? 0 : +v;
      const el = mk(na || !n ? 'div' : 'button', null, 'hx-prob' + (na ? ' na' : n ? ' bad' : ' ok'));
      if (!na && n) { el.type = 'button'; el.dataset.prob = k; el.setAttribute('aria-haspopup', 'dialog'); }
      el.innerHTML = `<span class="hx-prob-t"></span><span class="hx-prob-v"><i class="hx-prob-ic">${ICP[k]}</i><b></b></span><span class="hx-prob-s"></span>`;
      el.querySelector('.hx-prob-t').textContent = P.t;
      el.querySelector('b').textContent = na ? '—' : fmt(n);
      el.querySelector('.hx-prob-s').textContent = na ? `Tidak berlaku untuk ${L.s}` : n ? `${pctTxt(n, tot)} dari ${L.u} · lihat rincian` : `Tidak ada ${L.u} ${P.t.toLowerCase()}`;
      return el;
    }));
    $('hx-metode').hidden = sumLv !== 'TRAFO';
  }
  const bars = (title, obj, total) => {
    const ent = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]); if (!ent.length) return '';
    const mx = ent[0][1];
    return `<h4>${title}</h4><ul class="hx-dl">${ent.slice(0, 12).map(([k, n]) => `<li><span class="k"></span><span class="b"><i style="width:${(n / mx * 100).toFixed(1)}%"></i></span><span class="n">${fmt(n)}</span></li>`).join('')}</ul>` + (ent.length > 12 ? `<p class="ss-note">dan ${ent.length - 12} lainnya.</p>` : '');
  };
  function openProb(k) {
    const P = PROB[k], L = LEVELS.find((x) => x.k === sumLv), U = unitData(), r = U.ok ? U.lv[sumLv] : null; if (!r) return;
    const n = +r[P.f], tot = +r.total;
    const lbl = (x) => (U.by === 'w' ? wShort(x) : u3Short(x));
    const gtitle = U.by === 'w' ? 'Per UID' : 'Per UP3';
    const gk = k === 'selevel' ? 'selevel' : k;
    let body = '', labels = [];
    const addBars = (title, obj, lab) => { const ent = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]); if (!ent.length) return; body += bars(title, obj); labels = labels.concat(ent.slice(0, 12).map(([x]) => lab(x))); };
    if (k === 'putus') addBars('Penyebab', r.sebab, (x) => x.charAt(0).toUpperCase() + x.slice(1));
    const g = { ...(r.grp[gk] || {}) };
    if (U.by) {
      // di Sumkal, angka resmi bisa sedikit lebih besar dari jumlah per UID: selisihnya aset yang rantainya putus
      if (U.all && (k === 'padam' || k === 'selevel')) { const sum = Object.values(g).reduce((a, b) => a + b, 0); if (n > sum) g['~'] = n - sum; }
      addBars(gtitle, g, (x) => (x === '~' ? 'Aset dengan rantai putus' : lbl(x)));
    }
    if (!U.all && (k === 'padam' || k === 'selevel')) body += '<p class="ss-note">Di tingkat unit, angka ini dihitung dari aset yang rantainya tersambung ke GI.</p>';
    const dlg = $('hx-dlg'), box = $('hx-dlg-in');
    box.innerHTML = `<div class="hx-dlg-h"><h3 id="hx-dlg-h"></h3><button type="button" class="hx-dlg-x" data-close aria-label="Tutup">×</button></div>
      <div class="hx-dlg-big"><b></b><span></span></div><p class="hx-dlg-d"></p>${body}
      ${k === 'putus' ? `<div class="hx-dlg-act"><button type="button" class="ss-u-btn" data-go-an="${sumLv}">Lihat daftar aset di Aset bermasalah</button><p class="ss-note">Daftar mengikuti filter Unit dan UP3 yang sedang dipilih.</p></div>` : ''}`;
    box.querySelector('h3').textContent = `${P.t} · ${L.t}`;
    box.querySelector('.hx-dlg-big b').textContent = fmt(n);
    box.querySelector('.hx-dlg-big span').textContent = `${L.u} di ${U.name}, ${pctTxt(n, tot)} dari ${fmt(tot)}`;
    box.querySelector('.hx-dlg-d').textContent = P.d;
    box.querySelectorAll('.hx-dl .k').forEach((el, i) => { el.textContent = labels[i] || ''; });
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    dlg.dataset.prob = k;
  }
  function goAnomali(level) {
    $('hx-dlg').close(); anLv = level; $('hx-an-lv').value = level; render();
    requestAnimationFrame(() => $('hx-an-card').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function render() {
    if (sec.hidden) return;
    mount();
    const p = P();
    const gi = rowsOf('hx_gi') || [], fdAll = rowsOf('hx_feeder') || [];

    // ringkasan
    renderSum();
    const TM = rowsOf('hx_trafo_metode');
    if (TM) drawRows($('hx-t-metode'), TM, ['metode', 'jumlah'], new Set(['jumlah']), null, (r) => r.metode);

    // filter
    fill($('hx-f-wil'), 'Sumkal (semua UID)', uniq(gi.map((r) => r.wilayah)).sort((a, b) => UORD.indexOf(a) - UORD.indexOf(b)).map((w) => [w, wShort(w)]), p.hx_wilayah);
    const g1 = gi.filter((r) => !p.hx_wilayah || r.wilayah === p.hx_wilayah);
    fill($('hx-f-up3'), 'Semua UP3', uniq(g1.map((r) => r.up3)).map((u) => [u, u3Short(u)]), p.hx_up3);
    const g2 = g1.filter((r) => !p.hx_up3 || r.up3 === p.hx_up3).slice().sort((a, b) => String(a.nama).localeCompare(String(b.nama)));
    fill($('hx-f-gi'), '— Pilih GI —', g2.map((r) => [r.kode, `${r.nama} (${fmt(r.feeder)} feeder)`]), p.hx_gi);
    const fds = fdAll.filter((r) => r.gi === p.hx_gi);
    fill($('hx-f-fd'), p.hx_gi ? '— Pilih feeder —' : '— Pilih GI dulu —', fds.map((r) => [r.kode, `${r.nama} · ${r.kode}`]), p.hx_feeder);
    $('hx-f-fd').disabled = !p.hx_gi;

    // GI
    $('hx-need-gi').hidden = !!p.hx_gi; $('hx-gi-card').hidden = !p.hx_gi;
    const gr = gi.find((r) => r.kode === p.hx_gi);
    one($('hx-gi-nama'), 'hx_gi', gr, 'nama'); one($('hx-gi-up3'), 'hx_gi', gr, 'up3');
    sec.querySelectorAll('.hx-gi-n').forEach((el) => one(el, 'hx_gi', gr, el.dataset.f, true));
    drawRows($('hx-t-feeder'), fds, ['kode', 'nama', 'status', 'ulp', 'jaringan', 'zona', 'section', 'segment', 'lateral', 'gardu', 'trafo'], new Set(['zona', 'section', 'segment', 'lateral', 'gardu', 'trafo']), p.hx_feeder);

    // Feeder
    const showFd = !!(p.hx_gi && p.hx_feeder);
    $('hx-need-fd').hidden = !p.hx_gi || !!p.hx_feeder; $('hx-fd-card').hidden = !showFd;
    const fr = fdAll.find((r) => r.kode === p.hx_feeder);
    one($('hx-fd-nama'), 'hx_feeder', fr, 'nama'); one($('hx-fd-kode'), 'hx_feeder', fr, 'kode'); one($('hx-fd-jar'), 'hx_feeder', fr, 'jaringan');
    sec.querySelectorAll('.hx-fd-n').forEach((el) => one(el, 'hx_feeder', fr, el.dataset.f, true));
    sec.querySelectorAll('[data-hx-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hxTab === tab)));
    $('hx-legend').hidden = tab !== 'pohon';
    if (showFd) {
      const key = panelKey();
      const panel = $('hx-panel');
      if (key !== shownKey) {
        const tpl = sec.querySelector(`template[data-hx="${key}"]`);
        panel.replaceChildren(tpl ? tpl.content.cloneNode(true) : mk('p', 'Data gardu untuk wilayah GI ini belum tersedia.', 'ss-note'));
        shownKey = key;
      }
      const note = $('hx-panel-note'); note.textContent = '';
      if (tab === 'pohon') { const el = panel.querySelector('.hx-tree'); if (el) drawTree(el, 'hx_' + curGrp()); }
      else {
        const src = tab === 'gardu' ? 'hx_' + curGrp() : 'hx_' + tab;
        const tb = panel.querySelector('tbody');
        const all = rowsOf(src);
        if (tb && all) {
          const rows = all.filter((r) => r.feeder === p.hx_feeder && match(r, q));
          drawRows(tb, rows, COLS[tab], new Set(['kva']));
          note.textContent = `${fmt(rows.length)} baris.` + (tab === 'gardu' ? ' Posisi = level parent gardu: FD Feeder, ZO Zona, SE Section, SG Segment, LT Lateral. Trafo = trafo yang menunjuk ke gardu ini; kVA = total kVA-nya.' : '');
        } else if (tb) tb.replaceChildren();
      }
    }

    // anomali
    const AN = rowsOf('hx_anomali');
    if (AN) {
      const rows = AN.filter((r) => (!p.hx_wilayah || r.wilayah === p.hx_wilayah) && (!p.hx_up3 || r.up3 === p.hx_up3) && (!anLv || r.level === anLv) && match(r, anQ));
      drawRows($('hx-t-anomali'), rows.slice(0, MAXAN), ['level', 'kode', 'nama', 'parent', 'status_hirarki', 'catatan', 'up3', 'baris'], new Set(['baris']));
      $('hx-an-count').textContent = rows.length > MAXAN ? `${fmt(rows.length)} aset cocok; ditampilkan ${fmt(MAXAN)} pertama. Persempit dengan pilihan Unit, UP3, Level atau pencarian. Daftar lengkap ada di sheet ANOMALI dan ANOMALI_GARDU_TRAFO file Excel hirarki.` : `${fmt(rows.length)} aset.`;
    }
  }
  SSD.onData(render);
})();
