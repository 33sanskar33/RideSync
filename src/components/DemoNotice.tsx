import { Info } from 'lucide-react';

interface DemoNoticeProps {
  message: string;
}

/**
 * A clearly-labelled banner that indicates the form was submitted in a
 * frontend-only prototype context. It never claims real authentication
 * or email delivery occurred.
 */
export default function DemoNotice({ message }: DemoNoticeProps) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border border-ridesync-200 bg-ridesync-50 px-3.5 py-3"
      role="status"
      aria-live="polite"
    >
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-ridesync-600"
        aria-hidden="true"
      />
      <p className="text-xs leading-relaxed text-ridesync-800">{message}</p>
    </div>
  );
}
