import React from 'react';

interface ApparelBackdropProps {
  variant?: 'light' | 'showcase';
}

type GarmentKind = 'baju' | 'celana' | 'jaket' | 'kemeja';

const GarmentVector: React.FC<{ kind: GarmentKind; className?: string }> = ({
  kind,
  className = 'h-16 w-16',
}) => {
  if (kind === 'baju') {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Boxy T-Shirt / Baju */}
        <path
          d="M25 14L12 24L18 35L24 31V65H56V31L62 35L68 24L55 14C51 18 46 20 40 20C34 20 29 18 25 14Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M31 16C33.5 21 36.5 23 40 23C43.5 23 46.5 21 49 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M24 58H56"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === 'celana') {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Tailored Trousers / Celana */}
        <path
          d="M23 12H57L60 67H45L40 36L35 67H20L23 12Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23 19H57"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M40 19V30"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M23 27C27 27 30 24 31 19M57 27C53 27 50 24 49 19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M34 12V19M46 12V19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === 'jaket') {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Fashion Jacket / Jaket */}
        <path
          d="M27 13L13 23L10 49L20 51L23 32V66H57V32L60 51L70 49L67 23L53 13L46 18H34L27 13Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M40 18V66"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M27 13L33 25L40 21M53 13L47 25L40 21"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M27 46H34M46 46H53M23 61H57"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Blouse / Kemeja Wanita */}
      <path
        d="M28 13L14 21L10 47L20 49L24 31V65H56V31L60 49L70 47L66 21L52 13C49 18 45 20 40 20C35 20 31 18 28 13Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 20V65"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="40" cy="30" r="1.6" fill="currentColor" />
      <circle cx="40" cy="40" r="1.6" fill="currentColor" />
      <circle cx="40" cy="50" r="1.6" fill="currentColor" />
    </svg>
  );
};

interface LaneConfig {
  topClass: string;
  durationClass: string;
  reverse?: boolean;
  items: Array<{
    kind: GarmentKind;
    sizeClass: string;
    tiltClass: string;
    toneClass: string;
  }>;
}

const RIGHT_PANEL_LANES: LaneConfig[] = [
  {
    topClass: 'top-[4%]',
    durationClass: 'apparel-marquee-slow',
    items: [
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: '-rotate-6', toneClass: 'login-vector-navy' },
      { kind: 'celana', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'jaket', sizeClass: 'h-20 w-20', tiltClass: '-rotate-3', toneClass: 'login-vector-navy' },
      { kind: 'kemeja', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'baju', sizeClass: 'h-14 w-14', tiltClass: '-rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'celana', sizeClass: 'h-16 w-16', tiltClass: 'rotate-3', toneClass: 'login-vector-navy' },
    ],
  },
  {
    topClass: 'top-[27%]',
    durationClass: 'apparel-marquee-medium',
    reverse: true,
    items: [
      { kind: 'jaket', sizeClass: 'h-18 w-18', tiltClass: 'rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: '-rotate-6', toneClass: 'login-vector-navy' },
      { kind: 'celana', sizeClass: 'h-18 w-18', tiltClass: 'rotate-3', toneClass: 'login-vector-navy' },
      { kind: 'kemeja', sizeClass: 'h-16 w-16', tiltClass: '-rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'jaket', sizeClass: 'h-16 w-16', tiltClass: 'rotate-3', toneClass: 'login-vector-navy' },
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: '-rotate-3', toneClass: 'login-vector-ink' },
    ],
  },
  {
    topClass: 'top-[54%]',
    durationClass: 'apparel-marquee-fast',
    items: [
      { kind: 'celana', sizeClass: 'h-18 w-18', tiltClass: '-rotate-6', toneClass: 'login-vector-navy' },
      { kind: 'jaket', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'baju', sizeClass: 'h-20 w-20', tiltClass: '-rotate-3', toneClass: 'login-vector-navy' },
      { kind: 'celana', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'kemeja', sizeClass: 'h-18 w-18', tiltClass: '-rotate-6', toneClass: 'login-vector-navy' },
      { kind: 'jaket', sizeClass: 'h-16 w-16', tiltClass: 'rotate-3', toneClass: 'login-vector-ink' },
    ],
  },
  {
    topClass: 'top-[79%]',
    durationClass: 'apparel-marquee-medium',
    reverse: true,
    items: [
      { kind: 'kemeja', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'celana', sizeClass: 'h-18 w-18', tiltClass: '-rotate-6', toneClass: 'login-vector-navy' },
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: 'rotate-3', toneClass: 'login-vector-ink' },
      { kind: 'jaket', sizeClass: 'h-20 w-20', tiltClass: '-rotate-6', toneClass: 'login-vector-navy' },
      { kind: 'celana', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'login-vector-ink' },
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: '-rotate-3', toneClass: 'login-vector-navy' },
    ],
  },
];

const SHOWCASE_LANES: LaneConfig[] = [
  {
    topClass: 'top-[8%]',
    durationClass: 'apparel-marquee-slow',
    items: [
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: '-rotate-6', toneClass: 'text-white/[0.11]' },
      { kind: 'celana', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'text-[#BAE6FD]/[0.15]' },
      { kind: 'jaket', sizeClass: 'h-18 w-18', tiltClass: '-rotate-3', toneClass: 'text-white/[0.11]' },
      { kind: 'kemeja', sizeClass: 'h-16 w-16', tiltClass: 'rotate-3', toneClass: 'text-[#BAE6FD]/[0.15]' },
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: '-rotate-6', toneClass: 'text-white/[0.11]' },
      { kind: 'celana', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'text-[#BAE6FD]/[0.15]' },
    ],
  },
  {
    topClass: 'top-[62%]',
    durationClass: 'apparel-marquee-medium',
    reverse: true,
    items: [
      { kind: 'jaket', sizeClass: 'h-18 w-18', tiltClass: 'rotate-6', toneClass: 'text-[#BAE6FD]/[0.15]' },
      { kind: 'baju', sizeClass: 'h-16 w-16', tiltClass: '-rotate-6', toneClass: 'text-white/[0.11]' },
      { kind: 'celana', sizeClass: 'h-18 w-18', tiltClass: 'rotate-3', toneClass: 'text-white/[0.11]' },
      { kind: 'kemeja', sizeClass: 'h-16 w-16', tiltClass: '-rotate-3', toneClass: 'text-[#BAE6FD]/[0.15]' },
      { kind: 'jaket', sizeClass: 'h-16 w-16', tiltClass: 'rotate-6', toneClass: 'text-white/[0.11]' },
      { kind: 'celana', sizeClass: 'h-16 w-16', tiltClass: '-rotate-6', toneClass: 'text-[#BAE6FD]/[0.15]' },
    ],
  },
];

export const LoginApparelBackdrop: React.FC<ApparelBackdropProps> = ({
  variant = 'light',
}) => {
  const lanes = variant === 'showcase' ? SHOWCASE_LANES : RIGHT_PANEL_LANES;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {lanes.map((lane, laneIdx) => (
        <div
          key={laneIdx}
          className={`absolute inset-x-0 ${lane.topClass} flex w-max ${
            lane.reverse ? 'apparel-track-reverse' : 'apparel-track'
          } ${lane.durationClass}`}
        >
          {/* Duplicated group for seamless infinite horizontal loop */}
          {[0, 1].map((dupIdx) => (
            <div
              key={dupIdx}
              className="flex shrink-0 items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
            >
              {lane.items.map((item, itemIdx) => (
                <div
                  key={`${dupIdx}-${itemIdx}`}
                  className={`apparel-bob ${item.tiltClass} ${item.toneClass}`}
                  style={{ animationDelay: `${(itemIdx % 4) * -1.1}s` }}
                >
                  <GarmentVector kind={item.kind} className={item.sizeClass} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
