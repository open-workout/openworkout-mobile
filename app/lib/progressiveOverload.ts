import type { WorkoutSet } from '../db/sets';

export type OverloadSuggestion = {
  weight: number;
  reps: number;
  label: string;
};

const INCREMENT: Record<string, number> = {
  compound: 5,
  accessory: 2.5,
  isolation: 2.5,
};

export function computeProgressSuggestion(
  sets: WorkoutSet[],
  exerciseType: string,
  progressReps: number,
  weightUnit: 'kg' | 'lbs',
): OverloadSuggestion | null {
  if (sets.length === 0) return null;
  const best = sets.reduce((a, b) => (a.weight * a.reps >= b.weight * b.reps ? a : b));
  const inc = INCREMENT[exerciseType] ?? 2.5;
  const weight = best.reps >= progressReps ? best.weight + inc : best.weight;
  const reps = best.reps >= progressReps ? best.reps : best.reps + 2;
  const label = best.reps >= progressReps
    ? `${weight} ${weightUnit}: AMRAP`
    : `Try ${weight} ${weightUnit} × ${reps} reps`;
  return { weight, reps, label };
}
