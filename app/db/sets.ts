import { getDb } from './database';

export type SetSyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

export type ServerSet = {
  set_id: number;
  workout_id: number;
  exercise_id: number;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
};

export type LocalSet = {
  local_id: string;
  set_id: number | null;
  local_workout_id: string;
  workout_id: number | null;
  exercise_id: number;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  sync_status: SetSyncStatus;
  created_at: number;
};

export type NewSetInput = {
  local_workout_id: string;
  exercise_id: number;
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
  set_id: number | null;
  local_workout_id: string;
  workout_id: number | null;
  exercise_id: number;
  reps: number;
  difficulty: number;
  weight: number;
  unit: string;
  logged_at: string;
  sync_status: SetSyncStatus;
  created_at: number;
};

function parseRow(row: RawSetRow): LocalSet {
  return { ...row };
}

function generateLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertPendingSet(
  input: NewSetInput,
  workoutServerId: number | null,
): Promise<string> {
  const db = await getDb();
  const localId = generateLocalId();
  await db.runAsync(
    `INSERT INTO sets
       (local_id, set_id, local_workout_id, workout_id, exercise_id,
        reps, difficulty, weight, unit, logged_at, sync_status, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create', ?)`,
    localId,
    input.local_workout_id,
    workoutServerId,
    input.exercise_id,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
    Date.now(),
  );
  return localId;
}

export async function confirmSyncedSet(localId: string, serverId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sets SET set_id = ?, sync_status = 'synced' WHERE local_id = ?`,
    serverId,
    localId,
  );
}

export async function confirmUpdatedSet(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE sets SET sync_status = 'synced' WHERE local_id = ?`, localId);
}

export async function updateSet(localId: string, input: UpdateSetInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sets
     SET reps = ?, difficulty = ?, weight = ?, unit = ?, logged_at = ?,
         sync_status = CASE
           WHEN set_id IS NOT NULL AND sync_status = 'synced' THEN 'pending_update'
           ELSE sync_status
         END
     WHERE local_id = ?`,
    input.reps,
    input.difficulty,
    input.weight,
    input.unit,
    input.logged_at,
    localId,
  );
}

export async function markSetPendingDelete(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sets SET sync_status = 'pending_delete' WHERE local_id = ? AND set_id IS NOT NULL`,
    localId,
  );
}

export async function deleteUnsyncedSet(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sets WHERE local_id = ? AND set_id IS NULL`, localId);
}

export async function hardDeleteSet(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sets WHERE local_id = ?`, localId);
}

export async function propagateWorkoutIdToSets(
  localWorkoutId: string,
  workoutServerId: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sets SET workout_id = ? WHERE local_workout_id = ? AND workout_id IS NULL`,
    workoutServerId,
    localWorkoutId,
  );
}

export async function getPendingSetsByStatus(status: SetSyncStatus): Promise<LocalSet[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSetRow>(
    `SELECT * FROM sets WHERE sync_status = ? ORDER BY created_at ASC`,
    status,
  );
  return rows.map(parseRow);
}

export async function getSetsForWorkout(localWorkoutId: string): Promise<LocalSet[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSetRow>(
    `SELECT * FROM sets WHERE local_workout_id = ? AND sync_status != 'pending_delete' ORDER BY created_at ASC`,
    localWorkoutId,
  );
  return rows.map(parseRow);
}
