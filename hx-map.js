// Tab Hirarki Aset: peta jaringan bergaya ArcGIS (Leaflet).
// Data: gi_identitas (titik GI), hx_gi (UID/UP3 per GI), hx_feeder, hx_geo_<UID> (garis penyulang dari hx-geo.js), dimuat saat tab dibuka.
// Pilihan Unit/UP3/GI/feeder memakai parameter yang sama dengan bagian Evaluasi Feeder (hx_wilayah, hx_up3, hx_gi, hx_feeder).
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
  let feeders = [], fByKode = new Map(), giAll = [], uidCur = null, fitKey = '', selKey = '';
  const P = () => dash.params();
  const setP = (o) => dash.setParams(o);

  // ---------- kontrol ----------
  $('hxm-uid').addEventListener('click', (e) => { const b = e.target.closest('button[data-u]'); if (!b) return; const u = b.dataset.u; setP({ hx_wilayah: u ? WIL[u] : null, hx_up3: null, hx_gi: null, hx_feeder: null }); });
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
  $('hxm-clear').addEventListener('click', () => setP({ hx_feeder: null }));

  function search(v) {
    const s = String(v || '').trim().toUpperCase(); if (!s) return;
    const fd = feeders.find((f) => `${f.nama} · ${f.giNama}`.toUpperCase() === s) || feeders.find((f) => f.kode.toUpperCase() === s) || feeders.find((f) => f.nama.toUpperCase() === s);
    if (fd) { setP({ hx_gi: fd.gi, hx_feeder: fd.kode }); fitKey = ''; $('hxm-q').value = ''; return; }
    const gi = giAll.find((g) => g.nama.toUpperCase() === s || ('GI ' + g.nama).toUpperCase() === s);
    if (gi && map && gi.ll) { map.setView(gi.ll, 13); setP({ hx_gi: gi.aset, hx_feeder: null }); $('hxm-q').value = ''; return; }
    for (const f of feeders) { const i = f.codes.findIndex((c) => String(c).toUpperCase() === s); if (i >= 0) { const p = f.pt[i]; setP({ hx_gi: f.gi, hx_feeder: f.kode }); if (p && map) { fitKey = 'gardu'; map.setView(p, 17); L.popup().setLatLng(p).setContent(garduPop(f, i)).openOn(map); } $('hxm-q').value = ''; return; } }
    $('hxm-msg').textContent = `"${v}" tidak ditemukan di ${uidCur ? ULAB[uidCur] : 'Sumkal'}. Cari nama penyulang, nama GI, atau kode gardu lengkap.`;
  }

  // ---------- data ----------
  function decode(raw, hxF, giMap) {
    const out = [];
    (raw.f || []).forEach((r) => {
      const [kode, nama, gi, glon, glat, km, flat, codes, names, kva, tr] = r;
      const n = codes.length; const pt = new Array(n); const par = new Int32Array(n);
      for (let i = 0; i < n; i++) { const lo = flat[i * 3], la = flat[i * 3 + 1]; par[i] = flat[i * 3 + 2]; pt[i] = par[i] === -3 ? null : [la / 1e5, lo / 1e5]; }
      const giLL = glat != null ? [glat, glon] : null;
      const segs = []; let b = null;
      const ext = (p) => { if (!p) return; if (!b) b = [p[0], p[1], p[0], p[1]]; else { if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; } };
      for (let i = 0; i < n; i++) { if (par[i] >= 0) { segs.push([pt[par[i]], pt[i]]); ext(pt[i]); } else if (par[i] === -1) { if (giLL) segs.push([giLL, pt[i]]); ext(pt[i]); } }
      const fx = hxF.get(kode) || {}; const g = giMap.get(gi) || {};
      out.push({ kode, nama, gi, giNama: g.nama || gi, up3: g.up3 || '', ulp: fx.ulp || '', km, pt, par, codes, names, kva, tr, segs, bb: b, giLL,
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
    map = L.map($('hxm-map'), { preferCanvas: true, renderer: R, zoomControl: false, attributionControl: true, minZoom: 4, maxZoom: 19, worldCopyJump: false }).setView([-1.2, 107.5], 5);
    L.control.zoom({ position: 'topright', zoomInTitle: 'Perbesar', zoomOutTitle: 'Perkecil' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    setBase();
    if (window.innerWidth < 1600) { $('hxm-panel').classList.remove('open'); $('hxm-panel-t').setAttribute('aria-expanded', 'false'); }
    map.on('mousemove', (e) => { $('hxm-coord').textContent = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`; });
    let z9 = map.getZoom() >= 9;
    map.on('moveend zoomend', () => { const z = map.getZoom() >= 9; if (z !== z9) { z9 = z; draw(); } else { drawGardu(); drawTable(); } $('hxm-zoomnote').hidden = map.getZoom() >= 12 || !st.lay.gardu || !uidCur; });
  }
  const inView = (f) => { if (!f.bb || !map) return false; const v = map.getBounds(); return !(f.bb[2] < v.getSouth() || f.bb[0] > v.getNorth() || f.bb[3] < v.getWest() || f.bb[1] > v.getEast()); };
  const shown = () => { const p = P(); return feeders.filter((f) => !p.hx_up3 || f.up3UP === p.hx_up3); };

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
    [['Penyulang', f.nama], ['Gardu Induk', f.giNama], ['kVA', f.kva[i] ? fmt(f.kva[i]) : '—'], ['Trafo', fmt(f.tr[i])], ['Koordinat', f.pt[i] ? `${f.pt[i][0].toFixed(5)}, ${f.pt[i][1].toFixed(5)}` : '—'], ['Status garis', f.par[i] === -2 ? 'tidak disambung (jauh dari penyulangnya)' : 'tersambung']].forEach(([k, v]) => dl.append(mk('dt', k), mk('dd', v)));
    d.append(dl);
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
        const dim = sel && sel !== f;
        L.polyline(f.segs, { renderer: R, color: c, weight: dim ? 1.2 : 2, opacity: dim ? 0.3 : 0.9, smoothFactor: 1.2 })
          .on('click', (e) => { L.DomEvent.stopPropagation(e); setP({ hx_gi: f.gi, hx_feeder: f.kode }); L.popup({ maxWidth: 300 }).setLatLng(e.latlng).setContent(feederPop(f)).openOn(map); })
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
      const gl = uidCur ? giAll.filter((g) => g.uid === uidCur && (!p.hx_up3 || g.up3UP === p.hx_up3)) : giAll;
      gl.forEach((g) => { if (!g.ll) return; const on = g.aset === p.hx_gi;
        const m = L.circleMarker(g.ll, { renderer: R, radius: on ? 8 : 6, color: '#fff', weight: 2, fillColor: on ? '#e8590c' : '#13254a', fillOpacity: 1 })
          .on('click', (e) => { L.DomEvent.stopPropagation(e); L.popup({ maxWidth: 300 }).setLatLng(g.ll).setContent(giPop(g)).openOn(map); });
        if (uidCur) m.bindTooltip(g.nama.replace(/^GI\s+/, ''), { permanent: map.getZoom() >= 9, direction: 'right', offset: [6, 0], className: 'hxm-gilab' });
        m.addTo(G.gi); });
      G.gi.addTo(map);
    }
    drawGardu(); drawTable(); legend();
    $('hxm-clear').hidden = !sel; $('hxm-sel').textContent = sel ? `Terpilih: ${sel.nama} (GI ${sel.giNama.replace(/^GI\s+/, '')})` : '';
  }
  // titik gardu hanya pada zoom dekat dan hanya yang terlihat
  function drawGardu() {
    if (!map) return;
    if (G.gardu) { map.removeLayer(G.gardu); G.gardu = null; }
    if (!st.lay.gardu || map.getZoom() < 12 || !feeders.length) return;
    const v = map.getBounds().pad(0.2); const sel = fByKode.get(P().hx_feeder) || null;
    G.gardu = L.layerGroup(); let n = 0;
    shown().forEach((f) => { if (!inView(f)) return; f.pt.forEach((pt, i) => { if (!pt || f.par[i] === -2 || !v.contains(pt) || n > 6000) return; n++;
      const c = st.color === 'gi' ? f.gColor : st.color === 'satu' ? '#1c7ed6' : f.color;
      L.circleMarker(pt, { renderer: R, radius: map.getZoom() >= 15 ? 5 : 3.5, color: '#fff', weight: 1, fillColor: sel === f ? '#e8590c' : c, fillOpacity: 1 })
        .on('click', (e) => { L.DomEvent.stopPropagation(e); L.popup({ maxWidth: 300 }).setLatLng(pt).setContent(garduPop(f, i)).openOn(map); }).addTo(G.gardu); }); });
    G.gardu.addTo(map);
  }
  function legend() {
    const box = $('hxm-legend'); box.replaceChildren();
    const sw = (c, t, cls) => { const s = mk('span', null, 'hxm-lg'); const i = mk('i', null, cls || ''); i.style.background = c; s.append(i, t); return s; };
    box.append(sw('#13254a', 'Gardu Induk', 'dot'));
    if (uidCur) {
      box.append(sw(st.color === 'satu' ? '#1c7ed6' : 'linear-gradient(90deg,' + PAL.slice(0, 5).join(',') + ')', st.color === 'gi' ? 'Garis penyulang (warna per GI)' : st.color === 'satu' ? 'Garis penyulang' : 'Garis penyulang (warna per penyulang)', 'ln'));
      box.append(sw('#e8590c', 'Penyulang / GI terpilih', 'ln'));
      if (st.lay.jauh) box.append(sw('#fff', 'Koordinat gardu keliru', 'dot hxm-x'));
    }
  }
  function drawTable() {
    const tb = $('hxm-tbl'); if (!tb) return;
    const list = map && uidCur ? shown().filter(inView).sort((a, b) => a.nama.localeCompare(b.nama)) : [];
    const sel = P().hx_feeder;
    const head = mk('thead'); const hr = mk('tr');
    [['Penyulang', 'ss-l'], ['GI', 'ss-l'], ['ULP', 'ss-l ss-hide-n hxm-wide'], ['Gardu'], ['Trafo'], ['kVA gardu', 'ss-hide-n hxm-wide'], ['Km'], ['Keliru', 'ss-hide-n']].forEach(([h, c]) => hr.append(mk('th', h, c || '')));
    head.append(hr); const body = mk('tbody');
    list.slice(0, 300).forEach((f) => {
      const tr = mk('tr'); tr.tabIndex = 0; if (f.kode === sel) tr.className = 'on';
      const n = mk('td', null, 'ss-l'); const sw = mk('i', null, 'hxm-sw'); sw.style.background = st.color === 'gi' ? f.gColor : f.color; n.append(sw, f.nama);
      n.title = f.nama; const gtd = mk('td', f.giNama.replace(/^GI\s+/, ''), 'ss-l'); gtd.title = f.giNama;
      tr.append(n, gtd, mk('td', f.ulp.replace(/^ULP\s+/, ''), 'ss-l ss-hide-n hxm-wide'), mk('td', fmt(f.nG)), mk('td', fmt(f.nT)), mk('td', fmt(f.kv), 'ss-hide-n hxm-wide'), mk('td', f1.format(f.km)), mk('td', f.jauh + f.tanpa ? fmt(f.jauh + f.tanpa) : '—', 'ss-hide-n'));
      const go = () => { fitKey = ''; setP({ hx_gi: f.gi, hx_feeder: f.kode }); };
      tr.addEventListener('click', go); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      body.append(tr);
    });
    if (!list.length) { const tr = mk('tr'); const td = mk('td', uidCur ? 'Tidak ada penyulang di area peta ini. Geser atau perkecil peta.' : 'Pilih unit di atas peta untuk menampilkan penyulang.', 'ss-note'); td.colSpan = 8; tr.append(td); body.append(tr); }
    tb.replaceChildren(head, body);
    const on = body.querySelector('tr.on'); if (on) { const w = tb.closest('.hxm-tw'); const r = on.getBoundingClientRect(), rw = w.getBoundingClientRect(); if (r.top < rw.top + 30 || r.bottom > rw.bottom) w.scrollTop += r.top - rw.top - 60; }
    $('hxm-tcount').textContent = uidCur ? `${fmt(list.length)} penyulang di area peta${list.length > 300 ? ' (300 pertama)' : ''}` : '';
  }
  function fitView(force) {
    if (!map) return;
    const p = P(); const sel = fByKode.get(p.hx_feeder);
    const key = [uidCur, p.hx_up3, p.hx_feeder].join('|');
    if (!force && key === fitKey) return; fitKey = key;
    let b = null;
    const add = (q) => { if (!q) return; if (!b) b = [q[0], q[1], q[2], q[3]]; else { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); } };
    if (sel) { add(sel.bb); if (sel.giLL) add([sel.giLL[0], sel.giLL[1], sel.giLL[0], sel.giLL[1]]); }
    else if (uidCur) shown().forEach((f) => add(f.bb));
    else giAll.forEach((g) => g.ll && add([g.ll[0], g.ll[1], g.ll[0], g.ll[1]]));
    if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: [30, 30], maxZoom: sel ? 15 : 12 });
  }

  // ---------- render ----------
  let decodedFor = null;
  function render() {
    if (P().tab !== 'hirarki') return;
    const ok = ['gi_identitas', 'hx_gi', 'hx_feeder'].map((id) => need(id)).every(Boolean);
    const lf = needLeaflet();
    if (leafletState === 3) { $('hxm-msg').textContent = 'Pustaka peta (Leaflet) tidak dapat dimuat. Periksa koneksi internet lalu muat ulang halaman.'; return; }
    if (!ok || !lf) { $('hxm-msg').textContent = 'Memuat peta jaringan…'; return; }
    initMap();
    const p = P(); const uid = UID[p.hx_wilayah] || null;
    $('hxm-uid').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.u || null) === uid)));
    const hxgi = window.__D.hx_gi || [], hxf = window.__D.hx_feeder || [];
    const giUP = new Map(hxgi.map((g) => [g.kode, g]));
    if (!giAll.length) {
      const nF = new Map(); hxf.forEach((f) => nF.set(f.gi, (nF.get(f.gi) || 0) + 1));
      giAll = (window.__D.gi_identitas || []).map((g) => { const h = giUP.get(g.aset); return { ...g, uid: (h && UID[h.wilayah]) || g.uid, up3UP: h ? h.up3 : '', nF: nF.get(g.aset) || 0, ll: g.lat !== '' && g.lat != null ? [Number(g.lat), Number(g.lon)] : null }; });
    }
    if (uid) {
      const id = 'hx_geo_' + uid;
      if (!need(id)) { $('hxm-msg').textContent = `Memuat jaringan ${ULAB[uid]}…`; uidCur = uid; feeders = []; fByKode = new Map(); draw(); return; }
      if (decodedFor !== id) {
        decodedFor = id;
        const raw = window.__D[id] || { f: [] };
        const giMap = new Map((window.__D.gi_identitas || []).map((g) => [g.aset, { nama: g.nama, up3: g.up3 }]));
        feeders = decode(raw, new Map(hxf.map((f) => [f.kode, f])), giMap);
        feeders.forEach((f) => { const h = giUP.get(f.gi); f.up3UP = h ? h.up3 : ''; });
        fByKode = new Map(feeders.map((f) => [f.kode, f]));
        $('hxm-qlist').replaceChildren(...feeders.map((f) => new Option(`${f.nama} · ${f.giNama}`)), ...giAll.filter((g) => g.uid === uid).map((g) => new Option(g.nama)));
      }
    } else { feeders = []; fByKode = new Map(); decodedFor = null; $('hxm-qlist').replaceChildren(...giAll.map((g) => new Option(g.nama))); }
    uidCur = uid;
    const F = shown();
    const tot = F.reduce((a, f) => ({ g: a.g + f.nG, km: a.km + f.km, j: a.j + f.jauh + f.tanpa, gi: a.gi + (f.giLL ? 1 : 0) }), { g: 0, km: 0, j: 0, gi: 0 });
    $('hxm-msg').textContent = uid
      ? `${ULAB[uid]}${p.hx_up3 ? ' · ' + p.hx_up3 : ''}: ${fmt(F.length)} penyulang, ${fmt(tot.g)} gardu, ±${fmt(tot.km)} km garis. ${fmt(F.length - tot.gi)} penyulang GI-nya belum berkoordinat (garis dimulai dari gardu). ${fmt(tot.j)} gardu koordinatnya keliru atau kosong.`
      : `Sumkal: ${fmt(giAll.filter((g) => g.ll).length)} dari ${fmt(giAll.length)} GI berkoordinat. Pilih unit untuk memuat garis penyulang dan titik gardu.`;
    const key = [uid, p.hx_up3, p.hx_feeder, p.hx_gi, st.color].join('|');
    if (key !== selKey) { selKey = key; draw(); }
    map.invalidateSize();
    fitView(false);
  }
  SSD.onData(render);
  window.addEventListener('resize', () => { if (map) map.invalidateSize(); });
})();
