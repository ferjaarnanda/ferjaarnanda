FERJA ARNANDA — LOADER ONLY

Isi:
- loader.js
- loader.css

Cara pasang ke website yang SUDAH ADA:

1. Upload loader.js dan loader.css ke folder yang sama dengan index.html.

2. Di <head> index.html, tambahkan:
   <link rel="stylesheet" href="loader.css">

3. Sebelum </body> index.html, tambahkan:
   <script src="loader.js"></script>

Tidak perlu mengganti index.html, style.css, script.js, gambar,
CV, atau file portfolio lainnya.

Loader akan:
- menampilkan background gelap
- membuat bintang kecil secara otomatis
- menjalankan 0% sampai 100%
- fade out
- lalu website utama tetap tampil seperti biasa

Durasi default: sekitar 2.6 detik.

Kalau ingin mengubah durasi, buka loader.js dan ubah:
const duration = 2600;
