import { getDb } from './database';

export type LocalWorkout = {
  local_id: string;
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
  local_id: string;
  title: string;
  started_at: string;
  finished_at: string | null;
  created_at: number;
};

function generateLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertWorkout(input: NewWorkoutInput): Promise<string> {
  const db = await getDb();
  const localId = generateLocalId();
  await db.runAsync(
    `INSERT INTO workouts (local_id, title, started_at, finished_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    localId,
    input.title,
    input.started_at,
    input.finished_at ?? null,
    Date.now(),
  );
  return localId;
}

export async function markWorkoutFinished(localId: string, finishedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE workouts SET finished_at = ? WHERE local_id = ?`,
    finishedAt,
    localId,
  );
}

export async function deleteWorkout(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM workouts WHERE local_id = ?`, localId);
}

export async function getAllWorkouts(): Promise<LocalWorkout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawWorkoutRow>(
    `SELECT * FROM workouts ORDER BY started_at DESC`,
  );
  return rows;
}

export async function getWorkoutByLocalId(localId: string): Promise<LocalWorkout | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawWorkoutRow>(
    `SELECT * FROM workouts WHERE local_id = ?`,
    localId,
  );
  return row ?? null;
}
