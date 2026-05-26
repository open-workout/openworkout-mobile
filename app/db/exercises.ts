import { getDb } from './database';

export type LocalExercise = {
  local_id: string;
  name: string;
  exercise_type: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  alt_names: string[];
  description: string;
  weight_direction: number;
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
  name: string;
  exercise_type: string;
  primary_muscles: string;
  secondary_muscles: string;
  alt_names: string;
  description: string;
  weight_direction: number;
  created_at: number;
};

function parseRow(row: RawRow): LocalExercise {
  return {
    ...row,
    primary_muscles: JSON.parse(row.primary_muscles || '[]'),
    secondary_muscles: JSON.parse(row.secondary_muscles || '[]'),
    alt_names: JSON.parse(row.alt_names || '[]'),
  };
}

function generateLocalId(): string {
  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertExercise(input: NewExerciseInput): Promise<string> {
  const db = await getDb();
  const localId = generateLocalId();
  await db.runAsync(
    `INSERT INTO exercises
       (local_id, name, exercise_type, primary_muscles, secondary_muscles,
        alt_names, description, weight_direction, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    localId,
    input.name,
    input.exercise_type,
    JSON.stringify(input.primary_muscles),
    JSON.stringify(input.secondary_muscles),
    JSON.stringify(input.alt_names),
    input.description,
    input.weight_direction,
    Date.now(),
  );
  return localId;
}

export async function getAllExercises(): Promise<LocalExercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    `SELECT * FROM exercises ORDER BY created_at DESC`,
  );
  return rows.map(parseRow);
}
