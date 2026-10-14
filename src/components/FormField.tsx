import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Pass a trailing element like a password toggle button */
  trailing?: ReactNode;
  /** Render an icon before the input text */
  leadingIcon?: ReactNode;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      hint,
      trailing,
      leadingIcon,
      id,
      className = '',
      ...inputProps
    },
    ref,
  ) => {
    const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    return (
      <div className="w-full">
        <label htmlFor={fieldId} className="label-base">
          {label}
        </label>
        <div className="relative">
          {leadingIcon && (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            >
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={fieldId}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={[
              'input-base',
              leadingIcon ? 'pl-10' : '',
              trailing ? 'pr-11' : '',
              error ? 'input-error' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...inputProps}
          />
          {trailing && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2">
              {trailing}
            </span>
          )}
        </div>
        {error ? (
          <p
            id={errorId}
            className="mt-1.5 flex items-start gap-1 text-xs text-red-600"
            role="alert"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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

FormField.displayName = 'FormField';

export default FormField;
