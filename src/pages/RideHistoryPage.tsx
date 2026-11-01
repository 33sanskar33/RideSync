import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock3, MapPin, Users, Bike, ChevronRight } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';

type RideRecord = {
  id: string;
  ride_name: string;
  destination: string | null;
  created_at: string;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  elapsed_seconds: number | null;
  ended_at: string | null;
};

type RideMember = { room_id: string };

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, seconds || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
};

export default function RideHistoryPage() {
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: ridesError } = await supabase
          .from('ride_rooms')
          .select('id, ride_name, destination, created_at, status, elapsed_seconds, ended_at')
          .order('created_at', { ascending: false })
          .limit(100);
        if (ridesError) throw ridesError;
        const records = (data ?? []) as RideRecord[];
        const ids = records.map((ride) => ride.id);
        let counts: Record<string, number> = {};
        if (ids.length) {
          const { data: members, error: membersError } = await supabase
            .from('ride_members')
            .select('room_id')
            .in('room_id', ids);
          if (membersError) throw membersError;
          counts = (members as RideMember[] ?? []).reduce((acc, member) => {
            acc[member.room_id] = (acc[member.room_id] ?? 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
        if (active) {
          setRides(records);
          setMemberCounts(counts);
        }
      } catch (err) {
        console.error('Load ride history failed:', err);
        if (active) setError(err instanceof Error ? err.message : 'Could not load ride history.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadHistory();
    return () => { active = false; };
  }, []);

  const filteredRides = useMemo(() => rides.filter((ride) => {
    if (filter === 'completed') return ride.status === 'ended';
    if (filter === 'in-progress') return ride.status !== 'ended';
    return true;
  }), [rides, filter]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-charcoal-muted hover:text-charcoal">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
      </div>
      <section className="mb-7">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ridesync-50 text-ridesync-700">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">Ride History</h1>
            <p className="mt-1 text-sm text-charcoal-muted">Your group rides, all in one place.</p>
          </div>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-2" aria-label="Filter rides">
        {(['all', 'completed', 'in-progress'] as const).map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === value ? 'bg-ridesync-700 text-white' : 'border border-gray-200 bg-white text-charcoal-muted hover:bg-gray-50'}`}>
            {value === 'all' ? 'All rides' : value === 'completed' ? 'Completed' : 'In progress'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-charcoal-muted">Loading your rides…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : filteredRides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <Bike className="mx-auto mb-3 h-9 w-9 text-gray-400" />
          <h2 className="font-semibold text-charcoal">{rides.length ? 'No rides in this filter' : 'No rides yet'}</h2>
          <p className="mt-1 text-sm text-charcoal-muted">{rides.length ? 'Try another filter to see your rides.' : 'Create or join a group ride and it will appear here.'}</p>
          {!rides.length && <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ridesync-700 px-4 py-2.5 text-sm font-semibold text-white">Start a ride <ChevronRight className="h-4 w-4" /></Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRides.map((ride) => (
            <Link key={ride.id} to={`/room/${ride.id}`} className="group block rounded-2xl border border-gray-200 bg-white p-4 shadow-card transition hover:border-ridesync-200 hover:shadow-card-hover sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold text-charcoal">{ride.ride_name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${ride.status === 'ended' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>{ride.status === 'ended' ? 'Completed' : ride.status === 'paused' ? 'Paused' : ride.status === 'active' ? 'In progress' : 'Waiting'}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-charcoal-muted"><MapPin className="h-4 w-4 shrink-0" />{ride.destination || 'Destination not set'}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-ridesync-700" />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 pt-3 text-xs text-charcoal-muted">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(ride.created_at).toLocaleDateString()}</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDuration(ride.elapsed_seconds ?? 0)}</span>
                <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{memberCounts[ride.id] ?? 0} riders</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
