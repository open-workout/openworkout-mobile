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
