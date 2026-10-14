interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 44, text: 'text-2xl' },
};

export default function Logo({
  className = '',
  showWordmark = true,
  size = 'md',
}: LogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span
        className="flex shrink-0 items-center justify-center rounded-xl bg-ridesync-600 text-white shadow-sm"
        style={{ width: icon, height: icon }}
        aria-hidden="true"
      >
        <svg
          width={icon * 0.55}
          height={icon * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Route/pin-inspired mark: a curving road with a destination pin */}
          <path
            d="M5 21C5 17 9 15 12 12C15 9 14 6 12 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="12" cy="4" r="2" fill="currentColor" />
          <circle cx="5" cy="21" r="1.5" fill="currentColor" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={`font-bold tracking-tight text-charcoal ${text}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          Ride<span className="text-ridesync-600">Sync</span>
        </span>
      )}
    </div>
  );
}
