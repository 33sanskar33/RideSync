import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function PushNotificationSettings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!data.user) throw new Error('Sign in again to manage notifications.');

        if (!active) return;
        setUserId(data.user.id);

        const canPush =
          'Notification' in window &&
          'serviceWorker' in navigator &&
          'PushManager' in window;

        setSupported(canPush);
        if (!canPush) return;

        setPermission(Notification.permission);
        const registration = await navigator.serviceWorker.getRegistration('/');
        const subscription = await registration?.pushManager.getSubscription();

        if (!subscription) {
          if (active) setEnabled(false);
          return;
        }

        const { data: savedSubscription, error: subscriptionError } = await supabase
          .from('ride_push_subscriptions')
          .select('endpoint')
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (subscriptionError) throw subscriptionError;
        if (active) setEnabled(Boolean(savedSubscription));
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not check notification settings. Please refresh.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  async function enableNotifications() {
    if (!userId) {
      setError('Sign in again before enabling notifications.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!supported) throw new Error('This browser does not support background push notifications.');

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        throw new Error('Notifications are blocked. Allow notifications for RideSync in your browser settings, then try again.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-public-key');
      if (vapidError) throw new Error(`Could not load push configuration: ${vapidError.message}`);

      const vapidPublicKey = vapidData?.publicKey;
      if (typeof vapidPublicKey !== 'string' || !vapidPublicKey) {
        throw new Error('Push notifications are not configured on the server yet.');
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const existingKey = subscription.options.applicationServerKey;
        const sameKey = Boolean(
          existingKey &&
          existingKey.byteLength === applicationServerKey.byteLength &&
          new Uint8Array(existingKey).every((value, index) => value === applicationServerKey[index])
        );

        if (!sameKey) {
          const oldEndpoint = subscription.endpoint;
          await subscription.unsubscribe();
          const { error: removeError } = await supabase
            .from('ride_push_subscriptions')
            .delete()
            .eq('endpoint', oldEndpoint)
            .eq('user_id', userId);
          if (removeError) throw removeError;
          subscription = null;
        }
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys;
      if (!subscriptionJson.endpoint || !keys?.p256dh || !keys.auth) {
        throw new Error('The browser did not return a complete push subscription.');
      }

      const { error: saveError } = await supabase.from('ride_push_subscriptions').upsert({
        user_id: userId,
        endpoint: subscriptionJson.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      if (saveError) throw saveError;

      setEnabled(true);
      setSuccess('SOS push notifications are enabled on this device.');
    } catch (enableError) {
      console.error('Enable SOS notifications failed:', enableError);
      setError(
        enableError instanceof Error
          ? enableError.message
          : 'Could not enable notifications. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function disableNotifications() {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription && userId) {
        const { error: removeError } = await supabase
          .from('ride_push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', userId);

        if (removeError) throw removeError;
        await subscription.unsubscribe();
      }

      setEnabled(false);
      setSuccess('SOS push notifications are disabled on this device.');
    } catch (disableError) {
      console.error('Disable SOS notifications failed:', disableError);
      setError(
        disableError instanceof Error
          ? disableError.message
          : 'Could not disable notifications. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ridesync-50 text-ridesync-700">
          {enabled ? <Bell className="h-5 w-5" aria-hidden="true" /> : <BellOff className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-charcoal">SOS push notifications</h2>
          <p className="mt-1 text-xs leading-relaxed text-charcoal-muted">
            Receive emergency alerts from your ride groups on this device, even when RideSync is closed.
            Browser permission is required.
          </p>
        </div>
        {enabled && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            On
          </span>
        )}
      </div>

      {!supported && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This browser does not support background push notifications. Try installing RideSync on a supported browser.
        </p>
      )}

      {supported && permission === 'denied' && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Notifications are blocked by your browser. Change RideSync's notification permission in site settings, then return here.
        </p>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{success}</p>}

      <div className="mt-4">
        <Button
          type="button"
          size="lg"
          fullWidth
          variant="secondary"
          loading={saving}
          disabled={loading || saving || !supported || (!enabled && permission === 'denied')}
          onClick={enabled ? disableNotifications : enableNotifications}
        >
          {enabled ? 'Turn off SOS notifications on this device' : 'Enable SOS notifications on this device'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-charcoal-muted">
        This setting applies only to the current browser or installed app. Other devices have their own notification settings.
      </p>
    </section>
  );
}
