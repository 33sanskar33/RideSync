/** Shared validation utilities for auth forms */

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | undefined {
  if (!value.trim()) return 'Email is required.';
  if (!emailRegex.test(value.trim())) return 'Enter a valid email address.';
  return undefined;
}

export function validateRequired(
  value: string,
  fieldName: string,
): string | undefined {
  if (!value.trim()) return `${fieldName} is required.`;
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Password is required.';
  if (value.length < 8)
    return 'Password must be at least 8 characters long.';
  return undefined;
}

export function validatePasswordConfirm(
  value: string,
  original: string,
): string | undefined {
  if (!value) return 'Please confirm your password.';
  if (value !== original) return 'Passwords do not match.';
  return undefined;
}

/** Check which password requirements are met — used for the live checklist */
export function getPasswordRequirements(password: string) {
  return [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Contains a letter',
      met: /[a-zA-Z]/.test(password),
    },
    {
      label: 'Contains a number',
      met: /\d/.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return getPasswordRequirements(password).every((req) => req.met);
}
