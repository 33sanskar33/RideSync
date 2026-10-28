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

interface DestinationResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function CreateRideModal({ open, onClose }: CreateRideModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationResults, setDestinationResults] = useState<DestinationResult[]>([]);
  const [destinationLat, setDestinationLat] = useState<number | null>(null);
  const [destinationLng, setDestinationLng] = useState<number | null>(null);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const [destinationSearchError, setDestinationSearchError] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [room, setRoom] = useState<DemoRoom | null>(null);

  function handleClose() {
    setName('');
    setDestination('');
    setDestinationResults([]);
    setDestinationLat(null);
    setDestinationLng(null);
    setDestinationSearchError('');
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

  async function searchDestination() {
    const query = destination.trim();
    if (query.length < 3) {
      setDestinationSearchError('Enter at least 3 characters to search.');
      setDestinationResults([]);
      return;
    }

    setSearchingDestination(true);
    setDestinationSearchError('');
    setDestinationResults([]);

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '5',
        countrycodes: 'in',
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );
      if (!response.ok) throw new Error('Destination search is temporarily unavailable.');
      const results: DestinationResult[] = await response.json();
      setDestinationResults(results);
      if (results.length === 0) {
        setDestinationSearchError('No places found. Try another search.');
      }
    } catch (error) {
      setDestinationSearchError(
        error instanceof Error ? error.message : 'Search failed. Try again.'
      );
    } finally {
      setSearchingDestination(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  if (!validate()) return;

  setLoading(true);

  try {
    const segment = () =>
      Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');

    const code = `RIDE-${segment()}`;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) {
      throw new Error('Please sign in again before creating a ride.');
    }

  const { data, error } = await supabase
  .from('ride_rooms')
  .insert({
    room_code: code,
    ride_name: name.trim(),
    destination: destination.trim() || null,
    destination_lat: destinationLat,
    destination_lng: destinationLng,
    created_by: authData.user.id,
  })
  .select('id, room_code, ride_name, destination, created_at, status, created_by')
  .single();

    if (error) throw error;

    setRoom({
  id: data.id,
  code: data.room_code,
  name: data.ride_name,
  destination: data.destination ?? '',
  createdAt: new Date(data.created_at).getTime(),
  status: data.status ?? 'waiting',
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
                Ride room created
              </p>
              <p className="text-xs text-charcoal-muted">
                Your room is saved and can be shared with other riders.
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

        <div className="space-y-2">
          <FormField
            label="Destination (optional)"
            type="text"
            placeholder="Search a place, e.g. Lonavala Lake"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setDestinationLat(null);
              setDestinationLng(null);
              setDestinationResults([]);
              setDestinationSearchError('');
            }}
            leadingIcon={<MapPin className="h-4.5 w-4.5" />}
            autoComplete="off"
            maxLength={120}
            hint="Search and select a place to save its map coordinates."
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            loading={searchingDestination}
            onClick={searchDestination}
          >
            {searchingDestination ? 'Searching places…' : 'Search destination'}
          </Button>
          {destinationSearchError && (
            <p className="text-xs text-red-600" role="status">{destinationSearchError}</p>
          )}
          {destinationResults.length > 0 && (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white">
              {destinationResults.map((result) => (
                <button
                  key={`${result.lat},${result.lon},${result.display_name}`}
                  type="button"
                  className="flex w-full items-start gap-2 border-b border-gray-100 px-3 py-3 text-left text-sm last:border-b-0 hover:bg-gray-50"
                  onClick={() => {
                    setDestination(result.display_name);
                    setDestinationLat(Number(result.lat));
                    setDestinationLng(Number(result.lon));
                    setDestinationResults([]);
                    setDestinationSearchError('');
                  }}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ridesync-600" />
                  <span>{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
          {destinationLat !== null && destinationLng !== null && (
            <p className="text-xs text-green-700" role="status">Destination selected and ready to save.</p>
          )}
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-gray-50 px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-charcoal-muted">
            Your ride is saved to RideSync. Riders can join using the room code.
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
