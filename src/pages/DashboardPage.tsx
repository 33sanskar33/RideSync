import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  KeyRound,
  MapPin,
  Compass,
  Navigation,
  CalendarDays,
  ArrowRight,
  Clock3,
  History,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import CreateRideModal from '@/components/CreateRideModal';
import JoinRideModal from '@/components/JoinRideModal';
import { supabase } from '@/lib/supabase';

interface RecentRide {
  id: string;
  room_code: string;
  ride_name: string | null;
  destination: string | null;
  created_at: string;
  elapsed_seconds: number | null;
  created_by: string;
  status: 'waiting' | 'active' | 'paused' | 'ended';
}

const statusStyles: Record<RecentRide['status'], string> = {
  waiting: 'bg-gray-100 text-gray-700',
  active: 'bg-ridesync-50 text-ridesync-700',
  paused: 'bg-amber-50 text-amber-700',
  ended: 'bg-green-50 text-green-700',
};

const howItWorks = [
  {
    step: 1,
    title: 'Create or join',
    description: 'Start a ride or enter a room code from your group.',
    icon: KeyRound,
  },
  {
    step: 2,
    title: 'Choose a destination',
    description: 'Pick where your group is heading together.',
    icon: MapPin,
  },
  {
    step: 3,
    title: 'Follow the shared map',
    description: 'See your group on the road in real time.',
    icon: Navigation,
  },
];

function formatRideDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export default function DashboardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ridesLoading, setRidesLoading] = useState(true);
  const [ridesError, setRidesError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRecentRides() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;

      if (authError || !authData.user) {
        setRidesError('Sign in again to view your recent rides.');
        setRidesLoading(false);
        return;
      }

      const userId = authData.user.id;
      setCurrentUserId(userId);

      const [createdResult, membershipResult] = await Promise.all([
        supabase.from('ride_rooms').select('id').eq('created_by', userId),
        supabase.from('ride_members').select('room_id').eq('user_id', userId),
      ]);

      if (!active) return;
      if (createdResult.error || membershipResult.error) {
        console.error(
          'Load dashboard ride references failed:',
          createdResult.error?.message ?? membershipResult.error?.message
        );
        setRidesError('Recent rides could not be loaded. Open Ride History to try again.');
        setRidesLoading(false);
        return;
      }

      const roomIds = Array.from(new Set([
        ...(createdResult.data ?? []).map((room) => room.id),
        ...(membershipResult.data ?? []).map((membership) => membership.room_id),
      ]));

      if (roomIds.length === 0) {
        setRecentRides([]);
        setRidesLoading(false);
        return;
      }

      const { data, error: ridesError } = await supabase
        .from('ride_rooms')
        .select('id, room_code, ride_name, destination, created_at, elapsed_seconds, created_by, status')
        .in('id', roomIds)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!active) return;
      if (ridesError) {
        console.error('Load dashboard recent rides failed:', ridesError.message);
        setRidesError('Recent rides could not be loaded. Open Ride History to try again.');
        setRidesLoading(false);
        return;
      }

      setRecentRides((data ?? []) as RecentRide[]);
      setRidesLoading(false);
    }

    void loadRecentRides();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
          Ready for your next ride?
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-charcoal-muted sm:text-base">
          Create a group ride and invite your friends, or join an existing ride
          with a room code. Let&apos;s ride together.
        </p>
      </section>

      <section className="mb-10 grid gap-4 sm:grid-cols-2" aria-label="Ride actions">
        <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-600">
            <CalendarPlus className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-charcoal">Create a Ride</h2>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-charcoal-muted">
            Set up a new group ride, choose a destination, and invite friends
            with a shareable room code.
          </p>
          <Button onClick={() => setCreateOpen(true)} size="md" className="mt-4 self-start">
            Create a Ride
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-600">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-charcoal">Join a Ride</h2>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-charcoal-muted">
            Have a room code from a friend? Enter it to join their group ride
            and see the route.
          </p>
          <Button
            onClick={() => setJoinOpen(true)}
            variant="secondary"
            size="md"
            className="mt-4 self-start"
          >
            Join a Ride
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      <section className="mb-10" aria-label="Recent rides">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-charcoal-muted" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-charcoal">Recent Rides</h2>
          </div>
          <Link
            to="/dashboard/history"
            className="inline-flex items-center gap-1 text-xs font-semibold text-ridesync-700 hover:text-ridesync-800"
          >
            View history
            <History className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {ridesError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-700">
            {ridesError}
          </div>
        ) : ridesLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-charcoal-muted">
            Loading your recent rides…
          </div>
        ) : recentRides.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <Compass className="h-7 w-7 text-gray-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-charcoal-soft">
              Your recent rides will appear here.
            </p>
            <p className="mt-1 text-xs text-charcoal-muted">
              Create a ride or join one to get started.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              variant="secondary"
              size="sm"
              className="mt-5"
            >
              Create a Ride
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="divide-y divide-gray-100">
              {recentRides.map((ride) => (
                <article
                  key={ride.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-charcoal">
                        {ride.ride_name || 'Group ride'}
                      </h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusStyles[ride.status]}`}>
                        {ride.status === 'ended' ? 'Completed' : ride.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-muted">
                      <span>{formatRideDate(ride.created_at)}</span>
                      {ride.destination && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ride.destination}</span>}
                      <span>Room: {ride.room_code}</span>
                      <span>{ride.created_by === currentUserId ? 'Created by you' : 'Joined ride'}</span>
                      {ride.status === 'ended' && (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
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
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section aria-label="How RideSync works">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-charcoal">How RideSync works</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {howItWorks.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ridesync-50 text-ridesync-600">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-gray-400">Step {item.step}</span>
                </div>
                <h3 className="text-sm font-semibold text-charcoal">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-charcoal-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <CreateRideModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinRideModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </DashboardLayout>
  );
}
