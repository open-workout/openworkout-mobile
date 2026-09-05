import { getDb } from './database';

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  created_at: number;
  is_pr: number;
  duration_seconds: number | null;
  is_warmup: number;
  position: number;
  drop_set_number: number;
};

export type NewSetInput = {
  id?: string;
  workout_id: string;
  exercise_id: string;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  duration_seconds?: number | null;
  is_warmup?: number;
  position: number;
  drop_set_number?: number;
};

export type UpdateSetInput = {
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  duration_seconds?: number | null;
};

type RawSetRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  created_at: number;
  is_pr: number;
  duration_seconds: number | null;
  is_warmup: number;
  position: number;
  drop_set_number: number;
};

export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertSet(input: NewSetInput): Promise<string> {
  const db = await getDb();
  const id = input.id ?? generateId();
  await db.runAsync(
    `INSERT INTO sets
       (id, workout_id, exercise_id,
        reps, difficulty, weight, unit, logged_at, created_at, duration_seconds, is_warmup, position, drop_set_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.workout_id,
    input.exercise_id,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
    Date.now(),
    input.duration_seconds ?? null,
    input.is_warmup ?? 0,
    input.position,
    input.drop_set_number ?? 0,
  );
  return id;
}

export async function updateSet(id: string, input: UpdateSetInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sets SET reps = ?, difficulty = ?, weight = ?, unit = ?, logged_at = ?, duration_seconds = ? WHERE id = ?`,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
    input.duration_seconds ?? null,
    id,
  );
}

export async function deleteSet(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sets WHERE id = ?`, id);
}

export async function deleteSetsByExercise(workoutId: string, exerciseId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM sets WHERE workout_id = ? AND exercise_id = ?`,
    workoutId,
    exerciseId,
  );
}

export async function deletePendingSetsForWorkout(workoutId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sets WHERE workout_id = ? AND logged_at = 'pending'`, workoutId);
}

export async function getSetsForWorkout(workoutId: string): Promise<WorkoutSet[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSetRow>(
    `SELECT * FROM sets WHERE workout_id = ? ORDER BY position ASC, created_at ASC`,
    workoutId,
  );
  return rows;
}

export async function getLastSetsForExercise(exerciseId: string): Promise<WorkoutSet[]> {
  const db = await getDb();
  const workout = await db.getFirstAsync<{ id: string }>(
    `SELECT w.id FROM workouts w
     JOIN sets s ON s.workout_id = w.id
     WHERE s.exercise_id = ? AND w.finished_at IS NOT NULL
     ORDER BY w.finished_at DESC LIMIT 1`,
    exerciseId,
  );
  if (!workout) return [];
  return db.getAllAsync<RawSetRow>(
    `SELECT * FROM sets
     WHERE workout_id = ? AND exercise_id = ?
       AND logged_at NOT IN ('seed', 'pending')
       AND is_warmup = 0
     ORDER BY created_at ASC`,
    workout.id,
    exerciseId,
  );
}

export async function detectAndMarkPRs(workoutId: string): Promise<number> {
  const db = await getDb();

  type SetRow = { id: string; exercise_id: string; weight: number; reps: number };
  const workoutSets = await db.getAllAsync<SetRow>(
    `SELECT id, exercise_id, weight, reps FROM sets
     WHERE workout_id = ? AND logged_at NOT IN ('seed', 'pending') AND is_warmup = 0`,
    workoutId,
  );

  const exerciseIds = [...new Set(workoutSets.map((s) => s.exercise_id))];
  let prCount = 0;

  for (const exerciseId of exerciseIds) {
    const hist = await db.getFirstAsync<{ max_weight: number | null }>(
      `SELECT MAX(s.weight) AS max_weight
       FROM sets s
       JOIN workouts w ON s.workout_id = w.id
       WHERE s.exercise_id = ?
         AND w.finished_at IS NOT NULL
         AND s.workout_id != ?
         AND s.logged_at NOT IN ('seed', 'pending')
         AND s.is_warmup = 0`,
      exerciseId,
      workoutId,
    );
    const maxWeight = hist?.max_weight ?? 0;

    let maxRepsAtMaxWeight = 0;
    if (maxWeight > 0) {
      const repsRow = await db.getFirstAsync<{ max_reps: number }>(
        `SELECT MAX(s.reps) AS max_reps
         FROM sets s
         JOIN workouts w ON s.workout_id = w.id
         WHERE s.exercise_id = ?
           AND s.weight = ?
           AND w.finished_at IS NOT NULL
           AND s.workout_id != ?
           AND s.logged_at NOT IN ('seed', 'pending')
           AND s.is_warmup = 0`,
        exerciseId,
        maxWeight,
        workoutId,
      );
      maxRepsAtMaxWeight = repsRow?.max_reps ?? 0;
    }

    // Find the single best set in this workout for this exercise
    const setsForExercise = workoutSets.filter((s) => s.exercise_id === exerciseId);
    const bestSet = setsForExercise.reduce<SetRow | null>((best, s) => {
      if (!best) return s;
      if (s.weight > best.weight) return s;
      if (s.weight === best.weight && s.reps > best.reps) return s;
      return best;
    }, null);

    if (!bestSet) continue;

    const isPR =
      bestSet.weight > maxWeight ||
      (bestSet.weight === maxWeight && bestSet.reps > maxRepsAtMaxWeight);

    if (isPR) {
      await db.runAsync(`UPDATE sets SET is_pr = 1 WHERE id = ?`, bestSet.id);
      prCount++;
    }
  }

  return prCount;
}

export async function getTotalVolume(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(weight * reps), 0) AS total
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE w.finished_at IS NOT NULL
       AND s.logged_at NOT IN ('seed', 'pending')
       AND s.is_warmup = 0`,
  );
  return row?.total ?? 0;
}

export async function getWorkoutPRCountsBatch(
  workoutIds: string[],
): Promise<Record<string, number>> {
  if (workoutIds.length === 0) return {};
  const db = await getDb();
  const placeholders = workoutIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ workout_id: string; pr_count: number }>(
    `SELECT workout_id, COUNT(DISTINCT exercise_id) AS pr_count
     FROM sets
     WHERE workout_id IN (${placeholders}) AND is_pr = 1
     GROUP BY workout_id`,
    ...workoutIds,
  );
  const result: Record<string, number> = {};
  for (const row of rows) result[row.workout_id] = row.pr_count;
  return result;
}
