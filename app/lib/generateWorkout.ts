import type { Exercise } from '../db/exercises';
import { expandMuscles } from '../constants/splits';

export type GeneratedSlot = {
  exercise: Exercise;
};

// ─── Similarity & alternatives ────────────────────────────────────────────────

export function computeSimilarity(a: Exercise, b: Exercise): number {
  const aPrimary = new Set(expandMuscles(a.primary_muscles).map((m) => m.toLowerCase()));
  const aSecondary = new Set(expandMuscles(a.secondary_muscles).map((m) => m.toLowerCase()));
  const bPrimary = new Set(expandMuscles(b.primary_muscles).map((m) => m.toLowerCase()));
  const bSecondary = new Set(expandMuscles(b.secondary_muscles).map((m) => m.toLowerCase()));

  const allMuscles = new Set([...aPrimary, ...aSecondary, ...bPrimary, ...bSecondary]);
  if (allMuscles.size === 0) return 0;

  let score = 0;
  for (const m of allMuscles) {
    const inAP = aPrimary.has(m);
    const inAS = aSecondary.has(m);
    const inBP = bPrimary.has(m);
    const inBS = bSecondary.has(m);

    if ((inAP && inBP) || (inAS && inBS)) {
      score += 1;       // same role in both
    } else if ((inAP && inBS) || (inAS && inBP)) {
      score += 0.5;     // primary ↔ secondary
    }
    // appears in only one exercise → +0
  }

  return score / allMuscles.size;
}

export function findAlternatives(
  exercise: Exercise,
  allExercises: Exercise[],
  limit = 10,
): Exercise[] {
  const key = exercise.id ?? exercise.name;
  return allExercises
    .filter((e) => (e.id ?? e.name) !== key)
    .map((e) => ({ exercise: e, similarity: computeSimilarity(exercise, e) }))
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((r) => r.exercise);
}
