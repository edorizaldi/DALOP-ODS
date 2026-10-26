// Enkripsi token GitHub dengan password admin (PBKDF2-SHA256 310.000 iterasi + AES-GCM 256).
// Dipakai oleh shim.js (login) dan admin-setup.html (membuat akun admin).
// Juga kunci data: semua file data dienkripsi dengan satu kunci acak (AES-GCM 256);
// kunci itu dibungkus dengan password akses dashboard (SS_ACCESS_KEYS di access.js).
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

  // ---- kunci data dashboard ----
  const FILES = ['bulanan', 'gangguan', 'gangguan_dupont', 'gangguan_ps', 'gangguan_up3', 'info_update', 'kc_bulanan', 'koordinat', 'kumulatif', 'laporan_harian', 'peny_bulanan', 'peny_profil', 'peta', 'target'];
  const newDataKey = () => crypto.getRandomValues(new Uint8Array(32));
  const aesKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  async function wrapKey(label, password, raw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 310000;
    const k = await keyFrom(password, salt, iter);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, raw));
    return { nama: label, salt: toB64(salt), iv: toB64(iv), iter, data: toB64(ct) };
  }
  async function unwrapKey(entry, password) {
    const k = await keyFrom(password, fromB64(entry.salt), entry.iter || 310000);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(entry.iv) }, k, fromB64(entry.data)));
  }
  // coba semua entri; kembalikan kunci data mentah atau lempar galat
  async function unlock(entries, password) {
    for (const e of entries || []) { try { return await unwrapKey(e, password); } catch (x) { /* coba entri berikutnya */ } }
    throw new Error('password salah');
  }
  // b64 untuk data besar (hindari spread argumen terlalu banyak)
  const bigB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  async function encText(raw, text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(raw), enc.encode(text)));
    return { iv: toB64(iv), data: bigB64(ct) };
  }
  async function decText(raw, box) {
    return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(box.iv) }, await aesKey(raw), fromB64(box.data)));
  }
  // isi file data terenkripsi / polos
  const encFile = async (raw, id, val) => `window.__E=window.__E||{};window.__E[${JSON.stringify(id)}]=${JSON.stringify(await encText(raw, JSON.stringify(val)))};\n`;
  const plainFile = (id, val) => (id === 'harian_latest' ? `window.__HARIAN=${JSON.stringify(val)};\n` : `window.__D=window.__D||{};window.__D[${JSON.stringify(id)}]=${JSON.stringify(val)};\n`);
  window.SSAuthCore = { sealToken, openToken, FILES, newDataKey, wrapKey, unwrapKey, unlock, encText, decText, encFile, plainFile, toB64, fromB64 };
})();
