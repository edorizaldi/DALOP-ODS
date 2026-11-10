// Tab Health Index Penyulang (menu Database).
// Sumber: database Event Padam Penyulang saja: per penyulang (peny_bulanan) dan per UP3 (gangguan_up3, untuk UID tiap UP3).
// Kelas per penyulang per bulan dari gangguan kode J, jumlah permanen + sesaat, menurut filter bidang (bawaan Distribusi) dan jenis padam (bawaan semua):
//   kronis >= 6 kali, sakit 2-5 kali, sehat 1 kali. Penyulang tanpa gangguan pada bulan itu tidak dihitung.
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('hi')) return;
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const UNAME = { ACEH: 'Aceh', SUMUT: 'Sumatera Utara', SUMBAR: 'Sumatera Barat', RKR: 'Riau & Kepri', S2JB: 'S2JB', BABEL: 'Bangka Belitung', LAMPUNG: 'Lampung', KALBAR: 'Kalimantan Barat', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra' };
  const ULABEL = { ACEH: 'UID Aceh', SUMUT: 'UID Sumut', SUMBAR: 'UID Sumbar', RKR: 'UID Riau Kepri', S2JB: 'UID S2JB', BABEL: 'UID Babel', LAMPUNG: 'UID Lampung', KALBAR: 'UID Kalbar', KALSELTENG: 'UID Kalselteng', KALTIMRA: 'UID Kaltimra' };
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(v));
  const pc = (v) => new Intl.NumberFormat('id-ID', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
  const uname = (u) => UNAME[u] || u;
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const KAT = [
    { id: 'k', nm: 'Kronis', ket: '≥6 kali', c: '#B3261E', fg: '#fff' },
    { id: 's', nm: 'Sakit', ket: '2–5 kali', c: '#E9A23B', fg: '#2A1A00' },
    { id: 'h', nm: 'Sehat', ket: '1 kali', c: '#3E9A5B', fg: '#fff' },
  ];
  const KBY = Object.fromEntries(KAT.map((k) => [k.id, k]));
  const katOf = (n) => (n >= 6 ? 'k' : n >= 2 ? 's' : n === 1 ? 'h' : null);
  const zero = () => ({ k: 0, s: 0, h: 0, t: 0 });
  const BIDS = ['DISTRIBUSI', 'TRANSMISI', 'PEMBANGKIT'];
  const BNAME = { DISTRIBUSI: 'Distribusi', TRANSMISI: 'Transmisi', PEMBANGKIT: 'Pembangkit' };
  const JENIS = ['Gangguan', 'Pemeliharaan', 'Bencana'];
  const renderChips = (id, opts, cur, param) => { const el = $(id); el.replaceChildren(...opts.map(([v, l]) => { const b = mk('button', l, 'ss-chip'); b.type = 'button'; b.dataset.v = v; b.dataset.p = param; b.setAttribute('aria-pressed', String(v === cur)); return b; })); };

  // ---------- kontrol ----------
  $('hi-f-uid').addEventListener('change', (e) => dash.setParams({ hi_uid: e.target.value || null }));
  ['hi-f-bidang', 'hi-f-jenis'].forEach((id) => $(id).addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) dash.setParams({ [b.dataset.p]: b.dataset.v || null }); }));
  $('hi-f-bulan').addEventListener('change', (e) => dash.setParams({ hi_bulan: e.target.value ? Number(e.target.value) : null }));
  let q = '';
  $('hi-search').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); renderList(); });
  const ctx = { name: '' };
  const exp = (id) => $(`hi-${id}-dl`).addEventListener('click', () => window.SSExport({ card: `hi-${id}-card`, btn: `hi-${id}-dl`, msg: `hi-${id}-msg`, preview: `hi-${id}-pv`, filename: `Health_Index_Penyulang_${id}_${ctx.name.replace(/[^A-Za-z0-9]+/g, '_')}.png` }));
  exp('trend'); exp('unit'); exp('top');
  // laporan PNG: header (ringkasan + kotak), rekap event permanen/sesaat, dan Top 3 per UID sesuai filter
  $('hi-rep-dl').addEventListener('click', async () => {
    const sec = $('hi'); const W = mk('div', null, 'hi-report'); W.id = 'hi-report';
    const strip = (el) => { el.removeAttribute('id'); el.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id')); return el; };
    const P = dash.params();
    const bidT = P.hi_bidang === 'SEMUA' ? 'Semua' : BNAME[BIDS.includes(P.hi_bidang) ? P.hi_bidang : 'DISTRIBUSI'];
    const sel = $('hi-f-bulan'); const blnT = sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
    const now = new Date(); const tgl = `${now.getDate()} ${BLN[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;
    const head = mk('div', null, 'hi-rep-head');
    const logos = mk('div', null, 'hi-rep-logos'); [...document.querySelectorAll('.ss-logo img')].slice(0, 2).forEach((im) => { const c = im.cloneNode(true); c.removeAttribute('id'); logos.append(c); });
    const tt = mk('div', null, 'hi-rep-tt'); tt.append(mk('b', 'Laporan Health Index Penyulang'), mk('span', `UID: ${ULABEL[P.hi_uid] || 'Semua UID (Sumkal)'} · Bidang: ${bidT} · Jenis padam: ${P.hi_jenis || 'Semua'} · Bulan: ${blnT}`));
    head.append(logos, tt, mk('span', `Dibuat ${tgl}`, 'hi-rep-when'));
    const hero = strip($('hi-ringkasan').cloneNode(true)); hero.querySelectorAll('.ss-filters, .hi-rep').forEach((e) => e.remove());
    W.append(head, hero, strip($('hi-unit-card').cloneNode(true)), strip($('hi-top-card').cloneNode(true)));
    sec.appendChild(W);
    try { await window.SSExport({ card: 'hi-report', btn: 'hi-rep-dl', msg: 'hi-rep-msg', preview: 'hi-rep-pv', minWidth: 1320, filename: `Laporan_Health_Index_Penyulang_${ctx.name.replace(/[^A-Za-z0-9]+/g, '_')}.png` }); }
    finally { W.remove(); }
  });

  // ---------- indeks data (dibangun ulang hanya bila data berubah) ----------
  let IX = null, srcB = null, srcP = null, srcG = null;
  function build(B, GU, GPS) {
    // UP3 -> UID dari database Event Padam Penyulang per UP3 (gangguan_up3); "UID X (UP3 tidak dikenali)" -> X
    const nk = (x) => String(x || '').toUpperCase().replace(/[^A-Z]/g, '');
    const ALIAS = { BELITUNG: 'TANJUNGPANDANBELITUNG', PADANGSIDIMPUAN: 'PADANGSIDEMPUAN' };
    const gu = new Map(); GU.forEach((r) => { if (UORD.includes(r.UNIT)) gu.set(nk(r.UP3), r.UNIT); });
    const uidOf = (u3) => { const m = /^UID\s+(\S+)\s+\(UP3 tidak dikenali\)/i.exec(u3) || /UP3 tidak dikenali \((\S+)\)/i.exec(u3); if (m) return m[1].toUpperCase(); return gu.get(nk(u3)) || gu.get(ALIAS[nk(u3)]) || ''; };
    const u3uid = new Map(); B.forEach((r) => { if (!u3uid.has(r.up3)) u3uid.set(r.up3, uidOf(r.up3)); });
    // penyulang = semua penyulang yang tercatat di database Event Padam Penyulang (semua kode, bidang, jenis padam)
    const F = new Map(); // up3|penyulang -> { u, u3, peny, raw: { m: { 'BIDANG|Jenis': [p, s] } }, mo: { m: [p, s] } (sesuai filter) }
    B.forEach((r) => {
      const id = r.up3 + '\u0001' + r.penyulang; let f = F.get(id);
      if (!f) { f = { u: u3uid.get(r.up3) || '', u3: r.up3, peny: r.penyulang, raw: {}, mo: {}, ulp: new Map() }; F.set(id, f); }
      const ul = String(r.ulp || '').replace(/^ULP\s+/i, '').trim().toUpperCase(); if (ul) f.ulp.set(ul, (f.ulp.get(ul) || 0) + Number(r.kali));
      if (r.kode !== 'J' || (r.ps !== 'Permanen' && r.ps !== 'Sesaat')) return;
      const m = +r.bulan; const rm = f.raw[m] || (f.raw[m] = {}); const kk = r.bidang + '|' + r.jenis_padam; const o = rm[kk] || (rm[kk] = [0, 0]); o[r.ps === 'Permanen' ? 0 : 1] += Number(r.kali);
    });
    const feeders = [...F.values()].filter((f) => UORD.includes(f.u));
    const months = [...new Set(B.map((r) => +r.bulan))].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
    // unit yang punya data penyulang pada bulan itu; tanpa data, penyulangnya tidak diberi kelas
    const ada = new Set(B.map((r) => +r.bulan + '|' + (u3uid.get(r.up3) || '')));
    // kelengkapan data per penyulang: total kode J per penyulang dibanding rekap per UID (gangguan_ps), per bidang
    const sumP = {}, sumU = {};
    B.forEach((r) => { if (r.kode !== 'J') return; const k = +r.bulan + '|' + (u3uid.get(r.up3) || '') + '|' + r.bidang; sumP[k] = (sumP[k] || 0) + Number(r.kali); });
    GPS.forEach((r) => { if (r.KODE !== 'J') return; const k = +r.BULAN_NO + '|' + r.UNIT + '|' + r.BIDANG; sumU[k] = (sumU[k] || 0) + Number(r.JUMLAH); });
    const cov = (m, u, bids) => { let t = 0, p = 0; bids.forEach((b) => { t += sumU[m + '|' + u + '|' + b] || 0; p += sumP[m + '|' + u + '|' + b] || 0; }); return t ? p / t : null; };
    return { feeders, months, ada, cov };
  }
  // kelas penyulang f pada bulan m: 'k' | 's' | 'h' | null (tanpa gangguan atau belum ada data)
  const kat = (f, m) => {
    if (!IX.ada.has(m + '|' + f.u)) return null;
    const o = f.mo[m]; const n = o ? o[0] + o[1] : 0;
    return katOf(n);
  };
  const count = (list, m) => { const o = zero(); list.forEach((f) => { const k = kat(f, m); if (k) { o[k]++; o.t++; } }); return o; };

  let S = null; // keadaan render terakhir untuk daftar penyulang
  function render() {
    const B = SSD.data('peny_bulanan'), GU = SSD.data('gangguan_up3'), GPS = SSD.data('gangguan_ps');
    if (B.status !== 'ok' || GU.status !== 'ok' || GPS.status !== 'ok') return;
    if (srcB !== B.data || srcP !== GU.data || srcG !== GPS.data) { srcB = B.data; srcP = GU.data; srcG = GPS.data; IX = build(B.data, GU.data, GPS.data); }
    const P = dash.params();
    // bulan berjalan (laporan harian, sheet Detil Kode) disisipkan sebagai bulan tambahan: kode J, bidang Distribusi, jenis padam tidak dibedakan
    const HPx = harianPeny(); const dbLast = IX.months[IX.months.length - 1];
    const run = HPx && HPx.tahun === 2026 && HPx.bulan > dbLast ? HPx : null;
    if (IX.runSrc !== run) {
      if (IX.runM) { IX.feeders = IX.feeders.filter((f) => !f.inj); IX.feeders.forEach((f) => { delete f.raw[IX.runM]; }); UORD.forEach((u) => IX.ada.delete(IX.runM + '|' + u)); }
      if (run) {
        const byName = new Map(); IX.feeders.forEach((f) => { const k = f.u + '|' + nn(f.peny); if (!byName.has(k)) byName.set(k, f); });
        run.rows.forEach(([u, , peny, p, sv]) => {
          if (!UORD.includes(u)) return; const k = u + '|' + nn(peny); let f = byName.get(k);
          if (!f) { f = { u, u3: '', peny, raw: {}, mo: {}, ulp: new Map(), inj: true }; byName.set(k, f); IX.feeders.push(f); }
          const rm = f.raw[run.bulan] || (f.raw[run.bulan] = {}); const o = rm['DISTRIBUSI|*'] || (rm['DISTRIBUSI|*'] = [0, 0]); o[0] += p; o[1] += sv;
          IX.ada.add(run.bulan + '|' + u);
        });
      }
      IX.runSrc = run; IX.runM = run ? run.bulan : null; IX.fkey = null;
    }
    const feeders = IX.feeders; const months = run ? [...IX.months, run.bulan] : IX.months;
    const runTxt = run ? ` (berjalan, s.d. ${+run.sampai.slice(8)})` : '';
    const mLab = (m) => BLN[m - 1] + ' 2026' + (run && m === run.bulan ? runTxt : '');
    // filter bidang (bawaan Distribusi) dan jenis padam (bawaan semua): hitung ulang permanen/sesaat per penyulang per bulan
    const bidang = P.hi_bidang === 'SEMUA' ? null : BIDS.includes(P.hi_bidang) ? P.hi_bidang : 'DISTRIBUSI';
    const jenis = JENIS.includes(P.hi_jenis) ? P.hi_jenis : null;
    const fkey = (bidang || '*') + '|' + (jenis || '*');
    if (IX.fkey !== fkey) {
      IX.fkey = fkey;
      feeders.forEach((f) => { f.mo = {}; Object.entries(f.raw).forEach(([m, o]) => { const v = [0, 0]; Object.entries(o).forEach(([kk, ps]) => { const [b, j] = kk.split('|'); if ((bidang && b !== bidang) || (jenis && j !== jenis && j !== '*')) return; v[0] += ps[0]; v[1] += ps[1]; }); if (v[0] + v[1]) f.mo[m] = v; }); });
    }
    const fTxt = `${jenis && jenis !== 'Gangguan' ? 'padam' : 'gangguan'} kode J${bidang ? ' bidang ' + BNAME[bidang] : ' semua bidang'}${jenis ? ', jenis padam ' + jenis : ''}`;
    renderChips('hi-f-bidang', [['SEMUA', 'Semua'], ['DISTRIBUSI', 'Distribusi'], ['TRANSMISI', 'Transmisi'], ['PEMBANGKIT', 'Pembangkit']], bidang || 'SEMUA', 'hi_bidang');
    renderChips('hi-f-jenis', [['', 'Semua'], ...JENIS.map((j) => [j, j])], jenis || '', 'hi_jenis');
    if (!months.length) return;
    // UP3 belum ditampilkan (nama UP3 dikosongkan dulu); pilihan hanya UID dan bulan
    const uid = UORD.includes(P.hi_uid) ? P.hi_uid : null;
    const bm = months.includes(Number(P.hi_bulan)) ? Number(P.hi_bulan) : months[months.length - 1];
    const prevM = months[months.indexOf(bm) - 1];
    const isRun = !!run && bm === run.bulan;
    const inScope = (f) => !uid || f.u === uid;
    const scoped = feeders.filter(inScope);
    const where = uid ? ULABEL[uid] : 'Sumkal';
    ctx.name = `${uid || 'Sumkal'}_${BLN[bm - 1]}_2026`;

    // kontrol
    const su = $('hi-f-uid'); if (!su.options.length) su.replaceChildren(new Option('Semua UID', ''), ...UORD.map((u) => new Option(ULABEL[u], u)));
    su.value = uid || '';
    $('hi-f-bulan').replaceChildren(...months.map((m) => new Option(mLab(m), m)).reverse()); $('hi-f-bulan').value = String(bm);

    const ser = months.map((m) => ({ m, ...count(scoped, m) }));
    const cur = ser.find((d) => d.m === bm), prv = prevM ? ser.find((d) => d.m === prevM) : null;

    // ringkasan
    {
      const tk = $('hi-take'); tk.classList.remove('dash-skeleton'); tk.replaceChildren();
      const Bb = (t) => mk('b', t);
      const lastDay = new Date(2026, bm, 0).getDate();
      const sd = isRun ? `${+run.sampai.slice(8)} ${BLN[bm - 1]} 2026` : `${lastDay} ${BLN[bm - 1]} 2026`;
      const pp = (v) => pc(cur.t ? v / cur.t : 0);
      tk.append(`Sampai tanggal ${sd}, sebanyak `, Bb(`${fmt(cur.t)} penyulang`), ` pada ${uid ? ULABEL[uid] : 'Regional SUMKAL'} mengalami gangguan. Klasifikasi gangguannya terdiri dari `,
        Bb(`${fmt(cur.k)} kronis (${pp(cur.k)})`), ', ', Bb(`${fmt(cur.s)} sakit (${pp(cur.s)})`), ', dan ', Bb(`${fmt(cur.h)} sehat (${pp(cur.h)})`), '. ');
      if (!uid) {
        const top = UORD.map((u) => [u, count(scoped.filter((f) => f.u === u), bm)]).filter(([, o]) => o.t).sort((a, b2) => b2[1].k - a[1].k)[0];
        if (top && top[1].k) tk.append(`UID dengan jumlah penyulang kronis terbanyak pada ${isRun ? 'bulan berjalan' : 'bulan ' + BLN[bm - 1]} adalah `, Bb(ULABEL[top[0]]), ' sebanyak ', Bb(`${fmt(top[1].k)} penyulang`), '.');
      }
    }

    // kotak angka
    KAT.forEach((k) => {
      const el = $(`hi-t-${k.id}`); el.classList.remove('dash-skeleton'); el.textContent = fmt(cur[k.id]);
      $(`hi-t-${k.id}-bar`).style.width = (cur.t ? (cur[k.id] / cur.t) * 100 : 0) + '%';
      const sub = $(`hi-t-${k.id}-sub`); sub.replaceChildren(mk('b', pc(cur.t ? cur[k.id] / cur.t : 0)), ` dari ${fmt(cur.t)} penyulang`);
      // tren kecil per bulan (titik = bulan terpilih)
      {
        const vals = ser.map((d) => d[k.id]); const W = 220, H = 38, n = vals.length, mx = Math.max(1, ...vals);
        const X = (i) => 4 + (n > 1 ? (i * (W - 8)) / (n - 1) : 0), Y = (v) => H - 6 - (v / mx) * (H - 12);
        const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
        const bi = ser.findIndex((d) => d.m === bm);
        const ruN = run ? ser.findIndex((d) => d.m === run.bulan) : -1;
        const solid = ruN > 0 ? pts.slice(0, ruN) : pts;
        let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Tren ${k.nm.toLowerCase()} per bulan">`;
        svg += `<polygon points="${X(0)},${H - 4} ${solid.join(' ')} ${X(solid.length - 1)},${H - 4}" fill="${k.c}" opacity=".12"/>`;
        svg += `<polyline points="${solid.join(' ')}" fill="none" stroke="${k.c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
        if (ruN > 0) svg += `<polyline points="${pts[ruN - 1]} ${pts[ruN]}" fill="none" stroke="${k.c}" stroke-width="2" stroke-dasharray="3 3"/>`;
        if (bi >= 0) svg += `<circle cx="${X(bi)}" cy="${Y(vals[bi])}" r="3.6" fill="#fff" stroke="${k.c}" stroke-width="2"/>`;
        $(`hi-t-${k.id}-spark`).innerHTML = svg + '</svg>' + `<span>${BS[ser[0].m - 1]}</span><span>${BS[ser[n - 1].m - 1]}${ruN >= 0 ? ' s.d. ' + (+run.sampai.slice(8)) : ''}</span>`;
      }
      if (isRun) sub.append(' · ', mk('span', `s.d. ${+run.sampai.slice(8)} ${BS[bm - 1]}`, 'hi-chg flat'));
      else if (prv) {
        const d = cur[k.id] - prv[k.id]; const bad = k.id === 'k' || k.id === 's' ? d > 0 : d < 0;
        sub.append(' · ', mk('span', `${d > 0 ? '▲ +' : d < 0 ? '▼ −' : ''}${fmt(Math.abs(d))} vs ${BS[prevM - 1]}`, 'hi-chg ' + (d === 0 ? 'flat' : bad ? 'ss-bad' : 'ss-ok')));
      }
    });

    // grafik bertumpuk per bulan
    {
      $('hi-trend-h').textContent = `Health index penyulang per bulan · ${where}`;
      $('hi-legend').replaceChildren(...KAT.map((k) => { const sp = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = k.c; sp.append(i, `${k.nm} (${k.ket})`); return sp; }));
      // ulasan singkat grafik
      {
        // bulan yang data per penyulangnya belum lengkap (dibanding rekap per UID) tidak dipakai untuk tertinggi/terendah/rata-rata
        const bids = bidang ? [bidang] : BIDS; const us = UORD.filter((u) => !uid || u === uid);
        const kurang = new Set(IX.months.filter((m) => us.some((u) => { const c = IX.cov(m, u, bids); return !IX.ada.has(m + '|' + u) || (c != null && c < 0.95); })));
        const full = ser.filter((d) => !(run && d.m === run.bulan) && d.t && !kurang.has(d.m));
        const shr = (d) => (d.t ? d.k / d.t : 0);
        const pk = full.slice().sort((a, b2) => b2.k - a.k)[0], lo = full.slice().sort((a, b2) => a.k - b2.k)[0];
        const avg = full.length ? full.reduce((a, d) => a + shr(d), 0) / full.length : 0;
        const lastF = full[full.length - 1], prevF = full[full.length - 2];
        const parts = [];
        if (pk) parts.push(`Penyulang kronis terbanyak pada ${BLN[pk.m - 1]} (${fmt(pk.k)} penyulang) dan paling sedikit pada ${BLN[lo.m - 1]} (${fmt(lo.k)}).`);
        if (full.length) parts.push(`Rata-rata porsi kronis ${BS[full[0].m - 1]}–${BS[lastF.m - 1]} ${pc(avg)} dari penyulang yang mengalami gangguan.`);
        if (lastF && prevF) { const d = lastF.k - prevF.k; parts.push(`${BLN[lastF.m - 1]}: ${fmt(lastF.k)} kronis (${pc(shr(lastF))}), ${d > 0 ? 'naik ' + fmt(d) : d < 0 ? 'turun ' + fmt(-d) : 'sama'} dibanding ${BLN[prevF.m - 1]}.`); }
        if (run) { const r = ser.find((d) => d.m === run.bulan); if (r && r.t) parts.push(`${BLN[run.bulan - 1]} s.d. ${+run.sampai.slice(8)}: ${fmt(r.k)} kronis dari ${fmt(r.t)} penyulang (${pc(shr(r))}), data bulan berjalan.`); }
        if (kurang.size) parts.push(`${[...kurang].map((m) => BLN[m - 1]).join(', ')} tidak dihitung karena data per penyulang belum lengkap.`);
        $('hi-trend-sel').textContent = parts.join(' ');
      }
      const ch = $('hi-chart'); ch.classList.remove('dash-skeleton'); ch.replaceChildren();
      const W = Math.max(320, ch.clientWidth || 900), H = 300, mg = { t: 12, r: 8, b: 26, l: 44 };
      const svg = d3.select(ch).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', `Health index penyulang per bulan, ${where}`);
      const y = d3.scaleLinear([0, (d3.max(ser, (d) => d.t) || 1) * 1.04], [H - mg.b, mg.t]).nice();
      const x = d3.scaleBand(months, [mg.l, W - mg.r]).padding(0.28);
      y.ticks(5).forEach((t) => {
        svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', 'var(--cds-chart-grid)');
        svg.append('text').attr('x', mg.l - 8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt(t));
      });
      const bw = Math.min(x.bandwidth(), 60), off = (x.bandwidth() - bw) / 2;
      ser.forEach((d) => {
        const g = svg.append('g').style('cursor', 'pointer').on('click', () => dash.setParams({ hi_bulan: d.m }));
        let acc = 0;
        KAT.forEach((k) => {
          const v = d[k.id]; const y0 = y(acc), y1 = y(acc + v); acc += v;
          g.append('rect').attr('x', x(d.m) + off).attr('width', bw).attr('y', y1).attr('height', Math.max(0, y0 - y1)).attr('fill', k.c).attr('opacity', d.m === bm ? 1 : 0.72);
          if (y0 - y1 >= 13 && bw >= 26) g.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', (y0 + y1) / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').style('font-size', '10.5px').style('font-weight', 600).attr('fill', k.fg).text(fmt(v));
        });
        g.append('title').text(`${BLN[d.m - 1]} 2026 · ` + KAT.map((k) => `${k.nm.toLowerCase()} ${fmt(d[k.id])}`).join(', ') + ` (total ${fmt(d.t)})`);
        svg.append('text').attr('x', x(d.m) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', d.m === bm ? 'var(--color-fg)' : 'var(--color-fg-muted)').style('font-weight', d.m === bm ? 600 : 400).style('font-size', 'var(--cds-font-size-caption)').text(BS[d.m - 1] + (run && d.m === run.bulan ? ` s.d. ${+run.sampai.slice(8)}` : ''));
      });
    }

    S = { fTxt, scoped, bm, where, uid, months: IX.months, bidang };
    renderPS();
    renderList(); renderTop();
    $('hi-note').textContent = `Sumber: database Event Padam Penyulang saja (gangguan per penyulang dari APKT); tidak memakai Database Penyulang. Kelas per penyulang per bulan dari jumlah gangguan permanen + sesaat kode J, mengikuti filter bidang (bawaan Distribusi) dan jenis padam (bawaan semua): kronis ≥ 6 kali, sakit 2–5 kali, sehat 1 kali. Penyulang tanpa gangguan pada bulan itu tidak dihitung; total = penyulang yang mengalami gangguan. Rekap per UP3 belum ditampilkan. Pemeriksaan kelengkapan data dibandingkan rekap Event Padam Penyulang per UID untuk bidang terpilih (semua jenis padam).`;
  }

  // ---------- daftar penyulang: riwayat kelas Jan s.d. bulan terpilih + rekap bulan berjalan (laporan harian, sheet Detil Kode) ----------
  // nama penyulang dibandingkan tanpa awalan (FEEDER, PENYULANG, …) dan tanpa tanda baca, dalam UID yang sama
  const PRE = /^(MV\s*-?\s*CABLE|CELL|FEEDER|PENYULANG|PNY|PYL|F)[\s_.\-]+/;
  const nn = (x) => String(x || '').toUpperCase().trim().replace(PRE, '').replace(/[^A-Z0-9]/g, '');
  const harianPeny = () => { const d = (window.SSHarianSaved && window.SSHarianSaved.penyulang) || (window.__HARIAN && window.__HARIAN.penyulang) || null; return d && Array.isArray(d.rows) && d.rows.length ? d : null; };
  function renderList() {
    if (!S) return;
    const { scoped, bm, where, uid, months, bidang } = S;
    const upto = months.filter((m) => m <= bm);
    // bulan berjalan = bulan setelah bulan terakhir di database Event Padam Penyulang (mis. November)
    const HP0 = harianPeny(); const lastM = months[months.length - 1];
    const HP = HP0 && HP0.tahun === 2026 && HP0.bulan > lastM ? HP0 : null;
    const hpOn = !!HP && (!bidang || bidang === 'DISTRIBUSI'); // sheet Detil Kode = gangguan kode J penyulang distribusi
    const bbTxt = HP ? `${BLN[HP.bulan - 1]} s.d. ${+HP.sampai.slice(8)}` : 'bulan berjalan';
    // gabungkan penyulang per UID + nama (UP3 belum ditampilkan)
    const G = new Map();
    const row = (u, name) => { const k = u + '|' + nn(name); let g = G.get(k); if (!g) { g = { u, peny: name, mo: {}, ulp: new Map(), ulpH: new Map(), bb: null }; G.set(k, g); } return g; };
    scoped.forEach((f) => {
      if (!upto.some((m) => f.mo[m])) return;
      const g = row(f.u, f.peny); f.ulp.forEach((n, x) => g.ulp.set(x, (g.ulp.get(x) || 0) + n));
      upto.forEach((m) => { const o = f.mo[m]; if (!o) return; const v = g.mo[m] || (g.mo[m] = [0, 0]); v[0] += o[0]; v[1] += o[1]; });
    });
    if (hpOn) HP.rows.forEach(([u, ulp, peny, p, sv]) => {
      if (uid && u !== uid) return;
      const g = row(u, peny); const v = g.bb || (g.bb = [0, 0]); v[0] += p; v[1] += sv;
      if (ulp) g.ulpH.set(ulp, (g.ulpH.get(ulp) || 0) + p + sv);
    });
    let rows = [...G.values()];
    if (q) rows = rows.filter((g) => g.peny.toLowerCase().includes(q) || uname(g.u).toLowerCase().includes(q) || ULABEL[g.u].toLowerCase().includes(q) || g.u.toLowerCase().includes(q) || [...g.ulp.keys(), ...g.ulpH.keys()].some((x) => x.toLowerCase().includes(q)));
    const tb0 = (g) => (g.bb ? g.bb[0] + g.bb[1] : -1); const tm = (g) => { const o = g.mo[bm]; return o ? o[0] + o[1] : 0; };
    rows.sort((a, b2) => tb0(b2) - tb0(a) || tm(b2) - tm(a) || a.peny.localeCompare(b2.peny));
    $('hi-list-h').textContent = `Penyulang · ${where} (${fmt(rows.length)})`;
    $('hi-list-note').textContent = '';
    const th = mk('thead'), h1 = mk('tr'), h2 = mk('tr');
    const th1 = (t, cls, rs, cs) => { const e = mk('th', t, cls); if (rs) e.rowSpan = rs; if (cs) e.colSpan = cs; h1.append(e); return e; };
    th1('Penyulang', '', 2); th1('ULP', 'hi-u3', 2); th1('UID', 'hi-u3', 2); upto.forEach((m) => th1(BS[m - 1], 'hi-mh', 2));
    th1(`Rekap ${bbTxt}`, 'hi-bbh', 0, 3); th1('Kelas', 'hi-kh', 2);
    ['P', 'S', 'Total'].forEach((t, i) => h2.append(mk('th', t, 'num hi-bb' + (i === 0 ? ' first' : ''))));
    th.append(h1, h2);
    const tb = mk('tbody'); const MAX = 600; const ncol = 6 + upto.length;
    if (!rows.length) { const tr = mk('tr'); const td = mk('td', 'Tidak ada penyulang pada pilihan ini.', 'gx-zero'); td.colSpan = ncol; tr.append(td); tb.append(tr); }
    rows.slice(0, MAX).forEach((g) => {
      const tr = mk('tr');
      // ULP dari database Event Padam Penyulang; bila belum ada (data lama tanpa ULP), dari laporan harian
      const fromDb = g.ulp.size > 0; const ulp = [...(fromDb ? g.ulp : g.ulpH)].sort((a, b2) => b2[1] - a[1]).map(([x]) => x);
      const uc = mk('td', ulp.length ? ulp[0] : '–', 'hi-u3' + (ulp.length ? (fromDb ? '' : ' hi-ulph') : ' gx-zero'));
      if (ulp.length) uc.title = (fromDb ? 'ULP dari database Event Padam Penyulang' : 'ULP dari laporan harian (database Event Padam Penyulang belum memuat ULP)') + (ulp.length > 1 ? ': ' + ulp.join(', ') : '');
      tr.append(mk('td', g.peny, 'hi-nm'), uc, mk('td', uname(g.u), 'hi-u3'));
      upto.forEach((m) => {
        const o = g.mo[m]; const n = o ? o[0] + o[1] : 0; const nd = !IX.ada.has(m + '|' + g.u); const km = n ? katOf(n) : null;
        const td = mk('td', null, 'hi-mc'); const c = mk('span', km ? fmt(n) : nd ? '–' : '0', 'hi-cell' + (km ? '' : nd ? ' na' : ' z'));
        if (km) { c.style.background = KBY[km].c; c.style.color = KBY[km].fg; }
        c.title = `${BLN[m - 1]}: ${km ? KBY[km].nm.toLowerCase() + ` (${fmt(o[0])} permanen, ${fmt(o[1])} sesaat)` : nd ? 'belum ada data' : 'tanpa gangguan'}`;
        td.append(c); tr.append(td);
      });
      const bb = g.bb; const nb = bb ? bb[0] + bb[1] : 0;
      if (hpOn) tr.append(mk('td', fmt(bb ? bb[0] : 0), 'num hi-bb first' + (bb && bb[0] ? '' : ' gx-zero')), mk('td', fmt(bb ? bb[1] : 0), 'num hi-bb' + (bb && bb[1] ? '' : ' gx-zero')), mk('td', fmt(nb), 'num hi-bb hi-bbt' + (nb ? '' : ' gx-zero')));
      else { for (let i = 0; i < 3; i++) tr.append(mk('td', '–', 'num hi-bb gx-zero' + (i === 0 ? ' first' : ''))); }
      const kc = mk('td', null, 'hi-kc hi-bbc'); const kb = hpOn && nb ? katOf(nb) : null;
      if (kb) { const pill = mk('span', KBY[kb].nm, 'hi-pill'); pill.style.background = KBY[kb].c; pill.style.color = KBY[kb].fg; kc.append(pill); }
      else kc.append(mk('span', hpOn ? 'Tanpa gangguan' : '–', 'gx-zero hi-k0'));
      tr.append(kc); tb.append(tr);
    });
    if (rows.length > MAX) { const tr = mk('tr'); const td = mk('td', `Menampilkan ${fmt(MAX)} dari ${fmt(rows.length)} penyulang. Pilih UID atau cari nama penyulang / ULP untuk mempersempit.`, 'gx-zero'); td.colSpan = ncol; tr.append(td); tb.append(tr); }
    $('hi-list').replaceChildren(th, tb);
  }
  // ---------- Top 3 penyulang gangguan per UID, bulan berjalan (laporan harian, sheet Detil Kode), semua UID dalam satu tabel ----------
  function renderTop() {
    if (!S || !IX) return;
    const HP0 = harianPeny(); const lastM = IX.months[IX.months.length - 1];
    const HP = HP0 && HP0.tahun === 2026 && HP0.bulan > lastM ? HP0 : null;
    const tb = mk('tbody');
    const th = mk('thead'), hr = mk('tr'), hr2 = mk('tr', null, 'hi-sub2');
    // gangguan permanen dan sesaat per UID bulan berjalan, di kiri kolom UID
    { const e = mk('th', null, 'hi-uidh'); e.rowSpan = 2; e.append('UID', mk('small', HP ? `Kumulatif Jan–${BS[HP.bulan - 1]} s.d. ${+HP.sampai.slice(8)}: P · S` : 'Kumulatif: P · S')); hr.append(e); }
    [ ['#', 'num'], ['Penyulang', ''], ['ULP', '']].forEach(([h, c]) => { const e = mk('th', h, c); e.rowSpan = 2; hr.append(e); });
    const grp = (t, cls, n) => { const e = mk('th', t, cls); e.colSpan = n; hr.append(e); };
    grp(`Kumulatif Jan–${BS[lastM - 1]} 2026`, 'hi-gph hi-gp-cum', 3); grp(`${BLN[lastM - 1]} (bulan lalu)`, 'hi-gph hi-gp-prev', 3);
    grp(HP ? `Rekap bulan berjalan · ${BLN[HP.bulan - 1]} s.d. ${+HP.sampai.slice(8)}` : 'Rekap bulan berjalan', 'hi-bbh', 4);
    [['P', 'num hi-cm first'], ['S', 'num hi-cm'], ['Total', 'num hi-cm'], ['P', 'num hi-pv first'], ['S', 'num hi-pv'], ['Total', 'num hi-pv'], ['P', 'num hi-bbc first'], ['S', 'num hi-bbc'], ['Total', 'num hi-bbc'], ['Kelas', 'hi-kh hi-bbc']].forEach(([h, c]) => hr2.append(mk('th', h, c)));
    th.append(hr, hr2);
    if (!HP) {
      $('hi-top-h').textContent = 'Top 3 penyulang gangguan per UID · bulan berjalan';
      $('hi-top-note').textContent = HP0 ? `Data laporan harian tersimpan adalah ${BLN[HP0.bulan - 1]} ${HP0.tahun}, bukan bulan berjalan. Unggah laporan harian (sheet Detil Kode) dengan tanggal realisasi bulan ini.` : 'Belum ada unggahan laporan harian dengan sheet Detil Kode.';
      $('hi-top').replaceChildren(th, tb); return;
    }
    const bb = `${BLN[HP.bulan - 1]} s.d. ${+HP.sampai.slice(8)}`;
    $('hi-top-h').textContent = `Top 3 penyulang gangguan per UID · ${bb} ${HP.tahun}`;
    // ULP dan riwayat bulan lalu dari database Event Padam Penyulang (kode J distribusi, semua jenis padam)
    const ulpDb = new Map(), prev = new Map(), cum = new Map();
    IX.feeders.forEach((f) => {
      const k = f.u + '|' + nn(f.peny);
      if (f.ulp.size) { const o = ulpDb.get(k) || new Map(); f.ulp.forEach((n, x) => o.set(x, (o.get(x) || 0) + n)); ulpDb.set(k, o); }
      const add = (map, o) => { const v = map.get(k) || [0, 0]; Object.entries(o).forEach(([kk, ps]) => { if (kk.startsWith('DISTRIBUSI|')) { v[0] += ps[0]; v[1] += ps[1]; } }); if (v[0] + v[1]) map.set(k, v); };
      Object.entries(f.raw).forEach(([m, o]) => { if (+m <= lastM) add(cum, o); });
      if (f.raw[lastM]) add(prev, f.raw[lastM]);
    });
    const G = new Map();
    HP.rows.forEach(([u, ulp, peny, p, sv]) => { const k = u + '|' + nn(peny); const g = G.get(k) || { u, peny, p: 0, s: 0, ulpH: new Map() }; g.p += p; g.s += sv; if (ulp) g.ulpH.set(ulp, (g.ulpH.get(ulp) || 0) + p + sv); G.set(k, g); });
    // kumulatif per UID = database Event Padam Penyulang (kode J, Distribusi, Jan s.d. bulan lalu) + laporan harian sheet Detil Kode (bulan berjalan)
    const uTot = {};
    const GPS = SSD.data('gangguan_ps');
    if (GPS.status === 'ok') GPS.data.forEach((r) => { if (r.KODE !== 'J' || r.BIDANG !== 'DISTRIBUSI' || +r.BULAN_NO > lastM || (r.PS !== 'Permanen' && r.PS !== 'Sesaat')) return; const o = uTot[r.UNIT] || (uTot[r.UNIT] = [0, 0]); o[r.PS === 'Permanen' ? 0 : 1] += Number(r.JUMLAH); });
    HP.rows.forEach(([u, , , p, sv]) => { const o = uTot[u] || (uTot[u] = [0, 0]); o[0] += p; o[1] += sv; });
    const mode = (m) => [...m].sort((a, b) => b[1] - a[1])[0][0];
    let nTop = 0;
    UORD.forEach((u) => {
      const top = [...G].filter(([, g]) => g.u === u).sort((a, b) => (b[1].p + b[1].s) - (a[1].p + a[1].s) || b[1].p - a[1].p || a[1].peny.localeCompare(b[1].peny)).slice(0, 3);
      const uPS = uTot[u] || [0, 0];
      // sel UID: nama UID + kumulatif permanen / sesaat
      const uidCell = (tr, show) => { const td = mk('td', null, 'hi-tu hi-uidcell'); if (show) { td.append(mk('b', ULABEL[u])); const ps = mk('span', null, 'hi-uidps'); ps.append(mk('em', 'P'), fmt(uPS[0]), mk('em', 'S'), fmt(uPS[1])); td.append(ps); } tr.append(td); };
      if (!top.length) { const tr = mk('tr', null, 'hi-tfirst'); uidCell(tr, true); const td = mk('td', 'Tidak ada gangguan kode J penyulang pada bulan berjalan.', 'gx-zero'); td.colSpan = 13; tr.append(td); tb.append(tr); return; }
      top.forEach(([k, g], i) => {
        nTop++;
        const tr = mk('tr', null, (i === 0 ? 'hi-tfirst' : '') + (S.uid === u ? ' on' : ''));
        uidCell(tr, i === 0);
        const fromDb = ulpDb.has(k); const ul = fromDb ? mode(ulpDb.get(k)) : g.ulpH.size ? mode(g.ulpH) : '–';
        const n = g.p + g.s; const kb = katOf(n); const pill = mk('span', KBY[kb].nm, 'hi-pill'); pill.style.background = KBY[kb].c; pill.style.color = KBY[kb].fg;
        const kc = mk('td', null, 'hi-kc hi-bbc'); kc.append(pill);
        const pv = prev.get(k) || [0, 0], cv = cum.get(k) || [0, 0];
        // total bulan lalu sebagai kotak warna kelas bulan itu
        const pt = pv[0] + pv[1]; const pk = pt ? katOf(pt) : null; const pc0 = mk('td', null, 'hi-mc hi-pv'); const c = mk('span', fmt(pt), 'hi-cell' + (pk ? '' : ' z')); if (pk) { c.style.background = KBY[pk].c; c.style.color = KBY[pk].fg; } c.title = `${BLN[lastM - 1]}: ${pt ? KBY[pk].nm.toLowerCase() : 'tanpa gangguan'}`; pc0.append(c);
        const num = (v, cls) => mk('td', fmt(v), 'num ' + cls + (v ? '' : ' gx-zero'));
        tr.append(mk('td', String(i + 1), 'num hi-rank'), mk('td', g.peny, 'hi-nm'), mk('td', ul, 'hi-u3' + (fromDb ? '' : ' hi-ulph')),
          num(cv[0], 'hi-cm first'), num(cv[1], 'hi-cm'), mk('td', fmt(cv[0] + cv[1]), 'num hi-cm hi-cmt' + (cv[0] + cv[1] ? '' : ' gx-zero')),
          num(pv[0], 'hi-pv first'), num(pv[1], 'hi-pv'), pc0,
          num(g.p, 'hi-bbc first'), num(g.s, 'hi-bbc'), mk('td', fmt(n), 'num hi-bbt hi-bbc'), kc);
        tb.append(tr);
      });
    });
    { const t = Object.values(uTot).reduce((a, o) => [a[0] + o[0], a[1] + o[1]], [0, 0]); const tr = mk('tr', null, 'hi-tfirst dp-ps-tot');
      const td0 = mk('td', null, 'hi-tu hi-uidcell'); td0.append(mk('b', 'Total Sumkal')); const ps = mk('span', null, 'hi-uidps'); ps.append(mk('em', 'P'), fmt(t[0]), mk('em', 'S'), fmt(t[1])); td0.append(ps); tr.append(td0); const td = mk("td", ""); td.colSpan = 13; tr.append(td); tb.append(tr); }
    $('hi-top').replaceChildren(th, tb);
    $('hi-top-note').textContent = '';
  }
  // ---------- rekap event permanen dan sesaat per UID: Jan s.d. bulan terpilih (database Event Padam Penyulang) + bulan berjalan (laporan harian) ----------
  function renderPS() {
    if (!S || !IX) return;
    const { bm, uid, months, bidang } = S;
    const GPS = SSD.data('gangguan_ps'); if (GPS.status !== 'ok') return;
    const upto = months.filter((m) => m <= bm);
    const v = {};
    GPS.data.forEach((r) => {
      if (r.KODE !== 'J' || (bidang && r.BIDANG !== bidang) || (r.PS !== 'Permanen' && r.PS !== 'Sesaat')) return;
      const k = r.UNIT + '|' + (r.PS === 'Permanen' ? 0 : 1) + '|' + (+r.BULAN_NO); v[k] = (v[k] || 0) + Number(r.JUMLAH);
    });
    const HP0 = harianPeny(); const lastM = months[months.length - 1];
    const HP = HP0 && HP0.tahun === 2026 && HP0.bulan > lastM && bm >= lastM && (!bidang || bidang === 'DISTRIBUSI') ? HP0 : null;
    const hb = {}; if (HP) HP.rows.forEach(([u, , , p, sv]) => { const o = hb[u] || (hb[u] = [0, 0]); o[0] += p; o[1] += sv; });
    const bbTxt = HP ? `${BS[HP.bulan - 1]} s.d. ${+HP.sampai.slice(8)}` : '';
    $('hi-unit-h').textContent = `Rekap event permanen dan sesaat · ${uid ? ULABEL[uid] : 'Sumkal'} · Jan–${BS[Math.min(bm, lastM) - 1]}${HP ? ' + ' + bbTxt : ''} 2026`;
    const get = (u, i, m) => (u ? v[u + '|' + i + '|' + m] || 0 : UORD.reduce((a, x) => a + (v[x + '|' + i + '|' + m] || 0), 0));
    const getB = (u, i) => (u ? (hb[u] || [0, 0])[i] : UORD.reduce((a, x) => a + (hb[x] || [0, 0])[i], 0));
    // grafik batang permanen dan sesaat per bulan untuk UID terpilih (atau Sumkal)
    {
      const ser = upto.map((m) => ({ m, lab: BS[m - 1], P: get(uid, 0, m), S: get(uid, 1, m) }));
      if (HP) ser.push({ m: HP.bulan, lab: bbTxt, P: getB(uid, 0), S: getB(uid, 1), run: true });
      const BARS = [['P', 'Permanen', SSC[4]], ['S', 'Sesaat', SSC[6]]];
      $('hi-ps-sel').replaceChildren('Unit dipilih: ', mk('b', uid ? ULABEL[uid] : 'Sumkal'), ` · batang: event gangguan kode J${bidang ? ' ' + BNAME[bidang].toLowerCase() : ''} permanen dan sesaat` + (HP ? ` · ${bbTxt}: laporan harian (data berjalan, batang pucat)` : ''));
      $('hi-ps-legend').replaceChildren(...BARS.map(([, n, c]) => { const sp = mk('span'); const i = mk('i', null, 'ss-sw'); i.style.background = c; sp.append(i, n); return sp; }));
      const chart = $('hi-ps-chart'); chart.classList.remove('dash-skeleton'); chart.replaceChildren();
      const W = Math.max(300, chart.clientWidth || 900), H = 340, mg = { t: 26, r: 8, b: 28, l: 40 };
      const svg = d3.select(chart).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', 'Event permanen dan sesaat per bulan, ' + (uid ? ULABEL[uid] : 'Sumkal'));
      const y = d3.scaleLinear([0, (d3.max(ser, (d) => Math.max(d.P, d.S)) || 1) * 1.12], [H - mg.b, mg.t]).nice();
      const yt = y.ticks(5);
      const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').text(fmt(yt[yt.length - 1])); mg.l = Math.ceil(probe.node().getComputedTextLength()) + 12; probe.remove();
      const x = d3.scaleBand(ser.map((d) => d.lab), [mg.l, W - mg.r]).padding(0.2);
      const x1 = d3.scaleBand(BARS.map((b) => b[0]), [0, x.bandwidth()]).padding(0.08);
      svg.append('g').selectAll('line').data(yt).join('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid)');
      svg.append('g').selectAll('text').data(yt).join('text').attr('x', mg.l - 8).attr('y', y).attr('dy', '0.32em').attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(fmt);
      svg.append('line').attr('x1', mg.l).attr('x2', W - mg.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', 'var(--cds-chart-axis)');
      svg.append('g').selectAll('text').data(ser).join('text').attr('x', (d) => x(d.lab) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text((d) => d.lab);
      const bw = Math.min(x1.bandwidth(), 28), off = (x1.bandwidth() - bw) / 2;
      BARS.forEach(([key, nm, c]) => {
        svg.append('g').selectAll('rect').data(ser).join('rect').attr('x', (d) => x(d.lab) + x1(key) + off).attr('width', bw).attr('y', (d) => y(d[key])).attr('height', (d) => Math.max(0, y(0) - y(d[key]))).attr('rx', 3).attr('fill', c).attr('opacity', (d) => (d.run ? 0.5 : 1))
          .append('title').text((d) => `${d.lab}: ${fmt(d[key])} event ${nm.toLowerCase()}`);
        if (bw >= 18) svg.append('g').selectAll('text').data(ser.filter((d) => d[key] > 0)).join('text').attr('x', (d) => x(d.lab) + x1(key) + x1.bandwidth() / 2).attr('y', (d) => y(d[key]) - 5).attr('text-anchor', 'middle').attr('fill', 'var(--color-fg-muted)').style('font-size', '10px').text((d) => fmt(d[key]));
      });
    }
    $('hi-unit-note').textContent = `Event gangguan diambil dari kode J ${bidang ? 'bidang ' + BNAME[bidang] : 'seluruh bidang'} untuk seluruh jenis padam. Pilih UID di atas untuk melihat UID tertentu.`;
  }
  document.addEventListener('ss-harian-saved', () => { try { renderList(); renderTop(); renderPS(); } catch (e) { console.error(e); } });

  SSD.onData(() => { try { render(); } catch (e) { console.error(e); } });
})();
