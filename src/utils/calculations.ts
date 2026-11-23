import type {
  CashierSalesStat,
  ItemMetrics,
  OpnameSummary,
  PaymentMethod,
  ProductSalesStat,
  SaleTransaction,
  TShirtItem,
} from '../types/sistor';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(abs);
  return rounded < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateItemMetrics(item: TShirtItem): ItemMetrics {
  const stokSistem = item.stokAwal + item.stokMasuk - item.terjual;
  const selisihQty = item.stokFisik - stokSistem;
  const statusOpname =
    selisihQty === 0 ? 'SESUAI' : selisihQty < 0 ? 'KURANG' : 'LEBIH';

  const marginPerPcs = item.hargaJual - item.hpp;
  const marginPersen =
    item.hargaJual > 0 ? (marginPerPcs / item.hargaJual) * 100 : 0;

  const nilaiPenjualan = Math.max(
    0,
    item.terjual * item.hargaJual + (item.penyesuaianHargaNego ?? 0)
  );
  const totalHppTerjual = item.terjual * item.hpp;
  const labaKotor = nilaiPenjualan - totalHppTerjual;

  const kerugianSelisihHpp = selisihQty < 0 ? Math.abs(selisihQty) * item.hpp : 0;
  const potensiKehilanganJual =
    selisihQty < 0 ? Math.abs(selisihQty) * item.hargaJual : 0;
  const nilaiSurplusHpp = selisihQty > 0 ? selisihQty * item.hpp : 0;

  const nilaiAsetSistemHpp = Math.max(0, stokSistem) * item.hpp;
  const nilaiAsetFisikHpp = Math.max(0, item.stokFisik) * item.hpp;
  const nilaiAsetFisikJual = Math.max(0, item.stokFisik) * item.hargaJual;

  return {
    stokSistem,
    selisihQty,
    statusOpname,
    marginPerPcs,
    marginPersen,
    nilaiPenjualan,
    totalHppTerjual,
    labaKotor,
    kerugianSelisihHpp,
    potensiKehilanganJual,
    nilaiSurplusHpp,
    nilaiAsetSistemHpp,
    nilaiAsetFisikHpp,
    nilaiAsetFisikJual,
  };
}

export function calculateOpnameSummary(
  items: TShirtItem[],
  transactions: SaleTransaction[]
): OpnameSummary {
  let skuSesuai = 0;
  let skuKurang = 0;
  let skuLebih = 0;
  let totalStokAwal = 0;
  let totalStokMasuk = 0;
  let totalTerjual = 0;
  let totalStokSistem = 0;
  let totalStokFisik = 0;
  let totalUnitKurang = 0;
  let totalUnitLebih = 0;
  let totalNilaiPenjualan = 0;
  let totalHppTerjual = 0;
  let totalLabaKotor = 0;
  let totalKerugianSelisihHpp = 0;
  let totalPotensiKehilanganJual = 0;
  let totalNilaiSurplusHpp = 0;
  let nilaiAsetSistemHpp = 0;
  let nilaiAsetFisikHpp = 0;
  let nilaiAsetFisikJual = 0;

  for (const item of items) {
    const m = calculateItemMetrics(item);
    if (m.statusOpname === 'SESUAI') skuSesuai += 1;
    if (m.statusOpname === 'KURANG') {
      skuKurang += 1;
      totalUnitKurang += Math.abs(m.selisihQty);
    }
    if (m.statusOpname === 'LEBIH') {
      skuLebih += 1;
      totalUnitLebih += m.selisihQty;
    }

    totalStokAwal += item.stokAwal;
    totalStokMasuk += item.stokMasuk;
    totalTerjual += item.terjual;
    totalStokSistem += m.stokSistem;
    totalStokFisik += item.stokFisik;
    totalNilaiPenjualan += m.nilaiPenjualan;
    totalHppTerjual += m.totalHppTerjual;
    totalLabaKotor += m.labaKotor;
    totalKerugianSelisihHpp += m.kerugianSelisihHpp;
    totalPotensiKehilanganJual += m.potensiKehilanganJual;
    totalNilaiSurplusHpp += m.nilaiSurplusHpp;
    nilaiAsetSistemHpp += m.nilaiAsetSistemHpp;
    nilaiAsetFisikHpp += m.nilaiAsetFisikHpp;
    nilaiAsetFisikJual += m.nilaiAsetFisikJual;
  }

  const jumlahSku = items.length;
  const skuSelisih = skuKurang + skuLebih;
  const akurasiPersen = jumlahSku > 0 ? (skuSesuai / jumlahSku) * 100 : 100;
  const totalSelisihUnit = totalStokFisik - totalStokSistem;
  const labaBersihSetelahSelisih = totalLabaKotor - totalKerugianSelisihHpp;

  const paymentBreakdown: Record<
    PaymentMethod,
    { count: number; total: number }
  > = {
    CASH: { count: 0, total: 0 },
    QRIS: { count: 0, total: 0 },
    TRANSFER_BANK: { count: 0, total: 0 },
  };

  let totalOmzetTransaksi = 0;
  let totalDiskonTransaksi = 0;

  for (const tx of transactions) {
    paymentBreakdown[tx.metodePembayaran].count += 1;
    paymentBreakdown[tx.metodePembayaran].total += tx.totalPenjualan;
    totalOmzetTransaksi += tx.totalPenjualan;
    totalDiskonTransaksi += tx.diskon;
  }

  return {
    jumlahSku,
    skuSesuai,
    skuKurang,
    skuLebih,
    skuSelisih,
    akurasiPersen,
    totalStokAwal,
    totalStokMasuk,
    totalTerjual,
    totalStokSistem,
    totalStokFisik,
    totalSelisihUnit,
    totalUnitKurang,
    totalUnitLebih,
    totalNilaiPenjualan,
    totalHppTerjual,
    totalLabaKotor,
    totalKerugianSelisihHpp,
    totalPotensiKehilanganJual,
    totalNilaiSurplusHpp,
    labaBersihSetelahSelisih,
    nilaiAsetSistemHpp,
    nilaiAsetFisikHpp,
    nilaiAsetFisikJual,
    totalOmzetTransaksi,
    totalDiskonTransaksi,
    paymentBreakdown,
  };
}

export function calculateCashChange(
  totalPenjualan: number,
  uangDiterima: number
): { valid: boolean; kembalian: number; kurang: number } {
  if (uangDiterima < 0 || Number.isNaN(uangDiterima)) {
    return { valid: false, kembalian: 0, kurang: totalPenjualan };
  }
  if (uangDiterima >= totalPenjualan) {
    return {
      valid: true,
      kembalian: uangDiterima - totalPenjualan,
      kurang: 0,
    };
  }
  return {
    valid: false,
    kembalian: 0,
    kurang: totalPenjualan - uangDiterima,
  };
}

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildStockOpnameCsv(
  items: TShirtItem[],
  summary: OpnameSummary,
  storeName: string
): string {
  const header = [
    'SKU',
    'Nama Kaos',
    'Kategori',
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
    'Laba Kotor Penjualan',
    'Kerugian Selisih Barang (HPP)',
    'Potensi Kehilangan Omzet (Harga Jual)',
    'Keterangan Lapangan',
  ];

  const rows = items.map((item) => {
    const m = calculateItemMetrics(item);
    return [
      item.sku,
      item.nama,
      item.kategori,
      item.ukuran,
      item.warna,
      item.hpp,
      item.hargaJual > 0 ? item.hargaJual : '',
      item.hargaJual > 0 ? m.marginPerPcs : '',
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
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const footerRow = [
    'TOTAL',
    `Toko ${storeName}`,
    '',
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
    `Laba Bersih Setelah Selisih: ${summary.labaBersihSetelahSelisih}`,
  ]
    .map(escapeCsvCell)
    .join(',');

  return '\uFEFF' + [header.map(escapeCsvCell).join(','), ...rows, footerRow].join('\n');
}

export function buildTransactionsCsv(transactions: SaleTransaction[]): string {
  const header = [
    'No Invoice',
    'Tanggal',
    'Waktu',
    'Daftar Kaos',
    'Total Qty',
    'Total HPP',
    'Subtotal',
    'Diskon',
    'Total Penjualan',
    'Metode Pembayaran',
    'Bank / Referensi',
    'Kasir',
    'Catatan',
  ];

  const rows = transactions.map((tx) => {
    const itemsText = tx.items
      .map((i) => `${i.sku} (${i.ukuran}) x${i.qty}`)
      .join('; ');
    const paymentDetail =
      tx.metodePembayaran === 'TRANSFER_BANK'
        ? `${tx.bankTujuan ?? ''} ${tx.referensiPembayaran ?? ''}`.trim()
        : tx.metodePembayaran === 'QRIS'
        ? tx.referensiPembayaran ?? 'QRIS'
        : `Tunai: ${tx.uangDiterima ?? tx.totalPenjualan}, Kembali: ${tx.kembalian ?? 0}`;

    return [
      tx.invoiceNo,
      tx.tanggal,
      tx.waktu,
      itemsText,
      tx.totalQty,
      tx.totalHpp,
      tx.subtotal,
      tx.diskon,
      tx.totalPenjualan,
      tx.metodePembayaran,
      paymentDetail,
      tx.kasir,
      tx.catatan,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return '\uFEFF' + [header.map(escapeCsvCell).join(','), ...rows].join('\n');
}

export function calculateProductSalesBreakdown(
  items: TShirtItem[]
): ProductSalesStat[] {
  return items
    .map((item) => {
      const m = calculateItemMetrics(item);
      return {
        itemId: item.id,
        sku: item.sku,
        nama: item.nama,
        kategori: item.kategori,
        ukuran: item.ukuran,
        warna: item.warna,
        hargaJual: item.hargaJual,
        hpp: item.hpp,
        qtyTerjual: item.terjual,
        omzet: m.nilaiPenjualan,
        totalHpp: m.totalHppTerjual,
        labaKotor: m.labaKotor,
        marginPersen: m.marginPersen,
        stokTersedia: Math.max(0, m.stokSistem),
      };
    })
    .sort((a, b) => b.omzet - a.omzet || b.qtyTerjual - a.qtyTerjual);
}

export function calculateCashierSalesBreakdown(
  transactions: SaleTransaction[]
): CashierSalesStat[] {
  const byCashier = new Map<string, CashierSalesStat>();

  for (const tx of transactions) {
    const key = tx.kasir || 'Kasir Toko';
    const existing = byCashier.get(key) || {
      kasir: key,
      roleLabel:
        tx.kasirRole === 'ADMIN' ? 'Owner / Admin' : 'Operator / Kasir',
      jumlahTransaksi: 0,
      totalQty: 0,
      totalOmzet: 0,
      totalDiskon: 0,
      cashTotal: 0,
      qrisTotal: 0,
      transferTotal: 0,
    };

    existing.jumlahTransaksi += 1;
    existing.totalQty += tx.totalQty;
    existing.totalOmzet += tx.totalPenjualan;
    existing.totalDiskon += tx.diskon;
    if (tx.metodePembayaran === 'CASH') {
      existing.cashTotal += tx.totalPenjualan;
    } else if (tx.metodePembayaran === 'QRIS') {
      existing.qrisTotal += tx.totalPenjualan;
    } else {
      existing.transferTotal += tx.totalPenjualan;
    }

    byCashier.set(key, existing);
  }

  return Array.from(byCashier.values()).sort(
    (a, b) => b.totalOmzet - a.totalOmzet
  );
}

export function buildSalesReportCsv(
  transactions: SaleTransaction[],
  productStats: ProductSalesStat[],
  storeName: string
): string {
  const sectionAHeader = [
    `LAPORAN PENJUALAN PER PRODUK - TOKO ${storeName.toUpperCase()}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
  const productHeader = [
    'SKU',
    'Nama Kaos',
    'Kategori',
    'Ukuran',
    'Warna',
    'Qty Terjual',
    'Omzet Penjualan',
    'Total HPP',
    'Laba Kotor',
  ];
  const productRows = productStats.map((p) =>
    [
      p.sku,
      p.nama,
      p.kategori,
      p.ukuran,
      p.warna,
      p.qtyTerjual,
      p.omzet,
      p.totalHpp,
      p.labaKotor,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const txHeader = [
    'No Invoice',
    'Tanggal',
    'Waktu',
    'Kasir',
    'Metode Pembayaran',
    'Total Qty',
    'Subtotal',
    'Diskon',
    'Total Penjualan',
  ];
  const txRows = transactions.map((tx) =>
    [
      tx.invoiceNo,
      tx.tanggal,
      tx.waktu,
      tx.kasir,
      tx.metodePembayaran,
      tx.totalQty,
      tx.subtotal,
      tx.diskon,
      tx.totalPenjualan,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return (
    '\uFEFF' +
    [
      sectionAHeader.map(escapeCsvCell).join(','),
      productHeader.map(escapeCsvCell).join(','),
      ...productRows,
      '',
      'RINCIAN TRANSAKSI KASIR',
      txHeader.map(escapeCsvCell).join(','),
      ...txRows,
    ].join('\n')
  );
}

export function buildProfitLossCsv(
  summary: OpnameSummary,
  storeName: string
): string {
  const header = ['Pos Laporan Laba Rugi & Aset', `Toko ${storeName}`];
  const lines: Array<[string, string | number]> = [
    ['Total Nilai Penjualan Katalog', summary.totalNilaiPenjualan],
    ['Total Harga Dasar (HPP) Terjual', summary.totalHppTerjual],
    ['Laba Kotor Penjualan', summary.totalLabaKotor],
    ['Kerugian Selisih Barang (HPP)', summary.totalKerugianSelisihHpp],
    ['Laba Bersih Setelah Kerugian Selisih', summary.labaBersihSetelahSelisih],
    ['Nilai Surplus Stok Fisik (HPP)', summary.totalNilaiSurplusHpp],
    ['Potensi Kehilangan Omzet (Harga Jual)', summary.totalPotensiKehilanganJual],
    ['Total Omzet Transaksi POS Tercatat', summary.totalOmzetTransaksi],
    ['Total Diskon Transaksi POS', summary.totalDiskonTransaksi],
    ['Pembayaran Cash (Tunai)', summary.paymentBreakdown.CASH.total],
    ['Pembayaran QRIS', summary.paymentBreakdown.QRIS.total],
    ['Pembayaran Transfer Bank', summary.paymentBreakdown.TRANSFER_BANK.total],
    ['Nilai Aset Persediaan Sistem (HPP)', summary.nilaiAsetSistemHpp],
    ['Nilai Aset Persediaan Fisik Riil (HPP)', summary.nilaiAsetFisikHpp],
    ['Estimasi Nilai Jual Stok Fisik', summary.nilaiAsetFisikJual],
    ['Akurasi Stock Opname (%)', Number(summary.akurasiPersen.toFixed(1))],
  ];

  return (
    '\uFEFF' +
    [
      header.map(escapeCsvCell).join(','),
      ...lines.map((row) => row.map(escapeCsvCell).join(',')),
    ].join('\n')
  );
}
