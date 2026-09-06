import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSetHistoryForExercise, type ExerciseHistoryPoint } from '../db/exerciseHistory';

export function useExerciseHistory(exerciseId: string | undefined) {
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!exerciseId) {
      setHistory([]);
      return;
    }
    setHistory(await getSetHistoryForExercise(exerciseId));
  }, [exerciseId]);

  useEffect(() => {
    setIsLoading(true);
    reload().finally(() => setIsLoading(false));
  }, [reload]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { history, isLoading, reload };
}
