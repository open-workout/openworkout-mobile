import {
  computeSimilarity,
  findAlternatives,
} from '../../app/lib/generateWorkout';
import type { Exercise } from '../../app/db/exercises';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ex(
  name: string,
  primary: string[],
  secondary: string[] = [],
  id?: string,
): Exercise {
  return {
    id: id ?? name,
    name,
    primary_muscles: primary,
    secondary_muscles: secondary,
    alt_names: [],
    description: '',
    weight_direction: 1,
    logging_type: 'reps',
    created_at: 0,
    animation_name: null,
    can_be_done_in_reps: true,
    can_be_done_in_time: true,
    can_be_done_in_distance: false,
    requires_weight: true,
    equipment: [],
    csv_id: null,
    human_readable_id: null,
  };
}

// ─── computeSimilarity ───────────────────────────────────────────────────────

describe('computeSimilarity', () => {
  it('returns 1 when both exercises share the same primary muscle', () => {
    const a = ex('A', ['chest']);
    const b = ex('B', ['chest']);
    expect(computeSimilarity(a, b)).toBe(1);
  });

  it('returns 1 when both exercises share the same secondary muscle', () => {
    const a = ex('A', [], ['triceps']);
    const b = ex('B', [], ['triceps']);
    expect(computeSimilarity(a, b)).toBe(1);
  });

  it('returns 0.5 when a muscle is primary in one and secondary in the other', () => {
    const a = ex('A', ['chest']);
    const b = ex('B', [], ['chest']);
    expect(computeSimilarity(a, b)).toBe(0.5);
  });

  it('returns 0 for a muscle that appears in only one exercise', () => {
    const a = ex('A', ['chest']);
    const b = ex('B', ['quads']);
    expect(computeSimilarity(a, b)).toBe(0);
  });

  it('returns 0 when both exercises have no muscles', () => {
    const a = ex('A', []);
    const b = ex('B', []);
    expect(computeSimilarity(a, b)).toBe(0);
  });

  it('divides score by total unique muscles across both exercises', () => {
    // a: primary=[chest, triceps]  b: primary=[chest]
    // unique muscles: {chest, triceps} — size 2
    // chest: primary in both → +1 | triceps: only in a → +0
    // score = 1 / 2 = 0.5
    const a = ex('A', ['chest', 'triceps']);
    const b = ex('B', ['chest']);
    expect(computeSimilarity(a, b)).toBeCloseTo(0.5);
  });

  it('expands super-muscles before comparing', () => {
    // 'legs' expands to 5 muscles; b only has 'quads'
    // quads: primary in both → +1 | remaining 4 leg muscles: only in a → +0
    // score = 1 / 5 = 0.2
    const a = ex('A', ['legs']);
    const b = ex('B', ['quads']);
    expect(computeSimilarity(a, b)).toBeCloseTo(1 / 5);
  });

  it('is symmetric — computeSimilarity(a,b) === computeSimilarity(b,a)', () => {
    const a = ex('A', ['chest', 'triceps'], ['front delts']);
    const b = ex('B', ['chest'], ['triceps', 'shoulders']);
    expect(computeSimilarity(a, b)).toBeCloseTo(computeSimilarity(b, a));
  });

  it('handles exercises with overlapping primary and secondary muscles', () => {
    // a: primary=[chest], secondary=[triceps]
    // b: primary=[triceps], secondary=[chest]
    // chest: primary in a, secondary in b → +0.5
    // triceps: secondary in a, primary in b → +0.5
    // score = (0.5 + 0.5) / 2 = 0.5
    const a = ex('A', ['chest'], ['triceps']);
    const b = ex('B', ['triceps'], ['chest']);
    expect(computeSimilarity(a, b)).toBeCloseTo(0.5);
  });

  it('gives maximum score 1 when all muscles match with same roles', () => {
    const a = ex('A', ['chest', 'triceps'], ['front delts']);
    const b = ex('B', ['chest', 'triceps'], ['front delts']);
    expect(computeSimilarity(a, b)).toBe(1);
  });
});

// ─── findAlternatives ────────────────────────────────────────────────────────

describe('findAlternatives', () => {
  const bench = ex('Bench Press', ['chest'], ['triceps']);
  const incline = ex('Incline Press', ['chest'], ['triceps', 'front delts']);
  const squat = ex('Squat', ['quads', 'glutes'], ['hamstrings']);
  const curl = ex('Bicep Curl', ['biceps']);

  it('excludes the source exercise itself', () => {
    const alts = findAlternatives(bench, [bench, incline]);
    expect(alts.map((e) => e.name)).not.toContain('Bench Press');
  });

  it('excludes exercises with zero similarity', () => {
    const alts = findAlternatives(bench, [bench, squat]);
    expect(alts).toHaveLength(0);
  });

  it('includes exercises with any muscle overlap, regardless of category', () => {
    const alts = findAlternatives(bench, [bench, incline, curl]);
    expect(alts.map((e) => e.name)).toContain('Incline Press');
  });

  it('returns exercises sorted by similarity descending', () => {
    // perfectMatch shares all muscles; partial shares only chest
    const perfect = ex('Perfect', ['chest'], ['triceps']);
    const partial = ex('Partial', ['chest'], ['lats']);
    const alts = findAlternatives(bench, [bench, perfect, partial]);
    expect(alts[0].name).toBe('Perfect');
    expect(alts[1].name).toBe('Partial');
  });

  it('respects the limit parameter', () => {
    const library = Array.from({ length: 20 }, (_, i) =>
      ex(`Ex${i}`, ['chest'], [], `id${i}`),
    );
    expect(findAlternatives(bench, library, 5)).toHaveLength(5);
  });

  it('returns an empty array when no similar exercises exist', () => {
    expect(findAlternatives(squat, [squat, bench])).toHaveLength(0);
  });

  it('returns an empty array when the library only contains the source exercise', () => {
    expect(findAlternatives(bench, [bench])).toHaveLength(0);
  });
});
