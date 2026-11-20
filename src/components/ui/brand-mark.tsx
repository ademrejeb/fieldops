export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="fieldops-mark" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="0.6" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#fieldops-mark)" />
      <path
        d="M9 21.5c0-5.5 4.5-4.8 6.6-8.6 1.3-2.4 4.1-3.2 7.4-3.4"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="9" cy="21.5" r="2.2" fill="#fff" />
      <circle cx="23" cy="9.5" r="2.2" fill="#fff" />
    </svg>
  );
}
