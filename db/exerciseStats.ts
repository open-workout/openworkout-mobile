import { getDb } from './database';

export async function refreshExerciseStats(workoutId: string, finishedAt: string): Promise<void> {
  const db = await getDb();
  const finishedMs = new Date(finishedAt).getTime();
  const cutoff21Days = finishedMs - 21 * 24 * 60 * 60 * 1000;

  type SetRow = { exercise_id: string; weight: number; reps: number; unit: string; logged_at: string; is_warmup: number };
  const workoutSets = await db.getAllAsync<SetRow>(
    `SELECT exercise_id, weight, reps, unit, logged_at, is_warmup FROM sets WHERE workout_id = ? ORDER BY created_at DESC`,
    workoutId,
  );

  const exerciseIds = [...new Set(workoutSets.map((s) => s.exercise_id))];

  for (const exerciseId of exerciseIds) {
    const countRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(DISTINCT s.workout_id) AS count
       FROM sets s
       JOIN workouts w ON s.workout_id = w.id
       WHERE s.exercise_id = ?
         AND w.finished_at IS NOT NULL
         AND w.created_at >= ?`,
      exerciseId,
      cutoff21Days,
    );

    const lastSet = workoutSets.find(
      (s) => s.exercise_id === exerciseId && s.logged_at !== 'seed' && s.logged_at !== 'pending' && s.is_warmup === 0,
    );

    await db.runAsync(
      `INSERT INTO exercise_stats (exercise_id, last_performed_at, times_last_21_days, last_weight, last_reps, unit)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(exercise_id) DO UPDATE SET
         last_performed_at  = excluded.last_performed_at,
         times_last_21_days = excluded.times_last_21_days,
         last_weight = CASE WHEN excluded.last_weight IS NOT NULL THEN excluded.last_weight ELSE last_weight END,
         last_reps   = CASE WHEN excluded.last_reps   IS NOT NULL THEN excluded.last_reps   ELSE last_reps   END,
         unit        = excluded.unit`,
      exerciseId,
      finishedMs,
      countRow?.count ?? 1,
      lastSet?.weight ?? null,
      lastSet?.reps ?? null,
      lastSet?.unit ?? 'kg',
    );
  }
}
