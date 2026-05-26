jest.mock('../../app/db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../app/db/database';
import {
  insertWorkout,
  getAllWorkouts,
  markWorkoutFinished,
  deleteWorkout,
  getWorkoutByLocalId,
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
  it('returns a local_id with the expected prefix', async () => {
    const id = await insertWorkout({ title: 'Leg Day', started_at: STARTED_AT });
    expect(id).toMatch(/^local_/);
  });

  it('calls runAsync with an INSERT INTO workouts statement', async () => {
    await insertWorkout({ title: 'Leg Day', started_at: STARTED_AT });
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('INSERT INTO workouts');
  });

  it('passes title and started_at as SQL params', async () => {
    const id = await insertWorkout({ title: 'Morning Push', started_at: STARTED_AT });
    const [, localId, title, startedAt] = mockDb.runAsync.mock.calls[0] as string[];
    expect(localId).toBe(id);
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
      { local_id: 'local_a', title: 'A', started_at: STARTED_AT, finished_at: null, created_at: 1000 },
      { local_id: 'local_b', title: 'B', started_at: STARTED_AT, finished_at: null, created_at: 900 },
    ];
    mockDb.getAllAsync.mockResolvedValue(rows);

    const result = await getAllWorkouts();
    expect(result).toHaveLength(2);
    expect(result[0].local_id).toBe('local_a');
    expect(result[1].local_id).toBe('local_b');
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
    await markWorkoutFinished('local_abc', finishedAt);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workouts'),
      finishedAt,
      'local_abc',
    );
  });
});

describe('deleteWorkout', () => {
  it('issues a DELETE FROM workouts statement with the local_id', async () => {
    await deleteWorkout('local_abc');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM workouts'),
      'local_abc',
    );
  });
});

describe('getWorkoutByLocalId', () => {
  it('returns null when no matching workout exists', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getWorkoutByLocalId('missing')).toBeNull();
  });

  it('returns the workout row when found', async () => {
    const row = { local_id: 'local_a', title: 'A', started_at: STARTED_AT, finished_at: null, created_at: 1000 };
    mockDb.getFirstAsync.mockResolvedValue(row);

    const result = await getWorkoutByLocalId('local_a');
    expect(result).toEqual(row);
  });
});
