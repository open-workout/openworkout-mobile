jest.mock('../../app/db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../app/db/database';
import { insertSet, updateSet, deleteSet, getSetsForWorkout } from '../../app/db/sets';

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
  local_workout_id: 'local_workout_1',
  local_exercise_id: 'local_ex_1',
  reps: 10,
  difficulty: 7,
  weight: 80,
  unit: 'kg',
  logged_at: '2026-05-26T08:30:00.000Z',
};

describe('insertSet', () => {
  it('returns a local_id with the expected prefix', async () => {
    const id = await insertSet(BASE_INPUT);
    expect(id).toMatch(/^local_/);
  });

  it('calls runAsync with an INSERT INTO sets statement', async () => {
    await insertSet(BASE_INPUT);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('INSERT INTO sets');
  });

  it('passes all set fields as SQL params', async () => {
    const id = await insertSet(BASE_INPUT);
    const [, localId, workoutId, exerciseId, reps, difficulty, weight, unit, loggedAt] =
      mockDb.runAsync.mock.calls[0] as Array<string | number>;

    expect(localId).toBe(id);
    expect(workoutId).toBe('local_workout_1');
    expect(exerciseId).toBe('local_ex_1');
    expect(reps).toBe(10);
    expect(difficulty).toBe(7);
    expect(weight).toBe(80);
    expect(unit).toBe('kg');
    expect(loggedAt).toBe('2026-05-26T08:30:00.000Z');
  });
});

describe('updateSet', () => {
  it('issues an UPDATE sets statement with updated values', async () => {
    await updateSet('local_set_1', {
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
      'local_set_1',
    );
  });
});

describe('deleteSet', () => {
  it('issues a DELETE FROM sets statement with the local_id', async () => {
    await deleteSet('local_set_1');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM sets'),
      'local_set_1',
    );
  });
});

describe('getSetsForWorkout', () => {
  it('returns an empty array when the workout has no sets', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    expect(await getSetsForWorkout('local_w1')).toEqual([]);
  });

  it('returns all rows for the requested workout', async () => {
    const rows = [
      {
        local_id: 'local_s1',
        local_workout_id: 'local_w1',
        local_exercise_id: 'local_e1',
        reps: 10,
        difficulty: 7,
        weight: 80,
        unit: 'kg',
        logged_at: '2026-05-26T08:30:00.000Z',
        created_at: 1000,
      },
    ];
    mockDb.getAllAsync.mockResolvedValue(rows);

    const result = await getSetsForWorkout('local_w1');
    expect(result).toHaveLength(1);
    expect(result[0].reps).toBe(10);
    expect(result[0].local_exercise_id).toBe('local_e1');
  });

  it('queries by local_workout_id', async () => {
    await getSetsForWorkout('local_w1');
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE local_workout_id = ?'),
      'local_w1',
    );
  });

  it('orders results by created_at ASC', async () => {
    await getSetsForWorkout('local_w1');
    const sql = mockDb.getAllAsync.mock.calls[0][0] as string;
    expect(sql.toLowerCase()).toContain('order by created_at asc');
  });
});
