import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  History,
  MapPin,
  Search,
  ArrowUpRight,
  Route,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

type RideStatus = 'waiting' | 'active' | 'paused' | 'ended';
type StatusFilter = 'all' | RideStatus;

interface RideRecord {
  id: string;
  room_code: string;
  ride_name: string | null;
  destination: string | null;
  created_at: string;
  ended_at: string | null;
  elapsed_seconds: number | null;
  status: RideStatus;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const statusStyles: Record<RideStatus, string> = {
  waiting: 'bg-gray-100 text-gray-700',
  active: 'bg-ridesync-50 text-ridesync-700',
  paused: 'bg-amber-50 text-amber-700',
  ended: 'bg-green-50 text-green-700',
};

export default function RideHistoryPage() {
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !authData.user) {
        setError('Please sign in again to view your ride history.');
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const [createdResult, membershipResult] = await Promise.all([
        supabase
          .from('ride_rooms')
          .select('id')
          .eq('created_by', userId),
        supabase
          .from('ride_members')
          .select('room_id')
          .eq('user_id', userId),
      ]);

      if (!active) return;
      if (createdResult.error || membershipResult.error) {
        console.error(
          'Load ride history references failed:',
          createdResult.error?.message ?? membershipResult.error?.message
        );
        setError('Could not load your ride history. Please refresh and try again.');
        setLoading(false);
        return;
      }

      const roomIds = Array.from(new Set([
        ...(createdResult.data ?? []).map((room) => room.id),
        ...(membershipResult.data ?? []).map((membership) => membership.room_id),
      ]));

      if (roomIds.length === 0) {
        setRides([]);
        setLoading(false);
        return;
      }

      const { data, error: historyError } = await supabase
        .from('ride_rooms')
        .select('id, room_code, ride_name, destination, created_at, ended_at, elapsed_seconds, status')
        .in('id', roomIds)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!active) return;
      if (historyError) {
        console.error('Load ride history failed:', historyError.message);
        setError('Could not load your ride history. Please refresh and try again.');
        setLoading(false);
        return;
      }

      setRides((data ?? []) as RideRecord[]);
      setLoading(false);
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, []);

  const filteredRides = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rides.filter((ride) => {
      const matchesStatus = status === 'all' || ride.status === status;
      const matchesSearch = !term || [
        ride.ride_name,
        ride.destination,
        ride.room_code,
      ].some((value) => value?.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [rides, search, status]);

  return (
    <DashboardLayout>
      <section className="mb-8">
        <div className="flex items-center gap-2 text-sm font-medium text-ridesync-700">
          <History className="h-4 w-4" aria-hidden="true" />
          Your ride archive
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Ride History
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-muted sm:text-base">
          Find rides you created or joined, check their status, and reopen a ride room.
        </p>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
        <label className="relative block">
          <span className="sr-only">Search rides</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ride name, destination or room code"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-charcoal outline-none transition focus:border-ridesync-500 focus:ring-2 focus:ring-ridesync-100"
          />
        </label>
        <label className="block">
          <span className="sr-only">Filter by ride status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-charcoal outline-none transition focus:border-ridesync-500 focus:ring-2 focus:ring-ridesync-100"
          >
            <option value="all">All statuses</option>
            <option value="waiting">Waiting</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Completed</option>
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-charcoal">All your rides</h2>
            <p className="mt-1 text-xs text-charcoal-muted">
              {loading ? 'Loading ride records…' : `${filteredRides.length} of ${rides.length} rides`}
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-charcoal-muted">
            Latest 200
          </span>
        </div>

        {error ? (
          <div role="alert" className="px-6 py-12 text-center text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="px-6 py-12 text-center text-sm text-charcoal-muted">Loading your ride history…</div>
        ) : filteredRides.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              {search || status !== 'all' ? <Search className="h-6 w-6" /> : <Route className="h-6 w-6" />}
            </div>
            <p className="mt-4 text-sm font-semibold text-charcoal">
              {search || status !== 'all' ? 'No matching rides' : 'No ride history yet'}
            </p>
            <p className="mt-1 text-sm text-charcoal-muted">
              {search || status !== 'all'
                ? 'Try changing your search or status filter.'
                : 'Rides you create or join will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRides.map((ride) => (
              <article key={ride.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-charcoal">
                      {ride.ride_name || 'Group ride'}
                    </h3>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[ride.status] || statusStyles.waiting}`}>
                      {ride.status === 'ended' ? 'Completed' : ride.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(ride.created_at)}
                    </span>
                    {ride.destination && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {ride.destination}
                      </span>
                    )}
                    <span>Room: {ride.room_code}</span>
                    {ride.status === 'ended' && (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDuration(ride.elapsed_seconds ?? 0)}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to={`/room/${ride.id}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-charcoal-soft transition hover:border-ridesync-300 hover:bg-ridesync-50 hover:text-ridesync-700"
                >
                  Open ride
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
