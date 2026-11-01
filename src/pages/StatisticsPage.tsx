import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Route,
  TrendingUp,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

interface RideRecord {
  id: string;
  ride_name: string | null;
  destination: string | null;
  created_at: string;
  ended_at: string | null;
  elapsed_seconds: number | null;
  status: 'waiting' | 'active' | 'paused' | 'ended';
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
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StatisticsPage() {
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRides() {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !authData.user) {
        setError('Please sign in again to view your ride statistics.');
        setLoading(false);
        return;
      }

      const { data, error: ridesError } = await supabase
        .from('ride_rooms')
        .select('id, ride_name, destination, created_at, ended_at, elapsed_seconds, status')
        .eq('created_by', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!active) return;
      if (ridesError) {
        console.error('Load ride statistics failed:', ridesError.message);
        setError('Could not load your ride statistics. Please refresh and try again.');
        setLoading(false);
        return;
      }

      setRides((data ?? []) as RideRecord[]);
      setLoading(false);
    }

    void loadRides();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const completed = rides.filter((ride) => ride.status === 'ended');
    const totalSeconds = completed.reduce(
      (total, ride) => total + Math.max(0, ride.elapsed_seconds ?? 0),
      0
    );
    return {
      created: rides.length,
      completed: completed.length,
      totalSeconds,
      averageSeconds: completed.length ? totalSeconds / completed.length : 0,
      active: rides.filter((ride) => ride.status === 'active' || ride.status === 'paused').length,
    };
  }, [rides]);

  const cards = [
    {
      label: 'Rides created',
      value: stats.created.toString(),
      detail: 'Your group rides',
      icon: Route,
    },
    {
      label: 'Completed rides',
      value: stats.completed.toString(),
      detail: 'Successfully ended',
      icon: CheckCircle2,
    },
    {
      label: 'Total riding time',
      value: formatDuration(stats.totalSeconds),
      detail: 'Across completed rides',
      icon: Clock3,
    },
    {
      label: 'Average duration',
      value: stats.completed ? formatDuration(stats.averageSeconds) : '—',
      detail: 'Per completed ride',
      icon: TrendingUp,
    },
  ];

  return (
    <DashboardLayout>
      <section className="mb-8">
        <div className="flex items-center gap-2 text-sm font-medium text-ridesync-700">
          <Activity className="h-4 w-4" aria-hidden="true" />
          Your riding overview
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Ride Statistics
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-muted sm:text-base">
          Track the rides you have created, your completed trips, and time spent riding with your group.
        </p>
      </section>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ride statistics">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-charcoal-muted">{card.label}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-5 text-2xl font-bold tracking-tight text-charcoal">
                {loading ? '—' : card.value}
              </p>
              <p className="mt-1 text-xs text-charcoal-muted">{card.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Your recent rides</h2>
            <p className="mt-1 text-xs text-charcoal-muted">Latest rides created from this account</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-charcoal-muted">
            {loading ? 'Loading…' : `${rides.length} rides`}
          </span>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-charcoal-muted">Loading your ride data…</div>
        ) : rides.length === 0 && !error ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <CalendarClock className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm font-semibold text-charcoal">No rides yet</p>
            <p className="mt-1 text-sm text-charcoal-muted">Create your first ride and your stats will show up here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rides.slice(0, 10).map((ride) => (
              <div key={ride.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{ride.ride_name || 'Group ride'}</p>
                  <p className="mt-1 truncate text-xs text-charcoal-muted">
                    {ride.destination ? `To ${ride.destination} · ` : ''}{formatDate(ride.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    ride.status === 'ended'
                      ? 'bg-green-50 text-green-700'
                      : ride.status === 'active'
                        ? 'bg-ridesync-50 text-ridesync-700'
                        : ride.status === 'paused'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                  }`}>
                    {ride.status}
                  </span>
                  <span className="min-w-16 text-right text-xs font-medium text-charcoal-muted">
                    {ride.status === 'ended' ? formatDuration(ride.elapsed_seconds ?? 0) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-4 text-xs leading-relaxed text-charcoal-muted">
        Statistics currently include rides created by your account. Distance tracking will be added only after RideSync can store verified trip-distance data.
      </p>
    </DashboardLayout>
  );
}
