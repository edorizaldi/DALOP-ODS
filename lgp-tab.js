// Tab Laporan Gangguan Penyulang (menu Harian).
// Laporan harian "Monitoring Gangguan Penyulang" dari WAG Kehandalan Distribusi SUMKAL ditempel / diunggah (.txt) per UID per hari,
// dibaca di browser, lalu direkap kumulatif: akumulasi = jumlah angka harian dari laporan yang sudah diunggah.
// Data tersimpan di gangguan_harian.js (dimuat saat tab dibuka). Admin yang login menyimpannya ke repo; tanpa login hanya tampil di layar sendiri.
(() => {
'use strict';
const UIDS = [
  {id:"ACEH", label:"UID Aceh", alias:["NANGGROE ACEH","ACEH","NAD"]},
  {id:"SUMUT", label:"UID Sumut", alias:["SUMATERA UTARA","SUMATRA UTARA","SUMUT"]},
  {id:"SUMBAR", label:"UID Sumbar", alias:["SUMATERA BARAT","SUMATRA BARAT","SUMBAR"]},
  {id:"RKR", label:"UID RKR", alias:["RIAU DAN KEPULAUAN RIAU","RIAU & KEPRI","RKR","RIAU"]},
  {id:"S2JB", label:"UID S2JB", alias:["SUMSEL JAMBI BENGKULU","S2JB","SUMATERA SELATAN","SUMSEL"]},
  {id:"BABEL", label:"UID Babel", alias:["BANGKA BELITUNG","BABEL","BANGKA"]},
  {id:"LAMPUNG", label:"UID Lampung", alias:["LAMPUNG"]},
  {id:"KALBAR", label:"UID Kalbar", alias:["KALIMANTAN BARAT","KALBAR"]},
  {id:"KSKT", label:"UID KSKT", alias:["KALIMANTAN SELATAN DAN KALIMANTAN TENGAH","KALSELTENG","KSKT","KALIMANTAN SELATAN","KALIMANTAN TENGAH"]},
  {id:"KALTIMRA", label:"UID Kaltimra", alias:["KALIMANTAN TIMUR DAN KALIMANTAN UTARA","KALTIMRA","KALTIM","KALTARA","KALIMANTAN TIMUR","KALIMANTAN UTARA"]}
];
const BULAN = {januari:1,jan:1,februari:2,feb:2,pebruari:2,maret:3,mar:3,april:4,apr:4,mei:5,juni:6,jun:6,juli:7,jul:7,agustus:8,agu:8,agt:8,ags:8,aug:8,september:9,sep:9,sept:9,oktober:10,okt:10,oct:10,november:11,nopember:11,nov:11,desember:12,des:12,dec:12};

function toNum(s){ const n = parseInt(String(s == null ? "" : s).replace(/[^\d]/g,""),10); return isNaN(n) ? null : n; }
function pad2(n){ return String(n).padStart(2,"0"); }
function validDate(y,m,d){ const t=new Date(Date.UTC(y,m-1,d)); return t.getUTCFullYear()===y && t.getUTCMonth()===m-1 && t.getUTCDate()===d; }

function matchUid(str){
  const s = String(str||"").toUpperCase().replace(/[^A-Z0-9& ]/g," ").replace(/\s+/g," ").trim();
  if(!s) return null;
  let best=null, bestLen=0;
  for(const u of UIDS) for(const a of u.alias){
    if((s===a || s.startsWith(a+" ")) && a.length>bestLen){ best=u.id; bestLen=a.length; }
  }
  return best;
}

function parseDate(str){
  if(!str) return null;
  let m = str.match(/(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/);
  if(m){ const mo = BULAN[m[2].toLowerCase()]; if(mo){ const y=+m[3], d=+m[1]; if(validDate(y,mo,d)) return `${y}-${pad2(mo)}-${pad2(d)}`; } }
  m = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m && validDate(+m[1],+m[2],+m[3])) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  m = str.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if(m && validDate(+m[3],+m[2],+m[1])) return `${m[3]}-${pad2(+m[2])}-${pad2(+m[1])}`;
  return null;
}

function splitReports(text){
  const parts = String(text||"").split(/^(?=\s*\*?Assalamu)/im).map(s=>s.trim()).filter(s=>/gangguan|penyulang/i.test(s));
  return parts.length ? parts : [String(text||"").trim()];
}

// ambil pasangan angka permanen / sesaat dari "92 / 546" atau "Permanen 15087 Kali / Sesaat 9797 Kali" (angka kosong = 0)
function pairFrom(text, swap){
  const t=String(text||"");
  const p=t.match(/Permanen\s*:?\s*([\d.,]*)/i), s=t.match(/Sesaat\s*:?\s*([\d.,]*)/i);
  if(p||s){ const a=p?toNum(p[1]):null, b=s?toNum(s[1]):null; return [a==null?0:a, b==null?0:b]; }
  const m=t.match(/([\d.,]+)\s*(?:kali)?\s*\/\s*([\d.,]+)/i);
  if(!m) return null;
  const a=[toNum(m[1]), toNum(m[2])]; return swap ? [a[1],a[0]] : a;
}
// "Kumulatif ... | Harian ..." -> {kum:[p,s], har:[p,s]}
function kumHar(line, swap){
  const o={}; const ik=line.search(/Kumulatif/i), ih=line.search(/Harian/i);
  if(ik>=0){ const end = ih>ik ? ih : line.length; o.kum=pairFrom(line.slice(ik+9, end), swap); }
  if(ih>=0){ const end = ik>ih ? ik : line.length; o.har=pairFrom(line.slice(ih+6, end), swap); }
  return o;
}
// baris rincian dikenali dari nomor urutnya: "1. ...", "1) ...", "1 - ...", "No. 1 ..."
function rowFields(line){
  const m = line.replace(/\t/g," ").match(/^\s*(?:No\.?\s*)?(\d{1,3})\s*[.):\-]\s*(.+)$/i);
  if(!m) return null;
  const body = m[2].trim();
  if(/^(nihil|tidak\s+ada|-+|n\/?a)\.?$/i.test(body)) return null;
  if(body.indexOf("|")>=0) return {pipe:true, f:body.split("|").map(s=>s.trim())};
  let f = body.split(/\s*[,;]\s*/).map(s=>s.trim()).filter(Boolean);
  // tanpa pemisah: potong di kata ULP / UP3 / Permanen / Sesaat
  if(f.length<2) f = body.split(/\s+(?=(?:ULP|UP3)\b|(?:Gangguan\s+)?(?:Permanen|Sesaat)\b)/i).map(s=>s.trim()).filter(Boolean);
  if(f.length<2){ f=[body]; }
  // pisahkan jenis yang menempel di depan penyebab, mis. "Sesaat - pohon"
  f = f.flatMap(x=>{ const j=x.match(/^((?:Gangguan\s+)?(?:Permanen|Sesaat))\s*[-–:]\s*(.+)$/i); return j?[j[1],j[2]]:[x]; });
  return {pipe:false, f};
}
const isJenis = s => /^(gangguan\s+)?(permanen|sesaat)$/i.test(String(s||"").trim());
const stripPfx = (s, re) => String(s||"").replace(re,"").trim();
// ---- kolom mengikuti baris "Keterangan:" tiap bagian ----
function colKey(lab){
  const l=lab.toLowerCase();
  if(/jenis/.test(l)) return "jenis";
  if(/temuan|penyebab/.test(l)) return "penyebab";
  if(/total|kali\s*padam|frekuensi/.test(l)) return "total";
  if(/penyulang|feeder/.test(l)) return "penyulang";
  if(/^ulp\b/.test(l)) return "ulp";
  if(/^up3\b/.test(l)) return "up3";
  if(/zona|section|lokasi/.test(l)) return "zona";
  return "lain";
}
function parseHeader(line){
  const body=String(line||"").replace(/^\s*Keterangan\s*:\s*/i,"").trim(); if(!body) return null;
  const parts=(body.indexOf("|")>=0 ? body.split("|") : body.split(/\s*[,;]\s*/)).map(x=>x.trim()).filter(Boolean);
  if(parts.length<2) return null;
  const cols=parts.map(lab=>({lab, key:colKey(lab)}));
  const jc=cols.find(c=>c.key==="jenis"); let defJenis="";
  if(jc){ const p=/permanen/i.test(jc.lab), q=/sesaat/i.test(jc.lab); if(p&&!q) defJenis="PERMANEN"; else if(q&&!p) defJenis="SESAAT"; }
  return {cols, labels:parts, swap:/sesaat\s*\/\s*permanen/i.test(body), defJenis};
}
const jenisNorm = s => String(s||"").toUpperCase().replace(/^GANGGUAN\s+/,"").trim();
function parseTotal(v, swap){
  const t=String(v||""); if(!/\d/.test(t)) return {total:null,totalP:null,totalS:null};
  const ps = /permanen|sesaat/i.test(t) ? pairFrom(t) : (/\d\s*(?:kali)?\s*\/\s*\d/i.test(t) ? pairFrom(t, swap) : null);
  const lead=t.match(/^\s*([\d.,]+)/); const first = (lead && !(ps && /^\s*[\d.,]+\s*(?:kali)?\s*\//i.test(t))) ? toNum(lead[1]) : null;
  return {total: first!=null ? first : (ps ? ps[0]+ps[1] : null), totalP: ps?ps[0]:null, totalS: ps?ps[1]:null};
}
// tanpa urutan yang cocok: kenali isi dari awalannya (ULP ..., UP3 ..., Permanen/Sesaat, Z2, angka kali)
function detectFields(f, kind){
  const o={penyulang:f[0]||"", ulp:"", up3:"", jenis:"", penyebab:"", zona:"", lain:"", total:""}; const rest=[];
  for(const x of f.slice(1)){
    if(!o.ulp && /^ULP\b/i.test(x)) o.ulp=x;
    else if(!o.up3 && /^UP3\b/i.test(x)) o.up3=x;
    else if(!o.jenis && isJenis(x)) o.jenis=x;
    else if(!o.zona && /^Z\d+$/i.test(x)) o.zona=x;
    else if(kind==="kronis" && !o.total && /\d/.test(x) && /^\s*[\d(]|kali|permanen|sesaat/i.test(x)) o.total=x;
    else rest.push(x);
  }
  o.penyebab=rest.join(", "); return o;
}
function mapRow(r, hdr, kind){
  const f=r.f, cols=hdr&&hdr.cols; let o;
  if(cols && f.length>=cols.length){
    o={penyulang:"", ulp:"", up3:"", jenis:"", penyebab:"", zona:"", lain:"", total:""}; const lain=[];
    cols.forEach((c,i)=>{ const v=f[i]||""; if(c.key==="lain") lain.push(c.lab+": "+v); else o[c.key]=o[c.key]?o[c.key]+", "+v:v; });
    const extra=f.slice(cols.length);
    if(extra.length){
      const z=extra.filter(x=>/^Z\d+$/i.test(x)), other=extra.filter(x=>!/^Z\d+$/i.test(x));
      if(z.length && !o.zona) o.zona=z.join(" ");
      if(other.length){ if(!r.pipe && cols.some(c=>c.key==="penyebab")) o.penyebab=[o.penyebab,...other].filter(Boolean).join(", "); else lain.push(...other); }
    }
    o.lain=lain.join(" | ");
    // kolom jenis berisi teks lain (mis. penyebab bergeser): kenali ulang dari isinya
    if(o.jenis && !isJenis(o.jenis) && !/^(permanen|sesaat)/i.test(o.jenis)) o=detectFields(f, kind);
  } else o=detectFields(f, kind);
  o.penyulang=stripPfx(o.penyulang,/^penyulang\s+/i); o.up3=stripPfx(o.up3,/^UP3\s+/i); o.zona=String(o.zona||"").toUpperCase();
  o.jenis=jenisNorm(o.jenis) || (hdr&&hdr.defJenis) || "";
  return o;
}
function padamFields(r, hdr){ const o=mapRow(r,hdr,"padam"); return {penyulang:o.penyulang, ulp:o.ulp, up3:o.up3, jenis:o.jenis, penyebab:o.penyebab, zona:o.zona, lain:o.lain}; }
function kronisFields(r, hdr){ const o=mapRow(r,hdr,"kronis"); return Object.assign({penyulang:o.penyulang, ulp:o.ulp, up3:o.up3}, parseTotal(o.total, hdr&&hdr.swap)); }

function parseReport(raw){
  const text = String(raw||"").replace(/\r/g,"").replace(/[*_~]/g,"").replace(/ /g," ");
  const lines = text.split("\n");
  const warnings = [];
  const find = re => lines.findIndex(l => re.test(l));

  // UID
  let uid = null;
  for(const l of lines){ const m = l.match(/PLN\s+UI[DW]\s*:\s*(.+)$/i); if(m){ uid = matchUid(m[1]); if(uid) break; } }
  if(!uid){ for(const l of lines){ const m = l.match(/(?:Rekap\s+PLN\s+UI[DW]|Harian\s+UI[DW]|PLN\s+UI[DW])\s+(?!se[-\s])(.+)$/i); if(m){ uid = matchUid(m[1]); if(uid) break; } } }

  // Date
  let tanggal = null, tanggalTeks = "";
  const ti = find(/^\s*Tanggal\s*:/i);
  if(ti>=0){ tanggalTeks = lines[ti].replace(/^\s*Tanggal\s*:\s*/i,"").trim(); tanggal = parseDate(tanggalTeks); }

  const iRekap = find(/Rekap\s+PLN\s+UI[DW]/i);
  const iUp3 = find(/Rekap\s+per\s+UP3/i);
  const iPadam = find(/DAFTAR\s+PENYULANG\s+PADAM/i);
  const iKronis = find(/DAFTAR\s+PENYULANG\s+KRONIS/i);
  let iEnd = find(/^\s*Demikian/i); if(iEnd<0) iEnd = lines.length;
  const range = (a,b) => a<0 ? [] : lines.slice(a+1, b>a ? b : lines.length);
  const firstAfter = (a, ...cands) => { const c = cands.filter(x=>x>a); return c.length ? Math.min(...c) : iEnd; };

  // urutan angka dari "Format angka: Kumulatif (Gangguan Permanen/Sesaat) | ..."
  const iFmt = find(/Format\s+angka|\(\s*(?:Gangguan\s+)?(?:Permanen|Sesaat)\s*\/\s*(?:Gangguan\s+)?(?:Permanen|Sesaat)\s*\)/i);
  const swapNum = iFmt>=0 && /\(\s*(?:Gangguan\s+)?Sesaat\s*\/\s*(?:Gangguan\s+)?Permanen/i.test(lines[iFmt]);
  const hdrIn = (a,b) => { if(a<0) return null; for(const l of lines.slice(a+1, b>a?b:lines.length)) if(/^\s*Keterangan\s*:/i.test(l)) return parseHeader(l); return null; };

  // Rekap UID
  let kumP=null,kumS=null,harP=null,harS=null;
  const rekapLines = iRekap>=0 ? range(iRekap, firstAfter(iRekap,iUp3,iPadam,iKronis)) : lines;
  for(const l of rekapLines){
    if(/UP3/i.test(l)) continue;
    const o=kumHar(l, swapNum);
    if(o.kum && kumP===null){ kumP=o.kum[0]; kumS=o.kum[1]; }
    if(o.har && harP===null){ harP=o.har[0]; harS=o.har[1]; }
  }

  // UP3
  const up3 = [];
  for(const l of (iUp3>=0 ? range(iUp3, firstAfter(iUp3,iPadam,iKronis)) : lines)){
    const m = l.match(/(UP3\s+[^:|]+?)\s*:\s*(.*Kumulatif.*)$/i); if(!m) continue;
    const o=kumHar(m[2], swapNum); if(!o.kum && !o.har) continue;
    up3.push({nama:m[1].replace(/\s+/g," ").trim().toUpperCase(), kumP:o.kum?o.kum[0]:null, kumS:o.kum?o.kum[1]:null, harP:o.har?o.har[0]:null, harS:o.har?o.har[1]:null});
  }

  // Penyulang padam
  const padam = [];
  const hdrPadam = hdrIn(iPadam, firstAfter(iPadam,iKronis));
  for(const l of range(iPadam, firstAfter(iPadam,iKronis))){
    if(/^\s*Keterangan\s*:/i.test(l)) continue;
    const r = rowFields(l); if(!r) continue;
    padam.push(padamFields(r, hdrPadam));
  }

  // Kronis
  let kronisJumlah = null; const kronis = [];
  const kr = range(iKronis, iEnd); const hdrKronis = hdrIn(iKronis, iEnd);
  for(const l of kr){
    const m = l.match(/sebanyak\s*:?\s*([\d.,]+|nihil|tidak\s+ada)\s*(?:penyulang)?/i);
    if(m && kronisJumlah===null) kronisJumlah = /\d/.test(m[1]) ? toNum(m[1]) : 0;
    const r = rowFields(l); if(!r) continue;
    if(/^\s*Keterangan\s*:/i.test(l)) continue;
    kronis.push(kronisFields(r, hdrKronis));
  }

  if(!uid) warnings.push("UID tidak terbaca dari teks. Pilih UID secara manual.");
  if(!tanggal) warnings.push("Tanggal laporan tidak terbaca. Isi tanggal secara manual.");
  if(kumP===null || harP===null) warnings.push("Angka Rekap PLN UID (kumulatif/harian) tidak lengkap.");
  if(iPadam<0) warnings.push("Bagian Daftar Penyulang Padam tidak ditemukan.");
  // jenis gangguan tidak ditulis: simpulkan dari angka harian
  const notes=[];
  const noJ = padam.filter(p=>!p.jenis);
  if(noJ.length){
    if(harP===0 && harS>0){ noJ.forEach(p=>p.jenis="SESAAT"); notes.push(`Jenis gangguan tidak ditulis; ${noJ.length} penyulang dicatat sesaat karena gangguan permanen harian 0.`); }
    else if(harP>0 && (harS===0 || noJ.length<=harP)){ noJ.forEach(p=>p.jenis="PERMANEN"); notes.push(`Jenis gangguan tidak ditulis; ${noJ.length} penyulang dicatat permanen (gangguan permanen harian ${harP}${harS?`, sesaat ${harS}`:""}).`); }
    else if(harP!==null) warnings.push(`Jenis gangguan (permanen/sesaat) tidak ditulis untuk ${noJ.length} penyulang dan tidak bisa disimpulkan dari angka harian (${harP} permanen / ${harS} sesaat); penyulang ini tidak ikut hitungan kronis.`);
  }
  if(harP!==null && padam.length > harP+(harS||0)) warnings.push(`Daftar penyulang padam berisi ${padam.length} baris, lebih banyak dari gangguan harian (${harP} permanen / ${harS} sesaat).`);
  if(kronisJumlah!==null && kronis.length!==kronisJumlah) warnings.push(`Jumlah penyulang kronis tertulis ${kronisJumlah}, tetapi rinciannya berisi ${kronis.length} baris.`);

  return {uid, tanggal, tanggalTeks, kumP, kumS, harP, harS, up3, padam, kronisJumlah, kronis, kolom:{padam:hdrPadam?hdrPadam.labels:null, kronis:hdrKronis?hdrKronis.labels:null, urutanAngka: swapNum?"Sesaat/Permanen":"Permanen/Sesaat"}, warnings, notes, raw:String(raw||"").trim()};
}

const $ = (id) => document.getElementById(id);
const SEC = $('lgp'); if (!SEC) return;
const UMAP = Object.fromEntries(UIDS.map((u) => [u.id, u]));
const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const fmt = (n) => (n == null || isNaN(n)) ? '–' : Number(n).toLocaleString('id-ID');
const mLabel = (ym) => { const [y, m] = ym.split('-'); return BLN[+m - 1] + ' ' + y; };
const dLabel = (d, short) => { if (!d) return '–'; const [y, m, dd] = d.split('-'); return (+dd) + ' ' + (short ? BLN[+m - 1].slice(0, 3) : BLN[+m - 1]) + ' ' + y; };
const key = (uid, tgl) => uid + '_' + tgl;
const uLabel = (id) => (UMAP[id] ? UMAP[id].id : id);
const todayWIB = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };
function el(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(typeof k === 'object' ? k : String(k)); }
  return e;
}

const S = { reports: new Map(), period: null, touched: false, uid: 'ALL', search: '', all: false, queue: [], loaded: false };
const setData = (arr) => { S.reports = new Map((arr || []).filter((r) => r && r.uid && r.tanggal).map((r) => [key(r.uid, r.tanggal), r])); };
const list = () => [...S.reports.values()].sort((a, b) => a.tanggal === b.tanggal ? a.uid.localeCompare(b.uid) : a.tanggal.localeCompare(b.tanggal));
const months = () => [...new Set(list().map((r) => r.tanggal.slice(0, 7)))].sort().reverse();
const shown = () => (S.uid === 'ALL' ? UIDS.map((u) => u.id) : [S.uid]);
const filtered = () => list().filter((r) => (S.period === 'ALL' || r.tanggal.slice(0, 7) === S.period) && (S.uid === 'ALL' || r.uid === S.uid));
const sum = (rs, k) => rs.reduce((a, r) => a + (Number(r[k]) || 0), 0);
const latest = (rs) => { const m = {}; rs.forEach((r) => { if (!m[r.uid] || r.tanggal > m[r.uid].tanggal) m[r.uid] = r; }); return m; };
const padamRows = (rs) => { const o = []; rs.forEach((r) => (r.padam || []).forEach((p) => o.push(Object.assign({ tanggal: r.tanggal, uid: r.uid }, p)))); return o; };
const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
function kronisCalc(rs) {
  const g = {};
  padamRows(rs).forEach((p) => { if (!/PERMANEN/i.test(p.jenis || '')) return;
    const k = p.tanggal.slice(0, 7) + '|' + p.uid + '|' + norm(p.penyulang);
    if (!g[k]) g[k] = { bulan: p.tanggal.slice(0, 7), uid: p.uid, penyulang: p.penyulang, ulp: p.ulp, up3: p.up3, kali: 0, tgl: [] };
    g[k].kali++; g[k].tgl.push(p.tanggal); });
  return Object.values(g).sort((a, b) => b.kali - a.kali || a.uid.localeCompare(b.uid));
}

// ---------- filter ----------
function paintFilters() {
  const ms = months();
  if (!S.touched && ms.length) S.period = ms[0];
  if (S.period === null || (S.period !== 'ALL' && !ms.includes(S.period))) S.period = ms[0] || 'ALL';
  const sel = $('lgp-f-bulan'); sel.replaceChildren(...ms.map((m) => el('option', { value: m, text: mLabel(m) })), el('option', { value: 'ALL', text: 'Semua periode' }));
  sel.value = S.period;
  const su = $('lgp-f-unit'); if (!su.options.length) su.append(el('option', { value: 'ALL', text: 'Semua UID' }), ...UIDS.map((u) => el('option', { value: u.id, text: 'UID ' + u.id })));
  su.value = S.uid;
}
$('lgp-f-bulan').addEventListener('change', (e) => { S.period = e.target.value; S.touched = true; render(); });
$('lgp-f-unit').addEventListener('change', (e) => { S.uid = e.target.value; render(); });
$('lgp-search').addEventListener('input', (e) => { S.search = e.target.value.trim().toLowerCase(); S.all = false; paintPadam(filtered()); });

// ---------- render ----------
function render() {
  paintFilters();
  const rs = filtered();
  paintHero(rs); paintTiles(rs);
  paintMatrix(S.period === 'ALL' ? (months()[0] || null) : S.period);
  paintUid(rs); paintTrend(rs); paintCause(rs); paintKronis(rs); paintPadam(rs);
}
function paintHero(rs) {
  const per = S.period === 'ALL' ? 'semua periode' : mLabel(S.period);
  const t = $('lgp-take'); t.classList.remove('dash-skeleton');
  if (!S.reports.size) { t.textContent = 'Belum ada laporan yang diunggah. Klik Upload laporan harian, lalu tempel teks laporan dari WhatsApp.'; }
  else {
    const P = sum(rs, 'harP'), Sx = sum(rs, 'harS'), kr = kronisCalc(rs).filter((k) => k.kali > 6).length;
    const byU = shown().map((u) => ({ u, p: sum(rs.filter((r) => r.uid === u), 'harP') })).sort((a, b) => b.p - a.p)[0];
    const b = (s) => el('b', { text: s });
    t.replaceChildren(...[`${per[0].toUpperCase() + per.slice(1)}: dari `, b(fmt(rs.length) + ' laporan'), ' yang diunggah tercatat ', b(fmt(P) + ' gangguan permanen'), ' dan ', b(fmt(Sx) + ' sesaat'), '.',
      byU && byU.p ? [' Permanen terbanyak di ', b('UID ' + byU.u + ' (' + fmt(byU.p) + ')'), '.'] : '',
      kr ? [' ', b(fmt(kr) + ' penyulang'), ' sudah padam permanen lebih dari 6 kali dalam sebulan.'] : ''].flat());
  }
  // status unggah per UID untuk tanggal laporan terbaru
  const all = list(); const last = all.length ? all[all.length - 1].tanggal : null;
  const box = $('lgp-today'); box.replaceChildren();
  const n = last ? UIDS.filter((u) => S.reports.has(key(u.id, last))).length : 0;
  box.append(el('div', { class: 'lgp-today-h' }, el('b', { text: last ? 'Laporan ' + dLabel(last) : 'Status unggah laporan' }), el('span', { class: 'ss-note', text: last ? `${n} dari ${UIDS.length} UID sudah masuk` : 'Belum ada laporan' })));
  const ul = el('div', { class: 'lgp-today-list' });
  UIDS.forEach((u) => { const r = last && S.reports.get(key(u.id, last));
    ul.append(el('button', { type: 'button', title: r ? 'Lihat laporan' : 'Unggah laporan UID ' + u.id, onclick: () => (r ? openReport(r) : startUpload(u.id, last)) },
      el('b', { text: 'UID ' + u.id }), r ? el('span', { class: 'lgp-st ' + (r.harP > 0 ? 'k' : 'ok'), text: `P ${fmt(r.harP)} · S ${fmt(r.harS)}` }) : el('span', { class: 'lgp-st no', text: 'Belum masuk' }))); });
  box.append(ul);
}
function tile(label, val, unit, sub) { return el('div', { class: 'ss-tile' }, el('div', { class: 'ss-tile-label', text: label }), el('div', { class: 'ss-big' }, el('span', { text: val }), unit ? el('span', { class: 'ss-unit', text: unit }) : null), el('div', { class: 'ss-sub', text: sub })); }
function paintTiles(rs) {
  const per = S.period === 'ALL' ? 'semua periode' : mLabel(S.period);
  const kr = kronisCalc(rs).filter((k) => k.kali > 6).length; const days = new Set(rs.map((r) => r.tanggal)).size;
  $('lgp-kpi').replaceChildren(
    tile('Gangguan permanen (akumulasi)', fmt(sum(rs, 'harP')), 'kali', 'Jumlah angka harian, ' + per),
    tile('Gangguan sesaat (akumulasi)', fmt(sum(rs, 'harS')), 'kali', 'Jumlah angka harian, ' + per),
    tile('Laporan masuk', fmt(rs.length), 'laporan', `${days} hari tercatat · ${shown().length} UID`),
    tile('Penyulang kronis', fmt(kr), 'penyulang', 'Padam permanen > 6 kali dalam sebulan, dihitung dari daftar padam yang diunggah'));
}
function paintMatrix(ym) {
  const box = $('lgp-mx'); box.replaceChildren();
  if (!ym) { box.append(el('p', { class: 'lgp-empty', text: 'Belum ada laporan.' })); return; }
  const [y, m] = ym.split('-').map(Number); const nd = new Date(Date.UTC(y, m, 0)).getUTCDate(); const td = todayWIB();
  const hr = el('tr', {}, el('th', { class: 'u', text: mLabel(ym) }));
  for (let d = 1; d <= nd; d++) hr.append(el('th', { text: d }));
  hr.append(el('th', { text: 'Masuk' }));
  const tb = el('tbody');
  shown().forEach((u) => {
    const tr = el('tr', {}, el('th', { class: 'u', text: 'UID ' + u })); let c = 0;
    for (let d = 1; d <= nd; d++) {
      const ds = `${ym}-${String(d).padStart(2, '0')}`; const r = S.reports.get(key(u, ds)); const fut = ds > td; if (r) c++;
      const lab = r ? `UID ${u}, ${dLabel(ds)}: permanen ${fmt(r.harP)}, sesaat ${fmt(r.harS)}` : `UID ${u}, ${dLabel(ds)}: belum ada laporan`;
      tr.append(el('td', {}, el('button', { type: 'button', class: 'lgp-cell' + (r ? ' has' : '') + (r && r.harP > 0 ? ' p' : '') + (fut && !r ? ' fut' : ''), title: lab, 'aria-label': lab,
        onclick: () => { if (r) openReport(r); else if (!fut) startUpload(u, ds); } })));
    }
    tr.append(el('td', { class: 'n', text: c + '/' + nd })); tb.append(tr);
  });
  box.append(el('table', { class: 'lgp-mx' }, el('thead', {}, hr), tb));
}
function paintUid(rs) {
  const L = latest(rs), kc = kronisCalc(rs).filter((k) => k.kali > 6);
  const t = $('lgp-uid'); const tot = { n: 0, P: 0, S: 0, kP: 0, kS: 0, kr: 0, kc: 0 };
  const head = el('tr', {}, ...['UID', 'Laporan', 'Laporan terakhir', 'Akumulasi permanen', 'Akumulasi sesaat', 'Harian terakhir P / S', 'Kumulatif terlapor P / S', 'Kronis terlapor', 'Kronis hitungan'].map((h, i) => el('th', { class: i === 0 || i === 2 ? 'l' : null, text: h })));
  const tb = el('tbody');
  shown().forEach((u) => {
    const r = rs.filter((x) => x.uid === u), l = L[u], P = sum(r, 'harP'), Sx = sum(r, 'harS'), k = kc.filter((x) => x.uid === u).length;
    tot.n += r.length; tot.P += P; tot.S += Sx; tot.kc += k; if (l) { tot.kP += l.kumP || 0; tot.kS += l.kumS || 0; tot.kr += l.kronisJumlah || 0; }
    tb.append(el('tr', { class: l && S.uid === 'ALL' ? 'lgp-click' : null, title: l && S.uid === 'ALL' ? 'Tampilkan UID ' + u : null, onclick: l && S.uid === 'ALL' ? () => { S.uid = u; render(); } : null },
      el('td', {}, el('b', { text: 'UID ' + u })), el('td', { text: fmt(r.length) }), el('td', { class: 'l' }, l ? dLabel(l.tanggal, 1) : el('span', { class: 'lgp-st no', text: 'Belum ada' })),
      el('td', { class: r.length ? 'k' : 'gx-zero', text: r.length ? fmt(P) : '–' }), el('td', { class: r.length ? 's' : 'gx-zero', text: r.length ? fmt(Sx) : '–' }),
      el('td', { text: l ? `${fmt(l.harP)} / ${fmt(l.harS)}` : '–' }), el('td', { text: l ? `${fmt(l.kumP)} / ${fmt(l.kumS)}` : '–' }),
      el('td', {}, l && l.kronisJumlah ? el('span', { class: 'lgp-st w', text: fmt(l.kronisJumlah) }) : (l ? '0' : '–')),
      el('td', {}, k ? el('span', { class: 'gx-pill k', text: fmt(k) }) : '0')));
  });
  const parts = [el('thead', {}, head), tb];
  if (shown().length > 1) parts.push(el('tbody', {}, el('tr', { class: 'ss-g-tot' }, el('td', { text: 'SUMKAL' }), el('td', { text: fmt(tot.n) }), el('td', {}),
    el('td', { class: 'k', text: fmt(tot.P) }), el('td', { class: 's', text: fmt(tot.S) }), el('td', {}), el('td', { text: `${fmt(tot.kP)} / ${fmt(tot.kS)}` }), el('td', { text: fmt(tot.kr) }), el('td', { text: fmt(tot.kc) }))));
  t.replaceChildren(...parts);
  $('lgp-uid-reset').hidden = S.uid === 'ALL';
}
function paintTrend(rs) {
  const box = $('lgp-trend'); box.classList.remove('dash-skeleton'); box.replaceChildren();
  let dates;
  if (S.period !== 'ALL') { const [y, m] = S.period.split('-').map(Number); const nd = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const last = rs.length ? Math.max(...rs.map((r) => +r.tanggal.slice(8, 10))) : nd; dates = []; for (let d = 1; d <= last; d++) dates.push(`${S.period}-${String(d).padStart(2, '0')}`); }
  else dates = [...new Set(rs.map((r) => r.tanggal))].sort();
  if (!dates.length || !window.d3) { box.append(el('p', { class: 'lgp-empty', text: 'Belum ada data.' })); return; }
  const rows = dates.map((d) => { const x = rs.filter((r) => r.tanggal === d); return { d, p: sum(x, 'harP'), s: sum(x, 'harS'), n: x.length }; });
  const d3 = window.d3, W = Math.max(280, box.clientWidth || 600), H = 280, M = { t: 18, r: 8, b: 26, l: 36 };
  const x = d3.scaleBand().domain(dates).range([M.l, W - M.r]).padding(0.22);
  const ymax = d3.max(rows, (r) => r.p + r.s) || 1; const y = d3.scaleLinear().domain([0, ymax]).nice().range([H - M.b, M.t]);
  const svg = d3.select(box).append('svg').attr('width', W).attr('height', H).attr('role', 'img').attr('aria-label', 'Tren gangguan harian permanen dan sesaat');
  svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', M.l).attr('x2', W - M.r).attr('y1', y).attr('y2', y).attr('stroke', 'var(--cds-chart-grid, #e5e7eb)');
  svg.append('g').selectAll('text').data(y.ticks(5)).join('text').attr('x', M.l - 6).attr('y', (v) => y(v) + 3).attr('text-anchor', 'end').attr('font-size', 10.5).attr('fill', 'var(--color-fg-muted)').text((v) => fmt(v));
  const every = Math.ceil(dates.length / Math.max(1, Math.floor((W - M.l) / 26)));
  svg.append('g').selectAll('text').data(dates.filter((_, i) => i % every === 0)).join('text').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', H - 8).attr('text-anchor', 'middle').attr('font-size', 10.5).attr('fill', 'var(--color-fg-muted)')
    .text((d) => (S.period === 'ALL' ? dLabel(d, 1).replace(/ \d{4}$/, '') : +d.slice(8, 10)));
  const g = svg.append('g');
  g.selectAll('rect.p').data(rows).join('rect').attr('x', (r) => x(r.d)).attr('width', x.bandwidth()).attr('y', (r) => y(r.p)).attr('height', (r) => y(0) - y(r.p)).attr('fill', '#B3261E').attr('rx', 1.5);
  g.selectAll('rect.s').data(rows).join('rect').attr('x', (r) => x(r.d)).attr('width', x.bandwidth()).attr('y', (r) => y(r.p + r.s)).attr('height', (r) => y(r.p) - y(r.p + r.s)).attr('fill', '#E9A23B').attr('rx', 1.5);
  if (x.bandwidth() >= 14) g.selectAll('text').data(rows.filter((r) => r.p + r.s > 0)).join('text').attr('x', (r) => x(r.d) + x.bandwidth() / 2).attr('y', (r) => y(r.p + r.s) - 4).attr('text-anchor', 'middle').attr('font-size', 10).attr('fill', 'var(--color-fg)').text((r) => fmt(r.p + r.s));
  const tip = el('div', { class: 'ss-tip', hidden: true }); box.style.position = 'relative'; box.append(tip);
  svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r.d) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', M.t).attr('height', H - M.t - M.b).attr('fill', 'transparent')
    .on('mousemove', (ev, r) => { tip.hidden = false;
      tip.replaceChildren(el('div', { class: 'ss-tip-h', text: dLabel(r.d) + ' · ' + r.n + ' laporan' }),
        el('div', { class: 'ss-row' }, el('span', {}, el('i', { class: 'lgp-sw', style: 'background:#B3261E;border-color:#B3261E' }), 'Permanen'), el('b', { text: fmt(r.p) })),
        el('div', { class: 'ss-row' }, el('span', {}, el('i', { class: 'lgp-sw', style: 'background:#E9A23B;border-color:#E9A23B' }), 'Sesaat'), el('b', { text: fmt(r.s) })));
      const bx = box.getBoundingClientRect(); let lx = ev.clientX - bx.left + 12; if (lx > bx.width - 150) lx = ev.clientX - bx.left - 150; tip.style.left = lx + 'px'; tip.style.top = Math.max(0, ev.clientY - bx.top - 30) + 'px'; })
    .on('mouseleave', () => { tip.hidden = true; });
}
function paintCause(rs) {
  const g = {}; padamRows(rs).forEach((p) => { const lab = (p.penyebab || 'Tidak disebutkan').trim(); const c = (lab.match(/^([A-Z]\d+)/) || [])[1] || lab; if (!g[c]) g[c] = { lab, n: 0 }; g[c].n++; });
  const rows = Object.values(g).sort((a, b) => b.n - a.n); const t = $('lgp-cause');
  if (!rows.length) { t.replaceChildren(el('tbody', {}, el('tr', {}, el('td', { class: 'lgp-empty l', text: 'Belum ada penyulang padam pada pilihan ini.' })))); return; }
  const max = rows[0].n, tot = rows.reduce((a, r) => a + r.n, 0);
  t.replaceChildren(el('thead', {}, el('tr', {}, el('th', { text: 'Temuan / penyebab' }), el('th', { text: 'Kali' }), el('th', { class: 'l', text: 'Porsi' }))),
    el('tbody', {}, rows.map((r) => el('tr', {}, el('td', { class: 'wrap', text: r.lab }), el('td', {}, el('b', { text: fmt(r.n) })),
      el('td', { class: 'l' }, el('span', { class: 'lgp-bar' }, el('i', { style: `width:${Math.max(4, Math.round(r.n / max * 90))}px` }), Math.round(r.n / tot * 100) + '%'))))));
}
function paintKronis(rs) {
  const all = kronisCalc(rs), show = all.filter((k) => k.kali >= 4), t = $('lgp-kronis');
  $('lgp-kronis-note').textContent = all.some((k) => k.kali > 6) ? '' : (show.length ? `Belum ada yang melewati 6 kali. ${show.length} penyulang sudah padam 4–6 kali dan perlu diawasi.` : 'Belum ada penyulang yang padam permanen 4 kali atau lebih dalam sebulan pada data yang diunggah.');
  t.hidden = !show.length;
  t.replaceChildren(el('thead', {}, el('tr', {}, ...['Status', 'Bulan', 'UID', 'Penyulang', 'ULP', 'UP3', 'Kali padam', 'Tanggal padam'].map((h, i) => el('th', { class: i === 6 ? null : 'l', text: h })))),
    el('tbody', {}, show.map((k) => el('tr', {}, el('td', { class: 'l' }, el('span', { class: 'lgp-st ' + (k.kali > 6 ? 'k' : 'w'), text: k.kali > 6 ? 'Kronis' : 'Waspada' })),
      el('td', { class: 'l', text: mLabel(k.bulan) }), el('td', { class: 'l', text: 'UID ' + k.uid }), el('td', { class: 'l' }, el('b', { text: k.penyulang })), el('td', { class: 'l', text: k.ulp }), el('td', { class: 'l', text: k.up3 }),
      el('td', {}, el('span', { class: 'gx-pill ' + (k.kali > 6 ? 'k' : 's'), text: fmt(k.kali) })), el('td', { class: 'l wrap', text: k.tgl.map((d) => +d.slice(8, 10)).join(', ') })))));
  // versi laporan UID
  const L = latest(rs), r2 = $('lgp-kronis-rep'), body = el('tbody');
  shown().forEach((u) => { const l = L[u]; if (!l) return; const ks = l.kronis || [];
    if (!ks.length) body.append(el('tr', {}, el('td', { class: 'l' }, el('b', { text: 'UID ' + u })), el('td', { class: 'l', text: dLabel(l.tanggal, 1) }), el('td', { text: fmt(l.kronisJumlah || 0) }),
      el('td', { class: 'l', colspan: '4' }, (l.kronisJumlah || 0) > 0 ? el('span', { class: 'lgp-st w', text: 'Rincian tidak dicantumkan di laporan' }) : el('span', { class: 'gx-zero', text: 'Tidak ada' }))));
    else ks.forEach((k, i) => body.append(el('tr', {}, el('td', { class: 'l' }, i ? '' : el('b', { text: 'UID ' + u })), el('td', { class: 'l', text: i ? '' : dLabel(l.tanggal, 1) }), el('td', { text: i ? '' : fmt(l.kronisJumlah != null ? l.kronisJumlah : ks.length) }),
      el('td', { class: 'l' }, el('b', { text: k.penyulang })), el('td', { class: 'l', text: k.ulp }), el('td', { class: 'l', text: k.up3 }), el('td', { text: k.totalS != null ? `${fmt(k.totalP)} / ${fmt(k.totalS)}` : fmt(k.total) })))); });
  r2.replaceChildren(el('thead', {}, el('tr', {}, ...['UID', 'Tanggal laporan', 'Jumlah terlapor', 'Penyulang', 'ULP', 'UP3', 'Total kali padam'].map((h, i) => el('th', { class: [0, 1, 3, 4, 5].includes(i) ? 'l' : null, text: h })))),
    body.children.length ? body : el('tbody', {}, el('tr', {}, el('td', { class: 'lgp-empty l', colspan: '7', text: 'Belum ada laporan.' }))));
}
function paintPadam(rs) {
  const cnt = {}; padamRows(rs).forEach((p) => { if (!/PERMANEN/i.test(p.jenis || '')) return; const k = p.uid + '|' + norm(p.penyulang) + '|' + p.tanggal.slice(0, 7); cnt[k] = (cnt[k] || 0) + 1; });
  let rows = padamRows(rs).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.uid.localeCompare(b.uid));
  if (S.search) rows = rows.filter((p) => [p.penyulang, p.ulp, p.up3, p.penyebab, p.zona, p.uid].join(' ').toLowerCase().includes(S.search));
  const lim = S.all ? rows.length : 50, t = $('lgp-padam');
  t.replaceChildren(el('thead', {}, el('tr', {}, ...['Tanggal', 'UID', 'Nama penyulang', 'ULP', 'UP3', 'Jenis', 'Temuan / penyebab', 'Zona / lainnya', 'Padam permanen bulan itu'].map((h, i) => el('th', { class: i === 8 ? null : 'l', text: h })))),
    el('tbody', {}, rows.length ? rows.slice(0, lim).map((p) => { const c = cnt[p.uid + '|' + norm(p.penyulang) + '|' + p.tanggal.slice(0, 7)] || 0;
      return el('tr', {}, el('td', { class: 'l', text: dLabel(p.tanggal, 1) }), el('td', { class: 'l', text: 'UID ' + p.uid }), el('td', { class: 'l' }, el('b', { text: p.penyulang })), el('td', { class: 'l', text: p.ulp }), el('td', { class: 'l', text: p.up3 }),
        el('td', { class: 'l' }, el('span', { class: 'lgp-st ' + (/PERMANEN/.test(p.jenis || '') ? 'k' : /SESAAT/.test(p.jenis || '') ? 'w' : 'no'), text: p.jenis || 'Tidak disebut' })), el('td', { class: 'l wrap', text: p.penyebab }), el('td', { class: 'l', text: [p.zona, p.lain].filter(Boolean).join(' · ') }),
        el('td', {}, c ? el('span', { class: 'gx-pill ' + (c > 6 ? 'k' : c >= 4 ? 's' : ''), style: c >= 4 ? null : 'color:var(--color-fg);background:color-mix(in srgb,var(--color-fg) 8%,transparent)', text: fmt(c) }) : el('span', { class: 'gx-zero', text: '–' }))); })
      : el('tr', {}, el('td', { class: 'lgp-empty l', colspan: '9', text: S.search ? 'Tidak ada penyulang yang cocok dengan pencarian.' : 'Belum ada penyulang padam pada pilihan ini.' }))));
  const more = $('lgp-padam-more'); more.hidden = rows.length <= lim; more.textContent = `Tampilkan semua (${fmt(rows.length)} baris)`;
  $('lgp-padam-n').textContent = rows.length ? `${fmt(Math.min(lim, rows.length))} dari ${fmt(rows.length)} baris` : '';
}
$('lgp-padam-more').addEventListener('click', () => { S.all = true; paintPadam(filtered()); });
$('lgp-uid-reset').addEventListener('click', () => { S.uid = 'ALL'; render(); });

// ---------- detail laporan ----------
function detailTables(r) {
  const wrap = el('div', { style: 'display:grid;gap:10px' });
  wrap.append(el('div', { class: 'lgp-kv' }, el('span', {}, 'Kumulatif P / S ', el('b', { text: `${fmt(r.kumP)} / ${fmt(r.kumS)}` })), el('span', {}, 'Harian P / S ', el('b', { text: `${fmt(r.harP)} / ${fmt(r.harS)}` })), el('span', {}, 'Kronis terlapor ', el('b', { text: fmt(r.kronisJumlah == null ? 0 : r.kronisJumlah) }))));
  if (r.kolom && (r.kolom.padam || r.kolom.kronis)) wrap.append(el('ul', { class: 'lgp-notes' },
    r.kolom.padam ? el('li', { text: 'Kolom daftar penyulang padam (dari Keterangan): ' + r.kolom.padam.join(' | ') }) : null,
    r.kolom.kronis ? el('li', { text: 'Kolom daftar penyulang kronis (dari Keterangan): ' + r.kolom.kronis.join(' | ') }) : null,
    el('li', { text: 'Urutan angka: ' + (r.kolom.urutanAngka || 'Permanen/Sesaat') })));
  const tbl = (heads, rows) => el('div', { class: 'ss-g-wrap' }, el('table', { class: 'ss-table lgp-table' }, el('thead', {}, el('tr', {}, heads.map(([h, l]) => el('th', { class: l ? 'l' : null, text: h })))), el('tbody', {}, rows)));
  if ((r.up3 || []).length) wrap.append(tbl([['UP3', 1], ['Kumulatif P'], ['Kumulatif S'], ['Harian P'], ['Harian S']], r.up3.map((u) => el('tr', {}, el('td', { class: 'l', text: u.nama }), el('td', { text: fmt(u.kumP) }), el('td', { text: fmt(u.kumS) }), el('td', { text: fmt(u.harP) }), el('td', { text: fmt(u.harS) })))));
  wrap.append(el('b', { text: `Penyulang padam (${(r.padam || []).length})` }));
  if ((r.padam || []).length) wrap.append(tbl([['Penyulang', 1], ['ULP', 1], ['UP3', 1], ['Jenis', 1], ['Penyebab', 1], ['Zona / lainnya', 1]], r.padam.map((p) => el('tr', {}, el('td', { class: 'l' }, el('b', { text: p.penyulang })), el('td', { class: 'l', text: p.ulp }), el('td', { class: 'l', text: p.up3 }), el('td', { class: 'l', text: p.jenis }), el('td', { class: 'l wrap', text: p.penyebab }), el('td', { class: 'l', text: [p.zona, p.lain].filter(Boolean).join(' · ') })))));
  wrap.append(el('b', { text: `Penyulang kronis (${(r.kronis || []).length} baris rincian)` }));
  if ((r.kronis || []).length) wrap.append(tbl([['Penyulang', 1], ['ULP', 1], ['UP3', 1], ['Total padam']], r.kronis.map((k) => el('tr', {}, el('td', { class: 'l' }, el('b', { text: k.penyulang })), el('td', { class: 'l', text: k.ulp }), el('td', { class: 'l', text: k.up3 }), el('td', { text: k.totalS != null ? `${fmt(k.totalP)} / ${fmt(k.totalS)}` : fmt(k.total) })))));
  else if ((r.kronisJumlah || 0) > 0) wrap.append(el('p', { class: 'ss-note', text: `Laporan menyebut ${r.kronisJumlah} penyulang kronis tanpa rincian.` }));
  return wrap;
}
function openReport(r) {
  const close = () => { back.remove(); document.removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const back = el('div', { class: 'lgp-back', onclick: (e) => { if (e.target === back) close(); } },
    el('div', { class: 'lgp-dlg', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Detail laporan' },
      el('div', { class: 'dp-head' }, el('div', {}, el('h3', { text: `UID ${r.uid} · ${dLabel(r.tanggal)}` }), el('span', { class: 'ss-note', text: (r.tanggalTeks || '') + (r.diunggah ? ` · diunggah ${dLabel(r.diunggah.slice(0, 10), 1)}${r.oleh ? ' oleh ' + r.oleh : ''}` : '') })),
        el('div', { class: 'h-up-row' }, el('button', { type: 'button', class: 'h-act', text: 'Ganti laporan', onclick: () => { close(); startUpload(r.uid, r.tanggal); } }), el('button', { type: 'button', class: 'h-act h-act-primary', text: 'Tutup', onclick: close }))),
      (r.warnings || []).length ? el('ul', { class: 'lgp-warn' }, r.warnings.map((w) => el('li', { text: w }))) : null,
      (r.notes || []).length ? el('ul', { class: 'lgp-notes' }, r.notes.map((w) => el('li', { text: w }))) : null,
      detailTables(r)));
  document.addEventListener('keydown', esc); SEC.append(back); back.querySelector('.h-act-primary').focus();
}

// ---------- unggah ----------
const panel = $('lgp-upload'), btnUp = $('lgp-btn-update');
const openPanel = (on) => { panel.hidden = !on; btnUp.setAttribute('aria-expanded', String(on)); };
btnUp.addEventListener('click', () => openPanel(panel.hidden));
(() => { const su = $('lgp-u-uid'); su.append(el('option', { value: '', text: 'Baca dari teks' }), ...UIDS.map((u) => el('option', { value: u.id, text: 'UID ' + u.id }))); })();
function startUpload(uid, tgl) { openPanel(true); $('lgp-u-uid').value = uid || ''; $('lgp-u-tgl').value = tgl || ''; panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => $('lgp-text').focus(), 300); }
function addText(text, src) {
  const pu = $('lgp-u-uid').value, pd = $('lgp-u-tgl').value;
  splitReports(text).forEach((part) => { if (!part.trim()) return; const r = parseReport(part); delete r.raw;
    if (!r.uid && pu) { r.uid = pu; r.warnings = r.warnings.filter((w) => !/^UID/.test(w)); }
    else if (r.uid && pu && pu !== r.uid) r.warnings.push(`UID di teks (${r.uid}) berbeda dengan pilihan (${pu}). Yang dipakai UID dari teks; ubah di bawah bila perlu.`);
    if (!r.tanggal && pd) { r.tanggal = pd; r.warnings = r.warnings.filter((w) => !/^Tanggal/.test(w)); }
    r._src = src; r._k = Math.random().toString(36).slice(2); S.queue.push(r); });
  paintQueue();
}
$('lgp-read').addEventListener('click', () => { const t = $('lgp-text').value; if (!t.trim()) { msg('Tempel teks laporan terlebih dahulu.', true); return; } msg(''); addText(t, 'Teks ditempel'); $('lgp-text').value = ''; });
const fileIn = $('lgp-file'), drop = $('lgp-drop');
const readFiles = async (fs) => { for (const f of fs) { try { addText(await f.text(), f.name); } catch (e) { msg('File ' + f.name + ' tidak bisa dibaca.', true); } } };
fileIn.addEventListener('change', () => { readFiles([...fileIn.files]); fileIn.value = ''; });
drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); } });
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files; if (f && f.length) readFiles([...f]); });
const msg = (t, bad) => { const m = $('lgp-up-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad); };
function paintQueue() {
  const box = $('lgp-queue'); box.replaceChildren(); $('lgp-review').hidden = !S.queue.length;
  const ready = S.queue.filter((r) => r.uid && r.tanggal).length;
  $('lgp-apply').textContent = ready > 1 ? `Terapkan ${ready} laporan ke dashboard` : 'Terapkan ke dashboard';
  $('lgp-apply').disabled = !ready;
  S.queue.forEach((r, i) => {
    const su = el('select', { id: 'lgp-q-u-' + r._k }, el('option', { value: '', text: 'Pilih UID' }), UIDS.map((u) => el('option', { value: u.id, text: 'UID ' + u.id }))); su.value = r.uid || '';
    su.addEventListener('change', () => { r.uid = su.value || null; paintQueue(); });
    const di = el('input', { type: 'date', id: 'lgp-q-d-' + r._k, value: r.tanggal || '' }); di.addEventListener('change', () => { r.tanggal = di.value || null; paintQueue(); });
    const ok = r.uid && r.tanggal, ex = ok && S.reports.has(key(r.uid, r.tanggal));
    const dup = ok && S.queue.some((q) => q !== r && q.uid === r.uid && q.tanggal === r.tanggal);
    const w = [...r.warnings]; if (ex) w.push('Laporan UID dan tanggal ini sudah ada. Menerapkan akan menggantikan laporan lama, bukan menambah.'); if (dup) w.push('Ada laporan lain di antrian dengan UID dan tanggal yang sama; yang terakhir yang dipakai.');
    box.append(el('div', { class: 'lgp-qi' },
      el('div', { class: 'lgp-qh' }, el('div', { class: 'lgp-preset' }, el('label', { class: 'lgp-fld', for: 'lgp-q-u-' + r._k }, 'UID', su), el('label', { class: 'lgp-fld', for: 'lgp-q-d-' + r._k }, 'Tanggal laporan', di),
        el('span', { class: 'lgp-st ' + (!ok ? 'k' : ex ? 'w' : 'ok'), text: !ok ? 'Belum lengkap' : ex ? 'Menggantikan laporan lama' : 'Siap' })),
        el('div', { class: 'h-up-row' }, el('span', { class: 'ss-note', text: r._src }), el('button', { type: 'button', class: 'h-act', text: 'Buang', onclick: () => { S.queue.splice(i, 1); paintQueue(); } }))),
      w.length ? el('ul', { class: 'lgp-warn' }, w.map((x) => el('li', { text: x }))) : null,
      (r.notes || []).length ? el('ul', { class: 'lgp-notes' }, r.notes.map((x) => el('li', { text: x }))) : null, detailTables(r)));
  });
}
$('lgp-cancel').addEventListener('click', () => { S.queue = []; paintQueue(); msg(''); });
const asJs = (arr) => 'window.__D=window.__D||{};window.__D["gangguan_harian"]=' + JSON.stringify(arr) + ';\n';
const clean = (r) => ({ uid: r.uid, tanggal: r.tanggal, tanggalTeks: r.tanggalTeks || '', kumP: r.kumP, kumS: r.kumS, harP: r.harP, harS: r.harS, up3: r.up3 || [], padam: r.padam || [], kronisJumlah: r.kronisJumlah, kronis: r.kronis || [], kolom: r.kolom || null, warnings: r.warnings || [], notes: r.notes || [], diunggah: new Date().toISOString(), oleh: (window.SSAdmin && window.SSAdmin.name && window.SSAdmin.name()) || '' });
const sortArr = (a) => a.sort((x, y) => x.tanggal === y.tanggal ? x.uid.localeCompare(y.uid) : x.tanggal.localeCompare(y.tanggal));
$('lgp-apply').addEventListener('click', async () => {
  const ready = S.queue.filter((r) => r.uid && r.tanggal); if (!ready.length) return;
  const add = ready.map(clean); const btn = $('lgp-apply');
  const merge = (base) => { const m = new Map((base || []).map((r) => [key(r.uid, r.tanggal), r])); add.forEach((r) => m.set(key(r.uid, r.tanggal), r)); return sortArr([...m.values()]); };
  const A = window.SSAdmin; let saved = false, why = '';
  if (A && A.isAdmin()) {
    btn.disabled = true; msg('Menyimpan ke repo…');
    try {
      let cur = null; try { const txt = await A.get('gangguan_harian.js'); const m = txt && /=\s*(\[[\s\S]*\])\s*;?\s*$/.exec(txt); cur = m ? JSON.parse(m[1]) : []; } catch (e) { cur = null; }
      const arr = merge(cur || list());
      const lbl = add.map((r) => r.uid + ' ' + r.tanggal).slice(0, 4).join(', ') + (add.length > 4 ? ` dan ${add.length - 4} lainnya` : '');
      await A.put('gangguan_harian.js', asJs(arr), `Laporan gangguan penyulang harian: ${lbl} (dari dashboard)`);
      saved = true; setData(arr); window.__D.gangguan_harian = arr;
      try { const t = await A.get('info_update.js'); const m = t && /=\s*(\[[\s\S]*\])\s*;?\s*$/.exec(t); const info = m ? JSON.parse(m[1]) : [];
        const ent = infoEntry(arr, true); const j = info.findIndex((x) => x.tab === 'lgp'); if (j >= 0) info[j] = ent; else info.push(ent);
        await A.put('info_update.js', 'window.__D=window.__D||{};window.__D["info_update"]=' + JSON.stringify(info) + ';\n', 'Update info database laporan gangguan penyulang'); window.__D.info_update = info; } catch (e) { /* tanggal update tidak tersimpan; data tetap tersimpan */ }
    } catch (e) { why = e && e.code === 'gh-403' ? ' Token GitHub admin belum punya izin menulis ke repo ini (Contents: Read and write).' : e && e.code === 'gh-401' ? ' Token GitHub admin sudah tidak berlaku. Atur ulang admin di admin-setup.html.' : ' ' + ((e && e.message) || ''); }
    btn.disabled = false;
  }
  if (!saved) setData(merge(list()));
  const ent = infoEntry(list(), saved); if (window.SSDbInfo && window.SSDbInfo.set) window.SSDbInfo.set('lgp', ent.diperbarui, ent.periode, ent.sumber);
  S.queue = []; paintQueue(); S.touched = false; render();
  msg(saved ? `${add.length} laporan diterapkan dan disimpan ke repo. Pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).`
    : `${add.length} laporan sudah tampil di layar ini, tetapi BELUM TERSIMPAN; bila halaman dimuat ulang, laporan ini hilang.${why || ' Belum login admin: buka menu akun (kanan atas) → Masuk sebagai admin, lalu unggah ulang.'}`, !saved);
});
function infoEntry(arr, saved) {
  const ds = arr.map((r) => r.tanggal).sort(); const per = ds.length ? (ds[0] === ds[ds.length - 1] ? dLabel(ds[0]) : `${dLabel(ds[0])} – ${dLabel(ds[ds.length - 1])}`) : '–';
  return { tab: 'lgp', diperbarui: new Date().toISOString(), periode: per, sumber: `${arr.length} laporan harian gangguan penyulang UID (WAG Kehandalan Distribusi SUMKAL)` + (saved ? ' (diunggah di dashboard)' : ' (hanya di layar ini, belum tersimpan)') };
}

// ---------- unduh Excel ----------
const loadXlsx = () => window.XLSX ? Promise.resolve(window.XLSX) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('pustaka Excel gagal dimuat')); document.head.appendChild(s); });
$('lgp-btn-xlsx').addEventListener('click', async () => {
  const b = $('lgp-btn-xlsx'), m = $('lgp-act-msg'); b.disabled = true; m.textContent = 'Menyiapkan Excel…';
  try {
    const X = await loadXlsx(); const rs = filtered(), L = latest(rs), kc = kronisCalc(rs); const wb = X.utils.book_new();
    const add = (n, rows) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(rows), n);
    const per = S.period === 'ALL' ? 'Semua periode' : mLabel(S.period);
    add('Rekap UID', [['Rekap gangguan penyulang per UID · ' + per], [], ['UID', 'Laporan masuk', 'Laporan terakhir', 'Akumulasi permanen', 'Akumulasi sesaat', 'Akumulasi total', 'Kumulatif terlapor permanen', 'Kumulatif terlapor sesaat', 'Kronis terlapor', 'Kronis hitungan dashboard'],
      ...shown().map((u) => { const r = rs.filter((x) => x.uid === u), l = L[u], P = sum(r, 'harP'), Sx = sum(r, 'harS'); return ['UID ' + u, r.length, l ? l.tanggal : '', P, Sx, P + Sx, l ? l.kumP : '', l ? l.kumS : '', l ? (l.kronisJumlah || 0) : '', kc.filter((k) => k.uid === u && k.kali > 6).length]; })]);
    add('Harian', [['Tanggal', 'UID', 'Kumulatif permanen', 'Kumulatif sesaat', 'Harian permanen', 'Harian sesaat'], ...rs.map((r) => [r.tanggal, 'UID ' + r.uid, r.kumP, r.kumS, r.harP, r.harS])]);
    const up = [['Tanggal', 'UID', 'UP3', 'Kumulatif permanen', 'Kumulatif sesaat', 'Harian permanen', 'Harian sesaat']]; rs.forEach((r) => (r.up3 || []).forEach((u) => up.push([r.tanggal, 'UID ' + r.uid, u.nama, u.kumP, u.kumS, u.harP, u.harS]))); add('Rekap UP3', up);
    add('Penyulang Padam', [['Tanggal', 'UID', 'Nama Penyulang', 'ULP', 'UP3', 'Jenis Gangguan', 'Temuan/Penyebab Gangguan', 'Zona', 'Kolom lain'], ...padamRows(rs).map((p) => [p.tanggal, 'UID ' + p.uid, p.penyulang, p.ulp, p.up3, p.jenis, p.penyebab, p.zona, p.lain || ''])]);
    const kr = [['Tanggal laporan', 'UID', 'Jumlah kronis terlapor', 'Nama Penyulang', 'ULP', 'UP3', 'Total Kali Padam']];
    rs.forEach((r) => { if ((r.kronis || []).length) r.kronis.forEach((k) => kr.push([r.tanggal, 'UID ' + r.uid, r.kronisJumlah, k.penyulang, k.ulp, k.up3, k.totalS != null ? `${k.totalP} / ${k.totalS}` : k.total])); else kr.push([r.tanggal, 'UID ' + r.uid, r.kronisJumlah || 0, (r.kronisJumlah || 0) > 0 ? '(rincian tidak dicantumkan)' : '', '', '', '']); });
    add('Kronis Terlapor', kr);
    add('Kronis Hitungan', [['Bulan', 'UID', 'Nama Penyulang', 'ULP', 'UP3', 'Kali padam permanen', 'Tanggal padam'], ...kc.map((k) => [k.bulan, 'UID ' + k.uid, k.penyulang, k.ulp, k.up3, k.kali, k.tgl.join(', ')])]);
    const data = X.write(wb, { type: 'array', bookType: 'xlsx' });
    const fname = `Laporan_Gangguan_Penyulang_${S.period === 'ALL' ? 'semua' : S.period}${S.uid === 'ALL' ? '' : '_' + S.uid}.xlsx`;
    const dl = window.claude && await window.claude.use('downloads'); if (!dl) throw new Error('unduhan tidak tersedia');
    await dl.save({ filename: fname, data: new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) });
    m.textContent = '';
  } catch (e) { m.textContent = e && e.code === 'declined' ? '' : 'Excel gagal dibuat: ' + ((e && e.message) || e); }
  b.disabled = false;
});

// ---------- muat data saat tab dibuka ----------
let started = false, resizeT = null;
function start() {
  if (started) return; started = true;
  setData((window.__D && window.__D.gangguan_harian) || []); render();
  // file di-cache GitHub Pages (±10 menit); ambil versi terbaru dari server
  const sc = document.createElement('script'); sc.src = 'gangguan_harian.js?t=' + Date.now();
  sc.onload = () => { if (S.queue.length) return; const arr = (window.__D && window.__D.gangguan_harian) || []; if (arr.length !== S.reports.size || arr.some((r) => !S.reports.has(key(r.uid, r.tanggal)))) { if (arr.length >= S.reports.size) { setData(arr); render(); } } };
  sc.onerror = () => { const t = $('lgp-take'); if (!S.reports.size && t) t.textContent = 'Data laporan belum bisa dimuat. Periksa koneksi, lalu muat ulang halaman.'; };
  document.head.appendChild(sc);
  window.addEventListener('resize', () => { if (SEC.hidden) return; clearTimeout(resizeT); resizeT = setTimeout(() => paintTrend(filtered()), 200); });
}
const check = () => { if (!SEC.hidden) { start(); if (started) paintTrend(filtered()); } };
new MutationObserver(check).observe(SEC, { attributes: true, attributeFilter: ['hidden'] });
check();
window.SSLgp = { parseReport, splitReports };
})();
