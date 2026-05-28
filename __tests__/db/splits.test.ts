jest.mock('../../app/db/database', () => ({ getDb: jest.fn() }));

import { getDb } from '../../app/db/database';
import { insertSplit, getActiveSplit, deleteSplit, deleteAllSplits } from '../../app/db/splits';

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

const SAMPLE_DAYS = [
  { name: 'Push', muscles: ['chest', 'triceps'] },
  { name: 'Pull', muscles: ['lats', 'biceps'] },
];

describe('insertSplit', () => {
  it('returns a non-empty id string', async () => {
    const id = await insertSplit({ name: 'PPL', days: SAMPLE_DAYS });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('calls runAsync once with an INSERT INTO splits statement', async () => {
    await insertSplit({ name: 'PPL', days: SAMPLE_DAYS });
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    expect(mockDb.runAsync.mock.calls[0][0]).toContain('INSERT INTO splits');
  });

  it('JSON-encodes the days array', async () => {
    await insertSplit({ name: 'PPL', days: SAMPLE_DAYS });
    const params = mockDb.runAsync.mock.calls[0] as unknown[];
    const daysParam = params[3];
    expect(typeof daysParam).toBe('string');
    expect(JSON.parse(daysParam as string)).toEqual(SAMPLE_DAYS);
  });

  it('passes the name as the second SQL param', async () => {
    await insertSplit({ name: 'My Split', days: SAMPLE_DAYS });
    const params = mockDb.runAsync.mock.calls[0] as unknown[];
    expect(params[2]).toBe('My Split');
  });
});

describe('getActiveSplit', () => {
  it('returns null when no rows exist', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getActiveSplit();
    expect(result).toBeNull();
  });

  it('parses the days JSON string back to an array', async () => {
    mockDb.getFirstAsync.mockResolvedValue({
      id: 'abc123',
      name: 'PPL',
      days: JSON.stringify(SAMPLE_DAYS),
      created_at: 1000,
    });
    const result = await getActiveSplit();
    expect(result).not.toBeNull();
    expect(result!.days).toEqual(SAMPLE_DAYS);
  });

  it('queries with ORDER BY created_at DESC LIMIT 1', async () => {
    await getActiveSplit();
    const sql = mockDb.getFirstAsync.mock.calls[0][0] as string;
    expect(sql.toLowerCase()).toContain('order by created_at desc');
    expect(sql.toLowerCase()).toContain('limit 1');
  });

  it('returns the full split object with correct shape', async () => {
    mockDb.getFirstAsync.mockResolvedValue({
      id: 'xyz',
      name: 'Bro Split',
      days: JSON.stringify([{ name: 'Chest', muscles: ['chest'] }]),
      created_at: 2000,
    });
    const result = await getActiveSplit();
    expect(result).toMatchObject({ id: 'xyz', name: 'Bro Split', created_at: 2000 });
    expect(result!.days[0].name).toBe('Chest');
  });
});

describe('deleteSplit', () => {
  it('calls runAsync with DELETE FROM splits WHERE id = ?', async () => {
    await deleteSplit('abc123');
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    const sql = mockDb.runAsync.mock.calls[0][0] as string;
    expect(sql.toLowerCase()).toContain('delete from splits');
    expect(mockDb.runAsync.mock.calls[0][1]).toBe('abc123');
  });
});

describe('deleteAllSplits', () => {
  it('calls runAsync with DELETE FROM splits (no WHERE clause)', async () => {
    await deleteAllSplits();
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    const sql = mockDb.runAsync.mock.calls[0][0] as string;
    expect(sql.toLowerCase()).toContain('delete from splits');
    expect(sql.toLowerCase()).not.toContain('where');
  });
});
