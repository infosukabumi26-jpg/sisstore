import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  History,
  Minus,
  Plus,
  Printer,
  QrCode,
  Search,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import type {
  PaymentMethod,
  SaleTransaction,
  StoreSettings,
  StoreUser,
  TShirtItem,
} from '../types/sistor';
import {
  buildTransactionsCsv,
  calculateCashChange,
  calculateItemMetrics,
  formatRupiah,
} from '../utils/calculations';
import { QrisVisual } from './QrisVisual';

interface PosViewProps {
  items: TShirtItem[];
  transactions: SaleTransaction[];
  settings: StoreSettings;
  currentUser: StoreUser;
  onCompleteSale: (tx: Omit<SaleTransaction, 'id' | 'invoiceNo'>) => SaleTransaction;
}

interface CartRow {
  item: TShirtItem;
  qty: number;
  customHargaJual: number;
}

export const PosView: React.FC<PosViewProps> = ({
  items,
  transactions,
  settings,
  currentUser,
  onCompleteSale,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const [subView, setSubView] = useState<'pos' | 'riwayat'>('pos');
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('ALL');
  const [cart, setCart] = useState<CartRow[]>([]);
  const [diskonInput, setDiskonInput] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(
    settings.bankAccounts[0]?.id || ''
  );
  const [paymentRef, setPaymentRef] = useState('');
  const [kasirName, setKasirName] = useState(
    currentUser.displayName || settings.defaultCashier
  );
  const [catatan, setCatatan] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [receiptTx, setReceiptTx] = useState<SaleTransaction | null>(null);
  const [receiptPaper, setReceiptPaper] = useState<'thermal-58' | 'thermal-80' | 'standard'>('thermal-80');
  const [autoPrint, setAutoPrint] = useState(Boolean(settings.autoPrintReceipt));
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const triggerReceiptPrint = () => {
    document.body.classList.add('printing-receipt');
    const cleanup = () => {
      document.body.classList.remove('printing-receipt');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.setTimeout(() => {
      window.print();
      window.setTimeout(cleanup, 1000);
    }, 60);
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (sizeFilter !== 'ALL' && item.ukuran !== sizeFilter) return false;
      if (!q) return true;
      return (
        item.sku.toLowerCase().includes(q) ||
        item.nama.toLowerCase().includes(q) ||
        item.warna.toLowerCase().includes(q)
      );
    });
  }, [items, search, sizeFilter]);

  const subtotal = useMemo(
    () => cart.reduce((acc, row) => acc + row.customHargaJual * row.qty, 0),
    [cart]
  );

  const catalogSubtotal = useMemo(
    () => cart.reduce((acc, row) => acc + row.item.hargaJual * row.qty, 0),
    [cart]
  );

  const negotiationDelta = subtotal - catalogSubtotal;

  const totalHpp = useMemo(
    () => cart.reduce((acc, row) => acc + row.item.hpp * row.qty, 0),
    [cart]
  );

  const totalQty = useMemo(
    () => cart.reduce((acc, row) => acc + row.qty, 0),
    [cart]
  );

  const diskon = Math.min(
    subtotal,
    Math.max(0, Math.floor(Number(diskonInput) || 0))
  );
  const totalPenjualan = Math.max(0, subtotal - diskon);

  const cashReceivedNum = Number(cashReceivedInput) || 0;
  const cashCalc = calculateCashChange(totalPenjualan, cashReceivedNum);

  const selectedBank =
    settings.bankAccounts.find((b) => b.id === selectedBankId) ||
    settings.bankAccounts[0];

  const addToCart = (item: TShirtItem) => {
    const metrics = calculateItemMetrics(item);
    if (metrics.stokSistem <= 0) return;

    setCheckoutError('');
    setCart((prev) => {
      const existing = prev.find((r) => r.item.id === item.id);
      if (existing) {
        if (existing.qty >= metrics.stokSistem) return prev;
        return prev.map((r) =>
          r.item.id === item.id ? { ...r, qty: r.qty + 1 } : r
        );
      }
      return [...prev, { item, qty: 1, customHargaJual: item.hargaJual }];
    });

    setCartToast(`${item.nama} (${item.ukuran}) ditambahkan ke keranjang`);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setCartToast(null);
    }, 3200);
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCheckoutError('');
    setCart((prev) =>
      prev
        .map((row) => {
          if (row.item.id !== itemId) return row;
          const maxStock = calculateItemMetrics(row.item).stokSistem;
          const nextQty = Math.min(maxStock, row.qty + delta);
          return { ...row, qty: nextQty };
        })
        .filter((row) => row.qty > 0)
    );
  };

  const updateCartPrice = (itemId: string, nextPrice: number) => {
    setCheckoutError('');
    const sanitized = Math.max(0, Math.floor(Number.isFinite(nextPrice) ? nextPrice : 0));
    setCart((prev) =>
      prev.map((row) =>
        row.item.id === itemId ? { ...row, customHargaJual: sanitized } : row
      )
    );
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (cart.length === 0) {
      setCheckoutError('Keranjang masih kosong. Pilih minimal 1 kaos.');
      return;
    }

    if (paymentMethod === 'CASH') {
      const received =
        cashReceivedInput.trim() === '' ? totalPenjualan : cashReceivedNum;
      const check = calculateCashChange(totalPenjualan, received);
      if (!check.valid) {
        setCheckoutError(
          `Uang tunai kurang ${formatRupiah(check.kurang)}.`
        );
        return;
      }
    }

    const now = new Date();
    const tanggal = now.toISOString().slice(0, 10);
    const waktu = now.toTimeString().slice(0, 5);

    const uangDiterima =
      paymentMethod === 'CASH'
        ? cashReceivedInput.trim() === ''
          ? totalPenjualan
          : cashReceivedNum
        : undefined;

    const kembalian =
      paymentMethod === 'CASH' && uangDiterima !== undefined
        ? Math.max(0, uangDiterima - totalPenjualan)
        : undefined;

    const created = onCompleteSale({
      tanggal,
      waktu,
      items: cart.map((r) => ({
        itemId: r.item.id,
        sku: r.item.sku,
        nama: r.item.nama,
        ukuran: r.item.ukuran,
        warna: r.item.warna,
        qty: r.qty,
        hpp: r.item.hpp,
        hargaKatalog: r.item.hargaJual,
        hargaJual: r.customHargaJual,
      })),
      totalQty,
      totalHpp,
      subtotal,
      diskon,
      totalPenjualan,
      metodePembayaran: paymentMethod,
      bankTujuan:
        paymentMethod === 'TRANSFER_BANK' && selectedBank
          ? `${selectedBank.bankName} - ${selectedBank.accountNumber} (${selectedBank.accountHolder})`
          : undefined,
      referensiPembayaran:
        paymentMethod !== 'CASH'
          ? paymentRef.trim() ||
            `${paymentMethod}-${now.getTime().toString().slice(-5)}`
          : undefined,
      uangDiterima,
      kembalian,
      kasir: kasirName.trim() || currentUser.displayName || settings.defaultCashier,
      kasirRole: currentUser.role,
      catatan: catatan.trim(),
    });

    setCart([]);
    setDiskonInput('0');
    setCashReceivedInput('');
    setPaymentRef('');
    setCatatan('');
    setCartDrawerOpen(false);
    setCartToast(null);
    setReceiptTx(created);
    if (autoPrint) {
      window.setTimeout(() => {
        triggerReceiptPrint();
      }, 150);
    }
  };

  const handleDownloadTxCsv = () => {
    const csv = buildTransactionsCsv(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sisstore-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
    <div className="hide-when-printing-receipt space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#141413]">
            Kasir Penjualan Kaos {settings.storeName}
          </h1>
          <p className="mt-1 text-sm text-[#52524E]">
            Transaksi penjualan langsung Cash, QRIS, maupun Transfer Bank. Stok sistem otomatis berkurang.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 self-start lg:self-auto">
          <div className="flex items-center gap-1 rounded-lg bg-[#EBEBE6] p-1">
            <button
              type="button"
              onClick={() => setSubView('pos')}
              className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                subView === 'pos'
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#52524E] hover:text-[#141413]'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              Kasir Aktif
            </button>
            <button
              type="button"
              onClick={() => setSubView('riwayat')}
              className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors ${
                subView === 'riwayat'
                  ? 'bg-white text-[#141413] shadow-xs'
                  : 'text-[#52524E] hover:text-[#141413]'
              }`}
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              Riwayat Transaksi ({transactions.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubView('pos');
              setCartDrawerOpen(true);
            }}
            aria-label={`Buka keranjang belanja (${totalQty} item)`}
            className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              totalQty > 0
                ? 'bg-[#1E3A8A] text-white shadow-xs hover:bg-[#172554]'
                : 'border border-[#E5E5E0] bg-white text-[#141413] hover:bg-[#F3F3F0]'
            }`}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span>Keranjang</span>
            <span
              className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                totalQty > 0
                  ? 'bg-white text-[#1E3A8A]'
                  : 'bg-[#F3F3F0] text-[#52524E]'
              }`}
            >
              {totalQty}
            </span>
            {totalQty > 0 && (
              <span className="hidden sm:inline font-mono tabular-nums text-[11px] text-[#DBEAFE]">
                · {formatRupiah(totalPenjualan)}
              </span>
            )}
          </button>
        </div>
      </div>

      {cartToast && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-xs text-[#1E3A8A]"
        >
          <div className="flex items-center gap-2 font-medium">
            <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{cartToast}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCartToast(null);
              setSubView('pos');
              setCartDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-md bg-[#1E3A8A] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#172554] whitespace-nowrap"
          >
            Buka Keranjang ({totalQty})
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {!isAdmin && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-3">
            <div className="text-xs text-[#6B6B65]">Operator Bertugas</div>
            <div className="mt-0.5 text-sm font-bold text-[#141413]">
              {currentUser.displayName}
            </div>
            <div className="text-[11px] text-[#1E3A8A]">
              {currentUser.shiftLabel}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-3">
            <div className="text-xs text-[#6B6B65]">Total Transaksi Tercatat</div>
            <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-[#141413]">
              {transactions.length} struk
            </div>
            <div className="text-[11px] text-[#52524E]">
              Cash · QRIS · Transfer Bank
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E5E0] bg-white px-4 py-3">
            <div className="text-xs text-[#6B6B65]">Total Omzet Kasir POS</div>
            <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-[#1E3A8A]">
              {formatRupiah(
                transactions.reduce((acc, t) => acc + t.totalPenjualan, 0)
              )}
            </div>
            <div className="text-[11px] text-[#52524E]">
              {transactions.reduce((acc, t) => acc + t.totalQty, 0)} pcs kaos terjual
            </div>
          </div>
        </div>
      )}

      {subView === 'pos' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
          {/* Left: Product Grid */}
          <div className="space-y-4 xl:col-span-7">
            <div className="flex flex-col gap-3 rounded-xl border border-[#E5E5E0] bg-white p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#787872]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, SKU, atau warna..."
                  aria-label="Cari kaos di kasir"
                  className="w-full rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] py-2 pl-9 pr-3 text-sm text-[#141413] placeholder:text-[#787872] focus:border-[#1E3A8A] focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-[#F3F3F0] p-1 overflow-x-auto">
                {['ALL', 'S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSizeFilter(sz)}
                    className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      sizeFilter === sz
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#52524E] hover:text-[#141413]'
                    }`}
                  >
                    {sz === 'ALL' ? 'Semua' : sz}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              {filteredProducts.map((item) => {
                const metrics = calculateItemMetrics(item);
                const outOfStock = metrics.stokSistem <= 0;
                const inCart = cart.find((r) => r.item.id === item.id);
                const hasImgError = imgErrors[item.id];

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E5E0] bg-white transition-transform duration-150 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[#F3F3F0] flex items-center justify-center">
                        {item.imageUrl && !hasImgError ? (
                          <img
                            src={item.imageUrl}
                            alt={`${item.nama} - ${item.warna}`}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setImgErrors((e) => ({ ...e, [item.id]: true }))
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-[#787872]">
                            <Shirt className="h-8 w-8" aria-hidden="true" />
                            <span className="text-xs font-medium">{item.ukuran}</span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="text-xs text-[#6B6B65]">
                          {item.sku} · Ukuran {item.ukuran} · {item.warna}
                        </div>
                        <h3 className="mt-1 text-sm font-semibold text-[#141413] leading-snug">
                          {item.nama}
                        </h3>
                        <div className="mt-2 flex items-baseline justify-between gap-2">
                          <span className="font-mono text-base font-bold tabular-nums text-[#141413]">
                            {formatRupiah(item.hargaJual)}
                          </span>
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              outOfStock
                                ? 'font-semibold text-[#B91C1C]'
                                : metrics.stokSistem <= 5
                                ? 'font-medium text-[#B45309]'
                                : 'text-[#52524E]'
                            }`}
                          >
                            {outOfStock ? 'Stok habis' : `Stok ${metrics.stokSistem}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#E5E5E0] px-4 py-3">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-1 items-center justify-between rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-1.5 py-1">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.id, -1)}
                              aria-label={`Kurangi ${item.nama} di keranjang`}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#1E3A8A] shadow-2xs hover:bg-[#DBEAFE]"
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span className="font-mono text-xs font-bold tabular-nums text-[#1E3A8A]">
                              {inCart.qty} di keranjang
                            </span>
                            <button
                              type="button"
                              disabled={inCart.qty >= metrics.stokSistem}
                              onClick={() => addToCart(item)}
                              aria-label={`Tambah ${item.nama} lagi ke keranjang`}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1E3A8A] text-white hover:bg-[#172554] disabled:cursor-not-allowed disabled:bg-[#D6D6D0] disabled:text-[#6B6B65]"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCartDrawerOpen(true)}
                            aria-label={`Lihat keranjang untuk ${item.nama}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1E3A8A] bg-white text-[#1E3A8A] hover:bg-[#EFF6FF]"
                          >
                            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={outOfStock}
                          onClick={() => addToCart(item)}
                          className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#141413] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E3A8A] disabled:cursor-not-allowed disabled:bg-[#D6D6D0] disabled:text-[#6B6B65]"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                          Tambah ke Keranjang
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Checkout Panel (always visible on xl+; hidden when drawer open to keep form IDs unique) */}
          {!cartDrawerOpen && (
            <form
              onSubmit={handleCheckout}
              className="rounded-xl border border-[#E5E5E0] bg-white p-4 xl:col-span-5 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-[#E5E5E0] pb-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#141413]">
                    Keranjang &amp; Pembayaran
                  </h2>
                  <p className="text-xs text-[#6B6B65]">
                    {totalQty} pcs dipilih
                    {isAdmin ? ` · HPP ${formatRupiah(totalHpp)}` : ''}
                  </p>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs font-medium text-[#B91C1C] hover:underline whitespace-nowrap"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#6B6B65]">
                  Belum ada produk di keranjang. Klik{' '}
                  <span className="font-medium text-[#141413]">Tambah ke Keranjang</span>{' '}
                  pada daftar produk di samping.
                </div>
              ) : (
                <ul className="divide-y divide-[#E5E5E0] max-h-64 overflow-y-auto">
                  {cart.map((row) => {
                    const isNegotiated = row.customHargaJual !== row.item.hargaJual;
                    const diffPerPcs = row.customHargaJual - row.item.hargaJual;
                    const belowHpp = isAdmin && row.customHargaJual < row.item.hpp;

                    return (
                      <li key={row.item.id} className="py-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[#141413]">
                              {row.item.nama}
                            </div>
                            <div className="text-xs text-[#6B6B65] font-mono tabular-nums">
                              {row.item.ukuran} · {row.item.warna} · Katalog{' '}
                              {formatRupiah(row.item.hargaJual)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateCartQty(row.item.id, -1)}
                              aria-label={`Kurangi jumlah ${row.item.sku}`}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E5E0] text-[#3F3F3B] hover:bg-[#F3F3F0]"
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span className="w-6 text-center font-mono text-sm font-semibold tabular-nums">
                              {row.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(row.item.id, 1)}
                              aria-label={`Tambah jumlah ${row.item.sku}`}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E5E0] text-[#3F3F3B] hover:bg-[#F3F3F0]"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCartQty(row.item.id, -row.qty)}
                              aria-label={`Hapus ${row.item.sku} dari keranjang`}
                              className="ml-0.5 rounded-md p-1.5 text-[#787872] hover:bg-red-50 hover:text-[#B91C1C]"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {/* Flexible Harga Jadi Unit Price Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F7F7F5] px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`cart-price-${row.item.id}`}
                              className="text-[11px] font-semibold text-[#52524E] whitespace-nowrap"
                            >
                              Harga Jadi / pcs:
                            </label>
                            <input
                              id={`cart-price-${row.item.id}`}
                              type="number"
                              min={0}
                              step={500}
                              value={row.customHargaJual}
                              aria-label={`Harga jadi per pcs ${row.item.sku}`}
                              onChange={(e) =>
                                updateCartPrice(
                                  row.item.id,
                                  Number(e.target.value)
                                )
                              }
                              className={`w-28 rounded-md border px-2 py-1 font-mono text-xs font-semibold tabular-nums focus:outline-none ${
                                belowHpp
                                  ? 'border-red-300 bg-red-50 text-[#B91C1C] focus:border-[#B91C1C]'
                                  : isNegotiated
                                  ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] focus:border-[#1E3A8A]'
                                  : 'border-[#D6D6D0] bg-white text-[#141413] focus:border-[#1E3A8A]'
                              }`}
                            />
                            {isNegotiated && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateCartPrice(row.item.id, row.item.hargaJual)
                                }
                                className="text-[11px] font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
                              >
                                Reset
                              </button>
                            )}
                          </div>

                          <div className="text-right font-mono tabular-nums">
                            <div className="text-xs font-bold text-[#141413]">
                              {formatRupiah(row.customHargaJual * row.qty)}
                            </div>
                            {isNegotiated && (
                              <div
                                className={`text-[10px] font-medium ${
                                  belowHpp
                                    ? 'text-[#B91C1C]'
                                    : diffPerPcs < 0
                                    ? 'text-[#B45309]'
                                    : 'text-[#15803D]'
                                }`}
                              >
                                {belowHpp
                                  ? 'Di bawah HPP!'
                                  : `${diffPerPcs > 0 ? '+' : ''}${formatRupiah(
                                      diffPerPcs
                                    )}/pcs`}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-3 space-y-2.5 border-t border-[#E5E5E0] pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="pos-diskon"
                      className="block text-xs font-medium text-[#52524E]"
                    >
                      Diskon Tambahan (Rp)
                    </label>
                    <input
                      id="pos-diskon"
                      type="number"
                      min={0}
                      value={diskonInput}
                      onChange={(e) => setDiskonInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="pos-kasir"
                      className="block text-xs font-medium text-[#52524E]"
                    >
                      Nama Kasir
                    </label>
                    <input
                      id="pos-kasir"
                      type="text"
                      value={kasirName}
                      onChange={(e) => setKasirName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 text-sm focus:border-[#1E3A8A] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 rounded-lg bg-[#F7F7F5] px-4 py-3 text-sm">
                  {negotiationDelta !== 0 && (
                    <>
                      <div className="flex justify-between text-xs text-[#6B6B65]">
                        <span>Harga Katalog Normal</span>
                        <span className="font-mono line-through tabular-nums">
                          {formatRupiah(catalogSubtotal)}
                        </span>
                      </div>
                      <div
                        className={`flex justify-between text-xs font-medium ${
                          negotiationDelta < 0
                            ? 'text-[#B45309]'
                            : 'text-[#15803D]'
                        }`}
                      >
                        <span>Penyesuaian Harga Jadi</span>
                        <span className="font-mono tabular-nums">
                          {negotiationDelta > 0 ? '+' : ''}
                          {formatRupiah(negotiationDelta)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-[#52524E]">
                    <span>Subtotal {negotiationDelta !== 0 ? '(Harga Jadi)' : ''}</span>
                    <span className="font-mono tabular-nums">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                  {diskon > 0 && (
                    <div className="flex justify-between text-[#B45309]">
                      <span>Diskon Tambahan</span>
                      <span className="font-mono tabular-nums">
                        -{formatRupiah(diskon)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-[#E5E5E0] pt-1.5 text-base font-bold text-[#141413]">
                    <span>Total Bayar</span>
                    <span className="font-mono tabular-nums text-[#1E3A8A]">
                      {formatRupiah(totalPenjualan)}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-[#3F3F3B]">
                    Metode Pembayaran
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('CASH');
                        setCheckoutError('');
                      }}
                      className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                        paymentMethod === 'CASH'
                          ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A]'
                          : 'border-[#E5E5E0] bg-white text-[#3F3F3B] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      <Banknote className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('QRIS');
                        setCheckoutError('');
                      }}
                      className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                        paymentMethod === 'QRIS'
                          ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A]'
                          : 'border-[#E5E5E0] bg-white text-[#3F3F3B] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      <QrCode className="h-4 w-4 shrink-0" aria-hidden="true" />
                      QRIS
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('TRANSFER_BANK');
                        setCheckoutError('');
                      }}
                      className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                        paymentMethod === 'TRANSFER_BANK'
                          ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A]'
                          : 'border-[#E5E5E0] bg-white text-[#3F3F3B] hover:bg-[#F7F7F5]'
                      }`}
                    >
                      <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Transfer Bank
                    </button>
                  </div>
                </div>

                {paymentMethod === 'CASH' && (
                  <div className="space-y-2 rounded-lg border border-[#E5E5E0] p-3.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="cash-received"
                        className="text-xs font-semibold text-[#3F3F3B]"
                      >
                        Uang Tunai Diterima (Rp)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCashReceivedInput(String(totalPenjualan))
                        }
                        className="text-xs font-semibold text-[#1E3A8A] hover:underline"
                      >
                        Uang Pas
                      </button>
                    </div>
                    <input
                      id="cash-received"
                      type="number"
                      min={0}
                      placeholder={String(totalPenjualan)}
                      value={cashReceivedInput}
                      onChange={(e) => setCashReceivedInput(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[150000, 200000, 300000, 500000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCashReceivedInput(String(preset))}
                          className="rounded-md border border-[#E5E5E0] bg-[#F7F7F5] px-2.5 py-1 font-mono text-xs text-[#3F3F3B] hover:bg-[#EBEBE6]"
                        >
                          {formatRupiah(preset)}
                        </button>
                      ))}
                    </div>
                    {cashReceivedInput.trim() !== '' && totalPenjualan > 0 && (
                      <div className="flex justify-between pt-1 text-xs font-semibold">
                        <span className="text-[#52524E]">
                          {cashCalc.valid ? 'Kembalian' : 'Kurang Bayar'}
                        </span>
                        <span
                          className={`font-mono tabular-nums ${
                            cashCalc.valid ? 'text-[#15803D]' : 'text-[#B91C1C]'
                          }`}
                        >
                          {cashCalc.valid
                            ? formatRupiah(cashCalc.kembalian)
                            : formatRupiah(cashCalc.kurang)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'QRIS' && (
                  <div className="space-y-2.5">
                    <QrisVisual
                      merchantName={settings.qrisMerchantName}
                      merchantId={settings.qrisMerchantId}
                      amount={totalPenjualan}
                      qrisImageUrl={settings.qrisImageUrl}
                    />
                    <div>
                      <label
                        htmlFor="qris-ref"
                        className="block text-xs font-medium text-[#52524E]"
                      >
                        Nomor Referensi QRIS (Opsional)
                      </label>
                      <input
                        id="qris-ref"
                        type="text"
                        placeholder="Contoh: RRN-981273"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 font-mono text-xs focus:border-[#1E3A8A] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {paymentMethod === 'TRANSFER_BANK' && (
                  <div className="space-y-3 rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-3.5">
                    <div>
                      <label
                        htmlFor="bank-select"
                        className="block text-xs font-semibold text-[#3F3F3B]"
                      >
                        Rekening Bank Tujuan ({settings.storeName})
                      </label>
                      <select
                        id="bank-select"
                        value={selectedBank?.id || ''}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                      >
                        {settings.bankAccounts.map((bank) => (
                          <option key={bank.id} value={bank.id}>
                            {bank.bankName} — {bank.accountNumber} ({bank.accountHolder})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedBank && (
                      <div className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2.5 text-xs">
                        <div className="font-semibold text-[#141413]">
                          Bank {selectedBank.bankName} · a.n. {selectedBank.accountHolder}
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#1E3A8A]">
                          {selectedBank.accountNumber}
                        </div>
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="bank-ref"
                        className="block text-xs font-medium text-[#52524E]"
                      >
                        Kode Referensi / Nama Pengirim (Opsional)
                      </label>
                      <input
                        id="bank-ref"
                        type="text"
                        placeholder="Contoh: TRF-Budi-BCA"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-xs focus:border-[#1E3A8A] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="pos-catatan"
                    className="block text-xs font-medium text-[#52524E]"
                  >
                    Catatan Transaksi (Opsional)
                  </label>
                  <input
                    id="pos-catatan"
                    type="text"
                    placeholder="Contoh: Bungkus terpisah, pembeli reguler"
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>

                {checkoutError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#B91C1C]"
                  >
                    {checkoutError}
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-[#52524E] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={(e) => setAutoPrint(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[#D6D6D0] text-[#1E3A8A] focus:ring-[#1E3A8A]"
                  />
                  Langsung buka dialog print struk setelah selesai bayar
                </label>

                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className="w-full whitespace-nowrap rounded-lg bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#172554] disabled:cursor-not-allowed disabled:bg-[#D6D6D0] disabled:text-[#6B6B65]"
                >
                  Selesaikan Penjualan · {formatRupiah(totalPenjualan)}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Riwayat Transaksi */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#52524E]">
              Total {transactions.length} transaksi tercatat (Cash, QRIS, dan Transfer Bank).
            </p>
            <button
              type="button"
              onClick={handleDownloadTxCsv}
              className="whitespace-nowrap rounded-lg border border-[#E5E5E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
            >
              Unduh CSV Transaksi
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E5E5E0] bg-white">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E0] bg-[#F7F7F5] text-xs font-semibold text-[#52524E]">
                  <th className="px-4 py-3">Invoice &amp; Waktu</th>
                  <th className="px-4 py-3">Item Kaos</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Metode Pembayaran</th>
                  {isAdmin && <th className="px-4 py-3 text-right">HPP</th>}
                  <th className="px-4 py-3 text-right">Total Penjualan</th>
                  <th className="px-4 py-3 text-right">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E0]">
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 7 : 6}
                      className="px-4 py-12 text-center text-[#6B6B65]"
                    >
                      Belum ada transaksi penjualan tercatat.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#FAFAF8]">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-[#141413]">
                          {tx.invoiceNo}
                        </div>
                        <div className="text-xs text-[#6B6B65]">
                          {tx.tanggal} · {tx.waktu} · {tx.kasir}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#3F3F3B]">
                        {tx.items
                          .map((i) => {
                            const isNego =
                              i.hargaKatalog !== undefined &&
                              i.hargaKatalog !== i.hargaJual;
                            return `${i.nama} (${i.ukuran}) x${i.qty}${
                              isNego ? ` @${formatRupiah(i.hargaJual)} [Harga Jadi]` : ''
                            }`;
                          })
                          .join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {tx.totalQty}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-[#141413]">
                          {tx.metodePembayaran === 'TRANSFER_BANK'
                            ? 'Transfer Bank'
                            : tx.metodePembayaran}
                        </div>
                        <div className="text-[#6B6B65]">
                          {tx.bankTujuan || tx.referensiPembayaran || 'Tunai di kasir'}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-[#52524E]">
                          {formatRupiah(tx.totalHpp)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-[#141413]">
                        {formatRupiah(tx.totalPenjualan)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setReceiptTx(tx)}
                          className="rounded-md border border-[#E5E5E0] px-2.5 py-1 text-xs font-medium text-[#1E3A8A] hover:bg-[#EFF6FF]"
                        >
                          Lihat Struk
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

      {/* Floating Bottom Cart Bar for Mobile/Tablet */}
      {subView === 'pos' && totalQty > 0 && !cartDrawerOpen && !receiptTx && (
        <div className="no-print hide-when-printing-receipt fixed bottom-4 inset-x-4 z-30 xl:hidden">
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            className="flex w-full items-center justify-between rounded-xl bg-[#141413] px-4 py-3 text-white shadow-lg hover:bg-[#1E3A8A]"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="h-4 w-4 text-[#93C5FD]" aria-hidden="true" />
              <span className="text-xs font-semibold">
                {totalQty} pcs di Keranjang
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm font-bold tabular-nums">
              <span>{formatRupiah(totalPenjualan)}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </div>
          </button>
        </div>
      )}

      {/* Online-Store Style Slide-Over Cart & Checkout Drawer */}
      {cartDrawerOpen && (
        <div
          className="no-print hide-when-printing-receipt fixed inset-0 z-50 flex justify-end bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
        >
          <div
            className="flex-1"
            onClick={() => setCartDrawerOpen(false)}
            aria-hidden="true"
          />
          <form
            onSubmit={handleCheckout}
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-[#E5E5E0]"
          >
            <div className="flex items-center justify-between border-b border-[#E5E5E0] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1E3A8A]">
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="cart-drawer-title"
                    className="font-display text-base font-bold text-[#141413]"
                  >
                    Keranjang Belanja ({totalQty} pcs)
                  </h2>
                  <p className="text-xs text-[#6B6B65]">
                    Atur jumlah, Harga Jadi / pcs, &amp; proses pembayaran
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs font-medium text-[#B91C1C] hover:underline whitespace-nowrap"
                  >
                    Kosongkan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCartDrawerOpen(false)}
                  aria-label="Tutup keranjang"
                  className="rounded-lg p-1.5 text-[#6B6B65] hover:bg-[#F3F3F0]"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <ShoppingCart
                    className="mx-auto h-10 w-10 text-[#A1A19A]"
                    aria-hidden="true"
                  />
                  <div className="text-sm font-semibold text-[#141413]">
                    Keranjang masih kosong
                  </div>
                  <p className="text-xs text-[#6B6B65]">
                    Pilih produk dari katalog terlebih dahulu dengan menekan tombol{' '}
                    <span className="font-semibold text-[#141413]">Tambah ke Keranjang</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCartDrawerOpen(false)}
                    className="rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A]"
                  >
                    Pilih Produk Sekarang
                  </button>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-[#E5E5E0]">
                    {cart.map((row) => {
                      const isNegotiated = row.customHargaJual !== row.item.hargaJual;
                      const diffPerPcs = row.customHargaJual - row.item.hargaJual;
                      const belowHpp = isAdmin && row.customHargaJual < row.item.hpp;

                      return (
                        <li key={row.item.id} className="py-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-[#141413]">
                                {row.item.nama}
                              </div>
                              <div className="text-xs text-[#6B6B65] font-mono tabular-nums">
                                {row.item.ukuran} · {row.item.warna} · Katalog{' '}
                                {formatRupiah(row.item.hargaJual)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateCartQty(row.item.id, -1)}
                                aria-label={`Kurangi jumlah ${row.item.sku}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E5E0] text-[#3F3F3B] hover:bg-[#F3F3F0]"
                              >
                                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <span className="w-6 text-center font-mono text-sm font-semibold tabular-nums">
                                {row.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(row.item.id, 1)}
                                aria-label={`Tambah jumlah ${row.item.sku}`}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E5E0] text-[#3F3F3B] hover:bg-[#F3F3F0]"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCartQty(row.item.id, -row.qty)}
                                aria-label={`Hapus ${row.item.sku} dari keranjang`}
                                className="ml-0.5 rounded-md p-1.5 text-[#787872] hover:bg-red-50 hover:text-[#B91C1C]"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F7F7F5] px-2.5 py-2">
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`drawer-cart-price-${row.item.id}`}
                                className="text-[11px] font-semibold text-[#52524E] whitespace-nowrap"
                              >
                                Harga Jadi / pcs:
                              </label>
                              <input
                                id={`drawer-cart-price-${row.item.id}`}
                                type="number"
                                min={0}
                                step={500}
                                value={row.customHargaJual}
                                aria-label={`Harga jadi per pcs ${row.item.sku}`}
                                onChange={(e) =>
                                  updateCartPrice(
                                    row.item.id,
                                    Number(e.target.value)
                                  )
                                }
                                className={`w-28 rounded-md border px-2 py-1 font-mono text-xs font-semibold tabular-nums focus:outline-none ${
                                  belowHpp
                                    ? 'border-red-300 bg-red-50 text-[#B91C1C] focus:border-[#B91C1C]'
                                    : isNegotiated
                                    ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A] focus:border-[#1E3A8A]'
                                    : 'border-[#D6D6D0] bg-white text-[#141413] focus:border-[#1E3A8A]'
                                }`}
                              />
                              {isNegotiated && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCartPrice(row.item.id, row.item.hargaJual)
                                  }
                                  className="text-[11px] font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
                                >
                                  Reset
                                </button>
                              )}
                            </div>

                            <div className="text-right font-mono tabular-nums">
                              <div className="text-xs font-bold text-[#141413]">
                                {formatRupiah(row.customHargaJual * row.qty)}
                              </div>
                              {isNegotiated && (
                                <div
                                  className={`text-[10px] font-medium ${
                                    belowHpp
                                      ? 'text-[#B91C1C]'
                                      : diffPerPcs < 0
                                      ? 'text-[#B45309]'
                                      : 'text-[#15803D]'
                                  }`}
                                >
                                  {belowHpp
                                    ? 'Di bawah HPP!'
                                    : `${diffPerPcs > 0 ? '+' : ''}${formatRupiah(
                                        diffPerPcs
                                      )}/pcs`}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="space-y-3 border-t border-[#E5E5E0] pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="drawer-pos-diskon"
                          className="block text-xs font-medium text-[#52524E]"
                        >
                          Diskon Tambahan (Rp)
                        </label>
                        <input
                          id="drawer-pos-diskon"
                          type="number"
                          min={0}
                          value={diskonInput}
                          onChange={(e) => setDiskonInput(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="drawer-pos-kasir"
                          className="block text-xs font-medium text-[#52524E]"
                        >
                          Nama Kasir
                        </label>
                        <input
                          id="drawer-pos-kasir"
                          type="text"
                          value={kasirName}
                          onChange={(e) => setKasirName(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 text-sm focus:border-[#1E3A8A] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 rounded-lg bg-[#F7F7F5] px-4 py-3 text-sm">
                      {negotiationDelta !== 0 && (
                        <>
                          <div className="flex justify-between text-xs text-[#6B6B65]">
                            <span>Harga Katalog Normal</span>
                            <span className="font-mono line-through tabular-nums">
                              {formatRupiah(catalogSubtotal)}
                            </span>
                          </div>
                          <div
                            className={`flex justify-between text-xs font-medium ${
                              negotiationDelta < 0
                                ? 'text-[#B45309]'
                                : 'text-[#15803D]'
                            }`}
                          >
                            <span>Penyesuaian Harga Jadi</span>
                            <span className="font-mono tabular-nums">
                              {negotiationDelta > 0 ? '+' : ''}
                              {formatRupiah(negotiationDelta)}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-[#52524E]">
                        <span>Subtotal {negotiationDelta !== 0 ? '(Harga Jadi)' : ''}</span>
                        <span className="font-mono tabular-nums">
                          {formatRupiah(subtotal)}
                        </span>
                      </div>
                      {diskon > 0 && (
                        <div className="flex justify-between text-[#B45309]">
                          <span>Diskon Tambahan</span>
                          <span className="font-mono tabular-nums">
                            -{formatRupiah(diskon)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#E5E5E0] pt-1.5 text-base font-bold text-[#141413]">
                        <span>Total Bayar</span>
                        <span className="font-mono tabular-nums text-[#1E3A8A]">
                          {formatRupiah(totalPenjualan)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-[#3F3F3B]">
                        Metode Pembayaran
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('CASH');
                            setCheckoutError('');
                          }}
                          className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                            paymentMethod === 'CASH'
                              ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A]'
                              : 'border-[#E5E5E0] bg-white text-[#3F3F3B] hover:bg-[#F7F7F5]'
                          }`}
                        >
                          <Banknote className="h-4 w-4 shrink-0" aria-hidden="true" />
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('QRIS');
                            setCheckoutError('');
                          }}
                          className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                            paymentMethod === 'QRIS'
                              ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A]'
                              : 'border-[#E5E5E0] bg-white text-[#3F3F3B] hover:bg-[#F7F7F5]'
                          }`}
                        >
                          <QrCode className="h-4 w-4 shrink-0" aria-hidden="true" />
                          QRIS
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('TRANSFER_BANK');
                            setCheckoutError('');
                          }}
                          className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                            paymentMethod === 'TRANSFER_BANK'
                              ? 'border-[#1E3A8A] bg-[#EFF6FF] text-[#1E3A8A]'
                              : 'border-[#E5E5E0] bg-white text-[#3F3F3B] hover:bg-[#F7F7F5]'
                          }`}
                        >
                          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          Transfer Bank
                        </button>
                      </div>
                    </div>

                    {paymentMethod === 'CASH' && (
                      <div className="space-y-2 rounded-lg border border-[#E5E5E0] p-3.5">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="drawer-cash-received"
                            className="text-xs font-semibold text-[#3F3F3B]"
                          >
                            Uang Tunai Diterima (Rp)
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setCashReceivedInput(String(totalPenjualan))
                            }
                            className="text-xs font-semibold text-[#1E3A8A] hover:underline"
                          >
                            Uang Pas
                          </button>
                        </div>
                        <input
                          id="drawer-cash-received"
                          type="number"
                          min={0}
                          placeholder={String(totalPenjualan)}
                          value={cashReceivedInput}
                          onChange={(e) => setCashReceivedInput(e.target.value)}
                          className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {[150000, 200000, 300000, 500000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCashReceivedInput(String(preset))}
                              className="rounded-md border border-[#E5E5E0] bg-[#F7F7F5] px-2.5 py-1 font-mono text-xs text-[#3F3F3B] hover:bg-[#EBEBE6]"
                            >
                              {formatRupiah(preset)}
                            </button>
                          ))}
                        </div>
                        {cashReceivedInput.trim() !== '' && totalPenjualan > 0 && (
                          <div className="flex justify-between pt-1 text-xs font-semibold">
                            <span className="text-[#52524E]">
                              {cashCalc.valid ? 'Kembalian' : 'Kurang Bayar'}
                            </span>
                            <span
                              className={`font-mono tabular-nums ${
                                cashCalc.valid ? 'text-[#15803D]' : 'text-[#B91C1C]'
                              }`}
                            >
                              {cashCalc.valid
                                ? formatRupiah(cashCalc.kembalian)
                                : formatRupiah(cashCalc.kurang)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethod === 'QRIS' && (
                      <div className="space-y-2.5">
                        <QrisVisual
                          merchantName={settings.qrisMerchantName}
                          merchantId={settings.qrisMerchantId}
                          amount={totalPenjualan}
                          qrisImageUrl={settings.qrisImageUrl}
                        />
                        <div>
                          <label
                            htmlFor="drawer-qris-ref"
                            className="block text-xs font-medium text-[#52524E]"
                          >
                            Nomor Referensi QRIS (Opsional)
                          </label>
                          <input
                            id="drawer-qris-ref"
                            type="text"
                            placeholder="Contoh: RRN-981273"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 font-mono text-xs focus:border-[#1E3A8A] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'TRANSFER_BANK' && (
                      <div className="space-y-3 rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-3.5">
                        <div>
                          <label
                            htmlFor="drawer-bank-select"
                            className="block text-xs font-semibold text-[#3F3F3B]"
                          >
                            Rekening Bank Tujuan ({settings.storeName})
                          </label>
                          <select
                            id="drawer-bank-select"
                            value={selectedBank?.id || ''}
                            onChange={(e) => setSelectedBankId(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                          >
                            {settings.bankAccounts.map((bank) => (
                              <option key={bank.id} value={bank.id}>
                                {bank.bankName} — {bank.accountNumber} ({bank.accountHolder})
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedBank && (
                          <div className="rounded-lg border border-[#E5E5E0] bg-white px-3 py-2.5 text-xs">
                            <div className="font-semibold text-[#141413]">
                              Bank {selectedBank.bankName} · a.n. {selectedBank.accountHolder}
                            </div>
                            <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#1E3A8A]">
                              {selectedBank.accountNumber}
                            </div>
                          </div>
                        )}
                        <div>
                          <label
                            htmlFor="drawer-bank-ref"
                            className="block text-xs font-medium text-[#52524E]"
                          >
                            Kode Referensi / Nama Pengirim (Opsional)
                          </label>
                          <input
                            id="drawer-bank-ref"
                            type="text"
                            placeholder="Contoh: TRF-Budi-BCA"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-xs focus:border-[#1E3A8A] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="drawer-pos-catatan"
                        className="block text-xs font-medium text-[#52524E]"
                      >
                        Catatan Transaksi (Opsional)
                      </label>
                      <input
                        id="drawer-pos-catatan"
                        type="text"
                        placeholder="Contoh: Bungkus terpisah, pembeli reguler"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-1.5 text-sm focus:border-[#1E3A8A] focus:outline-none"
                      />
                    </div>

                    {checkoutError && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#B91C1C]"
                      >
                        {checkoutError}
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-xs text-[#52524E] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoPrint}
                        onChange={(e) => setAutoPrint(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-[#D6D6D0] text-[#1E3A8A] focus:ring-[#1E3A8A]"
                      />
                      Langsung buka dialog print struk setelah selesai bayar
                    </label>
                  </div>
                </>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-[#E5E5E0] bg-[#F7F7F5] px-5 py-4">
                <button
                  type="submit"
                  className="w-full whitespace-nowrap rounded-lg bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#172554]"
                >
                  Selesaikan Penjualan · {formatRupiah(totalPenjualan)}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptTx && (
        <div
          id="receipt-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-modal-title"
        >
          <div
            id="receipt-modal-card"
            className="w-full max-w-md rounded-xl border border-[#E5E5E0] bg-white p-6 shadow-xl my-auto"
          >
            <div className="no-print flex items-start justify-between border-b border-[#E5E5E0] pb-3.5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  className="h-5 w-5 text-[#15803D]"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="receipt-modal-title"
                    className="font-display text-base font-bold text-[#141413]"
                  >
                    Struk Pembayaran · {settings.storeName}
                  </h2>
                  <div className="text-xs text-[#6B6B65]">
                    Siap cetak langsung ke printer thermal atau PDF
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptTx(null)}
                aria-label="Tutup struk"
                className="rounded-lg p-1.5 text-[#6B6B65] hover:bg-[#F3F3F0]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Paper Size Selector */}
            <div className="no-print mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#F7F7F5] px-3 py-2">
              <span className="text-xs font-medium text-[#52524E]">
                Ukuran Kertas:
              </span>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'thermal-58', label: '58mm' },
                    { id: 'thermal-80', label: '80mm' },
                    { id: 'standard', label: 'Standar' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReceiptPaper(opt.id)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                      receiptPaper === opt.id
                        ? 'bg-white text-[#141413] shadow-xs'
                        : 'text-[#6B6B65] hover:text-[#141413]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div
              id="printable-receipt"
              className={`mt-4 rounded-lg border border-dashed border-[#D6D6D0] bg-white p-4 text-xs text-[#141413] ${receiptPaper}`}
            >
              <div className="text-center border-b border-dashed border-[#D6D6D0] pb-3">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt={`Logo ${settings.storeName}`}
                    referrerPolicy="no-referrer"
                    className="mx-auto mb-2 h-16 w-16 rounded-lg object-cover"
                  />
                )}
                <div className="font-display text-base font-extrabold uppercase tracking-wide">
                  {settings.storeName}
                </div>
                <div className="text-[11px] text-[#52524E]">
                  {settings.storeTagline}
                </div>
                <div className="mt-1 text-[11px] text-[#52524E]">
                  {settings.storeAddress}
                </div>
                <div className="text-[11px] text-[#52524E]">
                  Telp: {settings.storePhone}
                </div>
              </div>

              <div className="py-2.5 space-y-0.5 font-mono text-[11px] text-[#3F3F3B]">
                <div className="flex justify-between">
                  <span>No:</span>
                  <span className="font-semibold text-[#141413]">
                    {receiptTx.invoiceNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>
                    {receiptTx.tanggal} {receiptTx.waktu}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{receiptTx.kasir}</span>
                </div>
              </div>

              <div className="divide-y divide-dashed divide-[#D6D6D0] border-y border-dashed border-[#D6D6D0] py-1.5">
                {receiptTx.items.map((line, idx) => (
                  <div key={idx} className="flex justify-between gap-2 py-1.5">
                    <div>
                      <div className="font-semibold text-[#141413]">
                        {line.nama} ({line.ukuran})
                      </div>
                      <div className="font-mono text-[11px] text-[#6B6B65]">
                        {line.qty} x {formatRupiah(line.hargaJual)}
                      </div>
                    </div>
                    <div className="font-mono font-semibold tabular-nums text-[#141413] whitespace-nowrap">
                      {formatRupiah(line.qty * line.hargaJual)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-[#52524E]">
                  <span>Subtotal ({receiptTx.totalQty} pcs)</span>
                  <span className="font-mono tabular-nums">
                    {formatRupiah(receiptTx.subtotal)}
                  </span>
                </div>
                {receiptTx.diskon > 0 && (
                  <div className="flex justify-between text-[#B45309]">
                    <span>Diskon</span>
                    <span className="font-mono tabular-nums">
                      -{formatRupiah(receiptTx.diskon)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-[#D6D6D0] pt-1.5 text-sm font-bold text-[#141413]">
                  <span>TOTAL</span>
                  <span className="font-mono tabular-nums">
                    {formatRupiah(receiptTx.totalPenjualan)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-[#52524E]">
                  <span>Pembayaran</span>
                  <span className="font-semibold text-[#141413]">
                    {receiptTx.metodePembayaran === 'TRANSFER_BANK'
                      ? 'Transfer Bank'
                      : receiptTx.metodePembayaran}
                  </span>
                </div>
                {receiptTx.metodePembayaran === 'CASH' &&
                  receiptTx.uangDiterima !== undefined && (
                    <>
                      <div className="flex justify-between text-[#52524E]">
                        <span>Tunai</span>
                        <span className="font-mono tabular-nums">
                          {formatRupiah(receiptTx.uangDiterima)}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-[#15803D]">
                        <span>Kembalian</span>
                        <span className="font-mono tabular-nums">
                          {formatRupiah(receiptTx.kembalian ?? 0)}
                        </span>
                      </div>
                    </>
                  )}
                {receiptTx.bankTujuan && (
                  <div className="flex justify-between gap-2 text-[#52524E]">
                    <span>Tujuan</span>
                    <span className="text-right font-mono text-[11px]">
                      {receiptTx.bankTujuan}
                    </span>
                  </div>
                )}
                {receiptTx.referensiPembayaran && (
                  <div className="flex justify-between text-[#52524E]">
                    <span>Ref</span>
                    <span className="font-mono">{receiptTx.referensiPembayaran}</span>
                  </div>
                )}
              </div>

              {settings.receiptFooterNote && (
                <div className="mt-3 border-t border-dashed border-[#D6D6D0] pt-2.5 text-center text-[11px] leading-relaxed text-[#52524E]">
                  {settings.receiptFooterNote}
                </div>
              )}
            </div>

            <div className="no-print mt-5 flex justify-end gap-2 border-t border-[#E5E5E0] pt-4">
              <button
                type="button"
                onClick={triggerReceiptPrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#141413] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A]"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Print Struk Sekarang
              </button>
              <button
                type="button"
                onClick={() => setReceiptTx(null)}
                className="rounded-lg border border-[#E5E5E0] px-4 py-2 text-xs font-semibold text-[#3F3F3B] hover:bg-[#F3F3F0]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
