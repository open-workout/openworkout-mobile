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
  candidates: Exercise[];
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
  // Filter only by type and uniqueness — muscle overlap is handled by scoring.
  // Exercises with no matching primary muscles get score 0 and are picked last
  // as a fallback when the library doesn't have enough on-target exercises.
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

      slots.push({ type, candidates });

      const best = candidates[0];
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
