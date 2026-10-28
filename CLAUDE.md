# Aturan kerja repo DALOP-ODS

Situs live: https://edorizaldi.github.io/DALOP-ODS/ (GitHub Pages dari branch `main`).

## Perubahan tampilan atau kode: selalu lewat PR
1. Jangan push langsung ke `main`.
2. Buat branch baru dari `main` terbaru, commit perubahan di sana, lalu buka Pull Request ke `main`.
3. Sertakan link pratinjau branch di deskripsi PR:
   `https://raw.githack.com/edorizaldi/DALOP-ODS/<nama-branch>/index.html`
4. Merge ke `main` hanya setelah pemilik repo (edorizaldi) menyatakan oke.
5. Setelah merge, cek bahwa workflow "pages build and deployment" selesai hijau.

## Pengecualian
Unggahan data oleh admin dari dashboard live (tombol Login admin) tetap langsung menulis ke `main`.

## Sinkron dengan artifact Claude
Dashboard juga ada sebagai artifact Claude "SAIDI SAIFI Sumkal 2026". Perubahan tampilan di repo perlu disamakan ke artifact bila diminta, dan sebaliknya.
