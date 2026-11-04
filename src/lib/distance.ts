export type DistanceUnit = 'km' | 'mi';

/** Format a GPS distance using the rider's saved display preference. */
export function formatDistanceMeters(
  meters: number,
  unit: DistanceUnit = 'km',
): string {
  const safeMeters = Number.isFinite(meters) ? Math.max(0, meters) : 0;

  if (unit === 'mi') {
    const miles = safeMeters / 1609.344;
    return miles < 0.1
      ? `${Math.round(safeMeters / 0.3048)} ft`
      : `${miles.toFixed(1)} mi`;
  }

  return safeMeters < 1000
    ? `${Math.round(safeMeters)} m`
    : `${(safeMeters / 1000).toFixed(1)} km`;
}
