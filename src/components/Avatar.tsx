interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export default function Avatar({
  initials,
  size = 'md',
  className = '',
}: AvatarProps) {
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full bg-ridesync-100 font-semibold text-ridesync-700 select-none',
        sizeClasses[size],
        className,
      ].join(' ')}
      aria-hidden="true"
    >
      {initials.toUpperCase()}
    </span>
  );
}
