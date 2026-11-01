import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import FormField from '@/components/FormField';
import PasswordInput from '@/components/PasswordInput';
import Button from '@/components/Button';
import Checkbox from '@/components/Checkbox';
import { supabase } from '@/lib/supabase';
import {
  validateEmail,
  validateRequired,
  validatePassword,
  validatePasswordConfirm,
  getPasswordRequirements,
  isPasswordValid,
} from '@/utils/validation';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  terms?: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [loading, setLoading] = useState(false);

  const requirements = getPasswordRequirements(password);

  function validate(): boolean {
    const next: FormErrors = {
      name: validateRequired(name, 'Full name'),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validatePasswordConfirm(confirm, password),
      terms: terms ? undefined : 'You must acknowledge the terms to continue.',
    };
    if (next.password === undefined && !isPasswordValid(password)) {
      next.password = 'Password does not meet all requirements.';
    }
    setErrors(next);
    return !next.name && !next.email && !next.password && !next.confirm && !next.terms;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      if (data.session) {
        navigate('/dashboard', { replace: true });
      } else {
        setMessage('Account request received. Check your email for the confirmation link before signing in.');
        setMessageType('success');
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not create your account. Please try again.',
      );
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your RideSync account"
      subtitle="Join your riding group in minutes — set up your rider profile below."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {message && (
          <p
            role={messageType === 'error' ? 'alert' : 'status'}
            className={`rounded-lg border px-3 py-2 text-sm ${
              messageType === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message}
          </p>
        )}

        <FormField
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Jordan Rivera"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />

        <PasswordInput
          label="Password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />

        <div className="-mt-1 rounded-lg bg-gray-50 px-3.5 py-3">
          <p className="mb-2 text-xs font-medium text-charcoal-muted">
            Password requirements
          </p>
          <ul className="space-y-1.5">
            {requirements.map((req) => (
              <li
                key={req.label}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  req.met ? 'text-ridesync-700' : 'text-charcoal-muted'
                }`}
              >
                <Check
                  className={`h-3.5 w-3.5 ${req.met ? 'opacity-100' : 'opacity-30'}`}
                  aria-hidden="true"
                  strokeWidth={3}
                />
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />

        <Checkbox
          label={
            <>
              I acknowledge the RideSync Terms of Service and Privacy Policy.
            </>
          }
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          error={errors.terms}
        />
        <p className="pl-7 text-xs leading-relaxed text-charcoal-muted">
          Please read the <Link to="/terms" className="font-semibold text-ridesync-700 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="font-semibold text-ridesync-700 hover:underline">Privacy Policy</Link> before creating your account.
        </p>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-charcoal-muted">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-ridesync-700 transition-colors hover:text-ridesync-800 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
