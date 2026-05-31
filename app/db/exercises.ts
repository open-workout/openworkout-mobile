import { getDb } from './database';

export type Exercise = {
  id: string;
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
  weight_direction: number;
};

type RawRow = {
  id: string;
  name: string;
  exercise_type: string;
  primary_muscles: string;
  secondary_muscles: string;
  alt_names: string;
  description: string;
  weight_direction: number;
  created_at: number;
};

function parseRow(row: RawRow): Exercise {
  return {
    ...row,
    primary_muscles: JSON.parse(row.primary_muscles || '[]'),
    secondary_muscles: JSON.parse(row.secondary_muscles || '[]'),
    alt_names: JSON.parse(row.alt_names || '[]'),
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertExercise(input: NewExerciseInput): Promise<string> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO exercises
       (id, name, exercise_type, primary_muscles, secondary_muscles,
        alt_names, description, weight_direction, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.exercise_type,
    JSON.stringify(input.primary_muscles),
    JSON.stringify(input.secondary_muscles),
    JSON.stringify(input.alt_names),
    input.description,
    input.weight_direction,
    Date.now(),
  );
  return id;
}

export async function updateExercise(exercise: Exercise, input: NewExerciseInput): Promise<void> {
  const db = await getDb();
  if (exercise.id) {
    await db.runAsync(
      `UPDATE exercises SET name=?, exercise_type=?, primary_muscles=?, secondary_muscles=?, alt_names=?, description=?, weight_direction=? WHERE id=?`,
      input.name, input.exercise_type, JSON.stringify(input.primary_muscles),
      JSON.stringify(input.secondary_muscles), JSON.stringify(input.alt_names),
      input.description, input.weight_direction, exercise.id,
    );
  } else {
    await db.runAsync(
      `UPDATE exercises SET name=?, exercise_type=?, primary_muscles=?, secondary_muscles=?, alt_names=?, description=?, weight_direction=? WHERE name=?`,
      input.name, input.exercise_type, JSON.stringify(input.primary_muscles),
      JSON.stringify(input.secondary_muscles), JSON.stringify(input.alt_names),
      input.description, input.weight_direction, exercise.name,
    );
  }
}

export async function deleteExercise(exercise: Exercise): Promise<void> {
  const db = await getDb();
  if (exercise.id) {
    await db.runAsync(`DELETE FROM exercises WHERE id=?`, exercise.id);
  } else {
    await db.runAsync(`DELETE FROM exercises WHERE name=?`, exercise.name);
  }
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawRow>(
    `SELECT * FROM exercises ORDER BY created_at DESC`,
  );
  return rows.map(parseRow);
}
