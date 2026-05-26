import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../_context/auth';
import {
  getAllExercises,
  upsertServerExercises,
  removeStaleExercises,
  insertPendingExercise,
  confirmSyncedExercise,
  getPendingExercises,
  getLastSyncedAt,
  setLastSyncedAt,
  type LocalExercise,
  type ExerciseModel,
  type NewExerciseInput,
} from '../db/exercises';

const ONE_DAY_MS = 86_400_000;

export function useExercises() {
  const { userID, apiFetch } = useAuth();
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocal = useCallback(async () => {
    if (!userID) return;
    setExercises(await getAllExercises(userID));
  }, [userID]);

  const syncFromServer = useCallback(async () => {
    if (!userID) return;
    const lastSync = await getLastSyncedAt();
    const isFullSync = !lastSync || Date.now() - lastSync > ONE_DAY_MS;
    const url = isFullSync
      ? `/exercises?user_id=${encodeURIComponent(userID)}`
      : `/exercises?user_id=${encodeURIComponent(userID)}&updated_after=${new Date(lastSync).toISOString()}`;

    try {
      const res = await apiFetch(url);
      if (!res.ok) return;
      const data: ExerciseModel[] = await res.json();
      await upsertServerExercises(data);
      if (isFullSync) {
        await removeStaleExercises(data.map((e) => e.exercise_id));
      }
      await setLastSyncedAt(Date.now());
      await loadLocal();
    } catch {
      // network unavailable — local data remains usable
    }
  }, [userID, apiFetch, loadLocal]);

  const retryPending = useCallback(async () => {
    const pending = await getPendingExercises();
    for (const ex of pending) {
      try {
        const res = await apiFetch('/exercises', {
          method: 'POST',
          body: JSON.stringify({
            name: ex.name,
            exercise_type: ex.exercise_type,
            primary_muscles: ex.primary_muscles,
            secondary_muscles: ex.secondary_muscles,
            alt_names: ex.alt_names,
            description: ex.description,
            user_id: ex.user_id,
            is_private: ex.is_private,
            weight_direction: ex.weight_direction,
          }),
        });
        if (res.ok) {
          const created: ExerciseModel = await res.json();
          await confirmSyncedExercise(ex.local_id, created.exercise_id);
        }
      } catch {
        // leave as pending_create, will retry on next mount
      }
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!userID) return;
    setIsLoading(true);
    loadLocal()
      .then(syncFromServer)
      .then(retryPending)
      .finally(() => setIsLoading(false));
  }, [userID]);

  const createExercise = useCallback(
    async (input: NewExerciseInput) => {
      if (!userID) return;
      const localId = await insertPendingExercise(input, userID);
      await loadLocal();
      try {
        const res = await apiFetch('/exercises', {
          method: 'POST',
          body: JSON.stringify({ ...input, user_id: userID }),
        });
        if (res.ok) {
          const created: ExerciseModel = await res.json();
          await confirmSyncedExercise(localId, created.exercise_id);
          await loadLocal();
        }
      } catch {
        // stays as pending_create, retried on next mount
      }
    },
    [userID, apiFetch, loadLocal],
  );

  return { exercises, createExercise, isLoading };
}
