// Tab "Desain Paparan": 1) pilih bulan cutoff, 2) susun slide (slide data dari database, slide PowerPoint
// atau gambar unggahan user, urutan), 3) buat dan unduh .pptx. Susunan slide disimpan admin ke database
// (paparan.json + folder paparan/ di repo), jadi pengguna berikutnya cukup memilih bulan lalu mengunduh.
(() => {
  const $ = (id) => document.getElementById(id);
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const PPTX_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js';
  const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  const CFG = 'paparan.json', DIR = 'paparan/', MAX_MB = 15;
  const SETS = ['kumulatif', 'bulanan', 'target', 'gangguan_ps', 'kc_bulanan', 'gangguan_dupont'];
  const CORE = [
    ['Kinerja SAIDI per UID', 'Peta UID, target dan realisasi s.d. cutoff, rekap Sumkal, tren kumulatif.'],
    ['Kinerja SAIFI per UID', 'Sama seperti slide SAIDI, untuk SAIFI.'],
    ['SAIDI jaringan distribusi', 'Angka kunci, tren bulanan per UID, ranking, tabel bulanan dan kumulatif.'],
    ['SAIFI jaringan distribusi', 'Sama seperti slide SAIDI, untuk SAIFI.'],
    ['Jumlah kali gangguan penyulang', 'Permanen, sesaat, cleansing dan koreksi (kode J) per bulan dan per UID.'],
    ['Penyebab gangguan penyulang', 'Rincian penyebab, komposisi, Dalam Investigasi per UID, insight.'],
  ];
  const DEFAULT = () => CORE.map((_, i) => ({ k: 'core', n: i + 1 }));
  let cutoff = null, busy = false, cat = null, D0 = null;
  let saved = DEFAULT(), savedInfo = null, items = DEFAULT().map(withId);
  const pending = new Map(); // fid -> {blob, ext} file unggahan yang belum tersimpan
  const blobCache = new Map(); // path -> Blob
  const zipCache = new Map(); // fid -> hasil inspect

  function withId(it) { return { ...it, _id: Math.random().toString(36).slice(2) }; }
  const clean = (it) => { const o = {}; Object.keys(it).forEach((k) => { if (k[0] !== '_') o[k] = it[k]; }); return o; };
  const sig = (arr) => JSON.stringify(arr.map(clean));
  const fidOf = (it) => it.fid || (it.f ? it.f.slice(DIR.length).replace(/\.[^.]+$/, '') : '');
  const loaded = {};
  const load = (src, test) => {
    if (test()) return Promise.resolve();
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => (test() ? res() : rej(new Error('gagal memuat ' + src))); s.onerror = () => { delete loaded[src]; rej(new Error('gagal memuat ' + src)); }; document.head.appendChild(s); });
    return loaded[src];
  };
  const msg = (id, t, cls) => { const m = $(id); m.textContent = t || ''; m.className = 'sl-msg' + (cls ? ' ' + cls : ''); };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const isAdmin = () => !!(window.SSAdmin && window.SSAdmin.isAdmin());
  const rawUrl = (p) => { const g = window.SS_GH || {}; return g.owner ? `https://raw.githubusercontent.com/${g.owner}/${g.repo}/${g.branch || 'main'}/${p}` : null; };

  async function fetchBlob(path) {
    if (blobCache.has(path)) return blobCache.get(path);
    let r = null;
    try { r = await fetch(path, { cache: 'no-store' }); } catch (e) { r = null; }
    if ((!r || !r.ok) && rawUrl(path)) r = await fetch(rawUrl(path) + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r || !r.ok) throw new Error('file ' + path + ' tidak ditemukan');
    const b = await r.blob(); blobCache.set(path, b); return b;
  }
  const fileBlob = (it) => (it.fid && pending.has(it.fid) ? Promise.resolve(pending.get(it.fid).blob) : fetchBlob(it.f));
  const toDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

  // ---------- susunan dari database ----------
  async function loadSaved() {
    let txt = null;
    try { if (isAdmin()) txt = await window.SSAdmin.get(CFG); } catch (e) { txt = null; }
    if (txt == null) { try { const r = await fetch(CFG + '?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) txt = await r.text(); } catch (e) { /* belum ada */ } }
    let cfg = null; try { cfg = txt ? JSON.parse(txt) : null; } catch (e) { cfg = null; }
    if (cfg && Array.isArray(cfg.items) && cfg.items.length) { saved = cfg.items; savedInfo = { by: cfg.by, at: cfg.at }; }
    items = saved.map(withId); pending.clear();
    renderList();
  }

  // ---------- langkah 1: bulan ----------
  function renderMonths() {
    const D = {}; let ok = true;
    SETS.forEach((k) => { const r = SSD.data(k); if (r.status !== 'ok') ok = false; else D[k] = r.data; });
    if (!ok) return;
    if (!window.SSSlides) { load('slides-core.js', () => !!window.SSSlides).then(renderMonths).catch((e) => msg('sl-msg', 'Tidak bisa memuat penyusun slide: ' + e.message, 'bad')); return; }
    D0 = D;
    const mo = window.SSSlides.months(D);
    const opts = []; for (let m = 2; m <= mo.max; m++) opts.push(m);
    if (cutoff == null || !opts.includes(cutoff)) cutoff = opts[opts.length - 1] || null;
    $('sl-months').replaceChildren(...opts.map((m) => { const b = el('button', 'ss-chip', BLN[m - 1]); b.type = 'button'; b.dataset.m = m; b.setAttribute('aria-pressed', String(m === cutoff)); return b; }));
    const nm = (m) => (m ? BLN[m - 1] : '—');
    $('sl-avail').textContent = `Data tersedia: SAIDI/SAIFI s.d. ${nm(mo.lastS)} (bulan selesai), Event Padam Penyulang s.d. ${nm(mo.lastG)}, Koreksi Cleansing s.d. ${nm(mo.lastK)}, Dupont Gangguan s.d. ${nm(mo.lastD)}. Pilihan bulan dibatasi sampai bulan yang tersedia di semua data.`;
    renderBtn();
    renderData();
  }
  function renderBtn() {
    $('sl-btn').disabled = !cutoff || busy || !items.length;
    $('sl-btn-t').textContent = !cutoff ? 'Memuat data…' : !items.length ? 'Belum ada slide di susunan' : `Buat & unduh paparan s.d. ${BLN[cutoff - 1]} 2026 (${items.length} slide)`;
  }

  // ---------- langkah 2: susunan slide ----------
  const thumbIO = window.IntersectionObserver ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { thumbIO.unobserve(e.target); fillThumb(e.target); } })) : null;
  function fillThumb(box) {
    const it = items.find((x) => x._id === box.dataset.id); if (!it || box.querySelector('img')) return;
    if (it.k === 'core') load('slides-thumbs.js', () => !!window.SS_SLIDE_THUMBS).then(() => { const im = new Image(); im.alt = ''; im.src = window.SS_SLIDE_THUMBS[it.n - 1]; box.append(im); }).catch(() => {});
    else if (it.k === 'img') fileBlob(it).then((b) => { const im = new Image(); im.alt = ''; im.src = URL.createObjectURL(b); box.append(im); }).catch(() => box.append(el('span', 'sl-th-txt', 'Gambar belum bisa dimuat')));
  }
  function describe(it) {
    if (it.k === 'core') return { badge: 'Slide data', cls: 'core', title: CORE[it.n - 1][0], sub: CORE[it.n - 1][1] };
    if (it.k === 'img') return { badge: 'Gambar', cls: 'img', title: it.name || 'Gambar', sub: 'Ditampilkan penuh di satu slide.' };
    return { badge: 'PowerPoint', cls: 'pptx', title: it.title || `Slide ${it.s + 1}`, sub: `${it.name || 'File PowerPoint'} · slide ${it.s + 1}${it.hidden ? ' (tersembunyi di file asal)' : ''}`, tokens: it.tokens || [] };
  }
  function renderList() {
    const ul = $('sl-order');
    ul.replaceChildren(...items.map((it, i) => {
      const d = describe(it);
      const li = el('li', 'sl-row'); li.dataset.id = it._id; li.draggable = true;
      const num = el('span', 'sl-num', String(i + 1));
      const th = el('div', 'sl-th sl-th-' + d.cls); th.dataset.id = it._id;
      if (it.k === 'pptx') { th.append(el('span', 'sl-th-ic', 'P'), el('span', 'sl-th-txt', it.title || 'Slide PowerPoint')); }
      const tx = el('div', 'sl-rtx'); const bd = el('span', 'sl-badge sl-b-' + d.cls, d.badge);
      if (!it.f && it.fid) bd.textContent += ' · baru';
      tx.append(bd, el('b', null, d.title), el('p', null, d.sub));
      if (it.k === 'pptx') {
        const known = cat ? d.tokens.filter((k) => k in cat.values || k in cat.tables) : d.tokens;
        const bad = cat ? d.tokens.filter((k) => !(k in cat.values || k in cat.tables)) : [];
        const dp = el('p', 'sl-tok');
        if (!d.tokens.length) dp.textContent = 'Tanpa data database (desain statis).';
        else {
          dp.append(el('span', null, `Data database: ${known.length} kode`));
          known.slice(0, 6).forEach((k) => dp.append(el('code', null, k)));
          if (known.length > 6) dp.append(el('span', null, `+${known.length - 6} lagi`));
          if (bad.length) { const w = el('span', 'sl-tok-bad', `Kode tidak dikenal (dibiarkan apa adanya): ${bad.join(', ')}`); dp.append(w); }
        }
        tx.append(dp);
      } else if (it.k === 'img') tx.append(el('p', 'sl-tok', 'Gambar tidak bisa diisi data. Untuk desain berisi data, unggah sebagai .pptx.'));
      const act = el('div', 'sl-ract');
      const mk = (a, label, svg, dis) => { const b = el('button', 'sl-ib'); b.type = 'button'; b.dataset.act = a; b.setAttribute('aria-label', label); b.title = label; b.innerHTML = svg; b.disabled = !!dis; return b; };
      act.append(
        mk('up', 'Naikkan', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>', i === 0),
        mk('down', 'Turunkan', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>', i === items.length - 1),
        mk('del', 'Hapus dari paparan', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'));
      li.append(num, th, tx, act);
      if (thumbIO && it.k !== 'pptx') thumbIO.observe(th); else if (it.k !== 'pptx') fillThumb(th);
      return li;
    }));
    // slide data yang tidak dipakai bisa ditambahkan lagi
    const used = new Set(items.filter((x) => x.k === 'core').map((x) => x.n));
    const sel = $('sl-add-core'); const free = CORE.map((c, i) => i + 1).filter((n) => !used.has(n));
    sel.replaceChildren(el('option', null, free.length ? 'Tambah slide data…' : 'Semua slide data sudah dipakai'), ...free.map((n) => { const o = el('option', null, `${n}. ${CORE[n - 1][0]}`); o.value = n; return o; }));
    sel.disabled = !free.length; sel.value = sel.options[0].value;
    renderState(); renderBtn();
  }
  function renderState() {
    const dirty = sig(items) !== sig(saved) || pending.size > 0;
    const st = $('sl-state');
    if (!dirty) st.textContent = savedInfo && savedInfo.at ? `Sama dengan susunan di database (disimpan ${savedInfo.by || 'admin'}, ${new Date(savedInfo.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}). Tidak perlu input ulang.` : 'Memakai susunan bawaan database (6 slide data). Tidak perlu input ulang.';
    else st.textContent = isAdmin() ? 'Ada perubahan yang belum disimpan ke database.' : 'Ada perubahan. Susunan ini tetap bisa langsung diunduh; untuk menyimpannya ke database perlu login admin.';
    st.className = 'sl-state' + (dirty ? ' dirty' : '');
    $('sl-save').hidden = !dirty; $('sl-reset').hidden = !dirty;
    $('sl-save').disabled = !isAdmin() || busy;
    $('sl-save').title = isAdmin() ? '' : 'Login admin di kanan bawah untuk menyimpan';
  }
  function move(from, to) { if (to < 0 || to >= items.length || from === to) return; const [x] = items.splice(from, 1); items.splice(to, 0, x); renderList(); }

  $('sl-order').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b || busy) return;
    const act = b.dataset.act; const id = b.closest('.sl-row').dataset.id;
    const i = items.findIndex((x) => x._id === id); if (i < 0) return;
    if (act === 'up') move(i, i - 1); else if (act === 'down') move(i, i + 1);
    else { items.splice(i, 1); renderList(); }
    // fokus tetap di baris yang sama (atau baris berikutnya setelah dihapus)
    const tid = act === 'del' ? (items[Math.min(i, items.length - 1)] || {})._id : id;
    const row = tid && document.querySelector(`#sl-order .sl-row[data-id="${tid}"]`);
    const btn = row && ([...row.querySelectorAll(`button[data-act="${act}"]`), ...row.querySelectorAll('button[data-act]')].find((x) => !x.disabled));
    if (btn) btn.focus();
  });
  let dragId = null;
  $('sl-order').addEventListener('dragstart', (e) => { const r = e.target.closest('.sl-row'); if (!r) return; dragId = r.dataset.id; r.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (err) { /* abaikan */ } });
  $('sl-order').addEventListener('dragend', () => { dragId = null; document.querySelectorAll('#sl-order .drag,#sl-order .over').forEach((x) => x.classList.remove('drag', 'over')); });
  $('sl-order').addEventListener('dragover', (e) => { if (!dragId) return; e.preventDefault(); const r = e.target.closest('.sl-row'); document.querySelectorAll('#sl-order .over').forEach((x) => x !== r && x.classList.remove('over')); if (r && r.dataset.id !== dragId) r.classList.add('over'); });
  $('sl-order').addEventListener('drop', (e) => { e.preventDefault(); const r = e.target.closest('.sl-row'); if (!dragId || !r) return; move(items.findIndex((x) => x._id === dragId), items.findIndex((x) => x._id === r.dataset.id)); });

  $('sl-add-core').addEventListener('change', (e) => { const n = Number(e.target.value); if (!n) return; items.push(withId({ k: 'core', n })); renderList(); });
  const newFid = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 6);

  async function addFiles(files) {
    const list = [...files]; if (!list.length) return;
    msg('sl-add-msg', 'Membaca file…');
    const notes = [];
    for (const f of list) {
      if (f.size > MAX_MB * 1048576) { notes.push(`${f.name}: lebih dari ${MAX_MB} MB`); continue; }
      const fid = newFid();
      if (/\.pptx$/i.test(f.name)) {
        try {
          await load(JSZIP_URL, () => !!window.JSZip); await load('slides-merge.js', () => !!window.SSPptxMerge);
          const ins = await window.SSPptxMerge.inspect(window.JSZip, f);
          if (!ins.slides.length) { notes.push(`${f.name}: tidak ada slide`); continue; }
          pending.set(fid, { blob: f, ext: 'pptx' }); zipCache.set(fid, ins);
          await load('slides-data.js', () => !!window.SSSlidesData);
          ins.slides.forEach((s, i) => { const tk = window.SSSlidesData.scan(s.xml); items.push(withId({ k: 'pptx', fid, name: f.name, s: i, title: s.title, hidden: s.hidden || undefined, tokens: tk.length ? tk : undefined })); });
          const sz = ins.size; if (sz && (Math.abs(sz.cx / sz.cy - 16 / 9) > 0.02 || Math.abs(sz.cx - 12192000) > 120000)) notes.push(`${f.name}: ukuran slide berbeda dari paparan (16:9, 13,33 × 7,5 inci), posisi isi bisa tidak pas`);
          notes.push(`${f.name}: ${ins.slides.length} slide ditambahkan`);
        } catch (e) { notes.push(`${f.name}: ${e.message}`); }
      } else if (/^image\/(png|jpeg)$/.test(f.type) || /\.(png|jpe?g)$/i.test(f.name)) {
        const dim = await new Promise((res) => { const im = new Image(); const u = URL.createObjectURL(f); im.onload = () => { res({ w: im.naturalWidth, h: im.naturalHeight }); URL.revokeObjectURL(u); }; im.onerror = () => res(null); im.src = u; });
        if (!dim) { notes.push(`${f.name}: gambar tidak bisa dibaca`); continue; }
        const ext = /png$/i.test(f.type) || /\.png$/i.test(f.name) ? 'png' : 'jpg';
        pending.set(fid, { blob: f, ext }); items.push(withId({ k: 'img', fid, name: f.name, w: dim.w, h: dim.h }));
        notes.push(`${f.name}: ditambahkan`);
      } else notes.push(`${f.name}: format belum didukung (pakai .pptx, .png atau .jpg)`);
    }
    renderList();
    msg('sl-add-msg', notes.join(' · '), notes.some((n) => /didukung|tidak|lebih dari|berbeda|gagal|valid/.test(n)) ? 'warn' : 'ok');
  }
  $('sl-file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  const drop = $('sl-drop');
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); drop.classList.add('over'); } }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('sl-file').click(); } });

  $('sl-reset').addEventListener('click', () => { if (busy) return; items = saved.map(withId); pending.clear(); renderList(); msg('sl-add-msg', 'Susunan dikembalikan ke database.'); });
  $('sl-save').addEventListener('click', async () => {
    if (busy || !isAdmin()) return;
    busy = true; renderState(); renderBtn();
    try {
      const used = new Set(items.filter((x) => x.fid && !x.f).map((x) => x.fid));
      let n = 0;
      for (const fid of used) {
        const p = pending.get(fid); if (!p) continue; n++;
        msg('sl-add-msg', `Mengunggah file ${n} dari ${used.size}…`);
        const path = `${DIR}${fid}.${p.ext}`;
        await window.SSAdmin.put(path, p.blob, `Desain Paparan: unggah ${path}`);
        blobCache.set(path, p.blob);
        items.forEach((x) => { if (x.fid === fid) { x.f = path; delete x.fid; } });
        if (zipCache.has(fid)) zipCache.set(path, zipCache.get(fid));
      }
      const cfg = { v: 1, items: items.map(clean), by: (window.SSAdmin.name && window.SSAdmin.name()) || 'admin', at: new Date().toISOString() };
      msg('sl-add-msg', 'Menyimpan susunan…');
      await window.SSAdmin.put(CFG, JSON.stringify(cfg, null, 1) + '\n', 'Desain Paparan: simpan susunan slide');
      saved = cfg.items; savedInfo = { by: cfg.by, at: cfg.at }; pending.clear();
      msg('sl-add-msg', 'Susunan tersimpan ke database. Halaman live ikut berubah sekitar 1 menit lagi.', 'ok');
    } catch (e) { msg('sl-add-msg', 'Gagal menyimpan: ' + ((e && e.message) || e), 'bad'); }
    busy = false; renderList();
  });

  // ---------- data database untuk desain ----------
  // data kondisi sistem harian (kondisi_data.js + kondisi_update.js), tidak mengikuti bulan cutoff
  const kondisiData = () => { const d = window.__D || {}; return d.kondisi_day ? { meta: d.kondisi_meta, day: d.kondisi_day, mon: d.kondisi_mon, upd: d.kondisi_update } : null; };
  let q = '';
  const openG = new Set(['Umum']);
  function renderData() {
    if (!D0 || !cutoff) return;
    load('slides-data.js', () => !!window.SSSlidesData).then(() => {
      if (!cat || cat.m !== cutoff || cat.k !== !!kondisiData()) { cat = window.SSSlidesData.catalog(D0, cutoff, kondisiData()); cat.m = cutoff; cat.k = !!kondisiData(); renderList(); }
      $('sl-data-m').textContent = BLN[cutoff - 1] + ' 2026';
      const box = $('sl-data-list'); const ql = q.trim().toLowerCase();
      const gs = cat.groups.map((g) => {
        const its = g.items.filter((x) => { const h = (x.label + ' ' + x.key + ' ' + x.value + ' ' + g.name).toLowerCase(); return !ql || ql.split(/\s+/).every((w) => h.includes(w)); });
        if (!its.length) return null;
        const det = el('details', 'sl-dg'); det.open = !!ql || openG.has(g.name); det.dataset.g = g.name;
        const sm = el('summary', null, g.name); sm.append(el('span', 'sl-dg-n', String(its.length))); det.append(sm);
        const ul = el('ul', 'sl-dl');
        its.forEach((x) => {
          const li = el('li', 'sl-di' + (x.table ? ' tbl' : ''));
          const b = el('button', 'sl-code'); b.type = 'button'; b.dataset.code = `{{${x.key}}}`; b.title = 'Salin kode'; b.textContent = `{{${x.key}}}`;
          li.append(el('span', 'sl-dl-l', x.label), el('span', 'sl-dl-v', x.value), b); ul.append(li);
        });
        det.append(ul); return det;
      }).filter(Boolean);
      box.replaceChildren(...(gs.length ? gs : [el('p', 'sl-avail', 'Tidak ada data yang cocok.')]));
    }).catch(() => {});
  }
  $('sl-data-q').addEventListener('input', (e) => { q = e.target.value; renderData(); });
  $('sl-data-list').addEventListener('toggle', (e) => { const d = e.target; if (!q && d.dataset && d.dataset.g) { if (d.open) openG.add(d.dataset.g); else openG.delete(d.dataset.g); } }, true);
  $('sl-data-list').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-code]'); if (!b) return;
    const code = b.dataset.code; let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch (err) {
      const t = document.createElement('textarea'); t.value = code; document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } t.remove();
    }
    b.textContent = ok ? 'Tersalin' : code; b.classList.toggle('ok', ok);
    setTimeout(() => { b.textContent = code; b.classList.remove('ok'); }, 1400);
  });
  // contoh desain berisi kode data
  $('sl-sample').addEventListener('click', async () => {
    try {
      msg('sl-add-msg', 'Menyiapkan contoh desain…');
      await load(PPTX_URL, () => !!window.PptxGenJS);
      const P = new window.PptxGenJS(); P.layout = 'LAYOUT_WIDE'; P.title = 'Contoh desain paparan';
      const s = P.addSlide(); s.background = { color: 'FFFFFF' };
      s.addShape(P.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 1.0, fill: { color: '13254A' }, line: { color: '13254A' } });
      s.addText('KINERJA SAIDI S.D. {{BULAN}} {{TAHUN}}', { x: 0.4, y: 0.15, w: 12.5, h: 0.7, fontFace: 'Arial', fontSize: 26, bold: true, color: 'FFFFFF' });
      [['SAIDI Sumkal', '{{SAIDI_REAL_SUMKAL}}', 'menit/pelanggan'], ['Target s.d. bulan', '{{SAIDI_TARGET_SUMKAL}}', 'menit/pelanggan'], ['Pencapaian', '{{SAIDI_CAPAIAN_SUMKAL}}', 'terhadap target']].forEach(([l, v, u], i) => {
        const x = 0.4 + i * 4.2;
        s.addShape(P.shapes.ROUNDED_RECTANGLE, { x, y: 1.25, w: 4.0, h: 1.2, rectRadius: 0.1, fill: { color: 'EAF3FC' }, line: { color: 'C9D6EA' } });
        s.addText([{ text: l + '\n', options: { fontSize: 12, color: '5B6B86' } }, { text: v, options: { fontSize: 26, bold: true, color: '1E5BC6' } }, { text: '  ' + u, options: { fontSize: 11, color: '5B6B86' } }], { x: x + 0.15, y: 1.3, w: 3.7, h: 1.1, fontFace: 'Arial', valign: 'middle' });
      });
      s.addText('{{TABEL_SAIDI_UID}}', { x: 0.4, y: 2.7, w: 7.4, h: 4.5, fontFace: 'Arial', fontSize: 14, color: '1E5BC6', align: 'center', valign: 'middle', fill: { color: 'F3F7FC' }, line: { color: '1E5BC6', dashType: 'dash' } });
      s.addText([{ text: 'Cara pakai\n', options: { bold: true, fontSize: 13 } }, { text: 'Kode {{...}} di kotak teks diganti angka sesuai bulan cutoff saat paparan dibuat. Kotak yang isinya hanya kode tabel (kiri) diganti tabel dengan posisi dan ukuran yang sama. Daftar kode ada di tab Desain Paparan.\n\nPenyebab terbesar: {{PENYEBAB_1_NAMA}} ({{PENYEBAB_1_JUMLAH}} kali).', options: { fontSize: 11 } }], { x: 8.1, y: 2.7, w: 4.8, h: 4.5, fontFace: 'Arial', color: '13254A', valign: 'top', fill: { color: 'FFF8E1' }, line: { color: 'FFC81E' } });
      const blob = await P.write({ outputType: 'blob' });
      const filename = 'Contoh_Desain_Paparan.pptx';
      let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
      if (dl) await dl.save({ filename, data: blob });
      else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
      msg('sl-add-msg', `${filename} sudah diunduh. Ubah desainnya di PowerPoint, lalu unggah kembali di sini.`, 'ok');
    } catch (e) { if (!(e && e.code === 'declined')) msg('sl-add-msg', 'Gagal membuat contoh: ' + ((e && e.message) || e), 'bad'); else msg('sl-add-msg', ''); }
  });

  // ---------- langkah 3: buat dan unduh ----------
  $('sl-months').addEventListener('click', (e) => { const b = e.target.closest('button[data-m]'); if (!b || busy) return; cutoff = Number(b.dataset.m); renderMonths(); msg('sl-msg', ''); });
  $('sl-btn').addEventListener('click', async () => {
    if (!cutoff || busy || !items.length) return;
    busy = true; renderBtn(); renderState();
    try {
      msg('sl-msg', 'Memuat pembuat PowerPoint…');
      const hasP = items.some((x) => x.k === 'pptx');
      await load(PPTX_URL, () => !!window.PptxGenJS);
      await load('slides-core.js', () => !!window.SSSlides);
      await load('slides-assets.js', () => !!window.SS_SLIDE_ASSETS);
      if (hasP) { await load(JSZIP_URL, () => !!window.JSZip); await load('slides-merge.js', () => !!window.SSPptxMerge); await load('slides-data.js', () => !!window.SSSlidesData); if (!cat || cat.m !== cutoff || cat.k !== !!kondisiData()) { cat = window.SSSlidesData.catalog(D0, cutoff, kondisiData()); cat.m = cutoff; cat.k = !!kondisiData(); } }
      msg('sl-msg', 'Menyiapkan slide unggahan…');
      const plan = []; const fills = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.k === 'core') plan.push({ k: 'core', n: it.n });
        else if (it.k === 'img') plan.push({ k: 'img', data: await toDataUrl(await fileBlob(it)), w: it.w, h: it.h, name: it.name });
        else {
          const key = it.f || it.fid;
          if (!zipCache.has(key)) zipCache.set(key, await window.SSPptxMerge.inspect(window.JSZip, await fileBlob(it)));
          const ins = zipCache.get(key); const s = ins.slides[it.s];
          if (!s) throw new Error(`slide ${it.s + 1} tidak ada di ${it.name}`);
          plan.push({ k: 'pptx' }); fills.push({ at: i + 1, zip: ins.zip, path: s.path, transform: (x) => window.SSSlidesData.fill(x, cat) });
        }
      }
      msg('sl-msg', `Menyusun ${items.length} slide…`);
      const D = {}; SETS.forEach((k) => { D[k] = SSD.data(k).data; });
      const pres = await window.SSSlides.build(window.PptxGenJS, D, cutoff, window.SS_SLIDE_ASSETS, plan);
      let blob;
      if (fills.length) blob = await window.SSPptxMerge.merge(window.JSZip, await pres.write({ outputType: 'arraybuffer' }), fills);
      else blob = await pres.write({ outputType: 'blob' });
      const filename = `Paparan_Keandalan_Sumkal_sd_${BLN[cutoff - 1]}_2026.pptx`;
      let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
      if (dl) { const r = await dl.save({ filename, data: blob }); msg('sl-msg', r && r.status === 'saved' ? `${filename} sudah diunduh.` : '', 'ok'); }
      else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); msg('sl-msg', `${filename} sudah diunduh.`, 'ok'); }
    } catch (e) {
      if (e && e.code === 'declined') msg('sl-msg', ''); else msg('sl-msg', 'Gagal membuat PowerPoint: ' + ((e && e.message) || e), 'bad');
    } finally { busy = false; renderBtn(); renderState(); }
  });

  renderList();
  loadSaved();
  SSD.onData(renderMonths);
  // status admin bisa berubah setelah login/keluar
  new MutationObserver((ms) => { if (ms.some((m) => m.target.id === 'ss-admin')) renderState(); }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['data-on'] });
})();
