import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, MapPin, Info, Check, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import FormField from './FormField';
import CopyCodeButton from './CopyCodeButton';
import { createDemoRoom, type DemoRoom } from '@/utils/demoRoomStore';
import { supabase } from '@/lib/supabase';

interface CreateRideModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormErrors {
  name?: string;
}

export default function CreateRideModal({ open, onClose }: CreateRideModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState<DemoRoom | null>(null);

  function handleClose() {
    setName('');
    setDestination('');
    setErrors({});
    setLoading(false);
    setRoom(null);
    onClose();
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) {
      next.name = 'Ride name is required.';
    } else if (name.trim().length < 3) {
      next.name = 'Ride name must be at least 3 characters.';
    } else if (name.trim().length > 60) {
      next.name = 'Ride name must be 60 characters or fewer.';
    }
    setErrors(next);
    return !next.name;
  }

  
async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  if (!validate()) return;

  setLoading(true);

  try {
    const segment = () =>
      Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');

    const code = `RIDE-${segment()}`;

    const { data, error } = await supabase
      .from('ride_rooms')
      .insert({
        room_code: code,
        ride_name: name.trim(),
        destination: destination.trim() || null,
      })
      .select('id, room_code, ride_name, destination, created_at')
      .single();

    if (error) throw error;

    setRoom({
      id: data.id,
      code: data.room_code,
      name: data.ride_name,
      destination: data.destination ?? '',
      createdAt: new Date(data.created_at).getTime(),
    });
  } catch (error) {
    console.error('Create ride failed:', error);
    alert(
      error instanceof Error
        ? error.message
        : 'Could not create ride. Please try again.'
    );
  } finally {
    setLoading(false);
  }
}


  function handleGoToRoom() {
    if (!room) return;
    handleClose();
    navigate(`/room/${room.id}`);
  }

  // Success state — room created
  if (room) {
    return (
      <Modal open={open} onClose={handleClose} title="Room created">
        <div className="space-y-5">
          {/* Success indicator */}
          <div className="flex items-center gap-3 rounded-xl bg-ridesync-50 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ridesync-600 text-white">
              <Check className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-charcoal">
                Demo room ready
              </p>
              <p className="text-xs text-charcoal-muted">
                Your room has been created locally for this session.
              </p>
            </div>
          </div>

          {/* Room details */}
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white px-4 py-4">
            <div>
              <p className="text-xs font-medium text-charcoal-muted">Ride name</p>
              <p className="mt-0.5 text-sm font-semibold text-charcoal">
                {room.name}
              </p>
            </div>
            {room.destination && (
              <div>
                <p className="text-xs font-medium text-charcoal-muted">
                  Destination
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-charcoal-soft">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
                  {room.destination}
                </p>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-charcoal-muted">Room code</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="rounded-lg bg-gray-100 px-3 py-2 font-mono text-base font-bold tracking-wider text-charcoal">
                  {room.code}
                </code>
                <CopyCodeButton code={room.code} size="sm" />
              </div>
            </div>
          </div>

          {/* Demo notice */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-amber-800">
              Demo room — not shared across devices. Other riders cannot join
              this room until RideSync&apos;s backend is connected.
            </p>
          </div>

          {/* Waiting for riders */}
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center">
            <p className="text-sm font-medium text-charcoal-soft">
              Waiting for riders
            </p>
            <p className="mt-0.5 text-xs text-charcoal-muted">
              No riders have joined yet.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <Button onClick={handleGoToRoom} size="lg" fullWidth>
              Go to room
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <button
              type="button"
              onClick={handleClose}
              className="w-full text-center text-sm font-medium text-charcoal-muted transition-colors hover:text-charcoal-soft"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Form state
  return (
    <Modal open={open} onClose={handleClose} title="Create a Ride">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-ridesync-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ridesync-100 text-ridesync-700">
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-charcoal">
              Start a group ride
            </p>
            <p className="text-xs text-charcoal-muted">
              Name your ride and optionally add a destination.
            </p>
          </div>
        </div>

        <FormField
          label="Ride name"
          type="text"
          placeholder="e.g. Sunday Lonavala Ride"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="off"
          required
          maxLength={60}
        />

        <FormField
          label="Destination (optional)"
          type="text"
          placeholder="e.g. Lonavala Lake"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          leadingIcon={<MapPin className="h-4.5 w-4.5" />}
          autoComplete="off"
          maxLength={80}
          hint="You can add or change this later."
        />

        {/* Live location notice */}
        <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 px-3.5 py-3">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-400"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-charcoal-muted">
            Live location sharing will be added in a later step. For now, rooms
            are created locally in your browser.
          </p>
        </div>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          {loading ? 'Creating room…' : 'Create Room'}
        </Button>

        <button
          type="button"
          onClick={handleClose}
          className="w-full text-center text-sm font-medium text-charcoal-muted transition-colors hover:text-charcoal-soft"
        >
          Cancel
        </button>
      </form>
    </Modal>
  );
}
