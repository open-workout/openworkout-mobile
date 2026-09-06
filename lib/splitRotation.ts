import type { Split } from '../constants/splits';
import type { Workout } from '../db/workouts';

// The split is a pure ordered rotation — it is never mapped onto specific
// calendar weekdays. "Next" is purely history-driven: the day after whichever
// split day was most recently completed, wrapping around.
export function getNextSplitDayName(split: Split | null, finishedWorkouts: Workout[]): string | null {
  if (!split || split.days.length === 0) return null;

  const dayNames = new Set(split.days.map((d) => d.name));
  const lastSplitWorkout = [...finishedWorkouts]
    .filter((w) => w.finished_at && w.split_day_name && dayNames.has(w.split_day_name))
    .sort((a, b) => new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime())[0];

  if (!lastSplitWorkout) return split.days[0].name;

  const idx = split.days.findIndex((d) => d.name === lastSplitWorkout.split_day_name);
  if (idx === -1) return split.days[0].name;
  return split.days[(idx + 1) % split.days.length].name;
}
