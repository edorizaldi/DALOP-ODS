# Dashboard Keandalan Sumkal 2026 (versi web mandiri)

Versi web dari artifact "SAIDI SAIFI Sumkal 2026" untuk GitHub Pages. Pembaca cukup membuka link, tanpa akun Claude atau GitHub.

## Isi folder
- `index.html`: halaman dashboard
- `*.js`: script tiap tab (sama dengan versi artifact)
- `shim.js`: pengganti layanan Claude (baca data, unduhan PNG, simpan unggahan ke GitHub)
- `config.js`: nama akun dan repo GitHub
- `data/*.js`: dataset dashboard (per 26 Oktober 2026)
- `vendor/d3.min.js`: library grafik

## Memasang di GitHub Pages
1. Masuk ke github.com sebagai **edorizaldi**, lalu buat repo baru bernama **saidi-saifi-sumkal**.
   Akun GitHub gratis mewajibkan repo **Public** untuk GitHub Pages. Isi data ikut terbuka untuk publik.
   Repo Private dengan Pages butuh GitHub Pro.
2. Di repo tersebut, pilih **Add file → Upload files**. Seret seluruh isi folder ini, termasuk folder `data` dan `vendor`, lalu klik **Commit changes**.
3. Buka **Settings → Pages**. Pada **Build and deployment**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`, lalu klik **Save**.
4. Setelah 1–2 menit, dashboard bisa dibuka di **https://edorizaldi.github.io/saidi-saifi-sumkal/**

Jika nama repo berbeda, ubah `repo` di `config.js`.

## Tab Kondisi Sistem
Peta Sumatera dan Kalimantan berisi status sistem grid dan isolated SUMKAL per tanggal (normal, siaga, defisit, atau abu-abu bila datanya kosong), penyebab defisit, tabel monitoring defisit, dan daftar sistem.

- `kondisi_data.js`: data harian per sistem (sheet NERDA HARIAN), laporan defisit (sheet Monit Defisit) dan bentuk peta. Sumber: `Database_Sistem_SUMKAL.xlsx`, data 1–25 Oktober 2026.
- `kondisi_update.js`: isian form **Update data** di tab ini. Hanya admin yang sudah login yang bisa menyimpan; setiap simpan menulis ulang file ini di repo.
- `kondisi-tab.js` dan `kondisi-tab.css`: tampilan dan logika tab.

Isian form menimpa data file untuk sistem dan tanggal yang sama.

Untuk memperbarui laporan harian, klik **Update laporan harian** di tab Kondisi Sistem, lalu unggah file Excel seperti `Database_Sistem_SUMKAL.xlsx` (sheet **NERDA HARIAN** dan **Monit Defisit**). File dibaca di browser; periksa ringkasannya lalu klik **Terapkan ke dashboard**. Bila admin sudah login, `kondisi_data.js` dan tanggal update di `info_update.js` ikut tersimpan ke repo. Tanpa login, data baru hanya tampil di layar sendiri.

## Tab Hirarki Aset
Menu **Database → Hirarki Aset**: pilih GI, lalu feeder, untuk melihat Zona, Section, Segment, Lateral, Gardu dan Trafo di bawahnya (pohon hirarki dan tabel per level), plus ringkasan dan daftar aset bermasalah.

- Sumber: `ALL_DATA_ASET_JARINGAN.xlsx` (sheet GI, FEEDER, ZONA, SECTION, SEGMENT, LATERAL, GARDU, TRAFO). Tiap aset ditelusuri ke atas lewat PARENT_ASSET, termasuk rantai selevel (LT→LT, SG→SG, SE→SE, ZO→ZO). Gardu dipasang lewat PARENT_ASSET-nya (kode aset atau SSOTNUMBER). Trafo dipasang lewat KODE_GARDU; bila kodenya tidak ada di sheet GARDU, dicocokkan lewat nama gardu di ULP yang sama.
- `hx_*.js`: dataset hirarki. File ini besar (±33 MB total), jadi **tidak** dimuat di `<head>`; `hirarki-tab.js` baru memuatnya saat tab Hirarki Aset dibuka, dan data gardu hanya untuk kelompok wilayah GI yang dipilih (`hx_gardu_1` Sumut+Aceh, `hx_gardu_2` S2JB+Lampung+Babel, `hx_gardu_3` Kalimantan+Riau+Sumbar).
- `hirarki-tab.js`, `hirarki-tab.css`: tampilan dan logika tab.

## Update data dari dashboard (admin)
Pembaca biasa hanya bisa melihat dan mengunduh PNG. Untuk menyimpan unggahan (tab Update Data Bulanan dan tombol Update laporan harian), admin login dengan nama dan password.

### Membuat akun admin (sekali, oleh pemilik repo)
1. Buat token GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Pada **Repository access** pilih repo ini saja, lalu pada **Permissions → Contents** pilih **Read and write**.
2. Buka `admin-setup.html` di situs dashboard (mis. `https://edorizaldi.github.io/DALOP-ODS/admin-setup.html`).
3. Tempel token, isi nama admin dan password (minimal 10 karakter), lalu klik **Simpan admin**. Ulangi untuk admin lain bila perlu, dengan token yang sama.

Token disimpan di `admin-keys.js` dalam bentuk terenkripsi (PBKDF2-SHA256 + AES-GCM) dan hanya bisa dibuka dengan password admin. Karena file ini ada di repo public, gunakan password yang panjang dan unik.

### Login dan unggah
1. Di dashboard, klik **Login admin** (kanan bawah), pilih nama, lalu isi password.
2. Unggah file seperti biasa. Dashboard menyimpan dataset baru ke repo. Pembaca lain melihat data baru setelah GitHub Pages diperbarui (sekitar 1–2 menit, bisa sampai 10 menit karena cache browser).
3. Login berlaku sampai tab browser ditutup atau klik **Keluar**.

Untuk mencabut semua akses admin, hapus token di pengaturan GitHub. Untuk mencabut satu admin, hapus namanya di `admin-setup.html`.
