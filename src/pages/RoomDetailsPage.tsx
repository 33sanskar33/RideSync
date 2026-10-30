
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import RideLiveMap, {
  type RiderLocation,
} from '@/components/RideLiveMap';
import {
  MapPin,
  Users,
  LocateFixed,
  Navigation,
  ArrowLeft,
  Info,
  Siren,
  CheckCircle2,
  MapPinned,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import CopyCodeButton from '@/components/CopyCodeButton';
import RideGroupChat from '@/components/RideGroupChat';

interface RideRoom {
  id: string;
  code: string;
  name: string;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  createdAt: number;
  status: 'waiting' | 'active' | 'paused' | 'ended';
  createdBy: string | null;
  elapsedSeconds: number;
  startedAt: string | null;
  activeSince: string | null;
  pausedAt: string | null;
  endedAt: string | null;
}

interface Rider {
  id: string;
  rider_name: string;
  joined_at: string;
  user_id?: string | null;
  is_leader?: boolean;
}

interface RideSosAlert {
  id: string;
  room_id: string;
  member_id: string;
  user_id: string;
  rider_name: string;
  latitude: number;
  longitude: number;
  message: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export default function RoomDetailsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();

  const riderName = (
    location.state as { riderName?: string } | null
  )?.riderName?.trim();

  const [membershipRiderName, setMembershipRiderName] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const activeRiderName = riderName || membershipRiderName;

  useEffect(() => {
    if (!roomId) return;
    const stateMemberId = (location.state as { memberId?: string } | null)?.memberId;
    const storedMemberId = sessionStorage.getItem(`ridesync-active-member-${roomId}`);
    const memberId = stateMemberId || storedMemberId;
    if (memberId) {
      setActiveMemberId(memberId);
      sessionStorage.setItem(`ridesync-active-member-${roomId}`, memberId);
    }
  }, [roomId, location.state]);

  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [locationStatus, setLocationStatus] =
    useState('Location not started');

  const [room, setRoom] = useState<RideRoom | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [locations, setLocations] = useState<RiderLocation[]>([]);
  const [locationRealtimeStatus, setLocationRealtimeStatus] = useState('Connecting to live updates…');
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeStatus, setRouteStatus] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km');
  const [routeSummary, setRouteSummary] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);

  const [routeSteps, setRouteSteps] = useState<Array<{
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
  }>>([]);
  
  const [now, setNow] = useState(Date.now());
  const [updatingRideStatus, setUpdatingRideStatus] = useState(false);
  const [sosAlerts, setSosAlerts] = useState<RideSosAlert[]>([]);
  const [sendingSos, setSendingSos] = useState(false);
  const [updatingSosId, setUpdatingSosId] = useState<string | null>(null);
  const [sosError, setSosError] = useState<string | null>(null);

  const elapsedRideSeconds = room
    ? room.elapsedSeconds +
      (room.status === 'active' && room.activeSince
        ? Math.max(0, Math.floor((now - new Date(room.activeSince).getTime()) / 1000))
        : 0)
    : 0;

  
useEffect(() => {
  let active = true;

  void supabase.auth.getUser().then(({ data, error }) => {
    if (!active) return;
    if (error) {
      console.error('Could not verify ride leader:', error.message);
    }
    setCurrentUserId(data.user?.id ?? null);
    const savedDistanceUnit = data.user?.user_metadata?.distance_unit;
    if (savedDistanceUnit === 'km' || savedDistanceUnit === 'mi') {
      setDistanceUnit(savedDistanceUnit);
    }
  });

  return () => {
    active = false;
  };
}, []);

// Restore this tab's selected rider membership after a refresh.
useEffect(() => {
  if (!roomId || !activeMemberId) return;

  let cancelled = false;
  async function loadMyMembership() {
    const { data, error } = await supabase
      .from('ride_members')
      .select('id, rider_name')
      .eq('room_id', roomId)
      .eq('id', activeMemberId)
      .maybeSingle();

    if (cancelled) return;
    if (error) {
      console.error('Load current rider membership failed:', error.message);
      return;
    }

    if (data) {
      setMembershipRiderName(data.rider_name);
    } else {
      setMembershipRiderName(null);
      setActiveMemberId(null);
      sessionStorage.removeItem(`ridesync-active-member-${roomId}`);
    }
  }

  void loadMyMembership();
  return () => {
    cancelled = true;
  };
}, [roomId, activeMemberId]);

// If the creator opens the room from a fresh tab, restore their leader rider profile.
useEffect(() => {
  if (!roomId || !room?.createdBy || !currentUserId) return;
  if (room.createdBy !== currentUserId || activeMemberId) return;

  let cancelled = false;
  async function loadLeaderMembership() {
    const { data, error } = await supabase
      .from('ride_members')
      .select('id, rider_name')
      .eq('room_id', roomId)
      .eq('user_id', currentUserId)
      .eq('is_leader', true)
      .maybeSingle();

    if (cancelled) return;
    if (error) {
      console.error('Load leader membership failed:', error.message);
      return;
    }
    if (data) {
      setMembershipRiderName(data.rider_name);
      setActiveMemberId(data.id);
      sessionStorage.setItem(`ridesync-active-member-${roomId}`, data.id);
    }
  }

  void loadLeaderMembership();
  return () => {
    cancelled = true;
  };
}, [roomId, room?.createdBy, currentUserId, activeMemberId]);

const isRideLeader = Boolean(
  room?.createdBy &&
  currentUserId &&
  room.createdBy === currentUserId
);

const updateRideStatus = async (status: 'active' | 'paused' | 'ended') => {
  if (!room || !isRideLeader || updatingRideStatus) {
    if (!isRideLeader) {
      alert('Only the person who created this ride can control its status.');
    }
    return;
  }

  if (status === 'ended' && !window.confirm('End this ride for everyone? This cannot be undone.')) {
    return;
  }

  setUpdatingRideStatus(true);
  try {
    const { data, error } = await supabase
      .from('ride_rooms')
      .update({ status })
      .eq('id', room.id)
      .select('id, status, elapsed_seconds, started_at, active_since, paused_at, ended_at')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('Ride status was not updated. Check that you are the ride creator.');
    }

    // Apply the database-generated timer timestamps immediately. In particular,
    // waiting -> active must set activeSince now, without waiting for Realtime.
    setRoom((current) =>
      current
        ? {
            ...current,
            status: data.status,
            elapsedSeconds: data.elapsed_seconds ?? 0,
            startedAt: data.started_at ?? null,
            activeSince: data.active_since ?? null,
            pausedAt: data.paused_at ?? null,
            endedAt: data.ended_at ?? null,
          }
        : current
    );
  } catch (error) {
    console.error('Update ride status failed:', error);
    const message =
      error instanceof Error ? error.message : 'Could not update ride status. Please try again.';
    alert(message);
  } finally {
    setUpdatingRideStatus(false);
  }
};


useEffect(() => {
  const interval = window.setInterval(() => {
    setNow(Date.now());
  }, 1000);

  return () => window.clearInterval(interval);
}, []);

  // 1. Read GPS location from this device
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('GPS is not supported by this browser');
      return;
    }

    setLocationStatus('Requesting location permission...');

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('Location active');
      },
      (error) => {
        setLocationStatus(
          error.code === 1
            ? 'Location permission denied'
            : 'Unable to get location'
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Load room details
  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      if (!roomId) {
        setRoom(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('ride_rooms')
          .select('id, room_code, ride_name, destination, destination_lat, destination_lng, created_at, status, created_by, elapsed_seconds, started_at, active_since, paused_at, ended_at')
          .eq('id', roomId)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled) {
          setRoom(
            data
              ? {
                  id: data.id,
                  code: data.room_code,
                  name: data.ride_name,
                  destination: data.destination ?? '',
                  destinationLat: data.destination_lat ?? null,
                  destinationLng: data.destination_lng ?? null,
                  createdAt: new Date(data.created_at).getTime(),
                  status: data.status ?? 'waiting',
                  createdBy: data.created_by ?? null,
                  elapsedSeconds: data.elapsed_seconds ?? 0,
                  startedAt: data.started_at ?? null,
                  activeSince: data.active_since ?? null,
                  pausedAt: data.paused_at ?? null,
                  endedAt: data.ended_at ?? null,
                }
              : null
          );
        }
      } catch (error) {
        console.error('Load room failed:', error);
        if (!cancelled) setRoom(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRoom();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Load SOS alerts and keep every ride participant in sync in real time.
  useEffect(() => {
    if (!roomId) {
      setSosAlerts([]);
      return;
    }

    let cancelled = false;
    const loadSosAlerts = async () => {
      const { data, error } = await supabase
        .from('ride_sos_alerts')
        .select('id, room_id, member_id, user_id, rider_name, latitude, longitude, message, status, created_at, acknowledged_at, resolved_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (cancelled) return;
      if (error) {
        console.error('Load SOS alerts failed:', error.message);
        setSosError('Could not load SOS alerts. Please refresh the room.');
        return;
      }
      setSosAlerts((data ?? []) as RideSosAlert[]);
      setSosError(null);
    };

    void loadSosAlerts();
    const channel = supabase
      .channel(`ride-sos-${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'ride_sos_alerts', filter: `room_id=eq.${roomId}`,
      }, () => { void loadSosAlerts(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void loadSosAlerts();
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendSosAlert = async () => {
    if (!room || !activeMemberId || !activeRiderName || !currentUserId) {
      setSosError('Join this ride with your rider profile before sending SOS.');
      return;
    }
    if (room.status !== 'active' && room.status !== 'paused') {
      setSosError('SOS is available after the ride starts.');
      return;
    }
    const savedLocation = locations.find((item) => item.member_id === activeMemberId);
    const coordinates = myLocation ?? (savedLocation
      ? { latitude: savedLocation.latitude, longitude: savedLocation.longitude }
      : null);
    if (!coordinates) {
      setSosError('GPS location is not available yet. Allow location access and try again.');
      return;
    }
    if (!window.confirm('Send an emergency SOS to everyone in this ride group with your current location?')) return;

    setSendingSos(true);
    setSosError(null);
    try {
      const { error } = await supabase.from('ride_sos_alerts').insert({
        room_id: room.id,
        member_id: activeMemberId,
        user_id: currentUserId,
        rider_name: activeRiderName,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        message: 'Emergency assistance needed',
      });
      if (error) {
        if (error.code === '23505') throw new Error('You already have an unresolved SOS alert. The ride leader has been notified.');
        throw error;
      }
      alert('SOS sent to your RideSync group. This does not contact emergency services.');
    } catch (error) {
      console.error('Send SOS failed:', error);
      setSosError(error instanceof Error ? error.message : 'Could not send SOS. Please try again.');
    } finally {
      setSendingSos(false);
    }
  };

  const updateSosAlert = async (alertId: string, status: 'acknowledged' | 'resolved') => {
    if (!isRideLeader || updatingSosId) return;
    setUpdatingSosId(alertId);
    setSosError(null);
    try {
      const { error } = await supabase
        .from('ride_sos_alerts')
        .update({ status })
        .eq('id', alertId);
      if (error) throw error;
      const { data } = await supabase
        .from('ride_sos_alerts')
        .select('id, room_id, member_id, user_id, rider_name, latitude, longitude, message, status, created_at, acknowledged_at, resolved_at')
        .eq('id', alertId)
        .maybeSingle();
      if (data) {
        setSosAlerts((current) => current.map((item) => item.id === alertId ? data as RideSosAlert : item));
      }
    } catch (error) {
      console.error('Update SOS alert failed:', error);
      setSosError(error instanceof Error ? error.message : 'Could not update SOS alert.');
    } finally {
      setUpdatingSosId(null);
    }
  };

  // 3. Save GPS for the exact rider profile selected in this tab.
  useEffect(() => {
    if (
      !room?.id ||
      !activeRiderName ||
      !activeMemberId ||
      !myLocation ||
      !currentUserId
    ) return;

    let cancelled = false;

    async function saveLocation() {
      const { error } = await supabase
        .from('ride_locations')
        .upsert(
          {
            room_id: room!.id,
            member_id: activeMemberId,
            user_id: currentUserId,
            rider_name: activeRiderName!,
            latitude: myLocation!.latitude,
            longitude: myLocation!.longitude,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'room_id,member_id' }
        );

      if (cancelled) return;

      if (error) {
        console.error('Location save failed:', error.message);
        setLocationStatus('Could not save location');
      } else {
        setLocationStatus('Location sharing active');
      }
    }

    void saveLocation();

    return () => {
      cancelled = true;
    };
  }, [room?.id, activeRiderName, activeMemberId, myLocation, currentUserId]);

  // 4. Load riders
  
  // 4. Load riders and listen for real-time changes
  useEffect(() => {
    if (!roomId) {
      setRiders([]);
      return;
    }

    let cancelled = false;

    async function loadRiders() {
      const { data, error } = await supabase
        .from('ride_members')
        .select('id, rider_name, joined_at, user_id, is_leader')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Load riders failed:', error.message);
        return;
      }

      if (!cancelled) {
        setRiders(data ?? []);
      }
    }

    void loadRiders();

    

const channel = supabase
  .channel(`ride-room-${roomId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'ride_members',
      filter: `room_id=eq.${roomId}`,
    },
    () => {
      void loadRiders();
    }
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'ride_rooms',
      filter: `id=eq.${roomId}`,
    },
    (payload) => {
      const updatedRoom = payload.new as {
        id: string;
        room_code: string;
        ride_name: string;
        destination: string | null;
        destination_lat: number | null;
        destination_lng: number | null;
        created_at: string;
        status: 'waiting' | 'active' | 'paused' | 'ended';
        elapsed_seconds: number;
        started_at: string | null;
        active_since: string | null;
        paused_at: string | null;
        ended_at: string | null;
      };

      setRoom((current) =>
        current
          ? {
              ...current,
              name: updatedRoom.ride_name,
              code: updatedRoom.room_code,
              destination: updatedRoom.destination ?? '',
              destinationLat: updatedRoom.destination_lat ?? null,
              destinationLng: updatedRoom.destination_lng ?? null,
              createdAt: new Date(updatedRoom.created_at).getTime(),
              status: updatedRoom.status,
              elapsedSeconds: updatedRoom.elapsed_seconds ?? 0,
              startedAt: updatedRoom.started_at ?? null,
              activeSince: updatedRoom.active_since ?? null,
              pausedAt: updatedRoom.paused_at ?? null,
              endedAt: updatedRoom.ended_at ?? null,
            }
          : current
      );
    }
  )
  
.subscribe((status) => {
  console.log('Ride room realtime:', status);
});

return () => {
  cancelled = true;
  void supabase.removeChannel(channel);
};
}, [roomId]);



  // 5. Get a road-following route from the first live rider to the selected destination.
  useEffect(() => {
    const start =
      locations.find((item) => item.member_id === activeMemberId) ??
      locations[0];
    const endLat = room?.destinationLat;
    const endLng = room?.destinationLng;

    if (!start || endLat == null || endLng == null) {
      setRouteCoordinates([]);
      setRouteSummary(null);
      setRouteSteps([]);
      setRouteStatus(
        endLat == null || endLng == null
          ? 'Select a destination when creating the ride to show a route.'
          : 'Waiting for a rider location to calculate the route.',
      );
      return;
    }

    const controller = new AbortController();
    async function loadRoute() {
      setRouteStatus('Calculating road route…');
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Route service unavailable');
        const result = await response.json();
        const route = result?.routes?.[0] as {
          geometry?: { coordinates?: [number, number][] };
          distance?: number;
          duration?: number;
          legs?: Array<{
            steps?: Array<{
              name?: string;
              distance?: number;
              duration?: number;
              maneuver?: {
                type?: string;
                modifier?: string;
                exit?: number;
              };
            }>;
          }>;
        } | undefined;
        const coordinates = route?.geometry?.coordinates;
        if (!coordinates || coordinates.length < 2) {
          throw new Error('No road route found for these locations');
        }
        setRouteCoordinates(coordinates.map(([longitude, latitude]) => [latitude, longitude]));
        setRouteSummary(
          typeof route.distance === 'number' && typeof route.duration === 'number'
            ? { distanceMeters: route.distance, durationSeconds: route.duration }
            : null,
        );

        const steps = (route.legs ?? []).flatMap((leg) => leg.steps ?? []);
        setRouteSteps(
          steps.map((step) => {
            const type = step.maneuver?.type ?? 'continue';
            const modifier = step.maneuver?.modifier;
            const street = step.name ? ` onto ${step.name}` : '';
            let instruction = 'Continue';
            if (type === 'depart') instruction = 'Start riding';
            else if (type === 'arrive') instruction = 'You have arrived';
            else if (type === 'turn' && modifier) instruction = `Turn ${modifier}`;
            else if (type === 'new name') instruction = 'Continue';
            else if (type === 'merge' && modifier) instruction = `Merge ${modifier}`;
            else if (type === 'on ramp') instruction = 'Take the ramp';
            else if (type === 'off ramp') instruction = 'Take the exit';
            else if (type === 'fork' && modifier) instruction = `Keep ${modifier}`;
            else if (type === 'roundabout' || type === 'rotary') {
              instruction = step.maneuver?.exit
                ? `At the roundabout, take exit ${step.maneuver.exit}`
                : 'Enter the roundabout';
            } else if (type === 'end of road' && modifier) {
              instruction = `At the end of the road, turn ${modifier}`;
            } else if (type === 'uturn') instruction = 'Make a U-turn';
            else if (type === 'continue' && modifier) instruction = `Continue ${modifier}`;

            return {
              instruction: `${instruction}${street}`,
              distanceMeters: step.distance ?? 0,
              durationSeconds: step.duration ?? 0,
            };
          })
        );
        setRouteStatus('Road route and turn-by-turn directions are ready.');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Load road route failed:', error);
        setRouteCoordinates([]);
        setRouteSummary(null);
        setRouteSteps([]);
        setRouteStatus('Could not calculate the road route. Please try again later.');
      }
    }

    void loadRoute();
    return () => controller.abort();
  }, [locations, activeMemberId, room?.destinationLat, room?.destinationLng]);

  // 6. Load latest GPS locations once, then receive live database changes.
  useEffect(() => {
    if (!roomId) {
      setLocations([]);
      setLocationRealtimeStatus('Not connected');
      return;
    }

    let cancelled = false;

    async function loadLocations() {
      const { data, error } = await supabase
        .from('ride_locations')
        .select('id, room_id, member_id, user_id, rider_name, latitude, longitude, updated_at')
        .eq('room_id', roomId);

      if (error) {
        console.error('Load locations failed:', error.message);
        if (!cancelled) setLocationRealtimeStatus('Could not load rider locations');
        return;
      }

      if (!cancelled) setLocations(data ?? []);
    }

    // Load the current snapshot. Reload once the Realtime subscription is ready
    // as well, so an update between the first query and subscription is not missed.
    void loadLocations();

    const locationChannel = supabase
      .channel(`ride-locations-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_locations',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (cancelled) return;

          if (payload.eventType === 'DELETE') {
            const oldLocation = payload.old as { id?: string };
            if (oldLocation.id) {
              setLocations((current) =>
                current.filter((location) => location.id !== oldLocation.id)
              );
            }
            return;
          }

          const incoming = payload.new as RiderLocation & { room_id: string };
          if (!incoming.id || incoming.room_id !== roomId) return;

          setLocations((current) => {
            const existingIndex = current.findIndex(
              (location) =>
                location.id === incoming.id ||
                (!!incoming.member_id && location.member_id === incoming.member_id)
            );

            if (existingIndex === -1) return [...current, incoming];

            const next = [...current];
            next[existingIndex] = incoming;
            return next;
          });
        }
      )
      .subscribe((status) => {
        if (cancelled) return;

        if (status === 'SUBSCRIBED') {
          setLocationRealtimeStatus('Live updates connected');
          void loadLocations();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setLocationRealtimeStatus('Live updates disconnected');
          console.warn('Ride locations realtime status:', status);
        }
      });

    return () => {
      cancelled = true;
      void supabase.removeChannel(locationChannel);
    };
  }, [roomId]);

  const formatElapsedTime = (totalSeconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
  };

  const formatRouteDistance = (meters: number) =>
    distanceUnit === 'mi'
      ? `${(meters / 1609.344).toFixed(1)} mi`
      : `${(meters / 1000).toFixed(1)} km`;

  const formatRouteDuration = (seconds: number) => {
    const totalMinutes = Math.max(1, Math.round(seconds / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours} h ${minutes} min` : `${totalMinutes} min`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center text-charcoal-muted">
          Loading ride details...
        </div>
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-md py-12 text-center">
          <Info className="mx-auto mb-4 h-8 w-8 text-gray-400" />
          <h1 className="text-lg font-semibold text-charcoal">
            Room not found
          </h1>
          <p className="mt-2 text-sm text-charcoal-muted">
            Check your room link and try again.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ridesync-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <Link
          to="/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-charcoal-muted hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* Room details */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-charcoal sm:text-2xl">
                {room.name}
              </h1>
              {room.destination && (
                <p className="mt-2 flex items-center gap-2 text-sm text-charcoal-muted">
                  <MapPin className="h-4 w-4" />
                  {room.destination}
                </p>
              )}
            </div>

            
<div className="flex flex-col gap-2">
  <span
    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ${
      room.status === 'active'
        ? 'bg-green-100 text-green-700'
        : room.status === 'paused'
          ? 'bg-orange-100 text-orange-700'
          : room.status === 'ended'
            ? 'bg-gray-200 text-gray-700'
            : 'bg-amber-100 text-amber-700'
    }`}
  >
    {room.status === 'active'
      ? 'Ride Active'
      : room.status === 'paused'
        ? 'Ride Paused'
        : room.status === 'ended'
          ? 'Ride Ended'
          : 'Waiting to Start'}
  </span>

  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
    <p className="text-xs text-charcoal-muted">Total ride time</p>
    <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-charcoal" aria-live="off">
      {formatElapsedTime(elapsedRideSeconds)}
    </p>
    <p className="mt-0.5 text-[11px] text-charcoal-muted">
      {room.status === 'waiting'
        ? 'Starts when the leader starts the ride'
        : room.status === 'active'
          ? 'Timer running'
          : room.status === 'paused'
            ? 'Timer paused'
            : 'Final ride duration'}
    </p>
  </div>

  {isRideLeader && room.status === 'waiting' && (
    <Button onClick={() => updateRideStatus('active')} loading={updatingRideStatus}>
      Start Ride
    </Button>
  )}

  {isRideLeader && room.status === 'active' && (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => updateRideStatus('paused')}
        loading={updatingRideStatus}
      >
        Pause Ride
      </Button>
      <Button
        onClick={() => updateRideStatus('ended')}
        disabled={updatingRideStatus}
      >
        End Ride
      </Button>
    </div>
  )}

  {isRideLeader && room.status === 'paused' && (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => updateRideStatus('active')} loading={updatingRideStatus}>
        Resume Ride
      </Button>
      <Button
        variant="secondary"
        onClick={() => updateRideStatus('ended')}
        disabled={updatingRideStatus}
      >
        End Ride
      </Button>
    </div>
  )}

  {!isRideLeader && room.status !== 'ended' && (
    <p className="text-xs text-charcoal-muted">Only the ride organiser can control ride status.</p>
  )}
</div>


            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs text-charcoal-muted">Room code</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="font-mono text-sm font-bold">
                  {room.code}
                </code>
                <CopyCodeButton code={room.code} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* GPS status */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <LocateFixed className="h-5 w-5 text-blue-700" />
            <p className="text-sm font-semibold text-blue-900">
              {locationStatus}
            </p>
          </div>

          {myLocation && (
            <p className="mt-2 text-xs text-blue-800">
              Your coordinates: {myLocation.latitude.toFixed(5)},{' '}
              {myLocation.longitude.toFixed(5)}
            </p>
          )}

          {!activeRiderName && (
            <p className="mt-2 text-xs text-blue-800">
              Join this ride through the Join Ride form to share your
              location under your rider name.
            </p>
          )}
        </div>

        <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            Location sharing requires browser permission. Only share
            your location with people you trust.
          </p>
        </div>

        {/* Emergency SOS */}
        <section className="mb-6 rounded-2xl border border-red-200 bg-white p-5 shadow-card" aria-labelledby="sos-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <Siren className="h-6 w-6" />
              </span>
              <div>
                <h2 id="sos-heading" className="text-base font-bold text-charcoal">Emergency SOS</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-charcoal-muted">
                  Send your name and current GPS coordinates to everyone in this ride group. The organiser can acknowledge and resolve the alert.
                </p>
              </div>
            </div>
            {!isRideLeader && (
              <Button
                type="button"
                onClick={sendSosAlert}
                loading={sendingSos}
                disabled={!activeMemberId || (room.status !== 'active' && room.status !== 'paused')}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800"
              >
                <Siren className="h-4 w-4" /> Send SOS
              </Button>
            )}
            {isRideLeader && (
              <Button
                type="button"
                onClick={sendSosAlert}
                loading={sendingSos}
                disabled={!activeMemberId || (room.status !== 'active' && room.status !== 'paused')}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800"
              >
                <Siren className="h-4 w-4" /> Send SOS
              </Button>
            )}
          </div>
          {(room.status === 'waiting' || room.status === 'ended') && (
            <p className="mt-3 text-xs text-charcoal-muted">SOS becomes available once the ride has started.</p>
          )}
          {!activeMemberId && (
            <p className="mt-2 text-xs text-amber-700">Join this ride with a rider profile to send an SOS.</p>
          )}
          {sosError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{sosError}</p>}

          <div className="mt-4 space-y-3">
            {sosAlerts.length === 0 ? (
              <p className="rounded-lg bg-gray-50 px-3 py-3 text-xs text-charcoal-muted">No SOS alerts for this ride.</p>
            ) : sosAlerts.map((alertItem) => (
              <article key={alertItem.id} className={`rounded-xl border p-4 ${alertItem.status === 'resolved' ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-charcoal">{alertItem.rider_name} needs help</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${alertItem.status === 'pending' ? 'bg-red-200 text-red-800' : alertItem.status === 'acknowledged' ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-700'}`}>
                    {alertItem.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-charcoal-muted">{alertItem.message} · {new Date(alertItem.created_at).toLocaleString()}</p>
                <a
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ridesync-700 underline"
                  href={`https://www.google.com/maps?q=${alertItem.latitude},${alertItem.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPinned className="h-3.5 w-3.5" /> Open SOS location in Maps
                </a>
                {isRideLeader && alertItem.status !== 'resolved' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alertItem.status === 'pending' && (
                      <Button size="sm" type="button" loading={updatingSosId === alertItem.id} disabled={updatingSosId !== null && updatingSosId !== alertItem.id} onClick={() => updateSosAlert(alertItem.id, 'acknowledged')}>
                        <CheckCircle2 className="h-4 w-4" /> Acknowledge
                      </Button>
                    )}
                    <Button size="sm" type="button" variant="secondary" loading={updatingSosId === alertItem.id} disabled={updatingSosId !== null && updatingSosId !== alertItem.id} onClick={() => updateSosAlert(alertItem.id, 'resolved')}>
                      Resolve alert
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-charcoal-muted">
            RideSync SOS only alerts members currently in this room. It does not call emergency services or replace local emergency numbers.
          </p>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Live map */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <h2 className="font-semibold text-charcoal">
                  Live rider map
                </h2>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-muted">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        locationRealtimeStatus === 'Live updates connected'
                          ? 'bg-green-500'
                          : locationRealtimeStatus === 'Live updates disconnected' ||
                              locationRealtimeStatus === 'Could not load rider locations'
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                      }`}
                    />
                    {locationRealtimeStatus}
                  </span>
                  <span className="text-xs text-charcoal-muted">
                    {locations.length} location
                    {locations.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <div className="h-[380px] w-full">
                <RideLiveMap
                  locations={locations.map((item) => ({
                    ...item,
                    is_leader: riders.some(
                      (rider) => rider.id === item.member_id && rider.is_leader
                    ),
                  }))}
                  routeCoordinates={routeCoordinates}
                  destination={
                    room.destinationLat != null && room.destinationLng != null
                      ? { latitude: room.destinationLat, longitude: room.destinationLng }
                      : null
                  }
                />
              </div>

              {routeStatus && (
                <p className="px-3 pt-2 text-center text-xs text-charcoal-muted">{routeStatus}</p>
              )}

              {locations.length === 0 && (
                <p className="p-3 text-center text-xs text-charcoal-muted">
                  Waiting for riders to share their GPS location...
                </p>
              )}
            </div>

            {routeSummary && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                  <p className="text-xs text-charcoal-muted">Route distance</p>
                  <p className="mt-1 text-lg font-bold text-charcoal">
                    {formatRouteDistance(routeSummary.distanceMeters)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                  <p className="text-xs text-charcoal-muted">Estimated moving time</p>
                  <p className="mt-1 text-lg font-bold text-charcoal">
                    {formatRouteDuration(routeSummary.durationSeconds)}
                  </p>
                  <p className="mt-1 text-xs text-charcoal-muted">Route estimate, not live traffic</p>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <LocateFixed className="h-5 w-5 text-ridesync-700" />
                <div>
                  <p className="text-sm font-semibold text-charcoal">
                    Location sharing
                  </p>
                  <p className="text-xs text-charcoal-muted">
                    {locationStatus}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-ridesync-700" />
                  <div>
                    <p className="text-sm font-semibold text-charcoal">Turn-by-turn directions</p>
                    <p className="text-xs text-charcoal-muted">
                      {routeSteps.length > 0
                        ? `${routeSteps.length} route steps · from your live location when available`
                        : 'Directions appear after a rider location and destination are available.'}
                    </p>
                  </div>
                </div>
                {routeSteps.length > 0 ? (
                  <ol className="max-h-72 space-y-3 overflow-y-auto pr-1">
                    {routeSteps.map((step, index) => (
                      <li key={`${index}-${step.instruction}`} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ridesync-50 text-xs font-bold text-ridesync-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal">{step.instruction}</p>
                          <p className="text-xs text-charcoal-muted">
                            {formatRouteDistance(step.distanceMeters)} · {formatRouteDuration(step.durationSeconds)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-charcoal-muted">{routeStatus || 'Waiting for route…'}</p>
                )}
                <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-amber-700">
                  Follow road signs and ride safely. Directions are estimates, not live traffic guidance.
                </p>
              </div>
            </div>
          </div>

          {/* Riders list */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-charcoal-muted" />
              <h2 className="text-sm font-semibold text-charcoal">
                Riders
              </h2>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-1 text-xs">
                {riders.length} joined
              </span>
            </div>

            {riders.length === 0 ? (
              <p className="py-8 text-center text-sm text-charcoal-muted">
                No riders have joined yet.
              </p>
            ) : (
              <div className="space-y-3">
                {riders.map((rider) => {
                  
const riderLocation = locations.find(
  (item) =>
    (!!item.member_id && item.member_id === rider.id) ||
    item.rider_name === rider.rider_name
);

const isLive =
  riderLocation !== undefined &&
  now - new Date(riderLocation.updated_at).getTime() < 30_000;

  


                  return (
                    <div
                      key={rider.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ridesync-100 font-bold text-ridesync-700">
                        {rider.rider_name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal">
                          {rider.rider_name}
                        </p>
                        {rider.is_leader && (
                          <span className="mt-0.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Leader
                          </span>
                        )}
                        <p className="text-xs text-charcoal-muted">
                          
{!riderLocation
  ? 'Waiting for location'
  : isLive
    ? 'Location updated recently'
    : `Last update: ${new Date(
        riderLocation.updated_at
      ).toLocaleTimeString()}`}

                        </p>
                      </div>

                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          !riderLocation
  ? 'bg-gray-300'
  : isLive
    ? 'bg-green-500'
    : 'bg-amber-500'
                        }`}
                        title={
                        !riderLocation
  ? 'Location unavailable'
  : isLive
    ? 'Location recently updated'
    : 'Location may be stale'
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <RideGroupChat
          roomId={room.id}
          memberId={activeMemberId}
          userId={currentUserId}
          riderName={activeRiderName ?? null}
          currentLocation={myLocation}
          rideEnded={room.status === 'ended'}
        />

        <div className="mt-6">
          <Link to="/dashboard">
            <Button variant="secondary" size="md">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
