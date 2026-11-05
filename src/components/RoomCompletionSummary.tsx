import { CalendarCheck, Clock3, MapPin, Route, Users } from 'lucide-react';
import { formatDistanceMeters, type DistanceUnit } from '@/lib/distance';

interface SummaryRider {
  id: string;
  rider_name: string;
}

interface SummaryLocation {
  member_id?: string | null;
  distance_meters?: number | null;
}

interface RoomCompletionSummaryProps {
  rideName: string;
  destination: string;
  endedAt: string | null;
  durationSeconds: number;
  riders: SummaryRider[];
  locations: SummaryLocation[];
  distanceUnit: DistanceUnit;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export default function RoomCompletionSummary({
  rideName,
  destination,
  endedAt,
  durationSeconds,
  riders,
  locations,
  distanceUnit,
}: RoomCompletionSummaryProps) {
  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border border-green-200 bg-white shadow-card"
      aria-labelledby="ride-completion-heading"
    >
      <div className="border-b border-green-100 bg-green-50 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
          <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          Ride completed
        </div>
        <h2 id="ride-completion-heading" className="mt-1 text-xl font-bold text-charcoal">
          {rideName || 'Group ride'} summary
        </h2>
        {endedAt && (
          <p className="mt-1 text-xs text-charcoal-muted">
            Ended {new Date(endedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <Clock3 className="h-5 w-5 text-ridesync-700" aria-hidden="true" />
          <p className="mt-2 text-xs text-charcoal-muted">Total duration</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-charcoal">
            {formatDuration(durationSeconds)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <Users className="h-5 w-5 text-ridesync-700" aria-hidden="true" />
          <p className="mt-2 text-xs text-charcoal-muted">Riders joined</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-charcoal">
            {riders.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <MapPin className="h-5 w-5 text-ridesync-700" aria-hidden="true" />
          <p className="mt-2 text-xs text-charcoal-muted">Destination</p>
          <p className="mt-1 truncate text-base font-bold text-charcoal">
            {destination || 'Not set'}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
        <div className="mb-3 flex items-center gap-2">
          <Route className="h-4 w-4 text-charcoal-muted" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-charcoal">Rider-wise GPS distance</h3>
        </div>
        {riders.length === 0 ? (
          <p className="text-sm text-charcoal-muted">No rider records are available for this ride.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {riders.map((rider) => {
              const location = locations.find((item) => item.member_id === rider.id);
              const hasDistance = typeof location?.distance_meters === 'number'
                && Number.isFinite(location.distance_meters);

              return (
                <li key={rider.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 truncate text-sm font-medium text-charcoal">
                    {rider.rider_name}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-charcoal">
                    {hasDistance
                      ? formatDistanceMeters(location.distance_meters!, distanceUnit)
                      : 'GPS distance unavailable'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-charcoal-muted">
          GPS distance is shown separately for each rider. Missing GPS data is not treated as zero distance.
        </p>
      </div>
    </section>
  );
}
