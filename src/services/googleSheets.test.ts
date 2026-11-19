import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllSheetRows,
  isValidAppsScriptUrl,
  parseDataUrl,
  parseKatalogRows,
  parseSettingsRows,
} from './googleSheets.ts';
import type { StoreSettings, TShirtItem } from '../types/sistor.ts';

const SAMPLE_SETTINGS: StoreSettings = {
  storeName: 'Sistor',
  storeTagline: 'Apparel',
  storeAddress: 'Sukabumi',
  storePhone: '08123456',
  logoUrl: 'https://lh3.googleusercontent.com/d/logo123',
  qrisMerchantId: 'ID123',
  qrisMerchantName: 'SISTOR',
  qrisImageUrl: 'data:image/png;base64,iVBORw0KGgo=',
  defaultCashier: 'Raka',
  autoPrintReceipt: false,
  receiptFooterNote: 'Terima kasih',
  bankAccounts: [
    { id: 'b1', bankName: 'BCA', accountNumber: '123', accountHolder: 'Sistor' },
  ],
  users: [
    {
      id: 'u1',
      username: 'admin',
      password: 'owner123',
      displayName: 'Pemilik Sistor',
      role: 'ADMIN',
      shiftLabel: 'Owner',
    },
    {
      id: 'u2',
      username: 'operator',
      password: 'kasir123',
      displayName: 'Raka',
      role: 'OPERATOR',
      shiftLabel: 'Kasir Shift 1',
    },
  ],
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycb123/exec',
  driveFolderName: 'Sistor_Media_Drive',
  spreadsheetId: '',
  spreadsheetTitle: '',
  lastSyncedAt: null,
};

const SAMPLE_ITEM: TShirtItem = {
  id: 'tee-1',
  sku: 'STR-BLK-L',
  nama: 'Sistor Heavy Black',
  kategori: '280gsm',
  ukuran: 'L',
  warna: 'Hitam',
  hpp: 65000,
  hargaJual: 150000,
  stokAwal: 10,
  stokMasuk: 5,
  terjual: 3,
  stokFisik: 11,
  keterangan: '1 cacat jahitan',
  imageUrl: 'https://lh3.googleusercontent.com/d/img123',
  updatedAt: '2026-11-18T10:00:00Z',
};

test('isValidAppsScriptUrl accepts valid Google Apps Script Web App exec URLs and rejects invalid ones', () => {
  assert.equal(
    isValidAppsScriptUrl('https://script.google.com/macros/s/AKfycb12345/exec'),
    true
  );
  assert.equal(isValidAppsScriptUrl('http://script.google.com/macros/s/abc/exec'), false);
  assert.equal(isValidAppsScriptUrl('https://example.com/exec'), false);
  assert.equal(isValidAppsScriptUrl(''), false);
});

test('parseDataUrl extracts mimeType, extension, and base64 payload', () => {
  const parsed = parseDataUrl('data:image/png;base64,QUJDRA==');
  assert.deepEqual(parsed, {
    mimeType: 'image/png',
    base64: 'QUJDRA==',
    ext: 'png',
  });
  assert.equal(parseDataUrl('https://lh3.googleusercontent.com/d/abc'), null);
});

test('buildAllSheetRows keeps Google Drive URLs and omits inline base64 strings from Sheet cells', () => {
  const rows = buildAllSheetRows([SAMPLE_ITEM], [], [], SAMPLE_SETTINGS);
  assert.equal(rows.katalogRows[0][15], 'Foto Produk (Drive URL)');
  assert.equal(rows.katalogRows[1][15], 'https://lh3.googleusercontent.com/d/img123');

  const logoRow = rows.settingsRows.find((r) => r[0] === 'logoUrl');
  const qrisRow = rows.settingsRows.find((r) => r[0] === 'qrisImageUrl');
  assert.equal(logoRow?.[1], 'https://lh3.googleusercontent.com/d/logo123');
  assert.equal(qrisRow?.[1], '');
});

test('buildAllSheetRows builds 7 professional retail tabs including Ringkasan_Eksekutif and Laporan_Penjualan_Produk', () => {
  const rows = buildAllSheetRows([SAMPLE_ITEM], [], [], SAMPLE_SETTINGS);
  assert.ok(rows.ringkasanRows.length > 10);
  assert.equal(rows.ringkasanRows[0][0], 'Indikator Kinerja Toko (Executive Summary)');
  assert.equal(rows.penjualanProdukRows[0][0], 'SKU');
  assert.equal(rows.penjualanProdukRows[1][0], 'STR-BLK-L');
  assert.equal(rows.penjualanProdukRows[2][0], 'TOTAL');
});

test('parseKatalogRows and parseSettingsRows reconstruct items with Drive URLs, banks, and users', () => {
  const rows = buildAllSheetRows([SAMPLE_ITEM], [], [], SAMPLE_SETTINGS);
  const parsedItems = parseKatalogRows(rows.katalogRows);
  assert.equal(parsedItems.length, 1);
  assert.equal(parsedItems[0].sku, 'STR-BLK-L');
  assert.equal(parsedItems[0].imageUrl, 'https://lh3.googleusercontent.com/d/img123');

  const parsedSettings = parseSettingsRows(rows.settingsRows);
  assert.equal(parsedSettings.storeName, 'Sistor');
  assert.equal(parsedSettings.logoUrl, 'https://lh3.googleusercontent.com/d/logo123');
  assert.equal(parsedSettings.bankAccounts?.length, 1);
  assert.equal(parsedSettings.users?.length, 2);
  assert.equal(parsedSettings.users?.[0].role, 'ADMIN');
});
