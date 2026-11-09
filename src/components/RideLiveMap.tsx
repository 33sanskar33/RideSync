import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceMeters, type DistanceUnit } from '@/lib/distance';

export interface RiderLocation {
  id: string;
  room_id?: string;
  user_id?: string | null;
  member_id?: string | null;
  rider_name: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  distance_meters?: number;
  is_leader?: boolean;
}

interface RideLiveMapProps {
  locations: RiderLocation[];
  distanceUnit?: DistanceUnit;
  routeCoordinates?: [number, number][];
  destination?: { latitude: number; longitude: number } | null;
}

type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => any;
  Marker: new (options: Record<string, unknown>) => any;
  Polyline: new (options: Record<string, unknown>) => any;
  InfoWindow: new (options?: Record<string, unknown>) => any;
  LatLngBounds: new () => any;
  Point: new (x: number, y: number) => any;
  SymbolPath: { CIRCLE: unknown };
  Animation?: { DROP: unknown };
  event: { addListenerOnce: (instance: any, eventName: string, handler: () => void) => unknown };
  importLibrary: (name: 'maps') => Promise<Record<string, any>>;
};

type GoogleMapsWindow = Window & {
  google?: { maps?: GoogleMapsApi };
};

const RIDER_COLORS = [
  '#16a34a', '#2563eb', '#9333ea', '#ea580c',
  '#db2777', '#0891b2', '#ca8a04', '#4f46e5',
];
const RIDER_COLOCATION_RADIUS_METERS = 20;
let mapsApiPromise: Promise<GoogleMapsApi> | null = null;

async function getMapsApi(): Promise<GoogleMapsApi> {
  const maps = (window as GoogleMapsWindow).google?.maps;
  if (!maps) throw new Error('Google Maps loaded without its Maps JavaScript library.');
  // Resolve the Maps JavaScript library explicitly instead of relying on the
  // legacy global Map constructor, which can be unavailable during async load.
  const library = await maps.importLibrary('maps');
  return { ...maps, ...library } as GoogleMapsApi;
}

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing. Add VITE_GOOGLE_MAPS_API_KEY to your environment variables.'));
  }

  const existing = (window as GoogleMapsWindow).google?.maps;
  if (existing) return Promise.resolve(existing);
  if (mapsApiPromise) return mapsApiPromise;

  mapsApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('#ridesync-google-maps');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        void getMapsApi().then(resolve, reject);
      }, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps could not load. Check your API key and website restrictions.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'ridesync-google-maps';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      void getMapsApi().then(resolve, reject);
    };
    script.onerror = () => reject(new Error('Google Maps could not load. Check billing, enabled APIs, and website restrictions.'));
    document.head.appendChild(script);
  }).catch((error) => {
    mapsApiPromise = null;
    throw error;
  });

  return mapsApiPromise;
}

function getRiderColor(riderName: string) {
  let hash = 0;
  for (let i = 0; i < riderName.length; i += 1) {
    hash = (hash * 31 + riderName.charCodeAt(i)) >>> 0;
  }
  return RIDER_COLORS[hash % RIDER_COLORS.length];
}

interface RiderGroup {
  key: string;
  riders: RiderLocation[];
  latitude: number;
  longitude: number;
}

function distanceBetweenMeters(first: RiderLocation, second: RiderLocation): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(
    Math.sqrt(haversine),
    Math.sqrt(1 - haversine),
  );
}

function groupNearbyRiders(locations: RiderLocation[]): RiderGroup[] {
  const parents = locations.map((_, index) => index);
  const findRoot = (index: number): number => {
    if (parents[index] !== index) parents[index] = findRoot(parents[index]);
    return parents[index];
  };
  const join = (first: number, second: number) => {
    const firstRoot = findRoot(first);
    const secondRoot = findRoot(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };

  for (let first = 0; first < locations.length; first += 1) {
    for (let second = first + 1; second < locations.length; second += 1) {
      if (distanceBetweenMeters(locations[first], locations[second]) <= RIDER_COLOCATION_RADIUS_METERS) {
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
    latitude: riders.reduce((total, rider) => total + rider.latitude, 0) / riders.length,
    longitude: riders.reduce((total, rider) => total + rider.longitude, 0) / riders.length,
  }));
}

function markerIcon(maps: GoogleMapsApi, color: string, stale: boolean, count?: number) {
  if (count && count > 1) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="${stale ? '#6b7280' : '#1d4ed8'}" stroke="#fff" stroke-width="3"/><text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#fff">${count}</text></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new (maps as any).Size(48, 48),
      anchor: new maps.Point(24, 24),
    };
  }
  return {
    path: maps.SymbolPath.CIRCLE,
    scale: 9,
    fillColor: color,
    fillOpacity: stale ? 0.45 : 1,
    strokeColor: stale ? '#9ca3af' : '#ffffff',
    strokeOpacity: stale ? 0.7 : 1,
    strokeWeight: 2,
  };
}

function riderInfoContent(riders: RiderLocation[], distanceUnit: DistanceUnit) {
  const wrapper = document.createElement('div');
  wrapper.style.minWidth = '190px';
  const heading = document.createElement('strong');
  heading.textContent = riders.length > 1 ? `${riders.length} riders in this spot` : riders[0].rider_name;
  wrapper.appendChild(heading);

  riders.forEach((rider) => {
    const row = document.createElement('div');
    row.style.marginTop = '8px';
    row.style.fontSize = '12px';
    const name = document.createElement('div');
    name.style.fontWeight = '600';
    name.textContent = `${rider.rider_name}${rider.is_leader ? ' · Leader' : ''}`;
    const status = document.createElement('div');
    status.style.color = '#6b7280';
    const stale = Date.now() - new Date(rider.updated_at).getTime() >= 30_000;
    status.textContent = `${stale ? 'GPS stale' : new Date(rider.updated_at).toLocaleTimeString()} · Tracked: ${formatDistanceMeters(rider.distance_meters ?? 0, distanceUnit)}`;
    row.append(name, status);
    wrapper.appendChild(row);
  });

  if (riders.length > 1) {
    const note = document.createElement('p');
    note.style.color = '#6b7280';
    note.style.fontSize = '11px';
    note.textContent = 'Riders shown together are within approximately 20 metres.';
    wrapper.appendChild(note);
  }
  return wrapper;
}

export default function RideLiveMap({
  locations,
  distanceUnit = 'km',
  routeCoordinates = [],
  destination = null,
}: RideLiveMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapsRef = useRef<GoogleMapsApi | null>(null);
  const riderMarkersRef = useRef<Map<string, any>>(new Map());
  const clusterMarkersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const previousRiderIdsRef = useRef('');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const riderGroups = useMemo(() => groupNearbyRiders(locations), [locations]);

  useEffect(() => {
    let cancelled = false;
    void loadGoogleMaps().then((maps) => {
      if (cancelled || !mapElementRef.current || mapRef.current) return;
      mapsRef.current = maps;
      mapRef.current = new maps.Map(mapElementRef.current, {
        center: { lat: 19.076, lng: 72.8777 },
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });
      infoWindowRef.current = new maps.InfoWindow();
      setMapReady(true);
      setMapError(null);
    }).catch((error: unknown) => {
      if (!cancelled) {
        setMapError(error instanceof Error ? error.message : 'Google Maps failed to initialize.');
      }
    });

    return () => {
      cancelled = true;
      riderMarkersRef.current.forEach((marker) => marker.setMap(null));
      clusterMarkersRef.current.forEach((marker) => marker.setMap(null));
      routeLineRef.current?.setMap(null);
      destinationMarkerRef.current?.setMap(null);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps || !mapReady) return;

    const activeIds = new Set<string>();
    const groupsWithMultipleRiders = new Set<string>();

    riderGroups.forEach((group) => {
      if (group.riders.length > 1) {
        groupsWithMultipleRiders.add(group.key);
        const markerId = group.key;
        activeIds.add(markerId);
        const allStale = group.riders.every((rider) => Date.now() - new Date(rider.updated_at).getTime() >= 30_000);
        const markerOptions = {
          map,
          position: { lat: group.latitude, lng: group.longitude },
          icon: markerIcon(maps, '#1d4ed8', allStale, group.riders.length),
          title: `${group.riders.length} riders together`,
          zIndex: 1000 + group.riders.length,
        };
        let marker = clusterMarkersRef.current.get(markerId);
        if (!marker) {
          marker = new maps.Marker(markerOptions);
          marker.addListener('click', () => {
            infoWindowRef.current?.setContent(riderInfoContent(group.riders, distanceUnit));
            infoWindowRef.current?.open({ map, anchor: marker });
          });
          clusterMarkersRef.current.set(markerId, marker);
        } else {
          marker.setPosition(markerOptions.position);
          marker.setIcon(markerOptions.icon);
          marker.setTitle(markerOptions.title);
        }
        return;
      }

      const rider = group.riders[0];
      const markerId = rider.id;
      activeIds.add(markerId);
      const stale = Date.now() - new Date(rider.updated_at).getTime() >= 30_000;
      const color = stale ? '#6b7280' : rider.is_leader ? '#d97706' : getRiderColor(rider.rider_name);
      const markerOptions = {
        map,
        position: { lat: rider.latitude, lng: rider.longitude },
        icon: markerIcon(maps, color, stale),
        title: `${rider.rider_name}${rider.is_leader ? ' · Leader' : ''}`,
        zIndex: rider.is_leader ? 900 : 500,
      };
      let marker = riderMarkersRef.current.get(markerId);
      if (!marker) {
        marker = new maps.Marker(markerOptions);
        marker.addListener('click', () => {
          infoWindowRef.current?.setContent(riderInfoContent([rider], distanceUnit));
          infoWindowRef.current?.open({ map, anchor: marker });
        });
        riderMarkersRef.current.set(markerId, marker);
      } else {
        marker.setPosition(markerOptions.position);
        marker.setIcon(markerOptions.icon);
        marker.setTitle(markerOptions.title);
      }
    });

    riderMarkersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.setMap(null);
        riderMarkersRef.current.delete(id);
      }
    });
    clusterMarkersRef.current.forEach((marker, id) => {
      if (!groupsWithMultipleRiders.has(id)) {
        marker.setMap(null);
        clusterMarkersRef.current.delete(id);
      }
    });

    const riderIds = locations.map((rider) => rider.id).sort().join('|');
    if (locations.length > 0 && riderIds !== previousRiderIdsRef.current) {
      previousRiderIdsRef.current = riderIds;
      const bounds = new maps.LatLngBounds();
      locations.forEach((rider) => bounds.extend({ lat: rider.latitude, lng: rider.longitude }));
      if (locations.length === 1) {
        map.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude });
        map.setZoom(15);
      } else {
        map.fitBounds(bounds, 40);
        maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom() > 15) map.setZoom(15);
        });
      }
    }
  }, [locations, riderGroups, distanceUnit, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps || !mapReady) return;

    if (routeCoordinates.length > 1) {
      const path = routeCoordinates.map(([latitude, longitude]) => ({ lat: latitude, lng: longitude }));
      if (!routeLineRef.current) {
        routeLineRef.current = new maps.Polyline({
          map,
          path,
          geodesic: true,
          strokeColor: '#2563eb',
          strokeOpacity: 0.85,
          strokeWeight: 5,
        });
      } else {
        routeLineRef.current.setPath(path);
        routeLineRef.current.setMap(map);
      }
    } else if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
    }

    if (destination) {
      const position = { lat: destination.latitude, lng: destination.longitude };
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new maps.Marker({
          map,
          position,
          title: 'Destination',
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#dc2626',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        destinationMarkerRef.current.addListener('click', () => {
          infoWindowRef.current?.setContent('<strong>Destination</strong>');
          infoWindowRef.current?.open({ map, anchor: destinationMarkerRef.current });
        });
      } else {
        destinationMarkerRef.current.setPosition(position);
        destinationMarkerRef.current.setMap(map);
      }
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
    }
  }, [routeCoordinates, destination, mapReady]);

  return (
    <div className="relative h-full w-full min-h-[320px] overflow-hidden rounded-xl">
      <div ref={mapElementRef} className="h-full w-full min-h-[320px]" />
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-sm text-slate-600">
          Loading Google Maps…
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center">
          <div className="max-w-sm">
            <p className="font-semibold text-slate-800">Google Maps unavailable</p>
            <p className="mt-2 text-sm text-slate-600">{mapError}</p>
            <p className="mt-2 text-xs text-slate-500">Check that Maps JavaScript API is enabled, billing is active, and this website is allowed by the API key restrictions.</p>
          </div>
        </div>
      )}
    </div>
  );
}
