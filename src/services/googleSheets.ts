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
  transactions: SaleTransaction[];
  reports: OpnameReport[];
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
      parsed.pathname.includes('/macros/') &&
      /\/exec\/?$/i.test(parsed.pathname)
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
      'Penyesuaian Harga Jadi',
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
        item.penyesuaianHargaNego ?? 0,
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
      'Items JSON (Restore)',
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
      JSON.stringify(tx.items),
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
      'Detail JSON (Restore)',
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
      JSON.stringify(rep),
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
    const penyesuaianHargaNego = row.length > 16 ? toNum(row[16], 0) : 0;

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
      ...(penyesuaianHargaNego !== 0 ? { penyesuaianHargaNego } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    });
  }

  return parsed;
}

export function parseTransaksiRows(values: unknown[][]): SaleTransaction[] {
  if (!Array.isArray(values) || values.length <= 1) return [];
  const toNum = (val: unknown, fallback = 0) => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    const cleaned = String(val ?? '').replace(/[^0-9-]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  };
  const parsed: SaleTransaction[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length < 15) continue;
    const id = String(row[0] ?? '').trim();
    const invoiceNo = String(row[1] ?? '').trim();
    if (!id || !invoiceNo) continue;

    let txItems: SaleTransaction['items'] = [];
    if (row[17]) {
      try {
        const maybe = JSON.parse(String(row[17]));
        if (Array.isArray(maybe)) txItems = maybe;
      } catch {
        txItems = [];
      }
    }

    const rawMethod = String(row[10] ?? 'CASH').toUpperCase();
    const metodePembayaran: SaleTransaction['metodePembayaran'] =
      rawMethod === 'QRIS'
        ? 'QRIS'
        : rawMethod === 'TRANSFER_BANK'
        ? 'TRANSFER_BANK'
        : 'CASH';
    const rawRef = String(row[11] ?? '').trim();

    parsed.push({
      id,
      invoiceNo,
      tanggal: String(row[2] ?? '').slice(0, 10),
      waktu: String(row[3] ?? '').slice(0, 5),
      items: txItems,
      totalQty: toNum(row[5]),
      totalHpp: toNum(row[6]),
      subtotal: toNum(row[7]),
      diskon: toNum(row[8]),
      totalPenjualan: toNum(row[9]),
      metodePembayaran,
      ...(metodePembayaran === 'TRANSFER_BANK' && rawRef && rawRef !== '-'
        ? { bankTujuan: rawRef }
        : rawRef && rawRef !== '-'
        ? { referensiPembayaran: rawRef }
        : {}),
      ...(row[12] !== '' && row[12] !== undefined
        ? { uangDiterima: toNum(row[12]) }
        : {}),
      ...(row[13] !== '' && row[13] !== undefined
        ? { kembalian: toNum(row[13]) }
        : {}),
      kasir: String(row[14] ?? 'Kasir'),
      kasirRole: String(row[15] ?? '').toLowerCase().includes('admin')
        ? 'ADMIN'
        : 'OPERATOR',
      catatan: String(row[16] ?? ''),
    });
  }

  return parsed;
}

export function parseLaporanRows(values: unknown[][]): OpnameReport[] {
  if (!Array.isArray(values) || values.length <= 1) return [];
  const parsed: OpnameReport[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || !row[15]) continue;
    try {
      const rep = JSON.parse(String(row[15])) as OpnameReport;
      if (rep && rep.id && rep.kodeLaporan && rep.summary) {
        parsed.push(rep);
      }
    } catch {
      // Ignore malformed row
    }
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
  if (/\/dev(\?.*)?$/i.test(url)) {
    throw new Error(
      'URL berakhir dengan /dev (mode uji). Gunakan URL Web App berakhiran /exec dari menu Deploy → New deployment di Google Apps Script.'
    );
  }
  if (!isValidAppsScriptUrl(url)) {
    throw new Error(
      'URL Web App Google Apps Script tidak valid. Pastikan berawalan https://script.google.com/macros/... dan berakhiran /exec'
    );
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 45000);

  let res: Response;
  try {
    // Use text/plain to send a CORS simple request (avoids OPTIONS preflight rejected by Apps Script)
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(
        'Koneksi ke Google Apps Script melebihi batas waktu (45 detik). Periksa internet atau coba sinkronkan ulang.'
      );
    }
    throw new Error(
      'Tidak dapat terhubung ke Google Apps Script. Pastikan koneksi internet aktif, URL berakhiran /exec, dan deployment diset "Who has access: Anyone".'
    );
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

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
      'Respons Google Apps Script bukan JSON (kemungkinan dialihkan ke halaman login Google). Pastikan deployment Web App diset "Who has access: Anyone" dan URL berakhiran /exec.'
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
    transaksiRows?: unknown[][];
    laporanRows?: unknown[][];
  }>(appsScriptUrl, {
    action: 'pullAll',
  });

  return {
    spreadsheetId: res.spreadsheetId,
    spreadsheetTitle: res.spreadsheetTitle,
    spreadsheetUrl: res.spreadsheetUrl,
    items: parseKatalogRows(res.katalogRows || []),
    transactions: parseTransaksiRows(res.transaksiRows || []),
    reports: parseLaporanRows(res.laporanRows || []),
    settingsPatch: parseSettingsRows(res.settingsRows || []),
  };
}

export function computeSyncSignature(
  items: TShirtItem[],
  transactions: SaleTransaction[],
  reports: OpnameReport[],
  settings: StoreSettings
): string {
  return JSON.stringify({
    items,
    transactions,
    reports,
    settings: {
      storeName: settings.storeName,
      storeTagline: settings.storeTagline,
      storeAddress: settings.storeAddress,
      storePhone: settings.storePhone,
      logoUrl: settings.logoUrl,
      qrisMerchantId: settings.qrisMerchantId,
      qrisMerchantName: settings.qrisMerchantName,
      qrisImageUrl: settings.qrisImageUrl,
      defaultCashier: settings.defaultCashier,
      autoPrintReceipt: settings.autoPrintReceipt,
      receiptFooterNote: settings.receiptFooterNote,
      bankAccounts: settings.bankAccounts,
      users: settings.users,
      appsScriptUrl: settings.appsScriptUrl,
      driveFolderName: settings.driveFolderName,
    },
  });
}
