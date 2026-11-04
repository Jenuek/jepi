// Distances and the travel-time guess used when there is no real route (and as the start of one).
export type LL = [number, number];

/** kilometres between two points (haversine) */
export function km(a: LL, b: LL): number {
  const R = 6371, r = (x: number) => x * Math.PI / 180;
  const dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface TravelGuess { mode: string; min: number }
export interface GuessOptions {
  /** getting around by car at the destination */
  car: boolean;
  /** what public transport is called there (지하철, 대중교통 …) */
  transitName: string;
  /** walk when it is closer than this (the 걷기 style: 2 / 1.3 / 0.7 km) */
  walkKm: number;
  /** an airport or station near either end, with its own transfer time */
  gateway: { min?: number } | null;
}

/** how long it takes between two points, by distance; null when they are right next to each other */
export function travelGuess(a: LL | null | undefined, b: LL | null | undefined, o: GuessOptions): TravelGuess | null {
  if (!a || !b) return null;
  const d = km(a, b); if (d < 0.15) return null;
  const g = o.gateway, car = o.car, tm = o.transitName || '대중교통';
  if (g && g.min && d > 5) return { mode: car ? '차' : tm, min: car ? Math.ceil(g.min * 0.8 / 5) * 5 : g.min };
  if (d < o.walkKm) return { mode: '도보', min: Math.max(5, Math.ceil(d * 1.3 / 4.8 * 60 / 5) * 5) };
  if (car) return { mode: '차', min: Math.ceil((10 + (d < 20 ? d * 2 : 20 + d)) / 5) * 5 };
  return { mode: tm, min: Math.ceil((d < 20 ? 12 + d * 2.4 : 36 + d * 1.2) / 5) * 5 };
}
