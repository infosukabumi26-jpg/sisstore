import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardCheck,
  Download,
  FileCheck2,
  Printer,
  TrendingUp,
} from 'lucide-react';
import type {
  OpnameReport,
  OpnameSummary,
  SaleTransaction,
  StoreSettings,
  TShirtItem,
  UserRole,
} from '../types/sistor';
import {
  buildProfitLossCsv,
  buildSalesReportCsv,
  buildStockOpnameCsv,
  calculateCashierSalesBreakdown,
  calculateItemMetrics,
  calculateProductSalesBreakdown,
  formatPercent,
  formatRupiah,
} from '../utils/calculations';

interface OpnameReportViewProps {
  items: TShirtItem[];
  transactions: SaleTransaction[];
  summary: OpnameSummary;
  reports: OpnameReport[];
  settings: StoreSettings;
  userRole: UserRole;
  currentOfficerName: string;
  onSaveCurrentSnapshot: (payload: {
    periode: string;
    petugas: string;
    tanggalOpname: string;
    catatanUmum: string;
  }) => void;
}

type ReportSectionTab = 'opname' | 'penjualan' | 'labarugi';

export const OpnameReportView: React.FC<OpnameReportViewProps> = ({
  items,
  transactions,
  summary,
  reports,
  settings,
  userRole,
  currentOfficerName,
  onSaveCurrentSnapshot,
}) => {
  const isAdmin = userRole === 'ADMIN';
  const [reportTab, setReportTab] = useState<ReportSectionTab>(
    isAdmin ? 'opname' : 'penjualan'
  );
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>('LIVE');

  const activeArchive = useMemo(
    () => reports.find((r) => r.id === selectedArchiveId) || null,
    [reports, selectedArchiveId]
  );

  const displayedSummary = activeArchive ? activeArchive.summary : summary;

  const liveAuditRows = useMemo(() => {
    return items
      .map((item) => ({ item, metrics: calculateItemMetrics(item) }))
      .filter(
        ({ item, metrics }) =>
          metrics.selisihQty !== 0 || item.keterangan.trim() !== ''
      );
  }, [items]);

  const productStats = useMemo(
    () => calculateProductSalesBreakdown(items),
    [items]
  );

  const cashierStats = useMemo(
    () => calculateCashierSalesBreakdown(transactions),
    [transactions]
  );

  const marginKotorPersen =
    displayedSummary.totalNilaiPenjualan > 0
      ? (displayedSummary.totalLabaKotor / displayedSummary.totalNilaiPenjualan) *
        100
      : 0;

  const totalTxChannel =
    displayedSummary.paymentBreakdown.CASH.total +
    displayedSummary.paymentBreakdown.QRIS.total +
    displayedSummary.paymentBreakdown.TRANSFER_BANK.total;

  const activeTabSafe: ReportSectionTab =
    !isAdmin && reportTab === 'labarugi' ? 'penjualan' : reportTab;

  const triggerDownload = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadActiveCsv = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (activeTabSafe === 'penjualan') {
      triggerDownload(
        buildSalesReportCsv(transactions, productStats, settings.storeName),
        `laporan-penjualan-sisstore-${dateStr}.csv`
      );
      return;
    }
    if (activeTabSafe === 'labarugi' && isAdmin) {
      triggerDownload(
        buildProfitLossCsv(displayedSummary, settings.storeName),
        `laporan-laba-rugi-sisstore-${dateStr}.csv`
      );
      return;
    }
    triggerDownload(
      buildStockOpnameCsv(items, summary, settings.storeName),
      `laporan-opname-sisstore-${dateStr}.csv`
    );
  };

  return (
    <div className="space-y-6 print-container">
      {/* Top Action Bar */}
      <div className="no-print flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl font-bold text-[#141413]">
            {isAdmin
              ? `Pusat Laporan Lengkap Toko ${settings.storeName}`
              : 'Laporan Penjualan & Shift Kasir'}
          </h1>
          <p className="mt-1 text-sm text-[#52524E]">
            {isAdmin
              ? 'Laporan terpadu: Berita Acara Stock Opname, Analisis Penjualan Produk & Kasir, serta Laporan Laba Rugi & Valuasi Aset.'
              : 'Rekap penjualan shift kasir (Cash, QRIS, Transfer Bank), performa kaos terjual, dan status fisik stock opname.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              onSaveCurrentSnapshot({
                periode: `Opname ${new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`,
                petugas: currentOfficerName || settings.defaultCashier,
                tanggalOpname: new Date().toISOString().slice(0, 10),
                catatanUmum: 'Arsip otomatis dari menu Pusat Laporan.',
              })
            }
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
          >
            <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
            Arsipkan Kondisi
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleDownloadActiveCsv}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Ekspor CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172554]"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Report Category Switcher */}
      <div className="no-print flex flex-col gap-3 rounded-xl border border-[#E5E5E0] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F3F3F0] p-1">
          <button
            type="button"
            onClick={() => setReportTab('penjualan')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTabSafe === 'penjualan'
                ? 'bg-white text-[#141413] shadow-xs'
                : 'text-[#52524E] hover:text-[#141413]'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Laporan Penjualan &amp; Kasir
          </button>
          <button
            type="button"
            onClick={() => setReportTab('opname')}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTabSafe === 'opname'
                ? 'bg-white text-[#141413] shadow-xs'
                : 'text-[#52524E] hover:text-[#141413]'
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Laporan Stock Opname
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setReportTab('labarugi')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTabSafe === 'labarugi'
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#52524E] hover:text-[#141413]'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              Laporan Laba Rugi &amp; Aset
            </button>
          )}
        </div>

        {activeTabSafe === 'opname' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-[#52524E]">Arsip:</span>
            <button
              type="button"
              onClick={() => setSelectedArchiveId('LIVE')}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedArchiveId === 'LIVE'
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-[#F3F3F0] text-[#3F3F3B] hover:bg-[#E5E5E0]'
              }`}
            >
              Data Live
            </button>
            {reports.map((rep) => (
              <button
                key={rep.id}
                type="button"
                onClick={() => setSelectedArchiveId(rep.id)}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedArchiveId === rep.id
                    ? 'bg-[#1E3A8A] text-white'
                    : 'bg-[#F3F3F0] text-[#3F3F3B] hover:bg-[#E5E5E0]'
                }`}
              >
                {rep.kodeLaporan}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Official Letterhead & Active Report Body */}
      <div className="rounded-xl border border-[#E5E5E0] bg-white p-6">
        <div className="flex flex-col gap-3 border-b border-[#E5E5E0] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3.5">
            {settings.logoUrl && (
              <img
                src={settings.logoUrl}
                alt={`Logo ${settings.storeName}`}
                referrerPolicy="no-referrer"
                className="h-12 w-12 shrink-0 rounded-lg border border-[#E5E5E0] bg-white object-contain p-1"
              />
            )}
            <div>
              <div className="text-xs font-semibold tracking-wide text-[#1E3A8A] uppercase">
                {activeTabSafe === 'penjualan'
                  ? 'LAPORAN PENJUALAN KAOS & REKAP KASIR'
                  : activeTabSafe === 'labarugi'
                  ? 'LAPORAN LABA RUGI, HPP & VALUASI ASET'
                  : 'BERITA ACARA & LAPORAN STOCK OPNAME'}
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-[#141413]">
                Toko {settings.storeName} — {settings.storeTagline}
              </h2>
              <p className="text-xs text-[#6B6B65]">
                {settings.storeAddress} · Telp {settings.storePhone}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono text-xs text-[#52524E]">
            <div>
              {activeTabSafe === 'opname' && activeArchive
                ? `Kode: ${activeArchive.kodeLaporan}`
                : 'Status: Data Live Berjalan'}
            </div>
            <div>
              Tanggal:{' '}
              {activeTabSafe === 'opname' && activeArchive
                ? activeArchive.tanggalOpname
                : new Date().toISOString().slice(0, 10)}
            </div>
            <div>
              Petugas / Akses:{' '}
              {activeTabSafe === 'opname' && activeArchive
                ? activeArchive.petugas
                : `${currentOfficerName} (${isAdmin ? 'Owner' : 'Operator'})`}
            </div>
          </div>
        </div>

        {/* TAB 1: LAPORAN STOCK OPNAME */}
        {activeTabSafe === 'opname' && (
          <div className="mt-6 space-y-6">
            {activeArchive?.catatanUmum && (
              <div className="rounded-lg bg-[#F7F7F5] px-4 py-2.5 text-xs text-[#3F3F3B]">
                <span className="font-semibold">Catatan Audit:</span>{' '}
                {activeArchive.catatanUmum}
              </div>
            )}

            {isAdmin && (
              <div>
                <h3 className="text-sm font-bold text-[#141413]">
                  01. Ringkasan Keuangan Penjualan &amp; Dampak Selisih Barang
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-[#E5E5E0] p-4">
                    <div className="text-xs text-[#6B6B65]">
                      Nilai Penjualan Katalog ({displayedSummary.totalTerjual} pcs)
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#141413]">
                      {formatRupiah(displayedSummary.totalNilaiPenjualan)}
                    </div>
                    <div className="mt-1 text-xs text-[#52524E] font-mono tabular-nums">
                      Diskon POS: {formatRupiah(displayedSummary.totalDiskonTransaksi)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E5E5E0] p-4">
                    <div className="text-xs text-[#6B6B65]">
                      Total Harga Dasar (HPP) Terjual
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#141413]">
                      {formatRupiah(displayedSummary.totalHppTerjual)}
                    </div>
                    <div className="mt-1 text-xs text-[#52524E]">
                      Modal pokok barang keluar
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E5E5E0] p-4">
                    <div className="text-xs text-[#6B6B65]">Laba Kotor Penjualan</div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#15803D]">
                      {formatRupiah(displayedSummary.totalLabaKotor)}
                    </div>
                    <div className="mt-1 text-xs text-[#52524E] font-mono tabular-nums">
                      Margin kotor: {formatPercent(marginKotorPersen)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E5E5E0] p-4">
                    <div className="text-xs text-[#6B6B65]">
                      Kerugian Selisih Barang (HPP)
                    </div>
                    <div
                      className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                        displayedSummary.totalKerugianSelisihHpp > 0
                          ? 'text-[#B91C1C]'
                          : 'text-[#15803D]'
                      }`}
                    >
                      {formatRupiah(displayedSummary.totalKerugianSelisihHpp)}
                    </div>
                    <div className="mt-1 text-xs text-[#52524E] font-mono tabular-nums">
                      Potensi kehilangan omzet:{' '}
                      {formatRupiah(displayedSummary.totalPotensiKehilanganJual)}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E5E5E0] p-4">
                    <div className="text-xs text-[#6B6B65]">
                      Nilai Surplus Stok Fisik (HPP)
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#B45309]">
                      {formatRupiah(displayedSummary.totalNilaiSurplusHpp)}
                    </div>
                    <div className="mt-1 text-xs text-[#52524E] font-mono tabular-nums">
                      {displayedSummary.totalUnitLebih} pcs lebih dari catatan sistem
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1E3A8A]/30 bg-[#EFF6FF]/60 p-4">
                    <div className="text-xs font-semibold text-[#1E3A8A]">
                      Laba Bersih Setelah Kerugian Selisih
                    </div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#1E3A8A]">
                      {formatRupiah(displayedSummary.labaBersihSetelahSelisih)}
                    </div>
                    <div className="mt-1 text-xs text-[#3F3F3B]">
                      Laba kotor dikurangi kerugian selisih HPP
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Physical Opname Metrics */}
            <div>
              <h3 className="text-sm font-bold text-[#141413]">
                {isAdmin
                  ? '02. Evaluasi Unit Stok & Tingkat Akurasi Opname'
                  : '01. Ringkasan Hasil Hitung Fisik Stock Opname'}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-[#E5E5E0] p-3.5">
                  <div className="text-xs text-[#6B6B65]">Total Stok Awal &amp; Masuk</div>
                  <div className="mt-1 font-mono text-base font-bold tabular-nums text-[#141413]">
                    {displayedSummary.totalStokAwal} + {displayedSummary.totalStokMasuk} pcs
                  </div>
                </div>
                <div className="rounded-lg border border-[#E5E5E0] p-3.5">
                  <div className="text-xs text-[#6B6B65]">Stok Sistem vs Fisik Riil</div>
                  <div className="mt-1 font-mono text-base font-bold tabular-nums text-[#141413]">
                    {displayedSummary.totalStokSistem} / {displayedSummary.totalStokFisik} pcs
                  </div>
                </div>
                <div className="rounded-lg border border-[#E5E5E0] p-3.5">
                  <div className="text-xs text-[#6B6B65]">Total Selisih Unit</div>
                  <div className="mt-1 font-mono text-base font-bold tabular-nums text-[#B91C1C]">
                    -{displayedSummary.totalUnitKurang} kurang · +{displayedSummary.totalUnitLebih} lebih
                  </div>
                </div>
                <div className="rounded-lg border border-[#E5E5E0] p-3.5">
                  <div className="text-xs text-[#6B6B65]">Tingkat Akurasi SKU</div>
                  <div className="mt-1 font-mono text-base font-bold tabular-nums text-[#1E3A8A]">
                    {formatPercent(displayedSummary.akurasiPersen)} ({displayedSummary.skuSesuai}/{displayedSummary.jumlahSku})
                  </div>
                </div>
              </div>
            </div>

            {/* Discrepant Items & Field Notes */}
            <div>
              <h3 className="text-sm font-bold text-[#141413]">
                {isAdmin
                  ? '03. Rincian Selisih Barang & Catatan Temuan Lapangan'
                  : '02. Rincian Selisih Fisik & Catatan Temuan Lapangan'}
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E5E0]">
                <table className="w-full min-w-[740px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] font-semibold text-[#52524E]">
                      <th className="px-3.5 py-2.5">SKU &amp; Kaos</th>
                      {isAdmin && <th className="px-3 py-2.5 text-right">HPP</th>}
                      <th className="px-3 py-2.5 text-right">Sistem</th>
                      <th className="px-3 py-2.5 text-right">Fisik</th>
                      <th className="px-3 py-2.5 text-right">Selisih</th>
                      {isAdmin && (
                        <th className="px-3 py-2.5 text-right">Kerugian (HPP)</th>
                      )}
                      <th className="px-3.5 py-2.5">Keterangan Lapangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    {activeArchive ? (
                      activeArchive.discrepantItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={isAdmin ? 7 : 5}
                            className="px-4 py-8 text-center text-[#6B6B65]"
                          >
                            Tidak ada selisih barang pada arsip opname ini.
                          </td>
                        </tr>
                      ) : (
                        activeArchive.discrepantItems.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-3.5 py-2.5">
                              <div className="font-semibold text-[#141413]">
                                {row.nama}
                              </div>
                              <div className="font-mono text-[11px] text-[#6B6B65]">
                                {row.sku} · {row.ukuran} · {row.warna}
                              </div>
                            </td>
                            {isAdmin && (
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                                {formatRupiah(row.hpp)}
                              </td>
                            )}
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                              {row.stokSistem}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                              {row.stokFisik}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                                row.selisihQty < 0
                                  ? 'text-[#B91C1C]'
                                  : row.selisihQty > 0
                                  ? 'text-[#B45309]'
                                  : 'text-[#15803D]'
                              }`}
                            >
                              {row.selisihQty > 0
                                ? `+${row.selisihQty}`
                                : row.selisihQty}
                            </td>
                            {isAdmin && (
                              <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-[#B91C1C]">
                                {row.kerugianSelisihHpp > 0
                                  ? `-${formatRupiah(row.kerugianSelisihHpp)}`
                                  : 'Rp 0'}
                              </td>
                            )}
                            <td className="px-3.5 py-2.5 text-[#3F3F3B]">
                              {row.keterangan || '-'}
                            </td>
                          </tr>
                        ))
                      )
                    ) : liveAuditRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 7 : 5}
                          className="px-4 py-8 text-center text-[#6B6B65]"
                        >
                          Semua stok sesuai sistem dan belum ada catatan selisih.
                        </td>
                      </tr>
                    ) : (
                      liveAuditRows.map(({ item, metrics }) => (
                        <tr key={item.id}>
                          <td className="px-3.5 py-2.5">
                            <div className="font-semibold text-[#141413]">
                              {item.nama}
                            </div>
                            <div className="font-mono text-[11px] text-[#6B6B65]">
                              {item.sku} · {item.ukuran} · {item.warna}
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                              {formatRupiah(item.hpp)}
                            </td>
                          )}
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                            {metrics.stokSistem}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                            {item.stokFisik}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                              metrics.selisihQty < 0
                                ? 'text-[#B91C1C]'
                                : metrics.selisihQty > 0
                                ? 'text-[#B45309]'
                                : 'text-[#15803D]'
                            }`}
                          >
                            {metrics.selisihQty > 0
                              ? `+${metrics.selisihQty}`
                              : metrics.selisihQty}
                          </td>
                          {isAdmin && (
                            <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-[#B91C1C]">
                              {metrics.kerugianSelisihHpp > 0
                                ? `-${formatRupiah(metrics.kerugianSelisihHpp)}`
                                : 'Rp 0'}
                            </td>
                          )}
                          <td className="px-3.5 py-2.5 text-[#3F3F3B]">
                            {item.keterangan || 'Belum diisi keterangan manual'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LAPORAN PENJUALAN & KASIR */}
        {activeTabSafe === 'penjualan' && (
          <div className="mt-6 space-y-8">
            {/* Sales KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#E5E5E0] p-4">
                <div className="text-xs text-[#6B6B65]">Total Penjualan Katalog</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#141413]">
                  {formatRupiah(summary.totalNilaiPenjualan)}
                </div>
                <div className="mt-1 text-xs text-[#52524E]">
                  {summary.totalTerjual} pcs kaos terjual
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E5E0] p-4">
                <div className="text-xs text-[#6B6B65]">Omzet POS Kasir Tercatat</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#1E3A8A]">
                  {formatRupiah(summary.totalOmzetTransaksi)}
                </div>
                <div className="mt-1 text-xs text-[#52524E]">
                  {transactions.length} struk transaksi selesai
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E5E0] p-4">
                <div className="text-xs text-[#6B6B65]">Total Diskon Diberikan</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#B45309]">
                  {formatRupiah(summary.totalDiskonTransaksi)}
                </div>
                <div className="mt-1 text-xs text-[#52524E]">
                  Potongan harga di kasir POS
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E5E0] p-4">
                <div className="text-xs text-[#6B6B65]">
                  Rata-Rata Nilai Per Struk
                </div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-[#141413]">
                  {formatRupiah(
                    transactions.length > 0
                      ? summary.totalOmzetTransaksi / transactions.length
                      : 0
                  )}
                </div>
                <div className="mt-1 text-xs text-[#52524E]">
                  Basket size transaksi kasir
                </div>
              </div>
            </div>

            {/* Payment Channel & Cashier Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-[#141413]">
                  01. Rekapitulasi Metode Pembayaran (Cash, QRIS, Transfer)
                </h3>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#E5E5E0]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] font-semibold text-[#52524E]">
                        <th className="px-3.5 py-2.5">Metode</th>
                        <th className="px-3.5 py-2.5 text-right">Transaksi</th>
                        <th className="px-3.5 py-2.5 text-right">Nominal</th>
                        <th className="px-3.5 py-2.5 text-right">Porsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E0]">
                      {(
                        [
                          { key: 'CASH', label: 'Cash (Tunai)' },
                          { key: 'QRIS', label: 'QRIS' },
                          { key: 'TRANSFER_BANK', label: 'Transfer Bank' },
                        ] as const
                      ).map((row) => {
                        const ch = summary.paymentBreakdown[row.key];
                        const share =
                          totalTxChannel > 0
                            ? (ch.total / totalTxChannel) * 100
                            : 0;
                        return (
                          <tr key={row.key}>
                            <td className="px-3.5 py-2.5 font-medium text-[#141413]">
                              {row.label}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[#52524E]">
                              {ch.count} trx
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-[#141413]">
                              {formatRupiah(ch.total)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[#52524E]">
                              {formatPercent(share)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#141413]">
                  02. Rekapitulasi Penjualan Per Kasir / Operator Shift
                </h3>
                <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E5E0]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] font-semibold text-[#52524E]">
                        <th className="px-3.5 py-2.5">Kasir / Petugas</th>
                        <th className="px-3 py-2.5 text-right">Struk</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3.5 py-2.5 text-right">Total Omzet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E0]">
                      {cashierStats.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-6 text-center text-[#6B6B65]"
                          >
                            Belum ada transaksi kasir tercatat.
                          </td>
                        </tr>
                      ) : (
                        cashierStats.map((c) => (
                          <tr key={c.kasir}>
                            <td className="px-3.5 py-2.5">
                              <div className="font-semibold text-[#141413]">
                                {c.kasir}
                              </div>
                              <div className="text-[11px] text-[#6B6B65]">
                                {c.roleLabel}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                              {c.jumlahTransaksi}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                              {c.totalQty} pcs
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-[#1E3A8A]">
                              {formatRupiah(c.totalOmzet)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Product Sales Breakdown */}
            <div>
              <h3 className="text-sm font-bold text-[#141413]">
                03. Peringkat Penjualan Per Varian Kaos (Semua SKU)
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E5E0]">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] font-semibold text-[#52524E]">
                      <th className="px-3.5 py-2.5">SKU &amp; Varian Kaos</th>
                      <th className="px-3 py-2.5 text-right">Harga Jual</th>
                      <th className="px-3 py-2.5 text-right">Terjual</th>
                      <th className="px-3 py-2.5 text-right">Omzet Penjualan</th>
                      {isAdmin && (
                        <th className="px-3 py-2.5 text-right">Total HPP</th>
                      )}
                      {isAdmin && (
                        <th className="px-3 py-2.5 text-right">Laba Kotor</th>
                      )}
                      <th className="px-3.5 py-2.5 text-right">Sisa Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    {productStats.map((p) => (
                      <tr key={p.itemId}>
                        <td className="px-3.5 py-2.5">
                          <div className="font-semibold text-[#141413]">
                            {p.nama}
                          </div>
                          <div className="font-mono text-[11px] text-[#6B6B65]">
                            {p.sku} · {p.ukuran} · {p.warna}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {p.hargaJual > 0 ? (
                            formatRupiah(p.hargaJual)
                          ) : (
                            <span className="font-sans text-[11px] italic text-[#6B6B65]">
                              Manual di Kasir
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                          {p.qtyTerjual} pcs
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-[#141413]">
                          {formatRupiah(p.omzet)}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[#52524E]">
                            {formatRupiah(p.totalHpp)}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-[#15803D]">
                            {formatRupiah(p.labaKotor)}
                          </td>
                        )}
                        <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[#52524E]">
                          {p.stokTersedia} pcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction Ledger */}
            <div>
              <h3 className="text-sm font-bold text-[#141413]">
                04. Daftar Transaksi Kasir POS ({transactions.length} Transaksi)
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-[#E5E5E0]">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] font-semibold text-[#52524E]">
                      <th className="px-3.5 py-2.5">No Invoice</th>
                      <th className="px-3 py-2.5">Tanggal &amp; Waktu</th>
                      <th className="px-3 py-2.5">Kasir</th>
                      <th className="px-3 py-2.5">Metode</th>
                      <th className="px-3 py-2.5 text-right">Qty</th>
                      <th className="px-3.5 py-2.5 text-right">Total Bayar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-[#6B6B65]"
                        >
                          Belum ada transaksi kasir tercatat.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-[#141413]">
                            {tx.invoiceNo}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[#52524E]">
                            {tx.tanggal} {tx.waktu}
                          </td>
                          <td className="px-3 py-2.5 text-[#3F3F3B]">{tx.kasir}</td>
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-[#141413]">
                              {tx.metodePembayaran === 'TRANSFER_BANK'
                                ? 'Transfer Bank'
                                : tx.metodePembayaran}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                            {tx.totalQty} pcs
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-[#141413]">
                            {formatRupiah(tx.totalPenjualan)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LAPORAN LABA RUGI & VALUASI ASET (ADMIN ONLY) */}
        {activeTabSafe === 'labarugi' && isAdmin && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-[#141413]">
                01. Ikhtisar Laba Rugi Usaha Kaos {settings.storeName}
              </h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-[#E5E5E0]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] font-semibold text-[#52524E]">
                      <th className="px-4 py-2.5">Komponen Keuangan</th>
                      <th className="px-4 py-2.5 text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    <tr>
                      <td className="px-4 py-2.5 font-medium text-[#141413]">
                        Pendapatan Kotor Penjualan Kaos ({summary.totalTerjual} pcs)
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                        {formatRupiah(summary.totalNilaiPenjualan)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52524E]">
                        Dikurangi: Harga Dasar (HPP) Barang Terjual
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#B91C1C]">
                        -{formatRupiah(summary.totalHppTerjual)}
                      </td>
                    </tr>
                    <tr className="bg-[#F7F7F5]">
                      <td className="px-4 py-2.5 font-semibold text-[#141413]">
                        Laba Kotor Penjualan ({formatPercent(marginKotorPersen)})
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold tabular-nums text-[#15803D]">
                        {formatRupiah(summary.totalLabaKotor)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#52524E]">
                        Dikurangi: Kerugian Selisih Barang / Shrinkage ({summary.totalUnitKurang} pcs)
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#B91C1C]">
                        -{formatRupiah(summary.totalKerugianSelisihHpp)}
                      </td>
                    </tr>
                    <tr className="bg-[#EFF6FF]">
                      <td className="px-4 py-3 font-bold text-[#1E3A8A]">
                        Laba Bersih Usaha Setelah Selisih Stok
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-[#1E3A8A]">
                        {formatRupiah(summary.labaBersihSetelahSelisih)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#141413]">
                02. Neraca Valuasi Aset Stok &amp; Risiko Selisih
              </h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-[#E5E5E0]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] font-semibold text-[#52524E]">
                      <th className="px-4 py-2.5">Indikator Aset &amp; Inventaris</th>
                      <th className="px-4 py-2.5 text-right">Nilai / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E0]">
                    <tr>
                      <td className="px-4 py-2.5 text-[#3F3F3B]">
                        Nilai Modal Persediaan Tercatat Sistem (HPP)
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">
                        {formatRupiah(summary.nilaiAsetSistemHpp)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#3F3F3B]">
                        Nilai Modal Persediaan Fisik Riil di Toko (HPP)
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#1E3A8A]">
                        {formatRupiah(summary.nilaiAsetFisikHpp)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#3F3F3B]">
                        Estimasi Omzet Jika Stok Fisik Terjual Semua
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#15803D]">
                        {summary.nilaiAsetFisikJual > 0 ? (
                          formatRupiah(summary.nilaiAsetFisikJual)
                        ) : (
                          <span className="font-sans text-xs font-normal italic text-[#6B6B65]">
                            Manual (Harga Jadi saat bayar)
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#3F3F3B]">
                        Potensi Margin Laba Dari Stok Tersisa
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#15803D]">
                        {summary.nilaiAsetFisikJual > 0 ? (
                          formatRupiah(
                            summary.nilaiAsetFisikJual - summary.nilaiAsetFisikHpp
                          )
                        ) : (
                          <span className="font-sans text-xs font-normal italic text-[#6B6B65]">
                            Mengikuti Harga Jadi saat transaksi
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#3F3F3B]">
                        Nilai Surplus Fisik ({summary.totalUnitLebih} pcs)
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#B45309]">
                        +{formatRupiah(summary.totalNilaiSurplusHpp)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-[#3F3F3B]">
                        Potensi Kehilangan Omzet (Harga Jual Selisih Kurang)
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#B91C1C]">
                        {summary.totalPotensiKehilanganJual > 0 ? (
                          formatRupiah(summary.totalPotensiKehilanganJual)
                        ) : (
                          <span className="font-sans text-xs font-normal italic text-[#6B6B65]">
                            Mengikuti HPP (Harga Jadi manual)
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Print Signature Block */}
        <div className="mt-10 hidden print:grid grid-cols-2 gap-12 pt-8 text-center text-xs">
          <div>
            <div>Mengetahui, Pemilik Toko {settings.storeName}</div>
            <div className="mt-16 border-t border-black pt-1 font-semibold">
              ( ________________________ )
            </div>
          </div>
          <div>
            <div>Petugas Penanggung Jawab</div>
            <div className="mt-16 border-t border-black pt-1 font-semibold">
              ( {activeArchive ? activeArchive.petugas : currentOfficerName} )
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
