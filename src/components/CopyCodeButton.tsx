import { useState, useRef, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyCodeButtonProps {
  code: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function CopyCodeButton({
  code,
  className = '',
  size = 'md',
}: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for restricted clipboard environments
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {
        // Clipboard not available — silent fail, user can read the code
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }

  const sizeClasses =
    size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : 'h-10 px-4 text-sm gap-2';

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={[
        'inline-flex items-center justify-center rounded-lg border font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500 focus-visible:ring-offset-2',
        copied
          ? 'border-ridesync-300 bg-ridesync-50 text-ridesync-700'
          : 'border-gray-300 bg-white text-charcoal-soft hover:bg-gray-50',
        sizeClasses,
        className,
      ].join(' ')}
      aria-label={`Copy room code ${code}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy code
        </>
      )}
    </button>
  );
}
