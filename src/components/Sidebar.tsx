import React from 'react';
import {
  BookOpen,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  UserCheck,
  X,
} from 'lucide-react';
import type { StoreUser, UserRole } from '../types/sistor';

export type ActiveTab =
  | 'dashboard'
  | 'kasir'
  | 'opname'
  | 'laporan'
  | 'katalog'
  | 'pengaturan';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: StoreUser;
  onLogout: () => void;
  storeName: string;
  storeTagline: string;
  logoUrl?: string;
  isAppsScriptConnected: boolean;
  spreadsheetLinked: boolean;
  autoSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const ALL_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Pemilik',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
  },
  {
    id: 'kasir',
    label: 'Kasir Penjualan',
    icon: ShoppingBag,
    roles: ['ADMIN', 'OPERATOR'],
  },
  {
    id: 'opname',
    label: 'Stock Opname',
    icon: ClipboardCheck,
    roles: ['ADMIN', 'OPERATOR'],
  },
  {
    id: 'laporan',
    label: 'Laporan Lengkap',
    icon: FileSpreadsheet,
    roles: ['ADMIN', 'OPERATOR'],
  },
  {
    id: 'katalog',
    label: 'Katalog Kaos & HPP',
    icon: Shirt,
    roles: ['ADMIN'],
  },
  {
    id: 'pengaturan',
    label: 'Sheets, Drive & Akun',
    icon: Database,
    roles: ['ADMIN'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  storeName,
  storeTagline,
  logoUrl,
  isAppsScriptConnected,
  spreadsheetLinked,
  autoSyncStatus = 'idle',
  lastSyncedAt,
  mobileOpen,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.role === 'ADMIN';
  const navItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(currentUser.role)
  ).map((item) => {
    if (!isAdmin && item.id === 'opname') {
      return { ...item, label: 'Input Stock Opname' };
    }
    if (!isAdmin && item.id === 'laporan') {
      return { ...item, label: 'Laporan Shift Kasir' };
    }
    return item;
  });

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-[#E5E5E0]">
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#E5E5E0]">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${storeName}`}
                referrerPolicy="no-referrer"
                className="h-10 w-10 shrink-0 rounded-lg border border-[#E5E5E0] bg-[#FAF5EE] object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#141413] font-display text-sm font-extrabold text-white">
                {storeName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-display text-xl font-extrabold tracking-tight text-[#141413]">
                {storeName}
              </div>
              <div className="mt-0.5 truncate text-xs text-[#6B6B65]">
                {storeTagline}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu navigasi"
            className="rounded-lg p-1.5 text-[#6B6B65] hover:bg-[#F3F3F0] lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1" aria-label="Navigasi utama Sisstore">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white'
                    : 'text-[#3F3F3B] hover:bg-[#F3F3F0] hover:text-[#141413]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#E5E5E0] px-4 py-4 space-y-2.5">
        <a
          href="/Panduan-Lengkap-Sisstore.pdf"
          download="Panduan-Lengkap-Sisstore.pdf"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] px-3 py-2 text-xs font-semibold text-[#141413] transition-colors hover:bg-[#EBEBE6]"
        >
          <BookOpen className="h-3.5 w-3.5 text-[#1E3A8A]" aria-hidden="true" />
          Unduh Tutorial PDF
        </a>

        <div className="rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#3F3F3B]">
            <span>Database Sheets &amp; Drive</span>
            {isAppsScriptConnected && (
              <span
                className={`font-mono text-[10px] ${
                  autoSyncStatus === 'error'
                    ? 'text-[#B91C1C]'
                    : autoSyncStatus === 'syncing'
                    ? 'text-[#1E3A8A]'
                    : 'text-[#15803D]'
                }`}
              >
                {autoSyncStatus === 'syncing'
                  ? 'Sync...'
                  : autoSyncStatus === 'error'
                  ? 'Tertunda'
                  : 'Live'}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-[#6B6B65]">
            {isAppsScriptConnected
              ? autoSyncStatus === 'syncing'
                ? 'Menyinkronkan ke Sheets...'
                : lastSyncedAt
                ? `Auto-Sync Aktif · ${new Date(lastSyncedAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : spreadsheetLinked
                ? 'Auto-Sync Real-Time Aktif'
                : 'Apps Script siap sinkron'
              : 'Penyimpanan lokal aktif'}
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                onSelectTab('pengaturan');
                onCloseMobile();
              }}
              className="mt-1.5 text-[11px] font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
            >
              Kelola Koneksi Sheets →
            </button>
          )}
        </div>

        {/* Active User Session Card & Logout */}
        <div className="rounded-lg border border-[#E5E5E0] bg-white p-3">
          <div className="flex items-start gap-2.5">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isAdmin
                  ? 'bg-[#EFF6FF] text-[#1E3A8A]'
                  : 'bg-[#F3F3F0] text-[#141413]'
              }`}
            >
              {isAdmin ? (
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              ) : (
                <UserCheck className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-[#141413]">
                {currentUser.displayName}
              </div>
              <div className="text-[11px] font-medium text-[#1E3A8A]">
                {isAdmin ? 'Admin / Pemilik' : 'Operator / Kasir'}
              </div>
              <div className="truncate text-[10px] text-[#6B6B65]">
                {currentUser.shiftLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onLogout();
            }}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-xs font-semibold text-[#B91C1C] transition-colors hover:bg-red-100"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Keluar / Ganti Akun
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="no-print hide-when-printing-receipt hidden lg:block lg:w-[256px] lg:shrink-0">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div className="no-print hide-when-printing-receipt fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 w-64 max-w-[82vw] h-full">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
