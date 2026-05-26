import { getDb } from './database';

export type WorkoutSyncStatus = 'synced' | 'pending_create' | 'pending_delete';

export type WorkoutModel = {
  workout_id: number;
  user_id: string;
  title: string;
  started_at: string;
  finished_at: string | null;
};

export type LocalWorkout = {
  local_id: string;
  workout_id: number | null;
  user_id: string;
  title: string;
  started_at: string;
  finished_at: string | null;
  sync_status: WorkoutSyncStatus;
  created_at: number;
};

export type NewWorkoutInput = {
  title: string;
  started_at: string;
  finished_at?: string | null;
};

type RawWorkoutRow = {
  local_id: string;
  workout_id: number | null;
  user_id: string;
  title: string;
  started_at: string;
  finished_at: string | null;
  sync_status: WorkoutSyncStatus;
  created_at: number;
};

function parseRow(row: RawWorkoutRow): LocalWorkout {
  return { ...row };
}

function generateLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertPendingWorkout(
  input: NewWorkoutInput,
  userId: string,
): Promise<string> {
  const db = await getDb();
  const localId = generateLocalId();
  await db.runAsync(
    `INSERT INTO workouts
       (local_id, workout_id, user_id, title, started_at, finished_at, sync_status, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, 'pending_create', ?)`,
    localId,
    userId,
    input.title,
    input.started_at,
    input.finished_at ?? null,
    Date.now(),
  );
  return localId;
}

export async function confirmSyncedWorkout(localId: string, serverId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE workouts SET workout_id = ?, sync_status = 'synced' WHERE local_id = ?`,
    serverId,
    localId,
  );
}

export async function markWorkoutFinished(localId: string, finishedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE workouts SET finished_at = ? WHERE local_id = ?`,
    finishedAt,
    localId,
  );
}

export async function markWorkoutPendingDelete(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE workouts SET sync_status = 'pending_delete' WHERE local_id = ? AND workout_id IS NOT NULL`,
    localId,
  );
}

export async function deleteUnsyncedWorkout(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM workouts WHERE local_id = ? AND workout_id IS NULL`,
    localId,
  );
}

export async function hardDeleteWorkout(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM workouts WHERE local_id = ?`, localId);
}

export async function getPendingWorkoutsByStatus(
  status: WorkoutSyncStatus,
): Promise<LocalWorkout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawWorkoutRow>(
    `SELECT * FROM workouts WHERE sync_status = ? ORDER BY created_at ASC`,
    status,
  );
  return rows.map(parseRow);
}

export async function getAllWorkouts(userId: string): Promise<LocalWorkout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawWorkoutRow>(
    `SELECT * FROM workouts WHERE user_id = ? AND sync_status != 'pending_delete' ORDER BY started_at DESC`,
    userId,
  );
  return rows.map(parseRow);
}

export async function getWorkoutByLocalId(localId: string): Promise<LocalWorkout | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawWorkoutRow>(
    `SELECT * FROM workouts WHERE local_id = ?`,
    localId,
  );
  return row ? parseRow(row) : null;
}
