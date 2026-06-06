import { getDb } from './database';

export type Routine = {
  id: string;
  name: string;
  exercise_ids: string[];
  created_at: number;
};

export type NewRoutineInput = {
  name: string;
  exercise_ids: string[];
};

type RawRoutineRow = {
  id: string;
  name: string;
  exercise_ids: string;
  created_at: number;
};

function parseRow(row: RawRoutineRow): Routine {
  return {
    ...row,
    exercise_ids: JSON.parse(row.exercise_ids || '[]'),
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function getAllRoutines(): Promise<Routine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRoutineRow>(
    `SELECT * FROM routines ORDER BY created_at DESC`,
  );
  return rows.map(parseRow);
}

export async function insertRoutine(input: NewRoutineInput): Promise<string> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO routines (id, name, exercise_ids, created_at) VALUES (?, ?, ?, ?)`,
    id,
    input.name,
    JSON.stringify(input.exercise_ids),
    Date.now(),
  );
  return id;
}

export async function updateRoutine(id: string, input: NewRoutineInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE routines SET name = ?, exercise_ids = ? WHERE id = ?`,
    input.name,
    JSON.stringify(input.exercise_ids),
    id,
  );
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM routines WHERE id = ?`, id);
}
