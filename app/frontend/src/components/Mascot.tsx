'use client'

interface Props {
  blink: boolean
  scan: boolean
}

export default function Mascot({ blink, scan }: Props) {
  return (
    <svg className="mascot-svg" viewBox="0 0 120 120" aria-label="Satya, the inspector">
      <defs>
        <radialGradient id="lens" cx="42%" cy="38%" r="70%">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="60%"  stopColor="#EAF1FE" />
          <stop offset="100%" stopColor="#D6E2FB" />
        </radialGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3D6CF0" />
          <stop offset="100%" stopColor="#1B43C0" />
        </linearGradient>
      </defs>

      {/* floor shadow */}
      <ellipse cx="56" cy="108" rx="30" ry="4" fill="#0E1626" opacity=".10" />

      {/* handle */}
      <g style={{
        transformOrigin: '56px 56px',
        transform: scan ? 'rotate(8deg)' : 'rotate(-4deg)',
        transition: 'transform .6s cubic-bezier(.4,1.4,.5,1)',
      }}>
        <rect x="82" y="82" width="30" height="12" rx="6" transform="rotate(45 82 82)" fill="#1B43C0" />
        <rect x="84" y="86" width="26" height="4"  rx="2" transform="rotate(45 84 86)" fill="#5C82E8" opacity=".55" />
      </g>

      {/* lens rim + glass */}
      <circle cx="50" cy="50" r="38" fill="url(#rim)" />
      <circle cx="50" cy="50" r="30" fill="url(#lens)" />

      {/* face */}
      <g style={{
        transformOrigin: '50px 50px',
        transform: scan ? 'translateX(2px)' : 'translateX(-2px)',
        transition: 'transform .55s ease',
      }}>
        {/* left eye */}
        <g style={{
          transformOrigin: '40px 46px',
          transform: blink ? 'scaleY(.08)' : 'scaleY(1)',
          transition: 'transform .12s ease',
        }}>
          <circle cx="40" cy="46" r="4.2" fill="#0E1626" />
          <circle cx="41.4" cy="44.6" r="1.2" fill="#FFFFFF" />
        </g>
        {/* right eye */}
        <g style={{
          transformOrigin: '58px 46px',
          transform: blink ? 'scaleY(.08)' : 'scaleY(1)',
          transition: 'transform .12s ease',
        }}>
          <circle cx="58" cy="46" r="4.2" fill="#0E1626" />
          <circle cx="59.4" cy="44.6" r="1.2" fill="#FFFFFF" />
        </g>
        {/* cheeks */}
        <circle cx="36" cy="58" r="3" fill="#F2A6B0" opacity=".55" />
        <circle cx="62" cy="58" r="3" fill="#F2A6B0" opacity=".55" />
        {/* smile */}
        <path d="M42 58 Q49 65 56 58" stroke="#0E1626" strokeWidth="2.2"
              strokeLinecap="round" fill="none" />
      </g>

      {/* sparkle */}
      <g style={{
        transformOrigin: '32px 34px',
        transform: scan ? 'scale(1.15)' : 'scale(.7)',
        transition: 'transform .5s cubic-bezier(.4,1.6,.5,1)',
        opacity: scan ? 1 : .6,
      }}>
        <circle cx="32" cy="34" r="2.6" fill="#FFFFFF" />
        <circle cx="32" cy="34" r="1.2" fill="#A8C2F8" />
      </g>
    </svg>
  )
}
