jest.mock('../../db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../db/database';
import { insertExercise, getAllExercises } from '../../db/exercises';

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
  name: 'Bench Press',
  primary_muscles: ['chest'],
  secondary_muscles: ['triceps'],
  alt_names: ['Flat Press'],
  description: 'Classic chest press',
  weight_direction: 1 as const,
};

describe('insertExercise', () => {
  it('returns a non-empty id string', async () => {
    const id = await insertExercise(BASE_INPUT);
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('calls runAsync once with an INSERT INTO exercises statement', async () => {
    await insertExercise(BASE_INPUT);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('INSERT INTO exercises');
  });

  it('passes name and JSON-encoded muscles as SQL params', async () => {
    const id = await insertExercise(BASE_INPUT);
    const [, rowId, name, primaryMuscles, secondaryMuscles, altNames] =
      mockDb.runAsync.mock.calls[0] as string[];

    expect(rowId).toBe(id);
    expect(name).toBe('Bench Press');
    expect(primaryMuscles).toBe('["chest"]');
    expect(secondaryMuscles).toBe('["triceps"]');
    expect(altNames).toBe('["Flat Press"]');
  });

  it('passes weight_direction correctly', async () => {
    await insertExercise({ ...BASE_INPUT, weight_direction: -1 });
    const params = mockDb.runAsync.mock.calls[0];
    expect(params[7]).toBe(-1);
  });
});

describe('getAllExercises', () => {
  it('returns an empty array when the table is empty', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    expect(await getAllExercises()).toEqual([]);
  });

  it('parses JSON muscle arrays from raw SQLite rows', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: 'abc',
        name: 'Squat',
        primary_muscles: '["legs","quads"]',
        secondary_muscles: '["glutes"]',
        alt_names: '["Back Squat"]',
        description: '',
        weight_direction: 1,
        created_at: 1000,
      },
    ]);

    const result = await getAllExercises();

    expect(result).toHaveLength(1);
    expect(result[0].primary_muscles).toEqual(['legs', 'quads']);
    expect(result[0].secondary_muscles).toEqual(['glutes']);
    expect(result[0].alt_names).toEqual(['Back Squat']);
  });

  it('handles null or empty muscle columns without throwing', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: 'xyz',
        name: 'Custom',
        primary_muscles: null,
        secondary_muscles: '',
        alt_names: '[]',
        description: '',
        weight_direction: 1,
        created_at: 2000,
      },
    ]);

    const result = await getAllExercises();
    expect(result[0].primary_muscles).toEqual([]);
    expect(result[0].secondary_muscles).toEqual([]);
  });

  it('queries exercises ordered by created_at DESC', async () => {
    await getAllExercises();
    const sql = mockDb.getAllAsync.mock.calls[0][0] as string;
    expect(sql.toLowerCase()).toContain('order by created_at desc');
  });
});
