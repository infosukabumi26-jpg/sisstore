import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProfitLossCsv,
  buildSalesReportCsv,
  buildStockOpnameCsv,
  calculateCashChange,
  calculateCashierSalesBreakdown,
  calculateItemMetrics,
  calculateOpnameSummary,
  calculateProductSalesBreakdown,
  extractSpreadsheetId,
  formatRupiah,
} from './calculations';
import type { SaleTransaction, TShirtItem } from '../types/sistor';

const sampleDeficitItem: TShirtItem = {
  id: '1',
  sku: 'STR-HVY-BLK-L',
  nama: 'Sistor Heavyweight Boxy Tee',
  kategori: 'Heavyweight 280gsm',
  ukuran: 'L',
  warna: 'Jet Black',
  hpp: 65000,
  hargaJual: 149000,
  stokAwal: 20,
  stokMasuk: 10,
  terjual: 12,
  stokFisik: 16, // stokSistem = 18 -> selisih = -2
  keterangan: '2 pcs hilang di rak display',
  updatedAt: '2026-11-18T06:00:00Z',
};

const sampleSurplusItem: TShirtItem = {
  id: '2',
  sku: 'STR-CMB-BON-M',
  nama: 'Sistor Daily Combed 24s',
  kategori: 'Combed 24s',
  ukuran: 'M',
  warna: 'Bone White',
  hpp: 50000,
  hargaJual: 119000,
  stokAwal: 15,
  stokMasuk: 5,
  terjual: 10,
  stokFisik: 11, // stokSistem = 10 -> selisih = +1
  keterangan: '',
  updatedAt: '2026-11-18T06:00:00Z',
};

test('calculateItemMetrics computes stokSistem, sales value, gross profit, and shrinkage loss accurately', () => {
  const m = calculateItemMetrics(sampleDeficitItem);
  assert.equal(m.stokSistem, 18);
  assert.equal(m.selisihQty, -2);
  assert.equal(m.statusOpname, 'KURANG');
  assert.equal(m.marginPerPcs, 84000);
  assert.equal(m.nilaiPenjualan, 12 * 149000);
  assert.equal(m.totalHppTerjual, 12 * 65000);
  assert.equal(m.labaKotor, 12 * 84000);
  assert.equal(m.kerugianSelisihHpp, 2 * 65000);
  assert.equal(m.potensiKehilanganJual, 2 * 149000);
  assert.equal(m.nilaiSurplusHpp, 0);
  assert.equal(m.nilaiAsetSistemHpp, 18 * 65000);
  assert.equal(m.nilaiAsetFisikHpp, 16 * 65000);
});

test('calculateItemMetrics handles surplus without recording shrinkage loss', () => {
  const m = calculateItemMetrics(sampleSurplusItem);
  assert.equal(m.stokSistem, 10);
  assert.equal(m.selisihQty, 1);
  assert.equal(m.statusOpname, 'LEBIH');
  assert.equal(m.kerugianSelisihHpp, 0);
  assert.equal(m.nilaiSurplusHpp, 50000);
});

test('calculateOpnameSummary aggregates accuracy, shrinkage loss, net profit, and payment channels', () => {
  const matchItem: TShirtItem = {
    ...sampleSurplusItem,
    id: '3',
    sku: 'STR-WSH-CHR-XL',
    stokFisik: 10,
  };

  const txs: SaleTransaction[] = [
    {
      id: 'tx1',
      invoiceNo: 'INV-001',
      tanggal: '2026-11-18',
      waktu: '10:00',
      items: [],
      totalQty: 2,
      totalHpp: 130000,
      subtotal: 298000,
      diskon: 0,
      totalPenjualan: 298000,
      metodePembayaran: 'CASH',
      uangDiterima: 300000,
      kembalian: 2000,
      kasir: 'Admin',
      catatan: '',
    },
    {
      id: 'tx2',
      invoiceNo: 'INV-002',
      tanggal: '2026-11-18',
      waktu: '11:30',
      items: [],
      totalQty: 1,
      totalHpp: 50000,
      subtotal: 119000,
      diskon: 0,
      totalPenjualan: 119000,
      metodePembayaran: 'QRIS',
      kasir: 'Admin',
      catatan: '',
    },
    {
      id: 'tx3',
      invoiceNo: 'INV-003',
      tanggal: '2026-11-18',
      waktu: '13:00',
      items: [],
      totalQty: 1,
      totalHpp: 50000,
      subtotal: 119000,
      diskon: 9000,
      totalPenjualan: 110000,
      metodePembayaran: 'TRANSFER_BANK',
      bankTujuan: 'BCA',
      kasir: 'Admin',
      catatan: '',
    },
  ];

  const summary = calculateOpnameSummary(
    [sampleDeficitItem, sampleSurplusItem, matchItem],
    txs
  );

  assert.equal(summary.jumlahSku, 3);
  assert.equal(summary.skuSesuai, 1);
  assert.equal(summary.skuKurang, 1);
  assert.equal(summary.skuLebih, 1);
  assert.equal(summary.totalKerugianSelisihHpp, 130000);
  assert.equal(summary.totalUnitKurang, 2);
  assert.equal(summary.totalUnitLebih, 1);
  assert.equal(summary.totalSelisihUnit, -1);
  assert.equal(summary.paymentBreakdown.CASH.total, 298000);
  assert.equal(summary.paymentBreakdown.QRIS.total, 119000);
  assert.equal(summary.paymentBreakdown.TRANSFER_BANK.total, 110000);
  assert.equal(summary.totalOmzetTransaksi, 527000);
  assert.equal(summary.totalDiskonTransaksi, 9000);
  assert.equal(
    summary.labaBersihSetelahSelisih,
    summary.totalLabaKotor - summary.totalKerugianSelisihHpp
  );
});

test('calculateCashChange validates sufficient and insufficient cash', () => {
  assert.deepEqual(calculateCashChange(149000, 150000), {
    valid: true,
    kembalian: 1000,
    kurang: 0,
  });
  assert.deepEqual(calculateCashChange(149000, 100000), {
    valid: false,
    kembalian: 0,
    kurang: 49000,
  });
});

test('extractSpreadsheetId parses full Google Sheets URLs and raw IDs', () => {
  assert.equal(
    extractSpreadsheetId(
      'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
    ),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(
    extractSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(extractSpreadsheetId('short'), null);
});

test('buildStockOpnameCsv escapes commas and quotes and includes BOM', () => {
  const itemWithComma: TShirtItem = {
    ...sampleDeficitItem,
    keterangan: 'Rak atas, "edisi promo"',
  };
  const summary = calculateOpnameSummary([itemWithComma], []);
  const csv = buildStockOpnameCsv([itemWithComma], summary, 'Sistor');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Rak atas, ""edisi promo"""'));
  assert.ok(csv.includes('Toko Sistor'));
});

test('formatRupiah formats positive and negative IDR amounts cleanly', () => {
  assert.equal(formatRupiah(149000), 'Rp 149.000');
  assert.equal(formatRupiah(-130000), '-Rp 130.000');
});

test('calculateProductSalesBreakdown sorts products by omzet and keeps HPP & gross profit consistent', () => {
  const stats = calculateProductSalesBreakdown([sampleSurplusItem, sampleDeficitItem]);
  assert.equal(stats.length, 2);
  assert.equal(stats[0].sku, 'STR-HVY-BLK-L');
  assert.equal(stats[0].omzet, 12 * 149000);
  assert.equal(stats[0].labaKotor, 12 * 84000);
  assert.equal(stats[0].stokTersedia, 18);
});

test('calculateCashierSalesBreakdown aggregates transactions and payment channels per cashier', () => {
  const txs: SaleTransaction[] = [
    {
      id: 'tx1',
      invoiceNo: 'INV-001',
      tanggal: '2026-11-18',
      waktu: '10:00',
      items: [],
      totalQty: 2,
      totalHpp: 130000,
      subtotal: 298000,
      diskon: 0,
      totalPenjualan: 298000,
      metodePembayaran: 'CASH',
      kasir: 'Raka (Kasir Shift 1)',
      kasirRole: 'OPERATOR',
      catatan: '',
    },
    {
      id: 'tx2',
      invoiceNo: 'INV-002',
      tanggal: '2026-11-18',
      waktu: '11:00',
      items: [],
      totalQty: 1,
      totalHpp: 50000,
      subtotal: 119000,
      diskon: 9000,
      totalPenjualan: 110000,
      metodePembayaran: 'QRIS',
      kasir: 'Raka (Kasir Shift 1)',
      kasirRole: 'OPERATOR',
      catatan: '',
    },
    {
      id: 'tx3',
      invoiceNo: 'INV-003',
      tanggal: '2026-11-18',
      waktu: '14:00',
      items: [],
      totalQty: 3,
      totalHpp: 180000,
      subtotal: 450000,
      diskon: 0,
      totalPenjualan: 450000,
      metodePembayaran: 'TRANSFER_BANK',
      kasir: 'Pemilik Sistor',
      kasirRole: 'ADMIN',
      catatan: '',
    },
  ];

  const cashiers = calculateCashierSalesBreakdown(txs);
  assert.equal(cashiers.length, 2);
  assert.equal(cashiers[0].kasir, 'Pemilik Sistor');
  assert.equal(cashiers[0].roleLabel, 'Owner / Admin');
  assert.equal(cashiers[0].transferTotal, 450000);
  assert.equal(cashiers[1].kasir, 'Raka (Kasir Shift 1)');
  assert.equal(cashiers[1].jumlahTransaksi, 2);
  assert.equal(cashiers[1].cashTotal, 298000);
  assert.equal(cashiers[1].qrisTotal, 110000);
  assert.equal(cashiers[1].totalDiskon, 9000);
});

test('buildSalesReportCsv and buildProfitLossCsv produce BOM-prefixed structured CSV output', () => {
  const summary = calculateOpnameSummary([sampleDeficitItem], []);
  const productStats = calculateProductSalesBreakdown([sampleDeficitItem]);
  const salesCsv = buildSalesReportCsv([], productStats, 'Sistor');
  const pnlCsv = buildProfitLossCsv(summary, 'Sistor');

  assert.ok(salesCsv.startsWith('\uFEFF'));
  assert.ok(salesCsv.includes('LAPORAN PENJUALAN PER PRODUK - TOKO SISTOR'));
  assert.ok(salesCsv.includes('STR-HVY-BLK-L'));
  assert.ok(pnlCsv.startsWith('\uFEFF'));
  assert.ok(pnlCsv.includes('Laba Bersih Setelah Kerugian Selisih'));
});

test('calculateItemMetrics reflects negotiated checkout price adjustments in nilaiPenjualan and labaKotor', () => {
  const negotiatedItem: TShirtItem = {
    ...sampleDeficitItem,
    terjual: 10,
    hargaJual: 150000,
    hpp: 65000,
    penyesuaianHargaNego: -40000, // e.g., 2 pcs sold at Rp 130.000 (-20k/pcs)
  };
  const m = calculateItemMetrics(negotiatedItem);
  assert.equal(m.nilaiPenjualan, 1460000);
  assert.equal(m.totalHppTerjual, 650000);
  assert.equal(m.labaKotor, 810000);
});
