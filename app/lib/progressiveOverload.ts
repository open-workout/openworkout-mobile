import type { WorkoutSet } from '../db/sets';

export type OverloadSuggestion = {
  weight: number;
  reps: number;
  isAmrap: boolean;
  label: string;
};

const INCREMENT = 2.5;

export function computeProgressSuggestion(
  sets: WorkoutSet[],
  progressReps: number,
  weightUnit: 'kg' | 'lbs',
  t: (key: string, options?: Record<string, unknown>) => string,
): OverloadSuggestion | null {
  if (sets.length === 0) return null;
  const best = sets.reduce((a, b) =>
    a.weight > b.weight || (a.weight === b.weight && a.reps >= b.reps) ? a : b,
  );
  const isAmrap = best.reps >= progressReps;
  const weight = isAmrap ? best.weight + INCREMENT : best.weight;
  const reps = isAmrap ? best.reps : best.reps + 2;
  const label = isAmrap
    ? t('amrapLabel', { weight, unit: weightUnit })
    : t('tryLabel', { weight, unit: weightUnit, reps });
  return { weight, reps, isAmrap, label };
}
