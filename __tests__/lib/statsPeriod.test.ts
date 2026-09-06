import {
  periodStartMs,
  periodKey,
  periodsEqual,
  statsPeriodToParams,
  statsPeriodFromParams,
} from '../../app/lib/statsPeriod';

describe('periodStartMs', () => {
  it('returns null (no lower bound) for all_time', () => {
    expect(periodStartMs({ kind: 'all_time' })).toBeNull();
  });

  it('returns now minus N days for last_n_days', () => {
    const now = 1_000_000_000_000;
    const result = periodStartMs({ kind: 'last_n_days', days: 7 }, now);
    expect(result).toBe(now - 7 * 24 * 60 * 60 * 1000);
  });

  it('handles a 1-day period', () => {
    const now = 1_000_000_000_000;
    expect(periodStartMs({ kind: 'last_n_days', days: 1 }, now)).toBe(now - 24 * 60 * 60 * 1000);
  });
});

describe('periodKey / periodsEqual', () => {
  it('gives the same key to two equivalent last_n_days periods', () => {
    expect(periodKey({ kind: 'last_n_days', days: 30 })).toBe(periodKey({ kind: 'last_n_days', days: 30 }));
    expect(periodsEqual({ kind: 'last_n_days', days: 30 }, { kind: 'last_n_days', days: 30 })).toBe(true);
  });

  it('gives different keys to different day counts', () => {
    expect(periodKey({ kind: 'last_n_days', days: 7 })).not.toBe(periodKey({ kind: 'last_n_days', days: 30 }));
    expect(periodsEqual({ kind: 'last_n_days', days: 7 }, { kind: 'last_n_days', days: 30 })).toBe(false);
  });

  it('treats all_time as distinct from any last_n_days period', () => {
    expect(periodsEqual({ kind: 'all_time' }, { kind: 'last_n_days', days: 36500 })).toBe(false);
  });
});

describe('statsPeriodToParams / statsPeriodFromParams round-trip', () => {
  it('round-trips a last_n_days period', () => {
    const period = { kind: 'last_n_days' as const, days: 30 };
    expect(statsPeriodFromParams(statsPeriodToParams(period))).toEqual(period);
  });

  it('round-trips an all_time period', () => {
    const period = { kind: 'all_time' as const };
    expect(statsPeriodFromParams(statsPeriodToParams(period))).toEqual(period);
  });

  it('falls back to all_time for missing/invalid params', () => {
    expect(statsPeriodFromParams({})).toEqual({ kind: 'all_time' });
    expect(statsPeriodFromParams({ periodKind: 'last_n_days', periodDays: 'not-a-number' })).toEqual({ kind: 'all_time' });
  });
});
