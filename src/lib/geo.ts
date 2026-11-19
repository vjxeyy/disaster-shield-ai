import type { RiskZone } from "./types";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Nearest demonstration zone to a coordinate (used to tag reports / SOS with a locality). */
export function nearestZone(zones: RiskZone[], lat: number, lng: number): { zone: RiskZone; km: number } | null {
  let best: { zone: RiskZone; km: number } | null = null;
  for (const zone of zones) {
    const km = distanceKm(lat, lng, zone.lat, zone.lng);
    if (!best || km < best.km) best = { zone, km };
  }
  return best;
}

/** Rough bounding box for the Chennai demo region — used to warn when GPS is far away. */
export function isInDemoRegion(lat: number, lng: number): boolean {
  return lat > 12.75 && lat < 13.25 && lng > 79.95 && lng < 80.4;
}

/** OpenStreetMap directions link (opens in a new tab). */
export function directionsUrl(lat: number, lng: number, fromLat?: number, fromLng?: number): string {
  const to = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const route = fromLat !== undefined && fromLng !== undefined ? `${fromLat.toFixed(5)},${fromLng.toFixed(5)};${to}` : `;${to}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`;
}
