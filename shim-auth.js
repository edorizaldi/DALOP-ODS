// Enkripsi token GitHub dengan password admin (PBKDF2-SHA256 310.000 iterasi + AES-GCM 256).
// Dipakai oleh shim.js (login) dan admin-setup.html (membuat akun admin).
(() => {
  'use strict';
  // ---- enkripsi token dengan password ----
  const enc = new TextEncoder(), dec = new TextDecoder();
  const toB64 = (u8) => btoa(String.fromCharCode(...u8));
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function keyFrom(password, salt, iter) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function sealToken(name, password, tok) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 310000;
    const k = await keyFrom(password, salt, iter);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode('ssv1:' + tok)));
    return { nama: name, salt: toB64(salt), iv: toB64(iv), iter, data: toB64(ct) };
  }
  async function openToken(entry, password) {
    const k = await keyFrom(password, fromB64(entry.salt), entry.iter || 310000);
    const pt = dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(entry.iv) }, k, fromB64(entry.data)));
    if (!pt.startsWith('ssv1:')) throw new Error('format');
    return pt.slice(5);
  }
  window.SSAuthCore = { sealToken, openToken };
})();
