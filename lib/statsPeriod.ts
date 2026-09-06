// A discriminated union (not a fixed 3-way enum) so a future "since program
// start" option is additive: add a variant here, handle it in periodStartMs,
// and add one entry to whichever PeriodSelector options array uses it — no
// other call site needs to change shape.
export type StatsPeriod = { kind: 'last_n_days'; days: number } | { kind: 'all_time' };

const DAY_MS = 24 * 60 * 60 * 1000;

// Returns the inclusive lower bound (epoch ms) for the period, or null when
// there is no lower bound (all_time).
export function periodStartMs(period: StatsPeriod, now: number = Date.now()): number | null {
  switch (period.kind) {
    case 'last_n_days':
      return now - period.days * DAY_MS;
    case 'all_time':
      return null;
  }
}

export const DEFAULT_STATS_PERIODS: { label: string; period: StatsPeriod }[] = [
  { label: '1 Week', period: { kind: 'last_n_days', days: 7 } },
  { label: '1 Month', period: { kind: 'last_n_days', days: 30 } },
  { label: 'All Time', period: { kind: 'all_time' } },
];

export function statsPeriodToParams(period: StatsPeriod): { periodKind: string; periodDays?: string } {
  if (period.kind === 'last_n_days') {
    return { periodKind: 'last_n_days', periodDays: String(period.days) };
  }
  return { periodKind: 'all_time' };
}

export function statsPeriodFromParams(params: { periodKind?: string; periodDays?: string }): StatsPeriod {
  if (params.periodKind === 'last_n_days') {
    const days = Number(params.periodDays);
    if (Number.isFinite(days) && days > 0) return { kind: 'last_n_days', days };
  }
  return { kind: 'all_time' };
}

// Stable string key for a period value — usable as a hook dependency or a
// list key, since two periods with the same kind/days should be treated as
// equal even when they're different object instances.
export function periodKey(period: StatsPeriod): string {
  return period.kind === 'last_n_days' ? `last_n_days:${period.days}` : 'all_time';
}

export function periodsEqual(a: StatsPeriod, b: StatsPeriod): boolean {
  return periodKey(a) === periodKey(b);
}
