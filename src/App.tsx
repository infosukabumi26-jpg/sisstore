import React, { useEffect, useMemo, useState } from 'react';
import { CloudUpload, LogOut, Menu, ShieldCheck, UserCheck } from 'lucide-react';
import {
  INITIAL_ITEMS,
  INITIAL_REPORTS,
  INITIAL_SETTINGS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from './data/seedData';
import {
  type DriveMediaCategory,
  isValidAppsScriptUrl,
  pingAppsScript,
  pullAllViaAppsScript,
  syncAllViaAppsScript,
  uploadImageToDrive,
} from './services/googleSheets';
import type {
  OpnameReport,
  SaleTransaction,
  StoreSettings,
  StoreUser,
  TShirtItem,
} from './types/sistor';
import {
  calculateItemMetrics,
  calculateOpnameSummary,
} from './utils/calculations';
import { CatalogView } from './components/CatalogView';
import { ConfirmDialog } from './components/ConfirmDialog';
import { LoginView } from './components/LoginView';
import { OpnameReportView } from './components/OpnameReportView';
import { OwnerDashboardView } from './components/OwnerDashboardView';
import { PosView } from './components/PosView';
import { SheetsAndSettingsView } from './components/SheetsAndSettingsView';
import { type ActiveTab, Sidebar } from './components/Sidebar';
import { StockOpnameTable } from './components/StockOpnameTable';

const STORAGE_KEYS = {
  items: 'sistor_items_v1',
  transactions: 'sistor_transactions_v1',
  reports: 'sistor_reports_v1',
  settings: 'sistor_settings_v1',
  session: 'sistor_session_v1',
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Dashboard Pemilik (Owner)',
  kasir: 'Kasir Penjualan',
  opname: 'Tabel Stock Opname',
  laporan: 'Pusat Laporan Lengkap',
  katalog: 'Katalog Kaos & HPP',
  pengaturan: 'Sheets, Drive & Akun',
};

export default function App() {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const stored = readStored<Partial<StoreSettings>>(
      STORAGE_KEYS.settings,
      INITIAL_SETTINGS
    );
    const mergedUsers =
      Array.isArray(stored.users) && stored.users.length > 0
        ? stored.users.map((u) =>
            u.displayName === 'Pemilik Sistor'
              ? { ...u, displayName: 'Pemilik Sisstore' }
              : u
          )
        : INITIAL_USERS;

    const isLegacySistorName = !stored.storeName || stored.storeName === 'Sistor';
    const isLegacyTagline =
      !stored.storeTagline || stored.storeTagline === 'Apparel & Heavyweight Tees';
    const isLegacyAddress =
      !stored.storeAddress ||
      stored.storeAddress === 'Jl. R.E. Martadinata No. 48, Sukabumi';
    const isLegacyLogo = !stored.logoUrl;
    const isLegacyFolder =
      !stored.driveFolderName || stored.driveFolderName === 'Sistor_Media_Drive';
    const isLegacyQrisMerchant =
      !stored.qrisMerchantName ||
      stored.qrisMerchantName === 'SISTOR APPAREL STORE';
    const isLegacyFooter =
      !stored.receiptFooterNote ||
      stored.receiptFooterNote.includes('berbelanja di Sistor.');

    return {
      ...INITIAL_SETTINGS,
      ...stored,
      storeName: isLegacySistorName ? INITIAL_SETTINGS.storeName : stored.storeName!,
      storeTagline: isLegacyTagline
        ? INITIAL_SETTINGS.storeTagline
        : stored.storeTagline!,
      storeAddress: isLegacyAddress
        ? INITIAL_SETTINGS.storeAddress
        : stored.storeAddress!,
      logoUrl: isLegacyLogo ? INITIAL_SETTINGS.logoUrl : stored.logoUrl,
      driveFolderName: isLegacyFolder
        ? INITIAL_SETTINGS.driveFolderName
        : stored.driveFolderName!,
      qrisMerchantName: isLegacyQrisMerchant
        ? INITIAL_SETTINGS.qrisMerchantName
        : stored.qrisMerchantName!,
      receiptFooterNote: isLegacyFooter
        ? INITIAL_SETTINGS.receiptFooterNote
        : stored.receiptFooterNote!,
      users: mergedUsers,
    };
  });

  const [currentUser, setCurrentUser] = useState<StoreUser | null>(() => {
    const savedSession = readStored<StoreUser | null>(STORAGE_KEYS.session, null);
    if (!savedSession) return null;
    const storedSettings = readStored<Partial<StoreSettings>>(
      STORAGE_KEYS.settings,
      INITIAL_SETTINGS
    );
    const availableUsers =
      Array.isArray(storedSettings.users) && storedSettings.users.length > 0
        ? storedSettings.users
        : INITIAL_USERS;
    return (
      availableUsers.find((u) => u.id === savedSession.id) || savedSession
    );
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    currentUser?.role === 'ADMIN' ? 'dashboard' : 'kasir'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [items, setItems] = useState<TShirtItem[]>(() =>
    readStored(STORAGE_KEYS.items, INITIAL_ITEMS)
  );
  const [transactions, setTransactions] = useState<SaleTransaction[]>(() =>
    readStored(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS)
  );
  const [reports, setReports] = useState<OpnameReport[]>(() =>
    readStored(STORAGE_KEYS.reports, INITIAL_REPORTS)
  );

  const [isSyncing, setIsSyncing] = useState(false);
  const [headerPushConfirmOpen, setHeaderPushConfirmOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.transactions,
      JSON.stringify(transactions)
    );
  }, [transactions]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(settings)
    );
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(
        STORAGE_KEYS.session,
        JSON.stringify(currentUser)
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.session);
    }
  }, [currentUser]);

  const isAppsScriptConnected = isValidAppsScriptUrl(settings.appsScriptUrl);

  const summary = useMemo(
    () => calculateOpnameSummary(items, transactions),
    [items, transactions]
  );

  const handleLoginSuccess = (user: StoreUser) => {
    setCurrentUser(user);
    setActiveTab(user.role === 'ADMIN' ? 'dashboard' : 'kasir');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setMobileMenuOpen(false);
  };

  // Enforce role access rules
  const effectiveTab: ActiveTab = useMemo(() => {
    if (!currentUser) return 'kasir';
    if (
      currentUser.role === 'OPERATOR' &&
      (activeTab === 'dashboard' ||
        activeTab === 'katalog' ||
        activeTab === 'pengaturan')
    ) {
      return 'kasir';
    }
    return activeTab;
  }, [activeTab, currentUser]);

  // Keep active user's display metadata in sync if Admin edits user details in Settings
  const resolvedUser = useMemo(() => {
    if (!currentUser) return null;
    return settings.users.find((u) => u.id === currentUser.id) || currentUser;
  }, [currentUser, settings.users]);

  if (!resolvedUser) {
    return (
      <LoginView
        storeName={settings.storeName}
        storeTagline={settings.storeTagline}
        storeAddress={settings.storeAddress}
        logoUrl={settings.logoUrl}
        users={settings.users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const isAdmin = resolvedUser.role === 'ADMIN';

  // Catalog & Inventory handlers
  const handleAddItem = (payload: Omit<TShirtItem, 'id' | 'updatedAt'>) => {
    const created: TShirtItem = {
      ...payload,
      id: `tee-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setItems((prev) => [created, ...prev]);
  };

  const handleUpdateItem = (id: string, patch: Partial<TShirtItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // POS Checkout handler
  const handleCompleteSale = (
    txPayload: Omit<SaleTransaction, 'id' | 'invoiceNo'>
  ): SaleTransaction => {
    const now = new Date();
    const dateStamp = txPayload.tanggal.replace(/-/g, '');
    const seq = String(transactions.length + 1).padStart(3, '0');
    const createdTx: SaleTransaction = {
      ...txPayload,
      id: `tx-${now.getTime()}`,
      invoiceNo: `STR-${dateStamp}-${seq}`,
    };

    setTransactions((prev) => [createdTx, ...prev]);

    setItems((prev) =>
      prev.map((item) => {
        const linesForItem = txPayload.items.filter((l) => l.itemId === item.id);
        if (linesForItem.length === 0) return item;
        const addedQty = linesForItem.reduce((sum, l) => sum + l.qty, 0);
        const deltaNego = linesForItem.reduce(
          (sum, l) =>
            sum + (l.hargaJual - (l.hargaKatalog ?? item.hargaJual)) * l.qty,
          0
        );
        const nextTerjual = item.terjual + addedQty;
        const nextStokFisik = Math.max(0, item.stokFisik - addedQty);
        const nextNego = (item.penyesuaianHargaNego ?? 0) + deltaNego;
        return {
          ...item,
          terjual: nextTerjual,
          stokFisik: nextStokFisik,
          ...(nextNego !== 0 ? { penyesuaianHargaNego: nextNego } : {}),
          updatedAt: now.toISOString(),
        };
      })
    );

    return createdTx;
  };

  // Stock Opname inline handlers
  const handleUpdateStokFisik = (id: string, stokFisik: number) => {
    handleUpdateItem(id, { stokFisik });
  };

  const handleUpdateKeterangan = (id: string, keterangan: string) => {
    handleUpdateItem(id, { keterangan });
  };

  const handleSyncAllFisikToSistem = () => {
    setItems((prev) =>
      prev.map((item) => {
        const m = calculateItemMetrics(item);
        return {
          ...item,
          stokFisik: Math.max(0, m.stokSistem),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleSaveReport = (payload: {
    periode: string;
    petugas: string;
    tanggalOpname: string;
    catatanUmum: string;
  }) => {
    const discrepantItems = items
      .map((item) => ({ item, metrics: calculateItemMetrics(item) }))
      .filter(
        ({ item, metrics }) =>
          metrics.selisihQty !== 0 || item.keterangan.trim() !== ''
      )
      .map(({ item, metrics }) => ({
        sku: item.sku,
        nama: item.nama,
        ukuran: item.ukuran,
        warna: item.warna,
        hpp: item.hpp,
        hargaJual: item.hargaJual,
        stokSistem: metrics.stokSistem,
        stokFisik: item.stokFisik,
        selisihQty: metrics.selisihQty,
        kerugianSelisihHpp: metrics.kerugianSelisihHpp,
        keterangan: item.keterangan,
      }));

    const seq = String(reports.length + 1).padStart(2, '0');
    const dateStamp = payload.tanggalOpname.replace(/-/g, '');
    const newReport: OpnameReport = {
      id: `rep-${Date.now()}`,
      kodeLaporan: `OPN-STR-${dateStamp}-${seq}`,
      tanggalOpname: payload.tanggalOpname,
      periode: payload.periode,
      petugas: payload.petugas,
      catatanUmum: payload.catatanUmum,
      summary: calculateOpnameSummary(items, transactions),
      discrepantItems,
    };

    setReports((prev) => [newReport, ...prev]);
    setActiveTab('laporan');
  };

  // Google Drive media upload via Apps Script (falls back cleanly to local dataUrl if not connected)
  const handleUploadMediaToDrive = async (
    category: DriveMediaCategory,
    dataUrl: string,
    fileNameHint: string
  ): Promise<string> => {
    if (!isValidAppsScriptUrl(settings.appsScriptUrl)) {
      return dataUrl;
    }

    const uploaded = await uploadImageToDrive(settings.appsScriptUrl, {
      category,
      fileName: `${fileNameHint}-${Date.now()}`,
      dataUrl,
      folderName: settings.driveFolderName || 'Sisstore_Media_Drive',
    });

    if (uploaded.driveFolderUrl) {
      setSettings((prev) => ({
        ...prev,
        driveFolderUrl: uploaded.driveFolderUrl,
      }));
    }

    return uploaded.directUrl;
  };

  // Google Apps Script (Sheets + Drive) handlers
  const handleConnectAppsScript = async (
    url: string,
    driveFolderName: string
  ) => {
    const cleanUrl = url.trim();
    const cleanFolder = driveFolderName.trim() || 'Sisstore_Media_Drive';
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const info = await pingAppsScript(cleanUrl, cleanFolder);
      setSettings((prev) => ({
        ...prev,
        appsScriptUrl: cleanUrl,
        driveFolderName: info.driveFolderName || cleanFolder,
        driveFolderUrl: info.driveFolderUrl,
        spreadsheetId: info.spreadsheetId,
        spreadsheetTitle: info.spreadsheetTitle,
      }));
      setSyncFeedback({
        type: 'success',
        message: `Berhasil terhubung ke "${info.spreadsheetTitle}" dan folder Google Drive "${info.driveFolderName}".`,
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message:
          err?.message ||
          'Gagal terhubung ke Web App Google Apps Script.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectAppsScript = () => {
    setSettings((prev) => ({
      ...prev,
      appsScriptUrl: '',
      driveFolderUrl: '',
      spreadsheetId: '',
      spreadsheetTitle: '',
    }));
    setSyncFeedback({
      type: 'success',
      message: 'Koneksi Apps Script diputuskan. Aplikasi tetap berjalan dalam mode lokal.',
    });
  };

  const handlePushToSheets = async () => {
    if (!isAppsScriptConnected) return;

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      let nextSettings = { ...settings };
      const folderName = settings.driveFolderName || 'Sisstore_Media_Drive';

      if (nextSettings.logoUrl?.startsWith('data:')) {
        const res = await uploadImageToDrive(settings.appsScriptUrl, {
          category: 'logo',
          fileName: `logo-${nextSettings.storeName.toLowerCase()}`,
          dataUrl: nextSettings.logoUrl,
          folderName,
        });
        nextSettings.logoUrl = res.directUrl;
        nextSettings.driveFolderUrl = res.driveFolderUrl;
      }

      if (nextSettings.qrisImageUrl?.startsWith('data:')) {
        const res = await uploadImageToDrive(settings.appsScriptUrl, {
          category: 'qris',
          fileName: `qris-${nextSettings.storeName.toLowerCase()}`,
          dataUrl: nextSettings.qrisImageUrl,
          folderName,
        });
        nextSettings.qrisImageUrl = res.directUrl;
        nextSettings.driveFolderUrl = res.driveFolderUrl;
      }

      const nextItems = await Promise.all(
        items.map(async (item) => {
          if (!item.imageUrl?.startsWith('data:')) return item;
          const res = await uploadImageToDrive(settings.appsScriptUrl, {
            category: 'produk',
            fileName: `${item.sku}-${item.ukuran}`,
            dataUrl: item.imageUrl,
            folderName,
          });
          nextSettings.driveFolderUrl = res.driveFolderUrl;
          return { ...item, imageUrl: res.directUrl };
        })
      );

      setItems(nextItems);

      const result = await syncAllViaAppsScript(
        settings.appsScriptUrl,
        nextItems,
        transactions,
        reports,
        nextSettings
      );

      setSettings((prev) => ({
        ...prev,
        ...nextSettings,
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: result.spreadsheetTitle,
        driveFolderUrl: result.driveFolderUrl || prev.driveFolderUrl,
        lastSyncedAt: result.syncedAt || new Date().toISOString(),
      }));

      setSyncFeedback({
        type: 'success',
        message: `Seluruh data 7 tab Spreadsheet & gambar Google Drive berhasil disinkronkan ke "${result.spreadsheetTitle}".`,
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message:
          err?.message || 'Gagal menyinkronkan data ke Google Sheets & Drive.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSheets = async () => {
    if (!isAppsScriptConnected) return;

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const pulled = await pullAllViaAppsScript(settings.appsScriptUrl);
      if (pulled.items.length > 0) {
        setItems(pulled.items);
      }
      if (Object.keys(pulled.settingsPatch).length > 0) {
        setSettings((prev) => ({
          ...prev,
          ...pulled.settingsPatch,
          spreadsheetId: pulled.spreadsheetId,
          spreadsheetTitle: pulled.spreadsheetTitle,
        }));
      }
      setSyncFeedback({
        type: 'success',
        message:
          pulled.items.length > 0
            ? `Berhasil memuat ${pulled.items.length} varian kaos & pengaturan dari "${pulled.spreadsheetTitle}".`
            : 'Terhubung ke Spreadsheet, namun tab Katalog_Kaos masih kosong.',
      });
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Gagal memuat data dari Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const activeTitleLabel =
    !isAdmin && effectiveTab === 'opname'
      ? 'Input Hitung Fisik Opname'
      : !isAdmin && effectiveTab === 'laporan'
      ? 'Laporan Shift Kasir'
      : TAB_TITLES[effectiveTab];

  return (
    <div className="flex min-h-screen bg-[#F7F7F5] text-[#141413]">
      <Sidebar
        activeTab={effectiveTab}
        onSelectTab={setActiveTab}
        currentUser={resolvedUser}
        onLogout={handleLogout}
        storeName={settings.storeName}
        storeTagline={settings.storeTagline}
        logoUrl={settings.logoUrl}
        isAppsScriptConnected={isAppsScriptConnected}
        spreadsheetLinked={Boolean(settings.spreadsheetId)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="no-print hide-when-printing-receipt sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-3 border-b border-[#E5E5E0] bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-lg p-2 text-[#3F3F3B] hover:bg-[#F3F3F0] lg:hidden shrink-0"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="truncate text-sm font-medium text-[#52524E]">
              <span className="font-semibold text-[#141413]">
                {settings.storeName}
              </span>
              <span className="hidden sm:inline"> / {activeTitleLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Active User Role Chip */}
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] px-3 py-1.5 text-xs">
              {isAdmin ? (
                <ShieldCheck
                  className="h-3.5 w-3.5 text-[#1E3A8A]"
                  aria-hidden="true"
                />
              ) : (
                <UserCheck
                  className="h-3.5 w-3.5 text-[#141413]"
                  aria-hidden="true"
                />
              )}
              <span className="font-semibold text-[#141413]">
                {resolvedUser.displayName}
              </span>
              <span className="text-[#6B6B65]">
                · {isAdmin ? 'Admin / Owner' : 'Operator'}
              </span>
            </div>

            {isAdmin &&
              (isAppsScriptConnected ? (
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => setHeaderPushConfirmOpen(true)}
                  className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#172554] disabled:opacity-60"
                >
                  <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                  {isSyncing ? 'Menyinkronkan...' : 'Sinkron ke Sheets'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('pengaturan')}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
                >
                  <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sm:hidden">Sheets</span>
                  <span className="hidden sm:inline">Sheets &amp; Drive</span>
                </button>
              ))}

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar dari akun"
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">
          {effectiveTab === 'dashboard' && isAdmin && (
            <OwnerDashboardView
              currentUser={resolvedUser}
              items={items}
              transactions={transactions}
              summary={summary}
              settings={settings}
              isAppsScriptConnected={isAppsScriptConnected}
              onNavigateTab={setActiveTab}
            />
          )}

          {effectiveTab === 'kasir' && (
            <PosView
              key={resolvedUser.id}
              items={items}
              transactions={transactions}
              settings={settings}
              currentUser={resolvedUser}
              onCompleteSale={handleCompleteSale}
            />
          )}

          {effectiveTab === 'opname' && (
            <StockOpnameTable
              key={`opn-${resolvedUser.id}`}
              items={items}
              summary={summary}
              settings={settings}
              userRole={resolvedUser.role}
              defaultOfficerName={resolvedUser.displayName}
              onUpdateStokFisik={handleUpdateStokFisik}
              onUpdateKeterangan={handleUpdateKeterangan}
              onSyncAllFisikToSistem={handleSyncAllFisikToSistem}
              onSaveReport={handleSaveReport}
            />
          )}

          {effectiveTab === 'laporan' && (
            <OpnameReportView
              key={`rep-${resolvedUser.role}`}
              items={items}
              transactions={transactions}
              summary={summary}
              reports={reports}
              settings={settings}
              userRole={resolvedUser.role}
              currentOfficerName={resolvedUser.displayName}
              onSaveCurrentSnapshot={handleSaveReport}
            />
          )}

          {effectiveTab === 'katalog' && isAdmin && (
            <CatalogView
              items={items}
              isDriveConnected={isAppsScriptConnected}
              onUploadProductPhoto={(dataUrl, hint) =>
                handleUploadMediaToDrive('produk', dataUrl, hint)
              }
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {effectiveTab === 'pengaturan' && isAdmin && (
            <SheetsAndSettingsView
              settings={settings}
              currentUserId={resolvedUser.id}
              onUpdateSettings={(patch) =>
                setSettings((prev) => ({ ...prev, ...patch }))
              }
              items={items}
              transactions={transactions}
              reports={reports}
              isAppsScriptConnected={isAppsScriptConnected}
              isSyncing={isSyncing}
              syncFeedback={syncFeedback}
              onConnectAppsScript={handleConnectAppsScript}
              onDisconnectAppsScript={handleDisconnectAppsScript}
              onPushToSheets={handlePushToSheets}
              onPullFromSheets={handlePullFromSheets}
              onUploadMediaToDrive={handleUploadMediaToDrive}
            />
          )}
        </main>
      </div>

      <ConfirmDialog
        open={headerPushConfirmOpen}
        title="Sinkronkan Data & Gambar ke Google Sheets + Drive?"
        description={`Aplikasi akan mengunggah gambar lokal yang belum tersimpan di Drive (jika ada) lalu memformat 7 tab spreadsheet "${settings.spreadsheetTitle || 'Google Sheets Sisstore'}".`}
        confirmLabel="Ya, Sinkronkan Sekarang"
        loading={isSyncing}
        onConfirm={async () => {
          setHeaderPushConfirmOpen(false);
          await handlePushToSheets();
        }}
        onCancel={() => setHeaderPushConfirmOpen(false)}
      />
    </div>
  );
}
