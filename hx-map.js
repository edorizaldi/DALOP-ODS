// Tab Hirarki Aset: peta jaringan bergaya ArcGIS (Leaflet).
// Data: gi_identitas (titik GI), hx_gi (UID/UP3 per GI), hx_feeder, hx_geo_<UID> (garis penyulang dari hx-geo.js), dimuat saat tab dibuka.
// Alur: pilih Unit (UID) dan Gardu Induk → peta menampilkan semua penyulang GI itu → pilih penyulang di peta atau daftar → profil penyulang di kanan peta.
// Pilihan memakai parameter yang sama dengan bagian Evaluasi Feeder (hx_wilayah, hx_gi, hx_feeder). Profil dari peny_profil dan peny_bulanan (seperti tab Database Penyulang).
(() => {
  const $ = (id) => document.getElementById(id);
  if (!$('hxm')) return;
  const LCSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  const LJS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  const UID = { 'WILAYAH ACEH': 'ACEH', 'WILAYAH SUMATERA UTARA': 'SUMUT', 'WILAYAH SUMATERA BARAT': 'SUMBAR', 'WILAYAH SUMATERA SELATAN, JAMBI & BENGKULU (S2JB)': 'S2JB', 'WILAYAH BANGKA BELITUNG': 'BABEL', 'DISTRIBUSI LAMPUNG': 'LAMPUNG', 'WILAYAH RIAU DAN KEPULAUAN RIAU': 'RKR', 'WILAYAH KALIMANTAN BARAT': 'KALBAR', 'WILAYAH KALIMANTAN SELATAN DAN TENGAH': 'KALSELTENG', 'WILAYAH KALIMANTAN TIMUR': 'KALTIMRA' };
  const WIL = Object.fromEntries(Object.entries(UID).map(([w, u]) => [u, w]));
  const UORD = ['ACEH', 'SUMUT', 'SUMBAR', 'RKR', 'S2JB', 'BABEL', 'LAMPUNG', 'KALBAR', 'KALSELTENG', 'KALTIMRA'];
  const ULAB = { ACEH: 'Aceh', SUMUT: 'Sumut', SUMBAR: 'Sumbar', RKR: 'RKR', S2JB: 'S2JB', BABEL: 'Babel', LAMPUNG: 'Lampung', KALBAR: 'Kalbar', KALSELTENG: 'Kalselteng', KALTIMRA: 'Kaltimra' };
  const PAL = ['#1f77b4', '#e8590c', '#2b8a3e', '#c2255c', '#6741d9', '#0b7285', '#a61e4d', '#5c940d', '#d9480f', '#364fc7', '#087f5b', '#862e9c'];
  const BASE = {
    abu: { n: 'Abu-abu', u: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', a: 'Tiles © Esri — Esri, DeLorme, NAVTEQ', max: 16 },
    topo: { n: 'Topografi', u: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', a: 'Tiles © Esri — Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors', max: 19 },
    citra: { n: 'Citra satelit', u: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', a: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community', max: 19 },
    jalan: { n: 'Jalan (OSM)', u: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', a: '© OpenStreetMap contributors', max: 19 },
  };
  const nf = new Intl.NumberFormat('id-ID'); const fmt = (v) => nf.format(Math.round(Number(v) || 0));
  const f1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const mk = (tag, t, cls) => { const e = document.createElement(tag); if (t != null) e.textContent = t; if (cls) e.className = cls; return e; };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BLNF = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const PRE = /^(MV\s*-?\s*CABLE|MVCABLE|CELL|FEEDER|PENYULANG|PNY|PYL|F)[\s_.\-]+/;
  const N = (x) => String(x || '').toUpperCase().trim().replace(PRE, '').trim().replace(/[^A-Z0-9]/g, '');
  const NU = (x) => String(x || '').toUpperCase().replace(/^UP3\s+/, '').replace(/[^A-Z0-9]/g, '');
  const giShort = (n) => String(n || '').replace(/^GI\s+/i, '');
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* abaikan */ } } };

  // ---------- pemuatan ----------
  const loading = new Set();
  const need = (id, src) => {
    if (window.__D && id in window.__D) return true;
    if (loading.has(id)) return false; loading.add(id);
    const s = document.createElement('script'); s.src = src || id + '.js';
    s.onload = () => { loading.delete(id); if (window.__D && !(id in window.__D)) window.__D[id] = null; render(); };
    s.onerror = () => { loading.delete(id); window.__D[id] = null; render(); };
    document.head.appendChild(s); return false;
  };
  let leafletState = 0; // 0 belum, 1 memuat, 2 siap, 3 gagal
  const needLeaflet = () => {
    if (window.L && window.L.map) return true;
    if (leafletState) return false; leafletState = 1;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LCSS; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = LJS; s.onload = () => { leafletState = 2; render(); }; s.onerror = () => { leafletState = 3; render(); };
    document.head.appendChild(s); return false;
  };

  // ---------- keadaan ----------
  const st = { base: store.get('hxm-base', 'abu'), color: store.get('hxm-color', 'feeder'), lay: { gi: true, line: true, gardu: true, jauh: false } };
  let map = null, baseLayer = null, R = null, G = { gi: null, line: null, gardu: null, jauh: null, sel: null };
  let feeders = [], allF = [], fByKode = new Map(), giAll = [], uidCur = null, giCur = null, fitKey = '', selKey = '';
  const P = () => dash.params();
  const setP = (o) => dash.setParams(o);

  // ---------- kontrol ----------
  $('hxm-f-uid').addEventListener('change', (e) => { const u = e.target.value; fitKey = ''; setP({ hx_wilayah: u ? WIL[u] : null, hx_up3: null, hx_gi: null, hx_feeder: null }); });
  $('hxm-f-gi').addEventListener('change', (e) => { fitKey = ''; setP({ hx_up3: null, hx_gi: e.target.value || null, hx_feeder: null }); });
  $('hxm-back').addEventListener('click', () => { fitKey = ''; if (P().hx_feeder) setP({ hx_feeder: null }); else setP({ hx_gi: null, hx_feeder: null }); });
  $('hxm-panel').addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'hxm-lay') { st.lay[t.value] = t.checked; draw(); }
    if (t.name === 'hxm-color') { st.color = t.value; store.set('hxm-color', t.value); draw(); }
  });
  $('hxm-base').addEventListener('click', (e) => { const b = e.target.closest('button[data-b]'); if (!b) return; st.base = b.dataset.b; store.set('hxm-base', st.base); setBase(); });
  $('hxm-panel-t').addEventListener('click', () => { const p = $('hxm-panel'); const open = p.classList.toggle('open'); $('hxm-panel-t').setAttribute('aria-expanded', String(open)); });
  $('hxm-full').addEventListener('click', () => { const b = $('hxm-body'); if (document.fullscreenElement) document.exitFullscreen(); else if (b.requestFullscreen) b.requestFullscreen(); });
  document.addEventListener('fullscreenchange', () => { setTimeout(() => map && map.invalidateSize(), 120); });
  $('hxm-home').addEventListener('click', () => { fitKey = ''; fitView(true); });
  $('hxm-q').addEventListener('change', (e) => { search(e.target.value); });
  $('hxm-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(e.target.value); } });
  $('hxm-clear').addEventListener('click', () => { fitKey = ''; setP({ hx_feeder: null }); });

  function search(v) {
    const s = String(v || '').trim().toUpperCase(); if (!s) return;
    const fd = allF.find((f) => `${f.nama} · ${f.giNama}`.toUpperCase() === s) || allF.find((f) => f.kode.toUpperCase() === s) || allF.find((f) => f.nama.toUpperCase() === s);
    if (fd) { setP({ hx_gi: fd.gi, hx_feeder: fd.kode }); fitKey = ''; $('hxm-q').value = ''; return; }
    const gi = giAll.find((g) => g.nama.toUpperCase() === s || ('GI ' + g.nama).toUpperCase() === s);
    if (gi) { fitKey = ''; setP({ hx_wilayah: WIL[gi.uid] || P().hx_wilayah, hx_gi: gi.aset, hx_feeder: null }); $('hxm-q').value = ''; return; }
    for (const f of allF) { const i = f.codes.findIndex((c) => String(c).toUpperCase() === s); if (i >= 0) { const p = f.pt[i]; setP({ hx_gi: f.gi, hx_feeder: f.kode }); if (p && map) { fitKey = 'gardu'; map.setView(p, 17); L.popup().setLatLng(p).setContent(garduPop(f, i)).openOn(map); } $('hxm-q').value = ''; return; } }
    $('hxm-msg').textContent = `"${v}" tidak ditemukan di ${uidCur ? ULAB[uidCur] : 'Sumkal'}. Cari nama penyulang, nama GI, atau kode gardu lengkap.`;
  }

  // ---------- data ----------
  function decode(raw, hxF, giMap) {
    const out = [];
    (raw.f || []).forEach((r) => {
      const [kode, nama, gi, glon, glat, km, flat, codes, names, kva, tr, ts] = r;
      const n = codes.length; const pt = new Array(n); const par = new Int32Array(n);
      for (let i = 0; i < n; i++) { const lo = flat[i * 3], la = flat[i * 3 + 1]; par[i] = flat[i * 3 + 2]; pt[i] = par[i] === -3 ? null : [la / 1e5, lo / 1e5]; }
      const giLL = glat != null ? [glat, glon] : null;
      const segs = []; let b = null;
      const ext = (p) => { if (!p) return; if (!b) b = [p[0], p[1], p[0], p[1]]; else { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; } };
      for (let i = 0; i < n; i++) { if (par[i] >= 0) { segs.push([pt[par[i]], pt[i]]); ext(pt[i]); } else if (par[i] === -1) { if (giLL) segs.push([giLL, pt[i]]); ext(pt[i]); } }
      const fx = hxF.get(kode) || {}; const g = giMap.get(gi) || {};
      out.push({ kode, nama, gi, giNama: g.nama || gi, up3: g.up3 || '', ulp: fx.ulp || '', km, pt, par, codes, names, kva, tr, ts: ts || [], segs, bb: b, giLL,
        nG: n, nT: tr.reduce((a, x) => a + x, 0), kv: kva.reduce((a, x) => a + x, 0), jauh: Array.prototype.filter.call(par, (x) => x === -2).length, tanpa: Array.prototype.filter.call(par, (x) => x === -3).length,
        color: PAL[hash(kode) % PAL.length], gColor: PAL[hash(gi) % PAL.length] });
    });
    return out;
  }

  // ---------- peta ----------
  function setBase() {
    if (!map) return;
    const b = BASE[st.base] || BASE.abu;
    if (baseLayer) map.removeLayer(baseLayer);
    baseLayer = L.tileLayer(b.u, { attribution: b.a, maxZoom: 19, maxNativeZoom: b.max, crossOrigin: true }).addTo(map);
    baseLayer.bringToBack();
    $('hxm-base').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.b === st.base)));
    $('hxm-body').classList.toggle('hxm-dark', st.base === 'citra');
  }
  function initMap() {
    if (map) return;
    R = L.canvas({ padding: 0.3, tolerance: 6 });
    map = L.map($('hxm-map'), { zoomSnap: 0.25, zoomDelta: 0.5, preferCanvas: true, renderer: R, zoomControl: false, attributionControl: true, minZoom: 4, maxZoom: 19, worldCopyJump: false }).setView([-1.2, 107.5], 5);
    L.control.zoom({ position: 'topright', zoomInTitle: 'Perbesar', zoomOutTitle: 'Perkecil' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    setBase();
    if (window.innerWidth < 1600) { $('hxm-panel').classList.remove('open'); $('hxm-panel-t').setAttribute('aria-expanded', 'false'); }
    map.on('mousemove', (e) => { $('hxm-coord').textContent = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`; });
    let z9 = map.getZoom() >= 9;
    map.on('moveend zoomend', () => { const z = map.getZoom() >= 9; if (z !== z9) { z9 = z; draw(); } else { drawGardu(); } $('hxm-zoomnote').hidden = map.getZoom() >= 12 || !st.lay.gardu || !giCur; });
  }
  const inView = (f) => { if (!f.bb || !map) return false; const v = map.getBounds(); return !(f.bb[2] < v.getSouth() || f.bb[0] > v.getNorth() || f.bb[3] < v.getWest() || f.bb[1] > v.getEast()); };
  const shown = () => (giCur ? allF.filter((f) => f.gi === giCur) : allF);

  function feederPop(f) {
    const d = mk('div', null, 'hxm-pop');
    d.append(mk('b', 'Penyulang ' + f.nama), mk('span', f.kode, 'hxm-pop-k'));
    const dl = mk('dl');
    [['Gardu Induk', f.giNama], ['ULP', f.ulp || '—'], ['Gardu', fmt(f.nG)], ['Trafo', fmt(f.nT)], ['kVA gardu', fmt(f.kv)], ['Panjang garis (perkiraan)', f1.format(f.km) + ' km'], ['Koordinat keliru / kosong', `${fmt(f.jauh)} / ${fmt(f.tanpa)}`]].forEach(([k, v]) => dl.append(mk('dt', k), mk('dd', v)));
    d.append(dl);
    const b = mk('button', 'Telusuri hirarki penyulang ini', 'hxm-pop-b'); b.type = 'button';
    b.addEventListener('click', () => { setP({ hx_gi: f.gi, hx_feeder: f.kode }); setTimeout(() => { const c = $('hx-fd-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250); });
    d.append(b); return d;
  }
  function garduPop(f, i) {
    const d = mk('div', null, 'hxm-pop');
    d.append(mk('b', f.names[i] || f.codes[i]), mk('span', f.codes[i], 'hxm-pop-k'));
    const dl = mk('dl');
    [['Penyulang', f.nama], ['Gardu Induk', f.giNama], ['kVA gardu', f.kva[i] ? fmt(f.kva[i]) : '—'], ['Jumlah trafo', fmt(f.tr[i])], ['Koordinat', f.pt[i] ? `${f.pt[i][0].toFixed(5)}, ${f.pt[i][1].toFixed(5)}` : '—'], ['Status garis', f.par[i] === -2 ? 'tidak disambung (jauh dari penyulangnya)' : 'tersambung']].forEach(([k, v]) => dl.append(mk('dt', k), mk('dd', v)));
    d.append(dl);
    // trafo di gardu ini: SSOT Number trafo dari Database Aset Jaringan sheet TRAFO
    const tl = String(f.ts[i] || '').split(';').filter(Boolean).map((x) => x.split(':'));
    const tw = mk('div', null, 'hxm-pop-tr');
    tw.append(mk('span', tl.length ? 'SSOT Number trafo' : 'Belum ada trafo yang cocok ke gardu ini di sheet TRAFO', 'hxm-pop-trh'));
    if (tl.length) { const ul = mk('ul'); tl.forEach(([ss, kv]) => { const li = mk('li'); li.append(mk('code', ss), mk('span', kv ? fmt(kv) + ' kVA' : '')); ul.append(li); }); tw.append(ul); }
    d.append(tw);
    const b = mk('button', 'Telusuri hirarki penyulang ini', 'hxm-pop-b'); b.type = 'button';
    b.addEventListener('click', () => { setP({ hx_gi: f.gi, hx_feeder: f.kode }); setTimeout(() => { const c = $('hx-fd-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250); });
    d.append(b); return d;
  }
  function giPop(g) {
    const d = mk('div', null, 'hxm-pop');
    d.append(mk('b', g.nama), mk('span', g.aset, 'hxm-pop-k'));
    const dl = mk('dl'); [['UID · UP3', `${g.uid || '—'} · ${g.up3 || '—'}`], ['Alamat', g.alamat || '—'], ['Feeder', fmt(g.nF)], ['Status', g.status || '—']].forEach(([k, v]) => dl.append(mk('dt', k), mk('dd', v)));
    d.append(dl);
    if (!uidCur && g.uid) { const b = mk('button', `Muat jaringan ${ULAB[g.uid] || g.uid}`, 'hxm-pop-b'); b.type = 'button'; b.addEventListener('click', () => { setP({ hx_wilayah: WIL[g.uid], hx_up3: null, hx_gi: g.aset, hx_feeder: null }); map.closePopup(); }); d.append(b); }
    return d;
  }

  function draw() {
    if (!map) return;
    Object.values(G).forEach((l) => { if (l) map.removeLayer(l); }); G = { gi: null, line: null, gardu: null, jauh: null, sel: null };
    const p = P(); const sel = fByKode.get(p.hx_feeder) || null;
    const F = shown();
    // garis penyulang: satu polyline (banyak potongan) per penyulang
    if (st.lay.line && F.length) {
      G.line = L.layerGroup();
      F.forEach((f) => {
        if (!f.segs.length) return;
        const c = st.color === 'gi' ? f.gColor : st.color === 'satu' ? '#1c7ed6' : f.color;
        const dim = sel && sel !== f; const ctx = !giCur;
        L.polyline(f.segs, { renderer: R, color: c, weight: dim ? 1 : ctx ? 1.3 : 2.2, opacity: dim ? 0.12 : ctx ? 0.45 : 0.95, smoothFactor: 1.2 })
          .on('click', (e) => { L.DomEvent.stopPropagation(e); fitKey = [uidCur, f.gi, f.kode].join('|'); setP({ hx_gi: f.gi, hx_feeder: f.kode }); })
          .bindTooltip(f.nama, { sticky: true, direction: 'top', className: 'hxm-tip' }).addTo(G.line);
      });
      G.line.addTo(map);
    }
    if (sel && sel.segs.length) {
      G.sel = L.layerGroup([L.polyline(sel.segs, { renderer: R, color: '#ffffff', weight: 7, opacity: 0.9, interactive: false }), L.polyline(sel.segs, { renderer: R, color: '#e8590c', weight: 3.6, opacity: 1, interactive: false })]).addTo(map);
    }
    // koordinat keliru
    if (st.lay.jauh && F.length) {
      G.jauh = L.layerGroup();
      F.forEach((f) => f.par.forEach((q, i) => { if (q !== -2 || !f.pt[i]) return; L.circleMarker(f.pt[i], { renderer: R, radius: 4, color: '#c92a2a', weight: 1.5, fillColor: '#fff', fillOpacity: 1 }).on('click', (e) => { L.DomEvent.stopPropagation(e); L.popup().setLatLng(f.pt[i]).setContent(garduPop(f, i)).openOn(map); }).addTo(G.jauh); }));
      G.jauh.addTo(map);
    }
    // GI
    if (st.lay.gi) {
      G.gi = L.layerGroup();
      const gl = uidCur ? giAll.filter((g) => g.uid === uidCur) : giAll;
      gl.forEach((g) => { if (!g.ll) return; const on = g.aset === p.hx_gi;
        const faint = (sel || giCur) && !on;
        // GI = pangkal jaringan: titik berkedip (elemen DOM agar bisa dianimasikan)
        const icon = L.divIcon({ className: 'hxm-gi' + (on ? ' on' : '') + (faint ? ' faint' : ''), html: '<i></i>', iconSize: [16, 16], iconAnchor: [8, 8] });
        const m = L.marker(g.ll, { icon, keyboard: false, riseOnHover: true, zIndexOffset: on ? 1000 : 0, title: '' })
          .on('click', (e) => { L.DomEvent.stopPropagation(e); if (g.aset !== giCur && g.nF) { fitKey = ''; setP({ hx_wilayah: WIL[g.uid] || P().hx_wilayah, hx_gi: g.aset, hx_feeder: null }); } else L.popup({ maxWidth: 300 }).setLatLng(g.ll).setContent(giPop(g)).openOn(map); });
        if (uidCur) m.bindTooltip(g.nama.replace(/^GI\s+/, ''), { permanent: map.getZoom() >= 9, direction: 'right', offset: [8, 0], className: 'hxm-gilab' + (faint ? ' hxm-faint' : '') });
        m.addTo(G.gi); });
      G.gi.addTo(map);
    }
    drawGardu(); drawSide(); legend();
    $('hxm-clear').hidden = !sel; $('hxm-sel').textContent = sel ? `Terpilih: ${sel.nama} (GI ${sel.giNama.replace(/^GI\s+/, '')})` : '';
  }
  // titik gardu hanya pada zoom dekat dan hanya yang terlihat
  function drawGardu() {
    if (!map) return;
    if (G.gardu) { map.removeLayer(G.gardu); G.gardu = null; }
    if (!st.lay.gardu || map.getZoom() < 12 || !giCur) return;
    const v = map.getBounds().pad(0.2); const sel = fByKode.get(P().hx_feeder) || null;
    G.gardu = L.layerGroup(); let n = 0;
    // penyulang terpilih digambar paling akhir agar berada di atas titik penyulang lain yang disamarkan
    const order = sel ? shown().filter((f) => f !== sel).concat(shown().includes(sel) ? [sel] : []) : shown();
    order.forEach((f) => { if (!inView(f)) return; f.pt.forEach((pt, i) => { if (!pt || f.par[i] === -2 || !v.contains(pt) || (n > 6000 && f !== sel)) return; n++;
      const c = st.color === 'gi' ? f.gColor : st.color === 'satu' ? '#1c7ed6' : f.color;
      const dim = sel && sel !== f; const big = map.getZoom() >= 15;
      L.circleMarker(pt, { renderer: R, radius: dim ? (big ? 3 : 2.2) : sel === f ? (big ? 6 : 4.5) : (big ? 5 : 3.5), color: '#fff', weight: dim ? 0 : 1, opacity: dim ? 0 : 1, fillColor: sel === f ? '#e8590c' : c, fillOpacity: dim ? 0.15 : 1 })
        .on('click', (e) => { L.DomEvent.stopPropagation(e); L.popup({ maxWidth: 300 }).setLatLng(pt).setContent(garduPop(f, i)).openOn(map); }).addTo(G.gardu); }); });
    G.gardu.addTo(map);
  }
  function legend() {
    const box = $('hxm-legend'); box.replaceChildren();
    const sw = (c, t, cls) => { const s = mk('span', null, 'hxm-lg'); const i = mk('i', null, cls || ''); i.style.background = c; s.append(i, t); return s; };
    box.append(sw('#13254a', 'Gardu Induk (pangkal jaringan, berkedip)', 'dot hxm-lg-gi'));
    if (uidCur) {
      box.append(sw(st.color === 'satu' ? '#1c7ed6' : 'linear-gradient(90deg,' + PAL.slice(0, 5).join(',') + ')', st.color === 'gi' ? 'Garis penyulang (warna per GI)' : st.color === 'satu' ? 'Garis penyulang' : 'Garis penyulang (warna per penyulang)', 'ln'));
      box.append(sw('#e8590c', 'Penyulang / GI terpilih', 'ln'));
      if (st.lay.jauh) box.append(sw('#fff', 'Koordinat gardu keliru', 'dot hxm-x'));
    }
  }
  // ---------- panel kanan: daftar GI → daftar penyulang GI → profil penyulang ----------
  let PX = null; // indeks profil penyulang (peny_profil) dan gangguan per bulan (peny_bulanan)
  function profIdx() {
    if (PX) return PX;
    const PP = (window.__D && window.__D.peny_profil) || [], PB = (window.__D && window.__D.peny_bulanan) || [];
    const p3 = new Map(), pu = new Map();
    PP.forEach((q) => { const a = NU(q.up3) + '|' + N(q.penyulang), b = q.uid + '|' + N(q.penyulang); if (!p3.has(a)) p3.set(a, q); if (!pu.has(b)) pu.set(b, q); });
    const months = [...new Set(PB.map((r) => Number(r.bulan)))].sort((a, b) => a - b);
    const ev = new Map(); PB.forEach((r) => { const k = r.up3 + '\u0001' + r.penyulang; const o = ev.get(k) || {}; const m = Number(r.bulan); const c = o[m] || (o[m] = { Permanen: 0, Sesaat: 0, t: 0 }); c[r.ps] = (c[r.ps] || 0) + Number(r.kali); c.t += Number(r.kali); ev.set(k, o); });
    PX = { p3, pu, months, ev }; return PX;
  }
  const profOf = (f) => { const X = profIdx(); const g = giAll.find((x) => x.aset === f.gi) || {}; return X.p3.get(NU(g.up3) + '|' + N(f.nama)) || X.pu.get((g.uid || uidCur) + '|' + N(f.nama)) || null; };
  const evOf = (q) => { const X = profIdx(); const o = (q && X.ev.get(q.up3 + '\u0001' + q.penyulang)) || {}; return X.months.map((m) => ({ m, ...(o[m] || { Permanen: 0, Sesaat: 0, t: 0 }) })); };
  const goHirarki = (f) => { setP({ hx_gi: f.gi, hx_feeder: f.kode }); setTimeout(() => { const c = $('hx-fd-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250); };

  function drawSide() {
    const sel = fByKode.get(P().hx_feeder) || null;
    const tb = $('hxm-tbl'), prof = $('hxm-prof'), list = $('hxm-list');
    $('hxm-back').hidden = !giCur;
    prof.hidden = !sel; list.hidden = !!sel;
    if (sel && giCur) { drawProfile(sel); return; }
    const head = mk('thead'); const hr = mk('tr'); const body = mk('tbody');
    if (!giCur) {
      // daftar GI di unit
      const gl = uidCur ? giAll.filter((g) => g.uid === uidCur && g.nF).sort((a, b) => giShort(a.nama).localeCompare(giShort(b.nama), 'id', { numeric: true })) : [];
      $('hxm-side-h').textContent = uidCur ? 'Gardu induk' : 'Mulai dari unit';
      $('hxm-tcount').textContent = uidCur ? `${fmt(gl.length)} GI · ${ULAB[uidCur]}` : '';
      [['Gardu induk', 'ss-l'], ['Penyulang'], ['Gardu']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
      gl.forEach((g) => { const tr = mk('tr'); tr.tabIndex = 0; const n = mk('td', giShort(g.nama), 'ss-l'); n.title = g.nama + (g.ll ? '' : ' (belum berkoordinat)'); tr.append(n, mk('td', fmt(g.nF)), mk('td', fmt(g.nG)));
        const go = () => { fitKey = ''; setP({ hx_gi: g.aset, hx_feeder: null }); }; tr.addEventListener('click', go); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); body.append(tr); });
      if (!gl.length) { const tr = mk('tr'); const td = mk('td', 'Pilih unit (UID) di atas peta, lalu gardu induk.', 'ss-note'); td.colSpan = 3; tr.append(td); body.append(tr); }
    } else {
      // semua penyulang dari GI terpilih
      const g = giAll.find((x) => x.aset === giCur) || {};
      const F = shown().slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }));
      $('hxm-side-h').textContent = giShort(g.nama || 'GI');
      $('hxm-tcount').textContent = `${fmt(F.length)} penyulang`;
      [['Penyulang', 'ss-l'], ['Gardu'], ['Trafo'], ['Km']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
      F.forEach((f) => { const tr = mk('tr'); tr.tabIndex = 0;
        const n = mk('td', null, 'ss-l'); const sw = mk('i', null, 'hxm-sw'); sw.style.background = st.color === 'gi' ? f.gColor : f.color; n.append(sw, f.nama); n.title = f.nama;
        tr.append(n, mk('td', fmt(f.nG)), mk('td', fmt(f.nT)), mk('td', f1.format(f.km)));
        const go = () => { fitKey = ''; setP({ hx_feeder: f.kode }); }; tr.addEventListener('click', go); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        tr.addEventListener('mouseenter', () => hover(f)); tr.addEventListener('mouseleave', () => hover(null)); body.append(tr); });
    }
    head.append(hr); tb.replaceChildren(head, body);
  }
  // sorot penyulang saat kursor di baris daftar
  let hoverL = null;
  function hover(f) { if (hoverL) { map.removeLayer(hoverL); hoverL = null; } if (f && f.segs.length && map) hoverL = L.polyline(f.segs, { renderer: R, color: '#e8590c', weight: 4, opacity: 0.85, interactive: false }).addTo(map); }

  function drawProfile(f) {
    const box = $('hxm-prof'); box.replaceChildren();
    const q = profOf(f); const g = giAll.find((x) => x.aset === f.gi) || {};
    $('hxm-side-h').textContent = 'Profil penyulang'; $('hxm-tcount').textContent = '';
    const top = mk('div', null, 'hxm-prof-top');
    const nm = mk('b', f.nama); const sw = mk('i', null, 'hxm-sw'); sw.style.background = '#e8590c'; nm.prepend(sw);
    top.append(nm, mk('span', `${f.kode} · GI ${giShort(f.giNama)}`, 'hxm-pop-k'));
    if (!q) top.append(mk('span', 'belum ada di database penyulang', 'ss-p-flag')); else if (q.di_database !== 'Ya') top.append(mk('span', 'hanya ada di data gangguan', 'ss-p-flag'));
    box.append(top);
    const dl = mk('dl'); const row = (k, v) => { if (v == null || v === '') v = '—'; dl.append(mk('dt', k), mk('dd', String(v))); };
    const fx = ((window.__D && window.__D.hx_feeder) || []).find((x) => x.kode === f.kode) || {};
    row('UP3 · UID', `${(q && q.up3) || g.up3 || '—'} · ${ULAB[(q && q.uid) || uidCur] || uidCur}`);
    row('ULP', String((q && q.ulp) || f.ulp || '').replace(/^ULP\s+/i, ''));
    row('Kode jaringan', fx.jaringan);
    if (q && q.di_database === 'Ya') { row('Jenis · tipe', `${q.jenis || '—'} · ${q.tipe || '—'}`); row('Kepemilikan', q.kepemilikan); row('Status', q.status); row('Tahun buat', q.tahun_buat); }
    else if (fx.status) row('Status', fx.status.charAt(0) + fx.status.slice(1).toLowerCase());
    box.append(dl, mk('h5', 'Aset jaringan'));
    const dl2 = mk('dl'); const row2 = (k, v) => dl2.append(mk('dt', k), mk('dd', v));
    row2('Gardu · trafo', `${fmt(f.nG)} · ${fmt(f.nT)}`); row2('kVA gardu', fmt(f.kv)); row2('Panjang garis (perkiraan)', f1.format(f.km) + ' km');
    row2('Zona · section · segment · lateral', [fx.zona, fx.section, fx.segment, fx.lateral].map((x) => fmt(x || 0)).join(' · '));
    if (f.jauh + f.tanpa) row2('Koordinat keliru / kosong', `${fmt(f.jauh)} / ${fmt(f.tanpa)}`);
    box.append(dl2, mk('h5', 'Gangguan 2026'));
    const s = evOf(q); const t = s.reduce((a, x) => a + x.t, 0), perm = s.reduce((a, x) => a + x.Permanen, 0), ses = s.reduce((a, x) => a + x.Sesaat, 0);
    const pk = s.reduce((a, x) => (x.t > (a ? a.t : -1) ? x : a), null);
    const giF = shown().map((x) => ({ x, t: evOf(profOf(x)).reduce((a, y) => a + y.t, 0) })).sort((a, b) => b.t - a.t);
    const rank = giF.findIndex((o) => o.x === f) + 1;
    const dl3 = mk('dl'); const row3 = (k, v) => dl3.append(mk('dt', k), mk('dd', v));
    row3('Total kali gangguan', `${fmt(t)} kali (${fmt(perm)} permanen · ${fmt(ses)} sesaat)`);
    row3('Rata-rata per bulan', s.length ? `${f1.format(t / s.length)} kali` : '—');
    row3('Bulan tertinggi', t && pk ? `${BLNF[pk.m - 1]} · ${fmt(pk.t)} kali` : '—');
    row3('Peringkat di GI', t ? `${rank} dari ${fmt(giF.length)} penyulang` : '—');
    box.append(dl3);
    // grafik kecil kali gangguan per bulan (permanen + sesaat)
    if (s.length && window.d3) {
      const ch = mk('div', null, 'hxm-pchart'); box.append(ch);
      const W = 300, H = 120, mg = { t: 12, r: 4, b: 18, l: 4 };
      const svg = d3.select(ch).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('role', 'img').attr('aria-label', 'Kali gangguan per bulan ' + f.nama);
      const x = d3.scaleBand(s.map((d) => d.m), [mg.l, W - mg.r]).padding(0.25); const y = d3.scaleLinear([0, Math.max(1, d3.max(s, (d) => d.t))], [H - mg.b, mg.t]);
      s.forEach((d) => { const x0 = x(d.m), bw = x.bandwidth();
        svg.append('rect').attr('x', x0).attr('width', bw).attr('y', y(d.Permanen)).attr('height', y(0) - y(d.Permanen)).attr('fill', 'var(--cds-chart-series-1, #2f6fb3)');
        svg.append('rect').attr('x', x0).attr('width', bw).attr('y', y(d.t)).attr('height', y(d.Permanen) - y(d.t)).attr('fill', 'var(--cds-chart-series-2, #e8590c)').attr('rx', 2);
        if (d.t) svg.append('text').attr('x', x0 + bw / 2).attr('y', y(d.t) - 3).attr('text-anchor', 'middle').style('font-size', '9.5px').attr('fill', 'currentColor').text(fmt(d.t));
        svg.append('text').attr('x', x0 + bw / 2).attr('y', H - 5).attr('text-anchor', 'middle').style('font-size', '9.5px').attr('fill', 'var(--color-fg-muted)').text(BLN[d.m - 1].charAt(0)); });
      const lg = mk('div', null, 'hxm-plg'); [['var(--cds-chart-series-1, #2f6fb3)', 'Permanen'], ['var(--cds-chart-series-2, #e8590c)', 'Sesaat']].forEach(([c, l]) => { const sp = mk('span'); const i = mk('i'); i.style.background = c; sp.append(i, l); lg.append(sp); }); box.append(lg);
    }
    const act = mk('div', null, 'hxm-prof-act');
    const b1 = mk('button', 'Telusuri hirarki penyulang ini', 'hxm-pop-b'); b1.type = 'button'; b1.addEventListener('click', () => goHirarki(f));
    const b2 = mk('button', 'Profil lengkap di Database Penyulang', 'hxm-pop-b hxm-ghost'); b2.type = 'button';
    b2.addEventListener('click', () => { const g2 = giAll.find((x) => x.aset === f.gi) || {}; setP({ tab: 'penyulang', d_uid: g2.uid || null, d_up3: g2.up3 || null, d_gi: f.gi, d_peny: f.kode }); });
    act.append(b1, b2); box.append(act);
  }
  function fitView(force) {
    if (!map) return;
    const p = P(); const sel = fByKode.get(p.hx_feeder);
    const key = [uidCur, giCur, sel ? sel.kode : ''].join('|');
    if (!force && key === fitKey) return; fitKey = key;
    let b = null;
    const add = (q) => { if (!q) return; if (!b) b = [q[0], q[1], q[2], q[3]]; else { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); } };
    if (sel) { add(sel.bb); if (sel.giLL) add([sel.giLL[0], sel.giLL[1], sel.giLL[0], sel.giLL[1]]); }
    else if (giCur) { shown().forEach((f) => add(f.bb)); const g = giAll.find((x) => x.aset === giCur); if (g && g.ll) add([g.ll[0], g.ll[1], g.ll[0], g.ll[1]]); }
    else if (uidCur) { allF.forEach((f) => add(f.bb)); giAll.forEach((g) => g.uid === uidCur && g.ll && add([g.ll[0], g.ll[1], g.ll[0], g.ll[1]])); }
    else giAll.forEach((g) => g.ll && add([g.ll[0], g.ll[1], g.ll[0], g.ll[1]]));
    if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: [30, 30], maxZoom: sel ? 15 : 13 });
  }

  // tinggi peta dan panel kanan = sisa layar di bawah kepala kartu, agar peta utuh dalam tampilan awal
  function fitHeight() {
    const b = $('hxm-body'); if (!b || window.innerWidth <= 760) { $('hxm').style.removeProperty('--hxm-h'); return; }
    const top = b.getBoundingClientRect().top + window.scrollY;
    $('hxm').style.setProperty('--hxm-h', Math.max(420, Math.round(window.innerHeight - top - 16)) + 'px');
  }
  // ---------- render ----------
  let decodedFor = null;
  function render() {
    if (P().tab !== 'hirarki') return;
    const ok = ['gi_identitas', 'hx_gi', 'hx_feeder'].map((id) => need(id)).every(Boolean);
    const lf = needLeaflet();
    if (leafletState === 3) { $('hxm-msg').textContent = 'Pustaka peta (Leaflet) tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.'; return; }
    if (!ok || !lf) { $('hxm-msg').textContent = 'Memuat peta jaringan…'; return; }
    fitHeight(); initMap();
    const p = P(); const uid = UID[p.hx_wilayah] || null;
    const hxgi = window.__D.hx_gi || [], hxf = window.__D.hx_feeder || [];
    const giUP = new Map(hxgi.map((g) => [g.kode, g]));
    if (!giAll.length) {
      const nF = new Map(); hxf.forEach((f) => nF.set(f.gi, (nF.get(f.gi) || 0) + 1));
      giAll = (window.__D.gi_identitas || []).map((g) => { const h = giUP.get(g.aset); return { ...g, uid: (h && UID[h.wilayah]) || g.uid, up3UP: h ? h.up3 : '', nF: nF.get(g.aset) || 0, nG: h ? Number(h.gardu) || 0 : 0, ll: g.lat !== '' && g.lat != null ? [Number(g.lat), Number(g.lon)] : null }; });
    }
    // pilihan Unit dan GI
    const su = $('hxm-f-uid');
    if (!su.options.length) su.replaceChildren(new Option('— Pilih unit —', ''), ...UORD.map((u) => new Option('UID ' + ULAB[u], u)));
    su.value = uid || '';
    const giOfU = uid ? giAll.filter((g) => g.uid === uid && g.nF).sort((a, b) => giShort(a.nama).localeCompare(giShort(b.nama), 'id', { numeric: true })) : [];
    const sg = $('hxm-f-gi');
    const gi = uid && giOfU.some((g) => g.aset === p.hx_gi) ? p.hx_gi : null;
    if (uid) {
      const id = 'hx_geo_' + uid;
      if (!need(id)) { $('hxm-msg').textContent = `Memuat jaringan ${ULAB[uid]}…`; uidCur = uid; giCur = null; allF = []; fByKode = new Map(); draw(); return; }
      if (decodedFor !== id) {
        decodedFor = id;
        const raw = window.__D[id] || { f: [] };
        const giMap = new Map((window.__D.gi_identitas || []).map((g) => [g.aset, { nama: g.nama, up3: g.up3 }]));
        allF = decode(raw, new Map(hxf.map((f) => [f.kode, f])), giMap);
        fByKode = new Map(allF.map((f) => [f.kode, f]));
        $('hxm-qlist').replaceChildren(...allF.map((f) => new Option(`${f.nama} · ${f.giNama}`)), ...giOfU.map((g) => new Option(g.nama)));
      }
    } else { allF = []; fByKode = new Map(); decodedFor = null; $('hxm-qlist').replaceChildren(...giAll.filter((g) => g.nF).map((g) => new Option(g.nama))); }
    const nMap = new Map(); if (uid && decodedFor === 'hx_geo_' + uid) allF.forEach((f) => nMap.set(f.gi, (nMap.get(f.gi) || 0) + 1));
    sg.replaceChildren(new Option(uid ? `— Pilih gardu induk (${fmt(giOfU.length)}) —` : '— Pilih unit dulu —', ''), ...giOfU.map((g) => new Option(`${giShort(g.nama)} · ${fmt(nMap.has(g.aset) ? nMap.get(g.aset) : g.nF)} penyulang`, g.aset)));
    sg.value = gi || ''; sg.disabled = !uid;
    uidCur = uid; giCur = gi; feeders = shown();
    const giRow = gi ? giAll.find((g) => g.aset === gi) : null;
    const tot = feeders.reduce((a, f) => ({ g: a.g + f.nG, t: a.t + f.nT, km: a.km + f.km, j: a.j + f.jauh + f.tanpa }), { g: 0, t: 0, km: 0, j: 0 });
    $('hxm-msg').textContent = gi
      ? `${giRow.nama} · ${ULAB[uid]}: ${fmt(feeders.length)} penyulang, ${fmt(tot.g)} gardu, ${fmt(tot.t)} trafo, ±${fmt(tot.km)} km garis.${giRow.ll ? '' : ' GI belum berkoordinat: garis dimulai dari gardu.'}${tot.j ? ` ${fmt(tot.j)} gardu koordinatnya keliru atau kosong.` : ''}`
      : uid ? `${ULAB[uid]}: ${fmt(giOfU.length)} gardu induk, ${fmt(allF.length)} penyulang. Pilih gardu induk (atau klik titik GI di peta) untuk menampilkan penyulangnya.`
        : `Sumkal: ${fmt(giAll.filter((g) => g.ll).length)} dari ${fmt(giAll.length)} GI berkoordinat. Pilih unit dan gardu induk untuk menampilkan penyulang.`;
    const key = [uid, gi, p.hx_feeder, st.color, allF.length].join('|');
    if (key !== selKey) { selKey = key; draw(); }
    map.invalidateSize();
    fitView(false);
  }
  SSD.onData(render);
  window.addEventListener('resize', () => { fitHeight(); if (map) map.invalidateSize(); });
})();
