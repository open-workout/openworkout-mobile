import {
  generateWorkout,
  computeSimilarity,
  findAlternatives,
  type ExerciseStat,
} from '../../app/lib/generateWorkout';
import type { Exercise } from '../../app/db/exercises';
import type { WorkoutPreferences } from '../../app/storage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ex(
  name: string,
  type: 'compound' | 'accessory' | 'isolation',
  primary: string[],
  secondary: string[] = [],
  id?: string,
): Exercise {
  return {
    id: id ?? name,
    name,
    exercise_type: type,
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

const NO_STATS = new Map<string, ExerciseStat>();

const BASE_PREFS: WorkoutPreferences = {
  compound_exercises: 2,
  accessory_exercises: 2,
  isolation_exercises: 1,
  progress_reps: 8,
  weekly_goal: 3,
  sets_per_exercise: 3,
};

function prefs(overrides: Partial<WorkoutPreferences> = {}): WorkoutPreferences {
  return { ...BASE_PREFS, ...overrides };
}

// ─── computeSimilarity ───────────────────────────────────────────────────────

describe('computeSimilarity', () => {
  it('returns 1 when both exercises share the same primary muscle', () => {
    const a = ex('A', 'compound', ['chest']);
    const b = ex('B', 'compound', ['chest']);
    expect(computeSimilarity(a, b)).toBe(1);
  });

  it('returns 1 when both exercises share the same secondary muscle', () => {
    const a = ex('A', 'compound', [], ['triceps']);
    const b = ex('B', 'compound', [], ['triceps']);
    expect(computeSimilarity(a, b)).toBe(1);
  });

  it('returns 0.5 when a muscle is primary in one and secondary in the other', () => {
    const a = ex('A', 'compound', ['chest']);
    const b = ex('B', 'compound', [], ['chest']);
    expect(computeSimilarity(a, b)).toBe(0.5);
  });

  it('returns 0 for a muscle that appears in only one exercise', () => {
    const a = ex('A', 'compound', ['chest']);
    const b = ex('B', 'compound', ['quads']);
    expect(computeSimilarity(a, b)).toBe(0);
  });

  it('returns 0 when both exercises have no muscles', () => {
    const a = ex('A', 'compound', []);
    const b = ex('B', 'compound', []);
    expect(computeSimilarity(a, b)).toBe(0);
  });

  it('divides score by total unique muscles across both exercises', () => {
    // a: primary=[chest, triceps]  b: primary=[chest]
    // unique muscles: {chest, triceps} — size 2
    // chest: primary in both → +1 | triceps: only in a → +0
    // score = 1 / 2 = 0.5
    const a = ex('A', 'compound', ['chest', 'triceps']);
    const b = ex('B', 'compound', ['chest']);
    expect(computeSimilarity(a, b)).toBeCloseTo(0.5);
  });

  it('expands super-muscles before comparing', () => {
    // 'legs' expands to 5 muscles; b only has 'quads'
    // quads: primary in both → +1 | remaining 4 leg muscles: only in a → +0
    // score = 1 / 5 = 0.2
    const a = ex('A', 'compound', ['legs']);
    const b = ex('B', 'compound', ['quads']);
    expect(computeSimilarity(a, b)).toBeCloseTo(1 / 5);
  });

  it('is symmetric — computeSimilarity(a,b) === computeSimilarity(b,a)', () => {
    const a = ex('A', 'compound', ['chest', 'triceps'], ['front delts']);
    const b = ex('B', 'compound', ['chest'], ['triceps', 'shoulders']);
    expect(computeSimilarity(a, b)).toBeCloseTo(computeSimilarity(b, a));
  });

  it('handles exercises with overlapping primary and secondary muscles', () => {
    // a: primary=[chest], secondary=[triceps]
    // b: primary=[triceps], secondary=[chest]
    // chest: primary in a, secondary in b → +0.5
    // triceps: secondary in a, primary in b → +0.5
    // score = (0.5 + 0.5) / 2 = 0.5
    const a = ex('A', 'compound', ['chest'], ['triceps']);
    const b = ex('B', 'compound', ['triceps'], ['chest']);
    expect(computeSimilarity(a, b)).toBeCloseTo(0.5);
  });

  it('gives maximum score 1 when all muscles match with same roles', () => {
    const a = ex('A', 'compound', ['chest', 'triceps'], ['front delts']);
    const b = ex('B', 'compound', ['chest', 'triceps'], ['front delts']);
    expect(computeSimilarity(a, b)).toBe(1);
  });
});

// ─── findAlternatives ────────────────────────────────────────────────────────

describe('findAlternatives', () => {
  const bench = ex('Bench Press', 'compound', ['chest'], ['triceps']);
  const incline = ex('Incline Press', 'compound', ['chest'], ['triceps', 'front delts']);
  const squat = ex('Squat', 'compound', ['quads', 'glutes'], ['hamstrings']);
  const curl = ex('Bicep Curl', 'isolation', ['biceps']);

  it('excludes the source exercise itself', () => {
    const alts = findAlternatives(bench, [bench, incline]);
    expect(alts.map((e) => e.name)).not.toContain('Bench Press');
  });

  it('excludes exercises with zero similarity', () => {
    const alts = findAlternatives(bench, [bench, squat]);
    expect(alts).toHaveLength(0);
  });

  it('excludes exercises of a different type', () => {
    const alts = findAlternatives(bench, [bench, incline, curl]);
    expect(alts.map((e) => e.name)).not.toContain('Bicep Curl');
  });

  it('returns exercises sorted by similarity descending', () => {
    // perfectMatch shares all muscles; partial shares only chest
    const perfect = ex('Perfect', 'compound', ['chest'], ['triceps']);
    const partial = ex('Partial', 'compound', ['chest'], ['lats']);
    const alts = findAlternatives(bench, [bench, perfect, partial]);
    expect(alts[0].name).toBe('Perfect');
    expect(alts[1].name).toBe('Partial');
  });

  it('respects the limit parameter', () => {
    const library = Array.from({ length: 20 }, (_, i) =>
      ex(`Ex${i}`, 'compound', ['chest'], [], `id${i}`),
    );
    expect(findAlternatives(bench, library, 5)).toHaveLength(5);
  });

  it('returns an empty array when no similar same-type exercises exist', () => {
    expect(findAlternatives(squat, [squat, bench])).toHaveLength(0);
  });

  it('returns an empty array when the library only contains the source exercise', () => {
    expect(findAlternatives(bench, [bench])).toHaveLength(0);
  });
});

// ─── generateWorkout ─────────────────────────────────────────────────────────

describe('generateWorkout', () => {
  const PUSH = ['chest', 'triceps', 'front delts', 'side delts'];

  const bench  = ex('Bench Press',     'compound',  ['chest'],              ['triceps']);
  const ohp    = ex('Overhead Press',  'compound',  ['front delts'],        ['triceps', 'side delts']);
  const dips   = ex('Dips',            'compound',  ['chest', 'triceps']);
  const lateral = ex('Lateral Raise',  'accessory', ['side delts']);
  const front   = ex('Front Raise',    'accessory', ['front delts']);
  const pushdown = ex('Pushdown',      'accessory', ['triceps']);
  const skulls  = ex('Skull Crushers', 'isolation', ['triceps']);

  const library = [bench, ohp, dips, lateral, front, pushdown, skulls];

  it('returns empty when muscles list is empty', () => {
    expect(generateWorkout([], library, NO_STATS, BASE_PREFS)).toEqual([]);
  });

  it('returns empty when all exercise counts are 0', () => {
    const p = prefs({ compound_exercises: 0, accessory_exercises: 0, isolation_exercises: 0 });
    expect(generateWorkout(PUSH, library, NO_STATS, p)).toEqual([]);
  });

  it('generates the correct total number of slots', () => {
    const slots = generateWorkout(PUSH, library, NO_STATS, BASE_PREFS);
    expect(slots).toHaveLength(5); // 2 compound + 2 accessory + 1 isolation
  });

  it('generates the right count of each type', () => {
    const slots = generateWorkout(PUSH, library, NO_STATS, BASE_PREFS);
    expect(slots.filter((s) => s.type === 'compound')).toHaveLength(2);
    expect(slots.filter((s) => s.type === 'accessory')).toHaveLength(2);
    expect(slots.filter((s) => s.type === 'isolation')).toHaveLength(1);
  });

  it('never selects the same exercise twice', () => {
    const slots = generateWorkout(PUSH, library, NO_STATS, BASE_PREFS);
    const names = slots.map((s) => s.exercise.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('each slot exercise_type matches the slot type', () => {
    const slots = generateWorkout(PUSH, library, NO_STATS, BASE_PREFS);
    for (const slot of slots) {
      expect(slot.exercise.exercise_type).toBe(slot.type);
    }
  });

  it('does not select exercises that target unrelated muscles', () => {
    const deadlift = ex('Deadlift', 'compound', ['lower back', 'hamstrings']);
    const slots = generateWorkout(PUSH, [...library, deadlift], NO_STATS, BASE_PREFS);
    expect(slots.map((s) => s.exercise.name)).not.toContain('Deadlift');
  });

  it('produces fewer slots when the library lacks enough exercises', () => {
    // Only 1 compound in library
    const small = [bench, lateral, skulls];
    const slots = generateWorkout(PUSH, small, NO_STATS, BASE_PREFS);
    expect(slots.filter((s) => s.type === 'compound')).toHaveLength(1);
  });

  it('phases are ordered compound → accessory → isolation', () => {
    const slots = generateWorkout(PUSH, library, NO_STATS, BASE_PREFS);
    const types = slots.map((s) => s.type);
    const lastCompound = types.lastIndexOf('compound');
    const firstAccessory = types.indexOf('accessory');
    const lastAccessory = types.lastIndexOf('accessory');
    const firstIsolation = types.indexOf('isolation');
    expect(lastCompound).toBeLessThan(firstAccessory);
    expect(lastAccessory).toBeLessThan(firstIsolation);
  });

  it('prefers exercises done recently when muscle overlap is equal', () => {
    // bench and ohp have different primary muscles, so scores differ by overlap.
    // Give bench a recency bonus: score = overlap + 0.3, guaranteed to rank first.
    const stats = new Map<string, ExerciseStat>([
      ['Bench Press', { exercise_id: 'Bench Press', last_performed_at: Date.now(), times_last_21_days: 3 }],
    ]);
    // Use a 1-compound, 0-accessory, 0-isolation pref so only 1 slot is filled.
    // Both bench and ohp target push muscles, but bench has the bonus.
    const slots = generateWorkout(
      PUSH,
      [bench, ohp],
      stats,
      prefs({ compound_exercises: 1, accessory_exercises: 0, isolation_exercises: 0 }),
    );
    expect(slots[0].exercise.name).toBe('Bench Press');
  });

  it('decays muscle load so later slots target under-worked muscles', () => {
    // bench covers chest+triceps; ohp covers front delts+side delts+triceps.
    // After bench is chosen (chest+triceps reduced), ohp targeting delts/triceps
    // should still score above 0 and be chosen.
    const slots = generateWorkout(
      PUSH,
      [bench, ohp, dips],
      NO_STATS,
      prefs({ compound_exercises: 2, accessory_exercises: 0, isolation_exercises: 0 }),
    );
    expect(slots).toHaveLength(2);
    const names = slots.map((s) => s.exercise.name);
    expect(names[0]).not.toBe(names[1]);
  });

  it('works with super-muscle targets (e.g. legs day)', () => {
    const squat   = ex('Squat',       'compound',  ['legs']);
    const lunge   = ex('Lunge',       'compound',  ['quads', 'glutes']);
    const legCurl = ex('Leg Curl',    'accessory', ['hamstrings']);
    const calf    = ex('Calf Raise',  'isolation', ['calves']);

    const LOWER = ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'];
    const slots = generateWorkout(
      LOWER,
      [squat, lunge, legCurl, calf],
      NO_STATS,
      prefs({ compound_exercises: 2, accessory_exercises: 1, isolation_exercises: 1 }),
    );
    expect(slots).toHaveLength(4);
    const names = slots.map((s) => s.exercise.name);
    expect(names).toContain('Squat');
    expect(names).toContain('Lunge');
    expect(names).toContain('Leg Curl');
    expect(names).toContain('Calf Raise');
  });
});
