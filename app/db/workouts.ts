import { getDb } from './database';

export type Workout = {
  id: string;
  title: string;
  started_at: string;
  finished_at: string | null;
  created_at: number;
};

export type NewWorkoutInput = {
  title: string;
  started_at: string;
  finished_at?: string | null;
};

type RawWorkoutRow = {
  id: string;
  title: string;
  started_at: string;
  finished_at: string | null;
  created_at: number;
};

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertWorkout(input: NewWorkoutInput): Promise<string> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO workouts (id, title, started_at, finished_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    input.title,
    input.started_at,
    input.finished_at ?? null,
    Date.now(),
  );
  return id;
}

export async function updateWorkoutTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE workouts SET title = ? WHERE id = ?`, title, id);
}

export async function markWorkoutFinished(id: string, finishedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE workouts SET finished_at = ? WHERE id = ?`,
    finishedAt,
    id,
  );
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM workouts WHERE id = ?`, id);
}

export async function deleteAllWorkouts(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM workouts`);
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawWorkoutRow>(
    `SELECT * FROM workouts ORDER BY started_at DESC`,
  );
  return rows;
}

export async function getWorkoutById(id: string): Promise<Workout | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawWorkoutRow>(
    `SELECT * FROM workouts WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function getFinishedWorkoutsPaginated(offset: number, limit: number): Promise<Workout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawWorkoutRow>(
    `SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
  return rows;
}

export type WorkoutExerciseSummary = {
  exercise_id: string;
  exercise_name: string;
  set_count: number;
  total_volume: number;
  unit: string;
};

export async function getWorkoutExerciseSummaries(workoutId: string): Promise<WorkoutExerciseSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<WorkoutExerciseSummary>(
    `SELECT
       s.exercise_id,
       e.name AS exercise_name,
       COUNT(s.id) AS set_count,
       SUM(s.weight * s.reps) AS total_volume,
       s.unit
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     WHERE s.workout_id = ?
     GROUP BY s.exercise_id
     ORDER BY MIN(s.created_at) ASC`,
    workoutId,
  );
  return rows;
}

export type WorkoutExerciseSummaryWithWorkout = WorkoutExerciseSummary & { workout_id: string };

export async function getWorkoutExerciseSummariesBatch(
  workoutIds: string[],
): Promise<WorkoutExerciseSummaryWithWorkout[]> {
  if (workoutIds.length === 0) return [];
  const db = await getDb();
  const placeholders = workoutIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<WorkoutExerciseSummaryWithWorkout>(
    `SELECT
       s.workout_id,
       s.exercise_id,
       e.name AS exercise_name,
       COUNT(s.id) AS set_count,
       SUM(s.weight * s.reps) AS total_volume,
       s.unit
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     WHERE s.workout_id IN (${placeholders})
     GROUP BY s.workout_id, s.exercise_id
     ORDER BY s.workout_id, MIN(s.created_at) ASC`,
    ...workoutIds,
  );
  return rows;
}
