import { getDb } from './database';
import { normalizeMuscles, type SimplifiedMuscle } from '../lib/muscleMapping';
import { periodStartMs, type StatsPeriod } from '../lib/statsPeriod';

type ScopedSetRow = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  primary_muscles: string;
  secondary_muscles: string;
  logged_at: string;
  weight: number;
  unit: string;
  reps: number;
  duration_seconds: number | null;
  distance: number | null;
  measurement_type: string;
  finished_at: string;
};

// Every finished, real (non-seed/pending), non-warmup set in the period, with
// its exercise's muscle tags normalized onto the simplified vocabulary
// attached. Note: no filter on drop_set_number — every dropset row is a
// distinct set and counts toward its muscles just like any other set.
type ScopedSetWithMuscles = ScopedSetRow & { muscles: SimplifiedMuscle[] };

async function getScopedSetsWithMuscles(period: StatsPeriod): Promise<ScopedSetWithMuscles[]> {
  const db = await getDb();
  const startMs = periodStartMs(period);
  const startIso = startMs !== null ? new Date(startMs).toISOString() : null;

  const rows = await db.getAllAsync<ScopedSetRow>(
    `SELECT s.id, s.exercise_id, e.name AS exercise_name,
            e.primary_muscles, e.secondary_muscles,
            s.logged_at, s.weight, s.unit, s.reps,
            s.duration_seconds, s.distance, s.measurement_type,
            w.finished_at
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     JOIN exercises e ON s.exercise_id = e.id
     WHERE w.finished_at IS NOT NULL
       AND s.logged_at NOT IN ('seed', 'pending')
       AND s.is_warmup = 0
       AND (? IS NULL OR w.finished_at >= ?)`,
    startIso,
    startIso,
  );

  return rows.map((row) => ({
    ...row,
    muscles: normalizeMuscles([
      ...JSON.parse(row.primary_muscles || '[]'),
      ...JSON.parse(row.secondary_muscles || '[]'),
    ]),
  }));
}

export type MuscleSetCount = { muscle: SimplifiedMuscle; setCount: number };

// A set contributes to every distinct simplified muscle it touches (primary
// and secondary, deduped) — a set hitting 2 muscles increments both by 1.
export async function getMuscleSetCounts(period: StatsPeriod): Promise<MuscleSetCount[]> {
  const rows = await getScopedSetsWithMuscles(period);
  const counts = new Map<SimplifiedMuscle, number>();
  for (const row of rows) {
    for (const muscle of row.muscles) {
      counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([muscle, setCount]) => ({ muscle, setCount }));
}

export type MuscleSetEntry = {
  setId: string;
  exerciseId: string;
  exerciseName: string;
  loggedAt: string;
  weight: number;
  unit: string;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  measurementType: 'reps' | 'time' | 'distance';
};

export async function getSetsForMuscle(
  muscle: SimplifiedMuscle,
  period: StatsPeriod,
): Promise<MuscleSetEntry[]> {
  const rows = await getScopedSetsWithMuscles(period);
  return rows
    .filter((row) => row.muscles.includes(muscle))
    .sort((a, b) => (a.finished_at < b.finished_at ? 1 : -1))
    .map((row) => ({
      setId: row.id,
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      loggedAt: row.logged_at,
      weight: row.weight,
      unit: row.unit,
      reps: row.reps,
      durationSeconds: row.duration_seconds,
      distance: row.distance,
      measurementType: (row.measurement_type as 'reps' | 'time' | 'distance') || 'reps',
    }));
}

function toLocalDateString(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Distinct calendar days (local time, 'YYYY-MM-DD') on which >=1 set touching
// `muscle` was logged, bucketed by the owning workout's finished_at (not
// logged_at, which can hold the 'seed'/'pending' sentinels).
export async function getTrainedDatesForMuscle(
  muscle: SimplifiedMuscle,
  period: StatsPeriod,
): Promise<string[]> {
  const rows = await getScopedSetsWithMuscles(period);
  const dates = new Set<string>();
  for (const row of rows) {
    if (row.muscles.includes(muscle)) {
      dates.add(toLocalDateString(row.finished_at));
    }
  }
  return Array.from(dates).sort();
}
