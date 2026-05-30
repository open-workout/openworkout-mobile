import type { Exercise } from '../db/exercises';
import type { WorkoutPreferences } from '../storage';

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
  let overlap = 0;
  for (const m of exercise.primary_muscles) {
    if (m in muscleLoad) overlap += muscleLoad[m];
  }
  const stat = stats.get(exercise.id ?? exercise.name);
  const recencyBonus = (stat?.times_last_21_days ?? 0) > 0 ? 0.3 : 0;
  return overlap + recencyBonus;
}

function rankCandidates(
  exercises: Exercise[],
  type: string,
  muscles: string[],
  muscleLoad: Record<string, number>,
  stats: Map<string, ExerciseStat>,
  chosen: Set<string>,
): Exercise[] {
  return exercises
    .filter((e) => {
      const key = e.id ?? e.name;
      return (
        e.exercise_type === type &&
        !chosen.has(key) &&
        e.primary_muscles.some((m) => muscles.includes(m))
      );
    })
    .map((e) => ({ exercise: e, score: scoreExercise(e, muscleLoad, stats) }))
    .sort((a, b) => b.score - a.score)
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
      const candidates = rankCandidates(exercises, type, muscles, muscleLoad, stats, chosen);
      if (candidates.length === 0) continue;

      slots.push({ type, candidates });

      const best = candidates[0];
      const bestKey = best.id ?? best.name;
      chosen.add(bestKey);

      for (const m of best.primary_muscles) {
        if (m in muscleLoad) {
          muscleLoad[m] = Math.max(0, muscleLoad[m] - 1 / E);
        }
      }
    }
  }

  return slots;
}
