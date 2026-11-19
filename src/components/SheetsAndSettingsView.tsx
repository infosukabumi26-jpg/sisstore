import React, { useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CloudUpload,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  ImagePlus,
  KeyRound,
  Link2,
  Lock,
  Pencil,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { SISTOR_APPS_SCRIPT_CODE } from '../data/appsScriptTemplate';
import type { DriveMediaCategory } from '../services/googleSheets';
import type {
  BankAccount,
  OpnameReport,
  SaleTransaction,
  StoreSettings,
  StoreUser,
  TShirtItem,
  UserRole,
} from '../types/sistor';
import { processImageUpload } from '../utils/imageUpload';
import { ConfirmDialog } from './ConfirmDialog';

interface SheetsAndSettingsViewProps {
  settings: StoreSettings;
  currentUserId?: string;
  onUpdateSettings: (patch: Partial<StoreSettings>) => void;
  items: TShirtItem[];
  transactions: SaleTransaction[];
  reports: OpnameReport[];
  isAppsScriptConnected: boolean;
  isSyncing: boolean;
  syncFeedback: {
    type: 'success' | 'error';
    message: string;
  } | null;
  onConnectAppsScript: (url: string, driveFolderName: string) => Promise<void>;
  onDisconnectAppsScript: () => void;
  onPushToSheets: () => Promise<void>;
  onPullFromSheets: () => Promise<void>;
  onUploadMediaToDrive: (
    category: DriveMediaCategory,
    dataUrl: string,
    fileNameHint: string
  ) => Promise<string>;
}

export const SheetsAndSettingsView: React.FC<SheetsAndSettingsViewProps> = ({
  settings,
  currentUserId,
  onUpdateSettings,
  items,
  transactions,
  reports,
  isAppsScriptConnected,
  isSyncing,
  syncFeedback,
  onConnectAppsScript,
  onDisconnectAppsScript,
  onPushToSheets,
  onPullFromSheets,
  onUploadMediaToDrive,
}) => {
  const [scriptUrlInput, setScriptUrlInput] = useState(settings.appsScriptUrl);
  const [folderNameInput, setFolderNameInput] = useState(
    settings.driveFolderName || 'Sisstore_Media_Drive'
  );
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | 'push' | 'pull'>(
    null
  );

  const [newBankName, setNewBankName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccHolder, setNewAccHolder] = useState(settings.storeName);
  const [uploadError, setUploadError] = useState('');
  const [uploadingTarget, setUploadingTarget] = useState<null | 'logo' | 'qris'>(
    null
  );
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const qrisInputRef = useRef<HTMLInputElement | null>(null);

  // User Management Modals & Feedback State
  const [userFeedback, setUserFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StoreUser | null>(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState<StoreUser | null>(
    null
  );
  const [deleteUserTarget, setDeleteUserTarget] = useState<StoreUser | null>(
    null
  );

  const [userForm, setUserForm] = useState({
    displayName: '',
    username: '',
    role: 'OPERATOR' as UserRole,
    shiftLabel: 'Operator Kasir & Opname',
    password: '',
    confirmPassword: '',
  });
  const [userFormError, setUserFormError] = useState('');
  const [showUserFormPass, setShowUserFormPass] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFormError, setPasswordFormError] = useState('');
  const [showPasswordModalPass, setShowPasswordModalPass] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(SISTOR_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setShowScriptCode(true);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConnectAppsScript(scriptUrlInput, folderNameInput);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploadingTarget('logo');
    try {
      const dataUrl = await processImageUpload(file, {
        maxDimension: 320,
        preservePng: true,
      });
      const finalUrl = await onUploadMediaToDrive(
        'logo',
        dataUrl,
        `logo-${settings.storeName.toLowerCase()}`
      );
      onUpdateSettings({ logoUrl: finalUrl });
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah logo toko.');
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploadingTarget('qris');
    try {
      const dataUrl = await processImageUpload(file, {
        maxDimension: 640,
        preservePng: true,
      });
      const finalUrl = await onUploadMediaToDrive(
        'qris',
        dataUrl,
        `qris-${settings.storeName.toLowerCase()}`
      );
      onUpdateSettings({ qrisImageUrl: finalUrl });
    } catch (err: any) {
      setUploadError(err?.message || 'Gagal mengunggah gambar QRIS.');
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newAccNumber.trim()) return;
    const next: BankAccount = {
      id: `bank-${Date.now()}`,
      bankName: newBankName.trim(),
      accountNumber: newAccNumber.trim(),
      accountHolder: newAccHolder.trim() || settings.storeName,
    };
    onUpdateSettings({
      bankAccounts: [...settings.bankAccounts, next],
    });
    setNewBankName('');
    setNewAccNumber('');
  };

  const handleRemoveBank = (id: string) => {
    if (settings.bankAccounts.length <= 1) return;
    onUpdateSettings({
      bankAccounts: settings.bankAccounts.filter((b) => b.id !== id),
    });
  };

  const adminCount = settings.users.filter((u) => u.role === 'ADMIN').length;

  const openAddUserModal = () => {
    setEditingUser(null);
    setUserFormError('');
    setShowUserFormPass(false);
    setUserForm({
      displayName: '',
      username: '',
      role: 'OPERATOR',
      shiftLabel: 'Operator Kasir & Opname',
      password: '',
      confirmPassword: '',
    });
    setAddUserModalOpen(true);
  };

  const openEditUserModal = (user: StoreUser) => {
    setEditingUser(user);
    setUserFormError('');
    setShowUserFormPass(false);
    setUserForm({
      displayName: user.displayName,
      username: user.username,
      role: user.role,
      shiftLabel: user.shiftLabel,
      password: '',
      confirmPassword: '',
    });
    setAddUserModalOpen(true);
  };

  const openUpdatePasswordModal = (user: StoreUser) => {
    setPasswordTargetUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setPasswordFormError('');
    setShowPasswordModalPass(false);
  };

  const handleSaveUserForm = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    const cleanName = userForm.displayName.trim();
    const cleanUsername = userForm.username.trim().toLowerCase();
    const cleanShift =
      userForm.shiftLabel.trim() ||
      (userForm.role === 'ADMIN'
        ? 'Owner & Manajemen Toko'
        : 'Operator Kasir & Opname');

    if (!cleanName || !cleanUsername) {
      setUserFormError('Nama tampilan dan username login wajib diisi.');
      return;
    }

    if (/\s/.test(cleanUsername)) {
      setUserFormError('Username login tidak boleh mengandung spasi.');
      return;
    }

    const duplicate = settings.users.find(
      (u) =>
        u.username.trim().toLowerCase() === cleanUsername &&
        u.id !== editingUser?.id
    );
    if (duplicate) {
      setUserFormError(
        `Username "${cleanUsername}" sudah dipakai oleh ${duplicate.displayName}.`
      );
      return;
    }

    if (editingUser) {
      if (
        editingUser.role === 'ADMIN' &&
        userForm.role !== 'ADMIN' &&
        adminCount <= 1
      ) {
        setUserFormError(
          'Minimal harus ada 1 akun Admin / Pemilik aktif di sistem.'
        );
        return;
      }

      const nextUsers = settings.users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              displayName: cleanName,
              username: cleanUsername,
              role: userForm.role,
              shiftLabel: cleanShift,
            }
          : u
      );
      onUpdateSettings({ users: nextUsers });
      setAddUserModalOpen(false);
      setUserFeedback({
        type: 'success',
        message: `Data pengguna "${cleanName}" (@${cleanUsername}) berhasil diperbarui.`,
      });
      return;
    }

    if (userForm.password.length < 4) {
      setUserFormError('Kata sandi minimal 4 karakter.');
      return;
    }
    if (userForm.password !== userForm.confirmPassword) {
      setUserFormError('Konfirmasi kata sandi tidak sama.');
      return;
    }

    const newUser: StoreUser = {
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      password: userForm.password,
      displayName: cleanName,
      role: userForm.role,
      shiftLabel: cleanShift,
    };

    onUpdateSettings({ users: [...settings.users, newUser] });
    setAddUserModalOpen(false);
    setUserFeedback({
      type: 'success',
      message: `User baru "${cleanName}" (@${cleanUsername}) berhasil ditambahkan.`,
    });
  };

  const handleSavePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    setPasswordFormError('');

    if (passwordForm.newPassword.length < 4) {
      setPasswordFormError('Kata sandi baru minimal 4 karakter.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFormError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    const nextUsers = settings.users.map((u) =>
      u.id === passwordTargetUser.id
        ? { ...u, password: passwordForm.newPassword }
        : u
    );
    onUpdateSettings({ users: nextUsers });
    setUserFeedback({
      type: 'success',
      message: `Kata sandi untuk "${passwordTargetUser.displayName}" (@${passwordTargetUser.username}) berhasil diperbarui.`,
    });
    setPasswordTargetUser(null);
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteUserTarget) return;
    const nextUsers = settings.users.filter((u) => u.id !== deleteUserTarget.id);
    onUpdateSettings({ users: nextUsers });
    setUserFeedback({
      type: 'success',
      message: `Akun "${deleteUserTarget.displayName}" (@${deleteUserTarget.username}) telah dihapus.`,
    });
    setDeleteUserTarget(null);
  };

  const isDriveUrl = (url?: string) =>
    Boolean(url && !url.startsWith('data:'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-[#141413]">
          Database Google Sheets, Google Drive &amp; Pengaturan Toko
        </h1>
        <p className="mt-1 text-sm text-[#52524E]">
          Terhubung langsung ke Google Spreadsheet (database) dan Google Drive (penyimpanan foto kaos, logo, &amp; QRIS) tanpa Firebase dan tanpa popup login.
        </p>
      </div>

      {/* Google Apps Script (Sheets + Drive) Integration Card */}
      <section className="rounded-xl border border-[#E5E5E0] bg-white p-6">
        <div className="flex flex-col gap-4 border-b border-[#E5E5E0] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#141413]">
              Koneksi Google Spreadsheet &amp; Google Drive (Apps Script)
            </h2>
            <p className="mt-1 text-sm text-[#52524E]">
              Cukup pasang skrip Google Apps Script di Spreadsheet Anda sekali saja — data langsung tersimpan ke Sheets dan gambar masuk otomatis ke Google Drive.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E5E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#F3F3F0]"
            >
              {copiedCode ? (
                <Check className="h-3.5 w-3.5 text-[#15803D]" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {copiedCode ? 'Kode Apps Script Disalin' : 'Salin Kode Code.gs'}
            </button>
            <button
              type="button"
              onClick={() => setShowScriptCode((v) => !v)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] px-3.5 py-2 text-xs font-semibold text-[#3F3F3B] hover:bg-[#EBEBE6]"
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              {showScriptCode ? 'Tutup Panduan' : 'Lihat Panduan & Kode'}
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-xs font-medium ${
              syncFeedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-[#15803D]'
                : 'border-red-200 bg-red-50 text-[#B91C1C]'
            }`}
          >
            {syncFeedback.message}
          </div>
        )}

        {showScriptCode && (
          <div className="mt-4 rounded-xl border border-[#E5E5E0] bg-[#F7F7F5] p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 text-xs text-[#3F3F3B] md:grid-cols-4">
              <div className="rounded-lg bg-white p-3 border border-[#E5E5E0]">
                <div className="font-semibold text-[#141413]">
                  1. Buka Spreadsheet
                </div>
                <p className="mt-1">
                  Buka Google Sheets Anda lalu klik{' '}
                  <strong>Extensions → Apps Script</strong>.
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-[#E5E5E0]">
                <div className="font-semibold text-[#141413]">
                  2. Tempel Kode
                </div>
                <p className="mt-1">
                  Hapus isi editor, klik <strong>Salin Kode Code.gs</strong> lalu tempel dan tekan <strong>Ctrl+S</strong>.
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-[#E5E5E0]">
                <div className="font-semibold text-[#141413]">
                  3. Deploy Web App
                </div>
                <p className="mt-1">
                  Klik <strong>Deploy → New deployment → Web app</strong>. Pilih <em>Execute as: Me</em> &amp; <em>Who has access: Anyone</em>.
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 border border-[#E5E5E0]">
                <div className="font-semibold text-[#141413]">
                  4. Tempel URL /exec
                </div>
                <p className="mt-1">
                  Salin URL Web App berakhiran <code className="font-mono">/exec</code> ke kolom di bawah lalu klik <strong>Simpan &amp; Uji Koneksi</strong>.
                </p>
              </div>
            </div>

            <pre className="max-h-60 overflow-auto rounded-lg border border-[#E5E5E0] bg-[#141413] p-3 font-mono text-[11px] leading-relaxed text-[#F7F7F5]">
              {SISTOR_APPS_SCRIPT_CODE}
            </pre>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form onSubmit={handleConnectSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="apps-script-url"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                URL Web App Google Apps Script
              </label>
              <input
                id="apps-script-url"
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={scriptUrlInput}
                onChange={(e) => setScriptUrlInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-xs focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="drive-folder-name"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Nama Folder Penyimpanan Gambar di Google Drive
              </label>
              <input
                id="drive-folder-name"
                type="text"
                placeholder="Sisstore_Media_Drive"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-xs focus:border-[#1E3A8A] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#6B6B65]">
                Otomatis dibuatkan subfolder <code className="font-mono">Produk_Kaos</code>, <code className="font-mono">Logo_Toko</code>, dan <code className="font-mono">QRIS_Toko</code> di Google Drive Anda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172554] disabled:opacity-60"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                {isSyncing ? 'Menghubungkan...' : 'Simpan & Uji Koneksi'}
              </button>
              {isAppsScriptConnected && (
                <button
                  type="button"
                  onClick={() => {
                    setScriptUrlInput('');
                    onDisconnectAppsScript();
                  }}
                  className="rounded-lg border border-[#E5E5E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-red-50"
                >
                  Putuskan Koneksi
                </button>
              )}
            </div>
          </form>

          <div className="rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#3F3F3B]">
                  Status Spreadsheet &amp; Google Drive
                </span>
                {isAppsScriptConnected && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#15803D]">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Terhubung
                  </span>
                )}
              </div>

              {isAppsScriptConnected ? (
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="font-semibold text-[#141413]">
                    {settings.spreadsheetTitle || 'Spreadsheet Sisstore Aktif'}
                  </div>
                  {settings.spreadsheetId && (
                    <div className="font-mono text-[11px] text-[#52524E] break-all">
                      ID: {settings.spreadsheetId}
                    </div>
                  )}
                  <div className="text-[#6B6B65]">
                    Sinkron terakhir:{' '}
                    {settings.lastSyncedAt
                      ? new Date(settings.lastSyncedAt).toLocaleString('id-ID')
                      : 'Belum disinkronkan'}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 pt-1">
                    {settings.spreadsheetId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] hover:underline"
                      >
                        Buka Google Sheets
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                    {settings.driveFolderUrl && (
                      <a
                        href={settings.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#15803D] hover:underline"
                      >
                        <FolderOpen className="h-3 w-3" aria-hidden="true" />
                        Buka Folder Drive ({settings.driveFolderName})
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#6B6B65]">
                  Belum terhubung ke Apps Script. Aplikasi tetap berjalan penuh secara lokal, dan Anda dapat melihat panduan kode <code className="font-mono">Code.gs</code> di kanan atas untuk menghubungkan Spreadsheet &amp; Google Drive kapan saja.
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E5E5E0] pt-4">
              <button
                type="button"
                disabled={!isAppsScriptConnected || isSyncing}
                onClick={() => setConfirmAction('push')}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#141413] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] disabled:cursor-not-allowed disabled:bg-[#D6D6D0] disabled:text-[#6B6B65]"
              >
                <CloudUpload className="h-3.5 w-3.5" aria-hidden="true" />
                Sinkronkan Data &amp; Gambar
              </button>
              <button
                type="button"
                disabled={!isAppsScriptConnected || isSyncing}
                onClick={() => setConfirmAction('pull')}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E5E0] bg-white px-3.5 py-2 text-xs font-semibold text-[#141413] hover:bg-[#EBEBE6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Muat Data dari Sheets
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Store Identity, Logo, QRIS & Bank Transfer Settings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E5E5E0] bg-white p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#141413]">
            Identitas Toko, Logo, QRIS &amp; Struk
          </h2>

          {uploadError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#B91C1C]"
            >
              {uploadError}
            </div>
          )}

          {/* Logo Toko & Gambar QRIS Uploads */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#3F3F3B]">
                  Logo Toko {settings.storeName}
                </span>
                {settings.logoUrl && (
                  <span className="text-[10px] font-semibold text-[#15803D]">
                    {isDriveUrl(settings.logoUrl) ? 'Google Drive' : 'Lokal'}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E0] bg-white">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={`Logo ${settings.storeName}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <ImagePlus
                      className="h-5 w-5 text-[#787872]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    aria-label="Upload file logo toko"
                    onChange={handleUploadLogo}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={uploadingTarget === 'logo'}
                      onClick={() => logoInputRef.current?.click()}
                      className="rounded-md bg-[#141413] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-60"
                    >
                      {uploadingTarget === 'logo'
                        ? 'Mengunggah...'
                        : 'Upload Logo'}
                    </button>
                    {settings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ logoUrl: '' })}
                        className="rounded-md border border-[#E5E5E0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-[#6B6B65]">
                    Tampil di sidebar, struk, dan laporan.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#3F3F3B]">
                  Gambar QRIS Resmi Toko
                </span>
                {settings.qrisImageUrl && (
                  <span className="text-[10px] font-semibold text-[#15803D]">
                    {isDriveUrl(settings.qrisImageUrl) ? 'Google Drive' : 'Lokal'}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E5E0] bg-white">
                  {settings.qrisImageUrl ? (
                    <img
                      src={settings.qrisImageUrl}
                      alt="Gambar QRIS Toko"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <QrCode
                      className="h-5 w-5 text-[#787872]"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <input
                    ref={qrisInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Upload file gambar QRIS"
                    onChange={handleUploadQris}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={uploadingTarget === 'qris'}
                      onClick={() => qrisInputRef.current?.click()}
                      className="rounded-md bg-[#141413] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1E3A8A] disabled:opacity-60"
                    >
                      {uploadingTarget === 'qris'
                        ? 'Mengunggah...'
                        : 'Upload QRIS'}
                    </button>
                    {settings.qrisImageUrl && (
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ qrisImageUrl: '' })}
                        className="rounded-md border border-[#E5E5E0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-red-50"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-[#6B6B65]">
                    Tampil di kasir saat pilih QRIS.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="set-store-name"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Nama Toko
              </label>
              <input
                id="set-store-name"
                type="text"
                value={settings.storeName}
                onChange={(e) =>
                  onUpdateSettings({ storeName: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="set-cashier"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Kasir Default
              </label>
              <input
                id="set-cashier"
                type="text"
                value={settings.defaultCashier}
                onChange={(e) =>
                  onUpdateSettings({ defaultCashier: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="set-address"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Alamat Toko
              </label>
              <input
                id="set-address"
                type="text"
                value={settings.storeAddress}
                onChange={(e) =>
                  onUpdateSettings({ storeAddress: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="set-phone"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Nomor Telepon Toko
              </label>
              <input
                id="set-phone"
                type="text"
                value={settings.storePhone}
                onChange={(e) =>
                  onUpdateSettings({ storePhone: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="set-qris-name"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Nama Merchant QRIS
              </label>
              <input
                id="set-qris-name"
                type="text"
                value={settings.qrisMerchantName}
                onChange={(e) =>
                  onUpdateSettings({ qrisMerchantName: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="set-qris-id"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                NMID QRIS
              </label>
              <input
                id="set-qris-id"
                type="text"
                value={settings.qrisMerchantId}
                onChange={(e) =>
                  onUpdateSettings({ qrisMerchantId: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="set-footer-note"
              className="block text-xs font-semibold text-[#3F3F3B]"
            >
              Catatan Kaki Struk Pembayaran
            </label>
            <input
              id="set-footer-note"
              type="text"
              value={settings.receiptFooterNote ?? ''}
              onChange={(e) =>
                onUpdateSettings({ receiptFooterNote: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-xs focus:border-[#1E3A8A] focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#3F3F3B] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(settings.autoPrintReceipt)}
              onChange={(e) =>
                onUpdateSettings({ autoPrintReceipt: e.target.checked })
              }
              className="h-3.5 w-3.5 rounded border-[#D6D6D0] text-[#1E3A8A] focus:ring-[#1E3A8A]"
            />
            Otomatis buka jendela cetak struk setelah transaksi selesai
          </label>
        </section>

        <section className="rounded-xl border border-[#E5E5E0] bg-white p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#141413]">
            Daftar Rekening Transfer Bank
          </h2>
          <ul className="divide-y divide-[#E5E5E0] rounded-lg border border-[#E5E5E0]">
            {settings.bankAccounts.map((bank) => (
              <li
                key={bank.id}
                className="flex items-center justify-between px-3.5 py-2.5 text-xs"
              >
                <div>
                  <span className="font-semibold text-[#141413]">
                    {bank.bankName}
                  </span>{' '}
                  ·{' '}
                  <span className="font-mono font-semibold text-[#1E3A8A]">
                    {bank.accountNumber}
                  </span>{' '}
                  · a.n. {bank.accountHolder}
                </div>
                {settings.bankAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBank(bank.id)}
                    aria-label={`Hapus rekening ${bank.bankName}`}
                    className="rounded p-1 text-[#B91C1C] hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <form
            onSubmit={handleAddBank}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            <input
              type="text"
              placeholder="Nama Bank (BNI)"
              aria-label="Nama bank baru"
              value={newBankName}
              onChange={(e) => setNewBankName(e.target.value)}
              className="rounded-lg border border-[#E5E5E0] px-3 py-2 text-xs focus:border-[#1E3A8A] focus:outline-none"
            />
            <input
              type="text"
              placeholder="No Rekening"
              aria-label="Nomor rekening baru"
              value={newAccNumber}
              onChange={(e) => setNewAccNumber(e.target.value)}
              className="rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-xs focus:border-[#1E3A8A] focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Atas Nama"
                aria-label="Nama pemilik rekening"
                value={newAccHolder}
                onChange={(e) => setNewAccHolder(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-xs focus:border-[#1E3A8A] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Tambah rekening bank"
                className="shrink-0 rounded-lg bg-[#141413] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Store User Accounts Management (Add, Edit, Update Password, Delete) */}
      <section className="rounded-xl border border-[#E5E5E0] bg-white p-6 space-y-4">
        <div className="flex flex-col gap-3 border-b border-[#E5E5E0] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[#141413] flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#1E3A8A]" aria-hidden="true" />
              Manajemen User &amp; Kata Sandi ({settings.users.length} Pengguna)
            </h2>
            <p className="mt-1 text-xs text-[#52524E]">
              Tambah akun Operator atau Admin baru, edit peran/shift, serta perbarui kata sandi pengguna secara aman. Tersimpan otomatis dan ikut disinkronkan ke Google Sheets.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddUserModal}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172554]"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Tambah User Baru
          </button>
        </div>

        {userFeedback && (
          <div
            role="status"
            className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium ${
              userFeedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-[#15803D]'
                : 'border-red-200 bg-red-50 text-[#B91C1C]'
            }`}
          >
            <span>{userFeedback.message}</span>
            <button
              type="button"
              onClick={() => setUserFeedback(null)}
              aria-label="Tutup notifikasi"
              className="rounded p-0.5 hover:bg-black/5"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {settings.users.map((user) => {
            const isOwnerRole = user.role === 'ADMIN';
            const isSelf = user.id === currentUserId;
            const isLastAdmin = isOwnerRole && adminCount <= 1;
            const disableDelete = isSelf || isLastAdmin;

            return (
              <div
                key={user.id}
                className="flex flex-col justify-between rounded-xl border border-[#E5E5E0] bg-[#F7F7F5] p-4 space-y-3"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isOwnerRole
                            ? 'bg-[#EFF6FF] text-[#1E3A8A]'
                            : 'bg-white text-[#141413] border border-[#E5E5E0]'
                        }`}
                      >
                        {isOwnerRole ? (
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <UserCheck className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-[#141413]">
                            {user.displayName}
                          </span>
                          {isSelf && (
                            <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#1E3A8A] whitespace-nowrap">
                              Sedang Login
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#52524E]">
                          {user.shiftLabel}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                        isOwnerRole
                          ? 'bg-[#1E3A8A] text-white'
                          : 'border border-[#D6D6D0] bg-white text-[#3F3F3B]'
                      }`}
                    >
                      {user.role === 'ADMIN' ? 'Admin / Owner' : 'Operator'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-xs">
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[#6B6B65]">
                        Username Login
                      </div>
                      <div className="mt-0.5 font-mono font-semibold text-[#141413]">
                        @{user.username}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-[#6B6B65]">
                        Status Kata Sandi
                      </div>
                      <div className="mt-0.5 font-mono text-[#52524E]">
                        •••••• ({user.password.length} karakter)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5E0] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditUserModal(user)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5E0] bg-white px-3 py-1.5 text-xs font-semibold text-[#141413] hover:bg-[#EBEBE6]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit Data &amp; Role
                    </button>
                    <button
                      type="button"
                      onClick={() => openUpdatePasswordModal(user)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] hover:bg-[#DBEAFE]"
                    >
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Update Password
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={disableDelete}
                    title={
                      isSelf
                        ? 'Tidak dapat menghapus akun yang sedang login'
                        : isLastAdmin
                        ? 'Minimal harus ada 1 akun Admin'
                        : `Hapus akun ${user.displayName}`
                    }
                    onClick={() => setDeleteUserTarget(user)}
                    aria-label={`Hapus akun ${user.displayName}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#E5E5E0] disabled:text-[#A1A19A] disabled:hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* GitHub & Vercel Deployment Guide */}
      <section className="rounded-xl border border-[#E5E5E0] bg-white p-6">
        <h2 className="font-display text-base font-bold text-[#141413]">
          Panduan Penyimpanan GitHub &amp; Hosting Vercel (vercel.com)
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 text-xs leading-relaxed text-[#3F3F3B] md:grid-cols-3">
          <div className="rounded-lg bg-[#F7F7F5] p-4">
            <div className="font-semibold text-[#141413]">
              01. Simpan Kode ke GitHub
            </div>
            <p className="mt-1">
              Folder <code className="font-mono">google-apps-script/Code.gs</code> dan <code className="font-mono">README.md</code> sudah siap. Push seluruh proyek ke repository GitHub Anda dengan <code className="font-mono">git push origin main</code>.
            </p>
          </div>
          <div className="rounded-lg bg-[#F7F7F5] p-4">
            <div className="font-semibold text-[#141413]">
              02. Deploy di vercel.com
            </div>
            <p className="mt-1">
              Di dashboard Vercel, pilih <strong>Add New Project</strong>, impor repo GitHub, lalu klik <strong>Deploy</strong>. File <code className="font-mono">vercel.json</code> otomatis menangani build Vite &amp; routing.
            </p>
          </div>
          <div className="rounded-lg bg-[#F7F7F5] p-4">
            <div className="font-semibold text-[#141413]">
              03. Langsung Pakai Tanpa Firebase
            </div>
            <p className="mt-1">
              Karena memakai Google Apps Script, Anda tidak perlu setup Firebase maupun mendaftarkan domain Vercel di Google Cloud Console — cukup tempel URL Web App Apps Script.
            </p>
          </div>
        </div>
      </section>

      {/* Confirmation Dialogs before Mutating Sheets / Local State */}
      <ConfirmDialog
        open={confirmAction === 'push'}
        title="Sinkronkan Data & Gambar ke Spreadsheet + Drive?"
        description={`Aplikasi akan mengunggah gambar lokal yang belum tersimpan di Drive (jika ada) lalu memformat 7 tab profesional di spreadsheet "${settings.spreadsheetTitle || 'Google Sheets Sisstore'}".`}
        details={[
          `Tab Ringkasan_Eksekutif: KPI omzet, HPP, laba bersih, arus kas & valuasi aset`,
          `Tab Katalog_Kaos: ${items.length} SKU + link foto Google Drive`,
          `Tab Stock_Opname: HPP, Harga Jual, Nilai Penjualan, Kerugian Selisih & Keterangan`,
          `Tab Transaksi_Penjualan: ${transactions.length} transaksi (Cash, QRIS, Transfer & Kasir)`,
          `Tab Laporan_Penjualan_Produk: Peringkat omzet & laba kotor per varian kaos`,
          `Tab Laporan_Opname: ${reports.length} arsip berita acara opname`,
          `Tab Pengaturan_Toko: identitas, logo Drive, QRIS Drive, rekening & akun login`,
        ]}
        confirmLabel="Ya, Sinkronkan Sekarang"
        loading={isSyncing}
        onConfirm={async () => {
          setConfirmAction(null);
          await onPushToSheets();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'pull'}
        title="Muat Data dari Google Sheets?"
        description={`Data katalog kaos dan pengaturan toko di aplikasi saat ini akan diperbarui dari spreadsheet "${settings.spreadsheetTitle || 'Google Sheets'}".`}
        confirmLabel="Ya, Muat dari Sheets"
        loading={isSyncing}
        onConfirm={async () => {
          setConfirmAction(null);
          await onPullFromSheets();
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Add / Edit User Modal */}
      {addUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E5E5E0] bg-white p-6 shadow-xl my-auto">
            <div className="flex items-start justify-between border-b border-[#E5E5E0] pb-3.5">
              <div>
                <h2
                  id="user-modal-title"
                  className="font-display text-lg font-bold text-[#141413]"
                >
                  {editingUser
                    ? `Edit Pengguna · ${editingUser.displayName}`
                    : 'Tambah User / Akun Login Baru'}
                </h2>
                <p className="mt-0.5 text-xs text-[#6B6B65]">
                  {editingUser
                    ? 'Ubah nama petugas, username login, hak akses (role), atau shift.'
                    : 'Buat akun kasir (Operator) atau pemilik (Admin) baru lengkap dengan kata sandi.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddUserModalOpen(false)}
                aria-label="Tutup dialog pengguna"
                className="rounded-lg p-1.5 text-[#6B6B65] hover:bg-[#F3F3F0]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveUserForm} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="modal-user-name"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Nama Tampilan / Petugas
                </label>
                <input
                  id="modal-user-name"
                  type="text"
                  required
                  placeholder="Contoh: Siti (Kasir Shift 2)"
                  value={userForm.displayName}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="modal-user-role"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Peran / Hak Akses
                  </label>
                  <select
                    id="modal-user-role"
                    value={userForm.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setUserForm((f) => ({
                        ...f,
                        role: nextRole,
                        shiftLabel:
                          f.shiftLabel === 'Operator Kasir & Opname' ||
                          f.shiftLabel === 'Owner & Manajemen Toko'
                            ? nextRole === 'ADMIN'
                              ? 'Owner & Manajemen Toko'
                              : 'Operator Kasir & Opname'
                            : f.shiftLabel,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] bg-white px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                  >
                    <option value="OPERATOR">Operator / Kasir</option>
                    <option value="ADMIN">Admin / Pemilik</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="modal-user-username"
                    className="block text-xs font-semibold text-[#3F3F3B]"
                  >
                    Username Login
                  </label>
                  <input
                    id="modal-user-username"
                    type="text"
                    required
                    placeholder="Contoh: siti.kasir"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm((f) => ({ ...f, username: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="modal-user-shift"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Label Tugas / Shift
                </label>
                <input
                  id="modal-user-shift"
                  type="text"
                  placeholder="Contoh: Shift Sore (15.00–21.00 WIB)"
                  value={userForm.shiftLabel}
                  onChange={(e) =>
                    setUserForm((f) => ({ ...f, shiftLabel: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              {!editingUser && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="modal-user-pass"
                      className="block text-xs font-semibold text-[#3F3F3B]"
                    >
                      Kata Sandi
                    </label>
                    <div className="relative mt-1">
                      <input
                        id="modal-user-pass"
                        type={showUserFormPass ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="Min. 4 karakter"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm((f) => ({ ...f, password: e.target.value }))
                        }
                        className="w-full rounded-lg border border-[#E5E5E0] py-2 pl-3 pr-9 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserFormPass((v) => !v)}
                        aria-label="Toggle tampilkan kata sandi"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B6B65] hover:text-[#141413]"
                      >
                        {showUserFormPass ? (
                          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="modal-user-pass-confirm"
                      className="block text-xs font-semibold text-[#3F3F3B]"
                    >
                      Konfirmasi Kata Sandi
                    </label>
                    <input
                      id="modal-user-pass-confirm"
                      type={showUserFormPass ? 'text' : 'password'}
                      required
                      minLength={4}
                      placeholder="Ulangi kata sandi"
                      value={userForm.confirmPassword}
                      onChange={(e) =>
                        setUserForm((f) => ({
                          ...f,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {userFormError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#B91C1C]"
                >
                  {userFormError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-[#E5E5E0] pt-4">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="rounded-lg border border-[#E5E5E0] px-4 py-2 text-xs font-semibold text-[#3F3F3B] hover:bg-[#F3F3F0]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172554]"
                >
                  {editingUser ? 'Simpan Perubahan User' : 'Simpan User Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Password Modal */}
      {passwordTargetUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E5E5E0] bg-white p-6 shadow-xl my-auto">
            <div className="flex items-start justify-between border-b border-[#E5E5E0] pb-3.5">
              <div>
                <h2
                  id="password-modal-title"
                  className="font-display text-lg font-bold text-[#141413]"
                >
                  Update Kata Sandi
                </h2>
                <p className="mt-0.5 text-xs text-[#6B6B65]">
                  Akun: <strong className="text-[#141413]">{passwordTargetUser.displayName}</strong> (@{passwordTargetUser.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordTargetUser(null)}
                aria-label="Tutup dialog update password"
                className="rounded-lg p-1.5 text-[#6B6B65] hover:bg-[#F3F3F0]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSavePasswordUpdate} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="update-new-pass"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Kata Sandi Baru
                </label>
                <div className="relative mt-1">
                  <input
                    id="update-new-pass"
                    type={showPasswordModalPass ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Minimal 4 karakter"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((f) => ({
                        ...f,
                        newPassword: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[#E5E5E0] py-2 pl-3 pr-9 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordModalPass((v) => !v)}
                    aria-label="Toggle tampilkan kata sandi baru"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B6B65] hover:text-[#141413]"
                  >
                    {showPasswordModalPass ? (
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="update-confirm-pass"
                  className="block text-xs font-semibold text-[#3F3F3B]"
                >
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  id="update-confirm-pass"
                  type={showPasswordModalPass ? 'text' : 'password'}
                  required
                  minLength={4}
                  placeholder="Ketik ulang kata sandi baru"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[#E5E5E0] px-3 py-2 font-mono text-sm focus:border-[#1E3A8A] focus:outline-none"
                />
              </div>

              {passwordFormError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#B91C1C]"
                >
                  {passwordFormError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-[#E5E5E0] pt-4">
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  className="rounded-lg border border-[#E5E5E0] px-4 py-2 text-xs font-semibold text-[#3F3F3B] hover:bg-[#F3F3F0]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172554]"
                >
                  Simpan Kata Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteUserTarget)}
        title={`Hapus Pengguna "${deleteUserTarget?.displayName || ''}"?`}
        description={`Akun @${deleteUserTarget?.username || ''} akan dihapus dan tidak dapat digunakan lagi untuk login ke Sisstore.`}
        confirmLabel="Ya, Hapus Akun"
        variant="danger"
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setDeleteUserTarget(null)}
      />
    </div>
  );
};
