import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import PasswordInput from '@/components/PasswordInput';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import {
  validatePassword,
  validatePasswordConfirm,
  isPasswordValid,
} from '@/utils/validation';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyRecoverySession() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        setMessage('This reset link is invalid or has expired. Request a new link and open it from your email.');
        setReady(false);
        return;
      }

      setReady(true);
    }

    void verifyRecoverySession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setMessage('');
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');

    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validatePasswordConfirm(confirm, password);
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);

    if (nextPasswordError || nextConfirmError || !isPasswordValid(password)) {
      if (!nextPasswordError && !isPasswordValid(password)) {
        setPasswordError('Use at least 8 characters, including a letter and a number.');
      }
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      window.setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not update your password. Request a new reset link and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your RideSync password has been changed successfully."
      >
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-ridesync-600" aria-hidden="true" />
          <p className="text-sm text-charcoal-muted">Taking you back to sign in…</p>
          <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ridesync-700 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Go to login now
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Create a new password for your RideSync account."
    >
      {!ready ? (
        <div className="space-y-4">
          {message && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
          <Link to="/forgot-password" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ridesync-700 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Request another reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {message && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}

          <PasswordInput
            label="New password"
            autoComplete="new-password"
            placeholder="Enter a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            hint="At least 8 characters, with a letter and a number."
            required
          />

          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Enter the password again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirmError}
            required
          />

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {loading ? 'Updating password…' : 'Update password'}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-ridesync-700 hover:underline">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
