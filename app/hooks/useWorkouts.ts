import { useState, useEffect, useCallback } from 'react';
import {
  getAllWorkouts,
  insertWorkout,
  markWorkoutFinished,
  updateWorkoutTitle,
  deleteWorkout,
  type Workout,
  type NewWorkoutInput,
} from '../db/workouts';
import {
  getSetsForWorkout,
  insertSet,
  updateSet,
  deleteSet,
  type WorkoutSet,
  type NewSetInput,
  type UpdateSetInput,
} from '../db/sets';

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
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
      const id = await insertWorkout(input);
      await loadLocal();
      return id;
    },
    [loadLocal],
  );

  const renameWorkout = useCallback(
    async (id: string, title: string) => {
      await updateWorkoutTitle(id, title);
      await loadLocal();
    },
    [loadLocal],
  );

  const finishWorkout = useCallback(
    async (id: string, finishedAt: string) => {
      await markWorkoutFinished(id, finishedAt);
      await loadLocal();
    },
    [loadLocal],
  );

  const removeWorkout = useCallback(
    async (id: string) => {
      await deleteWorkout(id);
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
    async (id: string, input: UpdateSetInput) => {
      await updateSet(id, input);
    },
    [],
  );

  const removeSet = useCallback(
    async (id: string) => {
      await deleteSet(id);
    },
    [],
  );

  return {
    workouts,
    isLoading,
    createWorkout,
    renameWorkout,
    finishWorkout,
    removeWorkout,
    addSet,
    editSet,
    removeSet,
    getSetsForWorkout,
  };
}
