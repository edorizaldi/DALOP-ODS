// Gerbang dashboard: pembaca harus memasukkan password pembaca sebelum halaman tampil.
// Admin yang sudah login (tombol "Masuk sebagai admin") langsung lolos. Password pembaca diatur di admin-setup.html (viewer-key.js).
// Catatan: ini membatasi tampilan; file data tetap bisa diunduh langsung dari repo public.
(() => {
  'use strict';
  const OK = 'ss-view-ok', ADMIN = 'ss-gh-token-s', DAYS = 30;
  const get = (st, k) => { try { return st.getItem(k) || ''; } catch (e) { return ''; } };
  const put = (st, k, v) => { try { st.setItem(k, v); } catch (e) { /* abaikan */ } };
  const del = (st, k) => { try { st.removeItem(k); } catch (e) { /* abaikan */ } };
  const key = () => window.SS_VIEWER_KEY;
  function passed() {
    const K = key(); if (!K || !K.hash) return true;
    if (get(sessionStorage, ADMIN)) return true;
    if (get(sessionStorage, OK) === K.hash) return true;
    try { const r = JSON.parse(get(localStorage, OK) || 'null'); if (r && r.h === K.hash && r.exp > Date.now()) return true; } catch (e) { /* abaikan */ }
    return false;
  }
  const viewerOnly = () => { const K = key(); return !!(K && K.hash) && !get(sessionStorage, ADMIN); };
  window.SSGate = { passed, lock() { del(sessionStorage, OK); del(localStorage, OK); location.reload(); } };
  if (passed()) {
    // tombol kecil "Kunci" untuk pembaca yang masuk dengan password pembaca
    if (viewerOnly()) document.addEventListener('DOMContentLoaded', () => {
      const b = document.createElement('button'); b.type = 'button'; b.id = 'ss-view-out'; b.textContent = 'Keluar';
      b.title = 'Kunci dashboard di perangkat ini';
      b.style.cssText = 'position:fixed;right:14px;bottom:52px;z-index:50;font:500 12px var(--font-anthropic-sans,system-ui);padding:6px 12px;border-radius:999px;border:1px solid var(--color-border-line,#ddd);background:#fff;color:var(--color-fg-muted,#667060);cursor:pointer;box-shadow:0 1px 3px #0001';
      b.onclick = () => { if (confirm('Kunci dashboard di perangkat ini? Password pembaca perlu dimasukkan lagi.')) window.SSGate.lock(); };
      document.body.appendChild(b);
    });
    return;
  }

  // sembunyikan dashboard sampai password benar
  document.documentElement.classList.add('ss-locked');
  const css = document.createElement('style');
  css.textContent = `html.ss-locked #dash-root, html.ss-locked #ss-admin { visibility: hidden !important; }
html.ss-locked, html.ss-locked body { overflow: hidden !important; }
#ss-gate { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 16px; overflow: auto;
  background: radial-gradient(120% 90% at 50% 0%, #FFFFFF 0%, #EAF3FC 55%, #DCEBFA 100%); font-family: var(--font-anthropic-sans, Inter, system-ui, sans-serif); color: #13254A; }
#ss-gate form { width: min(400px, 100%); background: #fff; border: 1px solid #D5E3F2; border-radius: 18px; box-shadow: 0 16px 48px #13254A1F; padding: 26px 24px 20px; display: grid; gap: 14px; }
#ss-gate .g-logos { display: flex; align-items: center; justify-content: center; gap: 14px; }
#ss-gate .g-logos img { height: 40px; width: auto; display: block; }
#ss-gate .g-logos i { width: 1px; height: 30px; background: #D5E3F2; }
#ss-gate h1 { margin: 2px 0 0; font-size: 19px; text-align: center; letter-spacing: -.01em; }
#ss-gate p { margin: 0; font-size: 13px; line-height: 1.5; color: #5B6B86; text-align: center; }
#ss-gate label { display: grid; gap: 5px; font-size: 12.5px; font-weight: 600; color: #3B4A63; }
#ss-gate input[type=password] { font: inherit; font-size: 15px; padding: 10px 12px; border: 1px solid #C9D6E6; border-radius: 10px; width: 100%; box-sizing: border-box; }
#ss-gate input[type=password]:focus { outline: 2px solid #C8E86B; border-color: #8fb33a; }
#ss-gate .g-rem { display: flex; align-items: center; gap: 8px; font-weight: 500; color: #5B6B86; }
#ss-gate .g-err { color: #B3261E; font-size: 12.5px; min-height: 1em; text-align: center; }
#ss-gate button { font: inherit; cursor: pointer; }
#ss-gate .g-go { font-size: 14px; font-weight: 700; padding: 11px 16px; border-radius: 10px; border: 1px solid #b5d75a; background: #C8E86B; color: #1b2a0a; }
#ss-gate .g-go:disabled { opacity: .6; cursor: wait; }
#ss-gate .g-admin { justify-self: center; font-size: 12.5px; padding: 4px 8px; border: 0; background: none; color: #2563A6; text-decoration: underline; text-underline-offset: 3px; }`;
  document.head.appendChild(css);

  function build() {
    const logos = [...document.querySelectorAll('.ss-brand .ss-logo img')].slice(0, 2).map((im) => im.getAttribute('src'));
    const g = document.createElement('div'); g.id = 'ss-gate';
    g.innerHTML = `<form autocomplete="on" aria-labelledby="g-h">
  <div class="g-logos">${logos.map((s, i) => (i ? '<i></i>' : '') + `<img alt="" src="${s}">`).join('')}</div>
  <h1 id="g-h">Dashboard Keandalan Sumkal 2026</h1>
  <p>Masukkan password pembaca untuk membuka dashboard.</p>
  <input type="text" name="username" value="pembaca" autocomplete="username" hidden>
  <label>Password<input name="pw" type="password" autocomplete="current-password" required></label>
  <label class="g-rem"><input type="checkbox" name="rem"> Ingat di perangkat ini selama ${DAYS} hari</label>
  <div class="g-err" role="alert"></div>
  <button type="submit" class="g-go">Buka dashboard</button>
  <button type="button" class="g-admin">Masuk sebagai admin</button>
</form>`;
    document.body.appendChild(g);
    const f = g.querySelector('form'), err = g.querySelector('.g-err'), go = g.querySelector('.g-go');
    f.pw.focus();
    g.querySelector('.g-admin').onclick = () => { const b = document.getElementById('ss-admin'); if (b) b.click(); else err.textContent = 'Login admin belum siap, coba lagi sebentar.'; };
    f.onsubmit = async (e) => {
      e.preventDefault(); go.disabled = true; err.textContent = 'Memeriksa…';
      try {
        // pakai password pembaca terbaru (lewati cache)
        try { const r = await fetch('viewer-key.js?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) { const m = (await r.text()).match(/SS_VIEWER_KEY\s*=\s*([\s\S]*?);\s*$/); if (m) window.SS_VIEWER_KEY = JSON.parse(m[1]); } } catch (x) { /* pakai yang sudah dimuat */ }
        const K = key();
        if (!K || !K.hash) { unlock(); return; }
        if (!(await window.SSAuthCore.checkViewer(K, f.pw.value))) { err.textContent = 'Password salah.'; go.disabled = false; f.pw.select(); return; }
        put(sessionStorage, OK, K.hash);
        if (f.rem.checked) put(localStorage, OK, JSON.stringify({ h: K.hash, exp: Date.now() + DAYS * 864e5 }));
        unlock();
      } catch (x) { err.textContent = 'Tidak bisa memeriksa password di browser ini.'; go.disabled = false; }
    };
    function unlock() {
      const K = key();
      // muat ulang agar grafik digambar dengan ukuran sebenarnya; bila penyimpanan sesi tidak bisa dipakai, buka langsung
      if (!K || get(sessionStorage, OK) === K.hash) { location.reload(); return; }
      g.remove(); document.documentElement.classList.remove('ss-locked'); window.dispatchEvent(new Event('resize'));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
