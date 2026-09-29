import { clusterPoints } from './cluster';

describe('clusterPoints', () => {
  it('keeps distant points as single clusters', () => {
    const result = clusterPoints(
      [
        { x: 0, y: 0, item: 'a' },
        { x: 200, y: 0, item: 'b' },
      ],
      56,
    );
    expect(result.map((c) => c.items)).toEqual([['a'], ['b']]);
  });

  it('groups close points and places the cluster at their centroid', () => {
    const [cluster, ...rest] = clusterPoints(
      [
        { x: 0, y: 0, item: 'a' },
        { x: 20, y: 0, item: 'b' },
        { x: 10, y: 30, item: 'c' },
      ],
      56,
    );
    expect(rest).toEqual([]);
    expect(cluster!.items).toEqual(['a', 'b', 'c']);
    expect(cluster!.x).toBeCloseTo(10);
    expect(cluster!.y).toBeCloseTo(10);
  });

  it('joins the nearest cluster when several are in reach', () => {
    const result = clusterPoints(
      [
        { x: 0, y: 0, item: 'a' },
        { x: 100, y: 0, item: 'b' },
        { x: 70, y: 0, item: 'c' },
      ],
      56,
    );
    expect(result.map((c) => c.items)).toEqual([['a'], ['b', 'c']]);
  });

  it('does not cluster when the radius is 0', () => {
    const result = clusterPoints(
      [
        { x: 0, y: 0, item: 'a' },
        { x: 0, y: 0, item: 'b' },
      ],
      0,
    );
    expect(result).toHaveLength(2);
  });

  it('returns nothing for no points', () => {
    expect(clusterPoints([])).toEqual([]);
  });
});
