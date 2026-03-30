export default function BuoyLogo({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Beacon/light at top */}
      <circle cx="50" cy="8" r="5" fill="#0f1b4c" />
      <rect x="48" y="13" width="4" height="4" fill="#0f1b4c" />

      {/* Tower structure */}
      <polygon points="42,55 50,17 58,55" fill="none" stroke="#0f1b4c" strokeWidth="3" />
      {/* Cross braces */}
      <line x1="44" y1="35" x2="56" y2="35" stroke="#0f1b4c" strokeWidth="2.5" />
      <line x1="45" y1="28" x2="55" y2="42" stroke="#0f1b4c" strokeWidth="2" />
      <line x1="55" y1="28" x2="45" y2="42" stroke="#0f1b4c" strokeWidth="2" />
      <line x1="43" y1="45" x2="57" y2="45" stroke="#0f1b4c" strokeWidth="2.5" />

      {/* Hull / platform */}
      <path d="M32,55 L68,55 L64,62 L36,62 Z" fill="#0f1b4c" />

      {/* Wave 1 (top wave) */}
      <path
        d="M15,68 C25,60 35,60 45,68 C55,76 65,76 85,68"
        stroke="#0f1b4c"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Wave 2 (bottom wave) */}
      <path
        d="M10,80 C22,72 32,72 44,80 C56,88 66,88 90,80"
        stroke="#0f1b4c"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
