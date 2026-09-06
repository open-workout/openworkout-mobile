jest.mock('../../app/db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../app/db/database';
import { getMuscleSetCounts, getSetsForMuscle, getTrainedDatesForMuscle } from '../../app/db/muscleStats';

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

type Row = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  primary_muscles: string;
  secondary_muscles: string;
  logged_at: string;
  weight: number;
  unit: string;
  reps: number;
  duration_seconds: number | null;
  distance: number | null;
  measurement_type: string;
  finished_at: string;
};

function row(overrides: Partial<Row>): Row {
  return {
    id: 's1',
    exercise_id: 'ex1',
    exercise_name: 'Bench Press',
    primary_muscles: '["chest"]',
    secondary_muscles: '["front delts","triceps"]',
    logged_at: '2026-05-01T10:00:00.000Z',
    weight: 80,
    unit: 'kg',
    reps: 10,
    duration_seconds: null,
    distance: null,
    measurement_type: 'reps',
    finished_at: '2026-05-01T11:00:00.000Z',
    ...overrides,
  };
}

describe('query construction', () => {
  it('excludes seed/pending, non-finished workouts, and warmups but never filters on drop_set_number', async () => {
    await getMuscleSetCounts({ kind: 'all_time' });
    const sql = (mockDb.getAllAsync.mock.calls[0][0] as string).toLowerCase();
    expect(sql).toContain('finished_at is not null');
    expect(sql).toContain("not in ('seed', 'pending')");
    expect(sql).toContain('is_warmup = 0');
    expect(sql).not.toContain('drop_set_number');
  });

  it('passes a null period bound for all_time', async () => {
    await getMuscleSetCounts({ kind: 'all_time' });
    const params = mockDb.getAllAsync.mock.calls[0].slice(1);
    expect(params).toEqual([null, null]);
  });

  it('passes an ISO lower bound for last_n_days', async () => {
    await getMuscleSetCounts({ kind: 'last_n_days', days: 7 });
    const params = mockDb.getAllAsync.mock.calls[0].slice(1) as [string, string];
    expect(params[0]).toBe(params[1]);
    expect(() => new Date(params[0])).not.toThrow();
    expect(new Date(params[0]).toISOString()).toBe(params[0]);
  });
});

describe('getMuscleSetCounts', () => {
  it('counts a set toward every distinct simplified muscle it touches', async () => {
    mockDb.getAllAsync.mockResolvedValue([row({})]);
    const counts = await getMuscleSetCounts({ kind: 'all_time' });
    const byMuscle = Object.fromEntries(counts.map((c) => [c.muscle, c.setCount]));
    expect(byMuscle.chest).toBe(1);
    expect(byMuscle.shoulders).toBe(1); // front delts -> shoulders
    expect(byMuscle.triceps).toBe(1);
  });

  it('sums counts across multiple sets, including dropset rows', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      row({ id: 's1', drop_set_number: 0 } as Partial<Row>),
      row({ id: 's2', drop_set_number: 1 } as Partial<Row>),
      row({ id: 's3', drop_set_number: 2 } as Partial<Row>),
    ]);
    const counts = await getMuscleSetCounts({ kind: 'all_time' });
    const chest = counts.find((c) => c.muscle === 'chest');
    expect(chest?.setCount).toBe(3);
  });

  it('does not attribute a set to an unmapped muscle tag', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      row({ primary_muscles: '["legs"]', secondary_muscles: '[]' }),
    ]);
    const counts = await getMuscleSetCounts({ kind: 'all_time' });
    expect(counts).toEqual([]);
  });

  it('returns an empty array when there are no qualifying sets', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    expect(await getMuscleSetCounts({ kind: 'all_time' })).toEqual([]);
  });
});

describe('getSetsForMuscle', () => {
  it('only returns sets touching the requested muscle, newest first', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      row({ id: 'older', primary_muscles: '["chest"]', secondary_muscles: '[]', finished_at: '2026-05-01T00:00:00.000Z' }),
      row({ id: 'newer', primary_muscles: '["back"]', secondary_muscles: '[]', finished_at: '2026-05-03T00:00:00.000Z' }),
      row({ id: 'other-muscle', primary_muscles: '["quads"]', secondary_muscles: '[]', finished_at: '2026-05-02T00:00:00.000Z' }),
    ]);
    const result = await getSetsForMuscle('back', { kind: 'all_time' });
    expect(result.map((r) => r.setId)).toEqual(['newer']);
  });
});

describe('getTrainedDatesForMuscle', () => {
  it('returns distinct sorted local-date strings for the muscle', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      row({ id: 'a', primary_muscles: '["glutes"]', secondary_muscles: '[]', finished_at: '2026-05-01T09:00:00.000Z' }),
      row({ id: 'b', primary_muscles: '["glutes"]', secondary_muscles: '[]', finished_at: '2026-05-01T18:00:00.000Z' }),
      row({ id: 'c', primary_muscles: '["glutes"]', secondary_muscles: '[]', finished_at: '2026-05-03T09:00:00.000Z' }),
    ]);
    const dates = await getTrainedDatesForMuscle('glutes', { kind: 'all_time' });
    expect(dates).toEqual(['2026-05-01', '2026-05-03']);
  });
});
