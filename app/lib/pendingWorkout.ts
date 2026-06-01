import * as SecureStore from 'expo-secure-store';
import type { GeneratedSlot } from './generateWorkout';
import type { Exercise } from '../db/exercises';

type PendingWorkout = {
  slots: GeneratedSlot[];
  muscles: string[];
};

type PersistedSlot = { exerciseId: string; type: string };
type PersistedPending = { slots: PersistedSlot[]; muscles: string[] };

const STORAGE_KEY = 'pending_workout';

let pending: PendingWorkout | null = null;

export function setPendingWorkout(slots: GeneratedSlot[], muscles: string[]): void {
  pending = { slots, muscles };
  const toSave: PersistedPending = {
    slots: slots.map((s) => ({ exerciseId: s.exercise.id || s.exercise.name, type: s.type })),
    muscles,
  };
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(toSave));
}

export function getPendingWorkout(): PendingWorkout | null {
  return pending;
}

export async function restorePendingWorkout(allExercises: Exercise[]): Promise<void> {
  if (pending) return;
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved: PersistedPending = JSON.parse(raw);
    const slots: GeneratedSlot[] = [];
    for (const { exerciseId, type } of saved.slots) {
      const exercise = allExercises.find((e) => e.id === exerciseId || e.name === exerciseId);
      if (exercise) slots.push({ type: type as GeneratedSlot['type'], exercise });
    }
    pending = { slots, muscles: saved.muscles };
  } catch {
    // corrupted data — ignore
  }
}

export function updatePendingSlotExercise(oldExerciseId: string, newExercise: Exercise): void {
  if (!pending) return;
  pending = {
    ...pending,
    slots: pending.slots.map((s) =>
      (s.exercise.id || s.exercise.name) === oldExerciseId ? { ...s, exercise: newExercise } : s,
    ),
  };
  const toSave: PersistedPending = {
    slots: pending.slots.map((s) => ({ exerciseId: s.exercise.id || s.exercise.name, type: s.type })),
    muscles: pending.muscles,
  };
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(toSave));
}

export function clearPendingWorkout(): void {
  pending = null;
  SecureStore.deleteItemAsync(STORAGE_KEY);
}
