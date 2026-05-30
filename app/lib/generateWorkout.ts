import type { Exercise } from '../db/exercises';
import type { WorkoutPreferences } from '../storage';
import { expandMuscles } from '../constants/splits';

export type ExerciseStat = {
  exercise_id: string;
  last_performed_at: number | null;
  times_last_21_days: number;
};

export type GeneratedSlot = {
  type: 'compound' | 'accessory' | 'isolation';
  exercise: Exercise;
};

function scoreExercise(
  exercise: Exercise,
  muscleLoad: Record<string, number>,
  stats: Map<string, ExerciseStat>,
): number {
  const allMuscles = [...new Set([...exercise.primary_muscles, ...exercise.secondary_muscles])];
  const expanded = expandMuscles(allMuscles);
  let overlap = 0;
  for (const m of expanded) {
    const key = Object.keys(muscleLoad).find((k) => k.toLowerCase() === m.toLowerCase());
    if (key !== undefined) overlap += muscleLoad[key];
  }
  const n = expanded.length;
  const normalizedOverlap = n > 0 ? overlap / n : 0;
  const stat = stats.get(exercise.id ?? exercise.name);
  const recencyBonus = (stat?.times_last_21_days ?? 0) > 0 ? 0.3 : 0;
  return normalizedOverlap + recencyBonus;
}

function rankCandidates(
  exercises: Exercise[],
  type: string,
  muscleLoad: Record<string, number>,
  stats: Map<string, ExerciseStat>,
  chosen: Set<string>,
): Exercise[] {
  return exercises
    .filter((e) => e.exercise_type === type && !chosen.has(e.id ?? e.name))
    .map((e) => ({ exercise: e, score: scoreExercise(e, muscleLoad, stats) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || Math.random() - 0.5)
    .map((r) => r.exercise);
}

export function generateWorkout(
  muscles: string[],
  exercises: Exercise[],
  stats: Map<string, ExerciseStat>,
  prefs: WorkoutPreferences,
): GeneratedSlot[] {
  const E = prefs.compound_exercises + prefs.accessory_exercises + prefs.isolation_exercises;
  if (E === 0 || muscles.length === 0) return [];

  const muscleLoad: Record<string, number> = {};
  for (const m of muscles) muscleLoad[m] = 1.0;

  const slots: GeneratedSlot[] = [];
  const chosen = new Set<string>();

  const phases: Array<{ type: 'compound' | 'accessory' | 'isolation'; count: number }> = [
    { type: 'compound', count: prefs.compound_exercises },
    { type: 'accessory', count: prefs.accessory_exercises },
    { type: 'isolation', count: prefs.isolation_exercises },
  ];

  for (const { type, count } of phases) {
    for (let i = 0; i < count; i++) {
      const candidates = rankCandidates(exercises, type, muscleLoad, stats, chosen);
      if (candidates.length === 0) continue;

      const best = candidates[0];
      slots.push({ type, exercise: best });

      const bestKey = best.id ?? best.name;
      chosen.add(bestKey);

      const bestMuscles = [...new Set([...best.primary_muscles, ...best.secondary_muscles])];
      for (const m of expandMuscles(bestMuscles)) {
        const key = Object.keys(muscleLoad).find((k) => k.toLowerCase() === m.toLowerCase());
        if (key !== undefined) {
          muscleLoad[key] = Math.max(0, muscleLoad[key] - 1 / E);
        }
      }
    }
  }

  return slots;
}

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
    .filter((e) => (e.id ?? e.name) !== key && e.exercise_type === exercise.exercise_type)
    .map((e) => ({ exercise: e, similarity: computeSimilarity(exercise, e) }))
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map((r) => r.exercise);
}
