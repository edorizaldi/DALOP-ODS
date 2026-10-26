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

## Update data dari dashboard (admin)
Pembaca biasa hanya bisa melihat dan mengunduh PNG. Untuk menyimpan unggahan (tab Update Data Bulanan dan tombol Update laporan harian), admin perlu token GitHub:
1. Buka GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Pada **Repository access**, pilih **Only select repositories** → `saidi-saifi-sumkal`.
3. Pada **Permissions → Repository permissions → Contents**, pilih **Read and write**. Atur masa berlaku sesuai kebutuhan.
4. Di dashboard, klik **Login admin untuk update data** (kanan bawah), lalu tempel token tersebut. Token hanya disimpan di browser itu.
5. Unggah file seperti biasa. Dashboard menyimpan dataset baru ke folder `data/` di repo. Pembaca lain melihat data baru setelah GitHub Pages selesai memperbarui situs (sekitar 1–2 menit, bisa sampai 10 menit karena cache browser).

Jangan bagikan token. Untuk mencabut akses, hapus token di pengaturan GitHub.
