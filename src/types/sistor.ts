export type TShirtSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER_BANK';

export type OpnameStatus = 'SESUAI' | 'KURANG' | 'LEBIH';

export type UserRole = 'ADMIN' | 'OPERATOR';

export interface StoreUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  shiftLabel: string;
}

export interface TShirtItem {
  id: string;
  sku: string;
  nama: string;
  kategori: string;
  ukuran: TShirtSize;
  warna: string;
  hpp: number; // Harga Dasar (HPP) per pcs
  hargaJual: number; // Harga Jual per pcs
  stokAwal: number;
  stokMasuk: number;
  terjual: number;
  stokFisik: number; // Hasil hitung fisik di lapangan saat stock opname
  penyesuaianHargaNego?: number; // Akumulasi selisih harga jual dari negosiasi saat checkout POS
  keterangan: string; // Kolom terbuka diisi manual sesuai temuan lapangan
  imageUrl?: string;
  updatedAt: string;
}

export interface ItemMetrics {
  stokSistem: number;
  selisihQty: number;
  statusOpname: OpnameStatus;
  marginPerPcs: number;
  marginPersen: number;
  nilaiPenjualan: number;
  totalHppTerjual: number;
  labaKotor: number;
  kerugianSelisihHpp: number;
  potensiKehilanganJual: number;
  nilaiSurplusHpp: number;
  nilaiAsetSistemHpp: number;
  nilaiAsetFisikHpp: number;
  nilaiAsetFisikJual: number;
}

export interface SaleLineItem {
  itemId: string;
  sku: string;
  nama: string;
  ukuran: TShirtSize;
  warna: string;
  qty: number;
  hpp: number;
  hargaKatalog?: number; // Harga jual standar dari katalog sebelum negosiasi
  hargaJual: number; // Harga jual aktual saat checkout (bisa hasil negosiasi)
}

export interface SaleTransaction {
  id: string;
  invoiceNo: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  items: SaleLineItem[];
  totalQty: number;
  totalHpp: number;
  subtotal: number;
  diskon: number;
  totalPenjualan: number;
  metodePembayaran: PaymentMethod;
  bankTujuan?: string;
  referensiPembayaran?: string;
  uangDiterima?: number;
  kembalian?: number;
  kasir: string;
  kasirRole?: UserRole;
  catatan: string;
}

export interface PaymentChannelSummary {
  count: number;
  total: number;
}

export interface ProductSalesStat {
  itemId: string;
  sku: string;
  nama: string;
  kategori: string;
  ukuran: TShirtSize;
  warna: string;
  hargaJual: number;
  hpp: number;
  qtyTerjual: number;
  omzet: number;
  totalHpp: number;
  labaKotor: number;
  marginPersen: number;
  stokTersedia: number;
}

export interface CashierSalesStat {
  kasir: string;
  roleLabel: string;
  jumlahTransaksi: number;
  totalQty: number;
  totalOmzet: number;
  totalDiskon: number;
  cashTotal: number;
  qrisTotal: number;
  transferTotal: number;
}

export interface OpnameSummary {
  jumlahSku: number;
  skuSesuai: number;
  skuKurang: number;
  skuLebih: number;
  skuSelisih: number;
  akurasiPersen: number;
  totalStokAwal: number;
  totalStokMasuk: number;
  totalTerjual: number;
  totalStokSistem: number;
  totalStokFisik: number;
  totalSelisihUnit: number;
  totalUnitKurang: number;
  totalUnitLebih: number;
  totalNilaiPenjualan: number;
  totalHppTerjual: number;
  totalLabaKotor: number;
  totalKerugianSelisihHpp: number;
  totalPotensiKehilanganJual: number;
  totalNilaiSurplusHpp: number;
  labaBersihSetelahSelisih: number;
  nilaiAsetSistemHpp: number;
  nilaiAsetFisikHpp: number;
  nilaiAsetFisikJual: number;
  totalOmzetTransaksi: number;
  totalDiskonTransaksi: number;
  paymentBreakdown: Record<PaymentMethod, PaymentChannelSummary>;
}

export interface OpnameDiscrepancySnapshot {
  sku: string;
  nama: string;
  ukuran: TShirtSize;
  warna: string;
  hpp: number;
  hargaJual: number;
  stokSistem: number;
  stokFisik: number;
  selisihQty: number;
  kerugianSelisihHpp: number;
  keterangan: string;
}

export interface OpnameReport {
  id: string;
  kodeLaporan: string;
  tanggalOpname: string;
  periode: string;
  petugas: string;
  catatanUmum: string;
  summary: OpnameSummary;
  discrepantItems: OpnameDiscrepancySnapshot[];
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  storePhone: string;
  logoUrl?: string;
  qrisMerchantId: string;
  qrisMerchantName: string;
  qrisImageUrl?: string;
  defaultCashier: string;
  autoPrintReceipt: boolean;
  receiptFooterNote: string;
  bankAccounts: BankAccount[];
  users: StoreUser[];
  appsScriptUrl: string;
  driveFolderName: string;
  driveFolderUrl?: string;
  spreadsheetId: string;
  spreadsheetTitle: string;
  lastSyncedAt: string | null;
}
