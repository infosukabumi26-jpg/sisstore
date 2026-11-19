import React, { useMemo, useRef, useState } from 'react';
import {
  ImagePlus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Shirt,
  Trash2,
  X,
} from 'lucide-react';
import type { TShirtItem, TShirtSize } from '../types/sistor';
import { calculateItemMetrics, formatRupiah } from '../utils/calculations';
import { processImageUpload } from '../utils/imageUpload';
import { ConfirmDialog } from './ConfirmDialog';

interface CatalogViewProps {
  items: TShirtItem[];
  isDriveConnected?: boolean;
  onUploadProductPhoto?: (dataUrl: string, fileNameHint: string) => Promise<string>;
  onAddItem: (item: Omit<TShirtItem, 'id' | 'updatedAt'>) => void;
  onUpdateItem: (id: string, patch: Partial<TShirtItem>) => void;
  onDeleteItem: (id: string) => void;
}

const SIZES: TShirtSize[] = ['S', 'M', 'L', 'XL', 'XXL'];
const DEFAULT_IMAGES = [
  {
    label: 'Hitam Heavyweight',
    url: '/src/assets/images/sistor_tee_heavy_black_1795013810356.jpg',
  },
  {
    label: 'Putih Bone Combed',
    url: '/src/assets/images/sistor_tee_bone_white_1795013810610.jpg',
  },
  {
    label: 'Charcoal Washed',
    url: '/src/assets/images/sistor_tee_washed_charcoal_1795013811279.jpg',
  },
  {
    label: 'Sage Olive',
    url: '/src/assets/images/sistor_tee_sage_olive_1795013811927.jpg',
  },
];

export const CatalogView: React.FC<CatalogViewProps> = ({
  items,
  isDriveConnected = false,
  onUploadProductPhoto,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TShirtItem | null>(null);
  const [restockTarget, setRestockTarget] = useState<TShirtItem | null>(null);
  const [restockQty, setRestockQty] = useState<string>('10');
  const [deleteTarget, setDeleteTarget] = useState<TShirtItem | null>(null);

  const [formState, setFormState] = useState({
    sku: '',
    nama: '',
    kategori: 'Combed 24s',
    ukuran: 'L' as TShirtSize,
    warna: '',
    hpp: '55000',
    hargaJual: '129000',
    stokAwal: '20',
    stokMasuk: '0',
    terjual: '0',
    stokFisik: '20',
    keterangan: '',
    imageUrl: DEFAULT_IMAGES[0].url,
  });
  const [formError, setFormError] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProductPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    setIsUploadingPhoto(true);
    try {
      const dataUrl = await processImageUpload(file, {
        maxDimension: 720,
        preservePng: false,
        quality: 0.84,
      });
      const finalUrl = onUploadProductPhoto
        ? await onUploadProductPhoto(
            dataUrl,
            formState.sku.trim() || file.name.replace(/\.[^.]+$/, '')
          )
        : dataUrl;
      setFormState((s) => ({ ...s, imageUrl: finalUrl }));
    } catch (err: any) {
      setFormError(err?.message || 'Gagal memproses foto produk.');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (sizeFilter !== 'ALL' && item.ukuran !== sizeFilter) return false;
      if (!q) return true;
      return (
        item.sku.toLowerCase().includes(q) ||
        item.nama.toLowerCase().includes(q) ||
        item.warna.toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q)
      );
    });
  }, [items, search, sizeFilter]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormError('');
    setFormState({
      sku: `STR-NEW-${String(items.length + 1).padStart(2, '0')}`,
      nama: '',
      kategori: 'Combed 24s',
      ukuran: 'L',
      warna: '',
      hpp: '55000',
      hargaJual: '129000',
      stokAwal: '20',
      stokMasuk: '0',
      terjual: '0',
      stokFisik: '20',
      keterangan: '',
      imageUrl: DEFAULT_IMAGES[0].url,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: TShirtItem) => {
    setEditingItem(item);
    setFormError('');
    setFormState({
      sku: item.sku,
      nama: item.nama,
      kategori: item.kategori,
      ukuran: item.ukuran,
      warna: item.warna,
      hpp: String(item.hpp),
      hargaJual: String(item.hargaJual),
      stokAwal: String(item.stokAwal),
      stokMasuk: String(item.stokMasuk),
      terjual: String(item.terjual),
      stokFisik: String(item.stokFisik),
      keterangan: item.keterangan,
      imageUrl: item.imageUrl || DEFAULT_IMAGES[0].url,
    });
    setModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.sku.trim() || !formState.nama.trim() || !formState.warna.trim()) {
      setFormError('SKU, Nama Kaos, dan Warna wajib diisi.');
      return;
    }
    const hpp = Number(formState.hpp);
    const hargaJual = Number(formState.hargaJual);
    const stokAwal = Number(formState.stokAwal);
    const stokMasuk = Number(formState.stokMasuk);
    const terjual = Number(formState.terjual);
    const stokFisik = Number(formState.stokFisik);

    if (
      [hpp, hargaJual, stokAwal, stokMasuk, terjual, stokFisik].some(
        (n) => Number.isNaN(n) || n < 0
      )
    ) {
      setFormError('Nilai harga dan stok harus berupa angka positif.');
      return;
    }

    const payload = {
      sku: formState.sku.trim().toUpperCase(),
      nama: formState.nama.trim(),
      kategori: formState.kategori.trim() || 'Combed 24s',
      ukuran: formState.ukuran,
      warna: formState.warna.trim(),
      hpp,
      hargaJual,
      stokAwal,
      stokMasuk,
      terjual,
      stokFisik,
      keterangan: formState.keterangan,
      imageUrl: formState.imageUrl,
    };

    if (editingItem) {
      onUpdateItem(editingItem.id, payload);
    } else {
      onAddItem(payload);
    }
    setModalOpen(false);
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    const qty = Math.max(0, Math.floor(Number(restockQty) || 0));
    if (qty <= 0) return;
    onUpdateItem(restockTarget.id, {
      stokMasuk: restockTarget.stokMasuk + qty,
      stokFisik: restockTarget.stokFisik + qty,
    });
    setRestockTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#141413]">
            Katalog Produk Sisstore
          </h1>
          <p className="mt-1 text-sm text-[#52524E]">
            Kelola SKU kaos, Harga Dasar (HPP), Harga Jual, dan stok masuk barang.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#172554]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Varian Kaos
        </button>
      </div>

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
            placeholder="Cari SKU, nama kaos, warna, atau bahan..."
            aria-label="Cari katalog kaos"
            className="w-full rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] py-2 pl-9 pr-3 text-sm text-[#141413] placeholder:text-[#787872] focus:border-[#1E3A8A] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#F3F3F0] p-1 overflow-x-auto">
          {['ALL', ...SIZES].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSizeFilter(size)}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sizeFilter === size
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#52524E] hover:text-[#141413]'
              }`}
            >
              {size === 'ALL' ? 'Semua Ukuran' : size}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E5E5E0] bg-white">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] text-xs font-semibold text-[#52524E]">
              <th className="px-4 py-3">SKU &amp; Produk</th>
              <th className="px-4 py-3">Varian</th>
              <th className="px-4 py-3 text-right">Harga Dasar (HPP)</th>
              <th className="px-4 py-3 text-right">Harga Jual</th>
              <th className="px-4 py-3 text-right">Margin / Pcs</th>
              <th className="px-4 py-3 text-right">Stok Sistem</th>
              <th className="px-4 py-3 text-right">Terjual</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E0]">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#6B6B65]">
                  Tidak ada kaos yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const m = calculateItemMetrics(item);
                return (
                  <tr key={item.id} className="hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#E5E5E0] bg-[#F3F3F0] flex items-center justify-center">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={`${item.nama} ${item.warna}`}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Shirt className="h-4 w-4 text-[#787872]" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#141413]">
                            {item.nama}
                          </div>
                          <div className="font-mono text-xs text-[#6B6B65]">
                            {item.sku} · {item.kategori}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#3F3F3B]">
                      {item.ukuran} · {item.warna}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#3F3F3B]">
                      {formatRupiah(item.hpp)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[#141413]">
                      {formatRupiah(item.hargaJual)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#15803D]">
                      {formatRupiah(m.marginPerPcs)} ({m.marginPersen.toFixed(0)}%)
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                        m.stokSistem <= 5 ? 'text-[#B45309]' : 'text-[#141413]'
                      }`}
                    >
                      {m.stokSistem} pcs
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#52524E]">
                      {item.terjual} pcs
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setRestockTarget(item);
                            setRestockQty('10');
                          }}
                          aria-label={`Tambah stok masuk ${item.sku}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-[#E5E5E0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#F3F3F0]"
                        >
                          <PackagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                          Restock
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          aria-label={`Edit ${item.sku}`}
                          className="rounded-md border border-[#E5E5E0] bg-white p-1.5 text-[#3F3F3B] hover:bg-[#F3F3F0]"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Hapus ${item.sku}`}
                          className="rounded-md border border-[#E5E5E0] bg-white p-1.5 text-[#B91C1C] hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalog-modal-title"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#E5E5E0] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-4">
              <h2
                id="catalog-modal-title"
                className="font-display text-lg font-bold text-[#141413]"
              >
                {editingItem ? `Edit Varian ${editingItem.sku}` : 'Tambah Varian Kaos Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup form kaos"
                className="rounded-lg p-1.5 text-[#6B6B65] hover:bg-[#F3F3F0]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#B91C1C]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="tee-sku"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Kode SKU
                  </label>
                  <input
                    id="tee-sku"
                    type="text"
                    required
                    value={formState.sku}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, sku: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tee-kategori"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Bahan / Kategori
                  </label>
                  <input
                    id="tee-kategori"
                    type="text"
                    value={formState.kategori}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, kategori: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="tee-nama"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Nama Kaos
                </label>
                <input
                  id="tee-nama"
                  type="text"
                  required
                  placeholder="Contoh: Sisstore Heavyweight Boxy Tee"
                  value={formState.nama}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, nama: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="tee-ukuran"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Ukuran
                  </label>
                  <select
                    id="tee-ukuran"
                    value={formState.ukuran}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        ukuran: e.target.value as TShirtSize,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                  >
                    {SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tee-warna"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Warna
                  </label>
                  <input
                    id="tee-warna"
                    type="text"
                    required
                    placeholder="Jet Black"
                    value={formState.warna}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, warna: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Photo Upload + Studio Preset Picker */}
              <div className="rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#3F3F3B]">
                    Foto Produk Kaos
                  </span>
                  <span className="text-[11px] text-[#6B6B65]">
                    Upload foto sendiri atau pilih contoh studio
                  </span>
                </div>
                <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-[#E5E5E0] bg-white flex items-center justify-center">
                    {formState.imageUrl ? (
                      <img
                        src={formState.imageUrl}
                        alt="Preview foto produk"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Shirt className="h-6 w-6 text-[#787872]" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        aria-label="Upload file foto produk kaos"
                        onChange={handleProductPhotoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-60"
                      >
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                        {isUploadingPhoto ? 'Memproses...' : 'Upload Foto Produk'}
                      </button>
                      <select
                        id="tee-foto"
                        aria-label="Pilih contoh foto studio"
                        value={
                          DEFAULT_IMAGES.some((d) => d.url === formState.imageUrl)
                            ? formState.imageUrl
                            : ''
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormState((s) => ({
                              ...s,
                              imageUrl: e.target.value,
                            }));
                          }
                        }}
                        className="rounded-lg border border-[#E5E5E0] bg-white px-2.5 py-1.5 text-xs text-[#3F3F3B] focus:border-[#1E3A8A] focus:outline-none"
                      >
                        <option value="">Atau pilih foto contoh...</option>
                        {DEFAULT_IMAGES.map((img) => (
                          <option key={img.url} value={img.url}>
                            {img.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-[11px] text-[#6B6B65]">
                      {isDriveConnected
                        ? 'Google Drive aktif: foto otomatis disimpan ke folder Drive toko dan tautannya masuk ke Spreadsheet.'
                        : 'Mendukung JPG, PNG, WEBP. Tersimpan lokal, dan otomatis masuk Google Drive saat Apps Script dihubungkan.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="tee-hpp"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Harga Dasar / HPP (Rp)
                  </label>
                  <input
                    id="tee-hpp"
                    type="number"
                    min={0}
                    required
                    value={formState.hpp}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, hpp: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tee-harga"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Harga Jual (Rp)
                  </label>
                  <input
                    id="tee-harga"
                    type="number"
                    min={0}
                    required
                    value={formState.hargaJual}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, hargaJual: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label
                    htmlFor="tee-awal"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Stok Awal
                  </label>
                  <input
                    id="tee-awal"
                    type="number"
                    min={0}
                    value={formState.stokAwal}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, stokAwal: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tee-masuk"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Stok Masuk
                  </label>
                  <input
                    id="tee-masuk"
                    type="number"
                    min={0}
                    value={formState.stokMasuk}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, stokMasuk: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tee-terjual"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Terjual
                  </label>
                  <input
                    id="tee-terjual"
                    type="number"
                    min={0}
                    value={formState.terjual}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, terjual: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tee-fisik"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Stok Fisik
                  </label>
                  <input
                    id="tee-fisik"
                    type="number"
                    min={0}
                    value={formState.stokFisik}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, stokFisik: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E5E5E0] pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#E5E5E0] px-4 py-2 text-sm font-medium text-[#3F3F3B] hover:bg-[#F3F3F0]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambahkan ke Katalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {restockTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restock-modal-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-[#E5E5E0] bg-white p-6 shadow-xl">
            <h2
              id="restock-modal-title"
              className="font-display text-lg font-bold text-[#141413]"
            >
              Restock {restockTarget.sku}
            </h2>
            <p className="mt-1 text-xs text-[#6B6B65]">
              {restockTarget.nama} ({restockTarget.ukuran} · {restockTarget.warna})
            </p>
            <form onSubmit={handleConfirmRestock} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="restock-qty"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Jumlah Tambahan Stok Masuk (pcs)
                </label>
                <input
                  id="restock-qty"
                  type="number"
                  min={1}
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockTarget(null)}
                  className="rounded-lg border border-[#E5E5E0] px-4 py-2 text-sm font-medium text-[#3F3F3B] hover:bg-[#F3F3F0]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172554]"
                >
                  Tambah Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Varian Kaos?"
        description={
          deleteTarget
            ? `Varian ${deleteTarget.sku} (${deleteTarget.nama} · ${deleteTarget.ukuran}) akan dihapus dari katalog aktif.`
            : ''
        }
        confirmLabel="Hapus Varian"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteItem(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
