# Prototipe aplikasi pegawai NEP

Ekspor dari kanvas desain, 27 September 2026. Delapan arah desain (K1, K2, K3,
K5, K6, K7, K8, T3), 58 layar, semuanya bisa diklik dan beranimasi.

## Cara membuka

- Klik dua kali `index.html`. Tidak perlu server.
- Font dimuat dari Google Fonts, jadi perlu internet. Tanpa internet, layar
  tetap tampil dengan font cadangan.

## Memasang di Netlify

Folder ini situs statis tanpa proses build.

- Dari repo: di Netlify pilih Add new site, Import an existing project, pilih
  repo, lalu isi Publish directory dengan jalur folder ini di repo. Build
  command dikosongkan.
- Tanpa repo: seret folder ini ke app.netlify.com/drop.

Situs Netlify bisa dibuka siapa saja yang tahu alamatnya.

## Isi folder

- `index.html`: daftar delapan alur.
- `ringkasan-K1.html` sampai `ringkasan-T3.html`: semua layar satu alur
  berjajar ke samping. Klik tombol di layar mana pun, halaman bergeser ke
  layar tujuan, menyorotnya, dan memutar ulang animasinya. Tab
  "Coba sebagai HP" menampilkan satu layar yang bisa diklik dari layar ke layar.
- `layar/`: satu file HTML per layar, plus `dc-lite.js`, skrip kecil untuk
  pilihan yang bisa diklik, angka yang menghitung naik, dan penanganan tautan.

## Catatan

- Tombol yang belum punya tujuan, misalnya "Pakai PIN" atau "Tanya HRD",
  menampilkan pesan "Belum ada di prototipe ini".
- Semua nama, angka, dan tanggal adalah data contoh.
- Animasi berhenti sendiri kalau perangkat memakai setelan kurangi gerakan.
