import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllSheetRows,
  buildMobileSetupLink,
  computeSyncSignature,
  isGasConfigReady,
  isValidAppsScriptUrl,
  normalizeDriveFolderName,
  parseDataUrl,
  parseKatalogRows,
  parseLaporanRows,
  parseMobileSetupParams,
  parseSettingsRows,
  parseTransaksiRows,
  shouldPreferPullOnConnect,
  shouldRunRealTimeAutoSync,
} from './googleSheets.ts';
import type {
  OpnameReport,
  SaleTransaction,
  StoreSettings,
  TShirtItem,
} from '../types/sistor.ts';
import { calculateOpnameSummary } from '../utils/calculations.ts';

const SAMPLE_SETTINGS: StoreSettings = {
  storeName: 'Sisstore',
  storeTagline: "Women's Fashion Shop",
  storeAddress: 'Bekasi',
  storePhone: '08123456',
  logoUrl: 'https://drive.google.com/thumbnail?id=logo123&sz=w1200',
  qrisMerchantId: 'ID123',
  qrisMerchantName: 'SISSTORE',
  qrisImageUrl: 'data:image/png;base64,iVBORw0KGgo=',
  defaultCashier: 'Raka',
  autoPrintReceipt: false,
  receiptFooterNote: 'Terima kasih',
  bankAccounts: [
    { id: 'b1', bankName: 'BCA', accountNumber: '123', accountHolder: 'Sisstore' },
  ],
  users: [
    {
      id: 'u1',
      username: 'admin',
      password: 'owner123',
      displayName: 'Pemilik Sisstore',
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
  driveFolderName: 'Sisstore_Media_Drive',
  spreadsheetId: '',
  spreadsheetTitle: '',
  lastSyncedAt: null,
};

const SAMPLE_ITEM: TShirtItem = {
  id: 'tee-1',
  sku: 'STR-BLK-L',
  nama: 'Sisstore Heavy Black',
  kategori: '280gsm',
  ukuran: 'L',
  warna: 'Hitam',
  hpp: 65000,
  hargaJual: 150000,
  stokAwal: 10,
  stokMasuk: 5,
  terjual: 3,
  stokFisik: 11,
  penyesuaianHargaNego: 25000,
  keterangan: '1 cacat jahitan',
  imageUrl: 'https://drive.google.com/thumbnail?id=img123&sz=w1200',
  updatedAt: '2026-11-18T10:00:00Z',
};

test('isValidAppsScriptUrl accepts valid /exec URLs and rejects /dev or invalid URLs', () => {
  assert.equal(
    isValidAppsScriptUrl('https://script.google.com/macros/s/AKfycb12345/exec'),
    true
  );
  assert.equal(
    isValidAppsScriptUrl('https://script.google.com/a/macros/toko.id/s/AKfycb12345/exec'),
    true
  );
  assert.equal(
    isValidAppsScriptUrl('https://script.google.com/macros/s/AKfycb12345/dev'),
    false
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
  assert.equal(parseDataUrl('https://drive.google.com/thumbnail?id=abc&sz=w1200'), null);
});

test('buildAllSheetRows keeps Google Drive URLs and omits inline base64 strings from Sheet cells', () => {
  const rows = buildAllSheetRows([SAMPLE_ITEM], [], [], SAMPLE_SETTINGS);
  assert.equal(rows.katalogRows[0][15], 'Foto Produk (Drive URL)');
  assert.equal(
    rows.katalogRows[1][15],
    'https://drive.google.com/thumbnail?id=img123&sz=w1200'
  );

  const logoRow = rows.settingsRows.find((r) => r[0] === 'logoUrl');
  const qrisRow = rows.settingsRows.find((r) => r[0] === 'qrisImageUrl');
  assert.equal(logoRow?.[1], 'https://drive.google.com/thumbnail?id=logo123&sz=w1200');
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

test('parseKatalogRows, parseTransaksiRows, parseLaporanRows, and parseSettingsRows reconstruct full state', () => {
  const sampleTx: SaleTransaction = {
    id: 'tx-1',
    invoiceNo: 'STR-20261120-001',
    tanggal: '2026-11-20',
    waktu: '15:30',
    items: [
      {
        itemId: 'tee-1',
        sku: 'STR-BLK-L',
        nama: 'Sisstore Heavy Black',
        ukuran: 'L',
        warna: 'Hitam',
        qty: 1,
        hpp: 65000,
        hargaJual: 175000,
        hargaKatalog: 150000,
      },
    ],
    totalQty: 1,
    totalHpp: 65000,
    subtotal: 175000,
    diskon: 0,
    totalPenjualan: 175000,
    metodePembayaran: 'CASH',
    uangDiterima: 200000,
    kembalian: 25000,
    kasir: 'Pemilik Sisstore',
    kasirRole: 'ADMIN',
    catatan: 'Harga deal',
  };

  const sampleReport: OpnameReport = {
    id: 'rep-1',
    kodeLaporan: 'OPN-STR-20261120-01',
    tanggalOpname: '2026-11-20',
    periode: '20 Nov 2026',
    petugas: 'Pemilik Sisstore',
    catatanUmum: 'Rutin',
    summary: calculateOpnameSummary([SAMPLE_ITEM], [sampleTx]),
    discrepantItems: [],
  };

  const rows = buildAllSheetRows([SAMPLE_ITEM], [sampleTx], [sampleReport], SAMPLE_SETTINGS);
  const parsedItems = parseKatalogRows(rows.katalogRows);
  assert.equal(parsedItems.length, 1);
  assert.equal(parsedItems[0].sku, 'STR-BLK-L');
  assert.equal(parsedItems[0].penyesuaianHargaNego, 25000);
  assert.equal(
    parsedItems[0].imageUrl,
    'https://drive.google.com/thumbnail?id=img123&sz=w1200'
  );

  const parsedTx = parseTransaksiRows(rows.transaksiRows);
  assert.equal(parsedTx.length, 1);
  assert.equal(parsedTx[0].invoiceNo, 'STR-20261120-001');
  assert.equal(parsedTx[0].items[0].hargaJual, 175000);

  const parsedReports = parseLaporanRows(rows.laporanRows);
  assert.equal(parsedReports.length, 1);
  assert.equal(parsedReports[0].kodeLaporan, 'OPN-STR-20261120-01');

  const parsedSettings = parseSettingsRows(rows.settingsRows);
  assert.equal(parsedSettings.storeName, 'Sisstore');
  assert.equal(
    parsedSettings.logoUrl,
    'https://drive.google.com/thumbnail?id=logo123&sz=w1200'
  );
  assert.equal(parsedSettings.bankAccounts?.length, 1);
  assert.equal(parsedSettings.users?.length, 2);
  assert.equal(parsedSettings.users?.[0].role, 'ADMIN');
});

test('computeSyncSignature ignores sync metadata changes but detects business data changes', () => {
  const sigA = computeSyncSignature([SAMPLE_ITEM], [], [], SAMPLE_SETTINGS);
  const sigMetadataOnly = computeSyncSignature([SAMPLE_ITEM], [], [], {
    ...SAMPLE_SETTINGS,
    spreadsheetId: 'ss-999',
    spreadsheetTitle: 'Updated Title',
    driveFolderUrl: 'https://drive.google.com/drive/folders/123',
    lastSyncedAt: '2026-11-20T10:00:00Z',
  });
  assert.equal(sigA, sigMetadataOnly);

  const sigItemChanged = computeSyncSignature(
    [{ ...SAMPLE_ITEM, terjual: SAMPLE_ITEM.terjual + 1 }],
    [],
    [],
    SAMPLE_SETTINGS
  );
  assert.notEqual(sigA, sigItemChanged);
});

test('isGasConfigReady, normalizeDriveFolderName, and shouldRunRealTimeAutoSync validate GAS readiness', () => {
  assert.equal(normalizeDriveFolderName('   '), 'Sisstore_Media_Drive');
  assert.equal(normalizeDriveFolderName(' Sisstore_Cloud '), 'Sisstore_Cloud');

  assert.equal(
    isGasConfigReady(
      'https://script.google.com/macros/s/AKfycb123/exec',
      'Sisstore_Media_Drive'
    ),
    true
  );
  assert.equal(
    isGasConfigReady('https://script.google.com/macros/s/AKfycb123/exec', '   '),
    false
  );
  assert.equal(
    isGasConfigReady('https://script.google.com/macros/s/AKfycb123/dev', 'Sisstore'),
    false
  );

  assert.equal(shouldRunRealTimeAutoSync(SAMPLE_SETTINGS), true);
  assert.equal(
    shouldRunRealTimeAutoSync({ ...SAMPLE_SETTINGS, autoSyncEnabled: false }),
    false
  );
  assert.equal(
    shouldRunRealTimeAutoSync({ ...SAMPLE_SETTINGS, appsScriptUrl: '' }),
    false
  );
});

test('buildMobileSetupLink and parseMobileSetupParams round-trip GAS URL and Drive folder', () => {
  const link = buildMobileSetupLink(
    'https://sisstore.example.com/',
    'https://script.google.com/macros/s/AKfycb123/exec',
    'Sisstore_Mobile_Drive'
  );
  assert.ok(link.startsWith('https://sisstore.example.com/?gas='));

  const query = link.slice(link.indexOf('?'));
  assert.deepEqual(parseMobileSetupParams(query), {
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycb123/exec',
    driveFolderName: 'Sisstore_Mobile_Drive',
  });

  assert.equal(
    buildMobileSetupLink('https://sisstore.example.com', 'https://bad.url/dev', 'Folder'),
    ''
  );
  assert.equal(parseMobileSetupParams('?gas=https://script.google.com/macros/s/abc/dev'), null);
});

test('shouldPreferPullOnConnect protects Desktop spreadsheet data when linking a fresh mobile device', () => {
  // Fresh mobile connecting to populated Desktop spreadsheet -> pull remote data
  assert.equal(
    shouldPreferPullOnConnect({
      isFreshDeviceConnect: true,
      localTransactionsCount: 0,
      localReportsCount: 0,
      remoteItemsCount: 10,
      remoteTransactionsCount: 2,
      remoteReportsCount: 0,
    }),
    true
  );

  // Desktop connecting to empty brand-new spreadsheet -> push initial tabs
  assert.equal(
    shouldPreferPullOnConnect({
      isFreshDeviceConnect: true,
      localTransactionsCount: 0,
      localReportsCount: 0,
      remoteItemsCount: 0,
      remoteTransactionsCount: 0,
      remoteReportsCount: 0,
    }),
    false
  );

  // Already-linked Desktop re-testing connection -> push local edits
  assert.equal(
    shouldPreferPullOnConnect({
      isFreshDeviceConnect: false,
      localTransactionsCount: 0,
      localReportsCount: 0,
      remoteItemsCount: 10,
      remoteTransactionsCount: 0,
      remoteReportsCount: 0,
    }),
    false
  );
});
