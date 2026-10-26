// Streaming reader for the APKT detail export (.xlsx, hundreds of MB).
// Reads only the needed columns; never holds the whole sheet in memory.
// Works in the browser (File/Blob) and in Node 20+ (fs.openAsBlob) for tests.
const APKT = (() => {
  const BULAN = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
  const NEED = { UNIT: 'UNIT', BULAN: 'BULAN', BIDANG: 'BIDANG', JENIS: 'JENIS PADAM', LAP: 'NO. LAPORAN', KODE: 'KODE', TGL: 'WAKTU PADAM (TANGGAL)', ULP: 'ULP', PENY: 'PENYULANG', PS: 'P/S', FAS: 'FASILITAS', SUBF: 'SUB FASILITAS', EQ: 'EQUIPMENT', CAUSE: 'CAUSE' };
  const OPTIONAL = new Set(['TGL', 'ULP', 'PENY', 'PS', 'FAS', 'SUBF', 'EQ', 'CAUSE']);
  const normH = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
  const HEAD = new Set(Object.values(NEED));
  const unesc = (s) => (s.indexOf('&') < 0 ? s : s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/&amp;/g, '&'));
  const td = new TextDecoder();

  async function bytes(blob, a, b) { return new Uint8Array(await blob.slice(a, b).arrayBuffer()); }

  async function entries(blob) {
    const size = blob.size;
    const tailStart = Math.max(0, size - 66000);
    const tail = await bytes(blob, tailStart, size);
    const dv = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
    let e = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Bukan file .xlsx yang valid.');
    let n = dv.getUint16(e + 10, true), cdSize = dv.getUint32(e + 12, true), cdOff = dv.getUint32(e + 16, true);
    if (cdOff === 0xffffffff || n === 0xffff) { // zip64
      const loc = e - 20;
      if (loc >= 0 && dv.getUint32(loc, true) === 0x07064b50) {
        const z64off = Number(dv.getBigUint64(loc + 8, true));
        const z = await bytes(blob, z64off, z64off + 56); const zv = new DataView(z.buffer);
        n = Number(zv.getBigUint64(32, true)); cdSize = Number(zv.getBigUint64(40, true)); cdOff = Number(zv.getBigUint64(48, true));
      }
    }
    const cd = await bytes(blob, cdOff, cdOff + cdSize); const cv = new DataView(cd.buffer);
    const out = {}; let p = 0;
    for (let k = 0; k < n && p + 46 <= cd.length; k++) {
      if (cv.getUint32(p, true) !== 0x02014b50) break;
      const method = cv.getUint16(p + 10, true); let csize = cv.getUint32(p + 20, true);
      const nl = cv.getUint16(p + 28, true), xl = cv.getUint16(p + 30, true), cl = cv.getUint16(p + 32, true);
      let off = cv.getUint32(p + 42, true);
      const name = td.decode(cd.subarray(p + 46, p + 46 + nl));
      // zip64 extra
      let q = p + 46 + nl; const qe = q + xl;
      while (q + 4 <= qe) {
        const id = cv.getUint16(q, true), sz = cv.getUint16(q + 2, true);
        if (id === 1) { let r = q + 4; if (cv.getUint32(p + 24, true) === 0xffffffff) r += 8; if (csize === 0xffffffff) { csize = Number(cv.getBigUint64(r, true)); r += 8; } if (off === 0xffffffff) off = Number(cv.getBigUint64(r, true)); }
        q += 4 + sz;
      }
      out[name] = { method, csize, off };
      p += 46 + nl + xl + cl;
    }
    return out;
  }

  // Calls onChunk(text) with decoded text pieces of one zip entry, streaming.
  async function streamEntry(blob, ent, onChunk, onBytes) {
    const lh = await bytes(blob, ent.off, ent.off + 30); const lv = new DataView(lh.buffer);
    const start = ent.off + 30 + lv.getUint16(26, true) + lv.getUint16(28, true);
    let s = blob.slice(start, start + ent.csize).stream();
    if (onBytes) { let got = 0; s = s.pipeThrough(new TransformStream({ transform(c, ctl) { got += c.length; onBytes(got, ent.csize); ctl.enqueue(c); } })); }
    if (ent.method === 8) s = s.pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = s.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) { const { value, done } = await reader.read(); if (done) break; if (value) onChunk(value); }
  }

  // Splits a stream into complete <tag ...>...</tag> elements.
  function splitter(close, fn) {
    let buf = '';
    return {
      push(t) {
        buf += t;
        const last = buf.lastIndexOf(close);
        if (last < 0) { if (buf.length > 64e6) throw new Error('Struktur file tidak dikenali.'); return; }
        const end = last + close.length;
        fn(buf.slice(0, end));
        buf = buf.slice(end);
      },
    };
  }
  const colIdx = (letters) => { let n = 0; for (let i = 0; i < letters.length; i++) n = n * 26 + letters.charCodeAt(i) - 64; return n - 1; };
  function serialToISO(v) { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }

  async function sharedStrings(blob, ents, want, onProgress, label, accept) {
    const ent = ents['xl/sharedStrings.xml'];
    const map = new Map(); if (!ent) return map;
    let idx = 0;
    const sp = splitter('</si>', (seg) => {
      let i = 0;
      for (;;) {
        const a = seg.indexOf('<si', i); if (a < 0) break;
        const b = seg.indexOf('</si>', a); if (b < 0) break;
        if (want(idx)) {
          const inner = seg.slice(a, b); let txt = ''; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let m;
          while ((m = re.exec(inner))) txt += m[1];
          const val = unesc(txt);
          if (!accept || accept(val)) map.set(idx, val);
        }
        idx++; i = b + 5;
      }
    });
    await streamEntry(blob, ent, (t) => sp.push(t), (g, tot) => onProgress && onProgress(label, g / tot));
    return map;
  }

  async function firstSheetPath(blob, ents) {
    const rd = async (name) => { const e = ents[name]; if (!e) return null; let s = ''; await streamEntry(blob, e, (t) => { s += t; }); return s; };
    const wb = await rd('xl/workbook.xml'), rels = await rd('xl/_rels/workbook.xml.rels');
    let path = 'xl/worksheets/sheet1.xml';
    if (wb && rels) {
      const s = /<(?:\w+:)?sheet\b[^>]*\br:id="([^"]+)"/.exec(wb);
      if (s) { const r = new RegExp('<Relationship\\b[^>]*Id="' + s[1] + '"[^>]*>').exec(rels); const t = r && /Target="([^"]+)"/.exec(r[0]); if (t) path = t[1].startsWith('/') ? t[1].slice(1) : 'xl/' + t[1].replace(/^\.\//, ''); }
    }
    if (!ents[path]) throw new Error('Sheet pertama tidak ditemukan.');
    return path;
  }

  // Returns {rows: n, perMonth: {m: {mentah, dup, unik, tgl_min, tgl_max, rows:[[kode,bidang,jenis,unit,n]]}}, unknownMonth, missingLap}
  async function read(blob, onProgress) {
    const ents = await entries(blob);
    const sheet = await firstSheetPath(blob, ents);
    // pass 1: header strings only
    const headSS = await sharedStrings(blob, ents, () => true, onProgress, 'Membaca daftar teks (1/3)', (v) => v.length < 40 && HEAD.has(normH(v)));
    // Keep only strings that could be header names, to free memory.
    const headIdx = new Map(); for (const [k, v] of headSS) if (HEAD.has(normH(v))) headIdx.set(k, normH(v));
    headSS.clear();
    // pass 2: sheet; store raw refs for needed columns
    const N = Object.keys(NEED);
    let cols = null; // col index -> field
    const store = { UNIT: [], BULAN: [], BIDANG: [], JENIS: [], LAP: [], KODE: [], TGL: [], ULP: [], PENY: [], PS: [], FAS: [], SUBF: [], EQ: [], CAUSE: [] };
    const needSS = new Set();
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    let nrows = 0;
    const value = (attrs, body) => {
      const t = (/\bt="(\w+)"/.exec(attrs) || [])[1];
      if (t === 'inlineStr') { let s = ''; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let m; while ((m = re.exec(body))) s += m[1]; return unesc(s); }
      const vm = /<v>([\s\S]*?)<\/v>/.exec(body); if (!vm) return null;
      if (t === 's') return { s: +vm[1] };
      if (t === 'str' || t === 'e') return unesc(vm[1]);
      if (t === 'b') return vm[1] === '1';
      return Number(vm[1]);
    };
    const sp = splitter('</row>', (seg) => {
      rowRe.lastIndex = 0; let rm;
      while ((rm = rowRe.exec(seg))) {
        const body = rm[1];
        if (!cols) {
          const found = {}; cellRe.lastIndex = 0; let cm;
          while ((cm = cellRe.exec(body))) {
            const ref = /\br="([A-Z]+)\d+"/.exec(cm[1]); if (!ref) continue;
            const v = value(cm[1], cm[2] || '');
            const name = v && typeof v === 'object' ? headIdx.get(v.s) : typeof v === 'string' ? normH(v) : null;
            if (name && HEAD.has(name)) for (const f of N) if (NEED[f] === name && found[f] == null) found[f] = colIdx(ref[1]);
          }
          if (found.LAP != null && found.KODE != null && found.BULAN != null) {
            const miss = N.filter((f) => found[f] == null && !OPTIONAL.has(f));
            if (miss.length) throw new Error('Kolom tidak ditemukan: ' + miss.map((f) => NEED[f]).join(', '));
            cols = new Map(); for (const f of N) if (found[f] != null) cols.set(found[f], f);
          }
          continue;
        }
        const r = {}; cellRe.lastIndex = 0; let cm;
        while ((cm = cellRe.exec(body))) {
          const ref = /\br="([A-Z]+)\d+"/.exec(cm[1]); if (!ref) continue;
          const f = cols.get(colIdx(ref[1])); if (!f) continue;
          const v = value(cm[1], cm[2] || '');
          if (v && typeof v === 'object') needSS.add(v.s);
          r[f] = v;
        }
        if (r.LAP == null && r.BULAN == null) continue;
        for (const f of N) store[f].push(r[f] == null ? null : r[f]);
        nrows++;
      }
    });
    await streamEntry(blob, ents[sheet], (t) => sp.push(t), (g, tot) => onProgress && onProgress('Membaca baris data (2/3)', g / tot));
    if (!cols) throw new Error('Baris judul kolom (NO. LAPORAN, KODE, BULAN, …) tidak ditemukan.');
    // pass 3: resolve needed strings
    const ss = await sharedStrings(blob, ents, (i) => needSS.has(i), onProgress, 'Mencocokkan teks (3/3)');
    const S = (v) => (v == null ? '' : typeof v === 'object' ? ss.get(v.s) ?? '' : typeof v === 'number' ? String(v) : String(v));
    const U = (v) => S(v).trim().toUpperCase();
    const seen = new Set(); const per = {}; let unknownMonth = 0, missingLap = 0;
    for (let i = 0; i < nrows; i++) {
      const b = U(store.BULAN[i]); const m = BULAN.indexOf(b) + 1;
      if (!m) { unknownMonth++; continue; }
      const p = per[m] || (per[m] = { mentah: 0, dup: 0, unik: 0, tgl_min: null, tgl_max: null, agg: new Map(), det: new Map(), dp: new Map() });
      p.mentah++;
      const t = store.TGL[i]; const tgl = t == null ? null : typeof t === 'number' ? serialToISO(t) : S(t).slice(0, 10);
      if (tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl)) { if (!p.tgl_min || tgl < p.tgl_min) p.tgl_min = tgl; if (!p.tgl_max || tgl > p.tgl_max) p.tgl_max = tgl; }
      const lap = S(store.LAP[i]).trim();
      if (!lap) { missingLap++; }
      else { if (seen.has(lap)) { p.dup++; continue; } seen.add(lap); }
      p.unik++;
      const key = [U(store.KODE[i]), U(store.BIDANG[i]), U(store.JENIS[i]), U(store.UNIT[i])].join('\u0001');
      p.agg.set(key, (p.agg.get(key) || 0) + 1);
      const dkey = key + '\u0001' + U(store.ULP[i]) + '\u0001' + U(store.PENY[i]) + '\u0001' + U(store.PS[i]);
      p.det.set(dkey, (p.det.get(dkey) || 0) + 1);
      if (U(store.KODE[i]) === 'J') { const T = (v) => S(v).trim(); const pk = [U(store.UNIT[i]), U(store.ULP[i]), U(store.BIDANG[i]), U(store.JENIS[i]), T(store.FAS[i]), T(store.SUBF[i]), T(store.EQ[i]), T(store.CAUSE[i])].join('\u0001'); p.dp.set(pk, (p.dp.get(pk) || 0) + 1); }
    }
    const perMonth = {};
    for (const [m, p] of Object.entries(per)) perMonth[m] = { mentah: p.mentah, dup: p.dup, unik: p.unik, tgl_min: p.tgl_min, tgl_max: p.tgl_max, rows: [...p.agg].map(([k, n]) => [...k.split('\u0001'), n]).sort((a, b) => (a.slice(0, 4).join() < b.slice(0, 4).join() ? -1 : 1)), detail: [...p.det].map(([k, n]) => [...k.split('\u0001'), n]), dupont: [...p.dp].map(([k, n]) => [...k.split('\u0001'), n]) };
    return { rows: nrows, perMonth, unknownMonth, missingLap, hasDetail: cols ? [...cols.values()].includes('ULP') : false, hasDupont: cols ? [...cols.values()].includes('FAS') && [...cols.values()].includes('CAUSE') : false };
  }

  // Small workbook (e.g. database penyulang): first sheet as an array of rows of plain values.
  async function readTable(blob, onProgress) {
    const ents = await entries(blob);
    const sheet = await firstSheetPath(blob, ents);
    const ss = await sharedStrings(blob, ents, () => true, onProgress, 'Membaca teks');
    const out = []; const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    const sp = splitter('</row>', (seg) => {
      rowRe.lastIndex = 0; let rm;
      while ((rm = rowRe.exec(seg))) {
        const row = []; cellRe.lastIndex = 0; let cm;
        while ((cm = cellRe.exec(rm[1]))) {
          const ref = /\br="([A-Z]+)\d+"/.exec(cm[1]); if (!ref) continue;
          const attrs = cm[1], body = cm[2] || ''; const t = (/\bt="(\w+)"/.exec(attrs) || [])[1]; let v = null;
          if (t === 'inlineStr') { let s = ''; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let m; while ((m = re.exec(body))) s += m[1]; v = unesc(s); }
          else { const vm = /<v>([\s\S]*?)<\/v>/.exec(body); if (vm) v = t === 's' ? ss.get(+vm[1]) ?? '' : t === 'str' || t === 'e' ? unesc(vm[1]) : t === 'b' ? vm[1] === '1' : Number(vm[1]); }
          row[colIdx(ref[1])] = v;
        }
        out.push(row);
      }
    });
    await streamEntry(blob, ents[sheet], (t) => sp.push(t), (g, tot) => onProgress && onProgress('Membaca baris', g / tot));
    return out;
  }
  // Semua sheet di workbook kecil/sedang: [{name, rows}] (rows seperti readTable).
  async function readSheets(blob, onProgress) {
    const ents = await entries(blob);
    const rd = async (name) => { const e = ents[name]; if (!e) return null; let s = ''; await streamEntry(blob, e, (x) => { s += x; }); return s; };
    const wb = await rd('xl/workbook.xml'), rels = await rd('xl/_rels/workbook.xml.rels');
    if (!wb || !rels) return [{ name: 'Sheet1', rows: await readTable(blob, onProgress) }];
    const relMap = {}; for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) { const id = /Id="([^"]+)"/.exec(m[0]), tg = /Target="([^"]+)"/.exec(m[0]); if (id && tg) relMap[id[1]] = tg[1].startsWith('/') ? tg[1].slice(1) : 'xl/' + tg[1].replace(/^\.\//, ''); }
    const sheets = []; for (const m of wb.matchAll(/<(?:\w+:)?sheet\b[^>]*>/g)) { const nm = /\bname="([^"]*)"/.exec(m[0]), rid = /\br:id="([^"]+)"/.exec(m[0]); if (nm && rid && relMap[rid[1]] && ents[relMap[rid[1]]]) sheets.push({ name: unesc(nm[1]), path: relMap[rid[1]] }); }
    const ss = await sharedStrings(blob, ents, () => true, onProgress, 'Membaca teks');
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g; const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
    const out = [];
    for (let si = 0; si < sheets.length; si++) {
      const sh = sheets[si]; const rows = [];
      const sp = splitter('</row>', (seg) => {
        rowRe.lastIndex = 0; let rm;
        while ((rm = rowRe.exec(seg))) {
          const rn = +(/\br="(\d+)"/.exec(rm[1]) || [0, rows.length + 1])[1] - 1;
          const row = []; cellRe.lastIndex = 0; let cm;
          while ((cm = cellRe.exec(rm[2]))) {
            const ref = /\br="([A-Z]+)\d+"/.exec(cm[1]); if (!ref) continue;
            const attrs = cm[1], body = cm[2] || ''; const t = (/\bt="(\w+)"/.exec(attrs) || [])[1]; let v = null;
            if (t === 'inlineStr') { let s = ''; const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g; let m; while ((m = re.exec(body))) s += m[1]; v = unesc(s); }
            else { const vm = /<v>([\s\S]*?)<\/v>/.exec(body); if (vm) v = t === 's' ? ss.get(+vm[1]) ?? '' : t === 'str' || t === 'e' ? unesc(vm[1]) : t === 'b' ? vm[1] === '1' : Number(vm[1]); }
            row[colIdx(ref[1])] = v;
          }
          rows[rn] = row;
        }
      });
      await streamEntry(blob, ents[sh.path], (x) => sp.push(x));
      for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
      out.push({ name: sh.name, rows });
      if (onProgress) onProgress('Membaca sheet', (si + 1) / sheets.length);
    }
    return out;
  }
  return { read, readTable, readSheets, BULAN };
})();
if (typeof module !== 'undefined') module.exports = { APKT };
if (typeof window !== 'undefined') window.APKT = APKT;
