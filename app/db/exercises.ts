import { getDb } from './database';

export type ExerciseModel = {
  exercise_id: number;
  name: string;
  exercise_type: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  alt_names: string[];
  description: string;
  user_id: string;
  is_private: boolean;
  weight_direction: number;
  updated_at: string;
};

export type LocalExercise = {
  local_id: string;
  exercise_id: number | null;
  name: string;
  exercise_type: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  alt_names: string[];
  description: string;
  user_id: string;
  is_private: boolean;
  weight_direction: number;
  sync_status: 'synced' | 'pending_create';
  created_at: number;
};

export type NewExerciseInput = {
  name: string;
  exercise_type: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  alt_names: string[];
  description: string;
  is_private: boolean;
  weight_direction: number;
};

type RawRow = {
  local_id: string;
  exercise_id: number | null;
  name: string;
  exercise_type: string;
  primary_muscles: string;
  secondary_muscles: string;
  alt_names: string;
  description: string;
  user_id: string;
  is_private: number;
  weight_direction: number;
  sync_status: 'synced' | 'pending_create';
  created_at: number;
};

function parseRow(row: RawRow): LocalExercise {
  return {
    ...row,
    primary_muscles: JSON.parse(row.primary_muscles || '[]'),
    secondary_muscles: JSON.parse(row.secondary_muscles || '[]'),
    alt_names: JSON.parse(row.alt_names || '[]'),
    is_private: row.is_private === 1,
  };
}

function generateLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function upsertServerExercises(exercises: ExerciseModel[]): Promise<void> {
  const db = await getDb();
  for (const ex of exercises) {
    await db.runAsync(
      `INSERT INTO exercises
         (local_id, exercise_id, name, exercise_type, primary_muscles, secondary_muscles,
          alt_names, description, user_id, is_private, weight_direction, sync_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)
       ON CONFLICT(exercise_id) DO UPDATE SET
         name             = excluded.name,
         exercise_type    = excluded.exercise_type,
         primary_muscles  = excluded.primary_muscles,
         secondary_muscles = excluded.secondary_muscles,
         alt_names        = excluded.alt_names,
         description      = excluded.description,
         user_id          = excluded.user_id,
         is_private       = excluded.is_private,
         weight_direction = excluded.weight_direction,
         sync_status      = 'synced'
       WHERE exercises.sync_status != 'pending_create'`,
      `server_${ex.exercise_id}`,
      ex.exercise_id,
      ex.name,
      ex.exercise_type,
      JSON.stringify(ex.primary_muscles ?? []),
      JSON.stringify(ex.secondary_muscles ?? []),
      JSON.stringify(ex.alt_names ?? []),
      ex.description,
      ex.user_id,
      ex.is_private ? 1 : 0,
      ex.weight_direction,
      Date.now(),
    );
  }
}

export async function removeStaleExercises(serverIds: number[]): Promise<void> {
  if (serverIds.length === 0) return;
  const db = await getDb();
  const placeholders = serverIds.map(() => '?').join(',');
  await db.runAsync(
    `DELETE FROM exercises
     WHERE exercise_id IS NOT NULL
       AND sync_status = 'synced'
       AND exercise_id NOT IN (${placeholders})`,
    ...serverIds,
  );
}

export async function insertPendingExercise(
  input: NewExerciseInput,
  userId: string,
): Promise<string> {
  const db = await getDb();
  const localId = generateLocalId();
  await db.runAsync(
    `INSERT INTO exercises
       (local_id, exercise_id, name, exercise_type, primary_muscles, secondary_muscles,
        alt_names, description, user_id, is_private, weight_direction, sync_status, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create', ?)`,
    localId,
    input.name,
    input.exercise_type,
    JSON.stringify(input.primary_muscles),
    JSON.stringify(input.secondary_muscles),
    JSON.stringify(input.alt_names),
    input.description,
    userId,
    input.is_private ? 1 : 0,
    input.weight_direction,
    Date.now(),
  );
  return localId;
}

export async function confirmSyncedExercise(localId: string, serverId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE exercises SET exercise_id = ?, sync_status = 'synced' WHERE local_id = ?`,
    serverId,
    localId,
  );
}

export async function getAllExercises(userId: string): Promise<LocalExercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    `SELECT * FROM exercises WHERE is_private = 0 OR user_id = ? ORDER BY created_at DESC`,
    userId,
  );
  return rows.map(parseRow);
}

export async function getPendingExercises(): Promise<LocalExercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    `SELECT * FROM exercises WHERE sync_status = 'pending_create'`,
  );
  return rows.map(parseRow);
}

export async function getLastSyncedAt(): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_synced_at'`,
  );
  return row ? parseInt(row.value, 10) : null;
}

export async function setLastSyncedAt(ts: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_synced_at', ?)`,
    ts.toString(),
  );
}
