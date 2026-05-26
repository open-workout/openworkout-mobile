import { getDb } from './database';

export type LocalSet = {
  local_id: string;
  local_workout_id: string;
  local_exercise_id: string;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  created_at: number;
};

export type NewSetInput = {
  local_workout_id: string;
  local_exercise_id: string;
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
  local_id: string;
  local_workout_id: string;
  local_exercise_id: string;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  created_at: number;
};

function generateLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertSet(input: NewSetInput): Promise<string> {
  const db = await getDb();
  const localId = generateLocalId();
  await db.runAsync(
    `INSERT INTO sets
       (local_id, local_workout_id, local_exercise_id,
        reps, difficulty, weight, unit, logged_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    localId,
    input.local_workout_id,
    input.local_exercise_id,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
    Date.now(),
  );
  return localId;
}

export async function updateSet(localId: string, input: UpdateSetInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sets SET reps = ?, difficulty = ?, weight = ?, unit = ?, logged_at = ? WHERE local_id = ?`,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
    localId,
  );
}

export async function deleteSet(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sets WHERE local_id = ?`, localId);
}

export async function getSetsForWorkout(localWorkoutId: string): Promise<LocalSet[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSetRow>(
    `SELECT * FROM sets WHERE local_workout_id = ? ORDER BY created_at ASC`,
    localWorkoutId,
  );
  return rows;
}
