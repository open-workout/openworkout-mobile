import { getDb } from './database';
import type { ExerciseStat } from '../lib/generateWorkout';

type RawStatRow = {
  exercise_id: string;
  last_performed_at: number | null;
  times_last_21_days: number;
};

export async function getAllExerciseStats(): Promise<Map<string, ExerciseStat>> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawStatRow>('SELECT * FROM exercise_stats');
  const map = new Map<string, ExerciseStat>();
  for (const row of rows) map.set(row.exercise_id, row);
  return map;
}
