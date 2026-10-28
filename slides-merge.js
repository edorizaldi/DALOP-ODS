// Menyisipkan slide dari file PowerPoint unggahan user ke paparan yang dibuat pptxgenjs.
// Slide disalin utuh beserta layout, master, tema, gambar, grafik dan file lain yang dirujuknya,
// sehingga tampil dan tetap bisa diedit seperti aslinya. Butuh JSZip.
(function (root) {
  const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const dirOf = (p) => p.slice(0, p.lastIndexOf('/'));
  const baseOf = (p) => p.slice(p.lastIndexOf('/') + 1);
  const relsOf = (p) => `${dirOf(p)}/_rels/${baseOf(p)}.rels`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag); return m ? unesc(m[1]) : null; };
  function resolve(fromDir, target) {
    if (target.startsWith('/')) return target.slice(1);
    const parts = fromDir ? fromDir.split('/') : [];
    target.split('/').forEach((seg) => { if (seg === '..') parts.pop(); else if (seg && seg !== '.') parts.push(seg); });
    return parts.join('/');
  }
  function relative(fromDir, to) {
    const a = fromDir ? fromDir.split('/') : [], b = to.split('/');
    let i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
    return '../'.repeat(a.length - i) + b.slice(i).join('/');
  }
  function parseRels(xml) {
    const out = []; const re = /<Relationship\b[^>]*?\/?>/g; let m;
    while ((m = re.exec(xml || ''))) out.push({ Id: attr(m[0], 'Id'), Type: attr(m[0], 'Type'), Target: attr(m[0], 'Target'), Mode: attr(m[0], 'TargetMode') });
    return out;
  }
  const relsXml = (rels) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + rels.map((r) => `<Relationship Id="${esc(r.Id)}" Type="${esc(r.Type)}" Target="${esc(r.Target)}"${r.Mode ? ` TargetMode="${esc(r.Mode)}"` : ''}/>`).join('') + '</Relationships>';
  function parseTypes(xml) {
    const def = {}, ov = {}; let m;
    const rd = /<Default\b[^>]*>/g; while ((m = rd.exec(xml))) def[attr(m[0], 'Extension').toLowerCase()] = attr(m[0], 'ContentType');
    const ro = /<Override\b[^>]*>/g; while ((m = ro.exec(xml))) ov[attr(m[0], 'PartName')] = attr(m[0], 'ContentType');
    return { def, ov };
  }
  const isXml = (p) => /\.(xml|rels|vml)$/i.test(p);
  const read = (zip, p) => { const f = zip.file(p); return f ? f.async(isXml(p) ? 'string' : 'uint8array') : Promise.resolve(null); };
  const sldSize = (xml) => { const m = /<p:sldSz\b[^>]*>/.exec(xml || ''); return m ? { cx: +attr(m[0], 'cx'), cy: +attr(m[0], 'cy') } : null; };

  // daftar slide di file pptx: urutan, path, judul (teks placeholder judul, atau teks pertama)
  async function inspect(JSZip, data) {
    const zip = await JSZip.loadAsync(data);
    const pres = await read(zip, 'ppt/presentation.xml');
    if (!pres) throw new Error('file bukan PowerPoint (.pptx) yang valid');
    const rels = parseRels(await read(zip, 'ppt/_rels/presentation.xml.rels'));
    const ids = []; const re = /<p:sldId\b[^>]*>/g; let m;
    while ((m = re.exec(pres))) ids.push(attr(m[0], 'r:id'));
    const slides = [];
    for (const id of ids) {
      const r = rels.find((x) => x.Id === id); if (!r) continue;
      const path = resolve('ppt', r.Target); const xml = (await read(zip, path)) || '';
      const texts = (s) => (s.match(/<a:t>([^<]*)<\/a:t>/g) || []).map((t) => unesc(t.slice(5, -6))).join(' ').replace(/\s+/g, ' ').trim();
      let title = '';
      (xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || []).some((sp) => { if (/<p:ph\b[^>]*type="(title|ctrTitle)"/.test(sp)) { title = texts(sp); return !!title; } return false; });
      if (!title) title = texts(xml).slice(0, 90);
      slides.push({ path, title: title.slice(0, 120), hidden: /<p:sld\b[^>]*\sshow="0"/.test(xml) });
    }
    return { zip, slides, size: sldSize(pres) };
  }

  // base: ArrayBuffer paparan; fills: [{at: nomor slide placeholder (1..n), zip, path: path slide sumber}]
  async function merge(JSZip, base, fills, outType) {
    const out = await JSZip.loadAsync(base);
    const ctXml0 = await read(out, '[Content_Types].xml');
    const dstTypes = parseTypes(ctXml0); const addCT = [];
    let presXml = await read(out, 'ppt/presentation.xml');
    const presRels = parseRels(await read(out, 'ppt/_rels/presentation.xml.rels'));
    const slidePath = {}; const rs = /<p:sldId\b[^>]*>/g; let m, k = 0;
    while ((m = rs.exec(presXml))) { k++; const r = presRels.find((x) => x.Id === attr(m[0], 'r:id')); if (r) slidePath[k] = resolve('ppt', r.Target); }
    // id master/layout harus unik di seluruh presentasi
    let maxId = 2147483647;
    const bump = (xml) => { (xml.match(/<p:(sldMasterId|sldLayoutId)\b[^>]*>/g) || []).forEach((t) => { const v = +attr(t, 'id'); if (v > maxId) maxId = v; }); };
    bump(presXml);
    for (const f of Object.keys(out.files).filter((p) => /^ppt\/slideMasters\/[^/]+\.xml$/.test(p))) bump(await read(out, f));
    let nextRid = presRels.reduce((a, r) => Math.max(a, +(/\d+/.exec(r.Id) || [0])[0]), 0) + 1;
    const srcState = new Map(); let srcSeq = 0;

    function typeOf(st, p) { return st.types.ov['/' + p] || st.types.def[(p.split('.').pop() || '').toLowerCase()] || null; }
    function registerType(p, ct) {
      if (!ct) return;
      const ext = (p.split('.').pop() || '').toLowerCase();
      if (!isXml(p) && dstTypes.def[ext] === ct) return;
      if (!isXml(p) && !dstTypes.def[ext]) { dstTypes.def[ext] = ct; addCT.push(`<Default Extension="${esc(ext)}" ContentType="${esc(ct)}"/>`); return; }
      if (dstTypes.ov['/' + p] === ct) return;
      dstTypes.ov['/' + p] = ct; addCT.push(`<Override PartName="/${esc(p)}" ContentType="${esc(ct)}"/>`);
    }
    async function copyPart(st, src, selfDst) {
      if (st.map.has(src)) return st.map.get(src);
      const dir = dirOf(src); let dst, n = 0;
      do { dst = `${dir}/u${st.no}${n ? '_' + n : ''}_${baseOf(src)}`; n++; } while (out.file(dst));
      st.map.set(src, dst);
      const data = await read(st.zip, src);
      if (data == null) return dst;
      let body = data;
      const ct = typeOf(st, src);
      const rels = await rewriteRels(st, src, dst, selfDst);
      if (ct && /slideMaster\+xml/.test(ct) && typeof body === 'string') {
        body = body.replace(/<p:sldLayoutId\b[^>]*>/g, (t) => t.replace(/\sid="\d+"/, ` id="${++maxId}"`));
        const rid = 'rId' + (nextRid++);
        presRels.push({ Id: rid, Type: REL_NS + '/slideMaster', Target: relative('ppt', dst) });
        const tag = `<p:sldMasterId id="${++maxId}" r:id="${rid}"/>`;
        presXml = presXml.includes('</p:sldMasterIdLst>') ? presXml.replace('</p:sldMasterIdLst>', tag + '</p:sldMasterIdLst>') : presXml.replace(/(<p:presentation\b[^>]*>)/, `$1<p:sldMasterIdLst>${tag}</p:sldMasterIdLst>`);
      }
      out.file(dst, body);
      if (rels) out.file(relsOf(dst), relsXml(rels));
      registerType(dst, ct);
      return dst;
    }
    async function rewriteRels(st, src, dst, selfDst) {
      const xml = await read(st.zip, relsOf(src)); if (xml == null) return null;
      const res = [];
      for (const r of parseRels(xml)) {
        if (r.Mode === 'External') { res.push(r); continue; }
        const t = (r.Type || '').split('/').pop();
        if (/^(notesSlide|comments|commentAuthors|handoutMaster|notesMaster)$/.test(t)) continue;
        if (t === 'slide') { res.push({ ...r, Target: relative(dirOf(dst), selfDst || dst) }); continue; }
        const target = resolve(dirOf(src), r.Target);
        if (!st.zip.file(target)) { res.push(r); continue; }
        const nd = await copyPart(st, target, selfDst);
        res.push({ ...r, Target: relative(dirOf(dst), nd) });
      }
      return res;
    }

    for (const f of fills) {
      const dst = slidePath[f.at]; if (!dst) continue;
      if (!srcState.has(f.zip)) {
        const st = { zip: f.zip, no: ++srcSeq, map: new Map(), types: parseTypes(await read(f.zip, '[Content_Types].xml')) };
        srcState.set(f.zip, st);
      }
      const st = srcState.get(f.zip);
      const keep = parseRels(await read(out, relsOf(dst))).filter((r) => /\/notesSlide$/.test(r.Type));
      const body = await read(f.zip, f.path);
      const rels = (await rewriteRels(st, f.path, dst, dst)) || [];
      keep.forEach((r) => { let id = r.Id; while (rels.some((x) => x.Id === id)) id += 'n'; rels.push({ ...r, Id: id }); });
      out.file(dst, body);
      out.file(relsOf(dst), relsXml(rels));
    }
    out.file('ppt/presentation.xml', presXml);
    out.file('ppt/_rels/presentation.xml.rels', relsXml(presRels));
    if (addCT.length) out.file('[Content_Types].xml', ctXml0.replace('</Types>', addCT.join('') + '</Types>'));
    return out.generateAsync({ type: outType || 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', compression: 'DEFLATE' });
  }

  const api = { inspect, merge, sldSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SSPptxMerge = api;
})(typeof window !== 'undefined' ? window : globalThis);
