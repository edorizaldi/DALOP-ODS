// Pengganti layanan dashboard Claude untuk versi web mandiri (GitHub Pages).
// - Data dibaca dari data/<id>.js (dimuat sebelum halaman, lihat index.html).
// - Pilihan filter disimpan per pembaca di browser.
// - Unggahan dari tab Update Data Bulanan / Laporan Harian disimpan ke repo GitHub
//   memakai token admin (fine-grained, izin Contents: Read and write untuk repo ini saja).
(() => {
  'use strict';
  const D = window.__D || (window.__D = {});
  const CFG = window.SS_CONFIG || {};
  // owner/repo: dari config, atau ditebak dari alamat <owner>.github.io/<repo>/
  const guess = (() => {
    const m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    const repo = location.pathname.split('/').filter(Boolean)[0];
    return m ? { owner: m[1], repo: repo || (m[1] + '.github.io') } : {};
  })();
  const GH = { owner: CFG.owner || guess.owner, repo: CFG.repo || guess.repo, branch: CFG.branch || 'main' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } },
  };

  // ---------------- dash ----------------
  const DEF = Object.assign({ bulan: null, komponen: 'total', metrik: 'saidi', unit: 'SUMKAL', tab: 'saidi' }, CFG.params || {});
  const PR = Object.assign({}, DEF, store.get('ss-params', {}));
  const hashTab = location.hash.slice(1); if (hashTab) PR.tab = hashTab;
  const cbs = [], calcs = {};
  const fire = () => cbs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
  window.dash = {
    data(id) {
      if (calcs[id]) {
        const c = calcs[id];
        if (!c.v) { const ins = c.inputs.map((i) => window.dash.data(i)); if (ins.some((x) => x.status !== 'ok')) return { status: 'loading', data: [], rows: [] }; c.v = c.fn(...ins.map((x) => x.data)); }
        return { status: 'ok', data: c.v, rows: c.v, meta: [] };
      }
      if (!(id in D)) return { status: 'error', data: [], rows: [], message: 'Data ' + id + ' tidak ditemukan' };
      const rows = D[id] || [];
      return { status: 'ok', data: rows, rows, columns: rows.length ? Object.keys(rows[0]) : [], meta: [], message: '', refreshing: false };
    },
    calc(id, o) { calcs[id] = { fn: o.fn, inputs: o.inputs || [] }; },
    params: () => PR,
    setParams(o) {
      Object.assign(PR, o); store.set('ss-params', PR);
      if (o && 'tab' in o) { try { history.replaceState(null, '', '#' + PR.tab); } catch (e) { /* abaikan */ } }
      fire();
    },
    resetParams() { Object.keys(PR).forEach((k) => delete PR[k]); Object.assign(PR, DEF); store.set('ss-params', PR); fire(); },
    setLink() {},
    onData(f) { cbs.push(f); setTimeout(() => { try { f(); } catch (e) { console.error(e); } }, 0); },
  };
  // data hasil hitung ulang dibuang saat data dasar berubah
  window.__SSInvalidate = () => { Object.values(calcs).forEach((c) => { c.v = null; }); };

  // ---------------- GitHub ----------------
  const tokenKey = 'ss-gh-token';
  const token = () => store.get(tokenKey, '');
  const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  async function ghPut(path, text, message) {
    if (!GH.owner || !GH.repo) throw Object.assign(new Error('repo GitHub belum diatur'), { code: 'no-repo' });
    const api = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}`;
    const hd = { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    let sha;
    const cur = await fetch(api + '?ref=' + encodeURIComponent(GH.branch) + '&t=' + Date.now(), { headers: hd, cache: 'no-store' });
    if (cur.ok) sha = (await cur.json()).sha; else if (cur.status !== 404) throw Object.assign(new Error('GitHub ' + cur.status), { code: 'gh-' + cur.status });
    const content = await b64(new Blob([text], { type: 'text/plain' }));
    const r = await fetch(api, { method: 'PUT', headers: hd, body: JSON.stringify({ message, content, sha, branch: GH.branch }) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) { /* abaikan */ } throw Object.assign(new Error('GitHub ' + r.status + (m ? ': ' + m : '')), { code: 'gh-' + r.status }); }
  }
  const asJs = (key, val) => `window.__D=window.__D||{};window.__D[${JSON.stringify(key)}]=${JSON.stringify(val)};\n`;
  const parseRows = (text, name) => {
    if (/\.json$/i.test(name || '')) { const v = JSON.parse(text); return Array.isArray(v) ? v : (v.rows || v.data || []); }
    return window.d3 ? window.d3.csvParse(text) : [];
  };

  // ---------------- window.claude (unduhan, penyimpanan) ----------------
  const blobs = new Map(); let seq = 0;
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = filename || 'unduhan'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { status: 'saved' };
    },
  };
  const assets = {
    async upload(blob) { const id = 'local' + (++seq) + Date.now().toString(36); blobs.set(id, blob); return { id, url: '/_blob/' + id }; },
  };
  const harianSubs = [];
  const db = {
    doc(path) {
      return {
        async update(v) {
          const m = path.match(/^datasets\/([\w-]+)$/);
          if (!m) throw new Error('jalur tidak didukung: ' + path);
          const id = m[1]; const src = v && v.source; const bid = src && String(src.url || '').replace('/_blob/', '');
          const blob = blobs.get(bid); if (!blob) throw new Error('file unggahan tidak ditemukan');
          const rows = parseRows(await blob.text(), src.name);
          await ghPut(`data/${id}.js`, asJs(id, rows), `Update data ${id} dari dashboard`);
          D[id] = rows; window.__SSInvalidate();
        },
        async set(v) {
          if (path !== 'harian/latest') throw new Error('jalur tidak didukung: ' + path);
          await ghPut('data/harian_latest.js', `window.__HARIAN=${JSON.stringify(v)};\n`, 'Update laporan harian dari dashboard');
          window.__HARIAN = v; harianSubs.forEach((f) => f({ exists: true, data: () => v }));
        },
        onSnapshot(cb) {
          if (path !== 'harian/latest') return () => {};
          harianSubs.push(cb);
          const v = window.__HARIAN; setTimeout(() => cb(v ? { exists: true, data: () => v } : { exists: false, data: () => null }), 0);
          return () => {};
        },
      };
    },
  };
  window.claude = {
    async use(cap) {
      if (cap === 'downloads') return downloads;
      if (cap === 'db') return token() ? db : dbReadOnly;
      if (cap === 'assets') return token() ? assets : null;
      return null;
    },
  };
  // tanpa token: unggahan laporan harian tetap terbaca, tetapi tidak bisa menyimpan
  const dbReadOnly = { doc(path) { const d = db.doc(path); return { onSnapshot: d.onSnapshot, async set() { throw Object.assign(new Error('belum login admin'), { code: 'no-token' }); }, async update() { throw Object.assign(new Error('belum login admin'), { code: 'no-token' }); } }; } };

  // ---------------- tombol admin ----------------
  function adminUI() {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'ss-admin';
    const paint = () => { b.textContent = token() ? 'Admin: tersambung ke GitHub (keluar)' : 'Login admin untuk update data'; b.dataset.on = token() ? '1' : '0'; };
    paint();
    b.addEventListener('click', () => {
      if (token()) { if (confirm('Keluar dari mode admin di browser ini?')) { store.del(tokenKey); paint(); location.reload(); } return; }
      const t = prompt(`Tempel token GitHub (fine-grained, izin "Contents: Read and write" untuk repo ${GH.owner || '?'}/${GH.repo || '?'}). Token hanya disimpan di browser ini.`);
      if (t && t.trim()) { store.set(tokenKey, t.trim()); paint(); location.reload(); }
    });
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adminUI); else adminUI();
  window.SS_GH = GH;
})();
