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
};

export type NewSetInput = {
  workout_id: string;
  exercise_id: string;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
};

export type UpdateSetInput = {
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
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
};

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertSet(input: NewSetInput): Promise<string> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO sets
       (id, workout_id, exercise_id,
        reps, difficulty, weight, unit, logged_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.workout_id,
    input.exercise_id,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
    Date.now(),
  );
  return id;
}

export async function updateSet(id: string, input: UpdateSetInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sets SET reps = ?, difficulty = ?, weight = ?, unit = ?, logged_at = ? WHERE id = ?`,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
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

export async function getSetsForWorkout(workoutId: string): Promise<WorkoutSet[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSetRow>(
    `SELECT * FROM sets WHERE workout_id = ? ORDER BY created_at ASC`,
    workoutId,
  );
  return rows;
}
