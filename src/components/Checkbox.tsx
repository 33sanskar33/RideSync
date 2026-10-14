import type { InputHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  error?: string;
}

export default function Checkbox({
  label,
  error,
  id,
  className = '',
  ...rest
}: CheckboxProps) {
  const fieldId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className="w-full">
      <div className="flex items-start gap-2.5">
        <div className="relative flex shrink-0 items-center pt-0.5">
          <input
            type="checkbox"
            id={fieldId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded border border-gray-300 bg-white transition-colors checked:border-ridesync-600 checked:bg-ridesync-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500 focus-visible:ring-offset-1"
            {...rest}
          />
          <Check
            className="pointer-events-none absolute left-0.5 top-0.5 h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100"
            aria-hidden="true"
            strokeWidth={3}
          />
        </div>
        <label
          htmlFor={fieldId}
          className="cursor-pointer text-sm leading-relaxed text-charcoal-soft"
        >
          {label}
        </label>
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1.5 pl-7 text-xs text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
