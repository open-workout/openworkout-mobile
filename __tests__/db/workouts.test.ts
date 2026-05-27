jest.mock('../../app/db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../app/db/database';
import {
  insertWorkout,
  getAllWorkouts,
  markWorkoutFinished,
  deleteWorkout,
  getWorkoutById,
} from '../../app/db/workouts';

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

const STARTED_AT = '2026-05-26T08:00:00.000Z';

describe('insertWorkout', () => {
  it('returns a non-empty id string', async () => {
    const id = await insertWorkout({ title: 'Leg Day', started_at: STARTED_AT });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('calls runAsync with an INSERT INTO workouts statement', async () => {
    await insertWorkout({ title: 'Leg Day', started_at: STARTED_AT });
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('INSERT INTO workouts');
  });

  it('passes title and started_at as SQL params', async () => {
    const id = await insertWorkout({ title: 'Morning Push', started_at: STARTED_AT });
    const [, rowId, title, startedAt] = mockDb.runAsync.mock.calls[0] as string[];
    expect(rowId).toBe(id);
    expect(title).toBe('Morning Push');
    expect(startedAt).toBe(STARTED_AT);
  });

  it('uses null for finished_at when not supplied', async () => {
    await insertWorkout({ title: 'Test', started_at: STARTED_AT });
    const params = mockDb.runAsync.mock.calls[0];
    expect(params[4]).toBeNull();
  });

  it('passes finished_at when provided', async () => {
    const finishedAt = '2026-05-26T09:30:00.000Z';
    await insertWorkout({ title: 'Test', started_at: STARTED_AT, finished_at: finishedAt });
    const params = mockDb.runAsync.mock.calls[0];
    expect(params[4]).toBe(finishedAt);
  });
});

describe('getAllWorkouts', () => {
  it('returns an empty array when no workouts exist', async () => {
    expect(await getAllWorkouts()).toEqual([]);
  });

  it('returns all rows from the query', async () => {
    const rows = [
      { id: 'a', title: 'A', started_at: STARTED_AT, finished_at: null, created_at: 1000 },
      { id: 'b', title: 'B', started_at: STARTED_AT, finished_at: null, created_at: 900 },
    ];
    mockDb.getAllAsync.mockResolvedValue(rows);

    const result = await getAllWorkouts();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('queries workouts ordered by started_at DESC', async () => {
    await getAllWorkouts();
    const sql = mockDb.getAllAsync.mock.calls[0][0] as string;
    expect(sql.toLowerCase()).toContain('order by started_at desc');
  });
});

describe('markWorkoutFinished', () => {
  it('issues an UPDATE workouts statement with the correct params', async () => {
    const finishedAt = '2026-05-26T10:00:00.000Z';
    await markWorkoutFinished('abc', finishedAt);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workouts'),
      finishedAt,
      'abc',
    );
  });
});

describe('deleteWorkout', () => {
  it('issues a DELETE FROM workouts statement with the id', async () => {
    await deleteWorkout('abc');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM workouts'),
      'abc',
    );
  });
});

describe('getWorkoutById', () => {
  it('returns null when no matching workout exists', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getWorkoutById('missing')).toBeNull();
  });

  it('returns the workout row when found', async () => {
    const row = { id: 'a', title: 'A', started_at: STARTED_AT, finished_at: null, created_at: 1000 };
    mockDb.getFirstAsync.mockResolvedValue(row);

    const result = await getWorkoutById('a');
    expect(result).toEqual(row);
  });
});
