import { useEffect, useState, type FormEvent } from 'react';
import { User, Mail, Phone, Shield, Save } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Avatar from '@/components/Avatar';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

interface AccountProfile {
  fullName: string;
  email: string;
  phone: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AccountProfile>({
    fullName: '',
    email: '',
    phone: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!data.user) {
          if (active) setError('You are not signed in. Please sign in again.');
          return;
        }

        const user = data.user;
        const fullName =
          typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : user.email?.split('@')[0] ?? '';

        const phone =
          typeof user.user_metadata?.phone === 'string'
            ? user.user_metadata.phone
            : '';

        if (active) {
          setProfile({
            fullName,
            email: user.email ?? '',
            phone,
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load your profile. Please refresh and try again.',
          );
        }
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const initials =
    profile.fullName
      .trim()
      .split(/\\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'R';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const fullName = profile.fullName.trim();
    const phone = profile.phone.trim();

    if (!fullName) {
      setError('Full name is required.');
      return;
    }

    if (fullName.length > 60) {
      setError('Full name must be 60 characters or fewer.');
      return;
    }

    if (phone && !/^[+()\\d\\s-]{7,20}$/.test(phone)) {
      setError('Enter a valid phone number, or leave the field empty.');
      return;
    }

    setSaving(true);
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      });

      if (updateError) throw updateError;

      setProfile((current) => ({
        ...current,
        fullName:
          typeof data.user.user_metadata?.full_name === 'string'
            ? data.user.user_metadata.full_name
            : fullName,
        phone:
          typeof data.user.user_metadata?.phone === 'string'
            ? data.user.user_metadata.phone
            : '',
      }));
      setSuccess('Your profile has been saved.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save your profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-charcoal-muted" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tight text-charcoal sm:text-2xl">
            Profile
          </h1>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-4">
            <Avatar initials={initials} size="lg" />
            <div className="min-w-0">
              <p className="break-words text-base font-semibold text-charcoal">
                {profile.fullName || 'Your name'}
              </p>
              <p className="break-all text-sm text-charcoal-muted">
                {profile.email || 'Loading email…'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {success}
            </p>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <FormField
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              value={profile.fullName}
              onChange={(event) =>
                setProfile((current) => ({ ...current, fullName: event.target.value }))
              }
              maxLength={60}
              leadingIcon={<User className="h-4 w-4" aria-hidden="true" />}
              required
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <FormField
              label="Email"
              type="email"
              autoComplete="email"
              value={profile.email}
              readOnly
              className="bg-gray-50 text-charcoal-muted"
              leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
              hint="Your sign-in email is managed by your account."
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <FormField
              label="Phone number (optional)"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={profile.phone}
              onChange={(event) =>
                setProfile((current) => ({ ...current, phone: event.target.value }))
              }
              maxLength={20}
              leadingIcon={<Phone className="h-4 w-4" aria-hidden="true" />}
              hint="Saved to your account profile; it is not used to verify your phone."
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs font-medium text-charcoal-muted">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Account status
            </div>
            <p className="mt-2 text-sm text-green-700">Signed in with RideSync</p>
          </div>

          <Button type="submit" size="lg" fullWidth loading={saving} disabled={loadingProfile || saving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving profile…' : 'Save changes'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
