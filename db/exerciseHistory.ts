import { getDb } from './database';

export type ExerciseHistoryPoint = {
  setId: string;
  workoutId: string;
  loggedAt: string;
  weight: number;
  unit: string;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  measurementType: 'reps' | 'time' | 'distance';
  isWarmup: boolean;
  dropSetNumber: number;
};

type HistoryRow = {
  id: string;
  workout_id: string;
  logged_at: string;
  weight: number;
  unit: string;
  reps: number;
  duration_seconds: number | null;
  distance: number | null;
  measurement_type: string;
  is_warmup: number;
  drop_set_number: number;
};

// Full history for one exercise across every finished workout, oldest first
// (so a chart can draw left-to-right chronologically). Unlike
// getLastSetsForExercise (sets.ts), this isn't scoped to the latest workout
// and doesn't exclude warmups at the SQL level — a history view benefits
// from completeness; callers decide whether to fold warmups into a chart.
export async function getSetHistoryForExercise(exerciseId: string): Promise<ExerciseHistoryPoint[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<HistoryRow>(
    `SELECT s.id, s.workout_id, s.logged_at, s.weight, s.unit, s.reps,
            s.duration_seconds, s.distance, s.measurement_type, s.is_warmup, s.drop_set_number
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise_id = ?
       AND w.finished_at IS NOT NULL
       AND s.logged_at NOT IN ('seed', 'pending')
     ORDER BY w.finished_at ASC, s.created_at ASC`,
    exerciseId,
  );
  return rows.map((row) => ({
    setId: row.id,
    workoutId: row.workout_id,
    loggedAt: row.logged_at,
    weight: row.weight,
    unit: row.unit,
    reps: row.reps,
    durationSeconds: row.duration_seconds,
    distance: row.distance,
    measurementType: (row.measurement_type as 'reps' | 'time' | 'distance') || 'reps',
    isWarmup: !!row.is_warmup,
    dropSetNumber: row.drop_set_number,
  }));
}
