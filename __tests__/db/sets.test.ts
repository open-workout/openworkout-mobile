jest.mock('../../db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../db/database';
import { insertSet, updateSet, deleteSet, getSetsForWorkout } from '../../db/sets';

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

const BASE_INPUT = {
  workout_id: 'workout_1',
  exercise_id: 'ex_1',
  reps: 10,
  difficulty: 7,
  weight: 80,
  unit: 'kg',
  logged_at: '2026-05-26T08:30:00.000Z',
  position: 0,
};

describe('insertSet', () => {
  it('returns a non-empty id string', async () => {
    const id = await insertSet(BASE_INPUT);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('calls runAsync with an INSERT INTO sets statement', async () => {
    await insertSet(BASE_INPUT);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('INSERT INTO sets');
  });

  it('passes all set fields as SQL params', async () => {
    const id = await insertSet(BASE_INPUT);
    const [, rowId, workoutId, exerciseId, reps, difficulty, weight, unit, loggedAt] =
      mockDb.runAsync.mock.calls[0] as Array<string | number>;

    expect(rowId).toBe(id);
    expect(workoutId).toBe('workout_1');
    expect(exerciseId).toBe('ex_1');
    expect(reps).toBe(10);
    expect(difficulty).toBe(7);
    expect(weight).toBe(80);
    expect(unit).toBe('kg');
    expect(loggedAt).toBe('2026-05-26T08:30:00.000Z');
  });
});

describe('updateSet', () => {
  it('issues an UPDATE sets statement with updated values', async () => {
    await updateSet('set_1', {
      reps: 12,
      difficulty: 8,
      weight: 85,
      unit: 'kg',
      logged_at: '2026-05-26T09:00:00.000Z',
    });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sets'),
      12,
      8,
      85,
      'kg',
      '2026-05-26T09:00:00.000Z',
      null,
      null,
      'reps',
      'set_1',
    );
  });
});

describe('deleteSet', () => {
  it('issues a DELETE FROM sets statement with the id', async () => {
    await deleteSet('set_1');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM sets'),
      'set_1',
    );
  });
});

describe('getSetsForWorkout', () => {
  it('returns an empty array when the workout has no sets', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    expect(await getSetsForWorkout('w1')).toEqual([]);
  });

  it('returns all rows for the requested workout', async () => {
    const rows = [
      {
        id: 's1',
        workout_id: 'w1',
        exercise_id: 'e1',
        reps: 10,
        difficulty: 7,
        weight: 80,
        unit: 'kg',
        logged_at: '2026-05-26T08:30:00.000Z',
        created_at: 1000,
      },
    ];
    mockDb.getAllAsync.mockResolvedValue(rows);

    const result = await getSetsForWorkout('w1');
    expect(result).toHaveLength(1);
    expect(result[0].reps).toBe(10);
    expect(result[0].exercise_id).toBe('e1');
  });

  it('queries by workout_id', async () => {
    await getSetsForWorkout('w1');
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE workout_id = ?'),
      'w1',
    );
  });

  it('orders results by position ASC, created_at ASC', async () => {
    await getSetsForWorkout('w1');
    const sql = mockDb.getAllAsync.mock.calls[0][0] as string;
    expect(sql.toLowerCase()).toContain('order by position asc, created_at asc');
  });
});
