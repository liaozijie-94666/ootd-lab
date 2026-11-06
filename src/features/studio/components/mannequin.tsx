export function Mannequin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 460"
      className={className}
      role="img"
      aria-label="人台模型"
      fill="none"
    >
      <defs>
        <linearGradient id="mannequin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe7db" />
          <stop offset="100%" stopColor="#ddd0bf" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="66" r="34" fill="url(#mannequin)" stroke="#cbbcaa" strokeWidth="2" />
      <path
        d="M160 104c-34 0-52 26-52 62l-2 96h20l6 88h18l8-108h4l8 108h18l6-88h20l-2-96c0-36-18-62-52-62Z"
        fill="url(#mannequin)"
        stroke="#cbbcaa"
        strokeWidth="2"
      />
      <path d="M160 120v210" stroke="#c9b9a6" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.7" />
      <path d="M124 300h72" stroke="#c9b9a6" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.5" />
    </svg>
  )
}
