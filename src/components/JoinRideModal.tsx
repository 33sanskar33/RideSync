import { useState, type FormEvent } from 'react';
import { KeyRound, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import FormField from './FormField';
import { normalizeRoomCode } from '@/utils/demoRoomStore';

import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';



interface JoinRideModalProps {
  open: boolean;
  onClose: () => void;
}

export default function JoinRideModal({ open, onClose }: JoinRideModalProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [riderName, setRiderName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleClose() {
    setCode('');
    setError(undefined);
    setSubmitted(false);
    setLoading(false);
    onClose();
  }

  

async function handleSubmit(e: FormEvent) {
  e.preventDefault();

  const normalized = normalizeRoomCode(code);
  const name = riderName.trim();

  if (!name) {
    setError('Please enter your name.');
    return;
  }

  if (!normalized) {
    setError('Please enter a room code to join a ride.');
    return;
  }

  if (!/^[A-Z0-9-]{4,}$/.test(normalized)) {
    setError('Invalid room code. Please check and try again.');
    return;
  }

  setError(undefined);
  setLoading(true);

  try {
    const { data: joinedRooms, error: joinError } = await supabase.rpc(
      'join_ride_room_by_code',
      {
        requested_room_code: normalized,
        requested_rider_name: name,
      },
    );

    if (joinError) throw joinError;

    const joinedRoom = joinedRooms?.[0];
    if (!joinedRoom) {
      setError('No ride found with this code. Check with the organiser.');
      return;
    }

    handleClose();
    navigate(`/room/${joinedRoom.joined_room_id}`, {
  state: { riderName: name },
});
  } catch (err) {
    console.error('Join ride failed:', err);
    setError('Could not join the ride. Please try again.');
  } finally {
    setLoading(false);
  }
}



  return (
    <Modal open={open} onClose={handleClose} title="Join a Ride">
      {submitted ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-amber-800">
              Joining rooms across devices will be enabled when RideSync&apos;s
              backend is connected. You have not joined a ride — no room
              connection was made.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-charcoal-soft transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500 focus-visible:ring-offset-2"
          >
            Back to dashboard
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-ridesync-50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ridesync-100 text-ridesync-700">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-charcoal">
                Enter a room code
              </p>
              <p className="text-xs text-charcoal-muted">
                Ask the ride organiser for the code to join their group.
              </p>
            </div>
          </div>

          <FormField
  label="Your name"
  type="text"
  placeholder="Enter your rider name"
  value={riderName}
  onChange={(e) => setRiderName(e.target.value)}
  required
/>

          <FormField
            label="Room code"
            type="text"
            placeholder="e.g. RIDE-4F8K"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error}
            autoComplete="off"
            required
          />

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {loading ? 'Joining…' : 'Join ride'}
          </Button>

          <button
            type="button"
            onClick={handleClose}
            className="w-full text-center text-sm font-medium text-charcoal-muted transition-colors hover:text-charcoal-soft"
          >
            Cancel
          </button>
        </form>
      )}
    </Modal>
  );
}
