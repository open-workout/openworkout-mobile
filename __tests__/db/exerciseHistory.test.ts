jest.mock('../../db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../db/database';
import { getSetHistoryForExercise } from '../../db/exerciseHistory';

const mockDb = {
  runAsync: jest.fn<Promise<void>, unknown[]>().mockResolvedValue(undefined),
  getAllAsync: jest.fn<Promise<unknown[]>, unknown[]>().mockResolvedValue([]),
  getFirstAsync: jest.fn<Promise<unknown>, unknown[]>().mockResolvedValue(null),
  execAsync: jest.fn<Promise<void>, unknown[]>().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDb).mockResolvedValue(mockDb as any);
});

describe('getSetHistoryForExercise', () => {
  it('queries by exercise_id, excludes seed/pending and unfinished workouts', async () => {
    await getSetHistoryForExercise('ex1');
    const sql = (mockDb.getAllAsync.mock.calls[0][0] as string).toLowerCase();
    expect(sql).toContain('exercise_id = ?');
    expect(sql).toContain('finished_at is not null');
    expect(sql).toContain("not in ('seed', 'pending')");
    expect(mockDb.getAllAsync.mock.calls[0][1]).toBe('ex1');
  });

  it('orders by workout finished_at then created_at, ascending (chronological)', async () => {
    await getSetHistoryForExercise('ex1');
    const sql = (mockDb.getAllAsync.mock.calls[0][0] as string).toLowerCase();
    expect(sql).toContain('order by w.finished_at asc, s.created_at asc');
  });

  it('does not filter out warmups or dropsets — full history includes them', async () => {
    await getSetHistoryForExercise('ex1');
    const sql = (mockDb.getAllAsync.mock.calls[0][0] as string).toLowerCase();
    // drop_set_number/is_warmup are still selected (needed for the returned
    // fields) but must not appear in a WHERE-clause filter.
    const whereClause = sql.slice(sql.indexOf('where'));
    expect(whereClause).not.toContain('is_warmup');
    expect(whereClause).not.toContain('drop_set_number');
  });

  it('maps mixed measurement types and dropset rows through as separate points', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: 's1', workout_id: 'w1', logged_at: '2026-05-01T10:00:00.000Z',
        weight: 80, unit: 'kg', reps: 10, duration_seconds: null, distance: null,
        measurement_type: 'reps', is_warmup: 0, drop_set_number: 0,
      },
      {
        id: 's2', workout_id: 'w1', logged_at: '2026-05-01T10:05:00.000Z',
        weight: 60, unit: 'kg', reps: 8, duration_seconds: null, distance: null,
        measurement_type: 'reps', is_warmup: 0, drop_set_number: 1,
      },
      {
        id: 's3', workout_id: 'w2', logged_at: '2026-05-08T10:00:00.000Z',
        weight: 0, unit: 'kg', reps: 0, duration_seconds: 45, distance: null,
        measurement_type: 'time', is_warmup: 0, drop_set_number: 0,
      },
    ]);

    const history = await getSetHistoryForExercise('ex1');
    expect(history).toHaveLength(3);
    expect(history[1].dropSetNumber).toBe(1);
    expect(history[1].measurementType).toBe('reps');
    expect(history[2].measurementType).toBe('time');
    expect(history[2].durationSeconds).toBe(45);
  });

  it('returns an empty array when the exercise has never been logged', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    expect(await getSetHistoryForExercise('never-logged')).toEqual([]);
  });
});
