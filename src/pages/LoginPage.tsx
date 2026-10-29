import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import FormField from '@/components/FormField';
import PasswordInput from '@/components/PasswordInput';
import Button from '@/components/Button';
import Checkbox from '@/components/Checkbox';
import { supabase } from '@/lib/supabase';
import { validateEmail, validateRequired } from '@/utils/validation';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: FormErrors = {
      email: validateEmail(email),
      password: validateRequired(password, 'Password'),
    };
    setErrors(next);
    return !next.email && !next.password;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not sign in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to get ready for your next group ride."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {message && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </p>
        )}

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leadingIcon={<Mail className="h-4.5 w-4.5" />}
          required
        />

        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />

        <div className="flex items-center justify-between">
          <Checkbox
            label="Remember me"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-ridesync-700 transition-colors hover:text-ridesync-800 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-charcoal-muted">
        Don&apos;t have an account?{' '}
        <Link
          to="/signup"
          className="font-semibold text-ridesync-700 transition-colors hover:text-ridesync-800 hover:underline"
        >
          Create one
        </Link>
      </p>

      <div className="mt-4 border-t border-gray-200 pt-4 text-center">
        <Link
          to="/dashboard"
          className="text-xs font-medium text-charcoal-muted transition-colors hover:text-ridesync-700 hover:underline"
        >
          Preview the dashboard (demo)
        </Link>
      </div>
    </AuthLayout>
  );
}
