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
