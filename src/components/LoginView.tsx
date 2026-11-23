import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Moon,
  Shirt,
  Store,
  Sun,
} from 'lucide-react';
import type { StoreUser } from '../types/sistor';
import { LoginApparelBackdrop } from './LoginApparelBackdrop';

interface LoginViewProps {
  storeName: string;
  storeTagline: string;
  storeAddress: string;
  logoUrl?: string;
  users: StoreUser[];
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onLoginSuccess: (user: StoreUser) => void;
}

const BOUTIQUE_HERO = '/src/assets/images/sisstore_hero_boutique_1795429769018.jpg';
const KOLEKSI_IMPOR = '/src/assets/images/sisstore_koleksi_impor_1795429766425.jpg';
const KOLEKSI_LOKAL = '/src/assets/images/sisstore_koleksi_lokal_1795429768208.jpg';

const ShowcaseImage: React.FC<{
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}> = ({ src, alt, fallbackTitle, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1E2433] via-[#171B24] to-[#11141B] p-4 text-center ${className}`}
      >
        <Shirt className="h-7 w-7 text-[#93C5FD]/80" aria-hidden="true" />
        <span className="mt-2 text-xs font-medium text-[#D1D5DB]">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const LoginView: React.FC<LoginViewProps> = ({
  storeName,
  storeTagline,
  storeAddress,
  logoUrl,
  users,
  theme = 'light',
  onToggleTheme,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        'Username atau kata sandi tidak sesuai. Silakan periksa kembali kredensial akun Anda.'
      );
      return;
    }

    onLoginSuccess(matched);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#141413] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Brand & Editorial Fashion Boutique Showcase */}
      <div className="login-showcase-panel order-2 lg:order-1 relative overflow-hidden flex flex-col justify-between px-6 py-8 text-white sm:px-10 sm:py-10 lg:col-span-6 lg:px-12 lg:py-10">
        <LoginApparelBackdrop variant="showcase" />
        <div className="relative z-10 max-w-xl">
          {/* Brand Lockup */}
          <div className="flex items-center justify-between gap-4 border-b border-white/20 pb-5">
            <div className="flex items-center gap-3.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo ${storeName}`}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-xl border border-white/25 bg-[#FAF5EE] object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/15 font-display text-lg font-extrabold tracking-tight text-white">
                  {storeName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-display text-xl font-extrabold tracking-tight text-white">
                  {storeName}
                </div>
                <div className="text-xs text-[#DBEAFE]">{storeTagline}</div>
              </div>
            </div>
            <div className="hidden sm:block text-right text-xs text-[#DBEAFE]">
              <div>Koleksi Terkurasi</div>
              <div className="font-semibold text-white">Bekasi · Setiap Hari</div>
            </div>
          </div>

          {/* Editorial Headline */}
          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#BAE6FD]">
              <span>Butik Busana Wanita</span>
              <span aria-hidden="true" className="text-white/40">·</span>
              <span>Kasir &amp; Stock Opname</span>
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-white [text-wrap:balance] sm:text-[2.15rem]">
              Kurasi Busana Lokal &amp; Impor, Kasir Cepat &amp; Audit Stok Akurat.
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#EFF6FF]">
              Kelola penjualan atasan, blouse, celana, hingga outerwear di meja kasir dengan harga jadi fleksibel, multi-metode bayar, dan sinkronisasi rapi ke Google Spreadsheet.
            </p>
          </div>

          {/* Editorial Boutique Visual Gallery */}
          <div className="mt-6 space-y-3">
            {/* Primary Boutique Hero Frame (16:9) */}
            <div className="group relative overflow-hidden rounded-xl border border-white/25 bg-[#172554] shadow-md">
              <div className="aspect-[16/9] w-full overflow-hidden">
                <ShowcaseImage
                  src={BOUTIQUE_HERO}
                  alt="Suasana butik Sisstore dengan koleksi blazer, blouse, dan celana wanita terkurasi"
                  fallbackTitle="Galeri Butik Sisstore"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
                <div>
                  <div className="text-[11px] font-medium tracking-wide text-[#BAE6FD]">
                    Etalase Butik · Lokal &amp; Impor
                  </div>
                  <div className="mt-0.5 font-display text-base font-bold text-white sm:text-lg">
                    Pilihan Harian hingga Semi-Formal
                  </div>
                </div>
                <div className="hidden sm:block text-right text-xs text-[#E0F2FE]">
                  <div>Atasan · Celana · Jaket</div>
                  <div className="text-[#BAE6FD]">Ready Stock di Toko</div>
                </div>
              </div>
            </div>

            {/* Dual Curated Collection Frames (4:3) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="group relative overflow-hidden rounded-xl border border-white/20 bg-[#172554] shadow-sm">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <ShowcaseImage
                    src={KOLEKSI_IMPOR}
                    alt="Koleksi Impor Sisstore: jaket tweed, kemeja poplin, dan celana lipit"
                    fallbackTitle="Koleksi Impor Pilihan"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                  <div className="text-xs font-bold text-white">
                    Seri Impor Terpilih
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#E0F2FE]">
                    Jaket tweed, blouse &amp; celana tailored
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-white/20 bg-[#172554] shadow-sm">
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <ShowcaseImage
                    src={KOLEKSI_LOKAL}
                    alt="Koleksi Lokal Sisstore: outer linen sage, rajut tulang, dan celana santai"
                    fallbackTitle="Koleksi Lokal Unggulan"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-[#0F172A]/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                  <div className="text-xs font-bold text-white">
                    Seri Lokal Harian
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#E0F2FE]">
                    Linen, rajut lembut &amp; potongan nyaman
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Hairline-Divided Store Workflow Strip */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/20 border-t border-white/20 pt-4">
            <div className="pr-3">
              <div className="text-xs font-semibold text-white">
                Kasir Multi-Bayar
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[#DBEAFE]">
                Cash, QRIS &amp; Transfer + Struk Thermal
              </div>
            </div>
            <div className="px-3">
              <div className="text-xs font-semibold text-white">
                Harga Jadi Kasir
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[#DBEAFE]">
                Nominal jual fleksibel saat checkout
              </div>
            </div>
            <div className="pl-3">
              <div className="text-xs font-semibold text-white">
                Opname &amp; Sync
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-[#DBEAFE]">
                Audit fisik SKU &amp; Google Sheets
              </div>
            </div>
          </div>
        </div>

        {/* Store Address Footer */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/20 pt-4 text-xs text-[#DBEAFE]">
          <div className="flex items-start gap-1.5 max-w-md">
            <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#BAE6FD]" aria-hidden="true" />
            <span>{storeAddress}</span>
          </div>
          <span className="font-semibold text-white">10.00–21.00 WIB</span>
        </div>
      </div>

      {/* Right Login Card Column */}
      <div className="order-1 lg:order-2 relative overflow-hidden flex items-center justify-center px-5 py-10 sm:px-8 lg:col-span-6 lg:px-14">
        <LoginApparelBackdrop variant="light" />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E5E5E0] bg-white p-6 shadow-md sm:p-8">
          <div className="flex items-start justify-between gap-3">
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
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
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
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] px-2.5 py-1.5 text-xs font-semibold text-[#3F3F3B] transition-colors hover:bg-[#EFEFEA]"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-[#B45309]" aria-hidden="true" />
                    <span>Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#1E3A8A]" aria-hidden="true" />
                    <span>Gelap</span>
                  </>
                )}
              </button>
            )}
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
                placeholder="Masukkan username akun..."
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

          <a
            href="/Panduan-Lengkap-Sisstore.pdf"
            download="Panduan-Lengkap-Sisstore.pdf"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#E5E5E0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1E3A8A] transition-colors hover:bg-[#EFF6FF]"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Unduh Buku Panduan Kasir &amp; Owner (PDF)
          </a>
        </div>
      </div>
    </div>
  );
};
