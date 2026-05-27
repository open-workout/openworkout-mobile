import { useState, useEffect, useCallback } from 'react';
import {
  getAllExercises,
  insertExercise,
  type Exercise,
  type NewExerciseInput,
} from '../db/exercises';

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocal = useCallback(async () => {
    setExercises(await getAllExercises());
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadLocal().finally(() => setIsLoading(false));
  }, []);

  const createExercise = useCallback(
    async (input: NewExerciseInput) => {
      await insertExercise(input);
      await loadLocal();
    },
    [loadLocal],
  );

  return { exercises, createExercise, isLoading };
}
