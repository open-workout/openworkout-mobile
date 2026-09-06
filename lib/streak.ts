import type { Workout } from '../db/workouts';

export type WeekStreak = {
  streakWeeks: number;
  thisWeekCount: number;
  totalWorkouts: number;
  weeklyGoal: number;
};

// Monday-based week start, local time.
function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// Consecutive weeks (ending at the current week) with at least one finished
// workout. The current week never breaks the streak while it's still in
// progress — if it has zero workouts so far, counting simply starts from
// last week instead.
export function computeWeekStreak(finishedWorkouts: Workout[], weeklyGoal: number): WeekStreak {
  const totalWorkouts = finishedWorkouts.length;
  const weekStarts = new Set<number>();
  for (const w of finishedWorkouts) {
    if (!w.finished_at) continue;
    weekStarts.add(getWeekStart(new Date(w.finished_at)).getTime());
  }

  const currentWeekStart = getWeekStart(new Date());
  const thisWeekCount = finishedWorkouts.filter(
    (w) => w.finished_at && getWeekStart(new Date(w.finished_at)).getTime() === currentWeekStart.getTime(),
  ).length;

  const cursor = new Date(currentWeekStart);
  if (!weekStarts.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 7);
  }
  let streakWeeks = 0;
  while (weekStarts.has(cursor.getTime())) {
    streakWeeks++;
    cursor.setDate(cursor.getDate() - 7);
  }

  return { streakWeeks, thisWeekCount, totalWorkouts, weeklyGoal };
}
