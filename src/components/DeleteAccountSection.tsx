import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function DeleteAccountSection() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmation !== 'DELETE') return;
    setError('');
    setDeleting(true);
    try {
      const { error: functionError } = await supabase.functions.invoke('delete-account', {
        body: { confirmation },
      });
      if (functionError) throw functionError;
      await supabase.auth.signOut({ scope: 'local' });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account deletion failed. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-red-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-red-800">Delete account</h2>
          <p className="mt-1 text-xs leading-relaxed text-charcoal-muted">
            Permanently delete your RideSync account, profile, personal location records and push subscriptions.
            Rooms you created will remain for the group, be marked ended and have your creator identity removed.
            Your membership, messages and SOS records linked to your account will be deleted.
          </p>
        </div>
      </div>

      <label htmlFor="delete-account-confirmation" className="mt-5 block text-xs font-semibold text-charcoal">
        Type DELETE to confirm
      </label>
      <input
        id="delete-account-confirmation"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        disabled={deleting}
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-charcoal outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
        placeholder="DELETE"
      />

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Button
        type="button"
        size="lg"
        fullWidth
        variant="secondary"
        className="mt-4 border-red-300 text-red-700 hover:bg-red-50"
        loading={deleting}
        disabled={confirmation !== 'DELETE' || deleting}
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {deleting ? 'Deleting account…' : 'Permanently delete my account'}
      </Button>
      <p className="mt-2 text-xs leading-relaxed text-charcoal-muted">
        This action cannot be undone. Sign in again with a new account if you want to use RideSync later.
      </p>
    </section>
  );
}
