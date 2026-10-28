// Tab "Buat Slide PowerPoint": pilih bulan cutoff, lalu unduh 6 slide infografis (.pptx) dari database dashboard.
// Library dimuat saat tombol diklik: pptxgenjs (CDN), slides-core.js (penyusun slide), slides-assets.js (gambar).
(() => {
  const $ = (id) => document.getElementById(id);
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const PPTX_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js';
  const SETS = ['kumulatif', 'bulanan', 'target', 'gangguan_ps', 'kc_bulanan', 'gangguan_dupont'];
  const SLIDES = [
    ['Kinerja SAIDI per UID', 'Peta UID dengan target 2026, target dan realisasi s.d. cutoff, rekap Sumkal dan tren kumulatif.'],
    ['Kinerja SAIFI per UID', 'Sama seperti slide SAIDI, untuk SAIFI.'],
    ['SAIDI jaringan distribusi', 'Angka kunci, tren bulanan per UID, ranking bulan cutoff dan kumulatif, tabel bulanan dan kumulatif.'],
    ['SAIFI jaringan distribusi', 'Sama seperti slide SAIDI, untuk SAIFI.'],
    ['Jumlah kali gangguan penyulang', 'Permanen, sesaat, cleansing dan koreksi (kode J): tren, komposisi, rekap dan ranking per UID.'],
    ['Penyebab gangguan penyulang', 'Rincian penyebab per bulan, komposisi, Dalam Investigasi per UID, evaluasi dan insight.'],
  ];
  let cutoff = null, busy = false;
  const loaded = {};
  const load = (src, test) => {
    if (test()) return Promise.resolve();
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => (test() ? res() : rej(new Error('gagal memuat ' + src))); s.onerror = () => { delete loaded[src]; rej(new Error('gagal memuat ' + src)); }; document.head.appendChild(s); });
    return loaded[src];
  };
  const msg = (t, cls) => { const m = $('sl-msg'); m.textContent = t || ''; m.className = 'sl-msg' + (cls ? ' ' + cls : ''); };

  // daftar slide dan pratinjau
  const list = $('sl-list');
  list.replaceChildren(...SLIDES.map(([t, d], i) => {
    const li = document.createElement('li'); li.className = 'sl-item';
    const fig = document.createElement('div'); fig.className = 'sl-thumb'; fig.dataset.i = i;
    const b = document.createElement('b'); b.textContent = `${i + 1}. ${t}`;
    const p = document.createElement('p'); p.textContent = d;
    li.append(fig, b, p); return li;
  }));
  const showThumbs = () => load('slides-thumbs.js', () => !!window.SS_SLIDE_THUMBS).then(() => {
    document.querySelectorAll('.sl-thumb').forEach((f) => { if (f.firstChild) return; const im = new Image(); im.alt = 'Contoh tampilan slide ' + (Number(f.dataset.i) + 1); im.src = window.SS_SLIDE_THUMBS[f.dataset.i]; f.append(im); });
  }).catch(() => {});
  // pratinjau baru dimuat saat tab terlihat
  if (window.IntersectionObserver) { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); showThumbs(); } }); io.observe(list); } else showThumbs();

  function render() {
    const D = {}; let ok = true;
    SETS.forEach((k) => { const r = SSD.data(k); if (r.status !== 'ok') ok = false; else D[k] = r.data; });
    if (!ok || !window.SSSlidesMonths) { if (ok) prepMonths(D); return; }
    const mo = window.SSSlidesMonths(D);
    const opts = []; for (let m = 2; m <= mo.max; m++) opts.push(m);
    if (cutoff == null || !opts.includes(cutoff)) cutoff = opts[opts.length - 1] || null;
    const box = $('sl-months');
    box.replaceChildren(...opts.map((m) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ss-chip'; b.dataset.m = m; b.textContent = BLN[m - 1]; b.setAttribute('aria-pressed', String(m === cutoff)); return b; }));
    $('sl-btn').disabled = !cutoff || busy;
    $('sl-btn-t').textContent = cutoff ? `Buat & unduh PowerPoint s.d. ${BLN[cutoff - 1]} 2026` : 'Data belum tersedia';
    const nm = (m) => (m ? BLN[m - 1] : '—');
    $('sl-avail').textContent = `Data tersedia: SAIDI/SAIFI s.d. ${nm(mo.lastS)} (bulan selesai), Event Padam Penyulang s.d. ${nm(mo.lastG)}, Koreksi Cleansing s.d. ${nm(mo.lastK)}, Dupont Gangguan s.d. ${nm(mo.lastD)}. Pilihan bulan dibatasi sampai bulan yang tersedia di semua data.`;
  }
  // fungsi bulan tersedia butuh slides-core; muat ringan lebih dulu
  function prepMonths() { load('slides-core.js', () => !!window.SSSlides).then(() => { window.SSSlidesMonths = window.SSSlides.months; render(); }).catch((e) => msg('Tidak bisa memuat penyusun slide: ' + e.message, 'bad')); }

  $('sl-months').addEventListener('click', (e) => { const b = e.target.closest('button[data-m]'); if (!b || busy) return; cutoff = Number(b.dataset.m); render(); msg(''); });
  $('sl-btn').addEventListener('click', async () => {
    if (!cutoff || busy) return;
    busy = true; $('sl-btn').disabled = true;
    try {
      msg('Memuat pembuat PowerPoint…');
      await load(PPTX_URL, () => !!window.PptxGenJS);
      await load('slides-core.js', () => !!window.SSSlides);
      await load('slides-assets.js', () => !!window.SS_SLIDE_ASSETS);
      msg('Menyusun 6 slide…');
      const D = {}; SETS.forEach((k) => { D[k] = SSD.data(k).data; });
      const pres = await window.SSSlides.build(window.PptxGenJS, D, cutoff, window.SS_SLIDE_ASSETS);
      const blob = await pres.write({ outputType: 'blob' });
      const filename = `Kinerja_Keandalan_Sumkal_sd_${BLN[cutoff - 1]}_2026.pptx`;
      let dl = null; try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
      if (dl) { const r = await dl.save({ filename, data: blob }); msg(r && r.status === 'saved' ? `${filename} sudah diunduh.` : '', 'ok'); }
      else { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); msg(`${filename} sudah diunduh.`, 'ok'); }
    } catch (e) {
      if (e && e.code === 'declined') msg(''); else msg('Gagal membuat PowerPoint: ' + ((e && e.message) || e), 'bad');
    } finally { busy = false; render(); }
  });
  SSD.onData(render);
})();
