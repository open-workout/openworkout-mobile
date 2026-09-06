import {
  getExerciseDisplayName,
  getExerciseSearchTerms,
  exerciseMatchesQuery,
  getMuscleLabel,
} from '../../lib/exerciseTranslations';
import { FIXTURE_EXERCISES } from '../fixtures/exercises';

const BENCH_PRESS = { name: 'Bench Press (Barbell)', alt_names: ['Bench Press', 'Flat Bench'] };

describe('getExerciseDisplayName', () => {
  it('returns the translated name for a known seed exercise', () => {
    expect(getExerciseDisplayName(BENCH_PRESS, 'fr')).toBe('Développé couché (Barre)');
    expect(getExerciseDisplayName(BENCH_PRESS, 'de')).toBe('Bankdrücken (Langhantel)');
    expect(getExerciseDisplayName(BENCH_PRESS, 'ro')).toBe('Împins din culcat (Bară)');
    expect(getExerciseDisplayName(BENCH_PRESS, 'es')).toBe('Press de banca (Barra)');
  });

  it('returns the raw English name in English locale', () => {
    expect(getExerciseDisplayName(BENCH_PRESS, 'en')).toBe('Bench Press (Barbell)');
  });

  it('falls back to the raw name for an exercise with no translation entry', () => {
    // FIXTURE_EXERCISES uses ad hoc names that don't match real seed data keys.
    const fixture = FIXTURE_EXERCISES[0];
    expect(getExerciseDisplayName(fixture, 'fr')).toBe(fixture.name);
    expect(getExerciseDisplayName(fixture, 'de')).toBe(fixture.name);
  });
});

describe('exerciseMatchesQuery', () => {
  it('matches on the translated name in a non-English locale', () => {
    expect(exerciseMatchesQuery(BENCH_PRESS, 'couché', 'fr')).toBe(true);
    expect(exerciseMatchesQuery(BENCH_PRESS, 'Bankdrücken', 'de')).toBe(true);
  });

  it('still matches on the English name/alt_names regardless of active locale', () => {
    expect(exerciseMatchesQuery(BENCH_PRESS, 'bench', 'fr')).toBe(true);
    expect(exerciseMatchesQuery(BENCH_PRESS, 'flat bench', 'de')).toBe(true);
  });

  it('does not match an unrelated query', () => {
    expect(exerciseMatchesQuery(BENCH_PRESS, 'squat', 'fr')).toBe(false);
  });

  it('an untranslated user-created exercise is still searchable by its English name in a non-English locale', () => {
    const custom = { name: 'My Custom Exercise', alt_names: [] };
    expect(exerciseMatchesQuery(custom, 'custom', 'fr')).toBe(true);
  });

  it('empty query matches everything', () => {
    expect(exerciseMatchesQuery(BENCH_PRESS, '', 'fr')).toBe(true);
  });
});

describe('getExerciseSearchTerms', () => {
  it('includes both English and translated terms for a non-English locale', () => {
    const terms = getExerciseSearchTerms(BENCH_PRESS, 'fr');
    expect(terms).toContain('Bench Press (Barbell)');
    expect(terms).toContain('Bench Press');
    expect(terms).toContain('Développé couché (Barre)');
  });

  it('does not duplicate English terms as translated terms in English locale', () => {
    const terms = getExerciseSearchTerms(BENCH_PRESS, 'en');
    expect(terms).toEqual(['Bench Press (Barbell)', 'Bench Press', 'Flat Bench']);
  });
});

describe('getMuscleLabel', () => {
  it('translates a known muscle slug', () => {
    expect(getMuscleLabel('chest', 'fr')).toBe('Pectoraux');
    expect(getMuscleLabel('front delts', 'de')).toBe('Vordere Schulter');
  });

  it('falls back to the raw slug when no label exists for it', () => {
    expect(getMuscleLabel('made-up-muscle', 'fr')).toBe('made-up-muscle');
  });
});
