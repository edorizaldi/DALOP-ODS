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

## Password akses dashboard
Dashboard hanya terbuka setelah password akses dimasukkan. Semua file data di repo dienkripsi (AES-GCM 256) dengan satu kunci acak, dan kunci itu hanya bisa dibuka dengan password akses. Jadi walaupun repo public, isi data tidak bisa dibaca tanpa password.

1. Buat token GitHub (lihat langkah di bawah), lalu buka `admin-setup.html`.
2. Di bagian **Password akses dashboard**, isi password lalu klik **Aktifkan password akses**. Semua file data akan dienkripsi.
3. Untuk menambah atau mengganti password akses (mis. password terpisah untuk kelompok pengguna lain), isi salah satu password akses yang sekarang, label, dan password baru.

Pembaca yang mencentang **Ingat di perangkat ini** tidak perlu mengetik password lagi di perangkat tersebut sampai menekan **Kunci dashboard**.

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
