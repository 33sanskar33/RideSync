import { useState, useRef, useEffect } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';

interface CopyCodeButtonProps {
  code: string;
  className?: string;
  size?: 'sm' | 'md';
}

type CopyStatus = 'copied' | 'failed' | null;

export default function CopyCodeButton({
  code,
  className = '',
  size = 'md',
}: CopyCodeButtonProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    let success = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        success = true;
      }
    } catch {
      // Try the legacy fallback below when clipboard permissions are denied.
    }

    if (!success) {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        success = document.execCommand('copy');
      } catch {
        success = false;
      } finally {
        document.body.removeChild(textarea);
      }
    }

    setCopyStatus(success ? 'copied' : 'failed');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyStatus(null), 2500);
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
        copyStatus === 'copied'
          ? 'border-ridesync-300 bg-ridesync-50 text-ridesync-700'
          : copyStatus === 'failed'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-gray-300 bg-white text-charcoal-soft hover:bg-gray-50',
        sizeClasses,
        className,
      ].join(' ')}
      aria-label={
        copyStatus === 'copied'
          ? 'Room code copied'
          : copyStatus === 'failed'
            ? 'Could not copy room code'
            : `Copy room code ${code}`
      }
      aria-live="polite"
    >
      {copyStatus === 'copied' ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Copied
        </>
      ) : copyStatus === 'failed' ? (
        <>
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Copy failed
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
