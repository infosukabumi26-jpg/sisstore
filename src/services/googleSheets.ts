import type {
  OpnameReport,
  SaleTransaction,
  StoreSettings,
  TShirtItem,
  TShirtSize,
} from '../types/sistor';
import {
  calculateItemMetrics,
  calculateOpnameSummary,
  calculateProductSalesBreakdown,
} from '../utils/calculations.ts';

export type DriveMediaCategory = 'produk' | 'logo' | 'qris';

export interface AppsScriptPingResult {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  driveFolderName: string;
  driveFolderUrl: string;
}

export interface DriveUploadResult {
  fileId: string;
  directUrl: string;
  webViewLink: string;
  driveFolderUrl: string;
}

export interface AppsScriptSyncResult extends AppsScriptPingResult {
  syncedAt: string;
}

export interface AppsScriptPullResult {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  items: TShirtItem[];
  settingsPatch: Partial<StoreSettings>;
}

export function isValidAppsScriptUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'script.google.com' ||
        parsed.hostname === 'script.googleusercontent.com') &&
      parsed.pathname.includes('/macros/')
    );
  } catch {
    return false;
  }
}

export function parseDataUrl(
  dataUrl: string
): { mimeType: string; base64: string; ext: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  const ext = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
    ? 'webp'
    : mimeType.includes('svg')
    ? 'svg'
    : 'jpg';
  return { mimeType, base64, ext };
}

function sanitizeCellUrl(url: string | undefined): string {
  if (!url) return '';
  // Never dump inline base64 data URLs into Google Sheets cells
  if (url.startsWith('data:')) return '';
  return url;
}

export function buildAllSheetRows(
  items: TShirtItem[],
  transactions: SaleTransaction[],
  reports: OpnameReport[],
  settings: StoreSettings
) {
  const summary = calculateOpnameSummary(items, transactions);

  const katalogRows: Array<Array<string | number>> = [
    [
      'ID',
      'SKU',
      'Nama Kaos',
      'Kategori',
      'Ukuran',
      'Warna',
      'Harga Dasar (HPP)',
      'Harga Jual',
      'Stok Awal',
      'Stok Masuk',
      'Terjual',
      'Stok Sistem',
      'Stok Fisik',
      'Keterangan Lapangan',
      'Updated At',
      'Foto Produk (Drive URL)',
    ],
    ...items.map((item) => {
      const m = calculateItemMetrics(item);
      return [
        item.id,
        item.sku,
        item.nama,
        item.kategori,
        item.ukuran,
        item.warna,
        item.hpp,
        item.hargaJual,
        item.stokAwal,
        item.stokMasuk,
        item.terjual,
        m.stokSistem,
        item.stokFisik,
        item.keterangan,
        item.updatedAt,
        sanitizeCellUrl(item.imageUrl),
      ];
    }),
  ];

  const opnameRows: Array<Array<string | number>> = [
    [
      'SKU',
      'Nama Kaos',
      'Ukuran',
      'Warna',
      'Harga Dasar (HPP)',
      'Harga Jual',
      'Margin / Pcs',
      'Stok Awal',
      'Stok Masuk',
      'Terjual',
      'Stok Sistem',
      'Stok Fisik',
      'Selisih Barang',
      'Status Opname',
      'Nilai Penjualan',
      'Total HPP Terjual',
      'Laba Kotor',
      'Kerugian Selisih Barang (HPP)',
      'Potensi Kehilangan Omzet',
      'Keterangan Manual (Temuan Lapangan)',
    ],
    ...items.map((item) => {
      const m = calculateItemMetrics(item);
      return [
        item.sku,
        item.nama,
        item.ukuran,
        item.warna,
        item.hpp,
        item.hargaJual,
        m.marginPerPcs,
        item.stokAwal,
        item.stokMasuk,
        item.terjual,
        m.stokSistem,
        item.stokFisik,
        m.selisihQty,
        m.statusOpname,
        m.nilaiPenjualan,
        m.totalHppTerjual,
        m.labaKotor,
        m.kerugianSelisihHpp,
        m.potensiKehilanganJual,
        item.keterangan,
      ];
    }),
    [
      'TOTAL',
      `Toko ${settings.storeName}`,
      '',
      '',
      '',
      '',
      '',
      summary.totalStokAwal,
      summary.totalStokMasuk,
      summary.totalTerjual,
      summary.totalStokSistem,
      summary.totalStokFisik,
      summary.totalSelisihUnit,
      `Akurasi ${summary.akurasiPersen.toFixed(1)}%`,
      summary.totalNilaiPenjualan,
      summary.totalHppTerjual,
      summary.totalLabaKotor,
      summary.totalKerugianSelisihHpp,
      summary.totalPotensiKehilanganJual,
      `Laba Bersih Setelah Kerugian: ${summary.labaBersihSetelahSelisih}`,
    ],
  ];

  const productStats = calculateProductSalesBreakdown(items);

  const ringkasanRows: Array<Array<string | number>> = [
    ['Indikator Kinerja Toko (Executive Summary)', `Toko ${settings.storeName}`],
    ['Nama Toko & Tagline', `${settings.storeName} — ${settings.storeTagline}`],
    ['Alamat Toko', settings.storeAddress],
    ['Tanggal Sinkronisasi', new Date().toISOString().slice(0, 10)],
    ['Total Varian Kaos (SKU)', summary.jumlahSku],
    ['Akurasi Stock Opname (%)', Number(summary.akurasiPersen.toFixed(1))],
    ['Total Kaos Terjual (Pcs)', summary.totalTerjual],
    ['Total Nilai Penjualan Katalog (Rp)', summary.totalNilaiPenjualan],
    ['Total Harga Dasar / HPP Terjual (Rp)', summary.totalHppTerjual],
    ['Laba Kotor Penjualan (Rp)', summary.totalLabaKotor],
    ['Kerugian Selisih Barang HPP (Rp)', summary.totalKerugianSelisihHpp],
    ['Laba Bersih Setelah Kerugian Selisih (Rp)', summary.labaBersihSetelahSelisih],
    ['Total Omzet Transaksi POS Tercatat (Rp)', summary.totalOmzetTransaksi],
    ['Total Diskon Transaksi POS (Rp)', summary.totalDiskonTransaksi],
    ['Penerimaan Pembayaran Cash (Rp)', summary.paymentBreakdown.CASH.total],
    ['Penerimaan Pembayaran QRIS (Rp)', summary.paymentBreakdown.QRIS.total],
    ['Penerimaan Transfer Bank (Rp)', summary.paymentBreakdown.TRANSFER_BANK.total],
    ['Nilai Aset Persediaan Fisik Riil HPP (Rp)', summary.nilaiAsetFisikHpp],
    ['Estimasi Nilai Jual Stok Fisik (Rp)', summary.nilaiAsetFisikJual],
  ];

  const transaksiRows: Array<Array<string | number>> = [
    [
      'ID',
      'No Invoice',
      'Tanggal',
      'Waktu',
      'Rincian Kaos',
      'Total Qty',
      'Total HPP',
      'Subtotal',
      'Diskon',
      'Total Penjualan',
      'Metode Pembayaran',
      'Bank / Referensi',
      'Uang Diterima',
      'Kembalian',
      'Kasir',
      'Role Kasir',
      'Catatan',
    ],
    ...transactions.map((tx) => [
      tx.id,
      tx.invoiceNo,
      tx.tanggal,
      tx.waktu,
      tx.items.map((i) => `${i.sku} (${i.ukuran}) x${i.qty}`).join('; '),
      tx.totalQty,
      tx.totalHpp,
      tx.subtotal,
      tx.diskon,
      tx.totalPenjualan,
      tx.metodePembayaran,
      tx.bankTujuan || tx.referensiPembayaran || '-',
      tx.uangDiterima ?? '',
      tx.kembalian ?? '',
      tx.kasir,
      tx.kasirRole === 'ADMIN' ? 'Owner / Admin' : 'Operator / Kasir',
      tx.catatan,
    ]),
  ];

  const penjualanProdukRows: Array<Array<string | number>> = [
    [
      'SKU',
      'Nama Kaos',
      'Kategori',
      'Ukuran',
      'Warna',
      'Harga Jual',
      'HPP',
      'Qty Terjual',
      'Omzet Penjualan',
      'Total HPP',
      'Laba Kotor',
      'Margin (%)',
      'Sisa Stok',
    ],
    ...productStats.map((p) => [
      p.sku,
      p.nama,
      p.kategori,
      p.ukuran,
      p.warna,
      p.hargaJual,
      p.hpp,
      p.qtyTerjual,
      p.omzet,
      p.totalHpp,
      p.labaKotor,
      Number(p.marginPersen.toFixed(1)),
      p.stokTersedia,
    ]),
    [
      'TOTAL',
      `Toko ${settings.storeName}`,
      '',
      '',
      '',
      '',
      '',
      summary.totalTerjual,
      summary.totalNilaiPenjualan,
      summary.totalHppTerjual,
      summary.totalLabaKotor,
      '',
      summary.totalStokSistem,
    ],
  ];

  const laporanRows: Array<Array<string | number>> = [
    [
      'Kode Laporan',
      'Tanggal Opname',
      'Periode',
      'Petugas',
      'Jumlah SKU',
      'Akurasi (%)',
      'Total Nilai Penjualan',
      'Total HPP Terjual',
      'Laba Kotor',
      'Kerugian Selisih Barang (HPP)',
      'Laba Bersih Setelah Selisih',
      'Penjualan Cash',
      'Penjualan QRIS',
      'Penjualan Transfer Bank',
      'Catatan Umum',
    ],
    ...reports.map((rep) => [
      rep.kodeLaporan,
      rep.tanggalOpname,
      rep.periode,
      rep.petugas,
      rep.summary.jumlahSku,
      Number(rep.summary.akurasiPersen.toFixed(1)),
      rep.summary.totalNilaiPenjualan,
      rep.summary.totalHppTerjual,
      rep.summary.totalLabaKotor,
      rep.summary.totalKerugianSelisihHpp,
      rep.summary.labaBersihSetelahSelisih,
      rep.summary.paymentBreakdown.CASH.total,
      rep.summary.paymentBreakdown.QRIS.total,
      rep.summary.paymentBreakdown.TRANSFER_BANK.total,
      rep.catatanUmum,
    ]),
  ];

  const settingsRows: Array<Array<string>> = [
    ['Key', 'Value'],
    ['storeName', settings.storeName],
    ['storeTagline', settings.storeTagline],
    ['storeAddress', settings.storeAddress],
    ['storePhone', settings.storePhone],
    ['logoUrl', sanitizeCellUrl(settings.logoUrl)],
    ['qrisMerchantId', settings.qrisMerchantId],
    ['qrisMerchantName', settings.qrisMerchantName],
    ['qrisImageUrl', sanitizeCellUrl(settings.qrisImageUrl)],
    ['defaultCashier', settings.defaultCashier],
    ['receiptFooterNote', settings.receiptFooterNote],
    ['driveFolderName', settings.driveFolderName],
    ['bankAccountsJson', JSON.stringify(settings.bankAccounts)],
    ['usersJson', JSON.stringify(settings.users)],
  ];

  return {
    ringkasanRows,
    katalogRows,
    opnameRows,
    transaksiRows,
    penjualanProdukRows,
    laporanRows,
    settingsRows,
  };
}

export function parseKatalogRows(values: unknown[][]): TShirtItem[] {
  if (!Array.isArray(values) || values.length <= 1) {
    return [];
  }

  const validSizes: TShirtSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
  const parsed: TShirtItem[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length < 8) continue;
    const sku = String(row[1] ?? '').trim();
    const nama = String(row[2] ?? '').trim();
    if (!sku || !nama) continue;

    const rawSize = String(row[4] ?? 'L').toUpperCase() as TShirtSize;
    const ukuran: TShirtSize = validSizes.includes(rawSize) ? rawSize : 'L';

    const toNum = (val: unknown, fallback = 0) => {
      if (typeof val === 'number' && Number.isFinite(val)) return val;
      const cleaned = String(val ?? '').replace(/[^0-9-]/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : fallback;
    };

    const imageUrl = String(row[15] ?? '').trim();

    parsed.push({
      id: String(row[0] || `sheet-${i}`),
      sku,
      nama,
      kategori: String(row[3] || 'Combed 24s'),
      ukuran,
      warna: String(row[5] || 'Hitam'),
      hpp: toNum(row[6]),
      hargaJual: toNum(row[7]),
      stokAwal: toNum(row[8]),
      stokMasuk: toNum(row[9]),
      terjual: toNum(row[10]),
      stokFisik: toNum(
        row[12],
        toNum(row[8]) + toNum(row[9]) - toNum(row[10])
      ),
      keterangan: String(row[13] ?? ''),
      updatedAt: String(row[14] || new Date().toISOString()),
      ...(imageUrl ? { imageUrl } : {}),
    });
  }

  return parsed;
}

export function parseSettingsRows(values: unknown[][]): Partial<StoreSettings> {
  if (!Array.isArray(values) || values.length <= 1) return {};
  const map: Record<string, string> = {};
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length < 2) continue;
    const k = String(row[0] ?? '').trim();
    const v = String(row[1] ?? '');
    if (k) map[k] = v;
  }

  const patch: Partial<StoreSettings> = {};
  if (map.storeName) patch.storeName = map.storeName;
  if (map.storeTagline) patch.storeTagline = map.storeTagline;
  if (map.storeAddress) patch.storeAddress = map.storeAddress;
  if (map.storePhone) patch.storePhone = map.storePhone;
  if (map.logoUrl) patch.logoUrl = map.logoUrl;
  if (map.qrisMerchantId) patch.qrisMerchantId = map.qrisMerchantId;
  if (map.qrisMerchantName) patch.qrisMerchantName = map.qrisMerchantName;
  if (map.qrisImageUrl) patch.qrisImageUrl = map.qrisImageUrl;
  if (map.defaultCashier) patch.defaultCashier = map.defaultCashier;
  if (map.receiptFooterNote) patch.receiptFooterNote = map.receiptFooterNote;
  if (map.driveFolderName) patch.driveFolderName = map.driveFolderName;
  if (map.bankAccountsJson) {
    try {
      const parsedBanks = JSON.parse(map.bankAccountsJson);
      if (Array.isArray(parsedBanks) && parsedBanks.length > 0) {
        patch.bankAccounts = parsedBanks;
      }
    } catch {
      // Ignore malformed JSON
    }
  }
  if (map.usersJson) {
    try {
      const parsedUsers = JSON.parse(map.usersJson);
      if (Array.isArray(parsedUsers) && parsedUsers.length > 0) {
        patch.users = parsedUsers;
      }
    } catch {
      // Ignore malformed JSON
    }
  }
  return patch;
}

async function postAppsScript<T>(
  appsScriptUrl: string,
  payload: Record<string, unknown>
): Promise<T> {
  const url = appsScriptUrl.trim();
  if (!isValidAppsScriptUrl(url)) {
    throw new Error(
      'URL Web App Google Apps Script tidak valid. Pastikan berawalan https://script.google.com/macros/.../exec'
    );
  }

  // Use text/plain to send a CORS simple request (avoids OPTIONS preflight rejected by Apps Script)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(
      `Gagal menghubungi Google Apps Script (HTTP ${res.status}). Pastikan akses Web App diset ke "Anyone".`
    );
  }

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      'Respons Google Apps Script bukan JSON. Pastikan URL berakhir dengan /exec dan deployment Web App diakses sebagai Anyone.'
    );
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Google Apps Script mengembalikan error.');
  }

  return data as T;
}

export async function pingAppsScript(
  appsScriptUrl: string,
  folderName = 'Sisstore_Media_Drive'
): Promise<AppsScriptPingResult> {
  return postAppsScript<AppsScriptPingResult>(appsScriptUrl, {
    action: 'ping',
    folderName,
  });
}

export async function uploadImageToDrive(
  appsScriptUrl: string,
  options: {
    category: DriveMediaCategory;
    fileName: string;
    dataUrl: string;
    folderName?: string;
  }
): Promise<DriveUploadResult> {
  const parsed = parseDataUrl(options.dataUrl);
  if (!parsed) {
    throw new Error('Format gambar tidak valid untuk diunggah ke Google Drive.');
  }

  const cleanName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  return postAppsScript<DriveUploadResult>(appsScriptUrl, {
    action: 'uploadImage',
    category: options.category,
    folderName: options.folderName || 'Sisstore_Media_Drive',
    fileName: `${cleanName}.${parsed.ext}`,
    mimeType: parsed.mimeType,
    base64: parsed.base64,
  });
}

export async function syncAllViaAppsScript(
  appsScriptUrl: string,
  items: TShirtItem[],
  transactions: SaleTransaction[],
  reports: OpnameReport[],
  settings: StoreSettings
): Promise<AppsScriptSyncResult> {
  const rows = buildAllSheetRows(items, transactions, reports, settings);
  return postAppsScript<AppsScriptSyncResult>(appsScriptUrl, {
    action: 'syncAll',
    folderName: settings.driveFolderName || 'Sisstore_Media_Drive',
    ...rows,
  });
}

export async function pullAllViaAppsScript(
  appsScriptUrl: string
): Promise<AppsScriptPullResult> {
  const res = await postAppsScript<{
    ok: true;
    spreadsheetId: string;
    spreadsheetTitle: string;
    spreadsheetUrl: string;
    katalogRows?: unknown[][];
    settingsRows?: unknown[][];
  }>(appsScriptUrl, {
    action: 'pullAll',
  });

  return {
    spreadsheetId: res.spreadsheetId,
    spreadsheetTitle: res.spreadsheetTitle,
    spreadsheetUrl: res.spreadsheetUrl,
    items: parseKatalogRows(res.katalogRows || []),
    settingsPatch: parseSettingsRows(res.settingsRows || []),
  };
}
