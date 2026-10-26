// Tabel rekap capaian SAIDI & SAIFI mengikuti profil yang dipilih (unit, komponen, indikator, bulan): realisasi kumulatif, target kumulatif, pencapaian (2 − realisasi ÷ target).
// Komponen Distribusi: realisasi, target, pencapaian Distribusi. Komponen lain: realisasi komponen terpilih dan realisasi Distribusi (tanpa target).
(() => {
  const $ = (id) => document.getElementById(id);
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const f2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f3 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  let rkCtx = { year: '', last: '', name: 'Distribusi_Sumkal' };
  const KOMP = { total: ['Semua kelompok', 'Total'], dist: ['Distribusi', 'Dist'], trans: ['Transmisi', 'Trans'], kit: ['Pembangkit', 'Kit'] };
  const ULBL = { SUMKAL: 'Sumkal', ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID Riau Kepri', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID Kalselteng', KALTIMRA: 'UID Kaltimra' };
  const f0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };

  // unduh kotak sebagai PNG (dipakai tabel rekap dan grafik tren)
  async function exportCard(cardId, btnId, msgId, pvId, filename) {
    const btn = $(btnId), msg = (s) => { $(msgId).textContent = s; };
    if (!window.htmlToImage) { msg('Pembuat gambar belum termuat. Muat ulang halaman.'); return; }
    btn.disabled = true; msg('Menyiapkan gambar…'); $(pvId).hidden = true;
    const card = $(cardId); let clone = null;
    try {
      const wide = card.querySelector('table, svg'); const need = (wide ? wide.scrollWidth || wide.getBoundingClientRect().width : card.offsetWidth) + 34;
      clone = card.cloneNode(true); clone.removeAttribute('id'); clone.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
      clone.querySelector('.dp-dl').remove(); const pv = clone.querySelector('.h-preview'); if (pv) pv.remove(); clone.querySelectorAll('.ss-tip').forEach((t) => t.remove());
      clone.querySelectorAll('.ss-g-wrap').forEach((w) => { w.style.overflow = 'visible'; });
      Object.assign(clone.style, { position: 'fixed', left: '-100000px', top: '0', width: Math.max(card.offsetWidth, need) + 'px', maxWidth: 'none' });
      card.parentNode.appendChild(clone);
      const blob = await window.htmlToImage.toBlob(clone, { pixelRatio: 2, skipFonts: true, backgroundColor: '#ffffff', width: clone.offsetWidth, height: clone.offsetHeight, style: { position: 'static', left: '0', top: '0', margin: '0' } });
      if (!blob) throw new Error('gambar kosong');
      let dlc = null; try { dlc = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dlc = null; }
      if (dlc) { try { const res = await dlc.save({ filename, data: blob }); msg(res && res.status === 'saved' ? 'Gambar diunduh.' : ''); } catch (e) { if (e && e.code === 'declined') msg(''); else throw e; } }
      else {
        const img = $(pvId).querySelector('img'); if (img.dataset.url) URL.revokeObjectURL(img.dataset.url);
        const url = URL.createObjectURL(blob); img.src = url; img.dataset.url = url;
        $(pvId).querySelector('.ss-note').textContent = `Unduhan langsung tidak tersedia di tampilan ini. Klik kanan gambar di bawah lalu pilih "Simpan gambar" (${filename}).`;
        $(pvId).hidden = false; msg('');
      }
    } catch (e) { msg('Gagal membuat gambar: ' + (e && e.message ? e.message : e)); }
    finally { if (clone) clone.remove(); btn.disabled = false; }
  }
  $('rk-dl').addEventListener('click', () => exportCard('rk-card', 'rk-dl', 'rk-dl-msg', 'rk-preview', `Rekap_Capaian_SAIDI_SAIFI_${rkCtx.name}_${rkCtx.year}_sd_${rkCtx.last}.png`));
  SSD.onData(() => {
    const K = SSD.data('kumulatif'), T = SSD.data('target'), tb = $('rk-table');
    if (K.status !== 'ok' || T.status !== 'ok') { if ([K, T].some((x) => x.status === 'error')) tb.replaceChildren(mk('caption', 'Failed to load', 'ss-fail')); return; }
    const year = Math.max(...K.data.map((r) => Number(r.tahun)));
    const P = (window.dash && dash.params ? dash.params() : {}) || {};
    const unit = ULBL[P.unit] ? P.unit : 'SUMKAL';
    const comp = KOMP[P.komponen] ? P.komponen : 'total';
    const showEns = P.metrik === 'ens';
    // bulan berjalan (belum selesai) tidak ditampilkan realisasinya
    const now = new Date(); const running = now.getFullYear() === year ? now.getMonth() + 1 : 13;
    const real = {}; K.data.forEach((r) => { if (Number(r.tahun) === year && r.level !== 'UP3' && String(r.unit).toUpperCase() === unit && Number(r.bulan) < running) real[Number(r.bulan)] = r; });
    const tgt = {}; T.data.forEach((r) => { if (String(r.unit).toUpperCase() === unit) tgt[Number(r.bulan)] = r; });
    const months = [...Array(12)].map((_, i) => i + 1);
    const have = Object.keys(real).map(Number);
    if (!have.length) { tb.replaceChildren(mk('caption', 'Data realisasi untuk unit ini belum tersedia.', 'ss-note')); return; }
    const last = Math.max(...have);
    const selB = have.includes(Number(P.bulan)) ? Number(P.bulan) : last;
    const uName = ULBL[unit], kName = KOMP[comp][0];
    rkCtx = { year, last: BS[last - 1], name: `${kName.replace(/ /g, '_')}_${uName.replace(/ /g, '_')}` };
    $('rk-h').textContent = `Rekap capaian SAIDI SAIFI ${comp === 'total' ? 'semua kelompok' : kName} ${uName}`;
    const hasT = Object.keys(tgt).length > 0;
    $('rk-note').textContent = `${uName}, komponen ${kName}, nilai kumulatif dari Januari ${year}. ` +
      (comp === 'dist' ? (hasT ? 'Pencapaian = 2 − (realisasi kumulatif ÷ target kumulatif); di atas 100% berarti lebih baik dari target. ' : 'Target belum tersedia untuk unit ini. ') : `Realisasi ${kName} ditampilkan bersama realisasi Distribusi sebagai pembanding; target dan pencapaian hanya ditampilkan bila komponen Distribusi dipilih. `) +
      `Data realisasi s.d. ${BS[last - 1]} ${year}${running <= 12 ? ` (bulan berjalan ${BS[running - 1]} belum ditampilkan)` : ''}. Kolom ${BS[selB - 1]} disorot sesuai pilihan s.d. bulan.`;
    const th = mk('thead'), hr = mk('tr');
    ['No', 'KPI', 'Item'].forEach((h) => hr.append(mk('th', h)));
    months.forEach((m) => hr.append(mk('th', `${BS[m - 1]} ${year}`, m === selB ? 'rk-sel' : '')));
    th.append(hr);
    const body = mk('tbody');
    const cap = (m, rf, tf) => (real[m] && tgt[m] && Number(tgt[m][tf]) ? 2 - Number(real[m][rf]) / Number(tgt[m][tf]) : null);
    const KPI = [['SAIDI', '(menit/plg)', 'saidi', 'target_saidi', f2], ['SAIFI', '(kali/plg)', 'saifi', 'target_saifi', f2]];
    if (showEns) KPI.push(['ENS', '(kWh)', 'ens', null, f0]);
    KPI.forEach(([name, unitTxt, met, tf, fm], ki) => {
      const rf = met + '_' + comp, rd = met + '_dist';
      const realRow = (lbl, fld) => [lbl, (m) => (real[m] && real[m][fld] != null && real[m][fld] !== '' ? fm.format(Number(real[m][fld])) : ''), () => ''];
      const rows = [];
      if (comp === 'dist') rows.push(realRow('Realisasi Distribusi', rd));
      else rows.push(realRow(`Realisasi ${kName}`, rf), realRow('Realisasi Distribusi', rd));
      if (comp === 'dist' && tf && hasT) {
        const sfx = ' Distribusi';
        rows.push(['Target' + sfx, (m) => (tgt[m] ? fm.format(Number(tgt[m][tf])) : ''), () => '']);
        rows.push(['Pencapaian' + sfx, (m) => { const c = cap(m, rd, tf); return c == null ? '' : f2.format(c * 100) + '%'; }, (m) => { const c = cap(m, rd, tf); return c == null ? '' : c >= 1 ? 'rk-ok' : 'rk-bad'; }]);
      }
      rows.forEach(([item, val, cls], ri) => {
        const tr = mk('tr', null, ri === rows.length - 1 ? 'rk-cap' : '');
        if (ri === 0) {
          const no = mk('td', String(ki + 1), 'rk-no'); no.rowSpan = rows.length;
          const kp = mk('td', null, 'rk-kpi'); kp.rowSpan = rows.length; kp.append(mk('b', `${name} ${KOMP[comp][1]}`), mk('span', unitTxt));
          tr.append(no, kp);
        }
        tr.append(mk('td', item, 'rk-item'));
        months.forEach((m) => tr.append(mk('td', val(m), 'rk-v ' + cls(m) + (m === selB ? ' rk-sel' : ''))));
        body.append(tr);
      });
    });
    tb.replaceChildren(th, body);

  });
})();
