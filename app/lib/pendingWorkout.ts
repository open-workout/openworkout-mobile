import type { GeneratedSlot } from './generateWorkout';

type PendingWorkout = {
  slots: GeneratedSlot[];
  muscles: string[];
};

let pending: PendingWorkout | null = null;

export function setPendingWorkout(slots: GeneratedSlot[], muscles: string[]): void {
  pending = { slots, muscles };
}

export function getPendingWorkout(): PendingWorkout | null {
  return pending;
}

export function clearPendingWorkout(): void {
  pending = null;
}
