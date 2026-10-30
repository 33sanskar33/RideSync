
import { useEffect, useMemo, useRef } from 'react';
import {
  CircleMarker,
  Polyline,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import type { CircleMarker as LeafletCircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface RiderLocation {
  id: string;
  room_id?: string;
  user_id?: string | null;
  rider_name: string;
  latitude: number;
  longitude: number;
  updated_at: string;
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

function FitMapToRiders({
  locations,
}: {
  locations: RiderLocation[];
}) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (locations.length === 0 || hasFitted.current) return;

    if (locations.length === 1) {
      map.setView(
        [locations[0].latitude, locations[0].longitude],
        15
      );
    } else {
      const bounds = locations.map(
        (rider) =>
          [rider.latitude, rider.longitude] as [number, number]
      );

      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15,
      });
    }

    hasFitted.current = true;
  }, [locations, map]);

  return null;
}

function RiderMarker({ rider }: { rider: RiderLocation }) {
  const markerRef = useRef<LeafletCircleMarker | null>(null);
  const color = useMemo(
    () => getRiderColor(rider.rider_name),
    [rider.rider_name]
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
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }}
    >
      <Popup>
        <strong>{rider.rider_name}</strong>
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

      {locations.map((rider) => (
        <RiderMarker key={rider.id} rider={rider} />
      ))}
    </MapContainer>
  );
}
