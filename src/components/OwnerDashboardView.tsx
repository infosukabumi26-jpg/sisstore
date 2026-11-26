import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Shirt,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import type {
  OpnameSummary,
  SaleTransaction,
  StoreSettings,
  StoreUser,
  TShirtItem,
} from '../types/sistor';
import {
  calculateItemMetrics,
  calculateProductSalesBreakdown,
  formatPercent,
  formatRupiah,
} from '../utils/calculations';
import type { ActiveTab } from './Sidebar';

interface OwnerDashboardViewProps {
  currentUser: StoreUser;
  items: TShirtItem[];
  transactions: SaleTransaction[];
  summary: OpnameSummary;
  settings: StoreSettings;
  isAppsScriptConnected: boolean;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const OwnerDashboardView: React.FC<OwnerDashboardViewProps> = ({
  currentUser,
  items,
  transactions,
  summary,
  settings,
  isAppsScriptConnected,
  onNavigateTab,
}) => {
  const topProducts = useMemo(
    () => calculateProductSalesBreakdown(items).slice(0, 5),
    [items]
  );

  const discrepantRows = useMemo(
    () =>
      items
        .map((item) => ({ item, metrics: calculateItemMetrics(item) }))
        .filter(({ metrics }) => metrics.selisihQty !== 0),
    [items]
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions]
  );

  const totalTxPayment =
    summary.paymentBreakdown.CASH.total +
    summary.paymentBreakdown.QRIS.total +
    summary.paymentBreakdown.TRANSFER_BANK.total;

  const marginKotorPersen =
    summary.totalNilaiPenjualan > 0
      ? (summary.totalLabaKotor / summary.totalNilaiPenjualan) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Quick Actions */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E0] bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
            Dashboard Pemilik / Owner · {settings.storeName}
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#141413]">
            Selamat datang, {currentUser.displayName}
          </h1>
          <p className="mt-1 text-sm text-[#52524E]">
            Ringkasan menyeluruh omzet penjualan kaos, HPP, kerugian selisih barang, arus kas Cash/QRIS/Transfer, dan kesiapan Spreadsheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('kasir')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
          >
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
            Buka Kasir
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('opname')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
          >
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Audit Opname
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('laporan')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172554]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            Laporan Lengkap
          </button>
        </div>
      </div>

      {/* 4 Executive Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E5E5E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B6B65]">
              Total Omzet Penjualan ({summary.totalTerjual} pcs)
            </span>
            <TrendingUp className="h-4 w-4 text-[#1E3A8A]" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#141413]">
            {formatRupiah(summary.totalNilaiPenjualan)}
          </div>
          <div className="mt-1.5 font-mono text-xs tabular-nums text-[#52524E]">
            POS tercatat: {formatRupiah(summary.totalOmzetTransaksi)} ({transactions.length} trx)
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E5E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B6B65]">
              Laba Kotor Penjualan
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-[#15803D]">
              Margin {formatPercent(marginKotorPersen)}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#15803D]">
            {formatRupiah(summary.totalLabaKotor)}
          </div>
          <div className="mt-1.5 font-mono text-xs tabular-nums text-[#52524E]">
            Total HPP keluar: {formatRupiah(summary.totalHppTerjual)}
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E5E0] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#6B6B65]">
              Kerugian Selisih Barang (HPP)
            </span>
            <AlertTriangle
              className={`h-4 w-4 ${
                summary.totalKerugianSelisihHpp > 0
                  ? 'text-[#B91C1C]'
                  : 'text-[#15803D]'
              }`}
              aria-hidden="true"
            />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
              summary.totalKerugianSelisihHpp > 0
                ? 'text-[#B91C1C]'
                : 'text-[#15803D]'
            }`}
          >
            {formatRupiah(summary.totalKerugianSelisihHpp)}
          </div>
          <div className="mt-1.5 font-mono text-xs tabular-nums text-[#52524E]">
            Kurang {summary.totalUnitKurang} pcs · Lebih +{summary.totalUnitLebih} pcs
          </div>
        </div>

        <div className="rounded-xl border border-[#1E3A8A]/25 bg-[#EFF6FF]/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1E3A8A]">
              Laba Bersih Setelah Selisih
            </span>
            <span className="font-mono text-xs font-bold tabular-nums text-[#1E3A8A]">
              Akurasi {formatPercent(summary.akurasiPersen)}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#1E3A8A]">
            {formatRupiah(summary.labaBersihSetelahSelisih)}
          </div>
          <div className="mt-1.5 text-xs text-[#3F3F3B]">
            {summary.skuSesuai} dari {summary.jumlahSku} SKU sesuai sistem
          </div>
        </div>
      </div>

      {/* Middle Row: Top Selling Products + Payment & Asset Valuation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Top Selling Products */}
        <div className="rounded-xl border border-[#E5E5E0] bg-white p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2 border-b border-[#E5E5E0] pb-3.5">
            <div>
              <h2 className="font-display text-base font-bold text-[#141413]">
                Performa Penjualan Kaos Terlaris (Top 5 SKU)
              </h2>
              <p className="text-xs text-[#6B6B65]">
                Berdasarkan total omzet penjualan dan kontribusi laba kotor per varian.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('katalog')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
            >
              Kelola Katalog
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E0] text-[#6B6B65]">
                  <th className="py-2 pr-3 font-semibold">SKU &amp; Varian</th>
                  <th className="px-2 py-2 text-right font-semibold">Terjual</th>
                  <th className="px-2 py-2 text-right font-semibold">Omzet</th>
                  <th className="px-2 py-2 text-right font-semibold">Laba Kotor</th>
                  <th className="pl-2 py-2 text-right font-semibold">Sisa Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E0]">
                {topProducts.map((p) => (
                  <tr key={p.itemId} className="hover:bg-[#FAFAF8]">
                    <td className="py-2.5 pr-3">
                      <div className="font-semibold text-[#141413]">
                        {p.nama}
                      </div>
                      <div className="font-mono text-[11px] text-[#6B6B65]">
                        {p.sku} · {p.ukuran} · {p.warna}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-semibold tabular-nums text-[#141413]">
                      {p.qtyTerjual} pcs
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-semibold tabular-nums text-[#141413]">
                      {formatRupiah(p.omzet)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-semibold tabular-nums text-[#15803D]">
                      {formatRupiah(p.labaKotor)}
                    </td>
                    <td className="pl-2 py-2.5 text-right font-mono tabular-nums text-[#52524E]">
                      {p.stokTersedia} pcs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Payment Breakdown & Inventory Asset Valuation */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-[#E5E5E0] bg-white p-5">
            <h2 className="font-display text-base font-bold text-[#141413]">
              Arus Pembayaran Kasir POS
            </h2>
            <p className="text-xs text-[#6B6B65]">
              Proporsi penerimaan Cash, QRIS, dan Transfer Bank tercatat.
            </p>

            <div className="mt-4 space-y-3.5">
              {(
                [
                  {
                    key: 'CASH',
                    label: 'Cash (Tunai)',
                    barClass: 'bg-[#141413]',
                  },
                  {
                    key: 'QRIS',
                    label: 'QRIS',
                    barClass: 'bg-[#1E3A8A]',
                  },
                  {
                    key: 'TRANSFER_BANK',
                    label: 'Transfer Bank',
                    barClass: 'bg-[#15803D]',
                  },
                ] as const
              ).map((ch) => {
                const data = summary.paymentBreakdown[ch.key];
                const pct =
                  totalTxPayment > 0 ? (data.total / totalTxPayment) * 100 : 0;
                return (
                  <div key={ch.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#141413]">
                        {ch.label}{' '}
                        <span className="font-normal text-[#6B6B65]">
                          ({data.count} trx)
                        </span>
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[#141413]">
                        {formatRupiah(data.total)} · {formatPercent(pct)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#EFEFEA]">
                      <div
                        className={`h-full rounded-full ${ch.barClass}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#141413]">
                Valuasi Modal Persediaan &amp; Cloud Sheets
              </h2>
              <Shirt className="h-4 w-4 text-[#6B6B65]" aria-hidden="true" />
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#52524E]">Modal Stok Fisik Riil (HPP)</span>
                <span className="font-mono font-bold tabular-nums text-[#1E3A8A]">
                  {formatRupiah(summary.nilaiAsetFisikHpp)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#52524E]">Harga Jual Stok Fisik</span>
                {summary.nilaiAsetFisikJual > 0 ? (
                  <span className="font-mono font-bold tabular-nums text-[#15803D]">
                    {formatRupiah(summary.nilaiAsetFisikJual)}
                  </span>
                ) : (
                  <span className="text-xs italic text-[#6B6B65]">
                    Manual (Harga Jadi saat bayar)
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[#E5E5E0] pt-2.5">
                <span className="flex items-center gap-1.5 text-[#52524E]">
                  <Database className="h-3.5 w-3.5" aria-hidden="true" />
                  {isAppsScriptConnected
                    ? `Sheets aktif (${settings.spreadsheetTitle || 'Terhubung'})`
                    : 'Database cloud belum dikonfigurasi'}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('pengaturan')}
                  className="font-semibold text-[#1E3A8A] hover:underline"
                >
                  Pengaturan Toko &amp; Akun
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Stock Opname Discrepancy Alert + Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#E5E5E0] bg-white p-5 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-3.5">
            <div>
              <h2 className="font-display text-base font-bold text-[#141413]">
                Temuan Selisih Stock Opname ({discrepantRows.length} SKU)
              </h2>
              <p className="text-xs text-[#6B6B65]">
                Varian kaos yang stok fisiknya belum cocok dengan stok sistem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('opname')}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
            >
              Isi Keterangan →
            </button>
          </div>

          {discrepantRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#15803D] font-medium">
              Seluruh stok fisik cocok 100% dengan catatan sistem.
            </div>
          ) : (
            <div className="mt-3 divide-y divide-[#E5E5E0]">
              {discrepantRows.map(({ item, metrics }) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#141413]">
                      {item.nama} ({item.ukuran} · {item.warna})
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-[#6B6B65]">
                      {item.sku} · Sistem {metrics.stokSistem} pcs vs Fisik{' '}
                      {item.stokFisik} pcs
                    </div>
                    <div className="mt-1 text-[#52524E]">
                      Ket: {item.keterangan || 'Belum ada keterangan lapangan'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div
                      className={`font-bold ${
                        metrics.selisihQty < 0
                          ? 'text-[#B91C1C]'
                          : 'text-[#B45309]'
                      }`}
                    >
                      {metrics.selisihQty > 0
                        ? `+${metrics.selisihQty}`
                        : metrics.selisihQty}{' '}
                      pcs
                    </div>
                    {metrics.kerugianSelisihHpp > 0 && (
                      <div className="text-[11px] text-[#B91C1C]">
                        Rugi {formatRupiah(metrics.kerugianSelisihHpp)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E5E5E0] bg-white p-5 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-3.5">
            <div>
              <h2 className="font-display text-base font-bold text-[#141413]">
                Aktivitas Transaksi Kasir Terbaru
              </h2>
              <p className="text-xs text-[#6B6B65]">
                Pemantauan transaksi terakhir oleh Operator &amp; Admin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('laporan')}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
            >
              Rekap Penjualan →
            </button>
          </div>

          <div className="mt-3 divide-y divide-[#E5E5E0]">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6B6B65]">
                Belum ada transaksi kasir tercatat. Buat transaksi di menu Kasir Penjualan dengan mengisi Harga Jadi / pcs.
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-semibold text-[#141413]">
                      {tx.invoiceNo}{' '}
                      <span className="font-sans font-normal text-[#6B6B65]">
                        · {tx.tanggal} {tx.waktu}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[#52524E]">
                      Kasir: {tx.kasir} ·{' '}
                      {tx.metodePembayaran === 'TRANSFER_BANK'
                        ? 'Transfer Bank'
                        : tx.metodePembayaran}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div className="font-bold text-[#141413]">
                      {formatRupiah(tx.totalPenjualan)}
                    </div>
                    <div className="text-[11px] text-[#6B6B65]">
                      {tx.totalQty} pcs
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
