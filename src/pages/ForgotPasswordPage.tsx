import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { validateEmail } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not send the reset email. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setEmail('');
    setError(undefined);
    setSuccess(false);
  }

  if (success) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="If an account exists for that email, a password reset link will arrive shortly."
      >
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ridesync-50">
            <CheckCircle2 className="h-7 w-7 text-ridesync-600" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-charcoal">
            Reset email requested
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">
            Check the inbox for <span className="font-medium text-charcoal-soft">{email}</span>,
            including the spam folder. Open the link on this device to choose a new password.
          </p>

          <div className="mt-6 space-y-3">
            <Button variant="secondary" size="lg" fullWidth onClick={handleReset}>
              Try a different email
            </Button>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-ridesync-700 transition-colors hover:text-ridesync-800 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a secure reset link."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leadingIcon={<Mail className="h-4.5 w-4.5" />}
          required
        />

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ridesync-700 transition-colors hover:text-ridesync-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
