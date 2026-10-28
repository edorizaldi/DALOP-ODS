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
  let cutoff = null, busy = false;
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
    const mo = window.SSSlides.months(D);
    const opts = []; for (let m = 2; m <= mo.max; m++) opts.push(m);
    if (cutoff == null || !opts.includes(cutoff)) cutoff = opts[opts.length - 1] || null;
    $('sl-months').replaceChildren(...opts.map((m) => { const b = el('button', 'ss-chip', BLN[m - 1]); b.type = 'button'; b.dataset.m = m; b.setAttribute('aria-pressed', String(m === cutoff)); return b; }));
    const nm = (m) => (m ? BLN[m - 1] : '—');
    $('sl-avail').textContent = `Data tersedia: SAIDI/SAIFI s.d. ${nm(mo.lastS)} (bulan selesai), Event Padam Penyulang s.d. ${nm(mo.lastG)}, Koreksi Cleansing s.d. ${nm(mo.lastK)}, Dupont Gangguan s.d. ${nm(mo.lastD)}. Pilihan bulan dibatasi sampai bulan yang tersedia di semua data.`;
    renderBtn();
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
    return { badge: 'PowerPoint', cls: 'pptx', title: it.title || `Slide ${it.s + 1}`, sub: `${it.name || 'File PowerPoint'} · slide ${it.s + 1}${it.hidden ? ' (tersembunyi di file asal)' : ''}` };
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
          ins.slides.forEach((s, i) => items.push(withId({ k: 'pptx', fid, name: f.name, s: i, title: s.title, hidden: s.hidden || undefined })));
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
      if (hasP) { await load(JSZIP_URL, () => !!window.JSZip); await load('slides-merge.js', () => !!window.SSPptxMerge); }
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
          plan.push({ k: 'pptx' }); fills.push({ at: i + 1, zip: ins.zip, path: s.path });
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
