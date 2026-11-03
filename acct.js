// Menu akun di bilah menu atas: status masuk (pembaca / admin), Masuk sebagai admin, Keluar dari mode admin, dan Keluar.
(() => {
  const host = document.getElementById('ss-acct'); if (!host) return;
  const get = (k) => { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const del = (k) => { try { sessionStorage.removeItem(k); } catch (e) { /* abaikan */ } };
  const G = window.SSGate || { hasKey: () => false, lock: () => location.reload() };
  const admin = !!get('ss-gh-token-s'), nama = get('ss-admin-name-s');
  const ICON_U = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6"/></svg>';
  const ICON_A = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>';
  const ICON_OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 17l5-5-5-5M21 12H9"/></svg>';
  const label = admin ? (nama || 'Admin') : G.hasKey() ? 'Pembaca' : 'Tamu';
  const sub = admin ? 'Admin · bisa menyimpan unggahan data' : G.hasKey() ? 'Masuk dengan password pembaca' : 'Dashboard terbuka tanpa password';
  host.innerHTML = `<button type="button" class="ss-acct-btn${admin ? ' adm' : ''}" id="ss-acct-b" aria-haspopup="true" aria-expanded="false" aria-controls="ss-acct-pop">${admin ? ICON_A : ICON_U}<span class="ss-acct-n"></span><svg class="ss-mg-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
<div class="ss-acct-pop" id="ss-acct-pop" role="menu" aria-labelledby="ss-acct-b" hidden>
  <div class="ss-acct-who"><b></b><small></small></div>
</div>`;
  host.querySelector('.ss-acct-n').textContent = label;
  host.querySelector('.ss-acct-who b').textContent = admin ? `Admin: ${nama || 'admin'}` : label;
  host.querySelector('.ss-acct-who small').textContent = sub;
  const pop = host.querySelector('#ss-acct-pop'), btn = host.querySelector('#ss-acct-b');
  const item = (html, text, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ss-acct-it' + (cls ? ' ' + cls : ''); b.setAttribute('role', 'menuitem'); b.innerHTML = html; b.append(text); b.addEventListener('click', () => { close(); fn(); }); pop.append(b); return b; };
  if (!admin) item(ICON_A, 'Masuk sebagai admin', () => { const a = document.getElementById('ss-admin'); if (a) a.click(); });
  if (admin) item(ICON_U, 'Keluar dari mode admin', () => {
    if (!confirm('Keluar dari mode admin? Unggahan tidak bisa disimpan lagi sampai login admin.')) return;
    del('ss-gh-token-s'); del('ss-admin-name-s'); location.reload();
  });
  if (admin || G.hasKey()) item(ICON_OUT, 'Keluar', () => {
    if (!confirm('Keluar dari dashboard di perangkat ini?' + (G.hasKey() ? ' Password pembaca perlu dimasukkan lagi untuk membuka dashboard.' : ''))) return;
    G.lock();
  }, 'out');
  const items = () => [...pop.querySelectorAll('.ss-acct-it')];
  const open = (focus) => { pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); if (focus) (items()[0] || btn).focus(); };
  const close = () => { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => (pop.hidden ? open(false) : close()));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open(true); } else if (e.key === 'Escape') close(); });
  pop.addEventListener('keydown', (e) => {
    const it = items(), i = it.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); it[(i + (e.key === 'ArrowDown' ? 1 : it.length - 1)) % it.length].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (!host.contains(e.target)) close(); });
  document.documentElement.classList.add('ss-has-acct');
})();
