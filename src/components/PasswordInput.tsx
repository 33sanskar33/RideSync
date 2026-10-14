import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, id, className = '', ...inputProps }, ref) => {
    const [visible, setVisible] = useState(false);
    const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    return (
      <div className="w-full">
        <label htmlFor={fieldId} className="label-base">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? 'text' : 'password'}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={[
              'input-base pr-11',
              error ? 'input-error' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...inputProps}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 transition-colors hover:text-charcoal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            tabIndex={0}
          >
            {visible ? (
              <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
            ) : (
              <Eye className="h-4.5 w-4.5" aria-hidden="true" />
            )}
          </button>
        </div>
        {error ? (
          <p
            id={errorId}
            className="mt-1.5 flex items-start gap-1 text-xs text-red-600"
            role="alert"
          >
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={hintId} className="mt-1.5 text-xs text-charcoal-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
