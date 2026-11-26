import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudUpload, LogOut, Menu, Moon, RefreshCw, ShieldCheck, Sun, UserCheck } from 'lucide-react';
import {
  INITIAL_ITEMS,
  INITIAL_REPORTS,
  INITIAL_SETTINGS,
  INITIAL_TRANSACTIONS,
} from './data/seedData';
import { getPermanentDatabaseConfig } from './config/databaseConfig';
import {
  computeSyncSignature,
  type DriveMediaCategory,
  isValidAppsScriptUrl,
  normalizeDriveFolderName,
  parseMobileSetupParams,
  pingAppsScript,
  pullAllViaAppsScript,
  shouldRunRealTimeAutoSync,
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
import { LoginView } from './components/LoginView';
import { OpnameReportView } from './components/OpnameReportView';
import { OwnerDashboardView } from './components/OwnerDashboardView';
import { PosView } from './components/PosView';
import { SheetsAndSettingsView } from './components/SheetsAndSettingsView';
import { type ActiveTab, Sidebar } from './components/Sidebar';
import { StockOpnameTable } from './components/StockOpnameTable';

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Dashboard Pemilik (Owner)',
  kasir: 'Kasir Penjualan',
  opname: 'Tabel Stock Opname',
  laporan: 'Pusat Laporan Lengkap',
  katalog: 'Katalog Kaos & HPP',
  pengaturan: 'Pengaturan Toko & Akun',
};

export default function App() {
  const [initialSetupOverride] = useState(() =>
    typeof window !== 'undefined'
      ? parseMobileSetupParams(window.location.search)
      : null
  );

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const permanentConfig = getPermanentDatabaseConfig();
    const resolvedGasUrl =
      initialSetupOverride?.appsScriptUrl || permanentConfig.appsScriptUrl || '';
    const resolvedFolder =
      initialSetupOverride?.driveFolderName ||
      permanentConfig.driveFolderName ||
      INITIAL_SETTINGS.driveFolderName;

    return {
      ...INITIAL_SETTINGS,
      appsScriptUrl: resolvedGasUrl,
      driveFolderName: resolvedFolder,
      autoSyncEnabled: true,
    };
  });

  const [hasCloudDatabaseConfigured] = useState(() =>
    isValidAppsScriptUrl(settings.appsScriptUrl)
  );
  const [isBootstrappingDb, setIsBootstrappingDb] = useState(
    () => hasCloudDatabaseConfigured
  );

  const [currentUser, setCurrentUser] = useState<StoreUser | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('kasir');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // When cloud database (Apps Script) is permanently configured, keep items/transactions/reports empty
  // until Google Sheets finishes loading so browser-local seed data never overrides cloud records.
  const [items, setItems] = useState<TShirtItem[]>(() =>
    hasCloudDatabaseConfigured ? [] : INITIAL_ITEMS
  );
  const [transactions, setTransactions] = useState<SaleTransaction[]>(() =>
    hasCloudDatabaseConfigured ? [] : INITIAL_TRANSACTIONS
  );
  const [reports, setReports] = useState<OpnameReport[]>(() =>
    hasCloudDatabaseConfigured ? [] : INITIAL_REPORTS
  );

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [loginConnectionNotice, setLoginConnectionNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const latestSyncSnapshotRef = useRef({
    items,
    transactions,
    reports,
    settings,
  });
  latestSyncSnapshotRef.current = { items, transactions, reports, settings };

  const lastSyncedSigRef = useRef<string>(
    computeSyncSignature(items, transactions, reports, settings)
  );
  const syncInFlightRef = useRef(false);
  const syncQueuedRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const pullInFlightRef = useRef(false);
  const lastPulledAtRef = useRef(0);
  const mobileSetupHandledRef = useRef(false);
  const startupSyncHandledRef = useRef(false);

  const isAppsScriptConnected = isValidAppsScriptUrl(settings.appsScriptUrl);

  const runSyncToSheets = useCallback(
    async (options?: {
      silent?: boolean;
      overrideSettings?: StoreSettings;
      customSuccessMessage?: string;
    }): Promise<boolean> => {
      const snap = latestSyncSnapshotRef.current;
      const effectiveSettings = options?.overrideSettings ?? snap.settings;
      if (!isValidAppsScriptUrl(effectiveSettings.appsScriptUrl)) {
        return false;
      }

      if (syncInFlightRef.current) {
        syncQueuedRef.current = true;
        return false;
      }

      syncInFlightRef.current = true;
      const silent = Boolean(options?.silent);
      if (silent) {
        setAutoSyncStatus('syncing');
      } else {
        setIsSyncing(true);
        setSyncFeedback(null);
      }

      try {
        const folderName = normalizeDriveFolderName(
          effectiveSettings.driveFolderName
        );
        const nextSettings: StoreSettings = {
          ...effectiveSettings,
          driveFolderName: folderName,
          autoSyncEnabled: effectiveSettings.autoSyncEnabled !== false,
        };
        let mediaUploaded = false;

      if (nextSettings.logoUrl?.startsWith('data:')) {
        const res = await uploadImageToDrive(nextSettings.appsScriptUrl, {
          category: 'logo',
          fileName: `logo-${nextSettings.storeName.toLowerCase()}`,
          dataUrl: nextSettings.logoUrl,
          folderName,
        });
        nextSettings.logoUrl = res.directUrl;
        nextSettings.driveFolderUrl = res.driveFolderUrl;
        mediaUploaded = true;
      }

      if (nextSettings.qrisImageUrl?.startsWith('data:')) {
        const res = await uploadImageToDrive(nextSettings.appsScriptUrl, {
          category: 'qris',
          fileName: `qris-${nextSettings.storeName.toLowerCase()}`,
          dataUrl: nextSettings.qrisImageUrl,
          folderName,
        });
        nextSettings.qrisImageUrl = res.directUrl;
        nextSettings.driveFolderUrl = res.driveFolderUrl;
        mediaUploaded = true;
      }

      const nextItems: TShirtItem[] = [];
      let anyItemMediaUploaded = false;
      for (const item of snap.items) {
        if (!item.imageUrl?.startsWith('data:')) {
          nextItems.push(item);
          continue;
        }
        const res = await uploadImageToDrive(nextSettings.appsScriptUrl, {
          category: 'produk',
          fileName: `${item.sku}-${item.ukuran}`,
          dataUrl: item.imageUrl,
          folderName,
        });
        nextSettings.driveFolderUrl = res.driveFolderUrl;
        nextItems.push({ ...item, imageUrl: res.directUrl });
        anyItemMediaUploaded = true;
      }

      if (anyItemMediaUploaded) {
        setItems(nextItems);
      }

      const result = await syncAllViaAppsScript(
        nextSettings.appsScriptUrl,
        nextItems,
        snap.transactions,
        snap.reports,
        nextSettings
      );

      lastSyncedSigRef.current = computeSyncSignature(
        nextItems,
        snap.transactions,
        snap.reports,
        nextSettings
      );

      setSettings((prev) => ({
        ...prev,
        ...nextSettings,
        ...(mediaUploaded
          ? {
              logoUrl: nextSettings.logoUrl,
              qrisImageUrl: nextSettings.qrisImageUrl,
            }
          : {}),
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: result.spreadsheetTitle,
        driveFolderUrl: result.driveFolderUrl || prev.driveFolderUrl,
        lastSyncedAt: result.syncedAt || new Date().toISOString(),
      }));

      setAutoSyncStatus('synced');
      if (!silent) {
        setSyncFeedback({
          type: 'success',
          message:
            options?.customSuccessMessage ||
            `Seluruh 7 tab Spreadsheet & gambar Google Drive berhasil disinkronkan real-time ke "${result.spreadsheetTitle}".`,
        });
      }
      return true;
    } catch (err: any) {
      setAutoSyncStatus('error');
      const errMsg =
        err?.message || 'Gagal menyinkronkan data ke Google Sheets & Drive.';
      setSyncFeedback({
        type: 'error',
        message: silent
          ? `Sinkronisasi otomatis tertunda: ${errMsg}`
          : errMsg,
      });
      return false;
    } finally {
      syncInFlightRef.current = false;
      if (!silent) {
        setIsSyncing(false);
      }
      if (syncQueuedRef.current) {
        syncQueuedRef.current = false;
        const latest = latestSyncSnapshotRef.current;
        if (shouldRunRealTimeAutoSync(latest.settings)) {
          const latestSig = computeSyncSignature(
            latest.items,
            latest.transactions,
            latest.reports,
            latest.settings
          );
          if (latestSig !== lastSyncedSigRef.current) {
            void runSyncToSheets({ silent: true });
          }
        }
      }
    }
  }, []);

  // Real-time background auto-sync whenever business data changes while Apps Script is connected
  useEffect(() => {
    if (
      isBootstrappingDb ||
      !settings.spreadsheetId ||
      !shouldRunRealTimeAutoSync(settings)
    ) {
      if (!isAppsScriptConnected) {
        setAutoSyncStatus('idle');
      }
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      return;
    }

    const currentSig = computeSyncSignature(items, transactions, reports, settings);
    if (currentSig === lastSyncedSigRef.current) {
      return;
    }

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null;
      void runSyncToSheets({ silent: true });
    }, 700);

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [
    items,
    transactions,
    reports,
    settings,
    isAppsScriptConnected,
    isBootstrappingDb,
    runSyncToSheets,
  ]);

  // Auto-retry pending sync as soon as browser regains internet connectivity
  useEffect(() => {
    const handleOnline = () => {
      const latest = latestSyncSnapshotRef.current;
      if (!shouldRunRealTimeAutoSync(latest.settings)) return;
      const latestSig = computeSyncSignature(
        latest.items,
        latest.transactions,
        latest.reports,
        latest.settings
      );
      if (latestSig !== lastSyncedSigRef.current || autoSyncStatus === 'error') {
        void runSyncToSheets({ silent: true });
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [autoSyncStatus, runSyncToSheets]);

  const summary = useMemo(
    () => calculateOpnameSummary(items, transactions),
    [items, transactions]
  );

  const handleLoginSuccess = (user: StoreUser) => {
    setCurrentUser(user);
    setLoginConnectionNotice(null);
    setActiveTab(user.role === 'ADMIN' ? 'dashboard' : 'kasir');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginConnectionNotice(null);
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

  // Behind-the-scenes Google Apps Script (Sheets + Drive) startup connection & cloud hydration
  const handleConnectAppsScript = useCallback(
    async (
      url: string,
      driveFolderName: string,
      options?: { isStartupBootstrap?: boolean }
    ) => {
      const cleanUrl = url.trim();
      const cleanFolder = normalizeDriveFolderName(driveFolderName);

      setIsSyncing(true);
      setSyncFeedback(null);
      setAutoSyncStatus('syncing');
      if (options?.isStartupBootstrap) {
        setLoginConnectionNotice({
          type: 'success',
          message:
            'Menghubungkan ke Google Spreadsheet & memuat data toko terbaru...',
        });
      }

      try {
        const info = await pingAppsScript(cleanUrl, cleanFolder);
        const latestAfterPing = latestSyncSnapshotRef.current;
        const resolvedFolderName = info.driveFolderName || cleanFolder;

        // Keep URL clean — never expose GAS config in browser URL bar or localStorage
        try {
          if (window.location.search) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        } catch {
          // Ignore history API failures
        }

        const connectedSettings: StoreSettings = {
          ...latestAfterPing.settings,
          appsScriptUrl: cleanUrl,
          driveFolderName: resolvedFolderName,
          driveFolderUrl: info.driveFolderUrl,
          spreadsheetId: info.spreadsheetId,
          spreadsheetTitle: info.spreadsheetTitle,
          autoSyncEnabled: true,
        };

        let pulled: Awaited<ReturnType<typeof pullAllViaAppsScript>> | null =
          null;
        try {
          pulled = await pullAllViaAppsScript(cleanUrl);
        } catch {
          pulled = null;
        }

        const hasRemoteRecords =
          pulled !== null &&
          (pulled.items.length > 0 ||
            pulled.transactions.length > 0 ||
            pulled.reports.length > 0 ||
            Object.keys(pulled.settingsPatch).length > 0);

        if (hasRemoteRecords && pulled) {
          const hydratedItems = pulled.items;
          const hydratedTransactions = pulled.transactions;
          const hydratedReports = pulled.reports;
          const hydratedSettings: StoreSettings = {
            ...connectedSettings,
            ...pulled.settingsPatch,
            appsScriptUrl: cleanUrl,
            driveFolderName:
              pulled.settingsPatch.driveFolderName ||
              info.driveFolderName ||
              cleanFolder,
            driveFolderUrl:
              info.driveFolderUrl || connectedSettings.driveFolderUrl,
            spreadsheetId: pulled.spreadsheetId || info.spreadsheetId,
            spreadsheetTitle: pulled.spreadsheetTitle || info.spreadsheetTitle,
            autoSyncEnabled: true,
            lastSyncedAt: new Date().toISOString(),
          };

          lastSyncedSigRef.current = computeSyncSignature(
            hydratedItems,
            hydratedTransactions,
            hydratedReports,
            hydratedSettings
          );
          latestSyncSnapshotRef.current = {
            items: hydratedItems,
            transactions: hydratedTransactions,
            reports: hydratedReports,
            settings: hydratedSettings,
          };

          setItems(hydratedItems);
          setTransactions(hydratedTransactions);
          setReports(hydratedReports);
          setSettings(hydratedSettings);
          setAutoSyncStatus('synced');

          const pullMsg = `Terkoneksi permanen ke "${hydratedSettings.spreadsheetTitle}" (${pulled.items.length} produk, ${pulled.transactions.length} transaksi, ${pulled.reports.length} laporan dari Google Sheets).`;
          setSyncFeedback({ type: 'success', message: pullMsg });
          if (options?.isStartupBootstrap) {
            setLoginConnectionNotice({
              type: 'success',
              message: `Terhubung ke "${hydratedSettings.spreadsheetTitle}" · ${pulled.items.length} produk & ${pulled.transactions.length} transaksi dimuat dari Google Sheets.`,
            });
          }
          return;
        }

        // Brand-new empty Spreadsheet (no rows or settings yet): initialize 7 formatted tabs once
        const initialSeedItems =
          latestAfterPing.items.length > 0 ? latestAfterPing.items : INITIAL_ITEMS;
        const initialSeedTransactions = latestAfterPing.transactions;
        const initialSeedReports = latestAfterPing.reports;

        lastSyncedSigRef.current = computeSyncSignature(
          initialSeedItems,
          initialSeedTransactions,
          initialSeedReports,
          connectedSettings
        );
        latestSyncSnapshotRef.current = {
          items: initialSeedItems,
          transactions: initialSeedTransactions,
          reports: initialSeedReports,
          settings: connectedSettings,
        };
        setItems(initialSeedItems);
        setSettings(connectedSettings);

        const pushed = await runSyncToSheets({
          silent: false,
          overrideSettings: connectedSettings,
          customSuccessMessage: `Terkoneksi permanen ke "${info.spreadsheetTitle}" & folder Drive "${info.driveFolderName || cleanFolder}". Seluruh 7 tab Spreadsheet siap digunakan secara real-time.`,
        });

        if (options?.isStartupBootstrap && pushed) {
          setLoginConnectionNotice({
            type: 'success',
            message: `Terhubung ke "${info.spreadsheetTitle}". Database Google Sheets siap digunakan.`,
          });
        }
      } catch (err: any) {
        setAutoSyncStatus('error');
        const errMessage =
          err?.message || 'Gagal terhubung ke Web App Google Apps Script.';
        setSyncFeedback({
          type: 'error',
          message: errMessage,
        });
        if (options?.isStartupBootstrap) {
          setLoginConnectionNotice({
            type: 'error',
            message: `Gagal terhubung ke Google Sheets: ${errMessage}`,
          });
        }
      } finally {
        setIsSyncing(false);
        setIsBootstrappingDb(false);
      }
    },
    [runSyncToSheets]
  );

  // Silent 2-way background pull so PC, tablet, & HP always receive latest Sheet updates
  const pullFromSheetsSilent = useCallback(async () => {
    const snap = latestSyncSnapshotRef.current;
    if (
      !isValidAppsScriptUrl(snap.settings.appsScriptUrl) ||
      !snap.settings.spreadsheetId ||
      snap.settings.autoSyncEnabled === false
    ) {
      return;
    }
    if (
      syncInFlightRef.current ||
      syncTimerRef.current !== null ||
      pullInFlightRef.current
    ) {
      return;
    }
    const now = Date.now();
    if (now - lastPulledAtRef.current < 15000) {
      return;
    }

    pullInFlightRef.current = true;
    lastPulledAtRef.current = now;
    try {
      const pulled = await pullAllViaAppsScript(snap.settings.appsScriptUrl);
      if (syncInFlightRef.current || syncTimerRef.current !== null) {
        return;
      }
      const hasRemoteData =
        pulled.items.length > 0 ||
        pulled.transactions.length > 0 ||
        pulled.reports.length > 0 ||
        Object.keys(pulled.settingsPatch).length > 0;
      if (!hasRemoteData) {
        return;
      }

      const current = latestSyncSnapshotRef.current;
      const nextItems = pulled.items;
      const nextTransactions = pulled.transactions;
      const nextReports = pulled.reports;
      const nextSettings: StoreSettings = {
        ...current.settings,
        ...pulled.settingsPatch,
        appsScriptUrl: current.settings.appsScriptUrl,
        driveFolderName:
          pulled.settingsPatch.driveFolderName ||
          current.settings.driveFolderName,
        spreadsheetId: pulled.spreadsheetId || current.settings.spreadsheetId,
        spreadsheetTitle:
          pulled.spreadsheetTitle || current.settings.spreadsheetTitle,
      };

      const nextSig = computeSyncSignature(
        nextItems,
        nextTransactions,
        nextReports,
        nextSettings
      );
      if (nextSig !== lastSyncedSigRef.current) {
        lastSyncedSigRef.current = nextSig;
        latestSyncSnapshotRef.current = {
          items: nextItems,
          transactions: nextTransactions,
          reports: nextReports,
          settings: nextSettings,
        };
        setItems(nextItems);
        setTransactions(nextTransactions);
        setReports(nextReports);
        setSettings(nextSettings);
      }
      setAutoSyncStatus('synced');
    } catch {
      // Silent background pull ignores transient network failures
    } finally {
      pullInFlightRef.current = false;
    }
  }, []);

  // Auto-connect permanently on mount using behind-the-scenes config (VITE_APPS_SCRIPT_URL / databaseConfig.ts)
  useEffect(() => {
    if (initialSetupOverride) {
      if (mobileSetupHandledRef.current) return;
      mobileSetupHandledRef.current = true;
      startupSyncHandledRef.current = true;

      void handleConnectAppsScript(
        initialSetupOverride.appsScriptUrl,
        initialSetupOverride.driveFolderName,
        { isStartupBootstrap: true }
      );
      return;
    }

    if (startupSyncHandledRef.current) return;
    startupSyncHandledRef.current = true;

    const currentSettings = latestSyncSnapshotRef.current.settings;
    if (!isValidAppsScriptUrl(currentSettings.appsScriptUrl)) return;

    if (!currentSettings.spreadsheetId) {
      void handleConnectAppsScript(
        currentSettings.appsScriptUrl,
        currentSettings.driveFolderName,
        { isStartupBootstrap: true }
      );
    } else if (currentSettings.autoSyncEnabled !== false) {
      void pullFromSheetsSilent();
    }
  }, [initialSetupOverride, handleConnectAppsScript, pullFromSheetsSilent]);

  // Pull latest Sheet data automatically when returning to the browser tab on HP/Tablet/PC
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pullFromSheetsSilent();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pullFromSheetsSilent]);

  if (!resolvedUser) {
    return (
      <LoginView
        storeName={settings.storeName}
        storeTagline={settings.storeTagline}
        storeAddress={settings.storeAddress}
        logoUrl={settings.logoUrl}
        users={settings.users}
        theme={theme}
        connectionNotice={loginConnectionNotice}
        onToggleTheme={handleToggleTheme}
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

  // 1-click instant sync to permanently configured Apps Script + Drive
  const handleInstantAutoSync = async () => {
    if (!isAppsScriptConnected) {
      setSyncFeedback({
        type: 'error',
        message:
          'Konfigurasi Google Apps Script belum terpasang di environment server (VITE_APPS_SCRIPT_URL).',
      });
      return;
    }

    if (!settings.spreadsheetId) {
      await handleConnectAppsScript(
        settings.appsScriptUrl,
        settings.driveFolderName
      );
      return;
    }

    const nextSettings: StoreSettings = {
      ...settings,
      autoSyncEnabled: true,
    };
    latestSyncSnapshotRef.current = {
      ...latestSyncSnapshotRef.current,
      settings: nextSettings,
    };
    setSettings(nextSettings);

    await runSyncToSheets({
      silent: false,
      overrideSettings: nextSettings,
      customSuccessMessage: `Sinkronisasi berhasil ke "${settings.spreadsheetTitle || 'Google Spreadsheet'}". Mode real-time aktif penuh.`,
    });
  };

  const handlePullFromSheets = async () => {
    if (!isAppsScriptConnected) return;

    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const pulled = await pullAllViaAppsScript(settings.appsScriptUrl);
      const hasRemoteData =
        pulled.items.length > 0 ||
        pulled.transactions.length > 0 ||
        pulled.reports.length > 0 ||
        Object.keys(pulled.settingsPatch).length > 0;
      const nextItems = hasRemoteData ? pulled.items : items;
      const nextTransactions = hasRemoteData ? pulled.transactions : transactions;
      const nextReports = hasRemoteData ? pulled.reports : reports;
      const nextSettings: StoreSettings = {
        ...settings,
        ...pulled.settingsPatch,
        appsScriptUrl: settings.appsScriptUrl,
        driveFolderName:
          pulled.settingsPatch.driveFolderName || settings.driveFolderName,
        spreadsheetId: pulled.spreadsheetId,
        spreadsheetTitle: pulled.spreadsheetTitle,
      };

      // Mark pulled snapshot as synced so auto-sync doesn't immediately bounce back
      lastSyncedSigRef.current = computeSyncSignature(
        nextItems,
        nextTransactions,
        nextReports,
        nextSettings
      );
      latestSyncSnapshotRef.current = {
        items: nextItems,
        transactions: nextTransactions,
        reports: nextReports,
        settings: nextSettings,
      };

      if (hasRemoteData) {
        setItems(nextItems);
        setTransactions(nextTransactions);
        setReports(nextReports);
      }
      setSettings(nextSettings);
      setAutoSyncStatus('synced');

      setSyncFeedback({
        type: 'success',
        message: hasRemoteData
          ? `Berhasil memuat ${pulled.items.length} varian produk, ${pulled.transactions.length} transaksi, ${pulled.reports.length} laporan, & pengaturan dari "${pulled.spreadsheetTitle}".`
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
        autoSyncEnabled={settings.autoSyncEnabled !== false}
        autoSyncStatus={autoSyncStatus}
        lastSyncedAt={settings.lastSyncedAt}
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

            {isAppsScriptConnected && !isAdmin && (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#15803D]">
                <RefreshCw
                  className={`h-3 w-3 ${
                    autoSyncStatus === 'syncing' ? 'animate-spin' : ''
                  }`}
                  aria-hidden="true"
                />
                <span>
                  {autoSyncStatus === 'syncing'
                    ? 'Menyimpan ke Sheets...'
                    : autoSyncStatus === 'error'
                    ? 'Auto-Sync Tertunda'
                    : 'Sheets Live Sync'}
                </span>
              </div>
            )}

            {isAdmin &&
              (isAppsScriptConnected ? (
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void handleInstantAutoSync()}
                  className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#172554] disabled:opacity-60"
                >
                  {autoSyncStatus === 'syncing' || isSyncing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {isSyncing || autoSyncStatus === 'syncing'
                    ? 'Menyinkronkan...'
                    : 'Sinkron Otomatis'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('pengaturan')}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
                >
                  <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sm:hidden">Pengaturan</span>
                  <span className="hidden sm:inline">Pengaturan Toko</span>
                </button>
              ))}

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={
                theme === 'dark'
                  ? 'Aktifkan Mode Terang'
                  : 'Aktifkan Mode Gelap'
              }
              title={
                theme === 'dark'
                  ? 'Aktifkan Mode Terang'
                  : 'Aktifkan Mode Gelap'
              }
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[#E5E5E0] bg-white px-2.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
                  <span className="hidden sm:inline">Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[#1E3A8A]" aria-hidden="true" />
                  <span className="hidden sm:inline">Mode Gelap</span>
                </>
              )}
            </button>

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
              isAppsScriptConnected={isAppsScriptConnected}
              isSyncing={isSyncing}
              autoSyncStatus={autoSyncStatus}
              syncFeedback={syncFeedback}
              onInstantAutoSync={handleInstantAutoSync}
              onPullFromSheets={handlePullFromSheets}
              onUploadMediaToDrive={handleUploadMediaToDrive}
            />
          )}
        </main>
      </div>
    </div>
  );
}
