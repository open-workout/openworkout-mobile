// Tests for the workout session lifecycle:
// start workout → add exercise (via insertSet) → resume (getSetsForWorkout) → see exercises → finish

jest.mock('../../db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../db/database';
import { insertWorkout, getAllWorkouts, markWorkoutFinished } from '../../db/workouts';
import { insertSet, getSetsForWorkout } from '../../db/sets';

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

const STARTED_AT = '2026-05-29T10:00:00.000Z';
const FINISHED_AT = '2026-05-29T11:00:00.000Z';

describe('starting a workout', () => {
  it('creates a workout row with no finished_at', async () => {
    await insertWorkout({ title: '', started_at: STARTED_AT });

    const params = mockDb.runAsync.mock.calls[0];
    expect(params[0]).toContain('INSERT INTO workouts');
    expect(params[4]).toBeNull(); // finished_at
  });
});

describe('adding an exercise to an active workout', () => {
  it('inserts a set that links the exercise to the workout', async () => {
    const setId = await insertSet({
      workout_id: 'w1',
      exercise_id: 'ex1',
      reps: 0,
      difficulty: 0,
      weight: 0,
      unit: 'kg',
      logged_at: STARTED_AT,
      position: 0,
    });

    const [sql, id, workoutId, exerciseId] = mockDb.runAsync.mock.calls[0] as string[];
    expect(sql).toContain('INSERT INTO sets');
    expect(id).toBe(setId);
    expect(workoutId).toBe('w1');
    expect(exerciseId).toBe('ex1');
  });

  it('adding two exercises creates two sets with distinct exercise_ids', async () => {
    await insertSet({ workout_id: 'w1', exercise_id: 'ex1', reps: 0, difficulty: 0, weight: 0, unit: 'kg', logged_at: STARTED_AT, position: 0 });
    await insertSet({ workout_id: 'w1', exercise_id: 'ex2', reps: 0, difficulty: 0, weight: 0, unit: 'kg', logged_at: STARTED_AT, position: 1 });

    const firstExId = mockDb.runAsync.mock.calls[0][3];
    const secondExId = mockDb.runAsync.mock.calls[1][3];
    expect(firstExId).toBe('ex1');
    expect(secondExId).toBe('ex2');
  });
});

describe('resuming a workout (getSetsForWorkout)', () => {
  it('returns the exercises that were added', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { id: 's1', workout_id: 'w1', exercise_id: 'ex1', reps: 0, difficulty: 0, weight: 0, unit: 'kg', logged_at: STARTED_AT, created_at: 1000 },
    ]);

    const sets = await getSetsForWorkout('w1');

    expect(sets).toHaveLength(1);
    expect(sets[0].exercise_id).toBe('ex1');
    expect(sets[0].workout_id).toBe('w1');
  });

  it('returns multiple exercises in insertion order (created_at ASC)', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { id: 's1', workout_id: 'w1', exercise_id: 'ex1', reps: 0, difficulty: 0, weight: 0, unit: 'kg', logged_at: STARTED_AT, created_at: 1000 },
      { id: 's2', workout_id: 'w1', exercise_id: 'ex2', reps: 0, difficulty: 0, weight: 0, unit: 'kg', logged_at: STARTED_AT, created_at: 2000 },
    ]);

    const sets = await getSetsForWorkout('w1');

    expect(sets[0].exercise_id).toBe('ex1');
    expect(sets[1].exercise_id).toBe('ex2');
  });

  it('returns an empty array when no exercises were added', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);

    const sets = await getSetsForWorkout('w1');

    expect(sets).toEqual([]);
  });

  it('queries by the correct workout_id', async () => {
    await getSetsForWorkout('w1');

    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('WHERE workout_id = ?'),
      'w1',
    );
  });
});

describe('finishing a workout', () => {
  it('sets finished_at on the workout row', async () => {
    await markWorkoutFinished('w1', FINISHED_AT);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workouts'),
      FINISHED_AT,
      'w1',
    );
  });

  it('finished workouts are distinguishable from active ones via finished_at', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { id: 'w1', title: '', started_at: STARTED_AT, finished_at: null, created_at: 2000 },
      { id: 'w2', title: '', started_at: STARTED_AT, finished_at: FINISHED_AT, created_at: 1000 },
    ]);

    const workouts = await getAllWorkouts();
    const active = workouts.filter((w) => !w.finished_at);
    const finished = workouts.filter((w) => w.finished_at);

    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('w1');
    expect(finished).toHaveLength(1);
    expect(finished[0].id).toBe('w2');
  });
});
