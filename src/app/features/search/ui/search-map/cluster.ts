// Greedy pixel-space clustering for map pins (ТЗ 5.4: «кластеризация при скоплении»).
// Pure, so it is unit-tested without Leaflet.

export interface PixelPoint<T> {
  x: number;
  y: number;
  item: T;
}

export interface PixelCluster<T> {
  /** Centroid of the members, in the same pixel space as the input. */
  x: number;
  y: number;
  items: T[];
}

/** Default grouping radius in CSS pixels (roughly a price pin's width). */
export const CLUSTER_RADIUS_PX = 56;

/**
 * Groups points closer than `radius` pixels to a cluster centroid. Points are processed in
 * input order, each joining the nearest existing cluster within reach or starting a new one.
 * `radius <= 0` disables clustering.
 */
export function clusterPoints<T>(
  points: readonly PixelPoint<T>[],
  radius = CLUSTER_RADIUS_PX,
): PixelCluster<T>[] {
  const clusters: (PixelCluster<T> & { sumX: number; sumY: number })[] = [];
  const r2 = radius * radius;
  for (const p of points) {
    let best: (typeof clusters)[number] | null = null;
    let bestD2 = Infinity;
    if (radius > 0) {
      for (const c of clusters) {
        const d2 = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
        if (d2 <= r2 && d2 < bestD2) {
          best = c;
          bestD2 = d2;
        }
      }
    }
    if (best) {
      best.items.push(p.item);
      best.sumX += p.x;
      best.sumY += p.y;
      best.x = best.sumX / best.items.length;
      best.y = best.sumY / best.items.length;
    } else {
      clusters.push({ x: p.x, y: p.y, sumX: p.x, sumY: p.y, items: [p.item] });
    }
  }
  return clusters.map(({ x, y, items }) => ({ x, y, items }));
}
