// Pengganti layanan dashboard Claude untuk versi web mandiri (GitHub Pages).
// - Data dibaca dari <id>.js (dimuat sebelum halaman, lihat index.html).
// - Pilihan filter disimpan per pembaca di browser.
// - Unggahan dari tab Update Data Bulanan / Laporan Harian disimpan ke repo GitHub
//   memakai token admin (fine-grained, izin Contents: Read and write untuk repo ini saja).
// - Admin login dengan nama + password. Token GitHub disimpan terenkripsi di admin-keys.js
//   (PBKDF2-SHA256 + AES-GCM); password hanya dipakai di browser untuk membuka token itu.
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
  // token hasil login hanya disimpan untuk sesi tab ini (hilang saat tab ditutup)
  const tokenKey = 'ss-gh-token-s', whoKey = 'ss-admin-name-s';
  const ss = {
    get(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* abaikan */ } },
  };
  let memTok = ss.get(tokenKey);
  const token = () => memTok;
  try { localStorage.removeItem('ss-gh-token'); } catch (e) { /* token lama tidak dipakai lagi */ }
  const openToken = (entry, pw) => window.SSAuthCore.openToken(entry, pw);
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
    if (!r.ok) { let m = ''; try { m = (await r.json()).message; } catch (e) { /* abaikan */ } if (r.status === 403) m = 'token admin belum punya izin Contents: Read and write untuk repo ini'; throw Object.assign(new Error('GitHub ' + r.status + (m ? ': ' + m : '')), { code: 'gh-' + r.status }); }
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
          await ghPut(`${id}.js`, asJs(id, rows), `Update data ${id} dari dashboard`);
          D[id] = rows; window.__SSInvalidate();
        },
        async set(v) {
          if (path !== 'harian/latest') throw new Error('jalur tidak didukung: ' + path);
          await ghPut('harian_latest.js', `window.__HARIAN=${JSON.stringify(v)};\n`, 'Update laporan harian dari dashboard');
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

  // ---------------- login admin (nama + password) ----------------
  function adminUI() {
    const css = document.createElement('style');
    css.textContent = `#ss-admin{position:fixed;right:14px;bottom:14px;z-index:50;font:500 12px var(--font-anthropic-sans,system-ui);padding:7px 12px;border-radius:999px;border:1px solid var(--color-border-line,#ddd);background:#fff;color:var(--color-fg-muted,#667);box-shadow:0 2px 8px #0001;cursor:pointer}
#ss-admin[data-on="1"]{background:#eef6ee;color:#1F5A28;border-color:#9cc79f}
.ss-lg-back{position:fixed;inset:0;background:#0f2a4a66;z-index:100;display:grid;place-items:center;padding:16px}
.ss-lg{background:#fff;border-radius:14px;box-shadow:0 12px 40px #0003;width:min(380px,100%);padding:22px 22px 18px;display:grid;gap:12px;font-family:var(--font-anthropic-sans,system-ui);color:#1b1f17}
.ss-lg h2{margin:0;font-size:18px}.ss-lg p{margin:0;font-size:13px;color:#667060;line-height:1.45}
.ss-lg label{display:grid;gap:4px;font-size:12px;font-weight:600;color:#4a5245}
.ss-lg input,.ss-lg select{font:inherit;font-size:14px;padding:9px 11px;border:1px solid #cfd4cb;border-radius:8px}
.ss-lg input:focus,.ss-lg select:focus{outline:2px solid #C8E86B;border-color:#8fb33a}
.ss-lg .ss-lg-err{color:#B3261E;font-size:12.5px;min-height:1em}
.ss-lg .ss-lg-row{display:flex;gap:8px;justify-content:flex-end}
.ss-lg button{font:inherit;font-size:13px;font-weight:600;padding:8px 14px;border-radius:8px;border:1px solid #cfd4cb;background:#fff;cursor:pointer}
.ss-lg button.pri{background:#C8E86B;border-color:#b5d75a;color:#1b2a0a}.ss-lg button:disabled{opacity:.6;cursor:wait}`;
    document.head.appendChild(css);
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'ss-admin';
    const paint = () => { const on = !!token(); b.textContent = on ? `Admin: ${ss.get(whoKey) || 'masuk'} · Keluar` : 'Login admin'; b.dataset.on = on ? '1' : '0'; };
    paint();
    b.addEventListener('click', () => {
      if (token()) { if (confirm('Keluar dari mode admin?')) { memTok = ''; ss.del(tokenKey); ss.del(whoKey); paint(); location.reload(); } return; }
      openLogin();
    });
    document.body.appendChild(b);
    // ambil daftar admin terbaru (lewati cache browser/CDN) agar admin baru langsung bisa login
    async function freshKeys() {
      try {
        const r = await fetch('admin-keys.js?t=' + Date.now(), { cache: 'no-store' });
        if (r.ok) { const m = (await r.text()).match(/SS_ADMIN_KEYS\s*=\s*(\[[\s\S]*\])\s*;/); if (m) window.SS_ADMIN_KEYS = JSON.parse(m[1]); }
      } catch (e) { /* pakai daftar yang sudah dimuat */ }
      return Array.isArray(window.SS_ADMIN_KEYS) ? window.SS_ADMIN_KEYS : [];
    }
    async function openLogin() {
      const keys = await freshKeys();
      const back = document.createElement('div'); back.className = 'ss-lg-back';
      const f = document.createElement('form'); f.className = 'ss-lg'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-label', 'Login admin');
      const close = () => { back.remove(); document.removeEventListener('keydown', esc); b.focus(); };
      const esc = (e) => { if (e.key === 'Escape') close(); };
      if (!keys.length) {
        f.innerHTML = '<h2>Login admin</h2><p>Belum ada akun admin. Pemilik repo perlu membuatnya dulu lewat halaman <a href="admin-setup.html">admin-setup.html</a>.</p><div class="ss-lg-row"><button type="button" class="pri">Tutup</button></div>';
        f.querySelector('button').onclick = close;
      } else {
        f.innerHTML = `<h2>Login admin</h2><p>Login untuk menyimpan unggahan data ke dashboard. Pembaca biasa tidak perlu login.</p>
<label>Nama<select name="nama">${keys.map((k, i) => `<option value="${i}">${String(k.nama).replace(/[<&"]/g, '')}</option>`).join('')}</select></label>
<label>Password<input name="pw" type="password" autocomplete="current-password" required></label>
<div class="ss-lg-err" role="alert"></div>
<div class="ss-lg-row"><button type="button" data-x>Batal</button><button type="submit" class="pri">Masuk</button></div>`;
        f.querySelector('[data-x]').onclick = close;
        f.onsubmit = async (e) => {
          e.preventDefault();
          const btn = f.querySelector('button[type=submit]'), err = f.querySelector('.ss-lg-err');
          const k = keys[Number(f.nama.value)]; btn.disabled = true; err.textContent = 'Memeriksa…';
          try {
            const tok = await openToken(k, f.pw.value);
            memTok = tok; ss.set(tokenKey, tok); ss.set(whoKey, k.nama);
            close(); paint(); location.reload();
          } catch (x) { err.textContent = 'Nama atau password salah.'; btn.disabled = false; f.pw.select(); }
        };
      }
      back.appendChild(f); back.addEventListener('click', (e) => { if (e.target === back) close(); });
      document.addEventListener('keydown', esc);
      document.body.appendChild(back);
      const first = f.querySelector('input,button'); if (first) first.focus();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adminUI); else adminUI();
  window.SS_GH = GH;
  // dipakai tab Kondisi Sistem: baca file terbaru dari repo (lewat API, tanpa cache Pages) lalu simpan
  async function ghGet(path) {
    if (!GH.owner || !GH.repo) throw Object.assign(new Error('repo GitHub belum diatur'), { code: 'no-repo' });
    const api = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}?ref=${encodeURIComponent(GH.branch)}&t=${Date.now()}`;
    const r = await fetch(api, { headers: { Authorization: 'Bearer ' + token(), Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw Object.assign(new Error('GitHub ' + r.status), { code: 'gh-' + r.status });
    return r.text();
  }
  window.SSAdmin = { isAdmin: () => !!token(), name: () => ss.get(whoKey), get: ghGet, put: ghPut };
})();
