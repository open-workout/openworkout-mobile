import { useState, useEffect, useCallback } from 'react';
import {
  getAllRoutines,
  insertRoutine,
  updateRoutine as dbUpdateRoutine,
  deleteRoutine as dbDeleteRoutine,
  type Routine,
  type NewRoutineInput,
} from '../db/routines';

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setRoutines(await getAllRoutines());
  }, []);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, []);

  const createRoutine = useCallback(
    async (input: NewRoutineInput) => {
      await insertRoutine(input);
      await load();
    },
    [load],
  );

  const editRoutine = useCallback(
    async (id: string, input: NewRoutineInput) => {
      await dbUpdateRoutine(id, input);
      await load();
    },
    [load],
  );

  const removeRoutine = useCallback(
    async (id: string) => {
      await dbDeleteRoutine(id);
      await load();
    },
    [load],
  );

  return { routines, isLoading, createRoutine, editRoutine, removeRoutine, reload: load };
}
