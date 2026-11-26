import React, { useMemo } from 'react';
import { Maximize2, QrCode } from 'lucide-react';
import { formatRupiah } from '../utils/calculations';

interface QrisVisualProps {
  merchantName: string;
  merchantId: string;
  storeName?: string;
  amount: number;
  qrisImageUrl?: string;
  size?: 'compact' | 'large';
  onOpenModal?: () => void;
}

export const QrisVisual: React.FC<QrisVisualProps> = ({
  merchantName,
  merchantId,
  storeName,
  amount,
  qrisImageUrl,
  size = 'compact',
  onOpenModal,
}) => {
  // Deterministic 21x21 QR matrix seeded by merchantId + amount
  const modules = useMemo(() => {
    const gridSize = 21;
    const grid: boolean[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false)
    );

    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[r0 + r][c0 + c] = isBorder || isCenter;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, gridSize - 7);
    drawFinder(gridSize - 7, 0);

    let seed = 0;
    const key = `${merchantId}-${amount}`;
    for (let i = 0; i < key.length; i++) {
      seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const inFinder =
          (r < 8 && c < 8) ||
          (r < 8 && c >= gridSize - 8) ||
          (r >= gridSize - 8 && c < 8);
        if (inFinder) continue;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        grid[r][c] = (seed & 1) === 1;
      }
    }

    return grid;
  }, [merchantId, amount]);

  if (size === 'large') {
    return (
      <div className="qris-paper rounded-xl border border-[#E5E5E0] bg-white p-4 text-center shadow-xs">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A]">
          <QrCode className="h-3.5 w-3.5" aria-hidden="true" />
          {qrisImageUrl ? 'QRIS Resmi Toko' : 'QRIS Standar Indonesia'}
        </div>

        <div className="mt-2">
          <div className="font-display text-base sm:text-lg font-extrabold tracking-tight text-[#141413]">
            {merchantName || storeName || 'SISSTORE'}
          </div>
          {storeName &&
            merchantName &&
            storeName.toLowerCase() !== merchantName.toLowerCase() && (
              <div className="text-xs font-medium text-[#52524E]">
                Merchandise: {storeName}
              </div>
            )}
          <div className="mt-0.5 font-mono text-[11px] text-[#6B6B65]">
            NMID: {merchantId || '-'}
          </div>
        </div>

        <div className="mx-auto mt-3 flex w-fit items-center justify-center rounded-xl border border-[#E5E5E0] bg-white p-2.5 shadow-xs">
          {qrisImageUrl ? (
            <img
              src={qrisImageUrl}
              alt={`Barcode QRIS ${merchantName}`}
              referrerPolicy="no-referrer"
              className="h-44 w-44 sm:h-48 sm:w-48 object-contain rounded"
            />
          ) : (
            <svg
              viewBox="0 0 21 21"
              className="h-40 w-40 sm:h-44 sm:w-44"
              aria-label={`Kode QRIS untuk ${merchantName}`}
              role="img"
            >
              <rect width="21" height="21" fill="#FFFFFF" />
              {modules.map((row, r) =>
                row.map((filled, c) =>
                  filled ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c}
                      y={r}
                      width={1}
                      height={1}
                      fill="#141413"
                    />
                  ) : null
                )
              )}
            </svg>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1E3A8A]">
            Total Pembayaran QRIS
          </div>
          <div className="mt-0.5 font-mono text-xl sm:text-2xl font-extrabold tabular-nums text-[#1E3A8A]">
            {formatRupiah(amount)}
          </div>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-[#52524E]">
          Scan barcode di atas via GoPay, OVO, DANA, ShopeePay, atau Mobile Banking lalu masukkan nominal pembayaran.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-3">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-3.5">
        <button
          type="button"
          onClick={onOpenModal}
          disabled={!onOpenModal}
          aria-label="Perbesar barcode QRIS untuk discan customer"
          className="qris-paper group relative shrink-0 rounded-lg border border-[#E5E5E0] bg-white p-1.5 transition hover:border-[#1E3A8A] disabled:cursor-default"
        >
          {qrisImageUrl ? (
            <img
              src={qrisImageUrl}
              alt={`QRIS ${merchantName}`}
              referrerPolicy="no-referrer"
              className="h-24 w-24 object-contain rounded"
            />
          ) : (
            <svg
              viewBox="0 0 21 21"
              className="h-20 w-20"
              aria-label={`Kode QRIS untuk ${merchantName}`}
              role="img"
            >
              <rect width="21" height="21" fill="#FFFFFF" />
              {modules.map((row, r) =>
                row.map((filled, c) =>
                  filled ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c}
                      y={r}
                      width={1}
                      height={1}
                      fill="#141413"
                    />
                  ) : null
                )
              )}
            </svg>
          )}
          {onOpenModal && (
            <span className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#1E3A8A] group-hover:bg-[#DBEAFE]">
              <Maximize2 className="h-2.5 w-2.5" aria-hidden="true" />
              Perbesar
            </span>
          )}
        </button>
        <div className="mt-3 sm:mt-0 flex-1 min-w-0">
          <div className="text-xs font-semibold tracking-wide text-[#52524E]">
            {qrisImageUrl ? 'QRIS TOKO TERUNGGAH' : 'QRIS STANDAR INDONESIA'}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-[#141413]">
            {merchantName}
          </div>
          <div className="mt-0.5 font-mono text-xs text-[#6B6B65]">
            NMID: {merchantId}
          </div>
          <div className="mt-1.5 font-mono text-base font-bold tabular-nums text-[#1E3A8A]">
            {formatRupiah(amount)}
          </div>
          <p className="mt-1 text-xs text-[#6B6B65]">
            Scan via GoPay, OVO, DANA, ShopeePay, atau Mobile Banking.
          </p>
        </div>
      </div>
    </div>
  );
};
