import { getDb } from './database';
import type { Split, SplitDay } from '../constants/splits';

export type { Split, SplitDay };

type RawSplitRow = {
  id: string;
  name: string;
  days: string;
  created_at: number;
};

function parseSplitRow(row: RawSplitRow): Split {
  return {
    ...row,
    days: JSON.parse(row.days || '[]'),
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertSplit(input: Omit<Split, 'id' | 'created_at'>): Promise<string> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO splits (id, name, days, created_at) VALUES (?, ?, ?, ?)`,
    id,
    input.name,
    JSON.stringify(input.days),
    Date.now(),
  );
  return id;
}

export async function getActiveSplit(): Promise<Split | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawSplitRow>(
    `SELECT * FROM splits ORDER BY created_at DESC LIMIT 1`,
  );
  return row ? parseSplitRow(row) : null;
}

export async function deleteSplit(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM splits WHERE id = ?`, id);
}

export async function deleteAllSplits(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM splits`);
}
