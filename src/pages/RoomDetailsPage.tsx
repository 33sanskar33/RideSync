
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
  Lock,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import CopyCodeButton from '@/components/CopyCodeButton';

interface RideRoom {
  id: string;
  code: string;
  name: string;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  createdAt: number;
  status: 'waiting' | 'active' | 'ended';
  createdBy: string | null;
}

interface Rider {
  id: string;
  rider_name: string;
  joined_at: string;
  user_id?: string | null;
}

export default function RoomDetailsPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();

  const riderName = (
    location.state as { riderName?: string } | null
  )?.riderName?.trim();

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
  
  const [now, setNow] = useState(Date.now());

  
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

const isRideLeader = Boolean(
  room?.createdBy &&
  currentUserId &&
  room.createdBy === currentUserId &&
  !riderName
);

const updateRideStatus = async (status: 'active' | 'ended') => {
  if (!room || !isRideLeader) {
    alert('Only the person who created this ride can start or end it.');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('ride_rooms')
      .update({ status })
      .eq('id', room.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('Room status update failed');
    }

    setRoom((current) =>
      current ? { ...current, status } : current
    );
  } catch (error) {
    console.error('Update ride status failed:', error);
    alert('Could not update ride status. Please try again.');
  }
};


useEffect(() => {
  const interval = window.setInterval(() => {
    setNow(Date.now());
  }, 5000);

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
          .select('id, room_code, ride_name, destination, destination_lat, destination_lng, created_at, status, created_by')
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

  // 3. Save this rider's GPS coordinates
  useEffect(() => {
    if (!room?.id || !riderName || !myLocation || !currentUserId) return;

    let cancelled = false;

    async function saveLocation() {
      const { error } = await supabase
        .from('ride_locations')
        .upsert(
          {
            room_id: room!.id,
            user_id: currentUserId,
            rider_name: riderName!,
            latitude: myLocation!.latitude,
            longitude: myLocation!.longitude,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'room_id,user_id' }
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
  }, [room?.id, riderName, myLocation, currentUserId]);

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
        .select('id, rider_name, joined_at, user_id')
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
        status: 'waiting' | 'active' | 'ended';
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
    const start = locations[0];
    const endLat = room?.destinationLat;
    const endLng = room?.destinationLng;

    if (!start || endLat == null || endLng == null) {
      setRouteCoordinates([]);
      setRouteSummary(null);
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
        const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${endLng},${endLat}?overview=full&geometries=geojson`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Route service unavailable');
        const result = await response.json();
        const route = result?.routes?.[0] as {
          geometry?: { coordinates?: [number, number][] };
          distance?: number;
          duration?: number;
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
        setRouteStatus('Road route shown from the first live rider to the destination.');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Load road route failed:', error);
        setRouteCoordinates([]);
        setRouteSummary(null);
        setRouteStatus('Could not calculate the road route. Please try again later.');
      }
    }

    void loadRoute();
    return () => controller.abort();
  }, [locations, room?.destinationLat, room?.destinationLng]);

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
        .select('id, room_id, user_id, rider_name, latitude, longitude, updated_at')
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
                (!!incoming.user_id && location.user_id === incoming.user_id)
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
        : room.status === 'ended'
          ? 'bg-gray-200 text-gray-700'
          : 'bg-amber-100 text-amber-700'
    }`}
  >
    {room.status === 'active'
      ? 'Ride Active'
      : room.status === 'ended'
        ? 'Ride Ended'
        : 'Waiting to Start'}
  </span>

  {isRideLeader && room.status === 'waiting' && (
    <Button onClick={() => updateRideStatus('active')}>
      Start Ride
    </Button>
  )}

  {isRideLeader && room.status === 'active' && (
    <Button
      variant="secondary"
      onClick={() => updateRideStatus('ended')}
    >
      End Ride
    </Button>
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

          {!riderName && (
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
                  locations={locations}
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

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <Navigation className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-charcoal">
                    Navigation
                  </p>
                  <p className="text-xs text-charcoal-muted">
                    Coming soon
                  </p>
                </div>
                <Lock className="ml-auto h-4 w-4 text-gray-400" />
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
    (!!rider.user_id && item.user_id === rider.user_id) ||
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
