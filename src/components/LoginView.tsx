import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Store,
  UserCheck,
} from 'lucide-react';
import type { StoreUser, UserRole } from '../types/sistor';

interface LoginViewProps {
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  logoUrl?: string;
  users: StoreUser[];
  onLoginSuccess: (user: StoreUser) => void;
}

const PREVIEW_BLACK = '/src/assets/images/sistor_tee_heavy_black_1795013810356.jpg';
const PREVIEW_BONE = '/src/assets/images/sistor_tee_bone_white_1795013810610.jpg';

export const LoginView: React.FC<LoginViewProps> = ({
  storeName,
  storeTagline,
  storeAddress,
  logoUrl,
  users,
  onLoginSuccess,
}) => {
  const [selectedRoleHint, setSelectedRoleHint] = useState<UserRole>('OPERATOR');
  const [username, setUsername] = useState('operator');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectQuickAccount = (role: UserRole) => {
    setSelectedRoleHint(role);
    setErrorMsg('');
    const matched = users.find((u) => u.role === role);
    if (matched) {
      setUsername(matched.username);
      setPassword(matched.password);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();
    const matched = users.find(
      (u) =>
        u.username.trim().toLowerCase() === cleanUser &&
        u.password === password
    );

    if (!matched) {
      setErrorMsg(
        'Username atau kata sandi tidak sesuai. Pilih akun cepat di atas atau periksa kembali kredensial Anda.'
      );
      return;
    }

    onLoginSuccess(matched);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#141413] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Brand & Editorial Showcase Panel */}
      <div className="relative flex flex-col justify-between bg-[#141413] px-6 py-8 text-white sm:px-10 sm:py-10 lg:col-span-6 lg:px-12 lg:py-12">
        <div>
          <div className="flex items-center gap-3.5">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${storeName}`}
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-xl border border-white/15 bg-[#FAF5EE] object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1E3A8A] font-display text-lg font-extrabold tracking-tight text-white">
                {storeName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-display text-xl font-extrabold tracking-tight">
                {storeName}
              </div>
              <div className="text-xs text-[#A1A19A]">{storeTagline}</div>
            </div>
          </div>

          <div className="mt-10 max-w-lg">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#93C5FD]">
              Sistem Kasir &amp; Stock Opname Profesional
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Penjualan Kaos, Kasir Multi-Bayar &amp; Audit Stok Akurat.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#C2C2BA]">
              Kelola transaksi Cash, QRIS, dan Transfer Bank, hitung Harga Dasar (HPP), nilai penjualan, serta kerugian selisih barang dengan sinkronisasi langsung ke Google Spreadsheet dan Google Drive.
            </p>
          </div>

          {/* Studio Product Cards */}
          <div className="mt-8 grid grid-cols-2 gap-4 max-w-lg">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1F1F1D]">
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#272724]">
                <img
                  src={PREVIEW_BLACK}
                  alt="Koleksi Sisstore Boxy Heavyweight 280gsm Jet Black"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-white">
                  Heavyweight 280gsm
                </div>
                <div className="mt-0.5 text-[11px] text-[#A1A19A]">
                  Pantau HPP, Margin &amp; Stok Real-Time
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1F1F1D]">
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#272724]">
                <img
                  src={PREVIEW_BONE}
                  alt="Koleksi Sisstore Daily Combed 24s Bone White"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-white">
                  Daily Combed 24s
                </div>
                <div className="mt-0.5 text-[11px] text-[#A1A19A]">
                  Cetak Struk Thermal 58mm / 80mm
                </div>
              </div>
            </div>
          </div>

          {/* Role Architecture Highlights */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#93C5FD]">
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                Akses Operator / Kasir
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#B6B6AE]">
                Fokus pada kasir penjualan (Cash, QRIS, Transfer), cetak struk, hitung fisik opname harian, &amp; laporan shift.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FDE68A]">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Akses Admin / Pemilik (Owner)
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[#B6B6AE]">
                Dashboard eksekutif, kontrol penuh HPP &amp; margin, laporan laba rugi, katalog kaos, serta sinkron Sheets &amp; Drive.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-5 text-xs text-[#8D8D85]">
          <div className="flex items-start gap-1.5 max-w-md">
            <Store className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{storeAddress}</span>
          </div>
          <span>Buka 10.00–21.00 WIB</span>
        </div>
      </div>

      {/* Right Login Card Column */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:col-span-6 lg:px-14">
        <div className="w-full max-w-md rounded-2xl border border-[#E5E5E0] bg-white p-6 shadow-xs sm:p-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
              Portal Masuk Toko {storeName}
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#141413]">
              Silakan Login Sesuai Peran
            </h2>
            <p className="mt-1 text-sm text-[#52524E]">
              Tampilan menu, data HPP, dan laporan menyesuaikan hak akses akun Anda.
            </p>
          </div>

          {/* Role Quick-Selector */}
          <div className="mt-6">
            <div className="text-xs font-semibold text-[#3F3F3B]">
              Pilih Peran Masuk Cepat (Isi Otomatis):
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectQuickAccount('OPERATOR')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                  selectedRoleHint === 'OPERATOR'
                    ? 'border-[#1E3A8A] bg-[#EFF6FF]'
                    : 'border-[#E5E5E0] bg-[#F7F7F5] hover:bg-[#EFEFEA]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                  <UserCheck
                    className="h-4 w-4 text-[#1E3A8A]"
                    aria-hidden="true"
                  />
                  Operator / Kasir
                </div>
                <div className="mt-1 text-[11px] text-[#52524E]">
                  Kasir POS &amp; Hitung Opname
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickAccount('ADMIN')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                  selectedRoleHint === 'ADMIN'
                    ? 'border-[#1E3A8A] bg-[#EFF6FF]'
                    : 'border-[#E5E5E0] bg-[#F7F7F5] hover:bg-[#EFEFEA]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                  <ShieldCheck
                    className="h-4 w-4 text-[#1E3A8A]"
                    aria-hidden="true"
                  />
                  Admin / Pemilik
                </div>
                <div className="mt-1 text-[11px] text-[#52524E]">
                  Owner, HPP &amp; Laporan Penuh
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Username Akun
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                placeholder="operator atau admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                className="mt-1.5 w-full rounded-lg border border-[#D6D6D0] bg-white px-3.5 py-2.5 text-sm text-[#141413] placeholder:text-[#8D8D85] focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#3F3F3B]"
              >
                Kata Sandi
              </label>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full rounded-lg border border-[#D6D6D0] bg-white py-2.5 pl-3.5 pr-10 text-sm text-[#141413] placeholder:text-[#8D8D85] focus:border-[#1E3A8A] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword
                      ? 'Sembunyikan kata sandi'
                      : 'Tampilkan kata sandi'
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B6B65] hover:bg-[#F3F3F0] hover:text-[#141413]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#172554]"
            >
              <span>Masuk ke Dashboard {storeName}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          {/* Default Account Reference Box */}
          <div className="mt-6 rounded-xl border border-[#E5E5E0] bg-[#F7F7F5] p-3.5 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#141413]">
              <KeyRound className="h-3.5 w-3.5 text-[#1E3A8A]" aria-hidden="true" />
              Info Akun Terdaftar ({users.length} Pengguna)
            </div>
            <div className="mt-2 space-y-1.5 text-[11px] text-[#52524E]">
              {users.map((u) => {
                const isDemoPass =
                  (u.username === 'admin' && u.password === 'owner123') ||
                  (u.username === 'operator' && u.password === 'kasir123');
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 border-t border-[#E5E5E0] pt-1.5 first:border-t-0 first:pt-0"
                  >
                    <span className="font-medium text-[#141413]">
                      {u.displayName}{' '}
                      <span className="text-[#6B6B65]">
                        ({u.role === 'ADMIN' ? 'Admin' : 'Operator'})
                      </span>
                    </span>
                    <span className="font-mono text-[#3F3F3B]">
                      {u.username} / {isDemoPass ? u.password : '•••••• (Custom)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
