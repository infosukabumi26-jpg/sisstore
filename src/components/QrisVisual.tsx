import React, { useMemo } from 'react';
import { formatRupiah } from '../utils/calculations';

interface QrisVisualProps {
  merchantName: string;
  merchantId: string;
  amount: number;
  qrisImageUrl?: string;
}

export const QrisVisual: React.FC<QrisVisualProps> = ({
  merchantName,
  merchantId,
  amount,
  qrisImageUrl,
}) => {
  // Deterministic 21x21 QR matrix seeded by merchantId + amount
  const modules = useMemo(() => {
    const size = 21;
    const grid: boolean[][] = Array.from({ length: size }, () =>
      Array(size).fill(false)
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
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    let seed = 0;
    const key = `${merchantId}-${amount}`;
    for (let i = 0; i < key.length; i++) {
      seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder =
          (r < 8 && c < 8) ||
          (r < 8 && c >= size - 8) ||
          (r >= size - 8 && c < 8);
        if (inFinder) continue;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        grid[r][c] = (seed & 1) === 1;
      }
    }

    return grid;
  }, [merchantId, amount]);

  return (
    <div className="rounded-lg border border-[#E5E5E0] bg-[#F7F7F5] p-3">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-3.5">
        <div className="shrink-0 rounded-lg border border-[#E5E5E0] bg-white p-1.5">
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
        </div>
        <div className="mt-3 sm:mt-0">
          <div className="text-xs font-semibold tracking-wide text-[#52524E]">
            {qrisImageUrl ? 'QRIS TOKO TERUNGGAH' : 'QRIS STANDAR INDONESIA'}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-[#141413]">
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
