import { useState, useEffect, useCallback } from 'react';
import {
  getAllWorkouts,
  insertWorkout,
  markWorkoutFinished,
  deleteWorkout,
  type LocalWorkout,
  type NewWorkoutInput,
} from '../db/workouts';
import {
  getSetsForWorkout,
  insertSet,
  updateSet,
  deleteSet,
  type LocalSet,
  type NewSetInput,
  type UpdateSetInput,
} from '../db/sets';

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocal = useCallback(async () => {
    setWorkouts(await getAllWorkouts());
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadLocal().finally(() => setIsLoading(false));
  }, []);

  const createWorkout = useCallback(
    async (input: NewWorkoutInput): Promise<string> => {
      const localId = await insertWorkout(input);
      await loadLocal();
      return localId;
    },
    [loadLocal],
  );

  const finishWorkout = useCallback(
    async (localId: string, finishedAt: string) => {
      await markWorkoutFinished(localId, finishedAt);
      await loadLocal();
    },
    [loadLocal],
  );

  const removeWorkout = useCallback(
    async (localId: string) => {
      await deleteWorkout(localId);
      await loadLocal();
    },
    [loadLocal],
  );

  const addSet = useCallback(
    async (input: NewSetInput): Promise<string> => {
      return insertSet(input);
    },
    [],
  );

  const editSet = useCallback(
    async (localId: string, input: UpdateSetInput) => {
      await updateSet(localId, input);
    },
    [],
  );

  const removeSet = useCallback(
    async (localId: string) => {
      await deleteSet(localId);
    },
    [],
  );

  return {
    workouts,
    isLoading,
    createWorkout,
    finishWorkout,
    removeWorkout,
    addSet,
    editSet,
    removeSet,
    getSetsForWorkout,
  };
}
