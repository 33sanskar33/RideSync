
import { useEffect, useMemo, useRef } from 'react';
import {
  CircleMarker,
  Polyline,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import type { CircleMarker as LeafletCircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface RiderLocation {
  id: string;
  room_id?: string;
  user_id?: string | null;
  member_id?: string | null;
  rider_name: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  is_leader?: boolean;
}

interface RideLiveMapProps {
  locations: RiderLocation[];
  routeCoordinates?: [number, number][];
  destination?: { latitude: number; longitude: number } | null;
}

const RIDER_COLORS = [
  '#16a34a',
  '#2563eb',
  '#9333ea',
  '#ea580c',
  '#db2777',
  '#0891b2',
  '#ca8a04',
  '#4f46e5',
];

function getRiderColor(riderName: string) {
  let hash = 0;

  for (let i = 0; i < riderName.length; i++) {
    hash = (hash * 31 + riderName.charCodeAt(i)) >>> 0;
  }

  return RIDER_COLORS[hash % RIDER_COLORS.length];
}

const RIDER_COLOCATION_RADIUS_METERS = 20;

interface RiderGroup {
  key: string;
  riders: RiderLocation[];
  latitude: number;
  longitude: number;
}

function distanceBetweenMeters(
  first: RiderLocation,
  second: RiderLocation,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(
    Math.sqrt(haversine),
    Math.sqrt(1 - haversine),
  );
}

// Riders within 20 metres are represented by one count marker. Their stored
// GPS coordinates stay untouched; the marker uses only the group's visual centre.
function groupNearbyRiders(locations: RiderLocation[]): RiderGroup[] {
  const parents = locations.map((_, index) => index);

  const findRoot = (index: number): number => {
    if (parents[index] !== index) {
      parents[index] = findRoot(parents[index]);
    }
    return parents[index];
  };

  const join = (first: number, second: number) => {
    const firstRoot = findRoot(first);
    const secondRoot = findRoot(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };

  for (let first = 0; first < locations.length; first += 1) {
    for (let second = first + 1; second < locations.length; second += 1) {
      if (
        distanceBetweenMeters(locations[first], locations[second]) <=
        RIDER_COLOCATION_RADIUS_METERS
      ) {
        join(first, second);
      }
    }
  }

  const groups = new Map<number, RiderLocation[]>();
  locations.forEach((rider, index) => {
    const root = findRoot(index);
    const group = groups.get(root) ?? [];
    group.push(rider);
    groups.set(root, group);
  });

  return Array.from(groups.values()).map((riders) => ({
    key: riders.map((rider) => rider.id).sort().join('-'),
    riders,
    latitude:
      riders.reduce((total, rider) => total + rider.latitude, 0) /
      riders.length,
    longitude:
      riders.reduce((total, rider) => total + rider.longitude, 0) /
      riders.length,
  }));
}

function RiderClusterMarker({ group }: { group: RiderGroup }) {
  const radius = Math.min(22, 13 + Math.floor(group.riders.length / 2));
  const allLocationsStale = group.riders.every(
    (rider) => Date.now() - new Date(rider.updated_at).getTime() >= 30_000
  );

  return (
    <CircleMarker
      center={[group.latitude, group.longitude]}
      radius={radius}
      pathOptions={{
        color: '#ffffff',
        weight: 3,
        fillColor: allLocationsStale ? '#6b7280' : '#1d4ed8',
        fillOpacity: allLocationsStale ? 0.5 : 0.95,
      }}
    >
      <Tooltip permanent direction="top" offset={[0, -radius]}>
        <span className="font-bold">
          {group.riders.length} riders
        </span>
      </Tooltip>
      <Popup>
        <div className="min-w-40">
          <strong>
            {group.riders.length} riders in this spot
          </strong>
          <div className="mt-2 space-y-1">
            {group.riders.map((rider) => (
              <div key={rider.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium">
                  {rider.rider_name}
                  {rider.is_leader && <strong className="ml-2 text-amber-700">Leader</strong>}
                </span>
                <span className="text-xs text-gray-500">
                  {Date.now() - new Date(rider.updated_at).getTime() >= 30_000
                    ? 'GPS stale'
                    : new Date(rider.updated_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Riders shown together are within approximately 20 metres.
          </p>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function FitMapToRiders({
  locations,
}: {
  locations: RiderLocation[];
}) {
  const map = useMap();
  const previousRiderIds = useRef('');

  useEffect(() => {
    if (locations.length === 0) return;

    // Refit when a new rider first appears. GPS coordinate updates for the
    // same riders must not keep snapping the map away from the user's view.
    const riderIds = locations.map((rider) => rider.id).sort().join('|');
    if (riderIds === previousRiderIds.current) return;
    previousRiderIds.current = riderIds;

    if (locations.length === 1) {
      map.setView(
        [locations[0].latitude, locations[0].longitude],
        15
      );
      return;
    }

    const bounds = locations.map(
      (rider) =>
        [rider.latitude, rider.longitude] as [number, number]
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
    });
  }, [locations, map]);

  return null;
}

function RiderMarker({ rider }: { rider: RiderLocation }) {
  const markerRef = useRef<LeafletCircleMarker | null>(null);
  const isStale = Date.now() - new Date(rider.updated_at).getTime() >= 30_000;
  const color = useMemo(
    () => isStale
      ? '#6b7280'
      : rider.is_leader ? '#d97706' : getRiderColor(rider.rider_name),
    [rider.rider_name, rider.is_leader, isStale]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const target: [number, number] = [
      rider.latitude,
      rider.longitude,
    ];

    const start = marker.getLatLng();
    const startLat = start.lat;
    const startLng = start.lng;
    const duration = 700;
    let animationFrame = 0;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);

      marker.setLatLng([
        startLat + (target[0] - startLat) * progress,
        startLng + (target[1] - startLng) * progress,
      ]);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [rider.latitude, rider.longitude]);

  return (
    <CircleMarker
      ref={markerRef}
      center={[rider.latitude, rider.longitude]}
      radius={9}
      pathOptions={{
        color: isStale ? '#9ca3af' : '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: isStale ? 0.45 : 1,
        opacity: isStale ? 0.7 : 1,
        dashArray: isStale ? '3 4' : undefined,
      }}
    >
      {(rider.is_leader || isStale) && (
        <Tooltip permanent direction="top" offset={[0, -10]}>
          <span className={isStale ? 'font-bold text-gray-600' : 'font-bold text-amber-700'}>
            {isStale ? 'GPS STALE' : 'Leader'}
          </span>
        </Tooltip>
      )}
      <Popup>
        <strong>{rider.rider_name}</strong>
        {rider.is_leader && <span className="ml-2 font-bold text-amber-700">Leader</span>}
        <br />
        <span className={isStale ? 'font-semibold text-gray-600' : 'text-green-700'}>
          {isStale ? 'GPS STALE — showing last known location' : 'GPS recently updated'}
        </span>
        <br />
        Last location update:{' '}
        {new Date(rider.updated_at).toLocaleTimeString()}
      </Popup>
    </CircleMarker>
  );
}

export default function RideLiveMap({
  locations,
  routeCoordinates = [],
  destination = null,
}: RideLiveMapProps) {
  const initialCenter: [number, number] =
    locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : [19.076, 72.8777];

  return (
    <MapContainer
      center={initialCenter}
      zoom={13}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', minHeight: '320px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitMapToRiders locations={locations} />

      {routeCoordinates.length > 1 && (
        <Polyline positions={routeCoordinates} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }} />
      )}

      {destination && (
        <CircleMarker
          center={[destination.latitude, destination.longitude]}
          radius={8}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }}
        >
          <Popup><strong>Destination</strong></Popup>
        </CircleMarker>
      )}

      {groupNearbyRiders(locations).map((group) =>
        group.riders.length === 1 ? (
          <RiderMarker key={group.riders[0].id} rider={group.riders[0]} />
        ) : (
          <RiderClusterMarker key={group.key} group={group} />
        )
      )}
    </MapContainer>
  );
}
