/** Geo helpers — pure, no deps. Casablanca urban defaults. */

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Urban ETA in minutes. 28 km/h base + traffic factor (1.0 fluid → 1.8 dense). */
export function etaMinutes(km: number, trafficFactor = 1.25) {
  return Math.max(5, Math.round((km / 28) * 60 * trafficFactor));
}
