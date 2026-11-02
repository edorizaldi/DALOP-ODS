// Tab Update Data Bulanan, cluster Database: unggah ALL_DATA_ASET_JARINGAN.xlsx untuk menyusun ulang data tab Hirarki Aset.
// File dibaca di browser (APKT.readSheets), disusun dengan hx-build.js, lalu disimpan ke repo dalam satu commit bila admin sudah login.
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('up-aset')) return;
  const f0 = new Intl.NumberFormat('id-ID');
  const fmt = (v) => (v === '' || v == null ? '–' : f0.format(Number(v)));
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const SHEETS = ['GI', 'FEEDER', 'ZONA', 'SECTION', 'SEGMENT', 'LATERAL', 'GARDU', 'TRAFO'];
  const IDS = ['hx_gi', 'hx_feeder', 'hx_zona', 'hx_section', 'hx_segment', 'hx_lateral', 'hx_gardu_1', 'hx_gardu_2', 'hx_gardu_3', 'hx_anomali', 'hx_ringkasan', 'hx_trafo_metode', 'hx_ringkasan_unit'];
  const msg = (t, cls) => { const m = $('up-a-msg'); m.textContent = t || ''; m.className = 'ss-up-msg' + (cls ? ' ' + cls : ''); };
  const loaded = {};
  const load = (src, test) => {
    if (test()) return Promise.resolve();
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => (test() ? res() : rej(new Error('gagal memuat ' + src))); s.onerror = () => { delete loaded[src]; rej(new Error('gagal memuat ' + src)); }; document.head.appendChild(s); });
    return loaded[src];
  };
  const curRingkasan = () => (window.__D && window.__D.hx_ringkasan) || null;

  // isi kartu: jumlah aset yang tersambung saat ini
  function fillCard() {
    const R = curRingkasan(); if (!R) return;
    const g = (k) => R.find((r) => r.level === k) || {};
    $('u-a-isi').textContent = `${fmt(g('GI').terhubung)} GI, ${fmt(g('FEEDER').terhubung)} feeder, ${fmt(g('GARDU').terhubung)} gardu dan ${fmt(g('TRAFO').terhubung)} trafo yang tersambung ke GI`;
  }
  load('hx_ringkasan.js', () => !!curRingkasan()).then(fillCard).catch(() => {});

  let pending = null; // { name, out }
  function review() {
    $('up-a-review').hidden = !pending; $('up-a-go').disabled = !pending;
    if (!pending) return;
    const R = pending.out.files.hx_ringkasan, C = curRingkasan() || [];
    $('up-a-body').replaceChildren(...R.map((r) => {
      const c = C.find((x) => x.level === r.level); const d = c ? Number(r.terhubung) - Number(c.terhubung) : null;
      const tr = document.createElement('tr');
      [r.level, fmt(r.total), fmt(r.terhubung), fmt(r.putus), c ? fmt(c.terhubung) : '–', d == null ? '–' : (d > 0 ? '+' : '') + f0.format(d)].forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i) td.className = 'num'; tr.append(td); });
      return tr;
    }));
    const s = pending.out.stats, m = s.metode;
    $('up-a-sum').textContent = `${pending.name}: ${fmt(s.gi)} GI dan ${fmt(s.feeder)} feeder tersambung; ${fmt(s.garduOk)} dari ${fmt(s.gardu)} gardu dan ${fmt(s.trafoOk)} dari ${fmt(s.trafo)} trafo tersambung ke GI. Trafo dicocokkan lewat KODE_GARDU ${fmt(m.KODE_GARDU)}, lewat nama gardu ${fmt(m['NAMA (cadangan)'])}, tidak cocok ${fmt(m['TIDAK COCOK'])}. ${fmt(s.anomali)} baris aset bermasalah. Periksa angkanya, lalu klik Update dashboard sekarang.`;
  }

  async function handle(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { msg('Pilih file .xlsx.', 'bad'); return; }
    if (!window.APKT || !window.APKT.readSheets) { msg('Pembaca Excel belum termuat. Muat ulang halaman lalu coba lagi.', 'bad'); return; }
    pending = null; review(); msg('');
    const bar = $('up-a-bar'), lab = $('up-a-barlabel'); bar.hidden = false; bar.value = 0;
    try {
      const sheets = await window.APKT.readSheets(file, (label, frac) => { bar.value = Math.round(frac * 100); lab.textContent = `${label} · ${Math.round(frac * 100)}%`; });
      const pick = {}; const norm = (x) => String(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const miss = SHEETS.filter((n) => { const sh = sheets.find((x) => norm(x.name) === norm(n)); if (sh) pick[n] = sh.rows; return !sh; });
      if (miss.length) throw new Error(`sheet ${miss.join(', ')} tidak ada di file ini`);
      lab.textContent = 'Menyusun hirarki…'; await load('hx-build.js', () => !!window.SSHxBuild);
      await new Promise((r) => setTimeout(r, 30));
      const out = window.SSHxBuild.build(pick, (t) => { lab.textContent = t + '…'; });
      pending = { name: file.name, out };
    } catch (e) { msg('File tidak bisa dibaca: ' + ((e && e.message) || e), 'bad'); }
    bar.hidden = true; lab.textContent = '';
    review();
  }

  async function apply() {
    if (!pending) return;
    const { name, out } = pending; const btn = $('up-a-go'); btn.disabled = true;
    const now = new Date(); const at = now.toISOString();
    const tgl = `${now.getDate()} ${BLN[now.getMonth()]} ${now.getFullYear()}`;
    const periode = `Data aset per ${tgl}`, sumber = `${name} (sheet GI, FEEDER, ZONA, SECTION, SEGMENT, LATERAL, GARDU, TRAFO)`;
    const info = ((window.SSD && SSD.data('info_update').data) || (window.__D && window.__D.info_update) || []).map((r) => ({ ...r }));
    const row = { tab: 'hirarki', diperbarui: at, periode, sumber: sumber + ' (diunggah di dashboard)' };
    const i = info.findIndex((r) => r.tab === 'hirarki'); if (i >= 0) info[i] = row; else info.push(row);
    // pakai langsung di tampilan ini
    const ov = { info_update: info };
    IDS.forEach((id) => { window.__D[id] = out.files[id]; ov[id] = out.files[id]; });
    window.__D.info_update = info;
    if (window.SSD && SSD.set) SSD.set(ov);
    if (window.SSDbInfo && SSDbInfo.set) SSDbInfo.set('hirarki', at, periode, sumber);
    fillCard();
    const A = window.SSAdmin; let saved = false, why = '';
    if (A && A.isAdmin() && A.putMany) {
      const bar = $('up-a-bar'), lab = $('up-a-barlabel'); bar.hidden = false;
      try {
        const files = IDS.map((id) => ({ path: id + '.js', text: window.SSHxBuild.toJs(id, out.files[id]) }));
        files.push({ path: 'info_update.js', text: 'window.__D=window.__D||{};window.__D["info_update"]=' + JSON.stringify(info) + ';\n' });
        await A.putMany(files, `Update database aset jaringan (Hirarki Aset) dari ${name} di dashboard`, (t, f) => { bar.value = Math.round(f * 100); lab.textContent = t; msg(t + '…'); });
        saved = true;
      } catch (e) { why = e && e.code === 'gh-403' ? 'token admin belum punya izin menulis ke repo ini' : e && e.code === 'gh-401' ? 'login admin sudah tidak berlaku; keluar lalu login lagi' : ((e && e.message) || String(e)); }
      bar.hidden = true; lab.textContent = '';
    }
    msg(saved ? 'Database aset sudah diperbarui dan disimpan ke repo dalam satu commit. Tab Hirarki Aset di layar ini langsung memakai data baru; pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).'
      : `Tab Hirarki Aset di layar ini sudah memakai data baru, tetapi belum tersimpan untuk pembaca lain (${why || 'belum login admin'}). Untuk menyimpannya, klik "Login admin" (kanan bawah), lalu unggah ulang file yang sama.`, saved ? 'ok' : '');
    pending = null; review();
  }

  const drop = $('up-a-drop'), input = $('up-a-file');
  input.addEventListener('change', () => { const f = input.files[0]; input.value = ''; handle(f); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handle(f); });
  $('up-a-go').addEventListener('click', apply);
  $('up-a-cancel').addEventListener('click', () => { pending = null; review(); msg(''); });
})();
