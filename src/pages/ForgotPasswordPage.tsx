import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import { validateEmail } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    setError(err);
    if (err) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSuccess(true);
  }

  function handleReset() {
    setEmail('');
    setError(undefined);
    setSuccess(false);
  }

  if (success) {
    return (
      <AuthLayout
        title="Reset your password"
        subtitle="Enter your email to receive a reset link."
      >
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-ridesync-50">
            <CheckCircle2
              className="h-7 w-7 text-ridesync-600"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-lg font-semibold text-charcoal">
            Reset link ready
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">
            This is a frontend-only demo — no reset email was sent. In the full
            application, a password reset link would be delivered to{' '}
            <span className="font-medium text-charcoal-soft">
              {email || 'your email'}
            </span>
            .
          </p>

          <div className="mt-6 space-y-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleReset}
            >
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
      subtitle="Enter your email and we'll send you a link to reset it."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
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
