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
  // Pilihan awal (bila pembaca belum pernah memilih): GI Pematangsiantar, feeder CAKALANG.
  const DEF = { hx_wilayah: 'WILAYAH SUMATERA UTARA', hx_up3: null, hx_gi: 'GI121120009', hx_feeder: 'FD121010011' };
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

  function render() {
    if (sec.hidden) return;
    mount();
    const p = P();
    const gi = rowsOf('hx_gi') || [], fdAll = rowsOf('hx_feeder') || [];

    // ringkasan
    const RG = rowsOf('hx_ringkasan');
    if (RG) drawRows($('hx-t-ringkasan'), RG, ['level', 'total', 'terhubung', 'putus', 'parent_selevel', 'padam'], new Set(['total', 'terhubung', 'putus', 'parent_selevel', 'padam']), null, (r) => r.level);
    const TM = rowsOf('hx_trafo_metode');
    if (TM) drawRows($('hx-t-metode'), TM, ['metode', 'jumlah'], new Set(['jumlah']), null, (r) => r.metode);

    // filter
    fill($('hx-f-wil'), 'Semua wilayah', uniq(gi.map((r) => r.wilayah)).map((w) => [w, w]), p.hx_wilayah);
    const g1 = gi.filter((r) => !p.hx_wilayah || r.wilayah === p.hx_wilayah);
    fill($('hx-f-up3'), 'Semua UP3', uniq(g1.map((r) => r.up3)).map((u) => [u, u]), p.hx_up3);
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
      $('hx-an-count').textContent = rows.length > MAXAN ? `${fmt(rows.length)} aset cocok; ditampilkan ${fmt(MAXAN)} pertama. Persempit dengan filter Wilayah, UP3, Level atau pencarian. Daftar lengkap ada di sheet ANOMALI dan ANOMALI_GARDU_TRAFO file Excel hirarki.` : `${fmt(rows.length)} aset.`;
    }
  }
  SSD.onData(render);
})();
