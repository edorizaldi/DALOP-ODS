// Tab Kondisi Sistem: peta dan status sistem grid/isolated SUMKAL per tanggal, monitoring defisit, dan form update (admin).
// Data: kondisi_data.js (NERDA HARIAN + Monit Defisit), kondisi_update.js (isian form, disimpan ke repo oleh admin).
(() => {
'use strict';
const KS=document.getElementById('kondisi');
const BLNF=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let KY=2026,KM=10,D=[],MON=[],ISO=[],UNITS=[],GSYS=[],FILEMAX=0,TODAYOFF=0,DMAX=31,SELD=null;
const DMIN=1;
const BASED=()=>new Date(KY,KM-1,0);
const SCODE=['NORMAL','SIAGA','DEFISIT'];
const sid=r=>(r.s+'_'+r.u+'_'+r.n).replace(/[^A-Za-z0-9_.~:@+-]/g,'_').slice(0,180);
let DOV={};
const isoOf=n=>{const d=new Date(KY,KM-1,n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
function valAt(r,k){const o=(DOV[sid(r)]||{})[k];
  if(o)return{has:true,dmp:o.dmp,bp:o.bp,cad:o.cad,st:o.st,upd:true};
  const i=k-1;if(i<0||i>=r.a.dmp.length||r.a.dmp[i]==null)return{has:false,dmp:null,bp:null,cad:null,st:'',upd:false};
  return{has:true,dmp:r.a.dmp[i],bp:r.a.bp[i],cad:r.a.cad[i],st:SCODE[r.a.sc[i]]||'',upd:false};}
function applyDay(){
  D.forEach(r=>{Object.assign(r,valAt(r,SELD));r.last=r.has?SELD:null;let n=0,s=0,d=0;
    for(let k=1;k<=SELD;k++){const t=valAt(r,k).st;if(t==='NORMAL')n++;else if(t==='SIAGA')s++;else if(t==='DEFISIT')d++;}
    r.cN=n;r.cS=s;r.cD=d;});
}
function renderDate(){
  const el=document.getElementById('ks-d-sel');el.min=isoOf(DMIN);el.max=isoOf(DMAX);el.value=isoOf(SELD);
  document.getElementById('ks-d-prev').disabled=SELD<=DMIN;document.getElementById('ks-d-next').disabled=SELD>=DMAX;
  const nh=D.filter(r=>r.has&&r.n!=='TOTAL SISTEM GRID').length;
  const tag=SELD===TODAYOFF-1?' (H-1)':SELD===TODAYOFF?' (hari ini)':'';
  document.getElementById('ks-d-info').innerHTML=nh?`<b>${fd(SELD,1)}${tag}</b>: ${nh} sistem punya data.`:`<b>${fd(SELD,1)}${tag}</b>: belum ada data untuk tanggal ini. Data file terisi sampai ${fd(FILEMAX,1)}. <button type="button" class="linkbtn" id="ks-d-last">Lihat ${fd(FILEMAX)}</button>`;
}
function setDay(k){SELD=Math.min(DMAX,Math.max(DMIN,k));sel=null;applyDay();renderGrid();all();}
const fd=(n,long)=>n?new Date(KY,KM-1,n).toLocaleDateString('id-ID',long?{day:'numeric',month:'long',year:'numeric'}:{day:'numeric',month:'short'}):'–';
const JAM=[24,12,6], JC=['--h24','--h12','--h6'];
const STS=['NORMAL','SIAGA','DEFISIT'];
const UN={'ACEH':'Aceh','SUMUT':'Sumatera Utara','SUMBAR':'Sumatera Barat','RIAU DAN KEPULAUAN RIAU':'Riau & Kepri','S2JB':'S2JB','BANGKA BELITUNG':'Bangka Belitung','LAMPUNG':'Lampung','KALIMANTAN BARAT':'Kalimantan Barat','KALSELTENG':'Kalselteng','KALTIMRA':'Kaltimra'};
const nf=(v,d=0)=>v==null?'–':v.toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d});
const pc=v=>nf(v*100,1)+'%';
const sum=a=>a.reduce((x,y)=>x+y,0);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uN=u=>UN[u]||u;
const chip=s=>s?`<span class="chip s-${s}">${s.charAt(0)+s.slice(1).toLowerCase()}</span>`:'<span class="chip s-NONE">Kosong</span>';

let st={j:-1,s:-1,u:'',q:''};
const pass=()=>true;

// ---------- header ----------
const GRIDMAIN=['SUMATRA','KHATULISTIWA','INTERKONEKSI KALIMANTAN','BATAM-BINTAN'];
const GSUB={'SUMATRA':['SBU','SBT','SBS'],'INTERKONEKSI KALIMANTAN':['Barito','Mahakam']};
// Muat data (dari kondisi_data.js atau dari unggahan Excel) dan hitung ulang turunannya.
function loadData(src){
  const m=src.meta||{tahun:2026,bulan:10};KY=+m.tahun;KM=+m.bulan;
  D=(src.day||[]).map(r=>({s:r.s,u:r.u,n:r.n,j:r.j,a:{dmp:r.dmp,bp:r.bp,cad:r.cad,sc:r.sc}}));
  MON=src.mon||[];
  ISO=D.filter(r=>r.s==='ISOLATED');UNITS=[...new Set(ISO.map(r=>r.u))];
  GSYS=D.filter(r=>r.s==='GRID'&&GRIDMAIN.includes(r.n));
  FILEMAX=Math.max(0,...D.map(r=>{let m=0;r.a.dmp.forEach((v,i)=>{if(v!=null)m=i+1;});return m;}));
  const t=new Date();t.setHours(0,0,0,0);TODAYOFF=Math.round((t-BASED())/864e5);
  DMAX=Math.max(new Date(KY,KM,0).getDate(),TODAYOFF);
  SELD=Math.min(DMAX,Math.max(DMIN,TODAYOFF-1));
}
loadData({meta:window.__D.kondisi_meta,day:window.__D.kondisi_day,mon:window.__D.kondisi_mon});
function renderAgg(){
  const h=document.getElementById('ks-h1');if(h)h.textContent=`Sistem Kelistrikan SUMKAL · ${BLNF[KM-1]} ${KY}`;
  const lt=ISO.filter(r=>r.j<24).length;
  document.getElementById('ks-agg').innerHTML=[
    ['4','sistem grid (7 subsistem)',''],[nf(ISO.length),'sistem isolated',''],[nf(lt),'isolated < 24 jam','hot'],
    [pc(lt/ISO.length),'porsi < 24 jam',''],[String(UNITS.length),'unit induk','']]
    .map(([a,b,c])=>`<div><b class="${c}">${a}</b><span>${b}</span></div>`).join('');
}
// ---------- grid ----------
function renderGrid(){
  const tot=D.find(r=>r.n==='TOTAL SISTEM GRID');
  document.getElementById('ks-gsub').innerHTML=!tot.has?`Tidak ada data sistem grid pada ${fd(SELD,1)}.`:`Kondisi per ${fd(SELD,1)}. Total grid SUMKAL: DMP ${nf(tot.dmp,1)} MW, BP ${nf(tot.bp,1)} MW, cadangan ${nf(tot.cad,1)} MW ${chip(tot.st)}. Total ini tidak memasukkan Batam–Bintan.`;
  document.getElementById('ks-grid').innerHTML=GRIDMAIN.map(n=>{
    const r=D.find(x=>x.s==='GRID'&&x.n===n);const T=r.cN+r.cS+r.cD||1;
    return `<div class="gc"><h3>${esc(n==='BATAM-BINTAN'?'Batam–Bintan':n.charAt(0)+n.slice(1).toLowerCase().replace(/ (\w)/g,(m,c)=>' '+c.toUpperCase()))}${chip(r.st)}</h3>
    <div class="u">${esc(r.u)} · 24 jam</div>
    <div class="k"><div><b>${nf(r.dmp,1)}</b><span>DMP MW</span></div><div><b>${nf(r.bp,1)}</b><span>BP MW</span></div><div><b class="${r.cad<0?'neg':''}">${nf(r.cad,1)}</b><span>Cad MW</span></div></div>
    <div class="days" aria-label="Hari status"><i class="d-n" style="width:${r.cN/T*100}%"></i><i class="d-s" style="width:${r.cS/T*100}%"></i><i class="d-d" style="width:${r.cD/T*100}%"></i></div>
    <div class="dl">${r.cN} hari normal · ${r.cS} siaga · ${r.cD} defisit (1 Okt–${fd(SELD)})</div>
    ${GSUB[n]?`<div class="subs">Subsistem: ${GSUB[n].join(', ')}</div>`:`<div class="subs">Tanpa subsistem</div>`}</div>`;
  }).join('');
}
// ---------- filters ----------
function seg(arr,cur,key){return [`<button type="button" data-key="${key}" data-v="-1" aria-pressed="${cur<0}">Semua</button>`].concat(arr.map((l,i)=>`<button type="button" data-key="${key}" data-v="${i}" aria-pressed="${cur===i}">${l}</button>`)).join('');}
function renderFilters(){}
function label(){return 'Semua sistem isolated';}
// ---------- chart ----------
function niceMax(v){const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;const s=n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10;return s*p;}
// ---------- detail ----------
function renderDetail(){
  document.getElementById('ks-dsub').textContent=`Jumlah sistem isolated per unit induk menurut jam nyala, beserta kondisi defisit pada ${fd(SELD,1)}. Hari-sistem defisit dihitung dari 1 Oktober.`;
  const rows=UNITS.map(u=>{const rs=ISO.filter(r=>r.u===u&&pass(r,'u'));const c=JAM.map(j=>rs.filter(r=>r.j===j).length);
    return{u,c,t:sum(c),d:rs.filter(r=>r.st==='DEFISIT').length,dd:sum(rs.map(r=>r.cD)),ne:rs.filter(r=>!r.has).length}}).sort((a,b)=>b.t-a.t);
  let h=`<thead><tr><th class="l">Unit induk</th>${JAM.map((j,i)=>`<th style="border-top:3px solid var(${JC[i]})">${j} jam</th>`).join('')}<th>Total</th><th>&lt; 24 jam</th><th>Defisit</th><th>Hari-sistem defisit</th><th>Tanpa data</th></tr></thead><tbody>`;
  rows.forEach(r=>{const lt=r.c[1]+r.c[2];
    h+=`<tr class="${st.u===r.u?'on':''}"><td class="l">${esc(uN(r.u))}</td>${r.c.map(v=>`<td>${nf(v)}</td>`).join('')}<td><b>${nf(r.t)}</b></td><td>${nf(lt)} <span class="mut">(${pc(r.t?lt/r.t:0)})</span><span class="share"><b style="width:${r.t?lt/r.t*100:0}%"></b></span></td><td>${r.d?`<span class="neg">${r.d}</span>`:'0'}</td><td>${nf(r.dd)}</td><td class="${r.ne?'':'mut'}">${r.ne?r.ne+' sistem':'–'}</td></tr>`;});
  const ct=JAM.map((_,i)=>sum(rows.map(r=>r.c[i])));const T=sum(ct);
  h+=`<tr class="g"><td class="l">Total</td>${ct.map(v=>`<td>${nf(v)}</td>`).join('')}<td>${nf(T)}</td><td>${nf(ct[1]+ct[2])} (${pc(T?(ct[1]+ct[2])/T:0)})</td><td>${sum(rows.map(r=>r.d))}</td><td>${nf(sum(rows.map(r=>r.dd)))}</td><td>${nf(sum(rows.map(r=>r.ne)))}</td></tr></tbody>`;
  document.getElementById('ks-detail').innerHTML=h;
}
// ---------- list ----------
function renderList(){
  const q=st.q.trim().toLowerCase();
  const rs=ISO.filter(r=>pass(r)&&(!q||r.n.toLowerCase().includes(q))).sort((a,b)=>rk(b.st)-rk(a.st)||b.cD-a.cD||a.n.localeCompare(b.n));
  document.getElementById('ks-lsub').textContent=`${rs.length} sistem, kondisi ${fd(SELD,1)}. Diurutkan menurut status (defisit, siaga, normal, lalu tanpa data), kemudian hari defisit terbanyak.`;
  let h=`<thead><tr><th class="l">Sistem</th><th class="l">Unit induk</th><th class="l">Jam nyala</th><th>DMP MW</th><th>BP MW</th><th>Cad MW</th><th class="l">Status</th><th class="l">Hari N / S / D</th><th>Data</th></tr></thead><tbody>`;
  h+=rs.map(r=>{const T=r.cN+r.cS+r.cD||1;const ji=JAM.indexOf(r.j);
    return `<tr><td class="l">${esc(r.n)}</td><td class="l">${esc(uN(r.u))}</td><td class="l"><i class="jam" style="background:var(${JC[ji]})"></i>${r.j} jam</td><td>${nf(r.dmp,2)}</td><td>${nf(r.bp,2)}</td><td>${r.cad!=null&&r.cad<0?`<span class="neg">${nf(r.cad,2)}</span>`:nf(r.cad,2)}</td><td class="l">${chip(r.st)}</td><td class="l">${r.cN} / ${r.cS} / ${r.cD}<span class="dbar"><i class="d-n" style="width:${r.cN/T*100}%"></i><i class="d-s" style="width:${r.cS/T*100}%"></i><i class="d-d" style="width:${r.cD/T*100}%"></i></span></td><td class="mut">${r.has?fd(r.last):'Kosong'}</td></tr>`;}).join('');
  if(!rs.length)h+=`<tr><td class="l mut" colspan="9">Tidak ada sistem yang cocok dengan filter ini.</td></tr>`;
  document.getElementById('ks-list').innerHTML=h+'</tbody>';
}
// ---------- map ----------
const MAP=window.__D.kondisi_map;
const SHORT={'ACEH':'Aceh','SUMUT':'Sumut','SUMBAR':'Sumbar','RIAU DAN KEPULAUAN RIAU':'Riau & Kepri','S2JB':'S2JB','BANGKA BELITUNG':'Babel','LAMPUNG':'Lampung','KALIMANTAN BARAT':'Kalbar','KALSELTENG':'Kalselteng','KALTIMRA':'Kaltimra'};
const PJ=(lon,lat)=>[(lon-94.6)*40,(7-lat)*40];
const LPOS={'RIAU DAN KEPULAUAN RIAU':PJ(102.4,0.9),'SUMBAR':PJ(100.3,-0.9),'ACEH':PJ(96.9,4.4),'SUMUT':PJ(99.2,2.4),'S2JB':PJ(103.2,-2.9),'LAMPUNG':PJ(105.1,-4.9),'BANGKA BELITUNG':PJ(106.6,-2.4)};
const GLAYER=[
  {n:'SUMATRA',t:'Sumatra',units:['ACEH','SUMUT','SUMBAR','RIAU DAN KEPULAUAN RIAU','S2JB','LAMPUNG','BANGKA BELITUNG'],at:PJ(97.2,-2.6),subs:[['SBU',PJ(98.9,3.1)],['SBT',PJ(101.6,-0.6)],['SBS',PJ(104.1,-3.4)]]},
  {n:'KHATULISTIWA',t:'Khatulistiwa',units:['KALIMANTAN BARAT'],at:PJ(111.0,0.3),subs:[]},
  {n:'INTERKONEKSI KALIMANTAN',t:'Interkoneksi Kalimantan',units:['KALSELTENG','KALTIMRA'],at:PJ(114.2,-4.6),subs:[['Barito',PJ(113.9,-1.6)],['Mahakam',PJ(116.4,0.6)]]},
  {n:'BATAM-BINTAN',t:'Batam–Bintan',units:[],at:PJ(107.4,0.7),pin:PJ(104.05,1.08),subs:[]}];
const MM=[{k:'n',l:'Jumlah sistem',c:'--h24'},{k:'p',l:'Porsi < 24 jam',c:'--h12'},{k:'d',l:'Hari-sistem defisit',c:'--bad'}];
let mv={l:0,m:0};let sel=null;
try{const s=JSON.parse(localStorage.getItem('sumkal-m')||'null');if(s&&Number.isInteger(s.l)&&Number.isInteger(s.m)&&s.m<3&&s.l<2)mv=s;}catch(e){}
const saveM=()=>{try{localStorage.setItem('sumkal-m',JSON.stringify(mv))}catch(e){}};
function unitStats(u){const rs=ISO.filter(r=>r.u===u&&pass(r,'u'));const c=JAM.map(j=>rs.filter(r=>r.j===j).length);const t=sum(c);
  return{c,t,lt:c[1]+c[2],p:t?(c[1]+c[2])/t:0,d:sum(rs.map(r=>r.cD)),dn:rs.filter(r=>r.st==='DEFISIT').length,last:rs.length?Math.max(...rs.map(r=>r.last||0)):null};}
const SRANK={NORMAL:0,SIAGA:1,DEFISIT:2};const rk=s=>s in SRANK?SRANK[s]:-1;
const SCOL=st=>st==='DEFISIT'?'--mbad':st==='SIAGA'?'--mwarn':st==='NORMAL'?'--mok':'--mgray';
const SLBL=st=>st?st.charAt(0)+st.slice(1).toLowerCase():'Tidak ada data';
const isStale=day=>!day;
function unitStatus(u){const rs=ISO.filter(r=>r.u===u);let w='';rs.forEach(r=>{if(r.has&&rk(r.st)>rk(w))w=r.st;});
  const n=STS.map(x=>rs.filter(r=>r.st===x).length);const ne=rs.filter(r=>!r.has).length;
  return{st:w,n,ne,stale:ne>0&&ne<rs.length};}
const LEGSW=['NORMAL','SIAGA','DEFISIT',''].map(x=>`<span><i style="background:color-mix(in srgb,var(${SCOL(x)}) 72%,var(--land0))"></i>${x?SLBL(x):'Tidak ada data'}</span>`).join('');
function svgText(x,y,lines){return `<g class="lbl" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">`+lines.map(([cls,txt,dy])=>`<text class="${cls}" text-anchor="middle" y="${dy}">${esc(txt)}</text>`).join('')+`</g>`;}
function renderMap(){
  const svg=document.getElementById('ks-map');const vb=MAP._vb;
  svg.setAttribute('viewBox',vb.join(' '));
  const w=svg.clientWidth||1000;const k=Math.max(1,Math.min(2.6,1000/w*0.8));
  svg.style.setProperty('--k',k.toFixed(2));svg.classList.toggle('narrow',w<640);
  document.getElementById('ks-m-l').innerHTML=['Sistem isolated','Sistem grid'].map((l,i)=>`<button type="button" data-ml="${i}" aria-pressed="${mv.l===i}">${l}</button>`).join('');
  document.getElementById('ks-sec-grid').hidden=mv.l!==1;document.getElementById('ks-sec-iso').hidden=mv.l!==0;
  const units=Object.keys(MAP).filter(u=>!u.startsWith('_'));
  let h=`<text class="sea" x="${PJ(96.4,-4.6)[0]}" y="${PJ(96.4,-4.6)[1]}">SAMUDRA HINDIA</text><text class="sea" x="${PJ(107.6,-5.6)[0]}" y="${PJ(107.6,-5.6)[1]}">LAUT JAWA</text><text class="sea" x="${PJ(106.2,4.6)[0]}" y="${PJ(106.2,4.6)[1]}">LAUT NATUNA</text>`;
  const prov=Object.values(MAP._prov).map(d=>`<path class="prov" d="${d}"/>`).join('');
  if(mv.l===0){
    const S={},U={};units.forEach(u=>{S[u]=unitStats(u);U[u]=unitStatus(u);});
    h+=units.map(u=>`<path class="land${sel===u?' on':''}" data-u="${esc(u)}" d="${MAP[u].d}" style="fill:color-mix(in srgb,var(${SCOL(U[u].st)}) 72%,var(--land0))"/>`).join('')+prov;
    h+=units.map(u=>{const [x,y]=LPOS[u]||MAP[u].c;const s=S[u],q=U[u];
      return svgText(x,y,[['n',SHORT[u]+(q.stale?' *':''),0],['v',nf(s.t),20*k],['s',q.st?`${SLBL(q.st)} · ${s.lt} < 24 jam`:'Tidak ada data',32*k]]);}).join('');
    document.getElementById('ks-mlegend').innerHTML=`${LEGSW}<span>Warna: status terburuk di antara sistem unit itu pada ${fd(SELD,1)}. Abu-abu: tidak ada data pada tanggal itu. Angka besar: jumlah sistem. Klik wilayah untuk melihat daftar sistemnya.</span><span><b>*</b> sebagian sistem di wilayah itu tidak punya data pada tanggal ini.</span>`;
    document.getElementById('ks-msub').textContent=`Jumlah sistem isolated dan status per unit induk pada ${fd(SELD,1)}. Lokasi digambarkan per provinsi unit induk, bukan titik tiap sistem.`;
  }else{
    const G={};GLAYER.forEach(g=>G[g.n]=D.find(r=>r.s==='GRID'&&r.n===g.n));
    const owner={};GLAYER.forEach(g=>g.units.forEach(u=>owner[u]=g.n));
    h+=units.map(u=>{const g=G[owner[u]];return `<path class="land${sel===owner[u]?' on':''}" data-g="${esc(owner[u])}" d="${MAP[u].d}" style="fill:color-mix(in srgb,var(${SCOL(g.st)}) 72%,var(--land0))"/>`}).join('')+prov;
    GLAYER.forEach(g=>{const r=G[g.n];
      if(g.pin)h+=`<circle class="pin" data-g="${g.n}" cx="${g.pin[0]}" cy="${g.pin[1]}" r="${7*k}" style="fill:var(${SCOL(r.st)})"/>`;
      g.subs.forEach(([t,[x,y]])=>h+=svgText(x,y,[['s',t,0]]));
      h+=svgText(g.at[0],g.at[1],[['n',g.t,0],['v',r.has?(r.cad>=0?'+':'')+nf(r.cad,1)+' MW':'–',20*k],['s',r.has?`${SLBL(r.st)} · DMP ${nf(r.dmp,0)} MW`:'Tidak ada data',32*k]]);});
    document.getElementById('ks-mlegend').innerHTML=`${LEGSW}<span>Warna: status pada ${fd(SELD,1)}. Abu-abu: tidak ada data pada tanggal itu. Angka besar: cadangan daya. Batam–Bintan ditandai titik. Klik wilayah untuk rinciannya.</span>`;
    document.getElementById('ks-msub').textContent=`Empat sistem grid dan subsistemnya, diwarnai menurut status pada ${fd(SELD,1)}. Rincian tiap sistem grid ada di kartu di bawah peta.`;
  }
  svg.innerHTML=h;
  renderPop();
}
function renderPop(){
  const el=document.getElementById('ks-mpop');
  if(!sel){el.hidden=true;el.innerHTML='';return;}
  let head,cnt='',items,hint='';
  const item=r=>{if(!r.has)return `<li><span class="nm">${esc(r.disp||r.n)}</span>${chip('')}<span class="d">${r.j} jam · tidak ada data pada ${fd(SELD)}</span></li>`;return `<li><span class="nm">${esc(r.disp||r.n)}</span>${chip(r.st)}<span class="d">${r.j} jam · DMP ${nf(r.dmp,2)} · BP ${nf(r.bp,2)} · Cad ${r.cad!=null&&r.cad<0?`<span class="neg">${nf(r.cad,2)}</span>`:nf(r.cad,2)} MW${r.upd?' · dari form update':''}</span>${whyHtml(r)}</li>`;};
  if(mv.l===0){
    const q=unitStatus(sel);
    const rs=ISO.filter(r=>r.u===sel).sort((a,b)=>rk(b.st)-rk(a.st)||b.cD-a.cD||a.n.localeCompare(b.n));
    head={t:uN(sel),c:SCOL(q.st),m:`${rs.length} sistem isolated · ${fd(SELD,1)} · status wilayah ${SLBL(q.st).toLowerCase()}`};
    cnt=STS.map((x,i)=>q.n[i]?`<span class="chip s-${x}">${q.n[i]} ${SLBL(x).toLowerCase()}</span>`:'').join('')+(q.ne?`<span class="chip s-NONE">${q.ne} kosong</span>`:'');
    items=rs.map(item).join('');
    if(q.ne)hint=`${q.ne} sistem tidak punya data pada ${fd(SELD,1)}.`;
  }else{
    const g=GLAYER.find(x=>x.n===sel),r=D.find(x=>x.s==='GRID'&&x.n===sel);
    head={t:g.t,c:SCOL(r.st),m:`Sistem grid · ${fd(SELD,1)} · ${g.subs.length?'subsistem '+g.subs.map(x=>x[0]).join(', '):'tanpa subsistem'}`};
    items=item({...r,disp:g.t});
    hint=`${r.cN} hari normal · ${r.cS} siaga · ${r.cD} defisit (1 Okt–${fd(SELD)}).`+(g.subs.length?' Data per subsistem tidak terisi di file.':'');
  }
  el.style.setProperty('--c',`var(${head.c})`);
  const KAL=['KALIMANTAN BARAT','KALSELTENG','KALTIMRA','KHATULISTIWA','INTERKONEKSI KALIMANTAN'];el.classList.toggle('left',KAL.includes(sel));
  el.innerHTML=`<header><div><h3>${esc(head.t)}</h3><div class="meta">${esc(head.m)}</div></div><button type="button" class="x" id="ks-mpop-x" aria-label="Tutup">×</button></header>${cnt?`<div class="cnt">${cnt}</div>`:''}<ul>${items}</ul>${hint?`<div class="hint">${hint}</div>`:''}`;
  el.hidden=false;
}
function all(){calcMonLast();renderDate();renderFilters();renderMap();renderDetail();renderList();renderMon();}

document.getElementById('ks-q').addEventListener('input',e=>{st.q=e.target.value;renderList();});
const tip=document.getElementById('ks-tip');
KS.querySelector('.filters').addEventListener('click',e=>{const b=e.target.closest('button[data-ml]');if(!b)return;mv.l=+b.dataset.ml;sel=null;renderMon();saveM();renderMap();});
const mp=document.getElementById('ks-map');
mp.addEventListener('click',e=>{const p=e.target.closest('[data-u],[data-g]');const k=p?(p.dataset.u||p.dataset.g):null;sel=(k&&sel!==k)?k:null;tip.hidden=true;renderMap();});
document.getElementById('ks-mpop').addEventListener('click',e=>{if(e.target.closest('#ks-mpop-x')){sel=null;renderMap();}});
addEventListener('keydown',e=>{if(e.key==='Escape'&&sel){sel=null;renderMap();}});
mp.addEventListener('mousemove',e=>{const p=e.target.closest('[data-u],[data-g]');if(!p){tip.hidden=true;return}
  let h;
  if(p.dataset.u){const u=p.dataset.u,s=unitStats(u);
    const q=unitStatus(u);
    h=`<b>${esc(uN(u))}</b><br>${s.t} sistem isolated<br>24 jam: ${s.c[0]} · 12 jam: ${s.c[1]} · 6 jam: ${s.c[2]}<br>&lt; 24 jam: ${s.lt}<br>Status: <b>${SLBL(q.st)}</b> (${q.n[0]} normal · ${q.n[1]} siaga · ${q.n[2]} defisit)<br>Tanggal: ${fd(SELD,1)}${q.ne?` · ${q.ne} sistem tanpa data`:''}`+ISO.filter(r=>r.u===u&&r.st==='DEFISIT').map(whyTip).join('')+(q.n[2]?'<span class="tw">Klik wilayah untuk rincian.</span>':'');}
  else{const r=D.find(x=>x.s==='GRID'&&x.n===p.dataset.g);const g=GLAYER.find(x=>x.n===p.dataset.g);
    h=`<b>${esc(g.t)}</b>${g.subs.length?' ('+g.subs.map(x=>x[0]).join(', ')+')':''}<br>${r.has?`DMP ${nf(r.dmp,1)} · BP ${nf(r.bp,1)} · Cad ${nf(r.cad,1)} MW<br>`:''}Status: <b>${SLBL(r.st)}</b> pada ${fd(SELD,1)}<br>${r.cN} hari normal · ${r.cS} siaga · ${r.cD} defisit`+(r.st==='DEFISIT'?whyTip(r):'');}
  tip.innerHTML=h;tip.hidden=false;tip.style.left=Math.min(e.clientX+14,innerWidth-270)+'px';tip.style.top=(e.clientY+14)+'px';});
mp.addEventListener('mouseleave',()=>tip.hidden=true);
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(renderMap,150);});
// ---------- tabs ----------
function showTab(t){const u=t==='upd';document.getElementById('ks-tab-dash').hidden=u;document.getElementById('ks-tab-upd').hidden=!u;
  document.getElementById('ks-t-dash').setAttribute('aria-selected',String(!u));document.getElementById('ks-t-upd').setAttribute('aria-selected',String(u));
  if(!u)renderMap();}
document.getElementById('ks-t-dash').addEventListener('click',()=>showTab('dash'));
document.getElementById('ks-t-upd').addEventListener('click',()=>showTab('upd'));
// ---------- update data ----------
const mkey=r=>r.s+'|'+r.u+'|'+r.n;
let MONLAST={};function calcMonLast(){const lim=isoOf(SELD);MONLAST={};MON.forEach(m=>{if(m.key&&m.t<=lim&&(!MONLAST[m.key]||m.t>=MONLAST[m.key].t))MONLAST[m.key]=m;});}
const fdi=iso=>iso?new Date(iso+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'–';
function whyHtml(r){if(r.st!=='DEFISIT')return '';const m=MONLAST[mkey(r)];
  if(!m)return `<div class="why none"><b>Penyebab defisit</b><span class="t">Belum ada catatan di Monit Defisit.</span></div>`;
  return `<div class="why"><b>Penyebab defisit</b><span class="t">${esc(m.pen||'–')}</span><span class="e">Estimasi kembali normal: ${m.est?fdi(m.est):'belum ditentukan'} · laporan ${fdi(m.t)}</span></div>`;}
function whyTip(r){const m=MONLAST[mkey(r)];return m?`<span class="tw"><b>${esc(r.s==='GRID'?(GLAYER.find(g=>g.n===r.n)||{t:r.n}).t:r.n)}</b>: ${esc(m.pen||'–')}${m.est?' · normal '+fdi(m.est):''}</span>`:`<span class="tw"><b>${esc(r.n)}</b>: penyebab belum tercatat</span>`;}
let monV=0,monQ='';
function renderMon(){
  const tbl=document.getElementById('ks-mon');
  const LS=mv.l===1?'GRID':'ISOLATED',LT=mv.l===1?'sistem grid':'sistem isolated';
  const lim=isoOf(SELD);let rows=(monV===0?Object.values(MONLAST):MON.filter(m=>m.t<=lim)).filter(m=>m.s.toUpperCase()===LS);
  const q=monQ.trim().toLowerCase();
  if(q)rows=rows.filter(m=>(m.sub+' '+m.uid+' '+m.s+' '+m.pen).toLowerCase().includes(q));
  const cur=m=>{const r=m.key&&D.find(x=>mkey(x)===m.key);return r?r.st:'';};
  rows.sort((a,b)=>monV===0?rk(cur(b))-rk(cur(a))||b.t.localeCompare(a.t)||a.sub.localeCompare(b.sub):b.t.localeCompare(a.t)||a.sub.localeCompare(b.sub));
  document.getElementById('ks-monsub').textContent=!rows.length&&!q?`Belum ada laporan defisit ${LT} sampai ${fd(SELD,1)}.`:monV===0
    ?`${rows.length} ${LT} tercatat defisit sampai ${fd(SELD,1)}. Tiap baris memakai laporan terakhir sistem itu sampai tanggal tersebut; yang defisit pada tanggal itu ada di atas.`
    :`${rows.length} laporan harian ${LT} sampai ${fd(SELD,1)}, terbaru di atas.`;
  const today=new Date(KY,KM-1,SELD);
  let h=`<thead><tr><th>Tanggal laporan</th><th>Nama sistem</th><th>UID</th><th>Nama subsistem</th><th>Penyebab defisit</th><th>Estimasi kembali normal</th><th>Status pada tanggal</th></tr></thead><tbody>`;
  h+=rows.map(m=>{const st=cur(m);const late=st==='DEFISIT'&&m.est&&new Date(m.est+'T00:00:00')<today;
    return `<tr class="${st==='DEFISIT'?'now':''}"><td class="nw">${fdi(m.t)}</td><td class="nw">${esc(m.s)}</td><td class="nw">${esc(m.uid)}</td><td><b>${esc(m.sub)}</b></td><td class="pen">${esc(m.pen||'–')}</td><td class="nw">${m.est?fdi(m.est):'<span class="mut">Belum ditentukan</span>'}${late?'<span class="late">Lewat estimasi</span>':''}</td><td class="nw">${st?chip(st):'–'}</td></tr>`;}).join('');
  if(!rows.length)h+=`<tr><td colspan="7" class="mut">Tidak ada laporan yang cocok.</td></tr>`;
  tbl.innerHTML=h+'</tbody>';
}
document.getElementById('ks-mon-v').addEventListener('click',e=>{const b=e.target.closest('button[data-mv]');if(!b)return;monV=+b.dataset.mv;
  KS.querySelectorAll('#ks-mon-v button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderMon();});
document.getElementById('ks-mon-q').addEventListener('input',e=>{monQ=e.target.value;renderMon();});
const gName=n=>(GLAYER.find(g=>g.n===n)||{t:n}).t;
const offOf=iso=>Math.round((new Date(iso+'T00:00:00')-BASED())/864e5);
const todayIso=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
let LOG=[],cadTouched=false;
function applyOv(){applyDay();renderGrid();all();fillCur();}
const fu=id=>document.getElementById(id);
function sysPool(){return fu('ks-u-jenis').value==='GRID'?GSYS:ISO.filter(r=>r.u===fu('ks-u-unit').value);}
function fillSys(){
  fu('ks-w-unit').hidden=fu('ks-u-jenis').value==='GRID';
  const pool=[...sysPool()].sort((a,b)=>a.n.localeCompare(b.n));
  fu('ks-u-sys').innerHTML=pool.map(r=>`<option value="${esc(sid(r))}">${esc(r.s==='GRID'?gName(r.n):r.n)} (${r.j} jam)</option>`).join('');
  fillCur();
}
function curSys(){const k=fu('ks-u-sys').value;return D.find(r=>sid(r)===k);}
function fillCur(){const r=curSys();if(!r){fu('ks-u-cur').textContent='';return;}
  const k=fu('ks-u-date').value?offOf(fu('ks-u-date').value):SELD;const v=valAt(r,k);
  fu('ks-u-cur').innerHTML=v.has?`Data tersimpan untuk <b>${fd(k,1)}</b>: DMP <b>${nf(v.dmp,2)}</b> · BP <b>${nf(v.bp,2)}</b> · Cad <b>${nf(v.cad,2)}</b> MW · ${chip(v.st)}${v.upd?' (dari form update)':' (dari file)'}. Menyimpan akan menimpa data tanggal ini.`:`Belum ada data untuk <b>${fd(k,1)}</b>.`;}
function setErr(w,m){const el=fu(w),e=el.querySelector('.err');el.classList.toggle('bad',!!m);e.hidden=!m;e.textContent=m||'';}
function autoCad(){if(cadTouched)return;const a=parseFloat(fu('ks-u-dmp').value),b=parseFloat(fu('ks-u-bp').value);
  if(Number.isFinite(a)&&Number.isFinite(b)){const c=Math.round((a-b)*1000)/1000;fu('ks-u-cad').value=c;if(c<0)fu('ks-u-st-d').checked=true;}}
function fillUnits(){fu('ks-u-unit').innerHTML=UNITS.map(u=>`<option value="${esc(u)}">${esc(uN(u))}</option>`).join('');}
fillUnits();
fu('ks-u-date').value=todayIso;
fu('ks-u-jenis').addEventListener('change',fillSys);fu('ks-u-unit').addEventListener('change',fillSys);fu('ks-u-sys').addEventListener('change',fillCur);fu('ks-u-date').addEventListener('change',fillCur);
fu('ks-u-dmp').addEventListener('input',autoCad);fu('ks-u-bp').addEventListener('input',autoCad);
fu('ks-u-cad').addEventListener('input',()=>{cadTouched=fu('ks-u-cad').value!=='';});
fu('ks-u-reset').addEventListener('click',()=>{['ks-u-dmp','ks-u-bp','ks-u-cad'].forEach(i=>fu(i).value='');KS.querySelectorAll('input[name="u-st"]').forEach(x=>x.checked=false);cadTouched=false;['ks-w-dmp','ks-w-bp','ks-w-cad','ks-w-st'].forEach(w=>setErr(w,''));fu('ks-u-msg').textContent='';fu('ks-u-date').value=todayIso;});
fillSys();
fu('ks-fupd').addEventListener('submit',async e=>{
  e.preventDefault();const msg=fu('ks-u-msg');msg.className='msg';msg.textContent='';
  const r=curSys();const dmp=parseFloat(fu('ks-u-dmp').value),bp=parseFloat(fu('ks-u-bp').value),cad=parseFloat(fu('ks-u-cad').value);
  const stv=(KS.querySelector('input[name="u-st"]:checked')||{}).value;const dt=fu('ks-u-date').value;
  let ok=true;
  setErr('ks-w-dmp',Number.isFinite(dmp)&&dmp>=0?'':'Isi DMP dalam MW (angka 0 atau lebih).');if(!(Number.isFinite(dmp)&&dmp>=0))ok=false;
  setErr('ks-w-bp',Number.isFinite(bp)&&bp>=0?'':'Isi beban puncak dalam MW (angka 0 atau lebih).');if(!(Number.isFinite(bp)&&bp>=0))ok=false;
  setErr('ks-w-cad',Number.isFinite(cad)?'':'Isi cadangan daya dalam MW.');if(!Number.isFinite(cad))ok=false;
  setErr('ks-w-st',stv?'':'Pilih status.');if(!stv)ok=false;
  if(!dt||!r){msg.className='msg no';msg.textContent='Pilih sistem dan tanggal data.';ok=false;}
  if(!ok)return;
  const A=window.SSAdmin;
  if(!A||!A.isAdmin()){msg.className='msg no';msg.textContent='Login admin dulu (tombol Login admin di kanan bawah) untuk menyimpan update.';return;}
  const off=offOf(dt);const k=sid(r);const nm=r.s==='GRID'?gName(r.n):r.n;
  const body={key:k,s:r.s,u:r.u,n:r.n,tanggal:dt,off,dmp,bp,cad,st:stv,by:A.name()||'Admin',at:new Date().toISOString()};
  fu('ks-u-save').disabled=true;msg.textContent='Menyimpan ke repo…';
  try{
    const cur=await A.get(UPD_FILE);let arr=cur?parseUpd(cur):[];
    arr=arr.filter(x=>!(x.key===k&&x.off===off));arr.push(body);
    await A.put(UPD_FILE,updJs(arr),`Update kondisi sistem ${nm} ${dt} dari dashboard`);
    window.__D.kondisi_update=arr;loadUpd(arr);
    msg.className='msg ok';msg.textContent=`Tersimpan: ${nm}, ${fd(off,1)}. Pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).`+(off!==SELD?` Pilih tanggal ${fd(off)} di dashboard untuk melihatnya.`:'');
    ['ks-u-dmp','ks-u-bp','ks-u-cad'].forEach(i=>fu(i).value='');KS.querySelectorAll('input[name="u-st"]').forEach(x=>x.checked=false);cadTouched=false;
  }catch(err){
    msg.className='msg no';
    msg.textContent=err&&err.code==='gh-403'?'Token admin belum punya izin menulis ke repo ini. Hubungi pemilik repo.':err&&(err.code==='gh-401')?'Login admin sudah tidak berlaku. Keluar lalu login lagi.':'Gagal menyimpan: '+((err&&err.message)||'coba lagi sebentar lagi')+'.';
  }finally{fu('ks-u-save').disabled=false;}
});
function lockForm(t){const g=fu('ks-u-gate');g.textContent=t;g.hidden=false;fu('ks-fupd').querySelectorAll('input,select,button').forEach(x=>x.disabled=true);}
function renderLog(){
  const el=fu('ks-u-log');
  if(!LOG.length){el.innerHTML='<li class="empty">Belum ada update yang disimpan.</li>';return;}
  el.innerHTML=LOG.map(x=>{const nm=x.s==='GRID'?gName(x.n):x.n;const who=x.by||'Admin';
    const at=x.at?new Date(x.at).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    return `<li><span class="nm">${esc(nm)} <span class="mut" style="font-weight:400">· ${esc(uN(x.u))}</span></span>${chip(x.st)}<span class="d">Data ${fd(x.off)} · DMP ${nf(x.dmp,2)} · BP ${nf(x.bp,2)} · Cad ${nf(x.cad,2)} MW<br>${esc(who)} · ${esc(at)}</span></li>`;}).join('');
}
const UPD_FILE='kondisi_update.js';
const parseUpd=t=>{const m=String(t).match(/=\s*(\[[\s\S]*\])\s*;?\s*$/);try{return m?JSON.parse(m[1]):[];}catch(e){return [];}};
const updJs=a=>'window.__D=window.__D||{};window.__D["kondisi_update"]='+JSON.stringify(a)+';\n';
function loadUpd(arr){const o={};(arr||[]).forEach(v=>{if(!v||!v.key)return;const off=typeof v.tanggal==='string'&&/^\d{4}-\d\d-\d\d$/.test(v.tanggal)?offOf(v.tanggal):v.off;if(typeof off==='number')(o[v.key]=o[v.key]||{})[off]={...v,off};});DOV=o;
  LOG=[...(arr||[])].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,20);applyOv();renderLog();}
document.getElementById('ks-d-prev').addEventListener('click',()=>setDay(SELD-1));
document.getElementById('ks-d-next').addEventListener('click',()=>setDay(SELD+1));
document.getElementById('ks-d-sel').addEventListener('change',e=>{if(e.target.value)setDay(offOf(e.target.value));});
document.getElementById('ks-d-info').addEventListener('click',e=>{if(e.target.closest('#ks-d-last'))setDay(FILEMAX);});

// ---------- update laporan harian (unggah Excel Database Sistem SUMKAL) ----------
const NORM=x=>String(x==null?'':x).toUpperCase().replace(/[^A-Z0-9]/g,'');
const serialISO=v=>{const d=new Date(Math.round((v-25569)*864e5));return d.toISOString().slice(0,10);};
const cellISO=v=>{if(typeof v==='number'&&v>20000&&v<80000)return serialISO(v);const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(String(v||'').trim());return m?m[0]:'';};
const num=v=>{if(typeof v==='number'&&isFinite(v))return Math.round(v*1000)/1000;if(typeof v==='string'&&v.trim()!==''&&isFinite(+v.replace(',','.')))return Math.round(+v.replace(',','.')*1000)/1000;return null;};
const clean=v=>{if(v==null)return '';if(typeof v==='number')return cellISO(v)||String(v);return String(v).replace(/\r/g,'').split('\n').map(l=>l.replace(/^\s*[•*\-]\s*/,'').trim()).filter(Boolean).join('\n');};
function findSheet(sheets,name){const n=NORM(name);return sheets.find(x=>NORM(x.name)===n)||sheets.find(x=>NORM(x.name).includes(n));}
function parseNerda(rows){
  let hr=-1;for(let i=0;i<Math.min(rows.length,40);i++){const r=rows[i]||[];const t=r.map(NORM);if(t.includes('SISTEM')&&t.includes('KLASIFIKASI')){hr=i;break;}}
  if(hr<0)throw new Error('Sheet NERDA HARIAN: baris judul (SISTEM … KLASIFIKASI) tidak ditemukan.');
  const H=rows[hr].map(NORM);const ci=k=>H.indexOf(k);
  const cS=ci('SISTEM'),cU=ci('UNITINDUK'),cN=ci('SUBSISTEM'),cJ=ci('JAMNYALA'),cK=ci('KLASIFIKASI');
  if([cS,cU,cN,cJ,cK].some(x=>x<0))throw new Error('Sheet NERDA HARIAN: kolom SISTEM, UNIT INDUK, SUB SISTEM, JAM NYALA atau KLASIFIKASI tidak lengkap.');
  const dcols=[];for(let c=cK+1;c<rows[hr].length;c++){const iso=cellISO(rows[hr][c]);if(iso)dcols.push({c,iso});}
  if(!dcols.length)throw new Error('Sheet NERDA HARIAN: kolom tanggal tidak ditemukan di baris judul.');
  const [y,mo]=dcols[0].iso.split('-').map(Number);
  const nd=new Date(y,mo,0).getDate();const col={};dcols.forEach(d=>{const [yy,mm,dd]=d.iso.split('-').map(Number);if(yy===y&&mm===mo)col[dd]=d.c;});
  const groups=new Map();
  for(let i=hr+1;i<rows.length;i++){const r=rows[i]||[];const n=r[cN];if(n==null||String(n).trim()==='')continue;
    const s=String(r[cS]||'').trim().toUpperCase(),u=String(r[cU]||'').trim(),nn=String(n).trim();if(!s)continue;
    const k=s+'|'+u+'|'+nn;if(!groups.has(k))groups.set(k,{s,u,n:nn,jam:[],rows:{}});
    const g=groups.get(k);g.jam.push(String(r[cJ]||''));g.rows[NORM(r[cK])]=g.rows[NORM(r[cK])]||r;}
  const SC={NORMAL:0,SIAGA:1,DEFISIT:2};const day=[];
  for(const g of groups.values()){
    const cnt={};g.jam.forEach(x=>{const m=/(\d+)/.exec(x);if(m)cnt[m[1]]=(cnt[m[1]]||0)+1;});
    let jam=+(Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]||['24'])[0];if(jam>24)jam=24;
    const R=g.rows,Dm=R.DMPMW,Bp=R.BPMW,Cd=R.CADMW,St=R.STATUS;const o={s:g.s,u:g.u,n:g.n,j:jam,dmp:[],bp:[],cad:[],sc:[]};
    for(let d=1;d<=nd;d++){const c=col[d];const a=c!=null&&Dm?num(Dm[c]):null,b=c!=null&&Bp?num(Bp[c]):null;
      if(a==null||(a===0&&!b)){o.dmp.push(null);o.bp.push(null);o.cad.push(null);o.sc.push(null);continue;}
      let cd=c!=null&&Cd?num(Cd[c]):null;if(cd==null)cd=Math.round((a-(b||0))*1000)/1000;
      const t=St&&c!=null?String(St[c]==null?'':St[c]).trim().toUpperCase():'';
      o.dmp.push(a);o.bp.push(b);o.cad.push(cd);o.sc.push(t in SC?SC[t]:null);}
    day.push(o);}
  if(!day.length)throw new Error('Sheet NERDA HARIAN: tidak ada baris sistem.');
  return{meta:{tahun:y,bulan:mo},day};
}
function parseMonit(rows,day){
  let hr=-1;for(let i=0;i<Math.min(rows.length,40);i++){const t=(rows[i]||[]).map(NORM);if(t.includes('SUBSISTEM')&&t.includes('PENYEBABDEFISIT')){hr=i;break;}}
  if(hr<0)throw new Error('Sheet Monit Defisit: baris judul (Sub Sistem, Penyebab Defisit) tidak ditemukan.');
  const H=rows[hr].map(NORM);const ci=k=>H.indexOf(k);
  const cT=ci('TANGGAL'),cS=ci('SISTEM'),cU=ci('UNITINDUK'),cN=ci('SUBSISTEM'),cP=ci('PENYEBABDEFISIT'),cE=ci('ESTIMASIKEMBALINORMAL');
  const idx={};day.forEach(r=>{if(r.n!=='TOTAL SISTEM GRID')idx[NORM(r.n)]=r;});
  const mon=[],miss=new Set();
  for(let i=hr+1;i<rows.length;i++){const r=rows[i]||[];const sub=r[cN];if(sub==null||String(sub).trim()==='')continue;
    const t=cellISO(r[cT]);if(!t)continue;const m=idx[NORM(sub)];if(!m)miss.add(String(sub).trim());
    const e=cE>=0?r[cE]:null;const est=cellISO(e);
    mon.push({t,s:String(r[cS]||'').trim(),uid:String(r[cU]||'').trim(),sub:String(sub).trim(),key:m?m.s+'|'+m.u+'|'+m.n:null,pen:clean(r[cP]),est});}
  return{mon,miss:[...miss]};
}
let upPending=null;
const KSu=id=>document.getElementById(id);
function upErr(t){const e=KSu('ks-up-err');e.textContent=t||'';e.hidden=!t;}
function srcNote(){const info=((window.__D&&window.__D.info_update)||[]).find(x=>x.tab==='kondisi');
  KSu('ks-src-note').textContent=info?`Data saat ini: ${info.periode} (${info.sumber}).`:`Data saat ini: s.d. ${fd(FILEMAX,1)}.`;}
function upReview(){
  KSu('ks-up-review').hidden=!upPending;if(!upPending)return;
  const p=upPending,day=p.day;const last=Math.max(0,...day.map(r=>{let m=0;r.dmp.forEach((v,i)=>{if(v!=null)m=i+1;});return m;}));
  const ng=day.filter(r=>r.s==='GRID'&&GRIDMAIN.includes(r.n)).length,ni=day.filter(r=>r.s==='ISOLATED').length;
  const cnt=r=>r.s==='ISOLATED'||GRIDMAIN.includes(r.n);const at=c=>day.filter(r=>cnt(r)&&last&&r.sc[last-1]===c).length;const filled=day.filter(r=>cnt(r)&&last&&r.dmp[last-1]!=null).length;
  const bl=`${BLNF[p.meta.bulan-1]} ${p.meta.tahun}`;const lastD=last?new Date(p.meta.tahun,p.meta.bulan-1,last).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'–';
  const monLast=p.mon.reduce((a,m)=>m.t>a?m.t:a,'');
  KSu('ks-up-sum').textContent=`${p.file}: ${bl}, ${ng} sistem grid dan ${ni} sistem isolated, data terisi sampai ${lastD}; ${p.mon.length} laporan defisit${monLast?' sampai '+fdi(monLast):''}.`+(p.miss.length?` ${p.miss.length} nama di Monit Defisit tidak cocok dengan NERDA HARIAN: ${p.miss.slice(0,4).join(', ')}${p.miss.length>4?', …':''}.`:'')+' Periksa angkanya, lalu terapkan.';
  const box=(lab,val,cls)=>`<div><span>${esc(lab)}</span><b class="${cls||''}">${esc(val)}</b></div>`;
  KSu('ks-up-kv').innerHTML=box('Periode',bl)+box('Data terisi s.d.',lastD)+box(`Sistem terisi pada tanggal itu`,`${filled} dari ${ng+ni}`)+box('Normal',String(at(0)),'ok')+box('Siaga',String(at(1)))+box('Defisit',String(at(2)),at(2)?'bad':'')+box('Laporan defisit',String(p.mon.length));
}
async function upHandle(file){
  if(!file)return;upErr('');KSu('ks-up-msg').textContent='';
  if(!/\.xlsx$/i.test(file.name)){upErr('Pilih file .xlsx.');return;}
  if(!window.APKT||!window.APKT.readSheets){upErr('Pembaca Excel belum termuat. Muat ulang halaman lalu coba lagi.');return;}
  KSu('ks-up-msg').textContent='Membaca file…';
  try{const sheets=await window.APKT.readSheets(file);
    const sn=findSheet(sheets,'NERDA HARIAN');if(!sn)throw new Error('Sheet "NERDA HARIAN" tidak ada di file ini.');
    const a=parseNerda(sn.rows);const sm=findSheet(sheets,'Monit Defisit');const b=sm?parseMonit(sm.rows,a.day):{mon:[],miss:[]};
    upPending={file:file.name,meta:a.meta,day:a.day,mon:b.mon,miss:b.miss,noMonit:!sm};KSu('ks-up-msg').textContent=sm?'':'Sheet "Monit Defisit" tidak ada; penyebab defisit tidak diperbarui.';
  }catch(e){upPending=null;KSu('ks-up-msg').textContent='';upErr('File tidak bisa dibaca: '+(e&&e.message?e.message:e));}
  upReview();
}
const dataJs=(meta,day,mon)=>'window.__D=window.__D||{};\nwindow.__D["kondisi_meta"]='+JSON.stringify(meta)+';\nwindow.__D["kondisi_day"]='+JSON.stringify(day)+';\nwindow.__D["kondisi_mon"]='+JSON.stringify(mon)+';\nwindow.__D["kondisi_map"]='+JSON.stringify(window.__D.kondisi_map)+';\n';
async function upApply(){
  if(!upPending)return;const p=upPending,msg=KSu('ks-up-msg'),btn=KSu('ks-up-apply');
  const mon=p.noMonit?MON:p.mon;
  window.__D.kondisi_meta=p.meta;window.__D.kondisi_day=p.day;window.__D.kondisi_mon=mon;
  loadData({meta:p.meta,day:p.day,mon});sel=null;fillUnits();fillSys();renderAgg();loadUpd(window.__D.kondisi_update||[]);
  const last=FILEMAX;const periode=`1–${last} ${BLNF[KM-1]} ${KY}`;const now=new Date().toISOString();
  const sumber=`${p.file} (sheet NERDA HARIAN${p.noMonit?'':' dan Monit Defisit'})`;
  const A=window.SSAdmin;let saved=false,why='';
  if(A&&A.isAdmin()){btn.disabled=true;msg.textContent='Menyimpan ke repo…';
    try{await A.put('kondisi_data.js',dataJs(p.meta,p.day,mon),`Update laporan harian kondisi sistem s.d. ${last} ${BLNF[KM-1]} ${KY} dari dashboard`);saved=true;
      try{const cur=await A.get('info_update.js');const m=cur&&/=\s*(\[[\s\S]*\])\s*;?\s*$/.exec(cur);const arr=m?JSON.parse(m[1]):[];
        const ent={tab:'kondisi',diperbarui:now,periode,sumber:sumber+' (diunggah di dashboard)'};const i=arr.findIndex(x=>x.tab==='kondisi');if(i>=0)arr[i]=ent;else arr.push(ent);
        await A.put('info_update.js','window.__D=window.__D||{};window.__D["info_update"]='+JSON.stringify(arr)+';\n','Update info database kondisi sistem');window.__D.info_update=arr;}catch(e){/* info tanggal update tidak tersimpan; data tetap tersimpan */}
    }catch(e){why=e&&e.code==='gh-403'?' Token admin belum punya izin menulis ke repo ini.':e&&e.code==='gh-401'?' Login admin sudah tidak berlaku; keluar lalu login lagi.':' '+((e&&e.message)||'');}
    btn.disabled=false;}
  msg.textContent=saved?`Dashboard diperbarui ke data s.d. ${fd(last,1)} dan disimpan ke repo. Pembaca lain melihatnya setelah GitHub Pages diperbarui (1–2 menit).`
    :`Dashboard di layar ini sudah memakai data baru (s.d. ${fd(last,1)}). Data belum tersimpan untuk pembaca lain:${why||' klik "Login admin" (kanan bawah), lalu unggah ulang file yang sama.'}`;
  if(window.SSDbInfo&&window.SSDbInfo.set)window.SSDbInfo.set('kondisi',now,periode,sumber+(saved?' (diunggah di dashboard)':' (hanya di layar ini, belum tersimpan)'));
  KSu('ks-src-note').textContent=`Data dari unggahan ${now.slice(0,10)} (${p.file}).`;
  upPending=null;upReview();
}
(()=>{const b=KSu('ks-btn-update'),panel=KSu('ks-upload');
  b.addEventListener('click',()=>{panel.hidden=!panel.hidden;b.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)srcNote();});
  const input=KSu('ks-file'),drop=KSu('ks-drop');
  input.addEventListener('change',()=>{upHandle(input.files[0]);input.value='';});
  drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click();}});
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over');}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');}));
  drop.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files;if(f&&f[0])upHandle(f[0]);});
  KSu('ks-up-apply').addEventListener('click',upApply);
  KSu('ks-up-cancel').addEventListener('click',()=>{upPending=null;upReview();KSu('ks-up-msg').textContent='';upErr('');});
})();
window.SSKondisi={parseNerda,parseMonit};
renderAgg();loadUpd((window.__D&&window.__D.kondisi_update)||[]);
if(!window.SSAdmin||!window.SSAdmin.isAdmin())lockForm('Hanya admin yang bisa menyimpan update. Klik Login admin di kanan bawah, lalu buka tab ini lagi.');
})();
