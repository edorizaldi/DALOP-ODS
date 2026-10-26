// Tab Update Data Bulanan: unggah file, hitung ulang dataset, lalu perbarui dashboard langsung.
(() => {
  const $ = (id) => document.getElementById(id);
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const f0 = nf(0), f2 = nf(2), f3 = nf(3);
  const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [a, v] of Object.entries(props)) { if (a.includes('-')) e.setAttribute(a, v); else e[a] = v; } kids.flat().forEach((x) => e.append(x)); return e; };
  const U = SSUP;

  // ---------- penyimpanan ----------
  let capsP = null;
  const caps = () => capsP || (capsP = (async () => {
    const c = window.claude; if (!c || !c.use) return { db: null, assets: null };
    const [db, assets] = await Promise.all([c.use('db').catch(() => null), c.use('assets').catch(() => null)]);
    return { db, assets };
  })());
  // items: [{id, text, name, type, rows}] — rows dipakai langsung di tampilan ini.
  // tabs: [{tab, periode, sumber}] — baris info update yang diganti.
  async function commit(tabs, items, sumber, setMsg) {
    const at = new Date().toISOString();
    const info = (SSD.data('info_update').data || []).map((r) => ({ ...r }));
    for (const x of tabs) {
      const row = { tab: x.tab, diperbarui: at, periode: x.periode, sumber: x.sumber + ' (diunggah di dashboard)' };
      const i = info.findIndex((r) => r.tab === x.tab); if (i >= 0) info[i] = row; else info.push(row);
    }
    const all = [...items, { id: 'info_update', text: JSON.stringify(info), name: 'info_update.json', type: 'application/json', rows: info }];
    const ov = {}; all.forEach((it) => { ov[it.id] = it.rows; });
    SSD.set(ov);
    const { db, assets } = await caps();
    if (!db || !assets) return { saved: false, reason: 'none' };
    try {
      const up = [];
      for (const it of all) { setMsg(`Menyimpan ${it.name}…`); up.push(await assets.upload(new Blob([it.text], { type: it.type }), { type: it.type })); }
      for (let k = 0; k < all.length; k++) {
        setMsg(`Memperbarui sumber data ${k + 1} dari ${all.length}…`);
        await db.doc('datasets/' + all[k].id).update({ source: { kind: 'file', url: '/_blob/' + up[k].id, name: all[k].name }, updated: { at, by: 'Diunggah di dashboard, dari ' + sumber } });
      }
      return { saved: true };
    } catch (e) { return { saved: false, reason: (e && (e.code || e.message)) || String(e) }; }
  }
  const doneText = (r, what) => r.saved
    ? `${what} sudah diperbarui dan disimpan. Semua tab terkait langsung memakai data baru, dan siapa pun yang membuka dashboard melihat data yang sama.`
    : `${what} sudah dipakai di tampilan ini, tetapi belum tersimpan untuk pembaca lain (${r.reason === 'none' ? 'belum login admin' : 'penyimpanan menolak: ' + r.reason}). Untuk menyimpannya, klik "Login admin untuk update data" (kanan bawah), lalu unggah ulang file yang sama.`;

  // ---------- panel buka/tutup ----------
  const openers = document.querySelectorAll('[data-up-open]');
  openers.forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.upOpen; const p = $('up-' + id); const show = p.hidden;
    document.querySelectorAll('.ss-up-panel').forEach((x) => { x.hidden = true; });
    openers.forEach((x) => x.setAttribute('aria-expanded', 'false'));
    p.hidden = !show; b.setAttribute('aria-expanded', String(show));
    if (show) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  function dropzone(dropId, inputId, onFiles) {
    const drop = $(dropId), input = $(inputId);
    input.addEventListener('change', () => { const fs = [...input.files]; input.value = ''; if (fs.length) onFiles(fs); });
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { const fs = [...((e.dataTransfer && e.dataTransfer.files) || [])]; if (fs.length) onFiles(fs); });
  }
  const msg = (id, text, cls) => { const m = $(id); m.textContent = text; m.className = 'ss-up-msg' + (cls ? ' ' + cls : ''); };
  const need = (ids) => { const st = ids.map((x) => SSD.data(x)); const bad = st.find((d) => d.status !== 'ok'); return bad ? null : st.map((d) => d.data); };

  // ================= SAIDI SAIFI =================
  let sItems = [];
  function sUnits() { const d = need(['bulanan']); return d ? U.unitsFrom(d[0]) : []; }
  const sKey = (t, m, u) => `${t}|${m}|${u}`;
  async function sFiles(files) {
    const units = sUnits();
    const d0 = need(['bulanan']);
    const have = new Set(d0 ? d0[0].filter((r) => r.level === 'UP3').map((r) => sKey(r.tahun, r.bulan, r.unit)) : []);
    const complete = (t, m) => units.every((u) => have.has(sKey(t, m, u.unit)));
    const notes = [];
    const add = (it) => { sItems = sItems.filter((p) => !(p.rec && it.rec && p.unit && p.unit === it.unit && p.rec.bulan === it.rec.bulan && p.rec.tahun === it.rec.tahun)); sItems.push(it); };
    for (const file of files) {
      if (!/\.xlsx$/i.test(file.name)) { add({ file: file.name, rec: null, unit: null, warn: [], error: 'Bukan file .xlsx.' }); continue; }
      msg('up-s-msg', `Membaca ${file.name}…`);
      let sheets;
      try { sheets = await APKT.readSheets(file); } catch (e) { add({ file: file.name, rec: null, unit: null, warn: [], error: e.message || String(e) }); continue; }
      // setiap sheet berformat LAPORAN SAIDI SAIFI dibaca; sheet lain (rekap, data) dilewati
      const found = [];
      for (const sh of sheets) {
        try {
          const { rec, warn } = U.parseLaporan(sh.rows);
          const u = U.matchUnit(units, rec.up3_file);
          found.push({ file: sheets.length > 1 ? `${file.name} · ${sh.name}` : file.name, rec, unit: u ? u.unit : null, warn: u ? warn : [...warn, `UP3 "${rec.up3_file}" tidak dikenali, pilih manual.`], error: null });
        } catch (e) { if (sheets.length === 1) found.push({ file: file.name, rec: null, unit: null, warn: [], error: e.message || String(e) }); }
      }
      if (!found.length) { add({ file: file.name, rec: null, unit: null, warn: [], error: 'Tidak ada sheet berformat LAPORAN SAIDI SAIFI per UP3.' }); continue; }
      // workbook berisi banyak bulan: ambil bulan yang belum lengkap di dashboard; bila semua sudah ada, ambil bulan terakhir
      const months = [...new Set(found.filter((x) => x.rec).map((x) => x.rec.tahun * 100 + x.rec.bulan))].sort((a, b) => a - b);
      let keep = months;
      if (months.length > 1) {
        keep = months.filter((tm) => !complete(Math.floor(tm / 100), tm % 100));
        if (!keep.length) keep = [months[months.length - 1]];
        const skip = months.filter((tm) => !keep.includes(tm));
        if (skip.length) notes.push(`${file.name}: ${found.filter((x) => x.rec && skip.includes(x.rec.tahun * 100 + x.rec.bulan)).length} sheet bulan ${skip.map((tm) => BLN[tm % 100 - 1]).join(', ')} dilewati karena bulan itu sudah lengkap di dashboard.`);
      }
      found.filter((x) => !x.rec || keep.includes(x.rec.tahun * 100 + x.rec.bulan)).forEach(add);
    }
    msg('up-s-msg', notes.join(' '));
    sRender();
  }
  function sStatus(it, have) {
    if (it.error) return ['err', 'Error'];
    if (!it.unit) return ['err', 'Pilih UP3'];
    const dup = sItems.filter((p) => p !== it && !p.error && p.unit === it.unit && p.rec && p.rec.bulan === it.rec.bulan && p.rec.tahun === it.rec.tahun).length;
    if (dup) return ['err', 'Ganda'];
    return have.has(sKey(it.rec.tahun, it.rec.bulan, it.unit)) ? ['replace', 'Ganti data lama'] : ['new', 'Baru'];
  }
  function sRender() {
    const d = need(['bulanan']); const units = sUnits();
    $('up-s-review').hidden = !sItems.length;
    if (!d) return;
    const have = new Set(d[0].filter((r) => r.level === 'UP3').map((r) => sKey(r.tahun, r.bulan, r.unit)));
    const uids = [...new Set(units.map((u) => u.uid))];
    $('up-s-body').replaceChildren(...sItems.map((it, i) => {
      const [cls, label] = sStatus(it, have); const r = it.rec;
      const sel = el('select', { 'aria-label': 'UP3' }); sel.append(el('option', { value: '', textContent: '— pilih UP3 —' }));
      uids.forEach((g) => { const og = el('optgroup', { label: 'UID ' + g }); units.filter((u) => u.uid === g).forEach((u) => og.append(el('option', { value: u.unit, textContent: u.unit }))); sel.append(og); });
      sel.value = it.unit || ''; sel.disabled = !r;
      sel.addEventListener('change', () => { it.unit = sel.value || null; it.warn = it.warn.filter((w) => !/tidak dikenali/.test(w)); sRender(); });
      const bs = el('select', { 'aria-label': 'Bulan' }); BLN.forEach((b, k) => bs.append(el('option', { value: k + 1, textContent: `${b} ${r ? r.tahun : ''}` })));
      if (r) bs.value = r.bulan; bs.disabled = !r;
      bs.addEventListener('change', () => { r.bulan = +bs.value; sRender(); });
      const notes = [];
      if (it.error) notes.push(el('div', { className: 'ss-up-note bad', textContent: it.error }));
      it.warn.forEach((w) => notes.push(el('div', { className: 'ss-up-note warn', textContent: w })));
      if (r && it.unit && U.k(r.up3_file) !== U.k(it.unit)) notes.push(el('div', { className: 'ss-up-note', textContent: 'Nama di file: ' + r.up3_file }));
      const rm = el('button', { type: 'button', className: 'ss-up-rm', textContent: '✕', title: 'Hapus dari daftar', 'aria-label': 'Hapus ' + it.file });
      rm.addEventListener('click', () => { sItems.splice(i, 1); sRender(); });
      return el('tr', {}, el('td', {}, el('div', { textContent: it.file }), ...notes), el('td', {}, sel), el('td', {}, bs),
        el('td', { className: 'num', textContent: r ? f0.format(r.pelanggan) : '—' }),
        el('td', { className: 'num', textContent: r ? f2.format(r.jam_total / r.pelanggan * 60) : '—' }),
        el('td', { className: 'num', textContent: r ? f3.format(r.padam_total / r.pelanggan) : '—' }),
        el('td', { className: 'num', textContent: r ? f0.format(r.ens_total) : '—' }),
        el('td', {}, el('span', { className: 'ss-up-chip ' + cls, textContent: label })), el('td', {}, rm));
    }));
    const ready = sItems.filter((it) => ['new', 'replace'].includes(sStatus(it, have)[0]));
    // kelengkapan per bulan yang disentuh
    const touched = [...new Set(ready.map((it) => it.rec.tahun + '|' + it.rec.bulan))];
    const notes = touched.map((tm) => {
      const [t, m] = tm.split('|').map(Number);
      const n = units.filter((u) => have.has(sKey(t, m, u.unit)) || ready.some((it) => it.unit === u.unit && it.rec.tahun === t && it.rec.bulan === m)).length;
      return `${BLN[m - 1]} ${t}: ${n}/${units.length} UP3` + (n < units.length ? ' (total UID, wilayah dan Sumkal bulan ini baru dihitung setelah semua UP3 lengkap)' : ' lengkap');
    });
    $('up-s-cover').textContent = notes.length ? 'Kelengkapan setelah update: ' + notes.join('; ') + '.' : '';
    const b = $('up-s-go'); b.disabled = !ready.length; b.textContent = ready.length ? `Update dashboard sekarang (${ready.length} laporan)` : 'Update dashboard sekarang';
  }
  async function sGo() {
    const d = need(['bulanan', 'kumulatif']); if (!d) { msg('up-s-msg', 'Data dashboard belum selesai dimuat. Coba lagi sebentar.', 'bad'); return; }
    const have = new Set(d[0].filter((r) => r.level === 'UP3').map((r) => sKey(r.tahun, r.bulan, r.unit)));
    const ready = sItems.filter((it) => ['new', 'replace'].includes(sStatus(it, have)[0]));
    if (!ready.length) return;
    const b = $('up-s-go'); b.disabled = true;
    try {
      msg('up-s-msg', 'Menghitung ulang nilai bulanan dan kumulatif…');
      const recs = ready.map((it) => ({ ...it.rec, unit: it.unit }));
      const out = U.saidiMerge(d[0], d[1], recs);
      const units = U.unitsFrom(out.bulanan);
      const ms = [...new Set(out.bulanan.filter((r) => r.level === 'Sumkal').map((r) => r.tahun * 100 + r.bulan))].sort((a, b2) => a - b2);
      const first = ms[0], last = ms[ms.length - 1];
      const periode = `${BLN[first % 100 - 1]} ${Math.floor(first / 100)} – ${BLN[last % 100 - 1]} ${Math.floor(last / 100)}`;
      const files = [...new Set(ready.map((it) => it.file))];
      const sumber = files.length === 1 ? files[0] : `${files.length} laporan UP3 (${files.slice(0, 2).join(', ')}${files.length > 2 ? ', …' : ''})`;
      const r = await commit([{ tab: 'saidi', periode, sumber }], [
        { id: 'bulanan', text: JSON.stringify(out.bulanan), name: 'bulanan.json', type: 'application/json', rows: out.bulanan },
        { id: 'kumulatif', text: JSON.stringify(out.kumulatif), name: 'kumulatif.json', type: 'application/json', rows: out.kumulatif },
      ], sumber, (t) => msg('up-s-msg', t));
      sItems = []; sRender();
      try { if (last % 100 && typeof dash !== 'undefined') dash.setParams({ bulan: last % 100 }); } catch (e) { /* tampilan tetap */ }
      const inc = out.incomplete.length ? ` Belum lengkap: ${out.incomplete.map((x) => `${BLN[x.bulan - 1]} ${x.tahun} ${x.ada}/${x.perlu} UP3`).join(', ')}.` : '';
      msg('up-s-msg', doneText(r, `Data SAIDI SAIFI ENS (${units.length} UP3, s.d. ${BLN[last % 100 - 1]} ${Math.floor(last / 100)})`) + inc, r.saved ? 'ok' : 'warn');
    } catch (e) { msg('up-s-msg', 'Gagal menghitung ulang: ' + (e.message || e), 'bad'); }
    b.disabled = false; sRender();
  }
  dropzone('up-s-drop', 'up-s-file', sFiles);
  $('up-s-go').addEventListener('click', sGo);
  $('up-s-cancel').addEventListener('click', () => { sItems = []; msg('up-s-msg', ''); sRender(); });

  // ================= Gangguan APKT =================
  let gRes = null;
  async function gFile(files) {
    const file = files[0]; gRes = null; gRender();
    if (!/\.xlsx$/i.test(file.name)) { msg('up-g-msg', 'Pilih file .xlsx detail gangguan APKT.', 'bad'); return; }
    const bar = $('up-g-bar'); bar.hidden = false; msg('up-g-msg', '');
    try {
      const res = await APKT.read(file, (label, frac) => { bar.value = Math.round(frac * 100); $('up-g-barlabel').textContent = `${label} · ${Math.round(frac * 100)}%`; });
      if (!res.hasDetail) throw new Error('Kolom ULP dan PENYULANG tidak ditemukan. Keduanya diperlukan untuk gangguan per UP3 dan per penyulang.');
      const months = Object.keys(res.perMonth).map(Number).sort((a, b) => a - b);
      if (!months.length) throw new Error('Tidak ada baris dengan kolom BULAN yang terbaca.');
      gRes = { file: file.name, res, months, pick: new Set(months) };
    } catch (e) { msg('up-g-msg', 'File tidak bisa dibaca: ' + (e.message || e), 'bad'); }
    bar.hidden = true; $('up-g-barlabel').textContent = '';
    gRender();
  }
  function gRender() {
    $('up-g-review').hidden = !gRes; if (!gRes) return;
    const d = need(['gangguan']); const have = new Set(d ? d[0].map((r) => +r.BULAN_NO) : []);
    const fmtD = (s) => (s ? `${+s.slice(8, 10)}/${+s.slice(5, 7)}` : '—');
    $('up-g-body').replaceChildren(...gRes.months.map((m) => {
      const p = gRes.res.perMonth[m];
      const cb = el('input', { type: 'checkbox', checked: gRes.pick.has(m), 'aria-label': 'Pakai ' + BLN[m - 1] });
      cb.addEventListener('change', () => { if (cb.checked) gRes.pick.add(m); else gRes.pick.delete(m); gRender(); });
      return el('tr', {}, el('td', {}, cb), el('td', { textContent: BLN[m - 1] }),
        el('td', { className: 'num', textContent: f0.format(p.mentah) }), el('td', { className: 'num', textContent: f0.format(p.dup) }),
        el('td', { className: 'num', textContent: f0.format(p.unik) }), el('td', { textContent: `${fmtD(p.tgl_min)} – ${fmtD(p.tgl_max)}` }),
        el('td', {}, el('span', { className: 'ss-up-chip ' + (have.has(m) ? 'replace' : 'new'), textContent: have.has(m) ? 'Ganti data lama' : 'Baru' })));
    }));
    $('up-g-sum').textContent = `${gRes.file}: ${f0.format(gRes.res.rows)} baris dibaca. Duplikat No. Laporan dibuang (kemunculan pertama dipertahankan). Bulan yang dicentang menggantikan data bulan itu di tab Kali Gangguan Penyulang dan Database Penyulang.`;
    const b = $('up-g-go'); b.disabled = !gRes.pick.size; b.textContent = gRes.pick.size ? `Update dashboard sekarang (${gRes.pick.size} bulan)` : 'Update dashboard sekarang';
  }
  async function gGo() {
    const d = need(['gangguan', 'gangguan_up3', 'peny_bulanan', 'peny_profil', 'bulanan', 'gangguan_ps', 'gangguan_dupont']); if (!d || !gRes) { msg('up-g-msg', 'Data dashboard belum selesai dimuat. Coba lagi sebentar.', 'bad'); return; }
    const b = $('up-g-go'); b.disabled = true;
    try {
      msg('up-g-msg', 'Menghitung ulang gangguan per unit, per UP3 dan per penyulang…');
      const cur = { gangguan: d[0], gangguan_up3: d[1], peny_bulanan: d[2], peny_profil: d[3], gangguan_ps: d[5], gangguan_dupont: d[6] };
      const out = U.gangguanMerge(cur, gRes.res, [...gRes.pick], U.unitsFrom(d[4]));
      const C = U.COLS; const items = ['gangguan', 'gangguan_up3', 'gangguan_ps', 'gangguan_dupont', 'peny_bulanan', 'peny_profil'].filter((id) => id !== 'gangguan_dupont' || gRes.res.hasDupont).map((id) => ({
        id, text: U.toCSV(C[id], out[id]), name: { gangguan: 'gangguan_unik_bulanan.csv', gangguan_up3: 'gangguan_up3_bulanan.csv', gangguan_ps: 'gangguan_ps_bulanan.csv', gangguan_dupont: 'gangguan_dupont.csv', peny_bulanan: 'penyulang_bulanan.csv', peny_profil: 'penyulang_profil.csv' }[id], type: 'text/csv', rows: U.asText(C[id], out[id]),
      }));
      const ms = [...new Set(out.gangguan.map((r) => +r.BULAN_NO))].sort((a, b2) => a - b2);
      const periode = `${BLN[ms[0] - 1]} – ${BLN[ms[ms.length - 1] - 1]} 2026`;
      // tab Database Penyulang ikut berubah dari file yang sama
      const r = await commit([{ tab: 'gangguan', periode, sumber: gRes.file }, { tab: 'penyulang', periode, sumber: 'database penyulang dan ' + gRes.file }, ...(gRes.res.hasDupont ? [{ tab: 'dp', periode, sumber: gRes.file + ', kode J' }] : [])], items, gRes.file, (t) => msg('up-g-msg', t));
      const tot = out.gangguan.filter((x) => gRes.pick.has(+x.BULAN_NO)).reduce((a, x) => a + Number(x.JUMLAH), 0);
      msg('up-g-msg', doneText(r, `Data gangguan ${[...gRes.pick].sort((a, b2) => a - b2).map((m) => BLN[m - 1]).join(', ')} (${f0.format(tot)} No. Laporan unik)`), r.saved ? 'ok' : 'warn');
      gRes = null; gRender();
    } catch (e) { msg('up-g-msg', 'Gagal menghitung ulang: ' + (e.message || e), 'bad'); }
    b.disabled = false;
  }
  dropzone('up-g-drop', 'up-g-file', gFile);
  $('up-g-go').addEventListener('click', gGo);
  $('up-g-cancel').addEventListener('click', () => { gRes = null; msg('up-g-msg', ''); gRender(); });

  // ================= Database penyulang =================
  let pRes = null;
  async function pFile(files) {
    const file = files[0]; pRes = null; pRender(); msg('up-p-msg', '');
    if (!/\.xlsx$/i.test(file.name)) { msg('up-p-msg', 'Pilih file .xlsx database penyulang.', 'bad'); return; }
    msg('up-p-msg', 'Membaca file…');
    try { pRes = { file: file.name, ya: U.parsePenyulangDb(await APKT.readTable(file)) }; msg('up-p-msg', ''); }
    catch (e) { msg('up-p-msg', 'File tidak bisa dibaca: ' + (e.message || e), 'bad'); }
    pRender();
  }
  function pRender() {
    $('up-p-review').hidden = !pRes; if (!pRes) return;
    $('up-p-go').disabled = false;
    const d = need(['peny_profil']); const old = d ? d[0].filter((r) => r.di_database === 'Ya') : [];
    const oldS = new Set(old.map((r) => r.up3 + '|' + r.penyulang)), newS = new Set(pRes.ya.map((r) => r.up3 + '|' + r.penyulang));
    const add = [...newS].filter((x) => !oldS.has(x)).length, gone = [...oldS].filter((x) => !newS.has(x)).length;
    const byUid = {}; pRes.ya.forEach((r) => { const g = r.uid || 'Lainnya'; byUid[g] = (byUid[g] || 0) + 1; });
    $('up-p-kv').replaceChildren(...[['Penyulang di file', f0.format(pRes.ya.length)], ['UP3', f0.format(new Set(pRes.ya.map((r) => r.up3)).size)], ['Baru dibanding database', f0.format(add)], ['Tidak ada lagi di file', f0.format(gone)]]
      .map(([a, v]) => el('div', {}, el('span', { textContent: a }), el('b', { textContent: v }))));
    $('up-p-sum').textContent = `${pRes.file}. Per UID: ` + Object.entries(byUid).map(([g, n]) => `${g} ${f0.format(n)}`).join(', ') + '. Penyulang di data gangguan yang belum cocok akan dicocokkan ulang ke database baru.';
  }
  async function pGo() {
    const d = need(['peny_profil', 'peny_bulanan']); if (!d || !pRes) { msg('up-p-msg', 'Data dashboard belum selesai dimuat. Coba lagi sebentar.', 'bad'); return; }
    const b = $('up-p-go'); b.disabled = true;
    try {
      msg('up-p-msg', 'Mencocokkan ulang penyulang…');
      const out = U.penyulangMerge({ peny_profil: d[0], peny_bulanan: d[1] }, pRes.ya);
      const C = U.COLS;
      const ms = [...new Set(out.peny_bulanan.map((r) => +r.bulan))].sort((a, b2) => a - b2);
      const r = await commit([{ tab: 'penyulang', periode: `${BLN[ms[0] - 1]} – ${BLN[ms[ms.length - 1] - 1]} 2026`, sumber: pRes.file + ' dan data gangguan APKT' }], [
        { id: 'peny_profil', text: U.toCSV(C.peny_profil, out.peny_profil), name: 'penyulang_profil.csv', type: 'text/csv', rows: U.asText(C.peny_profil, out.peny_profil) },
        { id: 'peny_bulanan', text: U.toCSV(C.peny_bulanan, out.peny_bulanan), name: 'penyulang_bulanan.csv', type: 'text/csv', rows: U.asText(C.peny_bulanan, out.peny_bulanan) },
      ], pRes.file, (t) => msg('up-p-msg', t));
      msg('up-p-msg', doneText(r, `Database penyulang (${f0.format(pRes.ya.length)} penyulang; ${f0.format(out.rematched)} kali gangguan cocok ulang)`), r.saved ? 'ok' : 'warn');
      pRes = null; pRender();
    } catch (e) { msg('up-p-msg', 'Gagal memperbarui: ' + (e.message || e), 'bad'); }
    b.disabled = false;
  }
  dropzone('up-p-drop', 'up-p-file', pFile);
  $('up-p-go').addEventListener('click', pGo);
  $('up-p-cancel').addEventListener('click', () => { pRes = null; msg('up-p-msg', ''); pRender(); });

  // ================= Koreksi Cleansing =================
  let kRes = null;
  async function kFile(files) {
    const file = files[0]; kRes = null; kRender();
    if (!/\.xlsx$/i.test(file.name)) { msg('up-k-msg', 'Pilih file .xlsx Master KC.', 'bad'); return; }
    msg('up-k-msg', 'Membaca file…');
    try {
      const d = need(['bulanan']); if (!d) throw new Error('Data dashboard belum selesai dimuat. Coba lagi sebentar.');
      const o = U.kcParse(await APKT.readTable(file), U.unitsFrom(d[0]));
      kRes = { file: file.name, ...o }; msg('up-k-msg', '');
    } catch (e) { msg('up-k-msg', 'File tidak bisa dibaca: ' + (e.message || e), 'bad'); }
    kRender();
  }
  function kRender() {
    $('up-k-review').hidden = !kRes; if (!kRes) return;
    $('up-k-go').disabled = false;
    const s = (j) => kRes.rows.filter((r) => r.JENIS === j).reduce((a, r) => a + r.JUMLAH, 0);
    const ms = [...new Set(kRes.rows.map((r) => r.BULAN_NO))].sort((a, b) => a - b);
    $('up-k-kv').replaceChildren(...[['Baris di file', f0.format(kRes.total)], ['Disetujui (approval 2)', f0.format(kRes.approved)], ['Event koreksi', f0.format(s('Koreksi'))], ['Event cleansing', f0.format(s('Cleansing'))]]
      .map(([a, v]) => el('div', {}, el('span', { textContent: a }), el('b', { textContent: v }))));
    $('up-k-sum').textContent = `${kRes.file}: ${BLN[ms[0] - 1]} – ${BLN[ms[ms.length - 1] - 1]} ${kRes.tahun}, ${new Set(kRes.rows.map((r) => r.UP3)).size} UP3.` + (kRes.unknown.length ? ` Area tidak dikenali (tidak dihitung): ${kRes.unknown.map(([a, n]) => `${a} (${n})`).join(', ')}.` : '');
  }
  async function kGo() {
    if (!kRes) return;
    const b = $('up-k-go'); b.disabled = true;
    try {
      const C = U.COLS.kc_bulanan;
      const ms = [...new Set(kRes.rows.map((r) => r.BULAN_NO))].sort((a, b2) => a - b2);
      const r = await commit([{ tab: 'kc', periode: `${BLN[ms[0] - 1]} – ${BLN[ms[ms.length - 1] - 1]} ${kRes.tahun}`, sumber: kRes.file }],
        [{ id: 'kc_bulanan', text: U.toCSV(C, kRes.rows), name: 'kc_bulanan.csv', type: 'text/csv', rows: U.asText(C, kRes.rows) }], kRes.file, (t) => msg('up-k-msg', t));
      msg('up-k-msg', doneText(r, `Data koreksi cleansing (${f0.format(kRes.approved)} event disetujui)`), r.saved ? 'ok' : 'warn');
      kRes = null; kRender();
    } catch (e) { msg('up-k-msg', 'Gagal memperbarui: ' + (e.message || e), 'bad'); }
    b.disabled = false;
  }
  dropzone('up-k-drop', 'up-k-file', kFile);
  $('up-k-go').addEventListener('click', kGo);
  $('up-k-cancel').addEventListener('click', () => { kRes = null; msg('up-k-msg', ''); kRender(); });

  SSD.onData(() => { sRender(); gRender(); pRender(); kRender(); });
})();
