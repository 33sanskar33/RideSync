import { useEffect, useState, type FormEvent } from 'react';
import { Settings, Bell, MapPin, Moon, Globe, Gauge, Save } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import DeleteAccountSection from '@/components/DeleteAccountSection';
import { supabase } from '@/lib/supabase';

type DistanceUnit = 'km' | 'mi';

export default function SettingsPage() {
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!data.user) throw new Error('You are not signed in. Please sign in again.');

        const savedUnit = data.user.user_metadata?.distance_unit;
        if (active && (savedUnit === 'km' || savedUnit === 'mi')) {
          setDistanceUnit(savedUnit);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load your settings. Please refresh and try again.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPreferences();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { distance_unit: distanceUnit },
      });
      if (updateError) throw updateError;
      setSuccess('Your preferences have been saved.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save your settings. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  const futureSettings = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Ride invites and departure reminders are not available yet.',
    },
    {
      icon: MapPin,
      title: 'Location sharing',
      description: 'GPS sharing is controlled by the browser permission while a ride room is open.',
    },
    {
      icon: Moon,
      title: 'Appearance',
      description: 'Theme selection is not available yet.',
    },
    {
      icon: Globe,
      title: 'Language',
      description: 'RideSync currently uses English.',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <Settings className="h-5 w-5 text-charcoal-muted" aria-hidden="true" />
          <h1 className="text-xl font-bold tracking-tight text-charcoal sm:text-2xl">
            Settings
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ridesync-50 text-ridesync-700">
                <Gauge className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-charcoal">Distance units</h2>
                <p className="mt-1 text-xs leading-relaxed text-charcoal-muted">
                  Choose how route distances are displayed. This preference is saved to your RideSync account.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Distance units">
              <button
                type="button"
                role="radio"
                aria-checked={distanceUnit === 'km'}
                disabled={loading || saving}
                onClick={() => { setDistanceUnit('km'); setSuccess(''); }}
                className={[
                  'rounded-xl border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500',
                  distanceUnit === 'km'
                    ? 'border-ridesync-500 bg-ridesync-50 text-ridesync-800'
                    : 'border-gray-200 bg-white text-charcoal-soft hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="block text-lg font-bold">Kilometres</span>
                <span className="mt-1 block text-xs">km · metric</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={distanceUnit === 'mi'}
                disabled={loading || saving}
                onClick={() => { setDistanceUnit('mi'); setSuccess(''); }}
                className={[
                  'rounded-xl border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500',
                  distanceUnit === 'mi'
                    ? 'border-ridesync-500 bg-ridesync-50 text-ridesync-800'
                    : 'border-gray-200 bg-white text-charcoal-soft hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="block text-lg font-bold">Miles</span>
                <span className="mt-1 block text-xs">mi · imperial</span>
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              className="mt-4"
              loading={saving}
              disabled={loading || saving}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {saving ? 'Saving preferences…' : 'Save settings'}
            </Button>
          </section>
        </form>

        <section className="mt-5 space-y-3" aria-label="Other settings">
          <h2 className="px-1 text-sm font-semibold text-charcoal">Other preferences</h2>
          {futureSettings.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3.5 rounded-xl border border-gray-200 bg-white p-5 shadow-card"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-charcoal-muted">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-charcoal">{item.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-charcoal-muted">{item.description}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-muted">
                  Soon
                </span>
              </div>
            );
          })}
        </section>

        <DeleteAccountSection />
      </div>
    </DashboardLayout>
  );
}
