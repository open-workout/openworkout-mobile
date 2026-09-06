import { normalizeMuscle, normalizeMuscles, SIMPLIFIED_MUSCLES } from '../../lib/muscleMapping';
import exercisesCsv from '../../constants/exercisesCsv.json';

describe('normalizeMuscle', () => {
  it('passes already-simplified tags through unchanged', () => {
    for (const muscle of SIMPLIFIED_MUSCLES) {
      expect(normalizeMuscle(muscle)).toBe(muscle);
    }
  });

  it('maps delt-head tags onto shoulders', () => {
    expect(normalizeMuscle('front delts')).toBe('shoulders');
    expect(normalizeMuscle('side delts')).toBe('shoulders');
    expect(normalizeMuscle('rear delts')).toBe('shoulders');
  });

  it('maps back sub-muscle tags onto back', () => {
    expect(normalizeMuscle('lats')).toBe('back');
    expect(normalizeMuscle('traps')).toBe('back');
    expect(normalizeMuscle('rhomboids')).toBe('back');
    expect(normalizeMuscle('lower back')).toBe('back');
  });

  it('maps core onto abs', () => {
    expect(normalizeMuscle('core')).toBe('abs');
  });

  it('returns null for tags too coarse to attribute to one muscle', () => {
    expect(normalizeMuscle('legs')).toBeNull();
  });

  it('returns null for activity-type tags that are not muscles', () => {
    expect(normalizeMuscle('cardio')).toBeNull();
    expect(normalizeMuscle('plyometrics')).toBeNull();
    expect(normalizeMuscle('stretching')).toBeNull();
    expect(normalizeMuscle('weightlifting')).toBeNull();
    expect(normalizeMuscle('yoga')).toBeNull();
  });

  it('returns null for niche non-vocabulary tags', () => {
    expect(normalizeMuscle('feet')).toBeNull();
    expect(normalizeMuscle('hands')).toBeNull();
  });

  it('returns null for a completely unknown tag', () => {
    expect(normalizeMuscle('made up muscle')).toBeNull();
  });

  it('is case- and whitespace-insensitive', () => {
    expect(normalizeMuscle('  Chest ')).toBe('chest');
    expect(normalizeMuscle('FRONT DELTS')).toBe('shoulders');
  });
});

describe('normalizeMuscles', () => {
  it('dedupes muscles that fold onto the same simplified tag', () => {
    expect(normalizeMuscles(['front delts', 'side delts', 'shoulders'])).toEqual(['shoulders']);
  });

  it('drops nulls and preserves first-seen order', () => {
    expect(normalizeMuscles(['legs', 'quads', 'cardio', 'hamstrings'])).toEqual(['quads', 'hamstrings']);
  });

  it('returns an empty array for an empty input', () => {
    expect(normalizeMuscles([])).toEqual([]);
  });
});

// Coverage guard: every distinct muscle tag actually present in the exercise
// dataset must be an explicitly-understood tag (a simplified muscle itself,
// or a known mapping to null/another muscle) — not silently falling through
// due to a typo or a new tag the mapping hasn't seen yet. The detailed
// (front/side/rear delts, lats, etc.) tags stay in this set even though the
// CSV catalog no longer uses them, since AddExerciseModal still lets users
// tag custom exercises with them.
describe('dataset coverage', () => {
  const KNOWN_TAGS = new Set<string>([
    ...SIMPLIFIED_MUSCLES,
    'front delts',
    'side delts',
    'rear delts',
    'lats',
    'traps',
    'rhomboids',
    'lower back',
    'core',
    'legs',
    'cardio',
    'plyometrics',
    'stretching',
    'weightlifting',
    'yoga',
    'feet',
    'hands',
  ]);

  it('covers every muscle tag used by the CSV-derived catalog', () => {
    const tags = new Set<string>();
    for (const ex of exercisesCsv as { primaryMuscles: string[]; secondaryMuscles: string[] }[]) {
      ex.primaryMuscles.forEach((m) => tags.add(m));
      ex.secondaryMuscles.forEach((m) => tags.add(m));
    }
    for (const tag of tags) {
      expect(KNOWN_TAGS.has(tag)).toBe(true);
    }
  });
});
