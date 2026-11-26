/**
 * Khedma brand mark — a wrench-shaped K on a clay tile with an olive spark.
 * Deliberately a little odd: the spark breaks the monogram, the tile is warm.
 */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="khedma-mark" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA580C" />
          <stop offset="0.55" stopColor="#C2410C" />
          <stop offset="1" stopColor="#7C2D12" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#khedma-mark)" />
      <rect
        x="2.75"
        y="2.75"
        width="34.5"
        height="34.5"
        rx="9.75"
        fill="none"
        stroke="#FFF7ED"
        strokeOpacity="0.22"
      />
      <path
        d="M12.2 11.4v17.2"
        stroke="#FFF7ED"
        strokeWidth="4.3"
        strokeLinecap="round"
      />
      <path
        d="M13.5 20.3 22.6 11.2M13.5 20.3l9.1 9.1"
        stroke="#FFF7ED"
        strokeWidth="4.3"
        strokeLinecap="round"
      />
      <path
        d="M31.4 6.4l.85 2.05 2.05.85-2.05.85-.85 2.05-.85-2.05-2.05-.85 2.05-.85z"
        fill="#D9F99D"
      />
    </svg>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.045em] ${className}`}>
      khedma<span className="text-[#EA580C]">.</span>
    </span>
  );
}
