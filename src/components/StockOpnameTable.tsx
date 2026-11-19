import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Download,
  FilePlus2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type {
  OpnameStatus,
  StoreSettings,
  TShirtItem,
  UserRole,
} from '../types/sistor';
import {
  buildStockOpnameCsv,
  calculateItemMetrics,
  calculateOpnameSummary,
  formatRupiah,
} from '../utils/calculations';

interface StockOpnameTableProps {
  items: TShirtItem[];
  summary: ReturnType<typeof calculateOpnameSummary>;
  settings: StoreSettings;
  userRole: UserRole;
  defaultOfficerName: string;
  onUpdateStokFisik: (id: string, stokFisik: number) => void;
  onUpdateKeterangan: (id: string, keterangan: string) => void;
  onSyncAllFisikToSistem: () => void;
  onSaveReport: (payload: {
    periode: string;
    petugas: string;
    tanggalOpname: string;
    catatanUmum: string;
  }) => void;
}

type OpnameFilter = 'ALL' | 'SELISIH' | OpnameStatus;

export const StockOpnameTable: React.FC<StockOpnameTableProps> = ({
  items,
  summary,
  settings,
  userRole,
  defaultOfficerName,
  onUpdateStokFisik,
  onUpdateKeterangan,
  onSyncAllFisikToSistem,
  onSaveReport,
}) => {
  const isAdmin = userRole === 'ADMIN';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OpnameFilter>('ALL');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [periode, setPeriode] = useState('Stock Opname Harian / Mingguan');
  const [petugas, setPetugas] = useState(
    defaultOfficerName || settings.defaultCashier
  );
  const [tanggalOpname, setTanggalOpname] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [catatanUmum, setCatatanUmum] = useState('');

  const rowsWithMetrics = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .map((item) => ({
        item,
        metrics: calculateItemMetrics(item),
      }))
      .filter(({ item, metrics }) => {
        if (statusFilter === 'SELISIH' && metrics.selisihQty === 0) return false;
        if (
          statusFilter !== 'ALL' &&
          statusFilter !== 'SELISIH' &&
          metrics.statusOpname !== statusFilter
        ) {
          return false;
        }
        if (!q) return true;
        return (
          item.sku.toLowerCase().includes(q) ||
          item.nama.toLowerCase().includes(q) ||
          item.warna.toLowerCase().includes(q) ||
          item.keterangan.toLowerCase().includes(q)
        );
      });
  }, [items, search, statusFilter]);

  const handleDownloadCsv = () => {
    const csv = buildStockOpnameCsv(items, summary, settings.storeName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sisstore-stock-opname-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveReport({
      periode: periode.trim() || `Stock Opname Toko ${settings.storeName}`,
      petugas: petugas.trim() || settings.defaultCashier,
      tanggalOpname,
      catatanUmum: catatanUmum.trim(),
    });
    setSaveModalOpen(false);
    setCatatanUmum('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-xl">
          <h1 className="font-display text-2xl font-bold text-[#141413]">
            {isAdmin
              ? 'Tabel Stock Opname Penjualan Kaos'
              : 'Input Hitung Fisik Stock Opname'}
          </h1>
          <p className="mt-1 text-sm text-[#52524E]">
            {isAdmin
              ? 'Audit stok fisik vs sistem lengkap dengan Harga Dasar (HPP), Harga Jual, Nilai Penjualan, Kerugian Selisih Barang, dan kolom Keterangan manual.'
              : 'Mode Operator: Fokus menghitung stok fisik rak/gudang dan mencatat temuan lapangan pada kolom Keterangan manual.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSyncAllFisikToSistem}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-xs font-semibold text-[#3F3F3B] hover:bg-[#F3F3F0]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Samakan Fisik
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Unduh CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172554]"
          >
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
            Simpan Berita Acara
          </button>
        </div>
      </div>

      {/* Live Financial & Opname KPI Strip */}
      {isAdmin ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#E5E5E0] bg-white p-4">
            <div className="text-xs font-medium text-[#6B6B65]">
              Total Nilai Penjualan ({summary.totalTerjual} pcs)
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-[#141413]">
              {formatRupiah(summary.totalNilaiPenjualan)}
            </div>
            <div className="mt-1 text-xs text-[#52524E] font-mono tabular-nums">
              Total HPP: {formatRupiah(summary.totalHppTerjual)}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white p-4">
            <div className="text-xs font-medium text-[#6B6B65]">
              Laba Kotor Penjualan
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-[#15803D]">
              {formatRupiah(summary.totalLabaKotor)}
            </div>
            <div className="mt-1 text-xs text-[#52524E]">
              Margin penjualan sebelum selisih stok
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white p-4">
            <div className="text-xs font-medium text-[#6B6B65]">
              Kerugian Selisih Barang (HPP)
            </div>
            <div
              className={`mt-1.5 font-mono text-xl font-bold tabular-nums ${
                summary.totalKerugianSelisihHpp > 0
                  ? 'text-[#B91C1C]'
                  : 'text-[#15803D]'
              }`}
            >
              {formatRupiah(summary.totalKerugianSelisihHpp)}
            </div>
            <div className="mt-1 text-xs text-[#52524E] font-mono tabular-nums">
              Kurang {summary.totalUnitKurang} pcs · Lebih +{summary.totalUnitLebih} pcs
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white p-4">
            <div className="text-xs font-medium text-[#6B6B65]">
              Akurasi Stock Opname
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-[#1E3A8A]">
              {summary.akurasiPersen.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-[#52524E]">
              {summary.skuSesuai} dari {summary.jumlahSku} SKU sesuai sistem
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E5E5E0] bg-white p-4">
            <div className="text-xs font-medium text-[#6B6B65]">
              Total Unit Sistem vs Hitung Fisik
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-[#141413]">
              {summary.totalStokFisik} / {summary.totalStokSistem} pcs
            </div>
            <div className="mt-1 text-xs text-[#52524E]">
              {summary.jumlahSku} SKU kaos terdaftar di rak &amp; gudang
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white p-4">
            <div className="text-xs font-medium text-[#6B6B65]">
              Status Selisih Fisik Lapangan
            </div>
            <div
              className={`mt-1.5 font-mono text-xl font-bold tabular-nums ${
                summary.totalUnitKurang > 0
                  ? 'text-[#B91C1C]'
                  : 'text-[#15803D]'
              }`}
            >
              Kurang {summary.totalUnitKurang} · Lebih +{summary.totalUnitLebih}
            </div>
            <div className="mt-1 text-xs text-[#52524E]">
              Isi kolom Keterangan jika ditemukan selisih
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E0] bg-white p-4">
            <div className="text-xs font-medium text-[#6B6B65]">
              Akurasi Hitung Fisik
            </div>
            <div className="mt-1.5 font-mono text-xl font-bold tabular-nums text-[#1E3A8A]">
              {summary.akurasiPersen.toFixed(1)}%
            </div>
            <div className="mt-1 text-xs text-[#52524E]">
              {summary.skuSesuai} dari {summary.jumlahSku} SKU cocok dengan sistem
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5E5E0] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#787872]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari SKU, nama kaos, atau keterangan lapangan..."
            aria-label="Cari tabel stock opname"
            className="w-full rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] py-2 pl-9 pr-3 text-sm text-[#141413] placeholder:text-[#787872] focus:border-[#1E3A8A] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#F3F3F0] p-1 overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'Semua' },
              { id: 'SELISIH', label: 'Ada Selisih' },
              { id: 'KURANG', label: 'Stok Kurang' },
              { id: 'LEBIH', label: 'Stok Lebih' },
              { id: 'SESUAI', label: 'Sesuai' },
            ] as Array<{ id: OpnameFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#52524E] hover:text-[#141413]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stock Opname Table */}
      <div className="overflow-x-auto rounded-xl border border-[#E5E5E0] bg-white">
        <table
          className={`w-full ${
            isAdmin ? 'min-w-[1040px]' : 'min-w-[820px]'
          } border-collapse text-left text-xs`}
        >
          <thead>
            <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] text-[#52524E] font-semibold">
              <th className="px-3 py-2.5">SKU &amp; Kaos</th>
              {isAdmin && <th className="px-2 py-2.5 text-right">HPP</th>}
              <th className="px-2 py-2.5 text-right">Harga Jual</th>
              <th className="px-2 py-2.5 text-right">Awal</th>
              <th className="px-2 py-2.5 text-right">Masuk</th>
              <th className="px-2 py-2.5 text-right">Jual</th>
              <th className="px-2 py-2.5 text-right">Sistem</th>
              <th className="px-2 py-2.5 text-center">Fisik</th>
              <th className="px-2 py-2.5 text-right">Selisih</th>
              {isAdmin && (
                <th className="px-2 py-2.5 text-right">Nilai Penjualan</th>
              )}
              {isAdmin && (
                <th className="px-2 py-2.5 text-right">Kerugian Selisih</th>
              )}
              <th className="px-3 py-2.5 min-w-[175px]">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E0]">
            {rowsWithMetrics.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 12 : 9}
                  className="px-4 py-12 text-center text-sm text-[#6B6B65]"
                >
                  Tidak ada item kaos yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              rowsWithMetrics.map(({ item, metrics }) => {
                const statusColor =
                  metrics.statusOpname === 'KURANG'
                    ? 'text-[#B91C1C]'
                    : metrics.statusOpname === 'LEBIH'
                    ? 'text-[#B45309]'
                    : 'text-[#15803D]';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-[#FAFAF8] ${
                      metrics.statusOpname === 'KURANG' ? 'bg-red-50/25' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 max-w-[190px]">
                      <div className="truncate font-semibold text-[#141413]">
                        {item.nama}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[11px] text-[#6B6B65]">
                        {item.sku} · {item.ukuran} · {item.warna}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-[#3F3F3B] whitespace-nowrap">
                        {formatRupiah(item.hpp)}
                      </td>
                    )}
                    <td className="px-2 py-2.5 text-right font-mono font-semibold tabular-nums text-[#141413] whitespace-nowrap">
                      <div>{formatRupiah(item.hargaJual)}</div>
                      {isAdmin && (
                        <div className="text-[11px] font-normal text-[#15803D]">
                          +{formatRupiah(metrics.marginPerPcs)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-[#52524E]">
                      {item.stokAwal}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-[#52524E]">
                      {item.stokMasuk}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-medium tabular-nums text-[#141413]">
                      {item.terjual}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono font-semibold tabular-nums text-[#141413]">
                      {metrics.stokSistem}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={item.stokFisik}
                        aria-label={`Stok fisik ${item.sku}`}
                        onChange={(e) => {
                          const val = Math.max(
                            0,
                            Math.floor(Number(e.target.value) || 0)
                          );
                          onUpdateStokFisik(item.id, val);
                        }}
                        className="w-16 rounded-md border border-[#D6D6D0] bg-white px-1.5 py-1.5 text-center font-mono text-xs font-semibold tabular-nums text-[#141413] focus:border-[#1E3A8A] focus:outline-none"
                      />
                    </td>
                    <td
                      className={`px-2 py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${statusColor}`}
                    >
                      <div>
                        {metrics.selisihQty === 0
                          ? '0'
                          : metrics.selisihQty > 0
                          ? `+${metrics.selisihQty}`
                          : metrics.selisihQty}
                      </div>
                      <div className="text-[11px] font-medium">
                        {metrics.statusOpname === 'SESUAI'
                          ? 'Sesuai'
                          : metrics.statusOpname === 'KURANG'
                          ? 'Kurang'
                          : 'Lebih'}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-[#141413]">
                          {formatRupiah(metrics.nilaiPenjualan)}
                        </div>
                        <div className="text-[11px] text-[#15803D]">
                          Laba {formatRupiah(metrics.labaKotor)}
                        </div>
                        {(item.penyesuaianHargaNego ?? 0) !== 0 && (
                          <div className="text-[10px] text-[#B45309]">
                            Harga Jadi {(item.penyesuaianHargaNego ?? 0) > 0 ? '+' : ''}
                            {formatRupiah(item.penyesuaianHargaNego ?? 0)}
                          </div>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-2 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        {metrics.kerugianSelisihHpp > 0 ? (
                          <div>
                            <div className="font-semibold text-[#B91C1C]">
                              -{formatRupiah(metrics.kerugianSelisihHpp)}
                            </div>
                            <div className="text-[11px] text-[#6B6B65]">
                              Jual: {formatRupiah(metrics.potensiKehilanganJual)}
                            </div>
                          </div>
                        ) : metrics.nilaiSurplusHpp > 0 ? (
                          <div className="text-[#B45309] font-medium">
                            +{formatRupiah(metrics.nilaiSurplusHpp)}
                          </div>
                        ) : (
                          <span className="text-[#6B6B65]">Rp 0</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={item.keterangan}
                        placeholder="Catatan lapangan..."
                        aria-label={`Keterangan lapangan ${item.sku}`}
                        onChange={(e) =>
                          onUpdateKeterangan(item.id, e.target.value)
                        }
                        className="w-full rounded-md border border-[#E5E5E0] bg-white px-2.5 py-1.5 text-xs text-[#141413] placeholder:text-[#9A9A92] focus:border-[#1E3A8A] focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#D6D6D0] bg-[#F7F7F5] font-semibold text-[#141413]">
              <td className="px-3 py-3" colSpan={isAdmin ? 3 : 2}>
                REKAP TOTAL ({items.length} SKU)
              </td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">
                {summary.totalStokAwal}
              </td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">
                {summary.totalStokMasuk}
              </td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">
                {summary.totalTerjual}
              </td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">
                {summary.totalStokSistem}
              </td>
              <td className="px-2 py-3 text-center font-mono tabular-nums">
                {summary.totalStokFisik}
              </td>
              <td
                className={`px-2 py-3 text-right font-mono tabular-nums ${
                  summary.totalSelisihUnit < 0
                    ? 'text-[#B91C1C]'
                    : summary.totalSelisihUnit > 0
                    ? 'text-[#B45309]'
                    : 'text-[#15803D]'
                }`}
              >
                {summary.totalSelisihUnit > 0
                  ? `+${summary.totalSelisihUnit}`
                  : summary.totalSelisihUnit}
              </td>
              {isAdmin && (
                <td className="px-2 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                  <div>{formatRupiah(summary.totalNilaiPenjualan)}</div>
                  <div className="text-[11px] text-[#15803D]">
                    Laba {formatRupiah(summary.totalLabaKotor)}
                  </div>
                </td>
              )}
              {isAdmin && (
                <td className="px-2 py-3 text-right font-mono tabular-nums text-[#B91C1C] whitespace-nowrap">
                  {summary.totalKerugianSelisihHpp > 0
                    ? `-${formatRupiah(summary.totalKerugianSelisihHpp)}`
                    : 'Rp 0'}
                </td>
              )}
              <td className="px-3 py-3 text-xs font-normal text-[#52524E]">
                {isAdmin ? (
                  <>
                    Laba Bersih:{' '}
                    <span className="font-mono font-semibold text-[#141413] tabular-nums">
                      {formatRupiah(summary.labaBersihSetelahSelisih)}
                    </span>
                  </>
                ) : (
                  <>
                    Akurasi:{' '}
                    <span className="font-mono font-semibold text-[#1E3A8A] tabular-nums">
                      {summary.akurasiPersen.toFixed(1)}%
                    </span>
                  </>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Save Berita Acara Modal */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-opname-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E5E5E0] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-3.5">
              <div className="flex items-center gap-2">
                <CheckSquare
                  className="h-5 w-5 text-[#1E3A8A]"
                  aria-hidden="true"
                />
                <h2
                  id="save-opname-title"
                  className="font-display text-base font-bold text-[#141413]"
                >
                  Simpan Berita Acara Stock Opname
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                aria-label="Tutup form simpan berita acara"
                className="rounded-lg p-1.5 text-[#6B6B65] hover:bg-[#F3F3F0]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitSaveReport} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="opn-periode"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Judul / Periode Opname
                </label>
                <input
                  id="opn-periode"
                  type="text"
                  required
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="opn-tanggal"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Tanggal Opname
                  </label>
                  <input
                    id="opn-tanggal"
                    type="date"
                    required
                    value={tanggalOpname}
                    onChange={(e) => setTanggalOpname(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="opn-petugas"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Petugas Audit
                  </label>
                  <input
                    id="opn-petugas"
                    type="text"
                    required
                    value={petugas}
                    onChange={(e) => setPetugas(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="opn-catatan"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Ringkasan Temuan Umum (Opsional)
                </label>
                <textarea
                  id="opn-catatan"
                  rows={3}
                  placeholder="Contoh: Selisih 2 pcs Bone White akan dicek di CCTV area kasir."
                  value={catatanUmum}
                  onChange={(e) => setCatatanUmum(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              <div className="rounded-lg bg-[#F7F7F5] px-3.5 py-2.5 text-xs text-[#52524E]">
                Ringkasan tersimpan: Akurasi{' '}
                <span className="font-mono font-semibold text-[#141413]">
                  {summary.akurasiPersen.toFixed(1)}%
                </span>
                {isAdmin && (
                  <>
                    {' '}
                    · Kerugian selisih{' '}
                    <span className="font-mono font-semibold text-[#B91C1C]">
                      {formatRupiah(summary.totalKerugianSelisihHpp)}
                    </span>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="rounded-lg border border-[#E5E5E0] px-4 py-2 text-sm font-medium text-[#3F3F3B] hover:bg-[#F3F3F0]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]"
                >
                  Simpan Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
