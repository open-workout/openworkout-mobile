import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../_context/auth';
import {
  getAllWorkouts,
  insertPendingWorkout,
  confirmSyncedWorkout,
  markWorkoutFinished,
  markWorkoutPendingDelete,
  deleteUnsyncedWorkout,
  hardDeleteWorkout,
  getPendingWorkoutsByStatus,
  type LocalWorkout,
  type WorkoutModel,
  type NewWorkoutInput,
} from '../db/workouts';
import {
  getSetsForWorkout,
  insertPendingSet,
  confirmSyncedSet,
  confirmUpdatedSet,
  updateSet,
  markSetPendingDelete,
  deleteUnsyncedSet,
  hardDeleteSet,
  propagateWorkoutIdToSets,
  getPendingSetsByStatus,
  type LocalSet,
  type ServerSet,
  type NewSetInput,
  type UpdateSetInput,
} from '../db/sets';

export function useWorkouts() {
  const { userID, apiFetch } = useAuth();
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocal = useCallback(async () => {
    if (!userID) return;
    setWorkouts(await getAllWorkouts(userID));
  }, [userID]);

  const retryPending = useCallback(async () => {
    // Phase 1: POST pending_create workouts
    const pendingCreate = await getPendingWorkoutsByStatus('pending_create');
    for (const w of pendingCreate) {
      try {
        const res = await apiFetch('/workouts', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userID,
            title: w.title,
            started_at: w.started_at,
            ...(w.finished_at ? { finished_at: w.finished_at } : {}),
          }),
        });
        if (res.ok) {
          const created: WorkoutModel = await res.json();
          await confirmSyncedWorkout(w.local_id, created.workout_id);
          await propagateWorkoutIdToSets(w.local_id, created.workout_id);
        }
      } catch {
        // network failure — leave as pending_create
      }
    }

    // Phase 2: DELETE pending_delete workouts
    const pendingDelete = await getPendingWorkoutsByStatus('pending_delete');
    for (const w of pendingDelete) {
      if (w.workout_id === null) continue;
      try {
        const res = await apiFetch(`/workouts/${w.workout_id}`, { method: 'DELETE' });
        if (res.ok || res.status === 404) {
          await hardDeleteWorkout(w.local_id);
        }
      } catch {
        // network failure — leave as pending_delete
      }
    }

    // Phase 3: POST pending_create sets (only those with workout_id populated)
    const pendingSetCreate = await getPendingSetsByStatus('pending_create');
    for (const s of pendingSetCreate) {
      if (s.workout_id === null) continue;
      try {
        const res = await apiFetch(`/workouts/${s.workout_id}/sets`, {
          method: 'POST',
          body: JSON.stringify({
            exercise_id: s.exercise_id,
            reps: s.reps,
            difficulty: s.difficulty,
            weight: s.weight,
            unit: s.unit,
          }),
        });
        if (res.ok) {
          const created: ServerSet = await res.json();
          await confirmSyncedSet(s.local_id, created.set_id);
        }
      } catch {
        // network failure — leave as pending_create
      }
    }

    // Phase 4: PUT pending_update sets
    const pendingSetUpdate = await getPendingSetsByStatus('pending_update');
    for (const s of pendingSetUpdate) {
      if (s.set_id === null) continue;
      try {
        const res = await apiFetch(`/sets/${s.set_id}`, {
          method: 'PUT',
          body: JSON.stringify({
            reps: s.reps,
            difficulty: s.difficulty,
            weight: s.weight,
            unit: s.unit,
            logged_at: s.logged_at,
          }),
        });
        if (res.ok) {
          await confirmUpdatedSet(s.local_id);
        }
      } catch {
        // network failure — leave as pending_update
      }
    }

    // Phase 5: DELETE pending_delete sets
    const pendingSetDelete = await getPendingSetsByStatus('pending_delete');
    for (const s of pendingSetDelete) {
      if (s.set_id === null) continue;
      try {
        const res = await apiFetch(`/sets/${s.set_id}`, { method: 'DELETE' });
        if (res.ok || res.status === 404) {
          await hardDeleteSet(s.local_id);
        }
      } catch {
        // network failure — leave as pending_delete
      }
    }
  }, [userID, apiFetch]);

  useEffect(() => {
    if (!userID) return;
    setIsLoading(true);
    loadLocal()
      .then(retryPending)
      .then(loadLocal)
      .finally(() => setIsLoading(false));
  }, [userID]);

  const createWorkout = useCallback(
    async (input: NewWorkoutInput): Promise<string> => {
      if (!userID) return '';
      const localId = await insertPendingWorkout(input, userID);
      await loadLocal();
      try {
        const res = await apiFetch('/workouts', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userID,
            title: input.title,
            started_at: input.started_at,
            ...(input.finished_at ? { finished_at: input.finished_at } : {}),
          }),
        });
        if (res.ok) {
          const created: WorkoutModel = await res.json();
          await confirmSyncedWorkout(localId, created.workout_id);
          await propagateWorkoutIdToSets(localId, created.workout_id);
          await loadLocal();
        }
      } catch {
        // stays as pending_create
      }
      return localId;
    },
    [userID, apiFetch, loadLocal],
  );

  const finishWorkout = useCallback(
    async (localId: string, finishedAt: string) => {
      await markWorkoutFinished(localId, finishedAt);
      await loadLocal();
    },
    [loadLocal],
  );

  const deleteWorkout = useCallback(
    async (workout: LocalWorkout) => {
      if (workout.workout_id === null) {
        await deleteUnsyncedWorkout(workout.local_id);
      } else {
        await markWorkoutPendingDelete(workout.local_id);
        try {
          const res = await apiFetch(`/workouts/${workout.workout_id}`, { method: 'DELETE' });
          if (res.ok || res.status === 404) {
            await hardDeleteWorkout(workout.local_id);
          }
        } catch {
          // leaves as pending_delete for next retry
        }
      }
      await loadLocal();
    },
    [apiFetch, loadLocal],
  );

  const addSet = useCallback(
    async (input: NewSetInput, workoutServerId: number | null): Promise<string> => {
      const localId = await insertPendingSet(input, workoutServerId);
      if (workoutServerId !== null) {
        try {
          const res = await apiFetch(`/workouts/${workoutServerId}/sets`, {
            method: 'POST',
            body: JSON.stringify({
              exercise_id: input.exercise_id,
              reps: input.reps,
              difficulty: input.difficulty,
              weight: input.weight,
              unit: input.unit,
            }),
          });
          if (res.ok) {
            const created: ServerSet = await res.json();
            await confirmSyncedSet(localId, created.set_id);
          }
        } catch {
          // stays as pending_create
        }
      }
      return localId;
    },
    [apiFetch],
  );

  const editSet = useCallback(
    async (localId: string, setServerId: number | null, input: UpdateSetInput) => {
      await updateSet(localId, input);
      if (setServerId !== null) {
        try {
          const res = await apiFetch(`/sets/${setServerId}`, {
            method: 'PUT',
            body: JSON.stringify(input),
          });
          if (res.ok) {
            await confirmUpdatedSet(localId);
          }
        } catch {
          // leaves as pending_update
        }
      }
    },
    [apiFetch],
  );

  const removeSet = useCallback(
    async (set: LocalSet) => {
      if (set.set_id === null) {
        await deleteUnsyncedSet(set.local_id);
      } else {
        await markSetPendingDelete(set.local_id);
        try {
          const res = await apiFetch(`/sets/${set.set_id}`, { method: 'DELETE' });
          if (res.ok || res.status === 404) {
            await hardDeleteSet(set.local_id);
          }
        } catch {
          // leaves as pending_delete
        }
      }
    },
    [apiFetch],
  );

  return {
    workouts,
    isLoading,
    createWorkout,
    finishWorkout,
    deleteWorkout,
    addSet,
    editSet,
    removeSet,
    getSetsForWorkout,
  };
}
