// Integration tests for the pick-day → generateWorkout flow.
// Covers: split day muscle derivation, canGenerate conditions, and
// end-to-end slot generation for each preset day type.

import { generateWorkout, type ExerciseStat } from '../app/lib/generateWorkout';
import { expandMuscles, PRESET_SPLITS } from '../app/constants/splits';
import type { Exercise } from '../app/db/exercises';
import type { WorkoutPreferences } from '../app/storage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ex(
  name: string,
  type: 'compound' | 'accessory' | 'isolation',
  primary: string[],
  secondary: string[] = [],
): Exercise {
  return { id: name, name, exercise_type: type, primary_muscles: primary, secondary_muscles: secondary, alt_names: [], description: '', weight_direction: 1, created_at: 0 };
}

const NO_STATS = new Map<string, ExerciseStat>();

const DEFAULT_PREFS: WorkoutPreferences = {
  compound_exercises: 2,
  accessory_exercises: 2,
  isolation_exercises: 1,
  compound_sets: 4,
  accessory_sets: 3,
  isolation_sets: 3,
  progress_reps: 8,
};

/** Returns the expanded muscle list for a named day in a named preset split. */
function musclesForDay(splitName: string, dayName: string): string[] {
  const split = PRESET_SPLITS.find((s) => s.name === splitName);
  const day = split?.days.find((d) => d.name === dayName);
  return expandMuscles(day?.muscles ?? []);
}

// ─── Split day muscle derivation ─────────────────────────────────────────────

describe('split day muscle derivation', () => {
  it('PPL Push day → chest, triceps, front delts, side delts', () => {
    const muscles = musclesForDay('PPL', 'Push');
    expect(muscles).toEqual(expect.arrayContaining(['chest', 'triceps', 'front delts', 'side delts']));
    expect(muscles).not.toContain('lats');
    expect(muscles).not.toContain('quads');
  });

  it('PPL Pull day → back muscles and biceps/forearms', () => {
    const muscles = musclesForDay('PPL', 'Pull');
    expect(muscles).toEqual(expect.arrayContaining(['lats', 'rhomboids', 'traps', 'lower back', 'biceps', 'forearms', 'rear delts']));
    expect(muscles).not.toContain('chest');
  });

  it('PPL Legs day → full set of leg muscles', () => {
    const muscles = musclesForDay('PPL', 'Legs');
    expect(muscles).toEqual(expect.arrayContaining(['quads', 'hamstrings', 'glutes', 'adductors', 'calves']));
    expect(muscles).not.toContain('chest');
  });

  it('Upper/Lower Upper day contains chest, back, shoulder and arm muscles', () => {
    const muscles = musclesForDay('Upper / Lower', 'Upper');
    expect(muscles).toEqual(expect.arrayContaining(['chest', 'biceps', 'triceps', 'lats', 'front delts']));
  });

  it('Upper/Lower Lower day matches PPL Legs day muscles', () => {
    const upperLowerLegs = musclesForDay('Upper / Lower', 'Lower');
    const pplLegs = musclesForDay('PPL', 'Legs');
    expect(upperLowerLegs.sort()).toEqual(pplLegs.sort());
  });

  it('expandMuscles is idempotent — already-expanded muscles are unchanged', () => {
    const pushMuscles = ['chest', 'triceps', 'front delts', 'side delts'];
    expect(expandMuscles(pushMuscles)).toEqual(pushMuscles);
  });

  it('Full Body day contains muscles from all major groups', () => {
    const muscles = musclesForDay('Full Body', 'Full Body');
    expect(muscles).toEqual(expect.arrayContaining(['chest', 'quads', 'lats', 'front delts', 'core']));
  });
});

// ─── canGenerate conditions ───────────────────────────────────────────────────

describe('canGenerate conditions (pick-day logic)', () => {
  // Mirrors the pick-day.tsx derivation:
  //   activeMuscles = expandMuscles(selectedDay ? day.muscles : selectedMuscles)
  //   canGenerate = activeMuscles.length > 0 && exercises.length > 0 && prefs !== null

  function canGenerate(muscles: string[], exercises: Exercise[], p: WorkoutPreferences | null): boolean {
    return muscles.length > 0 && exercises.length > 0 && p !== null;
  }

  const someExercises = [ex('Bench', 'compound', ['chest'])];
  const pushMuscles = musclesForDay('PPL', 'Push');

  it('is true when a split day is selected, exercises exist, and prefs are loaded', () => {
    expect(canGenerate(pushMuscles, someExercises, DEFAULT_PREFS)).toBe(true);
  });

  it('is false when no day is selected (empty muscles)', () => {
    expect(canGenerate([], someExercises, DEFAULT_PREFS)).toBe(false);
  });

  it('is false when the exercise library is empty', () => {
    expect(canGenerate(pushMuscles, [], DEFAULT_PREFS)).toBe(false);
  });

  it('is false when prefs have not loaded yet (null)', () => {
    expect(canGenerate(pushMuscles, someExercises, null)).toBe(false);
  });

  it('is false when muscles come from an empty custom selection', () => {
    expect(canGenerate(expandMuscles([]), someExercises, DEFAULT_PREFS)).toBe(false);
  });

  it('is true when muscles come from a non-empty custom muscle selection', () => {
    expect(canGenerate(expandMuscles(['chest', 'biceps']), someExercises, DEFAULT_PREFS)).toBe(true);
  });
});

// ─── End-to-end: split day → generateWorkout ─────────────────────────────────

describe('end-to-end: split day selection → workout generation', () => {
  // Push library
  const pushLibrary: Exercise[] = [
    ex('Bench Press',    'compound',  ['chest'],           ['triceps']),
    ex('Incline Press',  'compound',  ['chest'],           ['front delts']),
    ex('Lateral Raise',  'accessory', ['side delts']),
    ex('Front Raise',    'accessory', ['front delts']),
    ex('Pushdown',       'accessory', ['triceps']),
    ex('Skull Crushers', 'isolation', ['triceps']),
  ];

  // Lower library
  const lowerLibrary: Exercise[] = [
    ex('Squat',       'compound',  ['quads', 'glutes'],  ['hamstrings']),
    ex('Deadlift',    'compound',  ['hamstrings', 'glutes'], ['lower back', 'quads']),
    ex('Leg Press',   'compound',  ['quads', 'glutes']),
    ex('Leg Curl',    'accessory', ['hamstrings']),
    ex('Leg Extension', 'accessory', ['quads']),
    ex('Calf Raise',  'isolation', ['calves']),
  ];

  it('Push day generates only push-muscle exercises', () => {
    const muscles = musclesForDay('PPL', 'Push');
    const slots = generateWorkout(muscles, pushLibrary, NO_STATS, DEFAULT_PREFS);

    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const allMuscles = [...slot.exercise.primary_muscles, ...slot.exercise.secondary_muscles];
      const expanded = expandMuscles(allMuscles);
      const overlaps = expanded.some((m) => muscles.includes(m));
      expect(overlaps).toBe(true);
    }
  });

  it('Lower day generates leg exercises (previously a silent no-op bug)', () => {
    // This covers the bug where Lower generated 0 slots, making the button
    // appear to do nothing. The algorithm should fill slots from leg muscles.
    const muscles = musclesForDay('Upper / Lower', 'Lower');
    const slots = generateWorkout(muscles, lowerLibrary, NO_STATS, DEFAULT_PREFS);

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.filter((s) => s.type === 'compound').length).toBeGreaterThan(0);
  });

  it('does not mix exercises from different days (Push vs Pull)', () => {
    const pushMuscles = musclesForDay('PPL', 'Push');
    const pullLibrary: Exercise[] = [
      ex('Pull-Up',       'compound',  ['lats'],    ['biceps']),
      ex('Barbell Row',   'compound',  ['rhomboids', 'traps'], ['biceps', 'lower back']),
      ex('Bicep Curl',    'isolation', ['biceps']),
      ex('Face Pull',     'accessory', ['rear delts', 'traps']),
    ];

    // Push muscles passed to generateWorkout — pull exercises target lats/rhomboids,
    // none of which are in pushMuscles, so they should not appear.
    const slots = generateWorkout(pushMuscles, [...pushLibrary, ...pullLibrary], NO_STATS, DEFAULT_PREFS);
    const names = slots.map((s) => s.exercise.name);

    expect(names).not.toContain('Pull-Up');
    expect(names).not.toContain('Barbell Row');
    expect(names).not.toContain('Bicep Curl');
  });

  it('generates a workout even when fewer exercises exist than requested slots', () => {
    // Only 1 compound for Lower day — should still generate 1 compound slot
    const thinLibrary = [
      ex('Squat',    'compound',  ['quads', 'glutes']),
      ex('Leg Curl', 'accessory', ['hamstrings']),
    ];
    const muscles = musclesForDay('Upper / Lower', 'Lower');
    const slots = generateWorkout(muscles, thinLibrary, NO_STATS, DEFAULT_PREFS);

    expect(slots.filter((s) => s.type === 'compound')).toHaveLength(1);
    expect(slots.filter((s) => s.type === 'accessory')).toHaveLength(1);
  });

  it('Full Body day can generate exercises across multiple muscle groups', () => {
    const muscles = musclesForDay('Full Body', 'Full Body');
    const fullLibrary: Exercise[] = [
      ...pushLibrary,
      ...lowerLibrary,
      ex('Pull-Up',     'compound',  ['lats'],    ['biceps']),
      ex('Barbell Row', 'compound',  ['rhomboids', 'traps']),
      ex('Bicep Curl',  'isolation', ['biceps']),
      ex('Face Pull',   'accessory', ['rear delts']),
    ];
    const slots = generateWorkout(
      muscles,
      fullLibrary,
      NO_STATS,
      { ...DEFAULT_PREFS, compound_exercises: 3, accessory_exercises: 3, isolation_exercises: 2 },
    );

    expect(slots.length).toBeGreaterThan(0);
    // No duplicates
    const names = slots.map((s) => s.exercise.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
