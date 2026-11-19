# Sisstore — Aplikasi Kasir Penjualan & Stock Opname

Aplikasi operasional toko **Sisstore** (`Women's Fashion Shop · Lokal & Impor`, Kota Bekasi) dengan sistem login multi-peran (**Operator / Kasir** & **Admin / Pemilik / Owner**), manajemen user & update password lengkap, kasir POS bergaya toko online (**Keranjang Belanja**, **Harga Jadi / pcs** fleksibel, **Cash**, **QRIS**, dan **Transfer Bank**), cetak struk langsung (`58mm` / `80mm` / `Standar`), tabel **Stock Opname** interaktif, **Pusat Laporan Lengkap** (Opname, Penjualan, dan Laba Rugi), serta database **Google Sheets** dan penyimpanan gambar **Google Drive** tanpa Firebase.

## Akun Login Default (Dapat Diubah & Ditambah di Pengaturan)

1. **Admin / Pemilik (Owner)**
   - Username: `admin` · Password: `owner123`
   - Akses penuh: Dashboard Pemilik, Kasir Penjualan, Tabel Stock Opname Lengkap (HPP & Kerugian Selisih), Pusat Laporan (Opname, Penjualan & Laba Rugi), Katalog Kaos & HPP, serta Pengaturan Sheets, Drive & Manajemen User.
2. **Operator / Kasir**
   - Username: `operator` · Password: `kasir123`
   - Akses operasional: Kasir Penjualan (Keranjang, Harga Jadi / pcs, Cash, QRIS, Transfer Bank), Input Hitung Fisik Stock Opname (tanpa menampilkan HPP & Laba Bersih Owner), serta Laporan Shift Kasir.

## Fitur Utama

1. **Kasir Penjualan (POS), Keranjang & Cetak Struk**
   - Katalog dengan filter ukuran, pencarian SKU/nama/warna, tombol **Keranjang** di header & panel/drawer keranjang belanja, serta pengaturan **Harga Jadi / pcs** fleksibel saat negosiasi checkout.
   - Pembayaran **Cash (Tunai)** dengan kalkulator kembalian, **QRIS** (mendukung upload gambar QRIS toko), dan **Transfer Bank**.
   - Cetak struk langsung dengan pilihan kertas `58mm`, `80mm`, atau `Standar` serta logo toko otomatis.

2. **Tabel Stock Opname Penjualan**
   - Kolom lengkap untuk Admin: SKU, Nama Produk, Varian (Ukuran/Warna), **Harga Dasar (HPP)**, **Harga Jual**, Margin/pcs, Stok Awal, Stok Masuk, Terjual, Stok Sistem, **Stok Fisik** (edit langsung), **Selisih Barang**, **Nilai Penjualan**, **Kerugian Selisih Barang (HPP)**, dan kolom **Keterangan** terbuka untuk temuan lapangan.

3. **Pusat Laporan & Manajemen User**
   - **Laporan Penjualan & Kasir**, **Laporan Stock Opname**, dan **Laporan Laba Rugi & Valuasi Aset** (Admin/Owner).
   - **Manajemen User & Kata Sandi**: Tambah akun Operator/Admin baru, ubah peran/shift, update password, serta hapus akun secara aman.

4. **Database Google Sheets & Google Drive Profesional (Tanpa Firebase)**
   - Menggunakan **Google Apps Script Web App** (`google-apps-script/Code.gs`) yang memformat otomatis 7 tab spreadsheet bergaya profesional (`Ringkasan_Eksekutif`, `Katalog_Kaos`, `Stock_Opname`, `Transaksi_Penjualan`, `Laporan_Penjualan_Produk`, `Laporan_Opname`, dan `Pengaturan_Toko`).
   - Foto produk, logo toko, dan gambar QRIS otomatis diunggah ke folder Google Drive (`Sisstore_Media_Drive`).

## Cara Setup Google Sheets & Google Drive

1. Buka Google Spreadsheet Anda (atau buat baru via `sheets.new`).
2. Klik **Extensions → Apps Script**.
3. Salin seluruh isi file `google-apps-script/Code.gs` (atau salin langsung dari menu **Sheets, Drive & Akun** di aplikasi).
4. Klik **Deploy → New deployment → Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Salin URL Web App berakhiran `/exec` dan tempelkan di menu **Sheets, Drive & Akun** pada aplikasi Sisstore.

## Deploy ke GitHub Baru & Domain Vercel Baru

1. Push seluruh kode ke repository GitHub baru Anda (`git push -u origin main`).
2. Buka [vercel.com](https://vercel.com), klik **Add New Project**, impor repository GitHub baru tersebut, lalu klik **Deploy**.
3. Jika Anda mengganti atau menambahkan custom domain baru di **Project Settings → Domains** Vercel:
   - Aplikasi langsung berjalan tanpa perlu daftar domain whitelist di Google Cloud Console/Firebase karena sinkronisasi ke Spreadsheet memakai Apps Script (`/exec`).
   - **Catatan penting**: Data lokal (`localStorage`) dan URL Apps Script `/exec` disimpan per domain di browser. Jadi saat pertama kali membuka domain Vercel yang baru, login sebagai **Admin**, masuk ke **Sheets, Drive & Akun**, tempel ulang URL Web App Apps Script (`/exec`), lalu klik **Muat dari Google Sheets** agar seluruh katalog, user, dan pengaturan toko langsung termuat.
